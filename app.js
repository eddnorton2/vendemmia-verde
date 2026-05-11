(function () {
  const defaultCloudConfig = {
    url: "https://jxjgsuhrevewhtrahjbq.supabase.co",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4amdzdWhyZXZld2h0cmFoamJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MTk0MTIsImV4cCI6MjA5NDA5NTQxMn0.XcLgLycpZ7mXzmRj_s-Qp4Au1wOqrjaZyLjy4JPzT6o",
    bucket: "vendemmia-foto"
  };

  const storageKeys = {
    technicians: "ft_technicians",
    companies: "ft_companies",
    entries: "ft_entries",
    cloudConfig: "vv_cloud_config"
  };

  const state = {
    technicians: load(storageKeys.technicians, ["Tecnico 1"]),
    companies: load(storageKeys.companies, []),
    entries: load(storageKeys.entries, []),
    cloudConfig: { ...defaultCloudConfig, ...load(storageKeys.cloudConfig, defaultCloudConfig) },
    supabase: null,
    photos: [],
    location: null,
    cloudDirectory: null,
    installPrompt: null
  };

  const els = {
    clock: document.querySelector("#clock"),
    installBtn: document.querySelector("#installBtn"),
    installStatus: document.querySelector("#installStatus"),
    navButtons: document.querySelectorAll(".nav-button"),
    views: document.querySelectorAll(".view"),
    viewTitle: document.querySelector("#viewTitle"),
    viewSubtitle: document.querySelector("#viewSubtitle"),
    technician: document.querySelector("#technician"),
    technicianForm: document.querySelector("#technicianForm"),
    technicianName: document.querySelector("#technicianName"),
    techniciansList: document.querySelector("#techniciansList"),
    csvInput: document.querySelector("#csvInput"),
    companyImportStatus: document.querySelector("#companyImportStatus"),
    companySearch: document.querySelector("#companySearch"),
    companiesList: document.querySelector("#companiesList"),
    cuaa: document.querySelector("#cuaa"),
    companyName: document.querySelector("#companyName"),
    province: document.querySelector("#province"),
    municipality: document.querySelector("#municipality"),
    municipalitiesList: document.querySelector("#municipalitiesList"),
    sheet: document.querySelector("#sheet"),
    parcel: document.querySelector("#parcel"),
    notes: document.querySelector("#notes"),
    cameraInput: document.querySelector("#cameraInput"),
    galleryInput: document.querySelector("#galleryInput"),
    photoPreview: document.querySelector("#photoPreview"),
    photoTemplate: document.querySelector("#photoTemplate"),
    getLocationBtn: document.querySelector("#getLocationBtn"),
    locationStatus: document.querySelector("#locationStatus"),
    chooseCloudBtn: document.querySelector("#chooseCloudBtn"),
    cloudStatus: document.querySelector("#cloudStatus"),
    entryForm: document.querySelector("#entryForm"),
    resetBtn: document.querySelector("#resetBtn"),
    entriesTable: document.querySelector("#entriesTable"),
    archiveCount: document.querySelector("#archiveCount"),
    exportCsvBtn: document.querySelector("#exportCsvBtn"),
    exportJsonBtn: document.querySelector("#exportJsonBtn"),
    clearArchiveBtn: document.querySelector("#clearArchiveBtn"),
    cloudSyncForm: document.querySelector("#cloudSyncForm"),
    supabaseUrl: document.querySelector("#supabaseUrl"),
    supabaseKey: document.querySelector("#supabaseKey"),
    supabaseBucket: document.querySelector("#supabaseBucket"),
    cloudSyncBtn: document.querySelector("#cloudSyncBtn"),
    cloudSyncStatus: document.querySelector("#cloudSyncStatus")
  };

  const titles = {
    workflow: ["Nuovo inserimento", "Scegli tecnico, azienda, dati catastali, esito e foto geolocalizzate."],
    archive: ["Archivio", "Consulta ed esporta gli inserimenti salvati."],
    settings: ["Impostazioni", "Gestisci tecnici, aziende e cartella cloud."]
  };

  init();

  function init() {
    renderClock();
    setInterval(renderClock, 1000);
    renderMunicipalities();
    renderTechnicians();
    renderCompanies();
    renderEntries();
    renderCloudConfig();
    wireEvents();
    initSupabase();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }

    if (!("showDirectoryPicker" in window)) {
      els.cloudStatus.textContent = "La scelta cartella è disponibile su Chrome o Edge desktop. Puoi comunque esportare i dati.";
      els.chooseCloudBtn.disabled = true;
    }
  }

  function wireEvents() {
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      state.installPrompt = event;
      els.installBtn.classList.remove("hidden");
      els.installStatus.textContent = "Installabile su questo dispositivo";
    });

    els.installBtn.addEventListener("click", async () => {
      if (!state.installPrompt) return;
      state.installPrompt.prompt();
      await state.installPrompt.userChoice;
      state.installPrompt = null;
      els.installBtn.classList.add("hidden");
      els.installStatus.textContent = "App installata o pronta";
    });

    els.navButtons.forEach((button) => {
      button.addEventListener("click", () => switchView(button.dataset.view));
    });

    els.technicianForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = els.technicianName.value.trim();
      if (!name || state.technicians.includes(name)) return;
      state.technicians.push(name);
      save(storageKeys.technicians, state.technicians);
      syncSettingsToCloud();
      els.technicianName.value = "";
      renderTechnicians();
    });

    els.csvInput.addEventListener("change", importCompanies);
    els.companySearch.addEventListener("input", fillCompanyFromSearch);
    els.cameraInput.addEventListener("change", handlePhotoInput);
    els.galleryInput.addEventListener("change", handlePhotoInput);
    els.getLocationBtn.addEventListener("click", getLocation);
    els.chooseCloudBtn.addEventListener("click", chooseCloudDirectory);
    els.entryForm.addEventListener("submit", saveEntry);
    els.resetBtn.addEventListener("click", resetForm);
    els.exportCsvBtn.addEventListener("click", exportCsv);
    els.exportJsonBtn.addEventListener("click", exportJson);
    els.clearArchiveBtn.addEventListener("click", clearArchive);
    els.cloudSyncForm.addEventListener("submit", saveCloudConfig);
    els.cloudSyncBtn.addEventListener("click", syncFromCloud);
  }

  function switchView(view) {
    els.navButtons.forEach((button) => button.classList.toggle("active", button.dataset.view === view));
    els.views.forEach((section) => section.classList.toggle("active", section.id === view));
    els.viewTitle.textContent = titles[view][0];
    els.viewSubtitle.textContent = titles[view][1];
  }

  function renderClock() {
    els.clock.textContent = new Intl.DateTimeFormat("it-IT", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date());
  }

  function renderMunicipalities() {
    els.municipalitiesList.innerHTML = "";
    window.SICILY_MUNICIPALITIES.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      els.municipalitiesList.append(option);
    });
  }

  function renderTechnicians() {
    els.technician.innerHTML = "";
    els.techniciansList.innerHTML = "";
    state.technicians.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      els.technician.append(option);

      const item = document.createElement("div");
      item.className = "list-item";
      item.innerHTML = `<span>${escapeHtml(name)}</span>`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Rimuovi";
      remove.addEventListener("click", () => {
        state.technicians = state.technicians.filter((itemName) => itemName !== name);
        if (!state.technicians.length) state.technicians.push("Tecnico 1");
        save(storageKeys.technicians, state.technicians);
        syncSettingsToCloud();
        renderTechnicians();
      });
      item.append(remove);
      els.techniciansList.append(item);
    });
  }

  function renderCompanies() {
    els.companiesList.innerHTML = "";
    state.companies.forEach((company) => {
      const option = document.createElement("option");
      option.value = `${company.cuaa} - ${company.name}`;
      els.companiesList.append(option);
    });
    els.companyImportStatus.textContent = state.companies.length
      ? `${state.companies.length} aziende disponibili per la ricerca.`
      : "Nessun CSV caricato.";
  }

  async function importCompanies(event) {
    const file = event.target.files[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text);
    const header = rows.shift()?.map((cell) => normalize(cell)) || [];
    const cuaaIndex = header.findIndex((cell) => cell.includes("cuaa"));
    const nameIndex = header.findIndex((cell) => cell.includes("denominazione") || cell.includes("azienda"));
    const provinceIndex = header.findIndex((cell) => cell.includes("provincia"));

    const companies = rows
      .map((row) => ({
        cuaa: (row[cuaaIndex] || row[0] || "").trim(),
        name: (row[nameIndex] || row[1] || "").trim(),
        province: (row[provinceIndex] || row[2] || "").trim().toUpperCase()
      }))
      .filter((company) => company.cuaa && company.name);

    state.companies = companies;
    save(storageKeys.companies, state.companies);
    syncSettingsToCloud();
    renderCompanies();
  }

  function fillCompanyFromSearch() {
    const value = normalize(els.companySearch.value);
    const match = state.companies.find((company) => {
      const combined = normalize(`${company.cuaa} ${company.name}`);
      return combined.includes(value) || value.includes(normalize(company.cuaa));
    });
    if (!match) return;
    els.cuaa.value = match.cuaa;
    els.companyName.value = match.name;
    els.province.value = match.province;
  }

  async function handlePhotoInput(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    if (!state.location) {
      await getLocation();
    }
    const capturedAt = new Date().toISOString();
    for (const file of files) {
      const dataUrl = await fileToDataUrl(file);
      state.photos.push({
        id: crypto.randomUUID(),
        file,
        dataUrl,
        originalName: file.name || "foto.jpg",
        type: file.type || "image/jpeg",
        capturedAt,
        location: state.location
      });
    }
    event.target.value = "";
    renderPhotos();
  }

  function renderPhotos() {
    els.photoPreview.innerHTML = "";
    state.photos.forEach((photo) => {
      const node = els.photoTemplate.content.firstElementChild.cloneNode(true);
      node.querySelector("img").src = photo.dataUrl;
      node.querySelector("img").alt = photo.originalName;
      node.querySelector("strong").textContent = photo.originalName;
      node.querySelector("small").textContent = photo.location
        ? `${photo.location.latitude.toFixed(6)}, ${photo.location.longitude.toFixed(6)}`
        : "Senza coordinate";
      node.querySelector("button").addEventListener("click", () => {
        state.photos = state.photos.filter((item) => item.id !== photo.id);
        renderPhotos();
      });
      els.photoPreview.append(node);
    });
  }

  async function getLocation() {
    if (!navigator.geolocation) {
      els.locationStatus.textContent = "Geolocalizzazione non disponibile su questo dispositivo.";
      return null;
    }
    els.locationStatus.textContent = "Rilevamento posizione in corso...";
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          state.location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            capturedAt: new Date().toISOString()
          };
          els.locationStatus.textContent = `Posizione rilevata: ${state.location.latitude.toFixed(6)}, ${state.location.longitude.toFixed(6)} (precisione ${Math.round(state.location.accuracy)} m).`;
          resolve(state.location);
        },
        () => {
          els.locationStatus.textContent = "Permesso posizione negato o posizione non disponibile.";
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  }

  async function chooseCloudDirectory() {
    try {
      state.cloudDirectory = await window.showDirectoryPicker({ mode: "readwrite" });
      els.cloudStatus.textContent = "Cartella cloud selezionata. Le prossime foto verranno salvate anche lì.";
    } catch {
      els.cloudStatus.textContent = "Scelta cartella annullata.";
    }
  }

  async function saveEntry(event) {
    event.preventDefault();
    const formData = new FormData(els.entryForm);
    const insertedAt = new Date().toISOString();
    const cuaa = els.cuaa.value.trim().toUpperCase();
    const entry = {
      id: crypto.randomUUID(),
      insertedAt,
      technician: els.technician.value,
      cuaa,
      companyName: els.companyName.value.trim(),
      province: els.province.value.trim().toUpperCase(),
      municipality: els.municipality.value.trim(),
      sheet: els.sheet.value.trim(),
      parcel: els.parcel.value.trim(),
      outcome: formData.get("outcome"),
      notes: els.notes.value.trim(),
      location: state.location,
      photos: state.photos.map((photo, index) => ({
        fileName: photoFileName(cuaa, index, photo.type),
        originalName: photo.originalName,
        type: photo.type,
        capturedAt: photo.capturedAt,
        location: photo.location
      }))
    };

    entry.photos = await uploadPhotosToSupabase(entry);
    state.entries.unshift(entry);
    save(storageKeys.entries, state.entries);
    await syncEntryToCloud(entry);
    await savePhotosToCloud(entry);
    renderEntries();
    resetForm();
    switchView("archive");
  }

  async function savePhotosToCloud(entry) {
    if (!state.cloudDirectory || !state.photos.length) return;
    const folderName = sanitizeFileName(entry.cuaa || "senza-cuaa");
    const entryFolder = await state.cloudDirectory.getDirectoryHandle(folderName, { create: true });

    for (let index = 0; index < state.photos.length; index += 1) {
      const photo = state.photos[index];
      const fileName = entry.photos[index].fileName;
      const handle = await entryFolder.getFileHandle(fileName, { create: true });
      const writable = await handle.createWritable();
      await writable.write(photo.file);
      await writable.close();
    }

    const metadataHandle = await entryFolder.getFileHandle(`${folderName}_metadati.json`, { create: true });
    const metadataWritable = await metadataHandle.createWritable();
    await metadataWritable.write(JSON.stringify(entry, null, 2));
    await metadataWritable.close();
  }

  function renderCloudConfig() {
    els.supabaseUrl.value = state.cloudConfig.url || "";
    els.supabaseKey.value = state.cloudConfig.key || "";
    els.supabaseBucket.value = state.cloudConfig.bucket || "vendemmia-foto";
    renderCloudStatus();
  }

  function renderCloudStatus(message) {
    if (message) {
      els.cloudSyncStatus.textContent = message;
      return;
    }
    els.cloudSyncStatus.textContent = state.supabase
      ? "Cloud collegato. Gli inserimenti verranno sincronizzati."
      : "Sincronizzazione cloud non configurata.";
  }

  async function saveCloudConfig(event) {
    event.preventDefault();
    state.cloudConfig = {
      url: normalizeSupabaseUrl(els.supabaseUrl.value),
      key: els.supabaseKey.value.trim(),
      bucket: els.supabaseBucket.value.trim() || "vendemmia-foto"
    };
    save(storageKeys.cloudConfig, state.cloudConfig);
    await initSupabase();
  }

  async function initSupabase() {
    if (!state.cloudConfig.url || !state.cloudConfig.key) {
      state.supabase = null;
      renderCloudStatus();
      return;
    }
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(state.cloudConfig.url)) {
      state.supabase = null;
      renderCloudStatus("Project URL non valido. Usa solo il formato https://xxxxx.supabase.co");
      return;
    }
    if (!window.supabase?.createClient) {
      renderCloudStatus("Libreria cloud non caricata. Controlla la connessione internet.");
      return;
    }
    state.supabase = window.supabase.createClient(state.cloudConfig.url, state.cloudConfig.key);
    renderCloudStatus("Cloud collegato. Sincronizzazione in corso...");
    await syncFromCloud();
  }

  async function syncFromCloud() {
    if (!state.supabase) {
      renderCloudStatus("Configura Supabase prima di sincronizzare.");
      return;
    }
    try {
      const { data: settingsData, error: settingsError } = await state.supabase.from("vv_settings").select("*");
      if (settingsError) throw settingsError;

      const technicians = settingsData.find((row) => row.id === "technicians")?.payload;
      const companies = settingsData.find((row) => row.id === "companies")?.payload;
      if (Array.isArray(technicians) && technicians.length) {
        state.technicians = technicians;
        save(storageKeys.technicians, state.technicians);
        renderTechnicians();
      }
      if (Array.isArray(companies)) {
        state.companies = companies;
        save(storageKeys.companies, state.companies);
        renderCompanies();
      }

      const { data, error } = await state.supabase
        .from("vv_entries")
        .select("*")
        .order("inserted_at", { ascending: false });
      if (error) throw error;

      const cloudEntries = data.map((row) => row.payload).filter(Boolean);
      const byId = new Map([...cloudEntries, ...state.entries].map((entry) => [entry.id, entry]));
      state.entries = Array.from(byId.values()).sort((a, b) => new Date(b.insertedAt) - new Date(a.insertedAt));
      save(storageKeys.entries, state.entries);
      renderEntries();
      await syncSettingsToCloud();
      renderCloudStatus(`Sincronizzato: ${state.entries.length} inserimenti disponibili.`);
    } catch (error) {
      renderCloudStatus(`Errore cloud: ${error.message}`);
    }
  }

  async function syncSettingsToCloud() {
    if (!state.supabase) return;
    await state.supabase.from("vv_settings").upsert([
      { id: "technicians", payload: state.technicians, updated_at: new Date().toISOString() },
      { id: "companies", payload: state.companies, updated_at: new Date().toISOString() }
    ]);
  }

  async function syncEntryToCloud(entry) {
    if (!state.supabase) return;
    const { error } = await state.supabase.from("vv_entries").upsert({
      id: entry.id,
      inserted_at: entry.insertedAt,
      payload: entry
    });
    if (error) renderCloudStatus(`Inserimento salvato solo sul dispositivo: ${error.message}`);
  }

  async function uploadPhotosToSupabase(entry) {
    if (!state.supabase || !state.photos.length) return entry.photos;
    const uploaded = [];
    for (let index = 0; index < state.photos.length; index += 1) {
      const photo = state.photos[index];
      const meta = entry.photos[index];
      const path = `${sanitizeFileName(entry.cuaa || "senza-cuaa")}/${meta.fileName}`;
      const { error } = await state.supabase.storage
        .from(state.cloudConfig.bucket)
        .upload(path, photo.file, { contentType: photo.type, upsert: true });
      uploaded.push({ ...meta, cloudPath: error ? "" : path, cloudError: error?.message || "" });
    }
    return uploaded;
  }

  function renderEntries() {
    els.entriesTable.innerHTML = "";
    els.archiveCount.textContent = state.entries.length === 1 ? "1 inserimento salvato" : `${state.entries.length} inserimenti salvati`;
    if (!state.entries.length) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="9">Nessun inserimento salvato.</td>`;
      els.entriesTable.append(row);
      return;
    }

    state.entries.forEach((entry) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${formatDate(entry.insertedAt)}</td>
        <td>${escapeHtml(entry.technician)}</td>
        <td>${escapeHtml(entry.cuaa)}</td>
        <td>${escapeHtml(entry.companyName)}</td>
        <td>${escapeHtml(entry.municipality)}</td>
        <td>${escapeHtml(entry.sheet)}</td>
        <td>${escapeHtml(entry.parcel)}</td>
        <td>${escapeHtml(entry.outcome)}</td>
        <td>${entry.photos.length}</td>
      `;
      els.entriesTable.append(row);
    });
  }

  function resetForm() {
    els.entryForm.reset();
    state.photos = [];
    state.location = null;
    els.locationStatus.textContent = "Posizione non ancora rilevata.";
    renderPhotos();
  }

  function exportCsv() {
    const headers = ["Data", "Tecnico", "CUAA", "Azienda", "Provincia", "Comune", "Foglio", "Particella", "Esito", "Latitudine", "Longitudine", "Foto", "Note"];
    const rows = state.entries.map((entry) => [
      formatDate(entry.insertedAt),
      entry.technician,
      entry.cuaa,
      entry.companyName,
      entry.province,
      entry.municipality,
      entry.sheet,
      entry.parcel,
      entry.outcome,
      entry.location?.latitude || "",
      entry.location?.longitude || "",
      entry.photos.map((photo) => photo.fileName).join(" | "),
      entry.notes
    ]);
    downloadFile("inserimenti.csv", [headers, ...rows].map(csvLine).join("\n"), "text/csv;charset=utf-8");
  }

  function exportJson() {
    downloadFile("inserimenti.json", JSON.stringify(state.entries, null, 2), "application/json");
  }

  function clearArchive() {
    if (!state.entries.length) return;
    const confirmed = window.confirm("Vuoi svuotare l'archivio salvato su questo dispositivo?");
    if (!confirmed) return;
    state.entries = [];
    save(storageKeys.entries, state.entries);
    renderEntries();
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (char === '"' && quoted && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if ((char === "," || char === ";") && !quoted) {
        row.push(cell);
        cell = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(cell);
        if (row.some((value) => value.trim())) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
    row.push(cell);
    if (row.some((value) => value.trim())) rows.push(row);
    return rows;
  }

  function load(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function normalizeSupabaseUrl(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "";
    try {
      const url = new URL(trimmed);
      return `${url.protocol}//${url.host}`.replace(/\/$/, "");
    } catch {
      return trimmed.replace(/\/+$/, "");
    }
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function photoFileName(cuaa, index, type) {
    const extension = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
    const suffix = String(index + 1).padStart(2, "0");
    return `${sanitizeFileName(cuaa || "senza-cuaa")}_${suffix}.${extension}`;
  }

  function sanitizeFileName(value) {
    return String(value).replace(/[^a-z0-9_-]/gi, "_").slice(0, 80);
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("it-IT", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(new Date(value));
  }

  function csvLine(values) {
    return values.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(";");
  }

  function downloadFile(name, content, type) {
    const blob = new Blob([content], { type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
