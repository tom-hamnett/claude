import type { Track, Competency } from '../types';

// Tracks map to the five Parts of the source book, "The Same Conversation".
export const TRACKS: Track[] = [
  { id: 'presence', title: 'Part I — Foundation: Self-Regulation', subtitle: 'The inner move every other skill depends on: choosing your response.', accent: 'brand' },
  { id: 'connection', title: 'Part II — Connection: Listening, Empathy & Trust', subtitle: 'Hear what matters, demonstrate understanding, and build trust.', accent: 'teal' },
  { id: 'clarity', title: 'Part III — Clarity & Influence: Presence, Architecture & Persuasion', subtitle: 'Sound senior, land the point, and move people without authority.', accent: 'gold' },
  { id: 'influence', title: 'Part IV — High-Stakes Application', subtitle: 'Difficult conversations, feedback, negotiation, sales, and lateral leadership.', accent: 'hot' },
  { id: 'practice', title: 'Part V — Integration: Skills That Stick', subtitle: 'The deliberate-practice loop that turns insight into behaviour.', accent: 'brand' },
];

/**
 * The BARS rubric. Each competency maps to one or more of the 12 modules and is
 * scored 1 (Novice) -> 4 (Advanced), the four-level scale from the book's
 * Appendix A self-assessment. The evaluation engine reads the whole conversation
 * for context but scores only the user, citing evidence.
 */
