# Market benchmark: AI coaching from real conversations

Research date: 23 Oct 2026. Scope: how the best speech coaches, sales conversation-intelligence tools, leadership assessments, dating/social coaching products and skill-progression systems structure measurement, scoring, feedback, memory and progress, and what Tom's three Recorder coaches (Executive Presence, Leadership, Game) should copy or avoid.

How to read this: facts carry a source number `[n]` (list in section 5). Where a vendor claims something with no independent check, it says "vendor claim". Where I could not verify something, it says so. Recommendations in section 3 and 4 are my synthesis, not sourced facts.

---

## 1. Executive summary

**Copy**

1. **Separate measured signals from judged behaviour.** Every serious product keeps a small set of objective, well-defined interaction stats (Gong: talk ratio, longest monologue, longest customer story, interactivity, patience, question rate [1]; Microsoft: pace, pitch/monotone, fillers [18]) apart from rubric judgements (Gong scorecards, often AI-suggested and human-overridable [2][3]). Recorder already computes the first layer locally; keep the two layers visibly distinct.
2. **Use a shallow, anchored capability tree.** Validated models cluster at 15 to 25 leaf items: Bates ExPI 3 dimensions × 5 facets = 15 [27]; CCL Benchmarks for Managers 16 competencies + 5 derailers [26]; BetterUp 4 categories, 25 dimensions [30]. Korn Ferry's 38 competencies, 12 clusters and 4 factors [24] is a library to choose from, not a per-person scorecard. Target **5 or 6 capabilities × 3 or 4 sub-capabilities (about 18 to 24 leaves) per lens**.
3. **Behavioural anchors with an "overused" state.** Korn Ferry describes each competency at Less Skilled → Skilled → Talented, plus a separate **Overused** state [24]. Hogan scores derailers as strengths that turn into risks under pressure [25]. Tom's models need this too: too much certainty becomes arrogance, too much leading becomes control, too much escalation becomes pushiness.
4. **Show uncertainty, not just a number.** Glicko-2 attaches a rating deviation (which widens with inactivity) and a volatility to every rating [53]. Duolingo's Birdbrain updates learner ability in an Elo-like way, by how surprising each result was [51]. Whoop's Recovery score only becomes meaningful after personal baselines are built over several weeks [54]. Recorder should give each sub-capability a rating, an error band and an evidence count, and show no overall % until the evidence is enough.
5. **Use a benchmark band, not a single target.** Gong's guidance is phrased as ranges: talk ratio about 43:57, monologue at most 2:30, patience 0.6 to 1.0 s, 18+ questions per hour [1], and 11 to 14 discovery questions with diminishing returns beyond that [5]. Microsoft gives 100 to 165 wpm for pace [18]. Bands must depend on context (a date, a 1:1 and a board pitch need different talk-share targets).
6. **Cite evidence and allow overrides.** Gong shows why the AI chose each scorecard answer, lets authorised users override it, and keeps both the original scorer and the editor on record [2]. This is the right pattern for the "challenge the evidence" chat.

**Avoid**

