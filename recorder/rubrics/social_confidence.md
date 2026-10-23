# Social confidence, charisma and attraction: analysis rubric

Rubric for the recorder coach when it reviews Tom in social, networking and dating-style conversations. It turns "alpha male confidence and game" into what research says actually comes across as confident, high-status, warm and attractive, and it tells the analyser what it can and cannot measure.

Field names in `code` match `recorder/prosody.py` (`pitch_median_hz`, `pitch_range_st`, `pitch_sd_st`, `loudness_db`, `loudness_sd_db`, `speaking_rate_wpm`, `articulation_rate_wpm`, `pauses_per_min`, `long_pauses`, `uptalk_share`, `fillers_per_100w`, `hedges_per_100w`, `certainty_per_100w`, `apologies`, `talk_share`, `mean_turn_s`, `longest_turn_s`, `interruptions`, `median_response_gap_s`, `questions`, laughter events with `after_speaker`). Bracketed numbers like [6] point to the source list in section 6.

**How to read the numbers.** Very few studies give absolute targets. Most give a direction ("more pitch variation goes with being rated more charismatic"). Where this rubric gives a number that research does not supply, it is labelled **heuristic** and should be calibrated against Tom's own baseline. Do not present a heuristic to Tom as a research finding.

---

## 1. Summary

As measurable behaviour, a confident and attractive social presence is mostly *how a man treats the other person and the conversation*. Dominating them has little to do with it. The strongest evidence from recorded first meetings and speed dates shows that people feel a "click" when the conversation centres on them and the man shows he has understood them: sympathy, appreciation, and cooperative interruptions that finish or build on their point [4][5]. Asking more follow-up questions predicts being liked and getting second dates [6]. Replies come quickly [8], laughter is shared and in sync [36][37], and the two speakers' styles converge [12]. Confidence itself carries its own vocal signature, which listeners decode quickly: fluent delivery, falling (not rising) statement endings, a steady or slightly faster pace, and fewer hesitations and hedges [50][51][52][55]. Low, well-controlled pitch reads as dominant and somewhat more attractive [13][14][15]. Even so, dominance gained through intimidation earns influence but not liking [20], and women in mate-choice studies prefer prestige (respected skill) to dominance over people [23][24]. Openly needy or unselective interest lowers desirability [10]. A little extra self-belief helps until it reads as arrogance, which cancels the gain [25]. The coach should build **calm, warm, playful and decisive presence that focuses on the other person**. It should judge success mainly by the other person's engagement, not by Tom's acoustics.

### Myth vs evidence

| Popular "alpha" advice | What the evidence says | Sources |
|---|---|---|
| "Be dominant; women want the alpha." | Dominance through intimidation brings influence but people dislike it. Prestige (respected competence) brings influence *and* liking. In mate-choice studies women prefer prestige; dominance helps mainly in competitive or athletic settings and short-term ratings. Dominance only added appeal for men who were also agreeable and prosocial. | [20][23][24][22] |
| "Talk about yourself, show your value." | Both sexes reported a stronger "click" when the conversation focused on the woman. Humblebragging reduces liking. Talking *more* can raise liking, but only alongside responsiveness, not self-promotion. | [4][5][49][7] |
| "Don't ask questions, make statements." | People who asked more questions, especially follow-ups, were better liked and got more second dates. A rapid series of interview questions can kill the mood, though; the follow-up is what matters. | [6][5] |
| "Never apologise." | Small apologies for things outside your control ("sorry about the rain") *increased* trust in experiments. Excessive self-blaming apology is still a powerless-speech marker. | [57][56] |
| "Neg her / lower her value with backhanded compliments." | No peer-reviewed support. Aggressive and put-down humour is linked to *lower* relationship satisfaction, and teasing only works when it is clearly affectionate and two-way. Excluded from this rubric on ethical grounds anyway. | [31][35] |
| "Play it cool, act uninterested." | Being *selective* helps: liking everyone indiscriminately reads as desperation. Responsiveness and warmth to the specific person are what predict connection. Coldness is not confidence. | [10][4][6] |
| "Deep voice = attractive." | Lower male F0 predicts *dominance* ratings more strongly than attractiveness. Women preferred lowered male voices but not very low ones. Pitch is mostly anatomical, but modulation is trainable and changes in context. | [14][16][19] |
| "Be funny to prove you're smart." | Humour links to extraversion and warmth more than intelligence. Shared laughter predicts interest better than one-sided joking. In one large speed-dating study, raw laughter counts did not predict attractiveness, although perceived funniness did. | [30][33][36] |
| "Overconfidence wins." | Overconfidence raises perceived confidence and desirability, but it also raises perceived arrogance, which cancels much of the gain. | [25] |

---

## 2. Dimensions

There are eleven dimensions. Each gives: what it is, the evidence, observable markers (a. acoustic, b. linguistic, c. interaction), examples, failure modes and drills.

### D1. Vocal confidence (steady, fluent, decisive delivery)

**What it is.** Whether Tom *sounds* sure of what he is saying. This is separate from being right or being loud.

**Evidence.**
- Listeners hear speaker confidence in the voice within a few hundred milliseconds. In North American English, confident speech had lower pitch, flatter intonation within the utterance, a faster rate and more restrained loudness changes than unconfident speech [50]. (A secondary review describes Jiang & Pell's results as showing *greater* F0 variation for confident expressions. The two summaries conflict, so treat "flatter" as uncertain.)
- Fast speech, falling intonation and low pitch work as vocal confidence cues that change how persuasive a message is [51]. Across three experiments, falling (rather than rising) sentence endings were perceived as more confident [52].
- Hesitations, hedges and questioning intonation make up the "powerless" speech style, which listeners rate as less credible and less attractive than the powerful style [55][56]. Hedges and hesitations each lower ratings of authoritativeness and sociability [56].
- Filled pauses and slower responses tell listeners the speaker is less sure of the answer ("feeling of another's knowing") [54]. Listeners treat *lengthened sounds* as a sign of uncertainty. Rising pitch alone did not lower certainty ratings, so uptalk does not always mean doubt [53].
- In the speed-dating data, men their dates labelled as *awkward* had more restarts and more "uh/um", took fewer turns, overlapped less and did not get as loud at their peaks [2].

**Observable markers.**
- (a) Acoustic:
  - `uptalk_share` on statements (rise ≥ 2 st in the final ~0.3 s). Direction: lower on statements of fact, plans and opinions. *Caveat:* UK uptalk is common and can mean "I'm still going" (floor-holding) [53]. Only score it as low confidence when it comes with hedges, fillers or lengthened endings.
  - `fillers_per_100w` and lengthened words. Direction: lower than Tom's baseline. Unverified norm: a widely quoted conversational disfluency rate is roughly 6 per 100 words, and one citing paper says ~8% of words. Treat these as context, not targets [67].
  - `speaking_rate_wpm` and `articulation_rate_wpm`. A steady or slightly faster pace than baseline reads as more confident [50][51]. No verified absolute norm was found, so use Tom's baseline. Separate rushing (high articulation rate *plus* few pauses *plus* rising endings) from confident pace (good articulation rate *with* deliberate pauses).
  - `pitch_median_hz` relative to baseline. A drop *within* an interaction tracked rated dominance and influence [21]. Do not coach a forced low voice (see D2 and D11).
  - `long_pauses`: a pause *before* a key point, followed by a falling, fluent statement, is a strength. Long pauses in the middle of a phrase plus fillers are a weakness.
- (b) Linguistic: `hedges_per_100w` ("I think", "maybe", "sort of", "does that make sense?"), `certainty_per_100w`, self-interruptions and restarts, tag questions ("…, isn't it?") used to seek approval, self-deprecating qualifiers before opinions ("this is probably stupid, but").
- (c) Interaction: holds his turn without trailing off, does not give up the floor in the middle of a thought when interrupted lightly, does not ask for reassurance after making a point.

**Examples.**
- Strong: "I'd go to the one on Exmouth Market. The bread alone is worth it." (falling ending, no hedge)
- Weak: "I mean, maybe, like, the one on Exmouth Market? If that's okay? Sort of depends." (rising ending, three hedges, approval check)

**Failure modes.** Robotic flatness (a monotone also reads as uncharismatic, see D10). Steamrolling. Fake certainty about things he does not know (credibility collapses when found out). Cutting *all* hedges: some epistemic honesty ("I'm not sure, but my guess is…") reads as secure, not weak.

**Drills.**
1. *Full-stop drill.* Say five opinions out loud. Each ends on a clearly falling pitch, then a 1-second silence before anything else. Record, check `uptalk_share`, repeat.
2. *Filler swap.* In a 2-minute story, replace every "um" with a silent pause. Aim for `fillers_per_100w` below Tom's baseline. Note that the pause *is* the fix.

---

### D2. Composure and low neediness (relaxed, selective, outcome-independent)

**What it is.** Calm under small social pressure: silence, a joke that misses, a "no", someone more senior. He does not hunt for approval and does not need this particular interaction to go well.

**Evidence.**
- In speed dating, people who desired *everyone* were desired *less* (negative generalised reciprocity). Selective, specific interest was reciprocated [10]. This is the best evidence for "outcome independence", read as *selectivity*, not coldness.
- People higher in attachment anxiety came across more anxious and more disengaged when introducing themselves to a romantic prospect, through what they said, how it sounded and how they looked [27]. In speed dating they were less popular and made more failed attempts [27] (press summary).
- Shy and low self-esteem people underestimate how much they are liked (the "liking gap") [46]. Much "neediness" is a reaction to a pessimistic misreading of how things are going.
- Self-reports of overconfidence raised perceived confidence and desirability, but also perceived arrogance, which offset the benefit [25].
- Dominant men raise their pitch when they believe they are physically weaker than a rival, and lower it when they think they are stronger [13]. Pitch tracks felt status, so composure shows up in the voice.

**Observable markers.**
- (a) Acoustic: `pitch_median_hz` and `speaking_rate_wpm` stay near Tom's relaxed baseline when the other person is high-status or attractive. A sharp rise in pitch plus speeding up is a stress marker (**heuristic**: flag a rise of > 2 st in median pitch or > 15% in rate versus Tom's relaxed baseline). Note the confound: people also *change* pitch when talking to someone attractive (D8), so read this together with fluency.
- (b) Linguistic: approval-seeking ("is that weird?", "does that make sense?", "sorry, I'm rambling"), over-justifying, unprompted self-deprecation, too many compliments early on, repeated apologies (`apologies`), arguing after a clear "no".
- (c) Interaction: `median_response_gap_s` in a normal range. Very fast, overlapping replies to every remark can signal anxiety. Long freezes after a missed joke signal lack of composure. Comfortable silence of 1-3 s that he does not rush to fill is a good sign (**heuristic**). Accepts a declined invitation lightly and moves on.

