# APEX — complete functional and technical specification

**Purpose of this document.** Everything APEX does today, in enough detail that a developer
(or a Cowork agent) can rebuild, extend or re-platform it without reading the source first.
It also sets out how APEX links to the validated Power BI metric layer, and where the
Market Trends and Customer Insights tools plug in.

Written 23 September 2026, from the code as it stands on branch
`claude/setup-react-area-chart-RBJ8C`. Line counts and endpoint lists are actual, not
approximate.

**Companion document:** [`COWORK-KICKOFF-PROMPT.md`](COWORK-KICKOFF-PROMPT.md) — the prompt
to start the Cowork build with.

---

## Part 1 — What APEX is

APEX is a **programme intelligence workspace**: a single-page React app over an Express API
and a SQLite database, with a persistent AI assistant that has read access to everything in
the workspace.

It was built to answer a specific frustration: a Programme Manager's evidence lives in
hundreds of PowerPoint decks, Excel trackers and Word updates scattered across SharePoint,
and none of it is queryable. APEX ingests all of it, extracts the text, classifies it by
type and date, and puts an AI assistant on top that can answer *"what did we tell the
SteerCo about GC in April, and does the latest data still support it?"*

Three things make it more than a chatbot over a folder:

1. **It knows which document is current.** Every ingested file is classified by type
   (weekly / monthly / SteerCo / QBR / audit / metrics / draft / source) and dated from its
   filename, and exactly one document per type is flagged `is_latest`. The AI is told to
   prefer those, and given explicit conflict-resolution rules.
2. **It knows what is missing.** A gap engine compares defined KPIs against the data
   actually present and reports missing periods, missing dimension values, null-heavy
   columns, stale tables and untracked metrics.
3. **It never writes silently.** The AI proposes structured changes as a JSON block; a
   human accepts or rejects each one; every accepted change is written to an append-only
   audit log with before/after JSON.

### Size

| Area | Files | Lines |
|---|---|---|
| Backend (Express, Node 22) | 11 | ~2,900 |
| Frontend (React 19, Vite 8) | 24 | ~4,050 |
| **Total** | **35** | **~6,950** |

Dependencies are deliberately few: `express`, `better-sqlite3`, `multer`, `cors`,
`dotenv`, `xlsx`, `officeparser`, `adm-zip` on the server; `react`, `react-dom`,
`recharts` on the client. No ORM, no state library, no UI framework, no router.

---

## Part 2 — Running it locally

**APEX is already a local application.** Azure was the exception, not the design. Everything
it needs runs on one machine with no internet dependency except the LLM API call.

```bash
npm install
npm run dev        # Vite dev server on :5173, Express API on :3001, /api proxied
```

or as a single process:

```bash
npm run build && npm run server    # Express serves the built SPA and the API on :3001
```

### Where state lives

| Thing | Location | Notes |
|---|---|---|
| Database | `data/apex.db` | SQLite, WAL journal mode locally |
| Uploaded / downloaded files | `uploads/` | Temp workspace; auto-ingest deletes after extraction |
| Everything else | in the database | Programmes, documents, chat, KPIs, engines, sources |

`server/db.js` resolves the database directory in this order: `DB_PATH` env var →
`/home/data` if `WEBSITE_INSTANCE_ID` is set (Azure) → `./data`. **For the local build,
set `DB_PATH` explicitly** and the Azure branch never fires.

### Two lines that must change for a local-only build

These are the exact lines that produced the infosec finding:

```js
// server/index.js:36   — allows any origin to call the API
app.use(cors());

// server/index.js:1164 — binds to every network interface, not just this machine
app.listen(PORT, "0.0.0.0", () => { ... });
```

For a desktop build both should become loopback-only:

```js
app.use(cors({ origin: "http://127.0.0.1:3001" }));
app.listen(PORT, "127.0.0.1", () => { ... });
```

With `127.0.0.1` the server is unreachable from any other machine, including anything on
the corporate network. It is not "a website that happens to be internal" — it is a process
on one laptop, in the same category as Excel. That is a materially different conversation
with infosec, and worth stating in exactly those terms.

---

## Part 3 — The data model

Thirteen tables, all created idempotently in `server/db.js` on boot, with four `ALTER TABLE`
migrations for the document-metadata columns added later.

### Core programme state

**`programmes`** — `id`, `data` (the entire programme as a JSON blob), timestamps.

The whole programme document — mission, projects, risks, plan, updates, gaps, metric domain
definitions — is one JSON blob. This is unusual and deliberate: the shape was changing
weekly during the build, and a blob meant no migrations. It is the right call for a
prototype and the wrong call for a product; see Part 10.

**`audit_log`** — append-only. `programme_id`, `action`, `entity_type`, `entity_id`,
`changed_by`, `changed_at`, `before_json`, `after_json`, `source`. Every `PATCH` to a
programme field writes a row. This is the provenance trail that makes AI-proposed changes
defensible.

**`chat_history`** — `programme_id` + `context_id` unique. Chat is scoped per page, so the
conversation on the Risks panel is a different thread from the one on the Metrics hub.

