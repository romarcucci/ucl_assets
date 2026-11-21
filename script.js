/* ============================================================
   UCL Graphics Editor — script.js
   ============================================================ */

/* ============ TAB SWITCHING ============ */
const tabs = document.querySelectorAll(".tab");
const editorSections = document.querySelectorAll(".editor-section");
const previewContainers = document.querySelectorAll(".preview-container");
const editorSearch = document.getElementById("editor-search");
const editorSearchStatus = document.getElementById("editor-search-status");
const editorSearchResults = document.getElementById("editor-search-results");

function normalizeEditorSearch(text) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function updateEditorSearch() {
  editorSearchResults.replaceChildren();
  const query = normalizeEditorSearch(editorSearch.value).trim();
  const editor = document.querySelector(".editor-section.active");
  editorSearchResults.hidden = true;
  editorSearchStatus.textContent = "";
  if (!query || !editor) return;

  const words = query.split(/\s+/);
  for (const item of editor.querySelectorAll("summary, label, button")) {
    if (item.closest("[hidden]") || (item.matches("button") && item.closest("label"))) {
      continue;
    }
    const label = item.matches("label")
      ? item.querySelector(":scope > span") || item
      : item;
    const title = label.textContent.replace(/\s+/g, " ").trim();
    if (!title || !/[\p{L}\p{N}]/u.test(title)) continue;

    const sections = [];
    for (
      let details = item.closest("details");
      details;
      details = details.parentElement.closest("details")
    ) {
      sections.unshift(details);
    }
    const location = sections
      .map((section) => section.querySelector(":scope > summary"))
      .filter((summary) => summary && summary !== item)
      .map((summary) => summary.textContent.trim())
      .join(" › ");
    const searchable = normalizeEditorSearch(location + " " + title);
    if (!words.every((word) => searchable.includes(word))) continue;

    const result = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = title;
    if (location) {
      const breadcrumb = document.createElement("small");
      breadcrumb.textContent = location;
      button.appendChild(breadcrumb);
    }
    button.addEventListener("click", () => {
      sections.forEach((section) => (section.open = true));
      const control = item.matches("label")
        ? item.control || item.querySelector("input, select, textarea, button")
        : item;
      item.scrollIntoView({ block: "center" });
      control?.focus({ preventScroll: true });
    });
    result.appendChild(button);
    editorSearchResults.appendChild(result);
  }
  const count = editorSearchResults.childElementCount;
  editorSearchResults.hidden = count === 0;
  editorSearchStatus.textContent = count
    ? `${count} résultat${count > 1 ? "s" : ""}`
    : "Aucun réglage trouvé dans cet onglet.";
}

editorSearch.addEventListener("input", updateEditorSearch);

function clearPresetSaveStatuses(editor) {
  editor.querySelectorAll(".save-status").forEach((status) => {
    status.textContent = "";
  });
}

function showPresetSaveStatus(nameInput, name) {
  nameInput.value = name;
  nameInput.closest(".save-team-form").querySelector(".save-status").textContent =
    "Sauvegarde enregistrée.";
}

for (const editor of editorSections) {
  const forms = editor.querySelectorAll(".save-team-form");
  if (!forms.length) continue;
  for (const form of forms) {
    const status = document.createElement("p");
    status.className = "save-status";
    status.setAttribute("role", "status");
    form.appendChild(status);
  }
  const clearOnEdit = (event) => {
    if (!event.target.closest(".saved-teams-controls")) {
      clearPresetSaveStatuses(editor);
    }
  };
  editor.addEventListener("input", clearOnEdit);
  editor.addEventListener("change", clearOnEdit);
  editor.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button && !button.closest(".save-team-form")) {
      clearPresetSaveStatuses(editor);
    }
  });
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    editorSections.forEach((s) =>
      s.classList.toggle("active", s.dataset.editor === target),
    );
    previewContainers.forEach((p) =>
      p.classList.toggle("active", p.dataset.preview === target),
    );
    updateEditorSearch();
    if (target === "score") updateScoreBanner();
    if (target === "shorts") updateShortsPreview();
    document.querySelector(".lineup-export-option").hidden =
      target !== "lineup";
    document.querySelector(".showdown-export-option").hidden =
      target !== "showdown";
    document.getElementById("export-saved-renders").hidden =
      target !== "lineup" && target !== "showdown";
    document.querySelector(".preview-toolbar").hidden =
      target === "video-thumbnail";
  });
});

/* ============ NUMBER STEPPER (custom +/- buttons) ============ */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".stepper-btn");
  if (!btn) return;
  const input = document.getElementById(btn.dataset.target);
  if (!input) return;
  const step = parseFloat(btn.dataset.step) || 1;
  const min = input.min !== "" ? parseFloat(input.min) : -Infinity;
  const max = input.max !== "" ? parseFloat(input.max) : Infinity;
  const current = parseFloat(input.value) || 0;
  const next = Math.min(max, Math.max(min, current + step));
  if (next === current) return;
  input.value = next;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
});

/* ============================================================
   1) PLAYER BANNER
   ============================================================ */
function renderGoalscorerPhoto(url) {
  const box = document.getElementById("pb-logo");
  box.innerHTML = url
    ? `<img src="${url}" alt="goalscorer" />`
    : `<div style="color:#666;font-size:12px;">Photo du buteur</div>`;
}

function renderClubLogoInline(url) {
  const img = document.getElementById("pb-club-logo");
  if (!img) return;
  if (url) img.setAttribute("src", url);
  else img.removeAttribute("src");
}

const pNumber = document.getElementById("p-number");
const pFirstname = document.getElementById("p-firstname");
const pLastname = document.getElementById("p-lastname");
const pMinute = document.getElementById("p-minute");

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
const pClubName = document.getElementById("p-club-name");
const pGoalscorerFile = document.getElementById("p-goalscorer-file");
const pGoalscorerClear = document.getElementById("p-goalscorer-clear");
const pClubLogoFile = document.getElementById("p-club-logo-file");
const pClubLogoClear = document.getElementById("p-club-logo-clear");
const pClubLogoShadowsToggle = document.getElementById(
  "p-club-logo-shadows-toggle",
);
const pClubLogoShadowsColor = document.getElementById(
  "p-club-logo-shadows-color",
);
const pClubLogoShadowsIntensity = document.getElementById(
  "p-club-logo-shadows-intensity",
);
const pClubLogoShadowsIntensityValue = document.getElementById(
  "p-club-logo-shadows-intensity-value",
);
const pZoneWidth = document.getElementById("p-zone-width");
const pZoneWidthNumber = document.getElementById("p-zone-width-number");
const pZoneWidthValue = document.getElementById("p-zone-width-value");
const pLogoColor1 = document.getElementById("p-logo-color-1");
const pLogoColor2 = document.getElementById("p-logo-color-2");
const pLogoDir = document.getElementById("p-logo-direction");
const pTopColor1 = document.getElementById("p-top-color-1");
const pTopColor2 = document.getElementById("p-top-color-2");
const pTopDir = document.getElementById("p-top-direction");
const pBottomColor1 = document.getElementById("p-bottom-color-1");
const pBottomColor2 = document.getElementById("p-bottom-color-2");
const pBottomDir = document.getElementById("p-bottom-direction");
const pColorText = document.getElementById("p-color-text");

const PB_FONTS = {
  condensed: "'Barlow Condensed', 'Archivo Narrow', 'Arial Narrow', sans-serif",
  system:
    "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
  arial: "Arial, Helvetica, sans-serif",
  impact: "Impact, 'Arial Black', 'Helvetica Inserat', sans-serif",
  cinzel: "'Cinzel', 'Trajan Pro', serif",
  mono: "'Courier New', Courier, monospace",
};

const pFirstnameFont = document.getElementById("p-firstname-font");
const pFirstnameSize = document.getElementById("p-firstname-size");
const pFirstnameSizeValue = document.getElementById("p-firstname-size-value");
const pFirstnameWeight = document.getElementById("p-firstname-weight");
const pFirstnameUppercase = document.getElementById("p-firstname-uppercase");
const pLastnameFont = document.getElementById("p-lastname-font");
const pLastnameSize = document.getElementById("p-lastname-size");
const pLastnameSizeValue = document.getElementById("p-lastname-size-value");
const pLastnameWeight = document.getElementById("p-lastname-weight");
const pLastnameUppercase = document.getElementById("p-lastname-uppercase");
const pMinuteFont = document.getElementById("p-minute-font");
const pMinuteSize = document.getElementById("p-minute-size");
const pMinuteSizeValue = document.getElementById("p-minute-size-value");
const pMinuteWeight = document.getElementById("p-minute-weight");
const pClubnameFont = document.getElementById("p-clubname-font");
const pClubnameSize = document.getElementById("p-clubname-size");
const pClubnameSizeValue = document.getElementById("p-clubname-size-value");
const pClubnameWeight = document.getElementById("p-clubname-weight");

let goalscorerURL = null;
let clubLogoURL = null;

function updatePlayerBanner() {
  const number = pNumber.value.trim();
  const first = pFirstname.value.trim();
  const last = pLastname.value.trim();
  const numberHtml = number
    ? `<span class="pb-name-number">${escapeHtml(number)}</span>`
    : "";
  const firstHtml = first
    ? `<span class="pb-name-first">${escapeHtml(first)}</span>`
    : "";
  const lastHtml = last
    ? `<span class="pb-name-last">${escapeHtml(last)}</span>`
    : "";
  const parts = [numberHtml, firstHtml, lastHtml].filter(Boolean);
  document.getElementById("pb-name").innerHTML = parts.join(" ");
  document.getElementById("pb-minute").textContent = pMinute.value;
  document.getElementById("pb-club-name").textContent = pClubName.value;
  const logoBg = `linear-gradient(${pLogoDir.value}deg, ${pLogoColor1.value}, ${pLogoColor2.value})`;
  document.getElementById("pb-logo").style.background = logoBg;
  const topBg = `linear-gradient(${pTopDir.value}deg, ${pTopColor1.value}, ${pTopColor2.value})`;
  document.getElementById("pb-top").style.background = topBg;
  const bottomBg = `linear-gradient(${pBottomDir.value}deg, ${pBottomColor1.value}, ${pBottomColor2.value})`;
  document.getElementById("pb-bottom").style.background = bottomBg;
  document.getElementById("pb-bars").style.width = pZoneWidth.value + "px";
  if (pZoneWidthValue) pZoneWidthValue.textContent = pZoneWidth.value + "px";

  const nameEl = document.getElementById("pb-name");
  const numberEl = nameEl.querySelector(".pb-name-number");
  const firstEl = nameEl.querySelector(".pb-name-first");
  const lastEl = nameEl.querySelector(".pb-name-last");
  if (numberEl) {
    numberEl.style.fontFamily =
      PB_FONTS[pLastnameFont.value] || PB_FONTS.cinzel;
    numberEl.style.fontSize = pLastnameSize.value + "px";
    numberEl.style.fontWeight = pLastnameWeight.value;
  }
  if (firstEl) {
    firstEl.style.fontFamily =
      PB_FONTS[pFirstnameFont.value] || PB_FONTS.cinzel;
    firstEl.style.fontSize = pFirstnameSize.value + "px";
    firstEl.style.fontWeight = pFirstnameWeight.value;
    firstEl.style.textTransform = pFirstnameUppercase.checked
      ? "uppercase"
      : "none";
  }
  if (lastEl) {
    lastEl.style.fontFamily = PB_FONTS[pLastnameFont.value] || PB_FONTS.cinzel;
    lastEl.style.fontSize = pLastnameSize.value + "px";
    lastEl.style.fontWeight = pLastnameWeight.value;
    lastEl.style.textTransform = pLastnameUppercase.checked
      ? "uppercase"
      : "none";
  }
  if (pFirstnameSizeValue)
    pFirstnameSizeValue.textContent = pFirstnameSize.value + "px";
  if (pLastnameSizeValue)
    pLastnameSizeValue.textContent = pLastnameSize.value + "px";

  const minuteEl = document.getElementById("pb-minute");
  minuteEl.style.fontFamily = PB_FONTS[pMinuteFont.value] || PB_FONTS.condensed;
  minuteEl.style.fontSize = pMinuteSize.value + "px";
  minuteEl.style.fontWeight = pMinuteWeight.value;
  if (pMinuteSizeValue) pMinuteSizeValue.textContent = pMinuteSize.value + "px";

  const clubEl = document.getElementById("pb-club-name");
  clubEl.style.fontFamily = PB_FONTS[pClubnameFont.value] || PB_FONTS.condensed;
  clubEl.style.fontSize = pClubnameSize.value + "px";
  clubEl.style.fontWeight = pClubnameWeight.value;
  if (pClubnameSizeValue)
    pClubnameSizeValue.textContent = pClubnameSize.value + "px";

  const banner = document.getElementById("player-banner");
  const shadowIntensity = Number(pClubLogoShadowsIntensity.value) / 100;
  const shadowRgb =
    pClubLogoShadowsColor.value === "black" ? "0, 0, 0" : "255, 255, 255";
  banner.classList.toggle(
    "show-club-logo-shadows",
    pClubLogoShadowsToggle.checked,
  );
  banner.style.setProperty(
    "--pb-club-logo-shadow-tight",
    `rgba(${shadowRgb}, ${shadowIntensity})`,
  );
  banner.style.setProperty(
    "--pb-club-logo-shadow-glow",
    `rgba(${shadowRgb}, ${0.85 * shadowIntensity})`,
  );
  banner.style.setProperty(
    "--pb-club-logo-shadow-depth",
    String(0.55 * shadowIntensity),
  );
  if (pClubLogoShadowsIntensityValue)
    pClubLogoShadowsIntensityValue.textContent =
      pClubLogoShadowsIntensity.value + "%";
  banner.style.color = pColorText.value;
  renderGoalscorerPhoto(goalscorerURL);
  renderClubLogoInline(clubLogoURL);
}

[
  pNumber,
  pFirstname,
  pLastname,
  pMinute,
  pClubName,
  pZoneWidth,
  pLogoColor1,
  pLogoColor2,
  pTopColor1,
  pTopColor2,
  pBottomColor1,
  pBottomColor2,
  pColorText,
  pFirstnameSize,
  pLastnameSize,
  pMinuteSize,
  pClubnameSize,
  pClubLogoShadowsIntensity,
].forEach((el) => el.addEventListener("input", updatePlayerBanner));
pZoneWidth.addEventListener("input", () => {
  pZoneWidthNumber.value = pZoneWidth.value;
});
pZoneWidthNumber.addEventListener("input", () => {
  const width = Number(pZoneWidthNumber.value);
  if (
    !pZoneWidthNumber.validity.valid ||
    !Number.isFinite(width)
  ) {
    return;
  }
  pZoneWidth.value = String(width);
  updatePlayerBanner();
  saveBanner();
});
pZoneWidthNumber.addEventListener("change", () => {
  const width = Number(pZoneWidthNumber.value);
  const nextWidth =
    pZoneWidthNumber.value === "" || !Number.isFinite(width)
      ? Number(pZoneWidth.value)
      : Math.min(
          Number(pZoneWidth.max),
          Math.max(Number(pZoneWidth.min), Math.round(width)),
        );
  pZoneWidth.value = String(nextWidth);
  pZoneWidthNumber.value = pZoneWidth.value;
  updatePlayerBanner();
  saveBanner();
});
[
  pLogoDir,
  pTopDir,
  pBottomDir,
  pFirstnameFont,
  pFirstnameWeight,
  pFirstnameUppercase,
  pLastnameFont,
  pLastnameWeight,
  pLastnameUppercase,
  pMinuteFont,
  pMinuteWeight,
  pClubnameFont,
  pClubnameWeight,
  pClubLogoShadowsToggle,
  pClubLogoShadowsColor,
].forEach((el) => el.addEventListener("change", updatePlayerBanner));
// Store path references to ./Goalscorers/<file> and ./Logos/<file> rather
// than inline data URLs — keeps saved banners tiny and quota-safe.
pGoalscorerFile.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  goalscorerURL = `./Goalscorers/${file.name}`;
  updatePlayerBanner();
  saveBanner();
});
pGoalscorerClear.addEventListener("click", () => {
  goalscorerURL = null;
  pGoalscorerFile.value = "";
  updatePlayerBanner();
  saveBanner();
});
pClubLogoFile.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  clubLogoURL = `./Logos/${file.name}`;
  updatePlayerBanner();
  saveBanner();
});
pClubLogoClear.addEventListener("click", () => {
  clubLogoURL = null;
  pClubLogoFile.value = "";
  updatePlayerBanner();
  saveBanner();
});

/* ----- Player Banner save/load ----- */
const BANNER_STORAGE_KEY = "ucl-banner-v1";
const SAVED_BANNERS_KEY = "ucl-banner-saves-v1";

function collectBannerData() {
  return {
    number: pNumber.value,
    firstName: pFirstname.value,
    lastName: pLastname.value,
    minute: pMinute.value,
    clubName: pClubName.value,
    goalscorerURL: goalscorerURL,
    clubLogoURL: clubLogoURL,
    clubLogoShadowsEnabled: pClubLogoShadowsToggle.checked,
    clubLogoShadowsColor: pClubLogoShadowsColor.value,
    clubLogoShadowsIntensity: pClubLogoShadowsIntensity.value,
    zoneWidth: pZoneWidth.value,
    logoColor1: pLogoColor1.value,
    logoColor2: pLogoColor2.value,
    logoDir: pLogoDir.value,
    topColor1: pTopColor1.value,
    topColor2: pTopColor2.value,
    topDir: pTopDir.value,
    bottomColor1: pBottomColor1.value,
    bottomColor2: pBottomColor2.value,
    bottomDir: pBottomDir.value,
    colorText: pColorText.value,
    firstnameFont: pFirstnameFont.value,
    firstnameSize: pFirstnameSize.value,
    firstnameWeight: pFirstnameWeight.value,
    firstnameUppercase: pFirstnameUppercase.checked,
    lastnameFont: pLastnameFont.value,
    lastnameSize: pLastnameSize.value,
    lastnameWeight: pLastnameWeight.value,
    lastnameUppercase: pLastnameUppercase.checked,
    minuteFont: pMinuteFont.value,
    minuteSize: pMinuteSize.value,
    minuteWeight: pMinuteWeight.value,
    clubnameFont: pClubnameFont.value,
    clubnameSize: pClubnameSize.value,
    clubnameWeight: pClubnameWeight.value,
    topBgImage: {
      enabled: pTopBgImgToggle.checked,
      file: pTopBgImgSelect.value,
      customUrl: pTopBgImageCustomUrl,
      opacity: pTopBgImgOpacity.value,
      fadeEnabled: pTopBgImgFadeToggle.checked,
      fadeDir: pTopBgImgFadeDir.value,
      fadeEnd: pTopBgImgFadeEnd.value,
    },
  };
}

function applyBannerData(d) {
  // New schema: separate first/last. Legacy: d.name held the whole string —
  // dump it into lastName so the user can split it manually.
  if (d.firstName != null || d.lastName != null) {
    pFirstname.value = d.firstName || "";
    pLastname.value = d.lastName || "";
  } else if (d.name != null) {
    pFirstname.value = "";
    pLastname.value = d.name;
  }
  if (d.number != null) pNumber.value = d.number;
  if (d.minute != null) pMinute.value = d.minute;
  if (d.clubName != null) pClubName.value = d.clubName;
  // Only accept path references; ignore legacy base64 data: URLs from older saves
  goalscorerURL =
    typeof d.goalscorerURL === "string" && !d.goalscorerURL.startsWith("data:")
      ? d.goalscorerURL
      : null;
  clubLogoURL =
    typeof d.clubLogoURL === "string" && !d.clubLogoURL.startsWith("data:")
      ? d.clubLogoURL
      : null;
  if (typeof d.clubLogoShadowsEnabled === "boolean")
    pClubLogoShadowsToggle.checked = d.clubLogoShadowsEnabled;
  if (
    d.clubLogoShadowsColor === "black" ||
    d.clubLogoShadowsColor === "white"
  ) {
    pClubLogoShadowsColor.value = d.clubLogoShadowsColor;
  }
  if (d.clubLogoShadowsIntensity != null)
    pClubLogoShadowsIntensity.value = d.clubLogoShadowsIntensity;
  if (d.zoneWidth) {
    pZoneWidth.value = d.zoneWidth;
    pZoneWidthNumber.value = pZoneWidth.value;
  }
  if (d.logoColor1) pLogoColor1.value = d.logoColor1;
  if (d.logoColor2) pLogoColor2.value = d.logoColor2;
  if (d.logoDir) pLogoDir.value = d.logoDir;
  if (d.topColor1) pTopColor1.value = d.topColor1;
  if (d.topColor2) pTopColor2.value = d.topColor2;
  if (d.topDir) pTopDir.value = d.topDir;
  if (d.bottomColor1) pBottomColor1.value = d.bottomColor1;
  if (d.bottomColor2) pBottomColor2.value = d.bottomColor2;
  if (d.bottomDir) pBottomDir.value = d.bottomDir;
  if (d.colorText) pColorText.value = d.colorText;
  // New schema: separate first/last typo. Legacy nameFont/Size/Weight applies
  // to both spans so existing saves keep their previous look.
  if (d.firstnameFont) pFirstnameFont.value = d.firstnameFont;
  else if (d.nameFont) pFirstnameFont.value = d.nameFont;
  if (d.firstnameSize) pFirstnameSize.value = d.firstnameSize;
  else if (d.nameSize) pFirstnameSize.value = d.nameSize;
  if (d.firstnameWeight) pFirstnameWeight.value = d.firstnameWeight;
  else if (d.nameWeight) pFirstnameWeight.value = d.nameWeight;
  if (typeof d.firstnameUppercase === "boolean")
    pFirstnameUppercase.checked = d.firstnameUppercase;
  if (d.lastnameFont) pLastnameFont.value = d.lastnameFont;
  else if (d.nameFont) pLastnameFont.value = d.nameFont;
  if (d.lastnameSize) pLastnameSize.value = d.lastnameSize;
  else if (d.nameSize) pLastnameSize.value = d.nameSize;
  if (d.lastnameWeight) pLastnameWeight.value = d.lastnameWeight;
  else if (d.nameWeight) pLastnameWeight.value = d.nameWeight;
  if (typeof d.lastnameUppercase === "boolean")
    pLastnameUppercase.checked = d.lastnameUppercase;
  if (d.minuteFont) pMinuteFont.value = d.minuteFont;
  if (d.minuteSize) pMinuteSize.value = d.minuteSize;
  if (d.minuteWeight) pMinuteWeight.value = d.minuteWeight;
  if (d.clubnameFont) pClubnameFont.value = d.clubnameFont;
  if (d.clubnameSize) pClubnameSize.value = d.clubnameSize;
  if (d.clubnameWeight) pClubnameWeight.value = d.clubnameWeight;
  if (d.topBgImage && typeof pTopBgImgToggle !== "undefined") {
    const b = d.topBgImage;
    if (typeof b.enabled === "boolean") {
      pTopBgImgToggle.checked = b.enabled;
      localStorage.setItem(P_TOP_BG_IMAGE_PREF_KEY, b.enabled ? "1" : "0");
    }
    if (b.file != null) {
      pTopBgImgSelect.value = b.file;
      localStorage.setItem(P_TOP_BG_IMAGE_FILE_KEY, b.file);
    }
    if (b.customUrl !== undefined) {
      pTopBgImageCustomUrl = b.customUrl || null;
      if (pTopBgImageCustomUrl) {
        try {
          localStorage.setItem(P_TOP_BG_IMAGE_CUSTOM_KEY, pTopBgImageCustomUrl);
        } catch {}
      } else {
        localStorage.removeItem(P_TOP_BG_IMAGE_CUSTOM_KEY);
      }
    }
    if (b.opacity != null) {
      pTopBgImgOpacity.value = b.opacity;
      localStorage.setItem(P_TOP_BG_IMAGE_OPACITY_KEY, b.opacity);
    }
    if (typeof b.fadeEnabled === "boolean") {
      pTopBgImgFadeToggle.checked = b.fadeEnabled;
      localStorage.setItem(P_TOP_BG_IMAGE_FADE_KEY, b.fadeEnabled ? "1" : "0");
    }
    if (b.fadeDir) {
      pTopBgImgFadeDir.value = b.fadeDir;
      localStorage.setItem(P_TOP_BG_IMAGE_FADE_DIR_KEY, b.fadeDir);
    }
    if (b.fadeEnd != null) {
      pTopBgImgFadeEnd.value = b.fadeEnd;
      localStorage.setItem(P_TOP_BG_IMAGE_FADE_END_KEY, b.fadeEnd);
    }
    if (typeof applyPlayerTopBgImage === "function") applyPlayerTopBgImage();
  }
}

function saveBanner() {
  try {
    localStorage.setItem(
      BANNER_STORAGE_KEY,
      JSON.stringify(collectBannerData()),
    );
  } catch (e) {}
}

function loadBanner() {
  try {
    const raw = localStorage.getItem(BANNER_STORAGE_KEY);
    if (!raw) return;
    applyBannerData(JSON.parse(raw));
  } catch (e) {}
}

function getSavedBanners() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_BANNERS_KEY) || "[]");
  } catch {
    return [];
  }
}
function setSavedBanners(list) {
  localStorage.setItem(SAVED_BANNERS_KEY, JSON.stringify(list));
}
function renderSavedBannersList() {
  const sel = document.getElementById("p-saved-select");
  if (!sel) return;
  const list = getSavedBanners();
  if (list.length === 0) {
    sel.innerHTML = '<option value="">— Aucune bannière sauvegardée —</option>';
  } else {
    sel.innerHTML = list
      .map((b, i) => `<option value="${i}">${b.name}</option>`)
      .join("");
  }
}
function saveCurrentAsBanner() {
  const nameInput = document.getElementById("p-save-name");
  const sName =
    nameInput.value.trim() || `${pFirstname.value} ${pLastname.value}`.trim();
  if (!sName) {
    alert("Donne un nom à la bannière.");
    return;
  }
  const list = getSavedBanners();
  const existing = list.findIndex((b) => b.name === sName);
  const entry = { name: sName, data: collectBannerData() };
  if (existing >= 0) {
    list[existing] = entry;
  } else {
    list.push(entry);
  }
  setSavedBanners(list);
  renderSavedBannersList();
  const idx = list.findIndex((b) => b.name === sName);
  document.getElementById("p-saved-select").value = String(idx);
  showPresetSaveStatus(nameInput, sName);
}
function loadSelectedBanner() {
  const sel = document.getElementById("p-saved-select");
  const idx = parseInt(sel.value, 10);
  const list = getSavedBanners();
  if (isNaN(idx) || !list[idx]) return;
  applyBannerData(list[idx].data);
  document.getElementById("p-save-name").value = list[idx].name;
  updatePlayerBanner();
  saveBanner();
}
function deleteSelectedBanner() {
  const sel = document.getElementById("p-saved-select");
  const idx = parseInt(sel.value, 10);
  const list = getSavedBanners();
  if (isNaN(idx) || !list[idx]) return;
  list.splice(idx, 1);
  setSavedBanners(list);
  renderSavedBannersList();
}

document
  .getElementById("p-save")
  .addEventListener("click", saveCurrentAsBanner);
document.getElementById("p-load").addEventListener("click", loadSelectedBanner);
document
  .getElementById("p-delete")
  .addEventListener("click", deleteSelectedBanner);

// Auto-save banner on any input
const bannerAutoSaveEls = [
  pNumber,
  pFirstname,
  pLastname,
  pMinute,
  pClubName,
  pZoneWidth,
  pLogoColor1,
  pLogoColor2,
  pLogoDir,
  pTopColor1,
  pTopColor2,
  pTopDir,
  pBottomColor1,
  pBottomColor2,
  pBottomDir,
  pColorText,
  pFirstnameFont,
  pFirstnameSize,
  pFirstnameWeight,
  pFirstnameUppercase,
  pLastnameFont,
  pLastnameSize,
  pLastnameWeight,
  pLastnameUppercase,
  pMinuteFont,
  pMinuteSize,
  pMinuteWeight,
  pClubnameFont,
  pClubnameSize,
  pClubnameWeight,
  pClubLogoShadowsToggle,
  pClubLogoShadowsColor,
  pClubLogoShadowsIntensity,
];
bannerAutoSaveEls.forEach((el) => {
  if (!el) return;
  el.addEventListener("input", saveBanner);
  el.addEventListener("change", saveBanner);
});

/* ----- Player banner top bg image (zone nom + minute) ----- */
const P_TOP_BG_IMAGE_PREF_KEY = "ucl-player-top-bg-image-v1";
const P_TOP_BG_IMAGE_FILE_KEY = "ucl-player-top-bg-image-file-v1";
const P_TOP_BG_IMAGE_CUSTOM_KEY = "ucl-player-top-bg-image-custom-v1";
const P_TOP_BG_IMAGE_OPACITY_KEY = "ucl-player-top-bg-image-opacity-v1";
const P_TOP_BG_IMAGE_FADE_KEY = "ucl-player-top-bg-image-fade-v1";
const P_TOP_BG_IMAGE_FADE_DIR_KEY = "ucl-player-top-bg-image-fade-dir-v1";
const P_TOP_BG_IMAGE_FADE_END_KEY = "ucl-player-top-bg-image-fade-end-v1";

const pTopBgImgToggle = document.getElementById("p-top-bg-image-toggle");
const pTopBgImgSelect = document.getElementById("p-top-bg-image-select");
const pTopBgImgFile = document.getElementById("p-top-bg-image-file");
const pTopBgImgClear = document.getElementById("p-top-bg-image-clear");
const pTopBgImgOpacity = document.getElementById("p-top-bg-image-opacity");
const pTopBgImgOpacityValue = document.getElementById(
  "p-top-bg-image-opacity-value",
);
const pTopBgImgFadeToggle = document.getElementById(
  "p-top-bg-image-fade-toggle",
);
const pTopBgImgFadeDir = document.getElementById("p-top-bg-image-fade-dir");
const pTopBgImgFadeEnd = document.getElementById("p-top-bg-image-fade-end");
const pTopBgImgFadeEndValue = document.getElementById(
  "p-top-bg-image-fade-end-value",
);

let pTopBgImageCustomUrl =
  localStorage.getItem(P_TOP_BG_IMAGE_CUSTOM_KEY) || null;

function applyPlayerTopBgImage() {
  const pbTop = document.getElementById("pb-top");
  const pbBottom = document.getElementById("pb-bottom");
  const topImg = document.getElementById("pb-top-bg-image");
  const bottomImg = document.getElementById("pb-bottom-bg-image");
  if (!pbTop || !topImg) return;
  const imgOpacity = +pTopBgImgOpacity.value / 100;
  if (pTopBgImgOpacityValue)
    pTopBgImgOpacityValue.textContent = pTopBgImgOpacity.value + "%";
  const fadeEndRatio = +pTopBgImgFadeEnd.value / 100;
  if (pTopBgImgFadeEndValue)
    pTopBgImgFadeEndValue.textContent = pTopBgImgFadeEnd.value + "%";
  const url = pTopBgImageCustomUrl
    ? pTopBgImageCustomUrl
    : pTopBgImgSelect.value
      ? `./${pTopBgImgSelect.value}`
      : "";
  const hasFile = !!url;
  const active = pTopBgImgToggle.checked && hasFile;
  const bgValue = hasFile ? `url('${url}')` : "none";
  let mask = "";
  if (pTopBgImgFadeToggle.checked) {
    const dirMap = {
      right: "to right",
      left: "to left",
      bottom: "to bottom",
      top: "to top",
    };
    const dir = dirMap[pTopBgImgFadeDir.value] || "to right";
    mask = `linear-gradient(${dir}, rgba(0,0,0,1), rgba(0,0,0,${fadeEndRatio}))`;
  }
  [
    [pbTop, topImg],
    [pbBottom, bottomImg],
  ].forEach(([wrapper, img]) => {
    if (!wrapper || !img) return;
    wrapper.classList.toggle("has-bg-image", active);
    img.style.backgroundImage = bgValue;
    img.style.opacity = imgOpacity;
    img.style.maskImage = mask;
    img.style.webkitMaskImage = mask;
  });
}

// Load saved state
pTopBgImgToggle.checked = localStorage.getItem(P_TOP_BG_IMAGE_PREF_KEY) === "1";
const savedPBgFile = localStorage.getItem(P_TOP_BG_IMAGE_FILE_KEY);
if (
  savedPBgFile &&
  [...pTopBgImgSelect.options].some((o) => o.value === savedPBgFile)
) {
  pTopBgImgSelect.value = savedPBgFile;
}
const savedPImgOp = localStorage.getItem(P_TOP_BG_IMAGE_OPACITY_KEY);
if (savedPImgOp != null) pTopBgImgOpacity.value = savedPImgOp;
pTopBgImgFadeToggle.checked =
  localStorage.getItem(P_TOP_BG_IMAGE_FADE_KEY) === "1";
const savedPFadeDir = localStorage.getItem(P_TOP_BG_IMAGE_FADE_DIR_KEY);
if (savedPFadeDir) pTopBgImgFadeDir.value = savedPFadeDir;
const savedPFadeEnd = localStorage.getItem(P_TOP_BG_IMAGE_FADE_END_KEY);
if (savedPFadeEnd != null) pTopBgImgFadeEnd.value = savedPFadeEnd;

applyPlayerTopBgImage();

