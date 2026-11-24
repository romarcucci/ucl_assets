function createHighlightsMontage(video, callbacks) {
  const $ = (id) => document.getElementById(`hm-${id}`);
  const panel = document.querySelector('[data-editor="highlights"]');
  const frame = video.parentElement;
  const stage = frame.parentElement;
  const backdrop = $("backdrop");
  const backdropContext = backdrop.getContext("2d");
  const render = $("render");
  const renderPlay = $("render-play");
  const renderPosition = $("render-position");
  const volume = $("player-volume");
  const fields = [...panel.querySelectorAll("[data-hm]")];
  const framingNumbers = new Map([...panel.querySelectorAll("[data-hm-number]")]
    .map((input) => [input.dataset.hmNumber, input]));
  const formats = {};
  let format = "wide";
  let currentAssetUrl;
  const defaults = Object.fromEntries(fields.map((field) => [
    field.dataset.hm, field.type === "checkbox" ? field.checked : field.value,
  ]));
  const state = () => formats[format] ??= {
    fields: { ...defaults, "framing.mode": format === "short" ? "blur" : "fill" },
  };
  const message = (text, variables) => { $("status").textContent = translate(text, variables); };
  const saveFields = () => {
    for (const field of fields) state().fields[field.dataset.hm] =
      field.type === "checkbox" ? field.checked : field.value;
  };

  function changed() { callbacks.changed(); }

  function updateRenderControls() {
    renderPlay.textContent = translate(render.paused ? "Lecture" : "Pause");
    renderPosition.max = Number.isFinite(render.duration) ? render.duration : 0;
    renderPosition.value = render.currentTime;
  }
  for (const event of ["play", "pause", "loadedmetadata", "timeupdate", "emptied"]) {
    render.addEventListener(event, updateRenderControls);
  }
  document.addEventListener("interface-language-change", updateRenderControls);
  renderPlay.addEventListener("click", () => {
    if (render.paused) render.play().catch(() => {});
    else render.pause();
  });
  renderPosition.addEventListener("input", () => {
    if (Number.isFinite(render.duration)) render.currentTime = renderPosition.valueAsNumber;
  });
  volume.addEventListener("input", () => {
    video.volume = render.volume = volume.valueAsNumber;
  });

  let cropTop = 0;
  let croppedHeight = 0;
  function drawBackdrop() {
    if (backdrop.hidden || video.hidden || video.readyState < 2) return;
    const width = backdrop.width;
    const height = backdrop.height;
    const scale = Math.max(width / video.videoWidth, height / croppedHeight);
    const imageWidth = video.videoWidth * scale;
    const imageHeight = croppedHeight * scale;
    backdropContext.drawImage(video, 0, cropTop, video.videoWidth, croppedHeight,
      (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight);
  }

  function scheduleBackdrop() {
    if (backdrop.hidden || video.hidden || !video.requestVideoFrameCallback) return;
    video.cancelVideoFrameCallback(backdropFrame);
    backdropFrame = video.requestVideoFrameCallback(() => {
      drawBackdrop();
      scheduleBackdrop();
    });
  }

  let backdropFrame = 0;
  function previewFraming() {
    const framing = (key) => panel.querySelector(`[data-hm="framing.${key}"]`).value;
    const mode = framing("mode");
    const zoom = Number(framing("zoom"));
    const x = (Number(framing("x")) + 1) / 2;
    const y = (Number(framing("y")) + 1) / 2;
    const width = frame.clientWidth;
    const height = frame.clientHeight;
    if (!width || !height || !video.videoWidth) return;
    const top = Number(framing("cropTop"));
    const bottom = Number(framing("cropBottom"));
    cropTop = video.videoHeight * top / 100;
    croppedHeight = video.videoHeight * (100 - top - bottom) / 100;
    const scaleX = width / video.videoWidth;
    const scaleY = height / croppedHeight;
    const scale = mode === "fill" ? Math.max(scaleX, scaleY) :
      Math.min(scaleX * (mode === "blur" ? 0.94 : 1), scaleY);
    const imageWidth = video.videoWidth * scale * zoom;
    const imageHeight = video.videoHeight * scale * zoom;
    frame.style.setProperty("--hm-width", `${imageWidth}px`);
    frame.style.setProperty("--hm-height", `${imageHeight}px`);
    frame.style.setProperty("--hm-left", `${(width - imageWidth) * x}px`);
    frame.style.setProperty("--hm-top", `${(height - croppedHeight * scale * zoom) * y - cropTop * scale * zoom}px`);
    frame.style.setProperty("--hm-clip", `inset(${top}% 0 ${bottom}% 0)`);
    backdrop.hidden = mode !== "blur";
    if (!backdrop.hidden) {
      backdrop.width = format === "short" ? 203 : 360;
      backdrop.height = Math.round(backdrop.width * height / width);
      backdrop.style.setProperty("--hm-blur", `${Number(framing("blur")) * height / (format === "short" ? 1920 : 1080)}px`);
      drawBackdrop();
      scheduleBackdrop();
    }
  }

  video.addEventListener("loadeddata", previewFraming);
  video.addEventListener("seeked", drawBackdrop);
  if (!video.requestVideoFrameCallback) video.addEventListener("timeupdate", drawBackdrop);

  new ResizeObserver(previewFraming).observe(frame);

  function showState() {
    stage.dataset.hmFormat = format;
    const preset = state();
    for (const field of fields) {
      const value = preset.fields[field.dataset.hm] ?? defaults[field.dataset.hm];
      if (field.type === "checkbox") field.checked = Boolean(value);
      else field.value = value;
      const number = framingNumbers.get(field.dataset.hm);
      if (number) number.value = field.value;
    }
    previewFraming();
  }

  $("format").addEventListener("change", () => {
    saveFields();
    format = $("format").value;
    if (!$("render").hidden) returnToSource();
    showState();
    changed();
    callbacks.formatChanged();
  });
  for (const field of fields) {
    const number = framingNumbers.get(field.dataset.hm);
    field.addEventListener("input", () => {
      if (number) number.value = field.value;
      if (field.dataset.hm.startsWith("framing.")) updateFramingPreview();
      changed();
    });
    if (!number) continue;
    number.addEventListener("input", () => {
      if (!number.value || !number.validity.valid) return;
      field.value = number.value;
      updateFramingPreview();
      changed();
    });
    number.addEventListener("change", () => {
      field.value = Number.isFinite(number.valueAsNumber) ? number.value : field.defaultValue;
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  function updateFramingPreview() {
    if (!$("render").hidden) returnToSource();
    previewFraming();
  }
  $("preview").addEventListener("click", () => callbacks.test(false));
  $("dry").addEventListener("click", () => callbacks.test(true));
  $("library-save").addEventListener("click", () => callbacks.saveLibrary());
  function payload(dry, preview) {
    saveFields();
    const preset = state();
    const configuration = { format, framing: {}, audio: {} };
    for (const field of fields) {
      const key = field.dataset.hm;
      const value = preset.fields[key];
      const [group, property] = key.split(".");
      if (property) configuration[group][property] = value;
      else configuration[group] = value;
    }
    configuration.preview = preview;
    if (dry) {
      configuration.audio = {};
    }
    return configuration;
  }

  function returnToSource() {
    render.pause();
    render.hidden = true;
    render.removeAttribute("src");
    render.load();
    if (currentAssetUrl) URL.revokeObjectURL(currentAssetUrl);
    currentAssetUrl = undefined;
    $("return").hidden = true;
    renderPlay.hidden = renderPosition.hidden = true;
    video.hidden = false;
    video.closest(".highlights-preview").classList.remove("hm-rendering");
    previewFraming();
  }
  $("return").addEventListener("click", returnToSource);
  showState();
  return {
    payload,
    format: () => format,
    message,
    snapshot() { saveFields(); return structuredClone({ format, formats }); },
    restore(data) {
      Object.keys(formats).forEach((key) => delete formats[key]);
      for (const [name, preset] of Object.entries(data?.formats ?? {})) {
        formats[name] = { fields: Object.fromEntries(Object.entries(preset.fields).filter(([key]) => Object.hasOwn(defaults, key))) };
      }
      format = data?.format === "short" ? "short" : "wide";
      $("format").value = format;
      showState();
    },
    setEnabled(playable, busy, service) {
      const supportsMontage = service?.montage;
      $("preview").disabled = $("dry").disabled = busy || !playable || !supportsMontage;
      $("library-save").disabled = busy || !playable;
    },
    returnToSource,
    showRender(blob) {
      returnToSource();
      video.pause();
      video.hidden = true;
      render.hidden = false;
      $("return").hidden = false;
      renderPlay.hidden = renderPosition.hidden = false;
      video.closest(".highlights-preview").classList.add("hm-rendering");
      currentAssetUrl = URL.createObjectURL(blob);
      render.src = currentAssetUrl;
      render.play().catch(() => {});
    },
  };
}
