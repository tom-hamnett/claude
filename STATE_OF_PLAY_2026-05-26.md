# APEX State of Play — 26 May 2026

**Audience:** Tom Hamnett + strategy Claude session  
**Repo:** `tom-hamnett/claude`, branch `claude/setup-react-area-chart-RBJ8C`  
**Runtime:** GitHub Codespaces (Node 20, Express 5, Vite 8, SQLite)

---

## (a) What Works Today — In Code

APEX is a surprisingly complete application. Every route is implemented, every component renders, and there are zero TODO/FIXME comments of substance (one minor enhancement note in `SourceTables.jsx`).

**Fully working features:**

| Feature | Key Files | Notes |
|---------|-----------|-------|
| Programme CRUD + multi-programme support | `server/index.js` (40+ routes), `server/db.js` (10 tables) | Full lifecycle with JSON data storage |
| AI Chat | `src/apex/components/AIChat.jsx`, `server/index.js` :615–646 | Persistent per-context, file upload, 5-level engine fallback |
| 6 LLM Providers | `server/ai/providers.js` | Anthropic, OpenAI, Gemini, Azure OpenAI, GitHub Copilot, Custom endpoint |
| 8 Data Source Connectors | `server/sources/fetchers.js` | SharePoint (shared + IT-managed), OneDrive, Google Drive, GCS, HTTP, ZIP |
| Smart Upload (6-step wizard) | `src/apex/metrics/SmartUpload.jsx`, `server/sources/smartIngest.js` | Upload → Preview → Template match → Version diff → Gap detection → Confirm |
| KPI Engine | `server/index.js` :358–461 | CRUD + dimensional aggregation (sum/count/avg) + RAG thresholds |
| 9 Metric Renderers | `src/apex/metrics/MetricRenderer.jsx` (532 LOC) | Bar, Line, Area, Composed charts via Recharts. Hardcoded for IHG PE metrics. |
| Data Explorer | `src/apex/metrics/DataExplorer.jsx` | Generic table view + filters + CSV export + pivot mode |
| Gap Detection | `server/index.js` :830–908 | Automated: missing sources, stale data, dimension gaps, null values |
| Tableau WDC + Power BI M scripts | `server/index.js` :649–825, `powerbi/*.m` | Per-domain JSON/CSV feeds, Web Data Connector HTML page |
| 4-panel programme view | `src/apex/panels/` (4 files) | Overview, Portfolio, Plan, Risks (RAID log) |
| Full audit trail | `audit_log` table, `PATCH /api/programmes/:id` | Before/after JSON snapshots on every change |
| Background source polling | `server/sources/scheduler.js` (92 LOC) | Configurable per-source interval, default 60 min |
| Settings UI | `src/apex/settings/` | Engine manager (create/test/default) + Source manager (create/sync/enable) |

**Database:** 10 SQLite tables with WAL mode, foreign keys, proper indexes. Production-grade for a single-tenant tool.

**Frontend:** 16 React 19 components, ~2,100 LOC, all inline styles (no CSS files), custom pub/sub state management via `src/apex/data/store.js`.

---

## (b) What's Stubbed or Partial

Almost nothing. This is unusually clean for a prototype.

- **Metric renderers are hardcoded** to 9 IHG PE metrics (CRF Collection, CMH P2P Rollout, etc.). New metrics get a fallback JSON view — functional but not visual. Adding a new chart type requires editing `MetricRenderer.jsx`.
- **Document upload** accepts any file but only auto-parses XLSX/CSV. PDFs, Word docs etc. are stored but not text-extracted.
- **No automated tests.** Zero. No test files exist anywhere in the repo.
- **One minor TODO** in `SourceTables.jsx` (~line 30): "could pre-load via URL" for SmartUpload from pending ingestions.
- **AI chat doesn't auto-execute** suggestions. It can recommend data connections or KPI configs but the user must complete them manually in the UI.

---

## (c) The LLM Provider System

`server/ai/providers.js` defines 6 providers, each as a `call(engine, system, messages)` function returning `{ text, raw }`:

| Provider key | Endpoint | Auth | Default model |
|-------------|----------|------|---------------|
| `anthropic` | `api.anthropic.com` | `ANTHROPIC_API_KEY` or engine `api_key` | `claude-sonnet-4-20250514` |
| `github-copilot` | `models.inference.ai.azure.com` | `GITHUB_TOKEN` or engine `api_key` | `gpt-4o` |
| `azure-openai` | `{endpoint_url}/openai/deployments/{deployment}/...` | engine `api_key` + `endpoint_url` + `deployment_name` | — |
| `openai` | `api.openai.com` | engine `api_key` | `gpt-4-turbo` |
| `gemini` | `generativelanguage.googleapis.com` | `GEMINI_API_KEY` or engine `api_key` | `gemini-1.5-pro` |
| `custom` | engine `endpoint_url` | optional Bearer token | — |

**User selects provider** via Settings → Engines Manager UI (`EnginesManager.jsx`). Each programme can have multiple engines; one is marked default. The `/api/ai` route (line 615) resolves: explicit engineId → programme default → first engine → env var fallback.

**To add "Microsoft Foundry — Claude Opus":** This depends on what API shape Foundry exposes.