pTopBgImgToggle.addEventListener("change", () => {
  localStorage.setItem(
    P_TOP_BG_IMAGE_PREF_KEY,
    pTopBgImgToggle.checked ? "1" : "0",
  );
  applyPlayerTopBgImage();
});
pTopBgImgSelect.addEventListener("change", () => {
  localStorage.setItem(P_TOP_BG_IMAGE_FILE_KEY, pTopBgImgSelect.value);
  applyPlayerTopBgImage();
});
pTopBgImgOpacity.addEventListener("input", () => {
  localStorage.setItem(P_TOP_BG_IMAGE_OPACITY_KEY, pTopBgImgOpacity.value);
  applyPlayerTopBgImage();
});
pTopBgImgFadeToggle.addEventListener("change", () => {
  localStorage.setItem(
    P_TOP_BG_IMAGE_FADE_KEY,
    pTopBgImgFadeToggle.checked ? "1" : "0",
  );
  applyPlayerTopBgImage();
});
pTopBgImgFadeDir.addEventListener("change", () => {
  localStorage.setItem(P_TOP_BG_IMAGE_FADE_DIR_KEY, pTopBgImgFadeDir.value);
  applyPlayerTopBgImage();
});
pTopBgImgFadeEnd.addEventListener("input", () => {
  localStorage.setItem(P_TOP_BG_IMAGE_FADE_END_KEY, pTopBgImgFadeEnd.value);
  applyPlayerTopBgImage();
});
pTopBgImgFile.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    pTopBgImageCustomUrl = reader.result;
    try {
      localStorage.setItem(P_TOP_BG_IMAGE_CUSTOM_KEY, pTopBgImageCustomUrl);
    } catch (err) {
      alert(
        "Image trop volumineuse pour être sauvegardée localement. Elle reste active pour la session.",
      );
    }
    applyPlayerTopBgImage();
  };
  reader.readAsDataURL(file);
});
pTopBgImgClear.addEventListener("click", () => {
  pTopBgImageCustomUrl = null;
  localStorage.removeItem(P_TOP_BG_IMAGE_CUSTOM_KEY);
  pTopBgImgFile.value = "";
  applyPlayerTopBgImage();
});

loadBanner();
renderSavedBannersList();
updatePlayerBanner();

/* ============================================================
   2) LINEUP BOARD
   ============================================================ */
// Default Liverpool 4-3-3 positions matching the image
const defaultStarters = [
  { num: 1, name: "ALISSON", x: 92, y: 50, gk: true },
  { num: 66, name: "ALEXANDER-ARNOLD", x: 75, y: 18 },
  { num: 5, name: "KONATÉ", x: 78, y: 38 },
  { num: 4, name: "VIRGIL", x: 78, y: 62 },
  { num: 26, name: "ROBERTSON", x: 75, y: 82 },
  { num: 14, name: "HENDERSON", x: 55, y: 22 },
  { num: 3, name: "FABINHO", x: 58, y: 50 },
  { num: 6, name: "THIAGO", x: 55, y: 78 },
  { num: 11, name: "SALAH", x: 30, y: 20 },
  { num: 10, name: "MANÉ", x: 28, y: 50 },
  { num: 23, name: "LUIS DIAZ", x: 30, y: 80 },
];
let starters = JSON.parse(JSON.stringify(defaultStarters));
let teamLogoURL = null;

function hexToRgba(hex, alpha) {
  const c = hex.replace("#", "");
  const full =
    c.length === 3
      ? c
          .split("")
          .map((x) => x + x)
          .join("")
      : c;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ----- localStorage persistence ----- */
const LINEUP_STORAGE_KEY = "ucl-lineup-v1";
const SAVED_TEAMS_KEY = "ucl-lineup-teams-v1";
const SAVED_FORMATIONS_KEY = "ucl-lineup-formations-v1";
const SAVED_STYLES_KEY = "ucl-lineup-styles-v1";
const SAVED_TYPOS_KEY = "ucl-lineup-typos-v1";
const SAVED_KITS_KEY = "ucl-lineup-kits-v1";

function collectLineupData() {
  return {
    team: document.getElementById("l-team").value,
    footerRound: document.getElementById("l-footer-round").value,
    footerLeg: document.getElementById("l-footer-leg").value,
    footerExtra: document.getElementById("l-footer-extra").value,
    coachFirst: document.getElementById("l-coach-first").value,
    coachLast: document.getElementById("l-coach-last").value,
    colorShirt: document.getElementById("l-color-shirt").value,
    colorGk: document.getElementById("l-color-gk").value,
    shirtShadowsEnabled: document.getElementById("l-shirt-shadows-toggle")
      .checked,
    teamLogoShadowsEnabled: document.getElementById(
      "l-team-logo-shadows-toggle",
    ).checked,
    shirtShadowsColor: document.getElementById("l-shirt-shadows-color").value,
    shirtShadowsIntensity: document.getElementById(
      "l-shirt-shadows-intensity",
    ).value,
    colorNum: document.getElementById("l-color-num").value,
    colorNumGk: document.getElementById("l-color-num-gk").value,
    colorNumberPlate: document.getElementById("l-color-number-plate").value,
    numberPlateWidth: document.getElementById("l-number-plate-width").value,
    numberPlateHeight: document.getElementById("l-number-plate-height").value,
    colorBg: document.getElementById("l-color-bg").value,
    shirtStyle: document.getElementById("l-shirt-style").value,
    colorSleeves: document.getElementById("l-color-sleeves").value,
    colorStripes: document.getElementById("l-color-stripes").value,
    numberFont: document.getElementById("l-number-font").value,
    colorText: document.getElementById("l-color-text").value,
    typo: collectTypoData(),
    bgOpacity: document.getElementById("l-bg-opacity").value,
    starters: JSON.parse(JSON.stringify(starters)),
    teamLogoURL: teamLogoURL,
  };
}

function applyLineupData(data, persist = true) {
  if (data.team != null) document.getElementById("l-team").value = data.team;
  document.getElementById("l-footer-round").value =
    data.footerRound || "Quarter Finals";
  document.getElementById("l-footer-leg").value =
    data.footerLeg != null ? data.footerLeg : "First Leg";
  if (data.footerExtra != null) {
    document.getElementById("l-footer-extra").value = data.footerExtra;
  } else if (data.footer) {
    document.getElementById("l-footer-extra").value = data.footer;
  } else {
    document.getElementById("l-footer-extra").value = "";
  }
  if (data.coachFirst != null || data.coachLast != null) {
    document.getElementById("l-coach-first").value = data.coachFirst || "";
    document.getElementById("l-coach-last").value = data.coachLast || "";
  } else if (data.coach) {
    // Migration depuis l'ancien champ unique
    const parts = String(data.coach).trim().split(/\s+/);
    const first = parts.shift() || "";
    const last = parts.join(" ");
    document.getElementById("l-coach-first").value = first;
    document.getElementById("l-coach-last").value = last;
  }
  if (data.colorShirt)
    document.getElementById("l-color-shirt").value = data.colorShirt;
  if (data.colorGk) document.getElementById("l-color-gk").value = data.colorGk;
  if (typeof data.shirtShadowsEnabled === "boolean")
    document.getElementById("l-shirt-shadows-toggle").checked =
      data.shirtShadowsEnabled;
  if (typeof data.teamLogoShadowsEnabled === "boolean")
    document.getElementById("l-team-logo-shadows-toggle").checked =
      data.teamLogoShadowsEnabled;
  else if (typeof data.shirtShadowsEnabled === "boolean")
    document.getElementById("l-team-logo-shadows-toggle").checked =
      data.shirtShadowsEnabled;
  if (data.shirtShadowsColor === "white" || data.shirtShadowsColor === "black")
    document.getElementById("l-shirt-shadows-color").value =
      data.shirtShadowsColor;
  if (data.shirtShadowsIntensity != null)
    document.getElementById("l-shirt-shadows-intensity").value =
      data.shirtShadowsIntensity;
  if (data.colorNum)
    document.getElementById("l-color-num").value = data.colorNum;
  if (data.colorNumGk)
    document.getElementById("l-color-num-gk").value = data.colorNumGk;
  if (data.colorNumberPlate)
    document.getElementById("l-color-number-plate").value =
      data.colorNumberPlate;
  if (data.numberPlateWidth != null)
    document.getElementById("l-number-plate-width").value =
      data.numberPlateWidth;
  if (data.numberPlateHeight != null)
    document.getElementById("l-number-plate-height").value =
      data.numberPlateHeight;
  if (data.colorBg) document.getElementById("l-color-bg").value = data.colorBg;
  document.getElementById("l-shirt-style").value = data.shirtStyle || "solid";
  if (data.colorSleeves)
    document.getElementById("l-color-sleeves").value = data.colorSleeves;
  if (data.colorStripes)
    document.getElementById("l-color-stripes").value = data.colorStripes;
  if (data.numberFont)
    document.getElementById("l-number-font").value = data.numberFont;
  if (data.colorText)
    document.getElementById("l-color-text").value = data.colorText;
  if (data.typo && typeof applyTypoData === "function") {
    applyTypoData(data.typo);
  }
  if (data.style && typeof applyStyleData === "function") {
    applyStyleData(data.style, persist);
  }
  if (data.bgOpacity != null)
    document.getElementById("l-bg-opacity").value = data.bgOpacity;
  if (Array.isArray(data.starters) && data.starters.length === 11) {
    starters = JSON.parse(JSON.stringify(data.starters));
  }
  teamLogoURL = data.teamLogoURL || null;
}

function saveLineup() {
  try {
    localStorage.setItem(
      LINEUP_STORAGE_KEY,
      JSON.stringify(compressLineupData(collectLineupData())),
    );
  } catch (e) {
    /* storage unavailable */
  }
}

function loadLineup() {
  try {
    const raw = localStorage.getItem(LINEUP_STORAGE_KEY);
    if (!raw) return;
    applyLineupData(expandLineupData(JSON.parse(raw)));
  } catch (e) {
    /* invalid data */
  }
}

function resetLineup() {
  localStorage.removeItem(LINEUP_STORAGE_KEY);
  starters = JSON.parse(JSON.stringify(defaultStarters));
  teamLogoURL = null;
  document.getElementById("l-team").value = "LIVERPOOL FC";
  document.getElementById("l-footer-round").value = "Quarter Finals";
  document.getElementById("l-footer-leg").value = "First Leg";
  document.getElementById("l-footer-extra").value = "";
  document.getElementById("l-coach-first").value = "DIDIER";
  document.getElementById("l-coach-last").value = "DESCHAMPS";
  document.getElementById("l-color-shirt").value = "#d40000";
  document.getElementById("l-color-gk").value = "#222222";
  document.getElementById("l-shirt-shadows-toggle").checked = true;
  document.getElementById("l-team-logo-shadows-toggle").checked = true;
  document.getElementById("l-shirt-shadows-color").value = "white";
  document.getElementById("l-shirt-shadows-intensity").value = "100";
  document.getElementById("l-color-num").value = "#ffffff";
  document.getElementById("l-color-num-gk").value = "#ffffff";
  document.getElementById("l-color-number-plate").value = "#111111";
  document.getElementById("l-number-plate-width").value = "38";
  document.getElementById("l-number-plate-height").value = "34";
  document.getElementById("l-color-bg").value = "#0a2540";
  document.getElementById("l-shirt-style").value = "solid";
  document.getElementById("l-color-sleeves").value = "#ffffff";
  document.getElementById("l-color-stripes").value = "#ffffff";
  document.getElementById("l-number-font").value = "condensed";
  document.getElementById("l-color-text").value = "#ffffff";
  document.getElementById("l-bg-opacity").value = "100";
  document.getElementById("l-team-logo-file").value = "";
  renderStartersEditor();
  updateLineupCommon();
}

/* ----- Multi-team saved presets ----- */
function getSavedTeams() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_TEAMS_KEY) || "[]");
  } catch {
    return [];
  }
}
function setSavedTeams(list) {
  localStorage.setItem(SAVED_TEAMS_KEY, JSON.stringify(list));
}
function renderSavedTeamsList() {
  const sel = document.getElementById("l-saved-team-select");
  const teams = getSavedTeams();
  if (teams.length === 0) {
    sel.innerHTML = '<option value="">— Aucune équipe sauvegardée —</option>';
  } else {
    sel.innerHTML = teams
      .map((t, i) => `<option value="${i}">${t.name}</option>`)
      .join("");
  }
}
function saveCurrentAsTeam() {
  const nameInput = document.getElementById("l-save-team-name");
  const name =
    nameInput.value.trim() || document.getElementById("l-team").value.trim();
  if (!name) {
    alert("Donne un nom à la sauvegarde.");
    return;
  }
  const teams = getSavedTeams();
  const existing = teams.findIndex((t) => t.name === name);
  // Capture current background as a style snapshot so compressLineupData can
  // replace it with a styleRef when it matches a saved style preset.
  const teamData = collectLineupData();
  delete teamData.colorBg;
  delete teamData.bgOpacity;
  teamData.style = collectStyleData();
  compressLineupData(teamData);
  // If no preset matched, drop the inline objects so team saves stay focused
  // on team identity (kit/typo/style stay as their own dedicated systems).
  if (teamData.style && !teamData.styleRef) delete teamData.style;
  if (teamData.typo && !teamData.typoRef) delete teamData.typo;
  const entry = { name, data: teamData };
  if (existing >= 0) {
    teams[existing] = entry;
  } else {
    teams.push(entry);
  }
  setSavedTeams(teams);
  renderSavedTeamsList();
  // Select the just-saved entry
  const idx = teams.findIndex((t) => t.name === name);
  document.getElementById("l-saved-team-select").value = String(idx);
  showPresetSaveStatus(nameInput, name);
}
function loadSelectedTeam() {
  const sel = document.getElementById("l-saved-team-select");
  const idx = parseInt(sel.value, 10);
  const teams = getSavedTeams();
  if (isNaN(idx) || !teams[idx]) return;
  applyLineupData(
    expandLineupData(JSON.parse(JSON.stringify(teams[idx].data))),
  );
  document.getElementById("l-team-logo-file").value = "";
  document.getElementById("l-save-team-name").value = teams[idx].name;
  renderStartersEditor();
  updateLineupCommon();
  saveLineup();
}
function deleteSelectedTeam() {
  const sel = document.getElementById("l-saved-team-select");
  const idx = parseInt(sel.value, 10);
  const teams = getSavedTeams();
  if (isNaN(idx) || !teams[idx]) return;
  teams.splice(idx, 1);
  setSavedTeams(teams);
  renderSavedTeamsList();
}

/* ----- Formations sauvegardées (positions uniquement) ----- */
function getSavedFormations() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_FORMATIONS_KEY) || "[]");
  } catch {
    return [];
  }
}
function setSavedFormations(list) {
  localStorage.setItem(SAVED_FORMATIONS_KEY, JSON.stringify(list));
}
function renderSavedFormationsList() {
  const sel = document.getElementById("l-saved-formation-select");
  const formations = getSavedFormations();
  if (formations.length === 0) {
    sel.innerHTML =
      '<option value="">— Aucune formation sauvegardée —</option>';
  } else {
    sel.innerHTML = formations
      .map((f, i) => `<option value="${i}">${f.name}</option>`)
      .join("");
  }
}
function saveCurrentAsFormation() {
  const nameInput = document.getElementById("l-save-formation-name");
  const name = nameInput.value.trim();
  if (!name) {
    alert("Donne un nom à la formation.");
    return;
  }
  const formations = getSavedFormations();
  const existing = formations.findIndex((f) => f.name === name);
  const entry = {
    name,
    positions: starters.map((p) => ({ x: p.x, y: p.y, gk: !!p.gk })),
  };
  if (existing >= 0) {
    formations[existing] = entry;
  } else {
    formations.push(entry);
  }
  setSavedFormations(formations);
  renderSavedFormationsList();
  const idx = formations.findIndex((f) => f.name === name);
  document.getElementById("l-saved-formation-select").value = String(idx);
  showPresetSaveStatus(nameInput, name);
}
function loadSelectedFormation() {
  const sel = document.getElementById("l-saved-formation-select");
  const idx = parseInt(sel.value, 10);
  const formations = getSavedFormations();
  if (isNaN(idx) || !formations[idx]) return;
  const positions = formations[idx].positions;
  if (!Array.isArray(positions) || positions.length !== 11) return;
  positions.forEach((pos, i) => {
    if (!starters[i]) return;
    starters[i].x = pos.x;
    starters[i].y = pos.y;
    if (typeof pos.gk === "boolean") starters[i].gk = pos.gk;
  });
  document.getElementById("l-save-formation-name").value = formations[idx].name;
  renderPitch();
  saveLineup();
}
function deleteSelectedFormation() {
  const sel = document.getElementById("l-saved-formation-select");
  const idx = parseInt(sel.value, 10);
  const formations = getSavedFormations();
  if (isNaN(idx) || !formations[idx]) return;
  formations.splice(idx, 1);
  setSavedFormations(formations);
  renderSavedFormationsList();
}

/* ----- Styles de fond sauvegardés (couleurs + opacité + image + lignes) ----- */
function getSavedStyles() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_STYLES_KEY) || "[]");
  } catch {
    return [];
  }
}
function setSavedStyles(list) {
  localStorage.setItem(SAVED_STYLES_KEY, JSON.stringify(list));
}
function renderSavedStylesList() {
  const sel = document.getElementById("l-saved-style-select");
  if (!sel) return;
  const styles = getSavedStyles();
  if (styles.length === 0) {
    sel.innerHTML = '<option value="">— Aucun style sauvegardé —</option>';
  } else {
    sel.innerHTML = styles
      .map((s, i) => `<option value="${i}">${s.name}</option>`)
      .join("");
  }
}
function collectStyleData() {
  return {
    colorBg: document.getElementById("l-color-bg").value,
    bgOpacity: document.getElementById("l-bg-opacity").value,
    bgImageEnabled: document.getElementById("l-bg-image-toggle").checked,
    bgImageFile: document.getElementById("l-bg-image-select").value,
    bgImageOpacity: document.getElementById("l-bg-image-opacity").value,
    bgImageFadeEnabled: document.getElementById("l-bg-image-fade-toggle")
      .checked,
    bgImageFadeDir: document.getElementById("l-bg-image-fade-dir").value,
    bgImageFadeEnd: document.getElementById("l-bg-image-fade-end").value,
    showStripes: document.getElementById("l-pitch-stripes").checked,
    showDivider: document.getElementById("l-divider-toggle").checked,
    dividerThickness: document.getElementById("l-divider-thickness").value,
    dividerColor1: document.getElementById("l-divider-color-1").value,
    dividerColor2: document.getElementById("l-divider-color-2").value,
  };
}
function applyStyleData(data, persist = true) {
  if (data.colorBg) document.getElementById("l-color-bg").value = data.colorBg;
  if (data.bgOpacity != null)
    document.getElementById("l-bg-opacity").value = data.bgOpacity;
  if (typeof data.bgImageEnabled === "boolean") {
    document.getElementById("l-bg-image-toggle").checked = data.bgImageEnabled;
    if (persist) localStorage.setItem(BG_IMAGE_PREF_KEY, data.bgImageEnabled ? "1" : "0");
  }
  if (data.bgImageFile != null) {
    document.getElementById("l-bg-image-select").value = data.bgImageFile;
    if (persist) localStorage.setItem(BG_IMAGE_FILE_KEY, data.bgImageFile);
  }
  if (data.bgImageOpacity != null) {
    document.getElementById("l-bg-image-opacity").value = data.bgImageOpacity;
    if (persist) localStorage.setItem(BG_IMAGE_OPACITY_KEY, data.bgImageOpacity);
  }
  if (typeof data.bgImageFadeEnabled === "boolean") {
    document.getElementById("l-bg-image-fade-toggle").checked =
      data.bgImageFadeEnabled;
    if (persist) localStorage.setItem(
      BG_IMAGE_FADE_KEY,
      data.bgImageFadeEnabled ? "1" : "0",
    );
  }
  if (data.bgImageFadeDir) {
    document.getElementById("l-bg-image-fade-dir").value = data.bgImageFadeDir;
    if (persist) localStorage.setItem(BG_IMAGE_FADE_DIR_KEY, data.bgImageFadeDir);
  }
  if (data.bgImageFadeEnd != null) {
    document.getElementById("l-bg-image-fade-end").value = data.bgImageFadeEnd;
    if (persist) localStorage.setItem(BG_IMAGE_FADE_END_KEY, data.bgImageFadeEnd);
  }
  if (typeof data.showStripes === "boolean") {
    document.getElementById("l-pitch-stripes").checked = data.showStripes;
    if (persist) localStorage.setItem(STRIPES_PREF_KEY, data.showStripes ? "1" : "0");
    document
      .getElementById("lb-pitch")
      .classList.toggle("show-stripes", data.showStripes);
  }
  if (typeof data.showDivider === "boolean") {
    document.getElementById("l-divider-toggle").checked = data.showDivider;
    if (persist) localStorage.setItem(DIVIDER_PREF_KEY, data.showDivider ? "1" : "0");
  }
  if (data.dividerThickness) {
    document.getElementById("l-divider-thickness").value =
      data.dividerThickness;
    if (persist) localStorage.setItem(DIVIDER_THICKNESS_KEY, data.dividerThickness);
  }
  if (data.dividerColor1) {
    document.getElementById("l-divider-color-1").value = data.dividerColor1;
    if (persist) localStorage.setItem(DIVIDER_COLOR1_KEY, data.dividerColor1);
  }
  if (data.dividerColor2) {
    document.getElementById("l-divider-color-2").value = data.dividerColor2;
    if (persist) localStorage.setItem(DIVIDER_COLOR2_KEY, data.dividerColor2);
  }
  if (typeof applyBgImage === "function") applyBgImage();
  if (typeof applyDivider === "function") applyDivider();
  updateLineupCommon();
}
function saveCurrentAsStyle() {
  const nameInput = document.getElementById("l-save-style-name");
  const name = nameInput.value.trim();
  if (!name) {
    alert("Donne un nom au style.");
    return;
  }
  const styles = getSavedStyles();
  const existing = styles.findIndex((s) => s.name === name);
  const entry = { name, data: collectStyleData() };
  if (existing >= 0) {
    styles[existing] = entry;
  } else {
    styles.push(entry);
  }
  setSavedStyles(styles);
  renderSavedStylesList();
  const idx = styles.findIndex((s) => s.name === name);
  document.getElementById("l-saved-style-select").value = String(idx);
  showPresetSaveStatus(nameInput, name);
}
function loadSelectedStyle() {
  const sel = document.getElementById("l-saved-style-select");
  const idx = parseInt(sel.value, 10);
  const styles = getSavedStyles();
  if (isNaN(idx) || !styles[idx]) return;
  applyStyleData(styles[idx].data);
  document.getElementById("l-save-style-name").value = styles[idx].name;
}
function deleteSelectedStyle() {
  const sel = document.getElementById("l-saved-style-select");
  const idx = parseInt(sel.value, 10);
  const styles = getSavedStyles();
  if (isNaN(idx) || !styles[idx]) return;
  styles.splice(idx, 1);
  setSavedStyles(styles);
  renderSavedStylesList();
}

/* ----- Typographies sauvegardées (lineup) ----- */
function getSavedTypos() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_TYPOS_KEY) || "[]");
  } catch {
    return [];
  }
}
function setSavedTypos(list) {
  localStorage.setItem(SAVED_TYPOS_KEY, JSON.stringify(list));
}
function renderSavedTyposList() {
  const sel = document.getElementById("l-saved-typo-select");
  if (!sel) return;
  const list = getSavedTypos();
  if (list.length === 0) {
    sel.innerHTML =
      '<option value="">— Aucune typographie sauvegardée —</option>';
  } else {
    sel.innerHTML = list
      .map((t, i) => `<option value="${i}">${t.name}</option>`)
      .join("");
  }
}
function collectTypoData() {
  return {
    teamFont: lTeamFont.value,
    teamSize: lTeamSize.value,
    teamWeight: lTeamWeight.value,
    footerFont: lFooterFont.value,
    footerSize: lFooterSize.value,
    footerWeight: lFooterWeight.value,
    coachFont: lCoachFont.value,
    coachSize: lCoachSize.value,
    coachWeight: lCoachWeight.value,
    playerFont: lPlayerFont.value,
    playerSize: lPlayerSize.value,
    playerWeight: lPlayerWeight.value,
  };
}
function applyTypoData(d) {
  if (d.teamFont) lTeamFont.value = d.teamFont;
  if (d.teamSize) lTeamSize.value = d.teamSize;
  if (d.teamWeight) lTeamWeight.value = d.teamWeight;
  if (d.footerFont) lFooterFont.value = d.footerFont;
  if (d.footerSize) lFooterSize.value = d.footerSize;
  if (d.footerWeight) lFooterWeight.value = d.footerWeight;
  if (d.coachFont) lCoachFont.value = d.coachFont;
  if (d.coachSize) lCoachSize.value = d.coachSize;
  if (d.coachWeight) lCoachWeight.value = d.coachWeight;
  if (d.playerFont) lPlayerFont.value = d.playerFont;
  if (d.playerSize) lPlayerSize.value = d.playerSize;
  if (d.playerWeight) lPlayerWeight.value = d.playerWeight;
  updateLineupCommon();
}
function saveCurrentAsTypo() {
  const nameInput = document.getElementById("l-save-typo-name");
  const name = nameInput.value.trim();
  if (!name) {
    alert("Donne un nom à la typographie.");
    return;
  }
  const list = getSavedTypos();
  const existing = list.findIndex((t) => t.name === name);
  const entry = { name, data: collectTypoData() };
  if (existing >= 0) {
    list[existing] = entry;
  } else {
    list.push(entry);
  }
  setSavedTypos(list);
  renderSavedTyposList();
  const idx = list.findIndex((t) => t.name === name);
  document.getElementById("l-saved-typo-select").value = String(idx);
  showPresetSaveStatus(nameInput, name);
}
function loadSelectedTypo() {
  const sel = document.getElementById("l-saved-typo-select");
  const idx = parseInt(sel.value, 10);
  const list = getSavedTypos();
  if (isNaN(idx) || !list[idx]) return;
  applyTypoData(list[idx].data);
  document.getElementById("l-save-typo-name").value = list[idx].name;
}
function deleteSelectedTypo() {
  const sel = document.getElementById("l-saved-typo-select");
  const idx = parseInt(sel.value, 10);
  const list = getSavedTypos();
  if (isNaN(idx) || !list[idx]) return;
  list.splice(idx, 1);
  setSavedTypos(list);
  renderSavedTyposList();
}

/* ----- Kits sauvegardés (maillot + couleurs) ----- */
const KIT_FIELDS = [
  "colorShirt",
  "colorGk",
  "shirtShadowsEnabled",
  "teamLogoShadowsEnabled",
  "shirtShadowsColor",
  "shirtShadowsIntensity",
  "colorNum",
  "colorNumGk",
  "colorNumberPlate",
  "numberPlateWidth",
  "numberPlateHeight",
  "shirtStyle",
  "colorSleeves",
  "colorStripes",
  "numberFont",
];
function getSavedKits() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KITS_KEY) || "[]");
  } catch {
    return [];
  }
}
function setSavedKits(list) {
  localStorage.setItem(SAVED_KITS_KEY, JSON.stringify(list));
}
function renderSavedKitsList() {
  const sel = document.getElementById("l-saved-kit-select");
  if (!sel) return;
  const list = getSavedKits();
  if (list.length === 0) {
    sel.innerHTML = '<option value="">— Aucun kit sauvegardé —</option>';
  } else {
    sel.innerHTML = list
      .map((k, i) => `<option value="${i}">${k.name}</option>`)
      .join("");
  }
}
function collectKitData() {
  return {
    colorShirt: document.getElementById("l-color-shirt").value,
    colorGk: document.getElementById("l-color-gk").value,
    shirtShadowsEnabled: document.getElementById("l-shirt-shadows-toggle")
      .checked,
    teamLogoShadowsEnabled: document.getElementById(
      "l-team-logo-shadows-toggle",
    ).checked,
    shirtShadowsColor: document.getElementById("l-shirt-shadows-color").value,
    shirtShadowsIntensity: document.getElementById(
      "l-shirt-shadows-intensity",
    ).value,
    colorNum: document.getElementById("l-color-num").value,
    colorNumGk: document.getElementById("l-color-num-gk").value,
    colorNumberPlate: document.getElementById("l-color-number-plate").value,
    numberPlateWidth: document.getElementById("l-number-plate-width").value,
    numberPlateHeight: document.getElementById("l-number-plate-height").value,
    shirtStyle: document.getElementById("l-shirt-style").value,
    colorSleeves: document.getElementById("l-color-sleeves").value,
    colorStripes: document.getElementById("l-color-stripes").value,
    numberFont: document.getElementById("l-number-font").value,
  };
}
function applyKitData(d) {
  if (d.colorShirt)
    document.getElementById("l-color-shirt").value = d.colorShirt;
  if (d.colorGk) document.getElementById("l-color-gk").value = d.colorGk;
  if (typeof d.shirtShadowsEnabled === "boolean")
    document.getElementById("l-shirt-shadows-toggle").checked =
      d.shirtShadowsEnabled;
  if (typeof d.teamLogoShadowsEnabled === "boolean")
    document.getElementById("l-team-logo-shadows-toggle").checked =
      d.teamLogoShadowsEnabled;
  else if (typeof d.shirtShadowsEnabled === "boolean")
    document.getElementById("l-team-logo-shadows-toggle").checked =
      d.shirtShadowsEnabled;
  if (d.shirtShadowsColor === "white" || d.shirtShadowsColor === "black")
    document.getElementById("l-shirt-shadows-color").value =
      d.shirtShadowsColor;
  if (d.shirtShadowsIntensity != null)
    document.getElementById("l-shirt-shadows-intensity").value =
      d.shirtShadowsIntensity;
  if (d.colorNum) document.getElementById("l-color-num").value = d.colorNum;
  if (d.colorNumGk)
    document.getElementById("l-color-num-gk").value = d.colorNumGk;
  if (d.colorNumberPlate)
    document.getElementById("l-color-number-plate").value =
      d.colorNumberPlate;
  if (d.numberPlateWidth != null)
    document.getElementById("l-number-plate-width").value =
      d.numberPlateWidth;
  if (d.numberPlateHeight != null)
    document.getElementById("l-number-plate-height").value =
      d.numberPlateHeight;
  if (d.shirtStyle)
    document.getElementById("l-shirt-style").value = d.shirtStyle;
  if (d.colorSleeves)
    document.getElementById("l-color-sleeves").value = d.colorSleeves;
  if (d.colorStripes)
    document.getElementById("l-color-stripes").value = d.colorStripes;
  if (d.numberFont)
    document.getElementById("l-number-font").value = d.numberFont;
  updateLineupCommon();
}
function saveCurrentAsKit() {
  const nameInput = document.getElementById("l-save-kit-name");
  const name = nameInput.value.trim();
  if (!name) {
    alert("Donne un nom au kit.");
    return;
  }
  const list = getSavedKits();
  const existing = list.findIndex((k) => k.name === name);
  const entry = { name, data: collectKitData() };
  if (existing >= 0) {
    list[existing] = entry;
  } else {
    list.push(entry);
  }
  setSavedKits(list);
  renderSavedKitsList();
  const idx = list.findIndex((k) => k.name === name);
  document.getElementById("l-saved-kit-select").value = String(idx);
  showPresetSaveStatus(nameInput, name);
}
function loadSelectedKit() {
  const sel = document.getElementById("l-saved-kit-select");
  const idx = parseInt(sel.value, 10);
  const list = getSavedKits();
  if (isNaN(idx) || !list[idx]) return;
  applyKitData(list[idx].data);
  document.getElementById("l-save-kit-name").value = list[idx].name;
  saveLineup();
}
function deleteSelectedKit() {
  const sel = document.getElementById("l-saved-kit-select");
  const idx = parseInt(sel.value, 10);
  const list = getSavedKits();
  if (isNaN(idx) || !list[idx]) return;
  list.splice(idx, 1);
  setSavedKits(list);
  renderSavedKitsList();
}

/* ----- Dedup helpers (reference saved presets by name) ----- */
function stableStringify(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const keys = Object.keys(v).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",") +
    "}"
  );
}
function findPresetNameByContent(list, currentData) {
  if (!Array.isArray(list) || !currentData) return null;
  const target = stableStringify(currentData);
  for (const item of list) {
    if (item && item.data && stableStringify(item.data) === target)
      return item.name;
  }
  return null;
}
function findFormationNameByPositions(list, positions) {
  if (!Array.isArray(list) || !Array.isArray(positions)) return null;
  const target = stableStringify(
    positions.map((p) => ({ x: p.x, y: p.y, gk: !!p.gk })),
  );
  for (const item of list) {
    if (
      item &&
      Array.isArray(item.positions) &&
      item.positions.length === positions.length &&
      stableStringify(
        item.positions.map((p) => ({ x: p.x, y: p.y, gk: !!p.gk })),
      ) === target
    ) {
      return item.name;
    }
  }
  return null;
}

/* Compress a lineup data blob: replace embedded typo/positions with refs when
   they match a saved preset. Mutates and returns the same object. */
function compressLineupData(data) {
  if (!data) return data;
  // Typo ref
  if (data.typo) {
    const name = findPresetNameByContent(getSavedTypos(), data.typo);
    if (name) {
      data.typoRef = name;
      delete data.typo;
    }
  }
  // Style ref (background + divider preset)
  if (data.style) {
    const name = findPresetNameByContent(getSavedStyles(), data.style);
    if (name) {
      data.styleRef = name;
      delete data.style;
    }
  }
  // Kit ref (shirt style + colors), only if all kit fields are present
  if (KIT_FIELDS.every((f) => data[f] != null)) {
    const currentKit = {};
    KIT_FIELDS.forEach((f) => (currentKit[f] = data[f]));
    const name = findPresetNameByContent(getSavedKits(), currentKit);
    if (name) {
      data.kitRef = name;
      KIT_FIELDS.forEach((f) => delete data[f]);
    }
  }
  // Formation ref (positions only); keep num/name/captain on starters
  if (Array.isArray(data.starters) && data.starters.length === 11) {
    const positions = data.starters.map((p) => ({
      x: p.x,
      y: p.y,
      gk: !!p.gk,
    }));
    const name = findFormationNameByPositions(getSavedFormations(), positions);
    if (name) {
      data.formationRef = name;
      data.starters = data.starters.map((p) => {
        const out = { num: p.num, name: p.name };
        if (p.captain) out.captain = true;
        return out;
      });
    }
  }
  return data;
}

