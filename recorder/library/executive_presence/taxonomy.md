# Executive Presence coach: capability taxonomy

Version 1.0, 23 Oct 2026. Companion to `recorder/rubrics/executive_presence.md` (the scoring rubric, dimensions D1-D12) and `techniques.json` (the technique library). Numbers in square brackets refer to `sources.md`.

**Scope.** How Tom comes across in real work conversations (meetings, 1:1s, presentations, board and investor rooms): gravitas, composure, vocal authority, clarity, conviction, charisma, warmth, listening, handling challenge, brevity and poise when speaking up the hierarchy. **Out of scope:** leadership behaviours that belong to the separate Leadership coach (setting direction, developing people, making and delegating decisions, accountability systems, running a team), except where presence depends on them (for example, how a decision is *voiced*, not whether it was the right decision). Appearance, accent and identity are also out of scope, as in the rubric. **Audio-only rule:** the library covers only what can be assessed from the audio recording and transcript. Mainly non-verbal behaviour (posture, gesture, eye contact, facial expression, attire, slide design, room set-up) is excluded, and every sub-capability and technique below is at least partly observable in audio.

**How to read each sub-capability.** Definition / what excellent looks like / how it shows up in a recording. Recording signals use `recorder/prosody.py` field names where they exist (`pitch_median_hz`, `pitch_sd_st`, `pitch_range_st`, `pitch_drift_st`, `loudness_db`, `loudness_sd_db`, `speaking_rate_wpm`, `articulation_rate_wpm`, `pauses_per_min`, `long_pauses`, `fillers_per_100w`, `hedges_per_100w`, `certainty_per_100w`, `uptalk_share`, `final_rise_st`, `apologies`, `questions`, `talk_share`, `interruptions`, `median_response_gap_s`, `mean_turn_s`, `longest_turn_s`, laughter events). All acoustic signals are read against Tom's own baseline, never as absolute targets (rubric section 5).

**Mapping to rubric dimensions** is given per capability so a coach can move from a score to a technique.

---

## 1. Gravitas & Composure
*Rubric: D10, D5, D7. Sources: [1][2][6][16][18][22][47][48].*
The settled, unhurried weight that makes others trust a person with bigger decisions. Hewlett's executives name gravitas as the core of presence [1][2]; Bates places composure and restraint at its centre [18].

| Sub-capability | Definition | Excellent looks like | In a recording |
|---|---|---|---|
| 1.1 Settled state | Managing arousal before and during high-stakes moments so it does not leak into voice and wording. | First turns in a big meeting sound like Tom's relaxed 1:1 self. | Pitch in first five turns vs. meeting median (`pitch_drift_st`, `pitch_median_hz`); rate and filler spikes early on. |
| 1.2 Unhurried tempo | Taking the time a point needs; not rushing to fill or to escape. | Deliberate pace, sentence-boundary pauses, no rush at the end of turns. | `speaking_rate_wpm` vs. baseline; `pauses_per_min`; pauses at boundaries vs. mid-phrase. |
| 1.3 Emotional restraint | Feeling provoked without sounding provoked. | Same volume, pitch and pace after a jab as before it. | `loudness_db` jump, `pitch_median_hz` rise, rate rise on the turn after a challenge. |
| 1.4 Clean ownership of mistakes | Owning an error briefly and moving to the fix. | One sentence of ownership, one of fix, no spiral. | Transcript: "That's on me" + next step; absence of re-explaining, `apologies` count low. |
| 1.5 Considered response | A short, deliberate pause before an important answer rather than an instant or flustered reply. | 1-2 s silence, then a structured answer. | `median_response_gap_s` on challenge turns, followed by fluent first sentence (no fillers, no restart). |

## 2. Vocal Authority & Delivery
*Rubric: D5, D6, D7. Sources: [23][24][25][29][34][35][36][37][42][43][56][57].*
The voice sounds steady, expressive and in control; statements land as statements.

