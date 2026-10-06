# Quantum Tools — repo guide for Claude

This repo holds several separate Quantum Tools products. Work on ONE project per session and do not edit files in another project's folder unless Tom asks.

## Project map

| Folder | Product | Read first |
|---|---|---|
| `gtm_engine/` (+ `main.py`, `scripts/`, `tests/`, `data/`, `references/`) | GTM Intelligence Engine: Python content and go-to-market pipeline | `gtm_engine/CLAUDE.md`, then `MASTER_CONTEXT.md` |
| `assessment-app/` | Sigma: offline-first assessment PWA (Vite, React, TypeScript, Tailwind) | `assessment-app/README.md` |
| `flux/` | FLUX: execution intelligence studio | `flux/README.md`, `flux/docs/` |
| `marketing/` | Quantum Tools marketing site (Sigma launch pages) | `marketing/README.md` |

`MASTER_CONTEXT.md` is the living memory for the GTM engine and reel production (brand voice, the Theo character, locked rules, build state, decisions log). Read it before any GTM, content or brand work. It is not needed for Sigma or FLUX code changes.

## Rules

1. **Secrets** live only in `.env` files, which are git-ignored. Never commit keys or print them. Add new variable names (not values) to the matching `.env.example`.
2. **Founder anonymity**: no recorded footage, images or identifying details of Tom in any generated content or public copy.
3. **Plan before building**: for anything multi-step, write a short plan and get Tom's OK first (the superpowers plugin is enabled for this).
4. **Verify before saying done**: run the tests or load the app in a browser (Playwright is configured in `.mcp.json`) and report what you actually checked.
5. **Ask before spending money**: paid APIs, model credits, new subscriptions.
6. **Keep it concise**: Tom prefers short, bite-sized updates.
7. **Decisions**: when a GTM or brand decision is made, add a dated line to the Decisions Log in `MASTER_CONTEXT.md`.

## Tooling in this repo

- `.claude/settings.json`: superpowers plugin.
- `.mcp.json`: Playwright (browser testing) and Context7 (current library docs).
- `.claude/skills/design-taste-frontend/`: use for any UI work.
- Tests for the GTM engine: `pytest` from the repo root.
- Each web app deploys from its own folder via its own `netlify.toml`.