function expandLineupData(data) {
  if (!data) return data;
  if (data.typoRef && !data.typo) {
    const list = getSavedTypos();
    const found = list.find((t) => t.name === data.typoRef);
    if (found && found.data) data.typo = found.data;
  }
  if (data.styleRef && !data.style) {
    const list = getSavedStyles();
    const found = list.find((s) => s.name === data.styleRef);
    if (found && found.data) data.style = found.data;
  }
  if (data.kitRef) {
    const list = getSavedKits();
    const found = list.find((k) => k.name === data.kitRef);
    if (found && found.data) {
      KIT_FIELDS.forEach((f) => {
        if (data[f] == null && found.data[f] != null) data[f] = found.data[f];
      });
    }
  }
  if (data.formationRef && Array.isArray(data.starters)) {
    const list = getSavedFormations();
    const found = list.find((f) => f.name === data.formationRef);
    const positions =
      found && Array.isArray(found.positions) ? found.positions : null;
    data.starters = data.starters.map((p, i) => {
      const pos = (positions && positions[i]) || defaultStarters[i] || {};
      return {
        ...p,
        x: p.x != null ? p.x : pos.x,
        y: p.y != null ? p.y : pos.y,
        gk: p.gk != null ? p.gk : !!pos.gk,
      };
    });
  }
  return data;
}

function renderStartersEditor() {
  const list = document.getElementById("l-starters");
  list.innerHTML = "";
  starters.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "player-row";
    row.innerHTML = `
      <input type="number" value="${p.num}" min="0" max="99" data-i="${i}" data-field="num" />
      <input type="text" value="${p.name}" data-i="${i}" data-field="name" />
      <label class="captain-cell" title="Capitaine">
        <input type="checkbox" data-i="${i}" data-field="captain" ${p.captain ? "checked" : ""} />
        <span>C</span>
      </label>
      <span class="role-tag">${p.gk ? "GK" : "#" + (i + 1)}</span>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll("input").forEach((inp) => {
    const evtName = inp.type === "checkbox" ? "change" : "input";
    inp.addEventListener(evtName, (e) => {
      const idx = +e.target.dataset.i;
      const field = e.target.dataset.field;
      if (field === "captain") {
        if (e.target.checked) {
          // Mutex: only one captain at a time
          starters.forEach((s, j) => {
            s.captain = j === idx;
          });
          renderStartersEditor();
        } else {
          starters[idx].captain = false;
        }
      } else {
        starters[idx][field] =
          field === "num" ? +e.target.value : e.target.value;
      }
      renderPitch();
      saveLineup();
    });
  });
}

const lTeam = document.getElementById("l-team");
const lFooterRound = document.getElementById("l-footer-round");
const lFooterLeg = document.getElementById("l-footer-leg");
const lFooterExtra = document.getElementById("l-footer-extra");
const lCoachFirst = document.getElementById("l-coach-first");
const lCoachLast = document.getElementById("l-coach-last");
const lColorShirt = document.getElementById("l-color-shirt");
const lColorGk = document.getElementById("l-color-gk");
const lShirtShadowsToggle = document.getElementById("l-shirt-shadows-toggle");
const lTeamLogoShadowsToggle = document.getElementById(
  "l-team-logo-shadows-toggle",
);
const lShirtShadowsColor = document.getElementById("l-shirt-shadows-color");
const lShirtShadowsIntensity = document.getElementById(
  "l-shirt-shadows-intensity",
);
const lShirtShadowsIntensityValue = document.getElementById(
  "l-shirt-shadows-intensity-value",
);
const lShirtStyle = document.getElementById("l-shirt-style");
const lColorSleeves = document.getElementById("l-color-sleeves");
const lColorStripes = document.getElementById("l-color-stripes");
const lColorNum = document.getElementById("l-color-num");
const lColorNumGk = document.getElementById("l-color-num-gk");
const lColorNumberPlate = document.getElementById("l-color-number-plate");
const lNumberPlateWidth = document.getElementById("l-number-plate-width");
const lNumberPlateHeight = document.getElementById("l-number-plate-height");
const lNumberFont = document.getElementById("l-number-font");
const lColorText = document.getElementById("l-color-text");
const lColorBg = document.getElementById("l-color-bg");

const LB_FONTS = {
  condensed: "'Barlow Condensed', 'Archivo Narrow', 'Arial Narrow', sans-serif",
  system:
    "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, sans-serif",
  arial: "Arial, Helvetica, sans-serif",
  impact: "Impact, 'Arial Black', 'Helvetica Inserat', sans-serif",
  cinzel: "'Cinzel', 'Trajan Pro', serif",
  mono: "'Courier New', Courier, monospace",
};

const lTeamFont = document.getElementById("l-team-font");
const lTeamSize = document.getElementById("l-team-size");
const lTeamSizeValue = document.getElementById("l-team-size-value");
const lTeamWeight = document.getElementById("l-team-weight");
const lFooterFont = document.getElementById("l-footer-font");
const lFooterSize = document.getElementById("l-footer-size");
const lFooterSizeValue = document.getElementById("l-footer-size-value");
const lFooterWeight = document.getElementById("l-footer-weight");
const lCoachFont = document.getElementById("l-coach-font");
const lCoachSize = document.getElementById("l-coach-size");
const lCoachSizeValue = document.getElementById("l-coach-size-value");
const lCoachWeight = document.getElementById("l-coach-weight");
const lPlayerFont = document.getElementById("l-player-font");
const lPlayerSize = document.getElementById("l-player-size");
const lPlayerSizeValue = document.getElementById("l-player-size-value");
const lPlayerWeight = document.getElementById("l-player-weight");

const NUMBER_FONTS = {
  condensed: "'Barlow Condensed', 'Archivo Narrow', 'Arial Narrow', sans-serif",
  system:
    "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
  arial: "Arial, Helvetica, sans-serif",
  impact: "Impact, 'Arial Black', 'Helvetica Inserat', sans-serif",
  cinzel: "'Cinzel', 'Trajan Pro', serif",
  mono: "'Courier New', Courier, monospace",
};

function renderPitch() {
  const pitch = document.getElementById("lb-pitch");
  // Clear except lines
  pitch.querySelectorAll(".lb-player").forEach((p) => p.remove());
  starters.forEach((p, i) => {
    const el = document.createElement("div");
    el.className = "lb-player";
    el.style.left = p.x + "%";
    el.style.top = p.y + "%";
    el.dataset.index = i;
    const shirtColor = p.gk ? lColorGk.value : lColorShirt.value;
    const numColor = p.gk ? lColorNumGk.value : lColorNum.value;
    const numberFont =
      NUMBER_FONTS[lNumberFont.value] || NUMBER_FONTS.condensed;
    const styleOpts = p.gk
      ? { style: "solid", flat: true, numberFont }
      : {
          style: lShirtStyle.value,
          sleevesColor: lColorSleeves.value,
          stripesColor: lColorStripes.value,
          numberPlateColor: lColorNumberPlate.value,
          numberPlateWidth: lNumberPlateWidth.value,
          numberPlateHeight: lNumberPlateHeight.value,
          flat: true,
          numberFont,
        };
    const captainBadge = p.captain
      ? '<span class="lb-captain-badge" aria-label="Capitaine">C</span>'
      : "";
    el.innerHTML = `
      ${renderShirtSVG(shirtColor, numColor, p.num, styleOpts)}
      <div class="lb-player-name">${p.name}${captainBadge}</div>
    `;
    pitch.appendChild(el);
    makeDraggable(el, p);
  });
}

function shadeColor(hex, percent) {
  // percent < 0 darkens, > 0 lightens. Returns #rrggbb.
  const c = hex.replace("#", "");
  const num = parseInt(
    c.length === 3
      ? c
          .split("")
          .map((x) => x + x)
          .join("")
      : c,
    16,
  );
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.max(0, Math.min(255, r + Math.round(255 * percent)));
  g = Math.max(0, Math.min(255, g + Math.round(255 * percent)));
  b = Math.max(0, Math.min(255, b + Math.round(255 * percent)));
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function renderShirtSVG(color, numColor, number, options = {}) {
  const {
    style = "solid",
    sleevesColor = color,
    stripesColor = "#ffffff",
    flat = false,
    numberFont = "'Barlow Condensed', 'Archivo Narrow', 'Arial Narrow', sans-serif",
  } = options;
  const bodyColor = style === "stripes" ? stripesColor : color;
  const stripeFillColor = style === "stripes" ? color : stripesColor;
  const dark = flat ? bodyColor : shadeColor(bodyColor, -0.25);
  const darker = shadeColor(bodyColor, -0.4);
  const light = flat ? bodyColor : shadeColor(bodyColor, 0.12);
  const sleeveBase =
    style === "two-tone" || style === "stripes" ? sleevesColor : color;
  const sleeveDark = flat ? sleeveBase : shadeColor(sleeveBase, -0.25);
  const sleeveDarker = shadeColor(sleeveBase, -0.4);
  const uid = "sh" + Math.random().toString(36).slice(2, 8);
  const numberPlateColor = options.numberPlateColor || "#111111";
  const numberPlateWidth = Number(options.numberPlateWidth) || 38;
  const numberPlateHeight = Number(options.numberPlateHeight) || 34;
  const numberPlate =
    style === "stripes" && String(number).trim()
      ? `<rect x="${50 - numberPlateWidth / 2}" y="${32 + (34 - numberPlateHeight) / 2}"
              width="${numberPlateWidth}" height="${numberPlateHeight}" rx="2"
              fill="${numberPlateColor}"
              />`
      : "";
  const stripesBlock =
    style === "stripes"
      ? `
      <g clip-path="url(#${uid}-body-clip)">
        <rect x="30" y="14" width="8" height="92" fill="${stripeFillColor}" />
        <rect x="46" y="14" width="8" height="92" fill="${stripeFillColor}" />
        <rect x="62" y="14" width="8" height="92" fill="${stripeFillColor}" />
      </g>`
      : style === "central-band"
        ? `
      <g clip-path="url(#${uid}-body-clip)">
        <rect x="35" y="14" width="30" height="92" fill="${stripesColor}" />
      </g>`
      : "";
  return `
    <svg class="lb-shirt-svg" viewBox="0 0 100 105" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${uid}-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${light}"/>
          <stop offset="50%" stop-color="${bodyColor}"/>
          <stop offset="100%" stop-color="${dark}"/>
        </linearGradient>
        <linearGradient id="${uid}-sleeve" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${sleeveBase}"/>
          <stop offset="100%" stop-color="${sleeveDark}"/>
        </linearGradient>
        <clipPath id="${uid}-body-clip">
          <path d="M 26,16 Q 35,12 43,18 Q 50,22 57,18 Q 65,12 74,16 L 78,34 L 80,98 Q 50,103 20,98 L 22,34 Z" />
        </clipPath>
      </defs>
      <!-- Left sleeve -->
      <path d="M 26,16 L 5,28 L 8,46 L 22,42 Z"
            fill="url(#${uid}-sleeve)" stroke="#ffffff" stroke-width="0.4" stroke-linejoin="round"/>
      <!-- Right sleeve -->
      <path d="M 74,16 L 95,28 L 92,46 L 78,42 Z"
            fill="url(#${uid}-sleeve)" stroke="#ffffff" stroke-width="0.4" stroke-linejoin="round"/>
      <!-- Body silhouette: round neck + smooth shoulders + raised torso -->
      <path d="M 26,16
               Q 35,12 43,18
               Q 50,22 57,18
               Q 65,12 74,16
               L 78,34
               L 80,98
               Q 50,103 20,98
               L 22,34 Z"
            fill="url(#${uid}-body)" stroke="#ffffff" stroke-width="0.4" stroke-linejoin="round"/>
      ${stripesBlock}
      <!-- Subtle round collar trim -->
      <path d="M 43,18 Q 50,22 57,18 Q 50,20 43,18 Z"
            fill="${darker}" opacity="0.85"/>
      <!-- Hem line at bottom -->
      <path d="M 22,93 Q 50,98 78,93" fill="none" stroke="${darker}" stroke-width="0.6" opacity="0.5"/>
      <!-- Number -->
      ${numberPlate}
      <text x="50" y="65" text-anchor="middle"
            font-family="${numberFont}"
            font-size="40" font-weight="500"
            letter-spacing="2"
            fill="${numColor}">${number}</text>
    </svg>
  `;
}

function makeDraggable(el, playerObj) {
  let dragging = false;
  let moved = false;
  el.addEventListener("mousedown", (e) => {
    dragging = true;
    moved = false;
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const pitch = document.getElementById("lb-pitch");
    const rect = pitch.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const nextX = Math.max(2, Math.min(98, x));
    const nextY = Math.max(2, Math.min(98, y));
    moved ||= playerObj.x !== nextX || playerObj.y !== nextY;
    playerObj.x = nextX;
    playerObj.y = nextY;
    el.style.left = playerObj.x + "%";
    el.style.top = playerObj.y + "%";
  });
  document.addEventListener("mouseup", () => {
    if (dragging) {
      dragging = false;
      if (moved) {
        clearPresetSaveStatuses(document.querySelector('[data-editor="lineup"]'));
      }
      saveLineup();
    }
  });
}

function renderTeamLogo() {
  const box = document.getElementById("lb-team-logo");
  box.innerHTML = teamLogoURL
    ? `<img src="${teamLogoURL}" alt="team logo" />`
    : "";
}

function updateLineupCommon() {
  const board = document.getElementById("lineup-board");
  document.getElementById("l-number-plate-color-field").hidden =
    lShirtStyle.value !== "stripes";
  board.style.setProperty("--lb-text-color", lColorText.value);
  board.classList.toggle("show-shirt-shadows", lShirtShadowsToggle.checked);
  board.classList.toggle(
    "show-team-logo-shadows",
    lTeamLogoShadowsToggle.checked,
  );
  const shirtShadowIntensity =
    Number(lShirtShadowsIntensity.value) / 100;
  const shirtShadowRgb =
    lShirtShadowsColor.value === "black" ? "0, 0, 0" : "255, 255, 255";
  board.style.setProperty(
    "--lb-shirt-shadow-tight",
    `rgba(${shirtShadowRgb}, ${shirtShadowIntensity})`,
  );
  board.style.setProperty(
    "--lb-shirt-shadow-glow",
    `rgba(${shirtShadowRgb}, ${0.85 * shirtShadowIntensity})`,
  );
  board.style.setProperty(
    "--lb-shirt-shadow-depth",
    String(0.55 * shirtShadowIntensity),
  );
  if (lShirtShadowsIntensityValue)
    lShirtShadowsIntensityValue.textContent =
      lShirtShadowsIntensity.value + "%";
  // Typography per-element
  const teamFont = LB_FONTS[lTeamFont.value] || LB_FONTS.system;
  const teamEl = document.getElementById("lb-team-name");
  teamEl.style.fontFamily = teamFont;
  teamEl.style.fontSize = lTeamSize.value + "px";
  teamEl.style.fontWeight = lTeamWeight.value;
  if (lTeamSizeValue) lTeamSizeValue.textContent = lTeamSize.value + "px";
  const footerFont = LB_FONTS[lFooterFont.value] || LB_FONTS.system;
  const footerEl = document.getElementById("lb-footer");
  footerEl.style.fontFamily = footerFont;
  footerEl.style.fontSize = lFooterSize.value + "px";
  footerEl.style.fontWeight = lFooterWeight.value;
  if (lFooterSizeValue) lFooterSizeValue.textContent = lFooterSize.value + "px";
  const coachFont = LB_FONTS[lCoachFont.value] || LB_FONTS.system;
  const coachEl = document.getElementById("lb-coach");
  coachEl.style.fontFamily = coachFont;
  coachEl.style.fontSize = lCoachSize.value + "px";
  coachEl.style.fontWeight = lCoachWeight.value;
  if (lCoachSizeValue) lCoachSizeValue.textContent = lCoachSize.value + "px";
  board.style.setProperty(
    "--lb-player-font",
    LB_FONTS[lPlayerFont.value] || LB_FONTS.system,
  );
  board.style.setProperty("--lb-player-size", lPlayerSize.value + "px");
  board.style.setProperty("--lb-player-weight", lPlayerWeight.value);
  if (lPlayerSizeValue) lPlayerSizeValue.textContent = lPlayerSize.value + "px";

  document.getElementById("lb-team-name").textContent = lTeam.value;
  const round = lFooterRound.value;
  const leg = lFooterLeg.value;
  const extra = lFooterExtra.value.trim();
  const rest = [leg, extra].filter(Boolean).join(" - ");
  document.getElementById("lb-footer-text").innerHTML = round
    ? `<span class="lb-footer-round">${round}</span>${rest ? " " + rest : ""}`
    : rest;
  const coachFirst = lCoachFirst.value.trim();
  const coachLast = lCoachLast.value.trim();
  const hasCoach = coachFirst || coachLast;
  document.getElementById("lb-coach").innerHTML = hasCoach
    ? `<span class="lb-coach-label">HEAD COACH</span>
       <span class="lb-coach-name">${coachFirst ? `<span class="lb-coach-first">${coachFirst}</span>` : ""}${coachFirst && coachLast ? " " : ""}${coachLast ? `<span class="lb-coach-last">${coachLast}</span>` : ""}</span>`
    : "";
  const alpha = +document.getElementById("l-bg-opacity").value / 100;
  const bgTop = hexToRgba(lColorBg.value, alpha);
  const bgBottom = hexToRgba(shadeColor(lColorBg.value, -0.25), alpha);
  document.getElementById("lineup-board").style.backgroundImage =
    `linear-gradient(180deg, ${bgTop} 0%, ${bgBottom} 100%)`;
  document.getElementById("l-bg-opacity-value").textContent =
    Math.round(alpha * 100) + "%";
  const dividerEl = document.getElementById("lb-divider");
  if (dividerEl) dividerEl.style.opacity = alpha;
  const penaltyEl = document.getElementById("lb-pitch-penalty");
  if (penaltyEl) penaltyEl.style.opacity = alpha;
  document.getElementById("l-number-plate-width-value").textContent =
    lNumberPlateWidth.value;
  document.getElementById("l-number-plate-height-value").textContent =
    lNumberPlateHeight.value;
  if (typeof applyBgImage === "function") applyBgImage();
  renderTeamLogo();
  renderPitch();
}

[
  lTeam,
  lFooterRound,
  lFooterLeg,
  lFooterExtra,
  lCoachFirst,
  lCoachLast,
  lColorShirt,
  lColorGk,
  lShirtShadowsIntensity,
  lColorNum,
  lColorNumGk,
  lColorNumberPlate,
  lNumberPlateWidth,
  lNumberPlateHeight,
  lColorBg,
  lShirtStyle,
  lColorSleeves,
  lColorStripes,
  lNumberFont,
  lColorText,
  document.getElementById("l-bg-opacity"),
].forEach((el) =>
  el.addEventListener("input", () => {
    updateLineupCommon();
    saveLineup();
  }),
);
[
  lFooterRound,
  lFooterLeg,
  lShirtShadowsToggle,
  lTeamLogoShadowsToggle,
  lShirtShadowsColor,
].forEach((el) =>
  el.addEventListener("change", () => {
    updateLineupCommon();
    saveLineup();
  }),
);

loadLineup();
renderStartersEditor();
updateLineupCommon();
renderSavedTeamsList();

document.getElementById("l-reset").addEventListener("click", () => {
  if (confirm("Réinitialiser la composition aux valeurs par défaut ?"))
    resetLineup();
});

/* ----- Coller une composition entière ----- */
// Lignes alternées : un numéro puis un nom. Marqueurs reconnus :
//   (GA)/(GK)/(G)/gardien -> gardien de but
//   (C) ou un "C" collé au numéro (ex: "1C") -> capitaine
// Les positions (x/y) des emplacements existants sont conservées ; seuls le
// numéro, le nom, le flag gardien et le capitaine sont mis à jour, dans l'ordre.
function parseLineupComposition(text) {
  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const entries = [];
  let pendingNum = null;
  let pendingCaptain = false;
  const numRe = /^(\d{1,2})\s*(c?)$/i; // "9", "10", "1C"
  for (const line of lines) {
    const m = line.match(numRe);
    if (m) {
      // Ligne « numéro » : le dernier numéro avant un nom l'emporte.
      pendingNum = parseInt(m[1], 10);
      if (m[2]) pendingCaptain = true;
      continue;
    }
    // Ligne « nom » : détecter puis retirer les marqueurs entre parenthèses.
    let gk = /\((?:ga|gk|g|gardien)\)/i.test(line);
    let captain = pendingCaptain || /\(c\)/i.test(line);
    const name = line
      .replace(/\([^)]*\)/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    entries.push({ num: pendingNum, name, gk, captain });
    pendingNum = null;
    pendingCaptain = false;
  }
  return entries;
}

function applyParsedComposition(entries) {
  const status = document.getElementById("l-paste-comp-status");
  const setStatus = (msg, ok) => {
    if (!status) return;
    status.textContent = msg;
    status.classList.toggle("is-error", !ok);
  };
  const named = entries.filter((e) => e.name);
  if (!named.length) {
    setStatus("Aucun joueur détecté.", false);
    return;
  }
  const n = Math.min(named.length, starters.length);
  const anyGk = named.some((e) => e.gk);
  const anyCaptain = named.some((e) => e.captain);
  for (let i = 0; i < n; i++) {
    const e = named[i];
    if (e.num != null && !isNaN(e.num)) starters[i].num = e.num;
    if (e.name) starters[i].name = e.name;
    if (anyGk) starters[i].gk = !!e.gk;
    if (anyCaptain) starters[i].captain = !!e.captain;
  }
  renderStartersEditor();
  renderPitch();
  saveLineup();
  let msg = `${n} joueur(s) appliqué(s).`;
  if (named.length > starters.length)
    msg += ` ${named.length - starters.length} ignoré(s) (max ${starters.length}).`;
  else if (n < starters.length)
    msg += ` ${starters.length - n} emplacement(s) inchangé(s).`;
  setStatus(msg, true);
}

document.getElementById("l-paste-comp-apply").addEventListener("click", () => {
  const text = document.getElementById("l-paste-comp").value;
  applyParsedComposition(parseLineupComposition(text));
});

// Store a path reference to ./Logos/<filename> instead of an inline data URL
// (avoids hitting the localStorage quota and keeps team saves tiny). The file
// must exist in the project's ./Logos/ folder.
document.getElementById("l-team-logo-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  teamLogoURL = `./Logos/${file.name}`;
  renderTeamLogo();
  saveLineup();
});

document.getElementById("l-team-logo-clear").addEventListener("click", () => {
  teamLogoURL = null;
  document.getElementById("l-team-logo-file").value = "";
  renderTeamLogo();
  saveLineup();
});

document
  .getElementById("l-save-team")
  .addEventListener("click", saveCurrentAsTeam);
document
  .getElementById("l-load-team")
  .addEventListener("click", loadSelectedTeam);
document
  .getElementById("l-delete-team")
  .addEventListener("click", deleteSelectedTeam);

// Sélectionner une sauvegarde (sans la charger) recopie son nom dans le champ
// « nom de sauvegarde » correspondant, pour pouvoir l'écraser facilement.
[
  ["l-saved-team-select", "l-save-team-name"],
  ["l-saved-formation-select", "l-save-formation-name"],
  ["l-saved-style-select", "l-save-style-name"],
  ["l-saved-typo-select", "l-save-typo-name"],
  ["l-saved-kit-select", "l-save-kit-name"],
  ["p-saved-select", "p-save-name"],
].forEach(([selectId, inputId]) => {
  const sel = document.getElementById(selectId);
  const input = document.getElementById(inputId);
  if (!sel || !input) return;
  sel.addEventListener("change", () => {
    const opt = sel.options[sel.selectedIndex];
    if (opt && sel.value !== "") input.value = opt.textContent.trim();
  });
});

document
  .getElementById("l-save-formation")
  .addEventListener("click", saveCurrentAsFormation);
document
  .getElementById("l-load-formation")
  .addEventListener("click", loadSelectedFormation);
document
  .getElementById("l-delete-formation")
  .addEventListener("click", deleteSelectedFormation);
renderSavedFormationsList();

document
  .getElementById("l-save-style")
  .addEventListener("click", saveCurrentAsStyle);
document
  .getElementById("l-load-style")
  .addEventListener("click", loadSelectedStyle);
document
  .getElementById("l-delete-style")
  .addEventListener("click", deleteSelectedStyle);
renderSavedStylesList();

document
  .getElementById("l-save-typo")
  .addEventListener("click", saveCurrentAsTypo);
document
  .getElementById("l-load-typo")
  .addEventListener("click", loadSelectedTypo);
document
  .getElementById("l-delete-typo")
  .addEventListener("click", deleteSelectedTypo);
renderSavedTyposList();

document
  .getElementById("l-save-kit")
  .addEventListener("click", saveCurrentAsKit);
document
  .getElementById("l-load-kit")
  .addEventListener("click", loadSelectedKit);
document
  .getElementById("l-delete-kit")
  .addEventListener("click", deleteSelectedKit);
renderSavedKitsList();

[lTeamSize, lFooterSize, lCoachSize, lPlayerSize].forEach((el) =>
  el.addEventListener("input", () => {
    updateLineupCommon();
    saveLineup();
  }),
);
[
  lTeamFont,
  lTeamWeight,
  lFooterFont,
  lFooterWeight,
  lCoachFont,
  lCoachWeight,
  lPlayerFont,
  lPlayerWeight,
].forEach((el) =>
  el.addEventListener("change", () => {
    updateLineupCommon();
    saveLineup();
  }),
);

/* ----- Export / Import JSON (équipes + formations) ----- */
function collectStorageStateByCategory() {
  const counts = Object.fromEntries(IMPORT_CATEGORIES.map((cat) => [cat, 0]));
  const byCat = Object.fromEntries(IMPORT_CATEGORIES.map((cat) => [cat, {}]));
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith("ucl-")) continue;
    const cat = categorizeStorageKey(k);
    if (!cat) continue;
    byCat[cat][k] = localStorage.getItem(k);
    counts[cat]++;
  }
  return { counts, byCat };
}

function downloadJsonPayload(state, selectedCategories) {
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  const cats = Array.isArray(selectedCategories) ? selectedCategories : [];
  const tag =
    cats.length === 0
      ? "empty"
      : cats.length === IMPORT_CATEGORIES.length
        ? "all"
        : cats.join("-");
  a.download = `ucl-saves-${tag}-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportSavesToJson() {
  const modal = document.getElementById("l-export-modal");
  const { counts, byCat } = collectStorageStateByCategory();
  const activeTab = document.querySelector(".tab.active");
  const activeCategory = activeTab?.dataset.tab === "player"
    ? "banner"
    : activeTab?.dataset.tab;
  const activeBtn = document.getElementById("l-export-modal-active-tab");
  activeBtn.disabled = !counts[activeCategory];
  IMPORT_CATEGORIES.forEach((cat) => {
    const countEl = modal.querySelector(`[data-cat-count="${cat}"]`);
    const cb = modal.querySelector(`input[data-cat="${cat}"]`);
    const wrap = cb ? cb.closest(".import-category") : null;
    if (countEl) countEl.textContent = counts[cat];
    if (cb) {
      cb.checked = counts[cat] > 0;
      cb.disabled = counts[cat] === 0;
    }
    if (wrap) wrap.classList.toggle("import-category-empty", counts[cat] === 0);
  });
  const cancelBtn = document.getElementById("l-export-modal-cancel");
  const confirmBtn = document.getElementById("l-export-modal-confirm");
  const toggleBtn = document.getElementById("l-export-modal-toggle-all");
  const cleanup = () => {
    modal.removeEventListener("close", cleanup);
    cancelBtn.removeEventListener("click", onCancel);
    confirmBtn.removeEventListener("click", onOk);
    toggleBtn.removeEventListener("click", onToggle);
    activeBtn.removeEventListener("click", onExportActive);
  };
  const onCancel = () => {
    cleanup();
    modal.close();
  };
  const onOk = () => {
    const selected = IMPORT_CATEGORIES.filter((cat) => {
      const cb = modal.querySelector(`input[data-cat="${cat}"]`);
      return cb && cb.checked && !cb.disabled;
    });
    if (selected.length === 0) {
      alert("Sélectionne au moins une section à exporter.");
      return;
    }
    cleanup();
    modal.close();
    const state = {};
    selected.forEach((cat) => Object.assign(state, byCat[cat]));
    downloadJsonPayload(state, selected);
  };
  const onToggle = () => {
    const boxes = IMPORT_CATEGORIES.map((cat) =>
      modal.querySelector(`input[data-cat="${cat}"]`),
    ).filter((cb) => cb && !cb.disabled);
    const allChecked = boxes.every((cb) => cb.checked);
    boxes.forEach((cb) => (cb.checked = !allChecked));
  };
  const onExportActive = () => {
    if (!counts[activeCategory]) return;
    cleanup();
    modal.close();
    downloadJsonPayload(byCat[activeCategory], [activeCategory]);
  };
  cancelBtn.addEventListener("click", onCancel);
  confirmBtn.addEventListener("click", onOk);
  toggleBtn.addEventListener("click", onToggle);
  activeBtn.addEventListener("click", onExportActive);
  modal.addEventListener("close", cleanup);
  if (typeof modal.showModal === "function") modal.showModal();
  else modal.setAttribute("open", "");
}

const IMPORT_CATEGORIES = ["lineup", "banner", "score", "shorts", "showdown", "prefs"];
function categorizeStorageKey(key) {
  if (!key || !key.startsWith("ucl-")) return null;
  if (key.startsWith("ucl-lineup-")) return "lineup";
  if (key.startsWith("ucl-banner-") || key.startsWith("ucl-player-"))
    return "banner";
  if (key.startsWith("ucl-score-")) return "score";
  if (key.startsWith("ucl-shorts-")) return "shorts";
  if (key.startsWith("ucl-showdown-")) return "showdown";
  return "prefs";
}

function openImportCategoryModal(entries, onConfirm) {
  const modal = document.getElementById("l-import-modal");
  const counts = Object.fromEntries(IMPORT_CATEGORIES.map((c) => [c, 0]));
  entries.forEach(([k]) => {
    const cat = categorizeStorageKey(k);
    if (cat) counts[cat]++;
  });
  IMPORT_CATEGORIES.forEach((cat) => {
    const countEl = modal.querySelector(`[data-cat-count="${cat}"]`);
    const cb = modal.querySelector(`input[data-cat="${cat}"]`);
    const wrap = cb ? cb.closest(".import-category") : null;
    if (countEl) countEl.textContent = counts[cat];
    if (cb) {
      cb.checked = counts[cat] > 0;
      cb.disabled = counts[cat] === 0;
    }
    if (wrap) wrap.classList.toggle("import-category-empty", counts[cat] === 0);
  });
  const cancelBtn = document.getElementById("l-import-modal-cancel");
  const confirmBtn = document.getElementById("l-import-modal-confirm");
  const toggleBtn = document.getElementById("l-import-modal-toggle-all");
  const cleanup = () => {
    cancelBtn.removeEventListener("click", onCancel);
    confirmBtn.removeEventListener("click", onOk);
    toggleBtn.removeEventListener("click", onToggle);
  };
  const onCancel = () => {
    cleanup();
    modal.close();
  };
  const onOk = () => {
    const selected = new Set(
      IMPORT_CATEGORIES.filter((cat) => {
        const cb = modal.querySelector(`input[data-cat="${cat}"]`);
        return cb && cb.checked && !cb.disabled;
      }),
    );
    if (selected.size === 0) {
      alert("Sélectionne au moins une section à importer.");
      return;
    }
    cleanup();
    modal.close();
    onConfirm(selected);
  };
  const onToggle = () => {
    const boxes = IMPORT_CATEGORIES.map((cat) =>
      modal.querySelector(`input[data-cat="${cat}"]`),
    ).filter((cb) => cb && !cb.disabled);
    const allChecked = boxes.every((cb) => cb.checked);
    boxes.forEach((cb) => (cb.checked = !allChecked));
  };
  cancelBtn.addEventListener("click", onCancel);
  confirmBtn.addEventListener("click", onOk);
  toggleBtn.addEventListener("click", onToggle);
  if (typeof modal.showModal === "function") modal.showModal();
  else modal.setAttribute("open", "");
}

function importSavesFromJson(file) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    let parsed;
    try {
      parsed = JSON.parse(ev.target.result);
    } catch (e) {
      alert("Fichier JSON invalide : " + e.message);
      return;
    }
    if (parsed && typeof parsed.state === "object" && parsed.state) {
      const entries = Object.entries(parsed.state).filter(
        ([k, v]) =>
          typeof k === "string" &&
          k.startsWith("ucl-") &&
          typeof v === "string",
      );
      if (entries.length === 0) {
        alert("Aucune donnée trouvée dans le fichier.");
        return;
      }
      openImportCategoryModal(entries, (selectedCats) => {
        const selectedEntries = entries.filter(([k]) =>
          selectedCats.has(categorizeStorageKey(k)),
        );
        const toRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && selectedCats.has(categorizeStorageKey(k))) toRemove.push(k);
        }
        toRemove.forEach((k) => localStorage.removeItem(k));
        selectedEntries.forEach(([k, v]) => localStorage.setItem(k, v));
        location.reload();
      });
      return;
    }
    const importedTeams = Array.isArray(parsed.teams) ? parsed.teams : [];
    const importedFormations = Array.isArray(parsed.formations)
      ? parsed.formations
      : [];
    const importedStyles = Array.isArray(parsed.styles) ? parsed.styles : [];
    const importedBanners = Array.isArray(parsed.banners) ? parsed.banners : [];
    const importedTypos = Array.isArray(parsed.typos) ? parsed.typos : [];
    const importedShowdowns = Array.isArray(parsed.showdowns)
      ? parsed.showdowns
      : [];
    const importedShowdownTypos = Array.isArray(parsed.showdownTypos)
      ? parsed.showdownTypos
      : [];
    const importedShowdownBgs = Array.isArray(parsed.showdownBgs)
      ? parsed.showdownBgs
      : [];
    const totalCount =
      importedTeams.length +
      importedFormations.length +
      importedStyles.length +
      importedBanners.length +
      importedTypos.length +
      importedShowdowns.length +
      importedShowdownTypos.length +
      importedShowdownBgs.length;
    if (totalCount === 0) {
      alert("Aucune donnée trouvée dans le fichier.");
      return;
    }
    const msg = `Importer ${importedTeams.length} équipe(s), ${importedFormations.length} formation(s), ${importedStyles.length} style(s), ${importedBanners.length} bannière(s), ${importedTypos.length} typo(s), ${importedShowdowns.length} showdown(s), ${importedShowdownTypos.length} typo showdown(s) et ${importedShowdownBgs.length} fond showdown(s) ?\n\nLes entrées avec le même nom seront écrasées par celles du fichier.`;
    if (!confirm(msg)) return;
    const teams = getSavedTeams();
    importedTeams.forEach((t) => {
      if (!t || typeof t.name !== "string") return;
      const i = teams.findIndex((x) => x.name === t.name);
      if (i >= 0) teams[i] = t;
      else teams.push(t);
    });
    setSavedTeams(teams);
    const formations = getSavedFormations();
    importedFormations.forEach((f) => {
      if (!f || typeof f.name !== "string") return;
      const i = formations.findIndex((x) => x.name === f.name);
      if (i >= 0) formations[i] = f;
      else formations.push(f);
    });
    setSavedFormations(formations);
    const styles = getSavedStyles();
    importedStyles.forEach((s) => {
      if (!s || typeof s.name !== "string") return;
      const i = styles.findIndex((x) => x.name === s.name);
      if (i >= 0) styles[i] = s;
      else styles.push(s);
    });
    setSavedStyles(styles);
    const banners = getSavedBanners();
    importedBanners.forEach((b) => {
      if (!b || typeof b.name !== "string") return;
      const i = banners.findIndex((x) => x.name === b.name);
      if (i >= 0) banners[i] = b;
      else banners.push(b);
    });
    setSavedBanners(banners);
    const typos = getSavedTypos();
    importedTypos.forEach((t) => {
      if (!t || typeof t.name !== "string") return;
      const i = typos.findIndex((x) => x.name === t.name);
      if (i >= 0) typos[i] = t;
      else typos.push(t);
    });
    setSavedTypos(typos);
    const mergeList = (existing, incoming) => {
      incoming.forEach((item) => {
        if (!item || typeof item.name !== "string") return;
        const i = existing.findIndex((x) => x.name === item.name);
        if (i >= 0) existing[i] = item;
        else existing.push(item);
      });
      return existing;
    };
    sdShowdownCRUD.set(mergeList(sdShowdownCRUD.get(), importedShowdowns));
    sdTypoCRUD.set(mergeList(sdTypoCRUD.get(), importedShowdownTypos));
    sdBgCRUD.set(mergeList(sdBgCRUD.get(), importedShowdownBgs));
    renderSavedTeamsList();
    renderSavedFormationsList();
    renderSavedStylesList();
    renderSavedBannersList();
    renderSavedTyposList();
    renderSavedKitsList();
    sdShowdownCRUD.render();
    sdTypoCRUD.render();
    sdBgCRUD.render();
    alert(
      `Import terminé : ${importedTeams.length} équipe(s), ${importedFormations.length} formation(s), ${importedStyles.length} style(s), ${importedBanners.length} bannière(s), ${importedTypos.length} typo(s), ${importedShowdowns.length} showdown(s), ${importedShowdownTypos.length} typo SD et ${importedShowdownBgs.length} fond SD.`,
    );
  };
  reader.readAsText(file);
}