| Sub-capability | Definition | Excellent looks like | In a recording |
|---|---|---|---|
| 2.1 Landing statements | Falling, final intonation on claims and decisions. | Recommendations end low and stop; a beat of silence follows. | `final_rise_st` < 0 on recommendation turns; `uptalk_share` low on statements; others do not jump in mid-claim. |
| 2.2 Settled pitch & resonance | Speaking from a comfortable, breath-supported pitch that does not climb under pressure. | Pitch stable vs. baseline in high-stakes segments; no forced low voice or fry. | `pitch_median_hz` and `pitch_drift_st` vs. baseline; creak not measured yet. |
| 2.3 Vocal variety & emphasis | Pitch and loudness movement that tracks meaning. | Key words and contrasts audibly stressed; no monotone in persuasion. | `pitch_sd_st`, `pitch_range_st`, `loudness_sd_db` up in persuasive turns. |
| 2.4 Pace & strategic pause | Rate suited to content; silence before and after key points. | Slows for numbers and decisions; pause before the point. | `speaking_rate_wpm` by segment; `long_pauses` at sentence boundaries; pause before numerals. |
| 2.5 Fluency | Few filled pauses and restarts, especially before key claims. | Silence replaces "um"; sentences finish. | `fillers_per_100w` (under-counted by ASR); restarts in transcript. |
| 2.6 Tone register | Choosing a calm, warm register to de-escalate, a brighter one to energise. | Voice drops and slows when tension rises; lifts when inviting energy. | Rate and loudness falling in tense exchanges; laughter and back-channels in energising turns. |
| 2.7 Volume & projection | Being clearly heard by everyone in the room or on the call, without shouting. | Energy held to the end of each sentence; no requests to repeat. | Tom's `loudness_db` vs. others on the same mic; within-sentence loudness decline; "sorry, you dropped out" requests. |

## 3. Clarity & Structure
*Rubric: D1. Sources: [11][12][15][20][21][22][13].*
Thinking made easy to follow: point first, organised support, clean ending.

| Sub-capability | Definition | Excellent looks like | In a recording |
|---|---|---|---|
| 3.1 Answer first | Governing idea in the first sentence. | Claim within ~25 words of the turn start. | Position of first claim/recommendation phrase in substantive turns. |
| 3.2 Point, not topic | A contestable claim, not a subject area. | "I believe that..." test passes. | Turns that name a topic ("about pricing...") without a claim. |
| 3.3 Signposted structure | Telling listeners the shape before filling it. | "Two reasons", "first... second...", "so, to sum up". | Signpost phrases; counted list items match the announced number. |
| 3.4 Grouped, non-overlapping support | Reasons that are distinct and cover the case. | Two or three reasons, no repetition. | Repeated reasons; lists that drift. |
| 3.5 Concrete, plain language | Specific nouns, numbers, examples; no jargon fog. | Every abstract claim gets a number, a name or an image. | Jargon density; numerals and named examples per turn. |
| 3.6 Clean landing | Ending a turn deliberately rather than trailing off. | Final restatement, then stop. | Trailing "so, yeah..." endings; `final_rise_st` on last sentence; turn ends that invite interruption. |

## 4. Conviction & Calibrated Certainty
*Rubric: D2. Sources: [38][39][40][41][1][2][10][25].*
Committed positions, with uncertainty stated precisely instead of diffusely.

| Sub-capability | Definition | Excellent looks like | In a recording |
|---|---|---|---|
| 4.1 Committed language | Recommendations phrased as positions, not musings. | "I recommend", "we should", no stacked hedges. | `hedges_per_100w` down and `certainty_per_100w` up in recommendation turns. |
| 4.2 Precise uncertainty | Naming exactly what is uncertain and how sure you are. | "Confident on cost, less on timing; ~70%." | Numeric likelihoods, "what would change my mind" phrases (positive). |
| 4.3 Owning the view | First person for judgements and decisions. | "My view is..." rather than "people are saying...". | "I think/my view/I recommend" vs. passive or third-party attributions. |
| 4.4 No permission-seeking or over-apology | Not asking leave to have an opinion. | Contribution starts with the content. | `apologies`; tags like "does that make sense?" after a recommendation; minimisers ("probably a silly point"). |
| 4.5 Committing in the moment | Taking a position when the room needs one. | Clear yes/no/not-yet at decision points. | Others asking "so is that a yes?" (negative); direct answer word in the first sentence. |

