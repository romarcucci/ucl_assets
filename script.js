/* ============================================================
   UCL Graphics Editor — script.js
   ============================================================ */

/* ============ TAB SWITCHING ============ */
const tabs = document.querySelectorAll(".tab");
const editorSections = document.querySelectorAll(".editor-section");
const previewContainers = document.querySelectorAll(".preview-container");

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
  });
});

/* ============================================================
   1) PLAYER BANNER
   ============================================================ */
const CLUB_PRESETS = {
  rma: { name: "RM", bg: "#fff", text: "#0a1a4a", stroke: "#c8a951" },
  lfc: { name: "LFC", bg: "#d40000", text: "#fff", stroke: "#fdb913" },
  bar: { name: "FCB", bg: "#a50044", text: "#fff", stroke: "#edbb00" },
  psg: { name: "PSG", bg: "#004170", text: "#fff", stroke: "#da291c" },
  bay: { name: "FCB", bg: "#dc052d", text: "#fff", stroke: "#0066b2" },
  custom: null,
};

function renderClubLogo(clubKey, fileURL) {
  const logoBox = document.getElementById("pb-logo");
  if (fileURL) {
    logoBox.innerHTML = `<img src="${fileURL}" alt="logo" />`;
    return;
  }
  const preset = CLUB_PRESETS[clubKey];
  if (!preset) {
    logoBox.innerHTML = `<div style="color:#666;font-size:12px;">No logo</div>`;
    return;
  }
  logoBox.innerHTML = `
    <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      <circle cx="30" cy="30" r="28" fill="${preset.bg}" stroke="${preset.stroke}" stroke-width="2"/>
      <text x="30" y="38" text-anchor="middle" font-family="serif" font-size="${preset.name.length > 2 ? 16 : 22}" font-weight="bold" fill="${preset.text}">${preset.name}</text>
    </svg>
  `;
}

const pName = document.getElementById("p-name");
const pMinute = document.getElementById("p-minute");
const pClubName = document.getElementById("p-club-name");
const pClub = document.getElementById("p-club");
const pLogoFile = document.getElementById("p-logo-file");
const pZoneWidth = document.getElementById("p-zone-width");
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
  system: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
  arial: "Arial, Helvetica, sans-serif",
  impact: "Impact, 'Arial Black', 'Helvetica Inserat', sans-serif",
  cinzel: "'Cinzel', 'Trajan Pro', serif",
  mono: "'Courier New', Courier, monospace",
};

const pNameFont = document.getElementById("p-name-font");
const pNameSize = document.getElementById("p-name-size");
const pNameSizeValue = document.getElementById("p-name-size-value");
const pNameWeight = document.getElementById("p-name-weight");
const pMinuteFont = document.getElementById("p-minute-font");
const pMinuteSize = document.getElementById("p-minute-size");
const pMinuteSizeValue = document.getElementById("p-minute-size-value");
const pMinuteWeight = document.getElementById("p-minute-weight");
const pClubnameFont = document.getElementById("p-clubname-font");
const pClubnameSize = document.getElementById("p-clubname-size");
const pClubnameSizeValue = document.getElementById("p-clubname-size-value");
const pClubnameWeight = document.getElementById("p-clubname-weight");

let customLogoURL = null;

function updatePlayerBanner() {
  document.getElementById("pb-name").textContent = pName.value;
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
  nameEl.style.fontFamily = PB_FONTS[pNameFont.value] || PB_FONTS.cinzel;
  nameEl.style.fontSize = pNameSize.value + "px";
  nameEl.style.fontWeight = pNameWeight.value;
  if (pNameSizeValue) pNameSizeValue.textContent = pNameSize.value + "px";

  const minuteEl = document.getElementById("pb-minute");
  minuteEl.style.fontFamily = PB_FONTS[pMinuteFont.value] || PB_FONTS.condensed;
  minuteEl.style.fontSize = pMinuteSize.value + "px";
  minuteEl.style.fontWeight = pMinuteWeight.value;
  if (pMinuteSizeValue) pMinuteSizeValue.textContent = pMinuteSize.value + "px";

  const clubEl = document.getElementById("pb-club-name");
  clubEl.style.fontFamily = PB_FONTS[pClubnameFont.value] || PB_FONTS.condensed;
  clubEl.style.fontSize = pClubnameSize.value + "px";
  clubEl.style.fontWeight = pClubnameWeight.value;
  if (pClubnameSizeValue) pClubnameSizeValue.textContent = pClubnameSize.value + "px";

  const banner = document.getElementById("player-banner");
  banner.style.color = pColorText.value;
  renderClubLogo(pClub.value, customLogoURL);
}

[
  pName,
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
  pNameSize,
  pMinuteSize,
  pClubnameSize,
].forEach((el) => el.addEventListener("input", updatePlayerBanner));
[
  pLogoDir,
  pTopDir,
  pBottomDir,
  pNameFont,
  pNameWeight,
  pMinuteFont,
  pMinuteWeight,
  pClubnameFont,
  pClubnameWeight,
].forEach((el) => el.addEventListener("change", updatePlayerBanner));
pClub.addEventListener("change", () => {
  customLogoURL = null;
  pLogoFile.value = "";
  updatePlayerBanner();
});
pLogoFile.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    customLogoURL = ev.target.result;
    updatePlayerBanner();
  };
  reader.readAsDataURL(file);
});

