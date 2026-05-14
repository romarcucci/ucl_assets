/* ============================================================
   UCL Graphics Editor — script.js
   ============================================================ */

/* ============ TAB SWITCHING ============ */
const tabs = document.querySelectorAll('.tab');
const editorSections = document.querySelectorAll('.editor-section');
const previewContainers = document.querySelectorAll('.preview-container');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    editorSections.forEach(s => s.classList.toggle('active', s.dataset.editor === target));
    previewContainers.forEach(p => p.classList.toggle('active', p.dataset.preview === target));
  });
});

/* ============================================================
   1) PLAYER BANNER
   ============================================================ */
const CLUB_PRESETS = {
  rma: { name: 'RM', bg: '#fff', text: '#0a1a4a', stroke: '#c8a951' },
  lfc: { name: 'LFC', bg: '#d40000', text: '#fff', stroke: '#fdb913' },
  bar: { name: 'FCB', bg: '#a50044', text: '#fff', stroke: '#edbb00' },
  psg: { name: 'PSG', bg: '#004170', text: '#fff', stroke: '#da291c' },
  bay: { name: 'FCB', bg: '#dc052d', text: '#fff', stroke: '#0066b2' },
  custom: null
};

function renderClubLogo(clubKey, fileURL) {
  const logoBox = document.getElementById('pb-logo');
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
      <text x="30" y="38" text-anchor="middle" font-family="serif" font-size="${preset.name.length>2?16:22}" font-weight="bold" fill="${preset.text}">${preset.name}</text>
    </svg>
  `;
}

const pNumber = document.getElementById('p-number');
const pName = document.getElementById('p-name');
const pStat = document.getElementById('p-stat');
const pClub = document.getElementById('p-club');
const pLogoFile = document.getElementById('p-logo-file');
const pColorMain = document.getElementById('p-color-main');
const pColorLow = document.getElementById('p-color-low');
const pColorText = document.getElementById('p-color-text');

let customLogoURL = null;

function updatePlayerBanner() {
  document.getElementById('pb-number').textContent = pNumber.value;
  document.getElementById('pb-name').textContent = pName.value;
  document.getElementById('pb-stat').textContent = pStat.value;
  document.getElementById('pb-top').style.background = pColorMain.value;
  document.getElementById('pb-bottom').style.background = pColorLow.value;
  const banner = document.getElementById('player-banner');
  banner.style.color = pColorText.value;
  renderClubLogo(pClub.value, customLogoURL);
}

[pNumber, pName, pStat, pColorMain, pColorLow, pColorText].forEach(el =>
  el.addEventListener('input', updatePlayerBanner)
);
pClub.addEventListener('change', () => { customLogoURL = null; pLogoFile.value = ''; updatePlayerBanner(); });
pLogoFile.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { customLogoURL = ev.target.result; updatePlayerBanner(); };
  reader.readAsDataURL(file);
});

updatePlayerBanner();

/* ============================================================
   2) LINEUP BOARD
   ============================================================ */
// Default Liverpool 4-3-3 positions matching the image
const defaultStarters = [
  { num: 1, name: 'ALISSON', x: 92, y: 50, gk: true },
  { num: 66, name: 'ALEXANDER-ARNOLD', x: 75, y: 18 },
  { num: 5, name: 'KONATÉ', x: 78, y: 38 },
  { num: 4, name: 'VIRGIL', x: 78, y: 62 },
  { num: 26, name: 'ROBERTSON', x: 75, y: 82 },
  { num: 14, name: 'HENDERSON', x: 55, y: 22 },
  { num: 3, name: 'FABINHO', x: 58, y: 50 },
  { num: 6, name: 'THIAGO', x: 55, y: 78 },
  { num: 11, name: 'SALAH', x: 30, y: 20 },
  { num: 10, name: 'MANÉ', x: 28, y: 50 },
  { num: 23, name: 'LUIS DIAZ', x: 30, y: 80 }
];
let starters = JSON.parse(JSON.stringify(defaultStarters));
let teamLogoURL = null;

function hexToRgba(hex, alpha) {
  const c = hex.replace('#', '');
  const full = c.length === 3 ? c.split('').map(x => x + x).join('') : c;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ----- localStorage persistence ----- */
const LINEUP_STORAGE_KEY = 'ucl-lineup-v1';
const SAVED_TEAMS_KEY = 'ucl-lineup-teams-v1';
const SAVED_FORMATIONS_KEY = 'ucl-lineup-formations-v1';

function collectLineupData() {
  return {
    team: document.getElementById('l-team').value,
    footer: document.getElementById('l-footer').value,
    coach: document.getElementById('l-coach').value,
    colorShirt: document.getElementById('l-color-shirt').value,
    colorGk: document.getElementById('l-color-gk').value,
    colorNum: document.getElementById('l-color-num').value,
    colorNumGk: document.getElementById('l-color-num-gk').value,
    colorBg: document.getElementById('l-color-bg').value,
    bgOpacity: document.getElementById('l-bg-opacity').value,
    starters: JSON.parse(JSON.stringify(starters)),
    teamLogoURL: teamLogoURL
  };
}

function applyLineupData(data) {
  if (data.team) document.getElementById('l-team').value = data.team;
  if (data.footer) document.getElementById('l-footer').value = data.footer;
  if (data.coach != null) document.getElementById('l-coach').value = data.coach;
  if (data.colorShirt) document.getElementById('l-color-shirt').value = data.colorShirt;
  if (data.colorGk) document.getElementById('l-color-gk').value = data.colorGk;
  if (data.colorNum) document.getElementById('l-color-num').value = data.colorNum;
  if (data.colorNumGk) document.getElementById('l-color-num-gk').value = data.colorNumGk;
  if (data.colorBg) document.getElementById('l-color-bg').value = data.colorBg;
  if (data.bgOpacity != null) document.getElementById('l-bg-opacity').value = data.bgOpacity;
  if (Array.isArray(data.starters) && data.starters.length === 11) {
    starters = JSON.parse(JSON.stringify(data.starters));
  }
  teamLogoURL = data.teamLogoURL || null;
}

function saveLineup() {
  try {
    localStorage.setItem(LINEUP_STORAGE_KEY, JSON.stringify(collectLineupData()));
  } catch (e) { /* storage unavailable */ }
}

function loadLineup() {
  try {
    const raw = localStorage.getItem(LINEUP_STORAGE_KEY);
    if (!raw) return;
    applyLineupData(JSON.parse(raw));
  } catch (e) { /* invalid data */ }
}

function resetLineup() {
  localStorage.removeItem(LINEUP_STORAGE_KEY);
  starters = JSON.parse(JSON.stringify(defaultStarters));
  teamLogoURL = null;
  document.getElementById('l-team').value = 'LIVERPOOL FC';
  document.getElementById('l-footer').value = 'PARIS FINAL 2022';
  document.getElementById('l-coach').value = 'DIDIER DESCHAMPS';
  document.getElementById('l-color-shirt').value = '#d40000';
  document.getElementById('l-color-gk').value = '#222222';
  document.getElementById('l-color-num').value = '#ffffff';
  document.getElementById('l-color-num-gk').value = '#ffffff';
  document.getElementById('l-color-bg').value = '#0a2540';
  document.getElementById('l-bg-opacity').value = '100';
  document.getElementById('l-team-logo-file').value = '';
  renderStartersEditor();
  updateLineupCommon();
}

/* ----- Multi-team saved presets ----- */
function getSavedTeams() {
  try { return JSON.parse(localStorage.getItem(SAVED_TEAMS_KEY) || '[]'); }
  catch { return []; }
}
function setSavedTeams(list) {
  localStorage.setItem(SAVED_TEAMS_KEY, JSON.stringify(list));
}
function renderSavedTeamsList() {
  const sel = document.getElementById('l-saved-team-select');
  const teams = getSavedTeams();
  if (teams.length === 0) {
    sel.innerHTML = '<option value="">— Aucune équipe sauvegardée —</option>';
  } else {
    sel.innerHTML = teams
      .map((t, i) => `<option value="${i}">${t.name}</option>`)
      .join('');
  }
}
function saveCurrentAsTeam() {
  const nameInput = document.getElementById('l-save-team-name');
  const name = nameInput.value.trim() || document.getElementById('l-team').value.trim();
  if (!name) { alert('Donne un nom à la sauvegarde.'); return; }
  const teams = getSavedTeams();
  const existing = teams.findIndex(t => t.name === name);
  const entry = { name, data: collectLineupData() };
  if (existing >= 0) {
    if (!confirm(`Une équipe "${name}" existe déjà. L'écraser ?`)) return;
    teams[existing] = entry;
  } else {
    teams.push(entry);
  }
  setSavedTeams(teams);
  nameInput.value = '';
  renderSavedTeamsList();
  // Select the just-saved entry
  const idx = teams.findIndex(t => t.name === name);
  document.getElementById('l-saved-team-select').value = String(idx);
}
function loadSelectedTeam() {
  const sel = document.getElementById('l-saved-team-select');
  const idx = parseInt(sel.value, 10);
  const teams = getSavedTeams();
  if (isNaN(idx) || !teams[idx]) return;
  applyLineupData(teams[idx].data);
  document.getElementById('l-team-logo-file').value = '';
  renderStartersEditor();
  updateLineupCommon();
  saveLineup();
}
function deleteSelectedTeam() {
  const sel = document.getElementById('l-saved-team-select');
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
  try { return JSON.parse(localStorage.getItem(SAVED_FORMATIONS_KEY) || '[]'); }
  catch { return []; }
}
function setSavedFormations(list) {
  localStorage.setItem(SAVED_FORMATIONS_KEY, JSON.stringify(list));
}
function renderSavedFormationsList() {
  const sel = document.getElementById('l-saved-formation-select');
  const formations = getSavedFormations();
  if (formations.length === 0) {
    sel.innerHTML = '<option value="">— Aucune formation sauvegardée —</option>';
  } else {
    sel.innerHTML = formations
      .map((f, i) => `<option value="${i}">${f.name}</option>`)
      .join('');
  }
}
function saveCurrentAsFormation() {
  const nameInput = document.getElementById('l-save-formation-name');
  const name = nameInput.value.trim();
  if (!name) { alert('Donne un nom à la formation.'); return; }
  const formations = getSavedFormations();
  const existing = formations.findIndex(f => f.name === name);
  const entry = {
    name,
    positions: starters.map(p => ({ x: p.x, y: p.y, gk: !!p.gk }))
  };
  if (existing >= 0) {
    if (!confirm(`Une formation "${name}" existe déjà. L'écraser ?`)) return;
    formations[existing] = entry;
  } else {
    formations.push(entry);
  }
  setSavedFormations(formations);
  nameInput.value = '';
  renderSavedFormationsList();
  const idx = formations.findIndex(f => f.name === name);
  document.getElementById('l-saved-formation-select').value = String(idx);
}
function loadSelectedFormation() {
  const sel = document.getElementById('l-saved-formation-select');
  const idx = parseInt(sel.value, 10);
  const formations = getSavedFormations();
  if (isNaN(idx) || !formations[idx]) return;
  const positions = formations[idx].positions;
  if (!Array.isArray(positions) || positions.length !== 11) return;
  positions.forEach((pos, i) => {
    if (!starters[i]) return;
    starters[i].x = pos.x;
    starters[i].y = pos.y;
    if (typeof pos.gk === 'boolean') starters[i].gk = pos.gk;
  });
  renderPitch();
  saveLineup();
}
function deleteSelectedFormation() {
  const sel = document.getElementById('l-saved-formation-select');
  const idx = parseInt(sel.value, 10);
  const formations = getSavedFormations();
  if (isNaN(idx) || !formations[idx]) return;
  if (!confirm(`Supprimer la formation "${formations[idx].name}" ?`)) return;
  formations.splice(idx, 1);
  setSavedFormations(formations);
  renderSavedFormationsList();
}

