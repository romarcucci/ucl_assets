import { setImmediate as yieldLoop } from "node:timers/promises";

const width = 384, height = 216, fps = 6;
const area = width * height;
const grid = 9;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function samplePatch(frame, x, y, w, h, patch) {
  let sum = 0, squares = 0;
  for (let row = 0; row < grid; row++) {
    const py = clamp(y + ((row + 0.5) / grid - 0.5) * h, 0, height - 1.001);
    const top = Math.floor(py) * width;
    const dy = py - Math.floor(py);
    for (let column = 0; column < grid; column++) {
      const px = clamp(x + ((column + 0.5) / grid - 0.5) * w, 0, width - 1.001);
      const left = Math.floor(px);
      const dx = px - left;
      const a = frame[top + left] * (1 - dx) + frame[top + left + 1] * dx;
      const b = frame[top + width + left] * (1 - dx) + frame[top + width + left + 1] * dx;
      const value = a * (1 - dy) + b * dy;
      patch[row * grid + column] = value;
      sum += value;
      squares += value * value;
    }
  }
  const mean = sum / patch.length;
  const norm = Math.sqrt(Math.max(0, squares - sum * mean));
  if (norm < 22) return false;
  for (let i = 0; i < patch.length; i++) patch[i] = (patch[i] - mean) / norm;
  return true;
}

function compare(patch, reference) {
  let score = 0;
  for (let i = 0; i < patch.length; i++) score += patch[i] * reference[i];
  return score;
}

export async function trackSubject(session, clip, region, anchor, { ffmpeg, run, inputOptions, videoArgs, signal, transcodeProgress, job }) {
  const length = clip.end - clip.start;
  const data = await run(ffmpeg, [...videoArgs, "-ss", clip.start.toFixed(3), ...inputOptions, "-i", session.source,
    "-t", length.toFixed(3), "-map", "0:v:0", "-an", "-vf", `fps=${fps},scale=${width}:${height}:flags=area`,
    "-pix_fmt", "gray", "-f", "rawvideo", "-progress", "pipe:2", "-nostats", "pipe:1"], {
    signal, binary: true,
    onLine: (line) => transcodeProgress(line, length, (fraction) => { job.progress = fraction * 42; }),
  });
  const count = Math.floor(data.length / area);
  if (!count) throw new Error("No video frames for tracking");
  const frame = (index) => data.subarray(index * area, (index + 1) * area);
  const seed = clamp(Math.round((anchor - clip.start) * fps), 0, count - 1);
  const selection = {
    x: (region.x + region.width / 2) * width, y: (region.y + region.height / 2) * height,
    w: Math.max(6, region.width * width), h: Math.max(6, region.height * height),
  };
  const original = new Float32Array(grid ** 2);
  const patch = new Float32Array(original.length);
  if (!samplePatch(frame(seed), selection.x, selection.y, selection.w, selection.h, original)) {
    return { points: [], coverage: 0 };
  }
  const tracked = Array(count);
  tracked[seed] = selection;
  let hits = 1, processed = 1;
  for (const direction of [1, -1]) {
    const reference = original.slice();
    let previous = selection, vx = 0, vy = 0, misses = 0;
    for (let i = seed + direction; i >= 0 && i < count; i += direction) {
      signal.throwIfAborted();
      const current = frame(i);
      const predictedX = previous.x + vx;
      const predictedY = previous.y + vy;
      const radius = Math.min(96, Math.max(25, selection.w * 0.65, selection.h * 0.7) + misses * 8);
      let best;
      function consider(x, y, w, h) {
        if (x < w / 2 || x >= width - w / 2 || y < h / 2 || y >= height - h / 2) return;
        if (!samplePatch(current, x, y, w, h, patch)) return;
        const likeness = Math.max(compare(patch, original), 0.92 * compare(patch, reference));
        const rank = likeness - 0.12 * Math.hypot(x - predictedX, y - predictedY) / radius;
        if (!best || rank > best.rank) best = { x, y, w, h, rank, likeness };
      }
      for (let y = predictedY - radius; y <= predictedY + radius; y += 4) {
        for (let x = predictedX - radius; x <= predictedX + radius; x += 4) consider(x, y, previous.w, previous.h);
      }
      for (let dy = -6; dy <= 6; dy++) {
        for (let dx = -6; dx <= 6; dx++) consider(predictedX + dx, predictedY + dy, previous.w, previous.h);
      }
      if (best) {
        const { x, y } = best;
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            for (const scale of [0.9, 1, 1.1]) {
              consider(x + dx, y + dy, clamp(previous.w * scale, selection.w * .55, selection.w * 1.9),
                clamp(previous.h * scale, selection.h * .55, selection.h * 1.9));
            }
          }
        }
      }
      if (best?.likeness >= (misses > 2 ? 0.83 : 0.69)) {
        vx = clamp((best.x - previous.x) * 0.75 + vx * 0.25, -45, 45);
        vy = clamp((best.y - previous.y) * 0.75 + vy * 0.25, -35, 35);
        previous = best;
        if (best.likeness > 0.86) {
          samplePatch(current, best.x, best.y, best.w, best.h, patch);
          for (let j = 0; j < patch.length; j++) reference[j] = reference[j] * .9 + patch[j] * .1;
        }
        misses = 0;
        hits++;
      } else {
        misses++;
        vx *= .4;
        vy *= .4;
      }
      tracked[i] = previous;
      job.progress = 42 + ++processed / count * 57;
      if (processed % 8 === 0) await yieldLoop();
    }
  }
  const step = Math.max(1, Math.ceil(count / 90));
  const points = tracked.flatMap((point, index) => {
    if (index % step !== 0 && index !== count - 1 && index !== seed) return [];
    const neighbors = tracked.slice(Math.max(0, index - 1), index + 2);
    return [{
      at: Number((clip.start + index / fps).toFixed(3)),
      x: Number((neighbors.reduce((sum, sample) => sum + sample.x, 0) / neighbors.length / width).toFixed(5)),
      y: Number((neighbors.reduce((sum, sample) => sum + sample.y, 0) / neighbors.length / height).toFixed(5)),
    }];
  });
  return { points, coverage: Math.round(hits / count * 100) };
}
