(() => {
  const $ = (id) => document.getElementById(`hl-${id}`);
  const video = $("video");
  const videoStage = $("video-stage");
  const previewNote = $("preview-note");
  const status = $("status");
  const standardProgress = progressDisplay();
  const enhancementProgress = progressDisplay("enhancement-");
  const replayToggle = $("replays");
  const scoreButton = $("score-zone");
  const scorePicker = $("score-picker");
  const scoreBox = $("score-box");
  const analyze = $("analyze");
  const cancel = $("cancel");
  const add = $("add");
  const save = $("save");
  const exportButton = $("export");
  const download = $("download");
  const clipList = $("clips");
  const whisper = $("whisper");
  const language = $("language");
  const limit = $("limit");
  const limitButtons = limit.closest(".number-stepper").querySelectorAll(".stepper-btn");
  const timeline = $("timeline");
  const track = $("timeline-track");
  const rail = $("timeline-scroll");
  const ticks = $("timeline-ticks");
  const clipTrack = $("timeline-clips");
  const playhead = $("playhead");
  const liveServer = location.port === "5500" && ["localhost", "127.0.0.1"].includes(location.hostname);
  const api = (liveServer ? "http://127.0.0.1:4173" : "") + "/api/highlights";
  const stages = {
    audio: "Analyse du son du match…",
    whisper: "Transcription locale des commentaires…",
    score: "Lecture du tableau de score…",
    replay: "Recherche de ralentis répétés…",
    tracking: "Suivi du sujet dans l’extrait…",
    export: "Assemblage du MP4…",
    enhancement: "Amélioration IA des extraits…",
  };
  const messages = {
    invalidVideo: "Impossible d’ouvrir cette vidéo.",
    fileTooLarge: "La vidéo dépasse 32 Gio.",
    invalidClips: "Vérifie les heures de début et de fin des extraits cochés.",
    sessionMissing: "La session locale a expiré. Relance l’opération.",
    noAudio: "Cette vidéo n’a pas de piste audio. Tu peux ajouter les extraits à la main.",
    whisperFallback: "Whisper a échoué. Les suggestions viennent de l’analyse du son.",
    scoreFallback: "Le score n’a pas pu être lu. Les autres indices restent disponibles.",
    replayFallback: "La comparaison des ralentis a échoué. Les suggestions ont été conservées.",
    invalidScoreRegion: "Sélectionne une zone valide autour des deux chiffres du score.",
    invalidTracking: "Le suivi exige une zone valide et un extrait de deux minutes maximum.",
    graphicUnavailable: "Impossible de charger le graphique enregistré.",
    busy: "Une opération est déjà en cours.",
    operationFailed: "L’opération a échoué. Réessaie avec cette vidéo ou un autre fichier.",
    enhancementFailed: "Real-ESRGAN n’a pas pu améliorer la vidéo. Vérifie qu’un GPU compatible Vulkan est disponible.",
    enhancementUnavailable: "Real-ESRGAN est indisponible sur le service local.",
    enhancementOutdated: "Relance le traitement IA pour les extraits et les réglages actuels.",
  };

  let service;
  let file;
  let videoUrl;
  let session;
  let enhancement;
  let duration = 0;
  let clips = [];
  let transcript = [];
  let analyzed = false;
  let signature;
  let loadingAnalysis = false;
  let loadingMatchVideo = false;
  let matchVideoProjectId;
  let mountedMatchVideo;
  let savingAnalysis = false;
  let analysisDatabase;
  let selectedClip;
  let expandedClip;
  const clipDetails = new WeakMap();
  const graphicTrack = $("graphics-track");
  const graphicSource = $("graphic-source");
  const graphicPicker = $("graphic-picker");
  const montageSaveProgress = $("montage-save-progress");
  const montageSaveStatus = $("montage-save-status");
  let graphicChoice;
  let graphicPickerSignature;
  const graphicList = $("graphic-list");
  const graphicEditors = new WeakMap();
  const graphicImages = new Map();
  let graphics = [];
  let matchPeriods = [null, null];
  let selectedGraphic;
  let loadingGraphic = false;
  let timelineZoom = 1;
  let timelineDrag;
  let scoreRegion;
  let scoreDrag;
  let trackingSelection;
  let reviewQueue = [];
  let reviewIndex = -1;
  let busy = false;
  let request;
  let cancellationRequested = false;
  let playerEnd;
  let playerStart;
  let reverseFrame = null;
  let statusMessage = "";
  let statusVariables;
  let libraryMontage;
  const uploadedMontageAssets = new Map();
  const montage = createHighlightsMontage(video, {
    changed: invalidateExport,
    formatChanged: () => {
      if (trackingSelection) closeScorePicker();
      renderClips();
      renderTrackedBox();
    },
    test: (dry) => renderSelected(dry),
    saveLibrary: () => saveMontageToLibrary(),
  });
  let previewMessage = "Choisis la vidéo du match pour la prévisualiser.";

  function setStatus(message, variables) {
    if (!busy) $("general-feedback").append($("job-feedback"));
    statusMessage = message;
    statusVariables = variables;
    status.textContent = translate(message, variables);
  }

  function setPreview(message) {
    previewMessage = message;
    previewNote.hidden = !message;
    previewNote.textContent = translate(message);
  }

  function clock(seconds) {
    if (!Number.isFinite(seconds)) return "—";
    const secondsRounded = Math.floor(Math.max(0, seconds));
    return [Math.floor(secondsRounded / 3600), Math.floor(secondsRounded / 60) % 60, secondsRounded % 60]
      .map((part) => String(part).padStart(2, "0")).join(":");
  }

  function minuteTime(seconds, precision = 2) {
    const units = 10 ** precision;
    const time = Math.round(Math.max(0, seconds) * units);
    const remainder = String(time % (60 * units)).padStart(2 + precision, "0");
    return `${String(Math.floor(time / (60 * units))).padStart(2, "0")}:${remainder.slice(0, 2)}.${remainder.slice(2)}`;
  }

  function parseMinuteTime(value) {
    const text = value.trim().replace(",", ".");
    const time = /^(\d+):([0-5]?\d(?:\.\d+)?)$/.exec(text);
    if (time) return Number(time[1]) * 60 + Number(time[2]);
    return /^\d+(?:\.\d+)?$/.test(text) ? Number(text) * 60 : NaN;
  }

  function stepperField(title, read, write, { time = false, step = 1, precision = 2, min = 0, max }) {
    const field = document.createElement("label");
    field.className = "field";
    const text = document.createElement("span");
    text.textContent = translate(title);
    const input = document.createElement("input");
    input.type = time ? "text" : "number";
    input.inputMode = "decimal";
    if (time) input.placeholder = `mm:ss.${"s".repeat(precision)}`;
    const refresh = () => { input.value = time ? minuteTime(read(), precision) : read(); };
    const set = (value) => {
      if (Number.isFinite(value)) write(Math.max(min, Math.min(max(), Number(value.toFixed(precision)))));
      refresh();
    };
    const stepper = document.createElement("div");
    stepper.className = "number-stepper";
    const button = (symbol, adjust, label) => {
      const control = makeButton(symbol, () => set(read() + adjust));
      control.className = "stepper-btn";
      control.setAttribute("aria-label", `${translate(label)} · ${translate(title)}`);
      return control;
    };
    input.addEventListener("change", () => set(time ? parseMinuteTime(input.value) : input.valueAsNumber));
    stepper.append(button("−", -step, "Diminuer"), input, button("+", step, "Augmenter"));
    field.append(text, stepper);
    refresh();
    return { field, set, refresh };
  }

  function valid({ start, end }) {
    return start >= 0 && end <= duration + 0.01 && end - start >= 0.1;
  }

  function updateControls() {
    const kept = clips.filter((clip) => clip.keep).map(exportClip);
    const restoring = busy || loadingAnalysis || loadingGraphic;
    updateMatchVideoButton();
    updateGraphicControls();
    whisper.disabled = busy || !service?.whisper;
    replayToggle.disabled = restoring || !service?.replays;
    scoreButton.disabled = restoring || !service?.scoreboard || !Number.isFinite(video.duration);
    scoreButton.textContent = translate(scoreRegion ? "Modifier la zone du score" : "Définir la zone du score");
    $("score-clear").hidden = !scoreRegion || busy;
    language.disabled = whisper.disabled || !whisper.checked;
    limit.disabled = busy;
    limitButtons.forEach((button) => { button.disabled = busy; });
    analyze.disabled = restoring || !file || !service?.ffmpeg;
    add.disabled = restoring || !Number.isFinite(video.duration) || clips.length >= 80;
    save.disabled = restoring || savingAnalysis || !signature || (!analyzed && !clips.length) || !clips.every(valid);
    exportButton.disabled = restoring || !service?.ffmpeg || !service?.montage || !kept.length || !kept.every(valid);
    $("end-card").disabled = restoring;
    const ready = isEnhancementReady(kept);
    $("enhancement-mode").disabled = restoring || !service?.prepareEnhancement;
    $("prepare-enhancement").disabled = restoring || !service?.prepareEnhancement || !kept.length || !kept.every(valid) || ready;
    $("enhance-video").disabled = restoring || !ready;
    if (!ready) $("enhance-video").checked = false;
    $("enhance-unavailable").hidden = !service || Boolean(service.prepareEnhancement);
    const enhancementStatus = $("enhancement-status");
    enhancementStatus.hidden = !enhancement;
    enhancementStatus.textContent = enhancement ? translate(ready
      ? "Les extraits améliorés sont prêts pour l’export." : messages.enhancementOutdated) : "";
    if (!busy && !ready) enhancementProgress.group.hidden = true;
    cancel.hidden = !busy;
    download.hidden = busy || !download.hasAttribute("href");
    clipList.inert = restoring;
    timeline.inert = restoring;
    $("review").inert = restoring;
    montage.setEnabled(Boolean(file && signature && clips.length), restoring || savingAnalysis, service);
    updateTrackingControls();
  }

  function updateTrackingControls() {
    const visible = montage.format() === "short";
    const tracking = selectedClip?.edits?.short?.tracking;
    $("tracking").hidden = !visible;
    $("track-start").disabled = busy || loadingAnalysis || !service?.tracking || !selectedClip || video.hidden ||
      !valid(exportClip(selectedClip)) || !Number.isFinite(video.duration);
    $("track-axis").disabled = busy;
    $("track-clear").hidden = !tracking;
    $("track-clear").disabled = busy;
    if (tracking) $("track-axis").value = tracking.axis;
    $("track-status").textContent = !visible ? "" :
      !service?.tracking ? translate("Relance le service local pour activer le suivi.") :
      !selectedClip ? translate("Sélectionne un extrait dans la timeline.") :
      tracking ? translate("Suivi calculé sur {percent} % des images analysées.", { percent: tracking.coverage }) : "";
    renderTrackedBox();
  }

  function renderTrackedBox() {
    const box = $("track-box");
    const tracking = selectedClip?.edits?.short?.tracking;
    const time = video.currentTime;
    box.hidden = montage.format() !== "short" || !tracking?.points.length || !scorePicker.hidden ||
      video.hidden || !video.videoWidth || time < tracking.points[0].at || time > tracking.points.at(-1).at + .2;
    if (box.hidden) return;
    const points = tracking.points;
    const index = points.findIndex((point) => point.at >= time);
    const next = points[index < 0 ? points.length - 1 : index];
    const previous = points[index > 0 ? index - 1 : index < 0 ? points.length - 1 : 0];
    const fraction = next.at > previous.at ? (time - previous.at) / (next.at - previous.at) : 0;
    const { width, height } = tracking.region;
    const centerX = previous.x + (next.x - previous.x) * fraction;
    const centerY = previous.y + (next.y - previous.y) * fraction;
    paintRegion(box, { x: centerX - width / 2, y: centerY - height / 2, width, height }, videoStage);
  }

  function progressDisplay(prefix = "") {
    return { group: $(prefix + "progress-group"), bar: $(prefix + "progress"),
      percent: $(prefix + "percent"), timer: $(prefix + "elapsed") };
  }

  function showProgress({ bar, percent }, value) {
    if (!Number.isFinite(value)) {
      bar.removeAttribute("value");
      percent.textContent = "";
      return;
    }
    bar.value = value;
    percent.textContent = `${Math.floor(value)} %`;
  }

  function showElapsed(timer, start) {
    const seconds = (performance.now() - start) / 1000;
    const time = clock(seconds);
    timer.textContent = seconds < 3600 ? time.slice(3) : time;
  }

  function clipLabel(clip) {
    return translate({ goal: "But possible", chance: "Occasion possible", audio: "Pic sonore", manual: "Extrait manuel" }[clip.kind]);
  }

  function playClip(clip) {
    if (!valid(clip) || !Number.isFinite(video.duration) || video.error) return;
    selectClip(clip, false);
    seek(playbackSpeed() < 0 ? clip.end : clip.start);
    playerStart = clip.start;
    playerEnd = clip.end;
    startPlayback();
  }

  function pendingReview() {
    return clips.filter((clip) => valid(clip) && (!clip.review || clip.review === "later"))
      .sort((a, b) => a.start - b.start);
  }

  function renderReview() {
    $("review").hidden = !clips.length;
    const current = reviewQueue[reviewIndex];
    $("review-current").hidden = !current;
    $("review-start").textContent = translate(current ? "Quitter la validation" : "Validation rapide");
    $("review-start").disabled = !current && !pendingReview().length;
    const seconds = clips.filter((clip) => clip.keep).map(exportClip).filter(valid)
      .reduce((sum, clip) => sum + clip.end - clip.start, 0);
    $("total").textContent = translate("Durée du montage · {duration}", { duration: clock(seconds) });
    if (current) $("review-label").textContent = translate("{current}/{total} · {clip} · {time}", {
      current: reviewIndex + 1, total: reviewQueue.length, clip: clipLabel(current), time: clock(current.start),
    });
  }

  function timestamps() {
    playhead.style.left = `${duration ? video.currentTime / duration * 100 : 0}%`;
    $("clock").value = `${clock(video.currentTime)} / ${clock(duration)}`;
    renderTrackedBox();
    renderGraphicPreview();
  }

  function seek(time) {
    if (!Number.isFinite(video.duration)) return;
    stopReverse();
    playerEnd = undefined;
    playerStart = undefined;
    video.currentTime = Math.max(0, Math.min(video.duration, time));
    timestamps();
  }

  function renderTicks() {
    ticks.replaceChildren();
    if (!duration || !track.offsetWidth) return;
    const steps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200];
    const interval = steps.find((step) => step >= duration * 90 / track.offsetWidth) ?? steps.at(-1);
    const marks = document.createDocumentFragment();
    for (let time = 0; time < duration; time += interval) {
      const marker = document.createElement("span");
      marker.textContent = clock(time);
      marker.style.left = `${time / duration * 100}%`;
      marks.append(marker);
    }
    ticks.append(marks);
  }

  function positionBlock(block, clip) {
    block.style.left = `${clip.start / duration * 100}%`;
    block.style.width = `${(clip.end - clip.start) / duration * 100}%`;
  }

  function renderTimeline() {
    timeline.hidden = !duration;
    const playable = Number.isFinite(video.duration) && !video.error;
    $("transport").hidden = !playable;
    $("prev").disabled = $("next").disabled = !clips.some(valid);
    updatePlaybackLabel();
    clipTrack.replaceChildren();
    const lanes = [];
    if (duration) {
      for (const [index, clip] of clips.map((clip, index) => [index, clip]).sort((a, b) => a[1].start - b[1].start)) {
        if (!valid(clip)) continue;
        let lane = lanes.findIndex((end) => end <= clip.start);
        if (lane === -1) lane = lanes.length;
        lanes[lane] = clip.end;
        const block = document.createElement("div");
        block.className = "highlights-timeline-clip";
        block.dataset.index = index;
        block.dataset.kind = clip.kind;
        block.dataset.excluded = clip.review === "ignore";
        block.dataset.selected = clip === selectedClip;
        block.style.top = `${lane * 24 + 3}px`;
        positionBlock(block, clip);
        const title = `${clipLabel(clip)} · ${clock(clip.start)}–${clock(clip.end)}`;
        block.title = title;
        const target = makeButton(clipLabel(clip), () => {
          selectClip(clip);
          openClipDetails(clip);
        });
        target.className = "highlights-clip-target";
        target.setAttribute("aria-label", title);
        const handle = (edge, message) => {
          const button = makeButton(message, () => updateTrim(clip, edge, video.currentTime));
          button.className = "highlights-trim";
          button.dataset.edge = edge;
          button.setAttribute("aria-label", translate(message));
          button.textContent = "";
          return button;
        };
        block.append(handle("start", "Début ici"), target, handle("end", "Fin ici"));
        clipTrack.append(block);
      }
    }
    clipTrack.style.height = `${Math.max(26, lanes.length * 24 + 4)}px`;
    renderGraphicTrack();
    timestamps();
  }

  function updateGraphicControls() {
    const groups = window.matchPresetMenus?.listMontageGraphics() ?? [];
    const signature = JSON.stringify(groups);
    if (signature !== graphicPickerSignature) {
      graphicPickerSignature = signature;
      renderGraphicPicker(groups);
    }
    const controls = $("graphics-controls");
    controls.inert = busy || loadingAnalysis || loadingGraphic;
    graphicSource.disabled = !groups.length;
    $("graphic-add").disabled = !graphicChoice || duration < 0.2 || graphics.length >= 16;
    for (const [index, half] of ["first", "second"].entries()) {
      $(`clock-${half}`).disabled = !Number.isFinite(video.duration);
      const at = matchPeriods[index];
      $(`clock-${half}-time`).textContent = Number.isFinite(at) ? clock(at) : "—";
    }
    $("clock-clear").hidden = !matchPeriods.some(Number.isFinite);
  }

  for (const [index, half] of ["first", "second"].entries()) {
    $(`clock-${half}`).addEventListener("click", () => {
      const at = Number(video.currentTime.toFixed(3));
      const other = matchPeriods[1 - index];
      if (Number.isFinite(other) && (index === 0 ? at >= other : at <= other)) {
        setStatus("Le début de la 2e mi-temps doit suivre celui de la 1re.");
        return;
      }
      matchPeriods[index] = at;
      graphicsChanged();
    });
  }
  $("clock-clear").addEventListener("click", () => {
    matchPeriods = [null, null];
    graphicsChanged();
  });

  function liveScoreTime(time) {
    const [first, second] = matchPeriods;
    const offset = Number.isFinite(second) && time >= second ? 2700 : 0;
    const anchor = offset ? second : first;
    if (!Number.isFinite(anchor) || time < anchor) return "";
    const elapsed = offset + Math.min(2700, Math.floor(time - anchor + 0.000001));
    return `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  }

  function renderGraphicPicker(groups) {
    const previous = graphicChoice?.id;
    const options = [];
    const pick = (choice) => {
      graphicChoice = choice;
      const text = $("graphic-source-value");
      text.textContent = choice?.name ?? "Saved Graphic";
      text.title = choice?.label ?? text.textContent;
      graphicSource.querySelector("[aria-hidden='true']")?.remove();
      if (choice) graphicSource.prepend(window.matchPresetMenus.graphicIcon(choice.kind));
      for (const [entry, button] of options) button.setAttribute("aria-pressed", String(entry === choice));
    };
    graphicPicker.replaceChildren(...groups.map(({ kind, label, items }) => {
      const group = document.createElement("details");
      group.name = "saved-graphic-groups";
      const heading = document.createElement("summary");
      heading.className = "highlights-graphic-group";
      heading.append(window.matchPresetMenus.graphicIcon(kind), label);
      group.append(heading);
      for (const { id, name, leg } of items) {
        const duplicateName = items.some((other) => other.id !== id && other.name === name);
        const optionLabel = duplicateName && leg ? `${name} · ${translate(leg)}` : name;
        const choice = { id, kind, name, label: `${label} · ${optionLabel}` };
        const button = makeButton(optionLabel, () => {
          pick(choice);
          updateGraphicControls();
          graphicPicker.hidePopover();
          graphicSource.focus();
        });
        options.push([choice, button]);
        group.append(button);
      }
      return group;
    }));
    pick(options.find(([choice]) => choice.id === previous)?.[0]);
    if (!options.length && graphicPicker.matches(":popover-open")) graphicPicker.hidePopover();
  }

  graphicPicker.addEventListener("toggle", (event) => {
    if (event.newState !== "open") return;
    for (const group of graphicPicker.querySelectorAll("details")) group.open = false;
    if (window.innerHeight - graphicSource.getBoundingClientRect().bottom < 180) {
      graphicSource.scrollIntoView({ block: "center" });
    }
    positionGraphicPicker();
    graphicPicker.querySelector("summary")?.focus({ preventScroll: true });
  });

  function positionGraphicPicker() {
    if (!graphicPicker.matches(":popover-open")) return;
    const anchor = graphicSource.getBoundingClientRect();
    graphicPicker.style.left = `${anchor.left}px`;
    graphicPicker.style.width = `${anchor.width}px`;
    graphicPicker.style.top = `${anchor.bottom + 4}px`;
    graphicPicker.style.maxHeight = `min(320px, 55vh, ${Math.max(0, window.innerHeight - anchor.bottom - 12)}px)`;
  }
  document.addEventListener("scroll", positionGraphicPicker, true);
  window.addEventListener("resize", positionGraphicPicker);
  graphicPicker.addEventListener("keydown", (event) => {
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    const buttons = [...graphicPicker.querySelectorAll("summary, details[open] > button")];
    const index = buttons.indexOf(event.target);
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
      : (index + (event.key === "ArrowUp" ? -1 : 1) + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[next]?.focus();
  });

  function positionGraphic(block, graphic) {
    block.style.left = `${graphic.at / duration * 100}%`;
    block.style.width = `${graphic.length / duration * 100}%`;
  }

  function renderGraphicTrack() {
    graphicTrack.replaceChildren();
    graphicTrack.hidden = !graphics.length || !duration;
    if (graphicTrack.hidden) return;
    const lanes = [];
    for (const graphic of [...graphics].sort((a, b) => a.at - b.at)) {
      let lane = lanes.findIndex((end) => end <= graphic.at);
      if (lane === -1) lane = lanes.length;
      lanes[lane] = graphic.at + graphic.length;
      const block = document.createElement("div");
      block.className = "highlights-timeline-clip highlights-timeline-graphic";
      block.dataset.graphic = graphic.slot;
      block.dataset.selected = graphic === selectedGraphic;
      block.style.top = `${lane * 24 + 3}px`;
      block.title = graphic.label;
      positionGraphic(block, graphic);
      const button = makeButton(graphic.label, () => {
        selectGraphic(graphic);
        seek(graphic.at);
      });
      button.className = "highlights-clip-target";
      const handle = makeButton("Redimensionner le graphique", () => selectGraphic(graphic));
      handle.className = "highlights-trim";
      handle.dataset.graphicResize = "";
      handle.setAttribute("aria-label", handle.textContent);
      handle.textContent = "";
      block.append(button, handle);
      graphicTrack.append(block);
    }
    graphicTrack.style.height = `${lanes.length * 24 + 4}px`;
  }

  const graphicTransitions = [
    ["none", "Aucune"], ["vertical", "Volet vertical"], ["horizontal", "Volet horizontal"],
    ["slide-left-right", "Store de gauche à droite"], ["slide-top-down", "Store de haut en bas"],
    ["slide-bottom-up", "Store de bas en haut"], ["glow", "Halo"], ["lightning", "Éclair"], ["fade", "Fondu"],
  ];
  const graphicTransitionDuration = 0.625;
  const graphicWipeFeather = 1.8;
  const graphicWipeEdges = {
    "slide-left-right": ["right", "left"],
    "slide-top-down": ["bottom", "top"],
    "slide-bottom-up": ["top", "bottom"],
  };
  const graphicDefaults = {
    matchScore: { length: 5, x: 5, y: 5, size: 30, intro: "none", outro: "none" },
    matchBanner: { length: 5, x: 5, y: 95, size: 35, intro: "slide-left-right", outro: "slide-left-right" },
    showdown: { length: 5, x: 50, y: 50, size: 80, intro: "slide-top-down", outro: "slide-bottom-up" },
    lineup: { length: 10, x: 50, y: 50, size: 80, intro: "slide-top-down", outro: "slide-bottom-up",
      teamIntro: "glow", teamOutro: "slide-bottom-up" },
  };

  function graphicLayers(graphic) {
    if (!graphic.teamSlot) return [graphic];
    const delay = graphic.intro === "none" ? 0 : graphicTransitionDuration;
    const layers = [{ ...graphic, mode: "background" }];
    if (graphic.length > delay) {
      layers.push({ ...graphic, slot: graphic.teamSlot, mode: "team", at: graphic.at + delay,
        length: graphic.length - delay, intro: graphic.teamIntro, outro: graphic.teamOutro });
    }
    return layers;
  }

  function graphicTransitionRow(graphic, definitions) {
    const row = document.createElement("div");
    row.className = "row highlights-graphic-transitions";
    for (const [key, title] of definitions) {
      const label = document.createElement("label");
      label.className = "field";
      const text = document.createElement("span");
      text.textContent = translate(title);
      const select = document.createElement("select");
      select.append(...graphicTransitions.map(([value, label]) => new Option(translate(label), value)));
      const fallback = graphic.motion === "fade" ? "fade" : "none";
      select.value = graphic[key] ?? fallback;
      select.addEventListener("change", () => {
        graphic[key] = select.value;
        for (const [other] of definitions) graphic[other] ??= fallback;
        graphicsChanged();
      });
      label.append(text, select);
      row.append(label);
    }
    return row;
  }

  function renderGraphicEditors() {
    graphicList.replaceChildren();
    for (const graphic of graphics) {
      const row = document.createElement("li");
      const details = document.createElement("details");
      details.name = "highlights-graphic-editors";
      details.open = graphic === selectedGraphic;
      details.addEventListener("toggle", () => {
        if (!details.isConnected) return;
        if (details.open && graphic !== selectedGraphic) selectGraphic(graphic);
        else if (!details.open && graphic === selectedGraphic) {
          selectedGraphic = undefined;
          renderGraphicTrack();
        }
      });
      const summary = document.createElement("summary");
      const caption = document.createElement("span");
      caption.className = "highlights-clip-caption";
      const name = document.createElement("span");
      name.textContent = name.title = graphic.label;
      const time = document.createElement("span");
      caption.append(name, time);
      const remove = makeButton("Retirer", (event) => {
        event.preventDefault();
        event.stopPropagation();
        removeGraphic(graphic);
      });
      remove.classList.add("highlights-clip-remove");
      summary.append(caption, remove);
      details.append(summary);
      const timing = document.createElement("div");
      timing.className = "row";
      const placement = document.createElement("div");
      placement.className = "row row-3";
      const fields = [
        ["at", "Début (min:s)", timing, { time: true, step: 0.1, max: () => Math.max(0, duration - 0.2) }],
        ["length", "Durée (min:s)", timing, { time: true, step: 0.1, min: 0.2, max: () => Math.max(0.2, duration - graphic.at) }],
        ["x", "Position X (%)", placement, { max: () => 100 }],
        ["y", "Position Y (%)", placement, { max: () => 100 }],
        ["size", "Taille (%)", placement, { min: 5, max: () => 100 }],
      ].map(([key, title, container, options]) => {
        const field = stepperField(title, () => graphic[key], (value) => {
          graphic[key] = value;
          graphic.length = Math.max(0.2, Math.min(graphic.length, duration - graphic.at));
          graphicsChanged();
        }, options);
        container.append(field.field);
        return field;
      });
      const transitions = graphicTransitionRow(graphic, graphic.teamSlot
        ? [["intro", "Entrée du fond"], ["outro", "Sortie du fond"]]
        : [["intro", "Transition d’entrée"], ["outro", "Transition de sortie"]]);
      details.append(timing, placement, transitions);
      if (graphic.teamSlot) {
        details.append(graphicTransitionRow(graphic, [
          ["teamIntro", "Entrée de l’équipe"], ["teamOutro", "Sortie de l’équipe"],
        ]));
      }
      row.append(details);
      graphicList.append(row);
      const refresh = () => {
        time.textContent = ` · ${minuteTime(graphic.at)}`;
        fields.forEach((field) => field.refresh());
      };
      graphicEditors.set(graphic, { details, refresh });
      refresh();
    }
  }

  function renderGraphicPreview() {
    const overlay = $("graphic-preview");
    if (!overlay.childElementCount) return;
    const layers = graphics.flatMap(graphicLayers);
    for (const image of [...overlay.children]) {
      const index = layers.findIndex(({ slot }) => slot === image.dataset.slot);
      const graphic = layers[index];
      if (!graphic) { image.remove(); continue; }
      const time = video.currentTime;
      const timer = image.querySelector(".highlights-graphic-clock");
      if (timer) {
        timer.textContent = liveScoreTime(time);
        timer.style.fontSize = `${graphicImages.get(graphic.slot).clock.size * graphic.size}cqw`;
      }
      image.hidden = time < graphic.at || time >= graphic.at + graphic.length;
      image.style.width = `${graphic.size}%`;
      image.style.zIndex = index;
      image.style.left = `${graphic.x}%`;
      image.style.top = `${graphic.y}%`;
      image.style.translate = `-${graphic.x}% -${graphic.y}%`;
      image.style.maskImage = "";
      image.style.filter = "";
      image.style.opacity = "1";
      if (graphic.intro !== undefined || graphic.outro !== undefined) {
        const masks = [];
        let opacity = 1, brightness = 1, glow = 0;
        const phases = [[graphic.intro, time - graphic.at], [graphic.outro, graphic.at + graphic.length - time]];
        for (const [phase, [effect, remaining]] of phases.entries()) {
          if (remaining >= graphicTransitionDuration) continue;
          const linear = Math.max(0, remaining / graphicTransitionDuration);
          const progress = linear * linear * (3 - 2 * linear);
          const cutoff = progress * (100 + graphicWipeFeather);
          const edge = graphicWipeEdges[effect]?.[phase];
          if (edge) {
            masks.push(`linear-gradient(to ${edge}, black ${cutoff - graphicWipeFeather}%, transparent ${cutoff}%)`);
          } else if (effect === "vertical" || effect === "horizontal") {
            const direction = effect === "vertical" ? "bottom" : "right";
            const outer = cutoff / 2;
            const inner = Math.max(0, (cutoff - graphicWipeFeather) / 2);
            masks.push(`linear-gradient(to ${direction}, transparent ${50 - outer}%, black ${50 - inner}%, black ${50 + inner}%, transparent ${50 + outer}%)`);
          }
          if (effect === "lightning") brightness += 4 * (1 - progress);
          if (effect === "glow") glow += 4 * progress * (1 - progress);
          if (effect === "fade" || effect === "lightning" || effect === "glow") opacity *= progress;
        }
        if (masks.length) image.style.maskImage = masks.join(", ");
        if (brightness !== 1) image.style.filter = `brightness(${brightness})`;
        if (glow) image.style.filter += ` drop-shadow(0 0 ${14 * glow}px rgb(225 245 255 / ${Math.min(1, glow)}))`;
        image.style.opacity = opacity;
      } else if (graphic.motion === "fade") {
        const fade = Math.min(0.3, graphic.length / 3);
        image.style.opacity = Math.max(0, Math.min(1, (time - graphic.at) / fade, (graphic.at + graphic.length - time) / fade));
      }
    }
  }

  async function graphicAsset(graphic) {
    const cached = graphicImages.get(graphic.slot);
    if (cached) return cached;
    const result = await window.matchPresetMenus.renderMontageGraphic(graphic.recordId, graphic.mode);
    const { blob, clock: timer } = result;
    if (!graphics.some(({ slot, teamSlot }) => slot === graphic.slot || teamSlot === graphic.slot)) return result;
    const url = URL.createObjectURL(blob);
    graphicImages.set(graphic.slot, { ...result, url });
    const overlay = document.createElement("div");
    overlay.dataset.slot = graphic.slot;
    const image = document.createElement("img");
    image.alt = "";
    image.src = url;
    overlay.append(image);
    if (timer) {
      const text = document.createElement("span");
      text.className = "highlights-graphic-clock";
      text.style.left = `${timer.x * 100}%`;
      text.style.top = `${timer.y * 100}%`;
      overlay.append(text);
    }
    $("graphic-preview").append(overlay);
    renderGraphicPreview();
    return result;
  }

  function clearGraphicPreview() {
    for (const { url } of graphicImages.values()) URL.revokeObjectURL(url);
    graphicImages.clear();
    $("graphic-preview").replaceChildren();
  }

  function selectGraphic(graphic) {
    selectedGraphic = graphic;
    $("graphics-controls").closest("details").open = true;
    const editor = graphicEditors.get(graphic);
    if (editor) editor.details.open = true;
    updateGraphicControls();
    for (const block of graphicTrack.children) block.dataset.selected = block.dataset.graphic === graphic.slot;
    const layers = graphicLayers(graphic);
    if (layers.some(({ slot }) => !graphicImages.has(slot)) && !loadingGraphic && !busy) {
      loadingGraphic = true;
      updateControls();
      montageAssets({ graphics: layers }).catch(() => setStatus(messages.graphicUnavailable)).finally(() => {
        loadingGraphic = false;
        updateControls();
      });
    }
  }

  function graphicsChanged() {
    invalidateExport();
    renderGraphicTrack();
    renderGraphicPreview();
    updateGraphicControls();
    graphics.forEach((graphic) => graphicEditors.get(graphic)?.refresh());
  }

  async function montageAssets(configuration, extra = {}) {
    const assets = { ...extra };
    try {
      for (const graphic of configuration.graphics ?? []) {
        const { blob, clock } = await graphicAsset(graphic);
        assets[graphic.slot] = blob;
        if (clock && configuration.matchPeriods?.some(Number.isFinite)) {
          (configuration.graphicClocks ??= {})[graphic.slot] = clock;
        }
      }
    } catch {
      throw new Error(messages.graphicUnavailable);
    }
    return assets;
  }

  $("graphic-add").addEventListener("click", () => {
    if (!graphicChoice || duration < 0.2 || graphics.length >= 16 || loadingGraphic || busy) return;
    const at = Math.min(video.currentTime, duration - 0.2);
    const defaults = graphicDefaults[graphicChoice.kind] ?? { length: 5, intro: "fade", outro: "fade" };
    const graphic = { slot: `graphic-${crypto.randomUUID()}`, recordId: graphicChoice.id, label: graphicChoice.label,
      x: 50, y: 15, size: 60, ...defaults, at, length: Math.min(defaults.length, duration - at) };
    if (graphicChoice.kind === "lineup") graphic.teamSlot = `graphic-${crypto.randomUUID()}`;
    graphics.push(graphic);
    renderGraphicEditors();
    selectGraphic(graphic);
    graphicsChanged();
  });
  function removeGraphic(graphic) {
    for (const slot of [graphic.slot, graphic.teamSlot]) {
      const cached = graphicImages.get(slot);
      if (cached) URL.revokeObjectURL(cached.url);
      graphicImages.delete(slot);
    }
    graphics = graphics.filter((item) => item !== graphic);
    if (selectedGraphic === graphic) selectedGraphic = undefined;
    renderGraphicEditors();
    graphicsChanged();
  }
  document.addEventListener("ucl-active-match-video", updateGraphicControls);

  function selectClip(clip, shouldSeek = true) {
    selectedClip = clip;
    if (shouldSeek) seek(clip.start);
    for (const block of clipTrack.children) {
      block.dataset.selected = clips[Number(block.dataset.index)] === selectedClip;
    }
    updateTrackingControls();
  }

  function openClipDetails(clip) {
    const details = clipDetails.get(clip);
    if (!details?.isConnected) return;
    const section = clipList.closest("details");
    if (section) section.open = true;
    expandedClip = clip;
    details.open = true;
    details.querySelector("summary").scrollIntoView({ block: "nearest" });
  }

  function updateTrim(clip, edge, seconds, block) {
    if (!valid(clip)) return;
    const round = (value) => Math.round(value * 100) / 100;
    clip[edge] = edge === "start"
      ? Math.min(round(seconds), round(clip.end - 0.2))
      : Math.max(round(seconds), round(clip.start + 0.2));
    clip[edge] = Math.max(0, Math.min(duration, clip[edge]));
    invalidateExport();
    if (block) positionBlock(block, clip);
    else renderClips();
  }

  function invalidateExport() {
    download.removeAttribute("href");
    renderReview();
    updateControls();
  }

  function makeButton(label, click) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn-secondary";
    button.textContent = translate(label);
    button.addEventListener("click", click);
    return button;
  }

  function renderClips() {
    clipList.replaceChildren();
    for (const clip of clips) {
      const li = document.createElement("li");
      const details = document.createElement("details");
      clipDetails.set(clip, details);
      details.name = "highlights-clips";
      details.open = expandedClip === clip;
      details.addEventListener("toggle", () => {
        if (!details.isConnected) return;
        if (details.open) expandedClip = clip;
        else if (expandedClip === clip) expandedClip = undefined;
      });
      const header = document.createElement("summary");
      const keep = document.createElement("input");
      keep.type = "checkbox";
      keep.checked = clip.keep;
      const caption = document.createElement("span");
      caption.className = "highlights-clip-caption";
      const name = document.createElement("span");
      const time = document.createElement("span");
      caption.append(name, time);
      const refreshCaption = () => {
        name.textContent = clipLabel(clip);
        name.title = name.textContent;
        time.textContent = ` · ${clock(clip.start)}`;
      };
      refreshCaption();
      keep.setAttribute("aria-label", translate("Garder l’extrait"));
      keep.addEventListener("change", () => {
        clip.keep = keep.checked;
        clip.review = keep.checked ? "keep" : "ignore";
        invalidateExport();
        renderTimeline();
      });
      const remove = makeButton("Retirer", (event) => {
        event.preventDefault();
        event.stopPropagation();
        clips = clips.filter((item) => item !== clip);
        if (selectedClip === clip) selectedClip = undefined;
        if (expandedClip === clip) expandedClip = undefined;
        if (reviewQueue.includes(clip)) {
          const index = reviewQueue.indexOf(clip);
          reviewQueue.splice(index, 1);
          if (index < reviewIndex) reviewIndex--;
        }
        invalidateExport();
        renderClips();
      });
      remove.classList.add("highlights-clip-remove");
      header.append(keep, caption, remove);
      details.append(header);
      const body = document.createElement("div");
      details.append(body);
      li.append(details);

      if (clip.score || clip.review === "later") {
        const evidence = document.createElement("p");
        evidence.className = "highlights-quote";
        evidence.textContent = [clip.score && translate("Score à l’écran · {score}", { score: clip.score }),
          clip.review === "later" && translate("À revoir")].filter(Boolean).join(" · ");
        body.append(evidence);
      }

      if (clip.quote) {
        const quote = document.createElement("p");
        quote.className = "highlights-quote";
        quote.textContent = clip.quote;
        body.append(quote);
      }

      const row = document.createElement("div");
      row.className = "row";
      const fields = {};
      for (const [key, title] of [["start", "Début (min:s)"], ["end", "Fin (min:s)"]]) {
        fields[key] = stepperField(title, () => clip[key], (value) => {
          clip[key] = value;
          refreshCaption();
          invalidateExport();
          renderTimeline();
        }, { time: true, step: 0.01, max: () => duration });
        row.append(fields[key].field);
      }
      body.append(row);
      const actions = document.createElement("div");
      actions.className = "highlights-actions highlights-clip-actions";
      const play = makeButton("Lire l’extrait", () => {
        if (!valid(clip)) {
          setStatus(messages.invalidClips);
          return;
        }
        playClip(clip);
      });
      play.disabled = !Number.isFinite(video.duration) || Boolean(video.error);
      actions.append(play);
      for (const [key, title] of [["start", "Début ici"], ["end", "Fin ici"]]) {
        const button = makeButton(title, () => fields[key].set(video.currentTime));
        button.disabled = play.disabled;
        actions.append(button);
      }
      body.append(actions);
      clipList.append(li);
    }
    renderGraphicEditors();
    renderTimeline();
    renderTicks();
    renderReview();
    updateControls();
  }

  async function call(path, { method = "GET", data, body, signal } = {}) {
    const headers = { "X-UCL-Highlights": "1" };
    if (data !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(data);
    }
    const response = await fetch(api + path, { method, headers, body, signal, cache: "no-store" });
    const result = await response.json();
    if (!response.ok) {
      if (result.error === "sessionMissing") session = undefined;
      throw new Error(messages[result.error] || messages.operationFailed);
    }
    return result;
  }

  function connectionMessage() {
    return !service ? "" :
      !service.ffmpeg ? "FFmpeg et FFprobe doivent être installés pour analyser et exporter." :
      !service.whisper ? "Whisper est indisponible. L’analyse du son reste utilisable." :
      !service.montage ? "Relance le service local pour activer le montage." :
      !service.scoreboard ? "Installe les dépendances avec npm install pour lire le tableau de score." : "";
  }

  async function fileSignature(chosen) {
    const sample = 64 * 1024;
    const offsets = [0, Math.max(0, Math.floor((chosen.size - sample) / 2)), Math.max(0, chosen.size - sample)];
    const parts = offsets.map((offset) => chosen.slice(offset, offset + sample));
    const digest = await crypto.subtle.digest("SHA-256", await new Blob([String(chosen.size) + ":", ...parts]).arrayBuffer());
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function analyses() {
    analysisDatabase ??= new Promise((resolve, reject) => {
      const connection = indexedDB.open("ucl-highlights", 1);
      connection.onupgradeneeded = () => connection.result.createObjectStore("analyses");
      connection.onsuccess = () => resolve(connection.result);
      connection.onerror = () => reject(connection.error);
    }).catch((error) => {
      analysisDatabase = undefined;
      throw error;
    });
    return analysisDatabase;
  }

  async function analysisRecord(mode, access) {
    const database = await analyses();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction("analyses", mode);
      const query = access(transaction.objectStore("analyses"));
      transaction.oncomplete = () => resolve(query.result);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  async function connect() {
    try {
      if (location.protocol !== "file:") service = await call("/status");
    } catch {
      service = undefined;
    }
    $("local-start").hidden = Boolean(service);
    setStatus(connectionMessage());
    updateControls();
  }

  $("copy-command").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText("node highlights-server.mjs");
    } catch {
      setStatus("Impossible de copier la commande.");
    }
  });

  function matchVideoLabel(matchName, leg) {
    const teams = matchName.split(/\s+[-–—]\s+/);
    const fixture = leg === "aller" && teams.length === 2 && teams.every(Boolean)
      ? `${teams[1]} – ${teams[0]}`
      : matchName;
    return `${translate(leg === "aller" ? "Match aller" : "Match retour")} · ${fixture}`;
  }

  function updateMatchVideoButton() {
    const match = window.matchPresetMenus?.activeMatchVideos;
    const select = $("match-video-select");
    $("library-source").hidden = !match;
    $("library-source-hint").hidden = Boolean(match);
    const previous = match?.id === matchVideoProjectId ? select.value : "";
    matchVideoProjectId = match?.id;
    const options = (match?.videos || []).map(({ leg, name }) => ({
      leg, label: matchVideoLabel(match.name, leg), filename: name.split(" / ").at(-1),
    }));
    if (select.options.length !== options.length || options.some(({ leg, label, filename }, index) =>
      select.options[index]?.value !== leg || select.options[index]?.text !== label ||
      select.options[index]?.title !== filename)) {
      select.replaceChildren(...options.map(({ leg, label, filename }) => {
        const option = new Option(label, leg);
        option.title = filename;
        return option;
      }));
      if (options.some(({ leg }) => leg === previous)) select.value = previous;
    } else if (!previous && options.length) {
      select.selectedIndex = 0;
    }
    select.disabled = busy || savingAnalysis || loadingMatchVideo;
    $("use-match-video").disabled = !match || select.disabled;
  }

  document.addEventListener("ucl-active-match-video", updateMatchVideoButton);
  $("use-match-video").addEventListener("click", async () => {
    const library = window.matchPresetMenus;
    const match = library?.activeMatchVideos;
    const leg = $("match-video-select").value;
    const selection = match?.videos.find((video) => video.leg === leg);
    if (!selection || busy || loadingMatchVideo) return;
    loadingMatchVideo = true;
    updateControls();
    try {
      const chosen = await library.loadActiveMatchVideo(match.id, leg);
      const current = library.activeMatchVideos;
      if (!chosen || current?.id !== match.id ||
        !current.videos.some((video) => video.leg === leg && video.name === selection.name)) return;
      await loadSource(chosen, { projectId: match.id, leg });
    } catch {
      setStatus("Vidéo associée introuvable. Vérifie son emplacement dans Games.");
    } finally {
      loadingMatchVideo = false;
      updateControls();
    }
  });

  async function loadSource(chosen, linkedVideo) {
    stopReverse();
    playerStart = undefined;
    if (session) call(`/${session.id}`, { method: "DELETE" }).catch(() => {});
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const changingVideo = Boolean(file);
    file = chosen;
    mountedMatchVideo = linkedVideo;
    montageSaveProgress.hidden = true;
    setMontageSaveStatus("");
    montage.returnToSource();
    if (changingVideo) montage.restore();
    session = undefined;
    enhancement = undefined;
    standardProgress.group.hidden = enhancementProgress.group.hidden = true;
    duration = 0;
    clips = [];
    graphics = [];
    matchPeriods = [null, null];
    selectedGraphic = undefined;
    clearGraphicPreview();
    expandedClip = undefined;
    reviewQueue = [];
    reviewIndex = -1;
    scoreRegion = undefined;
    closeScorePicker();
    transcript = [];
    analyzed = false;
    signature = undefined;
    selectedClip = undefined;
    loadingAnalysis = true;
    playerEnd = undefined;
    setTimelineZoom(1);
    videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;
    videoStage.hidden = false;
    setStatus(connectionMessage());
    setPreview("");
    invalidateExport();
    renderClips();
    try {
      const key = await fileSignature(chosen);
      const saved = await analysisRecord("readonly", (store) => store.get(key));
      if (file !== chosen) return;
      signature = key;
      if (libraryMontage?.signature === signature) {
        applyAnalysis(structuredClone(libraryMontage));
        libraryMontage = undefined;
      } else if (saved) applyAnalysis(saved);
    } catch {
      if (file === chosen) setStatus("Le stockage local des analyses est indisponible.");
    } finally {
      if (file === chosen) {
        loadingAnalysis = false;
        renderClips();
      }
    }
  }

  function applyAnalysis(saved) {
    clips = saved.clips;
    graphics = saved.graphics ?? [];
    matchPeriods = [saved.matchPeriods?.[0] ?? null, saved.matchPeriods?.[1] ?? null];
    selectedGraphic = undefined;
    clearGraphicPreview();
    transcript = saved.transcript ?? [];
    scoreRegion = saved.scoreRegion;
    analyzed = saved.analyzed;
    duration ||= saved.duration;
    if (saved.montage) montage.restore(saved.montage);
    setStatus("Analyse sauvegardée rechargée.");
    invalidateExport();
    renderClips();
  }

  function snapshotAnalysis() {
    return { duration, clips: structuredClone(clips), graphics: structuredClone(graphics), matchPeriods: [...matchPeriods],
      transcript, analyzed, scoreRegion, montage: montage.snapshot() };
  }

  async function saveMontageToLibrary() {
    if (!signature || savingAnalysis || busy) return;
    if (!window.matchPresetMenus?.activeProjectId) {
      montageSaveProgress.hidden = true;
      setMontageSaveStatus("Active un match dans Library avant d’enregistrer le montage.");
      return;
    }
    const project = window.matchPresetMenus.activeProjectId;
    savingAnalysis = true;
    montageSaveProgress.hidden = false;
    montageSaveProgress.value = 0;
    setMontageSaveStatus("Enregistrement du montage…");
    updateControls();
    try {
      const data = snapshotAnalysis();
      await analysisRecord("readwrite", (store) => store.put(data, signature));
      montageSaveProgress.value = 1;
      const portable = structuredClone(data);
      portable.signature = signature;
      portable.source = file.name;
      const leg = mountedMatchVideo?.projectId === project ? mountedMatchVideo.leg : undefined;
      await window.matchPresetMenus.saveMontage(project, portable, leg);
      montageSaveProgress.value = montageSaveProgress.max;
      setMontageSaveStatus("Montage enregistré dans Library.");
    } catch {
      montageSaveProgress.hidden = true;
      setMontageSaveStatus("Impossible d’enregistrer le montage dans Library.");
    } finally {
      savingAnalysis = false;
      updateControls();
    }
  }

  function setMontageSaveStatus(message) {
    montageSaveStatus.dataset.interfaceMessage = message;
    montageSaveStatus.textContent = message ? translate(message) : "";
  }

  window.highlightsProject = {
    async open(data) {
      if (busy) throw new Error("Highlights is busy");
      if (signature === data.signature) applyAnalysis(structuredClone(data));
      else {
        libraryMontage = data;
        montage.message("Rouvre la vidéo {file} pour retrouver ce montage.", { file: data.source });
      }
    },
  };

  video.addEventListener("loadedmetadata", () => {
    duration = video.duration;
    setPreview("");
    renderClips();
  });
  video.addEventListener("error", () => {
    stopReverse();
    videoStage.hidden = true;
    closeScorePicker();
    setPreview("Ce navigateur ne peut pas lire la vidéo d’origine. L’analyse et l’export restent disponibles.");
    renderClips();
  });
  video.addEventListener("timeupdate", () => {
    if (reverseFrame === null && playbackSpeed() > 0 && playerEnd !== undefined && video.currentTime >= playerEnd) {
      video.pause();
      seek(playerEnd);
    }
    timestamps();
  });
  video.addEventListener("play", () => {
    if (playbackSpeed() < 0) {
      stopReverse();
      $("speed").value = "1";
      video.playbackRate = 1;
    }
    updatePlaybackLabel();
  });
  video.addEventListener("pause", updatePlaybackLabel);
  video.addEventListener("ratechange", () => {
    if (playbackSpeed() > 0 && [1, 2, 4].includes(video.playbackRate)) $("speed").value = String(video.playbackRate);
  });

  function setTimelineZoom(next, clientX) {
    const before = track.getBoundingClientRect();
    timelineZoom = Math.min(Math.max(1, duration / 20), Math.max(1, next));
    track.style.width = `${timelineZoom * 100}%`;
    if (Number.isFinite(clientX) && before.width) {
      const fraction = Math.max(0, Math.min(1, (clientX - before.left) / before.width));
      rail.scrollLeft += (track.getBoundingClientRect().width - before.width) * fraction;
    } else {
      rail.scrollLeft = 0;
    }
    renderTicks();
  }

  function videoPicture() {
    const rect = video.getBoundingClientRect();
    const scale = Math.min(rect.width / video.videoWidth, rect.height / video.videoHeight);
    const width = video.videoWidth * scale;
    const height = video.videoHeight * scale;
    return { width, height, left: rect.left + (rect.width - width) / 2, top: rect.top + (rect.height - height) / 2 };
  }

  function scorePoint(event) {
    const picture = videoPicture();
    const clamp = (value) => Math.max(0, Math.min(1, value));
    return { x: clamp((event.clientX - picture.left) / picture.width), y: clamp((event.clientY - picture.top) / picture.height) };
  }

  function renderScoreBox(region) {
    scoreBox.hidden = !region;
    if (!region) return;
    paintRegion(scoreBox, region, scorePicker);
  }

  function paintRegion(box, region, container) {
    const picture = videoPicture();
    const position = container.getBoundingClientRect();
    box.style.left = `${picture.left - position.left + region.x * picture.width}px`;
    box.style.top = `${picture.top - position.top + region.y * picture.height}px`;
    box.style.width = `${region.width * picture.width}px`;
    box.style.height = `${region.height * picture.height}px`;
  }

  function selectionRegion(from, to) {
    return { x: Math.min(from.x, to.x), y: Math.min(from.y, to.y), width: Math.abs(to.x - from.x), height: Math.abs(to.y - from.y) };
  }

  function closeScorePicker() {
    scorePicker.hidden = true;
    scoreDrag = undefined;
    trackingSelection = undefined;
  }

  scoreButton.addEventListener("click", () => {
    if (!scorePicker.hidden) {
      closeScorePicker();
      setStatus("");
      return;
    }
    pausePlayback();
    trackingSelection = undefined;
    scorePicker.hidden = false;
    renderScoreBox(scoreRegion);
    setStatus("Trace un rectangle autour des deux chiffres du score, sans le chrono.");
  });
  $("score-clear").addEventListener("click", () => {
    closeScorePicker();
    scoreRegion = undefined;
    setStatus("");
    updateControls();
  });
  scorePicker.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || scoreDrag) return;
    const point = scorePoint(event);
    scoreDrag = { id: event.pointerId, point };
    scorePicker.setPointerCapture(event.pointerId);
    renderScoreBox(selectionRegion(point, point));
  });
  scorePicker.addEventListener("pointermove", (event) => {
    if (scoreDrag?.id === event.pointerId) renderScoreBox(selectionRegion(scoreDrag.point, scorePoint(event)));
  });
  scorePicker.addEventListener("pointerup", (event) => {
    if (scoreDrag?.id !== event.pointerId) return;
    const region = selectionRegion(scoreDrag.point, scorePoint(event));
    scoreDrag = undefined;
    if (trackingSelection) {
      if (region.width < 0.008 || region.height < 0.008) {
        setStatus(messages.invalidTracking);
        return;
      }
      const { clip, edit } = trackingSelection;
      closeScorePicker();
      const axis = $("track-axis").value;
      const anchor = Math.max(edit.start, Math.min(edit.end, video.currentTime));
      perform("track", { clip: edit, region, anchor }, (result) => {
        if (!result.points.length || result.coverage < 15) {
          setStatus("Sujet perdu. Essaie un cadre plus précis ou un autre passage.");
          return;
        }
        clip.edits ??= {};
        const short = clip.edits.short ??= {};
        short.tracking = { ...result, axis, region };
        setStatus(result.coverage < 65 ? "Suivi partiel. Vérifie le recadrage avant l’export." :
          "Suivi prêt. Teste l’extrait pour voir le recadrage.");
      });
      return;
    }
    if (region.width < 0.015 || region.height < 0.015) {
      renderScoreBox(scoreRegion);
      setStatus(messages.invalidScoreRegion);
      return;
    }
    scoreRegion = region;
    closeScorePicker();
    setStatus("Zone du score définie. Elle sera utilisée à la prochaine analyse.");
    updateControls();
  });
  scorePicker.addEventListener("lostpointercapture", () => { scoreDrag = undefined; });
  new ResizeObserver(renderTrackedBox).observe(videoStage);

  $("track-start").addEventListener("click", () => {
    const clip = selectedClip;
    if (!clip || video.hidden || !service?.tracking || busy) return;
    const edit = exportClip(clip);
    if (!valid(edit) || edit.end - edit.start > 120) {
      setStatus(messages.invalidTracking);
      return;
    }
    pausePlayback();
    if (video.currentTime < edit.start || video.currentTime >= edit.end) seek(edit.start);
    trackingSelection = { clip, edit };
    scorePicker.hidden = false;
    renderScoreBox();
    renderTrackedBox();
    setStatus("Encadre le joueur ou le ballon sur une image où il est bien visible.");
  });
  $("track-axis").addEventListener("change", () => {
    const tracking = selectedClip?.edits?.short?.tracking;
    if (tracking) {
      tracking.axis = $("track-axis").value;
      invalidateExport();
    }
  });
  $("track-clear").addEventListener("click", () => {
    if (!selectedClip?.edits?.short?.tracking) return;
    delete selectedClip.edits.short.tracking;
    invalidateExport();
  });

  function trackTime(clientX) {
    const rect = track.getBoundingClientRect();
    return Math.max(0, Math.min(duration, (clientX - rect.left) / rect.width * duration));
  }

  rail.addEventListener("wheel", (event) => {
    if (!event.deltaY || event.shiftKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    const step = Math.max(-1, Math.min(1, event.deltaY / (event.deltaMode ? 3 : 100)));
    setTimelineZoom(timelineZoom * Math.exp(-step * 0.32), event.clientX);
  }, { passive: false });
  $("timeline-reset").addEventListener("click", () => setTimelineZoom(1));
  new ResizeObserver(renderTicks).observe(rail);

  track.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || timelineDrag || !duration) return;
    const graphicBlock = event.target.closest("[data-graphic]");
    if (graphicBlock) {
      if (busy || loadingGraphic) return;
      const graphic = graphics.find(({ slot }) => slot === graphicBlock.dataset.graphic);
      if (!graphic) return;
      const resize = Boolean(event.target.closest("[data-graphic-resize]"));
      timelineDrag = { id: event.pointerId, graphic, block: graphicBlock, resize,
        offset: trackTime(event.clientX) - (resize ? graphic.at + graphic.length : graphic.at) };
      track.setPointerCapture(event.pointerId);
      return;
    }
    const edge = event.target.closest("[data-edge]")?.dataset.edge;
    const block = event.target.closest("[data-index]");
    if (block && !edge) return;
    const clip = block ? clips[Number(block.dataset.index)] : undefined;
    const time = trackTime(event.clientX);
    const offset = edge ? clip[edge] - time : 0;
    timelineDrag = { id: event.pointerId, clip, block, edge, offset };
    track.setPointerCapture(event.pointerId);
    if (edge) {
      pausePlayback();
      selectClip(clip, false);
      seek(clip[edge]);
    } else {
      seek(time);
    }
  });
  track.addEventListener("pointermove", (event) => {
    if (timelineDrag?.id !== event.pointerId) return;
    const time = trackTime(event.clientX);
    const { clip, edge, block, offset, graphic, resize } = timelineDrag;
    if (graphic) {
      const position = Math.round((time - offset) * 100) / 100;
      if (resize) graphic.length = Math.max(0.2, Math.min(duration - graphic.at, position - graphic.at));
      else graphic.at = Math.max(0, Math.min(duration - graphic.length, position));
      timelineDrag.moved = true;
      positionGraphic(block, graphic);
      renderGraphicPreview();
      return;
    }
    if (edge) {
      updateTrim(clip, edge, time + offset, block);
      seek(clip[edge]);
    } else {
      seek(time);
    }
  });
  track.addEventListener("lostpointercapture", (event) => {
    if (timelineDrag?.id !== event.pointerId) return;
    if (timelineDrag.graphic) {
      selectGraphic(timelineDrag.graphic);
      if (timelineDrag.moved) graphicsChanged();
      else seek(timelineDrag.graphic.at);
    }
    if (timelineDrag.edge) renderClips();
    timelineDrag = undefined;
  });

  function playbackSpeed() {
    return Number($("speed").value);
  }

  function updatePlaybackLabel() {
    $("play").textContent = translate(video.paused && reverseFrame === null ? "Lecture" : "Pause");
  }

  function stopReverse() {
    if (reverseFrame === null) return;
    cancelAnimationFrame(reverseFrame);
    reverseFrame = null;
    updatePlaybackLabel();
  }

  function pausePlayback() {
    stopReverse();
    video.pause();
    updatePlaybackLabel();
  }

  function startPlayback() {
    if (!Number.isFinite(video.duration) || video.error || video.hidden) return;
    stopReverse();
    const speed = playbackSpeed();
    if (speed > 0) {
      video.playbackRate = speed;
      video.play().catch(() => setPreview("Ce navigateur ne peut pas lire la vidéo d’origine."));
      return;
    }
    video.pause();
    const lowerBound = playerStart ?? 0;
    if (video.currentTime <= lowerBound) return;
    const start = video.currentTime;
    let firstFrame;
    const step = (now) => {
      if (video.hidden || !video.closest(".preview-container").classList.contains("active")) {
        stopReverse();
        return;
      }
      if (!video.seeking) {
        firstFrame ??= now;
        const target = Math.max(lowerBound, start + speed * (now - firstFrame) / 1000);
        if (video.currentTime - target >= 0.04 || target === lowerBound) {
          video.currentTime = target;
          timestamps();
        }
        if (target === lowerBound) {
          stopReverse();
          return;
        }
      }
      reverseFrame = requestAnimationFrame(step);
    };
    reverseFrame = requestAnimationFrame(step);
    updatePlaybackLabel();
  }

  function togglePlayback() {
    if (video.hidden) return;
    if (reverseFrame !== null || !video.paused) pausePlayback();
    else startPlayback();
  }

  function moveBy(seconds) {
    seek(video.currentTime + seconds);
  }

  function moveToClip(direction) {
    const ordered = clips.filter(valid).sort((a, b) => a.start - b.start);
    if (!ordered.length) return;
    const current = ordered.indexOf(selectedClip);
    const index = current < 0 ? (direction > 0 ? 0 : ordered.length - 1) : current + direction;
    selectClip(ordered[Math.max(0, Math.min(ordered.length - 1, index))]);
  }

  function stopReview() {
    reviewQueue = [];
    reviewIndex = -1;
    pausePlayback();
    playerEnd = undefined;
    playerStart = undefined;
    renderReview();
  }

  $("review-start").addEventListener("click", () => {
    if (reviewQueue[reviewIndex]) {
      stopReview();
      return;
    }
    reviewQueue = pendingReview();
    if (!reviewQueue.length) return;
    reviewIndex = 0;
    playClip(reviewQueue[0]);
    renderReview();
  });
  for (const [id, decision] of [["keep", "keep"], ["ignore", "ignore"], ["review-later", "later"]]) {
    $(id).addEventListener("click", () => {
      const clip = reviewQueue[reviewIndex];
      if (!clip) return;
      clip.review = decision;
      clip.keep = decision === "keep";
      reviewIndex++;
      const next = reviewQueue[reviewIndex];
      if (next) playClip(next);
      else {
        stopReview();
        setStatus(pendingReview().length ? "Validation terminée. Des extraits restent à revoir." : "Validation terminée.");
      }
      invalidateExport();
      renderClips();
    });
  }

  $("play").addEventListener("click", togglePlayback);
  $("speed").addEventListener("change", () => {
    const playing = reverseFrame !== null || !video.paused;
    stopReverse();
    if (playbackSpeed() > 0) video.playbackRate = playbackSpeed();
    if (playing) startPlayback();
  });
  $("back").addEventListener("click", () => moveBy(-5));
  $("forward").addEventListener("click", () => moveBy(5));
  $("prev").addEventListener("click", () => moveToClip(-1));
  $("next").addEventListener("click", () => moveToClip(1));
  document.addEventListener("keydown", (event) => {
    if (!video.closest(".preview-container").classList.contains("active") || !Number.isFinite(video.duration) ||
      event.target.closest?.("input, select, textarea, [contenteditable], dialog") || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "Escape" && !scorePicker.hidden) {
      closeScorePicker();
      setStatus("");
    } else if (event.code === "Space" && !event.target.closest?.("button, a, video")) {
      event.preventDefault();
      const renderPlay = document.getElementById("hm-render-play");
      if (renderPlay.hidden) togglePlayback();
      else renderPlay.click();
    } else if ((event.code === "KeyI" || event.code === "KeyO") && selectedClip && !busy) {
      event.preventDefault();
      updateTrim(selectedClip, event.code === "KeyI" ? "start" : "end", video.currentTime);
    }
  });

  async function ensureSource(signal) {
    if (session) return;
    setStatus("Préparation locale de la vidéo…");
    session = await call("/source", { method: "POST", body: file, signal });
    uploadedMontageAssets.clear();
    duration = session.duration;
  }

  async function perform(action, data, finish, assets = {}, section = "edit") {
    if (busy) return;
    busy = true;
    $(section + "-feedback").append($("job-feedback"));
    cancellationRequested = false;
    request = new AbortController();
    const ui = section === "enhancement" ? enhancementProgress : standardProgress;
    ui.group.hidden = false;
    if (ui !== standardProgress) standardProgress.group.hidden = true;
    const timed = ["analysis", "enhancement", "export"].includes(section);
    const started = performance.now();
    ui.timer.hidden = !timed;
    const timer = timed ? setInterval(() => showElapsed(ui.timer, started), 250) : undefined;
    if (timed) showElapsed(ui.timer, started);
    let completed = false;
    showProgress(ui);
    closeScorePicker();
    invalidateExport();
    updateControls();
    try {
      await ensureSource(request.signal);
      if (typeof assets === "function") assets = await assets();
      for (const [slot, asset] of Object.entries(assets)) {
        if (cancellationRequested) break;
        if (uploadedMontageAssets.get(slot) === asset) continue;
        await call(`/${session.id}/asset/${slot}`, { method: "POST", body: asset, signal: request.signal });
        uploadedMontageAssets.set(slot, asset);
      }
      if (cancellationRequested) {
        setStatus("Opération annulée.");
        return;
      }
      await call(`/${session.id}/${action}`, { method: "POST", data, signal: request.signal });
      while (true) {
        if (cancellationRequested) {
          await call(`/${session.id}/cancel`, { method: "POST" });
          cancellationRequested = false;
        }
        const job = await call(`/${session.id}`);
        if (job.state === "cancelled") {
          setStatus("Opération annulée.");
          return;
        }
        if (job.state === "failed") throw new Error(messages[job.error] || messages.operationFailed);
        if (job.state === "done") {
          await finish(job.result);
          completed = true;
          return;
        }
        setStatus(stages[job.phase]);
        showProgress(ui, job.progress);
        await new Promise((settle) => setTimeout(settle, 650));
      }
    } catch (error) {
      setStatus(request.signal.aborted ? "Opération annulée." :
        Object.values(messages).includes(error.message) ? error.message : messages.operationFailed);
    } finally {
      clearInterval(timer);
      if (timed && completed) {
        showElapsed(ui.timer, started);
        showProgress(ui, 100);
      } else {
        ui.group.hidden = true;
      }
      busy = false;
      renderClips();
    }
  }

  analyze.addEventListener("click", () => {
    const options = {
      whisper: whisper.checked && Boolean(service?.whisper),
      language: language.value,
      limit: Number.isInteger(limit.valueAsNumber) ? limit.valueAsNumber : Number(limit.defaultValue),
      scoreRegion: service?.scoreboard ? scoreRegion : undefined,
      replays: replayToggle.checked && Boolean(service?.replays),
    };
    perform("analyze", options, (result) => {
      analyzed = true;
      if (result.transcript?.length) transcript = result.transcript;
      for (const clip of result.clips) {
        if (clips.length >= 80) break;
        if (clips.some((previous) => clip.start < previous.end && clip.end > previous.start)) continue;
        clips.push({ ...clip, keep: false });
      }
      clips.sort((a, b) => a.start - b.start);
      if (result.notice) setStatus(messages[result.notice]);
      else if (result.replays) setStatus("Suggestions prêtes. Ralentis répétés écartés · {count}", { count: result.replays });
      else setStatus(result.clips.length ? "Suggestions prêtes. Valide les extraits à garder." :
        "Aucun passage détecté. Tu peux ajouter les extraits à la main.");
    }, {}, "analysis");
  });
  cancel.addEventListener("click", () => {
    cancellationRequested = true;
    if (!session) request?.abort();
  });
  add.addEventListener("click", () => {
    const start = Math.max(0, video.currentTime - 7);
    const end = Math.min(duration, video.currentTime + 7);
    if (end - start < 0.1) return;
    selectedClip = { kind: "manual", start, end, keep: true, review: "keep" };
    clips.push(selectedClip);
    clips.sort((a, b) => a.start - b.start);
    invalidateExport();
    renderClips();
  });
  save.addEventListener("click", async () => {
    savingAnalysis = true;
    const payload = snapshotAnalysis();
    updateControls();
    try {
      await analysisRecord("readwrite", (store) => store.put(payload, signature));
      setStatus("Analyse enregistrée pour cette vidéo.");
    } catch {
      setStatus("Impossible d’enregistrer l’analyse sur cet appareil.");
    } finally {
      savingAnalysis = false;
      updateControls();
    }
  });
  $("end-card").addEventListener("change", invalidateExport);
  $("enhance-video").addEventListener("change", invalidateExport);
  $("enhancement-mode").addEventListener("change", () => {
    $("enhance-video").checked = false;
    invalidateExport();
  });
  $("prepare-enhancement").addEventListener("click", () => {
    const kept = clips.filter((clip) => clip.keep).map(exportClip);
    if (!kept.length || !kept.every(valid) || !service?.prepareEnhancement) return;
    const configuration = enhancementConfiguration();
    const key = enhancementSelection(kept, configuration);
    perform("enhance", { clips: kept, montage: configuration }, () => {
      enhancement = { key, sessionId: session.id };
      setStatus("");
    }, () => montageAssets(configuration), "enhancement");
  });
  exportButton.addEventListener("click", () => {
    const kept = clips.filter((clip) => clip.keep).map(exportClip);
    if (!kept.length || !kept.every(valid)) return;
    const configuration = enhancementConfiguration();
    configuration.useEnhanced = $("enhance-video").checked && isEnhancementReady(kept, configuration);
    let assets = {};
    const endCardId = $("end-card").value;
    if (endCardId) {
      try {
        const card = window.matchPresetMenus.loadEndCard(endCardId);
        assets = card.assets;
        configuration.outro = true;
        configuration.outroVideo = Boolean(card.assets["outro-video"]);
        configuration.music = Boolean(card.assets.music);
        configuration.outroLength = card.duration;
        configuration.musicGain = card.gain;
      } catch {
        setStatus("Impossible de charger la carte de fin.");
        return;
      }
    }
    perform("export", { clips: kept, montage: service?.montage ? configuration : undefined }, () => {
      download.href = `${api}/${session.id}/download`;
      setStatus("Montage MP4 prêt à télécharger.");
      download.click();
    }, service?.montage ? () => montageAssets(configuration, assets) : {}, "export");
  });

  function exportClip({ start, end, edits }) {
    return { start, end, ...edits?.[montage.format()] };
  }

  function enhancementSelection(kept, configuration) {
    return JSON.stringify([kept, configuration]);
  }

  function enhancementConfiguration() {
    return { ...montage.payload(false, false), enhancementMode: $("enhancement-mode").value,
      graphics: graphics.flatMap(graphicLayers), matchPeriods: [...matchPeriods] };
  }

  function isEnhancementReady(kept, configuration) {
    return Boolean(enhancement && session?.id === enhancement.sessionId &&
      enhancement.key === enhancementSelection(kept, configuration ?? enhancementConfiguration()));
  }

  function renderSelected(dry) {
    const clip = [selectedClip, ...clips].find((entry) => entry && valid(entry));
    if (!clip || !service?.montage) return;
    const configuration = montage.payload(dry, true);
    if (!dry) {
      configuration.graphics = graphics.flatMap(graphicLayers);
      configuration.matchPeriods = [...matchPeriods];
    }
    const format = montage.format();
    const edit = exportClip(clip);
    if (dry) delete edit.gain;
    if (!valid(edit)) {
      setStatus(messages.invalidClips);
      return;
    }
    perform("export", { clips: [edit], montage: configuration }, async () => {
      const response = await fetch(`${api}/${session.id}/download`);
      if (!response.ok) throw new Error(messages.operationFailed);
      const blob = await response.blob();
      if (montage.format() !== format) return;
      pausePlayback();
      montage.showRender(blob);
      setStatus(dry ? "Écoute de la source." : "Aperçu du montage.");
    }, () => montageAssets(configuration));
  }

  whisper.addEventListener("change", updateControls);
  document.addEventListener("interface-language-change", () => {
    setStatus(statusMessage, statusVariables);
    setPreview(previewMessage);
    setMontageSaveStatus(montageSaveStatus.dataset.interfaceMessage ?? "");
    renderClips();
  });
  window.addEventListener("focus", () => {
    if (!service) connect();
  });
  connect();
  if (location.hash === "#highlights") document.querySelector('[data-tab="highlights"]').click();
})();
