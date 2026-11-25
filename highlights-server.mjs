import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, mkdtemp, open, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve, sep } from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { canReadScores, filterReplayClips, readScoreboard } from "./highlights-vision.mjs";
import { assetSlot, renderMontage } from "./highlights-montage.mjs";
import { trackSubject } from "./highlights-tracking.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const tools = join(root, ".highlights-tools");
const ffmpeg = process.env.UCL_FFMPEG || "ffmpeg";
const ffprobe = process.env.UCL_FFPROBE || "ffprobe";
const whisper = process.env.UCL_WHISPER || join(tools, "bin", "whisper-cli.exe");
const model = process.env.UCL_WHISPER_MODEL || join(tools, "ggml-base.bin");
const soccerDirectory = join(tools, "tdeed");
const soccerPython = join(tools, "soccernet-env", "Scripts", "python.exe");
const soccerModel = "SoccerNet_small";
const soccerFps = 25;
const soccerLabels = new Map([["Goal", "goal"], ["Shots on target", "chance"], ["Shots off target", "chance"]]);
const esrgan = resolve(process.env.UCL_REALESRGAN || join(tools, "realesrgan", "realesrgan-ncnn-vulkan.exe"));
const enhancementModels = join(dirname(esrgan), "models");
const enhancementModel = "realesrgan-x4plus";
const port = Number(process.env.UCL_HIGHLIGHTS_PORT || 4173);
const host = `127.0.0.1:${port}`;
const origin = `http://${host}`;
const editorOrigins = new Set([origin, "http://127.0.0.1:5500", "http://localhost:5500"]);
const work = await mkdtemp(join(tmpdir(), "ucl-highlights-"));
const sessions = new Map();
const maxSize = 32 * 1024 ** 3;
const sampleRate = 16000;
const inputOptions = [
  "-protocol_whitelist", "file,pipe",
  "-format_whitelist", "mov,matroska,mpegts,mpeg,avi,flv,ogg,asf",
];
const videoArgs = ["-hide_banner", "-nostdin", "-loglevel", "error", "-y"];

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function run(executable, args, { signal, onLine, binary = false, cwd } = {}) {
  return new Promise((done, fail) => {
    const child = spawn(executable, args, {
      windowsHide: true, signal, cwd, stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "", errors = "", partial = "";
    const output = [];
    if (binary) child.stdout.on("data", (chunk) => output.push(chunk));
    else child.stdout.setEncoding("utf8").on("data", (chunk) => {
      stdout = (stdout + chunk).slice(-131072);
    });
    child.stderr.setEncoding("utf8").on("data", (chunk) => {
      errors = (errors + chunk).slice(-8192);
      const lines = (partial + chunk).split(/[\r\n]+/);
      partial = lines.pop();
      if (onLine) lines.forEach(onLine);
    });
    child.on("error", fail);
    child.on("close", (code) => {
      if (code === 0) done(binary ? Buffer.concat(output) : stdout);
      else fail(new Error(errors.trim() || `Process exited with code ${code}`));
    });
  });
}

async function capabilities() {
  const available = (command) => run(command, ["-version"]).then(() => true, () => false);
  const [encoder, probe, speech] = await Promise.all([
    available(ffmpeg), available(ffprobe),
    stat(model).then(() => run(whisper, ["--help"])).then(() => true, () => false),
  ]);
  return { ffmpeg: encoder && probe, whisper: speech, soccernet: await canSpotSoccerActions(),
    savesTranscript: true, scoreboard: canReadScores(), replays: true,
    montage: true, clockStyle: true, tracking: true, prepareEnhancement: encoder && await canEnhanceVideo() };
}

async function canSpotSoccerActions() {
  const files = [soccerPython, join(soccerDirectory, "inference.py"),
    join(soccerDirectory, "checkpoints", "SoccerNet", soccerModel, "checkpoint_best.pt")];
  return Promise.all(files.map((file) => stat(file))).then((entries) => entries.every((entry) => entry.isFile()), () => false);
}

async function canEnhanceVideo() {
  const files = [esrgan, ...["bin", "param"].map((extension) => join(enhancementModels, `${enhancementModel}.${extension}`))];
  return Promise.all(files.map((file) => stat(file))).then((entries) => entries.every((entry) => entry.isFile()), () => false);
}

async function enhanceFrames(input, output, signal, onProgress) {
  try {
    let completed = 0;
    await run(esrgan, ["-i", input, "-o", output, "-s", "2", "-n", enhancementModel,
      "-m", enhancementModels, "-f", "png", "-j", "1:1:1", "-v"], {
      cwd: dirname(esrgan), signal, onLine: (line) => {
        if (/\.png done\s*$/i.test(line)) onProgress(++completed);
      },
    });
  } catch (error) {
    console.error("Real-ESRGAN:", error.message);
    throw new RequestError(500, "enhancementFailed");
  }
}

function enhancementKey(clips, montage) {
  const { format, framing, audio, archive, graphics, clock, matchPeriods, clockStyle, enhancementMode } = montage;
  return JSON.stringify([clips, format, framing, audio, archive, graphics, clock, matchPeriods, clockStyle, enhancementMode === "fast"]);
}

async function audioLevels(wav, signal) {
  const handle = await open(wav);
  const header = Buffer.alloc(4096);
  try {
    await handle.read(header, 0, header.length, 0);
  } finally {
    await handle.close();
  }
  let start = 12;
  while (start + 8 < header.length && header.toString("ascii", start, start + 4) !== "data") {
    const size = header.readUInt32LE(start + 4);
    start += 8 + size + size % 2;
  }
  if (start + 8 >= header.length) throw new Error("WAV data chunk missing");

  let sum = 0, count = 0;
  const levels = [];
  for await (const chunk of createReadStream(wav, { start: start + 8, signal })) {
    for (let i = 0; i + 1 < chunk.length; i += 2) {
      const value = chunk.readInt16LE(i);
      sum += value * value;
      count++;
      if (count === sampleRate) {
        levels.push(10 * Math.log10(Math.max(1, sum / count)) - 90.31);
        count = sum = 0;
      }
    }
  }
  return levels;
}

const replayWords = /\b(?:ralenti|replay|repeticion|repeticao|wiederholung)\b/;
const goalWords = /\b(?:quel but|et le but|but de|but pour|marque|ouvre le score|egalise|go+a+l+|scores|equalis[ez]er|go+l+|gool|rete|to+r+|treffer)\b|\bbu+t+\s*!/;
const chanceWords = /\b(?:arrete|arret|parade|poteau|transversale|grosse occasion|frappe|penalty|great save|save by|on target|hits the post|crossbar|what a chance|remate|disparo|paradon|larguero|traversa|parata|tiro|pfosten|latte|pariert|defesa)\b/;

function suggestClips(levels, transcript, scores, duration, limit, spots = []) {
  const candidates = [...spots];
  const audioScores = levels.map((level, time) => {
    const nearby = levels.slice(Math.max(0, time - 20), Math.min(levels.length, time + 21)).sort((a, b) => a - b);
    return Math.max(0, level - nearby[Math.floor(nearby.length / 2)]);
  });
  for (let time = 1; time < audioScores.length - 1; time++) {
    const score = audioScores[time];
    if (levels[time] > -48 && score >= 5 && score >= audioScores[time - 1] && score > audioScores[time + 1]) {
      candidates.push({ time, score: 9 + Math.min(score, 18), kind: "audio" });
    }
  }
  for (const { offsets, text } of transcript) {
    const normalized = text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    if (replayWords.test(normalized)) continue;
    const kind = goalWords.test(normalized) ? "goal" : chanceWords.test(normalized) ? "chance" : "";
    if (!kind) continue;
    const from = Math.floor(offsets.from / 1000);
    const to = Math.min(from + 18, Math.ceil(offsets.to / 1000));
    if (!Number.isFinite(from) || from < 0 || from >= duration) continue;
    let time = Math.min(duration, (from + to) / 2);
    let peak = 4;
    for (let i = Math.max(0, from - 4); i <= to; i++) {
      if (audioScores[i] > peak) {
        peak = audioScores[i];
        time = i;
      }
    }
    candidates.push({ time, kind, score: (kind === "goal" ? 70 : 40) + Math.min(peak, 20), quote: text.trim().slice(0, 240) });
  }
  for (const event of scores) {
    let time = Math.max(0, event.time - 5);
    let peak = 4;
    for (let i = Math.max(0, event.time - 16); i <= event.time; i++) {
      if (audioScores[i] > peak) {
        peak = audioScores[i];
        time = i;
      }
    }
    const commentary = candidates.find((candidate) => candidate.kind === "goal" &&
      candidate.time >= event.time - 22 && candidate.time <= event.time + 3 && candidate.quote);
    if (commentary && peak === 4) time = commentary.time;
    candidates.push({ time, kind: "goal", score: 110, boardScore: event.score, quote: commentary?.quote });
  }

  const selected = [];
  for (const item of candidates.sort((a, b) => b.score - a.score)) {
    const leadIn = (item.kind === "goal" ? 12 : 7) + (item.quote ? 5 : 0);
    const start = Math.max(0, item.time - leadIn);
    const end = Math.min(duration, item.time + 8);
    if (end - start < 1 || selected.some((clip) => start < clip.end && end > clip.start)) continue;
    selected.push({ start, end, kind: item.kind, quote: item.quote, score: item.boardScore, priority: item.score });
    if (selected.length === limit) break;
  }
  return selected.sort((a, b) => a.start - b.start);
}

function transcodeProgress(line, total, update) {
  const value = /^out_time_us=(\d+)$/.exec(line);
  if (value) update(Math.min(1, Number(value[1]) / 1e6 / total));
}

async function spotSoccerActions(session, confidencePercent, signal, progress) {
  const video = join(session.directory, "soccernet-input.mp4");
  const output = join(session.directory, "results_inference.json");
  // T-DEED reports frame indices and drops incomplete windows. Normalize FPS
  // and pad by one full 100-sample window (stride 12) to cover the end.
  const padding = 48;
  const runInference = [
    "import sys, inference",
    "from util import eval as evaluator",
    "from util.io import store_json_inference",
    "output = sys.argv.pop(1)",
    "evaluator.store_json_inference = lambda _, pred, stride: store_json_inference(output, pred, stride)",
    "inference.main(inference.get_args())",
  ].join("\n");
  try {
    await run(ffmpeg, [...videoArgs, ...inputOptions, "-i", session.source, "-map", "0:v:0", "-an",
      "-vf", `fps=${soccerFps},scale=398:224,setsar=1,tpad=stop_mode=clone:stop_duration=${padding}`,
      "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
      "-progress", "pipe:2", "-nostats", video], {
      signal, onLine: (line) => transcodeProgress(line, session.duration + padding, (fraction) => progress(fraction * 0.3)),
    });
    const windows = Math.max(1, Math.floor(session.duration * soccerFps / (50 * 12)) + 1);
    await run(soccerPython, ["-c", runInference, session.directory, "--model", soccerModel,
      "--video_path", video, "--frame_width", "398", "--frame_height", "224",
      "--inference_threshold", String(confidencePercent / 100)], {
      signal, cwd: soccerDirectory, onLine: (line) => {
        const iteration = /^\s*(\d+)it\b/.exec(line);
        if (iteration) progress(0.3 + 0.69 * Math.min(1, Number(iteration[1]) / windows));
      },
    });
    const { predictions } = JSON.parse(await readFile(output, "utf8"));
    return predictions.flatMap(({ frame, label, confidence }) => {
      const kind = soccerLabels.get(label);
      const time = frame / soccerFps;
      if (!kind || !Number.isFinite(time) || time < 0 || time >= session.duration || !Number.isFinite(confidence)) return [];
      return [{ time, kind, score: (kind === "goal" ? 70 : 40) + confidence * 20 }];
    });
  } catch (error) {
    if (signal.aborted) throw error;
    console.error("SoccerNet:", error.message);
    throw new RequestError(500, "soccernetFailed");
  } finally {
    await Promise.all([video, output].map((file) => rm(file, { force: true })));
  }
}

async function analyze(session, options, job, signal) {
  const useAudio = session.audio && !options.soccernet;
  if (!useAudio && !options.scoreRegion && !options.soccernet) return { clips: [], transcript: [], notice: "noAudio" };
  const wav = join(session.directory, "audio.wav");
  const transcriptFile = join(session.directory, "commentary");
  const stages = [
    ["audio", useAudio ? 18 : 0],
    ["whisper", useAudio && options.whisper ? 48 : 0],
    ["soccernet", options.soccernet ? 66 : 0],
    ["score", options.scoreRegion ? 24 : 0],
    ["replay", options.replays ? 10 : 0],
  ];
  const total = stages.reduce((sum, [, weight]) => sum + weight, 0);
  let completed = 0;
  function phase(name) {
    const weight = stages.find(([stage]) => stage === name)[1];
    job.phase = name;
    const base = completed;
    completed += weight;
    return (fraction) => {
      job.progress = Math.max(job.progress, (base + Math.min(1, Math.max(0, fraction)) * weight) / total * 99);
    };
  }
  try {
    let levels = [], transcript = [], scores = [], spots = [], notice;
    if (useAudio) {
      const progress = phase("audio");
      await run(ffmpeg, [...videoArgs, ...inputOptions, "-i", session.source, "-map", "0:a:0", "-vn",
        "-af", "aresample=async=1:first_pts=0", "-ar", String(sampleRate), "-ac", "1", "-c:a", "pcm_s16le",
        "-progress", "pipe:2", "-nostats", wav], {
        signal, onLine: (line) => transcodeProgress(line, session.duration, (fraction) => progress(fraction * 0.9)),
      });
      levels = await audioLevels(wav, signal);
      progress(1);
    }
    if (useAudio && options.whisper) {
      const progress = phase("whisper");
      try {
        await run(whisper, ["-ng", "-oj", "-pp", "-l", options.language, "-m", model, "-f", wav, "-of", transcriptFile], {
          signal,
          onLine: (line) => {
            const value = /progress\s*=\s*(\d+)%/.exec(line);
            if (value) progress(Number(value[1]) / 100);
          },
        });
        const result = JSON.parse(await readFile(transcriptFile + ".json", "utf8"));
        transcript = result.transcription.map(({ offsets, text }) => ({ offsets, text }));
      } catch (error) {
        if (signal.aborted) throw error;
        console.error("Whisper:", error.message);
        notice = "whisperFallback";
      }
      progress(1);
    }
    if (options.soccernet) {
      const progress = phase("soccernet");
      spots = await spotSoccerActions(session, options.soccerConfidence, signal, progress);
      progress(1);
    }
    const vision = { ffmpeg, run, inputOptions, videoArgs, signal, transcodeProgress };
    if (options.scoreRegion) {
      const progress = phase("score");
      try {
        scores = await readScoreboard(session, options.scoreRegion, { ...vision, progress });
      } catch (error) {
        if (signal.aborted) throw error;
        console.error("Scoreboard OCR:", error.message);
        notice ??= "scoreFallback";
      }
      progress(1);
    }
    let clips = suggestClips(levels, transcript, scores, session.duration,
      options.replays ? Math.min(50, options.limit * 2) : options.limit, spots);
    let replays = 0;
    if (options.replays) {
      const progress = phase("replay");
      try {
        ({ clips, replays } = await filterReplayClips(session, clips, options.limit, { ...vision, progress }));
      } catch (error) {
        if (signal.aborted) throw error;
        console.error("Replay detection:", error.message);
        clips = clips.sort((a, b) => b.priority - a.priority).slice(0, options.limit).sort((a, b) => a.start - b.start);
        notice ??= "replayFallback";
      }
      progress(1);
    }
    return { clips: clips.map(({ priority, ...clip }) => clip), transcript, replays, notice };
  } finally {
    await Promise.all([wav, transcriptFile + ".json"].map((file) => rm(file, { force: true })));
  }
}

function scoreRegion(region) {
  if (!region || !canReadScores()) return undefined;
  const { x, y, width, height } = region;
  if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width < 0.015 || height < 0.015 ||
    x + width > 1.001 || y + height > 1.001) throw new RequestError(400, "invalidScoreRegion");
  return { x, y, width, height };
}

function parseClips(input, duration) {
  if (!Array.isArray(input) || !input.length || input.length > 80) {
    throw new RequestError(400, "invalidClips");
  }
  return input.map((clip) => {
    const { start, end } = clip || {};
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > duration + 0.05 || end - start < 0.1) {
      throw new RequestError(400, "invalidClips");
    }
    return { start, end: Math.min(end, duration), framing: clip.framing, tracking: clip.tracking,
      gain: Number.isFinite(clip.gain) ? Math.max(-30, Math.min(24, clip.gain)) : undefined };
  }).sort((a, b) => a.start - b.start);
}