## 5. Charisma & Storytelling
*Rubric: D3, D6, D12. Sources: [6][7][8][9][13][15][52][51].*
Making ideas vivid and moving: the verbal Charismatic Leadership Tactics plus well-chosen stories and humour.

| Sub-capability | Definition | Excellent looks like | In a recording |
|---|---|---|---|
| 5.1 Story & anecdote | A short narrative with a person, moment and point. | 30-60 s story that ends on the point it serves. | Past-tense narrative segments; others reference it later. |
| 5.2 Metaphor & analogy | Explaining the unfamiliar through the familiar. | One fresh image per main idea. | "It's like...", "think of it as..."; others reuse the image. |
| 5.3 Contrast & rhythm | Not-X-but-Y, lists of three, rhetorical question answered. | Contrasts on the main point; stressed delivery. | CLT counts per 10 min; `loudness_sd_db` peaks on contrasted words. |
| 5.4 Vision & stakes | Painting what could be against what is; stating why it matters. | Brief, concrete picture of the better future plus conviction it is achievable. | Future-state language, moral/values language, high-expectation + confidence pairs. |
| 5.5 Memorable moment | One line or image designed to be repeated. | A sticky phrase repeated at start and end. | Phrase recurrence; others quote it. |
| 5.6 Humour & levity | Light, well-timed humour that signals ease. | Others laugh; self-deprecation only on trivia. | Laughter events after Tom's turns (`after` = Tom) vs. Tom-only laughter. |

## 6. Warmth & Connection
*Rubric: D4. Sources: [5][6][25][53][54][23][16][59].*
Signalling goodwill and shared purpose so strength is welcome rather than threatening.

| Sub-capability | Definition | Excellent looks like | In a recording |
|---|---|---|---|
| 6.1 Warmth before strength | Opening with connection, then content. | A human first line, then the business. | First 60 s of a meeting: rapport line, names, acknowledgement. |
| 6.2 Collective framing | "We/us" for shared work, "I" for decisions and errors. | Balanced pronouns, shared goals. | We-ratio vs. baseline. |
| 6.3 Recognition | Crediting others by name for specifics. | One specific credit per meeting. | Names + contribution phrases. |
| 6.4 Empathic labelling | Naming the other side's likely feeling or constraint. | "Sounds like this lands hard on your team." | "It sounds/seems/looks like..." labels; challenger's next turn calmer. |
| 6.5 Full attention | Being present with the person in front of you (Cabane's presence; Rodenburg's second circle). | Responses that use the other's words; no drift. | References to the other's content; low "sorry, what was that?" rate. |

## 7. Listening & Command of the Room
*Rubric: D8, D9, D11 (presence parts only). Sources: [44][23][16][33][45][66][22].*
Commanding attention by how you take, give and shape the floor, not by volume or airtime.

| Sub-capability | Definition | Excellent looks like | In a recording |
|---|---|---|---|
| 7.1 Follow-up questions | Questions that build on what was just said. | Two follow-ups before giving a view in a 1:1. | Questions referencing the prior turn; others' turn length after Tom's question. |
| 7.2 Paraphrase & summary | Playing back the gist before responding. | "So the core worry is X; have I got that?" | Summary phrases; others confirm. |
| 7.3 Airtime calibration | Talking the right amount for the setting and role. | Fewer, higher-impact contributions in groups. | `talk_share` vs. setting band; `mean_turn_s`, `longest_turn_s`. |
| 7.4 Holding & yielding the floor | Finishing points under interruption; inviting others in. | Steady completion then handover; quiet people named. | `interruptions` by/of Tom; loudness during overlaps; names in questions. |
| 7.5 Reading the room | Adjusting to energy, confusion or disagreement as it happens. | Checks in when signals change; changes tack. | Others' questions of confusion; Tom's mid-course adjustments ("let me come at this differently"). |
| 7.6 Silence as a tool | Letting a question or point sit. | Waits after asking; does not answer own question. | Gap after Tom's question before anyone speaks; Tom re-speaking within <2 s (negative). |

## 8. Handling Challenge & Pressure
*Rubric: D10. Sources: [45][30][26][22][39][50][49][28].*
Staying steady, direct and receptive when questioned, criticised or put on the spot.