/* ----- Player Banner save/load ----- */
const BANNER_STORAGE_KEY = "ucl-banner-v1";
const SAVED_BANNERS_KEY = "ucl-banner-saves-v1";

function collectBannerData() {
  return {
    name: pName.value,
    minute: pMinute.value,
    clubName: pClubName.value,
    club: pClub.value,
    customLogoURL: customLogoURL,
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
    nameFont: pNameFont.value,
    nameSize: pNameSize.value,
    nameWeight: pNameWeight.value,
    minuteFont: pMinuteFont.value,
    minuteSize: pMinuteSize.value,
    minuteWeight: pMinuteWeight.value,
    clubnameFont: pClubnameFont.value,
    clubnameSize: pClubnameSize.value,
    clubnameWeight: pClubnameWeight.value,
  };
}

function applyBannerData(d) {
  if (d.name != null) pName.value = d.name;
  if (d.minute != null) pMinute.value = d.minute;
  if (d.clubName != null) pClubName.value = d.clubName;
  if (d.club) pClub.value = d.club;
  customLogoURL = d.customLogoURL || null;
  if (d.zoneWidth) pZoneWidth.value = d.zoneWidth;
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
  if (d.nameFont) pNameFont.value = d.nameFont;
  if (d.nameSize) pNameSize.value = d.nameSize;
  if (d.nameWeight) pNameWeight.value = d.nameWeight;
  if (d.minuteFont) pMinuteFont.value = d.minuteFont;
  if (d.minuteSize) pMinuteSize.value = d.minuteSize;
  if (d.minuteWeight) pMinuteWeight.value = d.minuteWeight;
  if (d.clubnameFont) pClubnameFont.value = d.clubnameFont;
  if (d.clubnameSize) pClubnameSize.value = d.clubnameSize;
  if (d.clubnameWeight) pClubnameWeight.value = d.clubnameWeight;
}

function saveBanner() {
  try {
    localStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify(collectBannerData()));
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
  try { return JSON.parse(localStorage.getItem(SAVED_BANNERS_KEY) || "[]"); }
  catch { return []; }
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
    sel.innerHTML = list.map((b, i) => `<option value="${i}">${b.name}</option>`).join("");
  }
}
function saveCurrentAsBanner() {
  const nameInput = document.getElementById("p-save-name");
  const sName = nameInput.value.trim() || pName.value.trim();
  if (!sName) { alert("Donne un nom à la bannière."); return; }
  const list = getSavedBanners();
  const existing = list.findIndex((b) => b.name === sName);
  const entry = { name: sName, data: collectBannerData() };
  if (existing >= 0) {
    if (!confirm(`Une bannière "${sName}" existe déjà. L'écraser ?`)) return;
    list[existing] = entry;
  } else {
    list.push(entry);
  }
  setSavedBanners(list);
  nameInput.value = "";
  renderSavedBannersList();
  const idx = list.findIndex((b) => b.name === sName);
  document.getElementById("p-saved-select").value = String(idx);
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
  if (!confirm(`Supprimer la bannière "${list[idx].name}" ?`)) return;
  list.splice(idx, 1);
  setSavedBanners(list);
  renderSavedBannersList();
}

document.getElementById("p-save").addEventListener("click", saveCurrentAsBanner);
document.getElementById("p-load").addEventListener("click", loadSelectedBanner);
document.getElementById("p-delete").addEventListener("click", deleteSelectedBanner);

// Auto-save banner on any input
const bannerAutoSaveEls = [
  pName, pMinute, pClubName, pZoneWidth,
  pLogoColor1, pLogoColor2, pLogoDir,
  pTopColor1, pTopColor2, pTopDir,
  pBottomColor1, pBottomColor2, pBottomDir,
  pColorText,
  pNameFont, pNameSize, pNameWeight,
  pMinuteFont, pMinuteSize, pMinuteWeight,
  pClubnameFont, pClubnameSize, pClubnameWeight,
  pClub,
];
bannerAutoSaveEls.forEach((el) => {
  if (!el) return;
  el.addEventListener("input", saveBanner);
  el.addEventListener("change", saveBanner);
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
    colorNum: document.getElementById("l-color-num").value,
    colorNumGk: document.getElementById("l-color-num-gk").value,
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

function applyLineupData(data) {
  if (data.team) document.getElementById("l-team").value = data.team;
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
  if (data.colorNum)
    document.getElementById("l-color-num").value = data.colorNum;
  if (data.colorNumGk)
    document.getElementById("l-color-num-gk").value = data.colorNumGk;
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
      JSON.stringify(collectLineupData()),
    );
  } catch (e) {
    /* storage unavailable */
  }
}

