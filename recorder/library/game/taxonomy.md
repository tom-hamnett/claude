# Game coach: capability taxonomy

Capability tree for the "Game" coach, which reviews recordings of Tom's real social and romantic conversations. It builds on `recorder/rubrics/social_confidence.md` (cited here as "rubric Dn"); it does not repeat that rubric's evidence. Technique records live in `techniques.json`, sources in `sources.md` (bracketed numbers below).

**Scope.** This library covers only what can be assessed from the audio recording and transcript. Mainly non-verbal skills (body language, eye contact, touch/kino, physical escalation, appearance, grooming, venue logistics) are deliberately left out of both the taxonomy and `techniques.json`. The one exception is capability 11: manipulative *verbal* tactics stay indexed so the coach can spot them.

**Audio visibility key.** Each sub-capability says how it shows up in a recording:
- **High**: directly visible in transcript or `prosody.py` fields.
- **Partial**: inferable from words, timing or the other person's response, but needs judgement.

**House rules carried over from the rubric.** Judge success mainly by the other person's engagement (her turn length, questions, laughter, "we" language, her own escalation). Read numbers against Tom's own baseline. Never recommend anything in capability 11.

---

## 1. Inner Game & Non-Neediness
Sources of a stable, unhurried presence: worth that doesn't depend on her reaction. (Glover [8], Deida [6], Manson [9][10], Wayne [7], Pook [17], Cabane [22]; rubric D2.)

| Sub-capability | Definition | Excellent looks like | In a recording |
|---|---|---|---|
| 1.1 Outcome independence | Wanting it to go well without needing it to. | Enjoys the conversation for itself; a "no" changes nothing in his tone. | **Partial**: stable pitch and rate after a rejection or missed joke; no persuasion after "no". |
| 1.2 Approval independence (no covert contracts) | Not trading niceness for hoped-for reward. | Gives compliments or favours with no hook; says what he thinks. | **High**: approval-seeking phrases ("is that weird?"), over-agreeing, apologies, flattery density. |
| 1.3 Purpose & direction | A life and mission he's absorbed in, which the interaction joins rather than replaces. | Talks about what he's building with energy; doesn't make her the centre of his life by minute 10. | **Partial**: topic content, energy when discussing his own work. |
| 1.4 Abundance & selectivity | Feeling options exist; being selective rather than indiscriminate. | Specific interest in *her*, not generic eagerness. | **Partial**: specific vs generic compliments; doesn't over-invest early (talk share, compliment rate). |
| 1.5 Authenticity & honest vulnerability | Expressing real wants, opinions and feelings, including risk of rejection. | States interest plainly; shares a real feeling without fishing. | **High**: direct statements of interest/opinion; absence of hedging around them. |
| 1.6 State management | Arriving warm, present and in a good mood, and recovering quickly. | Starts with energy; resets after a dip. | **Partial**: opening energy (`loudness_db`, `pitch_range_st` vs baseline), recovery after awkward gaps. |

## 2. Frame Control & Composure
Holding his own reading of the situation under light pressure, without aggression. (Tomassi [12], Cooper [11], Wayne [7], Mystery [4], Strauss [1], Judge [14][15]; rubric D2.)

| Sub-capability | Definition | Excellent looks like | In a recording |
|---|---|---|---|
| 2.1 Holding frame | Keeping his own values, plans and mood when challenged. | Calm, good-humoured, unchanged position; no over-explaining. | **High**: justification length after a challenge, back-pedalling, apology count. |
| 2.2 Handling tests & challenges | Responding to teasing, provocations or "you're probably a player" without defensiveness. | Agree-and-amplify, light reframe, or honest plain answer; then moves on. | **High**: response content and latency to challenges. |
| 2.3 Reframing | Recasting a situation in a more useful or playful light. | Turns an awkward moment into a joke or a shared story. | **High**: transcript. |
| 2.4 Composure under pressure | Physiological calm with high-status or attractive people. | Pitch, rate and fluency near relaxed baseline. | **High**: `pitch_median_hz`, `speaking_rate_wpm`, `fillers_per_100w` vs baseline. |
| 2.5 Amused tolerance | Treating friction with warmth and humour rather than heat. | Laughs off a jab; doesn't escalate conflict. | **Partial**: laughter after challenges, tone. |

## 3. Playfulness & Impudence (cocky-funny)
Lightness, teasing and cheek that make the interaction fun and slightly charged. (DeAngelo [5], Mystery [4], Strauss [1], Love Systems [23], RSD [24], Houpert [21], Johnstone [33]; rubric D3.)

| Sub-capability | Definition | Excellent looks like | In a recording |
|---|---|---|---|
| 3.1 Cocky-funny / impudence | Confident cheek delivered with a smile: arrogance played for laughs. | Exaggerated self-regard she can laugh at; never cruel. | **High**: transcript + laughter events (`after_speaker`). |
| 3.2 Affectionate teasing | Playful ribbing about safe, chosen things, ending in warmth. | She laughs and teases back. | **High**: transcript + her reply. |
| 3.3 Role-play & absurd premises | Inventing a playful scenario ("we'd be a terrible heist team"). | She adds to the bit. | **High**: transcript, "we" language. |
| 3.4 Playful misinterpretation | Deliberately twisting her words into a flirty or funny reading. | Light, obvious, quickly dropped. | **High**: transcript. |
| 3.5 Callbacks & running jokes | Returning to an earlier detail or joke. | Shared in-jokes by the end. | **High**: transcript. |
| 3.6 Self-amusement | Entertaining himself rather than performing for her. | Laughs easily, not at every own line. | **Partial**: Tom-initiated laughter share vs shared laughter. |