**Examples.**
- Strong (after a joke misses): "Okay, that one died. Moving on." (laughs at himself, falling ending)
- Weak: "Sorry, that was a bad joke, I'm not normally like this, sorry, what were you saying?"
- Strong (after "no" to a drink): "No worries, it was great chatting." (no persuasion)

**Failure modes.** Fake aloofness: not reacting, withholding warmth, "playing hard to get". That reads as disengagement [27]. Arrogance [25]. "Outcome independence" turning into not caring about the other person.

**Drills.**
1. *Silence tolerance.* In low-stakes chats, let a pause run to a slow count of three before filling it. Record and check that Tom was not the one who always broke silences in under 1 s.
2. *Selective interest.* After each interaction, write one *specific* thing he liked about the person. Then say that specific thing in the next one instead of a generic compliment.

---

### D3. Playfulness and humour

**What it is.** Light, exaggerated or absurd framing, teasing that is clearly affectionate, callbacks, and enjoying the moment. "Being funny" as a performance is the weaker version.

**Evidence.**
- Women's stated preferences favour men who produce humour; men's favour women who appreciate theirs [28][29]. In live 10-12 minute meetings between strangers, men's humour attempts and women's responsive laughter were both linked with women's dating interest, and *both* partners' interest was linked with simultaneous laughter [30].
- Humour use raised liking and closeness between strangers, through perceived reciprocal liking and enjoyment [32].
- Meta-analysis (39 studies, about 15,000 people): *shared*, co-created humour predicts relationship satisfaction. Being generally funny has only a weak link. Aggressive and self-defeating humour have negative links [31].
- Large speed-dating study (554 people, 861 dates): perceived funniness predicted attractiveness, but laughter frequency did not [33]. The lead author's take: trying too hard can backfire.
- Self-deprecating humour raised long-term attractiveness only when the speaker was high-status [34].
- Teasing is ambiguous by nature. Its playful markers (exaggeration, a playful tone, a smile or laugh) separate affiliative teasing from hostile teasing [35].
- Playfulness ranks near the top of traits sought in long-term partners [41].
- Speakers laugh more than their listeners, and most laughter comes after ordinary remarks, not jokes [39]. Co-laughter carries information about affiliation that listeners in 24 societies could detect [40].

**Observable markers.**
- (a) Acoustic: laughter events where `after_speaker` = Tom (he got the laugh), and overlapping laughter (shared). Wider `pitch_range_st` and `loudness_sd_db` in playful segments than in Tom's neutral talk. *Caveat:* the pipeline cannot reliably say *who* laughed [prosody.py], so treat laughter attribution as approximate.
- (b) Linguistic: exaggeration ("worst decision of my life"), mock-serious role-play ("we're clearly not compatible, you like pineapple on pizza"), callbacks to earlier topics, light teasing *followed by warmth*. Watch for put-downs aimed at the partner's looks, intelligence or identity, sexualised jokes too early, and running self-deprecation.
- (c) Interaction: the other person laughs *and* plays back (builds on the bit). Laughter clusters early in good dates [37]. Mutual overlapping laughter [37][36] is a stronger signal than Tom laughing at his own lines.