| Sub-capability | Definition | Excellent looks like | In a recording |
|---|---|---|---|
| 8.1 Direct answer | Yes / no / number / "not yet" in the first sentence. | Answer, then reason. | First word/sentence of reply to a question. |
| 8.2 Receptive disagreement | Acknowledging the other view before differing. | "You're right on X; where I see it differently is Y." | Receptiveness phrases vs. defensive markers ("to be fair", "as I said"). |
| 8.3 Bridging without dodging | Answering, then linking to the key message. | Short real answer, then bridge. | Answer present before the bridge; others re-asking (negative). |
| 8.4 Defusing hostility | Labelling the emotion, lowering tone, getting curious. | Calmer challenger turns after Tom's reply. | Challenger loudness and turn length after Tom's reply; Tom's rate and loudness drop. |
| 8.5 Not knowing, well | Saying "I don't know" with a plan. | "I don't know; I'll have it by Thursday." | Calibrated not-knowing vs. bluffing or rambling. |
| 8.6 Impromptu composure | Producing structure on the spot when asked to speak unexpectedly. | Short structured reply via a template. | Restarts and fillers in unplanned turns vs. planned ones. |

## 9. Brevity & Executive Communication
*Rubric: D1, D2, D11. Sources: [10][11][12][15][20][21][22][2].*
Economy and executive framing: say less, mean more, make the ask obvious.

| Sub-capability | Definition | Excellent looks like | In a recording |
|---|---|---|---|
| 9.1 One throughline | One idea per contribution or talk. | A sentence-long message stated and restated. | Number of distinct claims per turn; recurrence of the headline. |
| 9.2 Length discipline | Turns as long as the point needs and no longer. | 30-60 s answers in senior Q&A. | `mean_turn_s`, `longest_turn_s` in senior settings vs. baseline. |
| 9.3 So-what framing | Every fact attached to its implication for the listener. | "Churn is 4%, which means..." | Facts followed by "which means / so" phrases. |
| 9.4 Clear ask | Stating the decision or help needed. | "I need a yes on X today." | Explicit ask phrases in the first/last minute. |
| 9.5 Prepared headline | Pre-writing the one-sentence answer before the meeting. | Headline delivered verbatim and early. | Headline phrase position; consistency across meetings. |

## 10. Poise in Hierarchy
*Rubric: section 4.2 context rules, D2, D9, D10. Sources: [1][2][31][19][32][33][35][17].*
Holding one's ground with seniors, boards, investors and clients while staying respectful; adjusting status signals up and down.

| Sub-capability | Definition | Excellent looks like | In a recording |
|---|---|---|---|
| 10.1 Speaking truth to power | Raising bad news or disagreement with seniors plainly. | Bad news early, framed with a recommendation. | Position of bad news in the turn; hedges/apologies in upward turns vs. peer turns. |
| 10.2 Peer-level stance | Treating senior people as colleagues, not examiners. | Same pace, pitch and directness as with peers. | Acoustic and hedge deltas between senior and peer meetings. |
| 10.3 Entering the conversation | Getting in at the right moment without waiting for permission. | Joins by building on the last speaker. | Time-to-first-contribution; "sorry, can I just..." openings. |
| 10.4 Authority-approachability balance | Playing status higher or lower deliberately (Gruenfeld). | High with a board under challenge; lower with juniors. | Interruption and talk share by setting; questions vs. statements. |
| 10.5 Cross-cultural calibration | Adjusting British understatement for direct-culture audiences. | Explicit bottom line with international audiences. | Downgraders ("a bit", "not ideal") on serious issues in mixed-culture meetings. |

---

## Notes for the coach
- Pick techniques by rubric dimension first, then by the setting rules in rubric section 4 (1:1, group, chaired meeting, presenting, challenge, upward).
- Prefer techniques graded `research-backed` or `practitioner-consensus` for the weekly drill; use `single-author` ones as options, and treat `contested` ones as "try it and see" with the caveat stated.
- Never coach a technique flagged `manipulative`; those records exist so the coach can recognise the pattern in Tom's own behaviour and steer him away from it.
