// The literature layer — what makes VANTAGE a holistic executive curriculum rather
// than a comms tool. Named, canonical frameworks (in our own words, attributed to the
// source) mapped to the 12-module taxonomy of the book "The Same Conversation", plus
// the books that ground each module.
// Distilled from the master knowledge base (17 core training titles + wider canon).
//
// Each framework carries a `signal`: what "good" looks like in a real recorded
// conversation — this is the bridge between the teaching and the assessment engine.

export interface Framework {
  module: number;
  name: string;
  source: string;
  author: string;
  gist: string;
  steps: string[];
  /** what good looks like on the tape — consumed by the evaluation engine */
  signal: string;
}

export interface SourceBook {
  title: string;
  author: string;
}

export const FRAMEWORKS: Framework[] = [
  // ── M1 · Emotional regulation & the choice-point ───────────────────────────
  { module: 1, name: 'The choice-point', source: 'Crucial Conversations', author: 'Patterson, Grenny, McMillan, Switzler',
    gist: 'Between trigger and reaction is a gap. Notice you’re going to silence or violence, then choose your response on purpose.',
    steps: ['Spot the physical tell of being triggered.', 'Pause / breathe at the choice-point.', 'Respond to the goal, not the impulse.'],
    signal: 'Recovers quickly after a trigger; pauses rather than reacts.' },
  { module: 1, name: 'Master my stories', source: 'Crucial Conversations', author: 'Patterson, Grenny, McMillan, Switzler',
    gist: 'Emotion follows the story you tell about the facts. Separate fact from story to defuse the reaction.',
    steps: ['Name the bare facts.', 'Notice the story you added.', 'Ask "what else could be true?"'],
    signal: 'Reframes under pressure; avoids worst-case/villain framing aloud.' },
  { module: 1, name: 'Grounded breath under pressure', source: 'Gravitas', author: 'Caroline Goyder',
    gist: 'Confidence is steadier when the body is settled: breath controls voice tremor, pace, and the felt sense of calm.',
    steps: ['Exhale longer than you inhale before you speak.', 'Slow the first sentence deliberately.', 'Let pauses be silent, not "um".'],
    signal: 'Vocal steadiness and controlled pace when stakes rise.' },
  { module: 1, name: 'Grounded confidence', source: 'Dare to Lead', author: 'Brené Brown',
    gist: 'Real confidence is staying in the discomfort with curiosity (a "rumble"), not armouring up or shutting down.',
    steps: ['Name the discomfort to yourself.', 'Stay curious instead of defensive.', 'Lead from values, not ego.'],
    signal: 'Stays open/curious under challenge rather than defensive or rigid.' },

  // ── M2 · Active listening: depth & presence ────────────────────────────────
  { module: 2, name: 'Mirroring', source: 'Never Split the Difference', author: 'Chris Voss, Tahl Raz',
    gist: 'Repeat the last 1–3 significant words the other person said, then go quiet — a near-effortless prompt that makes them expand.',
    steps: ['Repeat their last few words as a question.', 'Stop talking and let the silence work.', 'Follow the thread they open.'],
    signal: 'Uses mirrors; lets silence sit; others elaborate unprompted.' },
  { module: 2, name: 'Calibrated questions', source: 'Never Split the Difference', author: 'Chris Voss, Tahl Raz',
    gist: 'Open "what" and "how" questions hand the other side a problem to solve and reveal what really matters.',
    steps: ['Replace "why/closed" with "what/how".', 'Ask how you should proceed.', 'Listen for the real constraint.'],
    signal: 'High ratio of open ("what/how") questions; few leading/closed ones.' },
  { module: 2, name: 'Presence-based listening', source: 'Say What You Mean', author: 'Oren Jay Sofer',
    gist: 'Lead with presence: come back to the body, listen for the need beneath the words, and reflect it before responding.',
    steps: ['Pause and arrive before replying.', 'Listen for the underlying need.', 'Reflect back what matters to them.'],
    signal: 'Reflect-backs present; doesn’t jump to solution; balanced talk-time.' },
  { module: 2, name: 'Be genuinely interested', source: 'How to Win Friends and Influence People', author: 'Dale Carnegie',
    gist: 'You make more connection in two months of being interested in others than two years of making them interested in you.',
    steps: ['Ask about them first.', 'Follow up on their answers.', 'Remember and reference the detail.'],
    signal: 'Curiosity markers; follow-up questions on their answers.' },

  // ── M3 · Tactical empathy & trust ──────────────────────────────────────────
  { module: 3, name: 'Tactical empathy: labels', source: 'Never Split the Difference', author: 'Chris Voss, Tahl Raz',
    gist: 'Name the other person’s emotion ("it sounds like…") to make them feel understood, drop their threat response, and reopen their thinking.',
    steps: ['Label the emotion or concern you hear.', 'Demonstrate the understanding in their terms.', 'Seek confirmation ("am I reading this right?").'],
    signal: 'Uses labels; demonstrates understanding before advocating; earns "that’s right".' },
  { module: 3, name: 'The accusation audit', source: 'Never Split the Difference', author: 'Chris Voss, Tahl Raz',
    gist: 'Name the concern the other person holds about you — first, out loud — to deflate it and drop their defensiveness before you make your case.',
    steps: ['List their likely concerns about you.', 'Name the key one first: "I know/imagine that…".', 'Then address it and proceed.'],
    signal: 'Pre-names the other side’s concern; reframes from defensive to empathic.' },
  { module: 3, name: 'The trust architecture', source: 'Leading Leaders', author: 'Jeswald W. Salacuse',
    gist: 'Trust has three layers — competence, integrity, and relational. Relational trust ("they understand and care about my interests") is the rarest and most leveraged.',
    steps: ['Demonstrate competence and reliability.', 'Keep commitments, especially inconvenient ones.', 'Invest in the relational layer over time.'],
    signal: 'Builds beyond competence; keeps small commitments; shows genuine care for their interests.' },
  { module: 3, name: 'BRAVING trust', source: 'Dare to Lead', author: 'Brené Brown',
    gist: 'Trust is built in small moments across boundaries, reliability, accountability, the vault, integrity, non-judgment, and generosity.',
    steps: ['Keep small commitments.', 'Own mistakes quickly.', 'Assume the most generous interpretation.'],
    signal: 'Keeps commitments in-conversation; non-judgmental; owns errors.' },

  // ── M4 · Executive presence ────────────────────────────────────────────────
  { module: 4, name: 'The executive-presence triad', source: 'Executive Presence', author: 'Sylvia Ann Hewlett',
    gist: 'Presence is read on three channels: gravitas (how you carry weight), communication (how you land), and appearance. Gravitas is ~two-thirds of the signal.',
    steps: ['Lead with gravitas: composure, decisiveness, and standing your ground under fire.', 'Make communication carry it: concise, clear, audible structure.', 'Remove appearance distractions so they don’t cost you signal.'],
    signal: 'Holds composure when challenged; speaks decisively; no nervous over-qualifying.' },
  { module: 4, name: 'Gravitas through breath & voice', source: 'Gravitas', author: 'Caroline Goyder',
    gist: 'Calm authority is physiological before it is psychological: grounded breath produces a steady, resonant voice and the pause that signals status.',
    steps: ['Breathe low and slow before high-stakes moments.', 'Land the ends of sentences instead of trailing up.', 'Use the deliberate pause rather than filling silence.'],
    signal: 'Steady pace, full stops land, comfortable with silence, minimal uptalk/fillers.' },
  { module: 4, name: 'The leadership narrative', source: 'Leading Leaders', author: 'Jeswald W. Salacuse',
    gist: 'Leaders frame decisions inside a coherent story — who we are, where we’re going, and why this choice fits — rather than presenting facts without a throughline.',
    steps: ['Anchor the message in purpose/direction.', 'Connect the specific ask to that larger story.', 'Make the listener a character in the plan.'],
    signal: 'Frames decisions in a purpose/throughline, not just data points.' },
  { module: 4, name: 'Make the other person feel important', source: 'How to Win Friends and Influence People', author: 'Dale Carnegie',
    gist: 'Credibility compounds through genuine regard: use people’s names, give honest appreciation, and make others feel they matter.',
    steps: ['Open with genuine, specific appreciation.', 'Use names and reference what they care about.', 'Let them have the credit.'],
    signal: 'Warmth markers present (names, specific credit) alongside authority.' },

  // ── M5 · Communication architecture: pyramid & BLUF ────────────────────────
  { module: 5, name: 'The Pyramid Principle', source: 'The Pyramid Principle', author: 'Barbara Minto',
    gist: 'Structure top-down: one governing thought, supported by a few mutually-exclusive grouped arguments, each supported by detail on demand.',
    steps: ['State the single governing thought first.', 'Group 2–4 reasons beneath it.', 'Hold detail in reserve; surface only if asked.'],
    signal: 'Answer-first; grouped, signposted structure; detail offered, not dumped.' },
  { module: 5, name: 'Bottom Line Up Front (BLUF)', source: 'Executive Presence', author: 'Sylvia Ann Hewlett',
    gist: 'Lead with the recommendation, decision, or ask in sentence one; senior listeners decide in seconds whether you’re worth following.',
    steps: ['Finish "if they remember one line…" then say that line first.', 'Then give the because.', 'Stop when the point has landed.'],
    signal: 'Low words-before-the-ask; not interrupted with "what’s the headline?".' },
  { module: 5, name: 'Signpost & the rule of three', source: 'Gravitas', author: 'Caroline Goyder',
    gist: 'Audible structure lets listeners relax: name how many points, then count them off.',
    steps: ['"There are three things…"', 'First / second / third.', 'Recap the headline.'],
    signal: 'Uses explicit signposting; ideas chunked, not run-on.' },
  { module: 5, name: 'Altitude control', source: 'Leading Leaders', author: 'Jeswald W. Salacuse',
    gist: 'Match the level of abstraction to the audience — 30,000 ft for execs, the mechanism for specialists. The wrong altitude reads as "doesn’t get it".',
    steps: ['Ask who decides and what they need first.', 'Pitch to that altitude.', 'Drop a level only on request.'],
    signal: 'Detail level matches the audience; no over-/under-shooting.' },

  // ── M6 · Crucial conversations (STATE) ─────────────────────────────────────
  { module: 6, name: 'STATE the path', source: 'Crucial Conversations', author: 'Patterson, Grenny, McMillan, Switzler',
    gist: 'Raise hard things by sharing facts first, telling your story tentatively, asking for theirs, and staying open to being wrong.',
    steps: ['Share the facts before the conclusion.', 'Tell your story tentatively ("I’m starting to wonder…").', 'Ask for their path; encourage testing.'],
    signal: 'Facts before judgment; tentative language; invites the other view.' },
  { module: 6, name: 'Make it safe / start with heart', source: 'Crucial Conversations', author: 'Patterson, Grenny, McMillan, Switzler',
    gist: 'People go to silence or violence when they feel unsafe. Restore safety with mutual purpose and respect before pushing content.',
    steps: ['Watch for safety breaking down.', 'Step out and rebuild mutual purpose.', 'Contrast to fix misunderstanding ("I don’t mean… I do mean…").'],
    signal: 'Notices/repairs safety; uses contrasting; keeps both in dialogue.' },

  // ── M7 · Feedback: radical candor & SBI ────────────────────────────────────
  { module: 7, name: 'Radical candor', source: 'Radical Candor', author: 'Kim Scott',
    gist: 'Care personally *and* challenge directly. Caring without challenging is ruinous empathy; challenging without caring is obnoxious aggression.',
    steps: ['Show you care about them, specifically.', 'Then say the hard thing plainly.', 'Make it about the work, soon and in private.'],
    signal: 'Direct and kind together; specific, behavioural feedback, not vague.' },
  { module: 7, name: 'Situation–Behaviour–Impact (SBI)', source: 'Radical Candor', author: 'Kim Scott / CCL',
    gist: 'Turn a judgment the receiver can’t change into a behaviour they can: one specific situation, one observable behaviour, one concrete impact.',
    steps: ['Name the specific situation (one moment).', 'Describe the observable behaviour, not your interpretation.', 'State the concrete impact it had.'],
    signal: 'Feedback is specific situation + observable behaviour + impact, not vague or character-based.' },
  { module: 7, name: 'The receiving framework', source: 'Radical Candor', author: 'Kim Scott',
    gist: 'Extract value from any feedback: listen fully, thank genuinely, ask for one specific example, and process before responding.',
    steps: ['Listen completely without rebutting.', 'Thank them; ask for one specific example.', 'Say "let me think and come back" before responding.'],
    signal: 'Receives without defending; clarifies with a specific-example question.' },
  { module: 7, name: 'Clear is kind', source: 'Dare to Lead', author: 'Brené Brown',
    gist: 'Being vague to be "nice" is unkind. Name the issue clearly and rumble with it honestly.',
    steps: ['Name the real issue, once.', 'Stay in it ("rumble") rather than avoiding.', 'Separate the person from the problem.'],
    signal: 'Names the issue plainly; doesn’t over-soften into ambiguity.' },

  // ── M8 · Negotiation: interests, BATNA & calibrated questions ──────────────
  { module: 8, name: 'Interests, not positions (BATNA/ZOPA)', source: 'Getting to Yes', author: 'Fisher & Ury',
    gist: 'Trade on underlying interests, know your best alternative (BATNA) and the zone of possible agreement (ZOPA) so you negotiate from strength.',
    steps: ['Surface both sides’ interests behind the stated positions.', 'Know your walk-away (BATNA).', 'Search the overlap (ZOPA) for joint gain.'],
    signal: 'Asks about interests; references alternatives; seeks mutual gain.' },
  { module: 8, name: 'Trade, don’t concede', source: 'Negotiation. The Art of Getting What You Want', author: 'Michael Schatzki',
    gist: 'Every concession should buy something back; unilateral giving trains the other side to keep taking.',
    steps: ['Anchor thoughtfully.', 'Make conditional moves ("if you…, then I…").', 'Get something for every give.'],
    signal: 'Concessions are conditional/traded, not given away; anchors set.' },
  { module: 8, name: 'No-oriented questions & the accusation audit', source: 'Never Split the Difference', author: 'Chris Voss, Tahl Raz',
    gist: 'Make it safe to say "no", and pre-empt their objections out loud ("you probably think this is too expensive…") to disarm them.',
    steps: ['Pre-name the likely objection.', 'Ask questions that let them say "no" safely.', 'Use calibrated "how" to make them solve it.'],
    signal: 'Surfaces objections proactively; stays calm; reframes via questions.' },
  { module: 8, name: 'Value protection & framing', source: 'Influence: The Psychology of Persuasion', author: 'Robert Cialdini',
    gist: 'Protect price by framing value, anchoring high, and using genuine scarcity/authority — never by caving under pressure.',
    steps: ['Tie price to quantified value/outcome.', 'Anchor before discounting.', 'Hold on genuine differentiators.'],
    signal: 'Defends value with outcome framing; doesn’t fold to first pushback.' },

  // ── M9 · Influence & consultative persuasion ───────────────────────────────
  { module: 9, name: 'The six principles of influence', source: 'Influence: The Psychology of Persuasion', author: 'Robert Cialdini',
    gist: 'Ethical persuasion leans on reciprocity, commitment/consistency, social proof, authority, liking, and scarcity.',
    steps: ['Give first (reciprocity).', 'Surface relevant proof and credible authority.', 'Secure small consistent commitments; note genuine scarcity.'],
    signal: 'Uses influence levers transparently and appropriately, not as manipulation.' },
  { module: 9, name: 'Talk in terms of their interests', source: 'How to Win Friends and Influence People', author: 'Dale Carnegie',
    gist: 'Arouse an eager want: frame your ask around what the other person values, not what you need.',
    steps: ['Name the audience’s goal/worry.', 'Map your proposal onto it (WIIFM).', 'Let them see it as their idea.'],
    signal: 'Frames around audience value/WIIFM rather than self-interest.' },
  { module: 9, name: 'Reading & leading the room', source: 'Gravitas', author: 'Caroline Goyder',
    gist: 'Calibrate to cues in real time — adjust pace, framing, and ask based on what the room is actually signalling.',
    steps: ['Watch for engagement/resistance cues.', 'Reframe rather than repeat when you lose them.', 'Adjust the ask to the temperature.'],
    signal: 'Responds to cues and reframes; doesn’t run one fixed script.' },
  { module: 9, name: 'Sell the gap (discovery)', source: 'Gap Selling', author: 'Keenan',
    gist: 'Diagnose the current state vs the desired future state; the gap between them is the value — solution comes last.',
    steps: ['Discover the current state and its cost.', 'Define the desired future state.', 'Quantify the gap before proposing.'],
    signal: 'Deep discovery before solutioning; ties solution to the gap/cost.' },
  { module: 9, name: 'SPIN discovery questions', source: 'SPIN Selling', author: 'Neil Rackham',
    gist: 'Situation → Problem → Implication → Need-payoff: layered questions that let the buyer articulate the problem and its value before you propose.',
    steps: ['Ask situation then problem questions.', 'Draw out the implication/cost.', 'Let them state the need-payoff before pitching.'],
    signal: 'Talk-time favours the other side; questions outnumber claims early; reaches need-payoff.' },
  { module: 9, name: 'Reduce the risk & close', source: 'Little Red Book of Selling', author: 'Jeffrey Gitomer',
    gist: 'The biggest barrier to a yes is perceived risk; remove it, frame value, and ask for the clear next step.',
    steps: ['Name the unspoken risk.', 'Offer proof, references, a low-risk first step.', 'Ask for a clear, agreed next step.'],
    signal: 'Surfaces and lowers risk; frames value in their terms; drives a next step.' },

  // ── M10 · Lateral leadership & coalition building ──────────────────────────
  { module: 10, name: 'The leadership negotiation', source: 'Leading Leaders', author: 'Jeswald W. Salacuse',
    gist: 'Lead peers as an ongoing negotiation of value: shared interests, relationship, legitimacy, communication, commitment, trust, reciprocity. Authority gets compliance; relationship gets commitment.',
    steps: ['Find the genuine shared interest.', 'Invest in the relationship before the ask.', 'Anchor cooperation in specific mutual commitments.'],
    signal: 'Discovers interests and invests in the relationship before asking; not authority-dependent.' },
  { module: 10, name: 'The coalition map', source: 'Leading Leaders', author: 'Jeswald W. Salacuse',
    gist: 'Map who must move (sponsor/ally/neutral/skeptic/blocker), each one’s interest, and the investment needed — then sequence the approach.',
    steps: ['Identify the key actors and their stance.', 'Identify each one’s interest in the change.', 'Sequence: sponsors & allies first, blockers last and directly.'],
    signal: 'Maps and sequences stakeholders; addresses concerns before going public.' },
  { module: 10, name: 'The upward influence conversation', source: 'Leading Leaders', author: 'Jeswald W. Salacuse',
    gist: 'Influence seniors by connecting to their stated priority, being brief, being direct about the ask, and offering a choice rather than a prescription.',
    steps: ['Open from one of their stated priorities.', 'Make the governing thought clear in ~90 seconds.', 'Be direct about the ask; offer the choice.'],
    signal: 'Connects to their priority; brief and direct; offers options, not a single prescription.' },
  { module: 10, name: 'Win the informal influencers', source: 'How to Win Friends and Influence People', author: 'Dale Carnegie',
    gist: 'The people others look to before forming opinions are often more important than the formal decision-maker — engage them genuinely and early.',
    steps: ['Identify who others look to.', 'Engage them as peers, with information first.', 'Let their visible support move the neutral middle.'],
    signal: 'Engages trusted informal influencers early and genuinely, not transactionally.' },

  // ── M11 · Needs, requests, boundaries & assertiveness ──────────────────────
  { module: 11, name: 'Clear requests, not demands', source: 'Say What You Mean', author: 'Oren Jay Sofer',
    gist: 'A real request is specific, present-tense, and doable — and leaves room for "no". Vague hints make others guess.',
    steps: ['Name the need behind the ask.', 'Make the request concrete and doable.', 'Be willing to hear no and negotiate.'],
    signal: 'Asks are specific and direct; not hinted or over-softened.' },
  { module: 11, name: 'Observation vs evaluation', source: 'Say What You Mean', author: 'Oren Jay Sofer',
    gist: 'Lead with what was observable ("the report was a day late"), not a character verdict ("you’re unreliable"), so the other can stay non-defensive.',
    steps: ['State the observable fact.', 'Name the impact/feeling.', 'Then the request.'],
    signal: 'Uses observations over labels; low blame language.' },
  { module: 11, name: 'Boundaries as clarity', source: 'Dare to Lead', author: 'Brené Brown',
    gist: 'Boundaries are "what’s okay and what’s not". Setting them plainly is more generous than resentment later.',
    steps: ['Decide your line in advance.', 'State it calmly and specifically.', 'Hold it without over-explaining.'],
    signal: 'States limits calmly and directly; holds them without apology spiral.' },
  { module: 11, name: 'Ask for what you want', source: 'Negotiation Mastery', author: 'Negotiation literature',
    gist: 'You rarely get more than you ask for; under-asking forfeits value before the conversation starts.',
    steps: ['Decide the specific ask and target.', 'State it plainly and early.', 'Stay quiet after asking.'],
    signal: 'Makes the explicit ask; doesn’t bury or pre-discount it.' },

  // ── M12 · Self-awareness, habit change & deliberate practice ───────────────
  { module: 12, name: 'One focus at a time', source: 'Peak (deliberate practice)', author: 'Anders Ericsson',
    gist: 'Improvement comes from working a single, specific skill at the edge of ability with feedback — not from doing everything at once.',
    steps: ['Pick one behaviour to change.', 'Practise it in real conversations.', 'Get feedback and re-measure.'],
    signal: 'Pursues one clear focus area and revisits it over time.' },
  { module: 12, name: 'The learn → apply → re-measure loop', source: 'Crucial Conversations', author: 'Patterson, Grenny, McMillan, Switzler',
    gist: 'Skills transfer only with active application: learn a move, use it in a real conversation, then check what happened.',
    steps: ['Learn the move.', 'Apply it in a live interaction.', 'Review the recording and adjust.'],
    signal: 'Evidence of applying a specific learned move and reflecting on it.' },
  { module: 12, name: 'The After-Action Review', source: 'Deliberate-practice research', author: 'Skill-acquisition literature',
    gist: 'A short structured debrief after a real conversation — intent, what happened, what to change — is the learning engine that turns experience into skill.',
    steps: ['State what you intended.', 'Note what actually happened.', 'Decide the one thing to do differently next time.'],
    signal: 'Shows in-the-moment self-awareness; names own patterns; sets a concrete next step.' },
  { module: 12, name: 'Keystone habits', source: 'The Power of Habit', author: 'Charles Duhigg',
    gist: 'Small, repeatable practices anchored to a cue-routine-reward loop compound into reputation and presence — change one keystone habit and others follow.',
    steps: ['Choose one keystone habit.', 'Attach it to an existing cue/routine.', 'Track it until automatic.'],
    signal: 'Repeats a deliberate small habit consistently across interactions.' },
];

