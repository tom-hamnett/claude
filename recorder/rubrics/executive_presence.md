# Executive Presence and Leadership Communication: Analysis Rubric

Version 1.0, 23 Oct 2026. Purpose: the scoring foundation for the recorder's automated coach, which reviews Tom's real meetings and 1:1s. Numbers in square brackets refer to the source list in section 6. Where a figure could not be checked against a primary source, the text says so.

Metric names in `code` match the fields produced by `recorder/prosody.py` (for example `pitch_sd_st`, `uptalk_share`, `median_response_gap_s`).

---

## 1. Summary: executive presence as measurable behaviour

Executive presence is the impression, formed by others, that a person is ready to be trusted with bigger decisions. Hewlett's executive survey splits it into gravitas (how you act: confidence, decisiveness, composure, vision), communication (how you speak: speaking skill, command of the room, reading the audience, and since 2022 "listening to learn" ahead of forcefulness) and appearance, with gravitas named by most executives as the core [1][2]. For a recording-based coach the useful definition is narrower and behavioural: **presence is the observable combination of (a) clear, committed content, (b) a voice that sounds steady, expressive and unhurried, and (c) interaction behaviour that earns respect through competence and warmth rather than through domination.** Research supports each part: charisma rises when leaders use specific, trainable verbal and vocal tactics [3][4][5]; listeners attribute competence and status to vocal cues such as pitch level, pitch movement, loudness and fluency [6][7][8][9][10]; and influence that is gained through prestige (expertise, generosity, listening) is liked, while influence gained through dominance is not [11][12]. Nothing in this rubric uses appearance. Everything is judged against Tom's own baseline over time, because individual voices differ far more than any coaching target.

---

## 2. Dimensions

Twelve dimensions, grouped into three clusters. Each lists acoustic, transcript and interaction markers. "Direction" means which way a change from Tom's baseline is usually better; "benchmark" means a published number that can anchor interpretation.

**Content cluster:** D1 Clarity and structure, D2 Conviction and calibrated certainty, D3 Charismatic rhetoric, D4 Collective framing and warmth.
**Voice cluster:** D5 Vocal authority (pitch level and endings), D6 Vocal expressiveness, D7 Pace, pausing and fluency.
**Interaction cluster:** D8 Listening and inquiry, D9 Airtime and turn-taking, D10 Composure and receptiveness under challenge, D11 Meeting leadership (opening, steering, closing), D12 Humour and levity.

---

### D1. Clarity and structure (answer first)

**What it is.** Leading with the conclusion or recommendation, then the supporting reasons, then the detail; signposting; ending turns cleanly.

**Why it matters.** The Pyramid Principle (Minto, ex-McKinsey) and the military "bottom line up front" (BLUF) convention both put the governing idea first so a busy listener can stop at any point and still have the point [13]. Hewlett's surveys rank "superior speaking skills" and the ability to command a room as the top communication traits [1][2]. The evidence base here is practitioner consensus rather than controlled experiments; treat it as a strong convention, not a measured effect.

**Observable markers.**
- (a) Acoustic: none specific. A long `pause` or filled pause at the very start of a substantive turn often signals that the answer is being assembled live (see D7).
- (b) Transcript:
  - Position of the main claim: in the first sentence or first ~25 words of a substantive turn (good) vs. after context-setting (weak).
  - Signposts: "Three points", "My recommendation is", "The short answer is", "So, to summarise".
  - Turn length vs. content: long turns (`longest_turn_s` above ~90 s in a conversation) without a stated point are a flag.
  - Restarts and abandoned sentences ("So what we... the thing is... basically...").
- (c) Interaction: others ask "So what are you proposing?" or "Sorry, what's the ask?" (a strong negative signal); others repeat Tom's point back accurately (positive).

**Examples.**
- Strong: "My recommendation is we delay the launch by two weeks. Two reasons: the payment flow isn't tested, and the partner contract isn't signed."
- Weak: "So, there's been quite a lot going on with the launch, and obviously the team's been working really hard, and, um, there are a few things we probably need to think about around timing..."

**Failure modes.** Chronological storytelling instead of conclusion first; burying the ask; answering a different question; over-qualifying the headline.

**Drills.**
1. *Headline first:* before any update, write one sentence starting "I recommend / I think / The answer is". Say it first, then "because" plus up to three reasons.
2. *30-second cut:* re-record a long answer at half the length. The coach compares word counts and checks the claim moved forward.

---

### D2. Conviction and calibrated certainty

**What it is.** Stating positions with commitment, and expressing uncertainty precisely ("70% confident", "the one thing I don't know is X") rather than diffusely ("I sort of think maybe").

**Why it matters.**
- The "powerless" speech style (hedges, hesitation forms, intensifiers, questioning intonation, excessive politeness) was linked to lower credibility in courtroom experiments; O'Barr and Atkins argued these features reflect powerlessness more than gender [14][15].
- Hedged persuasive messages produce less persuasion and more negative views of the source in several studies; tag questions affect perceived power and credibility [16].
- People reward confidence: advisors who give more extreme confidence judgments are preferred, even when overconfident (the "confidence heuristic") [17].
- But calibration beats raw confidence when errors come to light: confident sources who turn out wrong lose the most credibility [18]. So the goal is *committed and calibrated*, not uniformly certain.
- Hewlett: confidence and decisiveness top the gravitas list in both 2012 and 2022 surveys [2].

**Observable markers.**
- (a) Acoustic: final pitch rise on declarative statements (see D5); filled pauses immediately before the key claim (D7).
- (b) Transcript:
  - `hedges_per_100w` (diffuse hedges: "I think", "maybe", "sort of", "just", "a bit", "I guess", "hopefully"). Direction: down vs. baseline, especially in recommendation turns.
  - `certainty_per_100w` ("I recommend", "we will", "the answer is", "I've decided"). Direction: up in decision moments.
  - Calibrated uncertainty phrases ("I'm confident about A, less sure about B", numeric likelihoods, "what would change my mind is"). These are **positive**, not hedges.
  - Permission-seeking tags: "does that make sense?", "if that's OK?", "is that alright?". Flag when they close a recommendation.
  - Unneeded apologies (`apologies`): "Sorry, can I just...".
  - Minimisers before a contribution: "This might be a stupid question", "I'm just thinking out loud".
- (c) Interaction: whether Tom's proposals are adopted, built on, or ignored; whether others ask "So are you saying yes or no?".

**Examples.**
- Strong: "I'd back option B. I'm fairly sure on cost; the risk I can't size yet is supplier lead time, and I'll have that by Friday."
- Weak: "I guess maybe B could possibly be sort of the better one? If that makes sense?"

**Failure modes.** Stacked hedges; certainty about everything (calibration loss when wrong); British over-softening read as indecision by direct cultures (see section 4); apologising for taking the floor.

**Drills.**
1. *Hedge audit:* the coach lists Tom's top five hedge phrases from the week. Pick one to delete for the next week, and replace diffuse hedges with one precise statement of what is uncertain.
2. *Commit-then-qualify:* practise "I recommend X. The main risk is Y, and here's how we'd handle it." One qualifier, after the commitment, never before.

---

### D3. Charismatic rhetoric (the verbal Charismatic Leadership Tactics)

**What it is.** The verbal techniques Antonakis and colleagues identified as making speakers seem more leader-like, trustworthy and influential: metaphors, similes and analogies; stories and anecdotes; contrasts; rhetorical questions; three-part lists; expressions of moral conviction; reflecting the group's sentiments; setting high expectations; and conveying confidence those expectations can be met. Three non-verbal tactics complete the set: animated voice (D6), facial expression and gestures (not measurable from audio) [3][4].

