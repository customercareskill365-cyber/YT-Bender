# Project: PulseForge YT Studio — Decluttered UI/UX Redesign & Usability Overhaul

## Architecture
PulseForge YT Studio is an offline-first single-page web application for YouTube content creators.
- **Presentation Layer**: `index.html` (DOM structure, semantic regions), `css/styles.css` (Dark-mode CSS design system, responsive grid layouts).
- **Client Controller & State**: `js/app.js` (UI event dispatch, DOM data-binding, reactive state orchestration via `appState`).
- **Services & Storage Layer**: `js/services.js` (Multi-tier persistence: Server REST API `/api/db` -> IndexedDB `YTStudioOfflineDB` -> `localStorage`; YouTube Data API v3 & scraper proxy; AI Hub connector; Google Drive dual-mode sync).
- **Offline Intelligence Engine**: `js/offline-intelligence.js` (Deterministic rules & data for 7 primary niches + custom fallback, 4 languages, topic generation, creative blueprint synthesis, teleprompter script & viral hooks generation, 10-day cross-linked Shorts/Long-form funnel upload sequencing).
- **Local Windows Backend**: `server.ps1` (PowerShell HTTP 1.1 server via `System.Net.Sockets.TcpListener` on port 8080; endpoints `/api/status`, `/api/db`, `/api/drive/sync-local`, `/api/youtube/search`, `/api/ai/generate`).
- **PWA Service Worker**: `sw.js`, `manifest.json` (Offline asset caching).

---

## Feature Inventory
Every feature identified during the Phase 0 Survey is inventoried below and mapped to a milestone.

| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Content Creator Persona Usability Audit | Formal analysis of 3 creator personas across YouTube search, Google Drive, and local device linking | M1 | Survey | DONE |
| 2 | Actionable Usability Solutions Matrix | Detailed issue-to-solution mapping for all 20 identified friction points (SOL-01..SOL-20) | M1 | Survey | DONE |
| 3 | Decluttering Workflow Blueprint | Architectural wireframe and specifications consolidating 6 tabs into 3 progressive creator stages | M1 | Survey | DONE |
| 4 | 3-Stage Primary Workflow Redesign | Transform UI into Stage 1 (Topic & Trend Discovery), Stage 2 (Script & Hook Studio), Stage 3 (Calendar & Release) | M2 | Survey / R2 | DONE |
| 5 | Unified Channel Niche Bar | Eliminate duplicate inputs in sidebar and tabs; provide single intuitive niche selector in header | M2 | Survey / R2 | DONE |
| 6 | Jargon Removal & Creator Terminology | Replace developer jargon (0ms, IndexedDB, Ollama, WPM, RPM) with intuitive creator language and badges | M2 | Survey / R2 | DONE |
| 7 | Enhanced Teleprompter Script Studio | Dual-mode script editor with 1-click viral hook application, word count, reading pace, and copy actions | M2 | Survey / R2 | DONE |
| 8 | Streamlined Storage & Sync Drawer | 1-click local drive sync, clear status indicators, and collapsible advanced API settings | M2 | Survey / R2 | DONE |
| 9 | Offline Niche & Trend Database Preservation | 7 primary niches + custom profile generator with viral velocity and benchmark statistics | M2, M3 | Survey / R3 | DONE |
| 10 | Deterministic Topic Generator Preservation | Generate 6 strategic topics with search and viral velocity scores and funnel roles | M2, M3 | Survey / R3 | DONE |
| 11 | Creative Blueprint Generator Preservation | 8 production parameters, duration calculation, and 5-segment retention pacing timeline map | M2, M3 | Survey / R3 | DONE |
| 12 | Script & Hook Generator Preservation | 3 viral opening hooks (0:00-0:15) and timestamped teleprompter script across 4 languages | M2, M3 | Survey / R3 | DONE |
| 13 | Smart Upload Sequence Planner Preservation | 10-day cross-linked release calendar pairing Shorts and Long-form videos | M2, M3 | Survey / R3 | DONE |
| 14 | 1-Click AI Prompt Bridge Preservation | Copyable system prompt template and formatted context for external LLMs (ChatGPT, Claude, etc.) | M2, M3 | Survey / R3 | DONE |
| 15 | Multi-Tier Persistence Preservation | Synchronized storage across Local Server Disk (`data/yt_studio_db.json`), IndexedDB, and LocalStorage | M2, M3 | Survey / R3 | DONE |
| 16 | YouTube Trend Search & Fallback Preservation | 3-tier fetch: API v3 -> Server Scraper -> Offline benchmark fallback | M2, M3 | Survey / R3 | DONE |
| 17 | Dual-Mode Google Drive Sync Preservation | Local folder write (`d:\YT APP\GoogleDrive_Sync`), directory picker, and Cloud REST API mode | M2, M3 | Survey / R3 | DONE |
| 18 | Local Server PowerShell HTTP Daemon Preservation | `server.ps1` on port 8080 with CORS, `/api/status`, `/api/db`, `/api/drive/sync-local` endpoints | M2, M3 | Survey / R3 | DONE |
| 19 | 4-Tier Verification Suite | Automated verification suite (DOM IDs, syntax balancing, HTMLFile COM parser, endpoints) | M2, M3 | Project Pattern | DONE |
| 20 | Adversarial Testing & Hardening | Adversarial stress testing of contracts and edge cases | M1, M2 | Project Pattern | DONE |
| 21 | Forensic Integrity Audit | Independent verification by teamwork_auditor verifying authentic implementation and zero facade code | M1, M2 | Project Pattern | DONE (CLEAN) |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Creator Usability Audit & Solutions Matrix | Publish authoritative `AUDIT_REPORT.md` documenting user journeys for Maya, Alex, Liam; 20-issue solutions matrix; and decluttering layout blueprint | Phase 0 Survey | DONE |
| M2 | Decluttered UI/UX Redesign & Implementation | Redesign and refactor `index.html`, `css/styles.css`, and `js/app.js` to eliminate clutter, streamline into 3 creator stages, and preserve all offline/online integrations | M1 | DONE |

---

## Code Layout & Write Boundaries
- `AUDIT_REPORT.md`: Owned by Milestone 1 Worker.
- `index.html`: Owned by Milestone 2 Worker.
- `css/styles.css`: Owned by Milestone 2 Worker.
- `js/app.js`: Owned by Milestone 2 Worker.
- `js/services.js`: Read-only / preserved.
- `js/offline-intelligence.js`: Read-only / preserved.
- `server.ps1`: Read-only / preserved.