**`documents`** — metadata for directly uploaded files (filename, mime type, size, section,
summary). Distinct from `document_texts`, which holds extracted content.

### Data and metrics

**`data_tables`** — a parsed spreadsheet. `name`, `description`, `columns_meta` (JSON
column definitions), `row_count`, `source_document_id`, `version`, `previous_version_id`.
Versioning is by chain, not overwrite.

**`data_rows`** — one row per record, `row_data` as JSON. Indexed on `table_id`.

> This is the single biggest performance constraint. Every row is a JSON string parsed in
> Node on every query. It is fine at the thousands of rows APEX holds; it will not work at
> the 749,294 rows of `Fact_Spend`. See Part 9.

**`data_templates`** — expected shapes for uploads. `required_columns`, `optional_columns`,
`expected_dimensions`, `linked_kpi_ids`, `domain`, `panel`. Used to match an uploaded file
to a known metric.

**`kpi_definitions`** — the metric layer. Per KPI: `source_table_id`, `value_column`,
`time_column`, `dimension_columns`, `aggregation` (sum/count/avg/last), `target`,
`direction` (higher/lower is better), `rag_green`, `rag_amber`, `unit`, `domain`, `panel`,
`is_headline`, `chart_type`, `sort_order`.

**This is the table that maps onto the Power BI metric contract.** See Part 8.

### Ingestion

**`data_sources`** — a polled connection. `type` (one of eight fetchers), `config` (JSON),
`poll_interval_minutes`, `last_polled_at`, `last_sync_summary`, `enabled`.

**`data_source_files`** — every file seen, with `content_hash` for change detection,
`download_url` (Graph URLs expire in ~1 hour, so they are refreshed on every poll),
`status` (`pending` / `ingested` / `skipped` / `dismissed`), `target_table_id`.

**`document_texts`** — extracted text plus classification. `extracted_text`, `char_count`,
`doc_type`, `doc_date`, `is_latest`, `audience_level`. Indexed on
`(programme_id, doc_type, is_latest)`.

### Configuration

**`llm_engines`** — user-configured AI providers. `provider`, `api_key`, `endpoint_url`,
`model_name`, `deployment_name`, `is_default`. Multiple engines per programme, switchable
from a dropdown in the chat header.

**`microsoft_auth`** — OAuth device-code state. `tenant_id`, `client_id`, `status`,
`device_code`, `access_token`, `refresh_token`, `token_expires_at`, `user_email`. One row
per programme.

---

## Part 4 — The API surface

53 endpoints, all under `/api`. No authentication layer — it assumes a single trusted local
user. Grouped by concern:

### Programmes (4)
| Method | Path | Purpose |
|---|---|---|
| GET | `/programmes` | List |
| GET | `/programmes/:id` | Full programme JSON |
| PUT | `/programmes/:id` | Replace whole document |
| PATCH | `/programmes/:id` | Field-level update, writes an audit row |

### Documents, audit, chat (5)
`POST/GET /programmes/:id/documents` · `GET /programmes/:id/audit` ·
`GET/PUT /programmes/:id/chat/:contextId`

### Data tables (7)
| Method | Path | Purpose |
|---|---|---|
| POST | `/programmes/:id/data-tables` | Upload + parse a spreadsheet |
| GET | `/programmes/:id/data-tables` | List |
| GET | `/data-tables/:id` | Metadata |
| GET | `/data-tables/:id/rows` | Paged rows |
| GET | `/data-tables/:id/export` | CSV out |
| DELETE | `/data-tables/:id` | Remove |
| POST | `/programmes/:id/data-tables/analyze` | Parse **without** saving — preview + template match |

### Templates (4)
`GET/POST /programmes/:id/templates` · `POST /programmes/:id/templates/from-table/:tableId`
(derive a template from an existing table) · `DELETE /templates/:id`

### KPIs (5)
`POST/GET /programmes/:id/kpis` · `PUT/DELETE /kpis/:id` ·
**`GET /kpis/:id/data`** — the query engine. Loads the source table, applies
`?filter_<column>=value` query params, groups by `?groupBy=` or the KPI's time column,
breaks out each dimension column as a series, and aggregates per the KPI's
`aggregation`. Returns chart-ready data.

### LLM engines (6)
`GET /providers` · `GET/POST /programmes/:id/engines` · `PUT/DELETE /engines/:id` ·
`POST /engines/:id/test` (round-trips a one-line prompt)

### Sources and ingestion (10)
`GET /source-types` · `GET/POST /programmes/:id/sources` · `PUT/DELETE /sources/:id` ·
`POST /sources/:id/sync-now` · `GET /programmes/:id/pending-ingestions` ·
`POST /pending-ingestions/:id/{skip,dismiss,mark-ingested,ingest-document}`

### Microsoft auth (4)
`GET /programmes/:id/microsoft-auth` · `POST .../connect` (starts device-code flow,
returns the code and verification URL) · `POST .../poll` (exchanges the code for tokens) ·
`DELETE` (disconnect)