function loadLineup() {
  try {
    const raw = localStorage.getItem(LINEUP_STORAGE_KEY);
    if (!raw) return;
    applyLineupData(JSON.parse(raw));
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
  document.getElementById("l-color-num").value = "#ffffff";
  document.getElementById("l-color-num-gk").value = "#ffffff";
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
  // Exclude background and typo fields from team saves — they have dedicated save systems
  const teamData = collectLineupData();
  delete teamData.colorBg;
  delete teamData.bgOpacity;
  delete teamData.typo;
  const entry = { name, data: teamData };
  if (existing >= 0) {
    if (!confirm(`Une équipe "${name}" existe déjà. L'écraser ?`)) return;
    teams[existing] = entry;
  } else {
    teams.push(entry);
  }
  setSavedTeams(teams);
  nameInput.value = "";
  renderSavedTeamsList();
  // Select the just-saved entry
  const idx = teams.findIndex((t) => t.name === name);
  document.getElementById("l-saved-team-select").value = String(idx);
}
function loadSelectedTeam() {
  const sel = document.getElementById("l-saved-team-select");
  const idx = parseInt(sel.value, 10);
  const teams = getSavedTeams();
  if (isNaN(idx) || !teams[idx]) return;
  applyLineupData(teams[idx].data);
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
  if (!confirm(`Supprimer "${teams[idx].name}" ?`)) return;
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
    if (!confirm(`Une formation "${name}" existe déjà. L'écraser ?`)) return;
    formations[existing] = entry;
  } else {
    formations.push(entry);
  }
  setSavedFormations(formations);
  nameInput.value = "";
  renderSavedFormationsList();
  const idx = formations.findIndex((f) => f.name === name);
  document.getElementById("l-saved-formation-select").value = String(idx);
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
  if (!confirm(`Supprimer la formation "${formations[idx].name}" ?`)) return;
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
    bgImageFadeEnabled: document.getElementById("l-bg-image-fade-toggle").checked,
    bgImageFadeDir: document.getElementById("l-bg-image-fade-dir").value,
    bgImageFadeEnd: document.getElementById("l-bg-image-fade-end").value,
    showStripes: document.getElementById("l-pitch-stripes").checked,
    showDivider: document.getElementById("l-divider-toggle").checked,
    dividerThickness: document.getElementById("l-divider-thickness").value,
    dividerColor1: document.getElementById("l-divider-color-1").value,
    dividerColor2: document.getElementById("l-divider-color-2").value,
  };
}
function applyStyleData(data) {
  if (data.colorBg) document.getElementById("l-color-bg").value = data.colorBg;
  if (data.bgOpacity != null) document.getElementById("l-bg-opacity").value = data.bgOpacity;
  if (typeof data.bgImageEnabled === "boolean") {
    document.getElementById("l-bg-image-toggle").checked = data.bgImageEnabled;
    localStorage.setItem(BG_IMAGE_PREF_KEY, data.bgImageEnabled ? "1" : "0");
  }
  if (data.bgImageFile != null) {
    document.getElementById("l-bg-image-select").value = data.bgImageFile;
    localStorage.setItem(BG_IMAGE_FILE_KEY, data.bgImageFile);
  }
  if (data.bgImageOpacity != null) {
    document.getElementById("l-bg-image-opacity").value = data.bgImageOpacity;
    localStorage.setItem(BG_IMAGE_OPACITY_KEY, data.bgImageOpacity);
  }
  if (typeof data.bgImageFadeEnabled === "boolean") {
    document.getElementById("l-bg-image-fade-toggle").checked = data.bgImageFadeEnabled;
    localStorage.setItem(BG_IMAGE_FADE_KEY, data.bgImageFadeEnabled ? "1" : "0");
  }
  if (data.bgImageFadeDir) {
    document.getElementById("l-bg-image-fade-dir").value = data.bgImageFadeDir;
    localStorage.setItem(BG_IMAGE_FADE_DIR_KEY, data.bgImageFadeDir);
  }
  if (data.bgImageFadeEnd != null) {
    document.getElementById("l-bg-image-fade-end").value = data.bgImageFadeEnd;
    localStorage.setItem(BG_IMAGE_FADE_END_KEY, data.bgImageFadeEnd);
  }
  if (typeof data.showStripes === "boolean") {
    document.getElementById("l-pitch-stripes").checked = data.showStripes;
    localStorage.setItem(STRIPES_PREF_KEY, data.showStripes ? "1" : "0");
    document.getElementById("lb-pitch").classList.toggle("show-stripes", data.showStripes);
  }
  if (typeof data.showDivider === "boolean") {
    document.getElementById("l-divider-toggle").checked = data.showDivider;
    localStorage.setItem(DIVIDER_PREF_KEY, data.showDivider ? "1" : "0");
  }
  if (data.dividerThickness) {
    document.getElementById("l-divider-thickness").value = data.dividerThickness;
    localStorage.setItem(DIVIDER_THICKNESS_KEY, data.dividerThickness);
  }
  if (data.dividerColor1) {
    document.getElementById("l-divider-color-1").value = data.dividerColor1;
    localStorage.setItem(DIVIDER_COLOR1_KEY, data.dividerColor1);
  }
  if (data.dividerColor2) {
    document.getElementById("l-divider-color-2").value = data.dividerColor2;
    localStorage.setItem(DIVIDER_COLOR2_KEY, data.dividerColor2);
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
    if (!confirm(`Un style "${name}" existe déjà. L'écraser ?`)) return;
    styles[existing] = entry;
  } else {
    styles.push(entry);
  }
  setSavedStyles(styles);
  nameInput.value = "";
  renderSavedStylesList();
  const idx = styles.findIndex((s) => s.name === name);
  document.getElementById("l-saved-style-select").value = String(idx);
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
  if (!confirm(`Supprimer le style "${styles[idx].name}" ?`)) return;
  styles.splice(idx, 1);
  setSavedStyles(styles);
  renderSavedStylesList();
}