export const COMPETENCIES: Competency[] = [
  {
    id: 'composure',
    name: 'Composure under pressure',
    moduleNumbers: [1, 4],
    definition:
      'Staying grounded and choosing your response under challenge, interruption, silence, or provocation — rather than reacting, freezing, or escalating.',
    signals: [
      'Pause before responding to a pointed question (response latency)',
      'Speech-rate and pitch stability under challenge vs. your baseline',
      'Interruptions initiated / floor surrendered when pushed',
      'Defensive markers ("well, actually", long justifying runs) vs. grounded acknowledgements',
    ],
    levels: [
      { level: 1, label: 'Novice', anchor: 'Reacts fast; rate/pitch spike; defends or talks over, or freezes and concedes.', example: 'Challenged → answers in under a second, "Well, actually—", voice rises, cuts in.' },
      { level: 2, label: 'Developing', anchor: 'Holds it together sometimes; still rushes or over-explains in the hottest moments.', example: 'Steady early, then launches a long defensive justification on the pointed question.' },
      { level: 3, label: 'Proficient', anchor: 'Consistently pauses before responding; rate/pitch stable; stays in dialogue.', example: '"Good challenge — let me think about that for a second." Even tone.' },
      { level: 4, label: 'Advanced', anchor: 'Grounded and engaged under real heat; uses silence deliberately; can name tension calmly.', example: '"I can tell this one\'s loaded — say more, I want to get it right." Then a deliberate pause.' },
    ],
  },
  {
    id: 'gravitas',
    name: 'Gravitas & credibility',
    moduleNumbers: [4],
    definition:
      'Projecting earned authority: knowing your material cold, owning the frame, and signalling seniority through substance and delivery rather than volume.',
    signals: [
      'Depth of answers under follow-up ("six questions deep")',
      'Authoritative framing vs. hedging / qualifiers / "just"',
      'Filler density, up-talk, trailing sentences',
      'Owning vs. apologising for one\'s contribution',
    ],
    levels: [
      { level: 1, label: 'Novice', anchor: 'Hedges, qualifies, frames own contribution as junior; thin under follow-up.', example: '"This might be a silly idea, but maybe we could possibly..."' },
      { level: 2, label: 'Developing', anchor: 'Some authority, undercut by filler or shallow second-layer answers.', example: 'Strong opener, then "um, I\'d have to check" on the first probe.' },
      { level: 3, label: 'Proficient', anchor: 'Clear, owned positions; holds up two or three questions deep.', example: '"My recommendation is X, because of A and B — and if you push on A, here\'s the data."' },
      { level: 4, label: 'Advanced', anchor: 'Calm command of the material several layers deep; sets the frame for the room.', example: 'Answers the question behind the question; reframes the discussion around what matters.' },
    ],
  },
  {
    id: 'conciseness',
    name: 'Clarity & concision',
    moduleNumbers: [5],
    definition:
      'Leading with the answer, structuring top-down, and landing the point quickly at the right altitude for the audience.',
    signals: [
      'Recommendation-first vs. bottom-up build-up',
      'Time-to-point / words-before-the-ask',
      'Structure markers ("three things", "headline is")',
      'Over-detail, tangents, burying the lede',
    ],
    levels: [
      { level: 1, label: 'Novice', anchor: 'Bottom-up, meandering; the ask or recommendation never lands cleanly.', example: 'Five minutes of context; the actual request arrives (if at all) at the end.' },
      { level: 2, label: 'Developing', anchor: 'Gets there, but slowly; structure is implicit, detail crowds the point.', example: 'Good content, but the listener has to dig for the headline.' },
      { level: 3, label: 'Proficient', anchor: 'Leads with the recommendation; structured; lands the point fast.', example: '"Headline: we should ship Friday. Three reasons, then the risk."' },
      { level: 4, label: 'Advanced', anchor: 'Crisp, altitude-matched, decision-ready; says the most in the fewest words.', example: 'One sentence the exec repeats back verbatim. Adjusts depth to the room.' },
    ],
  },
  {
    id: 'calibration',
    name: 'Influence & audience calibration',
    moduleNumbers: [9, 10],
    definition:
      'Reading the room and framing your message around what the audience values — interests, not positions — and aligning stakeholders.',
    signals: [
      'Framing in the listener\'s terms / their stated interests',
      'Responsiveness to cues (questions, pushback, energy)',
      'One-size message vs. tailored',
      'References to stakeholders\' goals / pre-wiring',
    ],
    levels: [
      { level: 1, label: 'Novice', anchor: 'Pushes own position; tone-deaf to the room; no adaptation.', example: 'Same pitch regardless of who objects or why.' },
      { level: 2, label: 'Developing', anchor: 'Some awareness, but reverts to own framing under pressure.', example: 'Acknowledges a concern, then restates the original pitch unchanged.' },
      { level: 3, label: 'Proficient', anchor: 'Frames around the audience\'s interests; adjusts to cues.', example: '"For finance this is about risk; for ops it\'s about time — here\'s both."' },
      { level: 4, label: 'Advanced', anchor: 'Reads and shapes the room; surfaces and aligns competing interests.', example: 'Names the unspoken tension between two stakeholders and bridges it.' },
    ],
  },
  {
    id: 'regulation',
    name: 'Emotional regulation',
    moduleNumbers: [1],
    definition:
      'Catching your own triggers at the choice-point, managing reactivity, and choosing intention over impulse.',
    signals: [
      'Non-defensiveness when challenged or criticised',
      'Naming vs. acting out tension',
      'Recovery speed after a provocation',
      'Self-talk markers (blame/absolutes vs. ownership)',
    ],
    levels: [
      { level: 1, label: 'Novice', anchor: 'Reactivity drives behaviour; defensive, sharp, or shutting down.', example: 'Gets visibly irritated; the tone hardens for the rest of the call.' },
      { level: 2, label: 'Developing', anchor: 'Mostly steady; occasional reactive spike that lingers.', example: 'One barbed reply, then recovers a few minutes later.' },
      { level: 3, label: 'Proficient', anchor: 'Catches the trigger; stays curious instead of defensive.', example: '"That landed sharply for me — let me check I understood you."' },
      { level: 4, label: 'Advanced', anchor: 'Regulated under real provocation; turns heat into understanding.', example: 'Names what\'s happening, de-escalates, and keeps everyone in dialogue.' },
    ],
  },
  {
    id: 'listening',
    name: 'Deep listening',
    moduleNumbers: [2],
    definition:
      'Demonstrably tracking and building on what the other person said — reflecting, paraphrasing, and following up — rather than waiting to talk.',
    signals: [
      'Reflect-backs / paraphrases before responding',
      'References to the other\'s prior words',
      'Interruptions (lower is better, in context)',
      'Talk-time ratio',
    ],
    levels: [
      { level: 1, label: 'Novice', anchor: 'Little uptake; talks past the prior turn; frequent interruptions.', example: 'Replies with a pre-formed point unrelated to what was just said.' },
      { level: 2, label: 'Developing', anchor: 'Sometimes references the other, but pivots quickly to own agenda.', example: 'Brief "ok", then straight into own pitch.' },
      { level: 3, label: 'Proficient', anchor: 'Regularly reflects/builds on what was said; few interruptions.', example: '"So the real worry is the timeline, not the budget — is that right?"' },
      { level: 4, label: 'Advanced', anchor: 'Captures and names the underlying concern; the other feels fully heard.', example: 'Labels the unspoken worry, checks it, then responds — "exactly," they say.' },
    ],
  },
  {
    id: 'inquiry',
    name: 'Inquiry & calibrated questions',
    moduleNumbers: [2, 8, 9],
    definition:
      'Using open, calibrated, genuinely curious questions to understand, make the other person think, and surface the real need — and leaving space for the answer.',
    signals: [
      'Question rate per minute of your airtime',
      'Open vs. closed ratio; "what/how" vs. "why"',
      'Calibrated markers ("how can we…", "what would have to be true…")',
      'Post-question silence vs. answering your own question',
    ],
    levels: [
      { level: 1, label: 'Novice', anchor: 'Almost no genuine questions; advocates/tells; questions are closed or leading.', example: 'Talks ~90% of airtime; "Do you agree we should ship Friday?"' },
      { level: 2, label: 'Developing', anchor: 'Some questions but mostly closed/"why"; tends to answer them.', example: '"Why didn\'t you flag this?" then fills the silence immediately.' },
      { level: 3, label: 'Proficient', anchor: 'Regular open "what/how" questions; leaves space; some follow-up.', example: '"What would have to be true for Friday to work?" — then waits.' },
      { level: 4, label: 'Advanced', anchor: 'Calibrated questions that hand over the problem; clear progression to the real need.', example: '"How can we make this work given the deadline?" → "What does that cost you?"' },
    ],
  },
  {
    id: 'trust',
    name: 'Trust & warmth',
    moduleNumbers: [3],
    definition:
      'Creating psychological safety and connection — acknowledgement, warmth, inclusiveness — so people bring their best.',
    signals: [
      'Acknowledgement / validation of others\' contributions',
      'Inclusive moves (drawing people in, crediting)',
      'Warmth markers vs. transactional tone',
      'Safety-building when stakes rise',
    ],
    levels: [
      { level: 1, label: 'Novice', anchor: 'Transactional or cold; little acknowledgement; can feel unsafe.', example: 'Moves straight to critique with no recognition of effort.' },
      { level: 2, label: 'Developing', anchor: 'Polite but thin; acknowledgement feels perfunctory.', example: '"Thanks" then straight to the problem, every time.' },
      { level: 3, label: 'Proficient', anchor: 'Genuine acknowledgement and warmth; includes others.', example: '"That\'s a real contribution — and it raises a good question for the group."' },
      { level: 4, label: 'Advanced', anchor: 'Actively builds safety and belonging; people open up.', example: 'Names good intent, invites the quiet voice, makes it safe to disagree.' },
    ],
  },
  {
    id: 'observation',
    name: 'Observation vs. evaluation',
    moduleNumbers: [6, 7, 11],
    definition:
      'Describing what actually happened (observable facts) before/instead of layering judgement, blame, or absolutes.',
    signals: [
      'Observational framing ("when X happened") vs. absolutes ("always/never")',
      'Character labels / mind-reading / "you" blame',
      'Owning interpretation as your own',
    ],
    levels: [
      { level: 1, label: 'Novice', anchor: 'Speaks mostly in judgements, absolutes, and blame.', example: '"You never listen / you don\'t care."' },
      { level: 2, label: 'Developing', anchor: 'Mixes some observation with frequent evaluation.', example: '"You keep cutting me off — you\'re so dismissive."' },
      { level: 3, label: 'Proficient', anchor: 'Usually separates fact from interpretation.', example: '"When the topic changed mid-point, I felt cut off."' },
      { level: 4, label: 'Advanced', anchor: 'Grounds points in clean observation, then owns the interpretation.', example: '"Twice the agenda moved before I finished — the story I told myself was that it didn\'t matter. Can we check that?"' },
    ],
  },
  {
    id: 'difficult',
    name: 'Difficult conversations',
    moduleNumbers: [6],
    definition:
      'Raising hard issues and giving/receiving feedback while keeping safety and staying in dialogue under heat.',
    signals: [
      'Opening with safety/intent vs. avoidance or attack',
      'Staying composed when challenged back',
      'Checking understanding; repair after friction',
      'Escalation / withdrawal markers',
    ],
    levels: [
      { level: 1, label: 'Novice', anchor: 'Avoids, or attacks; conversation escalates or shuts down.', example: 'Either never raises it, or opens with blame and it spirals.' },
      { level: 2, label: 'Developing', anchor: 'Raises it, but bluntly; safety wobbles, recovery is slow.', example: 'States the issue with no setup; the other goes defensive.' },
      { level: 3, label: 'Proficient', anchor: 'Opens with intent, states facts, keeps it safe.', example: '"I want this project to go well — can we talk about what happened on Tuesday?"' },
      { level: 4, label: 'Advanced', anchor: 'Holds safety under real heat; repairs ruptures; both leave intact.', example: 'De-escalates a flare-up, names it, and lands a shared next step.' },
    ],
  },
  {
    id: 'assertiveness',
    name: 'Assertiveness & clear requests',
    moduleNumbers: [11],
    definition:
      'Owning your needs and turning them into concrete, doable requests — directly and kindly — rather than hints, vagueness, or demands.',
    signals: [
      'Specific actionable asks (who/what/when) vs. hints/complaints',
      'Saying no cleanly; setting boundaries',
      'Over-apologising / softening into invisibility',
      'Request vs. demand framing; checking agreement',
    ],
    levels: [
      { level: 1, label: 'Novice', anchor: 'Hints or complains; no clear ask; or demands without buy-in.', example: '"Nobody ever keeps me in the loop." (no request)' },
      { level: 2, label: 'Developing', anchor: 'Vague or over-softened asks; struggles to say no.', example: '"Could you maybe communicate a bit better when you can?"' },
      { level: 3, label: 'Proficient', anchor: 'Concrete, doable, specific requests; can decline cleanly.', example: '"Would you text me by 5 if you\'ll be late?"' },
      { level: 4, label: 'Advanced', anchor: 'Specific request that checks it works for the other — a request, not a demand.', example: '"Could you send a one-line status by Friday noon — does that work for you?"' },
    ],
  },
  {
    id: 'negotiation',
    name: 'Negotiation & value',
    moduleNumbers: [8],
    definition:
      'Working from interests not positions: preparing alternatives, trading rather than conceding, handling objections calmly, and framing value.',
    signals: [
      'Uncovering the other side\'s interests',
      'Trading / options vs. flat concession under pressure',
      'Objection handling without defensiveness',
      'Anchoring, value framing, and a clear close',
    ],
    levels: [
      { level: 1, label: 'Novice', anchor: 'Positional bargaining; concedes under pressure; no clear close.', example: 'Drops the price the moment it\'s questioned.' },
      { level: 2, label: 'Developing', anchor: 'Some preparation, but reverts to positions and gives ground.', example: 'Argues the position harder rather than exploring interests.' },
      { level: 3, label: 'Proficient', anchor: 'Surfaces interests; trades; handles objections; frames value.', example: '"If timing flexes, I can move on scope — what matters most to you?"' },
      { level: 4, label: 'Advanced', anchor: 'Creates value, protects it, and closes to a concrete next step.', example: 'Reframes around objective criteria; both sides leave better off.' },
    ],
  },
  {
    id: 'consultative',
    name: 'Consultative / sales conversation',
    moduleNumbers: [9],
    definition:
      'Discovering the real need before solutioning (SPIN), listening commercially, and framing value to the customer rather than feature-dumping.',
    signals: [
      'Discovery questions (situation/problem/implication/need-payoff) before pitching',
      'Listening for the need vs. talking past it',
      'Tailoring the solution to the stated problem',
      'Driving a clear next step',
    ],
    levels: [
      { level: 1, label: 'Novice', anchor: 'Pitch-first / feature-dumps; checklist questions; no next step.', example: 'Launches into the demo before understanding the problem.' },
      { level: 2, label: 'Developing', anchor: 'Asks some discovery, but jumps to solution early.', example: 'A couple of situation questions, then straight to features.' },
      { level: 3, label: 'Proficient', anchor: 'Real discovery; ties solution to the need; clear next step.', example: '"What does that problem cost you today?" → frames value to it.' },
      { level: 4, label: 'Advanced', anchor: 'Lets the buyer articulate the value; consultative throughout; crisp close.', example: 'Need-payoff questions so the customer sells themselves; clean next step.' },
    ],
  },
  {
    id: 'self-awareness',
    name: 'Self-awareness & practice',
    moduleNumbers: [12],
    definition:
      'Noticing your recurring patterns, setting one focus at a time, and turning feedback into deliberate practice and lasting change.',
    signals: [
      'Recognising patterns across interactions',
      'Linking insight to a concrete next action',
      'Following through on a chosen focus',
      'Reflective vs. defensive response to feedback',
    ],
    levels: [
      { level: 1, label: 'Novice', anchor: 'One-off insight, no practice; data overwhelms; no follow-through.', example: 'Reads the report, changes nothing by next time.' },
      { level: 2, label: 'Developing', anchor: 'Notices patterns but spreads effort thin; inconsistent practice.', example: 'Tries to fix five things at once; none stick.' },
      { level: 3, label: 'Proficient', anchor: 'Picks one focus, practises it in real conversations, reviews.', example: 'Works only on "ask one more question" for a fortnight — and it shows.' },
      { level: 4, label: 'Advanced', anchor: 'Runs a deliberate-practice loop; visible movement on the metric over time.', example: 'Interruptions down, question-rate up, tracked across uploads.' },
    ],
  },
  {
    id: 'empathy',
    name: 'Tactical empathy',
    moduleNumbers: [3],
    definition:
      'Demonstrating understanding of the other person\'s reality so accurately they feel heard — labels, mirrors, and the accusation audit — which drops their threat response and reopens their thinking.',
    signals: [
      'Labels that name the other\'s emotion/concern ("it sounds like…")',
      'Accusation audit — naming their likely objection before they do',
      'Demonstrated understanding before advocating; seeks confirmation ("am I reading this right?")',
      'Genuine curiosity vs. empathy used as a closing technique',
    ],
    levels: [
      { level: 1, label: 'Novice', anchor: 'Bypasses the other\'s concern; defends, explains, or pitches over it.', example: 'Returns to a frustrated client and launches straight into the explanation.' },
      { level: 2, label: 'Developing', anchor: 'Some acknowledgement, but quickly pivots to own case; sympathy not empathy.', example: '"I know how you feel, but here\'s why we\'re different…"' },
      { level: 3, label: 'Proficient', anchor: 'Names the emotional reality accurately and checks it before moving on.', example: '"It sounds like the real worry isn\'t the timeline — it\'s whether this actually happens. Is that right?"' },
      { level: 4, label: 'Advanced', anchor: 'Audits the concern first, articulates their position better than they can, earns visible openness.', example: '"I imagine you\'re wondering why this will be any different — I\'d like to understand what went wrong before I say anything about us."' },
    ],
  },
  {
    id: 'feedback',
    name: 'Feedback that changes behaviour',
    moduleNumbers: [7],
    definition:
      'Giving feedback at the intersection of caring personally and challenging directly (Radical Candor), using specific Situation–Behaviour–Impact rather than vague praise or character verdicts — and receiving it without defensiveness.',
    signals: [
      'Care signalled + challenge delivered directly (not ruinous empathy or obnoxious aggression)',
      'SBI: a specific situation, an observable behaviour, a concrete impact',
      'Permission/timeliness; specific not generalised ("you always")',
      'Receiving: listens fully, asks for one specific example, processes before responding',
    ],
    levels: [
      { level: 1, label: 'Novice', anchor: 'Avoids the message or softens it to invisibility; or blunt attack with no care.', example: '"Great job!" (vague) — or "You need to step up." (verdict, no specifics).' },
      { level: 2, label: 'Developing', anchor: 'Gets to the point, but vague or generalised; care or specificity missing.', example: '"You need to be more strategic in meetings." (no situation/behaviour/impact)' },
      { level: 3, label: 'Proficient', anchor: 'Specific SBI delivered with evident care; lands as useful, not as a verdict.', example: '"In Tuesday\'s board meeting, when challenged on Q3 you added context rather than answering — two members left less confident. Want a suggestion?"' },
      { level: 4, label: 'Advanced', anchor: 'Radical candor as a habit, both directions; makes feedback safe and sought.', example: 'Opens with care, gives clean SBI, and receives challenge back with "give me one specific example" rather than defending.' },
    ],
  },
  {
    id: 'lateral',
    name: 'Lateral leadership & coalition building',
    moduleNumbers: [10],
    definition:
      'Leading and influencing people who have no obligation to follow you — peers, seniors, stakeholders — through interest-discovery, reciprocity, relationship investment, and coalition-building rather than authority.',
    signals: [
      'Discovers the other\'s interests/priorities before making the ask',
      'Invests in the relationship before needing something (reciprocity)',
      'Maps and sequences stakeholders (sponsors → neutrals → blockers)',
      'Upward influence: connects to their stated priority, brief, direct about the ask',
    ],
    levels: [
      { level: 1, label: 'Novice', anchor: 'Relies on authority, mandate, or escalation; transactional, ask-only contact.', example: 'Announces at kick-off and waits for compliance; escalates when peers deprioritise.' },
      { level: 2, label: 'Developing', anchor: 'Builds a better business case but doesn\'t address the real interest or relationship.', example: 'Sends a more detailed ROI model to a skeptical peer; nothing moves.' },
      { level: 3, label: 'Proficient', anchor: 'Discovers interests and frames the ask around them; invests before asking.', example: '"What would need to be different for this to move up your list?" — then builds from the answer.' },
      { level: 4, label: 'Advanced', anchor: 'Wins cooperation before formal approval; maps the coalition and the informal influencers.', example: 'Spends weeks understanding the CTO\'s real concern, restructures the proposal around it, and has the yes before the formal ask.' },
    ],
  },
];

export const competencyById = (id: string): Competency | undefined =>
  COMPETENCIES.find((c) => c.id === id);

export const competenciesForModule = (n: number): Competency[] =>
  COMPETENCIES.filter((c) => c.moduleNumbers.includes(n));
