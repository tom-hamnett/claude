# FLUX — Execution Intelligence Studio

**An AI-native, world-class competitor to Jabian's OptiQ.** FLUX maps how work *really* flows, finds the waste, quantifies the opportunity, and designs the automation-ready future state — to one repeatable standard, so every process your team maps is directly comparable.

Built by Quantum Tools.

---

## Why FLUX exists

OptiQ (Jabian Consulting) sells execution-management as a four-stage consulting engagement: **SPOT360 diagnostic → process mining → automation-ready design → AI automation**. It's good. But it's a black-box service: you don't keep the engine, the outputs aren't yours to re-run, and comparability across processes depends on the consultant.

FLUX productises that capability into a tool your team owns and runs repeatedly, with three differentiators:

1. **A single enforced standard** (SIPOC + BPMN + Lean VSM + TIMWOODS) so every map is comparable — across analysts, functions and clients.
2. **AI-native end to end** — it drafts the map from plain English, runs the full opportunity engine, designs the future state, and **upskills itself** by researching reference models and benchmarks per process.
3. **Foolproof and self-contained** — a browser app, your own AI key, your data local. No platform lock-in.

See [`docs/COMPETITIVE-TEARDOWN.md`](docs/COMPETITIVE-TEARDOWN.md) for the full teardown of OptiQ and its competitors, and [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) for the FLUX Standard.

---

## The pipeline

| Stage | FLUX | OptiQ equivalent |
| --- | --- | --- |
| **01 · SPOT** | Multi-role friction signals → AI isolates the high-drag areas to map | SPOT360 Diagnostic |
| **02 · MAP** | Plain-English description → standardized current-state map (SIPOC, BPMN steps, VSM timing, value class) | Current-State Process Mining |
| **03 · DIAGNOSE** | TIMWOODS + VSM + value-driver opportunity engine, scored on impact/effort/confidence | (Jabian does this in workshops) |
| **04 · DESIGN** | Automation-ready future state + business case + roadmap | Automation-Ready Design |
| **+ Knowledge** | Self-upskilling library of reference models & benchmarks, fed back into every analysis | (consultant tacit knowledge) |

---

## Running it

```bash
cd flux
npm install
npm run dev      # http://localhost:5174
```

Build / preview:

```bash
npm run build
npm run preview
```

A fully-worked demo engagement (Northwind Manufacturing — Invoice Approval) is seeded on first run, so you can explore the whole pipeline **before** adding an AI key.

### Two ways to run

FLUX runs in one of two modes, decided automatically by whether Supabase env vars are present:

- **Local mode (default)** — no setup; all data lives in that browser (IndexedDB). Great for a solo trial.
- **Cloud / team mode** — set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` and FLUX becomes a shared web app: **email sign-in**, and a workspace **keyed to your email domain** so everyone on `@yourcompany.com` shares the same engagements and maps, syncing live across devices and phones. AI keys still stay on each person's device.

**To put it live for your team, follow [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)** — ~15 minutes, all point-and-click (Supabase + Vercel, both free tier). The paste-ready database setup is in [`supabase/schema.sql`](supabase/schema.sql).

### Unlocking AI

FLUX runs entirely client-side and is **BYO key**. In **Settings**, choose a provider (Anthropic / OpenAI / Google) and paste your key. The key is stored in your browser's IndexedDB and sent only to that provider. Optionally encrypt it with a passphrase (WebCrypto AES-GCM). Default model: Claude Sonnet 4.6.

> Browser-direct calls use the provider's documented browser path (Anthropic requires the `anthropic-dangerous-direct-browser-access` header). For a multi-user deployment, front the providers with a thin proxy and swap the key handling — the provider layer in `src/services/ai/` is the only thing to change.

---

## Architecture

- **React + Vite + TypeScript + Tailwind** — single-page app, HashRouter.
- **Pluggable store** (`src/store/`) — one set of hooks/mutations over two backends: **Dexie/IndexedDB** (local mode) or **Supabase/Postgres** (cloud mode). Pages never know which is active.
- **Supabase** (`src/services/`, `supabase/schema.sql`) — email OTP auth, domain-scoped workspaces, row-level security, realtime sync.
- **`src/types.ts`** — the standardized, versioned FLUX schema (the source of comparability).
- **`src/lib/frameworks.ts`** — the encoded taxonomy (value classes, BPMN steps, TIMWOODS, value drivers, automation ladder, maturity).
- **`src/lib/metrics.ts`** — pure VSM/costing/scoring functions.
- **`src/services/fluxAI.ts`** — the consultant-grade AI orchestration for all four stages + research.
- **`src/services/ai/`** — pluggable provider layer (Anthropic / OpenAI / Gemini).

### Deploy

`netlify.toml` and `vercel.json` are included. It's a static SPA, so it hosts anywhere — but for the shared team experience follow [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) (Supabase + Vercel).

---

## Standardized, comparable output

Every process produces the same artifacts in the same shape:

- a **Process Scorecard** (PCE, lead time, rolled %C&A, automation index, cost/waste);
- a **swimlane map** (actors × steps, coloured by Lean value class);
- an **Opportunity Register** scored on an impact/effort matrix and tagged to TIMWOODS + value drivers;
- a **future-state design** with business case and roadmap;
- exportable **Markdown / JSON / print-PDF** reports, and a portfolio-wide **CSV** comparison.

That standardization is the point: it's what makes a hundred processes comparable instead of a hundred bespoke diagrams.