function renderStartersEditor() {
  const list = document.getElementById('l-starters');
  list.innerHTML = '';
  starters.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = `
      <input type="number" value="${p.num}" min="0" max="99" data-i="${i}" data-field="num" />
      <input type="text" value="${p.name}" data-i="${i}" data-field="name" />
      <span class="role-tag">${p.gk ? 'GK' : '#' + (i+1)}</span>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', e => {
      const idx = +e.target.dataset.i;
      const field = e.target.dataset.field;
      starters[idx][field] = field === 'num' ? +e.target.value : e.target.value;
      renderPitch();
      saveLineup();
    });
  });
}

const lTeam = document.getElementById('l-team');
const lFooter = document.getElementById('l-footer');
const lCoach = document.getElementById('l-coach');
const lColorShirt = document.getElementById('l-color-shirt');
const lColorGk = document.getElementById('l-color-gk');
const lColorNum = document.getElementById('l-color-num');
const lColorNumGk = document.getElementById('l-color-num-gk');
const lColorBg = document.getElementById('l-color-bg');

function renderPitch() {
  const pitch = document.getElementById('lb-pitch');
  // Clear except lines
  pitch.querySelectorAll('.lb-player').forEach(p => p.remove());
  starters.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'lb-player';
    el.style.left = p.x + '%';
    el.style.top = p.y + '%';
    el.dataset.index = i;
    const shirtColor = p.gk ? lColorGk.value : lColorShirt.value;
    const numColor = p.gk ? lColorNumGk.value : lColorNum.value;
    el.innerHTML = `
      ${renderShirtSVG(shirtColor, numColor, p.num)}
      <div class="lb-player-name">${p.name}</div>
    `;
    pitch.appendChild(el);
    makeDraggable(el, p);
  });
}

function shadeColor(hex, percent) {
  // percent < 0 darkens, > 0 lightens. Returns #rrggbb.
  const c = hex.replace('#', '');
  const num = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.max(0, Math.min(255, r + Math.round(255 * percent)));
  g = Math.max(0, Math.min(255, g + Math.round(255 * percent)));
  b = Math.max(0, Math.min(255, b + Math.round(255 * percent)));
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function renderShirtSVG(color, numColor, number) {
  const dark = shadeColor(color, -0.25);
  const darker = shadeColor(color, -0.4);
  const light = shadeColor(color, 0.12);
  const uid = 'sh' + Math.random().toString(36).slice(2, 8);
  return `
    <svg class="lb-shirt-svg" viewBox="0 0 100 105" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${uid}-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${light}"/>
          <stop offset="50%" stop-color="${color}"/>
          <stop offset="100%" stop-color="${dark}"/>
        </linearGradient>
        <linearGradient id="${uid}-sleeve" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}"/>
          <stop offset="100%" stop-color="${dark}"/>
        </linearGradient>
      </defs>
      <!-- Left sleeve -->
      <path d="M 22,16 L 5,28 L 8,46 L 26,42 Z"
            fill="url(#${uid}-sleeve)" stroke="${darker}" stroke-width="0.8" stroke-linejoin="round"/>
      <!-- Right sleeve -->
      <path d="M 78,16 L 95,28 L 92,46 L 74,42 Z"
            fill="url(#${uid}-sleeve)" stroke="${darker}" stroke-width="0.8" stroke-linejoin="round"/>
      <!-- Body silhouette -->
      <path d="M 26,16
               Q 33,17 40,18
               L 50,32
               L 60,18
               Q 67,17 74,16
               L 78,42
               L 80,98
               Q 50,103 20,98
               L 22,42 Z"
            fill="url(#${uid}-body)" stroke="${darker}" stroke-width="0.8" stroke-linejoin="round"/>
      <!-- Collar V-neck (darker triangle) -->
      <path d="M 40,18 L 50,32 L 60,18 L 56,18 L 50,28 L 44,18 Z"
            fill="${darker}"/>
      <!-- Subtle vertical body shading on right -->
      <path d="M 70,42 L 76,42 L 78,98 Q 74,99 70,99 Z"
            fill="rgba(0,0,0,0.15)"/>
      <!-- Hem line at bottom -->
      <path d="M 22,93 Q 50,98 78,93" fill="none" stroke="${darker}" stroke-width="0.6" opacity="0.5"/>
      <!-- Number -->
      <text x="50" y="78" text-anchor="middle"
            font-family="'Barlow Condensed', 'Archivo Narrow', 'Arial Narrow', sans-serif"
            font-size="40" font-weight="900"
            fill="${numColor}"
            stroke="${darker}" stroke-width="0.6"
            paint-order="stroke">${number}</text>
    </svg>
  `;
}

function makeDraggable(el, playerObj) {
  let dragging = false;
  el.addEventListener('mousedown', e => {
    dragging = true;
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const pitch = document.getElementById('lb-pitch');
    const rect = pitch.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    playerObj.x = Math.max(2, Math.min(98, x));
    playerObj.y = Math.max(2, Math.min(98, y));
    el.style.left = playerObj.x + '%';
    el.style.top = playerObj.y + '%';
  });
  document.addEventListener('mouseup', () => {
    if (dragging) { dragging = false; saveLineup(); }
  });
}

function renderTeamLogo() {
  const box = document.getElementById('lb-team-logo');
  box.innerHTML = teamLogoURL ? `<img src="${teamLogoURL}" alt="team logo" />` : '';
}

function updateLineupCommon() {
  document.getElementById('lb-team-name').textContent = lTeam.value;
  document.getElementById('lb-footer-text').textContent = lFooter.value;
  const coachName = lCoach.value.trim();
  document.getElementById('lb-coach').textContent = coachName ? `COACH: ${coachName}` : '';
  const alpha = (+document.getElementById('l-bg-opacity').value) / 100;
  const bgTop = hexToRgba(lColorBg.value, alpha);
  const bgBottom = hexToRgba(shadeColor(lColorBg.value, -0.25), alpha);
  document.getElementById('lineup-board').style.backgroundImage =
    `linear-gradient(180deg, ${bgTop} 0%, ${bgBottom} 100%)`;
  document.getElementById('l-bg-opacity-value').textContent =
    Math.round(alpha * 100) + '%';
  if (typeof applyBgImage === 'function') applyBgImage();
  renderTeamLogo();
  renderPitch();
}

[lTeam, lFooter, lCoach, lColorShirt, lColorGk, lColorNum, lColorNumGk, lColorBg,
 document.getElementById('l-bg-opacity')].forEach(el =>
  el.addEventListener('input', () => { updateLineupCommon(); saveLineup(); })
);

loadLineup();
renderStartersEditor();
updateLineupCommon();
renderSavedTeamsList();

document.getElementById('l-reset').addEventListener('click', () => {
  if (confirm('Réinitialiser la composition aux valeurs par défaut ?')) resetLineup();
});

document.getElementById('l-team-logo-file').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    teamLogoURL = ev.target.result;
    renderTeamLogo();
    saveLineup();
  };
  reader.readAsDataURL(file);
});

document.getElementById('l-team-logo-clear').addEventListener('click', () => {
  teamLogoURL = null;
  document.getElementById('l-team-logo-file').value = '';
  renderTeamLogo();
  saveLineup();
});

document.getElementById('l-save-team').addEventListener('click', saveCurrentAsTeam);
document.getElementById('l-load-team').addEventListener('click', loadSelectedTeam);
document.getElementById('l-delete-team').addEventListener('click', deleteSelectedTeam);

document.getElementById('l-save-formation').addEventListener('click', saveCurrentAsFormation);
document.getElementById('l-load-formation').addEventListener('click', loadSelectedFormation);
document.getElementById('l-delete-formation').addEventListener('click', deleteSelectedFormation);
renderSavedFormationsList();

/* ----- Export / Import JSON (équipes + formations) ----- */
function exportSavesToJson() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    teams: getSavedTeams(),
    formations: getSavedFormations()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ucl-saves-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importSavesFromJson(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    let parsed;
    try {
      parsed = JSON.parse(ev.target.result);
    } catch (e) {
      alert('Fichier JSON invalide : ' + e.message);
      return;
    }
    const importedTeams = Array.isArray(parsed.teams) ? parsed.teams : [];
    const importedFormations = Array.isArray(parsed.formations) ? parsed.formations : [];
    if (!importedTeams.length && !importedFormations.length) {
      alert('Aucune équipe ni formation trouvée dans le fichier.');
      return;
    }
    const msg = `Importer ${importedTeams.length} équipe(s) et ${importedFormations.length} formation(s) ?\n\nLes entrées avec le même nom seront écrasées par celles du fichier.`;
    if (!confirm(msg)) return;
    const teams = getSavedTeams();
    importedTeams.forEach(t => {
      if (!t || typeof t.name !== 'string') return;
      const i = teams.findIndex(x => x.name === t.name);
      if (i >= 0) teams[i] = t; else teams.push(t);
    });
    setSavedTeams(teams);
    const formations = getSavedFormations();
    importedFormations.forEach(f => {
      if (!f || typeof f.name !== 'string') return;
      const i = formations.findIndex(x => x.name === f.name);
      if (i >= 0) formations[i] = f; else formations.push(f);
    });
    setSavedFormations(formations);
    renderSavedTeamsList();
    renderSavedFormationsList();
    alert(`Import terminé : ${importedTeams.length} équipe(s) et ${importedFormations.length} formation(s).`);
  };
  reader.readAsText(file);
}

document.getElementById('l-export-json').addEventListener('click', exportSavesToJson);
document.getElementById('l-import-json-btn').addEventListener('click', () => {
  document.getElementById('l-import-json-file').click();
});
document.getElementById('l-import-json-file').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  importSavesFromJson(file);
  e.target.value = '';
});

/* Toggle grille d'alignement */
const GRID_PREF_KEY = 'ucl-lineup-grid-v1';
const gridCheckbox = document.getElementById('l-show-grid');
gridCheckbox.checked = localStorage.getItem(GRID_PREF_KEY) === '1';
document.getElementById('lb-pitch').classList.toggle('show-grid', gridCheckbox.checked);
gridCheckbox.addEventListener('change', () => {
  document.getElementById('lb-pitch').classList.toggle('show-grid', gridCheckbox.checked);
  localStorage.setItem(GRID_PREF_KEY, gridCheckbox.checked ? '1' : '0');
});

/* Toggle terrain rayé */
const STRIPES_PREF_KEY = 'ucl-lineup-stripes-v1';
const stripesCheckbox = document.getElementById('l-pitch-stripes');
stripesCheckbox.checked = localStorage.getItem(STRIPES_PREF_KEY) === '1';
document.getElementById('lb-pitch').classList.toggle('show-stripes', stripesCheckbox.checked);
stripesCheckbox.addEventListener('change', () => {
  document.getElementById('lb-pitch').classList.toggle('show-stripes', stripesCheckbox.checked);
  localStorage.setItem(STRIPES_PREF_KEY, stripesCheckbox.checked ? '1' : '0');
});

/* Toggle image de fond du terrain + sélecteur d'image */
const BG_IMAGE_PREF_KEY = 'ucl-lineup-bg-image-v1';
const BG_IMAGE_FILE_KEY = 'ucl-lineup-bg-image-file-v1';
function applyBgImage() {
  const checkbox = document.getElementById('l-bg-image-toggle');
  const select = document.getElementById('l-bg-image-select');
  const pitch = document.getElementById('lb-pitch');
  const imgDiv = document.getElementById('lb-bg-image');
  if (!checkbox || !pitch || !imgDiv || !select) return;
  const alpha = (+document.getElementById('l-bg-opacity').value) / 100;
  const hasFile = !!select.value;
  pitch.classList.toggle('has-bg-image', checkbox.checked && hasFile);
  imgDiv.style.backgroundImage = hasFile ? `url('./${select.value}')` : 'none';
  imgDiv.style.opacity = alpha;
}
const bgImageCheckbox = document.getElementById('l-bg-image-toggle');
const bgImageSelect = document.getElementById('l-bg-image-select');
bgImageCheckbox.checked = localStorage.getItem(BG_IMAGE_PREF_KEY) === '1';
const savedBgFile = localStorage.getItem(BG_IMAGE_FILE_KEY);
if (savedBgFile && [...bgImageSelect.options].some(o => o.value === savedBgFile)) {
  bgImageSelect.value = savedBgFile;
}
applyBgImage();
bgImageCheckbox.addEventListener('change', () => {
  localStorage.setItem(BG_IMAGE_PREF_KEY, bgImageCheckbox.checked ? '1' : '0');
  applyBgImage();
});
bgImageSelect.addEventListener('change', () => {
  localStorage.setItem(BG_IMAGE_FILE_KEY, bgImageSelect.value);
  applyBgImage();
});

/* ============================================================
   3) SCORE BANNER
   ============================================================ */
const sTime = document.getElementById('s-time');
const sHome = document.getElementById('s-home');
const sHomeScore = document.getElementById('s-home-score');
const sHomeColor = document.getElementById('s-home-color');
const sAway = document.getElementById('s-away');
const sAwayScore = document.getElementById('s-away-score');
const sAwayColor = document.getElementById('s-away-color');
const sBg = document.getElementById('s-bg');

function updateScoreBanner() {
  document.getElementById('sb-time').innerHTML = `⚽ ${sTime.value}`;
  document.getElementById('sb-home').textContent = sHome.value;
  document.getElementById('sb-home-score').textContent = sHomeScore.value;
  document.getElementById('sb-away').textContent = sAway.value;
  document.getElementById('sb-away-score').textContent = sAwayScore.value;
  document.getElementById('sb-home-color').style.background = sHomeColor.value;
  document.getElementById('sb-away-color').style.background = sAwayColor.value;
  document.querySelectorAll('#score-banner .sb-team, #score-banner .sb-score, #score-banner .sb-sep')
    .forEach(el => el.style.background = sBg.value);
}

[sTime, sHome, sHomeScore, sHomeColor, sAway, sAwayScore, sAwayColor, sBg].forEach(el =>
  el.addEventListener('input', updateScoreBanner)
);
updateScoreBanner();

/* ============================================================
   4) BRACKET BOARD
   ============================================================ */
const MATCH_LABELS = ['QF1 — Haut Gauche', 'QF2 — Bas Gauche', 'QF3 — Haut Droite', 'QF4 — Bas Droite'];

const defaultBracketTeams = [
  { name: 'ATLETICO MADRID', color: '#cb3524', letter: 'A', logoURL: null },
  { name: 'DORTMUND', color: '#fde100', letter: 'D', logoURL: null },
  { name: 'PSG', color: '#004170', letter: 'P', logoURL: null },
  { name: 'BARCELONA', color: '#a50044', letter: 'B', logoURL: null },
  { name: 'ARSENAL', color: '#ef0107', letter: 'A', logoURL: null },
  { name: 'BAYERN MUNICH', color: '#dc052d', letter: 'B', logoURL: null },
  { name: 'REAL MADRID', color: '#e6e6e6', letter: 'R', logoURL: null },
  { name: 'MAN CITY', color: '#6cabdd', letter: 'C', logoURL: null }
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
      centralLogoURL = './ucl-logo.png';
      if (typeof renderBracket === 'function') renderBracket();
    }
  };
  img.onerror = () => { /* file not present — keep SVG fallback */ };
  img.src = './ucl-logo.png';
})();

let bracketTeams = JSON.parse(JSON.stringify(defaultBracketTeams));

function renderBracketEditor() {
  const list = document.getElementById('b-teams');
  list.innerHTML = '';
  bracketTeams.forEach((t, i) => {
    if (i % 2 === 0) {
      const label = document.createElement('div');
      label.className = 'match-label';
      label.textContent = MATCH_LABELS[i / 2];
      list.appendChild(label);
    }
    const card = document.createElement('div');
    card.className = 'team-card';
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
        ${t.logoURL ? `<button class="remove-logo-btn" data-i="${i}" title="Supprimer le logo">×</button>` : ''}
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('input[type="text"], input[type="color"]').forEach(inp => {
    inp.addEventListener('input', e => {
      const idx = +e.target.dataset.i;
      const field = e.target.dataset.field;
      bracketTeams[idx][field] = e.target.value;
      renderBracket();
      // Re-render the thumbnail if name/letter/color changed and no logoURL
      if (!bracketTeams[idx].logoURL) {
        const thumb = list.querySelector(`.team-thumb[data-i="${idx}"]`);
        if (thumb) thumb.innerHTML = `<div class="team-thumb-letter" style="background:${bracketTeams[idx].color};">${bracketTeams[idx].letter}</div>`;
      }
    });
  });

  list.querySelectorAll('input[type="file"]').forEach(inp => {
    inp.addEventListener('change', e => {
      const idx = +e.target.dataset.i;
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        bracketTeams[idx].logoURL = ev.target.result;
        renderBracketEditor();
        renderBracket();
      };
      reader.readAsDataURL(file);
    });
  });

  list.querySelectorAll('.remove-logo-btn').forEach(btn => {
    btn.addEventListener('click', e => {
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
  document.getElementById('br-tournament-title').textContent = document.getElementById('b-title').value;
  const venueText = document.getElementById('b-final').value;
  setVenueText(document.getElementById('br-venue-title'), venueText);
  setVenueText(document.getElementById('br-final-venue'), venueText);

  const bg = document.getElementById('b-bg').value;
  document.getElementById('bracket-board').style.background =
    `radial-gradient(ellipse 60% 40% at 75% 30%, rgba(80, 140, 255, 0.18) 0%, transparent 60%),
     radial-gradient(ellipse 50% 35% at 20% 70%, rgba(60, 100, 200, 0.12) 0%, transparent 60%),
     linear-gradient(135deg, ${bg} 0%, #050a1a 100%)`;

  // Central UCL logo: uploaded PNG or default SVG
  const logoBox = document.getElementById('br-ucl-logo');
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

document.getElementById('b-title').addEventListener('input', renderBracket);
document.getElementById('b-final').addEventListener('input', renderBracket);
document.getElementById('b-bg').addEventListener('input', renderBracket);

document.getElementById('b-logo-file').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    centralLogoURL = ev.target.result;
    renderBracket();
  };
  reader.readAsDataURL(file);
});

