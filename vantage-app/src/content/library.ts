// The literature layer — what makes VANTAGE a holistic executive curriculum rather
// than a comms tool. Named, canonical frameworks (in our own words, attributed to the
// source) mapped to the 12-module taxonomy of the book "The Same Conversation", plus
// the books that ground each module.
// Distilled from the master knowledge base (17 core training titles + wider canon).
//
// Each framework carries a `signal`: what "good" looks like in a real recorded
// conversation — this is the bridge between the teaching and the assessment engine.

import type { QuizQuestion } from '../types';

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

// End-of-module self-check quizzes — author-written, grounded in each module's
// frameworks and lessons. The Module page scores these and stores the result.
export const MODULE_QUIZZES: Record<number, QuizQuestion[]> = {
  1: [
    { q: 'The "choice-point" is:', options: [
      { text: 'The moment you decide to end a conversation.', why: 'It’s not about ending — it’s the gap before any response.' },
      { text: 'The gap between a stimulus and your response, where you can choose.', correct: true, why: 'Exactly — regulation lives in widening that gap.' },
      { text: 'The point in a meeting where a decision must be made.', why: 'It’s an internal gap, not a meeting milestone.' },
    ] },
    { q: 'You feel heat and the urge to snap. The most regulated first move is to:', options: [
      { text: 'Suppress the feeling and show nothing.', why: 'Suppression leaks out and reads as brittle — not regulation.' },
      { text: 'Treat the body signal as an early warning, exhale, then choose your response.', correct: true, why: 'Notice → down-regulate → choose. The body cue is your friend.' },
      { text: 'Explain immediately why you’re right.', why: 'That’s the reaction driving behaviour — what regulation prevents.' },
    ] },
    { q: '"Mastering your stories" means:', options: [
      { text: 'Telling better anecdotes.', why: 'It’s about your internal narrative, not storytelling craft.' },
      { text: 'Separating the bare facts from the story you added, then choosing the accurate one.', correct: true, why: 'Emotion follows the story; check the story against the facts.' },
      { text: 'Controlling the narrative others tell about you.', why: 'It’s about your own interpretations, not reputation management.' },
    ] },
    { q: 'The aim of emotional regulation is to:', options: [
      { text: 'Stop feeling strong emotions.', why: 'Feeling is fine — feeling driving you is the problem.' },
      { text: 'Feel the emotion and still choose your response.', correct: true, why: 'Settled and engaged, not numb.' },
      { text: 'Always appear calm and neutral.', why: 'Going flat reads as checked-out, not grounded.' },
    ] },
  ],
  2: [
    { q: 'Listening at "Level 1" means:', options: [
      { text: 'Listening to your own thoughts and rehearsing your reply.', correct: true, why: 'Level 1 is internal — most people live here and think they’re listening.' },
      { text: 'Listening for tone and what’s underneath the words.', why: 'That’s Level 3 (global) listening.' },
      { text: 'Listening at the lowest volume.', why: 'Levels describe attention, not volume.' },
    ] },
    { q: 'A "mirror" is:', options: [
      { text: 'Repeating the last two or three significant words, then going silent.', correct: true, why: 'A near-effortless prompt that makes people expand.' },
      { text: 'Copying the other person’s body language.', why: 'That’s physical mirroring — not the listening tool here.' },
      { text: 'Summarising everything they just said.', why: 'That’s a full paraphrase; a mirror is just the last few words.' },
    ] },
    { q: 'The strongest reply to "this plan is never going to work" is:', options: [
      { text: '"Yes it will, here’s why."', why: 'Advocacy meets resistance with resistance; you learn nothing.' },
      { text: '"What would have to be true for it to work?" — then listen.', correct: true, why: 'A calibrated question surfaces the real objection.' },
      { text: '"Why are you always so negative?"', why: '"Why" at the person triggers defence and ends the conversation.' },
    ] },
    { q: 'Right after asking a good question, you should:', options: [
      { text: 'Offer your own answer so it doesn’t feel awkward.', why: 'That answers your own question and wastes the opening.' },
      { text: 'Leave space — stop talking and let the answer come.', correct: true, why: 'A question is only as good as the silence you leave after it.' },
      { text: 'Quickly ask three more questions.', why: 'Stacking questions stops them answering any of them.' },
    ] },
  ],
  3: [
    { q: 'Tactical empathy is:', options: [
      { text: 'Agreeing with the other person to keep the peace.', why: 'That’s agreement, not understanding.' },
      { text: 'Understanding their reality precisely, then demonstrating that understanding.', correct: true, why: 'Understanding as a discipline — and the demonstration is the key.' },
      { text: 'Feeling the same emotion they feel.', why: 'That’s sympathy; empathy is understanding, not shared feeling.' },
    ] },
    { q: 'The "accusation audit" means:', options: [
      { text: 'Listing your own past failures to seem humble.', why: 'That centres you; the audit names their perception.' },
      { text: 'Naming the concern the other person holds about you — first, before they do.', correct: true, why: 'Naming it deflates it and drops their defensiveness.' },
      { text: 'Working out who accused whom.', why: 'It’s a pre-emptive acknowledgment, not a blame inquiry.' },
    ] },
    { q: 'The rarest and most leveraged form of trust is:', options: [
      { text: 'Competence trust ("they can do the job").', why: 'Necessary, but the most easily lost and not sufficient.' },
      { text: 'Integrity trust ("they do what they say").', why: 'Powerful, but relational trust is the multiplier.' },
      { text: 'Relational trust ("they understand and care about my interests").', correct: true, why: 'Rarest, most leveraged, and most accessible through tactical empathy.' },
    ] },
    { q: '"I know exactly how you feel" is an example of:', options: [
      { text: 'Empathy that builds trust.', why: 'It actually centres your experience, not theirs.' },
      { text: 'Sympathy that makes the moment about you, not them.', correct: true, why: 'Empathy reflects their reality ("it sounds like…") without claiming it.' },
      { text: 'The strongest opening for a hard conversation.', why: 'It tends to land as self-focused, not understanding.' },
    ] },
  ],
  4: [
    { q: 'Executive presence is best understood as:', options: [
      { text: 'An innate personality trait you’re born with.', why: 'That’s the myth the module dismantles.' },
      { text: 'A set of observable behaviours — composure, substance, narrative.', correct: true, why: 'Behaviours can be learned, measured, and improved.' },
      { text: 'The right voice and wardrobe.', why: 'Those are surface signals often mistaken for presence.' },
    ] },
    { q: 'The largest single component of gravitas is:', options: [
      { text: 'Knowing your material cold (substance).', correct: true, why: 'Depth under follow-up is the core of gravitas.' },
      { text: 'A deep, commanding voice.', why: 'A surface signal, not the substance of gravitas.' },
      { text: 'Confident body language.', why: 'Helpful, but substance is the largest component.' },
    ] },
    { q: 'The reliable way to be "six questions deep" is to:', options: [
      { text: 'Speak more confidently and avoid admitting uncertainty.', why: 'Bravado collapses under follow-up.' },
      { text: 'Anticipate the ladder of follow-up questions in preparation.', correct: true, why: 'Depth is earned in prep, not performed in the room.' },
      { text: 'Bring more slides.', why: 'Depth of knowledge beats volume of material.' },
    ] },
    { q: 'After a tough challenge, the composed move is to:', options: [
      { text: 'Answer instantly so you look sharp.', why: 'Speed reads as reactivity, not command.' },
      { text: 'Take one beat of silence, steady your tone, then respond.', correct: true, why: 'The pause signals control and confidence.' },
      { text: 'Go flat and give nothing away.', why: 'Flat reads as checked-out or brittle, not grounded.' },
    ] },
  ],
  5: [
    { q: 'Recommendation-first (BLUF) means:', options: [
      { text: 'Build the context, then reveal your conclusion at the end.', why: 'That’s bottom-up — the listener waits and tunes out.' },
      { text: 'State the answer or ask in the first sentence, then support it.', correct: true, why: 'Signals seniority and respects the listener’s time.' },
      { text: 'Keep your recommendation to yourself until asked.', why: 'Lead with it; offer detail on request.' },
    ] },
    { q: 'The pyramid principle structures a message as:', options: [
      { text: 'A chronological account of what you did.', why: 'Chronology buries the point.' },
      { text: 'One governing thought, a few grouped reasons, detail on demand.', correct: true, why: 'Top-down so the listener always knows where they are.' },
      { text: 'As much detail as possible, up front.', why: 'Detail crowds out the point; hold it in reserve.' },
    ] },
    { q: 'An exec interrupts with "what’s the headline?" This signals:', options: [
      { text: 'You should talk faster.', why: 'Faster bottom-up is still bottom-up.' },
      { text: 'You buried the lede — lead with the governing thought.', correct: true, why: 'The interrupt is a structure signal.' },
      { text: 'They don’t care about rigour.', why: 'They want it in the right order — answer first.' },
    ] },
    { q: '"Altitude" refers to:', options: [
      { text: 'How loudly you speak.', why: 'Altitude is about abstraction, not volume.' },
      { text: 'The level of detail/abstraction matched to the audience.', correct: true, why: '30,000 ft for execs, the mechanism for specialists.' },
      { text: 'How senior you are.', why: 'It’s about pitching the content, not your rank.' },
    ] },
  ],
  6: [
    { q: 'A hard conversation should open with:', options: [
      { text: 'The blunt verdict, to save time.', why: 'Blame triggers defence or attack in the first thirty seconds.' },
      { text: 'Shared purpose and intent, then the facts.', correct: true, why: 'Lead with safety, then describe the observable.' },
      { text: '"Everyone has noticed that…".', why: 'Unverifiable and ambush-like; safety collapses.' },
    ] },
    { q: 'In STATE, you tell your story:', options: [
      { text: 'As certain fact ("it’s obvious that…").', why: 'Certainty invites defence.' },
      { text: 'Tentatively ("I’m starting to wonder if…").', correct: true, why: 'Tentative language invites dialogue.' },
      { text: 'Only after they’ve admitted fault.', why: 'You share your story to open dialogue, not after a confession.' },
    ] },
    { q: '"Silence and violence" describe:', options: [
      { text: 'Two negotiation tactics.', why: 'No — they’re how people exit dialogue.' },
      { text: 'The two ways people leave dialogue when safety drops.', correct: true, why: 'Silence = withdrawing; violence = sarcasm/attack.' },
      { text: 'The beginning and end of a conflict.', why: 'They’re behaviours to watch for, not stages.' },
    ] },
    { q: 'When you cause a rupture (snap, dismiss), the best move is to:', options: [
      { text: 'Wait and hope it blows over.', why: 'Unrepaired ruptures fester.' },
      { text: 'Repair cleanly and soon — name it, own it, no long justification.', correct: true, why: 'Repair is a leadership behaviour.' },
      { text: 'Over-explain why you were right to react.', why: 'Justification isn’t repair.' },
    ] },
  ],
  7: [
    { q: '"Ruinous empathy" is:', options: [
      { text: 'High challenge, low care.', why: 'That’s obnoxious aggression.' },
      { text: 'High care, low challenge — too kind to say the hard thing.', correct: true, why: 'The most common failure mode; a form of abandonment.' },
      { text: 'Low care, low challenge.', why: 'That’s manipulative insincerity.' },
    ] },
    { q: 'SBI stands for:', options: [
      { text: 'Situation, Behaviour, Impact.', correct: true, why: 'One moment, one observable behaviour, one concrete impact.' },
      { text: 'Specific, Brief, Immediate.', why: 'Good qualities, but not the SBI model.' },
      { text: 'Start, Build, Improve.', why: 'Not the model.' },
    ] },
    { q: 'The "feedback sandwich" (praise–critique–praise) is:', options: [
      { text: 'The recommended structure.', why: 'It’s a consistently ineffective one.' },
      { text: 'Ineffective — people brace through the praise and wait for the "but".', correct: true, why: 'State the feedback directly; the care is in the delivery.' },
      { text: 'Only appropriate for senior people.', why: 'It’s ineffective regardless of level.' },
    ] },
    { q: 'Receiving vague feedback, the most useful response is:', options: [
      { text: '"Okay, thanks" — then ignore it.', why: 'Dismissal closes the relationship.' },
      { text: 'Defend your version of events.', why: 'Defending shuts learning down.' },
      { text: '"Can you give me one specific example of what you’d prefer to see?"', correct: true, why: 'Makes vague feedback specific enough to use.' },
    ] },
  ],
  8: [
    { q: 'Your BATNA is:', options: [
      { text: 'Your opening offer.', why: 'No — it’s your fallback, not your anchor.' },
      { text: 'Your best alternative if there’s no deal — your real source of power.', correct: true, why: 'A strong BATNA lets you stay calm and not flinch.' },
      { text: 'The other side’s bottom line.', why: 'That’s their reservation point, not your BATNA.' },
    ] },
    { q: '"Trade, don’t concede" means:', options: [
      { text: 'Never give anything away.', why: 'You trade — every give buys something.' },
      { text: 'Make every concession conditional ("if you…, then I…").', correct: true, why: 'Free concessions train the other side to push.' },
      { text: 'Split the difference quickly to close.', why: 'Splitting gives away value with no trade.' },
    ] },
    { q: 'The unlock in most negotiations is found:', options: [
      { text: 'By arguing your position harder.', why: 'Positional bargaining rarely unlocks anything.' },
      { text: 'One layer down, in the interests beneath the positions.', correct: true, why: 'Behind "Friday" might be "my board meets Monday".' },
      { text: 'By making the first and largest concession.', why: 'That just gives value away.' },
    ] },
    { q: 'The buyer says "your price is too high." The strongest response is:', options: [
      { text: 'Immediately offer a discount to save the deal.', why: 'Conceding for free trains them to push harder.' },
      { text: '"What’s driving the budget concern — and what would make the value worth it?"', correct: true, why: 'A calibrated question surfaces the interest behind the objection.' },
      { text: '"It’s actually very competitively priced."', why: 'Counter-arguing meets resistance with resistance.' },
    ] },
  ],
  9: [
    { q: 'Framing to the "interest, not the position" means:', options: [
      { text: 'Changing the facts for each audience.', why: 'That’s spin — the fact doesn’t change.' },
      { text: 'Keeping the truth but matching the frame to what they value.', correct: true, why: 'Translation, not spin.' },
      { text: 'Always leading with what excites you most.', why: 'Lead with their interest, not yours.' },
    ] },
    { q: '"Pre-wiring" a decision means:', options: [
      { text: 'Preparing your slides carefully.', why: 'It’s about people, not decks.' },
      { text: 'Aligning key stakeholders one-on-one before the group meeting.', correct: true, why: 'The meeting then ratifies a consensus instead of staging a fight.' },
      { text: 'Deciding the outcome in advance and announcing it.', why: 'It’s alignment, not a fait accompli.' },
    ] },
    { q: 'In SPIN, the "need-payoff" question:', options: [
      { text: 'Tells the buyer the price.', why: 'No — it draws out value, not cost.' },
      { text: 'Gets the buyer to articulate the value of solving the problem.', correct: true, why: 'They sell themselves on the value.' },
      { text: 'Asks for the order directly.', why: 'That’s the close, not need-payoff.' },
    ] },
    { q: 'A prospect mentions a problem in passing. The most consultative move is to:', options: [
      { text: 'Jump in with the matching feature.', why: 'Solutioning too early skips implication and need-payoff.' },
      { text: 'Ask what it costs them and what fixing it is worth, before proposing.', correct: true, why: 'Let the buyer build the value case.' },
      { text: 'Note it and continue your pitch.', why: 'A stated problem is the opening for discovery.' },
    ] },
  ],
  10: [
    { q: 'Lateral leadership works primarily through:', options: [
      { text: 'Authority and escalation.', why: 'Authority gets compliance, not commitment.' },
      { text: 'Negotiation — shared interests, reciprocity, relational trust.', correct: true, why: 'Relationship produces commitment.' },
      { text: 'Formal mandates.', why: 'Peers have no obligation to follow a mandate.' },
    ] },
    { q: 'On a coalition map, you approach actors in this order:', options: [
      { text: 'Blockers first, to neutralise them.', why: 'Address blockers last, after building momentum.' },
      { text: 'Sponsors and allies first; blockers last and directly.', correct: true, why: 'Use visible support as social proof to move the middle.' },
      { text: 'Whoever is most senior, first.', why: 'Seniority isn’t the sequencing principle.' },
    ] },
    { q: 'The "informal influencer" is:', options: [
      { text: 'Always the most senior person in the room.', why: 'Often not — they’re the most trusted, not the most senior.' },
      { text: 'The person others look to before forming opinions, regardless of title.', correct: true, why: 'Often more important to win than the formal decision-maker.' },
      { text: 'Someone with no real influence.', why: 'The opposite — they shape how peers think.' },
    ] },
    { q: 'A peer keeps deprioritising shared work. The best first move is:', options: [
      { text: 'Escalate to senior leadership.', why: 'Wins the formal battle, loses the war.' },
      { text: '"What would need to be different for this to move up your list?"', correct: true, why: 'Surfaces the real interest and opens a negotiated path.' },
      { text: 'Send a more detailed business case.', why: 'A better argument rarely moves a conversation they aren’t having.' },
    ] },
  ],
  11: [
    { q: 'The conversion that makes a need actionable is:', options: [
      { text: 'Feeling → complaint.', why: 'A complaint isn’t something the other person can act on.' },
      { text: 'Feeling → need → concrete request.', correct: true, why: 'Only the request is actionable.' },
      { text: 'Need → hint.', why: 'Hints make people guess.' },
    ] },
    { q: 'A genuine request (vs a demand):', options: [
      { text: 'Punishes a "no" with coldness or guilt.', why: 'That’s a demand wearing a question mark.' },
      { text: 'Leaves the other person genuinely free to decline.', correct: true, why: 'People feel the difference instantly.' },
      { text: 'Is always vague, to be polite.', why: 'Vague asks can’t be acted on or declined.' },
    ] },
    { q: 'A clean "no" is:', options: [
      { text: 'A paragraph of apology and justification.', why: 'Over-explaining signals you don’t feel entitled to it.' },
      { text: 'Brief, warm, firm — usually one sentence of reason.', correct: true, why: 'Warm and firm, without the apology spiral.' },
      { text: 'Silence and quiet resentment.', why: 'That’s avoidance, not a boundary.' },
    ] },
    { q: '"Could you maybe possibly look at the deck sometime?" fails because:', options: [
      { text: 'It’s too direct.', why: 'It’s the opposite — far too vague.' },
      { text: 'It has no clear who/what/when, so it can’t be acted on.', correct: true, why: 'A clear ask is specific and doable.' },
      { text: 'It allows the other person to say no.', why: 'Allowing "no" is good — vagueness is the problem.' },
    ] },
  ],
  12: [
    { q: 'The "transfer problem" is:', options: [
      { text: 'Moving between teams.', why: 'Not that — it’s about skills, not org charts.' },
      { text: 'The gap between learning a skill and it showing up in real behaviour.', correct: true, why: 'Closed only by practising in real situations with feedback.' },
      { text: 'Transferring data between tools.', why: 'Unrelated.' },
    ] },
    { q: 'A report flags six things to improve. The best response is to:', options: [
      { text: 'Work on all six this week to improve fastest.', why: 'Diffusing effort is how none of them stick.' },
      { text: 'Pick the single highest-leverage one and practise it for two weeks.', correct: true, why: 'One focus, made observable, then re-measured.' },
      { text: 'Feel discouraged and put it off.', why: 'The report is a map, not a verdict.' },
    ] },
    { q: 'A good practice focus is:', options: [
      { text: '"Listen better."', why: 'Too vague to practise or measure.' },
      { text: '"Ask one open question before giving my view."', correct: true, why: 'Observable and trigger-linked.' },
      { text: '"Be more strategic."', why: 'Not observable — you can’t practise it.' },
    ] },
    { q: 'The After-Action Review asks:', options: [
      { text: 'Who was at fault.', why: 'It’s about learning, not blame.' },
      { text: 'What did I intend, what happened, what will I change next time.', correct: true, why: 'The structured debrief that turns experience into skill.' },
      { text: 'How everyone else performed.', why: 'It’s a self-focused review.' },
    ] },
  ],
};

export const quizForModule = (n: number): QuizQuestion[] => MODULE_QUIZZES[n] ?? [];