/* ----- Typographies sauvegardées (lineup) ----- */
function getSavedTypos() {
  try { return JSON.parse(localStorage.getItem(SAVED_TYPOS_KEY) || "[]"); }
  catch { return []; }
}
function setSavedTypos(list) {
  localStorage.setItem(SAVED_TYPOS_KEY, JSON.stringify(list));
}
function renderSavedTyposList() {
  const sel = document.getElementById("l-saved-typo-select");
  if (!sel) return;
  const list = getSavedTypos();
  if (list.length === 0) {
    sel.innerHTML = '<option value="">— Aucune typographie sauvegardée —</option>';
  } else {
    sel.innerHTML = list.map((t, i) => `<option value="${i}">${t.name}</option>`).join("");
  }
}
function collectTypoData() {
  return {
    teamFont: lTeamFont.value, teamSize: lTeamSize.value, teamWeight: lTeamWeight.value,
    footerFont: lFooterFont.value, footerSize: lFooterSize.value, footerWeight: lFooterWeight.value,
    coachFont: lCoachFont.value, coachSize: lCoachSize.value, coachWeight: lCoachWeight.value,
    playerFont: lPlayerFont.value, playerSize: lPlayerSize.value, playerWeight: lPlayerWeight.value,
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
  if (!name) { alert("Donne un nom à la typographie."); return; }
  const list = getSavedTypos();
  const existing = list.findIndex((t) => t.name === name);
  const entry = { name, data: collectTypoData() };
  if (existing >= 0) {
    if (!confirm(`Une typographie "${name}" existe déjà. L'écraser ?`)) return;
    list[existing] = entry;
  } else {
    list.push(entry);
  }
  setSavedTypos(list);
  nameInput.value = "";
  renderSavedTyposList();
  const idx = list.findIndex((t) => t.name === name);
  document.getElementById("l-saved-typo-select").value = String(idx);
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
  if (!confirm(`Supprimer la typographie "${list[idx].name}" ?`)) return;
  list.splice(idx, 1);
  setSavedTypos(list);
  renderSavedTyposList();
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
const lShirtStyle = document.getElementById("l-shirt-style");
const lColorSleeves = document.getElementById("l-color-sleeves");
const lColorStripes = document.getElementById("l-color-stripes");
const lColorNum = document.getElementById("l-color-num");
const lColorNumGk = document.getElementById("l-color-num-gk");
const lNumberFont = document.getElementById("l-number-font");
const lColorText = document.getElementById("l-color-text");
const lColorBg = document.getElementById("l-color-bg");

const LB_FONTS = {
  condensed: "'Barlow Condensed', 'Archivo Narrow', 'Arial Narrow', sans-serif",
  system: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, sans-serif",
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
  const stripesBlock =
    style === "stripes"
      ? `
      <g clip-path="url(#${uid}-body-clip)">
        <rect x="30" y="14" width="8" height="92" fill="${stripeFillColor}" />
        <rect x="46" y="14" width="8" height="92" fill="${stripeFillColor}" />
        <rect x="62" y="14" width="8" height="92" fill="${stripeFillColor}" />
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
  el.addEventListener("mousedown", (e) => {
    dragging = true;
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const pitch = document.getElementById("lb-pitch");
    const rect = pitch.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    playerObj.x = Math.max(2, Math.min(98, x));
    playerObj.y = Math.max(2, Math.min(98, y));
    el.style.left = playerObj.x + "%";
    el.style.top = playerObj.y + "%";
  });
  document.addEventListener("mouseup", () => {
    if (dragging) {
      dragging = false;
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
  document
    .getElementById("lineup-board")
    .style.setProperty("--lb-text-color", lColorText.value);
  // Typography per-element
  const board = document.getElementById("lineup-board");
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
  board.style.setProperty("--lb-player-font", LB_FONTS[lPlayerFont.value] || LB_FONTS.system);
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
  lColorNum,
  lColorNumGk,
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
[lFooterRound, lFooterLeg].forEach((el) =>
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

document.getElementById("l-team-logo-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    teamLogoURL = ev.target.result;
    renderTeamLogo();
    saveLineup();
  };
  reader.readAsDataURL(file);
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

document.getElementById("l-save-style").addEventListener("click", saveCurrentAsStyle);
document.getElementById("l-load-style").addEventListener("click", loadSelectedStyle);
document.getElementById("l-delete-style").addEventListener("click", deleteSelectedStyle);
renderSavedStylesList();

document.getElementById("l-save-typo").addEventListener("click", saveCurrentAsTypo);
document.getElementById("l-load-typo").addEventListener("click", loadSelectedTypo);
document.getElementById("l-delete-typo").addEventListener("click", deleteSelectedTypo);
renderSavedTyposList();

[
  lTeamSize, lFooterSize, lCoachSize, lPlayerSize,
].forEach((el) => el.addEventListener("input", () => { updateLineupCommon(); saveLineup(); }));
[
  lTeamFont, lTeamWeight,
  lFooterFont, lFooterWeight,
  lCoachFont, lCoachWeight,
  lPlayerFont, lPlayerWeight,
].forEach((el) => el.addEventListener("change", () => { updateLineupCommon(); saveLineup(); }));

/* ----- Export / Import JSON (équipes + formations) ----- */
function exportSavesToJson() {
  const state = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("ucl-")) state[k] = localStorage.getItem(k);
  }
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
  a.download = `ucl-saves-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
          typeof k === "string" && k.startsWith("ucl-") && typeof v === "string",
      );
      if (entries.length === 0) {
        alert("Aucune donnée trouvée dans le fichier.");
        return;
      }
      const msg =
        `Importer ${entries.length} entrée(s) du fichier ?\n\n` +
        `Toutes les sauvegardes locales actuelles seront remplacées par ` +
        `celles du fichier. La page sera rechargée après l'import.`;
      if (!confirm(msg)) return;
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("ucl-")) toRemove.push(k);
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
      entries.forEach(([k, v]) => localStorage.setItem(k, v));
      location.reload();
      return;
    }
    const importedTeams = Array.isArray(parsed.teams) ? parsed.teams : [];
    const importedFormations = Array.isArray(parsed.formations)
      ? parsed.formations
      : [];
    const importedStyles = Array.isArray(parsed.styles) ? parsed.styles : [];
    const importedBanners = Array.isArray(parsed.banners) ? parsed.banners : [];
    const importedTypos = Array.isArray(parsed.typos) ? parsed.typos : [];
    const importedShowdowns = Array.isArray(parsed.showdowns) ? parsed.showdowns : [];
    const importedShowdownTypos = Array.isArray(parsed.showdownTypos) ? parsed.showdownTypos : [];
    const importedShowdownBgs = Array.isArray(parsed.showdownBgs) ? parsed.showdownBgs : [];
    const totalCount = importedTeams.length + importedFormations.length + importedStyles.length + importedBanners.length + importedTypos.length + importedShowdowns.length + importedShowdownTypos.length + importedShowdownBgs.length;
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
    sdShowdownCRUD.render();
    sdTypoCRUD.render();
    sdBgCRUD.render();
    alert(
      `Import terminé : ${importedTeams.length} équipe(s), ${importedFormations.length} formation(s), ${importedStyles.length} style(s), ${importedBanners.length} bannière(s), ${importedTypos.length} typo(s), ${importedShowdowns.length} showdown(s), ${importedShowdownTypos.length} typo SD et ${importedShowdownBgs.length} fond SD.`,
    );
  };
  reader.readAsText(file);
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

  const imgOpacity = (+opSlider.value) / 100;
  if (opValueSpan) opValueSpan.textContent = opSlider.value + "%";
  const fadeEndRatio = (+fadeEnd.value) / 100;
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
  localStorage.setItem(BG_IMAGE_FADE_KEY, bgImageFadeToggle.checked ? "1" : "0");
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
const sTime = document.getElementById("s-time");
const sHome = document.getElementById("s-home");
const sHomeScore = document.getElementById("s-home-score");
const sHomeColor = document.getElementById("s-home-color");
const sAway = document.getElementById("s-away");
const sAwayScore = document.getElementById("s-away-score");
const sAwayColor = document.getElementById("s-away-color");
const sBg = document.getElementById("s-bg");