function clearSavesByCategory() {
  const modal = document.getElementById("l-clear-modal");
  const { counts } = collectStorageStateByCategory();
  IMPORT_CATEGORIES.forEach((cat) => {
    const countEl = modal.querySelector(`[data-cat-count="${cat}"]`);
    const cb = modal.querySelector(`input[data-cat="${cat}"]`);
    const wrap = cb ? cb.closest(".import-category") : null;
    if (countEl) countEl.textContent = counts[cat];
    if (cb) {
      cb.checked = false;
      cb.disabled = counts[cat] === 0;
    }
    if (wrap) wrap.classList.toggle("import-category-empty", counts[cat] === 0);
  });
  const cancelBtn = document.getElementById("l-clear-modal-cancel");
  const confirmBtn = document.getElementById("l-clear-modal-confirm");
  const toggleBtn = document.getElementById("l-clear-modal-toggle-all");
  const cleanup = () => {
    cancelBtn.removeEventListener("click", onCancel);
    confirmBtn.removeEventListener("click", onOk);
    toggleBtn.removeEventListener("click", onToggle);
  };
  const onCancel = () => {
    cleanup();
    modal.close();
  };
  const onOk = () => {
    const selected = new Set(
      IMPORT_CATEGORIES.filter((cat) => {
        const cb = modal.querySelector(`input[data-cat="${cat}"]`);
        return cb && cb.checked && !cb.disabled;
      }),
    );
    if (selected.size === 0) {
      alert("Sélectionne au moins une section à supprimer.");
      return;
    }
    const labels = {
      lineup: "Lineup",
      banner: "Goal Scoreboard",
      score: "Live Score",
      shorts: "Shorts",
      showdown: "Showdown",
      prefs: "Préférences",
    };
    const names = [...selected].map((c) => labels[c]).join(", ");
    if (
      !confirm(
        `Supprimer toutes les sauvegardes locales de : ${names} ?\n\n` +
          `Cette action est irréversible. La page sera rechargée.`,
      )
    )
      return;
    cleanup();
    modal.close();
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && selected.has(categorizeStorageKey(k))) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
    location.reload();
  };
  const onToggle = () => {
    const boxes = IMPORT_CATEGORIES.map((cat) =>
      modal.querySelector(`input[data-cat="${cat}"]`),
    ).filter((cb) => cb && !cb.disabled);
    const allChecked = boxes.every((cb) => cb.checked);
    boxes.forEach((cb) => (cb.checked = !allChecked));
  };
  cancelBtn.addEventListener("click", onCancel);
  confirmBtn.addEventListener("click", onOk);
  toggleBtn.addEventListener("click", onToggle);
  if (typeof modal.showModal === "function") modal.showModal();
  else modal.setAttribute("open", "");
}

document
  .getElementById("l-export-json")
  .addEventListener("click", exportSavesToJson);
document.getElementById("l-import-json-btn").addEventListener("click", () => {
  document.getElementById("l-import-json-file").click();
});
document
  .getElementById("l-import-json-file")
  .addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importSavesFromJson(file);
    e.target.value = "";
  });
document
  .getElementById("l-clear-json-btn")
  .addEventListener("click", clearSavesByCategory);

/* Toggle grille d'alignement */
const GRID_PREF_KEY = "ucl-lineup-grid-v1";
const gridCheckbox = document.getElementById("l-show-grid");
gridCheckbox.checked = localStorage.getItem(GRID_PREF_KEY) === "1";
document
  .getElementById("lb-pitch")
  .classList.toggle("show-grid", gridCheckbox.checked);
gridCheckbox.addEventListener("change", () => {
  document
    .getElementById("lb-pitch")
    .classList.toggle("show-grid", gridCheckbox.checked);
  localStorage.setItem(GRID_PREF_KEY, gridCheckbox.checked ? "1" : "0");
});

/* Toggle terrain rayé */
const STRIPES_PREF_KEY = "ucl-lineup-stripes-v1";
const STRIPES_FADE_DIR_KEY = "ucl-lineup-stripes-fade-dir-v1";
const STRIPES_WIDTH_KEY = "ucl-lineup-stripes-width-v1";
const stripesCheckbox = document.getElementById("l-pitch-stripes");
const stripesFadeDir = document.getElementById("l-stripes-fade-dir");
const stripesWidth = document.getElementById("l-stripes-width");
const stripesWidthValue = document.getElementById("l-stripes-width-value");
stripesCheckbox.checked = localStorage.getItem(STRIPES_PREF_KEY) === "1";
const savedStripesFadeDir = localStorage.getItem(STRIPES_FADE_DIR_KEY);
if (savedStripesFadeDir) stripesFadeDir.value = savedStripesFadeDir;
const savedStripesWidth = localStorage.getItem(STRIPES_WIDTH_KEY);
if (savedStripesWidth != null) stripesWidth.value = savedStripesWidth;
document
  .getElementById("lb-pitch")
  .classList.toggle("show-stripes", stripesCheckbox.checked);

function applyStripesFade() {
  const grad = document.getElementById("pitch-stripes-fade");
  if (!grad) return;
  const widthPct = +stripesWidth.value;
  const widthPx = (widthPct / 100) * 1060;
  if (stripesWidthValue) stripesWidthValue.textContent = widthPct + "%";

  const dir = stripesFadeDir.value;
  const leftAlign = dir === "right";
  const stripeX = leftAlign ? 0 : 1060 - widthPx;

  document.querySelectorAll(".lb-pitch-stripes rect").forEach((r) => {
    r.setAttribute("x", stripeX);
    r.setAttribute("width", widthPx);
  });

  let gx1, gy1, gx2, gy2;
  if (dir === "left") {
    gx1 = 1060;
    gy1 = 0;
    gx2 = 1060 - widthPx;
    gy2 = 0;
  } else if (dir === "right") {
    gx1 = 0;
    gy1 = 0;
    gx2 = widthPx;
    gy2 = 0;
  } else if (dir === "bottom") {
    gx1 = 0;
    gy1 = 0;
    gx2 = 0;
    gy2 = 450;
  } else {
    gx1 = 0;
    gy1 = 450;
    gx2 = 0;
    gy2 = 0;
  }
  grad.setAttribute("x1", gx1);
  grad.setAttribute("y1", gy1);
  grad.setAttribute("x2", gx2);
  grad.setAttribute("y2", gy2);

  const stops = grad.querySelectorAll("stop");
  if (stops[0]) stops[0].setAttribute("offset", "0%");
  if (stops[1]) stops[1].setAttribute("offset", "100%");
}
applyStripesFade();

stripesCheckbox.addEventListener("change", () => {
  document
    .getElementById("lb-pitch")
    .classList.toggle("show-stripes", stripesCheckbox.checked);
  localStorage.setItem(STRIPES_PREF_KEY, stripesCheckbox.checked ? "1" : "0");
});
stripesFadeDir.addEventListener("change", () => {
  localStorage.setItem(STRIPES_FADE_DIR_KEY, stripesFadeDir.value);
  applyStripesFade();
});
stripesWidth.addEventListener("input", () => {
  localStorage.setItem(STRIPES_WIDTH_KEY, stripesWidth.value);
  applyStripesFade();
});

/* Toggle ligne séparation teal (header / pitch) */
const DIVIDER_PREF_KEY = "ucl-lineup-divider-v1";
const DIVIDER_THICKNESS_KEY = "ucl-lineup-divider-thickness-v1";
const DIVIDER_COLOR1_KEY = "ucl-lineup-divider-color1-v1";
const DIVIDER_COLOR2_KEY = "ucl-lineup-divider-color2-v1";
const dividerCheckbox = document.getElementById("l-divider-toggle");
const dividerThickness = document.getElementById("l-divider-thickness");
const dividerThicknessValue = document.getElementById(
  "l-divider-thickness-value",
);
const dividerColor1 = document.getElementById("l-divider-color-1");
const dividerColor2 = document.getElementById("l-divider-color-2");
dividerCheckbox.checked = localStorage.getItem(DIVIDER_PREF_KEY) === "1";
const savedDividerThickness = parseInt(
  localStorage.getItem(DIVIDER_THICKNESS_KEY),
  10,
);
if (!isNaN(savedDividerThickness))
  dividerThickness.value = savedDividerThickness;
const savedDividerColor1 = localStorage.getItem(DIVIDER_COLOR1_KEY);
if (savedDividerColor1) dividerColor1.value = savedDividerColor1;
const savedDividerColor2 = localStorage.getItem(DIVIDER_COLOR2_KEY);
if (savedDividerColor2) dividerColor2.value = savedDividerColor2;
function applyDivider() {
  const board = document.getElementById("lineup-board");
  const divider = document.getElementById("lb-divider");
  const penalty = document.getElementById("lb-pitch-penalty");
  const stop1 = document.getElementById("penalty-stop-1");
  const stop2 = document.getElementById("penalty-stop-2");
  if (!board || !divider) return;
  board.classList.toggle("show-divider", dividerCheckbox.checked);
  divider.style.height = dividerThickness.value + "px";
  const topLine = document.getElementById("lb-top-line");
  if (topLine) topLine.style.height = dividerThickness.value + "px";
  board.style.setProperty("--divider-color-1", dividerColor1.value);
  board.style.setProperty("--divider-color-2", dividerColor2.value);
  if (stop1) stop1.setAttribute("stop-color", dividerColor1.value);
  const stop1b = document.getElementById("penalty-stop-1b");
  const stop2a = document.getElementById("penalty-stop-2a");
  if (stop1b) stop1b.setAttribute("stop-color", dividerColor1.value);
  if (stop2a) stop2a.setAttribute("stop-color", dividerColor2.value);
  if (stop2) stop2.setAttribute("stop-color", dividerColor2.value);
  if (penalty) penalty.setAttribute("stroke-width", dividerThickness.value);
  if (dividerThicknessValue)
    dividerThicknessValue.textContent = dividerThickness.value + "px";
}
applyDivider();
dividerCheckbox.addEventListener("change", () => {
  localStorage.setItem(DIVIDER_PREF_KEY, dividerCheckbox.checked ? "1" : "0");
  applyDivider();
});
dividerThickness.addEventListener("input", () => {
  localStorage.setItem(DIVIDER_THICKNESS_KEY, dividerThickness.value);
  applyDivider();
});
dividerColor1.addEventListener("input", () => {
  localStorage.setItem(DIVIDER_COLOR1_KEY, dividerColor1.value);
  applyDivider();
});
dividerColor2.addEventListener("input", () => {
  localStorage.setItem(DIVIDER_COLOR2_KEY, dividerColor2.value);
  applyDivider();
});

/* Toggle image de fond du terrain + sélecteur d'image */
const BG_IMAGE_PREF_KEY = "ucl-lineup-bg-image-v1";
const BG_IMAGE_FILE_KEY = "ucl-lineup-bg-image-file-v1";
function applyBgImage() {
  const checkbox = document.getElementById("l-bg-image-toggle");
  const select = document.getElementById("l-bg-image-select");
  const board = document.getElementById("lineup-board");
  const imgDiv = document.getElementById("lb-bg-image");
  if (!checkbox || !board || !imgDiv || !select) return;
  const opSlider = document.getElementById("l-bg-image-opacity");
  const opValueSpan = document.getElementById("l-bg-image-opacity-value");
  const fadeToggle = document.getElementById("l-bg-image-fade-toggle");
  const fadeDir = document.getElementById("l-bg-image-fade-dir");
  const fadeEnd = document.getElementById("l-bg-image-fade-end");
  const fadeEndSpan = document.getElementById("l-bg-image-fade-end-value");

  const imgOpacity = +opSlider.value / 100;
  if (opValueSpan) opValueSpan.textContent = opSlider.value + "%";
  const fadeEndRatio = +fadeEnd.value / 100;
  if (fadeEndSpan) fadeEndSpan.textContent = fadeEnd.value + "%";

  const hasFile = !!select.value;
  board.classList.toggle("has-bg-image", checkbox.checked && hasFile);
  imgDiv.style.backgroundImage = hasFile ? `url('./${select.value}')` : "none";
  imgDiv.style.opacity = imgOpacity;

  if (fadeToggle.checked) {
    const dirMap = {
      right: "to right",
      left: "to left",
      bottom: "to bottom",
      top: "to top",
    };
    const dir = dirMap[fadeDir.value] || "to right";
    const grad = `linear-gradient(${dir}, rgba(0,0,0,1), rgba(0,0,0,${fadeEndRatio}))`;
    imgDiv.style.maskImage = grad;
    imgDiv.style.webkitMaskImage = grad;
  } else {
    imgDiv.style.maskImage = "";
    imgDiv.style.webkitMaskImage = "";
  }
}
const bgImageCheckbox = document.getElementById("l-bg-image-toggle");
const bgImageSelect = document.getElementById("l-bg-image-select");
bgImageCheckbox.checked = localStorage.getItem(BG_IMAGE_PREF_KEY) === "1";
const savedBgFile = localStorage.getItem(BG_IMAGE_FILE_KEY);
if (
  savedBgFile &&
  [...bgImageSelect.options].some((o) => o.value === savedBgFile)
) {
  bgImageSelect.value = savedBgFile;
}
applyBgImage();
bgImageCheckbox.addEventListener("change", () => {
  localStorage.setItem(BG_IMAGE_PREF_KEY, bgImageCheckbox.checked ? "1" : "0");
  applyBgImage();
});
bgImageSelect.addEventListener("change", () => {
  localStorage.setItem(BG_IMAGE_FILE_KEY, bgImageSelect.value);
  applyBgImage();
});

/* Opacité image + fade gradient persistance */
const BG_IMAGE_OPACITY_KEY = "ucl-lineup-bg-image-opacity-v1";
const BG_IMAGE_FADE_KEY = "ucl-lineup-bg-image-fade-v1";
const BG_IMAGE_FADE_DIR_KEY = "ucl-lineup-bg-image-fade-dir-v1";
const BG_IMAGE_FADE_END_KEY = "ucl-lineup-bg-image-fade-end-v1";
const bgImageOpacity = document.getElementById("l-bg-image-opacity");
const bgImageFadeToggle = document.getElementById("l-bg-image-fade-toggle");
const bgImageFadeDir = document.getElementById("l-bg-image-fade-dir");
const bgImageFadeEnd = document.getElementById("l-bg-image-fade-end");
const savedImgOp = localStorage.getItem(BG_IMAGE_OPACITY_KEY);
if (savedImgOp != null) bgImageOpacity.value = savedImgOp;
bgImageFadeToggle.checked = localStorage.getItem(BG_IMAGE_FADE_KEY) === "1";
const savedFadeDir = localStorage.getItem(BG_IMAGE_FADE_DIR_KEY);
if (savedFadeDir) bgImageFadeDir.value = savedFadeDir;
const savedFadeEnd = localStorage.getItem(BG_IMAGE_FADE_END_KEY);
if (savedFadeEnd != null) bgImageFadeEnd.value = savedFadeEnd;
bgImageOpacity.addEventListener("input", () => {
  localStorage.setItem(BG_IMAGE_OPACITY_KEY, bgImageOpacity.value);
  applyBgImage();
});
bgImageFadeToggle.addEventListener("change", () => {
  localStorage.setItem(
    BG_IMAGE_FADE_KEY,
    bgImageFadeToggle.checked ? "1" : "0",
  );
  applyBgImage();
});
bgImageFadeDir.addEventListener("change", () => {
  localStorage.setItem(BG_IMAGE_FADE_DIR_KEY, bgImageFadeDir.value);
  applyBgImage();
});
bgImageFadeEnd.addEventListener("input", () => {
  localStorage.setItem(BG_IMAGE_FADE_END_KEY, bgImageFadeEnd.value);
  applyBgImage();
});
applyBgImage();

/* ============================================================
   3) SCORE BANNER
   ============================================================ */
const sHome = document.getElementById("s-home");
const sHomeScore = document.getElementById("s-home-score");
const sHomeColor = document.getElementById("s-home-color");
const sHomeColor2 = document.getElementById("s-home-color-2");
const sTimerToggle = document.getElementById("s-timer-toggle");
const sAway = document.getElementById("s-away");
const sAwayScore = document.getElementById("s-away-score");
const sAwayColor = document.getElementById("s-away-color");
const sAwayColor2 = document.getElementById("s-away-color-2");
const sBg = document.getElementById("s-bg");
const sTeamGap = document.getElementById("s-team-gap");
const sTeamGapValue = document.getElementById("s-team-gap-value");
const S_TEAM_GAP_KEY = "ucl-score-team-gap-v1";
sTeamGap.value = localStorage.getItem(S_TEAM_GAP_KEY) ?? sTeamGap.defaultValue;
const sChevronToggle = document.getElementById("s-chevron-toggle");
const sChevronSideColor = document.getElementById("s-chevron-side-color");
const sChevronColor = document.getElementById("s-chevron-color");
const S_CHEVRON_KEY = "ucl-score-chevron-v1";
const S_CHEVRON_SIDE_COLOR_KEY = "ucl-score-chevron-side-color-v1";
const S_CHEVRON_COLOR_KEY = "ucl-score-chevron-color-v1";
sChevronToggle.checked = localStorage.getItem(S_CHEVRON_KEY) === "1";
sChevronSideColor.value =
  localStorage.getItem(S_CHEVRON_SIDE_COLOR_KEY) || sChevronSideColor.defaultValue;
sChevronColor.value =
  localStorage.getItem(S_CHEVRON_COLOR_KEY) || sChevronColor.defaultValue;
const sTimerBg = document.getElementById("s-timer-bg");
const S_TIMER_BG_KEY = "ucl-score-timer-bg-v1";
let timerBg = localStorage.getItem(S_TIMER_BG_KEY);
const sBgOpacity = document.getElementById("s-bg-opacity");
const sBgOpacityValue = document.getElementById("s-bg-opacity-value");
const sBallBoxColor = document.getElementById("s-ball-box-color");
const sBallColor = document.getElementById("s-ball-color");
const sLeftLogo = document.getElementById("s-left-logo");
const sLeftLogoSize = document.getElementById("s-left-logo-size");
const sLeftLogoSizeValue = document.getElementById("s-left-logo-size-value");
const sBandWidth = document.getElementById("s-band-width");
const sBandWidthValue = document.getElementById("s-band-width-value");
const sTrophyLogo = document.getElementById("s-trophy-logo");
const sTrophyColor = document.getElementById("s-trophy-color");
const sTrophyWhiteToggle = document.getElementById("s-trophy-white-toggle");
const sTrophySize = document.getElementById("s-trophy-size");
const sTrophySizeValue = document.getElementById("s-trophy-size-value");
const sTeamFont = document.getElementById("s-team-font");
const sTeamSize = document.getElementById("s-team-size");
const sTeamSizeValue = document.getElementById("s-team-size-value");
const sTeamWeight = document.getElementById("s-team-weight");
const sScoreFont = document.getElementById("s-score-font");
const sScoreSize = document.getElementById("s-score-size");
const sScoreSizeValue = document.getElementById("s-score-size-value");
const sScoreWeight = document.getElementById("s-score-weight");
const sAggregateToggle = document.getElementById("s-aggregate-toggle");
const sAggregateHome = document.getElementById("s-aggregate-home");
const sAggregateAway = document.getElementById("s-aggregate-away");
const liveScorePairs = [
  { match: sHomeScore, aggregate: sAggregateHome },
  { match: sAwayScore, aggregate: sAggregateAway },
];
const sPenaltyToggle = document.getElementById("s-penalty-toggle");
const sPenaltyColor = document.getElementById("s-penalty-color");
let sPenaltyHomeShots = [];
let sPenaltyAwayShots = [];
const SCORE_PENALTY_SHOTS_PER_ROW = 5;
const SCORE_PENALTY_SHOT_SIZE = 25.5;
const SCORE_PENALTY_SHOT_GAP = 3;
const SCORE_PENALTY_TEAM_PADDING = 10;
const SCORE_PENALTY_MIN_TEAM_WIDTH = Math.ceil(
  2 * SCORE_PENALTY_TEAM_PADDING +
    SCORE_PENALTY_SHOTS_PER_ROW * SCORE_PENALTY_SHOT_SIZE +
    (SCORE_PENALTY_SHOTS_PER_ROW - 1) * SCORE_PENALTY_SHOT_GAP,
);

const S_FONTS = {
  condensed: "'Barlow Condensed', 'Archivo Narrow', 'Arial Narrow', sans-serif",
  system:
    "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, sans-serif",
  cinzel: "'Cinzel', 'Trajan Pro', serif",
  arial: "Arial, Helvetica, sans-serif",
  impact: "Impact, 'Arial Black', 'Helvetica Inserat', sans-serif",
  mono: "'Courier New', Courier, monospace",
};

function updateScoreBanner() {
  for (const pair of liveScorePairs) pair.previous = Number(pair.match.value);
  document
    .getElementById("score-banner")
    .classList.toggle("show-timer", sTimerToggle.checked);
  document.getElementById("sb-home").textContent = sHome.value;
  document.getElementById("sb-home-score").textContent = sHomeScore.value;
  document.getElementById("sb-away").textContent = sAway.value;
  document.getElementById("sb-away-score").textContent = sAwayScore.value;
  document.getElementById("s-penalty-home-label").textContent = sHome.value;
  document.getElementById("s-penalty-away-label").textContent = sAway.value;
  renderPenaltyShots("sb-penalty-home-shots", sPenaltyHomeShots);
  renderPenaltyShots("sb-penalty-away-shots", sPenaltyAwayShots);
  document.getElementById("s-penalty-home-undo").disabled =
    sPenaltyHomeShots.length === 0;
  document.getElementById("s-penalty-away-undo").disabled =
    sPenaltyAwayShots.length === 0;
  document.getElementById("s-penalty-reset").disabled =
    sPenaltyHomeShots.length === 0 && sPenaltyAwayShots.length === 0;
  document.getElementById("sb-home-color").style.background =
    `linear-gradient(to bottom, ${sHomeColor.value} 0 50%, ${sHomeColor2.value} 50% 100%)`;
  document.getElementById("sb-away-color").style.background =
    `linear-gradient(to bottom, ${sAwayColor.value} 0 50%, ${sAwayColor2.value} 50% 100%)`;
  document.querySelectorAll(".sb-penalty-team").forEach((el) => {
    el.style.background = sPenaltyColor.value;
  });
  document.getElementById("sb-ball-box").style.background = sBallBoxColor.value;
  document.getElementById("sb-ball").style.backgroundColor = sBallColor.value;
  const bandPx = sBandWidth.value + "px";
  document.getElementById("sb-home-color").style.width = bandPx;
  document.getElementById("sb-away-color").style.width = bandPx;
  if (sBandWidthValue) sBandWidthValue.textContent = sBandWidth.value + "px";

  const ballEl = document.getElementById("sb-ball");
  const leftLogoSize = sLeftLogoSize.value + "px";
  ballEl.style.width = leftLogoSize;
  ballEl.style.height = leftLogoSize;
  if (sLeftLogoSizeValue)
    sLeftLogoSizeValue.textContent = sLeftLogoSize.value + "px";
  const isBallLogo = sLeftLogo.value === "ucl";
  const leftLogoImage = {
    uefa: 'url("./Logos/UEFA_Logo.png")',
    fifa100: 'url("./Logos/FIFA_100_Logo.png")',
    euro84: 'url("./Logos/euro_84_logo.png")',
  }[sLeftLogo.value];
  ballEl.style.maskImage = isBallLogo ? 'url("./Logos/ucl_ball.png")' : "none";
  ballEl.style.webkitMaskImage = ballEl.style.maskImage;
  ballEl.style.backgroundImage = leftLogoImage || "none";
  ballEl.style.backgroundSize = "contain";
  ballEl.style.backgroundPosition = "center";
  ballEl.style.backgroundRepeat = "no-repeat";
  ballEl.style.backgroundColor = isBallLogo ? sBallColor.value : "transparent";
  document.getElementById("s-ball-color").disabled = !isBallLogo;

  const trophyEl = document.querySelector("#score-banner .sb-trophy");
  if (trophyEl) {
    const tPx = sTrophySize.value + "px";
    trophyEl.style.width = tPx;
    trophyEl.style.height = tPx;
    const trophyWhite = sTrophyWhiteToggle.checked;
    const trophyImage = `url("./Logos/${sTrophyLogo.value}")`;
    trophyEl.style.maskImage = trophyWhite ? trophyImage : "none";
    trophyEl.style.webkitMaskImage = trophyWhite ? trophyImage : "none";
    trophyEl.style.backgroundImage = trophyWhite ? "none" : trophyImage;
    trophyEl.style.backgroundSize = "contain";
    trophyEl.style.backgroundPosition = "center";
    trophyEl.style.backgroundRepeat = "no-repeat";
    trophyEl.style.backgroundColor = trophyWhite
      ? sTrophyColor.value
      : "transparent";
  }
  if (sTrophySizeValue) sTrophySizeValue.textContent = sTrophySize.value + "px";

  const teamFont = S_FONTS[sTeamFont.value] || S_FONTS.condensed;
  ["sb-home", "sb-away"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.style.fontFamily = teamFont;
      el.style.fontSize = sTeamSize.value + "px";
      el.style.fontWeight = sTeamWeight.value;
    }
  });
  if (sTeamSizeValue) sTeamSizeValue.textContent = sTeamSize.value + "px";

  const scoreFont = S_FONTS[sScoreFont.value] || S_FONTS.condensed;
  ["sb-home-score", "sb-away-score", "sb-aggregate"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.style.fontFamily = scoreFont;
      el.style.fontSize = sScoreSize.value + "px";
      el.style.fontWeight = sScoreWeight.value;
    }
  });
  if (sScoreSizeValue) sScoreSizeValue.textContent = sScoreSize.value + "px";
  const bgAlpha = +sBgOpacity.value / 100;
  const bgRgba = hexToRgba(sBg.value, bgAlpha);
  const scoreboard = document.querySelector("#score-banner .sb-scoreboard");
  const teamGap = sTeamGap.value + "px";
  scoreboard.style.setProperty("--score-team-gap", teamGap);
  sTeamGapValue.textContent = sTeamGap.value + " px";
  scoreboard.classList.toggle("show-chevrons", sChevronToggle.checked);
  scoreboard.style.setProperty("--score-bg-opacity", bgAlpha);
  scoreboard.style.setProperty("--score-center-bg", bgRgba);
  scoreboard.style.setProperty("--score-chevron-color", sChevronColor.value);
  scoreboard.style.setProperty(
    "--score-side-bg",
    hexToRgba(sChevronSideColor.value, bgAlpha),
  );
  if (sBgOpacityValue) sBgOpacityValue.textContent = sBgOpacity.value + "%";
  document
    .querySelectorAll(
      "#score-banner .sb-team, #score-banner .sb-score, #score-banner .sb-sep",
    )
    .forEach((el) => {
      el.style.backgroundColor =
        sChevronToggle.checked && el.classList.contains("sb-team")
          ? "transparent"
          : bgRgba;
    });
  const timer = document.getElementById("sb-timer");
  sTimerBg.value = timerBg || sBg.value;
  timer.style.background = hexToRgba(sTimerBg.value, bgAlpha);
  timer.style.fontFamily = scoreFont;
  timer.style.fontSize = sScoreSize.value + "px";
  timer.style.fontWeight = sScoreWeight.value;

  const wrap = document.getElementById("score-banner-wrap");
  const aggregateEl = document.getElementById("sb-aggregate");
  if (wrap && aggregateEl) {
    wrap.classList.toggle("show-aggregate", !!sAggregateToggle.checked);
    wrap.classList.toggle("show-penalties", !!sPenaltyToggle.checked);
    aggregateEl.textContent = `( ${sAggregateHome.value} - ${sAggregateAway.value} )`;
  }
  if (wrap) {
    const scoreboardRect = document
      .querySelector("#score-banner .sb-scoreboard")
      .getBoundingClientRect();
    const separatorRect = document
      .querySelector("#score-banner .sb-sep")
      .getBoundingClientRect();
    const homePenaltyWidth = Math.max(
      SCORE_PENALTY_MIN_TEAM_WIDTH,
      separatorRect.left - scoreboardRect.left,
    );
    const awayPenaltyWidth = Math.max(
      SCORE_PENALTY_MIN_TEAM_WIDTH,
      scoreboardRect.right - separatorRect.right,
    );
    const penaltyGridWidth =
      homePenaltyWidth + separatorRect.width + awayPenaltyWidth;
    const bannerRect = document
      .getElementById("score-banner")
      .getBoundingClientRect();
    const penaltyOffset =
      scoreboardRect.left -
      bannerRect.left +
      (scoreboardRect.width - penaltyGridWidth) / 2;
    wrap.style.setProperty(
      "--sb-penalty-grid-columns",
      `${homePenaltyWidth}px ${separatorRect.width}px ${awayPenaltyWidth}px`,
    );
    wrap.style.setProperty("--sb-penalty-grid-width", `${penaltyGridWidth}px`);
    document
      .getElementById("sb-penalty-score")
      .style.setProperty("--sb-penalty-offset", `${penaltyOffset}px`);
  }
}

function renderPenaltyShots(containerId, shots) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.replaceChildren(
    ...shots.map((scored, index) => {
      const marker = document.createElement("span");
      marker.className = `sb-penalty-shot ${scored ? "is-goal" : "is-miss"}`;
      marker.setAttribute(
        "aria-label",
        `Tir ${index + 1} : ${scored ? "réussi" : "manqué"}`,
      );
      return marker;
    }),
  );
}

function addPenaltyShot(shots, scored) {
  shots.push(scored);
  updateScoreBanner();
}