**Why it matters.**
- Trainability: in a field study, 34 managers were rated by roughly ten co-workers each; managers who received charisma training improved more than an untrained comparison group. In a lab study, 41 MBA students re-gave speeches after training; coders counted more tactics, and speeches with more tactics were rated higher on trust, competence and leader prototypicality [3][5].
- HBR summary of the same work: executives who practised the tactics saw audience leadership ratings rise by about 60% [4]. (A secondary source quotes 65%; the original effect sizes were not checked here.)
- Field replication: machine-coded verbal charisma in 768 TED talks predicted views and "inspiring/persuasive" ratings beyond non-verbal signals and attractiveness [19] (reported via a seminar abstract; full paper not reviewed).
- Antonakis et al. define charisma as values-based, symbolic, emotion-laden leader signalling [20].
- Stories persuade partly through "transportation" (absorption): more-transported listeners adopt story-consistent beliefs and notice fewer weak points [21].
- Caution: overuse by inexperienced speakers can sound like self-parody [5].

**Observable markers.**
- (a) Acoustic: see D6. Tactics land better with emphatic pitch and loudness movement on the key word.
- (b) Transcript (count per 10 minutes of Tom's speech, compare with baseline):
  - Metaphor or analogy ("it's like...", "think of it as..."); story or anecdote (past tense narrative with a person, place, moment); contrast ("not X but Y", "we used to... now we..."); lists of three; rhetorical questions followed by Tom's own answer; moral conviction ("the right thing to do", "we owe it to"); group sentiment ("I know everyone's tired of re-planning"); high expectations plus confidence ("This is ambitious, and I know this team can do it").
  - An automated detector exists in the research literature (fine-tuned BERT for CLTs) [22], so this is machine-codable.
- (c) Interaction: others pick up Tom's metaphor or phrase later in the meeting ("as Tom said, it's a bridge, not a destination") is a strong positive.

**Examples.**
- Strong: "We're not building a product, we're building a habit. Last week a nurse in Leeds used it three times before 9am. That's the bar: daily, useful, boring in the best way."
- Weak: "So the product will hopefully drive increased engagement across user segments going forward."

**Failure modes.** Every sentence a soundbite; stories with no point; moral language in a purely operational meeting (sounds inflated); contrasts that straw-man colleagues.

**Drills.**
1. *One of each:* before a key meeting, prepare one story, one contrast and one three-part list for the main point. The coach checks which ones appeared.
2. *Abstract-to-concrete swap:* take one abstract sentence from last week's transcript and rewrite it with a person, a number or an image.

---

### D4. Collective framing and warmth

**What it is.** Speaking as part of and on behalf of the group ("we", "us", "our"), signalling care for others' interests, and pairing warmth with strength.

**Why it matters.**
- Warmth and competence are the two universal dimensions of social judgement; people high on both attract the most positive reactions [23]. Cuddy, Kohut and Neffinger argue leaders should establish warmth (trust) first, then demonstrate strength [24].
- Election winners in all 43 Australian federal elections since 1901 used "we/us" more than losers in 80% of contests, about once every 79 words vs. once every 136 words (correlational) [25].
- Higher-status people use fewer first-person singular pronouns ("I") and more "we" and "you" in email and conversation (Kacewicz, Pennebaker et al.; findings reported in secondary coverage) [26].
- Prestige-based status (respect earned by sharing expertise) brings influence and liking; dominance brings influence without liking [11].

**Observable markers.**
- (a) Acoustic: warmth is carried partly by pitch variation and softer loudness at the start of turns; there is no validated acoustic warmth benchmark, so do not score warmth from acoustics alone.
- (b) Transcript:
  - We-ratio: ("we", "us", "our") / ("I", "me", "my") in Tom's speech. Benchmark from [25]: one collective pronoun every ~79 words was the winners' average in campaign speeches; conversation will differ. Direction: up vs. baseline in group and vision contexts. Caution: "I" is correct for owning decisions and mistakes ("I got that wrong", "I recommend").
  - Recognition of others by name ("Priya's analysis showed...").
  - Acknowledging feelings or constraints ("I know this lands on your team").
- (c) Interaction: others laugh with Tom (shared laughter), build on his ideas, or volunteer for actions.

**Examples.**
- Strong: "We've got a hard quarter ahead. Sam's team carried the last one, so this time I want us to share the load differently."
- Weak: "I've decided I need my team to deliver this for me."

**Failure modes.** Royal "we" that hides accountability; "we" while assigning all the work to others; warmth without any strength (sounds like a peer, not a leader); strength with no warmth (respected but avoided).

**Drills.**
1. *Name and credit:* in each meeting, credit one person by name for a specific contribution.
2. *Rewrite the I-sentences:* the coach shows three "I/my" sentences about shared work; rewrite them as "we", while keeping "I" for decisions and apologies.

---

### D5. Vocal authority: pitch level and statement endings

**What it is.** Speaking from a settled, comfortable pitch (not pushed up by nerves), and ending statements with falling, final intonation.

**Why it matters.**
- Among 792 male S&P 1500 CEOs, a 22.1 Hz lower voice pitch was associated with managing firms about $440m larger, about $187k higher pay and about 151 days longer tenure (correlational, controls for age and other factors) [6].
- Lower-pitched versions of the same voices (men and women) won more votes in experiments [7]. But a later study found voice pitch predicted electability, **not** actual leadership ability, and lower voices were not more persuasive on policy statements [27].
- Dynamics matter more than level for a coach: in group tasks, people who **raised** their pitch early in an interaction gained lower rank, while those who **lowered** it gained higher rank and influence; a follow-up experiment supported causality for perceived rank [8].
- Complication: people induced to feel high power spoke at a slightly **higher** pitch, with **less** pitch variability and **more** loudness variability, and listeners could detect the power difference [28]. Pitch effects are not one-directional; "push your voice down" is bad advice.
- Vocal fry: young women imitating fry were rated less competent, trustworthy and hireable, with a smaller penalty for men [29]; critics note the speakers were imitating fry unnaturally [30].
- Uptalk (rising pitch on statements): evidence is mixed. Tomlinson and Fox Tree found rising pitch alone did not reduce perceived knowledgeability, while lengthened (prolonged) words did; effects depend on listener age, gender ideology and context [31][32].

**Observable markers.**
- (a) Acoustic:
  - `pitch_median_hz`: compare to Tom's own relaxed baseline (calm 1:1, first minutes excluded). Direction: **stable** rather than lower. Flag a rise of more than ~1-2 semitones above baseline in high-stakes segments (being challenged, presenting up) as a likely tension marker. (This threshold is a coaching heuristic, not a published cut-off.)
  - Early-meeting drift: pitch in Tom's first five turns vs. his median for the meeting. Rising early is the pattern linked with lower emergent rank [8].
  - `uptalk_share` on statements (final rise ≥ 2 st, `UPTALK_ST`). There is no published "acceptable" rate. Direction: down on recommendations and decisions; ignore on genuine check-ins and lists (list items naturally rise).
  - Creaky voice at phrase ends: not currently measured; if added, track only as a trend.
  - Reference values only: adult male conversational F0 is commonly around 100-130 Hz; Niebuhr cites ~120 Hz for ordinary speakers in reading and dialogue [33]. Never coach Tom towards a number.
- (b) Transcript: statements written as questions ("So we'd go with B?") when a recommendation was intended.
- (c) Interaction: others interrupting or talking over Tom right after a rising ending (rising endings hand over the floor).

**Examples.**
- Strong: "We go with B." (falling to a low, final pitch, short pause after)
- Weak: "We go with B?" (rise on "B", followed by others jumping in)

**Failure modes.** Forcing a deep voice (strain, fry, monotone); pitch climbing as stakes rise; uptalk on the one sentence that matters.

**Drills.**
1. *Land the full stop:* read three recommendation sentences aloud, letting pitch fall on the last stressed word and holding a one-beat pause. Record; the coach checks `final_rise_st` < 0 on each.
2. *Settle before speaking:* one slow exhale before the first contribution in a high-stakes meeting; compare first-five-turn pitch with baseline over several weeks.

---

### D6. Vocal expressiveness and energy (animated voice)

**What it is.** Pitch movement and loudness contrast that highlight key words and signal engagement, as opposed to monotone or uniform delivery.

**Why it matters.**
- "Animated voice" is one of the three non-verbal Charismatic Leadership Tactics [3][4].
- In American political speech, higher pitch, wider pitch range and faster rate were associated with higher charisma ratings [34] (via later reviews; the primary 2009 paper was not retrieved). Perceived charisma correlated positively with F0 variability, range and maximum in a later perception study [35].
- Steve Jobs vs. Mark Zuckerberg: Jobs' F0 range was about 21-25 semitones vs. about 12 st for Zuckerberg; Jobs also spoke more slowly (4.3-5.0 vs. 6.0-6.2 syllables/s) in shorter phrases (1.25-1.39 s vs. ~1.5 s) [33]. Jobs was rated as the more charismatic speaker. Note: Niebuhr's "range" is measured differently from `pitch_range_st` (which is the 10th-90th percentile span), so the numbers are not directly comparable.
- Prosodic charisma is trainable: in 72 participants, 12-week and 4-hour courses raised acoustic charisma scores; women gained more [36].
- Hearing a pitch (vs. reading the same words) made job candidates seem more intelligent and hireable; the authors attribute this to paralinguistic cues such as pitch variation and cadence [37].
- Loudness: higher mean loudness and greater loudness variability predicted higher perceived dominance [9]; high-power speakers show more loudness variability [28].

**Observable markers.**
- (a) Acoustic:
  - `pitch_sd_st` and `pitch_range_st`: direction **up vs. baseline** when presenting or persuading; moderate in 1:1s. Rough reference: one dataset found adult male speaking-F0 SDs of about 1.6-2.5 semitones [38]; treat as context, not target. A sustained drop of more than ~25% below Tom's baseline in a turn where he is making his case suggests flat delivery (heuristic).
  - `loudness_sd_db`: direction up vs. baseline for persuasive turns (contrast on key words).
  - `loudness_db` mean: only interpret relative to others in the same recording and same microphone; meaningful mainly when Tom is markedly quieter than peers.
- (b) Transcript: none directly; but emphasis targets (numbers, contrasts) give the voice something to stress.
- (c) Interaction: audience back-channels ("mm", "right") and laughter around Tom's turns.

**Examples.**
- Strong: "This isn't a *cost* problem. It's a *speed* problem." (pitch peak and loudness bump on each contrasted word)
- Weak: the same sentence delivered with flat pitch and even loudness.

**Failure modes.** Monotone under stress (pitch range collapses when Tom is challenged); performative sing-song in a 1:1 (overuse); shouting instead of contrast.

**Drills.**
1. *Operative word:* mark one word per sentence to stress in a short script; read with pitch and loudness peak on it. The coach compares `pitch_sd_st` with baseline.
2. *Two-register read:* read a paragraph once "to a friend" and once "to a board", keeping the board version varied but slower, and hear the difference.

---

### D7. Pace, pausing and fluency

**What it is.** A deliberate, unhurried rate, purposeful silent pauses (especially before and after key points), and few filled pauses.

**Why it matters.**
- Rate: in synthetic manipulations of ±12.5-50%, perceived competence rose roughly linearly with rate, while benevolence (warmth) peaked at normal rate [39]. Faster rate also went with charisma in political speech [34]. But slower rate predicted higher perceived **dominance** [9], and Jobs, the more charismatic speaker, was slower than Zuckerberg [33]. Net: avoid both rushing and dragging; slow down for key points.
- Telephone interviewers (1,380 calls, 100 interviewers) were most successful at about 3.5 words/s (~210 wpm); very fast and very slow did worse, and those who paused briefly and often did better than perfectly fluent speakers [40].
- Norms: in American telephone conversation, average speaking rate was 196 wpm counting all words over all conversation time; 236 wpm net of silences; 164 wpm when computed per speaker turn [41]. Rates depend on how pauses are counted; compare like with like.
- Silent pauses before a word make listeners more likely to remember it [42].
- Filled pauses ("um", "uh") lower listeners' sense that the speaker knows the answer [43]; in a later experiment, inserted filled pauses were the strongest cue to perceived uncertainty, more than rate or pitch [44]. (Counter-evidence: one older study found "um" did not reduce perceived eloquence; reported only secondhand, so not used here.)

**Observable markers.**
- (a) Acoustic:
  - `speaking_rate_wpm` and `articulation_rate_wpm`. Benchmarks above are context, not targets. Direction: presenting and key points **slower** than Tom's own conversational baseline; a turn more than ~20% faster than baseline while being challenged suggests rushing (heuristic).
  - `pauses_per_min` and pause placement: silent pauses of ~0.5-1.0 s **before** the key claim or number, and after a question to the room, are positive. Long mid-sentence pauses inside a phrase (word-search) are neutral to negative.
  - `long_pauses` (≥ 1 s): positive when placed at sentence boundaries; negative when they precede a filled pause or restart.
- (b) Transcript:
  - `fillers_per_100w` (um, uh, erm, "you know", "I mean", "like" as filler). No validated threshold exists; direction **down vs. baseline**. Especially flag fillers immediately before the main claim.
  - Note: `prosody.py` counts "sort of" and "kind of" as both fillers and hedges; when reporting, attribute them to hedges (D2) to avoid double counting.
- (c) Interaction: others cutting in during Tom's mid-sentence pauses (signals that the pause sounded like a turn end or lost thread).

**Examples.**
- Strong: "Revenue grew [pause] eleven percent. [pause] And margin held."
- Weak: "Revenue, um, grew, like, eleven percent, and, uh, you know, margin was, um, fine."

**Failure modes.** Rushing when nervous; filling every silence; reading slides at the same steady rate; pauses so long they hand away the floor in a competitive group.

**Drills.**
1. *Pause-for-filler swap:* in a 2-minute recorded answer, replace every "um" with silence. Expect `fillers_per_100w` to fall and `pauses_per_min` to rise.
2. *Number pause:* before any number or decision in a meeting, pause for one beat. The coach checks pause placement before numerals in the transcript.

---

### D8. Listening and inquiry

**What it is.** Asking real questions (especially follow-ups), letting others finish, paraphrasing, and building on what was said.

**Why it matters.**
- People who ask more questions, especially follow-up questions, are better liked, because they seem more responsive; people underestimate this effect [45].
- Hewlett's 2022 survey: "listen to learn" replaced forcefulness among the top communication traits [2].
- Groups with more equal turn-taking and higher social sensitivity showed higher collective intelligence (correlational; a later replication attributed more to individual IQ) [46].
- Speaking concretely signals listening: customers were more satisfied when staff used concrete language, partly because they inferred they had been listened to [47].
- Sales-call data (practitioner, correlational): top-converting calls had the seller talking about 43% of the time; talking more than ~65% went with lower win rates [48].
- Leader humility (admitting mistakes, spotlighting others' strengths, being teachable) is associated with follower growth; its benefits were reported as smaller for leaders who must still prove competence [49].

**Observable markers.**
- (a) Acoustic: none directly; response latency is covered in D10.
- (b) Transcript:
  - Question ratio: `questions` / Tom's turns. Open questions ("what", "how", "what would it take") vs. closed or leading ones ("don't you think...?").
  - Follow-up questions: a question that refers to the other person's previous turn ("You said the pilot stalled; what stalled it?"). This is the strongest single listening marker [45].
  - Paraphrase or summary of others ("So what I'm hearing is...", "If I've got this right...").
  - Concrete references to what was said (names, numbers, the other person's words).
- (c) Interaction:
  - `talk_share` (see context rules in section 4 for targets by setting).
  - Others' turn length after Tom's questions (longer = better question).
  - Interruptions by Tom of the person he just asked (strong negative).

**Examples.**
- Strong: "You mentioned the team's stretched. Which part of the work would you drop first?"
- Weak: "Right, yeah. Anyway, what I was going to say is..."

**Failure modes.** Questions that are statements in disguise; asking then answering for them; "listening" while waiting to talk (no reference to their content); in 1:1s, talk share above 60%.

**Drills.**
1. *Two follow-ups rule:* in each 1:1, ask at least two follow-up questions before giving a view. The coach counts them.
2. *Summarise before disagreeing:* before any counterpoint, restate the other person's view in one sentence and check it.

---

### D9. Airtime and turn-taking

**What it is.** Holding the floor when it matters, giving it away when it should be shared, and handling interruptions without fighting or folding.

**Why it matters.**
- Dominance and prestige both raise influence and attract attention, but only prestige is liked [11]. Interrupting and floor-hogging are dominance moves.
- Status beliefs about non-verbal cues are stronger than actual status differences, and effects vary widely [50] (useful humility for an automated coach).
- Both men and women interrupt women more than men [51]; interruption counts must be read in light of who is interrupted.
- Equality of turn-taking predicted group performance in Woolley's studies [46]; Pentland's sensor studies found communication patterns (energy, engagement spread evenly, exploration) strongly predicted team performance [52].

**Observable markers.**
- (a) Acoustic: loudness rise during overlaps (fighting for the floor) vs. holding steady and finishing the sentence.
- (b) Transcript: floor-holding phrases ("Let me finish this point", "Two more seconds"), and floor-giving ones ("Sam, you've been quiet; what's your view?").
- (c) Interaction:
  - `interruptions` by Tom (overlap starting > 0.3 s before the other ended) and interruptions **of** Tom. Separate supportive overlaps ("yes", "exactly", laughter) from competitive ones (new content); the current detector does not distinguish them, so only competitive overlaps longer than ~1 s with new words should count against Tom.
  - `talk_share` vs. fair share (1 / number of participants) adjusted for role (section 4).
  - `mean_turn_s` and `longest_turn_s`: monologue risk when turns exceed ~60-90 s in discussion settings (heuristic).
  - Who Tom invites in by name, and whether quieter people speak after he does.

**Examples.**
- Strong (being interrupted): steady volume, "Let me finish, then I want your view," completes the point in one sentence, hands over.
- Weak: raises volume and speeds up to out-talk, or stops mid-point and never returns to it.

**Failure modes.** Over-talking in groups because he knows the material; ceding the floor too easily in senior rooms; interrupting to agree (still an interruption).

**Drills.**
1. *Invite the quiet one:* in every group meeting, name one person who has not spoken and ask a specific question.
2. *Finish-the-sentence:* when interrupted, complete the current sentence at the same volume and pace, then yield. The coach checks loudness and rate during overlaps.

---

### D10. Composure and receptiveness under challenge

**What it is.** Staying steady (voice, pace, structure) when questioned or criticised, engaging with the opposing view, and answering directly.

**Why it matters.**
- Calibration: owning what you don't know protects credibility; confident errors hurt most [18].
- Conversational receptiveness (acknowledging the other view, stating claims as one's own view, hedging appropriately, emphasising agreement, reframing positively) made people better-rated teammates and advisors, reduced personal attacks in Wikipedia disputes, and made messages more persuasive. Receptiveness was visible to partners and an algorithm, not to the speakers themselves [53].
- Response timing: replies that come after 600 ms or 1,200 ms silences are heard as less willing and less in agreement than immediate ones [54]; German listeners showed a tolerance threshold around 600 ms [55]. Across ten languages, gaps between turns are short and differ by culture only within about 250 ms of the cross-language mean [56].
- Rising pitch early in an exchange is linked with lower emergent rank [8]; pitch and rate shifts upward are typical stress responses.
- Psychological safety research: teams where it is safe to take interpersonal risks learn more; leader coaching behaviour is an antecedent [57]. How Tom handles challenge sets that tone.

**Observable markers.**
- (a) Acoustic (compare the challenged turn with Tom's baseline for the same meeting):
  - `pitch_median_hz` rise > ~1-2 st, `speaking_rate_wpm` rise > ~15-20%, `pitch_sd_st` collapse, `loudness_db` jump: each a stress marker (heuristic thresholds).
  - `median_response_gap_s` after a challenge: a deliberate 1-2 s pause before a **considered** answer is fine and can read as thoughtful if followed by a structured reply; a long gap followed by fillers and restarts reads as being caught out. Context: for agreeing to a request, gaps beyond ~0.6 s sound reluctant [54][55].
- (b) Transcript:
  - Direct answer in the first sentence ("Yes", "No", "Not yet", "I don't know, and here's how I'll find out").
  - Receptiveness markers: "I see why you'd say that", "You're right about X", "Where I see it differently is...", "From my view...".
  - Defensive markers: "To be fair...", "As I already said...", "With respect...", "That's not what I said", blaming, re-explaining the same point louder.
  - Ownership: "That's on me" when appropriate.
- (c) Interaction: challenger's next turn is shorter and calmer (de-escalation) vs. longer and sharper; Tom interrupts the challenger (negative).

**Examples.**
- Strong: "Fair challenge. The number is lower than I'd like. You're right that we under-forecast churn; where I'd disagree is on cause. Here's what I'd do next."
- Weak: "Well, to be fair, as I said, it's not really, um, it's more that the data was, the data wasn't, it's complicated."

**Failure modes.** Over-explaining; counter-attacking; collapsing into agreement to end the discomfort; humour used to deflect (D12).

**Drills.**
1. *Acknowledge, answer, add:* practise "Acknowledge (one sentence), Answer (yes/no/number), Add (reason or next step)". Run with a friend firing tough questions; the coach scores the first sentence of each reply.
2. *Breath before answer:* take one breath before answering a challenge; the coach checks pitch and rate on that turn stay within baseline.

---

### D11. Meeting leadership: opening, steering, closing

**What it is.** When Tom runs a meeting: stating purpose and desired outcome at the start, keeping discussion on solutions, summarising, and closing with owners, dates and commitments.

**Why it matters.**
- In observed team meetings, solution-focused and action-planning talk was associated with team and organisational success, while complaining cycles were associated with worse outcomes (Kauffeld and Lehmann-Willenbrock; full results not reviewed here) [58].
- Communication patterns explain a large share of team performance in sensor studies [52].
- Practitioner consensus (Minto, BLUF) supports stating outcomes first [13].

**Observable markers.**
- (a) Acoustic: not specific.
- (b) Transcript:
  - Opening (first 2 minutes of Tom-led meetings): purpose ("The aim today is..."), desired output ("By the end I'd like a decision on..."), time box.
  - Mid-meeting: summaries ("So far we've agreed...", "Parking that for now"), redirection from problem talk to solution talk.
  - Closing (last 3 minutes): recap of decisions, named owners, dates ("Priya owns the draft by Thursday"), explicit commitment-seeking ("Can I confirm you're on board with...?"), next contact.
  - Ratio of solution/action statements to complaint statements (rough keyword proxy: "next step", "we'll", "by Friday" vs. "the problem is", "always", "never").
- (c) Interaction: others verbally accept actions ("Yes, I'll take that"); meeting ends on time (if timestamps allow).

**Examples.**
- Strong close: "Three decisions: we delay two weeks, Sam owns the test plan by Friday, I'll brief the partner tomorrow. Anything I've missed?"
- Weak close: "Cool, OK, well, let's catch up on this at some point."

**Failure modes.** No stated purpose; meeting ends with "let's take it offline"; actions without owners; Tom takes all the actions himself.

**Drills.**
1. *Open with the output:* begin each meeting Tom leads with "By the end of this I'd like X". The coach checks the first two minutes.
2. *Who-what-when close:* end with a spoken list of owner, action and date. The coach checks the last three minutes for names plus dates.

---

### D12. Humour and levity

**What it is.** Appropriate, well-timed humour that relieves tension and builds connection, including light self-deprecation.

**Why it matters.**
- Across eight experiments, successful humour raised status by signalling confidence and competence; inappropriate humour signalled confidence but low competence and lowered status; any joke attempt signals confidence [59].
- Self-deprecating humour by a leader raised ratings on individualised consideration compared with aggressive humour (one vignette experiment, 155 students) [60]. A later poster suggested the benefit was clearer for male leaders [60].
- Hewlett 2022: a "joking and bantering manner" is valued less than before [2].

**Observable markers.**
- (a) Acoustic: laughter events (`detect_laughter`, `attribute_laughter`): laughter **by others** right after Tom's turn (`after` = Tom) is the best automated proxy for a joke that landed. Laughter only by Tom after his own line, with no one else laughing, suggests a joke that did not land or nervous laughter.
- (b) Transcript: self-deprecating lines ("my spreadsheet skills are legendary, for the wrong reasons"); teasing aimed at others; humour in the first minutes (rapport) vs. during a challenge (possible deflection).
- (c) Interaction: shared laughter followed by continued engagement; silence or a topic change after a joke (failed).

**Examples.**
- Strong: after a mistake, "Well, that's the last time I do maths before coffee. Correct number is 11%."
- Weak: a joke at a junior colleague's expense, or a joke during someone's serious concern.

**Failure modes.** Humour as deflection under challenge; humour that punches down; constant banter in senior or cross-cultural rooms; self-deprecation about core competence ("I'm hopeless with numbers" from a strategy lead).

**Drills.**
1. *Self-deprecate the trivial only:* joke about small things (coffee, tech), never about the competence the room is relying on.
2. *Laughter review:* each week the coach lists moments when others laughed after Tom and moments when only Tom laughed; review what differed.

---

## 3. Scoring rubric

### 3.1 Anchors (1-5) per dimension

Scores describe Tom's behaviour **in this recording, relative to the context** (section 4). 3 = solid professional standard; 5 = what a strong senior leader would do; 1 = actively undermining presence.

| Dim | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| D1 Clarity | Point never stated, or others ask what he means | Point stated late, after long context | Point usually stated, sometimes late | Point in first sentence in most substantive turns | Consistently answer first, signposted, crisp summaries |
| D2 Conviction | Stacked hedges, permission-seeking, apologies on key points | Frequent diffuse hedges; recommendations sound optional | Clear positions with some softening | Committed recommendations with precise, single qualifiers | Committed and calibrated; owns uncertainty precisely; decisive at decision points |
| D3 Rhetoric | Abstract, jargon-heavy, no images or examples | Occasional example, flat framing | At least one story, contrast or list per main point | Several well-placed tactics; others reuse his phrasing | Natural, varied tactics that move the room; no overuse |
| D4 Collective/warmth | Self-focused, dismissive, or cold | Mostly "I"; little recognition of others | Balanced pronouns; some recognition | Frames shared goals; credits others by name | Warm and strong together; people volunteer and build on him |
| D5 Vocal authority | Pitch climbs sharply under pressure; rising endings on key statements | Frequent uptalk on recommendations; strained or forced low voice | Generally falling endings; mild pitch rise under pressure | Stable pitch near baseline, falling endings on decisions | Settled, stable voice in high-stakes moments; endings land |
| D6 Expressiveness | Monotone throughout | Flat in persuasive moments | Some variation, key words occasionally stressed | Clear emphasis on key words; varied loudness and pitch | Animated yet controlled; variation tracks meaning |
| D7 Pace/pausing | Rushed and filler-heavy, or halting | Fast with frequent fillers before key points | Normal pace, occasional fillers | Slows for key points, few fillers, pauses at boundaries | Deliberate pace, strategic silences, near-zero fillers on key claims |
| D8 Listening | Talks over others; no questions | Few questions, mostly leading/closed | Some open questions; occasional paraphrase | Follow-up questions and paraphrase; talk share fits context | Questions draw out new information; others speak longer and more openly |
| D9 Airtime | Dominates or vanishes; competitive interruptions | Over- or under-talks noticeably for role | Roughly appropriate airtime | Holds floor when needed, invites others in | Shapes turn-taking for the whole group; handles interruptions calmly |
| D10 Composure | Defensive, flustered, counter-attacks or folds | Visible stress; indirect answers | Answers directly, mild stress markers | Acknowledges, answers, adds; voice steady | Turns challenge into progress; receptive and firm; voice unchanged |
| D11 Meeting leadership | No purpose, no close | Vague purpose or vague close | Purpose and close present but loose | Clear outcome, summaries, owned actions | Crisp opening, steering, commitments confirmed with owners and dates |
| D12 Humour | Hostile or failed humour; deflection | Humour misjudged for the room | Little humour, or neutral | Light humour that others laugh at | Well-timed humour that defuses tension and builds connection |

### 3.2 How to weigh evidence

1. **Primary evidence is the transcript plus interaction structure.** Content (D1-D4, D8, D10, D11) is judged mostly from what was said, with quotes and timestamps.
2. **Acoustic evidence is secondary and relative.** Use acoustic measures as deltas from Tom's baseline (section 5), not absolute numbers. An acoustic signal alone can move a score by at most one point, and only when it agrees with a transcript or interaction signal or is large and sustained.
3. **Weight high-stakes moments more.** Recommendations, decisions, challenges, opening and closing count roughly double compared with routine chat.
4. **Every score cites evidence:** at least one timestamped quote or metric. No evidence, no score.
5. **One strength and one improvement per review**, chosen from the dimensions with the clearest evidence, not the lowest score. Tom prefers short updates.
6. **No single composite "presence score" by default.** If one is ever needed, weight content and composure (D1, D2, D10) above voice, consistent with Hewlett's finding that executives name gravitas, not delivery polish, as the core [1][2]; report it only as a trend.

### 3.3 Insufficient evidence

Mark a dimension **"IE: insufficient evidence"** rather than guessing when any of these hold:

- Tom spoke less than ~2 minutes in total, or fewer than ~5 substantive turns.
- The relevant situation did not occur (D10 with no challenge; D11 when Tom did not run the meeting; D12 with no humour).
- Acoustic dimensions (D5-D7): fewer than ~60 s of Tom's voiced speech, heavy overlap, poor microphone, background noise, or speaker labels in doubt.
- No baseline yet (fewer than ~5 recordings in comparable settings): report raw measures without a score for D5 and D6.
- Diarisation confidence low (wrong speaker attribution would invert interaction metrics).

Also attach a confidence label (high/medium/low) to each scored dimension, based on amount of evidence and audio quality.

---

## 4. Context rules

Expectations differ by setting. The coach must first classify the recording (it can ask Tom, or infer from participant count, who opened, and turn lengths).

### 4.1 By setting

| Setting | What good looks like | Talk-share guide (heuristic) | Dimensions to emphasise | Relax |
|---|---|---|---|---|
| **1:1 (Tom as manager or mentor)** | Mostly listening; follow-up questions; clear on decisions when needed | ~30-50% | D8, D4, D10 | D3, D6 (less rhetoric and animation needed) |
| **1:1 (Tom with senior / client / investor)** | Concise, answer-first, calibrated, curious about their priorities | ~40-55% | D1, D2, D8 | D11 |
| **Group discussion (Tom a participant)** | Fewer, higher-impact contributions; builds on others | ~1/N to 1.5/N of airtime (N = participants) | D1, D2, D9 | D11 |
| **Group meeting Tom chairs** | Opens and closes well; draws out others; summarises | ~25-40% (more if briefing) | D11, D9, D8 | D3 |
| **Presenting / pitching** | Structure, rhetoric, expressive voice, deliberate pace | Most of the time by design | D1, D3, D6, D7 | D8, D9 (until Q&A) |
| **Being challenged / Q&A** | Direct answers, receptiveness, steady voice | Short, structured turns | D10, D2, D5, D7 | D3 |

Sales-call research suggests the highest-converting sellers talked about 43% and outcomes worsened above ~65% [48]. This is a practitioner, correlational figure and is used only as a rough check for 1:1s where Tom is persuading.

### 4.2 By direction in the hierarchy

- **Speaking up (to boards, investors, senior clients):** Prioritise D1 (answer first, short), D2 (committed and calibrated), D10. Hewlett lists "ability to speak truth to power" among the communication traits [1]. Expect higher pitch and faster rate as stress responses; coach to keep them near baseline. Over-deference (apologies, permission tags) is the common failure.
- **Speaking down (to team, juniors, contractors):** Prioritise D8, D4, D9, D11. Dominance cues (interrupting, high talk share, sarcasm) cost liking and psychological safety [11][57]. Humility behaviours help [49]. The common failure is answering for people and talking too much.
- **Peers:** Prestige route: share expertise generously, credit others, disagree with receptiveness [11][53].

### 4.3 UK and cross-cultural notes

- British business English relies on **downgraders and understatement** ("not quite there yet" meaning "nowhere near done"). Direct cultures (for example, Dutch, German, many US settings) can read these as weak or miss the message entirely [61]. Coaching rule: with UK colleagues, moderate hedging is socially normal and should not be over-penalised; with international or direct-culture audiences, be more explicit on the bottom line.
- The hedge counter will over-flag British politeness forms ("I just wondered if...", "I'd perhaps suggest"). Weight hedges more heavily only in recommendation and decision turns.
- Banter and dry humour are common in UK workplaces, but executives now value "joking and bantering" less than in 2012 [2]. Tune humour to the room.
- **Accent:** RP speakers were rated as more suitable in a UK hiring study, though professionals could set the bias aside, and simply warning raters about accent bias reduced the gap [62]. The coach must **never** score or comment on accent.
- Turn-taking gap norms vary by culture only within a narrow band [56]; still, compare Tom's latency against the specific group in the recording rather than a universal number.

---

## 5. Limits and cautions

1. **Acoustics measure sound, not intent.** A pitch rise can mean stress, enthusiasm, a question, or a list. Laughter can be warmth or discomfort. Long response latency can be thoughtfulness or being stumped. Always pair an acoustic flag with the transcript moment before interpreting it.
2. **Most findings are correlational or lab-based.** CEO pitch and pay [6], pronouns and elections [25], talk ratios and sales [48] are associations. The Antonakis training studies [3] and pitch-manipulation experiments [7][8] are stronger, but use specific tasks and student or Swiss/US samples.
3. **Effects conflict.** Faster speech can raise perceived competence [39] and charisma [34] but lower perceived dominance [9]. High-power speakers can show higher pitch and lower pitch variability [28], while charismatic speakers show more pitch variation [33][35]. The rubric resolves this by context (persuading vs. asserting) and by preferring stability against baseline over absolute direction.
4. **Measurement error.** Pitch tracking makes octave errors (especially with creaky voice or noise); `prosody.py` uses a 60-400 Hz search range, which is reasonable for an adult male voice but not foolproof. Loudness depends on microphone distance and gain and is only comparable within a recording. Diarisation errors swap speakers. Transcription errors drop or invent fillers ("um" is often omitted by ASR, which will under-count fillers). Questions are detected by a trailing "?" from the transcriber, which misses many spoken questions. Interruptions are inferred from timestamp overlap and do not separate supportive back-channels from competitive interruptions.
5. **Pitch-range numbers are not comparable across studies.** Niebuhr's F0 ranges [33] use a different method from `pitch_range_st` (10th-90th percentile). Use published numbers to understand direction, not as targets.
6. **Gender and culture bias in the literature.** Much of the voice research uses US participants and male speakers (the CEO study is male-only [6]). Lower-pitch preferences disadvantage women [7]; women are interrupted more [51]; vocal fry and uptalk penalties fall harder on young women [29][31]; humble behaviours are reported as less rewarded for leaders who are young, female or non-white [49]. These are biases to be aware of, not ideals to train towards. Charisma perception is partly culture-specific [34].
7. **Do not over-read one recording.** One meeting is one sample. Mood, topic, illness, fatigue and room dynamics all shift voice and behaviour. The coach should not report a trend from fewer than ~5 comparable recordings, and should present single-meeting observations as "worth noticing", not as verdicts.
8. **Baseline first.** Build Tom's baseline per setting (1:1, group, presenting) from his first 5-10 recordings: medians and interquartile ranges for `pitch_median_hz`, `pitch_sd_st`, `pitch_range_st`, `loudness_sd_db`, `speaking_rate_wpm`, `pauses_per_min`, `fillers_per_100w`, `hedges_per_100w`, `uptalk_share`, `talk_share`, `median_response_gap_s`. Flag a measure only when it falls outside Tom's own interquartile range for that setting, and track rolling 4-week medians.
9. **Avoid Goodhart's law.** Coaching to a metric (zero fillers, maximum pitch range) produces unnatural delivery. Antonakis' team warns overuse of tactics reads as parody [5]. Coach one behaviour at a time and judge by the meeting outcome, not the metric.
10. **Appearance, accent and identity are out of scope.** Consistent with Hewlett's own move away from appearance and with repo rules on founder anonymity, the coach comments only on behaviour Tom can choose to change.
11. **Privacy.** Other participants are recorded too. The coach analyses them only as context for Tom's behaviour (for example, how they responded), and should not score other people.

---

## 6. Sources

Where a source was checked only through an abstract, press release or secondary summary, this is noted. No volume/page details were invented; where unknown they are omitted.

1. Hewlett, S. A. (2014). *Executive Presence: The Missing Link Between Merit and Success.* HarperBusiness. Based on Center for Talent Innovation research (67% of senior executives named gravitas as the core; communication and appearance follow; reported elsewhere as 67/28/5). Sample sizes reported variously as 268 senior executives and ~4,000 professionals; not reconciled. https://www.tatteredcover.com/products/9780062246899 ; summary: https://tandemcoach.co/sylvia-hewlett-executive-presence/
2. Hewlett, S. A. (2024). The New Rules of Executive Presence. *Harvard Business Review*, Jan-Feb 2024 (compares 2012 survey, n = 268, with 2022 survey, n = 73). Checked via summaries. https://www.beckershospitalreview.com/hospital-management-administration/the-new-tells-of-executive-presence/ ; https://cxoelevate.com/2024/02/03/harvard-business-review-on-the-important-of-executive-presence
3. Antonakis, J., Fenley, M., & Liechti, S. (2011). Can charisma be taught? Tests of two interventions. *Academy of Management Learning & Education*, 10(3). DOI 10.5465/amle.2010.0012. Checked via summaries.
4. Antonakis, J., Fenley, M., & Liechti, S. (2012). Learning charisma. *Harvard Business Review*, June 2012. https://store.hbr.org/product/learning-charisma/R1206K
5. British Psychological Society Research Digest. Charisma involves teachable behaviours (summary of [3]). https://www.bps.org.uk/research-digest/charisma-involves-teachable-behaviours
6. Mayew, W. J., Parsons, C. A., & Venkatachalam, M. (2013). Voice pitch and the labor market success of male chief executive officers. *Evolution and Human Behavior*, 34, 243-248. (Abstract erratum: "increase" should read "decrease".) https://people.duke.edu/~wmayew/Bio/MillionDollarVoice.pdf
7. Klofstad, C. A., Anderson, R. C., & Peters, S. (2012). Sounds like a winner: voice pitch influences perception of leadership capacity in both men and women. *Proceedings of the Royal Society B*, 279, 2698-2704. https://pmc.ncbi.nlm.nih.gov/articles/PMC3350713/
8. Cheng, J. T., Tracy, J. L., Ho, S., & Henrich, J. (2016). Listen, follow me: Dynamic vocal signals of dominance predict emergent social rank in humans. *Journal of Experimental Psychology: General*, 145(5), 536-547. https://henrich.fas.harvard.edu/publications/listen-follow-me-dynamic-vocal-signals-dominance-predict-emergent-social-rank
9. Tusing, K. J., & Dillard, J. P. (2000). The sounds of dominance: Vocal precursors of perceived dominance during interpersonal influence. *Human Communication Research*, 26(1), 148-171. Abstract only. https://pure.psu.edu/en/publications/the-sounds-of-dominance-vocal-precursors-of-perceived-dominance-d/
10. Schroeder, J., & Epley, N. (2015). The sound of intellect: Speech reveals a thoughtful mind, increasing a job candidate's appeal. *Psychological Science*. Checked via APS and Chicago Booth summaries. https://www.psychologicalscience.org/news/minds-business/the-sound-of-employability-interviewers-judge-your-voice.html (cited as [37] in text)
11. Cheng, J. T., Tracy, J. L., Foulsham, T., Kingstone, A., & Henrich, J. (2013). Two ways to the top: Evidence that dominance and prestige are distinct yet viable avenues to social rank and influence. *Journal of Personality and Social Psychology*, 104(1), 103-125. https://coevolution.fas.harvard.edu/publications/two-ways-top-evidence-dominance-and-prestige-are-distinct
12. Henrich, J. Prestige research overview (Harvard). https://henrich.fas.harvard.edu/research-topics-new/prestige
13. Minto, B. *The Pyramid Principle* and the BLUF convention; practitioner sources only. https://untools.co/minto-pyramid/ ; https://thinkinsights.net/consulting/bottomline-upfront-bluf
14. Erickson, B., Lind, E. A., Johnson, B. C., & O'Barr, W. M. (1978). Speech style and impression formation in a court setting: The effects of "powerful" and "powerless" speech. *Journal of Experimental Social Psychology*, 14, 266-279. Checked via later reviews. https://www.uky.edu/~ngrant/CJT780/readings/Day%206/HosmanHuebnerSiltanen2002.pdf
15. O'Barr, W. M., & Atkins, B. K. (1980). "Women's language" or "powerless language"? In McConnell-Ginet, Borker & Furman (Eds.), *Women and Language in Literature and Society*. Checked via secondary sources. https://faculty.georgetown.edu/bassr/githens/powrless.htm
16. Hosman, L. A., Huebner, T. M., & Siltanen, S. A. (2002). The impact of power-of-speech style, argument strength, and need for cognition on impression formation, cognitive responses, and persuasion. *Journal of Language and Social Psychology*, 21(4), 361-379; plus review of hedge effects in Durik et al. (2008). https://www.uky.edu/~ngrant/CJT780/readings/Day%206/DurikETAL2008.pdf ; Hosman & Siltanen on tag questions: https://aquila.usm.edu/fac_pubs/437
17. Price, P. C., & Stone, E. R. (2004). Intuitive evaluation of likelihood judgment producers: Evidence for a confidence heuristic. *Journal of Behavioral Decision Making*. DOI 10.1002/bdm.460. https://zendy.io/title/10.1002/bdm.460
18. Tenney, E. R., MacCoun, R. J., Spellman, B. A., & Hastie, R. (2007). Calibration trumps confidence as a basis for witness credibility. *Psychological Science*. https://pubmed.ncbi.nlm.nih.gov/17362377/ ; and Tenney, Spellman & MacCoun (2008), *Journal of Experimental Social Psychology*. https://escholarship.org/uc/item/92c2910g
19. Tur, B., Harstad, J., & Antonakis, J. (2022). Effect of charismatic signaling in social media settings: Evidence from TED and Twitter. *The Leadership Quarterly*, 33(5), 101476. Checked via seminar abstract only. https://agenda.unil.ch/display/1613481721068
20. Antonakis, J., Bastardoz, N., Jacquart, P., & Shamir, B. (2016). Charisma: An ill-defined and ill-measured gift. *Annual Review of Organizational Psychology and Organizational Behavior*, 3, 293-319. DOI 10.1146/annurev-orgpsych-041015-062305. https://serval.unil.ch/notice/serval:BIB_43EBA02BAD5E
21. Green, M. C., & Brock, T. C. (2000). The role of transportation in the persuasiveness of public narratives. *Journal of Personality and Social Psychology*, 79(5), 701-721. https://gwern.net/docs/www/pdfs.semanticscholar.org/39691cee32e52fbfc33f1a0316aa0d008cb699a4.pdf
22. Harnessing Large Language Models: Fine-tuned BERT for Detecting Charismatic Leadership Tactics in Natural Language (2024), arXiv:2409.18984. Authors not verified here. https://arxiv.org/pdf/2409.18984
23. Fiske, S. T., Cuddy, A. J. C., & Glick, P. (2007). Universal dimensions of social cognition: warmth and competence. *Trends in Cognitive Sciences*, 11(2), 77-83. https://collaborate.princeton.edu/en/publications/universal-dimensions-of-social-cognition-warmth-and-competence/
24. Cuddy, A. J. C., Kohut, M., & Neffinger, J. (2013). Connect, then lead. *Harvard Business Review*, July-Aug 2013. Checked via summaries. https://www.knpcommunications.com/post/harvard-business-review-cover-story-connect-then-lead
25. Steffens, N. K., & Haslam, S. A. (2013). Power through "us": Leaders' use of we-referencing language predicts election victory. *PLoS ONE*. https://pmc.ncbi.nlm.nih.gov/articles/PMC3806781
26. Kacewicz, E., Pennebaker, J. W., et al. (2014). Pronoun use reflects standings in social hierarchies. *Journal of Language and Social Psychology*. Journal details not verified; findings via secondary coverage. https://theamericanscholar.org/the-powerless-i/
27. Klofstad, C. A., & Anderson, R. C. (2018). Voice pitch predicts electability, but does not signal leadership ability. *Evolution and Human Behavior*, 39, 349-354. https://scholarship.miami.edu/esploro/outputs/journalArticle/Voice-pitch-predicts-electability-but-does/991031577993902976
28. Ko, S. J., Sadler, M. S., & Galinsky, A. D. (2015). The sound of power: Conveying and detecting hierarchical rank through voice. *Psychological Science*, 26(1), 3-14. Checked via APS press release. https://www.psychologicalscience.org/news/releases/the-sound-of-status-people-know-high-power-voices-when-they-hear-them.html
29. Anderson, R. C., Klofstad, C. A., Mayew, W. J., & Venkatachalam, M. (2014). Vocal fry may undermine the success of young women in the labor market. *PLoS ONE*, 9(5), e97506. https://pmc.ncbi.nlm.nih.gov/articles/PMC4037169
30. Liberman, M. Vocal fry probably doesn't harm your career prospects. Language Log (critique of [29]). https://languagelog.ldc.upenn.edu/nll/?p=12774
31. Levon, E., & Ye, Y. (2019). Language, indexicality and gender ideologies: contextual effects on the perceived credibility of women (uptalk in legal testimony). Results not reviewed here. https://qmul.ac.uk/sllf/media/sllf-new/department-of-linguistics/documents/41%29-Levon-%26-Yang-2019.pdf
32. Tomlinson, J. M., & Fox Tree, J. E. (2011). Listeners' comprehension of uptalk in spontaneous speech. *Cognition* (cited via later dissertation). https://deepblue.lib.umich.edu/bitstream/handle/2027.42/120634/ghbuck.pdf;sequence=1
33. Niebuhr, O., Brem, A., Michalsky, J., & Neitsch, J. (2020). What makes business speakers sound charismatic? A contrastive acoustic-melodic analysis of Steve Jobs and Mark Zuckerberg. *Cadernos de Linguística*, 1(1), 1-40. DOI 10.25189/2675-4916.2020.v1.n1.id272. Builds on Niebuhr, Brem, Novák-Tót & Voße (2016), Speech Prosody 2016. https://cadernos.abralin.org/index.php/cadernos/article/view/272
34. Rosenberg, A., & Hirschberg, J. (2009). Charisma perception from text and speech. *Speech Communication*. Primary not retrieved; findings from later reviews; see also their 2005 Interspeech paper. https://www.isca-archive.org/interspeech_2005/rosenberg05_interspeech.html ; review: https://pub.dega-akustik.de/DAGA_2017/data/articles/000256.pdf
35. Charismatic speech and breathing (chapter in *Manipulation, Influence and Deception*, Cambridge University Press), reporting perceived charisma correlates with F0 variability, range and maximum. Authors not verified here. https://resolve.cambridge.org/core/books/manipulation-influence-and-deception/charismatic-speech-breathing/F0A455792EBDBA1B4C50CD2373071CB5
36. Niebuhr, O., Tegtmeier, S., & Schweisfurth, T. (2019). Female speakers benefit more than male speakers from prosodic charisma training: A before-after analysis of 12-weeks and 4-h courses. *Frontiers in Communication*, 4. DOI 10.3389/fcomm.2019.00012. https://doaj.org/article/5ce6590b44b54c6e86b2d4437b9873d2
37. Schroeder, J., & Epley, N. (2015). See [10]. https://www.chicagobooth.edu/review/2015/june/when-job-hunting-pick-up-the-phone
38. Speaking-F0 descriptive statistics in semitones by family group (PMC table; male semitone SDs about 1.6-2.5). Study details not verified beyond the table. https://pmc.ncbi.nlm.nih.gov/articles/PMC2945274/table/T1
39. Smith, B. L., Brown, B. L., Strong, W. J., & Rencher, A. C. (1975). Effects of speech rate on personality perception. *Language and Speech*, 18(2). Abstract only. https://zendy.io/title/10.1177/002383097501800203
40. Benki, J., Broome, J., Conrad, F., Groves, R., & Kreuter, F. (2011). Effects of speech rate, pitch, and pausing on survey participation decisions. AAPOR 2011; later Conrad et al. (2013), Interviewer speech and the success of survey invitations, *JRSS A*, 176(1), 191-210. https://news.umich.edu/persuasive-speech-the-way-we-um-talk-sways-our-listeners ; https://ideas.repec.org/a/bla/jorssa/v176y2013i1p191-210.html
41. Yuan, J., Liberman, M., & Cieri, C. (2006). Towards an integrated understanding of speaking rate in conversation. Interspeech 2006. https://www.ldc.upenn.edu/sites/default/files/interspeech2006-towards-integrated-understanding.pdf
42. MacGregor, L. J., Corley, M., & Donaldson, D. I. (2010). Listening to the sound of silence: Disfluent silent pauses in speech have consequences for listeners. *Neuropsychologia*, 48(14), 3982-3992. https://research-portal.st-andrews.ac.uk/en/publications/listening-to-the-sound-of-silence-disfluent-silent-pauses-in-spee/
43. Brennan, S. E., & Williams, M. (1995). The feeling of another's knowing: Prosody and filled pauses as cues to listeners about the metacognitive states of speakers. *Journal of Memory and Language*, 34(3), 383-398. Checked via citing papers. https://pmc.ncbi.nlm.nih.gov/articles/PMC9014665
44. Kirkland, A., et al. (2022). Interspeech 2022 paper on filled pauses, speech rate and pitch in perceived speaker uncertainty (KTH). Exact title not verified. https://www.speech.kth.se/stance/papers/kirkland22_interspeech.pdf
45. Huang, K., Yeomans, M., Brooks, A. W., Minson, J., & Gino, F. (2017). It doesn't hurt to ask: Question-asking increases liking. *Journal of Personality and Social Psychology*, 113(3), 430-452. https://www.hks.harvard.edu/centers/cpl/publications/it-doesnt-hurt-ask-question-asking-increases-liking
46. Woolley, A. W., Chabris, C. F., Pentland, A., Hashmi, N., & Malone, T. W. (2010). Evidence for a collective intelligence factor in the performance of human groups. *Science*, 330, 686-688. Replication challenge: Bates & Gupta (2016). https://bibbase.org/network/publication/woolley-chabris-pentland-hashmi-malone-evidenceforacollectiveintelligencefactorintheperformanceofhumangroups ; https://www.Gwern.net/doc/iq/2016-bates.pdf
47. Packard, G., & Berger, J. (2021). How concrete language shapes customer satisfaction. *Journal of Consumer Research*. Checked via Wharton summary. https://knowledge.wharton.upenn.edu/article/how-language-boosts-customer-satisfaction/
48. Gong Labs. Mastering the talk-to-listen ratio in sales calls (practitioner data, correlational; dataset size reported inconsistently). https://www.gong.io/resources/labs/talk-to-listen-conversion-ratio/
49. Owens, B. P., & Hekman, D. R. (2012). Modeling how to grow: An inductive examination of humble leader behaviors, contingencies, and outcomes. *Academy of Management Journal*, 55(4), 787-818. https://www.buffalo.edu/news/releases/2011/12/13065.html
50. Hall, J. A., Coats, E. J., & Smith LeBeau, L. (2005). Nonverbal behavior and the vertical dimension of social relations: A meta-analysis. *Psychological Bulletin*, 131(6), 898-924. https://www.wisebrain.org/media/Papers/NonverbCommVerticalRels.pdf
51. Hancock, A. B., & Rubin, B. A. (2015; online 2014). Influence of communication partner's gender on language. *Journal of Language and Social Psychology*. DOI 10.1177/0261927X14533197. Checked via secondary coverage. https://www.goodtherapy.org/blog/study-finds-women-more-likely-to-be-interrupted-052614
52. Pentland, A. (2012). The new science of building great teams. *Harvard Business Review*, April 2012. https://capacity-building.com/favorite-articles/the-new-science-of-building-great-teams/
53. Yeomans, M., Minson, J., Collins, H., Chen, F., & Gino, F. (2020). Conversational receptiveness: Improving engagement with opposing views. *Organizational Behavior and Human Decision Processes*, 160, 131-148. https://www.hks.harvard.edu/publications/conversational-receptiveness-improving-engagement-opposing-views
54. Roberts, F., Francis, A. L., & Morgan, M. (2006). The interaction of inter-turn silence with prosodic cues in listener perceptions of "trouble" in conversation. *Speech Communication*, 48(9), 1079-1093. https://emcawiki.net/Roberts2006
55. Kohtz, L. S., & Niebuhr, O. (2017). How long is too long? How pause features after requests affect the perceived willingness of affirmative answers. Interspeech 2017. https://www.isca-archive.org/interspeech_2017/kohtz17_interspeech.html
56. Stivers, T., Enfield, N. J., Brown, P., et al. (2009). Universals and cultural variation in turn-taking in conversation. *PNAS*, 106(26), 10587-10592. (The often-quoted ~200 ms average gap was not verified here.) https://emcawiki.net/Stivers-etal2009
57. Edmondson, A. (1999). Psychological safety and learning behavior in work teams. *Administrative Science Quarterly*, 44(2), 350-383. https://web.mit.edu/curhan/www/docs/Articles/15341_Readings/Group_Performance/Edmondson%20Psychological%20safety.pdf
58. Kauffeld, S., & Lehmann-Willenbrock, N. (2012). Meetings matter: Effects of team meetings on team and organizational success. *Small Group Research*, 43, 130-158. DOI 10.1177/1046496411429599. Results not reviewed in full. https://socialsciencespace.com/2011/10/verbal-interaction-sequences-and-group-mood-exploring-the-role-of-team-planning-communication
59. Bitterly, T. B., Brooks, A. W., & Schweitzer, M. E. (2017). Risky business: When humor increases and decreases status. *Journal of Personality and Social Psychology*, 112(3), 431-455. https://faculty.wharton.upenn.edu/wp-content/uploads/2017/03/2016-54537-001.pdf
60. Hoption, C., Barling, J., & Turner, N. (2013). "It's not you, it's me": transformational leadership and self-deprecating humor. *Leadership & Organization Development Journal*, 34(1), 4-19. https://www.emerald.com/insight/content/doi/10.1108/01437731311289947/full/html ; 2017 follow-up poster: https://www.psychologicalscience.org/conventions/archive/2017annual/paper/3161/
61. Meyer, E. (2014). *The Culture Map*; and Giving negative feedback across cultures (INSEAD Knowledge / HBR 2014). https://erinmeyer.com/giving-negative-feedback-across-cultures/
62. Levon, E., Sharma, D., Watt, D. J. L., Cardoso, A., & Ye, Y. (2021). Accent bias and perceptions of professional competence in England. *Journal of English Linguistics*, 49(4), 355-388; and Accent Bias in Britain report (2020). https://accentbiasbritain.org/wp-content/uploads/2020/02/Accent-Bias-Report-2020.pdf

### Numbers that could not be fully verified

- Hewlett's 67/28/5 split: some sources call it importance weights, others shares of respondents; sample size reported as both 268 and ~4,000.
- Antonakis training uplift: HBR says ~60%; one secondary source says 65%. Primary effect sizes not checked.
- The "~200 ms" average turn gap often attributed to Stivers et al. (2009): not confirmed; only the ±250 ms cross-cultural band was confirmed.
- Niebuhr et al. (2020) investor-pitch pause durations are internally inconsistent in the paper's text (0.62 s vs. 0.46 s attribution); not used.
- All thresholds labelled "heuristic" in this document (pitch rise of 1-2 st, rate change of 15-20%, 25% drop in pitch variability, 60-90 s monologue limit, talk-share bands) are coaching conventions chosen for this tool, not published cut-offs. Replace them with Tom's own interquartile ranges once a baseline exists.