// Canonical books that ground each module (cleaned from the knowledge base).
export const MODULE_SOURCES: Record<number, SourceBook[]> = {
  1: [{ title: 'Crucial Conversations', author: 'Patterson et al.' }, { title: 'Gravitas', author: 'Caroline Goyder' }, { title: 'Dare to Lead', author: 'Brené Brown' }, { title: 'Emotional Intelligence', author: 'Daniel Goleman' }, { title: 'Say What You Mean', author: 'Oren Jay Sofer' }],
  2: [{ title: 'Never Split the Difference', author: 'Chris Voss' }, { title: 'Say What You Mean', author: 'Oren Jay Sofer' }, { title: 'Co-Active Coaching', author: 'Kimsey-House et al.' }, { title: 'SPIN Selling', author: 'Neil Rackham' }, { title: 'How to Win Friends and Influence People', author: 'Dale Carnegie' }],
  3: [{ title: 'Never Split the Difference', author: 'Chris Voss' }, { title: 'Leading Leaders', author: 'Jeswald W. Salacuse' }, { title: 'Dare to Lead', author: 'Brené Brown' }, { title: 'How to Win Friends and Influence People', author: 'Dale Carnegie' }],
  4: [{ title: 'Executive Presence', author: 'Sylvia Ann Hewlett' }, { title: 'Gravitas', author: 'Caroline Goyder' }, { title: 'Leading Leaders', author: 'Jeswald W. Salacuse' }, { title: 'How to Win Friends and Influence People', author: 'Dale Carnegie' }, { title: 'Influence', author: 'Robert Cialdini' }],
  5: [{ title: 'The Pyramid Principle', author: 'Barbara Minto' }, { title: 'Executive Presence', author: 'Sylvia Ann Hewlett' }, { title: 'Gravitas', author: 'Caroline Goyder' }, { title: 'Leading Leaders', author: 'Jeswald W. Salacuse' }],
  6: [{ title: 'Crucial Conversations', author: 'Patterson et al.' }, { title: 'Difficult Conversations', author: 'Stone, Patton & Heen' }, { title: 'Say What You Mean', author: 'Oren Jay Sofer' }, { title: 'Dare to Lead', author: 'Brené Brown' }],
  7: [{ title: 'Radical Candor', author: 'Kim Scott' }, { title: 'Crucial Conversations', author: 'Patterson et al.' }, { title: 'Dare to Lead', author: 'Brené Brown' }, { title: 'How to Win Friends and Influence People', author: 'Dale Carnegie' }],
  8: [{ title: 'Never Split the Difference', author: 'Chris Voss' }, { title: 'Getting to Yes', author: 'Fisher & Ury' }, { title: 'Negotiation Mastery', author: 'Negotiation literature' }, { title: 'Influence', author: 'Robert Cialdini' }, { title: 'Leading Leaders', author: 'Jeswald W. Salacuse' }],
  9: [{ title: 'Influence', author: 'Robert Cialdini' }, { title: 'How to Win Friends and Influence People', author: 'Dale Carnegie' }, { title: 'Getting to Yes', author: 'Fisher & Ury' }, { title: 'Gap Selling', author: 'Keenan' }, { title: 'SPIN Selling', author: 'Neil Rackham' }, { title: 'Little Red Book of Selling', author: 'Jeffrey Gitomer' }],
  10: [{ title: 'Leading Leaders', author: 'Jeswald W. Salacuse' }, { title: 'How to Win Friends and Influence People', author: 'Dale Carnegie' }, { title: 'Dare to Lead', author: 'Brené Brown' }, { title: 'Influence', author: 'Robert Cialdini' }],
  11: [{ title: 'Say What You Mean', author: 'Oren Jay Sofer' }, { title: 'Nonviolent Communication', author: 'Marshall Rosenberg' }, { title: 'Dare to Lead', author: 'Brené Brown' }, { title: 'Crucial Conversations', author: 'Patterson et al.' }],
  12: [{ title: 'Peak', author: 'Anders Ericsson' }, { title: 'Crucial Conversations', author: 'Patterson et al.' }, { title: 'The Power of Habit', author: 'Charles Duhigg' }, { title: 'Influence', author: 'Robert Cialdini' }],
};