function updateScoreBanner() {
  document.getElementById("sb-time").innerHTML = `⚽ ${sTime.value}`;
  document.getElementById("sb-home").textContent = sHome.value;
  document.getElementById("sb-home-score").textContent = sHomeScore.value;
  document.getElementById("sb-away").textContent = sAway.value;
  document.getElementById("sb-away-score").textContent = sAwayScore.value;
  document.getElementById("sb-home-color").style.background = sHomeColor.value;
  document.getElementById("sb-away-color").style.background = sAwayColor.value;
  document
    .querySelectorAll(
      "#score-banner .sb-team, #score-banner .sb-score, #score-banner .sb-sep",
    )
    .forEach((el) => (el.style.background = sBg.value));
}

[
  sTime,
  sHome,
  sHomeScore,
  sHomeColor,
  sAway,
  sAwayScore,
  sAwayColor,
  sBg,
].forEach((el) => el.addEventListener("input", updateScoreBanner));
updateScoreBanner();

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

// Try to auto-load ./ucl-logo.png from the project folder. If found, use it
// as the default central logo (user can override by uploading another image).
(function tryLoadLocalUclLogo() {
  const img = new Image();
  img.onload = () => {
    if (centralLogoURL === null) {
      centralLogoURL = "./ucl-logo.png";
      if (typeof renderBracket === "function") renderBracket();
    }
  };
  img.onerror = () => {
    /* file not present — keep SVG fallback */
  };
  img.src = "./ucl-logo.png";
})();

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
   5) SHOWDOWN PANEL
   ============================================================ */
