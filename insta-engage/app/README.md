# Insta Engage app

Phone-first PWA (Vite, React, TypeScript, Tailwind, Dexie). Add it to the home screen.

- **Today**: follow-ups due ("Replied" / "No reply"), drafted messages ranked by score, daily cap (20 new conversations).
- **Copy & open DM**: copies the message, logs the person as contacted, schedules the follow-up, opens `ig.me/m/<handle>` (Instagram app). Undo in the toast.
- **Log their reply**: paste it, tap an intent (Interested, Yes, Named a company, Question, Not now, No); the funnel branch picks the next stage and drafts the next message. Naming a company requests a redacted example report (cohort rule: under 5,000 staff → whole company, else the function).
- **Pipeline**: one lane per stage. **Leads**: ranked with a "why this score" breakdown. **Funnels**: one per artefact, copy to add a product, edit stages, wording, word caps, follow-up days and reply branches.
- **More**: import a Claude run (JSON), export a backup, rules (cap, batch size, cohort threshold, blocked sectors/companies, salesy words).

Messaging defaults come from `../docs/messaging-principles.md`. Claude runs: `.claude/skills/insta-engage/SKILL.md`.

```
npm install && npm run dev      # http://localhost:5180
npm test                        # funnel logic tests
npm run build                   # dist/ for Netlify (netlify.toml included)
```

Data lives on the device (IndexedDB) until the Supabase project exists; `../supabase/schema.sql` is ready for it.