[
  sHome,
  sHomeColor,
  sHomeColor2,
  sAway,
  sAwayColor,
  sAwayColor2,
  sBg,
  sBgOpacity,
  sBallBoxColor,
  sBallColor,
  sLeftLogoSize,
  sBandWidth,
  sTrophyColor,
  sTrophySize,
  sTeamSize,
  sScoreSize,
  sAggregateHome,
  sAggregateAway,
  sPenaltyColor,
].forEach((el) => el.addEventListener("input", updateScoreBanner));
for (const pair of liveScorePairs) {
  const updateMatchScore = () => {
    const difference = Number(pair.match.value) - pair.previous;
    if (difference) {
      pair.aggregate.value = Math.max(0, Number(pair.aggregate.value) + difference);
    }
    updateScoreBanner();
  };
  pair.match.addEventListener("input", updateMatchScore);
  pair.match.addEventListener("change", updateMatchScore);
}
[
  sLeftLogo,
  sTeamFont,
  sTeamWeight,
  sScoreFont,
  sScoreWeight,
  sAggregateToggle,
  sPenaltyToggle,
].forEach((el) => el.addEventListener("change", updateScoreBanner));
updateScoreBanner();

document
  .getElementById("s-penalty-home-goal")
  .addEventListener("click", () => addPenaltyShot(sPenaltyHomeShots, true));
document
  .getElementById("s-penalty-home-miss")
  .addEventListener("click", () => addPenaltyShot(sPenaltyHomeShots, false));
document
  .getElementById("s-penalty-away-goal")
  .addEventListener("click", () => addPenaltyShot(sPenaltyAwayShots, true));
document
  .getElementById("s-penalty-away-miss")
  .addEventListener("click", () => addPenaltyShot(sPenaltyAwayShots, false));
document.getElementById("s-penalty-home-undo").addEventListener("click", () => {
  sPenaltyHomeShots.pop();
  updateScoreBanner();
});
document.getElementById("s-penalty-away-undo").addEventListener("click", () => {
  sPenaltyAwayShots.pop();
  updateScoreBanner();
});
document.getElementById("s-penalty-reset").addEventListener("click", () => {
  sPenaltyHomeShots = [];
  sPenaltyAwayShots = [];
  updateScoreBanner();
});

const sSwapTeams = document.getElementById("s-swap-teams");
if (sSwapTeams) {
  sSwapTeams.addEventListener("click", () => {
    const pairs = [
      [sHome, sAway],
      [sHomeColor, sAwayColor],
      [sHomeColor2, sAwayColor2],
    ];
    pairs.forEach(([a, b]) => {
      const tmp = a.value;
      a.value = b.value;
      b.value = tmp;
    });
    sAggregateHome.value = Number(sAwayScore.value);
    sAggregateAway.value = Number(sHomeScore.value);
    sHomeScore.value = 0;
    sAwayScore.value = 0;
    [sPenaltyHomeShots, sPenaltyAwayShots] = [
      sPenaltyAwayShots,
      sPenaltyHomeShots,
    ];
    sAggregateToggle.checked = true;
    sAggregateToggle.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

/* ----- Score banner background image ----- */
const S_BG_IMAGE_PREF_KEY = "ucl-score-bg-image-v1";
const S_BG_IMAGE_FILE_KEY = "ucl-score-bg-image-file-v1";
const S_BG_IMAGE_OPACITY_KEY = "ucl-score-bg-image-opacity-v1";
const S_BG_IMAGE_FADE_KEY = "ucl-score-bg-image-fade-v1";
const S_BG_IMAGE_FADE_DIR_KEY = "ucl-score-bg-image-fade-dir-v1";
const S_BG_IMAGE_FADE_END_KEY = "ucl-score-bg-image-fade-end-v1";
const S_BALL_BOX_COLOR_KEY = "ucl-score-ball-box-color-v1";
const S_BALL_COLOR_KEY = "ucl-score-ball-color-v1";
const S_PENALTY_COLOR_KEY = "ucl-score-penalty-color-v1";
const S_LEFT_LOGO_KEY = "ucl-score-left-logo-v1";
const S_LEFT_LOGO_SIZE_KEY = "ucl-score-left-logo-size-v1";
const S_BG_OPACITY_KEY = "ucl-score-bg-opacity-v1";
const S_BAND_WIDTH_KEY = "ucl-score-band-width-v1";
const S_TROPHY_COLOR_KEY = "ucl-score-trophy-color-v1";
const S_TROPHY_WHITE_KEY = "ucl-score-trophy-white-v1";
const S_TROPHY_SIZE_KEY = "ucl-score-trophy-size-v1";
const S_TROPHY_LOGO_KEY = "ucl-score-trophy-logo-v1";
const S_TEAM_TYPO_KEY = "ucl-score-team-typo-v1";
const S_SCORE_TYPO_KEY = "ucl-score-score-typo-v1";
const S_TIMER_ENABLED_KEY = "ucl-score-timer-enabled-v1";

const sBgImgToggle = document.getElementById("s-bg-image-toggle");
const sBgImgSelect = document.getElementById("s-bg-image-select");
const sBgImgFile = document.getElementById("s-bg-image-file");
const sBgImgClear = document.getElementById("s-bg-image-clear");
const sBgImgOpacity = document.getElementById("s-bg-image-opacity");
const sBgImgOpacityValue = document.getElementById("s-bg-image-opacity-value");
const sBgImgFadeToggle = document.getElementById("s-bg-image-fade-toggle");
const sBgImgFadeDir = document.getElementById("s-bg-image-fade-dir");
const sBgImgFadeEnd = document.getElementById("s-bg-image-fade-end");
const sBgImgFadeEndValue = document.getElementById("s-bg-image-fade-end-value");

const S_BG_IMAGE_CUSTOM_KEY = "ucl-score-bg-image-custom-v1";
let sBgImageCustomUrl = localStorage.getItem(S_BG_IMAGE_CUSTOM_KEY) || null;

function applyScoreBgImage() {
  const board = document.getElementById("score-banner");
  const imgDiv = document.getElementById("sb-bg-image");
  if (!board || !imgDiv) return;
  const imgOpacity = +sBgImgOpacity.value / 100;
  if (sBgImgOpacityValue)
    sBgImgOpacityValue.textContent = sBgImgOpacity.value + "%";
  const fadeEndRatio = +sBgImgFadeEnd.value / 100;
  if (sBgImgFadeEndValue)
    sBgImgFadeEndValue.textContent = sBgImgFadeEnd.value + "%";
  const url = sBgImageCustomUrl
    ? sBgImageCustomUrl
    : sBgImgSelect.value
      ? `./${sBgImgSelect.value}`
      : "";
  const hasFile = !!url;
  board.classList.toggle("has-bg-image", sBgImgToggle.checked && hasFile);
  imgDiv.style.backgroundImage = hasFile ? `url('${url}')` : "none";
  imgDiv.style.opacity = imgOpacity;
  if (sBgImgFadeToggle.checked) {
    const dirMap = {
      right: "to right",
      left: "to left",
      bottom: "to bottom",
      top: "to top",
    };
    const dir = dirMap[sBgImgFadeDir.value] || "to right";
    const grad = `linear-gradient(${dir}, rgba(0,0,0,1), rgba(0,0,0,${fadeEndRatio}))`;
    imgDiv.style.maskImage = grad;
    imgDiv.style.webkitMaskImage = grad;
  } else {
    imgDiv.style.maskImage = "";
    imgDiv.style.webkitMaskImage = "";
  }
}

// Load saved state
sBgImgToggle.checked = localStorage.getItem(S_BG_IMAGE_PREF_KEY) === "1";
const savedSBgFile = localStorage.getItem(S_BG_IMAGE_FILE_KEY);
if (
  savedSBgFile &&
  [...sBgImgSelect.options].some((o) => o.value === savedSBgFile)
) {
  sBgImgSelect.value = savedSBgFile;
}
const savedSImgOp = localStorage.getItem(S_BG_IMAGE_OPACITY_KEY);
if (savedSImgOp != null) sBgImgOpacity.value = savedSImgOp;
const savedTimerEnabled = localStorage.getItem(S_TIMER_ENABLED_KEY);
if (savedTimerEnabled != null)
  sTimerToggle.checked = savedTimerEnabled === "1";
sBgImgFadeToggle.checked = localStorage.getItem(S_BG_IMAGE_FADE_KEY) === "1";
const savedSFadeDir = localStorage.getItem(S_BG_IMAGE_FADE_DIR_KEY);
if (savedSFadeDir) sBgImgFadeDir.value = savedSFadeDir;
const savedSFadeEnd = localStorage.getItem(S_BG_IMAGE_FADE_END_KEY);
if (savedSFadeEnd != null) sBgImgFadeEnd.value = savedSFadeEnd;
const savedBallBoxColor = localStorage.getItem(S_BALL_BOX_COLOR_KEY);
if (savedBallBoxColor) sBallBoxColor.value = savedBallBoxColor;
const savedBallColor = localStorage.getItem(S_BALL_COLOR_KEY);
if (savedBallColor) sBallColor.value = savedBallColor;
const savedPenaltyColor = localStorage.getItem(S_PENALTY_COLOR_KEY);
if (savedPenaltyColor) sPenaltyColor.value = savedPenaltyColor;
const savedLeftLogo = localStorage.getItem(S_LEFT_LOGO_KEY);
if (
  savedLeftLogo &&
  [...sLeftLogo.options].some((o) => o.value === savedLeftLogo)
)
  sLeftLogo.value = savedLeftLogo;
const savedLeftLogoSize = localStorage.getItem(S_LEFT_LOGO_SIZE_KEY);
if (savedLeftLogoSize != null) sLeftLogoSize.value = savedLeftLogoSize;
const savedSBgOpacity = localStorage.getItem(S_BG_OPACITY_KEY);
if (savedSBgOpacity != null) sBgOpacity.value = savedSBgOpacity;
const savedSBandWidth = localStorage.getItem(S_BAND_WIDTH_KEY);
if (savedSBandWidth != null) sBandWidth.value = savedSBandWidth;
const savedTrophyColor = localStorage.getItem(S_TROPHY_COLOR_KEY);
if (savedTrophyColor) sTrophyColor.value = savedTrophyColor;
const savedTrophyLogo = localStorage.getItem(S_TROPHY_LOGO_KEY);
if (
  savedTrophyLogo &&
  [...sTrophyLogo.options].some((o) => o.value === savedTrophyLogo)
)
  sTrophyLogo.value = savedTrophyLogo;
sTrophyWhiteToggle.checked = localStorage.getItem(S_TROPHY_WHITE_KEY) !== "0";
const savedTrophySize = localStorage.getItem(S_TROPHY_SIZE_KEY);
if (savedTrophySize != null) sTrophySize.value = savedTrophySize;
try {
  const t = JSON.parse(localStorage.getItem(S_TEAM_TYPO_KEY) || "null");
  if (t) {
    if (t.font) sTeamFont.value = t.font;
    if (t.size != null) sTeamSize.value = t.size;
    if (t.weight) sTeamWeight.value = t.weight;
  }
} catch {}
try {
  const t = JSON.parse(localStorage.getItem(S_SCORE_TYPO_KEY) || "null");
  if (t) {
    if (t.font) sScoreFont.value = t.font;
    if (t.size != null) sScoreSize.value = t.size;
    if (t.weight) sScoreWeight.value = t.weight;
  }
} catch {}

applyScoreBgImage();
updateScoreBanner();

sBgImgToggle.addEventListener("change", () => {
  localStorage.setItem(S_BG_IMAGE_PREF_KEY, sBgImgToggle.checked ? "1" : "0");
  applyScoreBgImage();
});
sBgImgSelect.addEventListener("change", () => {
  localStorage.setItem(S_BG_IMAGE_FILE_KEY, sBgImgSelect.value);
  applyScoreBgImage();
});
sBgImgOpacity.addEventListener("input", () => {
  localStorage.setItem(S_BG_IMAGE_OPACITY_KEY, sBgImgOpacity.value);
  applyScoreBgImage();
});
sBgImgFadeToggle.addEventListener("change", () => {
  localStorage.setItem(
    S_BG_IMAGE_FADE_KEY,
    sBgImgFadeToggle.checked ? "1" : "0",
  );
  applyScoreBgImage();
});
sBgImgFadeDir.addEventListener("change", () => {
  localStorage.setItem(S_BG_IMAGE_FADE_DIR_KEY, sBgImgFadeDir.value);
  applyScoreBgImage();
});
sBgImgFadeEnd.addEventListener("input", () => {
  localStorage.setItem(S_BG_IMAGE_FADE_END_KEY, sBgImgFadeEnd.value);
  applyScoreBgImage();
});
sBgImgFile.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    sBgImageCustomUrl = reader.result;
    try {
      localStorage.setItem(S_BG_IMAGE_CUSTOM_KEY, sBgImageCustomUrl);
    } catch (err) {
      alert(
        "Image trop volumineuse pour être sauvegardée localement. Elle reste active pour la session.",
      );
    }
    applyScoreBgImage();
  };
  reader.readAsDataURL(file);
});
sBgImgClear.addEventListener("click", () => {
  sBgImageCustomUrl = null;
  localStorage.removeItem(S_BG_IMAGE_CUSTOM_KEY);
  sBgImgFile.value = "";
  applyScoreBgImage();
});
sBallBoxColor.addEventListener("input", () => {
  localStorage.setItem(S_BALL_BOX_COLOR_KEY, sBallBoxColor.value);
});
sPenaltyColor.addEventListener("input", () => {
  localStorage.setItem(S_PENALTY_COLOR_KEY, sPenaltyColor.value);
});
sBallColor.addEventListener("input", () => {
  localStorage.setItem(S_BALL_COLOR_KEY, sBallColor.value);
  updateScoreBanner();
});
sLeftLogo.addEventListener("change", () => {
  localStorage.setItem(S_LEFT_LOGO_KEY, sLeftLogo.value);
  updateScoreBanner();
});
sLeftLogoSize.addEventListener("input", () => {
  localStorage.setItem(S_LEFT_LOGO_SIZE_KEY, sLeftLogoSize.value);
});
sTimerToggle.addEventListener("change", () => {
  localStorage.setItem(
    S_TIMER_ENABLED_KEY,
    sTimerToggle.checked ? "1" : "0",
  );
  updateScoreBanner();
});
sBgOpacity.addEventListener("input", () => {
  localStorage.setItem(S_BG_OPACITY_KEY, sBgOpacity.value);
});
sTeamGap.addEventListener("input", () => {
  localStorage.setItem(S_TEAM_GAP_KEY, sTeamGap.value);
  updateScoreBanner();
});
sChevronToggle.addEventListener("change", () => {
  localStorage.setItem(S_CHEVRON_KEY, sChevronToggle.checked ? "1" : "0");
  updateScoreBanner();
});
sChevronSideColor.addEventListener("input", () => {
  localStorage.setItem(S_CHEVRON_SIDE_COLOR_KEY, sChevronSideColor.value);
  updateScoreBanner();
});
sChevronColor.addEventListener("input", () => {
  localStorage.setItem(S_CHEVRON_COLOR_KEY, sChevronColor.value);
  updateScoreBanner();
});
sTimerBg.addEventListener("input", () => {
  timerBg = sTimerBg.value;
  localStorage.setItem(S_TIMER_BG_KEY, timerBg);
  updateScoreBanner();
});
sBandWidth.addEventListener("input", () => {
  localStorage.setItem(S_BAND_WIDTH_KEY, sBandWidth.value);
});
sTrophyColor.addEventListener("input", () => {
  localStorage.setItem(S_TROPHY_COLOR_KEY, sTrophyColor.value);
});
sTrophyWhiteToggle.addEventListener("change", () => {
  localStorage.setItem(
    S_TROPHY_WHITE_KEY,
    sTrophyWhiteToggle.checked ? "1" : "0",
  );
  updateScoreBanner();
});
sTrophyLogo.addEventListener("change", () => {
  localStorage.setItem(S_TROPHY_LOGO_KEY, sTrophyLogo.value);
  updateScoreBanner();
});
sTrophySize.addEventListener("input", () => {
  localStorage.setItem(S_TROPHY_SIZE_KEY, sTrophySize.value);
});
function saveTeamTypo() {
  localStorage.setItem(
    S_TEAM_TYPO_KEY,
    JSON.stringify({
      font: sTeamFont.value,
      size: sTeamSize.value,
      weight: sTeamWeight.value,
    }),
  );
}
function saveScoreTypo() {
  localStorage.setItem(
    S_SCORE_TYPO_KEY,
    JSON.stringify({
      font: sScoreFont.value,
      size: sScoreSize.value,
      weight: sScoreWeight.value,
    }),
  );
}
[sTeamFont, sTeamSize, sTeamWeight].forEach((el) =>
  el.addEventListener("input", saveTeamTypo),
);
[sTeamFont, sTeamWeight].forEach((el) =>
  el.addEventListener("change", saveTeamTypo),
);
[sScoreFont, sScoreSize, sScoreWeight].forEach((el) =>
  el.addEventListener("input", saveScoreTypo),
);
[sScoreFont, sScoreWeight].forEach((el) =>
  el.addEventListener("change", saveScoreTypo),
);

/* ----- Score banner save/load ----- */
const S_SAVED_KEY = "ucl-score-saves-v1";
const sSaveName = document.getElementById("s-save-name");

function collectScoreData() {
  return {
    home: sHome.value,
    homeScore: sHomeScore.value,
    aggregateEnabled: sAggregateToggle.checked,
    aggregateHome: sAggregateHome.value,
    aggregateAway: sAggregateAway.value,
    homeColor: sHomeColor.value,
    homeColor2: sHomeColor2.value,
    timerEnabled: sTimerToggle.checked,
    timerBg,
    penaltyEnabled: sPenaltyToggle.checked,
    penaltyColor: sPenaltyColor.value,
    penaltyHomeShots: [...sPenaltyHomeShots],
    penaltyAwayShots: [...sPenaltyAwayShots],
    away: sAway.value,
    awayScore: sAwayScore.value,
    awayColor: sAwayColor.value,
    awayColor2: sAwayColor2.value,
    bg: sBg.value,
    chevronsEnabled: sChevronToggle.checked,
    chevronSideColor: sChevronSideColor.value,
    chevronColor: sChevronColor.value,
    teamGap: sTeamGap.value,
    bgOpacity: sBgOpacity.value,
    ballBoxColor: sBallBoxColor.value,
    ballColor: sBallColor.value,
    leftLogo: sLeftLogo.value,
    leftLogoSize: sLeftLogoSize.value,
    bandWidth: sBandWidth.value,
    trophyColor: sTrophyColor.value,
    trophyWhite: sTrophyWhiteToggle.checked,
    trophySize: sTrophySize.value,
    trophyLogo: sTrophyLogo.value,
    teamTypo: {
      font: sTeamFont.value,
      size: sTeamSize.value,
      weight: sTeamWeight.value,
    },
    scoreTypo: {
      font: sScoreFont.value,
      size: sScoreSize.value,
      weight: sScoreWeight.value,
    },
    bgImage: {
      enabled: sBgImgToggle.checked,
      file: sBgImgSelect.value,
      customUrl: sBgImageCustomUrl,
      opacity: sBgImgOpacity.value,
      fadeEnabled: sBgImgFadeToggle.checked,
      fadeDir: sBgImgFadeDir.value,
      fadeEnd: sBgImgFadeEnd.value,
    },
  };
}

function applyScoreData(d) {
  if (!d) return;
  if (d.home != null) sHome.value = d.home;
  if (d.homeScore != null) sHomeScore.value = d.homeScore;
  if (d.homeColor) sHomeColor.value = d.homeColor;
  sHomeColor2.value = d.homeColor2 || sHomeColor.value;
  if (typeof d.timerEnabled === "boolean") {
    sTimerToggle.checked = d.timerEnabled;
    localStorage.setItem(S_TIMER_ENABLED_KEY, d.timerEnabled ? "1" : "0");
  }
  sPenaltyToggle.checked = d.penaltyEnabled === true;
  if (d.penaltyColor) {
    sPenaltyColor.value = d.penaltyColor;
    localStorage.setItem(S_PENALTY_COLOR_KEY, d.penaltyColor);
  }
  sPenaltyHomeShots = Array.isArray(d.penaltyHomeShots)
    ? d.penaltyHomeShots.filter((shot) => typeof shot === "boolean")
    : [];
  sPenaltyAwayShots = Array.isArray(d.penaltyAwayShots)
    ? d.penaltyAwayShots.filter((shot) => typeof shot === "boolean")
    : [];
  if (d.away != null) sAway.value = d.away;
  if (d.awayScore != null) sAwayScore.value = d.awayScore;
  sAggregateToggle.checked = d.aggregateEnabled === true;
  sAggregateHome.value = d.aggregateHome ?? Number(sHomeScore.value);
  sAggregateAway.value = d.aggregateAway ?? Number(sAwayScore.value);
  if (d.awayColor) sAwayColor.value = d.awayColor;
  sAwayColor2.value = d.awayColor2 || sAwayColor.value;
  if (d.bg) sBg.value = d.bg;
  sTeamGap.value = d.teamGap ?? sTeamGap.defaultValue;
  localStorage.setItem(S_TEAM_GAP_KEY, sTeamGap.value);
  sChevronToggle.checked = d.chevronsEnabled === true;
  localStorage.setItem(S_CHEVRON_KEY, sChevronToggle.checked ? "1" : "0");
  sChevronSideColor.value = /^#[\da-f]{6}$/i.test(d.chevronSideColor)
    ? d.chevronSideColor
    : sChevronSideColor.defaultValue;
  localStorage.setItem(S_CHEVRON_SIDE_COLOR_KEY, sChevronSideColor.value);
  sChevronColor.value = /^#[\da-f]{6}$/i.test(d.chevronColor)
    ? d.chevronColor
    : sChevronColor.defaultValue;
  localStorage.setItem(S_CHEVRON_COLOR_KEY, sChevronColor.value);
  timerBg = /^#[\da-f]{6}$/i.test(d.timerBg) ? d.timerBg : null;
  if (timerBg) localStorage.setItem(S_TIMER_BG_KEY, timerBg);
  else localStorage.removeItem(S_TIMER_BG_KEY);
  if (d.bgOpacity != null) sBgOpacity.value = d.bgOpacity;
  if (d.ballBoxColor) sBallBoxColor.value = d.ballBoxColor;
  if (d.ballColor) sBallColor.value = d.ballColor;
  if (d.leftLogo && [...sLeftLogo.options].some((o) => o.value === d.leftLogo)) {
    sLeftLogo.value = d.leftLogo;
    localStorage.setItem(S_LEFT_LOGO_KEY, d.leftLogo);
  }
  if (d.leftLogoSize != null) {
    sLeftLogoSize.value = d.leftLogoSize;
    localStorage.setItem(S_LEFT_LOGO_SIZE_KEY, d.leftLogoSize);
  }
  if (d.bandWidth != null) sBandWidth.value = d.bandWidth;
  if (d.trophyColor) sTrophyColor.value = d.trophyColor;
  if (typeof d.trophyWhite === "boolean")
    sTrophyWhiteToggle.checked = d.trophyWhite;
  if (d.trophySize != null) sTrophySize.value = d.trophySize;
  if (
    d.trophyLogo &&
    [...sTrophyLogo.options].some((o) => o.value === d.trophyLogo)
  ) {
    sTrophyLogo.value = d.trophyLogo;
    localStorage.setItem(S_TROPHY_LOGO_KEY, d.trophyLogo);
  }
  if (d.teamTypo) {
    if (d.teamTypo.font) sTeamFont.value = d.teamTypo.font;
    if (d.teamTypo.size != null) sTeamSize.value = d.teamTypo.size;
    if (d.teamTypo.weight) sTeamWeight.value = d.teamTypo.weight;
  }
  if (d.scoreTypo) {
    if (d.scoreTypo.font) sScoreFont.value = d.scoreTypo.font;
    if (d.scoreTypo.size != null) sScoreSize.value = d.scoreTypo.size;
    if (d.scoreTypo.weight) sScoreWeight.value = d.scoreTypo.weight;
  }
  if (d.bgImage) {
    const b = d.bgImage;
    if (typeof b.enabled === "boolean") sBgImgToggle.checked = b.enabled;
    if (b.file != null) sBgImgSelect.value = b.file;
    if (b.customUrl !== undefined) {
      sBgImageCustomUrl = b.customUrl || null;
      if (sBgImageCustomUrl) {
        try {
          localStorage.setItem(S_BG_IMAGE_CUSTOM_KEY, sBgImageCustomUrl);
        } catch {}
      } else {
        localStorage.removeItem(S_BG_IMAGE_CUSTOM_KEY);
      }
    }
    if (b.opacity != null) sBgImgOpacity.value = b.opacity;
    if (typeof b.fadeEnabled === "boolean")
      sBgImgFadeToggle.checked = b.fadeEnabled;
    if (b.fadeDir) sBgImgFadeDir.value = b.fadeDir;
    if (b.fadeEnd != null) sBgImgFadeEnd.value = b.fadeEnd;
  }
  updateScoreBanner();
  applyScoreBgImage();
}

function getSavedScores() {
  try {
    return JSON.parse(localStorage.getItem(S_SAVED_KEY) || "[]");
  } catch {
    return [];
  }
}
function setSavedScores(list) {
  localStorage.setItem(S_SAVED_KEY, JSON.stringify(list));
}
function renderSavedScoresList() {
  const sel = document.getElementById("s-saved-select");
  if (!sel) return;
  const list = getSavedScores();
  sel.innerHTML =
    list.length === 0
      ? '<option value="">— Aucune sauvegarde —</option>'
      : list.map((s, i) => `<option value="${i}">${s.name}</option>`).join("");
}

function saveCurrentScore() {
  const name = sSaveName.value.trim();
  if (!name) {
    alert("Donne un nom à la sauvegarde.");
    return;
  }
  const list = getSavedScores();
  const idx = list.findIndex((x) => x.name === name);
  const entry = { name, data: collectScoreData() };
  if (idx >= 0) {
    list[idx] = entry;
  } else {
    list.push(entry);
  }
  setSavedScores(list);
  renderSavedScoresList();
  document.getElementById("s-saved-select").value = String(idx >= 0 ? idx : list.length - 1);
  showPresetSaveStatus(sSaveName, name);
}

function loadCurrentScore() {
  const sel = document.getElementById("s-saved-select");
  const idx = +sel.value;
  if (isNaN(idx)) return;
  const list = getSavedScores();
  if (!list[idx]) return;
  applyScoreData(list[idx].data);
  sSaveName.value = list[idx].name;
}

function deleteCurrentScore() {
  const sel = document.getElementById("s-saved-select");
  const idx = +sel.value;
  if (isNaN(idx)) return;
  const list = getSavedScores();
  if (!list[idx]) return;
  list.splice(idx, 1);
  setSavedScores(list);
  renderSavedScoresList();
}

document.getElementById("s-save").addEventListener("click", saveCurrentScore);
document.getElementById("s-load").addEventListener("click", loadCurrentScore);
document
  .getElementById("s-delete")
  .addEventListener("click", deleteCurrentScore);
renderSavedScoresList();

/* ============================================================
   4) BRACKET BOARD
   ============================================================ */
const MATCH_LABELS = [
  "QF1 — Haut Gauche",
  "QF2 — Bas Gauche",
  "QF3 — Haut Droite",
  "QF4 — Bas Droite",
];

const defaultBracketTeams = [
  { name: "ATLETICO MADRID", color: "#cb3524", letter: "A", logoURL: null },
  { name: "DORTMUND", color: "#fde100", letter: "D", logoURL: null },
  { name: "PSG", color: "#004170", letter: "P", logoURL: null },
  { name: "BARCELONA", color: "#a50044", letter: "B", logoURL: null },
  { name: "ARSENAL", color: "#ef0107", letter: "A", logoURL: null },
  { name: "BAYERN MUNICH", color: "#dc052d", letter: "B", logoURL: null },
  { name: "REAL MADRID", color: "#e6e6e6", letter: "R", logoURL: null },
  { name: "MAN CITY", color: "#6cabdd", letter: "C", logoURL: null },
];

// Default inline SVG approximating the UEFA Champions League starball + wordmark.
// User can drop the official PNG as ./ucl-logo.png OR upload via the editor.
const DEFAULT_UCL_SVG = `
<svg viewBox="0 0 220 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- One "blade" of the starball: a stretched teardrop pointing UP from center -->
    <path id="ucl-blade" d="M 0,-95
                            C 10,-70 16,-50 18,-32
                            C 12,-22 6,-16 0,-14
                            C -6,-16 -12,-22 -18,-32
                            C -16,-50 -10,-70 0,-95 Z"
          fill="#ffffff"/>
  </defs>
  <g transform="translate(110 105)">
    <!-- 8 blades arranged radially -->
    <use href="#ucl-blade" transform="rotate(0)"/>
    <use href="#ucl-blade" transform="rotate(45)"/>
    <use href="#ucl-blade" transform="rotate(90)"/>
    <use href="#ucl-blade" transform="rotate(135)"/>
    <use href="#ucl-blade" transform="rotate(180)"/>
    <use href="#ucl-blade" transform="rotate(225)"/>
    <use href="#ucl-blade" transform="rotate(270)"/>
    <use href="#ucl-blade" transform="rotate(315)"/>
    <!-- Central 5-pointed star -->
    <polygon points="0,-44 12,-14 44,-14 18,5 28,36 0,18 -28,36 -18,5 -44,-14 -12,-14"
             fill="#ffffff"/>
  </g>
  <text x="110" y="235" text-anchor="middle" font-family="'Cinzel', 'Trajan Pro', serif"
        font-size="16" font-weight="700" letter-spacing="8" fill="#ffffff">UEFA</text>
  <text x="110" y="270" text-anchor="middle" font-family="'Cinzel', 'Trajan Pro', serif"
        font-size="26" font-weight="900" letter-spacing="2" fill="#ffffff">CHAMPIONS</text>
  <text x="110" y="300" text-anchor="middle" font-family="'Cinzel', 'Trajan Pro', serif"
        font-size="26" font-weight="900" letter-spacing="2" fill="#ffffff">LEAGUE</text>
</svg>`;

let centralLogoURL = null;

let bracketTeams = JSON.parse(JSON.stringify(defaultBracketTeams));

function renderBracketEditor() {
  const list = document.getElementById("b-teams");
  list.innerHTML = "";
  bracketTeams.forEach((t, i) => {
    if (i % 2 === 0) {
      const label = document.createElement("div");
      label.className = "match-label";
      label.textContent = MATCH_LABELS[i / 2];
      list.appendChild(label);
    }
    const card = document.createElement("div");
    card.className = "team-card";
    const thumb = t.logoURL
      ? `<img src="${t.logoURL}" alt="logo" />`
      : `<div class="team-thumb-letter" style="background:${t.color};">${t.letter}</div>`;
    card.innerHTML = `
      <div class="team-card-row">
        <div class="team-thumb" data-i="${i}">${thumb}</div>
        <input type="text" value="${t.name}" data-i="${i}" data-field="name" placeholder="Nom équipe" />
      </div>
      <div class="team-card-row">
        <input type="text" value="${t.letter}" data-i="${i}" data-field="letter" maxlength="3" placeholder="Initiales" class="letter-input" title="Affiché si pas de PNG" />
        <input type="color" value="${t.color}" data-i="${i}" data-field="color" title="Couleur de secours" />
        <label class="upload-btn" title="Importer un PNG">
          📁
          <input type="file" accept="image/*" data-i="${i}" data-field="logoURL" hidden />
        </label>
        ${t.logoURL ? `<button class="remove-logo-btn" data-i="${i}" title="Supprimer le logo">×</button>` : ""}
      </div>
    `;
    list.appendChild(card);
  });

  list
    .querySelectorAll('input[type="text"], input[type="color"]')
    .forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = +e.target.dataset.i;
        const field = e.target.dataset.field;
        bracketTeams[idx][field] = e.target.value;
        renderBracket();
        // Re-render the thumbnail if name/letter/color changed and no logoURL
        if (!bracketTeams[idx].logoURL) {
          const thumb = list.querySelector(`.team-thumb[data-i="${idx}"]`);
          if (thumb)
            thumb.innerHTML = `<div class="team-thumb-letter" style="background:${bracketTeams[idx].color};">${bracketTeams[idx].letter}</div>`;
        }
      });
    });

  list.querySelectorAll('input[type="file"]').forEach((inp) => {
    inp.addEventListener("change", (e) => {
      const idx = +e.target.dataset.i;
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        bracketTeams[idx].logoURL = ev.target.result;
        renderBracketEditor();
        renderBracket();
      };
      reader.readAsDataURL(file);
    });
  });

  list.querySelectorAll(".remove-logo-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = +e.target.dataset.i;
      bracketTeams[idx].logoURL = null;
      renderBracketEditor();
      renderBracket();
    });
  });
}

function setVenueText(el, text) {
  // Keep the ::after "FINAL" pseudo intact; only replace the first text node
  if (el.childNodes.length === 0 || el.childNodes[0].nodeType !== 3) {
    el.insertBefore(document.createTextNode(text), el.firstChild);
  } else {
    el.childNodes[0].nodeValue = text;
  }
}

