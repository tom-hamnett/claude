# Claude in Chrome prompts: collection runs

Set-up once: in Chrome, be logged in to instagram.com as @therationalstrategist, and open https://insta-engage-tom-hamnetts-projects.vercel.app/more → Sync → Create account (then sign in with the same account on your phone).

Two prompts. Run **Prompt 1** once (it is quick: lists only). Then run **Prompt 2** once or twice a day until everyone is enriched; each run does about 60 profiles, highest value first.

Reels (counts as of 21 Nov 2026):

| id | title | funnelId | likes / comments |
|---|---|---|---|
| Dfk8muKM4pb | defendable reason | ae-example-report | 173 / 9 |
| DfEtmlnOhGC | five AIs | atlas-experiment | 168 / 4 |
| De4B13VumdP | AI trading | atlas-experiment | 222 / 11 |

---

## Prompt 1: who engaged (paste everything in the box)

```
You are collecting engagement data for my Instagram account @therationalstrategist. READ ONLY: never like, follow, comment, reply, message, or click Follow/Send. Stop and tell me if Instagram shows a warning, captcha or "try again later".

Reels:
- Dfk8muKM4pb  https://www.instagram.com/reel/Dfk8muKM4pb/  title "defendable reason"  funnelId "ae-example-report"
- DfEtmlnOhGC  https://www.instagram.com/reel/DfEtmlnOhGC/  title "five AIs"           funnelId "atlas-experiment"
- De4B13VumdP  https://www.instagram.com/reel/De4B13VumdP/  title "AI trading"         funnelId "atlas-experiment"

1. For each reel open the likes list and scroll to the end, recording every handle (and the display name shown) as an engagement {"type":"like","contentId":<id>,"at":<today ISO>}. Pause a second or two between scrolls.
2. For each reel read all comments: {"type":"comment","contentId":<id>,"at":<ISO>,"text":<comment>}. Ignore my own replies.
3. Open my followers list and scroll through it. Set "followsUs": true for every handle from steps 1-2 that appears there, false otherwise.
Do NOT open individual profiles in this run.

Output one JSON object:
{"version":1,
 "content":[{"id":"Dfk8muKM4pb","title":"defendable reason","url":"https://www.instagram.com/reel/Dfk8muKM4pb/","funnelId":"ae-example-report"},
            {"id":"DfEtmlnOhGC","title":"five AIs","url":"https://www.instagram.com/reel/DfEtmlnOhGC/","funnelId":"atlas-experiment"},
            {"id":"De4B13VumdP","title":"AI trading","url":"https://www.instagram.com/reel/De4B13VumdP/","funnelId":"atlas-experiment"}],
 "contacts":[{"handle":"…","name":"<display name if shown>","followsUs":true,"source":"chrome-collect <today>",
              "engagements":[ … every like/comment by this person, merged across reels … ]}]}

Then open https://insta-engage-tom-hamnetts-projects.vercel.app/more, paste the JSON into "Import a collection run", click Import, and tell me: the counts it reports, likes and comments found per reel, and how many follow me.
```

---

## Prompt 2: profile details, ~60 per run (repeat until done)

```
You are enriching leads for my Instagram account @therationalstrategist. READ ONLY: never like, follow, comment, message, or click Follow/Send. Wait 3-6 seconds between profiles. Stop after 60 profiles, or at once if Instagram shows a warning, captcha or "try again later".

1. Open https://insta-engage-tom-hamnetts-projects.vercel.app/leads. Work through people whose row shows no role or employer, in this order: anyone who commented, then anyone who follows me, then likers of "defendable reason", then everyone else.
2. Open each person's Instagram profile (instagram.com/<handle>). Record only what is visible (bio, name, link text, highlight titles): name, bio, role, employer, seniority (student|ic|senior_ic|manager|director|exec|founder|consultant|unknown), func (procurement|finance|hr|it|sales|operations|strategy|consulting|investing|trading|other), sector, location, interests (from the bio), challenges (1-2, only if the bio or their comment suggests one, in their words), motivations (make_a_case|promotion|sell|job_hunt|pitch|invest|board|learn, best guess or empty). If the employer is a known company, add employerStaff as an approximate headcount. Leave out anything you would be guessing. If the account looks under 18 or is a business/bot/spam page, set "doNotContact": true with a note. Never record health, religion, politics or family details.

Output: {"version":1,"contacts":[{"handle":"…", …fields above…, "source":"chrome-enrich <today>"}]}
Then paste it into Import at https://insta-engage-tom-hamnetts-projects.vercel.app/more, click Import, and tell me how many you did, how many remain without a role or employer, and anyone you flagged.
```

## Prompt 3: personal first messages for today's batch (run after "Draft for top 20")

Turns the template drafts on Today into one-off messages. Drafts only replace cards that are already on Today, so tap **Draft for top 20** first.

```
You are writing first DMs for my Instagram account @therationalstrategist. READ ONLY on Instagram: never like, follow, comment, message, or click Follow/Send. Wait 3-6 seconds between profiles. Stop at once if Instagram shows a warning, captcha or "try again later".

1. Open https://insta-engage-tom-hamnetts-projects.vercel.app/ (Today). List every card under "Ready to send": handle, funnel stage chip, what they did (like/comment, which reel) and the current draft.
2. For each, open instagram.com/<handle> and note only what they have chosen to show about work, business, studies or interests: bio, profile category, link text, highlight titles, and the topics of their last few posts. Do not infer anything from their photo or appearance. Never use health, religion, politics, family or location details.
3. Rewrite the draft so it reads as written for them:
   - Open with thanks for what they did on which reel.
   - One line that connects the tool to them: for "defendable reason" leads, suggest the comparison they might want (e.g. a video editor: "how your rates and output stack up against other editing studios"; a clothing shop: "how you compare with other online boutiques on staffing and reach"). For ATLAS leads, connect to their interest in trading, investing or AI.
   - End with one open question. No links, no prices, no "one word is plenty", no em dashes, under 45 words.
   - If the profile shows nothing usable, keep the current draft unchanged and skip it.
   - If the account is a pure spam, promo or bot page, do not write a draft; list it under "skip".
4. Output: {"version":1,"drafts":[{"handle":"…","text":"…"}]}
   Paste it into Import at https://insta-engage-tom-hamnetts-projects.vercel.app/more and click Import.
5. Tell me: how many drafts were personalised, how many kept the template, and the handles you suggest I Skip.
```