- **If Foundry exposes an OpenAI-compatible `/chat/completions` endpoint** (likely, since Azure AI Foundry does this for Claude models): Use the existing `azure-openai` provider. The user enters their Foundry endpoint URL, deployment name, and API key in the UI. Zero code changes. This is the most probable path.
- **If Foundry uses the Anthropic Messages API format:** Use the existing `anthropic` provider but pointed at the Foundry endpoint. Would need a ~5-line change to make the endpoint URL configurable (currently hardcoded to `api.anthropic.com`).
- **If Foundry has a bespoke API:** Add a ~30-line `callFoundry()` function following the existing pattern, plus one entry in the `PROVIDERS` map. ~30 minutes of work.

**Bottom line:** The provider system is well-designed for this exact scenario. Most likely it's a config-only change.

---

## (d) The SharePoint Integration Story

`server/sources/fetchers.js` implements three Microsoft connectors:

1. **`sharepoint-shared`** (lines 106–168): Uses the Microsoft Graph `/shares` endpoint. You paste an anonymous sharing link to a SharePoint folder; the code base64-encodes it into a `u!{encoded}` token and calls Graph to list files. **No API keys, no app registration, no IT ticket.** Recursively walks subfolders. Filters by file extension. This genuinely works for folders shared with "Anyone with the link."

2. **`sharepoint-folder`** (lines 210–252): Azure AD client credentials flow. Requires `tenantId`, `clientId`, `clientSecret` from an app registration. Calls Graph API to list files in a specific site/library path. **Works but needs IT to create the app registration.**

3. **`onedrive-folder`** (lines 254–288): Same auth flow, targeting a specific user's OneDrive. **Same IT dependency.**

**What would change for IHG?** The `sharepoint-shared` approach works immediately if Tom creates a sharing link to the data folder. The IT-managed approaches require an Azure AD app registration — a ticket to IHG IT. The fetchers themselves are production-ready; the blocker is auth, not code.

**Caveat:** `sharepoint-shared` relies on anonymous sharing links. Many enterprises (likely including IHG) disable these or restrict them to "People in your organization." If so, the `sharepoint-folder` approach with an app registration is the only path, and that's an IT ticket.

---

## (e) Deployment Readiness

**Current state:** Development only. The repo has:

- `.devcontainer/devcontainer.json` — one-click GitHub Codespaces launch (Node 20, auto-install, auto-build, port 3001 forwarded)
- `package.json` scripts: `dev`, `build`, `server`, `start`

**What's missing for production:**

- No `Dockerfile`, `Procfile`, `render.yaml`, `fly.toml`, or `vercel.json`
- No `.github/workflows/` — zero CI/CD
- No authentication layer — all API routes are open
- No HTTPS termination config (relies on Codespaces proxy or reverse proxy)
- SQLite on disk — fine for single-instance, not for multi-instance or ephemeral containers without persistent volumes

**Could it deploy to Azure App Service today?**  
Almost. You'd need:
1. A `Dockerfile` or App Service Node.js config (~10 lines)
2. A persistent volume or mount for `apex.db` (SQLite)
3. Environment variables set in App Service config (LLM keys)
4. An auth layer (Azure AD Easy Auth would bolt on with zero code changes)

The app itself is a standard Express server serving a Vite-built SPA. No exotic dependencies. `better-sqlite3` needs a native build but works fine on Linux App Service. **Estimated effort: 2–4 hours to a working deployment, plus IT coordination for networking/DNS.**

---

## (f) Five Highest-Priority Gaps

Ranked by (effort to fix) × (importance to "Tom using APEX at IHG on his work laptop"):

| # | Gap | Effort | Importance | Why |
|---|-----|--------|------------|-----|
| 1 | **No authentication** — every route is open to anyone who can reach the server | 2–4 hrs | Critical | IHG infosec will block deployment without auth. Azure AD Easy Auth is the fastest fix. |
| 2 | **No production deployment config** — runs only in Codespaces | 2–4 hrs | Critical | Tom needs a stable URL from his work laptop, not a Codespace that sleeps after 30 min. Azure App Service or Azure Container App is the target. |
| 3 | **LLM provider endpoint for Foundry Claude** — may need a small code tweak | 0–1 hr | High | If Foundry uses OpenAI-compatible API, it's config-only. If not, ~30 lines. Must verify the API shape IHG Foundry exposes. |
| 4 | **SharePoint auth in enterprise context** — anonymous sharing likely blocked | 0 hrs code, ? hrs IT | High | Need to confirm whether IHG allows anonymous sharing links. If not, need app registration (IT ticket) for the `sharepoint-folder` fetcher. |
| 5 | **No automated tests or CI** — changes are untested | 4–8 hrs | Medium | Matters for maintainability, especially if Copilot Studio or another AI assistant will be modifying the code. Not blocking for initial launch. |

---

## (g) Recommended Next Action

**Get the Foundry API shape confirmed and deploy to Azure App Service.** Everything else — SharePoint auth, Copilot Studio agents, Power BI dashboards — depends on APEX being reachable from Tom's work laptop at a stable URL with IHG-approved auth. The code is ready; the blockers are all infrastructure. Tom should raise one IT ticket requesting: (1) an Azure App Service instance (or Container App) with a persistent volume, (2) Azure AD Easy Auth enabled on it, (3) the Foundry API endpoint URL and key format for Claude Opus, and (4) an Azure AD app registration for SharePoint Graph API access. That single ticket unblocks gaps #1–#4 simultaneously. While waiting for IT, the existing Codespace remains a working demo environment — useful for refining the dashboard and testing with sample data. Don't write more features; deploy what exists.

---

*Report generated by codebase audit, 26 May 2026.*