## 4. Gravitas & Vocal Presence
Sounding grounded and sure: the sonic side of confidence. (Cabane [22], Houpert [21], Van Edwards [29][30], Lowndes [28], Art of Charm [31]; rubric D1, D10.)

| Sub-capability | Definition | Excellent looks like | In a recording |
|---|---|---|---|
| 4.1 Unhurried pace & pauses | Taking his time; using silence. | Steady rate, pauses before key points. | **High**: `speaking_rate_wpm`, `articulation_rate_wpm`, `pauses_per_min`, `long_pauses`. |
| 4.2 Falling, certain endings | Statements that land rather than ask. | Low `uptalk_share` on statements. | **High**: `uptalk_share`, `final_rise_st`. |
| 4.3 Clean fluency | Few fillers, hedges and restarts. | Silent pauses replace "um". | **High**: `fillers_per_100w`, `hedges_per_100w`, `certainty_per_100w`. |
| 4.4 Tonal range & warmth | Expressive variation, warmth in the voice, dropping volume for intimacy. | Wider range in stories, softer and lower when personal. | **High**: `pitch_range_st`, `pitch_sd_st`, `loudness_sd_db`. |
| 4.5 Projection & holding the floor | Enough volume to be heard; finishing thoughts. | Not talked over; doesn't trail off. | **High**: `loudness_db`, `interruptions`, trailing endings. |
| 4.6 Presence (attention) | Full attention on her, not his next line. | Specific follow-ups; quick, fitting responses. | **Partial**: follow-up share, `median_response_gap_s`. |

## 5. Storytelling & Self-Disclosure
Sharing his life in a way that is vivid, brief and reveals character. (Strauss [1], Mystery [4], Love Systems [23], Houpert [21], Van Edwards [29]; rubric D9.)

