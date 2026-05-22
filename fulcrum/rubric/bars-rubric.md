# FULCRUM Scoring Rubric (BARS) — sample competencies

This is the **behaviourally-anchored rating scale (BARS)** the AI diagnostic scores against. Each competency has: a definition, the **observable signals** the pipeline extracts (lexical/semantic, prosodic, conversational-dynamics), and **four anchored levels** with example behaviours/phrases.

**Sample below covers the competencies tied to Modules 1 and 5.** The full framework spans all 14 modules / Bates ExPI 15 facets.

## How scoring works
- The judge (Claude, prompt-cached on this rubric) reads the **full transcript** for context but **evaluates the user only**.
- Every score must cite **evidence spans** (timestamp + quote) — no score without evidence.
- Scores are framed as *how the user handled the situation*; other participants are never rated or characterised.
- **Anti-bias guardrails (apply to every competency):** never penalise accent, dialect, non-native phrasing, or introversion; do not reward raw talk-time or extroversion; score effectiveness toward the user's *own* stated goal and chosen style; weight against the user's self-set "this is me" baseline. Deterministic metrics (rates, ratios, pause lengths) anchor the LLM judgment to reduce rater drift.

Levels: **1 Emerging · 2 Developing · 3 Strong · 4 Exemplary.**

---

## Competency: COMPOSURE
*(Module 1 · Bates ExPI: Composure · Spitzberg: Composure)*

**Definition:** Staying grounded and choosing one's response under pressure (challenge, interruption, silence, provocation) — rather than reacting, suppressing, or escalating.

**Observable signals**
- *Dynamics:* response latency after challenging/pointed turns; interruptions initiated under pressure; floor-surrenders (abandoning the point when pushed).
- *Prosodic:* speech-rate (WPM) and pitch stability under pressure vs. the user's own baseline; audible tension.
- *Lexical:* defensive/over-explaining markers ("well, actually", long justifying runs, repeated self-correction) vs. grounded acknowledgements ("good question", "let me think on that", calm naming of tension).

| Level | Anchored behaviour | Example |
|---|---|---|
| **1 Emerging** | Reacts fast under pressure; WPM/pitch spike; defends or talks over; or freezes/concedes. | Challenged → answers in <1s, "Well, *actually*—", voice rises, cuts the other off. |
| **2 Developing** | Holds it together sometimes; still rushes or over-explains in the hottest moments. | Stays steady early, but on the pointed question launches a long defensive justification. |
| **3 Strong** | Consistently pauses before responding under pressure; rate/pitch stable; stays in dialogue. | Challenged → one beat of silence, even tone, "Good challenge — let me think about that." |
| **4 Exemplary** | Grounded *and* engaged under real heat; uses silence deliberately; can calmly name the tension and keep everyone in the room. | "I can tell this one's loaded — say more, I want to get it right." Then a deliberate pause. |

