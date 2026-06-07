# APEX PMO — Where We Are (Session End: 7 June 2026)

## TL;DR
The **product works**. SharePoint ingestion, document classification, AI chat,
and Excel parsing are all built and proven. The entire evening's struggle was
**infrastructure** (Codespace instability, then Azure deployment quirks), not
the application itself.

Three root-cause fixes were made tonight to get Azure stable. The app should
come up clean once the final deploy completes with the app setting below.

---

## DO THIS FIRST (tomorrow morning)

### 1. Add the Azure app setting (one-time, required)
Azure Portal → **APEX-PMO** → **Settings → Environment variables** →
**+ Add** under Application settings:
- **Name:** `SCM_DO_BUILD_DURING_DEPLOYMENT`
- **Value:** `true`
- **Apply / Save**

This tells Azure to install dependencies on the server (compiling the native
`better-sqlite3` module correctly). Without it, the deploy crashes with
"Cannot find package better-sqlite3".

### 2. Trigger a fresh deploy
Either push any change, or in Azure: **Deployment Center → Logs → re-run the
latest workflow**. The first server-side build takes ~5-8 minutes.

### 3. Watch the Log Stream for success
Look for these lines WITHOUT a crash after:
```
[db] Path: /home/data/apex.db
[db] Persisted state — engines: 0, documents: 0, data tables: 0, sources: 0
[apex] Server running on http://0.0.0.0:8080
```
If you see those, you're on stable ground.

### 4. Configure once (now persists forever)
- **AI Engines:** Claude — API key, model `claude-sonnet-4-20250514`, set default
- **Data Sources:** Connect Microsoft (Tenant `2762c43f-29c1-448a-89f6-7ac903cf8316`,
  Client `7a33aa4f-fd98-4635-80f5-32445756ffd1`) → device code sign-in →
  add SharePoint source (sharing link, recursive = true)
- Let auto-ingest run in the background (throttled: 3 docs + 2 spreadsheets/min)

### 5. Test
AI chat: "What are the current PE initiative statuses? Cite your sources."

---

## URLs
- **APEX (Azure):** https://apex-pmo-hkg8bbembhcvb3fd.westeurope-01.azurewebsites.net
- **Codespace (fallback):** https://github.com/codespaces → APEX PMO
- **Branch:** claude/setup-react-area-chart-RBJ8C

---

## What was fixed tonight (root causes)
1. **DB persistence** — database moved from `wwwroot` (wiped on every deploy)
   to `/home/data` (persistent). Stops config/data vanishing.
2. **SQLite journal mode** — Azure `/home` is a network share where WAL mode
   crashes. Now uses DELETE mode on Azure, WAL locally.
3. **Deployment** — stopped shipping pre-built `node_modules` (Azure corrupted
   the tar.gz). Azure now installs deps server-side, compiling native modules
   correctly.
4. **Auto-ingest throttling** — 3 docs + 2 spreadsheets per 60s cycle, so the
   initial 85-file ingestion doesn't overload the server.

## What's proven working
- Microsoft OAuth (device code) — Tom.Hamnett@ihg.com authenticated
- Recursive SharePoint scan — 88 files across 49 folders, follows shortcuts 1 level
- Document text extraction (.pptx, .pdf, .docx) via officeparser + XML fallback
- Document classification — type / date / audience level / is_latest
- Excel parsing into structured data tables (for KPIs + Power BI)
- AI chat with metadata-aware context injection (latest docs prioritised)
- Multi-provider LLM support (Claude working; Gemini Vertex AI built, needs IHG creds)
- Azure App Service on B1 tier (pay-as-you-go, ~£13/mo, covered by free trial credit)

## Known limitations / next priorities
1. **Gemini Enterprise** — Vertex AI provider built, needs IHG GCP project +
   credentials (project ID, region, service account/token). Consumer Gemini
   API key won't work with enterprise account.
2. **Multimodal slide parsing** (Workstream 3) — read PowerPoint slides as
   images to capture RAG colours that text extraction loses. Not yet built.
3. **Power BI** — Tom has a Pro licence. APEX exposes REST endpoints
   (`/api/programmes/ihg-pe/tableau` and `?format=csv`) that Power BI can
   consume as a web data source. Dashboard design is in APEX-dashboard-design.txt.
4. **Dashboard build** — three-level pyramid (CPO view → domain views → detail)
   designed but not built. See APEX-dashboard-design.txt.
5. **Large PowerPoint truncation** — XML extraction caps at 80K chars; very
   large decks may lose later slides. Revisit with multimodal.

## Reference docs in repo
- `APEX-dashboard-design.txt` — full CPO dashboard / data viz design
- `APEX-marketing-brief.txt` — product positioning for Quantum Tools site
- `APEX-IT-briefing.txt` — security/architecture brief for IT
- `WHERE-WE-ARE.md` — this file