const SD_FONTS = {
  condensed: "'Barlow Condensed', 'Archivo Narrow', 'Arial Narrow', sans-serif",
  system: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, sans-serif",
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
const sdVsText = document.getElementById("sd-vs-text");
const sdPlace = document.getElementById("sd-place");
const sdDate = document.getElementById("sd-date");
const sdReferee = document.getElementById("sd-referee");
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
const sdVsFont = document.getElementById("sd-vs-font");
const sdVsSize = document.getElementById("sd-vs-size");
const sdVsSizeValue = document.getElementById("sd-vs-size-value");
const sdVsWeight = document.getElementById("sd-vs-weight");
const sdMetaFont = document.getElementById("sd-meta-font");
const sdMetaSize = document.getElementById("sd-meta-size");
const sdMetaSizeValue = document.getElementById("sd-meta-size-value");
const sdMetaWeight = document.getElementById("sd-meta-weight");

let sdLogo1URL = null;
let sdLogo2URL = null;

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
  document.getElementById("sd-match").textContent = leg ? `${round} - ${leg}` : round;
  document.getElementById("sd-vs").textContent = sdVsText.value;
  document.getElementById("sd-meta-place").textContent = sdPlace.value;
  document.getElementById("sd-meta-date").textContent = sdDate.value;
  document.getElementById("sd-meta-referee").textContent = sdReferee.value;

  const board = document.getElementById("showdown-board");
  const bgAlpha = +sdBgOpacity.value / 100;
  const bgC1 = hexToRgba(sdBgColor1.value, bgAlpha);
  const bgC2 = hexToRgba(sdBgColor2.value, bgAlpha);
  board.style.background = `linear-gradient(${sdBgDir.value}deg, ${bgC1}, ${bgC2})`;
  board.style.color = sdColorText.value;
  if (sdBgOpacityValue)
    sdBgOpacityValue.textContent = sdBgOpacity.value + "%";

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

  const vsEl = document.getElementById("sd-vs");
  vsEl.style.fontFamily = SD_FONTS[sdVsFont.value] || SD_FONTS.cinzel;
  vsEl.style.fontSize = sdVsSize.value + "px";
  vsEl.style.fontWeight = sdVsWeight.value;
  if (sdVsSizeValue) sdVsSizeValue.textContent = sdVsSize.value + "px";

  const metaFont = SD_FONTS[sdMetaFont.value] || SD_FONTS.system;
  document
    .querySelectorAll(".sd-meta-item, .sd-referee-name")
    .forEach((el) => {
      el.style.fontFamily = metaFont;
      el.style.fontSize = sdMetaSize.value + "px";
      el.style.fontWeight = sdMetaWeight.value;
    });
  document.querySelectorAll(".sd-meta-sep").forEach((el) => {
    el.style.fontFamily = metaFont;
    el.style.fontSize = sdMetaSize.value + "px";
  });
  if (sdMetaSizeValue) sdMetaSizeValue.textContent = sdMetaSize.value + "px";
}

function collectShowdownData() {
  return {
    name1: sdName1Input.value,
    name2: sdName2Input.value,
    logo1URL: sdLogo1URL,
    logo2URL: sdLogo2URL,
    round: sdRound.value,
    leg: sdLeg.value,
    vsText: sdVsText.value,
    place: sdPlace.value,
    date: sdDate.value,
    referee: sdReferee.value,
    bg: collectShowdownBgData(),
    typo: collectShowdownTypoData(),
    colorText: sdColorText.value,
  };
}

function collectShowdownBgData() {
  return {
    color1: sdBgColor1.value,
    color2: sdBgColor2.value,
    dir: sdBgDir.value,
    opacity: sdBgOpacity.value,
    colorText: sdColorText.value,
  };
}

function collectShowdownTypoData() {
  return {
    matchFont: sdMatchFont.value, matchSize: sdMatchSize.value, matchWeight: sdMatchWeight.value,
    nameFont: sdNameFont.value, nameSize: sdNameSize.value, nameWeight: sdNameWeight.value,
    vsFont: sdVsFont.value, vsSize: sdVsSize.value, vsWeight: sdVsWeight.value,
    metaFont: sdMetaFont.value, metaSize: sdMetaSize.value, metaWeight: sdMetaWeight.value,
  };
}

function applyShowdownBgData(d) {
  if (!d) return;
  if (d.color1) sdBgColor1.value = d.color1;
  if (d.color2) sdBgColor2.value = d.color2;
  if (d.dir) sdBgDir.value = d.dir;
  if (d.opacity != null) sdBgOpacity.value = d.opacity;
  if (d.colorText) sdColorText.value = d.colorText;
}

function applyShowdownTypoData(d) {
  if (!d) return;
  if (d.matchFont) sdMatchFont.value = d.matchFont;
  if (d.matchSize) sdMatchSize.value = d.matchSize;
  if (d.matchWeight) sdMatchWeight.value = d.matchWeight;
  if (d.nameFont) sdNameFont.value = d.nameFont;
  if (d.nameSize) sdNameSize.value = d.nameSize;
  if (d.nameWeight) sdNameWeight.value = d.nameWeight;
  if (d.vsFont) sdVsFont.value = d.vsFont;
  if (d.vsSize) sdVsSize.value = d.vsSize;
  if (d.vsWeight) sdVsWeight.value = d.vsWeight;
  if (d.metaFont) sdMetaFont.value = d.metaFont;
  if (d.metaSize) sdMetaSize.value = d.metaSize;
  if (d.metaWeight) sdMetaWeight.value = d.metaWeight;
}

