# Sigma

> The offline-first clipboard for anyone evaluating people in the field — built for spotty WiFi, not conference rooms.

Sigma is a touch-first PWA in the [Quantum Tools](https://quantumtools.ai) family. Define criteria, set a sliding scale, and sweep through a group with one tap per criterion. Schools, sites, clinics, pitches, shops — anywhere a clipboard lives.

## Why Sigma

- **Truly offline-first.** Local-first IndexedDB. The app loads, reads, writes, and exports without a connection. No login required.
- **One platform across verticals.** Pre-built rubrics for schools (PE, MFL oracy, oracy, behaviour), 1:1 tutoring, construction safety walks and snagging, OSCEs and observed nursing practice, sport coaching, and corporate L&D.
- **AI as a domain coach (not a chatbot).** Generate a credible rubric from a one-line brief. Spot calibration drift while you mark. Draft the report you'd otherwise type by hand. Surface trends across sessions.
- **Light UI, outdoor-readable.** High contrast in bright light. Big touch targets. iPad-first.
- **Evidence on-device.** Photos, voice memos and signatures attached to marks, never sent to a server unless you choose to share.

## Pricing

| Tier | Price | What you get |
|---|---|---|
| **Free** | £0 | Full clipboard product. Templates, sessions, reports, evidence, exports, backups. Forever. |
| **BYOK unlock** | £4.99 one-time | Paste your own Anthropic / OpenAI / Gemini key. All AI features. You pay your own inference. |
| **Sigma AI** | £9.99 / month | Managed AI — no key needed. 200 calls/day. Works the moment you sign up. |

Get an unlock code at [quantumtools.ai/sigma/unlock](https://quantumtools.ai/sigma/unlock).

## The four AI features

1. **Rubric Generator** — one-line brief → 4-7 credible criteria + sliding scale, ready to use.
2. **Calibration Coach** — quietly notices score inflation, compression, inconsistency or missing evidence while you mark.
3. **Report Drafter** — turns a session's marks and comments into a polished narrative for parent / manager / trainee / client / your own notes.
4. **Insight Surfacer** — reads your roll-up across sessions and flags trends, risks, strengths and cohort patterns in plain English.

All four work BYOK or managed, all four fail gracefully when offline or quota-exhausted, and all four respect your provider choice (Anthropic, OpenAI, Gemini).

## Running locally

```bash
npm install
npm run dev
# open http://localhost:5173
```

To build for production:

```bash
npm run build
npm run preview
```

## Installing on iPad / iPhone

The app ships with a PWA manifest and a service worker. Open the deployed site in Safari, then **Share → Add to Home Screen**. It opens fullscreen, stores data on the device, and survives flaky WiFi.

## Stack

- Vite + React 18 + TypeScript (strict)
- TailwindCSS — light UI, QT purple accents, gold for premium
- Dexie (IndexedDB) + dexie-react-hooks for live-reactive local-first data
- WebCrypto AES-GCM for at-rest encryption of BYOK API keys
- React Router (HashRouter — works without server-side rewrite rules)
- Hand-rolled service worker for offline app-shell + stale-while-revalidate static assets

## Data model

```
Group        one row per cohort  (school class, site, ward, team)
 └─ Person   members of that group

Template     reusable criteria + scale
 └─ TemplateCriterion

Session      one assessment event
 ├─ SessionCriterion  (snapshot at session start)
 ├─ Mark              (per person, per criterion, with optional comment + evidenceIds)
 ├─ aiNarrative       (cached AI-drafted report)
 └─ signatureEvidenceId

Evidence     photo / voice / signature blobs (kept off the main rows)

AppSettings  vertical, AI provider/model, encrypted BYOK key, license, daily usage
```

Sessions snapshot the scale + criteria they were started with, so editing a template later never breaks historical data.

## Privacy

- Data lives only on this device. No backend.
- BYOK API keys are encrypted at rest with WebCrypto AES-GCM (PBKDF2-derived from your passphrase). Plaintext storage is offered but flagged.
- AI calls are made browser-direct to your chosen provider. The managed tier (when active) routes through the Quantum Tools edge proxy with a session token; your provider key is never exposed to the browser.
- Photos / voice / signatures stay on the device unless you choose to share via Print or screenshot.

## One-tap deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftom-hamnett%2Fclaude&project-name=sigma&root-directory=assessment-app)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/tom-hamnett/claude)

> On the import screen, set **Root Directory** to `assessment-app` and pick branch **`claude/student-assessment-app-SZfol`**.

---

Sigma is part of the Quantum Tools house: PRISM (workforce intelligence), Analyst's Edge (outside-in diagnostics), APEX (programme management), ATLAS (autonomous swing trading research). One brand, many tools.
