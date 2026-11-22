function cloneShortThumbnail(source) {
  const clone = source.cloneNode(true);
  for (const element of [clone, ...clone.querySelectorAll("[id], [for], [data-target], [aria-describedby]")]) {
    for (const attribute of ["id", "for", "data-target", "aria-describedby"]) {
      const value = element.getAttribute(attribute);
      if (value) element.setAttribute(attribute, value.split(" ").map((id) => "short-" + id).join(" "));
    }
  }
  source.after(clone);
  return clone;
}

const shortThumbnailPanel = cloneShortThumbnail(document.querySelector('[data-editor="video-thumbnail"]'));
shortThumbnailPanel.dataset.editor = "short-thumbnail";
shortThumbnailPanel.querySelector("h2").textContent = "Miniature Short (9:16)";
const shortCompetitionShadow = shortThumbnailPanel.querySelector("#short-vt-competition-shadow");
shortCompetitionShadow.max = 300;
shortThumbnailPanel.querySelector("#short-vt-competition-shadow-number").max = 300;
shortCompetitionShadow.closest("label").querySelector("span").firstChild.nodeValue = "Intensité du halo de contour ";
shortThumbnailPanel.querySelector("#short-vt-competition-halo-size").max = 350;
shortThumbnailPanel.querySelector("#short-vt-competition-halo-size-number").max = 350;
for (const [key, value] of Object.entries({
  titleSize: 208,
  yearSize: 138,
  barLength: 205,
  barThickness: 5,
  barGap: 46,
  barSpacing: 24,
})) {
  const field = shortThumbnailPanel.querySelector(`[data-vt-style="${key}"]`);
  field.defaultValue = field.value = value;
}
const shortThumbnailPreview = cloneShortThumbnail(document.querySelector('[data-preview="video-thumbnail"]'));
shortThumbnailPreview.dataset.preview = "short-thumbnail";
const shortThumbnailBoard = shortThumbnailPreview.querySelector("canvas");
shortThumbnailBoard.width = 1080;
shortThumbnailBoard.height = 1920;

let cutoutSegmenterPromise;