**Common false reads to avoid:** suppression/flatness scored as composure (it isn't — needs engagement); a naturally measured speaker mis-scored low for being quiet.

---

## Competency: INQUIRY / CALIBRATED QUESTIONING
*(Module 5 · Voss; SPIN; Fisher/Ury · Bates ExPI: Interactivity, Inclusiveness)*

**Definition:** Using open, calibrated, genuinely curious questions to understand, to make the other person think, and to surface the real need beneath the stated position — and leaving space for the answer.

**Observable signals**
- *Lexical/semantic:* question rate (per minute of user airtime); open vs. closed ratio; "why" vs. "what/how" phrasing; calibrated-question markers ("how can we…", "what would have to be true…"); SPIN-type progression (situation→problem→implication→need-payoff); follow-up depth ("say more", reflect-and-probe).
- *Dynamics:* post-question silence (space left for the answer vs. answering own question / filling the gap); talk-time ratio (supporting context).

| Level | Anchored behaviour | Example |
|---|---|---|
| **1 Emerging** | Almost no genuine questions; advocates/tells; questions (if any) are closed or leading. | Talks ~90% of airtime; "Do you agree we should ship Friday?" |
| **2 Developing** | Asks some questions but mostly closed/"why"; tends to answer them or move on without follow-up. | "Why didn't you flag this?" then immediately fills the silence with own view. |
| **3 Strong** | Regular open "what/how" questions; leaves space; at least some genuine follow-up. | "What would have to be true for Friday to work?" — then waits for the answer. |
| **4 Exemplary** | Calibrated questions that hand over the problem; clear progression toward the real need; consistently leaves silence and probes deeper. | "How can we make this work given the deadline?" → "What does that cost you when it slips?" → "Say more about that." |

**Common false reads to avoid:** rapid-fire questioning scored high (it's interrogation, not inquiry); rhetorical/leading questions counted as genuine.

---

## Competency: DEEP LISTENING
*(Module 5 adjacent / Module 4 · Sofer · Spitzberg: Attentiveness)*

**Definition:** Demonstrably tracking and building on what the other person actually said — rather than waiting to talk.

**Observable signals**
- *Lexical/semantic:* reflect-backs/paraphrases ("so what I'm hearing is…"); explicit references to the other's prior words; building on their point before adding own; labeling of the other's stated concern.
- *Dynamics:* interruptions (lower is better, with context); response relevance to the immediately prior turn; latency that indicates processing vs. pre-loading a reply.

| Level | Anchored behaviour | Example |
|---|---|---|
| **1 Emerging** | Little evidence of uptake; responses ignore or talk past the prior turn; frequent interruptions. | Cuts in; replies with a pre-formed point unrelated to what was just said. |
| **2 Developing** | Sometimes references the other's point, but often pivots straight to own agenda. | Brief "ok" then immediately to own pitch. |
| **3 Strong** | Regularly reflects/builds on what was said before responding; few interruptions. | "So the real worry is the timeline, not the budget — is that right?" |
| **4 Exemplary** | Accurately captures and names the underlying concern; the other feels fully heard; builds the conversation on their words. | Labels the unstated worry, checks it, *then* responds — and the other confirms "exactly." |

**Common false reads to avoid:** silence scored as listening without evidence of uptake; over-frequent paraphrasing that stalls the conversation scored top.

---

---

## Competencies derived from Tom's *Say What You Mean* database (OFNR)

*These three come straight from the NVC backbone in `research/say-what-you-mean-integration.md`. They are chosen because they are both teachable and **directly detectable in a transcript**.*

### Competency: OBSERVATION vs. EVALUATION
*(Modules 2/5/6 · DB unit "Observation and clarity", 66 items · Sofer/NVC)*

**Definition:** Describing what actually happened (observable facts) before/instead of layering judgment, blame, or absolutes onto it.

**Observable signals (lexical):** observational framing ("when… happened", specific facts, "I" statements) vs. evaluative markers (absolutes "always/never", character labels, "you" blame, mind-reading).

| Level | Anchored behaviour | Example |
|---|---|---|
| **1 Emerging** | Speaks mostly in judgments/absolutes/blame. | "You never listen / you don't care." |
| **2 Developing** | Mixes some observation with frequent evaluation. | "You keep cutting me off — you're so dismissive." |
| **3 Strong** | Usually separates fact from interpretation. | "When the topic changed mid-point, I felt cut off." |
| **4 Exemplary** | Consistently grounds points in clean observation, then owns the interpretation as their own. | "Twice the agenda moved before I finished — the story I told myself was that it didn't matter; can we check that?" |

### Competency: FEELINGS & NEEDS LITERACY
*(Modules 3/6 · DB units "Emotional literacy" 141 + "Needs and values" 71 · Sofer/NVC)*

**Definition:** Naming the real feeling and the underlying need/value driving it — rather than firing an accusation or thought disguised as a feeling.

**Observable signals (lexical):** genuine feeling words + need/value statements ("I feel X because I need Y") vs. pseudo-feelings/accusations ("I feel ignored", "you are…").

| Level | Anchored behaviour | Example |
|---|---|---|
| **1 Emerging** | Accusations or thoughts in place of feelings/needs. | "You just don't care." |
| **2 Developing** | Names feelings but as blame ("I feel ignored"); needs implicit. | "I feel let down by you." |
| **3 Strong** | Names actual feeling and links it to a need. | "I'm anxious about this because I need clarity on the deadline." |
| **4 Exemplary** | Owns feeling + need cleanly and uses it to open dialogue, incl. naming others' likely needs. | "I'm frustrated because I need reliability here — and I'm guessing you need room to prioritise. Can we find both?" |

### Competency: CLEAR REQUESTS
*(Modules 12/14 · DB unit "Requests and agreements" · Sofer/NVC)*

**Definition:** Turning a need into a concrete, specific, doable request — rather than a vague complaint, hint, or veiled demand.

**Observable signals (lexical/semantic):** specific actionable asks (who/what/when) and check for agreement vs. open-ended complaints, hints, or ultimatums.

| Level | Anchored behaviour | Example |
|---|---|---|
| **1 Emerging** | Complains/hints; no actual ask. | "Nobody ever keeps me in the loop." |
| **2 Developing** | Vague or non-actionable request. | "Can you communicate better?" |
| **3 Strong** | Concrete, doable, specific request. | "Would you text me by 5 if you'll be late?" |
| **4 Exemplary** | Specific request + checks it works for the other person (request, not demand). | "Could you send a one-line status by Friday 12:00 — does that work for you?" |

---

## Roadmap for the full rubric
- Author the remaining competencies across all 14 modules / 15 Bates facets, each in this format.
- Build the **expert-labelled gold set**: human coaches score real clips; measure AI-judge agreement (inter-rater reliability) per rubric version; iterate anchors until agreement is acceptable.
- Version the rubric; track score stability across versions so longitudinal user trends remain comparable.
