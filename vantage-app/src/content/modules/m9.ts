import type { Module } from '../../types';

export const m9: Module = {
  number: 9,
  slug: 'influence-persuasion',
  title: 'Influence & Consultative Persuasion',
  track: 'clarity',
  book: { part: 3, partTitle: 'Clarity and Influence — Presence, Architecture, and Persuasion', chapter: 6, chapterTitle: 'Influence Without Authority — The Architecture of Persuasion (with Ch.10, The Consultative Conversation)' },
  oneLiner: 'Move people who don\'t have to follow you — frame to their interests, then let the value sell itself.',
  estReadMin: 24,
  whyItMatters:
    'Being right is not the same as being persuasive. Influence at senior levels is rarely about authority you hold and almost always about how well you calibrate to what people value — and, when you are selling anything (an idea, a plan, yourself, a product), how well you discover the real need before you propose. This module merges the architecture of ethical persuasion with the consultative conversation: read interests, frame in others\' terms, run discovery, and frame value so people talk themselves into it.',
  learningObjectives: [
    'Distinguish positions (what people say) from interests (why), and frame to the interest.',
    'Use the ethical levers of influence and read/lead the room in real time.',
    'Run discovery before solutioning, using the SPIN question sequence.',
    'Frame value in the other person\'s terms and drive a clear next step.',
  ],
  keyTerms: [
    { term: 'Interests vs. positions', def: 'A position is the stated demand ("I need a 10% discount"). The interest is the real driver beneath it (predictability, fairness, looking good to a boss). Influence works on interests.' },
    { term: 'The six principles of influence', def: 'Cialdini\'s ethical levers: reciprocity, commitment/consistency, social proof, authority, liking, and scarcity.' },
    { term: 'Pre-wiring', def: 'Aligning key stakeholders one-on-one before a group decision, so the meeting confirms a consensus rather than creating conflict.' },
    { term: 'SPIN', def: 'Neil Rackham\'s discovery sequence: Situation → Problem → Implication → Need-payoff questions, built from analysis of thousands of real sales calls.' },
  ],
  subAreas: ['Interests over positions', 'Ethical influence levers', 'Room-reading & pre-wiring', 'Consultative discovery (SPIN)', 'Value framing', 'Next-step / close'],
  competencyIds: ['calibration', 'consultative', 'inquiry'],
  lessons: [
    {
      id: 'm9-l1',
      title: 'Frame to the interest, not the position',
      estMin: 6,
      blocks: [
        { type: 'p', md: 'When influence fails, it is usually because we argued our own case louder, in our own terms. The shift: stop pushing your position and start serving the other person\'s **interest** — the real motivation beneath what they say.' },
        { type: 'callout', tone: 'example', title: 'Same proposal, three interests', md: '**To finance:** "This reduces our downside risk." \n**To ops:** "This saves your team two days a week." \n**To the CEO:** "This is the story we tell the board next quarter." \nOne proposal. Three true frames, each aimed at a different interest.' },
        { type: 'p', md: 'This is not spin — it is translation. The fact does not change; the *frame* matches what the listener already cares about. To do it, you must first know what they care about, which means asking and listening (Module 2) before pitching.' },
        {
          type: 'goodbad',
          rows: [
            { dimension: 'Pitching a project', poor: 'Same deck to every audience; leads with what excites *you*.', good: 'Reorders the same content to lead with each audience\'s top interest.' },
            { dimension: 'Facing pushback', poor: 'Repeats the original argument, louder.', good: '"What\'s your main concern here?" — then frames to that.' },
          ],
        },
      ],
    },
    {
      id: 'm9-l2',
      title: 'Ethical levers, reading the room & pre-wiring',
      estMin: 7,
      blocks: [
        { type: 'h', text: 'The ethical levers' },
        { type: 'p', md: 'Cialdini\'s six principles describe how people are honestly moved: **reciprocity** (give first), **commitment/consistency**, **social proof**, **authority**, **liking**, and **scarcity**. Used transparently they are persuasion; used to trick they are manipulation — and people feel the difference. Pick the one that genuinely fits and use it openly.' },
        { type: 'h', text: 'Reading the room' },
        { type: 'p', md: 'A room is constantly signalling: who leans in, who checks out, where the energy drops, whose face tightens at a particular word. Calibrating means noticing these cues and adjusting — slowing down where there\'s confusion, addressing the tightened face directly, dropping detail when eyes glaze.' },
        { type: 'callout', tone: 'tip', title: 'The check-in move', md: 'When you sense you\'ve lost the room, don\'t plough on. Ask: *"What\'s landing, what isn\'t?"* It reads as confidence, not weakness.' },
        { type: 'h', text: 'Pre-wiring' },
        { type: 'p', md: 'The biggest lever in influence happens **before** the meeting. Decisions made in rooms are usually decisions confirmed in rooms — the real alignment happened in corridors and one-on-ones. Map who matters, learn each person\'s interest, and align them individually so the meeting ratifies a consensus instead of staging a fight.' },
        {
          type: 'check',
          q: 'Your proposal got ambushed and died in a big meeting. The most useful lesson is usually:',
          options: [
            { text: 'You needed a better deck.', correct: false, why: 'Decks rarely save a proposal that wasn\'t pre-wired. The failure happened before the room.' },
            { text: 'You should have aligned the key stakeholders one-on-one beforehand.', correct: true, why: 'Pre-wiring turns meetings into confirmations. Surprises in the room mean missing one-on-ones.' },
            { text: 'You should argue harder next time.', correct: false, why: 'Volume rarely overcomes unsurfaced objections; private alignment does.' },
          ],
        },
      ],
    },
    {
      id: 'm9-l3',
      title: 'Discovery before solution: SPIN',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'Persuasion and selling share one engine: understand the problem so well that the solution becomes obvious — to *them*. The weak version is pitch-first: lead with features and hope something sticks. The strong version is discovery-first. Rackham\'s SPIN sequence, drawn from thousands of real calls, is the most reliable discovery ladder.' },
        {
          type: 'steps',
          items: [
            '**Situation** — understand the context: "How does this work for you today?"',
            '**Problem** — surface the difficulty: "Where does that break down?"',
            '**Implication** — draw out the cost: "What does that cost you when it happens?"',
            '**Need-payoff** — let them state the value: "What would fixing it be worth?"',
          ],
        },
        { type: 'callout', tone: 'key', title: 'Why it works', md: 'By the time you reach need-payoff, the *other person* has articulated the problem, its cost, and the value of solving it. You are no longer pushing — you are helping them act on a conclusion they reached themselves.' },
        {
          type: 'goodbad',
          rows: [
            { dimension: 'Opening', poor: 'Launches into the demo and feature list.', good: 'Spends the first third understanding their situation and problem.' },
            { dimension: 'Questioning', poor: 'Runs a checklist, not listening to answers.', good: 'Follows the thread — each question builds on the last answer.' },
            { dimension: 'Objection', poor: 'Talks past it to the next feature.', good: 'Treats it as a need to understand: "say more about that concern."' },
          ],
        },
      ],
    },
    {
      id: 'm9-l4',
      title: 'Frame value & close',
      estMin: 6,
      blocks: [
        { type: 'p', md: 'Once you understand the need, present **only** the part of your solution that solves it — framed in their terms (their metric, their problem, their words), not as a feature tour. The discipline is restraint: a tailored, two-line answer to their actual problem beats a ten-feature pitch every time.' },
        { type: 'callout', tone: 'example', title: 'Feature-dump → value frame', md: '**Feature-dump:** "We have X, Y, Z, and also Q and R…" \n**Value frame:** "You said the manual handoffs cost your team two days a week. This removes the handoff entirely — that\'s the two days back."' },
        { type: 'p', md: 'Then **close to a next step**. Influence and consultative conversations alike drift without one: end with a clear, agreed action — a trial, a follow-up with the decision-maker, a proposal by a date.' },
        {
          type: 'check',
          q: 'A prospect mentions a problem in passing. The most consultative next move is:',
          options: [
            { text: 'Jump in with the feature that addresses it.', correct: false, why: 'Solutioning too early skips the implication and need-payoff — they haven\'t felt the cost yet.' },
            { text: 'Ask what that problem costs them, and what fixing it would be worth, before proposing anything.', correct: true, why: 'Implication and need-payoff questions let the buyer build the value case themselves.' },
            { text: 'Note it and move on with your pitch.', correct: false, why: 'A stated problem is the opening for discovery — exploring it is the whole game.' },
          ],
        },
        { type: 'tryit', md: 'Before your next persuasive conversation, write the other person\'s top interest in one line, one question for each SPIN rung, and the value framed in their words. Use them as a loose map, not a script.' },
      ],
    },
  ],
  principles: [
    'Influence works on interests, not positions — translate, don\'t spin.',
    'Use ethical levers transparently; people feel manipulation.',
    'Most decisions are won before the meeting — pre-wire.',
    'Ask, don\'t pitch — discovery before solution (SPIN).',
    'Frame value in their terms, and always close to a clear next step.',
  ],
  practice: [
    { kind: 'observe', title: 'Interest & pitch-or-discover', body: 'This week, when someone states a demand, silently ask "what\'s the interest beneath that?" — and notice your own ratio of telling to asking in persuasive moments.' },
    { kind: 'experiment', title: 'Reframe + SPIN one conversation', body: 'Take one ask and frame it to each key stakeholder\'s interest. In one persuasive conversation, spend the first third on situation and problem before proposing.' },
    { kind: 'record', title: 'Influence check', body: 'Record a meeting where you presented or pitched. A VANTAGE evaluation reads whether you framed to the audience, ran discovery, tied solution to need, and closed.' },
    { kind: 'reflect', title: 'Stakeholder map & value in their words', body: 'For a current decision, map the 3–5 deciders and each one\'s interest; schedule the missing pre-wires. Then write the value of your idea in the other person\'s metric, not your features.' },
  ],
  warningSigns: [
    'One-size message regardless of audience; repeating your position louder',
    'Surprised by objections in meetings (missed pre-wiring)',
    'Pitching / feature-dumping before understanding the problem',
    'No implication/need-payoff questions; ending without a clear next step',
  ],
  diagnosticSignals: ['Framing in the listener\'s terms', 'Responsiveness to cues / pushback', 'Discovery questions before pitching', 'Tailoring solution to the need; driving a next step'],
  furtherReading: ['Robert Cialdini — Influence', 'Fisher & Ury — Getting to Yes (interests)', 'Neil Rackham — SPIN Selling', 'Keenan — Gap Selling', 'Dale Carnegie — How to Win Friends and Influence People'],
  grounding: ['Cialdini', 'Fisher & Ury', 'Rackham (SPIN)', 'Gap Selling', 'Carnegie', 'Bates ExPI (Intentionality)'],
};