async function exportClips(session, clips, job, signal) {
  const parts = await mkdtemp(join(session.directory, "cut-"));
  const total = clips.reduce((sum, clip) => sum + clip.end - clip.start, 0);
  let completed = 0;
  try {
    const files = [];
    for (const [index, { start, end }] of clips.entries()) {
      const name = `clip-${index}.mp4`;
      const seconds = end - start;
      await run(ffmpeg, [...videoArgs, "-ss", start.toFixed(3), ...inputOptions, "-i", session.source,
        "-t", seconds.toFixed(3), "-map", "0:v:0", "-map", "0:a:0?", "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-ar", "48000", "-ac", "2", "-progress", "pipe:2", "-nostats", join(parts, name)], {
        signal, onLine: (line) => transcodeProgress(line, seconds, (fraction) => {
          job.progress = (completed + fraction * seconds) / total * 95;
        }),
      });
      files.push(`file '${name}'`);
      completed += seconds;
    }
    await writeFile(join(parts, "clips.txt"), files.join("\n"));
    await run(ffmpeg, [...videoArgs, "-f", "concat", "-safe", "1", "-i", join(parts, "clips.txt"),
      "-map", "0", "-c", "copy", "-movflags", "+faststart", session.output], { signal });
    return { download: true };
  } finally {
    await rm(parts, { recursive: true, force: true });
  }
}

