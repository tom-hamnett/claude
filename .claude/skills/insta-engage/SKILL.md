---
name: insta-engage
description: Use when Tom asks to collect Instagram likers/followers/commenters for The Rational Strategist, enrich or prioritise leads, draft funnel DMs, or build the redacted example reports for leads, producing a JSON bundle he imports into the Insta Engage phone app.
---

# Insta Engage runs

The phone app (`insta-engage/app`) holds leads, funnels and threads. Claude does the work the app cannot: reading Instagram, enriching profiles, writing better drafts and building reports. Every run ends with ONE JSON bundle for Tom to import (More → Import), saved to `insta-engage/runs/YYYY-MM-DD-<run>.json` and shown to him.

Hard rules (Instagram and brand):
- Claude in Chrome **reads only**. Never like, follow, comment, or send a DM. Never click Send. Human pace: pause 2–5 s between profile opens, at most ~150 profile views per run.
- The account is the anonymous persona. Never mention Tom.
- Skip and flag do-not-contact: anyone under 18 or plainly a personal/private account, anyone who said no before, any sector or company Tom has added to the blocklist in More → Rules (empty by default: every company at face value).
- Store work facts only (title, employer, function, seniority, location, interests stated in the bio). No sensitive data (health, religion, politics, family).

## 1. Collect (Claude in Chrome, Tom's logged-in instagram.com)
For each reel Tom names (or the last 3 reels):
1. Open the reel → likes list. Record each handle as `{type:"like", contentId, at}`.
2. Comments: handle + text as `{type:"comment", text}`.
3. Followers page: new followers since the last run as `{type:"follow"}`; note whether each liker follows us (`followsUs`).
Add the reel to `content` with a short `title` (2–4 words, used in "thanks for liking the ___ reel").

## 2. Enrich and prioritise
Open each profile (bio, link, highlights only). Fill: `name`, `bio`, `role`, `employer`, `employerStaff` (look up approximate headcount if the employer is named), `seniority` (student|ic|senior_ic|manager|director|exec|founder|consultant|unknown), `func`, `sector`, `location`, `interests[]`, `challenges[]` (1–3, phrased as they would say them), `motivations[]` (make_a_case|promotion|sell|job_hunt|pitch|invest|board|learn). The app scores; do not invent a score.

## 3. Drafts (optional, improves on the app's templates)
For threads in the export Tom provides (`threads` with status `ready`), write `drafts: [{threadId, text}]` following `insta-engage/docs/messaging-principles.md`: stage word cap, one question last, one-word answerable, easy out, no links in first touch, no price before the offer stage, no banned words, no em dashes, vary the first line.

## 4. Reports
For each `reports` entry with status `requested`: choose 5–7 plausible peers (same sector, similar scale), then run `python insta-engage/report-example/make_lead_report.py <request.json> <outdir>` (cohort rule: under the threshold → whole company, else the function). Upload the PDF and carousel PNGs somewhere Tom can share from his phone (Drive or Dropbox shared link), then return the report with `status:"ready"`, `peers`, `pdfUrl`, `imageUrls`. Blocked → `status:"blocked"` with a `note`.

## Bundle format
```json
{ "version": 1,
  "content":  [{ "id": "reel-fat-or-lean", "title": "fat or lean", "url": "https://instagram.com/reel/…", "funnelId": "ae-example-report" }],
  "contacts": [{ "handle": "someone", "name": "…", "bio": "…", "role": "…", "employer": "…", "employerStaff": 12000,
                 "seniority": "manager", "func": "procurement", "sector": "logistics", "followsUs": true,
                 "interests": [], "challenges": [], "motivations": ["make_a_case"],
                 "engagements": [{ "type": "like", "contentId": "reel-fat-or-lean", "at": "2026-11-20T09:00:00Z" }],
                 "source": "chrome-collect 2026-11-20" }],
  "reports":  [{ "id": "<from export>", "contactId": "…", "status": "ready", "peers": ["…"], "pdfUrl": "https://…", "imageUrls": ["https://…"] }],
  "drafts":   [{ "threadId": "<from export>", "text": "…" }] }
```
Contacts merge by handle; engagements de-duplicate; do-not-contact is never cleared by an import.
