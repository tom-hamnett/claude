# APEX — Architecture Reference

## Overview

APEX is a single-page React app backed by an Express API with SQLite storage. It manages programme data (risks, metrics, audits, documents) and provides AI-assisted analysis via configurable LLM providers.

---

## Frontend Architecture

### Router (src/apex/App.jsx)

Simple state-based routing — no React Router. Four pages:

```
landing → home → programme-view
                → metrics
```

State is loaded once from the server on mount (`loadState()`), then held in a lightweight pub/sub store.

### Store (src/apex/data/store.js)

- **Not Redux** — custom pub/sub with `useStore()` hook
- State loaded from `GET /api/programmes` + `GET /api/programmes/:id` for each
- Mutations write to server via `PATCH /api/programmes/:id` (field-level) or `PUT` (full replace)
- Falls back to localStorage if server is unavailable

### Pages

| Page | File | Purpose |
|------|------|---------|
| Landing | `pages/Landing.jsx` | Programme selector grid |
| Programme Home | `pages/ProgrammeHome.jsx` | Dashboard hub — links to views |
| Programme View | `pages/ProgrammeView.jsx` | Overview, Plan, Portfolio, Risks panels |
| Metrics Hub | `pages/MetricsHub.jsx` | Domain selector → metric deep-dive |

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| Shell | `components/Shell.jsx` | Sticky header + AI chat + settings |
| AIChat | `components/AIChat.jsx` | Persistent chat drawer, calls `/api/ai` |
| MetricRenderer | `metrics/MetricRenderer.jsx` | Renders charts per metric key (BarChart, LineChart, AreaChart, ComposedChart) |
| DataExplorer | `metrics/DataExplorer.jsx` | Generic chart+table with filters, export, pivot view |
| MetricsDomain | `metrics/MetricsDomain.jsx` | 4-panel layout (External/Value/Enablement/Performance) |
| SmartUpload | `metrics/SmartUpload.jsx` | 5-step data ingestion wizard |

### Design System

All styling is inline React `style={}` — no CSS files for components. Theme variables are injected in `lib/theme.js` as CSS custom properties:

**Colors:**
```
--bg0: #0B2A3C    (darkest background)
--bg1: #0D3248    (header/nav)
--bg2: #0F3A52    (cards)
--bg3: #13445E    (elevated cards)
--bg4: #17506E    (hover states)
--accent: #2ABFBF (teal — primary actions)
--orange: #E8734A (warnings, targets)
--yellow: #F5C544 (AMER region, caution)
--green: #5DC484  (GC region, success)
--blue: #4A9EFF   (EMEAA region)
--violet: #A78BFA (supplementary)
```

**Fonts:**
```
--font-d: 'Outfit'        (display — headings, labels, buttons)
--font-m: 'JetBrains Mono' (monospace — data, badges, codes)
--font-b: 'Inter'          (body — paragraphs, descriptions)
```

**RAG Status (dual-axis):**
```
dark-green  → Ahead
light-green → On Track
amber       → Minor Variance
amber-red   → At Risk
red         → Material Issue
grey        → Not Started
```

**Chart region colors (consistent everywhere):**
```
AMER:  #F5C544 (yellow)
EMEAA: #4A9EFF (blue)
GC:    #5DC484 (green)
Total: #2ABFBF (teal)
```

---

## Backend Architecture

### API Server (server/index.js)

Single Express file. All routes are `/api/*`. In production, also serves the Vite-built `dist/` folder.

### API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/programmes` | List all programmes |
| GET | `/api/programmes/:id` | Full programme data (JSON blob) |
| PUT | `/api/programmes/:id` | Full replace |
| PATCH | `/api/programmes/:id` | Patch a nested field path |
| POST | `/api/programmes/:id/documents` | Upload a file |
| GET | `/api/programmes/:id/documents` | List documents |
| GET | `/api/programmes/:id/audit` | Audit log |
| GET/PUT | `/api/programmes/:id/chat/:ctx` | Chat history |
| POST | `/api/programmes/:id/data-tables` | Upload & parse file → data table |
| POST | `/api/programmes/:id/data-tables/analyze` | Smart ingestion analysis |
| GET | `/api/programmes/:id/data-tables` | List data tables |
| GET | `/api/data-tables/:id/rows` | Query rows (with filters) |
| GET | `/api/data-tables/:id/export` | CSV export |
| CRUD | `/api/programmes/:id/kpis` | KPI definitions |
| GET | `/api/kpis/:id/data` | Computed KPI data from source table |
| CRUD | `/api/programmes/:id/engines` | LLM engine configs |
| POST | `/api/engines/:id/test` | Test an engine |
| CRUD | `/api/programmes/:id/sources` | Live data sources |
| POST | `/api/sources/:id/sync-now` | Trigger manual sync |
| GET | `/api/programmes/:id/pending-ingestions` | Files waiting to be ingested |
| POST | `/api/ai` | LLM proxy (routes to configured engine) |

### Database Schema (server/db.js)

SQLite with WAL mode. Key tables:

| Table | Purpose |
|-------|---------|
| `programmes` | One row per programme, `data` column is JSON blob |
| `documents` | Uploaded files metadata |
| `audit_log` | Every mutation recorded |
| `chat_history` | AI chat messages per context |
| `data_tables` | Parsed data table metadata (versioned) |
| `data_rows` | Individual rows of data tables |
| `data_templates` | Expected upload shapes |
| `kpi_definitions` | User-defined KPIs linked to source tables |
| `llm_engines` | Configured AI providers |
| `data_sources` | Live folder/file polling configs |
| `data_source_files` | Change detection for polled sources |

### AI Provider System (server/ai/providers.js)

Multi-provider dispatcher. Supports: Anthropic, Gemini, Azure OpenAI, OpenAI, Custom endpoint. Each normalizes to `(system, messages) → { text }` interface.

### Data Pipeline

```
Upload file → parseFile() → columns + rows
                ↓
         Smart analysis (template match, version diff, gap fill suggestions)
                ↓
         User confirms → stored in data_tables + data_rows
                ↓
         KPI definitions query rows → DataExplorer renders charts
```

Live sources (folder polling) follow a similar path but queue files as "pending ingestions" for user review.

---

## Data Flow Summary

```
Browser ←→ Vite Dev Proxy (dev) or Express static (prod)
   ↓
React App (store.js manages state)
   ↓                    ↓
Programme data ←→ /api/programmes/:id    AI Chat ←→ /api/ai → LLM Provider
   ↓                                                    ↑
Metrics/KPIs ←→ /api/kpis/:id/data                 Engines table
   ↓
Data Tables ←→ /api/data-tables/:id/rows
```
