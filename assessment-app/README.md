# Sigma

Σ — rapid, customisable assessment for any context: classrooms, sports teams, training programmes, performance reviews. Define your criteria, set a sliding scale, and sweep through the group on a touch device.

## Try it now (one-tap deploy)

Tap one of these from your phone — sign in with GitHub, pick this repo, and it'll deploy in ~1 minute. You'll get a public URL you can open in Safari and *Share → Add to Home Screen*.

**Vercel** (recommended — picks up the right branch and subfolder automatically):
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftom-hamnett%2Fclaude&project-name=sigma&root-directory=assessment-app)

> On the import screen, set **Root Directory** to `assessment-app` and pick branch **`claude/student-assessment-app-SZfol`**.

**Netlify** (alternative):
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/tom-hamnett/claude)

After it's live, open the URL in **iOS Safari**, tap **Share → Add to Home Screen**, and Sigma launches fullscreen like a native app.

## What it does

- **Groups** – manage cohorts: students, players, employees, anyone you assess.
- **Templates** – reusable bundles of criteria + sliding scale (e.g. *Rugby Skills* on a 1–5 *Emerging → Mastery* scale).
- **Sessions** – pick a group, choose a template (or define ad-hoc criteria), then sweep through people with one tap per criterion.
- **Reports** – per-criterion averages, sparkline trends per person, end-of-period roll-up, CSV export.
- **Local-first** – everything is stored in IndexedDB on the device. No login, no servers, works offline.
- **Backup / restore** – export and import a single JSON file from Settings.

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

The app ships with a PWA manifest. Open the deployed site in Safari, then **Share → Add to Home Screen**. It opens fullscreen and stores data on the device.

## Stack

- Vite + React 18 + TypeScript
- TailwindCSS
- Dexie (IndexedDB) + dexie-react-hooks
- React Router (HashRouter — works without a server-side rewrite rule)

## Data model

```
Group           one row per cohort
  └── Person   members of that group

Template        reusable criteria + scale
  └── TemplateCriterion

Session         one assessment event
  ├── SessionCriterion   (snapshot at session start)
  └── Mark              (per person, per criterion)
```

Sessions snapshot the scale + criteria they were started with, so editing a template later never breaks historical data.