function renderBracket() {
  document.getElementById("br-tournament-title").textContent =
    document.getElementById("b-title").value;
  const venueText = document.getElementById("b-final").value;
  setVenueText(document.getElementById("br-venue-title"), venueText);
  setVenueText(document.getElementById("br-final-venue"), venueText);

  const bg = document.getElementById("b-bg").value;
  document.getElementById("bracket-board").style.background =
    `radial-gradient(ellipse 60% 40% at 75% 30%, rgba(80, 140, 255, 0.18) 0%, transparent 60%),
     radial-gradient(ellipse 50% 35% at 20% 70%, rgba(60, 100, 200, 0.12) 0%, transparent 60%),
     linear-gradient(135deg, ${bg} 0%, #050a1a 100%)`;

  // Central UCL logo: uploaded PNG or default SVG
  const logoBox = document.getElementById("br-ucl-logo");
  logoBox.innerHTML = centralLogoURL
    ? `<img src="${centralLogoURL}" alt="UCL logo" />`
    : DEFAULT_UCL_SVG;

  // 8 team cards (one per team)
  for (let i = 0; i < 8; i++) {
    const card = document.querySelector(`.br-team-card[data-team-i="${i}"]`);
    if (!card) continue;
    const t = bracketTeams[i];
    card.innerHTML = `
      ${renderBracketLogo(t)}
      <div class="team-name-display">${t.name}</div>
    `;
  }
}

function renderBracketLogo(team) {
  if (team.logoURL) {
    return `<img src="${team.logoURL}" alt="${team.name}" class="br-team-logo" />`;
  }
  return `<div class="team-logo-placeholder" style="background:${team.color};color:#fff;">${team.letter}</div>`;
}

document.getElementById("b-title").addEventListener("input", renderBracket);
document.getElementById("b-final").addEventListener("input", renderBracket);
document.getElementById("b-bg").addEventListener("input", renderBracket);

document.getElementById("b-logo-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    centralLogoURL = ev.target.result;
    renderBracket();
  };
  reader.readAsDataURL(file);
});

document.getElementById("b-logo-clear").addEventListener("click", () => {
  centralLogoURL = null;
  document.getElementById("b-logo-file").value = "";
  renderBracket();
});

renderBracketEditor();
renderBracket();

/* ============================================================
   SHORTS LIVE SCORE
   ============================================================ */
const SHORTS_STORAGE_KEY = "ucl-shorts-score-v1";
const SHORTS_PRESETS_KEY = "ucl-shorts-presets-v1";
const shortsSeason = document.getElementById("shorts-season");
const shortsRound = document.getElementById("shorts-round");
const shortsLogoSize = document.getElementById("shorts-logo-size");
const shortsLogoGap = document.getElementById("shorts-logo-gap");
const shortsCenterWidth = document.getElementById("shorts-center-width");
const shortsCenterVertical = document.getElementById("shorts-center-vertical");
const shortsScoreWidth = document.getElementById("shorts-score-width");
const shortsCompetitionLogoSize = document.getElementById(
  "shorts-competition-logo-size",
);
const shortsCompetitionLogoVertical = document.getElementById(
  "shorts-competition-logo-vertical",
);
const shortsMetaFont = document.getElementById("shorts-meta-font");
const shortsMetaFontSize = document.getElementById("shorts-meta-font-size");
const shortsCenterBackground = document.getElementById("shorts-center-bg");
const shortsCompetitionBackground = document.getElementById(
  "shorts-competition-bg",
);
const shortsBorderStart = document.getElementById("shorts-border-start");
const shortsBorderEnd = document.getElementById("shorts-border-end");
const shortsBorderWidth = document.getElementById("shorts-border-width");
const shortsCompetitionBorderStart = document.getElementById(
  "shorts-competition-border-start",
);
const shortsCompetitionBorderEnd = document.getElementById(
  "shorts-competition-border-end",
);
const shortsCompetitionBorderWidth = document.getElementById(
  "shorts-competition-border-width",
);
const shortsHomeScore = document.getElementById("shorts-home-score");
const shortsAwayScore = document.getElementById("shorts-away-score");
const shortsCompetitionLogoFile = document.getElementById(
  "shorts-competition-logo-file",
);
const shortsCompetitionLogoSelect = document.getElementById(
  "shorts-competition-logo-select",
);
const shortsCompetitionLogoWhite = document.getElementById(
  "shorts-competition-logo-white",
);
const shortsHomeLogoFile = document.getElementById("shorts-home-logo-file");
const shortsAwayLogoFile = document.getElementById("shorts-away-logo-file");
const shortsPenaltyToggle = document.getElementById("shorts-penalty-toggle");
const shortsPenaltyColor = document.getElementById("shorts-penalty-color");
const shortsPenaltyWidth = document.getElementById("shorts-penalty-width");
let shortsPenaltyHomeShots = [];
let shortsPenaltyAwayShots = [];
const shortsSavedSelect = document.getElementById("shorts-saved-select");
const shortsSaveName = document.getElementById("shorts-save-name");
let shortsCompetitionLogoURL = "./Logos/ucl_full_logo.png";
let shortsHomeLogoURL = "./Logos/Logo_Liverpool_FC_2012.png";
let shortsAwayLogoURL = "./Logos/Real_Madrid_2026.png";
const SHORTS_META_FONTS = {
  montserrat: "'Montserrat', Arial, sans-serif",
  system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};
const SHORTS_PENALTY_GAP = 8;
const SHORTS_PENALTY_SHOT_SIZE = 25.5;
const SHORTS_PENALTY_SHOT_GAP = 3;
const SHORTS_PENALTY_PADDING = 6;
const SHORTS_PENALTY_WIDTH_VERSION = 3;
const SHORTS_PENALTY_LEGACY_WIDTH_VERSION = 2;
const SHORTS_PENALTY_SHOTS_PER_ROW = 5;
const SHORTS_PENALTY_MIN_WIDTH =
  2 * SHORTS_PENALTY_PADDING +
  SHORTS_PENALTY_SHOTS_PER_ROW * SHORTS_PENALTY_SHOT_SIZE +
  (SHORTS_PENALTY_SHOTS_PER_ROW - 1) * SHORTS_PENALTY_SHOT_GAP;

function updateShortsBoardHeight(
  board,
  logoSize,
  competitionLogoFrameSize,
  centerHeight,
  logoVerticalPosition,
  centerVerticalPosition,
  penaltyRowHeight,
) {
  const boardWidth = board.clientWidth;
  if (!boardWidth) return;

  const boardStyle = getComputedStyle(board);
  const horizontalPadding =
    parseFloat(boardStyle.paddingLeft) + parseFloat(boardStyle.paddingRight);
  const verticalPadding =
    parseFloat(boardStyle.paddingTop) + parseFloat(boardStyle.paddingBottom);
  const contentWidth = boardWidth - horizontalPadding;
  const logoHeight = (logoSize / 1440) * contentWidth;
  const badgeTopOffset =
    competitionLogoFrameSize / 2 - 4 - logoVerticalPosition;
  const badgeSafeHeight =
    centerHeight +
    2 * Math.abs(centerVerticalPosition) +
    2 * Math.max(0, badgeTopOffset);
  const penaltySpace = penaltyRowHeight ? penaltyRowHeight + 4 : 0;
  board.style.height = `${Math.max(
    boardWidth / 4.5,
    logoHeight + penaltySpace + verticalPadding,
    badgeSafeHeight + penaltySpace,
  )}px`;
}

function setShortsLogo(image, fallback, url, alt, fallbackText) {
  fallback.textContent = fallbackText;
  image.alt = alt;
  image.hidden = !url;
  fallback.hidden = Boolean(url);
  image.onerror = () => {
    image.hidden = true;
    fallback.hidden = false;
  };
  if (url) image.src = url;
  else image.removeAttribute("src");
}

function syncShortsCompetitionLogoSelect() {
  const selectedLogo = shortsCompetitionLogoURL || "";
  [...shortsCompetitionLogoSelect.options]
    .filter(
      (option) =>
        option.dataset.customLogo === "true" &&
        option.value !== selectedLogo,
    )
    .forEach((option) => option.remove());

  if (
    selectedLogo &&
    ![...shortsCompetitionLogoSelect.options].some(
      (option) => option.value === selectedLogo,
    )
  ) {
    const option = document.createElement("option");
    option.value = selectedLogo;
    option.textContent = `Personnalisé — ${selectedLogo.split(/[\\/]/).pop()}`;
    option.dataset.customLogo = "true";
    shortsCompetitionLogoSelect.append(option);
  }
  shortsCompetitionLogoSelect.value = selectedLogo;
}

function updateShortsPreview() {
  const logoSize = Number(shortsLogoSize.value);
  const board = document.getElementById("shorts-board");
  const boardStyle = getComputedStyle(board);
  const boardContentWidth =
    board.clientWidth -
    parseFloat(boardStyle.paddingLeft) -
    parseFloat(boardStyle.paddingRight);
  const centerWidth = Math.max(
    120,
    (Number(shortsCenterWidth.value) / 1440) * boardContentWidth,
  );
  const centerVerticalPosition = Number(shortsCenterVertical.value);
  const competitionLogoSize = Number(shortsCompetitionLogoSize.value);
  const competitionLogoFrameSize = competitionLogoSize + 16;
  const scoreWidth = Number(shortsScoreWidth.value);
  const requestedLogoWidth = (logoSize / 1440) * boardContentWidth;
  const logoGapWidth =
    (Number(shortsLogoGap.value) / 1440) * boardContentWidth;
  const minimumCenterWidth = Math.max(120, competitionLogoFrameSize);
  const minimumScoreWidth = 40;
  const requestedMiddleWidth = centerWidth + 2 * scoreWidth;
  const availableMiddleWidth = Math.max(
    0,
    boardContentWidth -
      2 * (requestedLogoWidth + logoGapWidth + 14),
  );
  const minimumMiddleWidth =
    minimumCenterWidth + 2 * minimumScoreWidth;
  const middleScale = Math.min(
    1,
    Math.max(
      minimumMiddleWidth / requestedMiddleWidth,
      availableMiddleWidth / requestedMiddleWidth,
    ),
  );
  const actualCenterWidth = Math.max(
    minimumCenterWidth,
    centerWidth * middleScale,
  );
  const actualScoreWidth = Math.max(
    minimumScoreWidth,
    scoreWidth * middleScale,
  );
  const requestedPenaltyWidth = Number(shortsPenaltyWidth.value);
  const maximumPenaltyWidth = Math.max(
    SHORTS_PENALTY_MIN_WIDTH,
    actualScoreWidth + actualCenterWidth / 2,
  );
  const actualPenaltyWidth = Math.min(
    requestedPenaltyWidth,
    maximumPenaltyWidth,
  );
  const sideTrackWidth =
    (boardContentWidth - actualCenterWidth - 2 * actualScoreWidth) / 2;
  const actualLogoWidth = Math.max(
    0,
    Math.min(
      requestedLogoWidth,
      sideTrackWidth - 14 - logoGapWidth,
    ),
  );
  const actualLogoSliderSize = boardContentWidth
    ? (actualLogoWidth / boardContentWidth) * 1440
    : logoSize;
  const penaltyResults = document.getElementById("shorts-penalty-results");
  const penaltyResultsEnabled = shortsPenaltyToggle.checked;
  penaltyResults.hidden = !penaltyResultsEnabled;
  renderPenaltyShots("shorts-home-penalty-shots", shortsPenaltyHomeShots);
  renderPenaltyShots("shorts-away-penalty-shots", shortsPenaltyAwayShots);
  const maxPenaltyShotsPerRow = Math.min(
    SHORTS_PENALTY_SHOTS_PER_ROW,
    Math.max(
      1,
      Math.floor(
        (actualPenaltyWidth - 2 * SHORTS_PENALTY_PADDING +
          SHORTS_PENALTY_SHOT_GAP) /
          (SHORTS_PENALTY_SHOT_SIZE + SHORTS_PENALTY_SHOT_GAP),
      ),
    ),
  );
  const penaltyRows = Math.max(
    1,
    Math.ceil(
      Math.max(
        shortsPenaltyHomeShots.length,
        shortsPenaltyAwayShots.length,
      ) /
        maxPenaltyShotsPerRow,
    ),
  );
  const penaltyRowHeight = penaltyResultsEnabled
    ? Math.ceil(
        2 * SHORTS_PENALTY_PADDING +
          penaltyRows * SHORTS_PENALTY_SHOT_SIZE +
          (penaltyRows - 1) * SHORTS_PENALTY_SHOT_GAP,
      )
    : 0;
  const competitionLogoOffset = competitionLogoFrameSize / 2 - 4;
  const logoVerticalPosition = Number(shortsCompetitionLogoVertical.value);
  const centerTopPadding = Math.max(
    38,
    competitionLogoFrameSize / 2 + 8 + logoVerticalPosition,
  );
  const metaFontScale = Math.min(
    1,
    actualCenterWidth / 240,
    actualScoreWidth / 90,
  );
  const metaFontSize = Number(shortsMetaFontSize.value);
  const roundFontSize = Math.max(10, metaFontSize * metaFontScale);
  const seasonFontSize = Math.max(
    10,
    metaFontSize * (19 / 23) * metaFontScale,
  );
  const centerTextHeight = roundFontSize * 1.05 + seasonFontSize + 5;
  const centerHeight = Math.max(
    90,
    centerTopPadding + centerTextHeight + 12,
  );
  board.style.setProperty(
    "--shorts-club-logo-size",
    `${actualLogoWidth}px`,
  );
  board.style.setProperty(
    "--shorts-logo-gap",
    `${logoGapWidth}px`,
  );
  board.style.setProperty(
    "--shorts-center-width",
    `${actualCenterWidth}px`,
  );
  board.style.setProperty(
    "--shorts-center-vertical",
    `${centerVerticalPosition}px`,
  );
  board.style.setProperty(
    "--shorts-score-width",
    `${actualScoreWidth}px`,
  );
  board.style.setProperty(
    "--shorts-competition-logo-frame-size",
    `${competitionLogoFrameSize}px`,
  );
  board.style.setProperty(
    "--shorts-competition-logo-offset",
    `${-competitionLogoOffset + logoVerticalPosition}px`,
  );
  board.style.setProperty(
    "--shorts-center-top-padding",
    `${centerTopPadding}px`,
  );
  board.style.setProperty("--shorts-center-height", `${centerHeight}px`);
  board.style.setProperty(
    "--shorts-penalty-width",
    `${actualPenaltyWidth}px`,
  );
  board.style.setProperty(
    "--shorts-penalty-max-width",
    `${maximumPenaltyWidth}px`,
  );
  board.style.setProperty(
    "--shorts-penalty-gap",
    `${SHORTS_PENALTY_GAP}px`,
  );
  board.style.setProperty(
    "--shorts-round-font-size",
    `${roundFontSize.toFixed(1)}px`,
  );
  board.style.setProperty(
    "--shorts-season-font-size",
    `${seasonFontSize.toFixed(1)}px`,
  );
  board.style.setProperty("--shorts-center-bg", shortsCenterBackground.value);
  board.style.setProperty("--shorts-penalty-bg", shortsPenaltyColor.value);
  board.style.setProperty(
    "--shorts-competition-bg",
    shortsCompetitionBackground.value,
  );
  board.style.setProperty("--shorts-border-start", shortsBorderStart.value);
  board.style.setProperty("--shorts-border-end", shortsBorderEnd.value);
  board.style.setProperty(
    "--shorts-border-width",
    `${shortsBorderWidth.value}px`,
  );
  board.style.setProperty(
    "--shorts-competition-border-start",
    shortsCompetitionBorderStart.value,
  );
  board.style.setProperty(
    "--shorts-competition-border-end",
    shortsCompetitionBorderEnd.value,
  );
  board.style.setProperty(
    "--shorts-competition-border-width",
    `${shortsCompetitionBorderWidth.value}px`,
  );
  board.style.setProperty(
    "--shorts-meta-font",
    SHORTS_META_FONTS[shortsMetaFont.value],
  );
  document.getElementById("shorts-center-width-value").textContent =
    actualCenterWidth < centerWidth
      ? `${shortsCenterWidth.value} px (réduit à ${Math.round(actualCenterWidth)} px)`
      : `${shortsCenterWidth.value} px`;
  document.getElementById("shorts-center-vertical-value").textContent =
    `${centerVerticalPosition} px`;
  document.getElementById("shorts-score-width-value").textContent =
    actualScoreWidth < scoreWidth
      ? `${shortsScoreWidth.value} px (réduit à ${Math.round(actualScoreWidth)} px)`
      : `${shortsScoreWidth.value} px`;
  document.getElementById("shorts-meta-font-size-value").textContent =
    `${shortsMetaFontSize.value} px`;
  document.getElementById("shorts-penalty-width-value").textContent =
    actualPenaltyWidth < requestedPenaltyWidth
      ? `${shortsPenaltyWidth.value} px (limité à ${Math.round(actualPenaltyWidth)} px)`
      : `${shortsPenaltyWidth.value} px`;
  document.getElementById("shorts-competition-logo-size-value").textContent =
    `${competitionLogoSize} px`;
  document.getElementById("shorts-border-width-value").textContent =
    `${shortsBorderWidth.value} px`;
  document.getElementById(
    "shorts-competition-border-width-value",
  ).textContent = `${shortsCompetitionBorderWidth.value} px`;
  document.getElementById(
    "shorts-competition-logo-vertical-value",
  ).textContent = `${logoVerticalPosition} px`;
  updateShortsBoardHeight(
    board,
    actualLogoSliderSize,
    competitionLogoFrameSize,
    centerHeight,
    logoVerticalPosition,
    centerVerticalPosition,
    penaltyRowHeight,
  );
  document.getElementById("shorts-logo-size-value").textContent =
    actualLogoSliderSize < logoSize - 1
      ? `${logoSize} px (réduit à ${Math.round(actualLogoSliderSize)} px)`
      : `${logoSize} px`;
  document.getElementById("shorts-logo-gap-value").textContent =
    `${shortsLogoGap.value} px`;
  document.getElementById("shorts-season-display").textContent =
    shortsSeason.value;
  document.getElementById("shorts-round-display").textContent =
    shortsRound.value;
  document.getElementById("shorts-penalty-home-undo").disabled =
    shortsPenaltyHomeShots.length === 0;
  document.getElementById("shorts-penalty-away-undo").disabled =
    shortsPenaltyAwayShots.length === 0;
  document.getElementById("shorts-penalty-reset").disabled =
    shortsPenaltyHomeShots.length === 0 && shortsPenaltyAwayShots.length === 0;

  setShortsLogo(
    document.getElementById("shorts-competition-logo"),
    document.getElementById("shorts-competition-fallback"),
    shortsCompetitionLogoURL,
    "Logo de la compétition",
    "UCL",
  );
  const competitionLogo = document.getElementById("shorts-competition-logo");
  competitionLogo.classList.toggle(
    "is-white",
    shortsCompetitionLogoWhite.checked,
  );
  syncShortsCompetitionLogoSelect();
  setShortsLogo(
    document.getElementById("shorts-home-logo"),
    document.getElementById("shorts-home-fallback"),
    shortsHomeLogoURL,
    "Logo du club domicile",
    "LIV",
  );
  setShortsLogo(
    document.getElementById("shorts-away-logo"),
    document.getElementById("shorts-away-fallback"),
    shortsAwayLogoURL,
    "Logo du club extérieur",
    "RMA",
  );

  [
    [shortsHomeScore, "shorts-home-score-display"],
    [shortsAwayScore, "shorts-away-score-display"],
  ].forEach(([input, displayId]) => {
    const display = document.getElementById(displayId);
    display.querySelector(".shorts-score-value").textContent = input.value;
    display.classList.toggle("is-empty", input.value === "");
  });
}

function getShortsSettings() {
  return {
    season: shortsSeason.value,
    round: shortsRound.value,
    logoSize: Number(shortsLogoSize.value),
    logoGap: Number(shortsLogoGap.value),
    centerWidth: Number(shortsCenterWidth.value),
    centerVertical: Number(shortsCenterVertical.value),
    scoreWidth: Number(shortsScoreWidth.value),
    competitionLogoSize: Number(shortsCompetitionLogoSize.value),
    competitionLogoVertical: Number(shortsCompetitionLogoVertical.value),
    metaFont: shortsMetaFont.value,
    metaFontSize: Number(shortsMetaFontSize.value),
    competitionLogoWhite: shortsCompetitionLogoWhite.checked,
    penaltyEnabled: shortsPenaltyToggle.checked,
    penaltyColor: shortsPenaltyColor.value,
    penaltyWidth: Number(shortsPenaltyWidth.value),
    penaltyWidthVersion: SHORTS_PENALTY_WIDTH_VERSION,
    penaltyHomeShots: [...shortsPenaltyHomeShots],
    penaltyAwayShots: [...shortsPenaltyAwayShots],
    centerBackground: shortsCenterBackground.value,
    competitionBackground: shortsCompetitionBackground.value,
    borderStart: shortsBorderStart.value,
    borderEnd: shortsBorderEnd.value,
    borderWidth: Number(shortsBorderWidth.value),
    competitionBorderStart: shortsCompetitionBorderStart.value,
    competitionBorderEnd: shortsCompetitionBorderEnd.value,
    competitionBorderWidth: Number(shortsCompetitionBorderWidth.value),
    homeScore: shortsHomeScore.value,
    awayScore: shortsAwayScore.value,
    competitionLogo: shortsCompetitionLogoURL,
    homeLogo: shortsHomeLogoURL,
    awayLogo: shortsAwayLogoURL,
  };
}

function saveShortsSettings() {
  try {
    localStorage.setItem(
      SHORTS_STORAGE_KEY,
      JSON.stringify(getShortsSettings()),
    );
  } catch (error) {
    console.error("Impossible d'enregistrer les réglages Shorts.", error);
  }
}

function applyShortsSettings(savedShorts) {
  if (!savedShorts || typeof savedShorts !== "object") return;
  let migratedPenaltyWidth = false;
  if (typeof savedShorts.season === "string")
    shortsSeason.value = savedShorts.season;
  if (typeof savedShorts.round === "string")
    shortsRound.value = savedShorts.round;

  [
    ["logoSize", shortsLogoSize, 180, 800],
    ["logoGap", shortsLogoGap, 0, 200],
    ["centerWidth", shortsCenterWidth, 120, 340],
    ["centerVertical", shortsCenterVertical, -80, 80],
    ["scoreWidth", shortsScoreWidth, 70, 160],
    ["metaFontSize", shortsMetaFontSize, 10, 40],
    ["competitionLogoSize", shortsCompetitionLogoSize, 40, 192],
    ["competitionLogoVertical", shortsCompetitionLogoVertical, -100, 40],
    ["borderWidth", shortsBorderWidth, 1, 8],
    ["competitionBorderWidth", shortsCompetitionBorderWidth, 1, 8],
  ].forEach(([key, input, min, max]) => {
    const value = Number(savedShorts[key]);
    if (
      savedShorts[key] != null &&
      Number.isFinite(value) &&
      value >= min &&
      value <= max
    )
      input.value = value;
  });

  const savedPenaltyWidth =
    savedShorts.penaltyWidth != null
      ? Number(savedShorts.penaltyWidth)
      : Number(savedShorts.scoreWidth);
  if (Number.isFinite(savedPenaltyWidth) && savedPenaltyWidth > 0) {
    const storedPenaltyWidthVersion = Number(
      savedShorts.penaltyWidthVersion,
    );
    const isLegacyPenaltyWidth =
      !Number.isFinite(storedPenaltyWidthVersion) ||
      storedPenaltyWidthVersion < SHORTS_PENALTY_LEGACY_WIDTH_VERSION;
    const width = isLegacyPenaltyWidth
      ? Math.round((savedPenaltyWidth * 1.5) / 5) * 5
      : Math.round(savedPenaltyWidth / 5) * 5;
    shortsPenaltyWidth.value = Math.min(360, Math.max(155, width));
    migratedPenaltyWidth = isLegacyPenaltyWidth;
  }

  if (
    typeof savedShorts.metaFont === "string" &&
    Object.prototype.hasOwnProperty.call(
      SHORTS_META_FONTS,
      savedShorts.metaFont,
    )
  )
    shortsMetaFont.value = savedShorts.metaFont;
  if (typeof savedShorts.competitionLogoWhite === "boolean")
    shortsCompetitionLogoWhite.checked = savedShorts.competitionLogoWhite;
  if (typeof savedShorts.penaltyEnabled === "boolean")
    shortsPenaltyToggle.checked = savedShorts.penaltyEnabled;
  if (
    typeof savedShorts.penaltyColor === "string" &&
    /^#[0-9a-f]{6}$/i.test(savedShorts.penaltyColor)
  )
    shortsPenaltyColor.value = savedShorts.penaltyColor;
  if (Array.isArray(savedShorts.penaltyHomeShots))
    shortsPenaltyHomeShots = savedShorts.penaltyHomeShots.filter(
      (shot) => typeof shot === "boolean",
    );
  if (Array.isArray(savedShorts.penaltyAwayShots))
    shortsPenaltyAwayShots = savedShorts.penaltyAwayShots.filter(
      (shot) => typeof shot === "boolean",
    );
  if (
    typeof savedShorts.centerBackground === "string" &&
    /^#[0-9a-f]{6}$/i.test(savedShorts.centerBackground)
  )
    shortsCenterBackground.value = savedShorts.centerBackground;
  if (
    typeof savedShorts.competitionBackground === "string" &&
    /^#[0-9a-f]{6}$/i.test(savedShorts.competitionBackground)
  )
    shortsCompetitionBackground.value = savedShorts.competitionBackground;
  if (
    typeof savedShorts.borderStart === "string" &&
    /^#[0-9a-f]{6}$/i.test(savedShorts.borderStart)
  )
    shortsBorderStart.value = savedShorts.borderStart;
  if (
    typeof savedShorts.borderEnd === "string" &&
    /^#[0-9a-f]{6}$/i.test(savedShorts.borderEnd)
  )
    shortsBorderEnd.value = savedShorts.borderEnd;
  if (
    typeof savedShorts.competitionBorderStart === "string" &&
    /^#[0-9a-f]{6}$/i.test(savedShorts.competitionBorderStart)
  )
    shortsCompetitionBorderStart.value = savedShorts.competitionBorderStart;
  if (
    typeof savedShorts.competitionBorderEnd === "string" &&
    /^#[0-9a-f]{6}$/i.test(savedShorts.competitionBorderEnd)
  )
    shortsCompetitionBorderEnd.value = savedShorts.competitionBorderEnd;
  if (typeof savedShorts.homeScore === "string")
    shortsHomeScore.value = savedShorts.homeScore;
  if (typeof savedShorts.awayScore === "string")
    shortsAwayScore.value = savedShorts.awayScore;
  if (Object.prototype.hasOwnProperty.call(savedShorts, "competitionLogo"))
    shortsCompetitionLogoURL =
      typeof savedShorts.competitionLogo === "string"
        ? savedShorts.competitionLogo
        : null;
  if (typeof savedShorts.homeLogo === "string")
    shortsHomeLogoURL = savedShorts.homeLogo;
  if (typeof savedShorts.awayLogo === "string")
    shortsAwayLogoURL = savedShorts.awayLogo;

  shortsCompetitionLogoFile.value = "";
  shortsHomeLogoFile.value = "";
  shortsAwayLogoFile.value = "";
  updateShortsPreview();
  if (migratedPenaltyWidth) saveShortsSettings();
}

try {
  const savedShorts = JSON.parse(
    localStorage.getItem(SHORTS_STORAGE_KEY) || "null",
  );
  if (savedShorts && typeof savedShorts === "object")
    applyShortsSettings(savedShorts);
} catch (error) {
  console.warn("Les réglages Shorts enregistrés sont illisibles.", error);
}

function getShortsPresets() {
  const saved = localStorage.getItem(SHORTS_PRESETS_KEY);
  if (!saved) return [];
  const presets = JSON.parse(saved);
  if (!Array.isArray(presets))
    throw new TypeError("Le format des sauvegardes Shorts est invalide.");
  return presets.filter(
    (preset) =>
      preset &&
      typeof preset.name === "string" &&
      preset.settings &&
      typeof preset.settings === "object",
  );
}

function renderShortsPresets(selectedIndex = "") {
  const presets = getShortsPresets();
  shortsSavedSelect.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choisir une sauvegarde…";
  shortsSavedSelect.append(placeholder);

  presets.forEach((preset, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = preset.name;
    shortsSavedSelect.append(option);
  });
  shortsSavedSelect.value = selectedIndex;
}

function saveShortsPreset() {
  const name = shortsSaveName.value.trim();
  if (!name) {
    alert("Saisis un nom pour cette sauvegarde.");
    shortsSaveName.focus();
    return;
  }

  try {
    const presets = getShortsPresets();
    const existingIndex = presets.findIndex((preset) => preset.name === name);
    const preset = { name, settings: getShortsSettings() };
    const selectedIndex =
      existingIndex >= 0 ? existingIndex : presets.length;
    if (existingIndex >= 0) presets[existingIndex] = preset;
    else presets.push(preset);

    localStorage.setItem(SHORTS_PRESETS_KEY, JSON.stringify(presets));
    renderShortsPresets(String(selectedIndex));
    showPresetSaveStatus(shortsSaveName, name);
  } catch (error) {
    console.error("Impossible d'enregistrer cette sauvegarde Shorts.", error);
    alert("La sauvegarde Shorts n'a pas pu être enregistrée.");
  }
}

function loadShortsPreset() {
  const index = Number.parseInt(shortsSavedSelect.value, 10);
  if (!Number.isInteger(index)) return;

  try {
    const preset = getShortsPresets()[index];
    if (!preset) return;
    applyShortsSettings(preset.settings);
    saveShortsSettings();
    shortsSaveName.value = preset.name;
  } catch (error) {
    console.error("Impossible de charger cette sauvegarde Shorts.", error);
    alert("La sauvegarde Shorts n'a pas pu être chargée.");
  }
}

function deleteShortsPreset() {
  const index = Number.parseInt(shortsSavedSelect.value, 10);
  if (!Number.isInteger(index)) return;

  try {
    const presets = getShortsPresets();
    const preset = presets[index];
    if (!preset) return;
    presets.splice(index, 1);
    localStorage.setItem(SHORTS_PRESETS_KEY, JSON.stringify(presets));
    renderShortsPresets();
    shortsSaveName.value = "";
  } catch (error) {
    console.error("Impossible de supprimer cette sauvegarde Shorts.", error);
    alert("La sauvegarde Shorts n'a pas pu être supprimée.");
  }
}

try {
  renderShortsPresets();
} catch (error) {
  console.error("Impossible de lire les sauvegardes Shorts.", error);
}

document.getElementById("shorts-save").addEventListener("click", saveShortsPreset);
document.getElementById("shorts-load").addEventListener("click", loadShortsPreset);
document
  .getElementById("shorts-delete")
  .addEventListener("click", deleteShortsPreset);
shortsSavedSelect.addEventListener("change", () => {
  const index = Number.parseInt(shortsSavedSelect.value, 10);
  if (!Number.isInteger(index)) return;
  try {
    const preset = getShortsPresets()[index];
    if (preset) shortsSaveName.value = preset.name;
  } catch (error) {
    console.error("Impossible de lire les sauvegardes Shorts.", error);
  }
});

[
  shortsSeason,
  shortsRound,
  shortsLogoSize,
  shortsLogoGap,
  shortsCenterWidth,
  shortsCenterVertical,
  shortsScoreWidth,
  shortsCompetitionLogoSize,
  shortsCompetitionLogoVertical,
  shortsMetaFont,
  shortsMetaFontSize,
  shortsCenterBackground,
  shortsCompetitionBackground,
  shortsBorderStart,
  shortsBorderEnd,
  shortsBorderWidth,
  shortsCompetitionBorderStart,
  shortsCompetitionBorderEnd,
  shortsCompetitionBorderWidth,
  shortsHomeScore,
  shortsAwayScore,
  shortsPenaltyToggle,
  shortsPenaltyColor,
  shortsPenaltyWidth,
].forEach((input) => {
  input.addEventListener("input", () => {
    updateShortsPreview();
    saveShortsSettings();
  });
  input.addEventListener("change", () => {
    updateShortsPreview();
    saveShortsSettings();
  });
});

shortsCompetitionLogoWhite.addEventListener("change", () => {
  updateShortsPreview();
  saveShortsSettings();
});

function recordShortsPenaltyShot(team, scored) {
  const shots =
    team === "home" ? shortsPenaltyHomeShots : shortsPenaltyAwayShots;
  shots.push(scored);
  updateShortsPreview();
  saveShortsSettings();
}

[
  ["shorts-penalty-home-goal", "home", true],
  ["shorts-penalty-home-miss", "home", false],
  ["shorts-penalty-away-goal", "away", true],
  ["shorts-penalty-away-miss", "away", false],
].forEach(([buttonId, team, scored]) => {
  document.getElementById(buttonId).addEventListener("click", () => {
    recordShortsPenaltyShot(team, scored);
  });
});

[
  ["shorts-penalty-home-undo", "home"],
  ["shorts-penalty-away-undo", "away"],
].forEach(([buttonId, team]) => {
  document.getElementById(buttonId).addEventListener("click", () => {
    const shots =
      team === "home" ? shortsPenaltyHomeShots : shortsPenaltyAwayShots;
    shots.pop();
    updateShortsPreview();
    saveShortsSettings();
  });
});

document
  .getElementById("shorts-penalty-reset")
  .addEventListener("click", () => {
    shortsPenaltyHomeShots = [];
    shortsPenaltyAwayShots = [];
    updateShortsPreview();
    saveShortsSettings();
  });

shortsCompetitionLogoSelect.addEventListener("change", () => {
  shortsCompetitionLogoURL = shortsCompetitionLogoSelect.value || null;
  shortsCompetitionLogoFile.value = "";
  updateShortsPreview();
  saveShortsSettings();
});

[
  [shortsCompetitionLogoFile, "competition"],
  [shortsHomeLogoFile, "home"],
  [shortsAwayLogoFile, "away"],
].forEach(([input, team]) => {
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    const path = `./Logos/${file.name}`;
    if (team === "competition") shortsCompetitionLogoURL = path;
    else if (team === "home") shortsHomeLogoURL = path;
    else shortsAwayLogoURL = path;
    updateShortsPreview();
    saveShortsSettings();
  });
});

