# GTM Intelligence Engine — Tool Spec (Plain English)

*Last updated: current build on branch `claude/gtm-intelligence-engine-0IM0T`*

---

## What it does

It's an AI-powered content marketing engine. You give it your business
strategy once, and it then helps you run a continuous content operation:
it generates content ideas that fit your strategy, lets you approve or
reject them, turns approved ideas into finished content (text, and
optionally video/images), and tracks what's queued and deployed.

The guiding principle: **you only input and review in your areas of
expertise** — the strategy, the approvals, the real data. The AI does the
heavy lifting of generation and organisation.

It runs as a web app (Streamlit) with four tabs:

- **PLAN** — your strategy at a glance. Shows what phase you're in
  (pre-launch / launch / growth / scaling), how your content is
  distributed across themes ("pillars"), where the gaps are, and gives
  one-click "fill this gap" actions.
- **CREATE** — a Kanban board where content flows left to right:
  `Ideas → Approved → Produced → Reviewed → Scheduled`. You approve cards,
  generate producer briefs, and push content down the pipeline.
- **PERFORM** — deployment history and (once platforms are connected)
  engagement metrics.
- **SETTINGS** — brand standards, avatar provider, the Core-Five reel
  spec, and the live signals inbox.

---

## What platforms it posts to

**Built and wired in the backend** (connectors exist, need your API keys):

- **LinkedIn** — via the LinkedIn API
- **Reddit** — via PRAW
- **X / Twitter** — via Tweepy
- **Email** — via SendGrid (lifecycle sequences and broadcasts)

**Planned / not yet connected**:

- Instagram / TikTok (via Meta Graph API)
- YouTube
- Substack
- Stripe / Lemonsqueezy (for revenue attribution)
- Google Analytics (for website traffic)

**Important:** the connectors are built but posting is not fully automated
end-to-end yet. Right now the tool generates and organises the content;
actual auto-publishing to live channels is the next piece to finish.

---

## What input format it needs for new content

**You don't upload content files.** This is not a "drop in a CSV of posts"
scheduler. Instead you feed it one of three things and it generates the
content for you:

### 1. Your business description (one time, at setup)
Plain-language text describing what you sell, who buys it, what makes it
different. The onboarding wizard turns this into a full content strategy
(audience segments, content pillars, channels, funnel).

### 2. A natural-language brief (for a specific batch)
Free text, e.g. *"A five-piece series introducing me as the founder and
why I'm building this."* No file, no fields — just describe what you want.
Optional structured fields you can set alongside it:

- **Brief type**: series | product_launch | feature_deep_dive |
  data_showcase | response | custom
- **Number of ideas**: how many pieces (1–50)
- **Target products** (optional)
- **Linked data sources** (optional — see Data Vault below)

### 3. Real data (into the Data Vault)
Any real data your content should cite — a performance log, a benchmark,
a customer quote. Fields:

- **Name** (e.g. "Atlas 52-week performance log")
- **Type**: dataset | benchmark | quote | metric | document | url
- **Content**: the actual data, pasted as text/markdown/CSV/JSON
- **Related products** (optional)
- **Verified** flag (so content only cites confirmed data)

### Schedule format
There is **no manual schedule-time input** yet. Content moves to a
"Scheduled" column when you approve it, and per-channel optimal posting
times are held as defaults in the engine (e.g. LinkedIn mornings, Reddit
US-timezone peaks). Fixed date/time scheduling is a planned addition.

---

## How you add a new content batch

**Option A — Generate a strategy-driven batch (fastest):**
1. Open the **CREATE** tab
2. Set the number of ideas (default 20) and click **"Generate ideas"**
3. The AI produces ideas balanced across your content pillars, each
   tagged with product, pillar, hook, and edginess score
4. They appear in the **Ideas** column for review

**Option B — Generate a targeted batch from a brief:**
1. On the **CREATE** tab, click **"New brief request"**
2. Type your request in plain language, set the type and count
3. Click **"Generate from brief"**
4. A coherent set of ideas serving that brief appears in the Ideas column

**Option C — Fill a specific strategy gap:**
1. On the **PLAN** tab, under "DO THIS NEXT"
2. If a pillar has zero content, click **"Fill gap"**
3. It generates 5 ideas specifically for that under-served theme

**Then move content down the pipeline (all on CREATE):**
1. **Ideas → Approved**: click "Approve" on cards you like
2. **Approved → Produced**: click "Producer Brief" (generates the full
   production spec — script, scenes, data references)
3. **Produced → Reviewed**: review the generated content, click "Approve"
4. **Reviewed → Scheduled**: click "Schedule"

**Command-line alternative** (for power users):
- `python main.py ideas 20` — generate 20 ideas
- `python main.py strategy-build` — build the content strategy
- `python main.py ui` — launch the web app

---

## The AI stack behind it

- **Claude** (Anthropic) — strategy, ideas, scripts, articles, emails,
  the "thinking" work
- **Gemini** (Google) — social copy, images (Nano Banana / Imagen),
  video (Veo), voice (TTS)
- **HeyGen** (optional, bring-your-own-key) — avatar talking-head video

Two API keys cover the core (Anthropic + Google). Everything else is
optional and bring-your-own-key.

---

## Honest status

**Works today:** strategy building, idea generation, the approval funnel,
producer briefs, text content generation, the three-tab UI, brand
standards, the data vault.

**Partially built:** video/image generation (works but fiddly),
deployment connectors (built, not fully auto-publishing).

**Not yet built:** live platform auto-posting, engagement/revenue
analytics ingestion, fixed date-time scheduling.
