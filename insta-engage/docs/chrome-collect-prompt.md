# Paste into Claude in Chrome (first collection run, 20 Nov 2026)

Before you start: be logged in to instagram.com as @therationalstrategist in Chrome, and signed in to the Insta Engage app (More → Sync) in the same Chrome so the import syncs to your phone.

---

You are collecting engagement data for my Instagram account @therationalstrategist. **Read only.** Never like, follow, comment, reply, send a message, or click any Send/Follow button. Wait 2–5 seconds between opening profiles. Stop and tell me if Instagram shows a warning, captcha or "try again later".

**Reels** (use these ids and titles exactly):

| id | url | title | funnelId |
|---|---|---|---|
| Dfk8muKM4pb | https://www.instagram.com/reel/Dfk8muKM4pb/ | defendable reason | ae-example-report |
| DfEtmlnOhGC | https://www.instagram.com/reel/DfEtmlnOhGC/ | five AIs | atlas-experiment |
| De4B13VumdP | https://www.instagram.com/reel/De4B13VumdP/ | AI trading | atlas-experiment |

**Step 1, engagement.** For each reel: open it, open the likes list and record every handle (`type: "like"`). Read the comments and record handle + text (`type: "comment"`). Then open my followers list and note, for each person you found, whether they follow me (`followsUs`). Also record anyone in my 20 newest followers as `type: "follow"` (no contentId).

**Step 2, profiles.** Open each person's profile. Record only what is on it (bio, name, link text, highlights titles): `name`, `bio`, `role`, `employer`, `seniority` (student | ic | senior_ic | manager | director | exec | founder | consultant | unknown), `func` (procurement, finance, hr, it, sales, operations, strategy, consulting, investing, other), `sector`, `location`, `interests` (from the bio), `challenges` (1–2, only if the bio or their comment suggests one, phrased as they would say it), `motivations` (make_a_case | promotion | sell | job_hunt | pitch | invest | board | learn; your best guess from the bio, or empty). If the employer is a known company, add `employerStaff` as an approximate headcount. Leave fields out rather than guessing. Skip anyone who looks under 18. Never record health, religion, politics or family details.

**Step 3, output.** Produce one JSON object exactly in this shape (`at` = today's date in ISO format if the exact time isn't shown):

```json
{"version":1,
 "content":[{"id":"Dfk8muKM4pb","title":"defendable reason","url":"https://www.instagram.com/reel/Dfk8muKM4pb/","funnelId":"ae-example-report"},
            {"id":"DfEtmlnOhGC","title":"five AIs","url":"https://www.instagram.com/reel/DfEtmlnOhGC/","funnelId":"atlas-experiment"},
            {"id":"De4B13VumdP","title":"AI trading","url":"https://www.instagram.com/reel/De4B13VumdP/","funnelId":"atlas-experiment"}],
 "contacts":[{"handle":"someone","name":"…","bio":"…","role":"…","employer":"…","employerStaff":12000,"seniority":"manager",
              "func":"procurement","sector":"…","location":"…","interests":[],"challenges":[],"motivations":[],
              "followsUs":true,"source":"chrome-collect 2026-11-20",
              "engagements":[{"type":"like","contentId":"Dfk8muKM4pb","at":"2026-11-20T09:00:00Z"},
                             {"type":"comment","contentId":"De4B13VumdP","at":"2026-11-20T09:00:00Z","text":"…"}]}]}
```

**Step 4, import.** Open https://insta-engage-tom-hamnetts-projects.vercel.app/more, paste the JSON into the "Import a collection run" box and click **Import**. Tell me the counts it reports and list anyone you skipped and why.