function applyShowdownData(d) {
  if (!d) return;
  if (d.name1 != null) sdName1Input.value = d.name1;
  if (d.name2 != null) sdName2Input.value = d.name2;
  sdLogo1URL = d.logo1URL || null;
  sdLogo2URL = d.logo2URL || null;
  if (d.round) sdRound.value = d.round;
  if (d.leg != null) sdLeg.value = d.leg;
  if (d.vsText != null) sdVsText.value = d.vsText;
  if (d.place != null) sdPlace.value = d.place;
  if (d.date != null) sdDate.value = d.date;
  if (d.referee != null) sdReferee.value = d.referee;
  applyShowdownBgData(d.bg);
  applyShowdownTypoData(d.typo);
  if (d.colorText) sdColorText.value = d.colorText;
}

function saveShowdown() {
  try {
    localStorage.setItem(SD_STORAGE_KEY, JSON.stringify(collectShowdownData()));
  } catch (e) {}
}
function loadShowdown() {
  try {
    const raw = localStorage.getItem(SD_STORAGE_KEY);
    if (!raw) return;
    applyShowdownData(JSON.parse(raw));
  } catch (e) {}
}

// CRUD helpers
function makeListCRUD(storageKey, selectId, nameInputId, label) {
  return {
    get: () => { try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch { return []; } },
    set: (list) => localStorage.setItem(storageKey, JSON.stringify(list)),
    render: () => {
      const sel = document.getElementById(selectId);
      if (!sel) return;
      const list = JSON.parse(localStorage.getItem(storageKey) || "[]");
      sel.innerHTML = list.length === 0
        ? `<option value="">— Aucun ${label} sauvegardé —</option>`
        : list.map((s, i) => `<option value="${i}">${s.name}</option>`).join("");
    },
  };
}

const sdShowdownCRUD = makeListCRUD(SD_SAVED_KEY, "sd-saved-select", "sd-save-name", "showdown");
const sdTypoCRUD = makeListCRUD(SD_SAVED_TYPOS_KEY, "sd-saved-typo-select", "sd-save-typo-name", "typo");
const sdBgCRUD = makeListCRUD(SD_SAVED_BGS_KEY, "sd-saved-bg-select", "sd-save-bg-name", "fond");

function saveCurrentShowdown() {
  const nameInput = document.getElementById("sd-save-name");
  const name = nameInput.value.trim();
  if (!name) { alert("Donne un nom au showdown."); return; }
  const list = sdShowdownCRUD.get();
  const i = list.findIndex((s) => s.name === name);
  const entry = { name, data: collectShowdownData() };
  if (i >= 0) { if (!confirm(`Showdown "${name}" existe. Écraser ?`)) return; list[i] = entry; }
  else list.push(entry);
  sdShowdownCRUD.set(list);
  nameInput.value = "";
  sdShowdownCRUD.render();
  document.getElementById("sd-saved-select").value = String(list.findIndex((s) => s.name === name));
}
function loadCurrentShowdown() {
  const idx = parseInt(document.getElementById("sd-saved-select").value, 10);
  const list = sdShowdownCRUD.get();
  if (isNaN(idx) || !list[idx]) return;
  applyShowdownData(list[idx].data);
  document.getElementById("sd-save-name").value = list[idx].name;
  updateShowdown();
  saveShowdown();
}
function deleteCurrentShowdown() {
  const idx = parseInt(document.getElementById("sd-saved-select").value, 10);
  const list = sdShowdownCRUD.get();
  if (isNaN(idx) || !list[idx]) return;
  if (!confirm(`Supprimer "${list[idx].name}" ?`)) return;
  list.splice(idx, 1);
  sdShowdownCRUD.set(list);
  sdShowdownCRUD.render();
}

function saveCurrentSdTypo() {
  const nameInput = document.getElementById("sd-save-typo-name");
  const name = nameInput.value.trim();
  if (!name) { alert("Donne un nom à la typographie."); return; }
  const list = sdTypoCRUD.get();
  const i = list.findIndex((s) => s.name === name);
  const entry = { name, data: collectShowdownTypoData() };
  if (i >= 0) { if (!confirm(`Typographie "${name}" existe. Écraser ?`)) return; list[i] = entry; }
  else list.push(entry);
  sdTypoCRUD.set(list);
  nameInput.value = "";
  sdTypoCRUD.render();
}
function loadCurrentSdTypo() {
  const idx = parseInt(document.getElementById("sd-saved-typo-select").value, 10);
  const list = sdTypoCRUD.get();
  if (isNaN(idx) || !list[idx]) return;
  applyShowdownTypoData(list[idx].data);
  document.getElementById("sd-save-typo-name").value = list[idx].name;
  updateShowdown();
  saveShowdown();
}
function deleteCurrentSdTypo() {
  const idx = parseInt(document.getElementById("sd-saved-typo-select").value, 10);
  const list = sdTypoCRUD.get();
  if (isNaN(idx) || !list[idx]) return;
  if (!confirm(`Supprimer "${list[idx].name}" ?`)) return;
  list.splice(idx, 1);
  sdTypoCRUD.set(list);
  sdTypoCRUD.render();
}

