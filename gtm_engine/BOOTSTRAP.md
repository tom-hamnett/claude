# GTM Intelligence Engine — Claude Code Bootstrap
## Paste this entire file into Claude Code on first run

---

## WHAT YOU ARE RESUMING

This is NOT a fresh start. A significant amount of work has already been done in a
claude.ai conversation. You are picking up from where that left off.

DO NOT start from scratch. DO NOT ask discovery questions that have already been answered.
Read everything in this file first, confirm you have absorbed it, then proceed.

---

## WHAT ALREADY EXISTS

### 1. A working React prototype
A functional Layer 1 + Layer 2 prototype was built and demonstrated. It includes:
- Adaptive one-question-at-a-time discovery interview (Claude API powered)
- Progressive GTM Brief JSON construction with 8 sections
- Interactive brief display panel with expandable sections
- One-click strategy generation from completed brief
- Full strategy output: segmentation, positioning, channels, edginess framework
- Dark UI with brand aesthetic: bg #0a0a0f, accent #6c63ff, hot #ff6b6b, gold #ffd166

This prototype MUST be ported into the Streamlit dashboard as the starting point
for the UI — do not rebuild it from scratch. The React code is saved as
gtm-discovery-engine.jsx in the project outputs.

### 2. A complete GTM strategy for the founder's own products
This has been generated and saved. It covers two products:
- Diagnostic Engine (company analysis tool, under Analysts Edge brand)
- Atlas (automated trading system, under Quantum Tools brand)
Full strategy including segmentation maps, positioning, channel stack, and
edginess framework is saved in session_context.md

### 3. The first master asset
Title: The Consultancy Death Spiral (And Why White-Label AI Is The Only Exit)
File: master_asset_001.md
Status: Complete, approved, quality benchmark for all future content
All derivatives mapped: LinkedIn post, carousel, Reel script, Twitter thread, email

### 4. Architecture designed (8 layers)
See CLAUDE.md for full specification.

---

## FOUNDER AND PRODUCT CONTEXT

Founder: Tom
Working directory: C:\Users\tomha\
Products: Diagnostic Engine (Analysts Edge) + Atlas (Quantum Tools)
Budget: $500-2000/month total marketing automation
Stack: Python + APIs
Monetisation: Paid subscriptions + white-label licensing from day one
Tone: Never pushy. Never transactional. Teach, demonstrate, make them reach for it.

### Diagnostic Engine
Outside-in company analysis tool. Generates structured business diagnostics from
public data, benchmarked against peers. MVP built, not yet launched.
Target: Independent consultants (priority 1), investors (priority 2),
MBA students (pipeline), corporate strategy teams (enterprise licensing).
Positioning: "You already know what good analysis looks like. Now imagine doing it
in minutes instead of days."

### Atlas
Automated trading and learning system. Deployed to DigitalOcean.
Listed for sale via Lemonsqueezy. Pending: buy button, domain, licence key system.
Target: Quantitatively sophisticated retail traders (priority 1),
finance professionals (priority 2), fintech platforms white-label (priority 3).
Positioning: Anti-guru. Transparent methodology. Teaches users to think better
than the system. Public performance log showing real trades including losses.

---

## BRAND STANDARDS (pre-configured)

Voice: Sharp, transparent, authoritative. Never corporate. Never salesy.
Edginess level: 8/10
Forbidden phrases: game-changer, revolutionary, unlock your potential,
                   disruptive, innovative, cutting-edge
Write up: Always assume intelligent reader. Never condescend.

Five edginess principles (apply to ALL content):
1. Say the uncomfortable thing — find the truth nobody says publicly and say it first
2. Show your work — transparency beats bold claims every time
3. Have a point of view — every piece must contain a clear, arguable perspective
4. Punch at the category — challenge the old way, never name competitors
5. Respect the reader's intelligence — write up, assume sophistication

Visual: Dark aesthetic. #0a0a0f background. #6c63ff primary accent.
        #ff6b6b hot accent. #ffd166 gold accent. #e8e8f0 text.
        Playfair Display for headings. DM Sans for body.

---

## CONTENT ALREADY IN QUEUE

### Master Asset 001 — The Consultancy Death Spiral
File: master_asset_001.md
Derivatives needed (generate these as part of Layer 3 build test):
- LinkedIn short post (hook: the $50M loss, CTA: which phase is your firm in?)
- LinkedIn carousel (6 slides, structure mapped in master_asset_001.md)
- Instagram/TikTok Reel script (45-60 sec, structure mapped)
- X/Twitter thread (5 tweets, mapped)
- Email lifecycle Day 3 (the uncomfortable truth email, 3 subject line variants)

These derivatives must be the first output when Layer 3 content factory is tested.
They prove the pipeline works and give the founder real content to deploy immediately.

---

## BUILD ORDER — START HERE

You are beginning at Step 1. Work through these in sequence.
Do not skip ahead. Confirm completion of each step before moving to the next.

STEP 1: Project scaffold
  Create full folder structure, requirements.txt, .env.example
  Copy session_context.md and master_asset_001.md into data/ folder
  Confirm with file tree

STEP 2: Layer 1 — Discovery Engine (CLI)
  Python CLI version of the adaptive interview
  Saves completed brief as gtm_brief.json to data/briefs/
  Test with a real run

