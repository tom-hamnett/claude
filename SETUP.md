# APEX — Setup Guide

## What is this?

APEX (Programme Intelligence) is a web-based dashboard for programme management. It tracks metrics, risks, audits, documents, and KPIs across multiple programme domains, with built-in AI chat and data ingestion.

**Tech stack:** React 19 + Vite 8 (frontend), Express 5 + SQLite (backend), Recharts (charts).

---

## Prerequisites

- **Node.js** 18 or later (20+ recommended)
- **npm** (comes with Node.js)
- No other dependencies — SQLite is bundled via `better-sqlite3`

---

## Quick Start (3 commands)

```bash
npm install
npm run build
npm start
```

This installs dependencies, builds the frontend, and starts the production server. Open **http://localhost:3001** in your browser.

---

## Development Mode

For active development with hot-reload:

**Terminal 1 — Backend:**
```bash
npm run server
```
Starts Express on port 3001.

**Terminal 2 — Frontend:**
```bash
npm run dev
```
Starts Vite dev server on port 5173 with hot module replacement. API calls are proxied to the Express server automatically (configured in `vite.config.js`).

Open **http://localhost:5173** for the dev version.

---

## Environment Variables

Create a `.env` file in the project root (one is already included but gitignored):

```
ANTHROPIC_API_KEY=sk-ant-...     # Optional fallback for AI chat if no engine configured in UI
```

AI engines can also be configured per-programme through the Settings panel in the UI. Supported providers:

| Provider | Required fields |
|----------|----------------|
| Anthropic Claude | `api_key`, `model_name` |
| Google Gemini | `api_key`, `model_name` |
| Azure OpenAI / Copilot | `api_key`, `endpoint_url`, `deployment_name` |
| OpenAI | `api_key`, `model_name` |
| Custom endpoint | `endpoint_url`, `api_key`, `model_name` |

---

## File Structure

```
.
├── index.html              # Entry point
├── package.json            # Dependencies & scripts
├── vite.config.js          # Vite config (dev proxy to Express)
├── .env                    # API keys (gitignored)
├── src/                    # Frontend (React)
│   ├── main.jsx            # React root
│   ├── App.jsx             # Routes to apex/App.jsx
│   └── apex/               # All application code
│       ├── App.jsx          # Router (Landing → Home → Views)
│       ├── components/      # Shell, AIChat, UI primitives
│       ├── data/            # Store, seed data definitions
│       ├── lib/             # Theme (CSS vars), utils, AI client
│       ├── metrics/         # MetricRenderer, DataExplorer, KPI tools
│       ├── pages/           # Landing, ProgrammeHome, ProgrammeView, MetricsHub
│       ├── panels/          # Overview, Plan, Portfolio, Risks panels
│       └── settings/        # Engines, Sources manager
├── server/                 # Backend (Express + SQLite)
│   ├── index.js            # All API routes
│   ├── db.js               # Database schema & init
│   ├── seed.js             # Seed data on first run
│   ├── dataParser.js       # Excel/CSV parser
│   ├── smartIngest.js      # Upload analysis pipeline
│   ├── ai/providers.js     # Multi-LLM dispatcher
│   └── sources/            # Live data source polling
├── data/                   # SQLite database files (gitignored)
└── uploads/                # Uploaded documents (gitignored)
```

---

## Database

SQLite — stored at `data/apex.db`. Created automatically on first run. No migrations needed — the schema is defined in `server/db.js` and uses `CREATE TABLE IF NOT EXISTS`.

To reset: delete `data/apex.db` and restart the server. Seed data is re-created automatically.

---

## Deployment

For production on a server or shared machine:

```bash
npm install --production
npm run build
NODE_ENV=production npm start
```

The Express server serves both the API and the built frontend from `dist/`. Runs on port 3001 by default (override with `PORT` env var).

---

## Connecting to your Azure OpenAI / Copilot instance

1. Open the app in browser
2. Click the gear icon (top right) → **Engines**
3. Click **Add Engine**
4. Select provider: **Microsoft Azure OpenAI / Copilot**
5. Enter your `endpoint_url`, `deployment_name`, and `api_key`
6. Click **Test** to verify, then **Save**
7. Mark as default — all AI chat will now route through your Azure instance
