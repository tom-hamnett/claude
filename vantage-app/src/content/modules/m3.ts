import type { Module } from '../../types';

export const m3: Module = {
  number: 3,
  slug: 'tactical-empathy',
  title: 'Tactical Empathy & Trust',
  track: 'connection',
  book: { part: 2, partTitle: 'Connection — Listening, Empathy, and Trust', chapter: 3, chapterTitle: 'Tactical Empathy — The Foundation of Every High-Stakes Relationship' },
  oneLiner: 'Understand people so precisely they feel it — and build the trust that unlocks candor and movement.',
  estReadMin: 20,
  whyItMatters:
    'Empathy has a reputation problem: it is mistaken for softness and capitulation. That is exactly backwards. The most effective negotiators and the most trusted leaders are consistently the most empathic — not because they feel more, but because they understand more precisely. Tactical empathy is the trainable discipline of understanding another person\'s reality so thoroughly you can articulate it better than they can, then demonstrating it. The reliable result: their threat response drops, their thinking reopens, and movement becomes possible.',
  learningObjectives: [
    'Distinguish tactical empathy (understanding) from sympathy (feeling-for) and agreement (sharing a view).',
    'Run the accusation audit — naming the other person\'s concern before they do.',
    'Use the full empathy sequence: map, demonstrate, seek confirmation.',
    'Build the three layers of trust, and invest in relational trust over time.',
  ],
  keyTerms: [
    { term: 'Tactical empathy', def: 'The deliberate effort to understand another person\'s perspective and underlying needs so accurately you can articulate them — and then to demonstrate that understanding so they feel it. Understanding, not sympathy or agreement.' },
    { term: 'Accusation audit', def: 'Naming, out loud and first, the concerns or grievances the other person holds about you — which deflates the concern and drops their defensiveness.' },
    { term: 'Trust architecture', def: 'Trust has three components: competence ("they can do the job"), integrity ("they do what they say"), and relational ("they understand and care about my interests"). Relational is the rarest and most leveraged.' },
  ],
  subAreas: ['Tactical empathy vs. sympathy', 'Labels & demonstrated understanding', 'The accusation audit', 'The trust architecture', 'Relational trust over time', 'Genuine curiosity'],
  competencyIds: ['empathy', 'trust'],
  lessons: [
    {
      id: 'm3-l1',
      title: 'Understanding as a discipline',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'Tactical empathy is not sympathy (feeling *for* someone, sharing their emotional state) and not agreement (sharing their view). It is **understanding** — the clear, precise, non-judgmental comprehension of another person\'s reality and underlying needs — and then the *demonstration* of that understanding, in language they can recognise.' },
        { type: 'callout', tone: 'key', title: 'The demonstration is the key', md: 'Understanding without demonstration does not build trust. Understanding the other person can *feel* — because you have articulated their reality back to them, accurately and without judgment — drops their threat response, decreases their need to defend, and makes them genuinely able to think again.' },
        { type: 'p', md: 'This is not manipulation; it is the reliable consequence of being heard. When the threat signal drops (the same mechanism from Module 1, working on the other person), the deliberate, problem-solving part of the brain re-engages. The person who was locked in a defensive posture becomes able to consider options they could not see before.' },
        {
          type: 'goodbad',
          rows: [
            { dimension: 'A colleague is frustrated', poor: '"I know exactly how you feel." (makes it about you — sympathy)', good: '"It sounds like this has been harder than it looks from outside." (reflects their reality — empathy)' },
            { dimension: 'A skeptical client', poor: 'Lead with credentials and the business case.', good: '"Your experience with projects like this hasn\'t been great. I want to understand what made them hard before I say why this is different."' },
          ],
        },
      ],
    },
    {
      id: 'm3-l2',
      title: 'The accusation audit & the empathy sequence',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'One of the most counterintuitive moves in the canon: before a high-stakes conversation where the other person may have doubts or grievances about you, **name those concerns first — before they do.** This is the accusation audit. When you name the thing in the room, you change the room.' },
        { type: 'callout', tone: 'mechanic', title: 'Why it works', md: 'Naming a concern the other person has been holding but not saying does two things: the concern **deflates** (it is less potent acknowledged than unsaid), and their **threat response drops** (the defensive posture they were preparing turns out to be unnecessary). The formula: *"I know/imagine/realise that [their concern], and I want to address that directly before we talk about [your purpose]."*' },
        { type: 'p', md: 'The audit is not confession and not self-deprecation. "I know I\'ve let you down before" is about *you*; "I know this proposal is going to look like more of the same" names *their* perception. Name the perception, not your performance review.' },
        { type: 'h', text: 'The full empathy sequence' },
        {
          type: 'steps',
          items: [
            'Map the emotional landscape — use mirrors and labels (Module 2) to understand what they are really experiencing and what they need that they have not said.',
            'Demonstrate understanding — audit the concern, then label the most important reality: "it sounds like the bigger worry isn\'t the timeline — it\'s whether you can trust this will actually happen."',
            'Seek confirmation — "am I reading this right?" The confirmation (or correction) is the signal that genuine understanding has landed.',
          ],
        },
        {
          type: 'check',
          q: 'You\'re returning to a client after a missed deadline. The strongest opening is:',
          options: [
            { text: 'Launch into the explanation and an apology.', correct: false, why: 'Explaining first bypasses their concern; they hear defensiveness, not understanding.' },
            { text: '"I know what you\'re seeing right now looks like we\'ve dropped this. Let me give you the full picture — and I want to hear where this has left you."', correct: true, why: 'An accusation audit names their concern first, deflates it, and opens genuine dialogue.' },
            { text: 'Lead with everything you\'ve done to fix it.', correct: false, why: 'It centres you, not their experience — the audit centres their reality first.' },
          ],
        },
      ],
    },
    {
      id: 'm3-l3',
      title: 'The trust architecture',
      estMin: 6,
      blocks: [
        { type: 'p', md: 'Trust is not a state; it is a process that builds through interactions until the other person can predict you. It has three components, each built by different behaviours:' },
        {
          type: 'list',
          ordered: true,
          items: [
            '**Competence trust** — "they can do the job." Built by credentials, track record, preparation. Necessary, but the most easily lost and not enough on its own.',
            '**Integrity trust** — "they do what they say, especially when it\'s inconvenient." Slow to build, catastrophically fast to lose. Built in the moments you could have bent the truth and didn\'t.',
            '**Relational trust** — "they understand and genuinely care about my interests." The rarest, most powerful, and most neglected — and the one most directly accessible through tactical empathy.',
          ],
        },
        { type: 'callout', tone: 'key', title: 'Relational trust is the multiplier', md: 'In high-stakes decisions — hiring, promoting, partnering, buying — relational trust is often the deciding factor between comparable options. The person who has all three is one you advocate for, bring hard problems to, and forgive faster. The person who has only competence trust is one you use transactionally.' },
        { type: 'p', md: 'Relational trust is built over time by specific, low-cost behaviours: consistent follow-through on small commitments; demonstrated memory of what matters to them (returning, unprompted, to something they raised); genuine interest in the non-work reality; and naming the relationship explicitly when it matters ("I\'m raising this because I value working with you").' },
        { type: 'tryit', md: 'Before your most important meeting this week, write one accusation-audit sentence — "I know/imagine that [their concern]…". You may not use it, but writing it shifts your frame from defensive to empathic, and changes how you enter the room.' },
      ],
    },
  ],
  principles: [
    'Tactical empathy is understanding as a discipline, not sympathy as a mood.',
    'The demonstration is the point — articulate their reality so they feel understood.',
    'The accusation audit deflates a concern by naming it first; acknowledgment is strategy, not capitulation.',
    'Relational trust is the rarest and most leveraged form — invest in it before you need it.',
    'Empathy used as a closing technique is felt as manipulation; the curiosity must be genuine.',
  ],
  practice: [
    { kind: 'observe', title: 'Sympathy or empathy?', body: 'For a week, catch your acknowledgements. Were they about you ("I know how you feel") or a reflection of their reality ("it sounds like…")? Notice the difference in response.' },
    { kind: 'experiment', title: 'The pre-conversation audit', body: 'Before an important conversation with someone who may have reservations about you, write three to five concerns they likely hold. Decide which to name first — as an observation, not a confession — and say it aloud to yourself before you go in.' },
    { kind: 'record', title: 'Demonstrated understanding', body: 'Record a high-stakes conversation. A VANTAGE evaluation reads whether you labelled and audited concerns, demonstrated understanding before advocating, and earned visible openness.' },
    { kind: 'reflect', title: 'The relational trust investment', body: 'Pick one relationship where you have competence trust but not strong relational trust. Plan one interaction this week that invests in the relational layer — a genuine question, an acknowledgment, a return to something they mentioned.' },
  ],
  warningSigns: [
    'Bypassing the concern — explaining, defending, or pitching over it',
    'Sympathy ("I know how you feel") instead of empathy ("it sounds like…")',
    'Using empathy as a closing technique rather than genuine curiosity',
    'Relying on competence trust and neglecting the relational layer',
  ],
  diagnosticSignals: ['Labels that name the other\'s emotion/concern', 'Accusation audit before advocating', 'Seeks confirmation ("am I reading this right?")', 'Genuine curiosity vs. strategic empathy'],
  furtherReading: ['Chris Voss — Never Split the Difference (tactical empathy, accusation audit)', 'Stephen Covey — seek first to understand', 'Dale Carnegie — genuine interest as the root of influence', 'Matthew Lieberman — affect labeling research'],
  grounding: ['Voss (tactical empathy)', 'Covey', 'Carnegie', 'Dirks & Ferrin (trust meta-analysis)', 'Bates ExPI (relational components)'],
};