STEP 3: Layer 2 — Strategy Engine
  Ingests gtm_brief.json
  Generates full strategy output
  Saves as gtm_strategy.json and gtm_strategy_report.md
  Test with the founder's existing brief (already captured in session_context.md)

STEP 4: Layer 8 — Brand and Standards Module
  Create brand_standards.json from the brand context above
  This must exist before any content generation
  Build the benchmark_check() function that all content passes through

STEP 5: Database schema
  SQLite tables: briefs, strategies, master_assets, derivatives, performance_log,
                 decision_log, intelligence_feed, stage_gates
  Migration scripts included

STEP 6: Layer 3A — Master Asset generation
  Claude API powered
  Ingests strategy + prompt → generates master asset
  Saves to data/master_assets/
  Test by regenerating MA-001 and comparing quality

STEP 7: Layer 3B — Derivative Pipeline
  For each master asset, generate all 11 derivative formats
  Tag every derivative with full metadata
  Save to data/content_queue/
  TEST: Run MA-001 through full derivative pipeline
  Expected output: LinkedIn post, carousel, Reel script, Twitter thread, email x3 variants

STEP 8: Layer 3C — Multi-AI routing
  Add GPT-4o routing for social copy and variations
  Add Gemini routing for SEO content and visual briefs
  Router selects model based on content type

STEP 9: Layer 3D+E — Tagging + Content Pipelines
  Full tagging system on all derivatives
  Five defined pipelines: video, article, email lifecycle, Reddit, talking head
  Each pipeline saves intermediate outputs — never lose work to failed API call

STEP 10: Layer 6 — Live Intelligence Feed
  CLI input accepting raw text, paste, data
  Signal assessment (priority 1-5)
  Content brief generation
  Founder confirmation flow
  Queue with urgency tag

STEP 11: Layer 4 — Audience Development Module
  Per-channel playbooks as config: Reddit, LinkedIn, Email, Instagram, Substack, Twitter
  Email lifecycle sequence builder (Day 0 through Day 21 + ongoing)
  Boost decision scorer for Instagram/TikTok posts

STEP 12: Layer 5 — Deployment connectors
  Email via SendGrid (build and test first)
  Reddit via PRAW (test in private subreddit)
  LinkedIn API
  Instagram via Meta Graph API
  X/Twitter via Tweepy

STEP 13: Layer 5 — Feedback + Reprioritisation
  Performance signal ingestion per channel
  Reprioritisation logic with plain English decision logging
  Boost recommendation engine

STEP 14: Layer 7 — Stage Gates + Reporting
  Weekly trigger (configurable)
  Challenge question set
  Fresh context injection
  Plain English weekly report (5 sections)

STEP 15: Streamlit Dashboard
  Port React prototype aesthetic into Streamlit
  All 8 layers accessible from single UI
  Pages: Discovery, Strategy, Content, Performance, Reports, Brand Standards, Intelligence Feed
  Dark theme matching prototype: #0a0a0f background, accent colours as above

STEP 16: Commercialisation packaging
  Multi-tenant architecture
  Per-user API key management
  Stripe billing hooks for 3 tiers
  White-label configuration per tenant

---

## HOW TO CONFIRM YOU HAVE ABSORBED THIS

Before writing a single line of code, respond with:
1. A one-paragraph summary of what has already been built and saved
2. Confirmation of what the first three build steps are
3. One question if anything is unclear

Then wait for confirmation before beginning Step 1.

---

## CODING STANDARDS

- Every module: single clear responsibility
- Every function: docstring explaining what it does and returns
- All API calls: retry logic with exponential backoff
- All outputs: saved to disk as JSON and/or Markdown with timestamps
- All decisions: logged with timestamp and plain English reasoning
- No hardcoded keys: environment variables only
- Modular: each layer runs independently or as part of full pipeline
- Every pipeline step saves intermediate output — never lose work to a failed API call
- Comments explain WHY not just WHAT

---

## ENVIRONMENT VARIABLES NEEDED

ANTHROPIC_API_KEY=         # Required for Step 1 — get this first
OPENAI_API_KEY=            # Required from Step 8
GEMINI_API_KEY=            # Required from Step 8
REDDIT_CLIENT_ID=          # Required from Step 12
REDDIT_CLIENT_SECRET=      # Required from Step 12
REDDIT_USERNAME=           # Required from Step 12
REDDIT_PASSWORD=           # Required from Step 12
LINKEDIN_ACCESS_TOKEN=     # Required from Step 12
TWITTER_BEARER_TOKEN=      # Required from Step 12
TWITTER_API_KEY=           # Required from Step 12
TWITTER_API_SECRET=        # Required from Step 12
META_ACCESS_TOKEN=         # Required from Step 12
SENDGRID_API_KEY=          # Required from Step 12
SUPABASE_URL=              # Required from Step 16
SUPABASE_KEY=              # Required from Step 16
STRIPE_SECRET_KEY=         # Required from Step 16

You only need ANTHROPIC_API_KEY to begin. Add others as each step needs them.

---

## IF YOU GET STUCK OR LOSE CONTEXT

If you lose context mid-session, run this command:
"Re-read CLAUDE.md and the bootstrap file. Scan the project folder.
Tell me what has been built, what step we are on, and what comes next."

The combination of CLAUDE.md + this bootstrap file + the project folder state
contains everything needed to resume from any point.
