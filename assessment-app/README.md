# AssessIQ

Touch-first assessment app for educators (and any other context where someone marks a group of people on customisable criteria). Designed to feel native on iPad.

## What it does

- **Classes** – manage cohorts of students/players/employees.
- **Templates** – reusable bundles of criteria + sliding scale (e.g. *Rugby Skills* on a 1–5 *Emerging → Mastery* scale).
- **Sessions** – pick a class, choose a template (or define ad-hoc criteria), then sweep through people with one tap per criterion.
- **Reports** – per-criterion averages, end-of-year roll-up, sparkline trends per person, CSV export.
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

## Installing on iPad

The app ships with a PWA manifest. Open the deployed site in Safari, then **Share → Add to Home Screen**. It opens fullscreen and stores data on the device.

## Stack

- Vite + React 18 + TypeScript
- TailwindCSS
- Dexie (IndexedDB) + dexie-react-hooks
- React Router (HashRouter — works without a server-side rewrite rule)

## Data model

```
Group           one row per class/cohort
  └── Person   members of that group

Template        reusable criteria + scale
  └── TemplateCriterion

Session         one assessment event
  ├── SessionCriterion   (snapshot at session start)
  └── Mark              (per person, per criterion)
```

Sessions snapshot the scale + criteria they were started with, so editing a template later never breaks historical data.