document.getElementById('b-logo-clear').addEventListener('click', () => {
  centralLogoURL = null;
  document.getElementById('b-logo-file').value = '';
  renderBracket();
});

renderBracketEditor();
renderBracket();

/* ============================================================
   EXPORT TO PNG (via html-to-image-style using SVG foreignObject)
   ============================================================ */
const EXPORT_RESOLUTION_HEIGHT = {
  '4k': 2160,
  '1080p': 1080,
  '720p': 720,
  '580p': 580
};

function loadExternalScript(src, globalName) {
  if (globalName && typeof window[globalName] !== 'undefined') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

document.getElementById('export-btn').addEventListener('click', async () => {
  const active = document.querySelector('.preview-container.active');
  if (!active) return;
  const target = active.firstElementChild;
  const format = document.getElementById('export-format').value;
  const resolution = document.getElementById('export-resolution').value;
  const targetHeight = EXPORT_RESOLUTION_HEIGHT[resolution] || 1080;
  const rect = target.getBoundingClientRect();
  const scale = targetHeight / rect.height;
  const baseName = `ucl-graphic-${resolution}-${Date.now()}`;

  try {
    if (format === 'svg') {
      await loadExternalScript('https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js', 'htmlToImage');
      const dataUrl = await window.htmlToImage.toSvg(target, {
        width: rect.width * scale,
        height: rect.height * scale,
        pixelRatio: scale,
        backgroundColor: null,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: rect.width + 'px',
          height: rect.height + 'px'
        }
      });
      const link = document.createElement('a');
      link.download = `${baseName}.svg`;
      link.href = dataUrl;
      link.click();
      return;
    }

    await loadExternalScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js', 'html2canvas');
    const canvas = await html2canvas(target, { backgroundColor: null, scale });

    if (format === 'pdf') {
      await loadExternalScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js', 'jspdf');
      const { jsPDF } = window.jspdf;
      const orientation = canvas.width >= canvas.height ? 'landscape' : 'portrait';
      const pdf = new jsPDF({
        orientation,
        unit: 'px',
        format: [canvas.width, canvas.height],
        hotfixes: ['px_scaling']
      });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${baseName}.pdf`);
      return;
    }

    // Default: PNG
    const link = document.createElement('a');
    link.download = `${baseName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    alert('Export échoué : ' + err.message);
  }
});
