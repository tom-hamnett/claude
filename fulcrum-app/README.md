# FULCRUM — the app

An AI-native, local-first coach for executive presence, leadership communication,
negotiation and sales. **Learn** ten deeply-taught modules, then **evaluate** your
real conversations and get holistic, self-only feedback that points you to the exact
behaviours and modules to work on.

Part of the **Quantum Tools** house (shares the design system with Sigma).

## What it does

- **Learn** — a full e-learning curriculum: 10 modules across 4 tracks, each with
  objectives, chunked lessons, worked good-vs-poor examples, knowledge checks,
  real-world practice, and links into the diagnostic. Read and learn before you
  decide to evaluate yourself.
- **Evaluate** — paste, upload, or record a real conversation; configure which
  modules to be scored against; get a dashboard (overall + per-capability scores,
  evidence-quoted strengths and growth moments, and your top 1–3 priorities), all
  **self-only** — it reads the room but scores only you.
- **Coach** — a streaming AI coach grounded in the curriculum and your profile:
  prep, interpret, practise.
- **Progress** — your trend over time (the transfer made visible) and curriculum
  completion.
- **Passive agent (opt-in)** — a local companion (`local-agent/`) that watches a
  folder for transcripts and evaluates them automatically.

## Architecture

- **Vite + React + TypeScript + Tailwind**, **Dexie** (IndexedDB) for all storage.
- **AI-native, BYO-key, serverless.** Your Anthropic API key lives only in your
  browser and calls Claude directly (`@anthropic-ai/sdk`, `dangerouslyAllowBrowser`).
  There is no FULCRUM server. Without a key the app runs a transparent offline
  heuristic engine so it's fully explorable.
- The evaluation engine uses **`claude-opus-4-7`**, adaptive thinking, structured
  outputs against the BARS rubric, and prompt-cached system prompts.
- Content lives in `src/content/` (curriculum + rubric); the engine in `src/lib/`.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build (dist/)
```

Then open **Settings** and paste your Anthropic API key (from console.anthropic.com),
or explore in offline-preview mode first.

## Privacy

Everything stays on your device. FULCRUM evaluates and reports on **you only** —
never the other people in your conversations. Passive capture is strictly opt-in.

## Grounding

Bates ExPI · Hewlett/CTI · Spitzberg & Cupach · Sofer (Say What You Mean / NVC) ·
Crucial Conversations · Fisher & Ury (Getting to Yes) · Voss (tactical empathy) ·
Rackham (SPIN) · Kirkpatrick & the leadership-training transfer literature.
