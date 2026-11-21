/**
 * YTBender Studio — Main Application Controller
 * Decluttered 3-Stage Creator Workflow, Storage Drawer, Deterministic Offline Engine & Sync
 */

(function () {
  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const DEFAULT_CODE_SWITCH_OPTIONS = [
    "Balanced Creator Mix (50% Native / 50% English Tech Terms)",
    "Storytelling Native-Heavy (75% Native / 25% English)",
    "Technical English-Heavy (25% Native / 75% English)",
    "100% Pure Selected Language"
  ];

  let appState = null;
  let isScriptDirty = false;
  let scriptRevisions = [];
  let teleprompterInterval = null;
  let teleprompterFontSizePx = 28;
  let activeFeedPreviewMode = "desktop";
  let compareCompetitorActive = false;
  let csvFilterMode = "all";
  let csvShowAllRows = false;
  let deferredInstallPrompt = null;

  let envStatus = {
    online: navigator.onLine,
    localServerActive: false,
    ollamaActive: false,
    ollamaModels: []
  };

  const STAGE_ROUTE_MAP = {
    "trends": "stage-1",
    "topics": "stage-1",
    "stage-1": "stage-1",
    "blueprint": "stage-2",
    "script": "stage-2",
    "stage-2": "stage-2",
    "sequence": "stage-3",
    "stage-3": "stage-3",
    "integrations": "drawer-storage",
    "drawer-storage": "drawer-storage"
  };

  function showToast(msg) {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3800);
  }

  function ensureSavedProjectsInitialized() {
    if (!Array.isArray(appState.savedProjects)) {
      appState.savedProjects = [];
    }
    if (appState.savedProjects.length === 0 && appState.currentBlueprint) {
      const seedId = appState.activeProjectId || "proj-" + Date.now();
      appState.activeProjectId = seedId;
      appState.savedProjects.push({
        id: seedId,
        title: appState.currentBlueprint.topicTitle || "Initial Studio Project",
        niche: appState.activeNiche || "Tech & AI Tools",
        format: appState.currentBlueprint.format || "Long-form (16:9)",
        updatedAt: new Date().toLocaleTimeString(),
        blueprint: JSON.parse(JSON.stringify(appState.currentBlueprint || {})),
        script: JSON.parse(JSON.stringify(appState.currentScript || {}))
      });
    }
    if (!appState.activeProjectId && appState.savedProjects.length > 0) {
      appState.activeProjectId = appState.savedProjects[0].id;
    }
  }

  function syncActiveProjectToVault() {
    ensureSavedProjectsInitialized();
    const proj = appState.savedProjects.find(p => p.id === appState.activeProjectId);
    if (proj && appState.currentBlueprint) {
      proj.title = appState.currentBlueprint.topicTitle || proj.title;
      proj.niche = appState.activeNiche;
      proj.format = appState.currentBlueprint.format || proj.format || "Long-form (16:9)";
      proj.updatedAt = new Date().toLocaleTimeString();
      proj.blueprint = JSON.parse(JSON.stringify(appState.currentBlueprint || {}));
      proj.script = JSON.parse(JSON.stringify(appState.currentScript || {}));
    }
  }

  const syncActiveProjectInVault = syncActiveProjectToVault;

  function extractHooksFallback(text, oldHooks) {
    if (window.StudioServices && typeof window.StudioServices.extractHooksFromAiText === "function") {
      return window.StudioServices.extractHooksFromAiText(text, oldHooks);
    }
    const raw = String(text || "");
    const found = [];
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^(?:[-*•]|\d+[.)]|Hook\s*(?:Option\s*)?#?\d+[:\-–—])\s*["“]?(.{18,220}?)["”]?$/i);
      if (m && m[1]) {
        const clean = m[1].replace(/^["“]|["”]$/g, "").trim();
        if (clean.length >= 18 && !found.includes(clean)) {
          found.push(clean);
        }
      }
      if (found.length >= 3) break;
    }
    if (found.length < 3) {
      const quoteMatches = raw.match(/"([^"\n]{20,200})"/g) || [];
      for (const q of quoteMatches) {
        const clean = q.replace(/^"|"$/g, "").trim();
        if (clean.length >= 20 && !found.includes(clean)) {
          found.push(clean);
        }
        if (found.length >= 3) break;
      }
    }
    const fallback = Array.isArray(oldHooks) && oldHooks.length > 0 ? oldHooks : [
      "Stop doing this the slow way — here is the exact outcome in 30 seconds.",
      "99% of creators miss this hidden setting that doubles retention.",
      "I tested every method for 30 days so you only need these 3 steps."
    ];
    return [
      found[0] || fallback[0],
      found[1] || fallback[1] || fallback[0],
      found[2] || fallback[2] || fallback[0]
    ];
  }

  async function initApp() {
    appState = await window.StudioServices.loadState();

    // Ensure default settings & properties exist
    if (!appState.settings) {
      appState.settings = {
        preferredAiProvider: "offline",
        ollamaUrl: "http://localhost:11434",
        ollamaModel: "llama3.2",
        openaiKey: "",
        geminiKey: "",
        claudeKey: "",
        youtubeApiKey: "",
        googleDriveToken: "",
        googleDriveFolderPath: "d:\\YT APP\\GoogleDrive_Sync",
        autoSyncLocalDrive: true
      };
    }

    ensureSavedProjectsInitialized();
    populateStaticSelects();
    bindNavigation();
    bindGlobalControls();
    bindModalsAndDrawers();
    renderAll();

    // Check environment status (Local Server, Ollama, Online/Offline)
    refreshEnvironmentStatus();
    window.addEventListener("online", refreshEnvironmentStatus);
    window.addEventListener("offline", refreshEnvironmentStatus);

    // Register Service Worker for offline PWA caching when served over http
    if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // PWA Install Prompt handling
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      const pwaInstallBtn = document.getElementById("pwaInstallBtn");
      if (pwaInstallBtn) pwaInstallBtn.style.display = "inline-flex";
      const tip = document.getElementById("pwaInstallTip");
      if (tip) {
        tip.innerHTML = "&#10024; <strong>Ready to Install:</strong> Click 'Install as Desktop App' above or use the browser address bar icon.";
      }
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      const pwaInstallBtn = document.getElementById("pwaInstallBtn");
      if (pwaInstallBtn) pwaInstallBtn.style.display = "none";
      showToast("🎉 YTBender installed successfully as a desktop app!");
    });
  }

  async function refreshEnvironmentStatus() {
    envStatus = await window.StudioServices.checkEnvironmentStatus(appState?.settings?.ollamaUrl);
    renderHeaderStatus();
    renderIntegrationsStatus();
  }

  function populateStaticSelects() {
    // 1. Niche Quick Chips
    const chipContainer = document.getElementById("nicheChipList");
    if (chipContainer && window.OfflineIntelligence?.NICHES) {
      chipContainer.innerHTML = "";
      Object.keys(window.OfflineIntelligence.NICHES).forEach(niche => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip" + (appState.activeNiche === niche ? " active" : "");
        btn.textContent = niche;
        btn.addEventListener("click", () => {
          confirmIfScriptDirty(() => selectNiche(niche));
        });
        chipContainer.appendChild(btn);
      });
    }

    // 2. Language Dropdowns
    const langSelects = ["globalLanguageSelect", "bpLanguageSelect"];
    langSelects.forEach(id => {
      const el = document.getElementById(id);
      if (!el || !window.OfflineIntelligence?.LANGUAGE_PROFILES) return;
      el.innerHTML = "";
      Object.keys(window.OfflineIntelligence.LANGUAGE_PROFILES).forEach(lang => {
        const opt = document.createElement("option");
        opt.value = lang;
        opt.textContent = lang;
        el.appendChild(opt);
      });
      el.value = appState.language;
    });

    // 3. Blueprint Parameter Dropdowns (+ MOAT-01 Code-Switching Mix)
    if (window.OfflineIntelligence) {
      fillSelectWithCustom("bpToneSelect", window.OfflineIntelligence.TONE_OPTIONS, appState.currentBlueprint?.tone);
      fillSelectWithCustom("bpPacingSelect", window.OfflineIntelligence.PACING_OPTIONS, appState.currentBlueprint?.pacing);
      fillSelectWithCustom("bpScriptStyleSelect", window.OfflineIntelligence.SCRIPT_STYLE_OPTIONS, appState.currentBlueprint?.scriptStyle);
      fillSelectWithCustom("bpVideoStyleSelect", window.OfflineIntelligence.VIDEO_STYLE_OPTIONS, appState.currentBlueprint?.videoStyle);
      fillSelectWithCustom(
        "bpCodeSwitchSelect",
        window.OfflineIntelligence.CODE_SWITCH_OPTIONS || DEFAULT_CODE_SWITCH_OPTIONS,
        appState.currentBlueprint?.codeSwitchMix || DEFAULT_CODE_SWITCH_OPTIONS[0]
      );
    }
  }

  function fillSelectWithCustom(selectId, optionsList, currentVal) {
    const el = document.getElementById(selectId);
    if (!el || !optionsList) return;
    el.innerHTML = "";
    const list = [...optionsList];
    if (currentVal && !list.includes(currentVal)) {
      list.unshift(currentVal);
    }
    list.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item;
      opt.textContent = item;
      el.appendChild(opt);
    });
    if (currentVal) el.value = currentVal;
  }

  function bindNavigation() {
    const navButtons = document.querySelectorAll(".nav-btn[data-tab]");
    navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-tab");
        switchTab(target);
      });
    });

    // Header active niche indicator click -> jump to Stage 1
    const headerNicheBtn = document.getElementById("headerActiveNiche");
    if (headerNicheBtn) {
      headerNicheBtn.addEventListener("click", () => {
        switchTab("stage-1");
        const customInput = document.getElementById("customNicheInput");
        if (customInput) customInput.focus();
      });
    }

    // 1-Click Device Viewport Switcher (Desktop / Tablet / Mobile)
    const vpButtons = document.querySelectorAll(".vp-btn[data-viewport]");
    function applyViewportMode(mode, notify) {
      document.body.classList.remove("viewport-desktop", "viewport-tablet", "viewport-mobile");
      const validMode = mode === "mobile" || mode === "tablet" ? mode : "desktop";
      if (validMode !== "desktop") {
        document.body.classList.add(`viewport-${validMode}`);
      }
      vpButtons.forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-viewport") === validMode);
      });
      try {
        localStorage.setItem("yt_studio_viewport_mode", validMode);
      } catch (_) {}
      if (notify) {
        const label =
          validMode === "mobile"
            ? "📱 Mobile View (390px)"
            : validMode === "tablet"
              ? "📟 Tablet View (820px)"
              : "💻 Full Desktop View";
        showToast(`Switched to ${label}`);
      }
    }

    vpButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-viewport");
        applyViewportMode(mode, true);
      });
    });

    try {
      const savedVp = localStorage.getItem("yt_studio_viewport_mode");
      if (savedVp && (savedVp === "mobile" || savedVp === "tablet")) {
        applyViewportMode(savedVp, false);
      }
    } catch (_) {}
  }

  function switchTab(target) {
    const mapped = STAGE_ROUTE_MAP[target] || target;

    // Route to Storage Drawer if integrations requested
    if (mapped === "drawer-storage") {
      openStorageDrawer();
      renderIntegrationsStatus();
      return;
    }

    // Toggle active state on stage navigation buttons
    document.querySelectorAll(".nav-btn[data-tab]").forEach(btn => {
      const btnTarget = btn.getAttribute("data-tab");
      const isMatch = btnTarget === target || STAGE_ROUTE_MAP[btnTarget] === mapped;
      btn.classList.toggle("active", isMatch);
    });

    // Toggle active state on stage panels
    document.querySelectorAll(".tab-panel, .stage-panel").forEach(panel => {
      const isMatch =
        panel.id === `tab-${mapped}` ||
        panel.id === `tab-${target}` ||
        panel.getAttribute("data-stage") === mapped ||
        panel.getAttribute("data-tab") === target;
      panel.classList.toggle("active", isMatch);
    });

    // Render corresponding stage views
    if (mapped === "stage-1") {
      renderTrendRadar();
      renderTopicsTab();
    }
    if (mapped === "stage-2") {
      renderBlueprintTab();
      renderScriptTab();
    }
    if (mapped === "stage-3") {
      renderSequenceTab();
    }
  }

  function openStorageDrawer() {
    const drawer = document.getElementById("storageSettingsDrawer");
    const backdrop = document.getElementById("drawerBackdrop");
    if (drawer) drawer.classList.add("open");
    if (backdrop) backdrop.classList.add("open");
    renderIntegrationsStatus();
  }

  function closeStorageDrawer() {
    const drawer = document.getElementById("storageSettingsDrawer");
    const backdrop = document.getElementById("drawerBackdrop");
    if (drawer) drawer.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
  }

  /**
   * Dirty-Flag Script Guard (SOL-13)
   * Prevents destructive overwriting of user-edited scripts
   */
  function confirmIfScriptDirty(actionCallback) {
    if (!isScriptDirty) {
      actionCallback();
      return;
    }
    showDirtyScriptModal(actionCallback);
  }

  function showDirtyScriptModal(actionCallback) {
    const modal = document.getElementById("dirtyScriptConfirmModal");
    if (!modal) {
      actionCallback();
      return;
    }
    modal.classList.add("open");

    const cancelBtn = document.getElementById("cancelDirtyOverwriteBtn");
    const backupBtn = document.getElementById("backupAndOverwriteBtn");
    const discardBtn = document.getElementById("discardAndOverwriteBtn");

    function cleanup() {
      modal.classList.remove("open");
      if (cancelBtn) cancelBtn.onclick = null;
      if (backupBtn) backupBtn.onclick = null;
      if (discardBtn) discardBtn.onclick = null;
    }

    if (cancelBtn) {
      cancelBtn.onclick = () => {
        cleanup();
        showToast("Kept your existing script edits.");
      };
    }

    if (backupBtn) {
      backupBtn.onclick = () => {
        if (appState.currentScript?.scriptBody) {
          scriptRevisions.unshift({
            topicTitle: appState.currentBlueprint?.topicTitle || "Untitled",
            body: appState.currentScript.scriptBody,
            savedAt: new Date().toISOString()
          });
          if (scriptRevisions.length > 5) scriptRevisions.pop();
        }
        isScriptDirty = false;
        cleanup();
        showToast("Backed up current script & updated with new topic!");
        actionCallback();
      };
    }

    if (discardBtn) {
      discardBtn.onclick = () => {
        isScriptDirty = false;
        cleanup();
        showToast("Discarded custom edits & generated fresh script.");
        actionCallback();
      };
    }
  }

  async function selectNiche(nicheName) {
    appState.activeNiche = nicheName;
    appState.topics = window.OfflineIntelligence.generateTopicsForNiche(
      nicheName,
      appState.language,
      appState.region,
      appState.formatFilter
    );

    if (appState.topics.length > 0) {
      appState.currentBlueprint = window.OfflineIntelligence.generateBlueprint(
        appState.topics[0],
        nicheName,
        appState.language
      );
      appState.currentScript = window.OfflineIntelligence.generateScript(appState.currentBlueprint);
      appState.uploadSequence = window.OfflineIntelligence.generateUploadSequence(nicheName, appState.topics);
      isScriptDirty = false;
    }

    await saveAndSyncQuietly();
    populateStaticSelects();
    renderAll();
    showToast(`Niche analyzed & updated: ${nicheName}`);
  }

  async function saveAndSyncQuietly() {
    syncActiveProjectToVault();
    appState.lastSavedAt = new Date().toISOString();
    await window.StudioServices.saveState(appState);
    if (appState.settings?.autoSyncLocalDrive && envStatus.localServerActive) {
      await window.StudioServices.syncToGoogleDrive(appState);
    }
  }

  function bindGlobalControls() {
    // 1. Channel Niche Controller
    const analyzeNicheBtn = document.getElementById("analyzeNicheBtn");
    if (analyzeNicheBtn) {
      analyzeNicheBtn.addEventListener("click", () => {
        const inputVal = document.getElementById("customNicheInput").value.trim();
        const langVal = document.getElementById("globalLanguageSelect").value;
        appState.language = langVal;
        const targetNiche = inputVal || appState.activeNiche;
        confirmIfScriptDirty(() => selectNiche(targetNiche));
      });
    }

    // MOAT-01: Creator Revenue & Sponsorship Rate Card Estimator Views Select
    const estViewsSelect = document.getElementById("estViewsSelect");
    if (estViewsSelect) {
      estViewsSelect.addEventListener("change", () => {
        renderMonetizationEstimator();
        renderPackagingSimulator();
      });
    }

    const regionSelectEl = document.getElementById("regionSelect");
    if (regionSelectEl) {
      regionSelectEl.addEventListener("change", (e) => {
        appState.region = e.target.value;
        renderMonetizationEstimator();
      });
    }

    // 2. Dedicated YouTube Keyword Search (SOL-05)
    const fetchYtTrendsBtn = document.getElementById("fetchYtTrendsBtn");
    if (fetchYtTrendsBtn) {
      fetchYtTrendsBtn.addEventListener("click", async () => {
        fetchYtTrendsBtn.disabled = true;
        fetchYtTrendsBtn.textContent = "Searching YouTube...";

        const keywordInput = document.getElementById("ytKeywordSearchInput");
        const regionSelect = document.getElementById("regionSelect");
        const query = (keywordInput && keywordInput.value.trim()) || appState.activeNiche;
        const region = regionSelect ? regionSelect.value : appState.region;

        appState.region = region;

        // Targeted search WITHOUT mutating appState.activeNiche (SOL-05)
        const res = await window.StudioServices.fetchYouTubeTrends(
          query,
          region,
          appState.settings.youtubeApiKey,
          appState.activeNiche
        );

        appState.liveYouTubeResults = res.items || [];
        appState.liveYouTubeSource = res.source;
        await saveAndSyncQuietly();
        renderTrendRadar();

        fetchYtTrendsBtn.disabled = false;
        fetchYtTrendsBtn.textContent = "🔍 Search YouTube Trends";
        showToast(`Loaded ${appState.liveYouTubeResults.length} trend signals for "${query}" via ${res.source}`);
      });
    }

    // 3. Import YouTube CSV / JSON
    const ytFileImportInput = document.getElementById("ytFileImportInput");
    if (ytFileImportInput) {
      ytFileImportInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        const rows = window.StudioServices.parseImportedYouTubeFile(file.name, text);
        appState.importedYouTubeRows = rows;
        await saveAndSyncQuietly();
        renderTrendRadar();
        showToast(`Imported ${rows.length} rows from ${file.name} (Offline Channel Autopsy Active)`);
      });
    }

    // 4. Topic Format Filter, Quick Shorts Mode & Refresh
    const quickShortsModeBtn = document.getElementById("quickShortsModeBtn");
    if (quickShortsModeBtn) {
      quickShortsModeBtn.addEventListener("click", () => {
        const isCurrentlyShorts = appState.formatFilter === "Short-form";
        appState.formatFilter = isCurrentlyShorts ? "All" : "Short-form";
        const filterEl = document.getElementById("topicFormatFilter");
        if (filterEl) filterEl.value = appState.formatFilter;

        appState.topics = window.OfflineIntelligence.generateTopicsForNiche(
          appState.activeNiche,
          appState.language,
          appState.region,
          appState.formatFilter
        );

        confirmIfScriptDirty(async () => {
          if (appState.topics.length > 0) {
            appState.currentBlueprint = window.OfflineIntelligence.generateBlueprint(
              appState.topics[0],
              appState.activeNiche,
              appState.language
            );
            appState.currentScript = window.OfflineIntelligence.generateScript(appState.currentBlueprint);
            isScriptDirty = false;
          }
          await saveAndSyncQuietly();
          renderAll();
          showToast(
            appState.formatFilter === "Short-form"
              ? "⚡ Switched to High-Velocity 45s Shorts Mode (9:16)!"
              : "Switched back to All Formats (Long-form + Shorts)"
          );
        });
      });
    }

    const applyDurationToBpBtn = document.getElementById("applyDurationToBpBtn");
    if (applyDurationToBpBtn) {
      applyDurationToBpBtn.addEventListener("click", async () => {
        const profile = window.OfflineIntelligence.getNicheProfile(appState.activeNiche);
        if (!appState.currentBlueprint) appState.currentBlueprint = {};
        const isShort = (appState.currentBlueprint.format || "").toLowerCase().includes("short");
        appState.currentBlueprint.targetDuration = isShort
          ? "45 Seconds (~115 Words)"
          : profile.sweetSpotDuration.split("|")[0].trim();
        await saveAndSyncQuietly();
        renderBlueprintTab();
        switchTab("stage-2");
        showToast(`Applied sweet-spot duration (${appState.currentBlueprint.targetDuration}) to Blueprint!`);
      });
    }

    const topicFormatFilter = document.getElementById("topicFormatFilter");
    if (topicFormatFilter) {
      topicFormatFilter.addEventListener("change", async (e) => {
        appState.formatFilter = e.target.value;
        appState.topics = window.OfflineIntelligence.generateTopicsForNiche(
          appState.activeNiche,
          appState.language,
          appState.region,
          appState.formatFilter
        );
        await saveAndSyncQuietly();
        renderTopicsTab();
      });
    }

    const regenerateTopicsBtn = document.getElementById("regenerateTopicsBtn");
    if (regenerateTopicsBtn) {
      regenerateTopicsBtn.addEventListener("click", async () => {
        appState.topics = window.OfflineIntelligence.generateTopicsForNiche(
          appState.activeNiche,
          appState.language,
          appState.region,
          appState.formatFilter
        );
        await saveAndSyncQuietly();
        renderTopicsTab();
        showToast("Generated fresh strategic topics for " + appState.activeNiche);
      });
    }

    // 5. Add Custom Topic
    const addCustomTopicBtn = document.getElementById("addCustomTopicBtn");
    if (addCustomTopicBtn) {
      addCustomTopicBtn.addEventListener("click", async () => {
        const titleEl = document.getElementById("newTopicTitleInput");
        const formatEl = document.getElementById("newTopicFormatSelect");
        const title = titleEl ? titleEl.value.trim() : "";
        if (!title) return showToast("Please enter a topic title first.");
        const newTopic = {
          title,
          angle: "Custom Creator Topic",
          format: formatEl ? formatEl.value : "Long-form (16:9)",
          searchScore: 92,
          viralScore: 94,
          competition: "Low",
          estViewsPotential: "50K - 250K",
          funnelRole: "Custom Pillar / Short",
          recommendedOrder: 1,
          whyItWorks: "Custom creator angle tailored to audience demand."
        };
        appState.topics.unshift(newTopic);
        if (titleEl) titleEl.value = "";
        await saveAndSyncQuietly();
        renderTopicsTab();
        showToast("Added custom topic to your list!");
      });
    }

    // MOAT-04: Multi-Video Project Vault Controls
    const projectVaultSelect = document.getElementById("projectVaultSelect");
    if (projectVaultSelect) {
      projectVaultSelect.addEventListener("change", (e) => {
        const selectedId = e.target.value;
        const proj = (appState.savedProjects || []).find(p => p.id === selectedId);
        if (!proj) return;
        confirmIfScriptDirty(async () => {
          appState.activeProjectId = proj.id;
          appState.currentBlueprint = JSON.parse(JSON.stringify(proj.blueprint || {}));
          appState.currentScript = JSON.parse(JSON.stringify(proj.script || {}));
          isScriptDirty = false;
          await saveAndSyncQuietly();
          populateStaticSelects();
          renderBlueprintTab();
          renderScriptTab();
          showToast(`Loaded project "${proj.title}" from Project Vault!`);
        });
      });
    }

    const saveToVaultBtn = document.getElementById("saveToVaultBtn");
    if (saveToVaultBtn) {
      saveToVaultBtn.addEventListener("click", async () => {
        readBlueprintFormIntoState();
        const editor = document.getElementById("scriptEditorTextarea");
        if (editor && appState.currentScript) {
          appState.currentScript.scriptBody = editor.value;
        }
        ensureSavedProjectsInitialized();
        const newId = "proj-" + Date.now();
        const title = appState.currentBlueprint?.topicTitle || `Project #${appState.savedProjects.length + 1}`;
        appState.savedProjects.unshift({
          id: newId,
          title,
          niche: appState.activeNiche,
          format: appState.currentBlueprint?.format || "Long-form (16:9)",
          updatedAt: new Date().toLocaleTimeString(),
          blueprint: JSON.parse(JSON.stringify(appState.currentBlueprint || {})),
          script: JSON.parse(JSON.stringify(appState.currentScript || {}))
        });
        appState.activeProjectId = newId;
        isScriptDirty = false;
        await saveAndSyncQuietly();
        renderProjectVaultBar();
        showToast(`Saved "${title}" as a new project in your Vault!`);
      });
    }

    const deleteVaultProjectBtn = document.getElementById("deleteVaultProjectBtn");
    if (deleteVaultProjectBtn) {
      deleteVaultProjectBtn.addEventListener("click", async () => {
        ensureSavedProjectsInitialized();
        if (appState.savedProjects.length <= 1) {
          showToast("Vault must keep at least 1 active video project.");
          return;
        }
        const removed = appState.savedProjects.find(p => p.id === appState.activeProjectId);
        appState.savedProjects = appState.savedProjects.filter(p => p.id !== appState.activeProjectId);
        const nextProj = appState.savedProjects[0];
        appState.activeProjectId = nextProj.id;
        appState.currentBlueprint = JSON.parse(JSON.stringify(nextProj.blueprint || {}));
        appState.currentScript = JSON.parse(JSON.stringify(nextProj.script || {}));
        isScriptDirty = false;
        await saveAndSyncQuietly();
        populateStaticSelects();
        renderBlueprintTab();
        renderScriptTab();
        showToast(`Removed "${removed ? removed.title : "project"}" from Project Vault.`);
      });
    }

    // 6. Blueprint Controls (Save & Generate)
    const saveBlueprintBtn = document.getElementById("saveBlueprintBtn");
    if (saveBlueprintBtn) {
      saveBlueprintBtn.addEventListener("click", async () => {
        readBlueprintFormIntoState();
        confirmIfScriptDirty(async () => {
          appState.currentScript = window.OfflineIntelligence.generateScript(appState.currentBlueprint);
          isScriptDirty = false;
          syncActiveProjectToVault();
          await saveAndSyncQuietly();
          renderBlueprintTab();
          renderScriptTab();
          showToast("Blueprint saved & Script updated!");
        });
      });
    }

    const bpOpenScriptBtn = document.getElementById("bpOpenScriptBtn");
    if (bpOpenScriptBtn) {
      bpOpenScriptBtn.addEventListener("click", async () => {
        readBlueprintFormIntoState();
        confirmIfScriptDirty(async () => {
          appState.currentScript = window.OfflineIntelligence.generateScript(appState.currentBlueprint);
          isScriptDirty = false;
          syncActiveProjectToVault();
          await saveAndSyncQuietly();
          renderBlueprintTab();
          renderScriptTab();
          switchTab("stage-2");
        });
      });
    }

    // MOAT-02 & LOOP-03: YouTube Feed & Thumbnail Packaging Simulator Live Inputs
    const bpTopicTitleInput = document.getElementById("bpTopicTitleInput");
    if (bpTopicTitleInput) {
      bpTopicTitleInput.addEventListener("input", () => {
        if (!appState.currentBlueprint) appState.currentBlueprint = {};
        appState.currentBlueprint.topicTitle = bpTopicTitleInput.value;
        renderPackagingSimulator();
      });
    }

    const bpThumbBadgeInput = document.getElementById("bpThumbBadgeInput");
    if (bpThumbBadgeInput) {
      bpThumbBadgeInput.addEventListener("input", () => {
        if (!appState.currentBlueprint) appState.currentBlueprint = {};
        appState.currentBlueprint.thumbBadgeText = bpThumbBadgeInput.value;
        renderPackagingSimulator();
      });
    }

    const bpThumbThemeSelect = document.getElementById("bpThumbThemeSelect");
    if (bpThumbThemeSelect) {
      bpThumbThemeSelect.addEventListener("change", () => {
        if (!appState.currentBlueprint) appState.currentBlueprint = {};
        appState.currentBlueprint.thumbTheme = bpThumbThemeSelect.value;
        renderPackagingSimulator();
      });
    }

    const bpThumbImageInput = document.getElementById("bpThumbImageInput");
    const clearThumbImageBtn = document.getElementById("clearThumbImageBtn");
    if (bpThumbImageInput) {
      bpThumbImageInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
          if (!appState.currentBlueprint) appState.currentBlueprint = {};
          appState.currentBlueprint.customThumbDataUrl = ev.target.result;
          if (clearThumbImageBtn) clearThumbImageBtn.style.display = "inline-flex";
          await saveAndSyncQuietly();
          renderPackagingSimulator();
          showToast("🖼️ Custom thumbnail image loaded into Feed Simulator!");
        };
        reader.readAsDataURL(file);
      });
    }

    if (clearThumbImageBtn) {
      clearThumbImageBtn.addEventListener("click", async () => {
        if (appState.currentBlueprint) {
          delete appState.currentBlueprint.customThumbDataUrl;
        }
        if (bpThumbImageInput) bpThumbImageInput.value = "";
        clearThumbImageBtn.style.display = "none";
        await saveAndSyncQuietly();
        renderPackagingSimulator();
        showToast("Cleared custom thumbnail image.");
      });
    }

    const compareCompetitorToggleBtn = document.getElementById("compareCompetitorToggleBtn");
    if (compareCompetitorToggleBtn) {
      compareCompetitorToggleBtn.addEventListener("click", () => {
        compareCompetitorActive = !compareCompetitorActive;
        compareCompetitorToggleBtn.classList.toggle("active", compareCompetitorActive);
        renderPackagingSimulator();
      });
    }

    document.querySelectorAll(".feed-preview-btn[data-feed-mode]").forEach(btn => {
      btn.addEventListener("click", () => {
        activeFeedPreviewMode = btn.getAttribute("data-feed-mode") || "desktop";
        document.querySelectorAll(".feed-preview-btn[data-feed-mode]").forEach(b => {
          b.classList.toggle("active", b.getAttribute("data-feed-mode") === activeFeedPreviewMode);
        });
        renderPackagingSimulator();
      });
    });

    // 7. Script Editor Input & Dirty Flag
    const scriptEditorTextarea = document.getElementById("scriptEditorTextarea");
    if (scriptEditorTextarea) {
      scriptEditorTextarea.addEventListener("input", (e) => {
        if (!appState.currentScript) appState.currentScript = {};
        appState.currentScript.scriptBody = e.target.value;
        isScriptDirty = true;
        updateScriptStats();
      });
    }

    // 8. Script Action Buttons (Save, Copy, Export, NLE Markers)
    const saveScriptBtn = document.getElementById("saveScriptBtn");
    if (saveScriptBtn) {
      saveScriptBtn.addEventListener("click", async () => {
        const editor = document.getElementById("scriptEditorTextarea");
        if (editor && appState.currentScript) {
          appState.currentScript.scriptBody = editor.value;
        }
        isScriptDirty = false;
        syncActiveProjectToVault();
        await saveAndSyncQuietly();
        renderProjectVaultBar();
        showToast("Script saved offline successfully!");
      });
    }

    const copyScriptBtn = document.getElementById("copyScriptBtn");
    if (copyScriptBtn) {
      copyScriptBtn.addEventListener("click", () => {
        const editor = document.getElementById("scriptEditorTextarea");
        const text = editor ? editor.value : "";
        if (!text) return showToast("Script is currently empty.");
        navigator.clipboard.writeText(text);
        showToast("Copied full script to clipboard!");
      });
    }

    const exportMarkdownBtn = document.getElementById("exportMarkdownBtn");
    if (exportMarkdownBtn) {
      exportMarkdownBtn.addEventListener("click", () => {
        const md = window.StudioServices.buildMarkdownExport(appState);
        downloadFile(`YT_Studio_${appState.activeNiche.replace(/\s+/g, "_")}.md`, md, "text/markdown");
        showToast("Downloaded Markdown script & blueprint!");
      });
    }

    const copyChaptersBtn = document.getElementById("copyChaptersBtn");
    if (copyChaptersBtn) {
      copyChaptersBtn.addEventListener("click", () => {
        const segs = appState.currentBlueprint?.pacingSegments || [];
        const lines = segs.map(s => {
          const start = (s.label.split("-")[0] || "0:00").trim();
          return `${start} - ${s.detail}`;
        });
        const text = lines.length > 0 ? lines.join("\n") : "0:00 Intro Hook\n0:35 Context & Setup\n2:30 Core System\n7:45 Live Proof";
        navigator.clipboard.writeText(text);
        showToast("Copied YouTube Chapter Timestamps to clipboard!");
      });
    }

    // MOAT-05: 1-Click Export DaVinci Resolve / Premiere Pro Timeline Markers (.CSV)
    const exportNleMarkersBtn = document.getElementById("exportNleMarkersBtn");
    if (exportNleMarkersBtn) {
      exportNleMarkersBtn.addEventListener("click", () => {
        const csv = window.StudioServices.buildTimelineMarkersCsv
          ? window.StudioServices.buildTimelineMarkersCsv(appState.currentBlueprint, appState.currentScript)
          : "Marker Name,Start TC,End TC,Color,Notes\r\n\"Cold Hook\",\"00:00:00:00\",\"00:00:15:00\",\"Red\",\"Show Final Proof\"";
        const cleanTopic = (appState.currentBlueprint?.topicTitle || appState.activeNiche || "Video")
          .replace(/[^a-z0-9]+/gi, "_")
          .replace(/^_|_$/g, "")
          .slice(0, 40);
        downloadFile(`Resolve_Premiere_Markers_${cleanTopic}.csv`, csv, "text/csv");
        showToast("🎬 Exported DaVinci Resolve / Premiere Pro Timeline Markers (.CSV)!");
      });
    }

    const restoreScriptRevisionBtn = document.getElementById("restoreScriptRevisionBtn");
    if (restoreScriptRevisionBtn) {
      restoreScriptRevisionBtn.addEventListener("click", async () => {
        if (scriptRevisions.length === 0) return;
        const lastRev = scriptRevisions.shift();
        if (!appState.currentScript) appState.currentScript = {};
        appState.currentScript.scriptBody = lastRev.body;
        isScriptDirty = true;
        await saveAndSyncQuietly();
        renderScriptTab();
        showToast(`Restored backed-up script ("${lastRev.topicTitle}")!`);
      });
    }

    // 9. AI Generation in Script Studio (with AUD-06 API Warning Toast)
    const generateAiScriptBtn = document.getElementById("generateAiScriptBtn");
    if (generateAiScriptBtn) {
      generateAiScriptBtn.addEventListener("click", async () => {
        const providerSelect = document.getElementById("scriptAiProviderSelect");
        if (providerSelect) {
          appState.settings.preferredAiProvider = providerSelect.value;
        }
        if (appState.settings.preferredAiProvider === "bridge") {
          openPromptBridgeModal();
          return;
        }
        readBlueprintFormIntoState();
        generateAiScriptBtn.disabled = true;
        generateAiScriptBtn.textContent = "Generating...";
        const res = await window.StudioServices.generateWithAI(
          "Full Script & 3 Hooks",
          {
            niche: appState.activeNiche,
            topic: appState.currentBlueprint?.topicTitle,
            language: appState.currentBlueprint?.language,
            blueprint: appState.currentBlueprint
          },
          appState.settings
        );
        if (!appState.currentScript) appState.currentScript = {};
        appState.currentScript.scriptBody = res.text;
        appState.currentScript.hooks = res.hooks || extractHooksFallback(res.text, appState.currentScript.hooks);
        isScriptDirty = true;
        await saveAndSyncQuietly();
        renderScriptTab();
        generateAiScriptBtn.disabled = false;
        generateAiScriptBtn.textContent = "✨ Polish with AI";
        if (res.apiWarning) {
          showToast("⚠️ " + res.apiWarning + " — Used Offline Engine fallback");
        } else {
          showToast(`Script & 3 Viral Hooks generated via ${res.providerUsed}`);
        }
      });
    }

    // 10. Sequence / Calendar Controls (LOOP-07: Preserve Kanban Statuses + .ICS Export)
    const rebuildSequenceBtn = document.getElementById("rebuildSequenceBtn");
    if (rebuildSequenceBtn) {
      rebuildSequenceBtn.addEventListener("click", async () => {
        const startDate = document.getElementById("sequenceStartDateInput")?.value;
        const prevStatusByStep = {};
        (appState.uploadSequence || []).forEach(item => {
          if (item && item.step != null && item.status) {
            prevStatusByStep[item.step] = item.status;
          }
        });
        appState.uploadSequence = window.OfflineIntelligence.generateUploadSequence(
          appState.activeNiche,
          appState.topics,
          startDate
        );
        (appState.uploadSequence || []).forEach(item => {
          if (item && prevStatusByStep[item.step]) {
            item.status = prevStatusByStep[item.step];
          }
        });
        await saveAndSyncQuietly();
        renderSequenceTab();
        showToast("Rebuilt 10-Day Upload Funnel Sequence (Kanban statuses preserved)!");
      });
    }

    const exportCsvCalendarBtn = document.getElementById("exportCsvCalendarBtn");
    if (exportCsvCalendarBtn) {
      exportCsvCalendarBtn.addEventListener("click", () => {
        const csv = window.StudioServices.buildCsvCalendar(appState.uploadSequence);
        downloadFile(`YT_Upload_Sequence_${appState.activeNiche.replace(/\s+/g, "_")}.csv`, csv, "text/csv");
        showToast("Downloaded Upload Sequence CSV Calendar!");
      });
    }

    const exportIcsCalendarBtn = document.getElementById("exportIcsCalendarBtn");
    if (exportIcsCalendarBtn) {
      exportIcsCalendarBtn.addEventListener("click", () => {
        const ics = window.StudioServices.buildIcsCalendar
          ? window.StudioServices.buildIcsCalendar(appState.uploadSequence, appState.activeNiche)
          : [
              "BEGIN:VCALENDAR",
              "VERSION:2.0",
              "PRODID:-//YTBender Studio//EN",
              ...(appState.uploadSequence || []).map((item, idx) => {
                const cleanDate = String(item.date || new Date().toISOString().split("T")[0]).replace(/-/g, "");
                return [
                  "BEGIN:VEVENT",
                  `UID:ytbender-step-${item.step || idx + 1}-${cleanDate}@ytbender.local`,
                  `DTSTART;VALUE=DATE:${cleanDate}`,
                  `SUMMARY:[YT ${item.format || "Upload"}] ${item.title || "Video"}`,
                  `DESCRIPTION:Role: ${item.role || ""} | Status: ${item.status || "Idea"} | Funnel Link: ${item.linkedTo || ""}`,
                  "END:VEVENT"
                ].join("\r\n");
              }),
              "END:VCALENDAR"
            ].join("\r\n");
        downloadFile(`YT_Upload_Schedule_${appState.activeNiche.replace(/\s+/g, "_")}.ics`, ics, "text/calendar");
        showToast("📅 Downloaded .ICS Calendar for Google, Apple & Outlook!");
      });
    }

    // 11. Header Quick Save & Sync
    const headerDriveSyncBtn = document.getElementById("headerDriveSyncBtn");
    if (headerDriveSyncBtn) {
      headerDriveSyncBtn.addEventListener("click", async () => {
        const report = await window.StudioServices.syncToGoogleDrive(appState);
        renderHeaderStatus();
        renderIntegrationsStatus();
        showToast(report.message);
      });
    }
  }

  function bindModalsAndDrawers() {
    // 1. Storage Drawer Toggle & Close
    const drawerToggleBtn = document.getElementById("drawerToggleBtn");
    const closeDrawerBtn = document.getElementById("closeStorageDrawerBtn");
    const backdrop = document.getElementById("drawerBackdrop");

    if (drawerToggleBtn) {
      drawerToggleBtn.addEventListener("click", () => openStorageDrawer());
    }
    if (closeDrawerBtn) {
      closeDrawerBtn.addEventListener("click", () => closeStorageDrawer());
    }
    if (backdrop) {
      backdrop.addEventListener("click", () => closeStorageDrawer());
    }

    // 2. Storage Drawer Actions
    const saveIntegrationsBtn = document.getElementById("saveIntegrationsBtn");
    if (saveIntegrationsBtn) {
      saveIntegrationsBtn.addEventListener("click", async () => {
        readIntegrationsFormIntoState();
        await window.StudioServices.saveState(appState);
        await refreshEnvironmentStatus();
        showToast("Saved storage & AI settings locally!");
      });
    }

    const syncLocalDriveNowBtn = document.getElementById("syncLocalDriveNowBtn");
    if (syncLocalDriveNowBtn) {
      syncLocalDriveNowBtn.addEventListener("click", async () => {
        readIntegrationsFormIntoState();
        const report = await window.StudioServices.syncToGoogleDrive(appState);
        renderIntegrationsStatus();
        showToast(report.message);
      });
    }

    // Open Local Sync Folder in Windows File Explorer or Copy Path (SOL-11)
    const openDriveFolderExplorerBtn = document.getElementById("openDriveFolderExplorerBtn");
    if (openDriveFolderExplorerBtn) {
      openDriveFolderExplorerBtn.addEventListener("click", async () => {
        const path = document.getElementById("intDriveFolderInput")?.value || "d:\\YT APP\\GoogleDrive_Sync";
        const res = await window.StudioServices.openLocalSyncFolder(path);
        if (res.opened) {
          showToast(`📂 Opened "${path}" in Windows File Explorer!`);
        } else {
          showToast(`📋 Copied path "${path}" to clipboard (Start server for direct Explorer launch).`);
        }
      });
    }

    // Copy Folder Path to Clipboard (SOL-11)
    const copyDriveFolderPathBtn = document.getElementById("copyDriveFolderPathBtn");
    if (copyDriveFolderPathBtn) {
      copyDriveFolderPathBtn.addEventListener("click", () => {
        const path = document.getElementById("intDriveFolderInput")?.value || "d:\\YT APP\\GoogleDrive_Sync";
        navigator.clipboard.writeText(path);
        showToast(`Copied folder path: "${path}"! Paste into Windows File Explorer.`);
      });
    }

    const pickBrowserDriveFolderBtn = document.getElementById("pickBrowserDriveFolderBtn");
    if (pickBrowserDriveFolderBtn) {
      pickBrowserDriveFolderBtn.addEventListener("click", async () => {
        const report = await window.StudioServices.syncToGoogleDrive(appState, { pickDirectory: true });
        renderIntegrationsStatus();
        showToast(report.message);
      });
    }

    const downloadMarkdownBundleBtn = document.getElementById("downloadMarkdownBundleBtn");
    if (downloadMarkdownBundleBtn) {
      downloadMarkdownBundleBtn.addEventListener("click", () => {
        const md = window.StudioServices.buildMarkdownExport(appState);
        downloadFile(`YT_Studio_${appState.activeNiche.replace(/\s+/g, "_")}.md`, md, "text/markdown");
        showToast("Downloaded Markdown Blueprint & Script!");
      });
    }

    // AUD-01: Safe Manual JSON Backup Export (Redacts API keys before export)
    const downloadJsonBackupBtn = document.getElementById("downloadJsonBackupBtn");
    if (downloadJsonBackupBtn) {
      downloadJsonBackupBtn.addEventListener("click", () => {
        const safeState = window.StudioServices.sanitizeStateForExport
          ? window.StudioServices.sanitizeStateForExport(appState)
          : appState;
        const json = JSON.stringify(safeState, null, 2);
        downloadFile("YT_Studio_Full_Backup.json", json, "application/json");
        showToast("Downloaded Safe Offline JSON Backup (API Keys Redacted)!");
      });
    }

    const restoreJsonInput = document.getElementById("restoreJsonInput");
    if (restoreJsonInput) {
      restoreJsonInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          if (parsed && parsed.activeNiche) {
            appState = parsed;
            ensureSavedProjectsInitialized();
            isScriptDirty = false;
            await saveAndSyncQuietly();
            populateStaticSelects();
            renderAll();
            showToast("Restored full studio workspace from backup!");
          }
        } catch (_) {
          showToast("Invalid JSON backup file.");
        }
      });
    }

    // App Installation & Desktop Shortcut Handlers
    async function triggerPwaInstallPrompt() {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice && choice.outcome === "accepted") {
          const pwaInstallBtn = document.getElementById("pwaInstallBtn");
          if (pwaInstallBtn) pwaInstallBtn.style.display = "none";
          showToast("Installing YTBender Desktop App...");
        }
        deferredInstallPrompt = null;
      } else {
        showToast("💡 To install: Click the 'Install' icon in your browser address bar (top right) or use 'Create Desktop Shortcut'!");
      }
    }

    const pwaInstallBtn = document.getElementById("pwaInstallBtn");
    if (pwaInstallBtn) {
      pwaInstallBtn.addEventListener("click", triggerPwaInstallPrompt);
    }

    const drawerPwaInstallBtn = document.getElementById("drawerPwaInstallBtn");
    if (drawerPwaInstallBtn) {
      drawerPwaInstallBtn.addEventListener("click", triggerPwaInstallPrompt);
    }

    const createDesktopShortcutBtn = document.getElementById("createDesktopShortcutBtn");
    if (createDesktopShortcutBtn) {
      createDesktopShortcutBtn.addEventListener("click", async () => {
        try {
          const res = await fetch("/api/system/create-shortcut", { method: "POST" });
          const data = await res.json();
          if (data && data.success) {
            showToast("🖥️ Desktop shortcut created successfully with official YTBender icon!");
          } else {
            showToast("💡 Run 'Install-Desktop-Shortcut.bat' in d:\\YT APP to generate shortcut.");
          }
        } catch (_) {
          showToast("💡 Run 'Install-Desktop-Shortcut.bat' in d:\\YT APP to generate shortcut.");
        }
      });
    }

    // 3. Collapsible Advanced Settings Accordion
    const advToggleBtn = document.getElementById("advancedSettingsToggleBtn");
    const advCollapsible = document.getElementById("advancedSettingsCollapsible");
    const advArrow = document.getElementById("advancedSettingsArrow");
    if (advToggleBtn && advCollapsible) {
      advToggleBtn.addEventListener("click", () => {
        advCollapsible.classList.toggle("open");
        if (advArrow) {
          advArrow.innerHTML = advCollapsible.classList.contains("open") ? "&#9652;" : "&#9662;";
        }
      });
    }

    // AUD-07: Collapsible Admin Diagnostics & Server Logs Accordion
    const adminLogsToggleBtn = document.getElementById("adminLogsToggleBtn");
    const adminLogsCollapsible = document.getElementById("adminLogsCollapsible");
    const adminLogsArrow = document.getElementById("adminLogsArrow");
    if (adminLogsToggleBtn && adminLogsCollapsible) {
      adminLogsToggleBtn.addEventListener("click", () => {
        adminLogsCollapsible.classList.toggle("open");
        if (adminLogsArrow) {
          adminLogsArrow.innerHTML = adminLogsCollapsible.classList.contains("open") ? "&#9652;" : "&#9662;";
        }
        if (adminLogsCollapsible.classList.contains("open")) {
          loadAndRenderAdminLogs();
        }
      });
    }

    const refreshAdminLogsBtn = document.getElementById("refreshAdminLogsBtn");
    if (refreshAdminLogsBtn) {
      refreshAdminLogsBtn.addEventListener("click", () => {
        loadAndRenderAdminLogs(true);
      });
    }

    // 4. Prompt Bridge Modal
    const openPromptBridgeBtn = document.getElementById("openPromptBridgeBtn");
    if (openPromptBridgeBtn) {
      openPromptBridgeBtn.addEventListener("click", () => openPromptBridgeModal());
    }

    const closeBridgeModalBtn = document.getElementById("closeBridgeModalBtn");
    if (closeBridgeModalBtn) {
      closeBridgeModalBtn.addEventListener("click", () => {
        document.getElementById("promptBridgeModal")?.classList.remove("open");
      });
    }

    const copyBridgePromptBtn = document.getElementById("copyBridgePromptBtn");
    if (copyBridgePromptBtn) {
      copyBridgePromptBtn.addEventListener("click", () => {
        const promptEl = document.getElementById("bridgeGeneratedPrompt");
        if (promptEl) {
          navigator.clipboard.writeText(promptEl.value);
          showToast("Copied structured prompt! Paste into ChatGPT, Gemini, or Claude.");
        }
      });
    }

    const applyBridgeResponseBtn = document.getElementById("applyBridgeResponseBtn");
    if (applyBridgeResponseBtn) {
      applyBridgeResponseBtn.addEventListener("click", async () => {
        const pasted = document.getElementById("bridgePastedResponse")?.value.trim();
        if (!pasted) return showToast("Paste the AI response first.");
        if (!appState.currentScript) appState.currentScript = {};
        appState.currentScript.scriptBody = pasted;
        appState.currentScript.hooks = extractHooksFallback(pasted, appState.currentScript.hooks);
        isScriptDirty = true;
        await saveAndSyncQuietly();
        renderScriptTab();
        document.getElementById("promptBridgeModal")?.classList.remove("open");
        showToast("Applied AI response & updated Viral Hooks in Script Studio!");
      });
    }

    // 5. Teleprompter Controls (SOL-15 & LOOP-06)
    const scriptModeWriterBtn = document.getElementById("scriptModeWriterBtn");
    const scriptModeTeleprompterBtn = document.getElementById("scriptModeTeleprompterBtn");
    const teleprompterView = document.getElementById("teleprompterView");
    const closeTeleprompterBtn = document.getElementById("closeTeleprompterBtn");
    const teleprompterPlayPauseBtn = document.getElementById("teleprompterPlayPauseBtn");
    const teleprompterSpeedSlider = document.getElementById("teleprompterSpeedSlider");
    const teleprompterMirrorBtn = document.getElementById("teleprompterMirrorBtn");
    const teleprompterFontDownBtn = document.getElementById("teleprompterFontDownBtn");
    const teleprompterFontUpBtn = document.getElementById("teleprompterFontUpBtn");

    if (scriptModeWriterBtn) {
      scriptModeWriterBtn.addEventListener("click", () => {
        if (teleprompterView) teleprompterView.classList.remove("open");
        const editor = document.getElementById("scriptEditorTextarea");
        if (editor) editor.focus();
      });
    }

    if (scriptModeTeleprompterBtn) {
      scriptModeTeleprompterBtn.addEventListener("click", () => {
        openTeleprompter();
      });
    }

    if (closeTeleprompterBtn) {
      closeTeleprompterBtn.addEventListener("click", () => {
        closeTeleprompter();
      });
    }

    if (teleprompterPlayPauseBtn) {
      teleprompterPlayPauseBtn.addEventListener("click", () => {
        toggleTeleprompterScroll();
      });
    }

    if (teleprompterSpeedSlider) {
      teleprompterSpeedSlider.addEventListener("input", () => {
        if (teleprompterInterval) {
          stopTeleprompterScroll();
          startTeleprompterScroll();
        }
      });
    }

    if (teleprompterMirrorBtn) {
      teleprompterMirrorBtn.addEventListener("click", () => {
        const textContainer = document.getElementById("teleprompterTextContainer");
        if (!textContainer) return;
        const isMirrored = textContainer.classList.toggle("mirrored");
        teleprompterMirrorBtn.classList.toggle("active", isMirrored);
        showToast(isMirrored ? "🪞 Teleprompter Mirror Flip ON (Beam-Splitter Glass)" : "🪞 Teleprompter Mirror Flip OFF");
      });
    }

    if (teleprompterFontDownBtn) {
      teleprompterFontDownBtn.addEventListener("click", () => {
        teleprompterFontSizePx = Math.max(18, teleprompterFontSizePx - 2);
        const textContainer = document.getElementById("teleprompterTextContainer");
        if (textContainer) textContainer.style.fontSize = `${teleprompterFontSizePx}px`;
      });
    }

    if (teleprompterFontUpBtn) {
      teleprompterFontUpBtn.addEventListener("click", () => {
        teleprompterFontSizePx = Math.min(48, teleprompterFontSizePx + 2);
        const textContainer = document.getElementById("teleprompterTextContainer");
        if (textContainer) textContainer.style.fontSize = `${teleprompterFontSizePx}px`;
      });
    }
  }

  async function loadAndRenderAdminLogs(notify) {
    const outEl = document.getElementById("adminLogsOutput");
    if (!outEl) return;
    outEl.textContent = "Loading server diagnostics & logs...";
    const data = window.StudioServices.fetchAdminLogs
      ? await window.StudioServices.fetchAdminLogs()
      : { ok: true, mode: "Offline Sandbox Mode", entries: [] };

    const headerLines = [
      `=== YTBENDER STUDIO SECURITY & SERVER DIAGNOSTICS ===`,
      `Mode           : ${data.mode || (envStatus.localServerActive ? "Local PowerShell Server (127.0.0.1:8080)" : "Offline Browser Mode")}`,
      `CORS Policy    : Locked to http://localhost:8080 & http://127.0.0.1:8080`,
      `Credential Guard: Active (API Keys & OAuth Tokens Redacted on Export/Disk)`,
      `Uptime         : ${data.uptimeSeconds != null ? data.uptimeSeconds + "s" : "N/A"} | Requests Served: ${data.requestsServed != null ? data.requestsServed : "N/A"}`,
      `-------------------------------------------------------`
    ];

    const logEntries = (data.entries || data.logs || []).map(entry => {
      if (typeof entry === "string") return entry;
      return `[${entry.timestamp || new Date().toISOString()}] [${entry.level || "INFO"}] ${entry.event || "LOG"}: ${entry.detail || ""}`;
    });

    outEl.textContent = [...headerLines, ...(logEntries.length ? logEntries : ["No recent server.log entries recorded."])].join("\n");
    if (notify) {
      showToast("🛡️ Refreshed Server Diagnostics & Security Logs!");
    }
  }

  function openTeleprompter() {
    const teleprompterView = document.getElementById("teleprompterView");
    const teleprompterTextContainer = document.getElementById("teleprompterTextContainer");
    const teleprompterTitle = document.getElementById("teleprompterTitle");
    const editor = document.getElementById("scriptEditorTextarea");

    if (!teleprompterView || !teleprompterTextContainer) return;

    if (teleprompterTitle) {
      teleprompterTitle.textContent = appState.currentBlueprint?.topicTitle || "Teleprompter Mode";
    }

    // Clean spoken text: strip bracketed tags [VISUAL: ...] and [AUDIO: ...] for seamless reading (SOL-15)
    const rawText = (editor ? editor.value : "") || appState.currentScript?.scriptBody || "";
    const cleanSpokenText = rawText
      .replace(new RegExp('\\[VISUAL:[^\\]]*\\]', 'gi'), '')
      .replace(new RegExp('\\[AUDIO:[^\\]]*\\]', 'gi'), '')
      .replace(new RegExp('\\[EDITING NOTE:[^\\]]*\\]', 'gi'), '')
      .replace(new RegExp('\\[TIMECODE:[^\\]]*\\]', 'gi'), '')
      .replace(new RegExp('\\[\\d+:\\d+[^\\]]*\\]', 'gi'), '')
      .replace(new RegExp('\\n{3,}', 'g'), '\n\n')
      .trim();

    teleprompterTextContainer.innerHTML = cleanSpokenText
      .split("\n\n")
      .map(p => `<p style="margin-bottom: 24px;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
      .join("");

    teleprompterView.classList.add("open");
  }

  function closeTeleprompter() {
    const teleprompterView = document.getElementById("teleprompterView");
    if (teleprompterView) teleprompterView.classList.remove("open");
    stopTeleprompterScroll();
  }

  function toggleTeleprompterScroll() {
    if (teleprompterInterval) {
      stopTeleprompterScroll();
    } else {
      startTeleprompterScroll();
    }
  }

  function startTeleprompterScroll() {
    const box = document.getElementById("teleprompterScrollBox");
    const slider = document.getElementById("teleprompterSpeedSlider");
    const btn = document.getElementById("teleprompterPlayPauseBtn");
    if (!box) return;

    const speed = slider ? parseInt(slider.value, 10) : 3;
    const step = Math.max(1, Math.floor(speed * 0.8));

    if (btn) btn.innerHTML = "&#10074;&#10074; Pause Auto-Scroll";

    teleprompterInterval = setInterval(() => {
      box.scrollTop += step;
      if (box.scrollTop + box.clientHeight >= box.scrollHeight - 10) {
        stopTeleprompterScroll();
      }
    }, 40);
  }

  function stopTeleprompterScroll() {
    if (teleprompterInterval) {
      clearInterval(teleprompterInterval);
      teleprompterInterval = null;
    }
    const btn = document.getElementById("teleprompterPlayPauseBtn");
    if (btn) btn.innerHTML = "&#9654; Start Auto-Scroll";
  }

  function readBlueprintFormIntoState() {
    if (!appState.currentBlueprint) appState.currentBlueprint = {};
    const bp = appState.currentBlueprint;
    bp.topicTitle = document.getElementById("bpTopicTitleInput").value.trim() || bp.topicTitle;
    bp.format = document.getElementById("bpFormatSelect").value;
    bp.language = document.getElementById("bpLanguageSelect").value;
    bp.tone = document.getElementById("bpToneSelect").value;
    bp.pacing = document.getElementById("bpPacingSelect").value;
    bp.scriptStyle = document.getElementById("bpScriptStyleSelect").value;
    bp.videoStyle = document.getElementById("bpVideoStyleSelect").value;
    bp.uploadSequenceNote = document.getElementById("bpSequenceNoteInput").value;
    const codeSwitchEl = document.getElementById("bpCodeSwitchSelect");
    if (codeSwitchEl) {
      bp.codeSwitchMix = codeSwitchEl.value;
    }
    const badgeEl = document.getElementById("bpThumbBadgeInput");
    if (badgeEl) {
      bp.thumbBadgeText = badgeEl.value.trim() || "99% MISS THIS";
    }
    const themeEl = document.getElementById("bpThumbThemeSelect");
    if (themeEl) {
      bp.thumbTheme = themeEl.value;
    }
    appState.language = bp.language;
  }

  function readIntegrationsFormIntoState() {
    if (!appState.settings) appState.settings = {};
    const s = appState.settings;
    s.preferredAiProvider = document.getElementById("intPreferredAiSelect").value;
    s.ollamaUrl = document.getElementById("intOllamaUrlInput").value.trim() || "http://localhost:11434";
    s.ollamaModel = document.getElementById("intOllamaModelInput").value.trim() || "llama3.2";
    s.openaiKey = document.getElementById("intOpenaiKeyInput").value.trim();
    s.geminiKey = document.getElementById("intGeminiKeyInput").value.trim();
    s.claudeKey = document.getElementById("intClaudeKeyInput").value.trim();
    s.youtubeApiKey = document.getElementById("intYoutubeKeyInput").value.trim();
    s.googleDriveFolderPath = document.getElementById("intDriveFolderInput").value.trim() || "d:\\YT APP\\GoogleDrive_Sync";
    s.googleDriveToken = document.getElementById("intDriveTokenInput").value.trim();
  }

  function openPromptBridgeModal() {
    const prompt = window.StudioServices.buildStructuredPrompt("Full Script & Viral Hooks", {
      niche: appState.activeNiche,
      topic: appState.currentBlueprint?.topicTitle,
      language: appState.currentBlueprint?.language,
      blueprint: appState.currentBlueprint
    });
    const promptEl = document.getElementById("bridgeGeneratedPrompt");
    const pasteEl = document.getElementById("bridgePastedResponse");
    const modal = document.getElementById("promptBridgeModal");
    if (promptEl) promptEl.value = prompt;
    if (pasteEl) pasteEl.value = "";
    if (modal) modal.classList.add("open");
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function renderAll() {
    renderHeaderStatus();
    renderTrendRadar();
    renderTopicsTab();
    renderBlueprintTab();
    renderScriptTab();
    renderSequenceTab();
    renderIntegrationsStatus();
  }

  function renderHeaderStatus() {
    const netDot = document.getElementById("netStatusDot");
    const netText = document.getElementById("netStatusText");
    const aiText = document.getElementById("aiStatusText");
    const nicheLabel = document.getElementById("headerNicheLabel");

    if (nicheLabel) {
      nicheLabel.textContent = appState.activeNiche;
    }

    if (netDot && netText) {
      if (navigator.onLine) {
        netDot.className = "status-dot online";
        netText.textContent = "Offline-First Ready";
      } else {
        netDot.className = "status-dot offline";
        netText.textContent = "100% Offline Mode Active";
      }
    }

    if (aiText) {
      aiText.textContent = "Offline Ready";
    }

    const navTopicBadge = document.getElementById("navTopicBadge");
    if (navTopicBadge) navTopicBadge.textContent = (appState.topics || []).length;

    const navSeqBadge = document.getElementById("navSeqBadge");
    if (navSeqBadge) navSeqBadge.textContent = (appState.uploadSequence || []).length;
  }

  function renderMonetizationEstimator() {
    const viewsSelect = document.getElementById("estViewsSelect");
    const views = viewsSelect ? parseInt(viewsSelect.value, 10) || 50000 : 50000;
    const est = window.OfflineIntelligence.calculateMonetizationEstimate
      ? window.OfflineIntelligence.calculateMonetizationEstimate(appState.activeNiche, appState.region, views)
      : {
          estimatedAdSenseUsd: "$425 – $900",
          estimatedAdSenseInr: "₹35,700 – ₹75,600",
          effectiveRpmUsd: "$2.00 – $4.50",
          sponsorshipMidRollUsd: "$750 – $1,350",
          sponsorshipDedicatedUsd: "$1,600 – $2,800"
        };

    const adsenseEl = document.getElementById("estAdsenseDisplay");
    const rpmSubEl = document.getElementById("estRpmSub");
    const midRollEl = document.getElementById("estMidRollDisplay");
    const dedicatedEl = document.getElementById("estDedicatedDisplay");

    if (adsenseEl) {
      adsenseEl.textContent = `${est.estimatedAdSenseUsd} (${est.estimatedAdSenseInr})`;
    }
    if (rpmSubEl) {
      rpmSubEl.textContent = `Effective RPM (${appState.region}): ${est.effectiveRpmUsd}`;
    }
    if (midRollEl) {
      midRollEl.textContent = est.sponsorshipMidRollUsd;
    }
    if (dedicatedEl) {
      dedicatedEl.textContent = est.sponsorshipDedicatedUsd;
    }
  }

  function renderTrendRadar() {
    const profile = window.OfflineIntelligence.getNicheProfile(appState.activeNiche);
    document.getElementById("customNicheInput").value = appState.activeNiche;
    document.getElementById("regionSelect").value = appState.region;
    document.getElementById("globalLanguageSelect").value = appState.language;

    document.getElementById("statVelocity").textContent = `${profile.velocity} / 100`;
    document.getElementById("statRpm").textContent = profile.avgRpm;
    document.getElementById("statFormatMix").textContent = profile.bestFormatMix;
    document.getElementById("statDuration").textContent = profile.sweetSpotDuration;

    // AUD-03: Honest Benchmark vs. Live Telemetry Badge
    const kpiBadge = document.getElementById("kpiDataSourceBadge");
    const hasLiveTelemetry =
      Array.isArray(appState.liveYouTubeResults) &&
      appState.liveYouTubeResults.length > 0 &&
      appState.liveYouTubeResults.some(r => r.isLive);
    if (kpiBadge) {
      if (hasLiveTelemetry) {
        kpiBadge.className = "badge badge-short";
        kpiBadge.textContent = "🔴 Live YouTube Telemetry";
      } else {
        kpiBadge.className = "badge badge-score-high";
        kpiBadge.textContent = "⚡ Offline Benchmark Estimate";
      }
    }

    // MOAT-01: Render Creator Revenue & Sponsorship Estimator
    renderMonetizationEstimator();

    // Trending Keywords (XSS-hardened)
    const kwList = document.getElementById("trendingKeywordsList");
    if (kwList && profile.trendingKeywords) {
      kwList.innerHTML = profile.trendingKeywords
        .map(kw => `<span class="badge badge-lang">${escapeHtml(kw)}</span>`)
        .join(" ");
    }

    // Winning Content Angles (XSS-hardened)
    const anglesList = document.getElementById("winningAnglesList");
    if (anglesList && profile.topAngles) {
      anglesList.innerHTML = profile.topAngles
        .map(
          (a, i) => `
          <div style="padding: 9px 12px; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: 8px; margin-bottom: 7px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <div style="font-size:12.5px;">
              <strong style="color:var(--accent-cyan);">#${i + 1}</strong> ${escapeHtml(a)}
            </div>
            <span class="badge badge-score-high">High Retention</span>
          </div>`
        )
        .join("");
    }

    // YouTube Trend Signals Table (SOL-06 + AUD-05 XSS-hardened)
    const signalsBody = document.getElementById("ytSignalsTableBody");
    const signalsSourceLabel = document.getElementById("ytSignalsSourceLabel");
    const items =
      appState.liveYouTubeResults && appState.liveYouTubeResults.length > 0
        ? appState.liveYouTubeResults
        : profile.topAngles.map((a, i) => {
            const title = `${a} — ${appState.activeNiche}`;
            return {
              title,
              channel: `Top ${profile.category} Benchmark #${i + 1}`,
              isLive: false,
              watchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`,
              format: i % 2 === 0 ? "Long-form (16:9)" : "Short-form (9:16)",
              signal: `⚡ Benchmark • Velocity ${profile.velocity - i * 2}/100`
            };
          });

    if (signalsSourceLabel) {
      signalsSourceLabel.textContent = appState.liveYouTubeSource || "⚡ Proven Offline Benchmark DB";
    }

    if (signalsBody) {
      signalsBody.innerHTML = items
        .map((row, idx) => {
          const isLive = Boolean(row.isLive);
          const sourceBadge = isLive
            ? `<span class="badge badge-short">${escapeHtml(row.signal || "🔴 Live YouTube")}</span>`
            : `<span class="badge badge-score-high">${escapeHtml(row.signal || "⚡ Offline Benchmark")}</span>`;
          const viewsMeta = row.viewsText ? ` &bull; <span>${escapeHtml(row.viewsText)}</span>` : "";
          const pubMeta = row.publishedAt ? ` &bull; <span>${escapeHtml(row.publishedAt)}</span>` : "";
          const rawWatch = row.watchUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(row.title || "")}`;
          const safeWatchHref = /^https?:\/\//i.test(rawWatch) ? escapeHtml(rawWatch) : "#";
          return `
        <tr>
          <td>
            <div style="font-weight:700; font-size:13px; margin-bottom:3px;">${escapeHtml(row.title)}</div>
            <div style="font-size:11.5px; color:var(--text-secondary); display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span>${escapeHtml(row.channel || "Benchmark")}${viewsMeta}${pubMeta}</span>
              <a href="${safeWatchHref}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-cyan); text-decoration:none; font-weight:600;">
                Watch / Verify on YouTube &#8599;
              </a>
            </div>
          </td>
          <td><span class="badge ${(row.format || "").toLowerCase().includes("short") ? "badge-short" : "badge-long"}">${escapeHtml(row.format || "Long-form")}</span></td>
          <td>${sourceBadge}</td>
          <td>
            <button class="btn btn-secondary btn-sm" data-signal-idx="${idx}" style="padding:4px 9px; font-size:11.5px;">
              Write Script &rarr;
            </button>
          </td>
        </tr>`;
        })
        .join("");

      signalsBody.querySelectorAll("button[data-signal-idx]").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.getAttribute("data-signal-idx"), 10);
          const item = items[idx];
          if (!item) return;
          confirmIfScriptDirty(async () => {
            const topicObj = {
              title: item.title,
              format: item.format || "Long-form (16:9)",
              angle: item.signal || "Trend Signal"
            };
            appState.currentBlueprint = window.OfflineIntelligence.generateBlueprint(
              topicObj,
              appState.activeNiche,
              appState.language
            );
            appState.currentScript = window.OfflineIntelligence.generateScript(appState.currentBlueprint);
            isScriptDirty = false;
            await saveAndSyncQuietly();
            populateStaticSelects();
            renderBlueprintTab();
            renderScriptTab();
            switchTab("stage-2");
            showToast(`Loaded trend signal "${item.title}" into Script Studio!`);
          });
        });
      });
    }

    // MOAT-03: Imported CSV Analytics with Offline Channel Autopsy & Outlier Engine
    const importedCard = document.getElementById("importedCsvCard");
    const importedBody = document.getElementById("importedCsvTableBody");
    const csvSummaryBox = document.getElementById("csvInsightsSummaryBox");
    if (importedCard && importedBody) {
      if (appState.importedYouTubeRows && appState.importedYouTubeRows.length > 0) {
        importedCard.style.display = "block";
        const insights = window.StudioServices.analyzeImportedCsv
          ? window.StudioServices.analyzeImportedCsv(appState.importedYouTubeRows)
          : null;

        const allEnrichedRows = insights && insights.enrichedRows ? insights.enrichedRows : appState.importedYouTubeRows;
        const filteredCsvRows = allEnrichedRows.filter(r => {
          const diag = String(r.diagnosticTag || "");
          if (csvFilterMode === "outliers") return diag.includes("Outlier");
          if (csvFilterMode === "gems") return diag.includes("Hidden Gem");
          if (csvFilterMode === "traps") return diag.includes("Clickbait");
          return true;
        });

        if (csvSummaryBox && insights) {
          const showAllToggleHtml =
            filteredCsvRows.length > 10
              ? `<button type="button" id="toggleCsvShowAllBtn" class="btn btn-secondary btn-sm" style="padding:2px 9px; font-size:11px;">
                   ${csvShowAllRows ? "Show Top 10" : `Show All (${filteredCsvRows.length})`}
                 </button>`
              : "";
          csvSummaryBox.innerHTML = `
            <div style="background:var(--bg-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:12px; display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div>
                  <div style="font-size:11.5px; color:var(--accent-cyan); font-weight:700; text-transform:uppercase;">
                    🔬 Offline Channel Autopsy &amp; Outlier Engine (${escapeHtml(insights.totalVideos)} Videos Analyzed)
                  </div>
                  <div style="font-size:13px; margin-top:3px;">
                    <strong>#1 Outlier:</strong> "${escapeHtml(insights.bestVideo.title)}" (${escapeHtml(insights.maxViewsFormatted)} views)
                    &bull; <strong>Winning Format:</strong> ${escapeHtml(insights.winningFormat)}
                    &bull; <strong>Avg CTR:</strong> ${escapeHtml(insights.avgCtr)}
                  </div>
                </div>
                <button id="createFromBestCsvBtn" class="btn btn-primary btn-sm">
                  ⚡ Write Follow-Up Script from Top Video &rarr;
                </button>
              </div>
              <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
                <span class="badge badge-score-high csv-filter-pill ${csvFilterMode === "all" ? "active" : ""}" data-csv-filter="all">All Videos (${allEnrichedRows.length})</span>
                <span class="badge badge-short csv-filter-pill ${csvFilterMode === "outliers" ? "active" : ""}" data-csv-filter="outliers">🔥 Viral Outliers: ${escapeHtml(insights.outlierCount ?? 0)}</span>
                <span class="badge badge-lang csv-filter-pill ${csvFilterMode === "gems" ? "active" : ""}" data-csv-filter="gems">💎 Hidden Gems (Swap Title/Thumb): ${escapeHtml(insights.hiddenGemsCount ?? 0)}</span>
                <span class="badge badge-score-med csv-filter-pill ${csvFilterMode === "traps" ? "active" : ""}" data-csv-filter="traps">⚠️ Clickbait Traps (Fix 0:00-0:30): ${escapeHtml(insights.clickbaitTrapCount ?? 0)}</span>
                ${showAllToggleHtml}
              </div>
              <div style="font-size:12px; color:var(--text-secondary); background:rgba(255,255,255,0.03); padding:7px 10px; border-radius:6px; border-left:3px solid var(--accent-cyan);">
                <strong>Actionable Recovery Plan:</strong> ${escapeHtml(insights.recoveryPlan || "Double down on your top outlier video with a Part 2 sequel.")}
              </div>
            </div>
          `;
          const bestBtn = document.getElementById("createFromBestCsvBtn");
          if (bestBtn) {
            bestBtn.onclick = () => {
              confirmIfScriptDirty(async () => {
                const topicObj = {
                  title: `${insights.bestVideo.title} (Part 2 Blueprint)`,
                  format: insights.bestVideo.format || "Long-form (16:9)"
                };
                appState.currentBlueprint = window.OfflineIntelligence.generateBlueprint(
                  topicObj,
                  appState.activeNiche,
                  appState.language
                );
                appState.currentScript = window.OfflineIntelligence.generateScript(appState.currentBlueprint);
                isScriptDirty = false;
                await saveAndSyncQuietly();
                populateStaticSelects();
                renderBlueprintTab();
                renderScriptTab();
                switchTab("stage-2");
                showToast(`Created sequel script from your #1 CSV video!`);
              });
            };
          }
          csvSummaryBox.querySelectorAll("[data-csv-filter]").forEach(pill => {
            pill.addEventListener("click", () => {
              csvFilterMode = pill.getAttribute("data-csv-filter") || "all";
              renderTrendRadar();
            });
          });
          const toggleAllBtn = document.getElementById("toggleCsvShowAllBtn");
          if (toggleAllBtn) {
            toggleAllBtn.addEventListener("click", () => {
              csvShowAllRows = !csvShowAllRows;
              renderTrendRadar();
            });
          }
        }

        const rowsToRender = csvShowAllRows ? filteredCsvRows : filteredCsvRows.slice(0, 10);
        importedBody.innerHTML = rowsToRender
          .map((r, idx) => {
            const mult = r.outlierMultiplier || "1.0";
            const diag = r.diagnosticTag || "✅ Baseline";
            const diagBadgeClass = diag.includes("Outlier")
              ? "badge-short"
              : diag.includes("Hidden Gem")
              ? "badge-lang"
              : diag.includes("Clickbait")
              ? "badge-score-med"
              : "badge-score-high";
            return `
          <tr>
            <td><strong>${escapeHtml(r.title)}</strong></td>
            <td>${escapeHtml(r.views)}</td>
            <td>${escapeHtml(r.ctr)}</td>
            <td>${escapeHtml(r.avd)}</td>
            <td>
              <span class="badge ${diagBadgeClass}" title="Outlier Multiplier vs Channel Median">${escapeHtml(mult)}x Median • ${escapeHtml(diag)}</span>
            </td>
            <td><span class="badge ${String(r.format || "").includes("Short") ? "badge-short" : "badge-long"}">${escapeHtml(r.format)}</span></td>
            <td>
              <button class="btn btn-secondary btn-sm" data-csv-idx="${idx}" style="padding:3px 8px; font-size:11px;">
                Fix / Remix Script &rarr;
              </button>
            </td>
          </tr>`;
          })
          .join("");

        importedBody.querySelectorAll("button[data-csv-idx]").forEach(btn => {
          btn.addEventListener("click", () => {
            const idx = parseInt(btn.getAttribute("data-csv-idx"), 10);
            const r = rowsToRender[idx];
            if (!r) return;
            confirmIfScriptDirty(async () => {
              appState.currentBlueprint = window.OfflineIntelligence.generateBlueprint(
                { title: r.title, format: r.format },
                appState.activeNiche,
                appState.language
              );
              appState.currentScript = window.OfflineIntelligence.generateScript(appState.currentBlueprint);
              isScriptDirty = false;
              await saveAndSyncQuietly();
              populateStaticSelects();
              renderBlueprintTab();
              renderScriptTab();
              switchTab("stage-2");
              showToast(`Loaded "${r.title}" into Script Studio for remixing!`);
            });
          });
        });
      } else {
        importedCard.style.display = "none";
      }
    }
  }

  function renderTopicsTab() {
    const tbody = document.getElementById("topicsTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    (appState.topics || []).forEach((t, idx) => {
      const tr = document.createElement("tr");
      const fmtClass = String(t.format || "").includes("Short")
        ? "badge-short"
        : String(t.format || "").includes("Both")
        ? "badge-funnel"
        : "badge-long";

      tr.innerHTML = `
        <td><strong>#${idx + 1}</strong></td>
        <td>
          <div style="font-weight:700; font-size:13.5px; margin-bottom:3px; color:var(--text-primary);">${escapeHtml(t.title)}</div>
          <div style="font-size:11.5px; color:var(--text-secondary);">${escapeHtml(t.whyItWorks)}</div>
        </td>
        <td><span class="badge ${fmtClass}">${escapeHtml(t.format)}</span></td>
        <td>
          <span class="badge badge-score-high" title="Search Intent">S: ${escapeHtml(t.searchScore)}</span>
          <span class="badge badge-score-high" style="margin-left:4px;" title="Viral Discovery Velocity">V: ${escapeHtml(t.viralScore)}</span>
        </td>
        <td>
          <button class="btn btn-primary btn-sm" data-build-idx="${idx}" title="Create Blueprint & Script for this topic">
            Write Script &rarr;
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll("button[data-build-idx]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-build-idx"), 10);
        const chosenTopic = appState.topics[idx];
        if (!chosenTopic) return;

        confirmIfScriptDirty(async () => {
          appState.currentBlueprint = window.OfflineIntelligence.generateBlueprint(
            chosenTopic,
            appState.activeNiche,
            appState.language
          );
          appState.currentScript = window.OfflineIntelligence.generateScript(appState.currentBlueprint);
          isScriptDirty = false;
          await saveAndSyncQuietly();
          populateStaticSelects();
          renderBlueprintTab();
          renderScriptTab();
          switchTab("stage-2");
          showToast(`Loaded "${chosenTopic.title}" into Script Studio!`);
        });
      });
    });
  }

  function renderProjectVaultBar() {
    ensureSavedProjectsInitialized();
    const selectEl = document.getElementById("projectVaultSelect");
    if (!selectEl) return;
    selectEl.innerHTML = "";
    appState.savedProjects.forEach((p, idx) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `#${idx + 1}: ${p.title} (${(p.format || "Long-form").split(" ")[0]}) — Saved ${p.updatedAt || "Ready"}`;
      selectEl.appendChild(opt);
    });
    if (appState.activeProjectId) {
      selectEl.value = appState.activeProjectId;
    }
  }

  function renderPackagingSimulator() {
    const bp = appState.currentBlueprint || {};
    const rawTitle = document.getElementById("bpTopicTitleInput")?.value || bp.topicTitle || "How to Master Your Workflow Without Paid Tools";
    const badgeInput = document.getElementById("bpThumbBadgeInput");
    const themeSelect = document.getElementById("bpThumbThemeSelect");

    const badgeText = (badgeInput ? badgeInput.value : bp.thumbBadgeText) || "99% MISS THIS";
    const themeVal = (themeSelect ? themeSelect.value : bp.thumbTheme) || "High-Contrast Red/Dark";

    const evalRes = window.OfflineIntelligence.evaluateTitlePackaging
      ? window.OfflineIntelligence.evaluateTitlePackaging(rawTitle, badgeText)
      : {
          charCount: rawTitle.length,
          desktopTruncated: rawTitle.length > 70,
          mobileTruncated: rawTitle.length > 52,
          ctrScore: 90,
          verdict: "🔥 Elite Packaging (High Mobile CTR + Zero Truncation)"
        };

    const scoreBadge = document.getElementById("packagingScoreBadge");
    if (scoreBadge) {
      scoreBadge.textContent = `CTR Packaging Score: ${evalRes.ctrScore} / 100`;
      scoreBadge.className = "badge " + (evalRes.ctrScore >= 82 ? "badge-score-high" : evalRes.ctrScore >= 68 ? "badge-score-med" : "badge-short");
    }

    const diagText = document.getElementById("packagingDiagnosticsText");
    if (diagText) {
      const deskStatus = evalRes.desktopTruncated ? "⚠️ Truncates on Desktop (>70ch)" : "✅ Fits Desktop (<70ch)";
      const mobStatus = evalRes.mobileTruncated ? "⚠️ Truncates on Mobile (>52ch)" : "✅ Fits Mobile (<52ch)";
      diagText.innerHTML = `
        <div><strong>Length:</strong> ${escapeHtml(evalRes.charCount)} chars &bull; ${escapeHtml(deskStatus)} &bull; ${escapeHtml(mobStatus)}</div>
        <div style="margin-top:4px; color:var(--accent-cyan); font-weight:600;">${escapeHtml(evalRes.verdict)}</div>
      `;
    }

    const previewCard = document.getElementById("ytFeedPreviewCard");
    if (!previewCard) return;

    const clearThumbBtn = document.getElementById("clearThumbImageBtn");
    if (clearThumbBtn) {
      clearThumbBtn.style.display = bp.customThumbDataUrl ? "inline-flex" : "none";
    }

    previewCard.className = `yt-feed-preview-card feed-mode-${activeFeedPreviewMode}${compareCompetitorActive ? " compare-mode" : ""}`;
    const isShortMode = activeFeedPreviewMode === "shorts" || String(bp.format || "").toLowerCase().includes("short");
    const durationPill = isShortMode ? "0:45" : (bp.targetDuration ? bp.targetDuration.split(" ")[0] : "10:30");

    let themeClass = "yt-thumb-theme-red";
    let badgeBg = "#ff3b5c";
    let badgeColor = "#ffffff";
    if (themeVal.includes("Cyber")) {
      themeClass = "yt-thumb-theme-cyber";
      badgeBg = "#06b6d4";
      badgeColor = "#041019";
    } else if (themeVal.includes("Emerald")) {
      themeClass = "yt-thumb-theme-emerald";
      badgeBg = "#10b981";
      badgeColor = "#04160f";
    } else if (themeVal.includes("Yellow")) {
      themeClass = "yt-thumb-theme-yellow";
      badgeBg = "#facc15";
      badgeColor = "#09090b";
    }

    const displayTitle =
      activeFeedPreviewMode === "mobile" && rawTitle.length > 52
        ? rawTitle.slice(0, 50).trim() + "..."
        : rawTitle.length > 70
        ? rawTitle.slice(0, 68).trim() + "..."
        : rawTitle;

    const initials = (appState.activeNiche || "YT")
      .split(/\s+/)
      .slice(0, 2)
      .map(w => w[0] || "")
      .join("")
      .toUpperCase();

    const estViewsEl = document.getElementById("estViewsSelect");
    const rawTargetViews = estViewsEl ? parseInt(estViewsEl.value, 10) || 50000 : 50000;
    const formattedTargetViews = rawTargetViews >= 1000 ? `${Math.round(rawTargetViews / 1000)}K target views` : `${rawTargetViews} target views`;

    const customThumbImgHtml = bp.customThumbDataUrl
      ? `<img src="${escapeHtml(bp.customThumbDataUrl)}" alt="Custom Thumbnail" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:0;" />`
      : "";

    const yourCardHtml = `
      <div>
        ${compareCompetitorActive ? `<div style="font-size:11px; font-weight:700; color:var(--accent-cyan); text-transform:uppercase; margin-bottom:6px;">🎯 Your Video Packaging</div>` : ""}
        <div class="yt-thumb-canvas ${themeClass}">
          ${customThumbImgHtml}
          <div class="yt-thumb-badge" style="background:${badgeBg}; color:${badgeColor}; position:relative; z-index:1;">
            ${escapeHtml(badgeText)}
          </div>
          <div class="yt-thumb-sub" style="position:relative; z-index:1;">
            ⚡ ${escapeHtml(appState.activeNiche)}
          </div>
          <div class="yt-thumb-duration" style="z-index:1;">${escapeHtml(durationPill)}</div>
        </div>
        <div class="yt-feed-meta">
          <div class="yt-avatar-circle">${escapeHtml(initials || "YT")}</div>
          <div style="flex:1; min-width:0;">
            <div class="yt-feed-title">${escapeHtml(displayTitle)}</div>
            <div class="yt-feed-sub">
              ${escapeHtml(appState.activeNiche)} &bull; ${escapeHtml(formattedTargetViews)} &bull; <span style="color:#6ee7b7; font-weight:700;">CTR Score ${escapeHtml(evalRes.ctrScore)}/100</span>
            </div>
          </div>
        </div>
      </div>
    `;

    if (!compareCompetitorActive) {
      previewCard.innerHTML = yourCardHtml;
      return;
    }

    const profile = window.OfflineIntelligence.getNicheProfile(appState.activeNiche);
    const topLive = Array.isArray(appState.liveYouTubeResults) && appState.liveYouTubeResults.length > 0
      ? appState.liveYouTubeResults[0]
      : null;
    const compTitle = topLive
      ? topLive.title
      : `${(profile.topAngles && profile.topAngles[0]) || "Ultimate Workflow"} — ${appState.activeNiche}`;
    const compChannel = topLive ? (topLive.channel || "Top Niche Competitor") : `Top ${profile.category || "Niche"} Creator`;
    const compStats = topLive && topLive.viewsText
      ? `${topLive.viewsText} • ${topLive.publishedAt || "Trending"}`
      : `240K views • Velocity ${profile.velocity}/100`;

    const compCardHtml = `
      <div>
        <div style="font-size:11px; font-weight:700; color:var(--accent-warning); text-transform:uppercase; margin-bottom:6px;">⚔️ #1 Niche Competitor Benchmark</div>
        <div class="yt-thumb-canvas yt-thumb-theme-cyber">
          <div class="yt-thumb-badge" style="background:#f59e0b; color:#09090b; position:relative; z-index:1;">
            #1 BENCHMARK
          </div>
          <div class="yt-thumb-sub" style="position:relative; z-index:1;">
            🔥 ${escapeHtml(compChannel)}
          </div>
          <div class="yt-thumb-duration" style="z-index:1;">${escapeHtml(durationPill)}</div>
        </div>
        <div class="yt-feed-meta">
          <div class="yt-avatar-circle" style="background:linear-gradient(135deg, #f59e0b, #ef4444);">C1</div>
          <div style="flex:1; min-width:0;">
            <div class="yt-feed-title">${escapeHtml(compTitle)}</div>
            <div class="yt-feed-sub">
              ${escapeHtml(compChannel)} &bull; ${escapeHtml(compStats)}
            </div>
          </div>
        </div>
      </div>
    `;

    previewCard.innerHTML = `<div class="yt-feed-compare-grid">${yourCardHtml}${compCardHtml}</div>`;
  }

  function renderBlueprintTab() {
    renderProjectVaultBar();
    const bp = appState.currentBlueprint || {};
    document.getElementById("bpTopicTitleInput").value = bp.topicTitle || "";
    document.getElementById("bpFormatSelect").value =
      bp.format && bp.format.toLowerCase().includes("short")
        ? "Short-form (9:16 Vertical, 45-58s)"
        : bp.format && bp.format.toLowerCase().includes("both")
        ? "Both (Long-form 16:9 Pillar + Short-form 9:16 Teaser)"
        : "Long-form (16:9 Widescreen, 10-14m)";
    document.getElementById("bpLanguageSelect").value = bp.language || appState.language;

    fillSelectWithCustom("bpToneSelect", window.OfflineIntelligence.TONE_OPTIONS, bp.tone);
    fillSelectWithCustom("bpPacingSelect", window.OfflineIntelligence.PACING_OPTIONS, bp.pacing);
    fillSelectWithCustom("bpScriptStyleSelect", window.OfflineIntelligence.SCRIPT_STYLE_OPTIONS, bp.scriptStyle);
    fillSelectWithCustom("bpVideoStyleSelect", window.OfflineIntelligence.VIDEO_STYLE_OPTIONS, bp.videoStyle);
    fillSelectWithCustom(
      "bpCodeSwitchSelect",
      window.OfflineIntelligence.CODE_SWITCH_OPTIONS || DEFAULT_CODE_SWITCH_OPTIONS,
      bp.codeSwitchMix || DEFAULT_CODE_SWITCH_OPTIONS[0]
    );

    document.getElementById("bpSequenceNoteInput").value = bp.uploadSequenceNote || "";
    document.getElementById("bpCulturalNotesBox").textContent =
      `${bp.thumbnailAndTitleNotes || ""} — ${bp.culturalAdaptation || ""}`;

    const badgeInput = document.getElementById("bpThumbBadgeInput");
    if (badgeInput && bp.thumbBadgeText) {
      badgeInput.value = bp.thumbBadgeText;
    }
    const themeSelect = document.getElementById("bpThumbThemeSelect");
    if (themeSelect && bp.thumbTheme) {
      themeSelect.value = bp.thumbTheme;
    }

    renderPackagingSimulator();

    // Render Visual Retention Timeline Map (XSS-hardened)
    const timelineEl = document.getElementById("pacingTimelineBar");
    const legendEl = document.getElementById("pacingTimelineLegend");
    if (timelineEl && bp.pacingSegments) {
      timelineEl.innerHTML = bp.pacingSegments
        .map(
          seg => `
        <div class="pacing-segment" style="width:${Number(seg.pct) || 20}%; background:${escapeHtml(seg.color)};" title="${escapeHtml(seg.label)}: ${escapeHtml(seg.detail)}">
          ${escapeHtml(seg.label)}
          <span>${escapeHtml(seg.detail)}</span>
        </div>`
        )
        .join("");
    }
    if (legendEl && bp.pacingSegments) {
      legendEl.innerHTML = bp.pacingSegments
        .map(
          seg => `<span class="badge" style="background:${escapeHtml(seg.color)}22; border:1px solid ${escapeHtml(seg.color)}; color:#fff;">${escapeHtml(seg.label)}: ${escapeHtml(seg.detail)}</span>`
        )
        .join(" ");
    }
  }

  function renderScriptTab() {
    const bp = appState.currentBlueprint || {};
    const sc = appState.currentScript || {};

    document.getElementById("scriptActiveTopicHeader").textContent = bp.topicTitle || "Active Script";
    document.getElementById("scriptActiveMetaBadges").innerHTML = `
      <span class="badge badge-long">${escapeHtml(bp.format || "Long-form")}</span>
      <span class="badge badge-lang">${escapeHtml(bp.language || appState.language)}</span>
      <span class="badge badge-funnel">${escapeHtml(bp.tone || "Investigative")}</span>
      <span class="badge badge-score-high">${escapeHtml(bp.pacing || "Fast J-Cuts")}</span>
    `;

    // 1-Click Viral Hooks (SOL-16 + AUD-05 XSS-hardened)
    const hooksContainer = document.getElementById("scriptHooksList");
    if (hooksContainer) {
      hooksContainer.innerHTML = (sc.hooks || [])
        .map(
          (h, i) => `
        <div class="hook-box">
          <div class="hook-header">
            <span style="font-size:11px; color:var(--accent-primary); font-weight:700; text-transform:uppercase;">
              Hook Option #${i + 1} (0:00 - 0:15)
            </span>
            <button class="btn btn-primary btn-sm" data-hook-idx="${i}" style="padding:3px 8px; font-size:11px;">
              ⚡ Use This Hook
            </button>
          </div>
          <div style="font-size:13px; font-weight:600; line-height:1.4; color:var(--text-primary);">"${escapeHtml(h)}"</div>
        </div>`
        )
        .join("");

      hooksContainer.querySelectorAll("button[data-hook-idx]").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.getAttribute("data-hook-idx"), 10);
          const chosenHook = sc.hooks[idx];
          if (chosenHook) {
            applyHookToScript(chosenHook, idx + 1);
          }
        });
      });
    }

    const editor = document.getElementById("scriptEditorTextarea");
    if (editor) {
      editor.value = sc.scriptBody || "";
    }

    const providerSelect = document.getElementById("scriptAiProviderSelect");
    if (providerSelect) {
      providerSelect.value = appState.settings.preferredAiProvider || "offline";
    }

    const restoreBtn = document.getElementById("restoreScriptRevisionBtn");
    if (restoreBtn) {
      restoreBtn.style.display = scriptRevisions.length > 0 ? "inline-flex" : "none";
      if (scriptRevisions.length > 0) {
        restoreBtn.textContent = `⏪ Restore Backed-Up Script (${scriptRevisions.length})`;
      }
    }

    updateScriptStats();
  }

  /**
   * 1-Click Viral Hook Insertion into Script (SOL-16)
   * Supports both Long-form [0:00 - 0:15] and Shorts [0:00 - 0:03] cold hooks
   */
  function applyHookToScript(hookText, hookNumber) {
    let body = appState.currentScript?.scriptBody || "";

    if (body.includes('"')) {
      body = body.replace(/"[^"\n]{10,}"/, `"${hookText}"`);
    } else if (body.includes("[0:00 - 0:15")) {
      body = body.replace(new RegExp('(\\[0:00 - 0:15[^\\]]*\\]\\s*)([^\\n]+)'), '$1"' + hookText + '"');
    } else if (body.includes("[0:00 - 0:03")) {
      body = body.replace(new RegExp('(\\[0:00 - 0:03[^\\]]*\\]\\s*)([^\\n]+)'), '$1"' + hookText + '"');
    } else {
      body = `[0:00 - 0:15 | COLD OPEN HOOK]\n"${hookText}"\n\n` + body;
    }

    if (!appState.currentScript) appState.currentScript = {};
    appState.currentScript.scriptBody = body;
    isScriptDirty = true;

    const editor = document.getElementById("scriptEditorTextarea");
    if (editor) editor.value = body;
    updateScriptStats();
    saveAndSyncQuietly();
    showToast(`Applied Viral Hook #${hookNumber} to script!`);
  }

  function updateScriptStats() {
    const text = document.getElementById("scriptEditorTextarea")?.value || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const mins = (words / 150).toFixed(1);
    const statsEl = document.getElementById("scriptWordCountStats");
    if (statsEl) {
      statsEl.textContent = `${words} words • ~${mins} mins spoken @ 150 WPM`;
    }
  }

  function openSequenceStepInScriptStudio(stepItem) {
    if (!stepItem) return;
    confirmIfScriptDirty(async () => {
      const existingProj = (appState.savedProjects || []).find(
        p => (p.title || "").toLowerCase() === (stepItem.title || "").toLowerCase()
      );
      if (existingProj) {
        appState.activeProjectId = existingProj.id;
        appState.currentBlueprint = JSON.parse(JSON.stringify(existingProj.blueprint || {}));
        appState.currentScript = JSON.parse(JSON.stringify(existingProj.script || {}));
      } else {
        const pseudoTopic = {
          title: stepItem.title,
          format: stepItem.format,
          angle: stepItem.role,
          funnelRole: stepItem.role
        };
        appState.currentBlueprint = window.OfflineIntelligence.generateBlueprint(
          pseudoTopic,
          appState.activeNiche,
          appState.language
        );
        appState.currentScript = window.OfflineIntelligence.generateScript(appState.currentBlueprint);
        const newId = "proj-step-" + stepItem.step + "-" + Date.now();
        ensureSavedProjectsInitialized();
        appState.savedProjects.unshift({
          id: newId,
          title: stepItem.title,
          niche: appState.activeNiche,
          format: stepItem.format,
          updatedAt: new Date().toLocaleTimeString(),
          blueprint: JSON.parse(JSON.stringify(appState.currentBlueprint)),
          script: JSON.parse(JSON.stringify(appState.currentScript))
        });
        appState.activeProjectId = newId;
      }
      isScriptDirty = false;
      await saveAndSyncQuietly();
      populateStaticSelects();
      renderBlueprintTab();
      renderScriptTab();
      switchTab("stage-2");
      showToast(`Opened Step #${stepItem.step} ("${stepItem.title}") in Script Studio!`);
    });
  }

  function renderSequenceTab() {
    // Auto-initialize start date to tomorrow if empty (SOL-20)
    const dateInput = document.getElementById("sequenceStartDateInput");
    if (dateInput && !dateInput.value) {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      dateInput.value = tomorrow;
    }

    const chainEl = document.getElementById("funnelChainContainer");
    if (!chainEl) return;
    chainEl.innerHTML = "";

    const statuses = ["Idea", "Scripting", "Filming", "Ready", "Uploaded"];

    (appState.uploadSequence || []).forEach((item, idx) => {
      const isShort = String(item.format || "").toLowerCase().includes("short");
      const div = document.createElement("div");
      div.className = "funnel-step";
      div.innerHTML = `
        <div class="funnel-step-num">${escapeHtml(item.step)}</div>
        <div>
          <div style="font-weight:700; font-size:13px;">${escapeHtml(item.date)}</div>
          <div style="font-size:11.5px; color:var(--text-secondary);">${escapeHtml(item.dayTime)}</div>
        </div>
        <div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <span class="badge ${isShort ? "badge-short" : "badge-long"}">${escapeHtml(item.format)}</span>
            <span class="badge badge-funnel">${escapeHtml(item.role)}</span>
          </div>
          <div style="font-weight:700; font-size:14px; line-height:1.35;">${escapeHtml(item.title)}</div>
          <div style="font-size:11.5px; color:var(--text-secondary); margin-top:2px;">${escapeHtml(item.spacingNote)}</div>
        </div>
        <div>
          <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Funnel Link</div>
          <div style="font-size:12px; color:var(--accent-cyan); font-weight:600;">${escapeHtml(item.linkedTo)}</div>
        </div>
        <div>
          <label style="font-size:11px; color:var(--text-secondary); display:block; margin-bottom:4px; font-weight:600;">Production Status</label>
          <select data-seq-status-idx="${idx}">
            ${statuses.map(st => `<option value="${escapeHtml(st)}" ${item.status === st ? "selected" : ""}>${escapeHtml(st)}</option>`).join("")}
          </select>
        </div>
        <div>
          <button class="btn btn-secondary btn-sm" data-script-step-idx="${idx}" title="Open or generate script for this video in Stage 2">
            Open in Script Studio &rarr;
          </button>
        </div>
      `;
      chainEl.appendChild(div);
    });

    // Production Status Dropdowns
    chainEl.querySelectorAll("select[data-seq-status-idx]").forEach(sel => {
      sel.addEventListener("change", async (e) => {
        const i = parseInt(sel.getAttribute("data-seq-status-idx"), 10);
        appState.uploadSequence[i].status = e.target.value;
        await saveAndSyncQuietly();
        renderKanbanBoard();
        showToast(`Updated Step #${i + 1} status to "${e.target.value}"`);
      });
    });

    // "Open in Script Studio ->" Buttons (SOL-19 & MOAT-04)
    chainEl.querySelectorAll("button[data-script-step-idx]").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = parseInt(btn.getAttribute("data-script-step-idx"), 10);
        const stepItem = appState.uploadSequence[i];
        openSequenceStepInScriptStudio(stepItem);
      });
    });

    renderKanbanBoard();
  }

  /**
   * Interactive Click-to-Advance Kanban + Open in Script Studio (SOL-18 & MOAT-04)
   */
  function renderKanbanBoard() {
    const board = document.getElementById("sequenceKanbanBoard");
    if (!board) return;
    const statuses = ["Idea", "Scripting", "Filming", "Ready", "Uploaded"];

    board.innerHTML = statuses
      .map(st => {
        const items = (appState.uploadSequence || [])
          .map((item, originalIndex) => ({ ...item, originalIndex }))
          .filter(x => x.status === st);

        return `
        <div class="kanban-col">
          <div class="kanban-col-header">
            <span>${escapeHtml(st)}</span>
            <span class="badge badge-lang">${items.length}</span>
          </div>
          ${items
            .map(it => {
              const currentIdx = statuses.indexOf(it.status);
              const nextStatus = currentIdx < statuses.length - 1 ? statuses[currentIdx + 1] : null;
              return `
            <div class="kanban-item">
              <div style="margin-bottom:4px;">
                <span class="badge ${String(it.format || "").toLowerCase().includes("short") ? "badge-short" : "badge-long"}">Step #${escapeHtml(it.step)} • ${escapeHtml((it.format || "").split(" ")[0])}</span>
              </div>
              <div class="kanban-item-title">${escapeHtml(it.title)}</div>
              <div style="font-size:11px; color:var(--text-secondary);">${escapeHtml(it.date)}</div>
              <button class="kanban-advance-btn" data-kanban-script-idx="${it.originalIndex}" style="margin-top:6px;">
                Open in Script Studio &rarr;
              </button>
              ${
                nextStatus
                  ? `<button class="kanban-advance-btn" data-advance-idx="${it.originalIndex}" data-next-status="${escapeHtml(nextStatus)}">
                      Advance to ${escapeHtml(nextStatus)} &rarr;
                    </button>`
                  : `<div style="font-size:10.5px; color:var(--accent-success); margin-top:6px; font-weight:700;">&#10004; Released</div>`
              }
            </div>`;
            })
            .join("")}
        </div>`;
      })
      .join("");

    board.querySelectorAll("button[data-kanban-script-idx]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-kanban-script-idx"), 10);
        const stepItem = appState.uploadSequence[idx];
        openSequenceStepInScriptStudio(stepItem);
      });
    });

    board.querySelectorAll("button[data-advance-idx]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const idx = parseInt(btn.getAttribute("data-advance-idx"), 10);
        const nextSt = btn.getAttribute("data-next-status");
        if (appState.uploadSequence[idx]) {
          appState.uploadSequence[idx].status = nextSt;
          await saveAndSyncQuietly();
          renderSequenceTab();
          showToast(`Advanced Step #${appState.uploadSequence[idx].step} to "${nextSt}"`);
        }
      });
    });
  }

  function renderIntegrationsStatus() {
    const s = appState.settings || {};
    document.getElementById("intPreferredAiSelect").value = s.preferredAiProvider || "offline";
    document.getElementById("intOllamaUrlInput").value = s.ollamaUrl || "http://localhost:11434";
    document.getElementById("intOllamaModelInput").value = s.ollamaModel || "llama3.2";
    document.getElementById("intOpenaiKeyInput").value = s.openaiKey || "";
    document.getElementById("intGeminiKeyInput").value = s.geminiKey || "";
    document.getElementById("intClaudeKeyInput").value = s.claudeKey || "";
    document.getElementById("intYoutubeKeyInput").value = s.youtubeApiKey || "";
    document.getElementById("intDriveFolderInput").value = s.googleDriveFolderPath || "d:\\YT APP\\GoogleDrive_Sync";
    document.getElementById("intDriveTokenInput").value = s.googleDriveToken || "";

    const syncedListEl = document.getElementById("syncedFilesStatusList");
    if (syncedListEl) {
      const files = appState.lastSyncedFiles && appState.lastSyncedFiles.length > 0
        ? appState.lastSyncedFiles
        : [
            { name: "YT_Studio_Blueprint_and_Script.md", sizeKb: "6.4", updatedAt: appState.lastDriveSyncAt ? new Date(appState.lastDriveSyncAt).toLocaleTimeString() : "Ready" },
            { name: "YT_Upload_Sequence_Calendar.csv", sizeKb: "1.9", updatedAt: appState.lastDriveSyncAt ? new Date(appState.lastDriveSyncAt).toLocaleTimeString() : "Ready" },
            { name: "YT_Studio_Full_Backup.json", sizeKb: "14.2", updatedAt: appState.lastDriveSyncAt ? new Date(appState.lastDriveSyncAt).toLocaleTimeString() : "Ready" }
          ];
      const folderBadge = appState.browserFolderName
        ? `<div style="font-size:11.5px; color:var(--accent-cyan); margin-bottom:6px; font-weight:600;">📂 Active Browser Folder: <strong>${escapeHtml(appState.browserFolderName)}</strong></div>`
        : "";
      syncedListEl.innerHTML = `
        <div style="background:var(--bg-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); padding:10px 12px;">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-secondary); margin-bottom:6px;">
            Synced Project Files in Local Google Drive Folder:
          </div>
          ${folderBadge}
          ${files
            .map(
              f => `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; padding:3px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
              <span style="font-family:var(--font-mono); color:var(--text-primary);">&#128196; ${escapeHtml(f.name)}</span>
              <span style="color:var(--text-secondary); font-size:11px;">${escapeHtml(f.sizeKb)} KB &bull; ${escapeHtml(f.updatedAt)}</span>
            </div>`
            )
            .join("")}
        </div>
      `;
    }

    const diagBox = document.getElementById("envDiagnosticsBox");
    if (diagBox) {
      diagBox.innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px;">
          <div class="stat-card">
            <div class="stat-label">Offline Device Storage</div>
            <div class="stat-value" style="font-size:15px; color:var(--accent-success);">&#10004; Active &amp; Synced</div>
            <div class="stat-sub">IndexedDB + LocalStorage + Disk Sync</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Local Server Backend</div>
            <div class="stat-value" style="font-size:15px; color:${envStatus.localServerActive ? "var(--accent-success)" : "var(--accent-warning)"};">
              ${envStatus.localServerActive ? "Connected (Port 8080)" : "Browser Standalone Mode"}
            </div>
            <div class="stat-sub">${envStatus.localServerActive ? "Disk folder writing active" : "Run Start-App.bat for disk sync"}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">AI Engine Status</div>
            <div class="stat-value" style="font-size:15px; color:var(--accent-cyan);">
              ${envStatus.ollamaActive ? "Local Ollama Ready" : "Offline Studio Ready ⚡"}
            </div>
            <div class="stat-sub">${envStatus.ollamaActive ? "Local model detected" : "100% Private local intelligence"}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Google Drive Vault</div>
            <div class="stat-value" style="font-size:15px;">
              ${appState.lastDriveSyncAt ? "Synced to Folder" : "Ready to Sync"}
            </div>
            <div class="stat-sub">${appState.lastDriveSyncAt ? "Last: " + escapeHtml(new Date(appState.lastDriveSyncAt).toLocaleTimeString()) : "Click 'Sync to Local Folder Now'"}</div>
          </div>
        </div>
      `;
    }
  }

  document.addEventListener("DOMContentLoaded", initApp);
})();
