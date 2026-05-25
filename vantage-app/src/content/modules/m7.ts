import type { Module } from '../../types';

export const m7: Module = {
  number: 7,
  slug: 'feedback',
  title: 'Feedback: Radical Candor & SBI',
  track: 'influence',
  book: { part: 4, partTitle: 'High-Stakes Application — Conversations, Feedback, Negotiation, and Sales', chapter: 8, chapterTitle: 'Radical Candor — Giving Feedback That Actually Changes Things' },
  oneLiner: 'Give feedback that lands as a gift, not an attack or a mystery — and receive it without defending.',
  estReadMin: 20,
  whyItMatters:
    'The feedback most professionals give is not the feedback that would be most useful. They soften it until the problem is invisible, or deliver the truth so bluntly it produces defensiveness instead of change. Research is unambiguous: feedback changes behaviour only when the receiver feels the giver cares about them *and* gets a clear, specific description of what to change. Both conditions are necessary. This module gives you the system for both — and for receiving feedback in a way that extracts the maximum from even poorly delivered criticism.',
  learningObjectives: [
    'Place any feedback on the Radical Candor 2x2 and aim for the high-care, high-challenge quadrant.',
    'Turn vague judgments into specific Situation–Behaviour–Impact feedback.',
    'Receive feedback with the four-step framework instead of defending.',
    'Avoid the common traps: the sandwich, generalising, and delay.',
  ],
  keyTerms: [
    { term: 'Radical Candor', def: 'Kim Scott\'s target quadrant: caring personally *and* challenging directly. The only quadrant that consistently produces growth.' },
    { term: 'Ruinous Empathy', def: 'High care, low challenge — softening the message until the problem is invisible. The most common failure of well-meaning people; a form of abandonment.' },
    { term: 'SBI', def: 'Situation–Behaviour–Impact: one specific situation, an observable behaviour, and its concrete impact. Turns a judgment the receiver can\'t change into a behaviour they can.' },
    { term: 'Observation vs. evaluation', def: 'Describing what observably happened ("the report missed two deadlines") rather than judging character ("you\'re unreliable").' },
  ],
  subAreas: ['The Radical Candor 2x2', 'Care + challenge together', 'SBI construction', 'Observation vs. evaluation', 'Receiving feedback', 'Building a feedback culture'],
  competencyIds: ['feedback', 'observation'],
  lessons: [
    {
      id: 'm7-l1',
      title: 'The Radical Candor framework',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'Kim Scott maps feedback on two axes: **Care Personally** (genuine concern for the person\'s growth) and **Challenge Directly** (how specific and unambiguous you are about what needs to change). The two axes make four quadrants — and only one produces growth.' },
        {
          type: 'list',
          items: [
            '**Radical Candor** (high care, high challenge) — "I care about you, and I\'m going to tell you the truth." The target. Uncomfortable to give and receive, and the only quadrant that consistently changes things.',
            '**Ruinous Empathy** (high care, low challenge) — too kind to say the hard thing. The most common failure mode; it feels like kindness and is actually abandonment.',
            '**Obnoxious Aggression** (low care, high challenge) — truth without care. Produces defensiveness and compliance, not growth.',
            '**Manipulative Insincerity** (low care, low challenge) — vague, political, conflict-avoidant. The most damaging: no usable information, no trust.',
          ],
        },
        { type: 'callout', tone: 'mechanic', title: 'The quadrant self-diagnosis (before any feedback)', md: '**1. Does this person, in their bones, know I want them to succeed?** If no, establish care first.\n\n**2. Am I being specific about the exact behaviour and impact?** If no, sharpen with SBI.\n\nIf both are yes, proceed. If either is no, the feedback will land in one of the other three quadrants regardless of intent.' },
        { type: 'callout', tone: 'warn', title: 'Compassion and honesty are not opposites', md: 'Compassion without honesty is not kindness — it is abandonment. Honesty without compassion is not courage — it is arrogance. Radical candor needs both.' },
      ],
    },
    {
      id: 'm7-l2',
      title: 'SBI: specific, observable, concrete',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'The "challenge directly" axis is operationalised by **SBI** — the most widely validated feedback model. It transforms vague judgments into specific, actionable observations.' },
        {
          type: 'steps',
          items: [
            '**Situation** — one specific instance, not a pattern: "In the board presentation on Tuesday…". Specificity makes it defensible and actionable.',
            '**Behaviour** — what you observably saw or heard, not your interpretation: "…when challenged on the Q3 projections, you added more context rather than addressing the specific concern." ("Seemed unconfident" is interpretation; this is behaviour.)',
            '**Impact** — the concrete consequence: "…two board members said afterward they left less confident than they came in." Impact is what makes it matter, not just noticed.',
          ],
        },
        { type: 'callout', tone: 'example', title: 'The complete SBI in use', md: '"I want to give you some feedback from Tuesday, and do it in a way that\'s useful — is this a good moment? *(wait)* When you were challenged on the Q3 projections, you responded by adding context — the macro picture, the supply chain — and the specific concern about the model wasn\'t addressed. The impact: two members came away less confident in the projections. I\'d like to explore what was driving that — and I have a suggestion if you want it."' },
        { type: 'p', md: 'Note the structure: **permission first**, SBI second, then open the door. And remember observation over evaluation: "you never listen" → *"when the topic changed mid-point, I felt cut off."* The fact is hard to argue with; the character verdict is impossible to resolve.' },
        {
          type: 'check',
          q: 'Which is the strongest piece of feedback?',
          options: [
            { text: '"You need to step up your game in client meetings."', correct: false, why: 'A vague verdict — no situation, behaviour, or impact, so nothing to act on.' },
            { text: '"Great job in there!"', correct: false, why: 'Positive, but vague — the receiver doesn\'t know what to repeat. Positive feedback needs SBI too.' },
            { text: '"In the Johnson meeting, when they raised pricing you deferred to me rather than addressing it; the impact was they saw us as uncertain about our value. Here\'s what I\'d suggest…"', correct: true, why: 'Specific situation, observable behaviour, concrete impact, then a path forward.' },
          ],
        },
      ],
    },
    {
      id: 'm7-l3',
      title: 'Receiving feedback — and the traps',
      estMin: 6,
      blocks: [
        { type: 'p', md: 'Receiving feedback well is as important as giving it, and harder — it requires the choice-point (Module 1) precisely when the automatic response (defend, deflect, shut down) is strongest. The four-step framework:' },
        {
          type: 'steps',
          items: [
            '**Listen completely** — don\'t evaluate while they\'re still talking. Resist the urge to rebut.',
            '**Thank genuinely** — even if it\'s poorly delivered or wrong. Any feedback is a willingness to engage.',
            '**Clarify specifically** — "can you give me one specific example of what you\'d prefer to see?" Vague feedback must be made specific before you can use it.',
            '**Process before responding** — "let me think about this and come back to you" is the choice-point in action, not avoidance. Separate what\'s accurate from what\'s uncomfortable, then decide.',
          ],
        },
        { type: 'callout', tone: 'warn', title: 'The traps to avoid', md: '**The sandwich** (praise-critique-praise) trains people to dread the "but" — state it directly; the care is in the delivery, not the cushion.\n\n**Generalising** ("you always…") invites the counter-example game — use one situation, one behaviour, one impact.\n\n**Delay** — feedback within 24–48 hours is most effective; a review that contains surprises is a failure of the relationship, not normal practice.' },
        { type: 'p', md: 'The most important rule in receiving: **never dismiss feedback in the moment**, even if you\'ll reject it on reflection. The dismissal closes the relationship; the clarifying question opens it.' },
        { type: 'tryit', md: 'Give one piece of SBI feedback you\'ve been postponing. Use the care-first opening: "I want to give you something worth hearing — and I want to do it in a way that\'s useful." Then watch how the specific structure changes how it lands.' },
      ],
    },
  ],
  principles: [
    'Radical Candor = care personally AND challenge directly; both are necessary.',
    'Feedback lands as a gift only when the receiver believes you care about their success.',
    'SBI turns a judgment they can\'t change into a behaviour they can.',
    'Receive feedback by clarifying, not defending; never dismiss in the moment.',
    'Specific and timely beats vague and delayed; the sandwich does not work.',
  ],
  practice: [
    { kind: 'observe', title: 'The quadrant audit', body: 'Place your last three pieces of feedback (given and received) on the Radical Candor 2x2. Where did they land, and what was the outcome?' },
    { kind: 'experiment', title: 'SBI construction', body: 'Write one piece of SBI feedback you\'ve been avoiding. Check: specific situation, observable behaviour, concrete impact. Read it aloud — would the receiver know exactly what to change?' },
    { kind: 'record', title: 'Feedback check', body: 'Record a conversation where you give or receive feedback. A VANTAGE evaluation reads whether you signalled care, used SBI, stayed specific, and (receiving) clarified rather than defended.' },
    { kind: 'reflect', title: 'The positive rewrite', body: 'Take three vague pieces of praise you\'ve given ("great job") and rewrite each with SBI. Notice how much more useful — and repeatable — they become.' },
  ],
  warningSigns: [
    'Softening the message until the problem is invisible (ruinous empathy)',
    'Truth without care that produces defensiveness (obnoxious aggression)',
    'Vague praise or character verdicts instead of SBI',
    'Defending or dismissing feedback in the moment',
  ],
  diagnosticSignals: ['Care signalled + challenge delivered directly', 'SBI: specific situation, observable behaviour, concrete impact', 'Specific not generalised; timely', 'Receiving: clarifies and processes vs. defends'],
  furtherReading: ['Kim Scott — Radical Candor', 'Center for Creative Leadership — SBI model & feedback effectiveness', 'Crucial Conversations — safety before content', 'Brené Brown — Dare to Lead (clear is kind)'],
  grounding: ['Radical Candor (Scott)', 'CCL (SBI)', 'Crucial Conversations', 'Dare to Lead'],
};