function startJob(session, phase, task) {
  if (session.job?.state === "running") throw new RequestError(409, "busy");
  const controller = new AbortController();
  const job = { state: "running", phase, progress: 0 };
  session.job = job;
  session.controller = controller;
  session.task = (async () => {
    try {
      job.result = await task(job, controller.signal);
      job.progress = 100;
      job.state = "done";
    } catch (error) {
      job.state = controller.signal.aborted ? "cancelled" : "failed";
      if (job.state === "failed" && error instanceof RequestError) job.error = error.message;
      if (job.state === "failed") console.error(phase, error.message);
    }
  })();
  return job;
}

function json(response, data, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(data));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new RequestError(413, "invalidClips");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function saveSource(request) {
  if (Number(request.headers["content-length"]) > maxSize) throw new RequestError(413, "fileTooLarge");
  const id = randomUUID();
  const directory = join(work, id);
  await mkdir(directory);
  const source = join(directory, "source");
  try {
    let received = 0;
    await pipeline(request, new Transform({
      transform(chunk, _encoding, next) {
        received += chunk.length;
        next(received > maxSize ? new RequestError(413, "fileTooLarge") : null, chunk);
      },
    }), createWriteStream(source));
    let info;
    try {
      info = JSON.parse(await run(ffprobe, ["-v", "error", ...inputOptions, "-show_entries",
        "format=duration:stream=codec_type", "-of", "json", source]));
    } catch (error) {
      console.error("ffprobe:", error.message);
      throw new RequestError(400, "invalidVideo");
    }
    const duration = Number(info.format?.duration);
    if (!(duration > 0 && duration <= 8 * 3600) || !info.streams?.some((stream) => stream.codec_type === "video")) {
      throw new RequestError(400, "invalidVideo");
    }
    const audio = info.streams.some((stream) => stream.codec_type === "audio");
    sessions.set(id, { directory, source, output: join(directory, "highlights.mp4"), duration, audio, assets: new Map(), lastUsed: Date.now() });
    return { id, duration };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

const pages = new Set(["index.html", "style.css", "script.js", "translations.js", "video-thumbnail.js", "local-library.js", "highlights.js", "highlights-montage.js"]);
const mediaDirectories = new Set(["backgrounds", "logos", "goalscorers", "uefa_screens", "thumbnails"]);
const contentTypes = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".avif": "image/avif", ".gif": "image/gif", ".svg": "image/svg+xml",
};
const realRoot = await realpath(root);

async function discardSession(id, session) {
  sessions.delete(id);
  session.controller?.abort();
  await session.task;
  await rm(session.directory, { recursive: true, force: true });
}

setInterval(() => {
  const cutoff = Date.now() - 3 * 60 * 60 * 1000;
  for (const [id, session] of sessions) {
    if (session.lastUsed < cutoff && session.job?.state !== "running") {
      discardSession(id, session).catch((error) => console.error(error.message));
    }
  }
}, 15 * 60 * 1000).unref();

async function serveFile(url, response, headOnly) {
  const path = decodeURIComponent(url.pathname).slice(1) || "index.html";
  if (!pages.has(path) && !mediaDirectories.has(path.split("/")[0].toLowerCase())) throw new RequestError(404, "notFound");
  const type = contentTypes[extname(path).toLowerCase()];
  if (!type) throw new RequestError(404, "notFound");
  let file;
  try {
    file = await realpath(resolve(root, path));
    if (!file.startsWith(realRoot + sep) || !(await stat(file)).isFile()) throw new Error();
  } catch {
    throw new RequestError(404, "notFound");
  }
  response.writeHead(200, { "Content-Type": type });
  if (headOnly) response.end();
  else await pipeline(createReadStream(file), response);
}

const server = createServer({ requestTimeout: 0 }, async (request, response) => {
  try {
    if (request.headers.host !== host) throw new RequestError(403, "forbidden");
    const url = new URL(request.url, origin);
    const method = request.method;
    if (!url.pathname.startsWith("/api/highlights/")) {
      if (method !== "GET" && method !== "HEAD") throw new RequestError(405, "notFound");
      return await serveFile(url, response, method === "HEAD");
    }
    const requestOrigin = request.headers.origin;
    if (requestOrigin && !editorOrigins.has(requestOrigin)) throw new RequestError(403, "forbidden");
    if (requestOrigin) {
      response.setHeader("Access-Control-Allow-Origin", requestOrigin);
      response.setHeader("Vary", "Origin");
    }
    if (method === "OPTIONS" && requestOrigin) {
      response.writeHead(204, {
        "Access-Control-Allow-Methods": "GET, POST, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, X-UCL-Highlights",
      });
      return response.end();
    }
    if (method !== "GET" && request.headers["x-ucl-highlights"] !== "1") throw new RequestError(403, "forbidden");
    if (method === "GET" && url.pathname === "/api/highlights/status") return json(response, await capabilities());
    if (method === "POST" && url.pathname === "/api/highlights/source") return json(response, await saveSource(request), 201);

    const match = /^\/api\/highlights\/([0-9a-f-]{36})(?:\/(analyze|enhance|export|cancel|download|asset|track)(?:\/([a-z0-9-]+))?)?$/.exec(url.pathname);
    const session = match && sessions.get(match[1]);
    if (!session) throw new RequestError(404, "sessionMissing");
    session.lastUsed = Date.now();
    const action = match[2];
    if (method === "POST" && action === "asset" && assetSlot.test(match[3])) {
      if (session.job?.state === "running") throw new RequestError(409, "busy");
      const slot = match[3];
      const extension = { music: ".audio", "outro-video": ".video" }[slot] ?? ".png";
      const file = join(session.directory, slot + extension);
      let size = 0;
      const limit = 64 * 1024 ** 2;
      if (Number(request.headers["content-length"]) > limit) throw new RequestError(413, "assetTooLarge");
      try {
        await pipeline(request, new Transform({
          transform(chunk, _, next) {
            size += chunk.length;
            next(size > limit ? new RequestError(413, "assetTooLarge") : null, chunk);
          },
        }), createWriteStream(file));
        session.assets.set(slot, file);
        return json(response, {});
      } catch (error) {
        session.assets.delete(slot);
        await rm(file, { force: true });
        throw error;
      }
    }
    if (method === "GET" && !action) return json(response, session.job || { state: "idle" });
    if (method === "DELETE" && !action) {
      await discardSession(match[1], session);
      return json(response, {});
    }
    if (method === "POST" && action === "cancel") {
      if (session.job?.state === "running") session.controller.abort();
      return json(response, {});
    }
    if (method === "POST" && action === "analyze") {
      const body = await readJson(request);
      const options = {
        soccernet: body.engine === "soccernet",
        soccerConfidence: Number.isInteger(body.soccerConfidence) ? Math.max(5, Math.min(100, body.soccerConfidence)) : 20,
        whisper: body.whisper === true,
        language: ["auto", "fr", "en", "es", "it", "de", "pt"].includes(body.language) ? body.language : "auto",
        limit: Math.max(1, Math.min(40, Number.isInteger(body.limit) ? body.limit : 20)),
        scoreRegion: scoreRegion(body.scoreRegion),
        replays: body.replays === true,
      };
      if (options.soccernet && !await canSpotSoccerActions()) throw new RequestError(503, "soccernetUnavailable");
      return json(response, startJob(session, options.soccernet ? "soccernet" : "audio",
        (job, signal) => analyze(session, options, job, signal)), 202);
    }
    if (method === "POST" && (action === "enhance" || action === "export")) {
      const body = await readJson(request);
      const clips = parseClips(body.clips, session.duration);
      const tools = { ffmpeg, ffprobe, run, inputOptions, videoArgs, transcodeProgress, enhanceFrames };
      if (action === "enhance") {
        if (!body.montage || !await canEnhanceVideo()) throw new RequestError(503, "enhancementUnavailable");
        const key = enhancementKey(clips, body.montage);
        return json(response, startJob(session, "export", async (job, signal) => {
          const path = join(session.directory, `enhanced-${randomUUID()}.mp4`);
          try {
            await renderMontage(session, clips, body.montage, job, signal, tools, { prepareTo: path });
            signal.throwIfAborted();
            if (session.enhancement) await rm(session.enhancement.path, { force: true });
            session.enhancement = { key, path };
            return { enhanced: true };
          } catch (error) {
            await rm(path, { force: true }).catch(() => {});
            throw error;
          }
        }), 202);
      }
      let preparedFrom;
      if (body.montage?.useEnhanced === true) {
        if (session.enhancement?.key !== enhancementKey(clips, body.montage)) {
          throw new RequestError(409, "enhancementOutdated");
        }
        preparedFrom = session.enhancement.path;
      }
      const task = body.montage
        ? async (job, signal) => {
          const result = await renderMontage(session, clips, body.montage, job, signal, tools, { preparedFrom });
          session.downloadName = body.montage.format === "short" ? "short-9x16.mp4" : "resume-16x9.mp4";
          return result;
        }
        : (job, signal) => exportClips(session, clips, job, signal);
      return json(response, startJob(session, "export", task), 202);
    }
    if (method === "POST" && action === "track") {
      const body = await readJson(request);
      const clip = parseClips([body.clip], session.duration)[0];
      const { x, y, width, height } = body.region || {};
      const anchor = body.anchor;
      if (clip.end - clip.start > 120 || !Number.isFinite(anchor) || anchor < clip.start || anchor > clip.end ||
        ![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width < 0.008 || height < 0.008 ||
        x + width > 1.0001 || y + height > 1.0001) throw new RequestError(400, "invalidTracking");
      return json(response, startJob(session, "tracking", (job, signal) => trackSubject(session, clip, body.region,
        anchor, { ffmpeg, run, inputOptions, videoArgs, signal, transcodeProgress, job })), 202);
    }
    if (method === "GET" && action === "download" && session.job?.state === "done" && session.job.result?.download) {
      const info = await stat(session.output);
      response.writeHead(200, {
        "Content-Type": "video/mp4", "Content-Length": info.size,
        "Content-Disposition": `attachment; filename="${session.downloadName || "highlights.mp4"}"`, "Cache-Control": "no-store",
      });
      return await pipeline(createReadStream(session.output), response);
    }
    throw new RequestError(404, "notFound");
  } catch (error) {
    if (response.headersSent || response.destroyed) return;
    if (!(error instanceof RequestError)) console.error(error.message);
    json(response, { error: error.status ? error.message : "operationFailed" }, error.status || 500);
  }
});

server.listen(port, "127.0.0.1", () => console.log(`Highlights: ${origin}`));
async function shutdown() {
  server.close();
  for (const session of sessions.values()) session.controller?.abort();
  await Promise.all([...sessions.values()].map((session) => session.task));
  await rm(work, { recursive: true, force: true });
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