function createThumbnailEditor(tab, portrait = false) {
  const compositionName = portrait ? "Miniature Short" : "Miniature";
  const panel = document.querySelector(`[data-editor="${tab}"]`);
  const byId = (id) => document.getElementById((portrait ? "short-" : "") + id);
  const board = byId("video-thumbnail-board");
  const viewport = byId("vt-preview-viewport");
  const zoomOutput = byId("vt-preview-zoom");
  const width = board.width;
  const height = board.height;
  const title = byId("vt-title");
  const year = byId("vt-year");
  const whiteLogo = byId("vt-white-logo");
  const status = byId("vt-status");
  const layerSelect = byId("vt-layout-layer");
  const controls = {
    x: byId("vt-layout-x"),
    y: byId("vt-layout-y"),
    scale: byId("vt-layout-scale"),
  };
  const shadowControls = Object.fromEntries(
    ["player-surface", "player-shadow", "competition-surface", "competition-shadow", "competition-halo-size", "club-surface", "club-shadow"].map((key) => [
      key, byId(`vt-${key}`),
    ]),
  );
  const shadowColors = {
    "player-shadow": byId("vt-player-shadow-color"),
    competition: byId("vt-competition-shadow-color"),
    leftClub: byId("vt-left-club-shadow-color"),
    rightClub: byId("vt-right-club-shadow-color"),
  };
  const styleControls = Object.fromEntries(
    [...panel.querySelectorAll("[data-vt-style]")].map((field) => [field.dataset.vtStyle, field]),
  );
  function readStyle() {
    return Object.fromEntries(Object.entries(styleControls).map(([key, field]) => {
      if (field.type === "checkbox") return [key, field.checked];
      if (field.type === "number") {
        const value = Number.isFinite(field.valueAsNumber) ? field.valueAsNumber : Number(field.defaultValue);
        return [key, Math.max(Number(field.min), Math.min(Number(field.max), value))];
      }
      return [key, field.value];
    }));
  }

  function applyStyle(settings = {}) {
    for (const [key, field] of Object.entries(styleControls)) {
      if (field.type === "checkbox") field.checked = settings[key] ?? field.defaultChecked;
      else if (field.tagName === "SELECT") field.value = settings[key] ?? field.options[0].value;
      else field.value = settings[key] ?? field.defaultValue;
    }
  }

  const assetInputs = [...panel.querySelectorAll("[data-vt-layer]")];
  const mirrorControls = new Map(
    [...panel.querySelectorAll("[data-vt-mirror]")].map((input) => [input.dataset.vtMirror, input]),
  );
  const cutoutOptions = new Map(["leftPlayer", "rightPlayer"].map((key) => [
    key, {
      checkbox: panel.querySelector(`[data-vt-remove-background="${key}"]`),
      status: byId(key === "leftPlayer" ? "vt-left-cutout-status" : "vt-right-cutout-status"),
    },
  ]));
  const shadingCanvas = document.createElement("canvas");
  const portraitBackground = portrait ? document.createElement("canvas") : null;
  const contourMask = portrait ? document.createElement("canvas") : null;
  const contourHalo = portrait ? document.createElement("canvas") : null;
  let maskedBackgroundArtwork;
  let haloCache;
  const defaults = { x: 0, y: 0, scale: 100 };
  const placements = {
    background: { x: width / 2, y: height / 2, width, height, fit: "cover" },
    leftPlayer: { x: 309, y: 66, height: 950, top: true },
    rightPlayer: { x: 1324, y: 81, height: 931, top: true },
    leftClub: { x: 681, y: 655, width: 166, height: 278, logo: true },
    rightClub: { x: 937, y: 678, width: 158, height: 282, logo: true },
    competition: { x: 799, y: 177, width: 312, height: 276, logo: true },
  };
  const textLayout = portrait
    ? { titleY: 1127, titleWidth: 925, yearY: 1243, yearWidth: 420, vignetteY: 785 }
    : { titleY: 437, titleWidth: 470, yearY: 506, yearWidth: 465, vignetteY: 540 };
  if (portrait) {
    Object.assign(placements, {
      leftPlayer: { x: 270, y: 124, height: 1020, top: true },
      rightPlayer: { x: 810, y: 134, height: 1020, top: true },
      leftClub: { x: 292, y: 1501, width: 330, height: 455, logo: true },
      rightClub: { x: 798, y: 1501, width: 330, height: 455, logo: true },
      competition: { x: 540, y: 800, width: 330, height: 305, logo: true },
    });
  }
  const layers = new Map(Object.keys(placements).map((key) => [
    key, { artwork: null, adjustment: { ...defaults }, loading: false, request: 0 },
  ]));
  for (const key of ["title", "year"]) layers.set(key, { adjustment: { ...defaults } });
  const errors = new Map();
  const previewRegions = new Map();
  let selectedLayer = null;
  let hoveredLayer = null;
  let previewZoom = 1;
  let drag = null;

  function imageBounds(image) {
    const sample = document.createElement("canvas");
    const scale = Math.min(1, 256 / Math.max(image.naturalWidth, image.naturalHeight));
    sample.width = Math.max(1, Math.round(image.naturalWidth * scale));
    sample.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = sample.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, sample.width, sample.height);
    const { data } = context.getImageData(0, 0, sample.width, sample.height);
    let left = sample.width, top = sample.height, right = 0, bottom = 0;

    for (let y = 0; y < sample.height; y++) {
      for (let x = 0; x < sample.width; x++) {
        if (data[(y * sample.width + x) * 4 + 3] < 24) continue;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x + 1);
        bottom = Math.max(bottom, y + 1);
      }
    }
    if (right <= left || bottom <= top) return [0, 0, image.naturalWidth, image.naturalHeight];
    const scaleX = image.naturalWidth / sample.width;
    const scaleY = image.naturalHeight / sample.height;
    return [left * scaleX, top * scaleY, (right - left) * scaleX, (bottom - top) * scaleY];
  }

  function shadeImage(image, bounds, strength, makeWhite) {
    const [, , sourceWidth, sourceHeight] = bounds;
    const scale = Math.min(1, 2048 / Math.max(sourceWidth, sourceHeight));
    const w = Math.max(1, Math.round(sourceWidth * scale));
    const h = Math.max(1, Math.round(sourceHeight * scale));
    shadingCanvas.width = w;
    shadingCanvas.height = h;
    const context = shadingCanvas.getContext("2d");
    if (makeWhite) context.filter = "brightness(0) invert(1)";
    context.drawImage(image, ...bounds, 0, 0, w, h);
    context.filter = "none";
    context.globalCompositeOperation = "source-atop";
    const gradient = context.createLinearGradient(0, 0, w * 0.25, h);
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(0.3, `rgba(0, 0, 0, ${strength * 0.16})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${strength})`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, w, h);
    return shadingCanvas;
  }

  function drawContourHalo(context, artwork, x, y, width, height, size, strength, color) {
    const settings = `${size}/${strength}/${color}`;
    if (haloCache?.artwork !== artwork || haloCache.settings !== settings) {
      const { image, bounds } = artwork;
      const [, , sourceWidth, sourceHeight] = bounds;
      const scale = 256 / Math.max(sourceWidth, sourceHeight);
      const w = Math.max(1, Math.round(sourceWidth * scale));
      const h = Math.max(1, Math.round(sourceHeight * scale));
      const boost = Math.max(0, strength - 1);
      const spread = 24 * size * (1 + boost * 0.5);
      const blur = 14 * size * (1 + boost * 0.35);
      const padding = Math.ceil(spread + blur * 3);
      contourMask.width = contourHalo.width = w + padding * 2;
      contourMask.height = contourHalo.height = h + padding * 2;
      const mask = contourMask.getContext("2d");
      mask.drawImage(image, ...bounds, padding, padding, w, h);
      // Expand the logo's alpha mask before softening its edges.
      for (let step = 0; step < 16; step++) {
        const angle = step * Math.PI / 8;
        mask.drawImage(image, ...bounds, padding + spread * Math.cos(angle), padding + spread * Math.sin(angle), w, h);
      }
      const halo = contourHalo.getContext("2d");
      halo.filter = `blur(${blur}px)`;
      halo.drawImage(contourMask, 0, 0);
      halo.filter = "none";
      halo.globalCompositeOperation = "source-in";
      halo.fillStyle = color;
      halo.fillRect(0, 0, contourHalo.width, contourHalo.height);
      haloCache = { artwork, settings, w, h, padding };
    }

    const { w, h, padding } = haloCache;
    const padX = padding * width / w;
    const padY = padding * height / h;
    context.save();
    context.globalAlpha *= Math.min(1, strength);
    // Layer the soft mask twice to deepen the color without hardening its edge.
    context.drawImage(contourHalo, x - padX, y - padY, width + padX * 2, height + padY * 2);
    context.drawImage(contourHalo, x - padX, y - padY, width + padX * 2, height + padY * 2);
    context.restore();
  }

  function drawLayer(context, key, targetScale, regions) {
    const layer = layers.get(key);
    const { adjustment } = layer;
    const artwork = (cutoutOptions.get(key)?.checkbox.checked && layer.cutout) || layer.artwork;
    if (!artwork) return;
    const placement = placements[key];
    const { image, bounds } = artwork;
    const [, , sourceWidth, sourceHeight] = bounds;
    const heightScale = placement.height / sourceHeight;
    const widthScale = (placement.width ?? Infinity) / sourceWidth;
    const fit = placement.fit === "cover" ? Math.max : Math.min;
    const scale = fit(widthScale, heightScale) * adjustment.scale / 100;
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const x = placement.x - drawWidth / 2 + width * adjustment.x / 100;
    const y = placement.y - (placement.top ? 0 : drawHeight / 2) + height * adjustment.y / 100;
    const mirrored = mirrorControls.get(key)?.checked === true;
    regions?.set(key, { x, y, width: drawWidth, height: drawHeight, artwork, mirrored });

    context.save();
    if (mirrored) {
      context.translate(2 * x + drawWidth, 0);
      context.scale(-1, 1);
    }
    const group = key === "competition" ? "competition" : placement.logo ? "club" : "player";
    const surface = key === "background" ? 0 : Number(shadowControls[`${group}-surface`].value) / 100;
    const makeWhite = key === "competition" && whiteLogo.checked;
    if (key === "competition") {
      const strength = Number(shadowControls["competition-shadow"].value) / 100;
      if (strength > 0) {
        const size = Number(shadowControls["competition-halo-size"].value) / 100;
        const color = shadowColors.competition.value;
        if (portrait) {
          drawContourHalo(context, artwork, x, y, drawWidth, drawHeight, size, strength, color);
        } else {
          context.save();
          context.translate(x + drawWidth / 2, y + drawHeight / 2);
          context.scale(drawWidth * 0.95 * size, drawHeight * 0.9 * size);
          const halo = context.createRadialGradient(0, 0, 0, 0, 0, 1);
          halo.addColorStop(0, color);
          halo.addColorStop(0.32, color);
          halo.addColorStop(0.7, color + "60");
          halo.addColorStop(1, color + "00");
          context.fillStyle = halo;
          context.globalAlpha *= strength;
          context.fillRect(-1, -1, 2, 2);
          context.restore();
        }
      }
      if (makeWhite && !surface) context.filter = "brightness(0) invert(1)";
    } else if (key !== "background") {
      const strength = Number(shadowControls[`${group}-shadow`].value) / 100;
      if (strength > 0) {
        const hex = shadowColors[placement.logo ? key : "player-shadow"].value;
        const color = (opacity) => hex + Math.round(Math.min(1, opacity) * 255).toString(16).padStart(2, "0");
        const extraRadius = 28 * Math.max(0, strength - 1);
        const radius = placement.logo ? 16 + extraRadius : 25;
        context.filter =
          `drop-shadow(0px ${8 * targetScale}px ${radius * 0.45 * targetScale}px ${color(strength)}) ` +
          `drop-shadow(0px ${12 * targetScale}px ${radius * targetScale}px ${color(strength * 0.85)})`;
      }
    }
    if (surface > 0) {
      context.drawImage(shadeImage(image, bounds, surface, makeWhite), x, y, drawWidth, drawHeight);
    } else {
      context.drawImage(image, ...bounds, x, y, drawWidth, drawHeight);
    }
    context.restore();
  }

  function drawText(context, text, { size, family, color, italic }, x, baseline, maxWidth, targetScale) {
    context.save();
    const fontWeight = italic ? "italic 900" : "900";
    const fontFamily = `"${family}", Arial, sans-serif`;
    context.font = `${fontWeight} ${size}px ${fontFamily}`;
    const measured = context.measureText(text).width;
    if (measured > maxWidth) {
      size *= maxWidth / measured;
      context.font = `${fontWeight} ${size}px ${fontFamily}`;
    }
    context.shadowColor = "#05051df2";
    context.shadowBlur = 23 * targetScale;
    context.shadowOffsetY = 6 * targetScale;
    context.fillStyle = color;
    context.textAlign = "center";
    context.fillText(text, x, baseline);
    context.shadowColor = "transparent";
    context.strokeStyle = color;
    context.lineJoin = "round";
    context.lineWidth = size * 0.022;
    context.strokeText(text, x, baseline);
    const metrics = context.measureText(text);
    const textWidth = metrics.width;
    const ascent = metrics.actualBoundingBoxAscent;
    const descent = metrics.actualBoundingBoxDescent;
    context.restore();
    return { x: x - textWidth / 2, y: baseline - ascent, width: textWidth, height: ascent + descent };
  }

  function drawNeon(context, start, end, y, color, thickness, targetScale) {
    context.beginPath();
    context.moveTo(start, y);
    context.lineTo(end, y);
    context.lineWidth = thickness;
    context.lineCap = "round";
    context.strokeStyle = color;
    context.shadowColor = color;
    context.shadowBlur = 12 * targetScale;
    context.stroke();
    context.strokeStyle = "#ffffffe0";
    context.lineWidth = thickness * 0.43;
    context.stroke();
  }

  function drawPortraitDivider(context, targetScale) {
    const top = { x: 606, y: 1264 };
    const bottom = { x: 411, y: 1845 };
    const glow = context.createLinearGradient(top.x, top.y, bottom.x, bottom.y);
    glow.addColorStop(0, "#0085ff00");
    glow.addColorStop(0.25, "#1bbdff");
    glow.addColorStop(0.52, "#d8ffff");
    glow.addColorStop(0.8, "#14afff");
    glow.addColorStop(1, "#0085ff00");
    context.save();
    context.fillStyle = glow;
    context.shadowColor = "#00aaff";
    context.shadowBlur = 18 * targetScale;
    context.beginPath();
    context.moveTo(top.x, top.y);
    context.lineTo(514, 1558);
    context.lineTo(bottom.x, bottom.y);
    context.lineTo(502, 1554);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawPortraitBackground(context, targetScale) {
    const { artwork } = layers.get("background");
    if (!artwork) return;
    const bandHeight = width * 9 / 16;
    const pixelWidth = Math.round(width * targetScale);
    const pixelScale = pixelWidth / width;
    const bandPixels = bandHeight * pixelScale;
    if (maskedBackgroundArtwork !== artwork || portraitBackground.width !== pixelWidth) {
      portraitBackground.width = pixelWidth;
      portraitBackground.height = Math.ceil(bandPixels);
      const buffer = portraitBackground.getContext("2d");
      const { image, bounds } = artwork;
      const [, , sourceWidth, sourceHeight] = bounds;
      const cover = Math.max(pixelWidth / sourceWidth, bandPixels / sourceHeight);
      const w = sourceWidth * cover;
      const h = sourceHeight * cover;
      buffer.imageSmoothingQuality = "high";
      buffer.drawImage(image, ...bounds, (pixelWidth - w) / 2, (bandPixels - h) / 2, w, h);
      buffer.globalCompositeOperation = "destination-in";
      const fade = buffer.createLinearGradient(0, bandPixels * 0.8, 0, bandPixels);
      fade.addColorStop(0, "#000");
      fade.addColorStop(1, "#0000");
      buffer.fillStyle = fade;
      buffer.fillRect(0, 0, pixelWidth, portraitBackground.height);
      maskedBackgroundArtwork = artwork;
    }
    context.drawImage(portraitBackground, 0, 0, width, portraitBackground.height / pixelScale);
  }

  function render(canvas = board) {
    const context = canvas.getContext("2d");
    const scale = canvas.width / width;
    context.save();
    context.scale(scale, canvas.height / height);
    context.imageSmoothingQuality = "high";
    context.fillStyle = "#080d33";
    if (portrait) {
      const backdrop = context.createRadialGradient(540, 340, 0, 540, 340, 1260);
      backdrop.addColorStop(0, "#2119cf");
      backdrop.addColorStop(0.48, "#100784");
      backdrop.addColorStop(1, "#05052f");
      context.fillStyle = backdrop;
    }
    context.fillRect(0, 0, width, height);
    const regions = canvas === board ? previewRegions : null;
    regions?.clear();
    if (portrait) drawPortraitBackground(context, scale);
    else drawLayer(context, "background", scale);
    drawLayer(context, "leftPlayer", scale, regions);
    drawLayer(context, "rightPlayer", scale, regions);

    const vignette = context.createLinearGradient(0, textLayout.vignetteY, 0, portrait ? 1127 : height);
    vignette.addColorStop(0, "#0000");
    if (portrait) vignette.addColorStop(0.65, "#050529de");
    vignette.addColorStop(1, portrait ? "#030322f5" : "#0006");
    context.fillStyle = vignette;
    context.fillRect(0, textLayout.vignetteY, width, height - textLayout.vignetteY);

    if (portrait) drawPortraitDivider(context, scale);
    drawLayer(context, "competition", scale, regions);
    drawLayer(context, "leftClub", scale, regions);
    drawLayer(context, "rightClub", scale, regions);
    const caption = title.value.trim().toUpperCase();
    const season = year.value.trim().toUpperCase();
    const style = readStyle();
    if (caption) {
      const adjustment = layers.get("title").adjustment;
      const factor = adjustment.scale / 100;
      const x = width / 2 + width * adjustment.x / 100;
      const y = textLayout.titleY + height * adjustment.y / 100;
      const bounds = drawText(context, caption, {
        size: style.titleSize * factor, family: style.titleFont, color: style.titleColor, italic: style.titleItalic,
      }, x, y, style.fitTitle ? textLayout.titleWidth * factor : Infinity, scale);
      regions?.set("title", bounds);
    }
    if (season) {
      const adjustment = layers.get("year").adjustment;
      const factor = adjustment.scale / 100;
      const x = width / 2 + width * adjustment.x / 100;
      const baseline = textLayout.yearY + height * adjustment.y / 100;
      const bounds = drawText(context, season, {
        size: style.yearSize * factor, family: style.yearFont, color: style.yearColor, italic: style.yearItalic,
      }, x, baseline, textLayout.yearWidth * factor, scale);
      regions?.set("year", bounds);
      if (style.barsVisible) {
        const gap = bounds.width / 2 + style.barGap * factor;
        const length = style.barLength * factor;
        const thickness = style.barThickness * factor;
        const y = baseline - style.yearSize * factor * 0.56;
        for (const [offset, color] of [[0, style.barTopColor], [style.barSpacing, style.barBottomColor]]) {
          drawNeon(context, x - gap - length, x - gap, y + offset * factor, color, thickness, scale);
          drawNeon(context, x + gap, x + gap + length, y + offset * factor, color, thickness, scale);
        }
      }
    }
    if (regions && (drag?.guideX || drag?.guideY)) {
      context.lineWidth = 2;
      context.strokeStyle = "#ff66e3";
      context.beginPath();
      if (drag.guideX) {
        context.moveTo(width / 2, 0);
        context.lineTo(width / 2, height);
      }
      if (drag.guideY) {
        context.moveTo(0, height / 2);
        context.lineTo(width, height / 2);
      }
      context.stroke();
    }
    const selection = regions?.get(selectedLayer ?? hoveredLayer);
    if (selection) {
      const { x, y, width: selectedWidth, height: selectedHeight } = selection;
      const left = Math.max(0, x);
      const top = Math.max(0, y);
      const right = Math.min(width, x + selectedWidth);
      const bottom = Math.min(height, y + selectedHeight);
      if (right > left && bottom > top) {
        context.lineWidth = selectedLayer ? 4 : 3;
        context.strokeStyle = selectedLayer ? "#69d8ff" : "#fff";
        context.setLineDash([12, 7]);
        context.strokeRect(left + 2, top + 2, Math.max(0, right - left - 4), Math.max(0, bottom - top - 4));
      }
    }
    context.restore();
    return canvas;
  }

  function showErrors() {
    status.textContent = [...errors.values()]
      .map((file) => translate("Impossible d’ouvrir l’image {file}.", { file }))
      .join(" ");
  }

  async function decodeArtwork(key, file) {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const bounds = placements[key].logo
        ? imageBounds(image)
        : [0, 0, image.naturalWidth, image.naturalHeight];
      return { image, bounds, file };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function loadImage(input) {
    const file = input.files[0];
    if (!file) return;
    const key = input.dataset.vtLayer;
    const layer = layers.get(key);
    const request = ++layer.request;
    layer.loading = true;
    errors.delete(key);
    showErrors();
    try {
      const artwork = await decodeArtwork(key, file);
      if (request !== layer.request) return;
      layer.artwork = artwork;
      layer.cutout = null;
      layer.cutoutJob = null;
      if (cutoutOptions.has(key)) updatePlayerCutout(key);
    } catch {
      if (request !== layer.request) return;
      input.value = "";
      errors.set(key, file.name);
    } finally {
      if (request === layer.request) {
        layer.loading = false;
        showErrors();
        render();
      }
    }
  }


  function getCutoutSegmenter() {
    cutoutSegmenterPromise ??= import(
      "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6/dist/transformers.min.js"
    ).then(({ env, pipeline }) => {
      env.allowLocalModels = false;
      env.backends.onnx.wasm.numThreads = 1;
      return pipeline("background-removal", "Xenova/modnet", { device: "wasm", dtype: "fp32" });
    }).catch((error) => {
      cutoutSegmenterPromise = undefined;
      throw error;
    });
    return cutoutSegmenterPromise;
  }

  async function createCutoutFile(file, setStatus) {
    setStatus("Chargement du modèle de détourage…");
    const segmenter = await getCutoutSegmenter();
    setStatus("Détourage de la photo…");
    const [image] = await segmenter(file);
    const blob = await image.toBlob("image/png");
    const basename = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${basename}-cutout.png`, { type: "image/png" });
  }

  function cutoutErrorMessage() {
    return cutoutSegmenterPromise
      ? "Impossible de détourer cette photo. Essaie une autre image."
      : "Impossible de charger le détourage. Vérifie ta connexion, puis réessaie.";
  }

  function setPlayerCutoutStatus(key, message) {
    const { status } = cutoutOptions.get(key);
    status.dataset.interfaceMessage = message;
    status.textContent = translate(message);
  }

  async function updatePlayerCutout(key) {
    const { checkbox } = cutoutOptions.get(key);
    const layer = layers.get(key);
    const { artwork } = layer;
    render();
    if (!checkbox.checked || !artwork || layer.cutout) {
      setPlayerCutoutStatus(key, "");
      return;
    }
    if (layer.cutoutJob) {
      setPlayerCutoutStatus(key, layer.cutoutJob.message);
      return;
    }

    const job = { message: "" };
    layer.cutoutJob = job;
    try {
      const file = await createCutoutFile(artwork.file, (message) => {
        job.message = message;
        if (layer.cutoutJob === job && checkbox.checked) setPlayerCutoutStatus(key, message);
      });
      const cutout = await decodeArtwork(key, file);
      if (layer.cutoutJob !== job) return;
      layer.cutout = cutout;
      setPlayerCutoutStatus(key, "");
    } catch (error) {
      console.error("Thumbnail player background removal failed", error);
      if (layer.cutoutJob !== job || !checkbox.checked) return;
      checkbox.checked = false;
      setPlayerCutoutStatus(key, cutoutErrorMessage());
    } finally {
      if (layer.cutoutJob === job) {
        layer.cutoutJob = null;
        render();
      }
    }
  }

  for (const [key, { checkbox }] of cutoutOptions) {
    checkbox.addEventListener("change", () => updatePlayerCutout(key));
  }

  document.addEventListener("interface-language-change", () => {
    for (const [key, { status }] of cutoutOptions) {
      setPlayerCutoutStatus(key, status.dataset.interfaceMessage || "");
    }
  });

  function syncControls() {
    const { adjustment } = layers.get(layerSelect.value);
    for (const [key, field] of Object.entries(controls)) field.value = adjustment[key];
  }

  function boardPoint(event) {
    const rect = board.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * width / rect.width,
      y: (event.clientY - rect.top) * height / rect.height,
    };
  }

  function hitLayer(point) {
    for (const [key, region] of [...previewRegions].reverse()) {
      const x = (point.x - region.x) / region.width;
      const y = (point.y - region.y) / region.height;
      if (!(x >= 0 && x < 1 && y >= 0 && y < 1)) continue;
      const { artwork } = region;
      if (!artwork) return key;
      const size = 128;
      if (!artwork.hitPixels) {
        const sample = document.createElement("canvas");
        sample.width = sample.height = size;
        const context = sample.getContext("2d", { willReadFrequently: true });
        context.drawImage(artwork.image, ...artwork.bounds, 0, 0, size, size);
        artwork.hitPixels = context.getImageData(0, 0, size, size).data;
      }
      const column = Math.floor(x * size);
      const sourceColumn = region.mirrored ? size - 1 - column : column;
      const index = (Math.floor(y * size) * size + sourceColumn) * 4 + 3;
      if (artwork.hitPixels[index] >= 32) return key;
    }
    return null;
  }

  function setLayoutValue(adjustment, key, value) {
    const field = controls[key];
    adjustment[key] = Math.max(Number(field.min), Math.min(Number(field.max), Math.round(value * 100) / 100));
  }

  function setPreviewZoom(next, event) {
    const zoom = Math.round(Math.max(0.5, Math.min(4, next)) * 100) / 100;
    if (zoom === previewZoom) return;
    const before = board.getBoundingClientRect();
    previewZoom = zoom;
    viewport.style.setProperty("--thumbnail-zoom", String(zoom));
    zoomOutput.value = `${Math.round(zoom * 100)} %`;
    zoomOutput.hidden = zoom === 1;
    if (!event) {
      viewport.scrollTo(0, 0);
      return;
    }
    const after = board.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - before.left) / before.width));
    const y = Math.max(0, Math.min(1, (event.clientY - before.top) / before.height));
    viewport.scrollLeft += after.left + after.width * x - (before.left + before.width * x);
    viewport.scrollTop += after.top + after.height * y - (before.top + before.height * y);
  }

  board.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || drag) return;
    const point = boardPoint(event);
    selectedLayer = hitLayer(point);
    hoveredLayer = null;
    if (selectedLayer) {
      const { x, y } = layers.get(selectedLayer).adjustment;
      const region = previewRegions.get(selectedLayer);
      layerSelect.value = selectedLayer;
      syncControls();
      drag = {
        pointerId: event.pointerId,
        key: selectedLayer,
        point,
        x,
        y,
        centerX: region.x + region.width / 2,
        centerY: region.y + region.height / 2,
      };
      board.setPointerCapture(event.pointerId);
    }
    render();
  });

  board.addEventListener("pointermove", (event) => {
    if (!drag && !selectedLayer && event.pointerType !== "touch") {
      const key = hitLayer(boardPoint(event));
      if (key !== hoveredLayer) {
        hoveredLayer = key;
        render();
      }
      return;
    }
    if (drag?.pointerId !== event.pointerId) return;
    const point = boardPoint(event);
    const rect = board.getBoundingClientRect();
    const dx = point.x - drag.point.x;
    const dy = point.y - drag.point.y;
    const centerDx = width / 2 - drag.centerX;
    const centerDy = height / 2 - drag.centerY;
    drag.guideX = Math.abs(dx - centerDx) * rect.width / width <= 7;
    drag.guideY = Math.abs(dy - centerDy) * rect.height / height <= 7;
    const adjustment = layers.get(drag.key).adjustment;
    setLayoutValue(adjustment, "x", drag.x + (drag.guideX ? centerDx : dx) * 100 / width);
    setLayoutValue(adjustment, "y", drag.y + (drag.guideY ? centerDy : dy) * 100 / height);
    syncControls();
    render();
  });

  board.addEventListener("lostpointercapture", (event) => {
    if (drag?.pointerId !== event.pointerId) return;
    drag = null;
    render();
  });

  board.addEventListener("pointerleave", () => {
    if (!hoveredLayer) return;
    hoveredLayer = null;
    render();
  });

  viewport.addEventListener("wheel", (event) => {
    const resizeSelected = (event.ctrlKey || event.altKey) && previewRegions.has(selectedLayer);
    if (!event.deltaY || (!event.ctrlKey && !resizeSelected)) return;
    event.preventDefault();
    if (drag) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1;
    const delta = Math.max(-100, Math.min(100, event.deltaY * unit));
    if (!resizeSelected) {
      setPreviewZoom(previewZoom * Math.exp(-delta / 500), event);
      return;
    }
    const adjustment = layers.get(selectedLayer).adjustment;
    setLayoutValue(adjustment, "scale", adjustment.scale * Math.exp(-delta / 1000));
    syncControls();
    render();
  }, { passive: false });
  byId("vt-preview-reset").addEventListener("click", () => setPreviewZoom(1));

  board.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (drag && board.hasPointerCapture(drag.pointerId)) board.releasePointerCapture(drag.pointerId);
    drag = null;
    selectedLayer = null;
    hoveredLayer = null;
    render();
  });

  for (const input of assetInputs) {
    input.addEventListener("change", () => loadImage(input));
  }
  for (const input of mirrorControls.values()) {
    input.addEventListener("change", () => render());
  }
  for (const input of [title, year, whiteLogo]) {
    input.addEventListener("input", () => render());
  }
  function syncShadowValues() {
    for (const control of Object.values(shadowControls)) {
      document.getElementById(control.id + "-value").value = control.value + " %";
      document.getElementById(control.id + "-number").value = control.value;
    }
  }

  for (const control of Object.values(shadowControls)) {
    const number = document.getElementById(control.id + "-number");
    number.addEventListener("input", () => {
      if (!Number.isFinite(number.valueAsNumber)) return;
      control.value = number.value;
      control.dispatchEvent(new Event("input", { bubbles: true }));
    });
    number.addEventListener("change", syncShadowValues);
    control.addEventListener("input", () => {
      syncShadowValues();
      render();
    });
  }
  for (const field of [...Object.values(styleControls), ...Object.values(shadowColors)]) {
    field.addEventListener("input", () => render());
  }
  layerSelect.addEventListener("change", () => {
    selectedLayer = layerSelect.value;
    hoveredLayer = null;
    syncControls();
    render();
  });
  for (const [key, field] of Object.entries(controls)) {
    field.addEventListener("input", () => {
      if (!Number.isFinite(field.valueAsNumber)) return;
      setLayoutValue(layers.get(layerSelect.value).adjustment, key, field.valueAsNumber);
      render();
    });
    field.addEventListener("change", syncControls);
  }
  byId("vt-reset-layout").addEventListener("click", () => {
    layers.get(layerSelect.value).adjustment = { ...defaults };
    syncControls();
    render();
  });
  document.addEventListener("interface-language-change", showErrors);
  let databasePromise;
  let restoring = false;

  function openCompositions() {
    if (!databasePromise) {
      databasePromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(portrait ? "ucl-short-thumbnails" : "ucl-video-thumbnails", 2);
        request.onupgradeneeded = () => {
          for (const store of ["compositions", "competition-presets"]) {
            if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store);
          }
        };
        request.onsuccess = () => {
          const database = request.result;
          database.onversionchange = () => {
            database.close();
            databasePromise = undefined;
          };
          resolve(database);
        };
        request.onerror = () => reject(request.error);
      }).catch((error) => {
        databasePromise = undefined;
        throw error;
      });
    }
    return databasePromise;
  }

  async function compositionRequest(store, mode, action) {
    const database = await openCompositions();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(store, mode);
      const request = action(transaction.objectStore(store));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  function hasPendingImages() {
    return restoring || [...layers].some(([key, layer]) =>
      layer.loading || (cutoutOptions.get(key)?.checkbox.checked && layer.cutoutJob),
    );
  }

  function compositionSnapshot(competitionOnly) {
    const layerKeys = competitionOnly ? ["background", "competition"] : [...layers.keys()];
    const data = {
      title: title.value,
      whiteLogo: whiteLogo.checked,
      typography: readStyle(),
      shadows: Object.fromEntries(Object.entries(shadowControls)
        .filter(([key]) => !competitionOnly || key.startsWith("competition-"))
        .map(([key, field]) => [key, field.value])),
      shadowColors: Object.fromEntries(Object.entries(shadowColors)
        .filter(([key]) => !competitionOnly || key === "competition")
        .map(([key, field]) => [key, field.value])),
      layers: Object.fromEntries(layerKeys.map((key) => {
        const layer = layers.get(key);
        const entry = { file: layer.artwork?.file ?? null, adjustment: { ...layer.adjustment } };
        if (mirrorControls.get(key)?.checked) entry.mirrored = true;
        if (cutoutOptions.get(key)?.checkbox.checked && layer.cutout) {
          entry.cutoutFile = layer.cutout.file;
        }
        return [key, entry];
      })),
    };
    if (!competitionOnly) {
      const preview = document.createElement("canvas");
      const scale = 320 / Math.max(width, height);
      preview.width = Math.round(width * scale);
      preview.height = Math.round(height * scale);
      render(preview);
      data.libraryPreview = preview.toDataURL("image/jpeg", 0.8);
      data.year = year.value;
    }
    return data;
  }

  async function restoreComposition(data, canApply = () => true) {
    const inputs = assetInputs.filter((input) => Object.hasOwn(data.layers, input.dataset.vtLayer));
    const artwork = await Promise.all(inputs.map(async (input) => {
      const key = input.dataset.vtLayer;
      const { file, cutoutFile } = data.layers[key] || {};
      return Promise.all([
        file ? decodeArtwork(key, file) : null,
        file && cutoutFile && cutoutOptions.has(key) ? decodeArtwork(key, cutoutFile) : null,
      ]);
    }));
    if (!canApply()) return false;

    inputs.forEach((input, index) => {
      const key = input.dataset.vtLayer;
      const layer = layers.get(key);
      layer.request++;
      layer.loading = false;
      [layer.artwork, layer.cutout] = artwork[index];
      layer.cutoutJob = null;
      const cutoutOption = cutoutOptions.get(key);
      const mirrorControl = mirrorControls.get(key);
      if (mirrorControl) mirrorControl.checked = data.layers[key]?.mirrored === true;
      if (cutoutOption) {
        cutoutOption.checkbox.checked = Boolean(layer.cutout);
        setPlayerCutoutStatus(key, "");
      }
      layer.adjustment = { ...defaults, ...data.layers[key]?.adjustment };
      const transfer = new DataTransfer();
      if (layer.artwork) transfer.items.add(layer.artwork.file);
      input.files = transfer.files;
      errors.delete(key);
    });
    title.value = data.title;
    if (data.year !== undefined) year.value = data.year;
    whiteLogo.checked = data.whiteLogo;
    if (data.year !== undefined) {
      for (const key of ["title", "year"]) {
        layers.get(key).adjustment = { ...defaults, ...data.layers[key]?.adjustment };
      }
      for (const [key, field] of Object.entries(shadowControls)) {
        field.value = data.shadows?.[key] ?? field.defaultValue;
      }
      for (const [key, field] of Object.entries(shadowColors)) {
        const previousColor = key === "leftClub" || key === "rightClub" ? data.shadowColors?.["club-shadow"] : undefined;
        field.value = data.shadowColors?.[key] ?? previousColor ?? field.defaultValue;
      }
    } else {
      for (const key of ["competition-surface", "competition-shadow", "competition-halo-size"]) {
        if (data.shadows?.[key] !== undefined) shadowControls[key].value = data.shadows[key];
      }
      if (data.shadowColors?.competition !== undefined) shadowColors.competition.value = data.shadowColors.competition;
    }
    applyStyle(data.typography);
    showErrors();
    syncControls();
    syncShadowValues();
    render();
    return true;
  }

  function setupPresets(formId, storeName, competitionOnly = false) {
    const saveForm = byId(formId);
    const saveButton = saveForm.querySelector('button[type="submit"]');
    const nameInput = saveForm.querySelector("input");
    const saveStatus = saveForm.querySelector(".save-status");
    const toolbar = saveForm.previousElementSibling;
    const savedList = toolbar.querySelector("select");
    const [loadButton, deleteButton] = toolbar.querySelectorAll("button");

    function showSaveStatus(message) {
      saveStatus.dataset.interfaceMessage = message;
      saveStatus.textContent = translate(message);
    }

    async function refreshCompositions(selected = savedList.value) {
      const names = await compositionRequest(storeName, "readonly", (store) => store.getAllKeys());
      const emptyMessage = "Choisir une sauvegarde…";
      const empty = new Option(translate(emptyMessage), "");
      empty.dataset.interfaceMessage = emptyMessage;
      savedList.replaceChildren(empty, ...names.map((name) => new Option(name, name)));
      if (names.includes(selected)) savedList.value = selected;
      window.matchPresetMenus?.refresh(savedList);
    }

    async function withCompositionControls(action, errorMessage) {
      saveButton.disabled = savedList.disabled = loadButton.disabled = deleteButton.disabled = true;
      try {
        await action();
      } catch {
        showSaveStatus(errorMessage);
      } finally {
        saveButton.disabled = savedList.disabled = false;
        syncPresetActions();
      }
    }

    saveForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = competitionOnly ? nameInput.value.trim() : compositionName;
      if (!name || saveButton.disabled) return;
      if (hasPendingImages()) {
        showSaveStatus("Patiente jusqu’à la fin du chargement des images.");
        return;
      }
      const projectId = competitionOnly ? undefined : window.matchPresetMenus?.activeProjectId;
      const data = compositionSnapshot(competitionOnly);
      withCompositionControls(async () => {
        await compositionRequest(storeName, "readwrite", (store) => store.put(data, name));
        await refreshCompositions(name);
        const details = competitionOnly ? undefined : { projectId, entry: { name, data } };
        showPresetSaveStatus(nameInput, name, details);
      }, "Impossible d’enregistrer la composition.");
    });

    loadButton.addEventListener("click", () => {
      const name = savedList.value;
      if (!name || restoring) return;
      withCompositionControls(async () => {
        const matchLoad = window.matchPresetMenus?.load(savedList);
        if (matchLoad) {
          await matchLoad;
          return;
        }
        const editor = saveForm.closest(".editor-section");
        const sections = [...editor.querySelectorAll(":scope > details")]
          .filter((section) => !section.contains(saveForm));
        restoring = true;
        for (const section of sections) section.inert = true;
        try {
          const data = await compositionRequest(storeName, "readonly", (store) => store.get(name));
          await restoreComposition(data);
        } finally {
          restoring = false;
          for (const section of sections) section.inert = false;
        }
        nameInput.value = name;
        showSaveStatus("Composition chargée.");
      }, "Impossible de charger la composition.");
    });

    function syncPresetActions() {
      loadButton.disabled = deleteButton.disabled = !savedList.value;
    }

    savedList.addEventListener("change", () => {
      const selected = savedList.selectedOptions[0];
      nameInput.value = selected?.dataset.libraryRecord ? selected.textContent : savedList.value;
      syncPresetActions();
    });
    savedList.addEventListener("match-presets-change", () => {
      if (!savedList.disabled) syncPresetActions();
    });

    deleteButton.addEventListener("click", () => {
      if (window.matchPresetMenus?.remove(savedList)) return;
      const name = savedList.value;
      if (!name) return;
      withCompositionControls(async () => {
        await compositionRequest(storeName, "readwrite", (store) => store.delete(name));
        await refreshCompositions("");
        nameInput.value = "";
      }, "Impossible de supprimer la composition.");
    });

    withCompositionControls(() => refreshCompositions(), "Impossible d’accéder aux compositions sauvegardées.");

  }

  setupPresets("vt-save-composition", "compositions");
  setupPresets("vt-save-competition", "competition-presets", true);

  const fontReady = Promise.all(
    ["Montserrat", "Barlow Condensed"].map((family) =>
      document.fonts.load(`900 100px "${family}"`).catch(() => []),
    ),
  );
  fontReady.then(() => render());
  render();

  return {
    compositionName,
    async getLibraryPreset(name, competitionOnly) {
      const store = competitionOnly ? "competition-presets" : "compositions";
      const data = await compositionRequest(store, "readonly", (entries) => entries.get(name));
      return data ? { name, data } : null;
    },
    async listLibraryPresets(competitionOnly) {
      const store = competitionOnly ? "competition-presets" : "compositions";
      const names = await compositionRequest(store, "readonly", (entries) => entries.getAllKeys());
      return Promise.all(names.map(async (name) => ({
        name,
        data: await compositionRequest(store, "readonly", (entries) => entries.get(name)),
      })));
    },
    async restoreLibraryPreset(data, canApply) {
      if (hasPendingImages()) throw new Error(translate("Patiente jusqu’à la fin du chargement des images."));
      restoring = true;
      try {
        return await restoreComposition(data, canApply);
      } finally {
        restoring = false;
      }
    },
    async renderExport(resolution) {
      await fontReady;
      if (hasPendingImages()) {
        throw new Error(translate("Patiente jusqu’à la fin du chargement des images."));
      }
      const canvas = document.createElement("canvas");
      const outputHeight = portrait ? Math.round(resolution * height / width) : resolution;
      canvas.width = Math.round(outputHeight * width / height);
      canvas.height = outputHeight;
      return render(canvas);
    },
  };
}
