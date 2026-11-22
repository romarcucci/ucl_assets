(() => {
  const $ = (id) => document.getElementById(id);
  const button = $("local-library-connect");
  const status = $("local-library-status");
  const results = $("library-results");
  const resultStatus = $("library-results-status");
  const projectCampaign = $("library-project-campaign");
  const newCampaign = $("library-new-campaign");
  const newMatch = $("library-new-match");
  const campaignDialog = $("library-campaign-dialog");
  const matchDialog = $("library-match-dialog");
  const activeHeader = $("library-active-header");
  const closeProject = $("library-close-project");
  const dropPanel = $("library-drop-panel");
  const dropTargets = $("library-drop-targets");
  let draggedIds = [];
  const archives = $("library-archives");
  const archiveControl = archives.closest("label");
  const viewTabs = [...document.querySelectorAll("[data-library-view]")];
  let currentView = "campaigns";
  const catalog = {
    lineup: [SAVED_TEAMS_KEY, "Composition", "lineup", "l-save-team-name", (entry) => {
      applyLineupData(expandLineupData(structuredClone(entry.data)));
      $("l-team-logo-file").value = "";
      renderStartersEditor();
      updateLineupCommon();
      saveLineup();
    }],
    banner: [SAVED_BANNERS_KEY, "Bandeau buteur", "player", "p-save-name", (entry) => applyBannerData(entry.data), true],
    score: [S_SAVED_KEY, "Score en direct", "score", "s-save-name", (entry) => applyScoreData(entry.data), true],
    showdown: [SD_SAVED_KEY, "Affiche de match", "showdown", "sd-save-name", (entry) => {
      applyShowdownData(expandShowdownData(entry.data));
      updateShowdown();
      saveShowdown();
    }],
    shorts: [SHORTS_PRESETS_KEY, "Live Score Short", "shorts", "shorts-save-name", (entry) =>
      applyShortsSettings(structuredClone(entry.settings)), true],
    thumbnail: [null, "Miniature vidéo", "video-thumbnail", "vt-composition-name"],
    shortThumbnail: [null, "Miniature Short (9:16)", "short-thumbnail", "short-vt-composition-name"],
    kit: [SAVED_KITS_KEY, "Tenue", "lineup", "l-save-kit-name", (entry) => applyKitData(entry.data), true],
    formation: [SAVED_FORMATIONS_KEY, "Formation", "lineup", "l-save-formation-name", applySavedFormation, true],
    style: [SAVED_STYLES_KEY, "Style de fond", "lineup", "l-save-style-name", (entry) => applyStyleData(entry.data), true],
    typography: [SAVED_TYPOS_KEY, "Typographie", "lineup", "l-save-typo-name", (entry) => applyTypoData(entry.data), true],
    showdownTypography: [SD_SAVED_TYPOS_KEY, "Typographie d’affiche", "showdown", "sd-save-typo-name", (entry) => {
      applyShowdownTypoData(entry.data);
      updateShowdown();
      saveShowdown();
    }, true],
    showdownBackground: [SD_SAVED_BGS_KEY, "Fond d’affiche", "showdown", "sd-save-bg-name", (entry) => {
      applyShowdownBgData(entry.data);
      updateShowdown();
      saveShowdown();
    }, true],
    competition: [null, "Style de miniature", "video-thumbnail", "vt-competition-name", null, true],
    shortCompetition: [null, "Style de miniature Short", "short-thumbnail", "short-vt-competition-name", null, true],
  };
  const thumbnailKinds = new Map([["video-thumbnail", "thumbnail"], ["short-thumbnail", "shortThumbnail"]]);
  const thumbnailLabels = { thumbnail: "Thumbnail 16:9", shortThumbnail: "Thumbnail 9:16" };
  const editorKinds = new Set(["lineup", "banner", "score", "showdown", "shorts", ...thumbnailKinds.values()]);
  const globalStyleIcons = {
    banner: "⚑", score: "◫", shorts: "▯", kit: "👕", formation: "⠿",
    style: "▧", typography: "Aa", showdownTypography: "Tt", showdownBackground: "◩", competition: "▣", shortCompetition: "▯",
  };

  function globalStyleIcon(kind) {
    const icon = document.createElement("span");
    icon.className = "library-style-icon";
    icon.textContent = globalStyleIcons[kind];
    icon.setAttribute("aria-hidden", "true");
    return icon;
  }

  function kindLabel(kind) {
    const [, label, tab] = catalog[kind];
    if (editorKinds.has(kind)) {
      return document.querySelector(`.tab[data-tab="${tab}"]`).textContent.trim();
    }
    return translate(label);
  }

  const mediaGroups = {
    background: "Fonds", leftPlayer: "Joueurs", rightPlayer: "Joueurs",
    leftClub: "Logos", rightClub: "Logos", competition: "Logos",
  };
  const videoAssetFields = [["file", "media"], ["cutoutFile", "cutoutMedia"]];
  const denied = "Réautorise le dossier de sauvegarde pour reprendre la copie automatique.";
  const failed = "Impossible de lire ou d’écrire dans la bibliothèque.";
  const disconnected = "Connecte le dossier de sauvegarde pour afficher la bibliothèque.";
  let connection;
  let message;
  let resultMessage;
  let queue = Promise.resolve();
  let campaigns = new Map();
  let projects = new Map();
  let records = new Map();
  let activeProjectId = "";
  const thumbnailProjects = new Map();
  const loadingThumbnails = new Set();
  let openingThumbnailFromLibrary = false;
  const expandedBranches = new Map();
  const selected = new Set();

  function setStatus(text) {
    message = text;
    status.hidden = !text;
    status.textContent = text ? translate(text, { folder: connection?.directory.name }) : "";
  }

  function accessConnection(mode, action) {
    return new Promise((resolve, reject) => {
      const open = indexedDB.open("ucl-backup-folder", 1);
      open.onupgradeneeded = () => open.result.createObjectStore("settings");
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const transaction = db.transaction("settings", mode);
        const request = action(transaction.objectStore("settings"));
        transaction.oncomplete = () => {
          db.close();
          resolve(request.result);
        };
        transaction.onabort = () => {
          db.close();
          reject(transaction.error);
        };
      };
    });
  }

  async function folder(root, parts, create = false) {
    for (const part of parts) root = await root.getDirectoryHandle(part, { create });
    return root;
  }

  async function optionalFolder(root, parts) {
    try {
      return await folder(root, parts);
    } catch (error) {
      if (error.name !== "NotFoundError") throw error;
      return null;
    }
  }

  async function readJson(directory, name) {
    try {
      const handle = await directory.getFileHandle(name);
      return JSON.parse(await (await handle.getFile()).text());
    } catch (error) {
      if (error.name !== "NotFoundError" && !(error instanceof SyntaxError)) throw error;
      return null;
    }
  }

  async function writeFile(directory, name, contents) {
    const handle = await directory.getFileHandle(name, { create: true });
    const stream = await handle.createWritable();
    try {
      await stream.write(contents);
      await stream.close();
    } catch (error) {
      await stream.abort().catch(() => {});
      throw error;
    }
  }

  function writeJson(directory, name, contents) {
    return writeFile(directory, name, JSON.stringify(contents, null, 2));
  }

  function readableName(value) {
    return value.normalize("NFC").replace(/[<>:"/\\|?*\x00-\x1f]/g, " ")
      .replace(/\s+/g, " ").trim().replace(/\.+$/, "").slice(0, 55).trim() || "UCL";
  }

  async function digest(bytes) {
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash).slice(0, 10)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function recordId(kind, name, projectId = "") {
    return digest(new TextEncoder().encode([kind, name, projectId].join("\n")));
  }

  async function availableRecordId(kind, name, projectId) {
    const id = await recordId(kind, name, projectId);
    return records.has(id) ? digest(new TextEncoder().encode(crypto.randomUUID())) : id;
  }

  function findRecord(kind, name, projectId) {
    return [...records.values()].find(({ item }) =>
      item.kind === kind && item.name === name && (item.projectId || "") === projectId);
  }

  async function useProject(project) {
    if (isProjectArchived(project)) return;
    activeProjectId = project?.id ?? "";
    if (project) expandedBranches.set(project.id, true);
    if (connection) {
      connection.activeProjectId = activeProjectId;
      await accessConnection("readwrite", (store) => store.put(connection, "active"));
    }
  }

  async function scanRecords(directory, project = null, depth = 0) {
    if (!directory) return;
    for await (const [name, handle] of directory.entries()) {
      if (handle.kind === "directory" && depth > 0) {
        await scanRecords(handle, project, depth - 1);
      } else if (handle.kind === "file" && /-[a-f0-9]{20}\.json$/.test(name)) {
        const item = await readJson(directory, name);
        if (!item || typeof item.name !== "string" || !Object.hasOwn(catalog, item.kind) ||
          typeof item.id !== "string" || !/^[a-f0-9]{20}$/.test(item.id) || !item.entry) continue;
        item.campaignId = project?.campaignId ?? "";
        item.projectId = project?.id ?? "";
        if (project) {
          if (!project.name && typeof item.match === "string") project.name = item.match;
          if (!project.round && typeof item.round === "string") project.round = item.round;
          item.match = project.name;
        }
        const current = records.get(item.id);
        if (!current || item.updatedAt >= current.item.updatedAt) {
          records.set(item.id, { item, directory, filename: name });
        }
      }
    }
  }

  async function readLibrary() {
    campaigns = new Map();
    projects = new Map();
    records = new Map();
    const root = connection.directory;
    await scanRecords(await optionalFolder(root, ["À classer"]));
    await scanRecords(await optionalFolder(root, ["Préréglages"]), null, 1);
    const collection = await optionalFolder(root, ["Campagnes"]);
    if (collection) {
      for await (const [id, handle] of collection.entries()) {
        if (handle.kind !== "directory") continue;
        const campaign = await readJson(handle, "campagne.json");
        if (!campaign || typeof campaign.name !== "string") continue;
        campaigns.set(id, { ...campaign, id, directory: handle });
        for await (const [key, directory] of handle.entries()) {
          if (directory.kind !== "directory") continue;
          const metadata = await readJson(directory, "projet.json");
          const project = {
            id: id + "/" + key, campaignId: id, directory,
            name: metadata?.name ?? "", round: metadata?.round ?? "",
            opponent: metadata?.opponent ?? "", archived: metadata?.archived === true, inferred: !metadata,
          };
          await scanRecords(directory, project);
          if (project.name) projects.set(project.id, project);
        }
      }
    }
    if (!projects.has(activeProjectId) || isProjectArchived(projects.get(activeProjectId))) {
      activeProjectId = "";
    }
    for (const id of selected) {
      if (!records.has(id)) selected.delete(id);
    }
  }

  function isProjectArchived(project) {
    return !!(project?.archived || campaigns.get(project?.campaignId)?.archived);
  }

  async function ensureProject(campaign, name, round, opponent = "", archived = false) {
    const existing = [...projects.values()].find((project) =>
      project.campaignId === campaign.id && project.name.toLowerCase() === name.toLowerCase() &&
      project.round.toLowerCase() === round.toLowerCase());
    if (existing) return existing;
    const hash = await digest(new TextEncoder().encode([name, round].join("\n").toLowerCase()));
    const baseKey = readableName(name) + "-" + hash.slice(0, 8);
    let key = baseKey;
    for (let suffix = 2; projects.has(campaign.id + "/" + key); suffix++) {
      key = baseKey + "-" + suffix;
    }
    const directory = await folder(campaign.directory, [key], true);
    await writeJson(directory, "projet.json", { name, round, opponent, archived });
    const project = { id: campaign.id + "/" + key, campaignId: campaign.id, name, round, opponent, archived, directory };
    projects.set(project.id, project);
    return project;
  }

  function projectPlacement(project) {
    return {
      projectId: project?.id ?? "", campaignId: project?.campaignId ?? "",
      match: project?.name ?? "", round: project?.round ?? "",
    };
  }

  async function persist(item, oldRecord) {
    const [, , , , , isPreset] = catalog[item.kind];
    const project = projects.get(item.projectId);
    const directory = project?.directory ?? await folder(connection.directory, isPreset
      ? ["Préréglages", item.kind === "kit" ? "Kits" : item.kind === "competition" ? "Compétitions" : catalog[item.kind][1]]
      : ["À classer"], true);
    const filename = readableName(item.name) + "-" + item.id + ".json";
    await writeJson(directory, filename, item);
    records.set(item.id, { item, directory, filename });
    if (oldRecord && (oldRecord.filename !== filename || !await oldRecord.directory.isSameEntry(directory))) {
      try {
        await oldRecord.directory.removeEntry(oldRecord.filename);
      } catch (error) {
        if (error.name !== "NotFoundError") throw error;
      }
    }
  }

  async function storeVideoAssets(entry) {
    const data = structuredClone(entry.data);
    for (const [layer, details] of Object.entries(data.layers)) {
      for (const [fileField, mediaField] of videoAssetFields) {
        const file = details[fileField];
        if (!file) continue;
        const group = mediaGroups[layer];
        const id = await digest(await file.arrayBuffer());
        const filename = id + "-" + readableName(file.name);
        const directory = await folder(connection.directory, ["Médias", group], true);
        try {
          await directory.getFileHandle(filename);
        } catch (error) {
          if (error.name !== "NotFoundError") throw error;
          await writeFile(directory, filename, file);
        }
        delete details[fileField];
        details[mediaField] = { group, filename, name: file.name, type: file.type };
      }
    }
    return { name: entry.name, data };
  }

  function browserEntries(kind) {
    const [key, , tab, , , globalStyle] = catalog[kind];
    if (!key) return thumbnailEditors.get(tab).listLibraryPresets(globalStyle);
    try {
      const entries = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(entries) ? entries : [];
    } catch {
      return [];
    }
  }

  async function syncEntry(kind, entry, { migration = false, project = null, portable = false } = {}) {
    if (typeof entry?.name !== "string" || !entry.name.trim()) return;
    if (catalog[kind][5]) project = null;
    if (migration && [...records.values()].some(({ item }) => item.kind === kind && item.name === entry.name)) return;
    const placement = projectPlacement(project);
    const existing = findRecord(kind, entry.name, placement.projectId);
    const id = existing?.item.id ?? await availableRecordId(kind, entry.name, placement.projectId);
    const item = {
      version: 1, id, kind, name: entry.name, ...placement,
      updatedAt: new Date().toISOString(),
      entry: catalog[kind][0] || portable ? entry : await storeVideoAssets(entry),
    };
    await persist(item, existing);
  }

  const legacyCollections = {
    lineup: "teams", banner: "banners", score: "scores", showdown: "showdowns",
    shorts: "shorts", kit: "kits", formation: "formations", style: "styles",
    typography: "typos", showdownTypography: "showdownTypos", showdownBackground: "showdownBgs",
  };

  function legacyEntries(backup) {
    const entries = [];
    for (const [kind, property] of Object.entries(legacyCollections)) {
      const key = catalog[kind][0];
      let list = backup?.state?.[key] ?? backup?.[property];
      if (typeof list === "string") {
        try { list = JSON.parse(list); } catch { continue; }
      }
      if (!Array.isArray(list)) continue;
      for (const entry of list) {
        if (typeof entry?.name === "string" && entry.name.trim()) entries.push({ kind, entry });
      }
    }
    return entries;
  }

  async function migrate() {
    if (await readJson(connection.directory, "migration-bibliotheque.json")) return;
    if (connection.migrateBrowser !== false) {
      for (const [kind, [key]] of Object.entries(catalog)) {
        let entries;
        try {
          entries = await browserEntries(kind);
        } catch {
          if (key) throw new Error("Browser presets could not be read.");
          continue;
        }
        for (const entry of entries) await syncEntry(kind, entry, { migration: true });
      }
    }
    for await (const [name, handle] of connection.directory.entries()) {
      if (handle.kind !== "file" || !/^Sauvegardes UCL(?: \(\d+\))?\.json$/i.test(name)) continue;
      for (const { kind, entry } of legacyEntries(await readJson(connection.directory, name))) {
        await syncEntry(kind, entry, { migration: true });
      }
    }
    await writeJson(connection.directory, "migration-bibliotheque.json", { version: 1 });
  }

  function validFilename(name) {
    return typeof name === "string" && name !== "." && name !== ".." && name.length > 0 &&
      !/[<>:"/\\|?*\x00-\x1f]/.test(name);
  }

  async function exportLibrary() {
    const media = [];
    for (const group of new Set(Object.values(mediaGroups))) {
      const directory = await optionalFolder(connection.directory, ["Médias", group]);
      if (!directory) continue;
      for await (const [name, handle] of directory.entries()) {
        if (handle.kind !== "file" || !validFilename(name)) continue;
        const file = await handle.getFile();
        const contents = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        media.push({ group, name, contents });
      }
    }
    const backup = {
      format: "ucl-library", version: 1,
      campaigns: [...campaigns.values()].map(({ directory, ...entry }) => entry),
      projects: [...projects.values()].map(({ id, campaignId, name, round, opponent, archived }) =>
        ({ id, campaignId, name, round, opponent, archived })),
      records: [...records.values()].map(({ item }) => item),
      media,
    };
    downloadGraphicExport(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
      "Bibliotheque-UCL-" + new Date().toISOString().slice(0, 10) + ".json");
  }

  async function importLibrary(backup, entries, target) {
    const importedCampaigns = new Map();
    const importedProjects = new Map();
    if (backup) {
      for (const campaign of backup.campaigns ?? []) {
        if (typeof campaign?.name !== "string" || !campaign.name.trim()) continue;
        const metadata = {
          name: campaign.name.trim(),
          displayName: typeof campaign.displayName === "string" ? campaign.displayName.trim() : "",
          team: typeof campaign.team === "string" ? campaign.team : "",
          competition: typeof campaign.competition === "string" ? campaign.competition : "",
          season: typeof campaign.season === "string" ? campaign.season : "",
          archived: campaign.archived === true,
        };
        let current = [...campaigns.values()].find((item) =>
          item.name === metadata.name && item.competition === metadata.competition && item.season === metadata.season);
        if (!current) {
          const id = readableName(metadata.name) + "-" + crypto.randomUUID().slice(0, 8);
          const directory = await folder(connection.directory, ["Campagnes", id], true);
          await writeJson(directory, "campagne.json", metadata);
          current = { ...metadata, id, directory };
          campaigns.set(id, current);
        }
        importedCampaigns.set(campaign.id, current);
      }
      for (const project of backup.projects ?? []) {
        const campaign = importedCampaigns.get(project?.campaignId);
        if (!campaign || typeof project.name !== "string" || !project.name.trim()) continue;
        importedProjects.set(project.id, await ensureProject(campaign, project.name.trim(),
          typeof project.round === "string" ? project.round : "",
          typeof project.opponent === "string" ? project.opponent : "", project.archived === true));
      }
      for (const media of backup.media ?? []) {
        if (!Object.values(mediaGroups).includes(media?.group) || !validFilename(media.name) ||
          typeof media.contents !== "string") continue;
        const directory = await folder(connection.directory, ["Médias", media.group], true);
        try {
          await directory.getFileHandle(media.name);
        } catch (error) {
          if (error.name !== "NotFoundError") throw error;
          await writeFile(directory, media.name, Uint8Array.from(atob(media.contents), (character) => character.charCodeAt(0)));
        }
      }
    }
    let skippedStyle = false;
    for (const { kind, entry, projectId } of entries) {
      const project = catalog[kind][5] ? null : backup ? importedProjects.get(projectId) : target;
      const scope = project?.id ?? "";
      const original = findRecord(kind, entry.name, scope);
      if (!backup && catalog[kind][5] && original) {
        skippedStyle = true;
        continue;
      }
      if (original && JSON.stringify(original.item.entry) === JSON.stringify(entry)) continue;
      const name = freeName(kind, entry.name, scope);
      await syncEntry(kind, { ...entry, name }, { project, portable: !!backup });
    }
    if (skippedStyle) resultMessage = "Import terminé. Les styles déjà présents ont été ignorés.";
  }

  const importDialog = $("library-import-dialog");
  const importProject = $("library-import-project");
  let pendingImport;
  $("l-export-json").addEventListener("click", () => schedule(exportLibrary));
  $("l-import-json-btn").addEventListener("click", () => {
    if (!connection) {
      resultMessage = disconnected;
      render();
      return;
    }
    $("l-import-json-file").click();
  });
  $("l-import-json-file").addEventListener("change", async (event) => {
    const file = event.currentTarget.files[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const backup = data?.format === "ucl-library" && data.version === 1 &&
        ["campaigns", "projects", "records", "media"].every((key) => Array.isArray(data[key])) ? data : null;
      const entries = backup ? backup.records.filter((item) => item && Object.hasOwn(catalog, item.kind) &&
        typeof item.entry?.name === "string" && item.entry.name.trim()) : legacyEntries(data);
      if (!entries.length && !(backup?.campaigns?.length || backup?.media?.length)) {
        resultMessage = "Aucune donnée trouvée dans le fichier.";
        render();
        return;
      }
      pendingImport = { backup, entries };
      $("library-import-target").hidden = !!backup;
      setOptions(importProject, [option("À classer", ""), ...projectOptions()]);
      importProject.value = activeProjectId || "";
      showImportSummary();
      importDialog.showModal();
    } catch {
      resultMessage = "Fichier JSON invalide.";
      render();
    }
  });
  function showImportSummary() {
    if (!pendingImport) return;
    const counts = new Map();
    for (const { kind } of pendingImport.entries) counts.set(kind, (counts.get(kind) ?? 0) + 1);
    $("library-import-summary").textContent = [
      translate("Importer {count} sauvegarde(s) ?", { count: pendingImport.entries.length }),
      [...counts].map(([kind, count]) => kindLabel(kind) + " (" + count + ")").join(" · "),
    ].filter(Boolean).join("\n");
  }
  $("library-import-cancel").addEventListener("click", () => importDialog.close());
  $("library-import-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!pendingImport) return;
    const { backup, entries } = pendingImport;
    const target = projects.get(importProject.value);
    importDialog.close();
    schedule(() => importLibrary(backup, entries, target));
  });
  document.addEventListener("interface-language-change", showImportSummary);

  function option(label, value) {
    return new Option(translate(label), value);
  }

  function setOptions(select, entries) {
    const value = select.value;
    select.replaceChildren(...entries);
    if ([...select.options].some((entry) => entry.value === value)) select.value = value;
  }

  function campaignLabel(campaign) {
    return [campaignTitle(campaign), campaign.competition, campaign.season].filter(Boolean)
      .filter((value, index, items) => items.indexOf(value) === index).join(" · ");
  }

  function campaignTitle(campaign) {
    return campaign.displayName || campaign.team || campaign.name;
  }

  function compareCampaigns(a, b) {
    const options = { numeric: true, sensitivity: "base" };
    return (a.team || a.name).localeCompare(b.team || b.name, undefined, options) ||
      (a.season ?? "").localeCompare(b.season ?? "", undefined, options) ||
      (a.competition ?? "").localeCompare(b.competition ?? "", undefined, options);
  }

  function projectLabel(project) {
    return [project.name, project.round].filter(Boolean).join(" · ");
  }

  const roundOrder = new Map([...document.querySelectorAll('#library-create-project select[name="round"] option')]
    .filter((option) => option.value)
    .map((option, index) => [option.value.toLowerCase(), index]));

  function compareProjectsByRound(a, b) {
    const aOrder = roundOrder.get(a.round.trim().toLowerCase()) ?? roundOrder.size;
    const bOrder = roundOrder.get(b.round.trim().toLowerCase()) ?? roundOrder.size;
    return aOrder - bOrder || a.round.localeCompare(b.round, undefined, { numeric: true, sensitivity: "base" });
  }

  const matchLoadKinds = new Map([
    ["l-saved-team-select", "lineup"],
    ["sd-saved-select", "showdown"],
    ["vt-saved-compositions", "thumbnail"],
    ["short-vt-saved-compositions", "shortThumbnail"],
  ]);

  function refreshMatchLoadMenu(select) {
    const kind = matchLoadKinds.get(select.id);
    if (!kind) return;
    const previous = select.selectedOptions[0]?.dataset.libraryRecord;
    const current = select.querySelector("optgroup[data-match-saves]");
    const items = activeProjectId ? [...records.values()].map(({ item }) => item)
      .filter((item) => item.projectId === activeProjectId && item.kind === kind) : [];
    if (graphicPresetKinds.has(kind)) items.sort(compareGraphicPresets);
    if (!items.length) {
      current?.remove();
      return;
    }
    const label = translate("Match actif");
    if (current?.label === label && current.children.length === items.length && items.every((item, index) => {
      const option = current.children[index];
      return option.dataset.libraryRecord === item.id && option.textContent === item.name;
    })) return;
    current?.remove();
    const group = document.createElement("optgroup");
    group.dataset.matchSaves = "";
    group.label = label;
    for (const item of items) {
      const option = new Option(item.name, `library:${item.id}`);
      option.dataset.libraryRecord = item.id;
      group.append(option);
    }
    const localSelection = select.selectedOptions[0];
    select.prepend(group);
    const selection = [...group.children].find((option) => option.dataset.libraryRecord === previous);
    const next = selection ?? (previous || !localSelection?.value ? group.firstElementChild : localSelection);
    next.selected = true;
  }

  function selectedMatchSave(select) {
    const item = records.get(select.selectedOptions[0]?.dataset.libraryRecord)?.item;
    return item?.projectId === activeProjectId ? item : null;
  }

  const matchSaveDialog = $("match-save-dialog");
  const matchSaveTeam = $("match-save-team");
  const matchSaveLeg = $("match-save-leg");
  const matchSavePhase = $("match-save-phase");
  const matchSavePreview = $("match-save-preview");
  const graphicPresetKinds = new Set(["lineup", "showdown"]);
  const presetLegs = ["First Leg", "Second Leg"];
  const showdownPhases = ["Open", "Close"];
  let pendingMatchSave;

  function presetRound({ projectId, kind, entry }) {
    return projects.get(projectId)?.round || (kind === "showdown" ? entry?.data?.round : entry?.data?.footerRound);
  }

  function isFinalPreset(item) {
    return /^finale?$/i.test(String(presetRound(item) ?? "").trim());
  }

  function presetNaming(item) {
    const { kind, name, entry } = item;
    const data = entry?.data;
    const stored = entry?.naming;
    const legHint = [name, data?.leg, data?.footerLeg].filter(Boolean).join(" ");
    const leg = isFinalPreset(item) ? "" : presetLegs.includes(stored?.leg) ? stored.leg :
      /\b(first leg|aller)\b/i.test(legHint) ? "First Leg" :
      /\b(second leg|retour)\b/i.test(legHint) ? "Second Leg" : "";
    if (kind === "lineup") {
      const team = stored?.team || data?.team;
      return { leg, team: typeof team === "string" ? team : "" };
    }
    const phaseHint = (name || "").match(/\b(open|close)\b(?!.*\b(?:open|close)\b)/i)?.[0].toLowerCase();
    const phase = showdownPhases.includes(stored?.phase) ? stored.phase :
      showdownPhases.find((option) => option.toLowerCase() === phaseHint) || "";
    return { leg, phase };
  }

  function compareGraphicPresets(a, b) {
    const first = presetNaming(a);
    const second = presetNaming(b);
    const rank = (options, value) => options.includes(value) ? options.indexOf(value) : options.length;
    return rank(presetLegs, first.leg) - rank(presetLegs, second.leg) || (a.kind === "showdown"
      ? rank(showdownPhases, first.phase) - rank(showdownPhases, second.phase)
      : (first.team || "").localeCompare(second.team || "", undefined, { sensitivity: "base" }));
  }

  function matchSaveDetails() {
    const { item } = pendingMatchSave;
    const { kind, entry } = item;
    const project = projects.get(item.projectId);
    const data = entry?.data;
    const matchup = project?.name || (kind === "showdown" && [data?.name1, data?.name2].filter(Boolean).join(" – "));
    const round = presetRound(item);
    const naming = kind === "lineup"
      ? { leg: matchSaveLeg.value, team: matchSaveTeam.value.trim() }
      : { leg: matchSaveLeg.value, phase: matchSavePhase.value };
    const name = [matchup, round, kindLabel(kind), naming.leg, naming.team || naming.phase].filter(Boolean).join(" · ");
    return { name, naming };
  }

  function openMatchSaveDialog(item, save) {
    const { kind } = item;
    const isLineup = kind === "lineup";
    const isFinal = isFinalPreset(item);
    const naming = presetNaming(item);
    $("match-save-team-field").hidden = !isLineup;
    $("match-save-leg-field").hidden = isFinal;
    $("match-save-phase-field").hidden = isLineup;
    matchSaveTeam.required = isLineup;
    matchSaveLeg.required = !isFinal;
    matchSavePhase.required = !isLineup;
    matchSaveTeam.value = naming.team || "";
    matchSaveTeam.setCustomValidity("");
    matchSaveLeg.value = naming.leg;
    matchSavePhase.value = naming.phase || "";
    pendingMatchSave = { item, save };
    matchSavePreview.value = matchSaveDetails().name;
    matchSaveDialog.showModal();
    if (isLineup && (isFinal || !matchSaveTeam.value)) matchSaveTeam.focus();
    else (isFinal ? matchSavePhase : matchSaveLeg).focus();
  }

  function nameMatchSave(kind, nameInput, save) {
    const name = nameInput.value.trim();
    const previous = findRecord(kind, name, activeProjectId)?.item.entry ??
      browserEntries(kind).find((entry) => entry?.name === name);
    const data = kind === "lineup"
      ? { team: $("l-team").value.trim(), footerRound: $("l-footer-round").value, footerLeg: $("l-footer-leg").value }
      : { name1: $("sd-name-1-input").value.trim(), name2: $("sd-name-2-input").value.trim(),
        round: $("sd-round").value, leg: $("sd-leg").value };
    const entry = { data, naming: previous?.naming };
    openMatchSaveDialog({ kind, name, entry, projectId: activeProjectId }, save);
    return true;
  }

  $("match-save-form").addEventListener("input", () => {
    matchSaveTeam.setCustomValidity("");
    matchSavePreview.value = matchSaveDetails().name;
  });
  $("match-save-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const { item, save } = pendingMatchSave;
    if (!item.id && item.projectId !== activeProjectId) {
      matchSaveDialog.close();
      return;
    }
    if (matchSaveTeam.required && !matchSaveTeam.value.trim()) {
      matchSaveTeam.setCustomValidity(translate("Indique l’équipe du Lineup."));
      matchSaveTeam.reportValidity();
      return;
    }
    const { name, naming } = matchSaveDetails();
    const existing = findRecord(item.kind, name, item.projectId || "");
    if (item.id && existing && existing.item.id !== item.id) {
      alert(translate("Une sauvegarde porte déjà ce nom dans ce dossier."));
      return;
    }
    if (!item.id && existing && !confirm(translate("Remplacer la sauvegarde « {name} » ?", { name }))) return;
    matchSaveDialog.close();
    save(name, naming);
  });
  $("match-save-cancel").addEventListener("click", () => matchSaveDialog.close());
  matchSaveDialog.addEventListener("close", () => {
    if (!matchSaveDialog.open) pendingMatchSave = undefined;
  });

  window.matchPresetMenus = {
    get activeProjectId() {
      return activeProjectId;
    },
    refresh: refreshMatchLoadMenu,
    nameSave: nameMatchSave,
    load(select) {
      const item = selectedMatchSave(select);
      return item ? openItem(item, { navigate: false }) : null;
    },
    remove(select) {
      const item = selectedMatchSave(select);
      if (!item) return false;
      deleteItem(item);
      return true;
    },
  };

  function projectOpponent(project, campaign) {
    if (project.opponent) return project.opponent;
    const [home, away] = project.name.split(/\s+[-–—]\s+/);
    const team = campaign?.team;
    if (team && away) {
      if (normalizeTeamName(home) === normalizeTeamName(team)) return away;
      if (normalizeTeamName(away) === normalizeTeamName(team)) return home;
    }
    return project.name;
  }

  const normalizeTeamName = (value) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  function render() {
    const styles = currentView === "styles";
    archiveControl.hidden = styles;
    const archived = archives.checked;
    const active = projects.get(activeProjectId);
    const orderedCampaigns = [...campaigns.values()].sort(compareCampaigns);
    setOptions(projectCampaign, orderedCampaigns.filter((campaign) => !campaign.archived)
      .map((campaign) => new Option(campaignLabel(campaign), campaign.id)));
    newCampaign.disabled = !connection;
    newMatch.disabled = !connection || !projectCampaign.options.length;
    closeProject.hidden = !active;
    activeHeader.hidden = !active;
    if (active) {
      const campaign = campaigns.get(active.campaignId);
      const match = [projectOpponent(active, campaign), active.round].filter(Boolean).join(" · ");
      activeHeader.querySelector("strong").textContent = match;
      activeHeader.querySelector("span").textContent = campaignLabel(campaign);
    }
    for (const kind of graphicPresetKinds) $(catalog[kind][3]).hidden = true;
    for (const id of matchLoadKinds.keys()) {
      const select = $(id);
      const previous = select.selectedOptions[0];
      refreshMatchLoadMenu(select);
      if (previous !== select.selectedOptions[0]) select.dispatchEvent(new Event("match-presets-change"));
    }
    const items = [...records.values()].map(({ item }) => item).filter((item) =>
      Boolean(catalog[item.kind][5]) === styles && (styles || isProjectArchived(projects.get(item.projectId)) === archived));
    items.sort(styles ? (a, b) => compareLibraryNames(a.name, b.name) :
      (a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "") || a.name.localeCompare(b.name));
    if (styles) results.replaceChildren(...kindBranches("__global", items, { byName: true }));
    else {
      renderTree(items, orderedCampaigns);
    }
    resultStatus.textContent = translate(resultMessage ?? (!connection ? disconnected :
      items.length || results.childElementCount ? "" : "Aucune sauvegarde dans cette vue."));
  }

  function projectOptions() {
    return [...projects.values()].filter((project) => !isProjectArchived(project))
      .map((project) => new Option(campaignLabel(campaigns.get(project.campaignId)) + " / " + projectLabel(project), project.id));
  }

  function compareLibraryNames(a, b) {
    return a.localeCompare(b, document.documentElement.lang, { numeric: true, sensitivity: "base" });
  }

  function branch(id, label, children, {
    commands, activate, type = "section", kind, subtitle, active = false, target, openByDefault = false,
  } = {}) {
    const item = document.createElement("li");
    const details = document.createElement("details");
    details.className = "library-branch";
    details.dataset.branchId = id;
    details.dataset.level = type;
    details.classList.toggle("library-branch-active", active);
    details.open = expandedBranches.get(id) ?? openByDefault;
    details.addEventListener("toggle", () => {
      if (details.isConnected) expandedBranches.set(id, details.open);
    });
    const summary = document.createElement("summary");
    const icon = globalStyleIcons[kind] ? globalStyleIcon(kind) : document.createElement("span");
    if (!globalStyleIcons[kind]) {
      icon.className = "library-folder-icon";
      if (kind) icon.dataset.kind = kind;
      icon.setAttribute("aria-hidden", "true");
    }
    const labelContent = document.createElement("span");
    labelContent.className = "library-branch-label";
    const name = document.createElement("span");
    name.textContent = label;
    labelContent.append(name);
    if (subtitle) {
      const secondary = document.createElement("small");
      secondary.textContent = ` · ${subtitle}`;
      labelContent.append(secondary);
      labelContent.title = `${label} · ${subtitle}`;
    }
    summary.append(icon, labelContent);
    if (commands) {
      const actions = document.createElement("span");
      actions.className = "library-branch-actions";
      if (activate) actions.append(activate);
      appendActionsMenu(actions, label, commands, summary);
      summary.append(actions);
    }
    if (target !== undefined) bindDropTarget(details, target);
    details.append(summary);
    const list = document.createElement("ul");
    list.className = "library-tree-children";
    list.append(...children);
    details.append(list);
    item.append(details);
    return item;
  }

  function kindBranches(parentId, items, { byName = false, groupedByLeg = false } = {}) {
    const groups = new Map();
    for (const item of items) {
      const kind = Object.hasOwn(thumbnailLabels, item.kind) ? "thumbnail" : item.kind;
      if (!groups.has(kind)) groups.set(kind, []);
      groups.get(kind).push(item);
    }
    const names = { lineup: "Lineups", showdown: "Showdowns", thumbnail: "Thumbnail" };
    const orderedGroups = [...groups].sort(([a], [b]) => byName ? compareLibraryNames(kindLabel(a), kindLabel(b)) :
      Number(b === "lineup") - Number(a === "lineup"));
    return orderedGroups.map(([kind, list]) => {
      const id = parentId + "/" + kind;
      if (graphicPresetKinds.has(kind)) list.sort(compareGraphicPresets);
      if (kind === "thumbnail") {
        list.sort((a, b) => Number(a.kind === "shortThumbnail") - Number(b.kind === "shortThumbnail"));
      }
      const children = list.map((item) => renderItem(item, groupedByLeg));
      return branch(id, names[kind] ?? kindLabel(kind), children, { type: "kind", kind });
    });
  }

  function legBranches(parentId, items) {
    const byLeg = new Map(presetLegs.map((leg) => [leg, []]));
    const withoutLeg = [];
    for (const item of items) {
      const leg = graphicPresetKinds.has(item.kind) ? presetNaming(item).leg : "";
      (byLeg.get(leg) ?? withoutLeg).push(item);
    }
    const branches = [];
    for (const [leg, group] of byLeg) {
      if (!group.length) continue;
      const id = parentId + "/" + leg;
      branches.push(branch(id, leg, kindBranches(id, group, { groupedByLeg: true }), {
        type: "leg", openByDefault: true,
      }));
    }
    return branches.concat(kindBranches(parentId, withoutLeg));
  }

  function renderTree(items, orderedCampaigns) {
    const sections = [];
    const active = projects.get(activeProjectId);
    const campaignNodes = [];
    const orderedProjects = [...projects.values()].sort(compareProjectsByRound);
    for (const owner of orderedCampaigns) {
      if (owner.archived && !archives.checked) continue;
      const nodes = [];
      for (const project of orderedProjects) {
        if (project.campaignId !== owner.id || isProjectArchived(project) !== archives.checked) continue;
        const entries = items.filter((item) => item.projectId === project.id);
        const opponent = projectOpponent(project, owner);
        let activate;
        if (!archives.checked) {
          activate = document.createElement("button");
          activate.type = "button";
          activate.className = "btn-secondary library-activate-project";
          activate.textContent = translate(active === project ? "Activé" : "Activer");
          activate.setAttribute("aria-label", translate(active === project ? "Match actif" : "Activer le match"));
          activate.setAttribute("aria-pressed", String(active === project));
          activate.disabled = active === project;
          activate.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            schedule(() => useProject(project));
          });
        }
        const commands = [["Renommer", "✎", () => renameProject(project.id)]];
        if (!owner.archived) commands.push(archiveCommand(project.archived, () => setProjectArchived(project.id, !project.archived)));
        commands.push(["Supprimer", "", () => deleteMatch(project.id)]);
        nodes.push(branch(project.id, opponent, legBranches(project.id, entries), {
          type: "project", subtitle: project.round, active: active === project,
          target: archives.checked ? undefined : project.id,
          commands, activate,
        }));
      }
      const title = campaignTitle(owner);
      const metadata = [owner.competition, owner.season].filter((value) => value && value !== title);
      if (nodes.length || !!owner.archived === archives.checked) campaignNodes.push(branch(owner.id, title, nodes, {
        type: "campaign", subtitle: [...new Set(metadata)].join(" · "),
        commands: campaignCommands(owner, !!owner.archived === archives.checked),
      }));
    }
    if (campaignNodes.length) sections.push(branch("__projects", translate(archives.checked ? "Archives" : "Campagnes"), campaignNodes));
    const unfiled = items.filter((item) => !item.projectId);
    if (!archives.checked && connection) {
      sections.push(branch("__unfiled", translate("À classer"),
        legBranches("__unfiled", unfiled), { target: "" }));
    }
    results.replaceChildren(...sections);
  }

  function renderItem(item, groupedByLeg = false) {
    const node = document.createElement("li");
    node.className = "library-item";
    const movable = !catalog[item.kind][5];
    if (movable) {
      node.draggable = true;
      node.addEventListener("dragstart", (event) => startDragging(event, item, node));
      node.addEventListener("dragend", stopDragging);
    }
    const check = document.createElement("input");
    let displayName = item.name;
    if (Object.hasOwn(thumbnailLabels, item.kind)) {
      const label = thumbnailLabels[item.kind];
      const tab = catalog[item.kind][2];
      displayName = item.name === thumbnailEditors.get(tab).compositionName ? label : `${label} · ${item.name}`;
    }
    check.type = "checkbox";
    check.className = "library-save-select";
    check.disabled = !movable;
    check.checked = selected.has(item.id);
    check.setAttribute("aria-label", translate("Sélectionner {name}", { name: displayName }));
    check.addEventListener("change", () => {
      if (check.checked) selected.add(item.id);
      else selected.delete(item.id);
    });
    const summary = document.createElement("div");
    summary.className = "library-item-name";
    summary.textContent = displayName;
    if (graphicPresetKinds.has(item.kind)) {
      const { leg, phase, team } = presetNaming(item);
      const detail = team || phase;
      if (detail && (groupedByLeg || isFinalPreset(item))) summary.textContent = detail;
      else if (leg && detail) summary.textContent = `${leg} · ${detail}`;
    }
    if (movable) {
      const grip = document.createElement("span");
      grip.className = "library-grip";
      grip.textContent = "⠿";
      grip.title = translate("Glisser pour déplacer");
      grip.setAttribute("aria-hidden", "true");
      node.append(grip);
    }
    if (movable) node.append(check);
    const preview = item.entry?.data?.libraryPreview;
    if (typeof preview === "string" && preview.startsWith("data:image/jpeg;base64,")) {
      const image = document.createElement("img");
      image.src = preview;
      image.alt = "";
      image.loading = "lazy";
      node.append(image);
    }
    if (globalStyleIcons[item.kind]) node.append(globalStyleIcon(item.kind));
    node.append(summary);
    appendActionsMenu(node, displayName, [
      ["Ouvrir", "↗", () => openItem(item)],
      ["Renommer", "✎", () => renameItem(item)],
      ["Dupliquer", "⧉", () => duplicate(item)],
      ["Supprimer", "", () => deleteItem(item)],
    ]);
    node.addEventListener("dblclick", (event) => {
      if (event.target.closest("button, input, .library-item-menu")) return;
      openItem(item, { activateMatch: false });
    });
    return node;
  }

  function appendActionsMenu(container, name, commands, context = container) {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "btn-secondary library-item-menu-trigger";
    trigger.textContent = "⋯";
    trigger.setAttribute("aria-label", translate("Actions pour {name}", { name }));
    trigger.addEventListener("click", (event) => event.stopPropagation());
    const menu = document.createElement("span");
    menu.className = "library-item-menu";
    menu.popover = "auto";
    trigger.popoverTargetElement = menu;
    for (const [label, glyph, action] of commands) {
      const button = document.createElement("button");
      button.type = "button";
      const icon = document.createElement("span");
      icon.className = glyph ? "library-menu-icon" : "library-trash-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = glyph;
      button.append(icon, translate(label));
      if (!glyph) button.classList.add("library-menu-delete");
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        menu.hidePopover();
        action();
      });
      menu.append(button);
    }
    menu.addEventListener("toggle", (event) => {
      if (event.newState !== "open") return;
      const anchor = trigger.getBoundingClientRect();
      const bounds = menu.getBoundingClientRect();
      menu.style.left = `${Math.max(8, anchor.right - bounds.width)}px`;
      const top = anchor.bottom + bounds.height + 12 <= window.innerHeight
        ? anchor.bottom + 4 : Math.max(8, anchor.top - bounds.height - 4);
      menu.style.top = `${top}px`;
      menu.firstElementChild.focus({ preventScroll: true });
    });
    context.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      if (!menu.matches(":popover-open")) trigger.click();
    });
    container.append(trigger, menu);
  }

  function deleteItem(item) {
    if (!confirm(translate("Supprimer définitivement « {name} » de la bibliothèque ?", { name: item.name }))) return;
    schedule(async () => {
      const record = records.get(item.id);
      if (!record) return;
      await deleteRecord(record);
      resultMessage = "Sauvegarde supprimée de la bibliothèque.";
    });
  }

  async function removeEntry(directory, name) {
    try {
      await directory.removeEntry(name);
    } catch (error) {
      if (error.name !== "NotFoundError") throw error;
    }
  }

  async function deleteRecord(record) {
    await removeEntry(record.directory, record.filename);
    records.delete(record.item.id);
    selected.delete(record.item.id);
  }

  async function removeEmptyFolder(parent, name) {
    try {
      await removeEntry(parent, name);
    } catch (error) {
      if (error.name !== "InvalidModificationError") throw error;
    }
  }

  async function removeMatchDirectory(match, campaign) {
    await removeEntry(match.directory, "projet.json");
    await removeEmptyFolder(campaign.directory, match.directory.name);
    projects.delete(match.id);
    expandedBranches.delete(match.id);
    if (activeProjectId === match.id) await useProject(null);
  }

  function deleteMatch(matchId) {
    const match = projects.get(matchId);
    if (!match) return;
    const entries = [...records.values()].filter(({ item }) => item.projectId === matchId);
    if (!confirm(translate("Supprimer définitivement « {name} » et ses {count} sauvegarde(s) ?", {
      name: projectLabel(match), count: entries.length,
    }))) return;
    schedule(async () => {
      const current = projects.get(matchId);
      const campaign = campaigns.get(current?.campaignId);
      if (!current || !campaign) return;
      const confirmed = new Set(entries.map(({ item }) => item.id));
      const remaining = [...records.values()].filter(({ item }) => item.projectId === matchId);
      if (remaining.some(({ item }) => !confirmed.has(item.id))) {
        resultMessage = "Le match contient de nouvelles sauvegardes. Vérifie son contenu avant de le supprimer.";
        return;
      }
      for (const record of remaining) await deleteRecord(record);
      await removeMatchDirectory(current, campaign);
      resultMessage = "Match supprimé.";
    });
  }

  function archiveCommand(archived, action) {
    return archived ? ["Réactiver", "↶", action] : ["Archiver", "⇩", action];
  }

  function campaignCommands(campaign, showArchiveAction) {
    const commands = [["Renommer", "✎", () => renameCampaign(campaign.id)]];
    if (!showArchiveAction) return commands;
    commands.push(archiveCommand(campaign.archived, () => setCampaignArchived(campaign.id, !campaign.archived)));
    if (campaign.archived) {
      commands.push(["Supprimer", "", () => deleteArchivedCampaign(campaign.id)]);
    }
    return commands;
  }

  function deleteArchivedCampaign(campaignId) {
    const campaign = campaigns.get(campaignId);
    if (!campaign?.archived) return;
    const items = [...records.values()].filter(({ item }) => item.campaignId === campaignId);
    const prompt = translate(
      "Supprimer définitivement « {name} » et ses {count} sauvegarde(s) ?",
      { name: campaignLabel(campaign), count: items.length },
    );
    if (!confirm(prompt)) return;
    schedule(async () => {
      if (!campaigns.get(campaignId)?.archived) return;
      const confirmed = new Set(items.map(({ item }) => item.id));
      if ([...records.values()].some(({ item }) => item.campaignId === campaignId && !confirmed.has(item.id))) {
        resultMessage = "La campagne contient de nouvelles sauvegardes. Vérifie son contenu avant de la supprimer.";
        return;
      }
      for (const { item } of items) {
        const record = records.get(item.id);
        if (record?.item.campaignId === campaignId) await deleteRecord(record);
      }
      for (const project of projects.values()) {
        if (project.campaignId !== campaignId) continue;
        await removeMatchDirectory(project, campaign);
      }
      await removeEntry(campaign.directory, "campagne.json");
      campaigns.delete(campaignId);
      const root = await folder(connection.directory, ["Campagnes"]);
      await removeEmptyFolder(root, campaignId);
      resultMessage = "Campagne supprimée.";
    });
  }

  async function openItem(item, { navigate = true, activateMatch = navigate, canApply } = {}) {
    try {
      const [, , tab, inputId, open] = catalog[item.kind];
      if (open) {
        open(structuredClone(item.entry));
      } else {
        const data = structuredClone(item.entry.data);
        for (const [layer, details] of Object.entries(data.layers)) {
          for (const [fileField, mediaField] of videoAssetFields) {
            const media = details[mediaField];
            if (!media || mediaGroups[layer] !== media.group) continue;
            const directory = await folder(connection.directory, ["Médias", media.group]);
            const file = await (await directory.getFileHandle(media.filename)).getFile();
            details[fileField] = new File([file], media.name, { type: media.type });
          }
        }
        if (canApply && !canApply()) return;
        if (!await thumbnailEditors.get(tab).restoreLibraryPreset(data, canApply)) return;
      }
      const project = projects.get(item.projectId);
      if (thumbnailKinds.get(tab) === item.kind) thumbnailProjects.set(tab, item.projectId);
      if (activateMatch && !catalog[item.kind][5]) {
        await useProject(isProjectArchived(project) ? null : project);
        render();
      }
      if ($(inputId)) $(inputId).value = item.name;
      if (navigate) {
        openingThumbnailFromLibrary = thumbnailEditors.has(tab);
        try {
          document.querySelector(`.tab[data-tab="${tab}"]`).click();
        } finally {
          openingThumbnailFromLibrary = false;
        }
      }
    } catch {
      if (canApply && !canApply()) return;
      if (!navigate) {
        alert(translate("Impossible d’ouvrir cette sauvegarde."));
        return;
      }
      resultMessage = "Impossible d’ouvrir cette sauvegarde.";
      render();
    }
  }

  async function loadActiveThumbnail(tab) {
    if (openingThumbnailFromLibrary) return;
    await ready;
    await queue;
    const projectId = activeProjectId;
    const thumbnailIsActive = () => document.querySelector(".tab.active")?.dataset.tab === tab;
    if (thumbnailProjects.get(tab) === projectId || loadingThumbnails.has(tab) || !thumbnailIsActive()) return;
    if (!projectId) {
      thumbnailProjects.set(tab, projectId);
      return;
    }

    const kind = thumbnailKinds.get(tab);
    const item = findRecord(kind, thumbnailEditors.get(tab).compositionName, projectId)?.item ??
      [...records.values()].map(({ item }) => item)
        .filter((item) => item.kind === kind && item.projectId === projectId)
        .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))[0];
    if (!item) {
      thumbnailProjects.set(tab, projectId);
      return;
    }

    const directory = connection.directory;
    const canApply = () => thumbnailIsActive() && activeProjectId === projectId &&
      connection?.directory === directory && thumbnailProjects.get(tab) !== projectId;
    loadingThumbnails.add(tab);
    try {
      await openItem(item, { navigate: false, canApply });
    } finally {
      loadingThumbnails.delete(tab);
      if (thumbnailIsActive() && activeProjectId !== projectId) loadActiveThumbnail(tab);
    }
  }

  function schedule(action) {
    queue = queue.then(async () => {
      if (!connection) {
        resultMessage = disconnected;
        render();
        return;
      }
      if (await connection.directory.queryPermission({ mode: "readwrite" }) !== "granted") {
        resultMessage = denied;
        setStatus(denied);
        render();
        return;
      }
      resultMessage = undefined;
      await action();
      render();
    }).catch(() => {
      resultMessage = failed;
      setStatus(failed);
      render();
    });
    return queue;
  }

  function freeName(kind, name, projectId, exceptId) {
    const used = (value) => {
      const existing = findRecord(kind, value, projectId);
      return existing && existing.item.id !== exceptId;
    };
    if (!used(name)) return name;
    const suffix = " " + translate("(copie)");
    let candidate = name + suffix;
    for (let count = 2; used(candidate); count++) candidate = name + suffix + " " + count;
    return candidate;
  }

  function renameItem(item) {
    if (graphicPresetKinds.has(item.kind)) {
      openMatchSaveDialog(item, (name, naming) => saveItemName(item.id, name, naming));
      return;
    }
    const name = prompt(translate("Nouveau nom de la sauvegarde"), item.name)?.trim();
    if (!name || name === item.name) return;
    return saveItemName(item.id, name);
  }

  function saveItemName(id, name, naming) {
    return schedule(async () => {
      const record = records.get(id);
      if (!record || (record.item.name === name && !naming)) return;
      const existing = findRecord(record.item.kind, name, record.item.projectId || "");
      if (existing && existing.item.id !== id) {
        resultMessage = "Une sauvegarde porte déjà ce nom dans ce dossier.";
        return;
      }
      const renamed = {
        ...record.item,
        name,
        updatedAt: new Date().toISOString(),
        entry: { ...record.item.entry, name, ...(naming && { naming }) },
      };
      await writeJson(record.directory, record.filename, renamed);
      records.set(renamed.id, { ...record, item: renamed });
      resultMessage = "Sauvegarde renommée.";
    });
  }

  function renameCampaign(id) {
    const campaign = campaigns.get(id);
    if (!campaign) return;
    const displayName = prompt(translate("Nouveau nom de la campagne"), campaignTitle(campaign))?.trim();
    if (!displayName || displayName === campaignTitle(campaign)) return;
    return schedule(async () => {
      const current = campaigns.get(id);
      if (!current) return;
      const { id: campaignId, directory, ...metadata } = current;
      await writeJson(directory, "campagne.json", { ...metadata, displayName });
      campaigns.set(campaignId, { ...current, displayName });
      resultMessage = "Campagne renommée.";
    });
  }

  function renameProject(id) {
    const project = projects.get(id);
    if (!project) return;
    const currentOpponent = projectOpponent(project, campaigns.get(project.campaignId));
    const opponent = prompt(translate("Nouveau nom affiché pour le match"), currentOpponent)?.trim();
    if (!opponent || opponent === currentOpponent) return;
    return schedule(async () => {
      const current = projects.get(id);
      if (!current) return;
      const { team } = campaigns.get(current.campaignId);
      const { round, archived } = current;
      const name = team ? [team, opponent].join(" – ") : opponent;
      const duplicate = [...projects.values()].some((other) => other.id !== id &&
        other.campaignId === current.campaignId && other.name.toLowerCase() === name.toLowerCase() &&
        other.round.toLowerCase() === round.toLowerCase());
      if (duplicate) {
        resultMessage = "Un match porte déjà ce nom pour ce tour.";
        return;
      }
      await writeJson(current.directory, "projet.json", { name, round, opponent, archived });
      Object.assign(current, { name, opponent, inferred: false });
      for (const { item } of records.values()) {
        if (item.projectId === id) item.match = name;
      }
      resultMessage = "Match renommé.";
    });
  }

  function duplicate(item) {
    schedule(async () => {
      const project = projects.get(item.projectId);
      const placement = projectPlacement(isProjectArchived(project) ? null : project);
      const name = freeName(item.kind, item.name + " " + translate("(copie)"), placement.projectId);
      const id = await availableRecordId(item.kind, name, placement.projectId);
      await persist({
        ...item, id, name, ...placement,
        updatedAt: new Date().toISOString(), entry: { ...item.entry, name },
      });
      if (!placement.projectId) {
        archives.checked = false;
        expandedBranches.set("__unfiled", true);
      }
    });
  }

  for (const [button, dialog] of [[newCampaign, campaignDialog], [newMatch, matchDialog]]) {
    const feedback = dialog.querySelector(".library-create-status");
    button.addEventListener("click", () => {
      feedback.textContent = "";
      dialog.showModal();
    });
    dialog.querySelector("[data-library-dialog-cancel]").addEventListener("click", () => dialog.close());
  }

  async function submitCreation(form, create) {
    const submit = form.querySelector('button[type="submit"]');
    const feedback = form.querySelector(".library-create-status");
    const dialog = form.closest("dialog");
    if (submit.disabled) return;
    feedback.textContent = "";
    submit.disabled = true;
    await schedule(async () => {
      if (!await create()) return;
      form.reset();
      dialog.close();
    });
    if (dialog.open) feedback.textContent = translate(resultMessage ?? failed);
    submit.disabled = false;
  }

  $("library-create").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    const team = fields.team.trim();
    const competition = fields.competition.trim();
    const season = fields.season.trim();
    if (!team || !competition || !season) return;
    const name = [team, competition, season].join(" · ");
    submitCreation(form, async () => {
      const id = readableName(name) + "-" + crypto.randomUUID().slice(0, 8);
      const directory = await folder(connection.directory, ["Campagnes", id], true);
      const metadata = { name, team, competition, season, archived: false };
      await writeJson(directory, "campagne.json", metadata);
      campaigns.set(id, { ...metadata, id, directory });
      archives.checked = false;
      expandedBranches.set("__projects", true);
      expandedBranches.set(id, true);
      selectView($("library-view-campaigns"));
      projectCampaign.value = id;
      return true;
    });
  });

  function setCampaignArchived(campaignId, archived) {
    schedule(async () => {
      const campaign = campaigns.get(campaignId);
      if (!campaign || campaign.archived === archived) return;
      const { id, directory, ...metadata } = campaign;
      metadata.archived = archived;
      await writeJson(directory, "campagne.json", metadata);
      campaigns.set(id, { ...metadata, id, directory });
      if (archived && projects.get(activeProjectId)?.campaignId === id) await useProject(null);
      if (!archived) {
        archives.checked = false;
        expandedBranches.set("__projects", true);
        expandedBranches.set(id, true);
      }
      resultMessage = archived ? "Campagne archivée." : "Campagne réactivée.";
    });
  }

  function setProjectArchived(projectId, archived) {
    schedule(async () => {
      const project = projects.get(projectId);
      if (!project || project.archived === archived || campaigns.get(project.campaignId)?.archived) return;
      const { name, round, opponent } = project;
      await writeJson(project.directory, "projet.json", { name, round, opponent, archived });
      project.archived = archived;
      delete project.inferred;
      if (archived && activeProjectId === projectId) await useProject(null);
      if (!archived) {
        archives.checked = false;
        expandedBranches.set("__projects", true);
        expandedBranches.set(project.campaignId, true);
        expandedBranches.set(projectId, true);
      }
      resultMessage = archived ? "Match archivé." : "Match réactivé.";
    });
  }

  $("library-create-project").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const round = fields.get("round").trim();
    const opponent = fields.get("opponent").trim();
    const campaign = campaigns.get(projectCampaign.value);
    if (!round || !opponent || !campaign || campaign.archived) return;
    const name = campaign.team ? [campaign.team, opponent].join(" – ") : opponent;
    submitCreation(form, async () => {
      const current = campaigns.get(campaign.id);
      if (!current || current.archived) return;
      const project = await ensureProject(current, name, round, opponent);
      if (project.archived) {
        resultMessage = "Ce match est dans les archives. Réactive-le pour l’utiliser.";
        return;
      }
      await useProject(project);
      archives.checked = false;
      expandedBranches.set(campaign.id, true);
      expandedBranches.set("__projects", true);
      selectView($("library-view-campaigns"));
      return true;
    });
  });

  closeProject.addEventListener("click", () => schedule(() => useProject(null)));

  function canMove(ids, projectId) {
    if (projectId && (!projects.has(projectId) || isProjectArchived(projects.get(projectId)))) {
      return false;
    }
    return ids.some((id) => {
      const item = records.get(id)?.item;
      return item && !catalog[item.kind][5] && (item.projectId || "") !== projectId;
    });
  }

  function moveLibraryItems(ids, projectId) {
    return schedule(async () => {
      if (!canMove(ids, projectId)) return;
      const project = projects.get(projectId);
      for (const id of ids) {
        const previous = records.get(id);
        if (!previous || catalog[previous.item.kind][5] || (previous.item.projectId || "") === projectId) continue;
        const name = freeName(previous.item.kind, previous.item.name, projectId, id);
        await persist({
          ...previous.item, ...projectPlacement(project), name,
          entry: { ...previous.item.entry, name }, updatedAt: new Date().toISOString(),
        }, previous);
        selected.delete(id);
      }
      archives.checked = false;
      if (project) {
        expandedBranches.set("__projects", true);
        expandedBranches.set(project.campaignId, true);
        expandedBranches.set(project.id, true);
      } else {
        expandedBranches.set("__unfiled", true);
      }
      resultMessage = "Déplacement enregistré.";
    });
  }

  function bindDropTarget(element, projectId) {
    element.classList.add("library-drop-target");
    element.dataset.libraryDropProject = projectId;
    element.addEventListener("dragover", (event) => {
      if (!canMove(draggedIds, projectId)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      element.classList.add("library-drop-hover");
    });
    element.addEventListener("dragleave", (event) => {
      if (!(event.relatedTarget instanceof Node) || !element.contains(event.relatedTarget)) {
        element.classList.remove("library-drop-hover");
      }
    });
    element.addEventListener("drop", (event) => {
      if (!canMove(draggedIds, projectId)) return;
      event.preventDefault();
      event.stopPropagation();
      const ids = draggedIds;
      stopDragging();
      moveLibraryItems(ids, projectId);
    });
  }

  function startDragging(event, item, node) {
    event.stopPropagation();
    draggedIds = selected.has(item.id) ? [...selected] : [item.id];
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", item.name);
    node.classList.add("library-drag-source");
    results.classList.add("library-dragging");
    const targets = [...projects.values()]
      .filter((project) => canMove(draggedIds, project.id))
      .map((project) => [
        project.id, projectLabel(project), campaignLabel(campaigns.get(project.campaignId)),
      ]);
    if (canMove(draggedIds, "")) targets.push(["", translate("À classer"), ""]);
    for (const [id, name, campaign] of targets) {
      const target = document.createElement("li");
      target.textContent = name;
      if (campaign) {
        const label = document.createElement("small");
        label.textContent = campaign;
        target.append(label);
      }
      bindDropTarget(target, id);
      dropTargets.append(target);
    }
    dropPanel.hidden = !targets.length;
  }

  function stopDragging() {
    draggedIds = [];
    results.classList.remove("library-dragging");
    for (const node of results.querySelectorAll(".library-drag-source, .library-drop-hover")) {
      node.classList.remove("library-drag-source", "library-drop-hover");
    }
    dropPanel.hidden = true;
    dropTargets.replaceChildren();
  }

  function selectView(tab) {
    currentView = tab.dataset.libraryView;
    for (const button of viewTabs) {
      button.setAttribute("aria-selected", String(button === tab));
      button.tabIndex = button === tab ? 0 : -1;
    }
    $("library-subview").setAttribute("aria-labelledby", tab.id);
    resultMessage = undefined;
    render();
  }

  for (const tab of viewTabs) {
    tab.addEventListener("click", () => selectView(tab));
    tab.addEventListener("keydown", (event) => {
      const index = viewTabs.indexOf(tab);
      let next;
      if (event.key === "Home") next = viewTabs[0];
      else if (event.key === "End") next = viewTabs.at(-1);
      else if (event.key === "ArrowLeft") next = viewTabs[(index - 1 + viewTabs.length) % viewTabs.length];
      else if (event.key === "ArrowRight") next = viewTabs[(index + 1) % viewTabs.length];
      if (!next) return;
      event.preventDefault();
      selectView(next);
      next.focus();
    });
  }

  archives.addEventListener("input", () => {
    expandedBranches.set("__projects", true);
    resultMessage = undefined;
    render();
  });
  function setAllBranchesOpen(open) {
    if (!open) expandedBranches.clear();
    for (const branch of results.querySelectorAll(".library-branch")) {
      expandedBranches.set(branch.dataset.branchId, open);
      branch.open = open;
    }
  }
  $("library-collapse-all").addEventListener("click", () => setAllBranchesOpen(false));
  $("library-expand-all").addEventListener("click", () => setAllBranchesOpen(true));
  const dock = $("library-dock");
  const dockToggle = $("library-dock-toggle");
  const workspace = dock.closest(".workspace");
  const libraryView = document.querySelector('[data-preview="library"]');
  const viewHome = libraryView.parentElement;
  let dockRequested = false;

  function syncLibraryDock(tab) {
    const inLibrary = tab === "library";
    const dockOpen = dockRequested && !inLibrary;
    dockToggle.setAttribute("aria-expanded", String(dockOpen));
    dock.inert = !dockOpen;
    workspace.classList.toggle("library-only", inLibrary);
    workspace.classList.toggle("has-library-dock", dockOpen);
    const viewContainer = inLibrary ? viewHome : dock;
    if (libraryView.parentElement !== viewContainer) viewContainer.append(libraryView);
  }

  dockToggle.addEventListener("click", () => {
    dockRequested = !dockRequested;
    syncLibraryDock(document.querySelector(".tab.active").dataset.tab);
  });
  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      syncLibraryDock(tab.dataset.tab);
      if (tab.dataset.tab === "library") render();
    });
  }
  document.addEventListener("interface-language-change", () => { setStatus(message); render(); });
  syncLibraryDock(document.querySelector(".tab.active").dataset.tab);
  render();

  const mediaDialog = $("library-media-dialog");
  const mediaSelect = $("library-media-select");
  const mediaStatus = $("library-media-status");
  const mediaUse = $("library-media-use");
  let mediaLayer;
  let mediaInput;
  let mediaDirectory;
  function setMediaStatus(text) {
    if (text) mediaStatus.dataset.interfaceMessage = text;
    else delete mediaStatus.dataset.interfaceMessage;
    mediaStatus.textContent = translate(text);
  }

  for (const mediaButton of document.querySelectorAll("[data-library-media]")) {
    mediaButton.addEventListener("click", async () => {
      mediaLayer = mediaButton.dataset.libraryMedia;
      const input = mediaButton.closest("[data-thumbnail-editor]").querySelector(`[data-vt-layer="${mediaLayer}"]`);
      mediaInput = input;
      mediaDirectory = null;
      mediaSelect.replaceChildren();
      mediaUse.disabled = true;
      setMediaStatus("");
      mediaDialog.returnValue = "";
      mediaDialog.showModal();
      if (!connection) {
        setMediaStatus(disconnected);
        return;
      }
      try {
        const directory = await optionalFolder(connection.directory, ["Médias", mediaGroups[mediaLayer]]);
        const files = [];
        if (directory) {
          for await (const [name, handle] of directory.entries()) {
            if (handle.kind === "file" && (/^[a-f0-9]{20}-/.test(name) || /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(name))) {
              files.push(new Option(name.replace(/^[a-f0-9]{20}-/, ""), name));
            }
          }
        }
        if (!mediaDialog.open || mediaInput !== input) return;
        mediaDirectory = directory;
        files.sort((a, b) => a.text.localeCompare(b.text));
        mediaSelect.replaceChildren(...files);
        mediaUse.disabled = !files.length;
        setMediaStatus(files.length ? "" : "Aucun média disponible pour cet emplacement.");
      } catch {
        setMediaStatus(failed);
      }
    });
  }

  mediaDialog.addEventListener("close", async () => {
    if (mediaDialog.returnValue !== "use" || !mediaDirectory || !mediaSelect.value) return;
    const input = mediaInput;
    try {
      const file = await (await mediaDirectory.getFileHandle(mediaSelect.value)).getFile();
      const transfer = new DataTransfer();
      transfer.items.add(new File([file], file.name.replace(/^[a-f0-9]{20}-/, ""), { type: file.type }));
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    } catch {
      setStatus(failed);
    }
  });

  async function flushPending() {
    const pending = await accessConnection("readonly", (store) => store.getAll());
    const jobs = pending.filter((job) => job?.pendingId).sort((a, b) => a.time - b.time);
    for (const job of jobs) {
      if (job.directory && !await connection.directory.isSameEntry(job.directory)) continue;
      const project = projects.get(job.projectId);
      await syncEntry(job.kind, job.entry, { project });
      await accessConnection("readwrite", (store) => store.delete(job.pendingId));
    }
  }

  async function activate() {
    await readLibrary();
    await migrate();
    for (const project of projects.values()) {
      if (!project.inferred) continue;
      await writeJson(project.directory, "projet.json", { name: project.name, round: project.round });
      delete project.inferred;
    }
    for (const previous of [...records.values()]) {
      const { item } = previous;
      if (!catalog[item.kind][5] || (!item.projectId && previous.directory.name !== "À classer")) continue;
      const name = freeName(item.kind, item.name, "", item.id);
      await persist({ ...item, ...projectPlacement(null), name,
        entry: { ...item.entry, name }, updatedAt: new Date().toISOString() }, previous);
    }
    await flushPending();
    setStatus("Bibliothèque connectée à « {folder} ».");
  }

  if (typeof window.showDirectoryPicker !== "function") {
    button.addEventListener("click", () => {
      setStatus("Ce navigateur ne permet pas d’écrire dans un dossier. Ouvre l’éditeur dans Chrome ou Edge.");
    });
    return;
  }

  const ready = accessConnection("readonly", (store) => store.get("active")).then((saved) => {
    if (!connection && saved?.directory) {
      connection = saved;
      activeProjectId = saved.activeProjectId ?? "";
      return schedule(activate);
    }
  }).catch(() => setStatus(failed));
  for (const tab of thumbnailKinds.keys()) {
    document.querySelector(`.tab[data-tab="${tab}"]`).addEventListener("click", () => loadActiveThumbnail(tab));
  }

  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      if (connection && message === denied) {
        if (await connection.directory.requestPermission({ mode: "readwrite" }) !== "granted") return;
      } else {
        const directory = await window.showDirectoryPicker({ id: "ucl-library", mode: "readwrite" });
        await ready;
        await queue;
        if (!(connection && await connection.directory.isSameEntry(directory))) {
          const next = { directory, migrateBrowser: !connection };
          await accessConnection("readwrite", (store) => store.put(next, "active"));
          connection = next;
          activeProjectId = "";
          thumbnailProjects.clear();
          selected.clear();
          expandedBranches.clear();
        }
      }
      await schedule(activate);
    } catch (error) {
      if (error.name !== "AbortError") setStatus(failed);
    } finally {
      button.disabled = false;
    }
  });

  let pendingWrites = Promise.resolve();
  function updateSaveFeedback(inputId, name, text) {
    const input = $(inputId);
    const feedback = input?.closest(".save-team-form")?.querySelector(".save-status");
    if (!feedback?.dataset.interfaceMessage || input.value !== name) return;
    feedback.dataset.interfaceMessage = text;
    feedback.textContent = translate(text);
  }

  document.addEventListener("ucl-presets-changed", (event) => {
    const { inputId, name, projectId, entry: snapshotEntry } = event.detail ?? {};
    const kind = Object.keys(catalog).find((key) => catalog[key][3] === inputId);
    if (!kind) return;
    const scope = projectId ?? activeProjectId;
    const tab = catalog[kind][2];
    if (thumbnailKinds.get(tab) === kind && scope === activeProjectId) thumbnailProjects.set(tab, scope);
    const directory = connection?.directory;
    const entry = snapshotEntry ?? (catalog[kind][0] ? browserEntries(kind).find((record) => record.name === name)
      : thumbnailEditors.get(tab).getLibraryPreset(name, catalog[kind][5]));
    updateSaveFeedback(inputId, name, "Enregistrement dans la bibliothèque en attente.");
    pendingWrites = pendingWrites.then(async () => {
      const snapshot = await entry;
      if (!snapshot) return;
      const pendingId = "pending:" + crypto.randomUUID();
      await accessConnection("readwrite", (store) => store.put({
        pendingId, kind, entry: snapshot, directory, projectId: scope, time: Date.now(),
      }, pendingId));
      await ready;
      if (!connection) {
        setStatus("Les sauvegardes en attente seront copiées dès que le dossier sera accessible.");
        return;
      }
      await schedule(flushPending);
      if (!await accessConnection("readonly", (store) => store.get(pendingId))) {
        updateSaveFeedback(inputId, name, "Sauvegarde enregistrée dans la bibliothèque.");
      }
    }).catch(() => {
      setStatus(failed);
      updateSaveFeedback(inputId, name, failed);
    });
  });
})();