**Examples.**
- Strong: "You've been to Lisbon four times? At this point you're legally Portuguese." (teasing about something she's proud of; ends in warmth)
- Weak: "You're quite short for a model, aren't you?" (put-down, no warmth; a neg)
- Strong callback: (ten minutes later) "…which, as an honorary Portuguese citizen, you'd know."

**Failure modes.** Try-hard joke density with no listening. Laughing at his own jokes when the other person does not. Teasing that lands on insecurities. Constant self-deprecation (reads as low status [34]). Using humour to avoid any sincere moment.

**Drills.**
1. *Yes-and.* When the other person says something mildly funny, build on it instead of topping it with an unrelated joke. Count builds per conversation.
2. *Callback hunt.* Note one detail in the first five minutes and bring it back as a callback later. Review whether it got a laugh.

---

### D4. Curiosity and follow-up questions

**What it is.** Real interest shown through questions that build on what the other person just said.

**Evidence.**
- Across live chats and speed dates, people who asked more questions, *especially follow-up questions*, were liked more. Speed daters who asked more follow-ups got more agreement to second dates. The mechanism is perceived responsiveness [6].
- People do not expect questions to increase liking, so they under-ask [6].
- Stanford coverage of the speed-dating bonding study reports that women felt *disconnected* when they had to ask men questions, or when men simply fired questions at them [5]. Lots of questions as an interview, or making her carry the conversation, both go wrong.
- Men who intended to flirt, and men perceived as flirting, asked more questions and used more "you" [1][2].
- Deep questions with strangers are less awkward and more enjoyable than people expect [44].

**Observable markers.**
- (a) Acoustic: rising contour on genuine questions is normal and fine. Do not count question rises as uptalk.
- (b) Linguistic: classify Tom's questions as (i) follow-up ("wait, why did you leave law?"), (ii) full switch to a new topic, (iii) mirror or return ("what about you?"), (iv) rhetorical. The follow-up share is the key metric. Also count "you"-focused statements ("you seem like someone who…").
- (c) Interaction: `questions` per 10 minutes for Tom versus the partner. **Heuristic:** healthy one-to-one ranges are a few follow-ups every 10 minutes, and Tom's questions should not outnumber hers by more than about 3:1 (interview mode) or fall below about 1:3 (she is carrying it). The partner's answer length after Tom's questions is the outcome: longer answers mean good questions.

**Examples.**
- Strong: "You said 'technically' a nurse. What's the non-technical version?"
- Weak: "Cool. So where are you from? And do you have siblings? What do you do for fun?"

**Failure modes.** Interrogation. Questions with no self-disclosure in return (see D5). Leading questions that are really statements. Questions used to escape silence and not out of interest.

**Drills.**
1. *Two-deep rule.* For any interesting answer, ask at least two follow-ups before changing topic.
2. *Word grab.* Build the next question from one unusual word she used.

---

### D5. Warmth, responsiveness and reciprocal self-disclosure

**What it is.** Making the other person feel understood, validated and cared for [45], and matching their openness step by step.

**Evidence.**
- Women felt connected to men who used appreciation ("that's awesome", "good for you") and sympathy ("that must be tough"), and who interrupted to show understanding (finishing or adding to her sentence) [4][5].
- Perceived partner responsiveness (understanding, validation, care) is the central process in intimacy [45].
- Reciprocal, turn-taking self-disclosure produced more liking, closeness and enjoyment than one-sided disclosure [43]. Disclosure that slowly escalates in intimacy generates closeness between strangers [42].
- Warmth is one of the two universal dimensions of social judgement (with competence) [63].
- *Nuance:* in the 2009 speed-dating data, men *perceived as flirting* used *fewer* appreciations and backchannels [1]. Flirtation and connection are not the same outcome. Generic "uh-huh, wow, great" can read as polite and passive, while specific sympathy and appreciation read as engaged. One summary of Birnbaum & Reis (2012) reports that in first meetings women found highly responsive men slightly *less* sexually appealing, possibly seeing them as over-eager [26]. Responsiveness should be specific and self-possessed, not ingratiating.

**Observable markers.**
- (a) Acoustic: softer `loudness_db` and slower pace when the partner discloses something serious (accommodation). Friendly men in speed dating were *quieter* with shorter utterances [2].
- (b) Linguistic: specific appreciation and sympathy statements, paraphrase ("so it's less the job and more the commute"), named feelings, matched self-disclosure after hers. Watch for one-upping ("that's nothing, I…"), advice-giving before understanding, and generic backchannels only.
- (c) Interaction: cooperative overlaps (completing her sentence, "yes, exactly!") versus topic-stealing interruptions. The analyser can only count overlaps (`interruptions`), so it **must** read the transcript to say which kind. Partner turn length rising across the conversation is a good outcome.

**Examples.**
- Strong: "Moving countries at 19 on your own, that must've been brutal at first." Then a short disclosure of his own: "I did six months in Berlin and the first month I barely spoke to anyone."
- Weak: "Yeah. Cool. Anyway, I've been to Berlin."

**Failure modes.** Therapist mode (all reflection, no self). Gushing and over-validation (reads needy, see D2). Disclosing too much too soon. Faked sympathy.

**Drills.**
1. *Name it and match it.* After any personal story, (a) name the feeling or the core point in one sentence, then (b) share something of similar depth, not deeper.
2. *Appreciation over agreement.* Replace one "yeah" per minute with a specific appreciation ("that's a brilliant way to handle it").

---

### D6. Listening, talk balance and turn-taking rhythm

**What it is.** Getting the share of airtime right and keeping a lively rhythm: quick turn exchanges, without monologues and without leaving all the work to the other person.

**Evidence.**
- In a randomised study, people *assigned* to talk 30%-70% of a getting-acquainted chat were liked *more* the more they talked (linear trend). Interestingness and enjoyment did not change. People wrongly believe they should talk under half the time ("reticence bias"). The authors warn that choosing to "hog" 70% in natural conversation may not go down well, and that content matters [7].
- In leaderless groups, speaking time predicts who emerges as the leader, even when controlling for intelligence and personality [64].
- Faster response times between turns went with stronger felt connection between strangers and between friends. Outside listeners rated speakers as more connected when gaps were shortened [8]. Across 10 languages, people avoid overlap and minimise silence, and language averages fall within about 250 ms of each other [9].
- Language style matching (similar use of function words) predicted mutual interest in speed dating and relationship survival [12]. Behavioural mimicry raises liking and smoothness [47].
- Men labelled *friendly* overlapped more and had shorter turns. Men labelled *awkward* overlapped less and took fewer turns [2].

**Observable markers.**
- (a) Acoustic and timing: `median_response_gap_s`. A brisk normal gap is a few hundred ms. **Heuristic:** flag a Tom median above about 1.0 s, or consistently far above his partner's, as hesitancy. Flag lots of negative gaps (talking over) as possible domination. `talk_share`: **heuristic** for one-to-one, healthy is about 40%-60%. Above about 65% sustained, *together with* a low partner question rate and short partner turns, is monologuing. Below about 35% with a high Tom question rate is interview mode. `longest_turn_s` and `mean_turn_s`: **heuristic** flag turns over about 60-90 s in casual chat unless he was explicitly asked for a story.
- (b) Linguistic: references back to what the partner said ("like you said about…"). Function-word similarity between speakers (an LSM proxy) if computed.
- (c) Interaction: turn count per minute (more, shorter exchanges usually means engagement), overlap type (cooperative vs competitive, from the transcript), who starts new topics.

**Examples.**
- Strong rhythm: short, quick exchanges with overlapping "ha, exactly", then Tom's 30-second story, then a question back.
- Weak: Tom talks for 2.5 minutes about his project; she answers "mm, nice"; a 1.5 s gap follows; he restarts with a new topic.

**Failure modes.** Monologuing (sometimes mistaken for "holding the floor"). Over-correcting into silence. Competitive interruption. Mirroring that becomes obvious mimicry.

**Drills.**
1. *30-second story cap.* Practise telling anecdotes in about 30 s, then pass the turn with a hook ("…has that ever happened to you?").
2. *Quick reply practice.* In casual chat, aim to come in promptly with a short reaction ("no way", "ha, of course") before a longer thought, instead of waiting until the full reply is planned.

---

### D7. Leading and decisiveness

**What it is.** Taking light responsibility for where the interaction goes: proposing plans, making choices, moving the conversation on, and suggesting next steps, without pressure.

**Evidence.**
- Powerful (low-hedge, low-hesitation) speech raises credibility and attractiveness ratings [55][56]. Falling intonation signals confidence [52].
- Speaking up and taking the floor in groups leads to being seen as the leader [64].
- Prestige (shared expertise, respected competence) brings influence and liking. Dominance (intimidation) brings influence without liking [20]. Women prefer prestige over dominance as a route to status [23].
- *Direct evidence that suggesting plans increases attraction was not found.* This dimension relies on the confidence and prestige evidence above plus practitioner consensus. Keep its weight modest.

**Observable markers.**
- (a) Acoustic: falling contour on proposals (`final_rise_st` < 0 on the proposal turn). Steady loudness.
- (b) Linguistic: concrete proposals ("let's…", "I'll book…", "how about Thursday at Rosa's?") versus vague, permission-seeking ones ("we could maybe do something sometime if you wanted?"). Offering a default plus an easy out ("…unless you'd rather…"). `certainty_per_100w`.
- (c) Interaction: the other person's answer. A quick yes or a counter-offer (engaged) versus hedging or delay (respect it). Tom accepts "no" gracefully (see D2).

**Examples.**
- Strong: "I'm going to that photography thing on Saturday. Come along, it's a good one." / Networking: "Let's do a 20-minute call next week. I'll send a couple of times."
- Weak: "We should maybe, like, hang out some time? No pressure though, whatever."

**Failure modes.** Bulldozing. Ignoring her preferences. Treating persistence after a "no" as confidence (it is coercion and out of bounds). Over-planning someone else's evening.

**Drills.**
1. *Default plus out.* Practise phrasing every suggestion as a concrete default with an easy exit.
2. *Decide fast on low stakes.* When asked "where shall we go?", give a choice within 3 s with a one-line reason.

---

### D8. Tension, flirtation and escalation of rapport

**What it is.** Signalling romantic interest clearly and playfully, and gradually deepening intimacy (personal topics, compliments, future plans) *in step* with the other person's signals.

**Evidence.**
- Men intending to flirt asked more questions, used more "you" and "we", laughed more, spoke faster with higher pitch and were *quieter* (lower minimum intensity). Men *perceived* as flirting used fewer appreciations and overlapped less [1]. Another analysis found men labelled flirting had higher, more variable pitch and quieter maximum loudness [2].
- People are poor at reading flirting in four-minute dates: humans got 56%-62% right, against 69%-72% for a classifier. They mainly project their own intentions (self vs perceived-other correlation .73, against .15 with the partner's actual intention) [1]. The extended journal version reached up to 75% accuracy across friendly, flirtatious, awkward and assertive styles [3]. *Tom will misread interest unless he checks behaviour.*
- Both sexes *lowered* voice pitch when talking to a more attractive person [17]. Speech aimed at attractive people had more pitch variation and was preferred by naive listeners, even when filtered to be unintelligible [18]. These two findings point in different directions; both suggest that changing how the voice is used, not one fixed setting, carries interest.
- Escalating self-disclosure generates closeness [42]. Shared and synchronised laughter goes with mutual attraction [37][30].

**Observable markers.**
- (a) Acoustic: in flirtatious stretches, lower `loudness_db` (more intimate) with wider `pitch_range_st` than Tom's networking baseline. *These are the speed-dating directions and must be compared within Tom; never use them as absolute targets.*
- (b) Linguistic: sincere, specific compliments about choices and character (not only looks), "we" framing ("we'd be terrible at karaoke together"), playful future projection, gradual moves to personal topics.
- (c) Interaction (the real gate): the partner's laughter, question rate, longer turns, "we" language, her own escalation. The coach should check that each step Tom takes follows a sign of reciprocity. If she shortens answers, stops asking questions or changes topic, the right move is to step back.

**Examples.**
- Strong: "I'm enjoying this more than I expected. You're trouble." (light, sincere, leaves room)
- Weak: "So are you going to come home with me or what?" (pressure; no reciprocity check)

**Failure modes.** Escalating without reciprocity. Sexual remarks too early. Constant flirt "bits" with no sincerity. Reading politeness as interest (the projection bias in [1]).

**Drills.**
1. *Signal check.* After any escalation, the coach notes the partner's next 3 turns (length, questions, laughter). Tom learns his own read-accuracy over time.
2. *Specific compliment.* One compliment per date about something she *chose* (a story, an opinion, her style), said once and then left alone.

---

### D9. Storytelling and self-presentation

**What it is.** Telling short, vivid stories that reveal character, and presenting accomplishments through narrative and not through bragging.

**Evidence.**
- Men described as good storytellers were rated higher in status, which raised their attractiveness as long-term partners. Women's storytelling had no matching effect on men's ratings [48].
- Charismatic leadership tactics include stories, metaphors, contrasts, lists of three and rhetorical questions. Training these raised rated charisma by a medium amount [61].
- Shared stories went with feeling connected in the speed-dating study [5].
- Humblebragging lowers liking and perceived sincerity [49].

**Observable markers.**
- (a) Acoustic: wider `pitch_range_st` and `loudness_sd_db` during stories versus baseline (animated delivery; see D10). A pause before the punchline or turn.
- (b) Linguistic: story structure (set-up, complication, payoff), concrete detail, dialogue ("and he goes…"), self-aware vulnerability, a point that connects back to the listener. Contrasts ("not X, but Y"). Humblebrags ("so exhausting being headhunted again").
- (c) Interaction: listener backchannels and laughter during the story. Follow-up questions *about* his story afterwards (a strong sign of interest). Length kept to the D6 heuristic.

**Examples.**
- Strong: "First week at the job I accidentally replied-all to 4,000 people with a picture of my cat. By Friday the CEO knew me by name." (concrete, self-deprecating from a secure place, payoff)
- Weak: "Yeah, work's great, I got promoted again, it's a lot of responsibility, people rely on me."

**Failure modes.** Monologue stories. Stories that are always about winning. Too much setup. Retelling the same "greatest hits".

**Drills.**
1. *Three-line story.* Write five anecdotes as set-up, complication and payoff in three sentences each. Tell each in under 45 s.
2. *Hand the mic back.* End each story with a question that lets the other person tell theirs.

---

### D10. Vocal expressiveness and charisma (animation without overacting)

**What it is.** A lively, dynamic voice (pitch movement, emphasis, loudness contrast, rhythm) that conveys energy and engagement.

**Evidence.**
- Perceived charisma rose with mean F0, F0 standard deviation and max F0. Charismatic speakers were rated faster and louder with more variation in intensity [58]. A cross-cultural follow-up found faster, higher, more variable pitch rated more charismatic [59]. Acoustic analysis of Steve Jobs' keynotes linked charisma with melody, loudness, tempo and fluency [60].
- Varying loudness ("louder and softer") went with feeling connected in speed dates [5].
- A trained animated voice tone, plus verbal tactics, raised rated charisma [61].
- *Tension with D1:* low F0 variation predicted rated **physical dominance** among men [15], and confident (vs doubtful) speech may be flatter [50]. Resolve this by context. Steady and flatter at the *end* of statements and when making claims or proposals (D1). Expressive and varied *across* utterances, in stories, humour and enthusiasm (D10). Charisma research mostly studied public speaking, so the gains for one-to-one dating are inferred.
- Cabane's presence, power and warmth framework [62] is popular but this search found no peer-reviewed tests of it. Its parts map onto evidence-based constructs: presence ≈ responsiveness [45][6], power ≈ competence and prestige [20][63], warmth ≈ warmth [63]. Cite the underlying studies, not the book.

**Observable markers.**
- (a) Acoustic: `pitch_sd_st` and `pitch_range_st` per turn versus Tom's baseline. Flag monotone stretches (**heuristic:** turns over 10 s with `pitch_range_st` in Tom's lowest 20%). `loudness_sd_db` for dynamic contrast. Note that `pitch_range_st` is the 10th-90th percentile spread in semitones. There is no verified population norm for conversational male semitone range, so rely on Tom's baseline.
- (b) Linguistic: emphatic words, vivid verbs, contrasts, lists of three.
- (c) Interaction: partner energy matching. Their pitch and loudness variation rising alongside Tom's suggests accommodation.

**Examples.**
- Strong: varied pitch and a deliberate drop to near-whisper for "…and then the lights went out."
- Weak: whole anecdote at one pitch and one volume, ending in uptalk.

**Failure modes.** Overacting (radio presenter voice). Constant high energy that doesn't match the setting or the partner. Pitch going up because of nerves (see D2).

**Drills.**
1. *Emphasis mapping.* Read a paragraph aloud three times, stressing a different key word each time. Compare `pitch_range_st`.
2. *Volume contrast.* Tell one story using deliberate soft and loud moments. Check `loudness_sd_db` rises against baseline.

---

### D11. Status signals: prestige over dominance

**What it is.** How Tom's status comes across: competence, calm and generosity (prestige) versus control, put-downs and intimidation (dominance).

**Evidence.**
- Dominance and prestige are separate routes to influence. Only prestige is linked to being liked [20].
- Prestige and dominance use different nonverbal displays: prestige has a slight upward head tilt, a genuine smile and modest chest expansion; dominance has a downward head tilt, no smile and taking up space [22] (visual, so not measurable from audio).
- A drop in pitch early in group interaction predicted rated dominance and influence, but not prestige [21].
- Lower male F0 predicted dominance ratings more strongly than attractiveness [14]. Women's attractiveness ratings of men's natural speech in a dating game were predicted by low mean F0, low formant dispersion, high intensity and attractive word content [15]. Women preferred lowered male voices but *not very low* ones [16]. Typical adult male conversational F0 is roughly 115 Hz (SD 21) in one Australian English sample [65]. Voice pitch is largely anatomical, but people adjust F0 and formants deliberately and in context [19][13].
- Women preferred prestige to dominance. Dominance helped mostly in competitive or athletic contexts and short-term ratings [23]. Dominance added appeal only for men who were also prosocial [24].
- Self-deprecating humour helps high-status men only [34]. Humblebragging backfires [49].

**Observable markers.**
- (a) Acoustic: `pitch_median_hz` stable near Tom's relaxed baseline (not pushed down artificially). Adequate `loudness_db` for the room (high intensity predicted attractiveness [15]; be audible, not loud). No upward pitch shift when talking to higher-status people (D2).
- (b) Linguistic: shares know-how generously ("here's what worked for me"), gives credit, admits gaps, no put-downs of others, no bragging or name-dropping. Dominance markers: belittling, telling others what they think, dismissive comments ("that's a stupid idea").
- (c) Interaction: others ask *him* for opinions or advice (a prestige sign). Competitive interruptions that grab the topic (dominance). Group laughter *with* him rather than at others.

**Examples.**
- Strong (networking): "Honestly, our first launch flopped. Happy to share what we changed if it's useful."
- Weak: "Yeah, I'd never make that mistake. Most people in this industry don't get it."

**Failure modes.** Forced low "alpha voice" (sounds put-on and can reduce credibility). Status contests. Over-humility that comes across as low status.

**Drills.**
1. *Give one useful thing.* In every networking conversation, offer one concrete piece of know-how or an introduction.
2. *Natural-low check.* Record a relaxed reading after a few deep breaths, then use its `pitch_median_hz` as Tom's "relaxed baseline". Coach towards *that*, not an artificially lowered pitch.

---

## 3. Scoring rubric

Score each dimension 1-5 for each conversation, or **IE (insufficient evidence)** when the recording does not give enough relevant material. Default to IE when any of these apply: under ~3 minutes of Tom's speech; diarisation confidence is poor (speakers mixed up); fewer than 5 relevant turns for that dimension; heavy background noise affecting pitch and loudness; or the context gave no chance for the behaviour (e.g. no plans to lead in a 2-minute chat in a queue). Always give 1-3 pieces of evidence (timestamps and quotes) for each score.

| Dim | 1 (clear weakness) | 2 | 3 (adequate) | 4 | 5 (clear strength) |
|---|---|---|---|---|---|
| D1 Vocal confidence | Frequent uptalk on statements *with* hedges and fillers; many restarts; trails off | Above-baseline fillers or hedges; several approval checks | Mostly fluent; some hedging; statements mostly end flat or falling | Fluent, falling statement endings; pauses used on purpose; few fillers | Calm, fluent, decisive throughout, *and* honest qualifiers where needed |
| D2 Composure / low neediness | Repeated approval-seeking, apologising, pushing after a "no", visible stress (pitch and rate jump) | Some reassurance-seeking; rushes to fill silences | Generally relaxed; a few nervous moments recovered | Comfortable with silence and missed jokes; selective, specific interest | Steady under pressure; light recovery; clearly enjoying himself regardless of outcome |
| D3 Playfulness / humour | No play, or put-downs and negs | Jokes don't land, or self-deprecation dominates | Some light humour; the other person laughs sometimes | Shared laughter; teasing followed by warmth; partner builds on bits | Co-created running jokes and callbacks; overlapping laughter; humour and sincerity both present |
| D4 Curiosity / questions | Almost no questions, or a rapid-fire interview | Mostly topic-switching questions | Some follow-ups; balanced question rates | Several follow-ups that deepen topics; partner gives longer answers | Questions consistently build on her words; partner opens up noticeably |
| D5 Warmth / responsiveness | One-ups, ignores disclosures, gives unasked-for advice | Generic backchannels only | Some specific acknowledgement; some reciprocal disclosure | Specific sympathy and appreciation; matched disclosure; cooperative overlaps | Partner clearly feels understood (says so, or discloses more); disclosure escalates mutually |
| D6 Talk balance / rhythm | Monologue (>70% with short partner turns) or near-silent (<25%); long gaps | Skewed (>65% or <35%) or sluggish gaps | Roughly balanced; ordinary gaps | Lively exchange; brisk gaps; stories capped; good hand-offs | Fast, in sync rhythm; style converging; both build on each other |
| D7 Leading / decisiveness | Never proposes, or pressures and ignores preferences | Vague, permission-seeking suggestions | Some clear proposals | Concrete default plus an easy out; moves topics and plans along smoothly | Leads naturally; proposals accepted or warmly countered; respects no |
| D8 Tension / flirtation (date contexts only) | Pushes without reciprocity, or sexual remarks that ignore signals | No signal of interest at all (pure friend mode), or clumsy compliments | Some playful interest; checks signals | Clear, light interest; escalates in step with her signals | Mutual escalation; playful tension *and* warmth; partner reciprocates clearly |
| D9 Storytelling | No stories, or rambling stories / brags | Stories without payoff | Decent anecdote(s) | Vivid, concise, self-aware stories; listener reacts | Stories land (laughter or follow-ups) and hand the floor back well |
| D10 Expressiveness | Monotone or flat for long stretches | Limited range; little contrast | Normal animation | Varied pitch and loudness in stories and humour; steady on claims | Engaging, natural dynamics matched to the moment; partner's energy rises too |
| D11 Status (prestige) | Put-downs, bragging, dominance displays; or deference collapse (pitch up, over-apologising) | Some status-seeking or humblebrags | Neutral | Shares expertise generously; calm with higher-status people | Others seek his view; admired and liked; easy self-deprecation from security |

**Overall.** Do not average all dimensions into a single "game score". Report the top 2 strengths and the 1-2 highest-leverage fixes, plus the **partner-engagement read** (section 4), which is the main outcome.

---

## 4. Context rules

### 4.1 Which dimensions matter where

| Context | Weight up | Weight down / different | Notes |
|---|---|---|---|
| **Networking / professional** | D1, D7, D11 (prestige), D4, D9 (short, relevant stories) | D8 not applicable (score IE; flag any flirtation as a risk) | Competence plus warmth [63]. Falling, fluent delivery and clear next steps. Talk share near 50%; in groups, speaking up matters [64] but generosity keeps it prestige [20]. |
| **Friends / social** | D3, D5, D6 | D7 lighter; D8 IE | Teasing works more readily among people who already trust each other [35]. Track shared laughter [36]. |
| **First date / dating** | D5, D4, D3, D8, D2 | D11 dominance markers are a strong negative | Focus on her; appreciation and sympathy; cooperative interruptions [4]; follow-ups [6]; selective, specific interest [10]; escalate only with reciprocity. |
| **Group** | D6 (taking and sharing the floor), D3, D11 | Talk-share heuristics change: fair share ≈ 1/N, with leaders often higher [64] | Bring quieter people in ("Sam, you've been there, right?"). Get laughs *with* the group. Don't monopolise. |
| **Phone / video** | D1, D10 | Visual prestige cues [22] are missing; voice carries more | Response gaps may be longer because of latency; adjust. |

### 4.2 The real outcome measure: the other person's engagement

Tom's behaviour is the input. The other person's behaviour is the outcome. Report these for the partner(s) each time, compared with the start of the same conversation and with similar past conversations:

- **Their question rate and follow-ups to Tom.** Being asked about yourself is a strong interest signal [6].
- **Their turn length and disclosure depth.** Lengthening turns and more personal topics mean engagement. Shrinking one-word answers mean disengagement.
- **Laughter.** Laughter after Tom's turns (`after_speaker` = Tom), and especially overlapping or simultaneous laughter. Shared laughter tracks interest and relationship quality [30][36][37]. Women's laughter has been linked with both partners' interest in mixed-sex encounters [38][28]. *Caveat:* raw laughter counts did not predict attractiveness in one big speed-dating study [33], and much laughter is social politeness [39]. Shared, mutual laughter counts for more than volume.
- **Response latency.** Their quick replies suggest connection [8].
- **Accommodation.** Converging function words, pace, pitch range or loudness between speakers [12][47].
- **Initiative.** Do they start topics, suggest plans or extend the conversation?
- **Disengagement signs.** Short answers, topic changes away from Tom's moves, long gaps, attempts to end the conversation, explicit "no". Any explicit refusal ends escalation. The coach must call it out if Tom continued.

Remember the projection bias: people mostly read their own intentions into their partner [1]. Stated preferences also often fail to predict who people actually like in live meetings [11], so behaviour is a better guide than anyone's account of it. The coach must base "she was interested" only on these behaviours, never on Tom's impression.

---

## 5. Ethics and limits

**Consent and recording.** Only analyse conversations where recording is lawful and the other people know or have agreed, in line with UK law and the recorder's privacy practices. Do not store or quote other people's identifying details beyond what the coaching needs. Delete audio as the recorder pipeline already does.

**No manipulation.** The coach must never recommend negging, deception, false time constraints, pressure after a "no", isolating someone, getting someone drunk, or tactics meant to lower another person's self-esteem. If transcripts show these, the coach flags them clearly as off-limits whatever the outcome. The goal is that the *other person* also enjoys and benefits from the conversation. Their engagement (section 4.2) is the success measure, and consent signals override everything.

**What acoustics cannot tell you.**
- Who actually laughed (the pipeline only knows who spoke before and during the laugh), facial expression, eye contact, posture, touch, and the visual prestige and dominance displays [22].
- Whether an interruption was cooperative or competitive (needs transcript reading).
- Meaning: rising intonation can be uncertainty, floor-holding or regional style [53]. Lower pitch can mean confidence, intimacy [17] or fatigue.
- Pitch and loudness are distorted by mic distance, a pocket or watch mic, background noise, alcohol and illness. Absolute dB values from a phone or watch are not comparable across recordings.
- Whisper punctuation decides `is_question`. Questions with no "?" and statements transcribed with one will be misclassified.

**Cultural and demographic bias.** Most evidence comes from North American or European students, heterosexual speed dating, and lab or rated stimuli [1][7][28][33]. Effects can differ with age, culture (e.g. relational mobility [7]), sexual orientation and social class. British English intonation norms (including uptalk) differ from the US samples behind many confidence studies. Gendered findings (e.g. "women prefer humour producers") are average tendencies, not rules about any one person.

**Avoid over-reading single recordings.** Use one conversation for at most 1-2 specific, high-confidence notes. Trends need several recordings in the same context. Follow the house rule in `prosody.py`: read numbers against *Tom's own baseline*. Build baselines per context (networking, friends, dating, group) and per recording device. Report changes from baseline, and only call a change meaningful when it is consistent across at least 3 recordings (**heuristic**).

**Fixed vs trainable.** Anatomical pitch and formants are largely fixed. Modulation (relative pitch drops, range, emphasis, rate, pauses, loudness contrast) is under voluntary control [19][13]. Fluency, hedging, question style, story structure and talk balance are highly trainable. Charisma training produced medium-sized effects [61]. Coach the trainable parts; never shame fixed traits.

**Wellbeing.** If the coach sees patterns of social anxiety (strong liking-gap thinking [46], attachment-anxiety markers [27]), it should be encouraging. Remind Tom that people probably like him more than he thinks [46][7]. Suggest professional support if distress looks significant. The coach is not a clinician.

---

## 6. Sources

Status notes: "abstract or press only" means the full text was not checked for this rubric. Numbers taken from such sources are marked in the text where it matters.

1. Ranganath, R., Jurafsky, D., & McFarland, D. (2009). It's not you, it's me: Detecting flirting and its misperception in speed-dates. *EMNLP 2009*, 334-342. https://aclanthology.org/D09-1035/ (full text checked: features, 69.0%/71.5% system vs 62.2%/56.2% human accuracy, .73 vs .15 correlations)
2. Jurafsky, D., Ranganath, R., & McFarland, D. (2009). Extracting social meaning: Identifying interactional style in spoken conversation. *NAACL-HLT 2009*. https://aclanthology.org/N09-1072/ (full text checked: friendly, flirt and awkward feature weights)
3. Ranganath, R., Jurafsky, D., & McFarland, D. A. (2013). Detecting friendly, flirtatious, awkward, and assertive speech in speed-dates. *Computer Speech & Language*, 27(1). https://sites.socsci.uci.edu/~lpearl/courses/readings/RanganathEtAl2013_DetectingFlirting.pdf (abstract or secondary only; up to 75% accuracy)
4. McFarland, D. A., Jurafsky, D., & Rawlings, C. (2013). Making the connection: Social bonding in courtship situations. *American Journal of Sociology*, 118(6), 1596-1649. https://scholars.duke.edu/publication/1350114 (abstract plus press; full text not checked)
5. Stanford Graduate School of Education (2013). Can you "click" with someone after only four minutes? (press summary of [4]). https://ed.stanford.edu/node/1819
6. Huang, K., Yeomans, M., Brooks, A. W., Minson, J., & Gino, F. (2017). It doesn't hurt to ask: Question-asking increases liking. *JPSP*, 113(3), 430-452. https://dash.harvard.edu/handle/1/35647952
7. Hirschi, Q., Wilson, T. D., & Gilbert, D. T. (2022). Speak up! Mistaken beliefs about how much to talk in conversations. *PSPB*. https://doi.org/10.1177/01461672221104927 (full text checked: linear liking trend 30%-70%; limitations)
8. Templeton, E. M., Chang, L. J., Reynolds, E. A., Cone LePage, M. D., & Wheatley, T. (2022). Fast response times signal social connection in conversation. *PNAS*. Press summary: https://pbs.dartmouth.edu/news/2022/01/when-people-click-they-respond-faster-each-other (press only)
9. Stivers, T., et al. (2009). Universals and cultural variation in turn-taking in conversation. *PNAS*, 106(26), 10587-10592. https://doi.org/10.1073/pnas.0903616106 (abstract: averages within 250 ms; the "~200 ms" figure is commonly cited but not verified here)
10. Eastwick, P. W., Finkel, E. J., Mochon, D., & Ariely, D. (2007). Selective versus unselective romantic desire: Not all reciprocity is created equal. *Psychological Science*, 18(4), 317-319. https://web.mit.edu/ariely/www/MIT/Papers/reciprocity.pdf
11. Eastwick, P. W., & Finkel, E. J. (2008). Sex differences in mate preferences revisited: Do people know what they initially desire in a romantic partner? *JPSP*, 94(2), 245-264. https://www.gwern.net/doc/sociology/2008-eastwick.pdf (background: stated preferences did not predict speed-dating choices, which supports using behaviour as the outcome)
12. Ireland, M. E., Slatcher, R. B., Eastwick, P. W., Scissors, L. E., Finkel, E. J., & Pennebaker, J. W. (2011). Language style matching predicts relationship initiation and stability. *Psychological Science*, 22(1), 39-44. https://www.kellogg.northwestern.edu/faculty/research/detail/2011/language-style-matching-predicts-relationship-inititation-and-stability
13. Puts, D. A., Gaulin, S. J. C., & Verdolini, K. (2006). Dominance and the evolution of sexual dimorphism in human voice pitch. *Evolution and Human Behavior*, 27, 283-296. https://pure.psu.edu/en/publications/dominance-and-the-evolution-of-sexual-dimorphism-in-human-voice-p/ (some later studies failed to replicate)
14. Puts, D. A., et al. (2016). Sexual selection on male vocal fundamental frequency in humans and other anthropoids. *Proc. R. Soc. B*. https://anthropology.washington.edu/sites/anthropology/files/documents/research/puts_et_al._2016_proc_r_soc_b_0.pdf
15. Hodges-Simeon, C. R., Gaulin, S. J. C., & Puts, D. A. (2010). Different vocal parameters predict perceptions of dominance and attractiveness. *Human Nature*, 21(4), 406-427. https://link.springer.com/article/10.1007/s12110-010-9101-5
16. Re, D. E., O'Connor, J. J. M., Bennett, P. J., & Feinberg, D. R. (2012). Preferences for very low and very high voice pitch in humans. *PLoS ONE*. https://pmc.ncbi.nlm.nih.gov/articles/PMC3293852/
17. Hughes, S. M., Farley, S. D., & Rhodes, B. C. (2010). Vocal and physiological changes in response to the physical attractiveness of conversational partners. *Journal of Nonverbal Behavior*, 34(3), 155-167. https://mdsoar.org/handle/11603/4032
18. Leongómez, J. D., Binter, J., Kubicová, L., Stolařová, P., Klapilová, K., Havlíček, J., & Roberts, S. C. (2014). Vocal modulation during courtship increases proceptivity even in naive listeners. *Evolution and Human Behavior*, 35(6), 489-496. https://dspace.stir.ac.uk/handle/1893/20683
19. Pisanski, K., Cartei, V., McGettigan, C., Raine, J., & Reby, D. (2016). Voice modulation: A window into the origins of human vocal control? *Trends in Cognitive Sciences*, 20(4), 304-318. https://sro.sussex.ac.uk/id/eprint/60026/
20. Cheng, J. T., Tracy, J. L., Foulsham, T., Kingstone, A., & Henrich, J. (2013). Two ways to the top: Evidence that dominance and prestige are distinct yet viable avenues to social rank and influence. *JPSP*, 104(1), 103-125. https://henrich.fas.harvard.edu/sites/scholar.harvard.edu/files/henrich/files/cheng_et_al_2013.pdf
21. Cheng, J. T., Tracy, J. L., Ho, S., & Henrich, J. (2016). Listen, follow me: Dynamic vocal signals of dominance predict emergent social rank in humans. *Journal of Experimental Psychology: General*, 145(5), 536-547. https://henrich.fas.harvard.edu/publications/listen-follow-me-dynamic-vocal-signals-dominance-predict-emergent-social-rank (abstract plus press)
22. Witkower, Z., Tracy, J. L., Cheng, J. T., & Henrich, J. (2020). Two signals of social rank: Prestige and dominance are associated with distinct nonverbal displays. *JPSP*, 118(1), 89-120. https://experts.illinois.edu/en/publications/two-signals-of-social-rank-prestige-and-dominance-are-associated-/
23. Snyder, J. K., Kirkpatrick, L. A., & Barrett, H. C. (2008). The dominance dilemma: Do women really prefer dominant mates? *Personal Relationships*, 15(4), 425-444. https://www.sciencedaily.com/releases/2008/12/081217123825.htm (press plus abstract)
24. Jensen-Campbell, L. A., Graziano, W. G., & West, S. G. (1995). Dominance, prosocial orientation, and female preferences: Do nice guys really finish last? *JPSP*, 68, 427-440. https://asu.elsevierpure.com/en/publications/dominance-prosocial-orientation-and-female-preferences-do-nice-gu (secondary summaries only)
25. Murphy, S. C., von Hippel, W., Dubbs, S. L., Angilletta, M. J., Wilson, R. S., Trivers, R., & Barlow, F. K. (2015). The role of overconfidence in romantic desirability and competition. *PSPB*, 41, 1036-1052. https://news.uq.edu.au/2015-06-16-why-cocky-guys-get-girl
26. Birnbaum, G. E., & Reis, H. T. (2012). When does responsiveness pique sexual interest? Attachment and sexual desire in initial acquaintanceships. *PSPB*, 38(7), 946-958. Summary: https://www.sexandpsychology.com/blog/2012/05/16/does-it-pay-to-be-a-nice-guy-in-the-long-run-yes-but-in-the (secondary only; treat as tentative)
27. McClure, M. J., Auger, E., & Lydon, J. E. (2020). What they say, how they say it, or how they look saying it: Which channels of communication link attachment anxiety and problematic first impressions? *Journal of Social and Personal Relationships*, 37(4), 1216-1224. https://ifp.nyu.edu/2019/journal-article-abstracts/0265407519888696/ ; speed-dating findings from press: https://www.adelphi.edu/news/first-date-professor-m-joy-mcclures-research-says-dont-be-nervous/
28. Bressler, E. R., Martin, R. A., & Balshine, S. (2006). Production and appreciation of humor as sexually selected traits. *Evolution and Human Behavior*, 27(2), 121-130. https://abel.mcmaster.ca/publications/pdfs/Bressler%20et%20al..pdf
29. Wilbur, C. J., & Campbell, L. (2011). Humor in romantic contexts: Do men participate and women evaluate? *PSPB*. Summary: https://www.psychologytoday.com/us/blog/humor-sapiens/201110/why-jokes-are-seductive (secondary only)
30. Hall, J. A. (2015). Sexual selection and humor in courtship: A case for warmth and extroversion. *Evolutionary Psychology*. https://kuscholarworks.ku.edu/bitstream/handle/1808/21526/Hall_2015_SexualSelection.pdf
31. Hall, J. A. (2017). Humor in romantic relationships: A meta-analysis. *Personal Relationships*. Summary: https://news.ku.edu/2017/02/08/relationship-success-tied-not-joking-shared-sense-humor (press only; 39 studies, 15,177 participants)
32. Treger, S., Sprecher, S., & Erber, R. (2013). Laughing and liking: Exploring the interpersonal effects of humor use in initial social interactions. *European Journal of Social Psychology*, 43, 532-543. https://metatoc.com/papers/18521-laughing-and-liking-exploring-the-interpersonal-effects-of-humor-use-in-initial-social-interactions
33. Wainwright, H., et al. (2023). Laughter and ratings of funniness in speed dating do not support the fitness indicator hypothesis of humour. *Evolution and Human Behavior*. https://dspace.stir.ac.uk/handle/1893/35589 (abstract plus press)
34. Greengross, G., & Miller, G. (2008). Dissing oneself versus dissing rivals: Effects of status, personality, and sex on the short-term and long-term attractiveness of self-deprecating and other-deprecating humor. *Evolutionary Psychology*, 6(3), 393-408. https://doaj.org/article/dcf0172c3a6e416881b935bbfcb44439
35. Keltner, D., Capps, L., Kring, A. M., Young, R. C., & Heerey, E. A. (2001). Just teasing: A conceptual analysis and empirical review. *Psychological Bulletin*, 127(2), 229-248. https://research.bangor.ac.uk/en/publications/just-teasing-a-conceptual-analysis-and-empirical-review/ (full text not checked; content summarised from general knowledge of the review, so verify before quoting)
36. Kurtz, L. E., & Algoe, S. B. (2015). Putting laughter in context: Shared laughter as behavioral indicator of relationship well-being. *Personal Relationships*, 22(4), 573-590. https://pmc.ncbi.nlm.nih.gov/articles/PMC4779443/
37. Rathcke, T., & Fuchs, S. (2022). Laugh is in the air: An exploratory analysis of laughter during speed dating. *Frontiers in Communication*, 7, 909913. https://www.frontiersin.org/articles/10.3389/fcomm.2022.909913/full
38. Grammer, K. (1990). Strangers meet: Laughter and nonverbal signs of interest in opposite-sex encounters. *Journal of Nonverbal Behavior*. https://link.springer.com/doi/10.1007/BF00989317 (abstract plus citation in [28]; title and authorship per Springer DOI, and the often-cited co-authored Grammer & Eibl-Eibesfeldt 1990 chapter was not checked)
39. Provine, R. R. (1993). Laughter punctuates speech: Linguistic, social and gender contexts of laughter. *Ethology*, 95, 291-298. Summary: https://www.apa.org/monitor/jun06/laughing (abstract plus secondary; reported gender patterns differ between sources)
40. Bryant, G. A., et al. (2016). Detecting affiliation in colaughter across 24 societies. *PNAS*, 113(17), 4682-4687. https://pmc.ncbi.nlm.nih.gov/articles/PMC4855576
41. Chick, G., Yarnal, C., & Purrington, A. (2012). Play and mate preference: Testing the signal theory of adult playfulness. *American Journal of Play*, 4(4). https://scottbarrykaufman.com/wp-content/uploads/2012/08/Chick-Yarnal-Purrington-2012.pdf
42. Aron, A., Melinat, E., Aron, E. N., Vallone, R. D., & Bator, R. J. (1997). The experimental generation of interpersonal closeness. *PSPB*, 23(4), 363-377. https://stafforini.com/docs/Aron%20et%20al%20-%20The%20experimental%20generation%20of%20interpersonal%20closeness.pdf
43. Sprecher, S., Treger, S., & Wondra, J. D. (2013). Effects of self-disclosure role on liking, closeness, and other impressions in get-acquainted interactions. *Journal of Social and Personal Relationships*. https://doi.org/10.1177/0265407512459033 (full text not checked)
44. Kardas, M., Kumar, A., & Epley, N. (2022; online 2021). Overly shallow? Miscalibrated expectations create a barrier to deeper conversation. *JPSP*. https://www.apa.org/news/press/releases/2021/09/deep-conversations-strangers
45. Reis, H. T., Clark, M. S., & Holmes, J. G. (2004). Perceived partner responsiveness as an organizing construct in the study of intimacy and closeness. In Mashek & Aron (Eds.), *Handbook of Closeness and Intimacy*, 201-225. No open copy; definition as used in Maisel et al. (2008): https://labs.psych.ucsb.edu/gable/shelly/sites/labs.psych.ucsb.edu.gable.shelly/files/pubs/maisel_et_al._2008.pdf
46. Boothby, E. J., Cooney, G., Sandstrom, G. M., & Clark, M. S. (2018). The liking gap in conversations: Do people like us more than we think? *Psychological Science*, 29(11), 1742-1756. https://www.psychologicalscience.org/news/releases/you-probably-made-a-better-first-impression-than-you-think.html
47. Chartrand, T. L., & Bargh, J. A. (1999). The chameleon effect: The perception-behavior link and social interaction. *JPSP*, 76(6), 893-910. https://pages.ucsd.edu/~pwinkiel/chameleon.pdf
48. Donahue, J. K., & Green, M. C. (2016). A good story: Men's storytelling ability affects their attractiveness and perceived status. *Personal Relationships*, 23, 199-213. https://bps.org.uk/research-digest/men-who-can-tell-good-story-are-seen-more-attractive-and-higher-status (secondary; ratings of written or described stories, not live dating)
49. Sezer, O., Gino, F., & Norton, M. I. (2018). Humblebragging: A distinct, and ineffective, self-presentation strategy. *JPSP*, 114(1), 52-74. https://internet.psych.wisc.edu/wp-content/uploads/532-Master/532-UnitPages/Unit-12/Sezer_Humblebrag_2017.pdf
50. Jiang, X., & Pell, M. D. (2017). The sound of confidence and doubt. *Speech Communication*, 88, 106-126. Author summary: https://spsp.org/news-center/character-context-blog/voice-confidence-how-listeners-decode-feeling-knowing (secondary sources disagree on F0 variation direction)
51. Guyer, J. J., Fabrigar, L. R., & Vaughan-Johnston, T. I. (2019). Speech rate, intonation, and pitch: Investigating the bias and cue effects of vocal confidence on persuasion. *PSPB*, 45(3), 389-405. https://doi.org/10.1177/0146167218787805 (abstract-level only)
52. Vaughan-Johnston, T. I., Guyer, J. J., Fabrigar, L. R., Lamprinakos, G., & Briñol, P. (2024/2026). Falling vocal intonation signals speaker confidence and conditionally boosts persuasion. *PSPB*, 52(1), 3-21. https://orca.cardiff.ac.uk/id/eprint/169463/
53. Tomlinson, J. M., & Fox Tree, J. E. (2011). Listeners' comprehension of uptalk in spontaneous speech. *Cognition*, 119(1), 58-69. https://orca.cardiff.ac.uk/id/eprint/31523/
54. Brennan, S. E., & Williams, M. (1995). The feeling of another's knowing: Prosody and filled pauses as cues to listeners about the metacognitive states of speakers. *Journal of Memory and Language*, 34(3), 383-398. Citation confirmed via https://hal.telecom-paris.fr/hal-03577262/file/2021.icnlsp-1.27.pdf (full text not checked)
55. Erickson, B., Lind, E. A., Johnson, B. C., & O'Barr, W. M. (1978). Speech style and impression formation in a court setting: The effects of "powerful" and "powerless" speech. *Journal of Experimental Social Psychology*, 14, 266-279. https://scholars.duke.edu/publication/784538
56. Hosman, L. A. (1989). The evaluative consequences of hedges, hesitations, and intensifiers: Powerful and powerless speech styles. *Human Communication Research*. https://aquila.usm.edu/fac_pubs/16291 ; see also Hosman, Huebner & Siltanen (2002): https://www.uky.edu/~ngrant/CJT780/readings/Day%206/HosmanHuebnerSiltanen2002.pdf (persuasion effects are mixed)
57. Brooks, A. W., Dai, H., & Schweitzer, M. E. (2014). I'm sorry about the rain! Superfluous apologies demonstrate empathic concern and increase trust. *Social Psychological and Personality Science*. https://bps.org.uk/research-digest/want-people-trust-you-try-apologising-rain (field study lacks a clean control)
58. Rosenberg, A., & Hirschberg, J. (2005). Acoustic/prosodic and lexical correlates of charismatic speech. *Interspeech 2005*. https://www.isca-archive.org/interspeech_2005/rosenberg05_interspeech.html
59. Biadsy, F., Rosenberg, A., Carlson, R., Hirschberg, J., & Strangert, E. (2008). A cross-cultural comparison of American, Palestinian, and Swedish perception of charismatic speech. *Speech Prosody 2008*. https://www.cs.columbia.edu/nlp/papers/2008/fadi_al_08b.pdf
60. Niebuhr, O., Voße, J., & Brem, A. (2016). What makes a charismatic speaker? A computer-based acoustic-prosodic analysis of Steve Jobs' tone of voice. *Computers in Human Behavior*, 64, 366-382. https://cris.fau.de/publications/108648804/
61. Antonakis, J., Fenley, M., & Liechti, S. (2011). Can charisma be taught? Tests of two interventions. *Academy of Management Learning & Education*. Summary: https://www.bps.org.uk/research-digest/charisma-involves-teachable-behaviours (secondary only)
62. Cabane, O. F. (2012). *The Charisma Myth*. Portfolio. https://stafforini.com/works/cabane-2012-charisma-myth-how/ (practitioner book; no peer-reviewed test of the framework found)
63. Fiske, S. T., Cuddy, A. J. C., & Glick, P. (2007). Universal dimensions of social cognition: Warmth and competence. *Trends in Cognitive Sciences*, 11(2), 77-83. https://collaborate.princeton.edu/en/publications/universal-dimensions-of-social-cognition-warmth-and-competence/
64. MacLaren, N. G., et al. (2020). Testing the babble hypothesis: Speaking time predicts leader emergence in small groups. *The Leadership Quarterly*, 31(5), 101409. https://doi.org/10.1016/j.leaqua.2020.101409
65. Leung, Y., et al. (2022), *Journal of Voice*, as reported in the Sydney Voice Lab acoustic normative data sheet (male conversational F0 ≈ 115 Hz, SD 21; Australian English). https://www.sydney.edu.au/content/dam/corporate/documents/faculty-of-medicine-and-health/research/research-centres/sydney-voice-lab/acoustic-analysis-normative-data-reference-sheet-20250416_v4.0-sydney-voice-lab.pdf.coredownload.pdf (secondary)
66. *(Not used: no verified adult conversational speech-rate norm was found. Use Tom's baseline.)*
67. Bortfeld, H., Leon, S. D., Bloom, J. E., Schober, M. F., & Brennan, S. E. (2001). Disfluency rates in conversation: Effects of age, relationship, topic, role, and gender. *Language and Speech*, 44(2), 123-147. https://researchconnect.stonybrook.edu/en/publications/disfluency-rates-in-conversation-effects-of-age-relationship-topi (abstract only; the "~6 per 100 words" figure is widely quoted but was not verified here)

### Unverified or deliberately excluded
- A specific peer-reviewed effect for "suggesting plans increases attraction": not found; D7 is weighted accordingly.
- Absolute targets for semitone pitch range, speech rate or filler rate in social conversation: not found in sources checked; all such numbers above are labelled heuristic.
- McFarland et al. (2013) details beyond the press summaries (e.g. laughter or pitch effects on "clicking"): the full text could not be retrieved, so only the press-reported findings are used.
- A 2014 JPSP paper by McClure & Lydon on attachment anxiety ("Anxiety doesn't become you") is often cited, but this search could not confirm its details, so only the 2020 JSPR paper [27] is used.
