// The literature layer — what makes VANTAGE a holistic executive curriculum rather
// than a comms tool. Named, canonical frameworks (in our own words, attributed to the
// source) mapped to the 10-module taxonomy, plus the books that ground each module.
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
  // ── M1 · Executive presence & leadership narrative ──────────────────────────
  { module: 1, name: 'The executive-presence triad', source: 'Executive Presence', author: 'Sylvia Ann Hewlett',
    gist: 'Presence is read on three channels: gravitas (how you carry weight), communication (how you land), and appearance. Gravitas is ~two-thirds of the signal.',
    steps: ['Lead with gravitas: composure, decisiveness, and standing your ground under fire.', 'Make communication carry it: concise, clear, audible structure.', 'Remove appearance distractions so they don’t cost you signal.'],
    signal: 'Holds composure when challenged; speaks decisively; no nervous over-qualifying.' },
  { module: 1, name: 'Gravitas through breath & voice', source: 'Gravitas', author: 'Caroline Goyder',
    gist: 'Calm authority is physiological before it is psychological: grounded breath produces a steady, resonant voice and the pause that signals status.',
    steps: ['Breathe low and slow before high-stakes moments.', 'Land the ends of sentences instead of trailing up.', 'Use the deliberate pause rather than filling silence.'],
    signal: 'Steady pace, full stops land, comfortable with silence, minimal uptalk/fillers.' },
  { module: 1, name: 'The leadership narrative', source: 'Leading Leaders', author: 'Jeswald W. Salacuse',
    gist: 'Leaders frame decisions inside a coherent story — who we are, where we’re going, and why this choice fits — rather than presenting facts without a throughline.',
    steps: ['Anchor the message in purpose/direction.', 'Connect the specific ask to that larger story.', 'Make the listener a character in the plan.'],
    signal: 'Frames decisions in a purpose/throughline, not just data points.' },
  { module: 1, name: 'Make the other person feel important', source: 'How to Win Friends and Influence People', author: 'Dale Carnegie',
    gist: 'Credibility compounds through genuine regard: use people’s names, give honest appreciation, and make others feel they matter.',
    steps: ['Open with genuine, specific appreciation.', 'Use names and reference what they care about.', 'Let them have the credit.'],
    signal: 'Warmth markers present (names, specific credit) alongside authority.' },

  // ── M2 · Strategic & concise communication ─────────────────────────────────
  { module: 2, name: 'The Pyramid Principle', source: 'The Pyramid Principle', author: 'Barbara Minto',
    gist: 'Structure top-down: one governing thought, supported by a few mutually-exclusive grouped arguments, each supported by detail on demand.',
    steps: ['State the single governing thought first.', 'Group 2–4 reasons beneath it.', 'Hold detail in reserve; surface only if asked.'],
    signal: 'Answer-first; grouped, signposted structure; detail offered, not dumped.' },
  { module: 2, name: 'Bottom Line Up Front (BLUF)', source: 'Executive Presence', author: 'Sylvia Ann Hewlett',
    gist: 'Lead with the recommendation, decision, or ask in sentence one; senior listeners decide in seconds whether you’re worth following.',
    steps: ['Finish "if they remember one line…" then say that line first.', 'Then give the because.', 'Stop when the point has landed.'],
    signal: 'Low words-before-the-ask; not interrupted with "what’s the headline?".' },
  { module: 2, name: 'Signpost & the rule of three', source: 'Gravitas', author: 'Caroline Goyder',
    gist: 'Audible structure lets listeners relax: name how many points, then count them off.',
    steps: ['"There are three things…"', 'First / second / third.', 'Recap the headline.'],
    signal: 'Uses explicit signposting; ideas chunked, not run-on.' },
  { module: 2, name: 'Altitude control', source: 'Leading Leaders', author: 'Jeswald W. Salacuse',
    gist: 'Match the level of abstraction to the audience — 30,000 ft for execs, the mechanism for specialists. The wrong altitude reads as "doesn’t get it".',
    steps: ['Ask who decides and what they need first.', 'Pitch to that altitude.', 'Drop a level only on request.'],
    signal: 'Detail level matches the audience; no over-/under-shooting.' },

  // ── M3 · Influence, calibration & stakeholder management ───────────────────
  { module: 3, name: 'The six principles of influence', source: 'Influence: The Psychology of Persuasion', author: 'Robert Cialdini',
    gist: 'Ethical persuasion leans on reciprocity, commitment/consistency, social proof, authority, liking, and scarcity.',
    steps: ['Give first (reciprocity).', 'Surface relevant proof and credible authority.', 'Secure small consistent commitments; note genuine scarcity.'],
    signal: 'Uses influence levers transparently and appropriately, not as manipulation.' },
  { module: 3, name: 'Talk in terms of their interests', source: 'How to Win Friends and Influence People', author: 'Dale Carnegie',
    gist: 'Arouse an eager want: frame your ask around what the other person values, not what you need.',
    steps: ['Name the audience’s goal/worry.', 'Map your proposal onto it (WIIFM).', 'Let them see it as their idea.'],
    signal: 'Frames around audience value/WIIFM rather than self-interest.' },
  { module: 3, name: 'Reading & leading the room', source: 'Gravitas', author: 'Caroline Goyder',
    gist: 'Calibrate to cues in real time — adjust pace, framing, and ask based on what the room is actually signalling.',
    steps: ['Watch for engagement/resistance cues.', 'Reframe rather than repeat when you lose them.', 'Adjust the ask to the temperature.'],
    signal: 'Responds to cues and reframes; doesn’t run one fixed script.' },
  { module: 3, name: 'Leading experts & stakeholders', source: 'Leading Leaders', author: 'Jeswald W. Salacuse',
    gist: 'High-status stakeholders are led by interest and respect, not authority — find the overlap and broker it.',
    steps: ['Map each stakeholder’s interest.', 'Find the common ground.', 'Position the decision as serving their goals.'],
    signal: 'Acknowledges multiple stakeholders’ interests; brokers overlap.' },

  // ── M4 · Mindful presence, confidence & emotional regulation ───────────────
  { module: 4, name: 'The choice-point', source: 'Crucial Conversations', author: 'Patterson, Grenny, McMillan, Switzler',
    gist: 'Between trigger and reaction is a gap. Notice you’re going to silence or violence, then choose your response on purpose.',
    steps: ['Spot the physical tell of being triggered.', 'Pause / breathe at the choice-point.', 'Respond to the goal, not the impulse.'],
    signal: 'Recovers quickly after a trigger; pauses rather than reacts.' },
  { module: 4, name: 'Master my stories', source: 'Crucial Conversations', author: 'Patterson, Grenny, McMillan, Switzler',
    gist: 'Emotion follows the story you tell about the facts. Separate fact from story to defuse the reaction.',
    steps: ['Name the bare facts.', 'Notice the story you added.', 'Ask "what else could be true?"'],
    signal: 'Reframes under pressure; avoids worst-case/villain framing aloud.' },
  { module: 4, name: 'Grounded breath under pressure', source: 'Gravitas', author: 'Caroline Goyder',
    gist: 'Confidence is steadier when the body is settled: breath controls voice tremor, pace, and the felt sense of calm.',
    steps: ['Exhale longer than you inhale before you speak.', 'Slow the first sentence deliberately.', 'Let pauses be silent, not "um".'],
    signal: 'Vocal steadiness and controlled pace when stakes rise.' },
  { module: 4, name: 'Grounded confidence', source: 'Dare to Lead', author: 'Brené Brown',
    gist: 'Real confidence is staying in the discomfort with curiosity (a "rumble"), not armouring up or shutting down.',
    steps: ['Name the discomfort to yourself.', 'Stay curious instead of defensive.', 'Lead from values, not ego.'],
    signal: 'Stays open/curious under challenge rather than defensive or rigid.' },

  // ── M5 · Empathy, listening & trust building ───────────────────────────────
  { module: 5, name: 'Tactical empathy: labels & mirrors', source: 'Never Split the Difference', author: 'Chris Voss, Tahl Raz',
    gist: 'Name the other person’s emotion ("it sounds like…") and mirror their last few words to make them feel understood and keep them talking.',
    steps: ['Label the emotion you hear.', 'Mirror the last 1–3 words.', 'Go quiet and let them expand.'],
    signal: 'Uses labels/mirrors; earns "that’s right"; lets others finish.' },
  { module: 5, name: 'Calibrated questions', source: 'Never Split the Difference', author: 'Chris Voss, Tahl Raz',
    gist: 'Open "what" and "how" questions hand the other side a problem to solve and reveal what really matters.',
    steps: ['Replace "why/closed" with "what/how".', 'Ask how you should proceed.', 'Listen for the real constraint.'],
    signal: 'High ratio of open ("what/how") questions; few leading/closed ones.' },
  { module: 5, name: 'Presence-based listening', source: 'Say What You Mean', author: 'Oren Jay Sofer',
    gist: 'Lead with presence: come back to the body, listen for the need beneath the words, and reflect it before responding.',
    steps: ['Pause and arrive before replying.', 'Listen for the underlying need.', 'Reflect back what matters to them.'],
    signal: 'Reflect-backs present; doesn’t jump to solution; balanced talk-time.' },
  { module: 5, name: 'Be genuinely interested', source: 'How to Win Friends and Influence People', author: 'Dale Carnegie',
    gist: 'You make more connection in two months of being interested in others than two years of making them interested in you.',
    steps: ['Ask about them first.', 'Follow up on their answers.', 'Remember and reference the detail.'],
    signal: 'Curiosity markers; follow-up questions on their answers.' },
  { module: 5, name: 'BRAVING trust', source: 'Dare to Lead', author: 'Brené Brown',
    gist: 'Trust is built in small moments across boundaries, reliability, accountability, the vault, integrity, non-judgment, and generosity.',
    steps: ['Keep small commitments.', 'Own mistakes quickly.', 'Assume the most generous interpretation.'],
    signal: 'Keeps commitments in-conversation; non-judgmental; owns errors.' },

  // ── M6 · Difficult conversations, feedback & conflict repair ───────────────
  { module: 6, name: 'STATE the path', source: 'Crucial Conversations', author: 'Patterson, Grenny, McMillan, Switzler',
    gist: 'Raise hard things by sharing facts first, telling your story tentatively, asking for theirs, and staying open to being wrong.',
    steps: ['Share the facts before the conclusion.', 'Tell your story tentatively ("I’m starting to wonder…").', 'Ask for their path; encourage testing.'],
    signal: 'Facts before judgment; tentative language; invites the other view.' },
  { module: 6, name: 'Make it safe / start with heart', source: 'Crucial Conversations', author: 'Patterson, Grenny, McMillan, Switzler',
    gist: 'People go to silence or violence when they feel unsafe. Restore safety with mutual purpose and respect before pushing content.',
    steps: ['Watch for safety breaking down.', 'Step out and rebuild mutual purpose.', 'Contrast to fix misunderstanding ("I don’t mean… I do mean…").'],
    signal: 'Notices/repairs safety; uses contrasting; keeps both in dialogue.' },
  { module: 6, name: 'Radical candor', source: 'Radical Candor', author: 'Kim Scott',
    gist: 'Care personally *and* challenge directly. Caring without challenging is ruinous empathy; challenging without caring is obnoxious aggression.',
    steps: ['Show you care about them, specifically.', 'Then say the hard thing plainly.', 'Make it about the work, soon and in private.'],
    signal: 'Direct and kind together; specific, behavioural feedback, not vague.' },
  { module: 6, name: 'Clear is kind', source: 'Dare to Lead', author: 'Brené Brown',
    gist: 'Being vague to be "nice" is unkind. Name the issue clearly and rumble with it honestly.',
    steps: ['Name the real issue, once.', 'Stay in it ("rumble") rather than avoiding.', 'Separate the person from the problem.'],
    signal: 'Names the issue plainly; doesn’t over-soften into ambiguity.' },

  // ── M7 · Needs, requests, boundaries & assertiveness ───────────────────────
  { module: 7, name: 'Clear requests, not demands', source: 'Say What You Mean', author: 'Oren Jay Sofer',
    gist: 'A real request is specific, present-tense, and doable — and leaves room for "no". Vague hints make others guess.',
    steps: ['Name the need behind the ask.', 'Make the request concrete and doable.', 'Be willing to hear no and negotiate.'],
    signal: 'Asks are specific and direct; not hinted or over-softened.' },
  { module: 7, name: 'Observation vs evaluation', source: 'Say What You Mean', author: 'Oren Jay Sofer',
    gist: 'Lead with what was observable ("the report was a day late"), not a character verdict ("you’re unreliable"), so the other can stay non-defensive.',
    steps: ['State the observable fact.', 'Name the impact/feeling.', 'Then the request.'],
    signal: 'Uses observations over labels; low blame language.' },
  { module: 7, name: 'Boundaries as clarity', source: 'Dare to Lead', author: 'Brené Brown',
    gist: 'Boundaries are "what’s okay and what’s not". Setting them plainly is more generous than resentment later.',
    steps: ['Decide your line in advance.', 'State it calmly and specifically.', 'Hold it without over-explaining.'],
    signal: 'States limits calmly and directly; holds them without apology spiral.' },
  { module: 7, name: 'Ask for what you want', source: 'Negotiation Mastery', author: 'Negotiation literature',
    gist: 'You rarely get more than you ask for; under-asking forfeits value before the conversation starts.',
    steps: ['Decide the specific ask and target.', 'State it plainly and early.', 'Stay quiet after asking.'],
    signal: 'Makes the explicit ask; doesn’t bury or pre-discount it.' },

  // ── M8 · Negotiation, objection handling & value protection ────────────────
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

  // ── M9 · Sales & consultative conversation ─────────────────────────────────
  { module: 9, name: 'Sell the gap', source: 'Gap Selling', author: 'Keenan',
    gist: 'Diagnose the customer’s current state vs desired future state; the gap between them is the value — solution comes last.',
    steps: ['Discover the current state and its cost.', 'Define the desired future state.', 'Quantify the gap before proposing.'],
    signal: 'Deep discovery before solutioning; ties solution to the gap/cost.' },
  { module: 9, name: 'Problem-first discovery', source: 'Powerful Selling', author: 'Andy Schmitz',
    gist: 'Needs-satisfaction selling: ask layered questions that surface the real problem and its impact before talking product.',
    steps: ['Ask situation then problem questions.', 'Draw out the impact/implication.', 'Confirm the need before pitching.'],
    signal: 'Talk-time favours the customer; questions outnumber claims early.' },
  { module: 9, name: 'People buy for their reasons', source: 'Secrets of Closing the Sale', author: 'Zig Ziglar',
    gist: 'Closing is a service when the fit is real: surface the buyer’s own reasons and help them act on them.',
    steps: ['Find their reason to buy, not yours to sell.', 'Address the real risk/objection.', 'Ask for the decision clearly.'],
    signal: 'Connects to buyer’s stated reasons; asks for a clear next step.' },
  { module: 9, name: 'Reduce the risk', source: 'Little Red Book of Selling', author: 'Jeffrey Gitomer',
    gist: 'The biggest barrier to a sale is perceived risk; remove it and selling becomes buying.',
    steps: ['Name the unspoken risk.', 'Offer proof, guarantees, references.', 'Make the first step low-risk.'],
    signal: 'Surfaces and lowers buyer risk; uses proof, not pressure.' },

  // ── M10 · Self-awareness, habit change & deliberate practice ───────────────
  { module: 10, name: 'One focus at a time', source: 'Deliberate-practice research', author: 'Skill-acquisition literature',
    gist: 'Improvement comes from working a single, specific skill at the edge of ability with feedback — not from doing everything at once.',
    steps: ['Pick one behaviour to change.', 'Practise it in real conversations.', 'Get feedback and re-measure.'],
    signal: 'Pursues one clear focus area and revisits it over time.' },
  { module: 10, name: 'The learn → apply → re-measure loop', source: 'Crucial Conversations', author: 'Patterson, Grenny, McMillan, Switzler',
    gist: 'Skills transfer only with active application: learn a move, use it in a real conversation, then check what happened.',
    steps: ['Learn the move.', 'Apply it in a live interaction.', 'Review the recording and adjust.'],
    signal: 'Evidence of applying a specific learned move and reflecting on it.' },
  { module: 10, name: 'Master my stories (self-awareness)', source: 'Crucial Conversations', author: 'Patterson, Grenny, McMillan, Switzler',
    gist: 'Self-awareness starts by catching your own reactions and the stories driving them, in the moment.',
    steps: ['Notice your tell.', 'Separate fact from your story.', 'Choose the response that serves the goal.'],
    signal: 'Shows in-the-moment self-awareness; names own patterns.' },
  { module: 10, name: 'Keystone habits', source: 'The Power of Habit', author: 'Charles Duhigg',
    gist: 'Small, repeatable practices anchored to a cue-routine-reward loop compound into reputation and presence — change one keystone habit and others follow.',
    steps: ['Choose one keystone habit.', 'Attach it to an existing cue/routine.', 'Track it until automatic.'],
    signal: 'Repeats a deliberate small habit consistently across interactions.' },
];