7. **Harshness aimed at the self.** Kluger and DeNisi's meta-analysis found that feedback improved performance on average (d = .41), but over a third of feedback interventions made performance *worse*. Effectiveness falls as attention moves from the task to the self [49]. The "harsh 300-word verdict" should be harsh about behaviours and evidence, never about Tom's identity or worth.
8. **Metric theatre and opaque scores.** Users complain when they cannot see what makes a score poor, okay or great (Poised review on G2 [15]). Reps reject filler-word counts that feel like policing a natural style (Chorus review [8]). Gong users report it became an expensive recording device when no coaching habit was built around it [6]. Every number needs an anchor, an example and a drill attached.
9. **Score inflation and drift from LLM judges.** Research on LLM judges documents stable position bias, rubric-interference effects (one criterion's score shifts depending on the other criteria scored with it) and leniency. High test-retest reliability can coexist with bias [55]. Calibrate against a small human-labelled gold set, version every rubric, and re-score the gold set before any rubric change goes live.
10. **Vendor dependence and weak evidence in the "Game" field.** Poised is shutting down on 8 Oct 2026 [15], and Hume's Expression Measurement API was sunset in June 2026 [20]. Keep feature extraction local, as Recorder already does. In the dating/charisma space almost no product analyses real recorded interactions with a published method (the few apps that try have zero or few ratings [43]), and the frameworks (Mystery Method, Love Systems, RSD) are practitioner lore, not research [34][35][39]. Treat them as hypotheses to test against Tom's own outcomes, and tag their evidence grade.

---

## 2. Comparison table

Legend: **AI** = automated scoring, **H** = human raters. "n/v" = not verified.

### 2a. AI speech and conversation coaches

| Product | What it measures | Taxonomy | How scores are built and calibrated | Tone | Memory and progress | Praise / complaints | Price (brief) |
|---|---|---|---|---|---|---|---|
| **Yoodli** | Pacing (wpm), fillers, conciseness, vocabulary diversity, eye contact (webcam), talk-to-listen ratio, sentence-starter repetition (third-party reviews) | Delivery metrics plus custom enterprise rubrics. Calls pulled from Gong are scored "against your rubric" [14] | AI. Custom rubrics defined by the customer's L&D team. Scoring method not published [14] | Marketed as "judgment-free practice" [14] | "Measure" dashboards: skill progression, readiness trends. Weekly digest pointing to the next thing to practise [14] | No credible independent review set found (G2/Capterra searches returned other products) | Free (5 lifetime sessions), Pro $8/mo, Advanced $20/mo, billed annually; Business/Enterprise per seat [14] |
| **Poised** | Fillers, hedging words (feed Clarity and Confidence), Speakshare %; other sources add pace, energy, empathy [15] | Confidence / Clarity / Energy / Empathy (source lists vary) | AI. Percentages, e.g. Clarity 92%, Confidence 86% on the homepage [15] | Gentle live nudges | Growth areas tracked over time, private to the user [15] | G2 4.5/5 (23 reviews). Complaint: unclear what makes a category poor, okay or great [15] | **Shutting down 8 Oct 2026.** Acquired by Deepgram in June 2024 per Dealroom/CB Insights [15] |
| **Orai** | Clarity, confidence, pace, fillers [16] | Delivery metrics | AI. Method not published | n/v | Scorecards, streaks, history [16] | Capterra 4.6/5 (14 reviews, mostly 2019). Users wanted body-language feedback [16] | Premium about $12/mo (third-party, unverified) [16] |
| **Speeko** | Pace, pausing, intonation, fillers, "eloquence" [17] | Delivery metrics plus lessons | AI; "based on thousands of speech recordings" and communication literature (vendor claim) [17] | Encouraging, lesson-led | Lessons and history | n/v | US App Store: $24.99/mo or $89.99/yr; several in-app SKUs [17] |
| **Microsoft Speaker Coach** (PowerPoint, Teams) | Pace, pitch/monotone, fillers, informal speech, euphemisms, culturally sensitive terms, repetitive language, originality; Teams adds speaking time [18] | Flat metric list | AI. Pace band 100–165 wpm [18] | Neutral, factual | Post-session report. In Teams it is private: admins cannot see it [18] | Free; English only; not in channel meetings [18] | Included with M365 |
| **Google Interview Warmup** | Job-related terms, most-used words (3+ uses), talking points covered [19] | Content insights only | ML highlights. **Explicitly does not grade** ("insights help you discover patterns") [19] | Non-judgemental | None; audio not saved, transcript downloadable [19] | Free, US focus (2022 data) | Free |
| **Hume AI** | Prosody model: 48 dimensions of emotional expression from voice; newer docs list 415 expression and 190 voice-attribute names [20] | Emotion dimensions | AI model trained by Hume | n/a (API) | n/a | **Expression Measurement API sunset**: last API day 14 June 2026 per the Hume FAQ; overview page now says "limited release, contact sales" [20] | Contact sales |
| **VirtualSpeech** | Pace, fillers, eye contact in VR/browser roleplays; then a two-way dialogue with an AI coach [21] | Course-based soft-skill topics | AI. No numeric soft-skill score method found | n/v | Course progress | n/v | Individual $45/mo or $399/yr [21] |
| **Rehearsal** (video roleplay) | Video answers to scenarios, scored by managers, peers or AI [22] | Customer-defined scenarios | H + AI | n/v | Reporting | Acquired by eLearning Brothers (ELB Learning), 2022 (date inconsistent across sources) [22] | n/v |
| **Quantified Communications** | Linguistic, vocal and nonverbal patterns benchmarked against other communicators (e.g. a CFO's first earnings call vs predecessor and competitors) [23] | Proprietary index | Algorithmic, against a benchmark database (vendor claim; no independent validation found) [23] | n/v | n/v | Still has a site and blog; current status not verified | n/v |

### 2b. Conversation intelligence (sales, contact centre)

| Product | What it measures | Taxonomy | Scoring and calibration | Tone | Memory and progress | Praise / complaints | Price |
|---|---|---|---|---|---|---|---|
| **Gong** | Interaction stats: talk ratio, longest monologue, longest customer story, interactivity (switches per 5 min, capped at 10), patience (median pause after the other person stops), question rate per hour [1] | Interaction stats + customer-built scorecards (range, yes/no, multi-select, open questions; mandatory or optional) [3] | Benchmarks from Gong's own call data: 43:57, ≤2:30 monologue, interactivity ≥5, patience 0.6–1 s, ≥18 questions/hr [1]. AI suggests scorecard answers with reasoning; scoring guides per question; overrides keep both names [2]. Gong Labs: 11–14 discovery questions best, spread through the call, targeted on the customer's problems [5] | Data-led; managers coach | Team insights over time, coaching workflows; recommends starting with 1 scored call per rep per week [4] | G2 about 4.7/5 per secondary sources. Complaints: price, platform fees, lock-in, "surveillance" feel, becomes a recording device without coaching habits [6] | About $1,600/user/yr + platform fee (secondary sources, unverified) [6] |
| **Chorus (ZoomInfo)** | Filler words, engaging questions, longest monologue, talk time [8] | Conversation skills + deal analytics | AI. Benchmarks not published in what I found | n/v | Self-coaching views | A reviewer felt filler tracking tries to change a natural style and is too sensitive [8] | Bundled with ZoomInfo |
| **Salesloft** | AI scorecard from transcripts against predefined criteria; key moments; suggested coaching notes [9] | Customer-defined scorecards | AI auto-scores every call and groups by performance tier; advice to align on scoring criteria for consistency [9] | Manager-led | Scorecards show up as manager tasks in the workflow [9] | n/v | Enterprise |
| **Second Nature** | Roleplay: knowledge accuracy, conversational style, clarity, confidence; feedback in 45–90 s [10] | Customer rubrics | GPT on Azure; weights not published [10]. Review: no evidence it links practice to live-call outcomes [10] | n/v | Certification flows | See left | Enterprise |
| **Hyperbound** | AI roleplays built from real calls; real-call scoring; scorecards aligned to sales methods [11] | Methodology scorecards | AI | n/v | Certification | Almost no user reviews yet [11] | Free + custom [11] |
| **Balto** | Real-time prompts and checklists; automated QA scoring from natural-language criteria [12] | Custom QA scorecards | AI ("QA Copilot") (vendor claim) [12] | Real-time nudges | Manager alerts on coachable calls | Vendor claims only | About $100+/user/mo (competitor estimate) [12] |
| **Cogito** | 200+ voice signals in real time: speed, pauses, interruptions, volume, tone, against historical norms [13] | Live cues (e.g. empathy, energy) | AI behavioural signals; outcome claims are vendor-reported [13] | Live, short nudges; cue frequency tunable by tenure [13] | Nudges rolled up into coaching plans [13] | Vendor case studies only | n/v |

### 2c. Leadership and executive-presence assessment, AI coaches

| Product | What it measures | Taxonomy (as far as verified) | Scoring and calibration | Tone | Memory and progress | Notes | Price |
|---|---|---|---|---|---|---|---|
| **Korn Ferry Leadership Architect** | 38 competencies + 10 career stallers/stoppers [24] | 4 factors: **Thought, Results, People, Self**; 12 clusters (full names not verified publicly) [24] | Levels: Less Skilled, Skilled, Talented + **Overused** [24]. 360s, interviews, card sorts | Developmental | Via 360 retests | Paid materials | Paid |
| **Hogan** (HPI / HDS / MVPI) | Bright-side personality, dark-side derailers, motives/values [25] | HPI incl. Adjustment, Ambition, Sociability, Interpersonal Sensitivity, Prudence; HDS derailers such as Mischievous, Colorful, Imaginative, Diligent, Dutiful [25] | Percentile norms. HPI quartile bands; HDS risk bands 0–39 / 40–69 / 70–89 / 90–100; 2024 global norm samples about 100k–160k (distributor blog) [25] | Clinical-neutral | Re-assessment | Derailers framed as strengths under pressure [25] | Paid |
| **CCL Benchmarks** | 360 ratings | For Managers: 16 competencies + 5 derailment factors; by Design: build your own from a library [26] | Norms vs "successful managers"; 70+ optional norm groups [26] | Facilitated debrief only by certified people [26] | 360 retest | $380/participant [26] | Paid |
| **Bates ExPI** | Executive presence, 360 | **Character / Substance / Style**, 5 facets each (15). Verified names: Authenticity, Integrity, Concern, Restraint (Character); Confidence, Resonance (Substance; Practical Wisdom also named, placement unverified); Intentionality, Inclusiveness, Appearance (Style). Full list not verified [27] | 90-item 360 (BTS) [27]; no independent validation found | Developmental | 360 retest | Character is "least observable" [27] | Paid |
| **Hewlett, *Executive Presence*** (research, not a product) | Exec presence | Gravitas / Communication / Appearance | Survey of senior execs: gravitas 67%, communication 28%, appearance 5% [28] | n/a | n/a | 2022 update: inclusiveness and "listen to learn" rose, forcefulness dropped (as reported, not read in full) [28] | n/a |
| **Gallup CliftonStrengths** | 34 talent themes | 4 domains: Executing, Influencing, Relationship Building, Strategic Thinking [29] | Ranked order, not proficiency | Strengths-only, positive | Static profile | Good model for "signature strengths" view | Paid |
| **BetterUp** | Whole Person Model | 4 broad categories, 25 dimensions of mindsets, behaviours, outcomes (names not verified) [30] | Psychometric development, science board review (vendor claim) [30] | Warm, coach-like | Tracked over time; AI coaching "Grow" product [30] | | Enterprise |
| **CoachHub AIMY** | Goal setting, situational coaching, roleplay of hard conversations; AIMY 2.0 adds self-assessments, nudges, dashboards [31] | Coaching topics | ICF-aligned; >70% rate conversations good/excellent (vendor claim) [31] | Supportive | Goals and tracking | No independent evaluation found [31] | Enterprise |
| **Valence Nadia** | AI leadership coach | n/v | n/v | Coach-like, proactive check-ins | "Memory and context engine" on 3 layers (individual, team, organisation); coaching "cumulative rather than episodic" (vendor claim) [32] | Memory is the main selling point | Enterprise |
| **Rocky.ai** | Daily reflections, soft-skill micro-coaching [33] | Topics (communication, influence, EQ) | No scoring found | Supportive | Goals; reviewers say chats get repetitive and context is not always remembered [33] | | About $9.99/mo individual (unverified) [33] |

### 2d. Dating and social-skill coaching

| Product / school | What it measures or teaches | Taxonomy | Scoring | Tone | Memory and progress | Notes | Price |
|---|---|---|---|---|---|---|---|
| **Rizz-type keyboards** (Rizz, WRizz, Rizzboard, Key AI) | Generate replies from screenshots/bios [42] | None | None | Playful | None | App-store ratings only; texting, not skill-building [42] | Subscriptions |
| **YourMove AI** | Openers/replies, profile writer and review, photo tools, "AI dating coach" [41] | None published | None | n/v | n/v | Pricing conflicting [41] | n/v |
| **Apps analysing real recorded interactions** (Date Talk Analyzer/MatchTalk, TalkScore, Appro, EMO AI) | Communication style from audio; TalkScore gives score, talk ratio and 6 rubric grades; Appro gives speaking balance and turn-taking [43] | Not published | AI, not published | n/v | n/v | No or very few ratings; MatchTalk warns you must get your date's explicit consent before recording [43]. **The real-recording niche is open** | Mostly free |
| **Mystery Method** | Phased model: Attraction A1–A3, Comfort C1–C3, Seduction S1–S3 (9 steps) [35] | Phases | None (field practice) | Tactical | Field reports | Criticised for manipulation/objectification (negs, false time constraints) [35] | Books, courses |
| **Love Systems** | "Triad"; Emotional Progression Model (attraction, qualification, comfort, seduction) and Physical Progression Model [34] | Phases + routines | None | Tactical | n/a | "Triangle model" in the brief could not be verified; the name found was "Triad" [34] | Courses |
| **RSD** | Inner game vs outer game (from Gallwey) [39] | Community paraphrase: inner game = state, identity, social conditioning [39] | None | Intense | n/a | Official curriculum not verifiable from reliable sources [39] | n/a |
| **Charisma on Command** | Charisma archetypes and conversation "hacks"; video breakdowns [36] | Not verified beyond summaries | None | Upbeat | n/a | Course modules per an unofficial listing: first impressions, confidence, conversation, storytelling, presence, leadership [36] | Courses |
| **The Charisma Myth** (Cabane) | Charisma = **presence, power, warmth**; learnable [37] | 3 pillars | n/a | n/a | n/a | Cleaner research-adjacent frame than the PUA schools | Book |
| **The Art of Charm** | Social skills, social capital, networking, confidence [40] | Not published | None | Practical | Bootcamps | Official framework not verified [40] | Programmes |
| **The Way of the Superior Man** (Deida) | Purpose, presence, polarity, discipline of desire [38] | Book principles | n/a | Direct | n/a | Secondary summaries only [38] | Book |

### 2e. Progression and rating systems

| System | Mechanism to borrow | Source |
|---|---|---|
| **Duolingo Birdbrain** | P(correct) from learner ability and item difficulty; Elo-like update by how surprising the outcome is; V2 uses a 40-dimension learner vector; picks exercises at the edge of ability | [51] |
| **Duolingo HLR** | Spaced repetition: estimates the "half-life" of each item in memory; 45%+ lower error than baselines | [51] |
| **Duolingo streaks** | A streak-goal commitment screen improved retention even though the goal was never used (secondary source) | [52] |
| **Glicko-2** | Rating + rating deviation (uncertainty grows when idle) + volatility (erratic performance); best with 15–20 games per period | [53] |
| **Whoop** | Strain 0–21 (log scale; bands Light/Moderate/High/All Out); Recovery 0–100% green/yellow/red against personal baselines built over weeks; a daily target from Strain Coach | [54] |

---

## 3. Recommended architecture for Tom's three apps

### 3.1 Three layers per interaction

1. **Measured** (deterministic, from `prosody.py` and `transcribe.py`): talk share, longest monologue, longest other-person story, turn switches per 5 min, reply gap (patience), questions per hour (and follow-up share), interruptions made/received, pace wpm, pitch range (semitones), loudness variation, pause rate, fillers/hedges per 100 words, uptalk, laughter (own, other, shared). Same definitions in all three apps. Gong and Microsoft show these are trusted because they are simple and defined [1][18].
2. **Detected behaviours** (LLM tagging): discrete, quotable events with timestamps, e.g. "stated a position without hedging", "asked a follow-up on her point", "redirected the meeting to the decision", "teased", "made a clear ask". Each tag carries a quote and a timestamp. Following Docebo's guidance for AI rubric graders: only use criteria that the transcript (plus measures) can actually show; do not ask the LLM to judge vocal delivery or count things [57]. Counting stays in layer 1.
3. **Judged** (rubric): sub-capability level from 0 to 4, anchored, citing layer-1 numbers and layer-2 tags. "Not observed" is a valid result and is **not** scored 0.

### 3.2 Capability model depth

- **5–6 capabilities × 3–4 sub-capabilities = 18–24 leaves per lens.** Precedents: ExPI 15, CCL 16 + 5 derailers, BetterUp 25, Gong 6 interaction stats [27][26][30][1]. A single 10–40 minute conversation gives evidence for maybe 6–10 leaves. More leaves means most are "not observed" and the scores become noise.
- Add **2–4 derailers per lens** (Hogan/CCL style [25][26]), scored as risk flags rather than as part of the average.
- One **shared core** across all three lenses (e.g. composure, listening, clarity, warmth/presence) so cross-lens insight is possible ("your Game problem is the same reply-gap issue as in meetings"). Warmth and competence are judged first in social perception [48], so both should appear in every lens.

### 3.3 Proficiency levels and anchors

- 5 levels: **0 Absent/harmful · 1 Emerging · 2 Competent · 3 Strong · 4 Exceptional**, plus an **Overused** flag (Korn Ferry [24]).
- Each level has 1–2 **observable** anchors plus one example quote (BARS principle: rate observable behaviours, not traits [56]). Where possible, also a measured band, e.g. "Competent: monologues ≤ 2:30, patience ≥ 0.6 s" [1].
- **Absolute, not relative, anchors**: level 2 means "a competent adult professional or socially fluent person in this context", not "better than last week". This is the main protection against inflation.
- **Context profiles**: each interaction is tagged (1:1 report, peer meeting, presentation, negotiation, social group, first date, established partner). Bands shift by context; e.g. talk share of 43% is a sales-discovery benchmark [1], not a coaching 1:1 or a date benchmark. Unknown contexts get wider bands and lower confidence.

### 3.4 Overall % method

Per interaction:

1. Leaf score `s` (0–4) with confidence `c` (0–1), from evidence count, clarity of evidence, and agreement across 3 independent LLM scoring passes (use the median; disagreement lowers `c`).
2. Capability score = confidence-weighted mean of its observed leaves.
3. **Interaction %** = weighted mean of observed capabilities, then a **balance penalty**: subtract `k × (max − min)` across observed capabilities (start with k = 0.15), or use a blended geometric mean. This stops one great trait hiding a weak one. Show it as "**68% ± 9, 11 of 20 sub-capabilities observed**". Below about 40% coverage, show "insufficient evidence" instead of a %.

Longitudinal (the number that matters):

4. Each leaf keeps a **Glicko-style rating** (μ, RD, volatility) [53]. Each interaction is an evidence update weighted by `c` and context difficulty. A surprising result moves the rating more (Birdbrain logic [51]). RD grows with inactivity, so ratings go stale honestly.
5. **Headline "Lens Rating"** = weighted capability ratings with the balance penalty, shown with a band. Weekly trend lines plot the band, not the point.
6. **Anti-inflation rules**: cap the per-interaction change; no level 4 without at least 3 independent interactions showing level-4 anchors; the % is a 0–4 rating mapped linearly (2.0 = 50% = competent), so 80%+ is rare by design; display a recent-interactions score distribution; flag when the LLM's average score drifts up across months without measured-signal improvement.

### 3.5 Calibration

- **Gold set**: 15–25 clips per lens, scored by Tom (and ideally one trusted other) against the anchors. Measure agreement with Cohen's kappa, not raw agreement. Exact-match agreement overstates judge quality [55]. Practitioner rule of thumb (blog, not research): κ < 0.6 means the rubric needs fixing [55].
- Mitigate known LLM-judge biases [55]: score one capability per call or randomise criterion order; shuffle anchor order; temperature 0; median of 3 passes.
- **Self-other check**: Tom's self-ratings vs the coach's. 360 research shows self-other gaps that vary by person and context, with poor performers more often overrating themselves in some samples [50]. Track the gap as its own metric ("self-awareness gap").
- **Outcome anchors where they exist**: e.g. got the decision, got the second date or number, report followed up. Correlate leaf ratings with outcomes over time. Gong's benchmarks come from tying behaviour to won deals [1][5]. Sample sizes will be small; treat as hypothesis checks.

### 3.6 Feedback format (per interaction)

Order: verdict → scorecard → top 3 → evidence.

- **Verdict (≤300 words)**: direct, specific, harsh on behaviour, never on identity (Kluger & DeNisi: feedback that pulls attention to the self often hurts performance [49]). Structure: what happened (2 sentences) → the one pattern that cost the most, with timestamps and numbers → what a level-3 version would have looked like in this exact moment → where it went well (one line, so the signal stays credible).
- **Scorecard**: capability bars with band, "not observed" greyed out, Overused flags, derailer flags.
- **Top 3 work-ons**, each: behaviour (anchor-level target) · evidence (quote/timestamp/metric) · one drill for this week · one resource (book chapter, video, exercise from the library, with evidence grade) · the measurable "pass" for next time (e.g. "monologues ≤ 2:00 in your next 3 meetings").
- **Lead with what to do next**, as Yoodli's weekly digest and Whoop's daily target do [14][54].

### 3.7 Memory design

**Per interaction (immutable record)**: id, date, duration, context tag, participants (pseudonymised), rubric version, model version, layer-1 measures, layer-2 tags with timestamps/quotes, leaf scores with confidence, verdict, top-3, Tom's self-rating (optional, 10 seconds), outcome (optional, filled later), disputes raised and their results. Audio deleted (as now); keep transcripts only as long as Tom chooses, with a retention setting per lens (Game transcripts involve third parties; see §4.3).

**Longitudinal**:
- Leaf ratings (μ, RD, volatility) and full history, per rubric version.
- **Pattern ledger**: recurring behaviours with first-seen/last-seen dates and counts (e.g. "hedges when challenged by seniors: 7 of 9 meetings").
- **Commitments and drills**: active work-ons, start date, pass criteria, status; spaced repetition of drills using a half-life idea (HLR [51]): a drill that is passed is resurfaced later, at longer intervals.
- **Hypotheses**: coach beliefs about Tom with an evidence count and a status (open / supported / refuted), e.g. "energy drops after 4pm".
- **People and context map**: per counterpart, the dynamics (talk share with X, interruptions with Y). Pseudonymised.
- Memory should be cumulative and layered (individual, counterpart, context), as Valence describes for Nadia [32]. Rocky.ai's weak cross-topic memory is a known complaint [33].

### 3.8 Dashboard views

1. **Today / last interaction**: Whoop-style card [54]: interaction %, band, colour, one sentence, the next drill.
2. **Lens rating trend**: weekly line with uncertainty band; rubric-version changes marked as vertical lines.
3. **Capability heatmap**: sub-capabilities × weeks, colour = rating, opacity = confidence; greyed when stale (high RD).
4. **Measured-signals panel**: each layer-1 metric vs its context band (Gong-style bands [1]); sparkline over 30 interactions.
5. **Patterns and hypotheses**: the ledger, sorted by cost.
6. **Work-ons board**: active / passed / resurfacing, with streak of passes (commitment framing works for Duolingo [52]; avoid daily-streak guilt for an activity that depends on real-life conversations).
7. **Model changelog**: rubric versions, what changed, why, from which dispute or source.
8. **Cross-lens view**: shared core capabilities compared across the three lenses.

### 3.9 The "challenge the evidence" chat and model governance

- Every score in chat is a claim with its evidence (quote, timestamp, metric, anchor), as Gong exposes AI reasoning per answer [2].
- When Tom disputes something, the coach classifies it as:
  - **(a) Evidence error** (diarisation wrong, misheard word, missing context such as "this was a deliberate silence"): fix the record, re-score this interaction, log the original and revised scores side by side (Gong keeps both original scorer and editor [2]).
  - **(b) Judgement disagreement** within the current rubric: the coach must either defend with evidence or concede; concessions are logged and counted. If the coach concedes the same kind of point repeatedly, that becomes a rubric proposal.
  - **(c) Model disagreement** ("that anchor is wrong for my context"): creates a **rubric change proposal**, never a live edit.
- **Versioned rubrics** (`exec_presence v1.3.0`): major = capability added/removed; minor = anchors or weights changed; patch = wording. A proposal is applied only if (1) Tom approves, (2) the gold set is re-scored and κ does not drop, and (3) a changelog entry names the reason and the sources. Past interactions keep their original scores; a "re-scored under current rubric" series is computed separately so trends stay honest.
- Guard against Tom arguing the coach into flattery: the coach must keep scores it can evidence; a proposal that would raise Tom's average without new evidence is flagged as such.

### 3.10 Adding new research and books

- A **source library** (Recorder's `library/` already exists): one "source card" per book, paper or course, with key claims → mapped sub-capabilities → proposed anchors/drills → **evidence grade**: A = peer-reviewed or large outcome data (e.g. Gong's 519k-call question study [5], Ranganath et al. [44]); B = validated instrument or credible practitioner with data (ExPI, Hewlett); C = practitioner lore (Mystery Method, RSD, Deida).
- New cards produce rubric proposals through the same governance as §3.9. Grade-C claims can create drills and hypotheses but cannot move anchors until Tom's own outcome data supports them.
- Quarterly "model review": which leaves never get observed (drop or merge), which never predict outcomes (lower weight), which disputes keep recurring.

---

## 4. Notes per lens

### 4.1 Executive Presence

- **Frame**: Bates ExPI's Character / Substance / Style is the best-structured published model (15 facets, 360-based) [27]. Hewlett's Gravitas / Communication / Appearance with 67/28/5 importance [28] supports weighting gravitas most. Appearance is not observable in audio; drop it or self-report it.
- **Suggested capabilities**: (1) Gravitas and composure (steady under challenge, no rush to fill silence, low hedging when challenged); (2) Clarity and concision (point first, structure, monologue length); (3) Vocal command (pitch range, emphasis, pace 100–165 wpm [18], pausing; charisma research links wider pitch range, more emphatic accents, regular rhythm and higher tempo to perceived charisma [47]); (4) Listening and inclusiveness (questions, patience, building on others; Hewlett's 2022 update reportedly moved toward "listen to learn" [28]); (5) Decisiveness and conviction (clear positions, asks, next steps); derailers: dominating airtime, defensiveness, over-polish.
- **Character** facets (integrity, authenticity) are hard to see in single conversations; ExPI itself calls Character the least observable [27]. Score them only through patterns over many interactions, or leave them for self and 360 reflection.

### 4.2 Leadership

- **Frame**: use Korn Ferry's four factors **Thought / Results / People / Self** [24] as the capability spine, with CCL/Hogan-style derailers [25][26]. Gallup's four domains [29] are useful as a "signature strengths" view, not as a scorecard.
- **Suggested capabilities** (things a conversation can show): (1) Sets direction (frames purpose, priorities, decision rights); (2) Drives accountability (clear owners, dates, follow-ups on past commitments, which memory makes possible); (3) Coaches and develops (question ratio, follow-up share, the other person's longest story, low talk share in 1:1s); (4) Handles conflict and gives feedback (directness without blame, names the issue, invites response); (5) Builds trust and inclusion (credit, airtime balance across participants, interruptions given vs received); (6) Self-management (composure under pressure, admits error, adapts).
- **Context bands matter most here**: in a 1:1 coaching conversation Tom's talk share should be low; in a kick-off it can be high. Without context tags the talk-share metric misleads.
- Memory gives an advantage enterprise tools lack: Recorder can check whether commitments made in one meeting were followed up in the next.

### 4.3 Game (social and romantic confidence, charisma)

- **Evidence base is thin and mixed.** The best research on recorded dating conversations is the Stanford speed-dating corpus: classifiers using lexical, prosodic and dialogue features detected flirtatious/friendly/awkward/assertive style at up to 75% accuracy (50% baseline), beat human perceivers, and humans tended to project their own intent onto partners [44]. Friendliness was linked to other-directed laughter and appreciations; flirtation to joint focus on the woman as the topic [44]. Mutually attracted daters showed more overlapping laughter, and laughs were most frequent in the first minute (separate study) [45]. Follow-up questions were linked to liking and second-date offers [46], **but** a reanalysis found question-asking by men toward opposite-sex partners was inversely related to receiving a second date [46]. Conclusion: no single "more X is better" rule; use bands and outcome correlation.
- **Frameworks to draw on, with grades**: Cabane's presence / power / warmth [37] and warmth/competence research [48] (grade A/B) as the spine; Mystery Method A/C/S phases [35] and Love Systems' emotional progression [34] as an optional **phase map** of an interaction (grade C); Deida's purpose, presence and polarity [38] and RSD/Gallwey inner game [39] as the "inner game" capability (grade C; mostly self-report, state and patterns).
- **Suggested capabilities**: (1) Presence (attention on her, follow-ups on what she said, no rush); (2) Grounded confidence (low hedging and approval-seeking, steady voice, comfortable silence, holds frame when tested); (3) Playfulness and humour (teasing that lands, shared laughter, not one-sided laughing at own jokes); (4) Warmth and connection (self-disclosure matched to hers, appreciations, emotional topics); (5) Leading and escalation (proposes plans, makes clear asks, moves the interaction forward; Overused = pushy); (6) Inner game (state before and after, outcome independence: self-report plus patterns); derailers: interview mode (question rate above band with low self-disclosure), monologuing, seeking validation, "routines" or scripts.
- **Explicit exclusions**: do not score or teach manipulative tactics (negs, false time constraints, "dispelling reluctance"), which the Mystery Method is criticised for [35]. Frame success as mutual enjoyment and clear, honest intent. Any physical-escalation advice must centre explicit, ongoing consent.
- **Consent and law**: recording a date captures a third party. Even app makers warn you must obtain explicit consent [43]. Recording laws differ by jurisdiction (I did not research Tom's). Default for this lens: summary and metrics only, transcript auto-deleted after scoring, no names stored, counterpart pseudonymised.
- **Outcome labels** (second date, number, kiss, she initiated contact) are optional, self-reported and noisy. Use them only for long-run correlation, never per-interaction scoring.
- **Market gap**: Rizz-style apps generate text replies [42]; the few apps that analyse real recorded dates have little or no review data and publish no method [43]. A well-calibrated, private, evidence-based coach for real interactions is not a product I could find.

---

## 5. Sources

Notes: "(secondary)" = third-party summary or competitor blog; "(vendor)" = company claim. Pages were read through search snippets or fetches on 23 Oct 2026; some official PDFs returned 404/403 (noted).

1. Gong Help, Analyze team performance (interaction stats and benchmarks): https://help.gong.io/docs/analyze-team-performance
2. Gong Help, Score a call (AI answers with reasoning, overrides, visibility): https://help.gong.io/docs/score-a-call
3. Gong Help, Create and manage scorecards: https://help.gong.io/hc/articles/360028270852
4. Gong Help, Create coaching workflows: https://help.gong.io/docs/intro-to-coaching
5. Gong Labs, deal-closing discovery call (519k calls; 11–14 questions): https://www.gong.io/blog/deal-closing-discovery-call
6. Gong pricing and complaints (secondary, competitor-written): https://sybill.ai/blogs/gong-pricing ; https://www.claap.io/blog/gong-pricing ; https://marketbetter.ai/blog/gong-review-2026/
7. Fullcast docs reproducing Gong patience metric: https://support.fullcast.com/performance/docs/gong-patience
8. Chorus: https://www.businesswire.com/news/home/20200902005328/en/Chorus.ai-Launches-Most-Advanced-Outcome-Based-Analytics-in-CI ; TrustRadius review: https://trustradius.com/reviews/chorus-by-zoominfo-2024-04-18-19-06-23 ; G2 tag page: https://www.g2.com/de/tags/sales-coaching-software?page=13
9. Salesloft coaching guide: https://www.salesloft.com/resources/guides/coach-smarter-to-improve-every-interaction ; spring 2024 update: https://www.salesloft.com/company/newsroom/salesloft-update-spring-2024 ; Clari + Salesloft CI: https://www.destinationcrm.com/Articles/CRM-News/CRM-Across-the-Wire/Clari---Salesloft-Launches-Salesloft-Conversation-Intelligence--175719.aspx
10. Second Nature FAQ: https://secondnature.ai/faqs/ ; review (secondary): https://www.outdoo.ai/blog/second-nature-review-and-pricing
11. Hyperbound listings: https://www.capterra.com/p/10051459/Hyperbound/reviews/ ; https://www.getapp.com/all-software/a/hyperbound/
12. Balto QA Copilot (vendor): https://www.balto.ai/blog/balto-releases-qa-copilot-superhuman-levels-of-accuracy-and-consistency/ ; pricing estimate (competitor): https://www.sonant.ai/blog/balto-alternative-review
13. Cogito product (vendor): https://cogitocorp.com/product ; DeepLearning.AI: https://www.deeplearning.ai/the-batch/emotional-intelligence
14. Yoodli pricing: https://yoodli.ai/pricing ; AI feedback: https://yoodli.ai/platform/ai-feedback
15. Poised homepage (shutdown banner, metrics): https://poised.com/ ; G2: https://www.g2.com/products/poised ; Dealroom: https://app.dealroom.co/companies/poised
16. Orai: https://www.capterra.com/p/190231/Orai/reviews/ ; https://www.stork.ai/en/orai
17. Speeko App Store: https://apps.apple.com/us/app/-/id1071468459 ; Univ. of Iowa: https://now.uiowa.edu/news/2019/01/ui-students-develop-app-improve-public-speaking-without-imagining-audience-their
18. Microsoft Speaker Coach (PowerPoint): https://support.microsoft.com/office/rehearse-your-slide-show-with-speaker-coach-cd7fc941-5c3b-498c-a225-83ef3f64f07b ; Teams: https://support.microsoft.com/teams/meetings-events/speaker-coach-in-microsoft-teams-meetings ; admin: https://learn.microsoft.com/da-DK/microsoftteams/meeting-speaker-coach ; 100–165 wpm guide: https://24slides.com/presentbetter/how-to-use-powerpoint-speaker-coach
19. Google Interview Warmup: https://grow.google/interview-warmup ; https://9to5google.com/2022/05/17/google-interview-warmup/
20. Hume FAQ (sunset dates): https://dev.hume.ai/docs/expression-measurement/faq ; overview (limited release): https://dev.hume.ai/docs/expression-measurement/overview ; VentureBeat: https://venturebeat.com/ai/is-ais-next-big-leap-understanding-emotion-50m-for-hume-says-yes
21. VirtualSpeech pricing: https://virtualspeech.com/pricing ; home: https://virtualspeech.com
22. Rehearsal acquisition: https://trainingindustry.com/press-release/learning-technologies/elearning-brothers-solidifies-position-as-video-learning-leader-acquires-rehearsal/
23. Quantified Communications: https://knowledge.wharton.upenn.edu/article/the-science-of-effective-communication/ ; https://quantified.ai/?p=11159
24. Korn Ferry Leadership Architect: https://www.kornferry.com/capabilities/talent-suite/korn-ferry-assess/leadership-architect ; store: https://store.kornferry.com/en/product/5d7bc4a3-c28a-47eb-b8d1-47bc293e65ff ; Stanford (levels incl. Overused): https://cardinalatwork.stanford.edu/careers/performance-management/competencies
25. Hogan scale definitions: https://www.hoganassessments.com/wp-content/uploads/2019/12/Hogan_Scale_Definitions_112519.pdf ; 2024 norms (distributor): https://jvrpsychometrics.co.za/blog/hogan-norm-update-2024
26. CCL Benchmarks for Managers: https://shop.ccl.org/eu/benchmarks-for-managers.html ; by Design: https://shop.ccl.org/eu/benchmarks-by-design.html
27. Bates ExPI (BTS): https://bts.com/blog/executive-presence-demystified-part-1 ; https://bts.com/insights/executive-presence-more-important-than-ever ; ICF: https://coachfederation.org/why-executive-presence-matters/ (white paper https://bts.com/app/uploads/2023/04/ExPI-White-Paper.pdf returned 404)
28. Hewlett: https://fortune.com/2014/06/05/executive-presence-learning/ ; https://www.forbes.com.au/news/leadership/why-executive-presence-isnt-about-looking-the-part/ ; https://www.beckershospitalreview.com/hospital-management-administration/the-new-tells-of-executive-presence/
29. Gallup domains: https://www.gallup.com/cliftonstrengths/en/253736/cliftonstrengths-domains.aspx
30. BetterUp Whole Person Model FAQ: https://www.betterup.com/whole-person-model-faqs ; support article (403 on fetch): https://support.betterup.com/hc/en-us/articles/360049794271-The-Whole-Person-Assessment
31. CoachHub AIMY 2.0: https://trainingindustry.com/press-release/artificial-intelligence/coachhub-launches-ai-coach-aimy-2-0-in-next-major-leap-for-ai-powered-coaching-at-scale/ ; Science one-pager: https://resources.coachhub.com/hubfs/25_US%20EN_The%20Science%20Behind%20AIMY_OnePager.pdf
32. Valence Nadia: https://www.bvp.com/news/meet-nadia-valences-ai-coach-for-leadership-development-and-workplace-collaboration ; https://valence.co/ai-lab
33. Rocky.ai: https://theleadershipcoachinglab.com/blog/ai-coaching-apps-review ; https://risely.me/compare/rocky-ai-alternatives/
34. Love Systems: https://www.thejc.com/life/sorry-ladies-there-really-is-a-science-to-pulling-uizy04pz ; Routines Manual listing: https://pdfroom.com/books/love-systems-routines-manual-volume-2/9qXgeozM56P
35. Mystery Method: https://thepowermoves.com/the-mystery-method/ ; https://www.shortform.com/pdf/the-mystery-method-pdf-mystery ; https://rianstone.substack.com/p/training-wheels-mystery-method
36. Charisma on Command: https://www.getabstract.com/en/summary/how-to-build-genuine-charisma-and-confidence/46138
37. The Charisma Myth: https://en.wikipedia.org/wiki/The_Charisma_Myth ; https://sites.fuqua.duke.edu/fordlibrary/2012/06/18/book-review-the-charisma-myth/index.html
38. Deida summary: https://www.shortform.com/summary/the-way-of-the-superior-man-summary-david-deida
39. Inner/outer game (Gallwey): https://bairdbrightman.substack.com/p/every-game-is-composed-of-two-parts
40. Art of Charm: https://www.artofmanliness.com/people/social-skills/podcast-294-art-charm/
41. YourMove AI: https://www.g2.com/products/yourmove/discuss ; https://apps.appfollow.io/ios/yourmove-ai-keyboard/6444244023?country=us
42. Rizz apps: https://apps.apple.com/app/id1661403200 ; https://apps.apple.com/app/id6743861531 ; https://apps.apple.com/us/app/rizzboard/id6484164740 ; https://apps.apple.com/us/app/key-ai-ai-keyboard-assistant/id6742742345
43. Real-interaction apps: https://apps.apple.com/py/app/date-talk-analyzer-matchtalk/id6745133930?l=en-GB ; https://hunted.space/product/talkscore ; https://apps.apple.com/ae/app/appro/id6752226344 ; https://mwm.ai/apps/emo-ai/6788095568
44. Ranganath, Jurafsky, McFarland, detecting flirting (2009, 2013): https://sites.socsci.uci.edu/~lpearl/courses/readings/RanganathEtAl2013_DetectingFlirting.pdf ; https://sites.socsci.uci.edu/~lpearl/courses/readings/RanganathEtAl2009_DetectingFlirting.pdf ; talk abstract: https://talks.cam.ac.uk/talk/index/21629/
45. Laughter in speed dating (Frontiers in Communication 2022): https://frontiersin.org/articles/10.3389/fcomm.2022.909913/full
46. Huang et al. 2017: https://gwern.net/doc/psychology/novelty/2017-huang.pdf ; reanalysis: https://pmc.ncbi.nlm.nih.gov/articles/PMC6857721/
47. Niebuhr et al., charismatic prosody: https://cris.fau.de/publications/108648804/ ; https://doaj.org/article/ab437b55da8848689a04948dba9d8524 ; Berger 2024 review: https://macau.uni-kiel.de/servlets/MCRFileNodeServlet/macau_derivate_00006497/Berger_2024_Dissertation_final.pdf
48. Fiske, Cuddy, Glick, warmth and competence: https://collaborate.princeton.edu/en/publications/universal-dimensions-of-social-cognition-warmth-and-competence/
49. Kluger & DeNisi 1996: https://explore.psychsafety.com/n/kluger-denisi-1996/ ; abstract: https://pluto.huji.ac.il/%7Emskluger/files/Download/Kluger%20&%20%20DeNisi%20abstract.doc
50. Self-other rating research: https://cclinnovation.org/?p=2656 ; https://leadershipcircle.com/wp-content/uploads/2018/08/Agreement-in-Self-Whitepaper-AUG2018.pdf
51. Duolingo Birdbrain (IEEE Spectrum): https://spectrum.ieee.org/duolingo ; HLR paper: https://preview.aclanthology.org/fix_video/P16-1174.pdf ; blog: https://blog.duolingo.com/how-we-learn-how-you-learn
52. Duolingo streak experiments (secondary): https://lazyweb.com/research/duolingo-streak-goals-retention
53. Glicko-2: https://fooskill.readthedocs.io/en/latest/overview/rating_system.html (primary paper at glicko.net not read)
54. Whoop Strain: https://www.whoop.com/thelocker/how-does-whoop-strain-work-101/ (fetch 403; read via search) ; https://www.whoop.com/thelocker/ask-us-anything-strain/
55. LLM-as-judge bias and reliability: https://arxiv.org/abs/2606.19544 ; rubric interference: https://arxiv.org/pdf/2608.14684 ; kappa practice (blog): https://levelup.gitconnected.com/llm-as-a-judge-calibration-cohens-kappa-and-judge-bias-in-production-e8e7b58ba064
56. BARS: https://peoplemanagingpeople.com/performance-management/behaviorally-anchored-rating-scale/
57. Docebo, best practices for AI roleplay rubrics: https://help.docebo.com/hc/en-us/articles/36704923858578-Best-practices-for-custom-rubrics-in-AI-roleplay
58. Demodesk benchmarks (vendor): https://demodesk.com/blog/conversation-metrics-benchmarks-sales-calls

**Could not verify**: full lists of Bates ExPI facets, Korn Ferry's 12 cluster names, BetterUp's 25 dimensions, Gallup theme-to-domain mapping; Yoodli/Poised scoring formulas; a Love Systems "Triangle model" (only "Triad" found); official RSD curriculum; whether Quantified Communications still trades; Hewlett 2022 survey percentages; Charisma on Command's official framework.