### Document texts (4)
`POST /programmes/:id/document-texts/upload` · `GET /programmes/:id/document-texts` ·
`POST /programmes/:id/document-texts/reclassify` (re-runs classification over the whole
library — used after changing the rules) · `DELETE /document-texts/:id`

### AI (1)
**`POST /api/ai`** — the single inference endpoint. Described in Part 7.

### BI integration (3)
`GET /programmes/:id/tableau` — flat denormalised export of every data table with
domain/panel/metric metadata attached · `GET /programmes/:id/tableau/:domain` — same,
filtered · `GET /api/tableau-wdc` — a Tableau Web Data Connector HTML shim.

### Gap analysis (1)
**`GET /programmes/:id/gaps`** — described in Part 6.

---

## Part 5 — The interface

### Navigation

No router. `src/apex/App.jsx` holds a `route` object in state, four pages deep:

```
Landing  →  Programme Home  →  Programme View  →  {Overview | Portfolio | Plan | Risks}
                             →  Metrics Hub     →  Metric Domain  →  Panel  →  Tab
```

Every page except Landing renders inside `Shell.jsx`, which supplies a sticky 56px header
and — the defining feature — **a persistent AI chat occupying the bottom third of the
viewport** (`33vh`, collapsible to a 40px strip). Page content is padded `34vh` at the
bottom so nothing hides behind it.

### Page by page

**Landing** — programme selector. No AI chat, deliberately: there is no context yet.
Each row shows name, description, function and access level.

**Programme Home** — mission, description, an active-gap banner, and two large mode tiles:
*Programme View* (delivery, governance, risk) and *Metrics Tracking* (performance
measurement). The split exists because those are two different jobs with two different
audiences.

**Programme View** — four panel tiles, each with a colour, an icon and a live gap count:

| Panel | Contents |
|---|---|
| Overview | Mission, executive summary, programme updates feed |
| Portfolio | Project charters, governance, RAG roll-up |
| Plan | Timeline, milestones, dependencies |
| Risks & Compliance | Risk register, risk profile, audit dashboard |

**Metrics Hub** — a card per metric domain with a *tracked / total* progress bar, then into
a domain.

**Metric Domain** — the GP Value Algorithm, four panels (Part 8), tabs within each, and
`MetricRenderer` drawing the charts.

### The chart renderer — `MetricRenderer.jsx` (532 lines)

Deliberately built to reproduce the QBR slide format, so what APEX shows and what goes in
the deck look the same:

- Orange gradient headline bar carrying the one-line "so what"
- Stacked bars by region, fixed colours (`GC` green, `EMEAA` blue, `AMER` yellow,
  `total` teal) so a region is the same colour everywhere
- Target reference lines
- Estate-coverage percentage tables beneath the charts
- Month-on-month variance badges, green up / orange down
- Chart-type toggles (bar / line / area / composed), per tab

Built on Recharts.

### Supporting components

| Component | Lines | Does |
|---|---|---|
| `DataExplorer.jsx` | 418 | Browse a parsed table — columns, types, sample rows, filters |
| `SourcesManager.jsx` | 366 | Add/edit/test polled sources; per-type dynamic config form |
| `AIChat.jsx` | 341 | The persistent assistant (Part 7) |
| `SmartUpload.jsx` | 310 | Drag-drop → analyse → template match → confirm → commit |
| `EnginesManager.jsx` | 210 | Add/test/default LLM engines |
| `KPIDefiner.jsx` | 182 | Modal: define a KPI against a table's columns |
| `PendingIngestions.jsx` | 103 | Queue of files seen but not yet ingested |
| `SourceTables.jsx` | 101 | Parsed tables list with row counts and versions |

### Visual language

Dark, near-black (`--bg0`), teal accent (`#2ABFBF`), three text tiers, three font tokens
(display / body / mono). All styling is inline style objects against CSS custom properties
in `src/apex/lib/theme.js` — no CSS framework, no class names. That makes every component
self-contained and easy for an agent to modify, at the cost of verbosity.

---

## Part 6 — The ingestion pipeline

This is the part that took longest and is worth preserving intact.

```
  SharePoint / OneDrive / Drive / GCS / HTTPS / ZIP
                      │
              (1) FETCH — every 60s, per source poll interval
                      │  Microsoft Graph, recursive, shortcuts one level
                      ▼
              data_source_files       ← content_hash change detection
                      │                 download URLs refreshed every poll
              (2) TRIAGE by extension
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
   .pptx .docx .pdf            .xlsx .xls .csv
        │                           │
   (3a) EXTRACT TEXT           (3b) PARSE TABLE
   officeparser, with a             SheetJS → columns + typed rows
   raw-XML fallback                      │
        │                                ▼
   (4a) CLASSIFY                    data_tables + data_rows
   type / date / audience                │
        │                           (4b) TEMPLATE MATCH
        ▼                                │
   document_texts                        ▼
        │                           kpi_definitions
        └──────────────┬────────────────┘
                       ▼
            (5) AI CONTEXT ASSEMBLY
```

### 1 — Fetch

Eight source types in the `FETCHERS` registry (`server/sources/fetchers.js`):