| Sub-capability | Definition | Excellent looks like | In a recording |
|---|---|---|---|
| 5.1 Story structure | Hook, tension, payoff, in under ~90 s (heuristic). | Clean arc; ends with a beat for her to respond. | **High**: `longest_turn_s`, transcript. |
| 5.2 Vivid, sensory detail | Concrete images, dialogue, emotion. | "The goat was wearing a hat" beats "it was funny". | **High**: transcript. |
| 5.3 Value through story (show, don't tell) | Letting traits (competence, courage, kindness) emerge from events. | No bragging; prestige implied. | **High**: transcript; humblebrag detection. |
| 5.4 Reciprocal, escalating disclosure | Sharing personal things step by step, matching her. | Disclosure depth rises with hers. | **High**: transcript. |
| 5.5 Story-prompting | Telling stories that invite hers. | She replies with her own story. | **High**: her next turn. |

## 6. Engagement & Emotional Connection
Making her feel interesting, understood and enjoyed. (Van Edwards [29], Lowndes [28], Voss [32], Rowland [19], Mystery [4], Kinrys [25], Hussey [26], Carnegie [34]; rubric D4, D5, D6.)

| Sub-capability | Definition | Excellent looks like | In a recording |
|---|---|---|---|
| 6.1 Curious follow-ups | Questions built on what she just said. | High follow-up share; she talks longer. | **High**: `questions`, follow-up classification, her turn length. |
| 6.2 Statements & assumptions (cold reads) | Making playful or perceptive guesses instead of interview questions. | "You seem like the one who plans the group holiday." | **High**: transcript. |
| 6.3 Emotional labelling & empathy | Naming the feeling behind her words. | "Sounds like that freed you." | **High**: transcript. |
| 6.4 Threading | Picking one of several hooks in her answer to continue. | Smooth topic flow, few dead ends. | **High**: transcript. |
| 6.5 Depth escalation | Moving from facts to values, dreams and feelings. | Deep but light questions by mid-conversation. | **High**: transcript. |
| 6.6 Rapport & matching | Matching her energy, language and pace. | Language style matching, energy in sync. | **Partial**: rate/loudness convergence, shared words. |

## 7. Tension, Polarity & Flirtation
Making romantic intent visible and keeping some charge alive. (Deida [6], Perel [27], Judge [14][15], DeAngelo [5], Greene [13], Mystery [4], Hussey [26]; rubric D8.)

| Sub-capability | Definition | Excellent looks like | In a recording |
|---|---|---|---|
| 7.1 Clear romantic intent | Letting her know he's interested as a man, not a friend. | One direct, warm statement of interest at the right moment. | **High**: transcript. |
| 7.2 Verbal escalation & subtext | Gradual moves to personal, flirtatious and playful-sexual topics in step with her. | Each step follows a sign of reciprocity. | **High**: transcript + her response. |
| 7.3 Tension & release (ethical push-pull) | Alternating playful challenge with warmth so the conversation has rhythm. | Honest, light, never designed to unsettle her worth. | **High**: transcript. |
| 7.4 Comfort with charged silence | Letting charged pauses sit. | 1-3 s comfortable silences; doesn't rush. | **Partial**: response gaps and who breaks silences. |
| 7.5 Polarity & masculine presence | Grounded direction contrasting with her expression; keeping some mystery and separateness. | Not merging into agreement; has his own views. | **Partial**: disagreement handled calmly; agreement rate. |

## 8. Leading & Decisiveness
Taking responsibility for where things go. (Wayne [7], Deida [6], Mystery [4], Love Systems [23], Strauss [2], Judge [15]; rubric D7.)

| Sub-capability | Definition | Excellent looks like | In a recording |
|---|---|---|---|
| 8.1 Concrete proposals | Specific plan plus easy out. | "Thursday, the wine bar on X. Unless you'd rather...". | **High**: transcript, `final_rise_st` on proposals. |
| 8.2 Conversational leading | Moving topics, venues and energy along. | Smooth transitions; he moves things when energy dips. | **High**: transcript. |
| 8.3 Decisive choices | Picking when asked ("you choose"). | Quick, falling-tone decision. | **High**: response latency, hedges. |
| 8.4 Asking for the date / number | Closing the interaction with a clear next step. | Direct ask, accepts any answer. | **High**: transcript. |

## 9. Calibration & Social Intelligence
Reading her and the room accurately, and adjusting. (Mystery [4], Strauss [1], Hussey [26], Kinrys [25], Van Edwards [30], Love Systems [23]; rubric 4.2, D8.)

| Sub-capability | Definition | Excellent looks like | In a recording |
|---|---|---|---|
| 9.1 Reading interest (verbal IOIs) | Spotting her questions, investment, laughter, "we" talk. | Accurately rates her interest. | **High**: her `questions`, turn length, laughter. |
| 9.2 Reading disinterest & discomfort | Spotting short answers, topic changes, exits. | Steps back early and gracefully. | **High**: her turn shortening, response gaps. |
| 9.3 Energy matching | Adapting volume, pace and humour to context. | Tones down in quiet settings; up at parties. | **Partial**: loudness/rate vs her. |
| 9.4 Recovering from misfires | Repairing a joke that fell flat or offended. | Quick, light acknowledgement, then forward. | **High**: transcript. |
| 9.5 Group & social-circle dynamics | Winning over friends, including everyone. | Friends laugh too; no one left out. | **Partial**: multi-speaker turn-taking. |

## 10. Status, Value & Screening
Signalling prestige, holding standards, and choosing as well as being chosen. (Mystery [4], DeAngelo [5], Manson [9], Wayne [7], Cooper [11], Glover [8], Love Systems [23]; rubric D11.)

| Sub-capability | Definition | Excellent looks like | In a recording |
|---|---|---|---|
| 10.1 Prestige over dominance | Earning status through competence, generosity, humour. | Others defer because they respect him. | **Partial**: content; absence of put-downs. |
| 10.2 Qualification & screening | Finding out if she fits his values; showing he is choosing too. | Genuine questions about what matters to him; appreciates good answers. | **High**: transcript. |
| 10.3 Personal boundaries | Saying no, not tolerating disrespect, keeping his time. | Calm, clear limits; no lecture. | **High**: transcript. |
| 10.4 Avoiding supplication | Not chasing, over-paying or over-complimenting. | Investment roughly matches hers. | **High**: talk share, compliment count, question ratio. |
| 10.5 Humble confidence | Owning strengths without bragging or false modesty. | Plain statement of facts; accepts compliments simply. | **High**: humblebrag/brag/self-deprecation markers. |

## 11. Off-limits tactics (recognise only)
Not a skill. Manipulative or coercive techniques from the seduction literature are indexed here so the coach can name them if they show up in Tom's recordings, explain why they're off-limits, and give the ethical alternative. Every record here has `ethics: "manipulative"`. (Sources: Strauss [1], Mystery [4], Jeffries [20], Greene [13], Tomassi [12], RSD [24]; critique: [36][37][38].)

| Sub-group | Covers |
|---|---|
| 11.1 Esteem-lowering | Negging, backhanded compliments, disqualifying her looks. |
| 11.2 Pressure & consent violations (verbal) | Talking past "no" / LMR, persistence after a decline, pressing drinks, verbal pressure to isolate, verbal escalation that ignores her cues. |
| 11.3 Deception | False time constraints, invented stories, fake personas, NLP "hidden commands". |
| 11.4 Emotional manipulation | Push-pull to unsettle, dread game, freeze-outs, jealousy plotlines, manufactured insecurity. |

## Notes on the "red-pill" material
Claims such as universal hypergamy, "AWALT", the sexual marketplace value curve, or women's inability to be honest are **contested** generalisations. They are not stored as techniques. Where a red-pill source implies a concrete ethical behaviour (hold your frame, keep a life of your own, don't make her your mission), the record keeps the behaviour, cites the source, and drops the ideology.