[
  ["shorts-competition-logo-clear", shortsCompetitionLogoFile, "competition"],
  ["shorts-home-logo-clear", shortsHomeLogoFile, "home"],
  ["shorts-away-logo-clear", shortsAwayLogoFile, "away"],
].forEach(([buttonId, input, team]) => {
  document.getElementById(buttonId).addEventListener("click", () => {
    if (team === "competition") shortsCompetitionLogoURL = null;
    else if (team === "home") shortsHomeLogoURL = null;
    else shortsAwayLogoURL = null;
    input.value = "";
    updateShortsPreview();
    saveShortsSettings();
  });
});

updateShortsPreview();

const shortsBoard = document.getElementById("shorts-board");
new ResizeObserver(() => updateShortsPreview()).observe(
  shortsBoard.parentElement,
);

/* ============================================================
   5) SHOWDOWN PANEL
   ============================================================ */
const SD_FONTS = {
  condensed: "'Barlow Condensed', 'Archivo Narrow', 'Arial Narrow', sans-serif",
  system:
    "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, sans-serif",
  arial: "Arial, Helvetica, sans-serif",
  impact: "Impact, 'Arial Black', 'Helvetica Inserat', sans-serif",
  cinzel: "'Cinzel', 'Trajan Pro', serif",
  mono: "'Courier New', Courier, monospace",
};

const SD_STORAGE_KEY = "ucl-showdown-v1";
const SD_SAVED_KEY = "ucl-showdown-saves-v1";
const SD_SAVED_TYPOS_KEY = "ucl-showdown-typos-v1";
const SD_SAVED_BGS_KEY = "ucl-showdown-bgs-v1";

const sdName1Input = document.getElementById("sd-name-1-input");
const sdName2Input = document.getElementById("sd-name-2-input");
const sdLogo1File = document.getElementById("sd-logo-1-file");
const sdLogo2File = document.getElementById("sd-logo-2-file");
const sdLogo1Clear = document.getElementById("sd-logo-1-clear");
const sdLogo2Clear = document.getElementById("sd-logo-2-clear");
const sdRound = document.getElementById("sd-round");
const sdLeg = document.getElementById("sd-leg");
const sdPlace = document.getElementById("sd-place");
const sdDate = document.getElementById("sd-date");
const sdReferee = document.getElementById("sd-referee");
const sdRefereeCountry = document.getElementById("sd-referee-country");
const sdBgColor1 = document.getElementById("sd-bg-color-1");
const sdBgColor2 = document.getElementById("sd-bg-color-2");
const sdBgDir = document.getElementById("sd-bg-direction");
const sdBgOpacity = document.getElementById("sd-bg-opacity");
const sdBgOpacityValue = document.getElementById("sd-bg-opacity-value");
const sdColorText = document.getElementById("sd-color-text");
const sdMatchFont = document.getElementById("sd-match-font");
const sdMatchSize = document.getElementById("sd-match-size");
const sdMatchSizeValue = document.getElementById("sd-match-size-value");
const sdMatchWeight = document.getElementById("sd-match-weight");
const sdNameFont = document.getElementById("sd-name-font");
const sdNameSize = document.getElementById("sd-name-size");
const sdNameSizeValue = document.getElementById("sd-name-size-value");
const sdNameWeight = document.getElementById("sd-name-weight");
const sdLogoShadowsToggle = document.getElementById("sd-logo-shadows-toggle");
const sdLogo1ShadowsColor = document.getElementById("sd-logo-1-shadows-color");
const sdLogo2ShadowsColor = document.getElementById("sd-logo-2-shadows-color");
const sdTextShadowsToggle = document.getElementById("sd-text-shadows-toggle");
const sdCenterLogoToggle = document.getElementById("sd-center-logo-toggle");
const sdCenterLogoSize = document.getElementById("sd-center-logo-size");
const sdCenterLogoSizeValue = document.getElementById(
  "sd-center-logo-size-value",
);
const sdTeamLogoSize = document.getElementById("sd-team-logo-size");
const sdTeamLogoSizeValue = document.getElementById("sd-team-logo-size-value");
const sdTeamGap = document.getElementById("sd-team-gap");
const sdTeamGapValue = document.getElementById("sd-team-gap-value");
const sdMetaFont = document.getElementById("sd-meta-font");
const sdMetaSize = document.getElementById("sd-meta-size");
const sdMetaSizeValue = document.getElementById("sd-meta-size-value");
const sdMetaWeight = document.getElementById("sd-meta-weight");

// Result + scorers
const sdResultToggle = document.getElementById("sd-result-toggle");
const sdScore1 = document.getElementById("sd-score-1");
const sdScore2 = document.getElementById("sd-score-2");
const sdPenaltyToggle = document.getElementById("sd-penalty-toggle");
const sdPenaltyScore1 = document.getElementById("sd-penalty-score-1");
const sdPenaltyScore2 = document.getElementById("sd-penalty-score-2");
const sdScoreSize = document.getElementById("sd-score-size");
const sdScoreSizeValue = document.getElementById("sd-score-size-value");
const sdScoreFont = document.getElementById("sd-score-font");
const sdScoreWeight = document.getElementById("sd-score-weight");
const sdScoreColor = document.getElementById("sd-score-color");
const sdScorers1 = document.getElementById("sd-scorers-1");
const sdScorers2 = document.getElementById("sd-scorers-2");
const sdScorersFont = document.getElementById("sd-scorers-font");
const sdScorersSize = document.getElementById("sd-scorers-size");
const sdScorersSizeValue = document.getElementById("sd-scorers-size-value");
const sdScorersWeight = document.getElementById("sd-scorers-weight");
const sdScorersColor = document.getElementById("sd-scorers-color");

let sdLogo1URL = null;
let sdLogo2URL = null;

function parseScorers(text) {
  return (text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, minute] = line.split("|").map((s) => (s || "").trim());
      return { name: name || "", minute: minute || "" };
    });
}

function renderScorersList(ul, scorers) {
  if (!ul) return;
  ul.innerHTML = scorers
    .map(
      (s) =>
        `<li><span class="sd-scorer-name">${escapeHtml(s.name)}</span>${
          s.minute
            ? ` <span class="sd-scorer-minute">${escapeHtml(s.minute)}</span>`
            : ""
        }</li>`,
    )
    .join("");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSdLogo(box, url) {
  box.innerHTML = url ? `<img src="${url}" alt="logo" />` : "";
}

function updateShowdown() {
  document.getElementById("sd-name-1").textContent = sdName1Input.value;
  document.getElementById("sd-name-2").textContent = sdName2Input.value;
  renderSdLogo(document.getElementById("sd-logo-1"), sdLogo1URL);
  renderSdLogo(document.getElementById("sd-logo-2"), sdLogo2URL);
  const round = sdRound.value;
  const leg = sdLeg.value;
  document.getElementById("sd-match").textContent = leg
    ? `${round} - ${leg}`
    : round;
  document.getElementById("sd-meta-place").textContent = sdPlace.value;
  document.getElementById("sd-meta-date").textContent = sdDate.value;
  const refereeName = sdReferee.value.trim();
  const refereeCountry = sdRefereeCountry.value.trim().toUpperCase();
  document.getElementById("sd-meta-referee").textContent =
    refereeName && refereeCountry ? `${refereeName} (${refereeCountry})` : refereeName;

  const board = document.getElementById("showdown-board");
  board.classList.toggle("show-logo-shadows", sdLogoShadowsToggle.checked);
  board.classList.toggle("show-text-shadows", sdTextShadowsToggle.checked);
  [
    ["sd-logo-1", sdLogo1ShadowsColor],
    ["sd-logo-2", sdLogo2ShadowsColor],
  ].forEach(([id, colorSelect]) => {
    const logoBox = document.getElementById(id);
    logoBox.style.setProperty(
      "--sd-logo-shadow-color",
      colorSelect.value === "black" ? "#000" : "#fff",
    );
  });
  const bgAlpha = +sdBgOpacity.value / 100;
  const bgC1 = hexToRgba(sdBgColor1.value, bgAlpha);
  const bgC2 = hexToRgba(sdBgColor2.value, bgAlpha);
  board.style.background = `linear-gradient(${sdBgDir.value}deg, ${bgC1}, ${bgC2})`;
  board.style.color = sdColorText.value;
  if (sdBgOpacityValue) sdBgOpacityValue.textContent = sdBgOpacity.value + "%";

  const matchEl = document.getElementById("sd-match");
  matchEl.style.fontFamily = SD_FONTS[sdMatchFont.value] || SD_FONTS.system;
  matchEl.style.fontSize = sdMatchSize.value + "px";
  matchEl.style.fontWeight = sdMatchWeight.value;
  if (sdMatchSizeValue) sdMatchSizeValue.textContent = sdMatchSize.value + "px";

  const nameFont = SD_FONTS[sdNameFont.value] || SD_FONTS.system;
  ["sd-name-1", "sd-name-2"].forEach((id) => {
    const el = document.getElementById(id);
    el.style.fontFamily = nameFont;
    el.style.fontSize = sdNameSize.value + "px";
    el.style.fontWeight = sdNameWeight.value;
  });
  if (sdNameSizeValue) sdNameSizeValue.textContent = sdNameSize.value + "px";

  const centerLogo = document.getElementById("sd-center-logo");
  if (centerLogo) {
    centerLogo.style.height = sdCenterLogoSize.value + "px";
    centerLogo.style.display = sdCenterLogoToggle.checked ? "" : "none";
  }
  if (sdCenterLogoSizeValue)
    sdCenterLogoSizeValue.textContent = sdCenterLogoSize.value + "px";
  const teamLogoPx = sdTeamLogoSize.value + "px";
  ["sd-logo-1", "sd-logo-2"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.style.width = teamLogoPx;
      el.style.height = teamLogoPx;
    }
  });
  document.querySelectorAll("#showdown-board .sd-team").forEach((el) => {
    el.style.width = teamLogoPx;
  });
  if (sdTeamLogoSizeValue)
    sdTeamLogoSizeValue.textContent = sdTeamLogoSize.value + "px";
  const teamGap = +sdTeamGap.value;
  const padX = Math.max(0, 60 - teamGap);
  const sdMain = document.querySelector("#showdown-board .sd-main");
  if (sdMain) {
    sdMain.style.paddingLeft = "";
    sdMain.style.paddingRight = "";
  }
  if (board) {
    board.style.paddingLeft = padX + "px";
    board.style.paddingRight = padX + "px";
  }
  if (sdTeamGapValue) sdTeamGapValue.textContent = teamGap + "px";

  const metaFont = SD_FONTS[sdMetaFont.value] || SD_FONTS.system;
  document.querySelectorAll(".sd-meta-item, .sd-referee-name").forEach((el) => {
    el.style.fontFamily = metaFont;
    el.style.fontSize = sdMetaSize.value + "px";
    el.style.fontWeight = sdMetaWeight.value;
  });
  document.querySelectorAll(".sd-meta-sep").forEach((el) => {
    el.style.fontFamily = metaFont;
    el.style.fontSize = sdMetaSize.value + "px";
  });
  if (sdMetaSizeValue) sdMetaSizeValue.textContent = sdMetaSize.value + "px";

  // ---- Result mode (score at center + scorers under teams) ----
  const resultOn = !!(sdResultToggle && sdResultToggle.checked);
  board.classList.toggle("show-result", resultOn);

  const scoreWrap = document.getElementById("sd-score-wrap");
  const scoreFont = SD_FONTS[sdScoreFont.value] || SD_FONTS.condensed;
  if (scoreWrap) {
    scoreWrap.style.display = resultOn ? "" : "none";
    scoreWrap.style.fontFamily = scoreFont;
    scoreWrap.style.fontSize = sdScoreSize.value + "px";
    scoreWrap.style.fontWeight = sdScoreWeight.value;
    scoreWrap.style.color = sdScoreColor.value;
  }
  const scoreNum1 = document.getElementById("sd-score-num-1");
  const scoreNum2 = document.getElementById("sd-score-num-2");
  if (scoreNum1) scoreNum1.textContent = sdScore1.value;
  if (scoreNum2) scoreNum2.textContent = sdScore2.value;
  const penaltyScore = document.getElementById("sd-penalty-score");
  if (penaltyScore) {
    penaltyScore.classList.toggle(
      "is-visible",
      resultOn && sdPenaltyToggle.checked,
    );
    penaltyScore.style.fontFamily = scoreFont;
    penaltyScore.style.fontSize =
      Math.max(5, Math.round(Number(sdScoreSize.value) * 0.275)) + "px";
    penaltyScore.style.fontWeight = sdScoreWeight.value;
    penaltyScore.style.color = sdScoreColor.value;
    document.getElementById("sd-penalty-score-num-1").textContent =
      sdPenaltyScore1.value;
    document.getElementById("sd-penalty-score-num-2").textContent =
      sdPenaltyScore2.value;
  }
  if (sdScoreSizeValue) sdScoreSizeValue.textContent = sdScoreSize.value + "px";

  // When result mode is on, hide the central UCL logo to leave room for score
  if (centerLogo) {
    if (resultOn) {
      centerLogo.style.display = "none";
    } else {
      centerLogo.style.display = sdCenterLogoToggle.checked ? "" : "none";
    }
  }

  // Scorers lists
  const ul1 = document.getElementById("sd-scorers-list-1");
  const ul2 = document.getElementById("sd-scorers-list-2");
  if (resultOn) {
    renderScorersList(ul1, parseScorers(sdScorers1.value));
    renderScorersList(ul2, parseScorers(sdScorers2.value));
  } else {
    if (ul1) ul1.innerHTML = "";
    if (ul2) ul2.innerHTML = "";
  }
  const scorersFont = SD_FONTS[sdScorersFont.value] || SD_FONTS.system;
  document.querySelectorAll("#showdown-board .sd-scorers").forEach((el) => {
    el.style.fontFamily = scorersFont;
    el.style.fontSize = sdScorersSize.value + "px";
    el.style.fontWeight = sdScorersWeight.value;
    el.style.color = sdScorersColor.value;
  });
  if (sdScorersSizeValue)
    sdScorersSizeValue.textContent = sdScorersSize.value + "px";
}

function collectShowdownData() {
  return {
    name1: sdName1Input.value,
    name2: sdName2Input.value,
    logo1URL: sdLogo1URL,
    logo2URL: sdLogo2URL,
    round: sdRound.value,
    leg: sdLeg.value,
    place: sdPlace.value,
    date: sdDate.value,
    referee: sdReferee.value,
    refereeCountry: sdRefereeCountry.value,
    bg: collectShowdownBgData(),
    typo: collectShowdownTypoData(),
    colorText: sdColorText.value,
    result: collectShowdownResultData(),
  };
}

function collectShowdownResultData() {
  return {
    enabled: sdResultToggle.checked,
    score1: sdScore1.value,
    score2: sdScore2.value,
    penaltyEnabled: sdPenaltyToggle.checked,
    penaltyScore1: sdPenaltyScore1.value,
    penaltyScore2: sdPenaltyScore2.value,
    scoreFont: sdScoreFont.value,
    scoreSize: sdScoreSize.value,
    scoreWeight: sdScoreWeight.value,
    scoreColor: sdScoreColor.value,
    scorers1: sdScorers1.value,
    scorers2: sdScorers2.value,
    scorersFont: sdScorersFont.value,
    scorersSize: sdScorersSize.value,
    scorersWeight: sdScorersWeight.value,
    scorersColor: sdScorersColor.value,
  };
}

function applyShowdownResultData(d) {
  if (!d) return;
  if (typeof d.enabled === "boolean") sdResultToggle.checked = d.enabled;
  if (d.score1 != null) sdScore1.value = d.score1;
  if (d.score2 != null) sdScore2.value = d.score2;
  if (typeof d.penaltyEnabled === "boolean")
    sdPenaltyToggle.checked = d.penaltyEnabled;
  if (d.penaltyScore1 != null) sdPenaltyScore1.value = d.penaltyScore1;
  if (d.penaltyScore2 != null) sdPenaltyScore2.value = d.penaltyScore2;
  if (d.scoreFont) sdScoreFont.value = d.scoreFont;
  if (d.scoreSize != null) sdScoreSize.value = d.scoreSize;
  if (d.scoreWeight) sdScoreWeight.value = d.scoreWeight;
  if (d.scoreColor) sdScoreColor.value = d.scoreColor;
  if (d.scorers1 != null) sdScorers1.value = d.scorers1;
  if (d.scorers2 != null) sdScorers2.value = d.scorers2;
  if (d.scorersFont) sdScorersFont.value = d.scorersFont;
  if (d.scorersSize != null) sdScorersSize.value = d.scorersSize;
  if (d.scorersWeight) sdScorersWeight.value = d.scorersWeight;
  if (d.scorersColor) sdScorersColor.value = d.scorersColor;
}

function collectShowdownBgData() {
  return {
    color1: sdBgColor1.value,
    color2: sdBgColor2.value,
    dir: sdBgDir.value,
    opacity: sdBgOpacity.value,
    colorText: sdColorText.value,
    logoShadowsEnabled: sdLogoShadowsToggle.checked,
    logo1ShadowsColor: sdLogo1ShadowsColor.value,
    logo2ShadowsColor: sdLogo2ShadowsColor.value,
    textShadowsEnabled: sdTextShadowsToggle.checked,
    imageEnabled: sdBgImgToggle.checked,
    imageFile: sdBgImgSelect.value,
    imageOpacity: sdBgImgOpacity.value,
    imageFadeEnabled: sdBgImgFadeToggle.checked,
    imageFadeDir: sdBgImgFadeDir.value,
    imageFadeEnd: sdBgImgFadeEnd.value,
  };
}

function collectShowdownTypoData() {
  return {
    matchFont: sdMatchFont.value,
    matchSize: sdMatchSize.value,
    matchWeight: sdMatchWeight.value,
    nameFont: sdNameFont.value,
    nameSize: sdNameSize.value,
    nameWeight: sdNameWeight.value,
    centerLogoEnabled: sdCenterLogoToggle.checked,
    centerLogoSize: sdCenterLogoSize.value,
    teamLogoSize: sdTeamLogoSize.value,
    teamGap: sdTeamGap.value,
    metaFont: sdMetaFont.value,
    metaSize: sdMetaSize.value,
    metaWeight: sdMetaWeight.value,
  };
}

function applyShowdownBgData(d, persist = true) {
  if (!d) return;
  if (d.color1) sdBgColor1.value = d.color1;
  if (d.color2) sdBgColor2.value = d.color2;
  if (d.dir) sdBgDir.value = d.dir;
  if (d.opacity != null) sdBgOpacity.value = d.opacity;
  if (d.colorText) sdColorText.value = d.colorText;
  const hasLogoShadowsSetting = typeof d.logoShadowsEnabled === "boolean";
  const hasTextShadowsSetting = typeof d.textShadowsEnabled === "boolean";
  if (hasLogoShadowsSetting)
    sdLogoShadowsToggle.checked = d.logoShadowsEnabled;
  if (hasTextShadowsSetting)
    sdTextShadowsToggle.checked = d.textShadowsEnabled;
  const hasLogo1ShadowsColor =
    d.logo1ShadowsColor === "black" || d.logo1ShadowsColor === "white";
  const hasLogo2ShadowsColor =
    d.logo2ShadowsColor === "black" || d.logo2ShadowsColor === "white";
  if (hasLogo1ShadowsColor)
    sdLogo1ShadowsColor.value = d.logo1ShadowsColor;
  if (hasLogo2ShadowsColor)
    sdLogo2ShadowsColor.value = d.logo2ShadowsColor;
  if (d.logoShadowsColor === "black" || d.logoShadowsColor === "white") {
    if (!hasLogo1ShadowsColor)
      sdLogo1ShadowsColor.value = d.logoShadowsColor;
    if (!hasLogo2ShadowsColor)
      sdLogo2ShadowsColor.value = d.logoShadowsColor;
  }
  if (typeof d.shadesEnabled === "boolean") {
    if (!hasLogoShadowsSetting)
      sdLogoShadowsToggle.checked = d.shadesEnabled;
    if (!hasTextShadowsSetting)
      sdTextShadowsToggle.checked = d.shadesEnabled;
  }
  if (typeof d.imageEnabled === "boolean") {
    sdBgImgToggle.checked = d.imageEnabled;
    if (persist) localStorage.setItem(SD_BG_IMAGE_PREF_KEY, d.imageEnabled ? "1" : "0");
  }
  if (d.imageFile != null) {
    if ([...sdBgImgSelect.options].some((o) => o.value === d.imageFile)) {
      sdBgImgSelect.value = d.imageFile;
      if (persist) localStorage.setItem(SD_BG_IMAGE_FILE_KEY, d.imageFile);
    }
  }
  if (d.imageOpacity != null) {
    sdBgImgOpacity.value = d.imageOpacity;
    if (persist) localStorage.setItem(SD_BG_IMAGE_OPACITY_KEY, d.imageOpacity);
  }
  if (typeof d.imageFadeEnabled === "boolean") {
    sdBgImgFadeToggle.checked = d.imageFadeEnabled;
    if (persist) localStorage.setItem(SD_BG_IMAGE_FADE_KEY, d.imageFadeEnabled ? "1" : "0");
  }
  if (d.imageFadeDir) {
    sdBgImgFadeDir.value = d.imageFadeDir;
    if (persist) localStorage.setItem(SD_BG_IMAGE_FADE_DIR_KEY, d.imageFadeDir);
  }
  if (d.imageFadeEnd != null) {
    sdBgImgFadeEnd.value = d.imageFadeEnd;
    if (persist) localStorage.setItem(SD_BG_IMAGE_FADE_END_KEY, d.imageFadeEnd);
  }
  applySdBgImage();
}

function applyShowdownTypoData(d, applyLegacyShades = true) {
  if (!d) return;
  if (d.matchFont) sdMatchFont.value = d.matchFont;
  if (d.matchSize) sdMatchSize.value = d.matchSize;
  if (d.matchWeight) sdMatchWeight.value = d.matchWeight;
  if (d.nameFont) sdNameFont.value = d.nameFont;
  if (d.nameSize) sdNameSize.value = d.nameSize;
  if (d.nameWeight) sdNameWeight.value = d.nameWeight;
  if (applyLegacyShades && typeof d.logoHaloEnabled === "boolean") {
    sdLogoShadowsToggle.checked = d.logoHaloEnabled;
    sdTextShadowsToggle.checked = d.logoHaloEnabled;
  }
  if (typeof d.centerLogoEnabled === "boolean")
    sdCenterLogoToggle.checked = d.centerLogoEnabled;
  if (d.centerLogoSize != null) sdCenterLogoSize.value = d.centerLogoSize;
  if (d.teamLogoSize != null) sdTeamLogoSize.value = d.teamLogoSize;
  if (d.teamGap != null) sdTeamGap.value = d.teamGap;
  if (d.metaFont) sdMetaFont.value = d.metaFont;
  if (d.metaSize) sdMetaSize.value = d.metaSize;
  if (d.metaWeight) sdMetaWeight.value = d.metaWeight;
}

function applyShowdownData(d, persist = true) {
  if (!d) return;
  if (d.name1 != null) sdName1Input.value = d.name1;
  if (d.name2 != null) sdName2Input.value = d.name2;
  sdLogo1URL = d.logo1URL || null;
  sdLogo2URL = d.logo2URL || null;
  if (d.round != null) sdRound.value = d.round;
  if (d.leg != null) sdLeg.value = d.leg;
  if (d.place != null) sdPlace.value = d.place;
  if (d.date != null) sdDate.value = d.date;
  if (d.referee != null) sdReferee.value = d.referee;
  sdRefereeCountry.value = d.refereeCountry ?? "";
  applyShowdownBgData(d.bg, persist);
  const bgHasShadowsSettings =
    d.bg &&
    (typeof d.bg.logoShadowsEnabled === "boolean" ||
      typeof d.bg.textShadowsEnabled === "boolean" ||
      typeof d.bg.shadesEnabled === "boolean");
  applyShowdownTypoData(d.typo, !bgHasShadowsSettings);
  applyShowdownResultData(d.result);
  if (d.colorText) sdColorText.value = d.colorText;
}

function compressShowdownData(d) {
  if (!d) return d;
  if (d.bg) {
    const name = findPresetNameByContent(sdBgCRUD.get(), d.bg);
    if (name) {
      d.bgRef = name;
      delete d.bg;
    }
  }
  if (d.typo) {
    const name = findPresetNameByContent(sdTypoCRUD.get(), d.typo);
    if (name) {
      d.typoRef = name;
      delete d.typo;
    }
  }
  return d;
}
function expandShowdownData(d) {
  if (!d) return d;
  if (d.bgRef && !d.bg) {
    const found = sdBgCRUD.get().find((b) => b.name === d.bgRef);
    if (found && found.data) d.bg = found.data;
  }
  if (d.typoRef && !d.typo) {
    const found = sdTypoCRUD.get().find((t) => t.name === d.typoRef);
    if (found && found.data) d.typo = found.data;
  }
  return d;
}

function saveShowdown() {
  try {
    localStorage.setItem(
      SD_STORAGE_KEY,
      JSON.stringify(compressShowdownData(collectShowdownData())),
    );
  } catch (e) {}
}
function loadShowdown() {
  try {
    const raw = localStorage.getItem(SD_STORAGE_KEY);
    if (!raw) return;
    applyShowdownData(expandShowdownData(JSON.parse(raw)));
  } catch (e) {}
}

// CRUD helpers
function makeListCRUD(storageKey, selectId, nameInputId, label) {
  return {
    get: () => {
      try {
        return JSON.parse(localStorage.getItem(storageKey) || "[]");
      } catch {
        return [];
      }
    },
    set: (list) => localStorage.setItem(storageKey, JSON.stringify(list)),
    render: () => {
      const sel = document.getElementById(selectId);
      if (!sel) return;
      const list = JSON.parse(localStorage.getItem(storageKey) || "[]");
      sel.innerHTML =
        list.length === 0
          ? `<option value="">— Aucun ${label} sauvegardé —</option>`
          : list
              .map((s, i) => `<option value="${i}">${s.name}</option>`)
              .join("");
    },
  };
}

const sdShowdownCRUD = makeListCRUD(
  SD_SAVED_KEY,
  "sd-saved-select",
  "sd-save-name",
  "showdown",
);
const sdTypoCRUD = makeListCRUD(
  SD_SAVED_TYPOS_KEY,
  "sd-saved-typo-select",
  "sd-save-typo-name",
  "typo",
);
const sdBgCRUD = makeListCRUD(
  SD_SAVED_BGS_KEY,
  "sd-saved-bg-select",
  "sd-save-bg-name",
  "fond",
);

function stripDataUrlLogosFromSdSaves() {
  const list = sdShowdownCRUD.get();
  let stripped = 0;
  for (const entry of list) {
    const d = entry && entry.data;
    if (!d) continue;
    if (typeof d.logo1URL === "string" && d.logo1URL.startsWith("data:")) {
      d.logo1URL = null;
      stripped++;
    }
    if (typeof d.logo2URL === "string" && d.logo2URL.startsWith("data:")) {
      d.logo2URL = null;
      stripped++;
    }
  }
  if (stripped > 0) sdShowdownCRUD.set(list);
  return stripped;
}

function saveCurrentShowdown() {
  const nameInput = document.getElementById("sd-save-name");
  const name = nameInput.value.trim();
  if (!name) {
    alert("Donne un nom au showdown.");
    return;
  }
  let list = sdShowdownCRUD.get();
  let i = list.findIndex((s) => s.name === name);
  const entry = { name, data: compressShowdownData(collectShowdownData()) };
  if (i >= 0) {
    list[i] = entry;
  } else list.push(entry);
  try {
    sdShowdownCRUD.set(list);
  } catch (err) {
    if (err && err.name === "QuotaExceededError") {
      const stripped = stripDataUrlLogosFromSdSaves();
      list = sdShowdownCRUD.get();
      i = list.findIndex((s) => s.name === name);
      if (i >= 0) list[i] = entry;
      else list.push(entry);
      try {
        sdShowdownCRUD.set(list);
        if (stripped > 0) {
          alert(
            `Quota localStorage atteint : ${stripped} logo(s) intégré(s) dans d'anciennes sauvegardes ont été retirés pour libérer de l'espace. Re-sélectionne-les depuis ./Logos/ si nécessaire.`,
          );
        }
      } catch (err2) {
        alert(
          "Impossible de sauvegarder : quota localStorage toujours dépassé. Supprime quelques showdowns sauvegardés et réessaie.",
        );
        return;
      }
    } else {
      throw err;
    }
  }
  sdShowdownCRUD.render();
  document.getElementById("sd-saved-select").value = String(
    list.findIndex((s) => s.name === name),
  );
  showPresetSaveStatus(nameInput, name);
}
function loadCurrentShowdown() {
  const idx = parseInt(document.getElementById("sd-saved-select").value, 10);
  const list = sdShowdownCRUD.get();
  if (isNaN(idx) || !list[idx]) return;
  applyShowdownData(
    expandShowdownData(JSON.parse(JSON.stringify(list[idx].data))),
  );
  document.getElementById("sd-save-name").value = list[idx].name;
  updateShowdown();
  saveShowdown();
}
function deleteCurrentShowdown() {
  const idx = parseInt(document.getElementById("sd-saved-select").value, 10);
  const list = sdShowdownCRUD.get();
  if (isNaN(idx) || !list[idx]) return;
  list.splice(idx, 1);
  sdShowdownCRUD.set(list);
  sdShowdownCRUD.render();
}

function saveCurrentSdTypo() {
  const nameInput = document.getElementById("sd-save-typo-name");
  const name = nameInput.value.trim();
  if (!name) {
    alert("Donne un nom à la typographie.");
    return;
  }
  const list = sdTypoCRUD.get();
  const i = list.findIndex((s) => s.name === name);
  const entry = { name, data: collectShowdownTypoData() };
  if (i >= 0) {
    list[i] = entry;
  } else list.push(entry);
  sdTypoCRUD.set(list);
  sdTypoCRUD.render();
  document.getElementById("sd-saved-typo-select").value = String(i >= 0 ? i : list.length - 1);
  showPresetSaveStatus(nameInput, name);
}
function loadCurrentSdTypo() {
  const idx = parseInt(
    document.getElementById("sd-saved-typo-select").value,
    10,
  );
  const list = sdTypoCRUD.get();
  if (isNaN(idx) || !list[idx]) return;
  applyShowdownTypoData(list[idx].data);
  document.getElementById("sd-save-typo-name").value = list[idx].name;
  updateShowdown();
  saveShowdown();
}
function deleteCurrentSdTypo() {
  const idx = parseInt(
    document.getElementById("sd-saved-typo-select").value,
    10,
  );
  const list = sdTypoCRUD.get();
  if (isNaN(idx) || !list[idx]) return;
  list.splice(idx, 1);
  sdTypoCRUD.set(list);
  sdTypoCRUD.render();
}

function saveCurrentSdBg() {
  const nameInput = document.getElementById("sd-save-bg-name");
  const name = nameInput.value.trim();
  if (!name) {
    alert("Donne un nom au fond.");
    return;
  }
  const list = sdBgCRUD.get();
  const i = list.findIndex((s) => s.name === name);
  const entry = { name, data: collectShowdownBgData() };
  if (i >= 0) {
    list[i] = entry;
  } else list.push(entry);
  sdBgCRUD.set(list);
  sdBgCRUD.render();
  document.getElementById("sd-saved-bg-select").value = String(i >= 0 ? i : list.length - 1);
  showPresetSaveStatus(nameInput, name);
}
function loadCurrentSdBg() {
  const idx = parseInt(document.getElementById("sd-saved-bg-select").value, 10);
  const list = sdBgCRUD.get();
  if (isNaN(idx) || !list[idx]) return;
  applyShowdownBgData(list[idx].data);
  document.getElementById("sd-save-bg-name").value = list[idx].name;
  updateShowdown();
  saveShowdown();
}
function deleteCurrentSdBg() {
  const idx = parseInt(document.getElementById("sd-saved-bg-select").value, 10);
  const list = sdBgCRUD.get();
  if (isNaN(idx) || !list[idx]) return;
  list.splice(idx, 1);
  sdBgCRUD.set(list);
  sdBgCRUD.render();
}

// Logo file upload handlers — store a path reference to ./Logos/<filename>
// instead of an inline data URL (avoids hitting the localStorage quota).
// The file must exist in the project's ./Logos/ folder.
[sdLogo1File, sdLogo2File].forEach((input, idx) => {
  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const path = `./Logos/${file.name}`;
    if (idx === 0) sdLogo1URL = path;
    else sdLogo2URL = path;
    updateShowdown();
    saveShowdown();
  });
});
sdLogo1Clear.addEventListener("click", () => {
  sdLogo1URL = null;
  sdLogo1File.value = "";
  updateShowdown();
  saveShowdown();
});
sdLogo2Clear.addEventListener("click", () => {
  sdLogo2URL = null;
  sdLogo2File.value = "";
  updateShowdown();
  saveShowdown();
});