export const frameworksForModule = (n: number): Framework[] => FRAMEWORKS.filter((f) => f.module === n);
export const sourcesForModule = (n: number): SourceBook[] => MODULE_SOURCES[n] ?? [];

/** Distinct source titles across the whole curriculum — for marketing/holistic copy. */
export const ALL_SOURCE_TITLES: string[] = [...new Set(Object.values(MODULE_SOURCES).flat().map((s) => s.title))];

export interface Drill { title: string; body: string; }

// Bite-size "one rep at a time" drills tied to the module's frameworks — done in real
// conversations, not role-play. Each is designed to produce a signal the engine reads.
export const MODULE_DRILLS: Record<number, Drill[]> = {
  1: [
    { title: 'Catch the choice-point', body: 'Notice your physical tell of being triggered once this week; exhale long, then respond to the goal, not the impulse.' },
    { title: 'Fact vs story', body: 'After a charged moment, write the bare facts in one column and the story you added in another.' },
    { title: 'Box breathing', body: 'Before a pressure moment, exhale longer than you inhale for four breaths; start your first sentence deliberately slowly.' },
    { title: 'Stay curious', body: 'In a challenge, ask one genuine question before defending — replace armour with curiosity.' },
  ],
  2: [
    { title: 'Mirror & wait', body: 'Once a day, repeat the last two or three words someone said, then go quiet — and notice how they expand.' },
    { title: 'Open the questions', body: 'Swap your next three "why/closed" questions for "what" or "how" and notice what opens up.' },
    { title: 'Reflect before solving', body: 'Before offering a fix, reflect back what mattered to them in one sentence.' },
    { title: 'Talk-time check', body: 'In a 1:1, aim to talk less than half the time; count your follow-up questions.' },
  ],
  3: [
    { title: 'Label & confirm', body: 'In one conversation, name the other person’s emotion ("sounds like this is frustrating"), then ask "am I reading this right?"' },
    { title: 'The accusation audit', body: 'Before your most important meeting, write one "I know/imagine that [their concern]…" sentence and say it aloud first.' },
    { title: 'Relational trust investment', body: 'In one relationship that’s only competence-deep, return unprompted to something they mentioned before.' },
    { title: 'Understand before advocating', body: 'With a skeptical person, spend the first ten minutes only understanding their reality before making any case.' },
  ],
  4: [
    { title: 'Gravitas reps', body: 'In your next high-stakes meeting, land the end of every sentence and let one deliberate two-second pause sit before you answer a hard question.' },
    { title: 'The one-line story', body: 'Before a key update, write the single sentence that frames your decision inside the bigger goal — then open with it.' },
    { title: 'Genuine credit', body: 'In one meeting, use three colleagues’ names and give one piece of specific, genuine credit.' },
    { title: 'Lower and slower', body: 'Record a 60-second voice memo of your update; redo it slower and lower until it sounds like the person you’d follow.' },
  ],
  5: [
    { title: 'Headline-first', body: 'In three emails and one meeting, put the recommendation or ask in sentence one. Support only if asked.' },
    { title: 'Count it out', body: 'Deliver one complex point as "there are three things…" with audible signposting.' },
    { title: 'Two-altitude rewrite', body: 'Take one message and write it for an exec (30,000 ft) and for your team (the mechanism). Send the right one.' },
    { title: 'Time-to-point', body: 'Record an update and time how long until your main point lands. Cut it in half next time.' },
  ],
  6: [
    { title: 'Facts before verdict', body: 'Raise one hard thing by stating the observable facts first, then "I’m starting to wonder…", then ask for their view.' },
    { title: 'Tentative story', body: 'Offer your interpretation as a story, not a fact: "I’m starting to wonder if…" instead of "It’s obvious that…".' },
    { title: 'Make it safe', body: 'When someone goes quiet or defensive, pause the content and rebuild mutual purpose before continuing.' },
    { title: 'Repair fast', body: 'If you snap or get it wrong, repair cleanly and soon: name it, own it, no long justification.' },
  ],
  7: [
    { title: 'Care + challenge', body: 'Before difficult feedback, ask: "does this person know I want them to succeed?" Establish that, then say the hard thing plainly.' },
    { title: 'SBI it', body: 'Give one piece of feedback as Situation → Behaviour → Impact: one moment, one observable behaviour, one concrete impact.' },
    { title: 'Receive, don’t defend', body: 'Next time you get feedback, ask "can you give me one specific example?" and "let me think and come back" — before responding.' },
    { title: 'Clear is kind', body: 'Find a place you’ve been vague to be "nice" and say the real thing once, plainly.' },
  ],
  8: [
    { title: 'Know your BATNA', body: 'Before your next negotiation, write your walk-away and the other side’s likely interests behind their stated position.' },
    { title: 'Trade, don’t give', body: 'Make every concession conditional this week: "if you…, then I…". Get something for each give.' },
    { title: 'Accusation audit', body: 'Pre-name the objection out loud ("you probably think this is too expensive") before they raise it.' },
    { title: 'Defend on value', body: 'When pushed on price, restate the quantified outcome before discussing the number.' },
  ],
  9: [
    { title: 'WIIFM open', body: 'Before asking for something, write the other person’s goal or worry in one line and open your ask from there.' },
    { title: 'One ethical lever', body: 'Pick one influence principle (proof, authority, scarcity, reciprocity) and use it honestly in a real pitch.' },
    { title: 'Discover before pitching', body: 'In one persuasive conversation, spend the first third only on their situation and problem before proposing anything.' },
    { title: 'Ask for the next step', body: 'End one conversation by clearly proposing the specific next step.' },
  ],
  10: [
    { title: 'The coalition map', body: 'For your top initiative, name each key actor, their stance (sponsor→blocker), and their primary interest in the change.' },
    { title: 'Invest before asking', body: 'Have one conversation with someone whose cooperation you need that is entirely about what they care about — no agenda.' },
    { title: 'Win the informal influencer', body: 'Identify who others look to before forming opinions, and bring them into the conversation early and genuinely.' },
    { title: 'Ask up well', body: 'Before influencing a senior leader, connect your ask to one of their stated priorities and make the governing thought clear in 90 seconds.' },
  ],
  11: [
    { title: 'Make the ask', body: 'Identify one thing you’ve been hinting at and ask for it explicitly — then stay quiet.' },
    { title: 'Observation, not label', body: 'Reframe a complaint as "when X happened…" (observable) instead of "you always…" (verdict).' },
    { title: 'Hold one boundary', body: 'State one limit calmly and specifically this week, and hold it without over-explaining.' },
    { title: 'Drop the softeners', body: 'In one important request, cut "just / maybe / sort of" and say it directly and kindly.' },
  ],
  12: [
    { title: 'One focus', body: 'Pick a single behaviour from your last evaluation and practise only that in three real conversations this week.' },
    { title: 'Close the loop', body: 'Learn one move, use it in a live conversation, then re-record and compare.' },
    { title: 'After-Action Review', body: 'After a high-stakes conversation, take two minutes: what did I intend, what happened, what will I change next time?' },
    { title: 'Keystone habit', body: 'Attach one small presence habit (a pre-meeting breath) to an existing routine until it’s automatic.' },
  ],
};

export const drillsForModule = (n: number): Drill[] => MODULE_DRILLS[n] ?? [];
