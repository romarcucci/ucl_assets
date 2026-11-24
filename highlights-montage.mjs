import { copyFile, link, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const assetSlot = /^(?:outro|outro-video|music|graphic-[0-9a-f-]{36})$/;
const clamp = (value, low, high, fallback) => Number.isFinite(Number(value)) ? Math.min(high, Math.max(low, Number(value))) : fallback;
const seconds = (value) => Number(value).toFixed(3);
const even = (value) => Math.max(2, 2 * Math.round(value / 2));
const outroFade = 0.25;
const graphicTransitionDuration = 0.625;
const graphicWipeFeather = 0.018;
const graphicWipeEdges = {
  "slide-left-right": ["X/W", "1-X/W"],
  "slide-top-down": ["Y/H", "1-Y/H"],
  "slide-bottom-up": ["1-Y/H", "Y/H"],
};
const graphicTransitions = new Set(["none", "vertical", "horizontal", "lightning", "fade", "glow", ...Object.keys(graphicWipeEdges)]);

function fadeToBlack(duration) {
  const lastFrame = Math.max(0, Math.ceil(duration * 30 - 0.001) - 1);
  const frames = Math.max(1, Math.min(lastFrame, Math.round(outroFade * 30)));
  return lastFrame ? `fade=t=out:s=${lastFrame - frames}:n=${frames}` : "fade=t=in:s=0:n=1";
}

export function montageSettings(raw = {}, duration) {
  const portrait = raw.format === "short";
  const audio = raw.audio || {};
  return {
    width: portrait ? 1080 : 1920, height: portrait ? 1920 : 1080, portrait,
    fastEnhancement: raw.enhancementMode === "fast",
    archive: raw.archive === true,
    framing: framing(raw.framing, portrait),
    audio: {
      gain: clamp(audio.gain, -30, 24, 0),
      offset: clamp(audio.offset, -10000, 10000, 0),
      endOffset: audio.drift ? clamp(audio.endOffset, -10000, 10000, 0) : null,
      normalize: audio.normalize === true,
    },
    clock: Array.isArray(raw.clock) ? raw.clock.slice(0, 3).map((entry) => ({
      at: clamp(entry.at, 0, duration, 0), seconds: clamp(entry.seconds, 0, 9600, 0),
      score: /^\d{1,2}[-–:]\d{1,2}$/.test(entry.score) ? entry.score.replace(/[–:]/g, "-") : "",
    })).sort((a, b) => a.at - b.at) : [],
    matchPeriods: Array.isArray(raw.matchPeriods) ? raw.matchPeriods.slice(0, 2)
      .flatMap((at, index) => Number.isFinite(at) && at >= 0 && at < duration ? [{ at, start: index * 2700 }] : [])
      .sort((a, b) => a.at - b.at) : [],
    graphics: Array.isArray(raw.graphics) ? raw.graphics.slice(0, 32).filter((entry) => assetSlot.test(entry.slot) && entry.slot.startsWith("graphic-"))
      .map((entry) => ({
        slot: entry.slot, at: clamp(entry.at, 0, duration, 0), length: clamp(entry.length, 0.001, duration + 1, 5),
        x: clamp(entry.x, 0, 100, 50), y: clamp(entry.y, 0, 100, 15), size: clamp(entry.size, 5, 100, 80),
        motion: ["fade", "slide", "none"].includes(entry.motion) ? entry.motion : "fade",
        intro: graphicTransitions.has(entry.intro) ? entry.intro : undefined,
        outro: graphicTransitions.has(entry.outro) ? entry.outro : undefined,
        clock: graphicClockBounds(raw.graphicClocks?.[entry.slot]),
      })) : [],
    outro: raw.outro === true,
    outroVideo: raw.outroVideo === true,
    outroLength: clamp(raw.outroLength, 2, 25, 8),
    music: raw.music === true,
    musicGain: clamp(raw.musicGain, -40, 12, -8),
  };
}

function graphicClockBounds(bounds) {
  if (!bounds || ![bounds.x, bounds.y, bounds.size].every(Number.isFinite)) return undefined;
  return { x: clamp(bounds.x, 0, 1, 0.5), y: clamp(bounds.y, 0, 1, 0.5), size: clamp(bounds.size, 0.001, 0.5, 0.03) };
}

function graphicTransitionFilters(graphic, from, to) {
  const span = graphicTransitionDuration;
  const windows = [
    [graphic.intro, from, from + span, `T-(${seconds(from)})`, 0],
    [graphic.outro, to - span, to, `(${seconds(to)})-T`, 1],
  ].filter(([effect]) => effect && effect !== "none");
  if (windows.length === 0) return [];
  const masks = [];
  const flashes = [];
  const glows = [];
  const enabled = [];
  for (const [effect, start, end, elapsed, phase] of windows) {
    const window = `between(T,${seconds(start)},${seconds(end)})`;
    const linear = `clip((${elapsed})/${span},0,1)`;
    const progress = `(pow(${linear},2)*(3-2*${linear}))`;
    const edge = graphicWipeEdges[effect]?.[phase] ??
      (effect === "vertical" ? "abs(2*Y/H-1)" : effect === "horizontal" ? "abs(2*X/W-1)" : "");
    const mask = edge ? `clip((${progress}*${1 + graphicWipeFeather}-(${edge}))/${graphicWipeFeather},0,1)` : progress;
    masks.push(`if(${window},${mask},1)`);
    if (effect === "lightning") flashes.push(`if(${window},4*(1-${progress}),0)`);
    if (effect === "glow") glows.push(`if(${window},4*${progress}*(1-${progress}),0)`);
    enabled.push(`between(t,${seconds(start)},${seconds(end)})`);
  }
  const channels = ["r", "g", "b"].map((channel, index) => {
    const sample = `${channel}(X,Y)`;
    const level = flashes.length ? `min(255,${sample}*(1+${flashes.join("+")}))` : sample;
    const value = glows.length ? `if(gt(alpha(X,Y),0),${level},${[215, 240, 255][index]})` : level;
    return `${channel}='${value}'`;
  });
  const halo = "(alpha(X-5,Y)+alpha(X+5,Y)+alpha(X,Y-5)+alpha(X,Y+5)+0.5*(alpha(X-13,Y)+alpha(X+13,Y)+alpha(X,Y-13)+alpha(X,Y+13)))/6";
  const opacity = glows.length ? `max(alpha(X,Y),0.8*(${glows.join("+")})*(${halo}))` : "alpha(X,Y)";
  const alpha = `a='${opacity}*${masks.join("*")}'`;
  return ["format=gbrap", `geq=${[...channels, alpha, `enable='${enabled.join("+")}'`].join(":")}`];
}

function framing(raw = {}, portrait) {
  return {
    mode: raw.mode === "blur" ? "blur" : raw.mode === "fit" ? "fit" : raw.mode === "fill" ? "fill" : portrait ? "blur" : "fill",
    zoom: clamp(raw.zoom, 1, 3, 1), x: clamp(raw.x, -1, 1, 0), y: clamp(raw.y, -1, 1, 0),
    endX: raw.motion ? clamp(raw.endX, -1, 1, 0) : null,
    endY: raw.motion ? clamp(raw.endY, -1, 1, 0) : null,
    blur: clamp(raw.blur, 4, 65, 24),
    cropTop: clamp(raw.cropTop, 0, 45, 0) / 100,
    cropBottom: clamp(raw.cropBottom, 0, 45, 0) / 100,
  };
}

function position(start, end, length) {
  return end === null ? seconds((start + 1) / 2) :
    `(${seconds((start + 1) / 2)}+(${seconds((end - start) / 2)})*min(1,t/${seconds(length)}))`;
}

function trackedPosition(tracking, axis, start) {
  if (!["both", axis].includes(tracking?.axis) || !Array.isArray(tracking.points)) return null;
  const points = tracking.points.slice(0, 100).filter((point) => Number.isFinite(point?.at) && Number.isFinite(point[axis]))
    .sort((a, b) => a.at - b.at);
  const at = (point) => seconds(point.at - start);
  const value = (point) => clamp(point[axis], 0, 1, 0.5).toFixed(5);
  function section(first, last) {
    if (first === last) return value(points[first]);
    if (last === first + 1) {
      const a = points[first], b = points[last];
      return `(${value(a)}+(${value(b)}-${value(a)})*clip((t-(${at(a)}))/${seconds(Math.max(.001, b.at - a.at))},0,1))`;
    }
    const middle = Math.floor((first + last) / 2);
    return `if(lt(t,${at(points[middle])}),${section(first, middle)},${section(middle, last)})`;
  }
  return points.length ? section(0, points.length - 1) : null;
}

function videoGraph(settings, crop, clip) {
  const { width: w, height: h, archive } = settings;
  const length = clip.end - clip.start;
  const x = position(crop.x, crop.endX, length);
  const y = position(crop.y, crop.endY, length);
  const trackingX = settings.portrait && trackedPosition(clip.tracking, "x", clip.start);
  const sourceTrackingY = settings.portrait && trackedPosition(clip.tracking, "y", clip.start);
  const remaining = 1 - crop.cropTop - crop.cropBottom;
  const trackingY = sourceTrackingY && (remaining === 1 ? sourceTrackingY :
    `((${sourceTrackingY})-${crop.cropTop})/${remaining}`);
  const trim = remaining < 1
    ? `,crop=iw:ih-2*floor(ih*${crop.cropTop}/2)-2*floor(ih*${crop.cropBottom}/2):0:2*floor(ih*${crop.cropTop}/2)`
    : "";
  const start = `[0:v]${archive ? "bwdif=mode=send_frame:deint=interlaced,hqdn3d=1.4:1.2:3:2.5," : ""}scale=trunc(iw*sar/2)*2:ih,setsar=1,fps=30,format=yuv420p,setpts=PTS-STARTPTS${trim}`;
  const scaleFill = `scale=${even(w * crop.zoom)}:${even(h * crop.zoom)}:force_original_aspect_ratio=increase:force_divisible_by=2`;
  if (crop.mode === "fill") {
    const left = trackingX ? `clip(iw*(${trackingX})-ow/2,0,iw-ow)` : `(iw-ow)*${x}`;
    const top = trackingY ? `clip(ih*(${trackingY})-oh/2,0,ih-oh)` : `(ih-oh)*${y}`;
    return [`${start},${scaleFill},crop=${w}:${h}:'${left}':'${top}'[base]`];
  }
  const foreground = `[fg]scale=${even(w * (crop.mode === "blur" ? 0.94 : 1) * crop.zoom)}:${even(h * crop.zoom)}:force_original_aspect_ratio=decrease:force_divisible_by=2[sharp]`;
  const backdrop = crop.mode === "blur"
    ? `[bg]scale=${w}:${h}:force_original_aspect_ratio=increase:force_divisible_by=2,crop=${w}:${h},gblur=sigma=${crop.blur}:steps=2,eq=brightness=-0.12[backdrop]`
    : `[bg]scale=${w}:${h},drawbox=color=black:t=fill[backdrop]`;
  const left = trackingX ? `clip(W/2-w*(${trackingX}),min(0,W-w),max(0,W-w))` : `(W-w)*${x}`;
  const top = trackingY ? `clip(H/2-h*(${trackingY}),min(0,H-h),max(0,H-h))` : `(H-h)*${y}`;
  return [`${start},split[bg][fg]`, foreground, backdrop,
    `[backdrop][sharp]overlay=x='${left}':y='${top}':shortest=1[base]`];
}

function audioGraph(settings, clip, pad) {
  const audio = { ...settings.audio, ...(clip.gain === undefined ? {} : { gain: clip.gain }) };
  const rate = audio.rate;
  const filters = [`atempo=${rate.toFixed(8)}`, "aresample=48000", "aformat=channel_layouts=stereo"];
  if (pad > 0) filters.push(`adelay=${Math.round(pad * 1000)}:all=1`);
  filters.push(`volume=${audio.gain}dB`, "apad");
  return `[1:a]${filters.join(",")}[sound]`;
}

const encoding = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-ar", "48000", "-ac", "2"];

async function clockFont(directory) {
  const choices = [process.env.UCL_MONTAGE_FONT,
    process.env.WINDIR && join(process.env.WINDIR, "Fonts", "arial.ttf"),
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/System/Library/Fonts/Supplemental/Arial.ttf"];
  for (const source of choices.filter(Boolean)) {
    try { await copyFile(source, join(directory, "clock.ttf")); return; } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  throw new Error("No local font found for the match clock");
}

function matchClock(graph, label, settings, start, end) {
  let output = label;
  settings.clock.forEach((anchor, index, anchors) => {
    const next = anchors[index + 1]?.at ?? Infinity;
    if (anchor.at >= end || next <= start) return;
    const begin = Math.max(0, anchor.at - start);
    const finish = Math.min(end, next) - start;
    const offset = start - anchor.at + anchor.seconds;
    const time = `(t+(${seconds(offset)}))`;
    const display = `${anchor.score ? anchor.score + "   " : ""}%{eif\\:floor(${time}/60)\\:d\\:2}\\:%{eif\\:mod(${time},60)\\:d\\:2}`;
    const nextLabel = `clock${index}`;
    graph.push(`[${output}]drawtext=fontfile=clock.ttf:text='${display}':fontsize=${settings.portrait ? 34 : 38}:fontcolor=white:box=1:boxcolor=0x061229e8:boxborderw=12:x=(w-tw)/2:y=h*0.075:enable='gte(t,${seconds(begin)})*lt(t,${seconds(finish)})'[${nextLabel}]`);
    output = nextLabel;
  });
  return output;
}

function graphicClockFilters(clock, periods, start, end) {
  if (!clock) return [];
  return periods.flatMap((period, index) => {
    const begin = Math.max(start, period.at);
    const finish = Math.min(end, periods[index + 1]?.at ?? end);
    if (begin >= finish) return [];
    const time = `(min(2700,max(0,t+(${seconds(start - period.at)})))+${period.start})`;
    const text = `%{eif\\:floor(${time}/60)\\:d\\:2}\\:%{eif\\:mod(floor(${time}),60)\\:d\\:2}`;
    return [`drawtext=fontfile=clock.ttf:text='${text}':fontcolor=white:fontsize=w*${clock.size}:x=w*${clock.x}-tw/2:y=h*${clock.y}-th/2:enable='gte(t,${seconds(begin - start)})*lt(t,${seconds(finish - start)})'`];
  });
}

async function enhanceFinalVideo(work, output, settings, job, signal, { ffmpeg, run, videoArgs, enhanceFrames }) {
  job.phase = "enhancement";
  job.progress = 15;
  const input = "assembled.mp4";
  const runVideo = (args) => run(ffmpeg, [...videoArgs, ...args], { cwd: work, signal });
  await runVideo(["-i", input, "-map", "0:v:0", "-c:v", "copy", "-f", "segment",
    "-segment_time", "5", "-reset_timestamps", "1", "enhancement-source-%05d.mp4"]);
  const segments = (await readdir(work)).filter((name) => /^enhancement-source-\d+\.mp4$/.test(name)).sort();
  const sourceFrames = join(work, "source-frames");
  const enhancedFrames = join(work, "enhanced-frames");
  await mkdir(sourceFrames);
  await mkdir(enhancedFrames);
  const files = [];
  const inputScale = settings.fastEnhancement
    ? ["-vf", `scale=${settings.width / 2}:${settings.height / 2}:flags=lanczos`]
    : [];
  for (const [index, segment] of segments.entries()) {
    signal?.throwIfAborted();
    await runVideo(["-i", segment, "-map", "0:v:0", ...inputScale, "-fps_mode", "passthrough",
      join(sourceFrames, "%08d.png")]);
    const frames = await readdir(sourceFrames);
    await enhanceFrames(sourceFrames, enhancedFrames, signal, (done) => {
      job.progress = 15 + (index + Math.min(done / frames.length, 1)) / segments.length * 83;
    });
    const enhanced = new Set(await readdir(enhancedFrames));
    if (frames.length !== enhanced.size || frames.some((name) => !enhanced.has(name))) {
      throw new Error("Incomplete video enhancement");
    }
    const name = `enhancement-output-${index}.mp4`;
    await runVideo(["-framerate", "30", "-i", join(enhancedFrames, "%08d.png"),
      "-vf", `scale=${settings.width}:${settings.height}:flags=lanczos,setsar=1`,
      ...encoding, name]);
    files.push(name);
    for (const frame of frames) {
      await rm(join(sourceFrames, frame));
      await rm(join(enhancedFrames, frame));
    }
    job.progress = 15 + (index + 1) / segments.length * 83;
  }
  await writeFile(join(work, "enhanced.txt"), files.map((name) => `file '${name}'`).join("\n"));
  await runVideo(["-f", "concat", "-safe", "1", "-i", "enhanced.txt", "-i", input,
    "-map", "0:v:0", "-map", "1:a:0", "-c", "copy", "-movflags", "+faststart", output]);
}

export async function renderMontage(session, clips, raw, job, signal, tools, { prepareTo, preparedFrom } = {}) {
  const { ffmpeg, ffprobe, run, inputOptions, videoArgs, transcodeProgress } = tools;
  const settings = montageSettings(raw, session.duration);
  const card = !prepareTo && settings.outro && session.assets?.get(settings.outroVideo ? "outro-video" : "outro");
  const work = await mkdtemp(join(session.directory, "montage-"));
  const total = clips.reduce((sum, clip) => sum + clip.end - clip.start, 0);
  const files = [];
  const audio = settings.audio;
  audio.rate = 1 - (audio.endOffset === null ? 0 : (audio.endOffset - audio.offset) / 1000 / session.duration);
  audio.rate = Math.max(0.98, Math.min(1.02, audio.rate));
  try {
    if (preparedFrom) {
      const filename = "enhanced-clips.mp4";
      const target = join(work, filename);
      if (card) {
        const duration = Number(await run(ffprobe, ["-v", "error", "-select_streams", "v:0",
          "-show_entries", "stream=duration", "-of", "csv=p=0", preparedFrom], { signal }));
        await run(ffmpeg, [...videoArgs, "-i", preparedFrom,
          "-vf", fadeToBlack(duration > 0 ? duration : total), ...encoding, "-c:a", "copy", target], { signal });
      } else {
        await link(preparedFrom, target).catch(() => copyFile(preparedFrom, target));
      }
      files.push(filename);
    } else if (settings.clock.length || (settings.matchPeriods.length && settings.graphics.some((graphic) => graphic.clock))) {
      await clockFont(work);
    }
    let complete = 0;
    for (const [index, clip] of (preparedFrom ? [] : clips).entries()) {
      const { start, end } = clip;
      const length = end - start;
      const sourceAudio = start * audio.rate - audio.offset / 1000;
      const useSourceAudio = session.audio && sourceAudio < session.duration;
      const args = [...videoArgs, "-ss", seconds(start), ...inputOptions, "-i", session.source];
      if (useSourceAudio) args.push("-ss", seconds(Math.max(0, sourceAudio)), ...inputOptions, "-i", session.source);
      else args.push("-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo");
      const graph = videoGraph(settings, clip.framing ? framing(clip.framing, settings.portrait) : settings.framing, clip);
      let label = "base", nextInput = 2;
      for (const graphic of settings.graphics) {
        const asset = session.assets?.get(graphic.slot);
        if (!asset || graphic.at >= end || graphic.at + graphic.length <= start) continue;
        args.push("-loop", "1", "-framerate", "30", "-i", asset);
        const layer = `layer${nextInput}`;
        const shown = `with${nextInput}`;
        const from = graphic.at - start;
        const to = from + graphic.length;
        const fade = Math.min(0.3, graphic.length / 3);
        const filters = [`scale=${even(settings.width * graphic.size / 100)}:-2`, "format=rgba"];
        filters.push(...graphicClockFilters(graphic.clock, settings.matchPeriods, start, end));
        const hasTransitions = graphic.intro !== undefined || graphic.outro !== undefined;
        if (hasTransitions) {
          filters.push(...graphicTransitionFilters(graphic, from, to));
        } else if (graphic.motion === "fade") {
          const phase = Math.max(0, -from);
          filters.push(`setpts=PTS+${seconds(phase)}/TB`, `fade=t=in:st=0:d=${seconds(fade)}:alpha=1`,
            `fade=t=out:st=${seconds(graphic.length - fade)}:d=${seconds(fade)}:alpha=1`,
            `setpts=PTS+${seconds(from)}/TB`);
        }
        graph.push(`[${nextInput}:v]${filters.join(",") }[${layer}]`);
        const x = `(W-w)*${graphic.x / 100}`;
        const y = `(H-h)*${graphic.y / 100}`;
        const horizontal = !hasTransitions && graphic.motion === "slide"
          ? `(W-w)*${graphic.x / 100}-W*max(0,1-min((t-(${seconds(from)}))/${seconds(fade)},((${seconds(to)})-t)/${seconds(fade)}))`
          : x;
        graph.push(`[${label}][${layer}]overlay=x='${horizontal}':y='${y}':enable='between(t,${seconds(Math.max(0, from))},${seconds(to)})'[${shown}]`);
        label = shown;
        nextInput++;
      }
      label = matchClock(graph, label, settings, start, end);
      const fade = card && index === clips.length - 1 ? `,${fadeToBlack(length)}` : "";
      graph.push(`[${label}]setsar=1${fade}[video]`);
      graph.push(useSourceAudio ? audioGraph(settings, clip, Math.max(0, -sourceAudio / audio.rate)) : "[1:a]anull[sound]");
      const name = `clip-${index}.mp4`;
      await run(ffmpeg, [...args, "-filter_complex_threads", "3", "-filter_complex", graph.join(";"),
        "-map", "[video]", "-map", "[sound]", "-t", seconds(length), ...encoding,
        "-progress", "pipe:2", "-nostats", name], {
        cwd: work, signal, onLine: (line) => transcodeProgress(line, length, (fraction) => {
          job.progress = (complete + fraction * length) / total * (prepareTo ? 14 : 85);
        }),
      });
      files.push(name);
      complete += length;
    }
    if (prepareTo) {
      await writeFile(join(work, "clips.txt"), files.map((name) => `file '${name}'`).join("\n"));
      await run(ffmpeg, [...videoArgs, "-f", "concat", "-safe", "1", "-i", "clips.txt",
        "-c", "copy", "assembled.mp4"], { cwd: work, signal });
      await enhanceFinalVideo(work, prepareTo, settings, job, signal, tools);
      return;
    }
    if (card) {
      const music = settings.music && session.assets?.get("music");
      const info = settings.outroVideo && JSON.parse(await run(ffprobe, ["-v", "error", ...inputOptions,
        "-show_entries", "stream=codec_type,duration:format=duration", "-of", "json", card], { signal }));
      const nativeAudio = info && !music && info.streams.some((stream) => stream.codec_type === "audio");
      const videoDuration = Number(info && (info.streams.find((stream) => stream.codec_type === "video")?.duration
        ?? info.format?.duration));
      const visualInput = settings.outroVideo ? inputOptions : ["-loop", "1", "-framerate", "30"];
      const audioInput = music ? ["-stream_loop", "-1", "-protocol_whitelist", "file,pipe", "-format_whitelist",
        "mp3,wav,flac,ogg,mov,aac,matroska", "-i", music]
        : nativeAudio ? [] : ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"];
      const length = settings.outroVideo
        ? videoDuration > 0 ? ["-t", seconds(videoDuration)] : ["-shortest"]
        : ["-t", seconds(settings.outroLength)];
      const fit = `scale=${settings.width}:${settings.height}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${settings.width}:${settings.height}:(ow-iw)/2:(oh-ih)/2,setsar=1`;
      const visualFilter = settings.outroVideo ? `scale=trunc(iw*sar/2)*2:ih,setsar=1,${fit},fps=30` : `setsar=1,${fit}`;
      const audioFilter = settings.outroVideo ? nativeAudio ? "apad" : `volume=${settings.musicGain}dB`
        : `volume=${settings.musicGain}dB,afade=t=in:d=0.25,afade=t=out:st=${settings.outroLength - 0.8}:d=0.8`;
      await run(ffmpeg, [...videoArgs, ...visualInput, "-i", card, ...audioInput,
        "-map", "0:v:0", "-map", nativeAudio ? "0:a:0" : "1:a:0", ...length,
        "-vf", `${visualFilter},fade=t=in:d=${outroFade}`, "-af", audioFilter,
        ...encoding, "outro.mp4"], { cwd: work, signal });
      files.push("outro.mp4");
    }
    await writeFile(join(work, "montage.txt"), files.map((name) => `file '${name}'`).join("\n"));
    const mix = audio.normalize ? ["-c:v", "copy", "-af", "loudnorm=I=-16:LRA=11:TP=-1.5", "-ar", "48000", "-c:a", "aac"] : ["-c", "copy"];
    await run(ffmpeg, [...videoArgs, "-f", "concat", "-safe", "1", "-i", "montage.txt",
      ...mix, "-movflags", "+faststart", session.output], { cwd: work, signal });
    return { download: true, preview: raw.preview === true };
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
