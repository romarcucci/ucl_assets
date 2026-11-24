import { createRequire } from "node:module";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const scoreInterval = 8;
const frameWidth = 12;
const frameHeight = 8;
const frameSize = frameWidth * frameHeight;

export function canReadScores() {
  try {
    require.resolve("tesseract.js");
    require.resolve("@tesseract.js-data/eng");
    return true;
  } catch {
    return false;
  }
}

function parseScore(text) {
  const line = text.trim();
  const pair = /^(\d{1,2})\s*[-:\s]\s*(\d{1,2})$/.exec(line) || /^(\d)(\d)$/.exec(line);
  if (!pair) return null;
  const home = Number(pair[1]);
  const away = Number(pair[2]);
  return home <= 15 && away <= 15 ? { home, away, label: `${home}–${away}` } : null;
}

function confirmedChanges(readings) {
  const events = [];
  let stable, candidate;
  for (const [index, next] of readings.entries()) {
    if (!next) continue;
    if (next.label !== candidate?.label || index - candidate.last > 2) {
      candidate = { ...next, first: index, last: index, hits: 1 };
      continue;
    }
    candidate.last = index;
    candidate.hits++;
    if (candidate.hits < 2 || stable?.label === next.label) continue;
    if (!stable) {
      stable = next;
      continue;
    }
    const home = next.home - stable.home;
    const away = next.away - stable.away;
    if (home === 1 && away === 0 || home === 0 && away === 1) {
      events.push({ time: candidate.first * scoreInterval, score: next.label });
      stable = next;
    } else if (home >= 0 && away >= 0 && candidate.hits >= 3) {
      stable = next;
    }
  }
  return events;
}

export async function readScoreboard(session, region, { ffmpeg, run, videoArgs, inputOptions, signal, progress, transcodeProgress }) {
  const workspace = await mkdtemp(join(session.directory, "scores-"));
  let worker;
  try {
    const crop = [
      `trunc(iw*${region.width}/2)*2`, `trunc(ih*${region.height}/2)*2`,
      `iw*${region.x}`, `ih*${region.y}`,
    ].join(":");
    await run(ffmpeg, [...videoArgs, ...inputOptions, "-i", session.source, "-map", "0:v:0", "-an",
      "-vf", `fps=1/${scoreInterval}:start_time=0,crop=${crop},scale=360:100:force_original_aspect_ratio=decrease,format=gray`,
      "-q:v", "3", "-progress", "pipe:2", "-nostats", join(workspace, "%06d.jpg")], {
      signal, onLine: (line) => transcodeProgress(line, session.duration, (fraction) => progress(fraction * 0.55)),
    });
    const files = (await readdir(workspace)).sort();
    if (files.length < 2) return [];
    signal.throwIfAborted();
    const { createWorker, PSM } = require("tesseract.js");
    const langPath = join(dirname(require.resolve("@tesseract.js-data/eng")), "4.0.0_best_int");
    worker = await createWorker("eng", 1, { langPath, cacheMethod: "none" });
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789-:",
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      user_defined_dpi: "150",
    });
    const readings = [];
    for (const [index, filename] of files.entries()) {
      signal.throwIfAborted();
      const { data } = await worker.recognize(join(workspace, filename));
      readings.push(data.confidence >= 55 ? parseScore(data.text) : null);
      progress(0.55 + (index + 1) / files.length * 0.45);
    }
    return confirmedChanges(readings);
  } finally {
    if (worker) await worker.terminate();
    await rm(workspace, { recursive: true, force: true });
  }
}

function frameError(a, b) {
  let difference = 0;
  for (let i = 0; i < frameSize; i++) difference += Math.abs(a[i] - b[i]);
  return difference / frameSize;
}

function nearFrame(a, b) {
  return a && b && frameError(a, b) <= 9;
}

function duplicateSequence(first, second) {
  for (let i = 0; i < first.length - 4; i++) {
    if (frameError(first[i], first[i + 1]) < 4) continue;
    for (let j = 0; j < second.length - 4; j++) {
      if (!nearFrame(first[i], second[j])) continue;
      for (const rate of [0.67, 0.8, 1, 1.25, 1.5, 2]) {
        let hits = 1;
        let moving = 0;
        const matches = Math.min(7, first.length - i);
        for (let step = 1; step < matches; step++) {
          const position = j + Math.round(step * rate);
          if (nearFrame(first[i + step], second[position])) {
            hits++;
            if (frameError(first[i + step - 1], first[i + step]) >= 4) moving++;
          }
        }
        if (hits >= 5 && moving >= 3) return true;
      }
    }
  }
  return false;
}

export async function filterReplayClips(session, candidates, limit, { ffmpeg, run, videoArgs, inputOptions, signal, progress }) {
  if (candidates.length < 2) return { clips: candidates, replays: 0 };
  const retained = [];
  let replays = 0;
  for (const [index, clip] of candidates.entries()) {
    signal.throwIfAborted();
    const sampleStart = Math.max(clip.start, clip.end - 20);
    const raw = await run(ffmpeg, [...videoArgs, "-ss", sampleStart.toFixed(3), ...inputOptions, "-i", session.source,
      "-t", (clip.end - sampleStart).toFixed(3), "-map", "0:v:0", "-an",
      "-vf", `fps=3,crop=trunc(iw*0.9/2)*2:trunc(ih*0.76/2)*2,scale=${frameWidth}:${frameHeight}:flags=area`,
      "-pix_fmt", "gray", "-f", "rawvideo", "pipe:1"], { signal, binary: true });
    const frames = [];
    for (let offset = 0; offset + frameSize <= raw.length; offset += frameSize) {
      frames.push(raw.subarray(offset, offset + frameSize));
    }
    const duplicate = !clip.score && retained.find((prior) =>
      clip.start - prior.clip.start < 240 && duplicateSequence(prior.frames, frames));
    if (duplicate) {
      if (clip.priority > duplicate.clip.priority) {
        duplicate.clip = { ...clip, start: duplicate.clip.start, end: duplicate.clip.end };
      }
      replays++;
    }
    else retained.push({ clip, frames });
    progress((index + 1) / candidates.length);
  }
  const clips = retained.map(({ clip }) => clip);
  return { clips: clips.sort((a, b) => b.priority - a.priority).slice(0, limit).sort((a, b) => a.start - b.start), replays };
}
