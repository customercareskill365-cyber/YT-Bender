/**
 * Offline-First Services Layer:
 * - IndexedDB + Local Server SQLite/JSON Persistence
 * - Credential-Sanitized Export & Shared Backup Protection (AUD-01)
 * - Hybrid YouTube Trend Engine (API v3 + Server Scraper + CSV Import + Offline Knowledge Base)
 * - Offline Channel Autopsy & Outlier Engine (MOAT-03)
 * - Multi-Mode AI Hub with Upstream Error Surfacing (AUD-06)
 * - DaVinci Resolve & Premiere Pro NLE Timeline Marker CSV Exporter (MOAT-05)
 * - Dual-Mode Google Drive Sync & Admin Diagnostics Fetcher
 */

window.StudioServices = (function () {
  const DB_NAME = "YTStudioOfflineDB";
  const DB_VERSION = 1;
  const STORE_NAME = "workspace";
  const LOCAL_STORAGE_KEY = "yt_studio_state_v1";

  let directoryHandle = null; // For browser File System Access API (Google Drive local folder)

  // Default state
  function getDefaultState() {
    const defaultNiche = "Tech & AI Tools";
    const defaultLang = "Hinglish (Hindi + English Creator Mix)";
    const defaultRegion = "India (IN)";
    const initialTopics = window.OfflineIntelligence.generateTopicsForNiche(defaultNiche, defaultLang, defaultRegion, "All");
    const initialBlueprint = window.OfflineIntelligence.generateBlueprint(initialTopics[0], defaultNiche, defaultLang);
    const initialScript = window.OfflineIntelligence.generateScript(initialBlueprint);
    const initialSequence = window.OfflineIntelligence.generateUploadSequence(defaultNiche, initialTopics);

    return {
      activeProjectId: "default-project",
      savedProjects: [],
      activeNiche: defaultNiche,
      language: defaultLang,
      region: defaultRegion,
      formatFilter: "All",
      topics: initialTopics,
      currentBlueprint: initialBlueprint,
      currentScript: initialScript,
      uploadSequence: initialSequence,
      importedYouTubeRows: [],
      liveYouTubeResults: [],
      driveSyncQueue: [],
      lastSavedAt: new Date().toISOString(),
      lastDriveSyncAt: null,
      settings: {
        preferredAiProvider: "offline", // offline | ollama | openai | gemini | claude | bridge
        ollamaUrl: "http://localhost:11434",
        ollamaModel: "llama3.2",
        openaiKey: "",
        openaiModel: "gpt-4o-mini",
        geminiKey: "",
        geminiModel: "gemini-2.5-flash",
        claudeKey: "",
        claudeModel: "claude-3-7-sonnet-latest",
        youtubeApiKey: "",
        googleDriveToken: "",
        googleDriveFolderPath: "d:\\YT APP\\GoogleDrive_Sync",
        autoSyncLocalDrive: true
      }
    };
  }

  /**
   * AUD-01: Credential Sanitization for Shared Backups
   * Returns a deep clone of `state` with all API keys and OAuth tokens scrubbed
   * so shared Google Drive folders and exported JSON backups never leak credentials.
   */
  function sanitizeStateForExport(state) {
    const cloned = JSON.parse(JSON.stringify(state || {}));
    if (!cloned.settings || typeof cloned.settings !== "object") {
      cloned.settings = {};
    }
    cloned.settings.openaiKey = "";
    cloned.settings.geminiKey = "";
    cloned.settings.claudeKey = "";
    cloned.settings.youtubeApiKey = "";
    cloned.settings.googleDriveToken = "";
    cloned.settings._credentialsRedactedForSecurity = true;
    return cloned;
  }

  // IndexedDB Helper
  function openIdb() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        return resolve(null);
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = function (e) {
        resolve(e.target.result);
      };
      req.onerror = function () {
        resolve(null);
      };
    });
  }

  async function loadState() {
    // 1. Try local backend server first if running on localhost
    try {
      if (window.location.protocol.startsWith("http")) {
        const res = await fetch("/api/db", { method: "GET" });
        if (res.ok) {
          const data = await res.json();
          if (data && data.activeNiche) {
            if (!Array.isArray(data.savedProjects)) data.savedProjects = [];
            if (!data.activeProjectId) data.activeProjectId = "default-project";
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
            return data;
          }
        }
      }
    } catch (_) {
      // Offline or standalone file:// mode
    }

    // 2. Try IndexedDB
    try {
      const db = await openIdb();
      if (db) {
        const idbState = await new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, "readonly");
          const req = tx.objectStore(STORE_NAME).get("main");
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
        if (idbState && idbState.activeNiche) {
          if (!Array.isArray(idbState.savedProjects)) idbState.savedProjects = [];
          if (!idbState.activeProjectId) idbState.activeProjectId = "default-project";
          return idbState;
        }
      }
    } catch (_) {}

    // 3. Try localStorage
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.activeNiche) {
          if (!Array.isArray(parsed.savedProjects)) parsed.savedProjects = [];
          if (!parsed.activeProjectId) parsed.activeProjectId = "default-project";
          return parsed;
        }
      }
    } catch (_) {}

    return getDefaultState();
  }

  async function saveState(state) {
    state.lastSavedAt = new Date().toISOString();
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}

    try {
      const db = await openIdb();
      if (db) {
        await new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          tx.objectStore(STORE_NAME).put(state, "main");
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      }
    } catch (_) {}

    // Also persist to local server if active
    try {
      if (window.location.protocol.startsWith("http")) {
        await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state)
        });
      }
    } catch (_) {}

    return state;
  }

  // Server & Ollama Status Check
  async function checkEnvironmentStatus(ollamaUrl) {
    const status = {
      online: navigator.onLine,
      localServerActive: false,
      ollamaActive: false,
      ollamaModels: [],
      driveFolderPath: ""
    };

    // Check local backend server
    try {
      if (window.location.protocol.startsWith("http")) {
        const res = await fetch("/api/status");
        if (res.ok) {
          const s = await res.json();
          status.localServerActive = true;
          status.ollamaActive = Boolean(s.ollamaActive);
          status.ollamaModels = s.ollamaModels || [];
          status.driveFolderPath = s.driveFolderPath || "";
        }
      }
    } catch (_) {}

    // Also check direct Ollama connection on localhost:11434
    if (!status.ollamaActive) {
      try {
        const cleanUrl = (ollamaUrl || "http://localhost:11434").replace(/\/$/, "");
        const res = await fetch(`${cleanUrl}/api/tags`);
        if (res.ok) {
          const data = await res.json();
          status.ollamaActive = true;
          status.ollamaModels = (data.models || []).map(m => m.name);
        }
      } catch (_) {}
    }

    return status;
  }

  // Hybrid YouTube Trend Fetcher (SOL-05, SOL-06)
  async function fetchYouTubeTrends(query, regionCode, apiKey) {
    const cleanRegion = (regionCode || "IN").includes("India") ? "IN" : (regionCode || "US").includes("US") ? "US" : "US";

    // 1. If YouTube Data API v3 Key is provided & online
    if (apiKey && navigator.onLine) {
      try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodeURIComponent(query)}&type=video&regionCode=${cleanRegion}&order=viewCount&key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          return {
            source: "🔴 Live YouTube Data API v3",
            isLive: true,
            items: (data.items || []).map(item => ({
              title: item.snippet.title,
              channel: item.snippet.channelTitle,
              publishedAt: (item.snippet.publishedAt || "").split("T")[0],
              videoId: item.id.videoId,
              watchUrl: item.id.videoId
                ? `https://www.youtube.com/watch?v=${item.id.videoId}`
                : `https://www.youtube.com/results?search_query=${encodeURIComponent(item.snippet.title)}`,
              isLive: true,
              format: item.snippet.title.toLowerCase().includes("#shorts") ? "Short-form (9:16)" : "Long-form (16:9)",
              signal: "🔴 Live YouTube Trend"
            }))
          };
        }
      } catch (_) {}
    }

    // 2. Try Local Server Live YouTube Scraper if online
    if (navigator.onLine && window.location.protocol.startsWith("http")) {
      try {
        const res = await fetch("/api/youtube/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, region: cleanRegion })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            return {
              source: "🔴 Live YouTube Search Feed",
              isLive: true,
              items: data.items.map(it => ({
                ...it,
                isLive: true,
                watchUrl: it.watchUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(it.title)}`
              }))
            };
          }
        }
      } catch (_) {}
    }

    // 3. Offline Intelligence Fallback (Works 100% Offline with 0ms latency)
    const profile = window.OfflineIntelligence.getNicheProfile(query);
    return {
      source: "⚡ Proven Offline Benchmark DB",
      isLive: false,
      items: profile.topAngles.map((angle, i) => {
        const title = `${angle} (${query})`;
        return {
          title,
          channel: `Top ${profile.category} Benchmark #${i + 1}`,
          publishedAt: "Offline Trend Pattern",
          videoId: `offline-${i + 1}`,
          watchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`,
          isLive: false,
          format: i % 2 === 0 ? "Long-form (10-14m)" : "Short-form (45s)",
          signal: `⚡ Benchmark • Velocity ${profile.velocity - i * 2}/100`
        };
      })
    };
  }

  function splitCsvLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  // Parse Imported YouTube CSV / JSON (100% Offline)
  function parseImportedYouTubeFile(filename, content) {
    if (filename.endsWith(".json")) {
      const parsed = JSON.parse(content);
      const arr = Array.isArray(parsed) ? parsed : (parsed.items || parsed.videos || []);
      return arr.map((row, idx) => ({
        title: row.title || row.VideoTitle || `Imported Video #${idx + 1}`,
        views: row.views || row.Views || "N/A",
        ctr: row.ctr || row.CTR || "N/A",
        avd: row.avd || row.AverageViewDuration || "N/A",
        format: (row.format || row.title || "").toLowerCase().includes("short") ? "Short-form" : "Long-form"
      }));
    }

    // CSV Parser supporting quoted fields
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];
    const headers = splitCsvLine(lines[0]).map(h => h.replace(/^"|"$/g, "").trim().toLowerCase());
    const rows = [];

    const titleIdx = headers.findIndex(h => h.includes("title") || h.includes("content") || h.includes("video"));
    const viewsIdx = headers.findIndex(h => h.includes("view"));
    const ctrIdx = headers.findIndex(h => h.includes("ctr") || h.includes("click"));
    const avdIdx = headers.findIndex(h => h.includes("duration") || h.includes("watch"));
    const fmtIdx = headers.findIndex(h => h.includes("format"));

    // LOOP-08: Parse up to 1,000 channel export rows instead of capping at 49
    for (let i = 1; i < Math.min(lines.length, 1000); i++) {
      const cols = splitCsvLine(lines[i]).map(c => c.replace(/^"|"$/g, "").trim());
      const title = cols[titleIdx >= 0 ? titleIdx : 0] || `Row #${i}`;
      const fmtVal = fmtIdx >= 0 && cols[fmtIdx] ? cols[fmtIdx] : (title.toLowerCase().includes("#short") ? "Short-form" : "Long-form");
      rows.push({
        title,
        views: viewsIdx >= 0 ? cols[viewsIdx] : "—",
        ctr: ctrIdx >= 0 ? cols[ctrIdx] : "—",
        avd: avdIdx >= 0 ? cols[avdIdx] : "—",
        format: fmtVal
      });
    }
    return rows;
  }

  /**
   * SOL-08 & MOAT-03: Offline Channel Autopsy & Outlier Engine
   * Calculates median views, outlier multipliers, and diagnostic tags (Viral Outlier, Hidden Gem, Clickbait Trap)
   */
  function analyzeImportedCsv(rows) {
    if (!rows || rows.length === 0) return null;
    let bestRow = rows[0];
    let maxViews = -1;
    let ctrSum = 0;
    let ctrCount = 0;
    let shortViews = 0;
    let shortCount = 0;
    let longViews = 0;
    let longCount = 0;

    const numericViewsList = rows.map(r => parseFloat(String(r.views || "0").replace(/[^0-9.]/g, "")) || 0);
    const sortedViews = [...numericViewsList].sort((a, b) => a - b);
    const midIdx = Math.floor(sortedViews.length / 2);
    const medianViews = sortedViews.length % 2 !== 0
      ? sortedViews[midIdx]
      : Math.round((sortedViews[midIdx - 1] + sortedViews[midIdx]) / 2);

    let outlierCount = 0;
    let hiddenGemsCount = 0;
    let clickbaitTrapCount = 0;

    const enrichedRows = rows.map(r => {
      const rowViews = parseFloat(String(r.views || "0").replace(/[^0-9.]/g, "")) || 0;
      const ctrNum = parseFloat(String(r.ctr || "0").replace(/[^0-9.]/g, "")) || 0;

      if (rowViews > maxViews) {
        maxViews = rowViews;
        bestRow = r;
      }
      if (ctrNum > 0) {
        ctrSum += ctrNum;
        ctrCount++;
      }
      if ((r.format || "").toLowerCase().includes("short")) {
        shortViews += rowViews;
        shortCount++;
      } else {
        longViews += rowViews;
        longCount++;
      }

      const multNum = rowViews / Math.max(medianViews, 1);
      const outlierMultiplier = multNum.toFixed(1);
      let diagnosticTag = "✅ Baseline Performer";

      if (multNum >= 2.0) {
        diagnosticTag = "🔥 Viral Outlier";
        outlierCount++;
      } else if (ctrNum > 0 && ctrNum < 4.5 && rowViews >= medianViews * 0.8) {
        diagnosticTag = "💎 Hidden Gem (Swap Title/Thumb)";
        hiddenGemsCount++;
      } else if (ctrNum >= 7.0 && rowViews < medianViews * 0.6) {
        diagnosticTag = "⚠️ Clickbait Trap (Fix First 30s)";
        clickbaitTrapCount++;
      }

      r.outlierMultiplier = outlierMultiplier;
      r.diagnosticTag = diagnosticTag;

      return {
        ...r,
        outlierMultiplier,
        diagnosticTag
      };
    });

    const avgShort = shortCount > 0 ? Math.round(shortViews / shortCount) : 0;
    const avgLong = longCount > 0 ? Math.round(longViews / longCount) : 0;
    const winningFormat = avgShort > avgLong ? "Short-form (9:16)" : "Long-form (16:9)";
    const avgCtr = ctrCount > 0 ? `${(ctrSum / ctrCount).toFixed(1)}%` : "9.5%";

    let recoveryPlan = `Double down on "${bestRow.title}" with a Part 2 sequel and a 45s teaser Short.`;
    if (hiddenGemsCount > 0 && clickbaitTrapCount > 0) {
      recoveryPlan = `Repackage ${hiddenGemsCount} Hidden Gem(s) with high-contrast 3-word thumbnails to unlock immediate browse traffic, and tighten the 0:00-0:30 hook on ${clickbaitTrapCount} Clickbait Trap video(s).`;
    } else if (hiddenGemsCount > 0) {
      recoveryPlan = `Swap the title & thumbnail badge on your ${hiddenGemsCount} Hidden Gem video(s)—retention is strong, so lifting CTR above 6.5% will trigger a browse spike.`;
    } else if (clickbaitTrapCount > 0) {
      recoveryPlan = `Your packaging wins clicks, but ${clickbaitTrapCount} video(s) lose viewers in the first 30 seconds—deliver visual proof in frame 1 before any intro.`;
    }

    return {
      bestVideo: bestRow,
      maxViewsFormatted: maxViews > 0 ? maxViews.toLocaleString() : bestRow.views,
      medianViews,
      medianViewsFormatted: medianViews > 0 ? medianViews.toLocaleString() : "N/A",
      winningFormat,
      avgCtr,
      totalVideos: rows.length,
      outlierCount,
      hiddenGemsCount,
      clickbaitTrapCount,
      recoveryPlan,
      enrichedRows
    };
  }

  /**
   * LOOP-05: Extract Viral Hooks from AI & Prompt-Bridge Text
   * Scans AI response text for quoted hook lines or numbered hook lines under a Hook heading,
   * strips formatting noise, and guarantees an array of 3 distinct, clean hook strings.
   */
  function extractHooksFromAiText(aiText, fallbackHooks = []) {
    const raw = String(aiText || "");
    const collected = [];
    const seen = new Set();

    function addCandidate(str) {
      if (!str || collected.length >= 3) return;
      const cleaned = String(str)
        .replace(/^[\s\d#*\-•:.()"“”'`]+/, "")
        .replace(/[\s*"“”'`]+$/, "")
        .trim();
      if (cleaned.length < 18 || cleaned.length > 180) return;
      if (/^\[(visual|audio|pacing|0:\d\d|दृश्य)/i.test(cleaned)) return;
      const key = cleaned.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        collected.push(cleaned);
      }
    }

    // 1. Scan numbered hook lines or explicit Hook #1 / 1. lines
    const numberedHookRegex = /(?:^|\n)\s*(?:(?:[123]\.|Hook\s*#?[123]|Option\s*#?[123])[:\s-]+)([^\n]{18,180})/gi;
    let m;
    while ((m = numberedHookRegex.exec(raw)) !== null && collected.length < 3) {
      addCandidate(m[1]);
    }

    // 2. Scan quoted hook lines
    const quotedRegex = /"([^"\n]{18,180})"/g;
    while ((m = quotedRegex.exec(raw)) !== null && collected.length < 3) {
      addCandidate(m[1]);
    }

    // 3. Fill remaining slots from fallbackHooks (or default offline hooks) so 3 hooks are always returned
    const defaultFallbacks = [
      "Most people approaching this workflow get this one critical step completely backwards...",
      "I tested the top strategies for 30 days so you don't waste your time—here is what actually worked.",
      "Stop using outdated methods—here is the exact step-by-step 2026 blueprint."
    ];
    const pool = Array.isArray(fallbackHooks) && fallbackHooks.length > 0
      ? [...fallbackHooks, ...defaultFallbacks]
      : defaultFallbacks;

    for (const fb of pool) {
      if (collected.length >= 3) break;
      if (fb && String(fb).trim()) {
        const cleanFb = String(fb).trim();
        const key = cleanFb.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          collected.push(cleanFb);
        }
      }
    }

    return collected.slice(0, 3);
  }

  // Multi-Mode AI Generation Hub (with AUD-06 Upstream Error Surfacing & LOOP-05 Hook Extraction)
  async function generateWithAI(taskType, payload, settings) {
    const safePayload = payload || {};
    const safeSettings = settings || {};
    const provider = safeSettings.preferredAiProvider || "offline";
    const systemPrompt =
      "You are an elite YouTube Strategist & Retention Producer. Always respond with actionable, high-retention advice tailored to the user's Niche, Tone, Pacing, Script Style, Video Style, Language (including English, Hindi, Hinglish, Tanglish, etc.), and Format (Long-form vs Short-form).";

    const userPrompt = buildStructuredPrompt(taskType, safePayload);
    const fallbackResult = window.OfflineIntelligence.generateScript(
      safePayload.blueprint || window.OfflineIntelligence.generateBlueprint({ title: safePayload.topic || safePayload.niche }, safePayload.niche, safePayload.language)
    );
    const fallbackHooks = fallbackResult.hooks || [];
    let apiWarning = "";

    // 1. Local Ollama (100% Offline Local LLM)
    if (provider === "ollama") {
      try {
        const cleanUrl = (safeSettings.ollamaUrl || "http://localhost:11434").replace(/\/$/, "");
        const res = await fetch(`${cleanUrl}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: safeSettings.ollamaModel || "llama3.2",
            prompt: `${systemPrompt}\n\n${userPrompt}`,
            stream: false
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.response) {
            return {
              providerUsed: `Local Ollama (${safeSettings.ollamaModel || "llama3.2"})`,
              text: data.response,
              hooks: extractHooksFromAiText(data.response, fallbackHooks),
              apiWarning: ""
            };
          }
        } else {
          apiWarning = `Ollama returned HTTP ${res.status} — switched to Offline Studio Engine.`;
        }
      } catch (err) {
        apiWarning = `Local Ollama unreachable (${err.message || "connection refused"}) — switched to Offline Studio Engine.`;
      }
    }

    // 2. Cloud Providers (OpenAI ChatGPT, Google Gemini, Anthropic Claude) when online
    if (["openai", "gemini", "claude"].includes(provider)) {
      if (!navigator.onLine) {
        apiWarning = `Offline mode active (${provider.toUpperCase()} unreachable) — used Offline Studio Engine.`;
      } else {
        // Try via local server proxy first (avoids browser CORS with Anthropic/OpenAI)
        if (window.location.protocol.startsWith("http")) {
          try {
            const res = await fetch("/api/ai/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                provider,
                systemPrompt,
                userPrompt,
                settings: safeSettings
              })
            });
            if (res.ok) {
              const data = await res.json();
              if (data.text) {
                return {
                  providerUsed: data.providerUsed || provider.toUpperCase(),
                  text: data.text,
                  hooks: extractHooksFromAiText(data.text, fallbackHooks),
                  apiWarning: ""
                };
              }
              if (data.error) {
                apiWarning = `${provider.toUpperCase()} API Error: ${data.error}`;
              }
            } else {
              apiWarning = `${provider.toUpperCase()} Proxy Error (HTTP ${res.status})`;
            }
          } catch (err) {
            apiWarning = `${provider.toUpperCase()} request failed (${err.message || "network error"})`;
          }
        }

        // Direct browser fetch for OpenAI or Gemini
        if (provider === "openai" && safeSettings.openaiKey) {
          try {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${safeSettings.openaiKey}`
              },
              body: JSON.stringify({
                model: safeSettings.openaiModel || "gpt-4o-mini",
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt }
                ]
              })
            });
            if (res.ok) {
              const data = await res.json();
              const aiText = data.choices[0].message.content;
              return {
                providerUsed: `OpenAI ChatGPT (${safeSettings.openaiModel || "gpt-4o-mini"})`,
                text: aiText,
                hooks: extractHooksFromAiText(aiText, fallbackHooks),
                apiWarning: ""
              };
            } else {
              apiWarning = `OpenAI HTTP ${res.status} — verify API key or quota.`;
            }
          } catch (err) {
            apiWarning = apiWarning || `OpenAI connection error: ${err.message || "failed"}`;
          }
        } else if (provider === "openai" && !safeSettings.openaiKey && !apiWarning) {
          apiWarning = "OpenAI API key is empty — used Built-in Offline Studio Engine.";
        }

        if (provider === "gemini" && safeSettings.geminiKey) {
          try {
            const model = safeSettings.geminiModel || "gemini-2.5-flash";
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(safeSettings.geminiKey)}`;
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
              })
            });
            if (res.ok) {
              const data = await res.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (text) {
                return {
                  providerUsed: `Google Gemini (${model})`,
                  text,
                  hooks: extractHooksFromAiText(text, fallbackHooks),
                  apiWarning: ""
                };
              }
            } else {
              apiWarning = `Gemini HTTP ${res.status} — verify API key or model name.`;
            }
          } catch (err) {
            apiWarning = apiWarning || `Gemini connection error: ${err.message || "failed"}`;
          }
        } else if (provider === "gemini" && !safeSettings.geminiKey && !apiWarning) {
          apiWarning = "Gemini API key is empty — used Built-in Offline Studio Engine.";
        }

        if (provider === "claude" && !safeSettings.claudeKey && !apiWarning) {
          apiWarning = "Claude API key is empty — used Built-in Offline Studio Engine.";
        }
      }
    }

    // 3. Built-in Smart Offline Engine (Always works instantaneously offline)
    return {
      providerUsed: "Built-in Offline Studio Engine (Zero-Latency)",
      text: fallbackResult.scriptBody,
      hooks: fallbackHooks,
      structured: fallbackResult,
      apiWarning
    };
  }

  function buildStructuredPrompt(taskType, payload) {
    const bp = payload.blueprint || {};
    return `TASK: ${taskType.toUpperCase()}
NICHE: ${payload.niche || bp.niche || "Tech & AI Tools"}
TOPIC: ${payload.topic || bp.topicTitle || "High-Retention System"}
FORMAT: ${bp.format || "Long-form (16:9) + Short-form Funnel"}
LANGUAGE / DIALECT: ${payload.language || bp.language || "Hinglish (Hindi + English Creator Mix)"}
CODE-SWITCH MIX: ${bp.codeSwitchMix || "Balanced Creator Mix (50% Native / 50% English Tech Terms)"}
THUMBNAIL BADGE OVERLAY: ${bp.thumbBadgeText || "REAL PROOF"}
TONE: ${bp.tone || "High-Energy Investigative"}
PACING CADENCE: ${bp.pacing || "Fast J-Cuts & Pattern Interrupts every 45s"}
SCRIPT STYLE: ${bp.scriptStyle || "Problem -> Proof -> 3-Step System"}
VIDEO STYLE: ${bp.videoStyle || "A-Roll + 4K Screen Share + Callouts"}

Please generate:
1. 3 High-CTR Viral Hook Options (0:00-0:15) in ${payload.language || bp.language}
2. Timestamped Script with [VISUAL], [AUDIO], and [PACING] cues
3. Recommended Short-Form <-> Long-Form Upload Sequence Note.`;
  }

  /**
   * MOAT-05: DaVinci Resolve & Premiere Pro Timeline Marker Exporter
   * Converts script timestamp chapters and retention beats into a standard NLE Marker CSV
   * (`Marker Name,Start TC,End TC,Color,Notes`).
   */
  function mmSsToTimecode(mmSsStr, addSeconds = 0) {
    const parts = String(mmSsStr || "0:00").trim().split(":").map(n => parseInt(n, 10) || 0);
    let totalSec = (parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0]) + addSeconds;
    if (totalSec < 0) totalSec = 0;
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad = n => String(n).padStart(2, "0");
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}:00`;
  }

  function buildTimelineMarkersCsv(blueprint, script) {
    const bp = blueprint || {};
    const sc = script || {};
    const body = String(sc.scriptBody || "");
    const header = "Marker Name,Start TC,End TC,Color,Notes";
    const markers = [];
    const palette = ["Red", "Blue", "Green", "Yellow", "Purple", "Cyan"];

    // Match timestamp blocks such as `[0:00 - 0:15 | COLD OPEN HOOK]` or `0:15 - 1:30: Setup`
    const lineRegex = /(?:^|\n)\s*\[?(\d{1,2}:\d{2})(?:\s*[-—–]\s*(\d{1,2}:\d{2}|END|अंत))?\s*(?:\|\s*|\s*[-—:]\s*)?([^\n\]]+)\]?/gi;
    let match;
    let idx = 0;
    while ((match = lineRegex.exec(body)) !== null) {
      const startRaw = match[1];
      const endRaw = match[2];
      const labelRaw = (match[3] || `Retention Beat #${idx + 1}`).trim();
      const startTc = mmSsToTimecode(startRaw, 0);
      const endTc = endRaw && /\d{1,2}:\d{2}/.test(endRaw)
        ? mmSsToTimecode(endRaw, 0)
        : mmSsToTimecode(startRaw, 15);
      const color = palette[idx % palette.length];
      const notes = `${bp.pacing || "Pattern Interrupt"} | Visual: ${bp.videoStyle || "A-Roll + B-Roll Zoom"}`;
      markers.push({
        name: labelRaw,
        startTc,
        endTc,
        color,
        notes
      });
      idx++;
    }

    if (markers.length === 0) {
      const defaultBeats = [
        { name: "Cold Hook & Proof Frame", startTc: "00:00:00:00", endTc: "00:00:15:00", color: "Red", notes: "Show end outcome + Thumbnail Badge alignment" },
        { name: "Problem & Bottleneck Setup", startTc: "00:00:15:00", endTc: "00:01:30:00", color: "Yellow", notes: "J-Cut into diagram / comparison chart" },
        { name: "Core System Execution", startTc: "00:01:30:00", endTc: "00:05:30:00", color: "Blue", notes: "Pattern interrupt every 45 seconds" },
        { name: "Live Proof & Benchmark", startTc: "00:05:30:00", endTc: "00:07:30:00", color: "Green", notes: "4K screen zoom + before/after metrics" },
        { name: "Abrupt Value Bridge CTA", startTc: "00:07:30:00", endTc: "00:08:00:00", color: "Purple", notes: "Trigger End-Screen early while speaking" }
      ];
      markers.push(...defaultBeats);
    }

    const csvRows = markers.map(m =>
      [
        `"${String(m.name).replace(/"/g, '""')}"`,
        `"${m.startTc}"`,
        `"${m.endTc}"`,
        `"${m.color}"`,
        `"${String(m.notes).replace(/"/g, '""')}"`
      ].join(",")
    );

    return [header, ...csvRows].join("\r\n");
  }

  /**
   * Admin Diagnostics & Telemetry Logs Fetcher
   */
  async function fetchAdminLogs() {
    if (window.location.protocol.startsWith("http")) {
      try {
        const res = await fetch("/api/admin/logs", { method: "GET" });
        if (res.ok) {
          return await res.json();
        }
      } catch (_) {}
    }
    return {
      ok: true,
      mode: "Offline Browser Mode",
      uptimeSeconds: 0,
      requestsServed: 0,
      entries: [
        {
          timestamp: new Date().toISOString(),
          level: "INFO",
          event: "OFFLINE_SANDBOX_ACTIVE",
          detail: "Running in standalone browser storage mode (IndexedDB + LocalStorage active)."
        }
      ]
    };
  }

  // Dual-Mode Google Drive Sync (Local Drive Folder + Browser Directory Picker + REST API w/ Offline Queue)
  async function syncToGoogleDrive(state, options = {}) {
    const report = {
      localServerSync: false,
      browserFolderSync: false,
      cloudApiSync: false,
      queuedOffline: false,
      savedFiles: [],
      fileDetails: [],
      browserFolderName: "",
      message: ""
    };

    const markdownSummary = buildMarkdownExport(state);
    const csvCalendar = buildCsvCalendar(state.uploadSequence || []);
    // AUD-01: Redact plaintext API keys before writing shared backup JSON to disk or Google Drive
    const sanitizedState = sanitizeStateForExport(state);
    const fullJson = JSON.stringify(sanitizedState, null, 2);
    const nowTime = new Date().toLocaleTimeString();

    // 1. Local Backend Server Google Drive Folder Sync (Works 100% Offline on Windows)
    if (window.location.protocol.startsWith("http")) {
      try {
        const res = await fetch("/api/drive/sync-local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            folderPath: state.settings.googleDriveFolderPath || "d:\\YT APP\\GoogleDrive_Sync",
            markdownSummary,
            csvCalendar,
            fullJson,
            niche: state.activeNiche
          })
        });
        if (res.ok) {
          const data = await res.json();
          report.localServerSync = true;
          report.savedFiles = data.files || [];
          report.fileDetails = data.fileDetails || [];
        }
      } catch (_) {}
    }

    // 2. Browser Native Directory Handle (if user selected a local Google Drive folder in browser)
    if (options.pickDirectory && window.showDirectoryPicker) {
      try {
        directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      } catch (_) {}
    }

    if (directoryHandle) {
      try {
        await writeTextFileToHandle(directoryHandle, "YT_Studio_Blueprint_and_Script.md", markdownSummary);
        await writeTextFileToHandle(directoryHandle, "YT_Upload_Sequence_Calendar.csv", csvCalendar);
        await writeTextFileToHandle(directoryHandle, "YT_Studio_Full_Backup.json", fullJson);
        report.browserFolderSync = true;
        report.browserFolderName = directoryHandle.name || "Selected Browser Folder";
        state.browserFolderName = report.browserFolderName;
        report.savedFiles.push("YT_Studio_Blueprint_and_Script.md", "YT_Upload_Sequence_Calendar.csv", "YT_Studio_Full_Backup.json");
        if (report.fileDetails.length === 0) {
          report.fileDetails = [
            { name: "YT_Studio_Blueprint_and_Script.md", sizeKb: (markdownSummary.length / 1024).toFixed(1), updatedAt: nowTime },
            { name: "YT_Upload_Sequence_Calendar.csv", sizeKb: (csvCalendar.length / 1024).toFixed(1), updatedAt: nowTime },
            { name: "YT_Studio_Full_Backup.json", sizeKb: (fullJson.length / 1024).toFixed(1), updatedAt: nowTime }
          ];
        }
      } catch (_) {}
    }

    // 3. Google Drive REST API v3 (if OAuth Token provided)
    if (state.settings.googleDriveToken) {
      if (navigator.onLine) {
        try {
          const uploaded = await uploadMultipartToDriveApi(
            state.settings.googleDriveToken,
            `YT_Studio_${state.activeNiche.replace(/[^a-z0-9]/gi, "_")}.md`,
            "text/markdown",
            markdownSummary
          );
          if (uploaded) {
            report.cloudApiSync = true;
          }
        } catch (_) {
          state.driveSyncQueue = state.driveSyncQueue || [];
          state.driveSyncQueue.push({
            queuedAt: new Date().toISOString(),
            niche: state.activeNiche,
            sizeBytes: markdownSummary.length
          });
          report.queuedOffline = true;
        }
      } else {
        // Offline Queue
        state.driveSyncQueue = state.driveSyncQueue || [];
        state.driveSyncQueue.push({
          queuedAt: new Date().toISOString(),
          niche: state.activeNiche,
          sizeBytes: markdownSummary.length
        });
        report.queuedOffline = true;
      }
    }

    if (report.fileDetails.length > 0) {
      state.lastSyncedFiles = report.fileDetails;
    }
    state.lastDriveSyncAt = new Date().toISOString();
    await saveState(state);

    const parts = [];
    if (report.localServerSync) {
      parts.push(`✅ Saved to ${state.settings.googleDriveFolderPath} (Markdown, CSV & Redacted Backup ready)`);
    }
    if (report.browserFolderSync) {
      parts.push(`✅ Synced to folder "${report.browserFolderName}"`);
    }
    if (report.cloudApiSync) {
      parts.push("☁️ Uploaded to Google Drive Cloud API");
    }
    if (report.queuedOffline) {
      parts.push("⏳ Queued for Cloud Sync when internet connects");
    }
    if (parts.length === 0) {
      parts.push("💾 Saved to Browser Storage • Run Start-App.bat or click 'Pick Folder' for Google Drive folder sync");
    }
    report.message = parts.join(" • ");
    return report;
  }

  async function openLocalSyncFolder(folderPath) {
    const target = folderPath || "d:\\YT APP\\GoogleDrive_Sync";
    if (window.location.protocol.startsWith("http")) {
      try {
        const res = await fetch("/api/drive/open-folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderPath: target })
        });
        if (res.ok) {
          return { opened: true, folder: target };
        }
      } catch (_) {}
    }
    try {
      await navigator.clipboard.writeText(target);
    } catch (_) {}
    return { opened: false, folder: target };
  }

  async function writeTextFileToHandle(dirHandle, fileName, content) {
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async function uploadMultipartToDriveApi(accessToken, filename, mimeType, content) {
    const metadata = { name: filename, mimeType };
    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const body =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n\r\n` +
      content +
      closeDelim;

    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body
    });
    return res.ok;
  }

  function buildMarkdownExport(state) {
    const bp = state.currentBlueprint || {};
    const sc = state.currentScript || {};
    const topics = (state.topics || [])
      .map((t, idx) => `${idx + 1}. **${t.title}** (${t.format}) — Search: ${t.searchScore}/100 | Viral: ${t.viralScore}/100`)
      .join("\n");
    const seq = (state.uploadSequence || [])
      .map(s => `- **Step ${s.step} (${s.date} • ${s.dayTime})**: [${s.format}] ${s.title} — *${s.linkedTo}* (${s.status})`)
      .join("\n");

    return `# YouTube Content Studio Blueprint — ${state.activeNiche}
Generated: ${new Date().toLocaleString()}
Language: ${state.language} | Target Region: ${state.region}

## 1. Top Ranked Niche Topics
${topics}

## 2. Creative Production Blueprint
- **Selected Topic**: ${bp.topicTitle}
- **Format**: ${bp.format} (Target: ${bp.targetDuration})
- **Code-Switching Mix**: ${bp.codeSwitchMix || "Balanced Creator Mix (50% Native / 50% English Tech Terms)"}
- **Thumbnail Badge Overlay**: ${bp.thumbBadgeText || "REAL PROOF"}
- **Tone**: ${bp.tone}
- **Pacing & Retention Cadence**: ${bp.pacing}
- **Script Style**: ${bp.scriptStyle}
- **Video & Visual Style**: ${bp.videoStyle}
- **Language & Title Strategy**: ${bp.thumbnailAndTitleNotes}
- **Upload Sequence Rule**: ${bp.uploadSequenceNote}

## 3. Viral Hooks & Full Script
### Hook Options
${(sc.hooks || []).map((h, i) => `${i + 1}. "${h}"`).join("\n")}

### Script Body
\`\`\`text
${sc.scriptBody || ""}
\`\`\`

## 4. Smart Upload Sequence (Short <-> Long-Form Funnel)
${seq}
`;
  }

  function buildCsvCalendar(sequence) {
    const header = "Step,Date,DayTime,Format,Role,Title,LinkedFunnel,Status,SpacingNote";
    const rows = (sequence || []).map(s =>
      [
        s.step,
        `"${(s.date || "").replace(/"/g, '""')}"`,
        `"${(s.dayTime || "").replace(/"/g, '""')}"`,
        `"${(s.format || "").replace(/"/g, '""')}"`,
        `"${(s.role || "").replace(/"/g, '""')}"`,
        `"${(s.title || "").replace(/"/g, '""')}"`,
        `"${(s.linkedTo || "").replace(/"/g, '""')}"`,
        `"${(s.status || "").replace(/"/g, '""')}"`,
        `"${(s.spacingNote || "").replace(/"/g, '""')}"`
      ].join(",")
    );
    return [header, ...rows].join("\r\n");
  }

  /**
   * LOOP-07: Export Standard RFC 5545 .ICS Calendar File (`buildIcsCalendar`)
   * Generates a valid iCalendar string with VEVENT + 60-minute VALARM reminder for each upload step.
   */
  function buildIcsCalendar(sequence, nicheName = "YouTube Channel") {
    const cleanNiche = String(nicheName || "YouTube Channel").replace(/[\r\n]+/g, " ").trim();
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//YTBender Studio//EN",
      "CALSCALE:GREGORIAN",
      `X-WR-CALNAME:YTBender Upload Schedule - ${cleanNiche}`
    ];

    const nowUtc = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    (sequence || []).forEach((item, idx) => {
      let ymd = "";
      if (item && item.date && /^\d{4}-\d{2}-\d{2}$/.test(String(item.date).trim())) {
        ymd = String(item.date).trim().replace(/-/g, "");
      } else {
        const fallbackDate = new Date(Date.now() + (idx + 1) * 86400000);
        ymd = fallbackDate.toISOString().split("T")[0].replace(/-/g, "");
      }

      const step = item.step || idx + 1;
      const format = String(item.format || "Video").replace(/[\r\n]+/g, " ").trim();
      const title = String(item.title || `Upload #${step}`).replace(/[\r\n]+/g, " ").trim();
      const role = String(item.role || "Funnel Upload").replace(/[\r\n]+/g, " ").trim();
      const linkedTo = String(item.linkedTo || "Channel Funnel").replace(/[\r\n]+/g, " ").trim();
      const status = String(item.status || "Planned").replace(/[\r\n]+/g, " ").trim();
      const spacingNote = String(item.spacingNote || "").replace(/[\r\n]+/g, " ").trim();

      lines.push(
        "BEGIN:VEVENT",
        `UID:ytbender-step-${step}-${ymd}@ytbender.local`,
        `DTSTAMP:${nowUtc}`,
        `DTSTART:${ymd}T123000`,
        `DTEND:${ymd}T133000`,
        `SUMMARY:[YT Step #${step} - ${format}] ${title}`,
        `DESCRIPTION:Role: ${role} | Funnel Link: ${linkedTo} | Status: ${status} | Note: ${spacingNote}`,
        "BEGIN:VALARM",
        "TRIGGER:-PT60M",
        "ACTION:DISPLAY",
        `DESCRIPTION:Upload Reminder: ${title}`,
        "END:VALARM",
        "END:VEVENT"
      );
    });

    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  return {
    getDefaultState,
    sanitizeStateForExport,
    loadState,
    saveState,
    checkEnvironmentStatus,
    fetchYouTubeTrends,
    parseImportedYouTubeFile,
    analyzeImportedCsv,
    extractHooksFromAiText,
    generateWithAI,
    buildStructuredPrompt,
    buildTimelineMarkersCsv,
    fetchAdminLogs,
    syncToGoogleDrive,
    openLocalSyncFolder,
    buildMarkdownExport,
    buildCsvCalendar,
    buildIcsCalendar
  };
})();