// All input/change listeners for auto-update + auto-save
const sdInputEls = [
  sdName1Input,
  sdName2Input,
  sdPlace,
  sdDate,
  sdReferee,
  sdRefereeCountry,
  sdBgColor1,
  sdBgColor2,
  sdBgOpacity,
  sdColorText,
  sdMatchSize,
  sdNameSize,
  sdCenterLogoSize,
  sdTeamLogoSize,
  sdTeamGap,
  sdMetaSize,
  sdScore1,
  sdScore2,
  sdPenaltyScore1,
  sdPenaltyScore2,
  sdScoreSize,
  sdScoreColor,
  sdScorers1,
  sdScorers2,
  sdScorersSize,
  sdScorersColor,
];
const sdChangeEls = [
  sdRound,
  sdLeg,
  sdBgDir,
  sdLogoShadowsToggle,
  sdLogo1ShadowsColor,
  sdLogo2ShadowsColor,
  sdTextShadowsToggle,
  sdCenterLogoToggle,
  sdMatchFont,
  sdMatchWeight,
  sdNameFont,
  sdNameWeight,
  sdMetaFont,
  sdMetaWeight,
  sdResultToggle,
  sdPenaltyToggle,
  sdScoreFont,
  sdScoreWeight,
  sdScorersFont,
  sdScorersWeight,
];
sdInputEls.forEach((el) =>
  el.addEventListener("input", () => {
    updateShowdown();
    saveShowdown();
  }),
);
sdChangeEls.forEach((el) =>
  el.addEventListener("change", () => {
    updateShowdown();
    saveShowdown();
  }),
);

// Swap teams (names, logos, scores, scorers, penalty scores)
const sdSwapTeams = document.getElementById("sd-swap-teams");
if (sdSwapTeams) {
  sdSwapTeams.addEventListener("click", () => {
    [sdName1Input.value, sdName2Input.value] = [
      sdName2Input.value,
      sdName1Input.value,
    ];
    [sdLogo1URL, sdLogo2URL] = [sdLogo2URL, sdLogo1URL];
    [sdScore1.value, sdScore2.value] = [sdScore2.value, sdScore1.value];
    [sdPenaltyScore1.value, sdPenaltyScore2.value] = [
      sdPenaltyScore2.value,
      sdPenaltyScore1.value,
    ];
    [sdScorers1.value, sdScorers2.value] = [sdScorers2.value, sdScorers1.value];
    updateShowdown();
    saveShowdown();
  });
}

document
  .getElementById("sd-save")
  .addEventListener("click", saveCurrentShowdown);
document
  .getElementById("sd-load")
  .addEventListener("click", loadCurrentShowdown);
document
  .getElementById("sd-delete")
  .addEventListener("click", deleteCurrentShowdown);
document
  .getElementById("sd-save-typo")
  .addEventListener("click", saveCurrentSdTypo);
document
  .getElementById("sd-load-typo")
  .addEventListener("click", loadCurrentSdTypo);
document
  .getElementById("sd-delete-typo")
  .addEventListener("click", deleteCurrentSdTypo);
document
  .getElementById("sd-save-bg")
  .addEventListener("click", saveCurrentSdBg);
document
  .getElementById("sd-load-bg")
  .addEventListener("click", loadCurrentSdBg);
document
  .getElementById("sd-delete-bg")
  .addEventListener("click", deleteCurrentSdBg);

/* ----- Showdown background image ----- */
const SD_BG_IMAGE_PREF_KEY = "ucl-showdown-bg-image-v1";
const SD_BG_IMAGE_FILE_KEY = "ucl-showdown-bg-image-file-v1";
const SD_BG_IMAGE_OPACITY_KEY = "ucl-showdown-bg-image-opacity-v1";
const SD_BG_IMAGE_FADE_KEY = "ucl-showdown-bg-image-fade-v1";
const SD_BG_IMAGE_FADE_DIR_KEY = "ucl-showdown-bg-image-fade-dir-v1";
const SD_BG_IMAGE_FADE_END_KEY = "ucl-showdown-bg-image-fade-end-v1";

const sdBgImgToggle = document.getElementById("sd-bg-image-toggle");
const sdBgImgSelect = document.getElementById("sd-bg-image-select");
const sdBgImgOpacity = document.getElementById("sd-bg-image-opacity");
const sdBgImgOpacityValue = document.getElementById(
  "sd-bg-image-opacity-value",
);
const sdBgImgFadeToggle = document.getElementById("sd-bg-image-fade-toggle");
const sdBgImgFadeDir = document.getElementById("sd-bg-image-fade-dir");
const sdBgImgFadeEnd = document.getElementById("sd-bg-image-fade-end");
const sdBgImgFadeEndValue = document.getElementById(
  "sd-bg-image-fade-end-value",
);

function applySdBgImage() {
  const board = document.getElementById("showdown-board");
  const imgDiv = document.getElementById("sd-bg-image");
  if (!board || !imgDiv) return;
  const imgOpacity = +sdBgImgOpacity.value / 100;
  if (sdBgImgOpacityValue)
    sdBgImgOpacityValue.textContent = sdBgImgOpacity.value + "%";
  const fadeEndRatio = +sdBgImgFadeEnd.value / 100;
  if (sdBgImgFadeEndValue)
    sdBgImgFadeEndValue.textContent = sdBgImgFadeEnd.value + "%";
  const hasFile = !!sdBgImgSelect.value;
  board.classList.toggle("has-bg-image", sdBgImgToggle.checked && hasFile);
  imgDiv.style.backgroundImage = hasFile
    ? `url('./${sdBgImgSelect.value}')`
    : "none";
  imgDiv.style.opacity = imgOpacity;
  if (sdBgImgFadeToggle.checked) {
    const dirMap = {
      right: "to right",
      left: "to left",
      bottom: "to bottom",
      top: "to top",
    };
    const dir = dirMap[sdBgImgFadeDir.value] || "to right";
    const grad = `linear-gradient(${dir}, rgba(0,0,0,1), rgba(0,0,0,${fadeEndRatio}))`;
    imgDiv.style.maskImage = grad;
    imgDiv.style.webkitMaskImage = grad;
  } else {
    imgDiv.style.maskImage = "";
    imgDiv.style.webkitMaskImage = "";
  }
}

sdBgImgToggle.checked = localStorage.getItem(SD_BG_IMAGE_PREF_KEY) === "1";
const savedSdBgFile = localStorage.getItem(SD_BG_IMAGE_FILE_KEY);
if (
  savedSdBgFile &&
  [...sdBgImgSelect.options].some((o) => o.value === savedSdBgFile)
) {
  sdBgImgSelect.value = savedSdBgFile;
}
const savedSdImgOp = localStorage.getItem(SD_BG_IMAGE_OPACITY_KEY);
if (savedSdImgOp != null) sdBgImgOpacity.value = savedSdImgOp;
sdBgImgFadeToggle.checked = localStorage.getItem(SD_BG_IMAGE_FADE_KEY) === "1";
const savedSdFadeDir = localStorage.getItem(SD_BG_IMAGE_FADE_DIR_KEY);
if (savedSdFadeDir) sdBgImgFadeDir.value = savedSdFadeDir;
const savedSdFadeEnd = localStorage.getItem(SD_BG_IMAGE_FADE_END_KEY);
if (savedSdFadeEnd != null) sdBgImgFadeEnd.value = savedSdFadeEnd;

applySdBgImage();

sdBgImgToggle.addEventListener("change", () => {
  localStorage.setItem(SD_BG_IMAGE_PREF_KEY, sdBgImgToggle.checked ? "1" : "0");
  applySdBgImage();
});
sdBgImgSelect.addEventListener("change", () => {
  localStorage.setItem(SD_BG_IMAGE_FILE_KEY, sdBgImgSelect.value);
  applySdBgImage();
});
sdBgImgOpacity.addEventListener("input", () => {
  localStorage.setItem(SD_BG_IMAGE_OPACITY_KEY, sdBgImgOpacity.value);
  applySdBgImage();
});
sdBgImgFadeToggle.addEventListener("change", () => {
  localStorage.setItem(
    SD_BG_IMAGE_FADE_KEY,
    sdBgImgFadeToggle.checked ? "1" : "0",
  );
  applySdBgImage();
});
sdBgImgFadeDir.addEventListener("change", () => {
  localStorage.setItem(SD_BG_IMAGE_FADE_DIR_KEY, sdBgImgFadeDir.value);
  applySdBgImage();
});
sdBgImgFadeEnd.addEventListener("input", () => {
  localStorage.setItem(SD_BG_IMAGE_FADE_END_KEY, sdBgImgFadeEnd.value);
  applySdBgImage();
});

loadShowdown();
sdShowdownCRUD.render();
sdTypoCRUD.render();
sdBgCRUD.render();
updateShowdown();

/* ----- Showdown top border line ----- */
const SD_TOPLINE_PREF_KEY = "ucl-showdown-topline-v1";
const SD_TOPLINE_THICKNESS_KEY = "ucl-showdown-topline-thickness-v1";
const SD_TOPLINE_COLOR1_KEY = "ucl-showdown-topline-color1-v1";
const SD_TOPLINE_COLOR2_KEY = "ucl-showdown-topline-color2-v1";

const sdToplineToggle = document.getElementById("sd-topline-toggle");
const sdToplineThickness = document.getElementById("sd-topline-thickness");
const sdToplineThicknessValue = document.getElementById(
  "sd-topline-thickness-value",
);
const sdToplineColor1 = document.getElementById("sd-topline-color-1");
const sdToplineColor2 = document.getElementById("sd-topline-color-2");

function applySdTopLine() {
  const board = document.getElementById("showdown-board");
  const line = document.getElementById("sd-top-line");
  if (!board || !line) return;
  board.classList.toggle("show-topline", sdToplineToggle.checked);
  line.style.height = sdToplineThickness.value + "px";
  if (sdToplineThicknessValue)
    sdToplineThicknessValue.textContent = sdToplineThickness.value + "px";
  line.style.background = `linear-gradient(90deg, ${sdToplineColor1.value} 0%, ${sdToplineColor2.value} 100%)`;
}

sdToplineToggle.checked = localStorage.getItem(SD_TOPLINE_PREF_KEY) === "1";
const savedSdToplineThickness = localStorage.getItem(SD_TOPLINE_THICKNESS_KEY);
if (savedSdToplineThickness != null)
  sdToplineThickness.value = savedSdToplineThickness;
const savedSdToplineColor1 = localStorage.getItem(SD_TOPLINE_COLOR1_KEY);
if (savedSdToplineColor1) sdToplineColor1.value = savedSdToplineColor1;
const savedSdToplineColor2 = localStorage.getItem(SD_TOPLINE_COLOR2_KEY);
if (savedSdToplineColor2) sdToplineColor2.value = savedSdToplineColor2;

applySdTopLine();

sdToplineToggle.addEventListener("change", () => {
  localStorage.setItem(
    SD_TOPLINE_PREF_KEY,
    sdToplineToggle.checked ? "1" : "0",
  );
  applySdTopLine();
});
sdToplineThickness.addEventListener("input", () => {
  localStorage.setItem(SD_TOPLINE_THICKNESS_KEY, sdToplineThickness.value);
  applySdTopLine();
});
sdToplineColor1.addEventListener("input", () => {
  localStorage.setItem(SD_TOPLINE_COLOR1_KEY, sdToplineColor1.value);
  applySdTopLine();
});
sdToplineColor2.addEventListener("input", () => {
  localStorage.setItem(SD_TOPLINE_COLOR2_KEY, sdToplineColor2.value);
  applySdTopLine();
});

/* ============================================================
   EXPORT TO PNG (via html-to-image-style using SVG foreignObject)
   ============================================================ */
const EXPORT_RESOLUTION_HEIGHT = {
  "4k": 2160,
  "1080p": 1080,
  "720p": 720,
  "580p": 580,
};
const EXPORT_RESOLUTION_WIDTH = {
  "4k": 3840,
  "1080p": 1920,
  "720p": 1280,
  "580p": 1024,
};

function loadExternalScript(src, globalName) {
  if (globalName && typeof window[globalName] !== "undefined")
    return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
}

function imageUrlToDataUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        resolve(c.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("Image load failed: " + url));
    img.src = url;
  });
}

async function preInlineBgImages(target) {
  const restore = [];
  const candidates = target.querySelectorAll(
    "#lb-bg-image, #sd-bg-image, [style*='background-image']",
  );
  for (const el of candidates) {
    const bgImage = el.style.backgroundImage;
    const m = bgImage && bgImage.match(/url\(['"]?([^'")]+)['"]?\)/);
    if (!m) continue;
    const url = m[1];
    if (url.startsWith("data:")) continue;
    try {
      const dataUrl = await imageUrlToDataUrl(url);
      restore.push({ el, original: bgImage });
      el.style.backgroundImage = `url('${dataUrl}')`;
    } catch (e) {
      console.warn("Cannot inline bg image for export:", url, e);
    }
  }
  return restore;
}

function slugForExport(text) {
  return (text || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildGraphicExportBaseName(activeContainer, resolution) {
  const kind = activeContainer.dataset.preview || "graphic";
  const val = (id) => {
    const el = document.getElementById(id);
    if (!el) return "";
    return ("value" in el ? el.value : el.textContent) || "";
  };
  const parts = [];
  switch (kind) {
    case "player": {
      const player = slugForExport(
        `${val("p-firstname")} ${val("p-lastname")}`.trim(),
      );
      const club = slugForExport(val("p-club-name"));
      const minute = slugForExport(val("p-minute"));
      parts.push("banner");
      if (player) parts.push(player);
      if (club) parts.push(club);
      if (minute) parts.push(minute + "min");
      break;
    }
    case "lineup": {
      const team = slugForExport(val("l-team"));
      const round = slugForExport(val("l-footer-round"));
      const leg = slugForExport(val("l-footer-leg"));
      parts.push("lineup");
      if (team) parts.push(team);
      if (round) parts.push(round);
      if (leg) parts.push(leg);
      break;
    }
    case "score": {
      const home = slugForExport(val("s-home"));
      const away = slugForExport(val("s-away"));
      const hs = slugForExport(val("s-home-score"));
      const as = slugForExport(val("s-away-score"));
      parts.push("score");
      if (home && away) parts.push(`${home}-vs-${away}`);
      if (hs !== "" && as !== "") parts.push(`${hs}-${as}`);
      break;
    }
    case "shorts": {
      const season = slugForExport(val("shorts-season"));
      const round = slugForExport(val("shorts-round"));
      parts.push("shorts");
      if (season) parts.push(season);
      if (round) parts.push(round);
      break;
    }
    case "showdown": {
      const t1 = slugForExport(val("sd-name-1-input") || val("sd-name-1"));
      const t2 = slugForExport(val("sd-name-2-input") || val("sd-name-2"));
      const round = slugForExport(val("sd-round"));
      const leg = slugForExport(val("sd-leg"));
      parts.push("showdown");
      if (t1 && t2) parts.push(`${t1}-vs-${t2}`);
      if (round) parts.push(round);
      if (leg) parts.push(leg);
      break;
    }
    case "thumbnail": {
      const team = slugForExport(val("tn-team-name"));
      const year = slugForExport(val("tn-year"));
      parts.push("thumbnail");
      if (team) parts.push(team);
      if (year) parts.push(year);
      break;
    }
    default:
      parts.push("ucl-graphic");
  }
  parts.push(resolution);
  return parts.filter(Boolean).join("-") || "ucl-graphic";
}

async function renderGraphicExport(target, format, options) {
  if (format === "svg") {
    const dataUrl = await window.htmlToImage.toSvg(target, options);
    return (await fetch(dataUrl)).blob();
  }

  const canvas = await window.htmlToImage.toCanvas(target, options);
  if (format === "pdf") {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: canvas.width >= canvas.height ? "landscape" : "portrait",
      unit: "px",
      format: [canvas.width, canvas.height],
      hotfixes: ["px_scaling"],
    });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
    return pdf.output("blob");
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Impossible de générer le PNG."));
    }, "image/png");
  });
}

function downloadGraphicExport(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function loadGraphicExportLibraries(format, archive) {
  await loadExternalScript(
    "https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js",
    "htmlToImage",
  );
  if (format === "pdf") {
    await loadExternalScript(
      "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
      "jspdf",
    );
  }
  if (archive) {
    await loadExternalScript(
      "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",
      "JSZip",
    );
  }
}

function supportsGraphicLayers(preview) {
  return preview === "lineup" || preview === "showdown";
}

async function renderGraphicComposition(active, settings, baseName, modes, archive) {
  const { format, resolution } = settings;
  const target = active.firstElementChild;
  const preview = active.dataset.preview;
  const targetHeight = EXPORT_RESOLUTION_HEIGHT[resolution] || 1080;
  const targetWidth = EXPORT_RESOLUTION_WIDTH[resolution] || 1920;
  const rect = target.getBoundingClientRect();
  const aspect = rect.width / rect.height;
  const scale = preview === "shorts"
    ? targetHeight / rect.width
    : aspect > 3
      ? targetWidth / rect.width
      : targetHeight / rect.height;
  const options = {
    width: rect.width * scale,
    height: rect.height * scale,
    pixelRatio: scale,
    backgroundColor: null,
    style: {
      transform: `scale(${scale})`,
      transformOrigin: "top left",
      width: rect.width + "px",
      height: rect.height + "px",
    },
  };
  const restored = [];
  try {
    restored.push(...(await preInlineBgImages(target)));
    for (const mode of modes) {
      if (supportsGraphicLayers(preview)) target.dataset.exportMode = mode;
      const suffix = mode === "background" ? "-fond" : mode === "team" ? "-equipe" : "";
      const filename = `${baseName}${suffix}.${format}`;
      const blob = await renderGraphicExport(target, format, options);
      if (archive) archive.file(filename, blob);
      else downloadGraphicExport(blob, filename);
    }
  } finally {
    for (const { el, original } of restored) el.style.backgroundImage = original;
    delete target.dataset.exportMode;
  }
}

function graphicExportSettings() {
  return {
    format: document.getElementById("export-format").value,
    resolution: document.getElementById("export-resolution").value,
  };
}

const exportButton = document.getElementById("export-btn");
const exportSavedRenders = document.getElementById("export-saved-renders");
const graphicLayerModes = ["background", "team"];

exportButton.addEventListener("click", async () => {
  const active = document.querySelector(".preview-container.active");
  if (!active) return;
  const preview = active.dataset.preview;
  const mode = supportsGraphicLayers(preview)
    ? document.getElementById(`${preview}-export-mode`).value
    : "both";
  const settings = graphicExportSettings();
  const baseName = buildGraphicExportBaseName(active, settings.resolution);
  const separate = mode === "separate";
  exportButton.disabled = exportSavedRenders.disabled = true;
  try {
    await loadGraphicExportLibraries(settings.format, separate);
    const archive = separate ? new window.JSZip() : null;
    await renderGraphicComposition(
      active, settings, baseName, separate ? graphicLayerModes : [mode], archive,
    );
    if (archive) {
      const blob = await archive.generateAsync({ type: "blob" });
      downloadGraphicExport(blob, `${baseName}-calques.zip`);
    }
  } catch (err) {
    alert("Export échoué : " + err.message);
  } finally {
    exportButton.disabled = exportSavedRenders.disabled = false;
  }
});

exportSavedRenders.addEventListener("click", async () => {
  const active = document.querySelector(".preview-container.active");
  const preview = active?.dataset.preview;
  if (!supportsGraphicLayers(preview)) return;

  const isLineup = preview === "lineup";
  const saved = isLineup ? getSavedTeams() : sdShowdownCRUD.get();
  const presets = Array.isArray(saved) ? saved.filter((preset) => preset?.data) : [];
  if (presets.length === 0) {
    alert("Aucune sauvegarde complète à exporter dans cet onglet.");
    return;
  }

  const snapshot = isLineup
    ? { ...collectLineupData(), style: collectStyleData() }
    : collectShowdownData();
  const expand = isLineup ? expandLineupData : expandShowdownData;
  const apply = isLineup ? applyLineupData : applyShowdownData;
  const update = isLineup ? updateLineupCommon : updateShowdown;
  const settings = graphicExportSettings();
  const header = document.querySelector(".app-header");
  const editor = document.querySelector(".editor-panel");
  const originalLabel = exportSavedRenders.textContent;
  const digits = String(presets.length).length;
  exportButton.disabled = exportSavedRenders.disabled = true;
  header.inert = editor.inert = true;

  try {
    exportSavedRenders.textContent = "Préparation de l’export…";
    await loadGraphicExportLibraries(settings.format, true);
    const archive = new window.JSZip();
    for (const [index, preset] of presets.entries()) {
      const position = index + 1;
      exportSavedRenders.textContent = `Export ${position}/${presets.length}…`;
      apply(snapshot, false);
      apply(expand(JSON.parse(JSON.stringify(preset.data))), false);
      update();
      const order = String(position).padStart(digits, "0");
      const name = slugForExport(preset.name) || "sauvegarde";
      await renderGraphicComposition(
        active, settings, `${order}-${name}`, graphicLayerModes, archive,
      );
    }
    const blob = await archive.generateAsync({ type: "blob" });
    downloadGraphicExport(blob, `${preview}-rendus-${settings.resolution}.zip`);
  } catch (err) {
    alert("Export des rendus échoué : " + err.message);
  } finally {
    try {
      apply(snapshot, false);
      update();
    } finally {
      header.inert = editor.inert = false;
      exportSavedRenders.textContent = originalLabel;
      exportButton.disabled = exportSavedRenders.disabled = false;
    }
  }
});

/* ============================================================
   SECTION REORDER (drag-and-drop on .collapsible)
   ============================================================ */
(function () {
  const STORAGE_KEY = "ucl-section-order-v2";

  function slugify(text) {
    return (text || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function summarySlug(details) {
    const s = details.querySelector(":scope > summary");
    return s ? slugify(s.textContent) : "";
  }

  function computeInitialId(details) {
    const parts = [summarySlug(details)];
    let cur = details.parentElement;
    while (cur && !cur.classList.contains("editor-section")) {
      if (cur.classList.contains("collapsible-body")) {
        const pd = cur.parentElement;
        if (pd && pd.classList.contains("collapsible")) {
          parts.unshift(summarySlug(pd));
        }
      }
      cur = cur.parentElement;
    }
    if (cur) parts.unshift(`editor:${cur.dataset.editor}`);
    return parts.join(">");
  }

  function assignInitialIds() {
    document.querySelectorAll(".collapsible").forEach((d) => {
      if (!d.dataset.sectionId) d.dataset.sectionId = computeInitialId(d);
    });
  }

  function parentIdent(container) {
    if (container.classList.contains("editor-section")) {
      return `editor:${container.dataset.editor}`;
    }
    const details = container.parentElement;
    return details && details.dataset.sectionId
      ? details.dataset.sectionId
      : null;
  }

  function findContainerByIdent(ident) {
    if (ident.startsWith("editor:")) {
      const key = ident.slice(7);
      return document.querySelector(`.editor-section[data-editor="${key}"]`);
    }
    const details = document.querySelector(
      `.collapsible[data-section-id="${CSS.escape(ident)}"]`,
    );
    return details ? details.querySelector(":scope > .collapsible-body") : null;
  }

  function findById(id) {
    return document.querySelector(
      `.collapsible[data-section-id="${CSS.escape(id)}"]`,
    );
  }

  function readOrders() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }
  function writeOrders(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function saveOrder(container) {
    if (!container) return;
    const ident = parentIdent(container);
    if (!ident) return;
    const ids = Array.from(
      container.querySelectorAll(":scope > .collapsible"),
    ).map((c) => c.dataset.sectionId);
    const all = readOrders();
    all[ident] = ids;
    writeOrders(all);
  }

  function applySavedOrder() {
    const all = readOrders();
    for (const ident of Object.keys(all)) {
      const container = findContainerByIdent(ident);
      if (!container) continue;
      const ids = all[ident];
      if (!Array.isArray(ids)) continue;
      for (const id of ids) {
        const el = findById(id);
        if (el && el !== container && !el.contains(container)) {
          container.appendChild(el);
        }
      }
    }
    document.querySelectorAll(".collapsible").forEach(updateNestedClass);
  }

  let dragSrc = null;

  function clearDropTargets() {
    document
      .querySelectorAll(".drag-over-before, .drag-over-after, .drag-over-into")
      .forEach((el) =>
        el.classList.remove(
          "drag-over-before",
          "drag-over-after",
          "drag-over-into",
        ),
      );
  }

  function onDragStart(e) {
    const summary = e.currentTarget;
    const details = summary.parentElement;
    if (!details || !details.classList.contains("collapsible")) return;
    dragSrc = details;
    details.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", summarySlug(details));
    } catch {}
    try {
      e.dataTransfer.setDragImage(details, 10, 10);
    } catch {}
    e.stopPropagation();
  }

  function onDragEnd() {
    if (dragSrc) dragSrc.classList.remove("dragging");
    clearDropTargets();
    dragSrc = null;
  }

  function getDropZone(e) {
    if (!dragSrc) return null;
    const target = e.target.closest(".collapsible");
    if (!target || target === dragSrc) return null;
    if (dragSrc.contains(target)) return null;
    const summary = target.querySelector(":scope > summary");
    let position;
    if (summary && (summary === e.target || summary.contains(e.target))) {
      const rect = summary.getBoundingClientRect();
      const ratio = (e.clientY - rect.top) / rect.height;
      if (ratio < 0.3) position = "before";
      else if (ratio > 0.7) position = "after";
      else position = "into";
    } else {
      position = "into";
    }
    return { target, position };
  }

  function updateNestedClass(details) {
    const parent = details.parentElement;
    if (!parent) return;
    if (parent.classList.contains("collapsible-body")) {
      details.classList.add("collapsible-nested");
    } else {
      details.classList.remove("collapsible-nested");
    }
  }

  function onDragOver(e) {
    const zone = getDropZone(e);
    if (!zone) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    clearDropTargets();
    zone.target.classList.add(`drag-over-${zone.position}`);
  }

  function onDrop(e) {
    const zone = getDropZone(e);
    if (!zone) return;
    e.preventDefault();
    const oldParent = dragSrc.parentElement;
    const { target, position } = zone;
    if (position === "before") {
      target.before(dragSrc);
    } else if (position === "after") {
      target.after(dragSrc);
    } else {
      if (!target.hasAttribute("open")) target.setAttribute("open", "");
      const body = target.querySelector(":scope > .collapsible-body");
      if (body) body.appendChild(dragSrc);
    }
    updateNestedClass(dragSrc);
    saveOrder(dragSrc.parentElement);
    if (oldParent && oldParent !== dragSrc.parentElement) saveOrder(oldParent);
    clearDropTargets();
  }

  function setupCollapsible(details) {
    const summary = details.querySelector(":scope > summary");
    if (!summary) return;
    summary.setAttribute("draggable", "true");
    summary.addEventListener("dragstart", onDragStart);
    summary.addEventListener("dragend", onDragEnd);
  }

  function init() {
    assignInitialIds();
    applySavedOrder();
    document.querySelectorAll(".collapsible").forEach(setupCollapsible);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDrop);
    document
      .querySelectorAll(".editor-panel")
      .forEach((p) => p.classList.add("ready"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* ============================================================
   SAVED COLOR PALETTE (shared across all color inputs)
   ============================================================ */
(function () {
  const KEY = "ucl-saved-colors-v1";

  function getColors() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  }
  function setColors(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
    renderAll();
  }
  function addColor(color) {
    const c = (color || "").toLowerCase();
    if (!c || !/^#[0-9a-f]{6}$/.test(c)) return;
    const list = getColors();
    if (list.includes(c)) return;
    list.push(c);
    setColors(list);
  }
  function removeColor(color) {
    const c = (color || "").toLowerCase();
    setColors(getColors().filter((x) => x !== c));
  }

  function renderAll() {
    const list = getColors();
    document.querySelectorAll(".color-palette").forEach((paletteEl) => {
      const input = paletteEl.parentElement.querySelector(
        'input[type="color"]',
      );
      paletteEl.innerHTML = "";
      list.forEach((color) => {
        const sw = document.createElement("button");
        sw.type = "button";
        sw.className = "color-swatch";
        sw.style.background = color;
        sw.title = `${color} — clic pour appliquer, clic droit pour retirer`;
        sw.addEventListener("click", () => {
          if (!input) return;
          input.value = color;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        });
        sw.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          removeColor(color);
        });
        paletteEl.appendChild(sw);
      });
    });
  }

  function wrapInput(input) {
    if (input.dataset.colorWrapped === "1") return;
    input.dataset.colorWrapped = "1";
    const row = document.createElement("div");
    row.className = "color-picker-row";
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "color-save-btn";
    saveBtn.textContent = "+";
    saveBtn.title = "Sauvegarder cette couleur dans la palette";
    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      addColor(input.value);
    });
    const palette = document.createElement("div");
    palette.className = "color-palette";
    const parent = input.parentNode;
    parent.insertBefore(row, input);
    row.appendChild(input);
    row.appendChild(saveBtn);
    row.appendChild(palette);
  }

  function init() {
    document.querySelectorAll('.field input[type="color"]').forEach(wrapInput);
    renderAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* ============================================================
   6) THUMBNAIL PROMPT GENERATOR
   ============================================================ */
(function () {
  const tnTeam = document.getElementById("tn-team-name");
  const tnYear = document.getElementById("tn-year");
  const tnStadium = document.getElementById("tn-stadium");
  const tnStadiumCity = document.getElementById("tn-stadium-city");
  const tnStar = document.getElementById("tn-star-player");
  const tnColors = document.getElementById("tn-team-colors");
  const tnNotes = document.getElementById("tn-extra-notes");
  const tnOutput = document.getElementById("tn-prompt-output");
  const tnCopyBtn = document.getElementById("tn-copy-btn");
  const tnCopyBtn2 = document.getElementById("tn-copy-btn-2");
  const tnResetBtn = document.getElementById("tn-reset-btn");
  const tnStatus = document.getElementById("tn-copy-status");

  if (!tnOutput) return;

  const DEFAULTS = {
    team: "AJAX",
    year: "1973",
    stadium: "Red Star Stadium",
    stadiumCity: "Belgrade",
    star: "Johann Cruyff",
    colors: "rouge et blanc",
    notes: "",
  };

  function prettyCase(s) {
    const v = (s || "").trim();
    if (!v) return "";
    return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
  }

  function buildPrompt() {
    const teamRaw = (tnTeam.value || "").trim();
    const team = teamRaw.toUpperCase() || "TEAM";
    const teamPretty = prettyCase(teamRaw) || "Team";
    const year = (tnYear.value || "").trim() || "YEAR";
    const stadium = (tnStadium.value || "").trim() || "Stadium";
    const city = (tnStadiumCity.value || "").trim() || "City";
    const star = (tnStar.value || "").trim() || "Star Player";
    const colors = (tnColors.value || "").trim() || "team colors";
    const notes = (tnNotes.value || "").trim();

    const lines = [];
    lines.push(
      `Génère la même miniature/poster que l'image de référence, mais adaptée à la victoire européenne de l'${teamPretty} en ${year}.`,
    );
    lines.push("");
    lines.push(
      "Conserve EXACTEMENT le même style artistique, la même composition, le même cadrage, la même typographie, le même éclairage et la même atmosphère cinématique vintage que l'image d'origine. Seuls les éléments listés ci-dessous doivent changer :",
    );
    lines.push("");
    lines.push(
      `- Stade en arrière-plan : Parc des Princes 1956 → ${stadium}, ${city} ${year}.`,
    );
    lines.push(
      `- Blason du club : blason du Real Madrid → blason officiel de l'${teamPretty} (fidèle à l'époque ${year}).`,
    );
    lines.push(
      `- Titre principal : « REAL MADRID - ROAD TO VICTORY » → « ${team} - ROAD TO VICTORY ».`,
    );
    lines.push(`- Mention de l'année : « UCL 1956 » → « UCL ${year} ».`);
    lines.push(
      `- Joueurs représentés : effectif du Real Madrid 1956 → effectif de l'${teamPretty} ${year} (maillots, coupes de cheveux et physionomies fidèles à l'époque).`,
    );
    lines.push(
      `- Joueur vedette à droite : Alfredo Di Stéfano (1956) → ${star} (${year}).`,
    );
    lines.push(
      `- Palette de couleurs : tons blanc et or du Real Madrid → couleurs de l'${teamPretty} (${colors}).`,
    );
    lines.push("");
    lines.push(
      "Important : ne modifie ni la mise en page, ni les proportions, ni les polices, ni la direction artistique générale. Le rendu doit ressembler à une variante directe de l'image de référence, comme si elle appartenait à la même série de posters.",
    );

    if (notes) {
      lines.push("");
      lines.push(`Précisions additionnelles : ${notes}`);
    }

    return lines.join("\n");
  }

  function render() {
    tnOutput.value = buildPrompt();
  }

  let statusTimer = null;
  function flashStatus(msg) {
    if (!tnStatus) return;
    tnStatus.textContent = msg;
    if (statusTimer) clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      tnStatus.textContent = "";
    }, 2500);
  }

  async function copyPrompt() {
    const text = tnOutput.value;
    try {
      await navigator.clipboard.writeText(text);
      flashStatus("✓ Prompt copié dans le presse-papier");
    } catch {
      tnOutput.focus();
      tnOutput.select();
      try {
        document.execCommand("copy");
        flashStatus("✓ Prompt copié");
      } catch {
        flashStatus("⚠ Copie impossible — sélectionnez et copiez manuellement");
      }
    }
  }

  function reset() {
    tnTeam.value = DEFAULTS.team;
    tnYear.value = DEFAULTS.year;
    tnStadium.value = DEFAULTS.stadium;
    tnStadiumCity.value = DEFAULTS.stadiumCity;
    tnStar.value = DEFAULTS.star;
    tnColors.value = DEFAULTS.colors;
    tnNotes.value = DEFAULTS.notes;
    render();
  }

  [tnTeam, tnYear, tnStadium, tnStadiumCity, tnStar, tnColors, tnNotes].forEach(
    (el) => {
      if (el) el.addEventListener("input", render);
    },
  );

  if (tnCopyBtn) tnCopyBtn.addEventListener("click", copyPrompt);
  if (tnCopyBtn2) tnCopyBtn2.addEventListener("click", copyPrompt);
  if (tnResetBtn) tnResetBtn.addEventListener("click", reset);

  render();
})();
