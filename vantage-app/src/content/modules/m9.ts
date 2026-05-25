import type { Module } from '../../types';

export const m9: Module = {
  number: 9,
  slug: 'consultative-selling',
  title: 'Sales & Consultative Conversation',
  track: 'connection',
  oneLiner: 'Discover the real need before solutioning, and let the value sell itself.',
  estReadMin: 18,
  whyItMatters:
    'Even if you never carry a quota, you are selling constantly — ideas, plans, yourself. The consultative approach is the opposite of the pushy stereotype: you ask more than you tell, you discover the real problem before you propose anything, and you frame value in the buyer\'s terms so they talk themselves into it. In commercial roles these are the most measurable, revenue-linked skills there are; everywhere else, they are how good ideas get adopted.',
  learningObjectives: [
    'Run discovery before solutioning, using the SPIN question sequence.',
    'Listen commercially — for the problem, its cost, and the payoff of fixing it.',
    'Tie any solution explicitly to the stated need rather than feature-dumping.',
    'Drive a clear, agreed next step.',
  ],
  keyTerms: [
    { term: 'Consultative selling', def: 'A two-way, question-led approach: understand the customer\'s situation and problem deeply, then tailor a solution — instead of pitching features.' },
    { term: 'SPIN', def: 'Neil Rackham\'s discovery sequence: Situation → Problem → Implication → Need-payoff questions, built from analysis of thousands of real sales calls.' },
    { term: 'Need-payoff question', def: 'A question that gets the buyer to articulate the value of solving the problem ("what would fixing this be worth?") — so they sell themselves.' },
  ],
  subAreas: ['Discovery & questioning (SPIN)', 'Consultative listening', 'Demo / storytelling to the need', 'Commercial framing / value articulation', 'Next-step / qualification'],
  competencyIds: ['consultative', 'inquiry'],
  lessons: [
    {
      id: 'm9-l1',
      title: 'Discovery before solution: SPIN',
      estMin: 8,
      blocks: [
        { type: 'p', md: 'The weak version of selling is pitch-first: lead with your features and hope something sticks. The strong version is discovery-first: understand the problem so well that the solution becomes obvious — to *them*. Rackham\'s SPIN sequence, drawn from analysing thousands of real calls, is the most reliable discovery ladder.' },
        {
          type: 'steps',
          items: [
            '**Situation** — understand the context: "How does this work for you today?"',
            '**Problem** — surface the difficulty: "Where does that break down?"',
            '**Implication** — draw out the cost: "What does that cost you when it happens?"',
            '**Need-payoff** — let them state the value: "What would fixing it be worth?"',
          ],
        },
        { type: 'callout', tone: 'key', title: 'Why it works', md: 'By the time you reach need-payoff, the *buyer* has articulated the problem, its cost, and the value of solving it. You are no longer pushing — you are helping them act on a conclusion they reached themselves.' },
        {
          type: 'goodbad',
          rows: [
            { dimension: 'Opening', poor: 'Launches into the demo and feature list.', good: 'Spends the first third of the call understanding their situation and problem.' },
            { dimension: 'Questioning', poor: 'Runs a checklist of questions, not listening to answers.', good: 'Follows the thread — each question builds on the last answer.' },
            { dimension: 'Objection', poor: 'Talks past it to the next feature.', good: 'Treats it as a need to understand: "say more about that concern."' },
          ],
        },
      ],
    },
    {
      id: 'm9-l2',
      title: 'Frame value & close',
      estMin: 6,
      blocks: [
        { type: 'p', md: 'Once you understand the need, present **only** the part of your solution that solves it — framed in their terms (their metric, their problem, their words), not as a feature tour. The discipline is restraint: a tailored, two-line answer to their actual problem beats a ten-feature pitch every time.' },
        { type: 'callout', tone: 'example', title: 'Feature-dump → value frame', md: '**Feature-dump:** "We have X, Y, Z, and also Q and R…" \n**Value frame:** "You said the manual handoffs cost your team two days a week. This removes the handoff entirely — that\'s the two days back."' },
        { type: 'p', md: 'Then, as in negotiation, **close to a next step**. Consultative doesn\'t mean passive: end with a clear, agreed action — a trial, a follow-up with the decision-maker, a proposal by a date.' },
        {
          type: 'check',
          q: 'A prospect mentions a problem in passing. The most consultative next move is:',
          options: [
            { text: 'Jump in with the feature that addresses it.', correct: false, why: 'Solutioning too early skips the implication and need-payoff — they haven\'t felt the cost yet.' },
            { text: 'Ask what that problem costs them, and what fixing it would be worth, before proposing anything.', correct: true, why: 'Implication and need-payoff questions let the buyer build the value case themselves.' },
            { text: 'Note it and move on with your pitch.', correct: false, why: 'A stated problem is the opening for discovery — exploring it is the whole game.' },
          ],
        },
        { type: 'tryit', md: 'Before your next persuasive conversation (a sale, or pitching an idea), write one question for each SPIN rung. Use them as a loose map, not a script — and notice which one shifts the conversation most.' },
      ],
    },
  ],
  principles: [
    'Ask, don\'t pitch — discovery before solution.',
    'Run the SPIN ladder: situation → problem → implication → need-payoff.',
    'Sell to the stated need; frame value in their terms, not features.',
    'Always drive a clear, agreed next step.',
  ],
  practice: [
    { kind: 'observe', title: 'Pitch-or-discover', body: 'In persuasive conversations this week, notice your ratio of telling to asking. Where did you solution before you understood?' },
    { kind: 'experiment', title: 'SPIN one call', body: 'Run one real conversation with the SPIN ladder — spend the first third on situation and problem before proposing anything.' },
    { kind: 'record', title: 'Discovery check', body: 'Record a sales or pitch conversation. A VANTAGE evaluation reads your discovery depth, talk-time, whether you tied solution to need, and whether you closed.' },
    { kind: 'reflect', title: 'Value in their words', body: 'Take something you\'re trying to sell or persuade. Write the value in the other person\'s metric and words, not your features.' },
  ],
  warningSigns: [
    'Pitching / feature-dumping before understanding the problem',
    'Checklist questioning that ignores the answers',
    'No implication or need-payoff questions',
    'Ending without a clear next step',
  ],
  diagnosticSignals: ['Discovery questions before pitching', 'Listening for the need vs. talking past it', 'Tailoring solution to the stated problem', 'Driving a clear next step'],
  furtherReading: ['Neil Rackham — SPIN Selling', 'Consultative selling / discovery frameworks', 'Chris Voss — calibrated questions (overlap)'],
  grounding: ['Rackham (SPIN)', 'Consultative-selling canon', 'Yoodli design space'],
};
