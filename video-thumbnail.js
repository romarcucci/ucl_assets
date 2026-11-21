const videoThumbnail = (() => {
  const board = document.getElementById("video-thumbnail-board");
  const width = board.width;
  const height = board.height;
  const title = document.getElementById("vt-title");
  const year = document.getElementById("vt-year");
  const whiteLogo = document.getElementById("vt-white-logo");
  const status = document.getElementById("vt-status");
  const layerSelect = document.getElementById("vt-layout-layer");
  const controls = {
    x: document.getElementById("vt-layout-x"),
    y: document.getElementById("vt-layout-y"),
    scale: document.getElementById("vt-layout-scale"),
  };
  const shadowControls = Object.fromEntries(
    ["player-surface", "player-shadow", "club-surface", "club-shadow"].map((key) => [
      key, document.getElementById(`vt-${key}`),
    ]),
  );
  const shadowColors = {
    "player-shadow": document.getElementById("vt-player-shadow-color"),
    leftClub: document.getElementById("vt-left-club-shadow-color"),
    rightClub: document.getElementById("vt-right-club-shadow-color"),
  };
  const styleControls = Object.fromEntries(
    [...document.querySelectorAll("[data-vt-style]")].map((field) => [field.dataset.vtStyle, field]),
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

  const assetInputs = [...document.querySelectorAll("[data-vt-layer]")];
  const shadingCanvas = document.createElement("canvas");
  const defaults = { x: 0, y: 0, scale: 100 };
  const placements = {
    background: { x: 800, y: 450, width: 1600, height: 900, fit: "cover" },
    leftPlayer: { x: 309, y: 66, height: 950, top: true },
    rightPlayer: { x: 1324, y: 81, height: 931, top: true },
    leftClub: { x: 681, y: 655, width: 166, height: 278, logo: true },
    rightClub: { x: 937, y: 678, width: 158, height: 282, logo: true },
    competition: { x: 799, y: 177, width: 312, height: 276, logo: true },
  };
  const layers = new Map(Object.keys(placements).map((key) => [
    key, { artwork: null, adjustment: { ...defaults }, loading: false, request: 0 },
  ]));
  const errors = new Map();

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

  function shadeImage(image, bounds, strength) {
    const [, , sourceWidth, sourceHeight] = bounds;
    const scale = Math.min(1, 2048 / Math.max(sourceWidth, sourceHeight));
    const w = Math.max(1, Math.round(sourceWidth * scale));
    const h = Math.max(1, Math.round(sourceHeight * scale));
    shadingCanvas.width = w;
    shadingCanvas.height = h;
    const context = shadingCanvas.getContext("2d");
    context.drawImage(image, ...bounds, 0, 0, w, h);
    context.globalCompositeOperation = "source-atop";
    const gradient = context.createLinearGradient(0, 0, w * 0.25, h);
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(0.3, `rgba(0, 0, 0, ${strength * 0.16})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${strength})`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, w, h);
    return shadingCanvas;
  }

  function drawLayer(context, key, targetScale) {
    const { artwork, adjustment } = layers.get(key);
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

    context.save();
    if (key === "competition") {
      context.shadowColor = "#000e";
      context.shadowBlur = 23 * targetScale;
      context.shadowOffsetY = 6 * targetScale;
      if (whiteLogo.checked) context.filter = "brightness(0) invert(1)";
    } else if (key !== "background") {
      const shadowKey = placement.logo ? "club-shadow" : "player-shadow";
      const strength = Number(shadowControls[shadowKey].value) / 100;
      if (strength > 0) {
        const hex = shadowColors[placement.logo ? key : "player-shadow"].value;
        const color = (opacity) => hex + Math.round(opacity * 255).toString(16).padStart(2, "0");
        const radius = placement.logo ? 16 : 25;
        context.filter =
          `drop-shadow(0px ${8 * targetScale}px ${radius * 0.45 * targetScale}px ${color(strength)}) ` +
          `drop-shadow(0px ${12 * targetScale}px ${radius * targetScale}px ${color(strength * 0.85)})`;
      }
    }
    const surface = key === "background" || key === "competition" ? 0
      : Number(shadowControls[placement.logo ? "club-surface" : "player-surface"].value) / 100;
    if (surface > 0) {
      context.drawImage(shadeImage(image, bounds, surface), x, y, drawWidth, drawHeight);
    } else {
      context.drawImage(image, ...bounds, x, y, drawWidth, drawHeight);
    }
    context.restore();
  }

  function drawText(context, text, { size, family, color, italic }, baseline, maxWidth, targetScale) {
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
    context.fillText(text, 800, baseline);
    context.shadowColor = "transparent";
    context.strokeStyle = color;
    context.lineJoin = "round";
    context.lineWidth = size * 0.022;
    context.strokeText(text, 800, baseline);
    const textWidth = context.measureText(text).width;
    context.restore();
    return textWidth;
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

  function render(canvas = board) {
    const context = canvas.getContext("2d");
    const scale = canvas.width / width;
    context.save();
    context.scale(scale, canvas.height / height);
    context.imageSmoothingQuality = "high";
    context.fillStyle = "#080d33";
    context.fillRect(0, 0, width, height);
    drawLayer(context, "background", scale);
    drawLayer(context, "leftPlayer", scale);
    drawLayer(context, "rightPlayer", scale);

    const vignette = context.createLinearGradient(0, 540, 0, height);
    vignette.addColorStop(0, "#0000");
    vignette.addColorStop(1, "#0006");
    context.fillStyle = vignette;
    context.fillRect(0, 540, width, height - 540);

    drawLayer(context, "competition", scale);
    drawLayer(context, "leftClub", scale);
    drawLayer(context, "rightClub", scale);
    const caption = title.value.trim().toUpperCase();
    const season = year.value.trim().toUpperCase();
    const style = readStyle();
    if (caption) {
      drawText(context, caption, {
        size: style.titleSize, family: style.titleFont, color: style.titleColor, italic: style.titleItalic,
      }, 437, style.fitTitle ? 470 : Infinity, scale);
    }
    if (season) {
      const yearWidth = drawText(context, season, {
        size: style.yearSize, family: style.yearFont, color: style.yearColor, italic: style.yearItalic,
      }, 506, 465, scale);
      if (style.barsVisible) {
        const gap = yearWidth / 2 + style.barGap;
        const y = 506 - style.yearSize * 0.56;
        for (const [offset, color] of [[0, style.barTopColor], [style.barSpacing, style.barBottomColor]]) {
          drawNeon(context, 800 - gap - style.barLength, 800 - gap, y + offset, color, style.barThickness, scale);
          drawNeon(context, 800 + gap, 800 + gap + style.barLength, y + offset, color, style.barThickness, scale);
        }
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

  function syncControls() {
    const { adjustment } = layers.get(layerSelect.value);
    for (const [key, field] of Object.entries(controls)) field.value = adjustment[key];
  }

  for (const input of assetInputs) {
    input.addEventListener("change", () => loadImage(input));
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
  layerSelect.addEventListener("change", syncControls);
  for (const [key, field] of Object.entries(controls)) {
    field.addEventListener("input", () => {
      if (!Number.isFinite(field.valueAsNumber)) return;
      const value = Math.max(Number(field.min), Math.min(Number(field.max), field.valueAsNumber));
      layers.get(layerSelect.value).adjustment[key] = value;
      render();
    });
    field.addEventListener("change", syncControls);
  }
  document.getElementById("vt-reset-layout").addEventListener("click", () => {
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
        const request = indexedDB.open("ucl-video-thumbnails", 2);
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
    return restoring || [...layers.values()].some((layer) => layer.loading);
  }

  function compositionSnapshot(competitionOnly) {
    const layerKeys = competitionOnly ? ["background", "competition"] : [...layers.keys()];
    const data = {
      title: title.value,
      whiteLogo: whiteLogo.checked,
      typography: readStyle(),
      layers: Object.fromEntries(layerKeys.map((key) => {
        const layer = layers.get(key);
        return [key, { file: layer.artwork?.file ?? null, adjustment: { ...layer.adjustment } }];
      })),
    };
    if (!competitionOnly) {
      const preview = document.createElement("canvas");
      preview.width = 320;
      preview.height = 180;
      preview.getContext("2d").drawImage(board, 0, 0, preview.width, preview.height);
      data.libraryPreview = preview.toDataURL("image/jpeg", 0.8);
      data.year = year.value;
      data.shadows = Object.fromEntries(Object.entries(shadowControls).map(([key, field]) => [key, field.value]));
      data.shadowColors = Object.fromEntries(Object.entries(shadowColors).map(([key, field]) => [key, field.value]));
    }
    return data;
  }

  async function restoreComposition(data) {
    const inputs = assetInputs.filter((input) => Object.hasOwn(data.layers, input.dataset.vtLayer));
    const artwork = await Promise.all(inputs.map(async (input) => {
      const key = input.dataset.vtLayer;
      const file = data.layers[key]?.file;
      return file ? decodeArtwork(key, file) : null;
    }));

    inputs.forEach((input, index) => {
      const key = input.dataset.vtLayer;
      const layer = layers.get(key);
      layer.request++;
      layer.loading = false;
      layer.artwork = artwork[index];
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
      for (const [key, field] of Object.entries(shadowControls)) {
        field.value = data.shadows?.[key] ?? field.defaultValue;
      }
      for (const [key, field] of Object.entries(shadowColors)) {
        const previousColor = key === "player-shadow" ? undefined : data.shadowColors?.["club-shadow"];
        field.value = data.shadowColors?.[key] ?? previousColor ?? field.defaultValue;
      }
    }
    applyStyle(data.typography);
    showErrors();
    syncControls();
    syncShadowValues();
    render();
  }

  function setupPresets(formId, storeName, competitionOnly = false) {
    const saveForm = document.getElementById(formId);
    const saveButton = saveForm.querySelector('button[type="submit"]');
    const nameInput = saveForm.querySelector('input[type="text"]');
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
      const name = nameInput.value.trim();
      if (!name || saveButton.disabled) return;
      if (hasPendingImages()) {
        showSaveStatus("Patiente jusqu’à la fin du chargement des images.");
        return;
      }
      const data = compositionSnapshot(competitionOnly);
      withCompositionControls(async () => {
        await compositionRequest(storeName, "readwrite", (store) => store.put(data, name));
        await refreshCompositions(name);
        showPresetSaveStatus(nameInput, name);
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
    async restoreLibraryPreset(data) {
      if (hasPendingImages()) throw new Error(translate("Patiente jusqu’à la fin du chargement des images."));
      restoring = true;
      try {
        await restoreComposition(data);
      } finally {
        restoring = false;
      }
    },
    async renderExport(outputHeight) {
      await fontReady;
      if (hasPendingImages()) {
        throw new Error(translate("Patiente jusqu’à la fin du chargement des images."));
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(outputHeight * width / height);
      canvas.height = outputHeight;
      return render(canvas);
    },
  };
})();