| Type | Label | Config fields |
|---|---|---|
| `sharepoint-shared` | SharePoint shared folder (no IT needed) | shareLink, fileTypes, recursive |
| `sharepoint-folder` | SharePoint folder (IT-managed) | tenantId, clientId, clientSecret, siteHostname, sitePath, folderPath, fileTypes |
| `onedrive-folder` | OneDrive folder (IT-managed) | tenantId, clientId, clientSecret, userId, folderPath, fileTypes |
| `google-drive` | Google Drive folder | link, apiKey |
| `gcs` | Google Cloud Storage bucket | bucketName, prefix |
| `http-url` | HTTPS file URL | url, filename |
| `sharepoint-file` | SharePoint share link (single file) | shareLink, filename |
| `uploaded-zip` | Uploaded ZIP archive | zipPath |

**The hard-won SharePoint lessons — do not regress these:**

- **Path-based Graph URLs return HTTP 400 for subfolders.** The only reliable traversal is
  by `driveId` + `itemId`:
  `https://graph.microsoft.com/v1.0/drives/{driveId}/items/{itemId}/children`.
  Getting this wrong silently returns zero files rather than an error.
- **Recursion must be full-depth** (`maxDepth 5`), not one level. Real folder structures
  nest four deep.
- **Shortcut folders are followed one level only.** Following them fully once ran for over
  an hour into an unrelated tree.
- **Safeguards:** 2-minute wall clock, 500 files, 200 folders, 30-second per-download
  timeout, pagination via `@odata.nextLink`.
- **`@microsoft.graph.downloadUrl` expires in about an hour.** Every poll refreshes the URL
  for *every* file, including unchanged ones. A 401 or 403 on download is treated as
  "expired, retry next cycle", not as a failure — the file stays `pending`.

Auth is **OAuth 2.0 device code flow** (`server/auth/microsoft.js`): `requestDeviceCode` →
user visits microsoft.com/devicelogin and enters a code → `pollForToken` →
`refreshAccessToken` with a 5-minute expiry buffer. Delegated permissions only
(`Files.Read.All`, `Sites.Read.All`, `offline_access`, `User.Read`), so APEX can only ever
see what the signed-in person can see. Read-only. No service principal, no application
permissions, no standing credential.

### 2–3 — Extract

`server/documentExtractor.js`. Documents (`.pptx .pdf .docx .doc .odt .odp .ods`) go
through `officeparser`, with two compatibility shims learned the hard way:

- `officeparser` exports differently under CJS and ESM — both call shapes are handled.
- It sometimes returns a non-string — the result is coerced before `.trim()`.
- **PowerPoint frequently extracts empty.** Fallback: open the `.pptx` as a ZIP with
  `adm-zip`, pull `ppt/slides/slideN.xml`, `ppt/notesSlides/` and `word/document.xml`
  directly, and strip tags with a regex. Crude, and it works where the library does not.

Spreadsheets (`.xlsx .xls .csv`) go through SheetJS in `server/dataParser.js`, which infers
column types and produces typed rows plus a `diffTables` helper for version comparison.

**What is lost in extraction — this matters for expectation-setting.** Text extraction
keeps words and loses everything else: chart data (a chart is a picture plus an embedded
worksheet the parser does not read), table structure and cell alignment, images and
diagrams, speaker notes formatting, colour coding and conditional formatting, slide
layout and reading order, and any RAG status conveyed only by fill colour. **A slide whose
meaning is carried by a red/amber/green square extracts as the word next to the square and
nothing else.** This is the single strongest argument for the Power BI model carrying the
numbers and APEX carrying the narrative.

### 4 — Classify

`server/documentClassifier.js` assigns three attributes from the file path and name:

- **`doc_type`** — eleven path patterns, first match wins:
  `1. Weekly PLT Updates` → `weekly`/operational · `Monthly Update Decks` →
  `monthly`/management · `SteerCo Decks` → `steerco`/**board** · `QBR` → `qbr`/**board** ·
  `Audit Tracking|Audit Context` → `audit`/management · `Working Docs` → `draft` ·
  `Metrics|Monthly Risk Logs` → `metrics` · `Sources/` → `source` · and so on.
- **`doc_date`** — four filename patterns in priority order: `wc12MAR` style →
  exact date; full month name + optional year; three-letter month + optional year; ISO
  `YYYY-MM`. Falls back to a four-digit year anywhere in the path. If a year is absent it
  is inferred: a month more than two ahead of today is assumed to be last year.
- **`audience_level`** — `board` / `management` / `operational`, from the same path rules.

`refreshIsLatest()` then clears the flag across the programme and re-sets exactly one
`is_latest` per `doc_type`, ordered by `COALESCE(doc_date, updated_at) DESC`.

**These rules encode the IHG PE Sources folder structure specifically.** Any new folder
layout needs the `PATH_RULES` array updated — that is the intended extension point, and
`POST /document-texts/reclassify` re-runs the whole library afterwards without re-fetching.

### Auto-ingest and throttling

`server/sources/scheduler.js` runs every 60 seconds. Per cycle it processes **at most 3
documents and 2 spreadsheets**. This is not arbitrary — unthrottled ingestion hit Claude
API 429 rate limits repeatedly. Everything else waits for the next cycle.

### The gap engine — `GET /programmes/:id/gaps`

For every defined KPI it emits findings with a severity:

| Type | Trigger | Severity |
|---|---|---|
| `no_source` | KPI has no source table linked | high |
| `empty_table` | Table exists but has zero rows | high |
| `stale_data` | Source not updated in >45 days | medium, high at >90 |
| `missing_dimension` | A dimension value present historically is absent from the latest period | medium |
| `null_values` | Nulls in the value column | low, high above 20% |
| `not_tracked` | A metric domain tab is marked `status: "gap"` | medium |

Returned sorted by severity and grouped by domain. The UI surfaces counts as badges on
panel tiles and as one-click prompts in the chat's gap banner — clicking a gap asks the AI
to help resolve it.

---

## Part 7 — The AI layer

### Engines

Seven providers in `server/ai/providers.js`, each normalising `(system, messages)` into its
own API shape:

| Provider | Fields required |
|---|---|
| `github-copilot` | api_key, model_name |
| `anthropic` | api_key, model_name |
| `gemini` (AI Studio) | api_key, model_name |
| `gemini-vertex` | api_key, endpoint_url, model_name |
| `copilot` (Azure OpenAI) | api_key, endpoint_url, deployment_name |
| `openai` | api_key, model_name |
| `custom` | endpoint_url, api_key, model_name |

Engines are per-programme, one marked default, switchable from a dropdown in the chat
header. `testEngine()` round-trips a one-line prompt so a misconfiguration surfaces
immediately rather than on first real use.

### Context assembly — `POST /api/ai`

This is the heart of the thing. On every call the server:

1. Resolves the engine (explicit `engineId` → programme default → first → `ANTHROPIC_API_KEY`
   env fallback).
2. Loads the **entire** document library ordered `is_latest DESC, doc_date DESC,
   updated_at DESC`.
3. Re-sorts the `is_latest` documents by audience level — **board (SteerCo, QBR) first,
   then management (monthly), then operational (weekly)** — and appends the historical
   documents after them.
4. Packs documents into an **80,000-character budget**, each preceded by a header:
   `=== [LATEST STEERCO DECK — 2026-04-01 | board] filename.pptx ===`.
   The document that crosses the budget is truncated with a marker; the rest are dropped.
5. Prepends explicit rules:

   > - Documents marked [LATEST] are the most current version of that type. Always prefer these.
   > - Board-level docs (SteerCo, QBR) have strategic framing. Management (Monthly) has detail. Operational (Weekly) has the most granular data.
   > - If documents conflict, prefer: (1) most recent date, (2) highest audience level.
   > - Always cite the document name and date when referencing information.

6. Concatenates this onto the page-level system prompt built client-side and calls the
   engine.

**The client-side system prompt** (`AIChat.jsx`) adds the live page context: programme name
and function, what the user is currently looking at, a 4,000-character JSON slice of the
current page's data, and the programme mission, remit and 2026 priorities.

So the assistant knows *what you are looking at*, *what the programme is for*, and *what
every document says* — and is told which documents to trust when they disagree.

### The proposal protocol

The AI is instructed never to commit a change. If it wants to, it appends exactly one JSON
block:

```json
{"proposal":{"type":"update|risk|summary|charter","data":{},"summary":"one-line description"}}
```

The client strips the block from the displayed text, renders an Accept control, and on
acceptance calls the matching store mutation (`setExecutiveSummary`, `addUpdate`,
`addRisk`), which writes through `PATCH /programmes/:id` and therefore into the audit log.

**This is the pattern worth carrying forward unchanged.** It is what makes an AI writing
into a governance system defensible: nothing changes without a named human accepting it,
and every change has a before/after record.

### Contextual ingestion

Dropping files into the chat opens an annotation panel. Per file the user sets a document
type (twelve options), the project it relates to, free-text instructions, and an
**ingestion mode** — `update` (merge), `replace` (supersede this period) or `reference`
(read but do not change programme state). The files are then sent with those annotations as
structured preamble. Being able to say *"this replaces March, not adds to it"* removes most
of the ambiguity that otherwise produces wrong merges.

---

## Part 8 — The metric layer, and how it links to Power BI

### The GP Value Algorithm

Every metric domain has the same four panels, each with a question:

| Panel | Question |
|---|---|
| **External Context** | What's changing our landscape? |
| **Value Proposition** | Where are we strong / weak? |
| **Enablement** | What's driving take-up? |
| **Performance** | What did it deliver? |

Three domains are configured: **Hotel Procurement**, **Corporate Procurement**,
**Function Management**. Each tab carries `status` — `tracked`, `partial` or `gap` — and a
`gap` tab can carry a `prompt` telling the AI how to offer help.

**Read the current status honestly:** of the hotel domain's tabs, `CRF Collection`,
`CMH P2P Rollout`, `Franchise P2P Rollout` and `CRF per P2P Platform` are `tracked`;
`Programme Coverage` and `Spend Throughput` are `partial`; and **every single External
Context tab is a `gap`** — Category Indices, Competitive Set Benchmarking, Macro
Environment Narrative. Same in the corporate domain.

That matters for what you are about to build. See Part 11.

### Two metric layers that must not diverge

You now have metric definitions in two places:

| | APEX `kpi_definitions` | Power BI `tableau/ai/contract.py` |
|---|---|---|
| Holds | source table, value/time/dimension columns, aggregation, target, RAG bands | DAX, definition, synonyms, guardrails, validated value |
| Scope | programme delivery metrics | validated spend and capture metrics |
| Computed by | the Node query engine in `GET /kpis/:id/data` | the tabular engine |
| Validated against | nothing formal | recomputed from source extracts, reconciles to the cent |

**If both define "capture rate" independently, they will drift, and the first person who
spots two different numbers stops trusting both.**

### The recommendation: one contract, two surfaces

```
              tableau/ai/contract.py
            (the single definition layer)
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
   metrics.json                model.bim descriptions
          │                         │
   APEX seeds its             Power BI Copilot / Q&A
   kpi_definitions                  │
   from the contract                ▼
          │                  21 DAX measures
          ▼                  validated to the cent
   APEX displays
   the same numbers
```

Concretely, three changes:

1. **A new APEX source type — `metric-extracts`.** Points at the folder holding the 17
   validated CSVs. On poll it registers each as a `data_table` without re-parsing through
   the JSON row store (see Part 9 — this needs the columnar path).
2. **Seed `kpi_definitions` from `metrics.json`.** Each contract measure becomes a KPI with
   its definition, unit, format and guardrails carried across. A KPI that exists in the
   contract cannot be redefined in APEX — the contract wins.
3. **Deep-link to Power BI.** Where APEX shows a contract metric, it links to the
   corresponding Power BI page with the same filters applied, rather than trying to
   reproduce the drill-down.

The division of labour that follows: **Power BI owns the numbers. APEX owns the narrative,
the delivery state and the conversation.** APEX should never recompute a number the
contract defines — it should read it.

### What already exists for this

- `GET /programmes/:id/tableau` — flat export of every data table with domain/panel/metric
  metadata attached. Power Query can consume this directly as a JSON source.
- `GET /programmes/:id/tableau/:domain` — the same, filtered to one domain.
- `GET /api/tableau-wdc` — a Tableau Web Data Connector shim, now redundant given the
  Power BI decision, but harmless.

---

## Part 9 — What works, what is half-built, what is known-broken

### Works

- SharePoint ingestion end to end — OAuth, recursive scan, change detection, extraction,
  classification. Proven against the live PE Sources folder.
- Document classification and `is_latest` resolution.
- Multi-provider AI with metadata-aware context assembly.
- The proposal / accept / audit protocol.
- Spreadsheet parsing, template matching, KPI definition and the chart renderer.
- The gap engine.

### Half-built

| Area | State |
|---|---|
| Metric domains | Three defined; most tabs are `gap`, all External Context tabs are `gap` |
| Templates | Nine IHG-specific templates hardcoded in `smartIngest.js`; no UI to author new ones |
| Portfolio / Plan panels | Render seeded demo data; no editing |
| Versioning | `previous_version_id` chain exists; nothing in the UI exposes it |
| `documents` vs `document_texts` | Two overlapping tables from different build phases |

### Known-broken or unsuitable at scale

1. **`data_rows` as JSON strings.** Every query parses every row in Node. Fine for
   thousands; impossible for the 749,294-row `Fact_Spend`. **Any integration with the
   validated extracts needs a columnar path — DuckDB reading the CSVs or Parquet directly,
   not the row store.** This is the single most important technical decision in the
   rebuild.
2. **Programme state as one JSON blob.** No field-level concurrency; two writes to
   different fields race. Single-user local use hides this. It needs normalising before
   anyone else edits.
3. **No authentication.** Deliberate for local single-user, unacceptable for anything
   else — and this, combined with `0.0.0.0` binding and open CORS, is exactly what
   produced the infosec finding.
4. **API keys stored in plaintext** in `llm_engines.api_key`. On a local build they should
   move to the OS keychain, or at minimum to a file outside the synced folder.
5. **80,000-character context ceiling.** Documents beyond it are silently dropped. There is
   no retrieval step — it is "most important first until full". A real RAG layer
   (embeddings + top-k) is the right answer once the library outgrows the window.
6. **Classification is filename-based only.** A misnamed file is misclassified, and content
   is never consulted.
7. **No tests.** None. Zero coverage.

---

## Part 10 — Running locally and living in SharePoint

The honest answer to "can it live in SharePoint": **partly, and the distinction matters.**

SharePoint is document storage. It cannot run a Node process, so the APEX server cannot be
"hosted in SharePoint" in any sense. Three things people mean by the question, and what is
actually true for each:

| What you might mean | Feasible? | How |
|---|---|---|
| Run the app *from* SharePoint | **No** | SharePoint serves files, it does not execute server code |
| Keep the app's *data* in SharePoint | **Yes, with care** | Point the data root at a OneDrive-synced SharePoint folder |
| Put the app's *outputs* in SharePoint | **Yes** | Exports, reports and the Power BI file live in the synced folder |

### The recommended shape

```
  Tom's laptop
  ├── C:\APEX\                         ← the application, git clone
  │     ├── server\  src\  node_modules\
  │     └── data\apex.db               ← SQLite stays on LOCAL disk
  │
  └── C:\Users\...\IHG\PE Sources\     ← OneDrive-synced SharePoint
        ├── (source documents — APEX reads these)
        ├── APEX Exports\              ← APEX writes here
        │     ├── apex-backup-*.db
        │     ├── metric-extracts\*.csv
        │     └── reports\*.md
        └── APEX PowerBI\              ← the .pbix / .pbip
```

**Keep the SQLite database on local disk, not in the synced folder.** A sync client
uploading a file mid-write is a well-known way to corrupt SQLite, and the `-wal` and `-shm`
sidecar files sync independently of the main file, which makes it worse. Instead write a
timestamped backup into the synced folder on a schedule — `VACUUM INTO` gives a clean
single-file copy safely while the database is open.

**Reading source documents from the synced folder is the significant simplification.** If
the PE Sources folder is already synced to the machine, APEX does not need Microsoft Graph,
OAuth, device codes, admin consent or expiring download URLs at all — it needs
`fs.readdir`. A new `local-folder` source type replaces the entire Graph stack for the
local build, and the Graph fetchers stay available for folders that are not synced.

That is a large reduction in moving parts, and it removes the dependency that took weeks of
IT escalation to resolve.

### Security posture for the local build

| Risk | Local-build answer |
|---|---|
| Publicly reachable | Bind `127.0.0.1`; unreachable from any other machine |
| Unauthenticated | Single OS user on a managed laptop; no network surface to authenticate |
| Data exfiltration | Only outbound call is the LLM API; it can be pointed at Azure OpenAI inside the tenant |
| Credential storage | Move API keys to OS keychain; keep them out of the synced folder |
| Personal data | The CRF `Pivots` sheet holds named individuals — stays excluded |
| Data residency | Nothing leaves the laptop except the prompt to the configured model |

Worth stating plainly when this is discussed: with loopback binding, APEX is a desktop
application that reads files the user already has access to. That is a different risk
category from the one that was flagged.

---

## Part 11 — Market Trends and Customer Insights

### They fit the existing model exactly

This is a genuinely fortunate alignment. The GP Value Algorithm's **External Context**
panel — *"What's changing our landscape?"* — is currently **100% gaps**:

| Domain | Tab | Status | Fits |
|---|---|---|---|
| Hotel | Category Indices | `gap` | **Market Trends** |
| Hotel | Competitive Set Benchmarking | `gap` | **Market Trends** |
| Hotel | Macro Environment Narrative | `gap` | **Market Trends** |
| Hotel | Owner / Hotel / Guest Satisfaction | `gap` | **Customer Insights** |
| Corporate | Macro & Category Indices | `gap` | **Market Trends** |
| Corporate | Competitive Set Profitability / EPS | `gap` | **Market Trends** |
| Corporate | Tariff Exposure | `gap` | **Market Trends** |
| Corporate | CSAT Score | `partial` | **Customer Insights** |

So this is not a new architecture — it is filling the panel APEX was designed around and
has never had data for. The gap engine already reports these as `not_tracked`; connecting
the tools turns those findings green.

### Where they plug in

**Ingestion.** Each tool becomes an entry in the `FETCHERS` registry. The contract a
fetcher must satisfy is small — return an array of
`{ id, name, lastModified, contentHash, downloadUrl, sizeBytes, mimeType }`. If a tool has
a REST API, the fetcher calls it and synthesises records; if it only exports files, the
fetcher watches an export folder. Either way nothing downstream changes.

**Storage.** Trend data is a time series with dimensions — it fits `data_tables` /
`kpi_definitions` as-is. Verbatim customer feedback is text and belongs in
`document_texts`, where the AI can already read it.

**Joining.** This is the part that needs care, and the lesson from the Power BI build
applies directly: *the region mapping in the programme-spend file did not match IHG's
actual structure, and approximating it was wrong by 44% in EMEAA.* The same will be true
here. **Both tools must be joined through the conformed dimensions** —
`Dim_Region`, `Dim_Category`, `Dim_ChainScale`, `Dim_Segment`, `Dim_Market`,
`Dim_Priority` — with a crosswalk where their vocabularies differ, exactly as
`scripts/b_conform.py` does for the programme category taxonomy. Anything that will not
join gets an explicit `Unmapped` value rather than a guess.

### What I need from you to build these properly

Nine questions, and the first four block any real work:

1. **What are they?** Product names and vendors. Internal builds or licensed platforms?
2. **How do you get data out?** REST API, scheduled export to a folder, database, or only
   a UI you read?
3. **What authentication?** API key, OAuth, SSO, or your own login only?
4. **What's the grain?** One row per what — category × month? market × week? survey
   response?
5. **Which dimensions?** Do they use IHG regions, and if so which definition? Do they use
   IHG category names or their own?
6. **How often does it change?** Daily, weekly, monthly — sets the poll interval.
7. **Is it numbers, text, or both?** Determines whether it lands in `data_tables`,
   `document_texts`, or both.
8. **How far back does it go?** Determines whether trend comparison is possible at all.
9. **Anything sensitive?** Named individuals in customer feedback would need the same
   exclusion treatment as the CRF `Pivots` sheet.

A single sample export from each — even one file — would answer most of 4 through 9 without
you writing anything.

### The interface consequence

Three data classes now, not two, and they have different trust levels and different
refresh rhythms:

| Class | Source | Trust | Refresh |
|---|---|---|---|
| **Validated metrics** | Power BI model | Reconciles to the cent | On extract rebuild |
| **Delivery state** | APEX programme data | Human-maintained, audited | Continuous |
| **External signal** | Market Trends, Customer Insights | Third-party, as-supplied | Per tool |

The interface should make that difference visible rather than flattening it. A concrete
suggestion: **External Context is promoted from a panel inside a domain to a first-class
destination**, sitting alongside Programme View and Metrics Tracking on the home screen —
because "what is changing outside" is now a standing question with live data behind it,
not a gap to be apologised for. And every figure carries its class, so a reader can tell at
a glance whether they are looking at something validated, something asserted, or something
bought in.

---

## Part 12 — What to carry forward, and what to leave

### Carry forward unchanged

1. **The proposal / accept / audit protocol.** The single most valuable pattern here.
2. **Document classification with `is_latest`.** The reason the AI answers with current
   information instead of a 2023 deck.
3. **Metadata-aware context assembly** — board-first ordering plus explicit conflict rules.
4. **The multi-provider engine abstraction.** It has already survived a forced move from
   Claude to Gemini to Azure and back.
5. **The SharePoint fetcher's hard-won details** — driveId/itemId traversal, URL refresh,
   depth limits, shortcut handling. Every one of these cost a debugging cycle.
6. **The gap engine.** Knowing what is missing is most of the value.
7. **Contextual ingestion modes** (`update` / `replace` / `reference`).

### Rebuild differently

1. **Row storage** → DuckDB over CSV/Parquet, not JSON strings in SQLite.
2. **Programme state** → normalised tables, not one JSON blob.
3. **Metric definitions** → seeded from `contract.py`, never defined twice.
4. **Document retrieval** → embeddings and top-k, not "first 80,000 characters".
5. **Source access** → local synced folder first, Graph only for what is not synced.
6. **Network posture** → loopback binding and scoped CORS from the first commit.
7. **Secrets** → OS keychain.
8. **Tests** → at minimum the classifier, the crosswalk and the gap engine, because all
   three encode business rules that are easy to break silently.

### Do not rebuild

The visual design, the panel structure and the four-page navigation all work. The
interface change you want is **additive** — a third destination for external context, and
class labelling on figures — not a redesign. Keep the QBR-matching chart format; the fact
that APEX charts and the deck look the same is a feature people noticed.

---

## Appendix — file map

```
server/
  index.js               1,169  Express app, 53 endpoints, AI context assembly
  db.js                    271  Schema, migrations, path resolution, boot diagnostic
  sources/fetchers.js      405  Eight source types; the SharePoint Graph logic
  sources/scheduler.js     214  60s poll loop, auto-ingest, throttling
  smartIngest.js           217  Nine IHG templates, matching, gap detection, versioning
  ai/providers.js          170  Seven LLM providers + dispatcher + test harness
  dataParser.js            121  SheetJS parsing, type inference, table diffing
  documentClassifier.js     95  Path rules, date extraction, is_latest resolution
  auth/microsoft.js         73  Device-code OAuth, token refresh
  documentExtractor.js      61  officeparser + raw-XML ZIP fallback
  seed.js                  304  IHG PE reference data

src/apex/
  App.jsx                   73  State-based router, four pages
  components/Shell.jsx      46  Header + persistent chat frame
  components/AIChat.jsx    341  The assistant: context, proposals, file annotation
  components/ui.jsx        111  Spinner, EmptyState, shared primitives
  pages/                   224  Landing, ProgrammeHome, ProgrammeView, MetricsHub
  panels/                  607  Overview, Portfolio, Plan, Risks
  metrics/               1,622  MetricRenderer, DataExplorer, SmartUpload, KPIDefiner,
                                MetricsDomain, SourceTables, PendingIngestions
  settings/                616  Settings, EnginesManager, SourcesManager
  data/store.js            220  Pub/sub store, server sync, localStorage fallback
  data/ihg*.js             ~800  Seeded IHG reference data incl. METRIC_DOMAINS
  lib/                     ~200  theme.js, ai.js, utils.js

tableau/                          The validated Power BI layer
  ai/contract.py                  21 measures — the single definition layer
  ai/metrics.json                 machine-readable contract for any AI surface
  ai/AI-OVERLAY.md                architecture of the AI layer
  powerbi/APEX_v2.pbip            the dashboard
  scripts/b_conform.py            the conformed-dimension crosswalk
```