// Canonical books that ground each module (cleaned from the knowledge base).
export const MODULE_SOURCES: Record<number, SourceBook[]> = {
  1: [{ title: 'Executive Presence', author: 'Sylvia Ann Hewlett' }, { title: 'Gravitas', author: 'Caroline Goyder' }, { title: 'Leading Leaders', author: 'Jeswald W. Salacuse' }, { title: 'How to Win Friends and Influence People', author: 'Dale Carnegie' }, { title: 'Influence', author: 'Robert Cialdini' }],
  2: [{ title: 'The Pyramid Principle', author: 'Barbara Minto' }, { title: 'Executive Presence', author: 'Sylvia Ann Hewlett' }, { title: 'Gravitas', author: 'Caroline Goyder' }, { title: 'Influence', author: 'Robert Cialdini' }, { title: 'Crucial Conversations', author: 'Patterson et al.' }],
  3: [{ title: 'Influence', author: 'Robert Cialdini' }, { title: 'How to Win Friends and Influence People', author: 'Dale Carnegie' }, { title: 'Leading Leaders', author: 'Jeswald W. Salacuse' }, { title: 'Gravitas', author: 'Caroline Goyder' }],
  4: [{ title: 'Gravitas', author: 'Caroline Goyder' }, { title: 'Crucial Conversations', author: 'Patterson et al.' }, { title: 'Dare to Lead', author: 'Brené Brown' }, { title: 'Influence', author: 'Robert Cialdini' }],
  5: [{ title: 'Say What You Mean', author: 'Oren Jay Sofer' }, { title: 'Never Split the Difference', author: 'Chris Voss' }, { title: 'Crucial Conversations', author: 'Patterson et al.' }, { title: 'Radical Candor', author: 'Kim Scott' }, { title: 'Dare to Lead', author: 'Brené Brown' }],
  6: [{ title: 'Crucial Conversations', author: 'Patterson et al.' }, { title: 'Radical Candor', author: 'Kim Scott' }, { title: 'Dare to Lead', author: 'Brené Brown' }, { title: 'Leading Leaders', author: 'Jeswald W. Salacuse' }, { title: 'How to Win Friends and Influence People', author: 'Dale Carnegie' }],
  7: [{ title: 'Say What You Mean', author: 'Oren Jay Sofer' }, { title: 'Influence', author: 'Robert Cialdini' }, { title: 'Negotiation Mastery', author: 'Negotiation literature' }, { title: 'Dare to Lead', author: 'Brené Brown' }, { title: 'Crucial Conversations', author: 'Patterson et al.' }],
  8: [{ title: 'Never Split the Difference', author: 'Chris Voss' }, { title: 'Getting to Yes', author: 'Fisher & Ury' }, { title: 'Negotiation Mastery', author: 'Negotiation literature' }, { title: 'Influence', author: 'Robert Cialdini' }, { title: 'Leading Leaders', author: 'Jeswald W. Salacuse' }],
  9: [{ title: 'Gap Selling', author: 'Keenan' }, { title: 'Little Red Book of Selling', author: 'Jeffrey Gitomer' }, { title: 'Secrets of Closing the Sale', author: 'Zig Ziglar' }, { title: 'Powerful Selling', author: 'Andy Schmitz' }, { title: 'Influence', author: 'Robert Cialdini' }],
  10: [{ title: 'Crucial Conversations', author: 'Patterson et al.' }, { title: 'How to Win Friends and Influence People', author: 'Dale Carnegie' }, { title: 'Influence', author: 'Robert Cialdini' }, { title: 'Atomic Habits & deliberate-practice research', author: 'Skill-acquisition literature' }],
};

export const frameworksForModule = (n: number): Framework[] => FRAMEWORKS.filter((f) => f.module === n);
export const sourcesForModule = (n: number): SourceBook[] => MODULE_SOURCES[n] ?? [];

/** Distinct source titles across the whole curriculum — for marketing/holistic copy. */
export const ALL_SOURCE_TITLES: string[] = [...new Set(Object.values(MODULE_SOURCES).flat().map((s) => s.title))];