function saveCurrentSdBg() {
  const nameInput = document.getElementById("sd-save-bg-name");
  const name = nameInput.value.trim();
  if (!name) { alert("Donne un nom au fond."); return; }
  const list = sdBgCRUD.get();
  const i = list.findIndex((s) => s.name === name);
  const entry = { name, data: collectShowdownBgData() };
  if (i >= 0) { if (!confirm(`Fond "${name}" existe. Écraser ?`)) return; list[i] = entry; }
  else list.push(entry);
  sdBgCRUD.set(list);
  nameInput.value = "";
  sdBgCRUD.render();
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
  if (!confirm(`Supprimer "${list[idx].name}" ?`)) return;
  list.splice(idx, 1);
  sdBgCRUD.set(list);
  sdBgCRUD.render();
}

// Logo file upload handlers
[sdLogo1File, sdLogo2File].forEach((input, idx) => {
  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (idx === 0) sdLogo1URL = ev.target.result;
      else sdLogo2URL = ev.target.result;
      updateShowdown();
      saveShowdown();
    };
    reader.readAsDataURL(file);
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
  sdName1Input, sdName2Input, sdVsText, sdPlace, sdDate, sdReferee,
  sdBgColor1, sdBgColor2, sdBgOpacity, sdColorText,
  sdMatchSize, sdNameSize, sdVsSize, sdMetaSize,
];
const sdChangeEls = [
  sdRound, sdLeg, sdBgDir,
  sdMatchFont, sdMatchWeight,
  sdNameFont, sdNameWeight,
  sdVsFont, sdVsWeight,
  sdMetaFont, sdMetaWeight,
];
sdInputEls.forEach((el) => el.addEventListener("input", () => { updateShowdown(); saveShowdown(); }));
sdChangeEls.forEach((el) => el.addEventListener("change", () => { updateShowdown(); saveShowdown(); }));

document.getElementById("sd-save").addEventListener("click", saveCurrentShowdown);
document.getElementById("sd-load").addEventListener("click", loadCurrentShowdown);
document.getElementById("sd-delete").addEventListener("click", deleteCurrentShowdown);
document.getElementById("sd-save-typo").addEventListener("click", saveCurrentSdTypo);
document.getElementById("sd-load-typo").addEventListener("click", loadCurrentSdTypo);
document.getElementById("sd-delete-typo").addEventListener("click", deleteCurrentSdTypo);
document.getElementById("sd-save-bg").addEventListener("click", saveCurrentSdBg);
document.getElementById("sd-load-bg").addEventListener("click", loadCurrentSdBg);
document.getElementById("sd-delete-bg").addEventListener("click", deleteCurrentSdBg);

loadShowdown();
sdShowdownCRUD.render();
sdTypoCRUD.render();
sdBgCRUD.render();
updateShowdown();

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
const sdBgImgOpacityValue = document.getElementById("sd-bg-image-opacity-value");
const sdBgImgFadeToggle = document.getElementById("sd-bg-image-fade-toggle");
const sdBgImgFadeDir = document.getElementById("sd-bg-image-fade-dir");
const sdBgImgFadeEnd = document.getElementById("sd-bg-image-fade-end");
const sdBgImgFadeEndValue = document.getElementById("sd-bg-image-fade-end-value");

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
  localStorage.setItem(SD_TOPLINE_PREF_KEY, sdToplineToggle.checked ? "1" : "0");
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

document.getElementById("export-btn").addEventListener("click", async () => {
  const active = document.querySelector(".preview-container.active");
  if (!active) return;
  const target = active.firstElementChild;
  const format = document.getElementById("export-format").value;
  const resolution = document.getElementById("export-resolution").value;
  const targetHeight = EXPORT_RESOLUTION_HEIGHT[resolution] || 1080;
  const rect = target.getBoundingClientRect();
  const scale = targetHeight / rect.height;
  const baseName = `ucl-graphic-${resolution}-${Date.now()}`;

  const restored = await preInlineBgImages(target);

  try {
    await loadExternalScript(
      "https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js",
      "htmlToImage",
    );
    const renderOptions = {
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

    if (format === "svg") {
      const dataUrl = await window.htmlToImage.toSvg(target, renderOptions);
      const link = document.createElement("a");
      link.download = `${baseName}.svg`;
      link.href = dataUrl;
      link.click();
      return;
    }

    const canvas = await window.htmlToImage.toCanvas(target, renderOptions);

    if (format === "pdf") {
      await loadExternalScript(
        "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
        "jspdf",
      );
      const { jsPDF } = window.jspdf;
      const orientation =
        canvas.width >= canvas.height ? "landscape" : "portrait";
      const pdf = new jsPDF({
        orientation,
        unit: "px",
        format: [canvas.width, canvas.height],
        hotfixes: ["px_scaling"],
      });
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        canvas.width,
        canvas.height,
      );
      pdf.save(`${baseName}.pdf`);
      return;
    }

    // Default: PNG
    const link = document.createElement("a");
    link.download = `${baseName}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (err) {
    alert("Export échoué : " + err.message);
  } finally {
    restored.forEach(({ el, original }) => {
      el.style.backgroundImage = original;
    });
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
    return details
      ? details.querySelector(":scope > .collapsible-body")
      : null;
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
