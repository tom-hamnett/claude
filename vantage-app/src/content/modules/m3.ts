import type { Module } from '../../types';

export const m3: Module = {
  number: 3,
  slug: 'influence-stakeholders',
  title: 'Influence, Audience Calibration & Stakeholder Management',
  track: 'influence',
  oneLiner: 'Read the room and frame your message around what the audience actually values.',
  estReadMin: 18,
  whyItMatters:
    'Being right is not the same as being persuasive. Influence at senior levels is rarely about authority you hold and almost always about how well you calibrate to what the room values and how well you have aligned the key people before the meeting even starts. This module turns "office politics" from a dirty word into a learnable skill: reading interests, framing in others\' terms, and pre-wiring decisions.',
  learningObjectives: [
    'Distinguish positions (what people say they want) from interests (why).',
    'Frame the same message differently for different stakeholders without changing the truth.',
    'Read a room and adjust in real time to its cues.',
    'Pre-wire decisions by aligning stakeholders before the meeting.',
  ],
  keyTerms: [
    { term: 'Interests vs. positions', def: 'A position is the stated demand ("I need a 10% discount"). The interest is the real driver beneath it (predictability, fairness, looking good to a boss). Influence works on interests.' },
    { term: 'Pre-wiring', def: 'Aligning key stakeholders one-on-one before a group decision, so the meeting confirms a consensus rather than creating conflict.' },
    { term: 'Stakeholder map', def: 'A quick model of who cares about a decision, what each one values, and how much influence each holds.' },
  ],
  subAreas: ['Room-reading', 'Audience adaptation / framing', 'Informal influence & political awareness', 'Stakeholder mapping & pre-wiring', 'Alignment'],
  competencyIds: ['calibration'],
  lessons: [
    {
      id: 'm3-l1',
      title: 'Frame to the interest, not the position',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'When influence fails, it is usually because we argued our own case louder, in our own terms. The shift: stop pushing your position and start serving the other person\'s **interest** — the real motivation beneath what they say.' },
        { type: 'callout', tone: 'example', title: 'Same proposal, three interests', md: '**To finance:** "This reduces our downside risk." \n**To ops:** "This saves your team two days a week." \n**To the CEO:** "This is the story we tell the board next quarter." \nOne proposal. Three true frames, each aimed at a different interest.' },
        { type: 'p', md: 'This is not spin — it is translation. The fact does not change; the *frame* matches what the listener already cares about. To do it, you must first know what they care about, which means asking and listening (Module 5) before pitching.' },
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
      id: 'm3-l2',
      title: 'Read the room & pre-wire',
      estMin: 7,
      blocks: [
        { type: 'h', text: 'Reading the room' },
        { type: 'p', md: 'A room is constantly signalling: who leans in, who checks out, where the energy drops, whose face tightens at a particular word. Calibrating means noticing these cues and adjusting — slowing down where there\'s confusion, addressing the tightened face directly, dropping detail when eyes glaze.' },
        { type: 'callout', tone: 'tip', title: 'The check-in move', md: 'When you sense you\'ve lost the room, don\'t plough on. Ask: *"What\'s landing, what isn\'t?"* or *"What\'s the reaction in the room?"* It reads as confidence, not weakness.' },
        { type: 'h', text: 'Pre-wiring' },
        { type: 'p', md: 'The biggest lever in influence happens **before** the meeting. Decisions made in rooms are usually decisions confirmed in rooms — the real alignment happened in corridors and one-on-ones. Map who matters, learn each person\'s interest, and align them individually so the meeting ratifies a consensus instead of staging a fight.' },
        {
          type: 'steps',
          items: [
            'List the 3–5 people whose support actually decides this.',
            'For each: what do they value, what will they worry about?',
            'Have the one-on-one before the meeting; surface and resolve objections privately.',
            'Walk in with the room already mostly aligned.',
          ],
        },
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
  ],
  principles: [
    'Influence works on interests, not positions.',
    'Translate, don\'t spin — same truth, framed to what they value.',
    'The room is always signalling; calibrate in real time.',
    'Most decisions are won before the meeting — pre-wire.',
  ],
  practice: [
    { kind: 'observe', title: 'Interest-spotting', body: 'In conversations this week, when someone states a demand, silently ask "what\'s the interest beneath that?" Don\'t act — just practise seeing it.' },
    { kind: 'experiment', title: 'Reframe once', body: 'Take one ask you have and write it framed to each key stakeholder\'s interest. Use the right frame with each person.' },
    { kind: 'record', title: 'Calibration check', body: 'Record a meeting where you presented. Afterwards run a VANTAGE evaluation — it looks at whether you framed to the audience and responded to cues, or ran one script.' },
    { kind: 'reflect', title: 'Stakeholder map', body: 'For a current decision, map the 3–5 deciders, what each values, and whether you\'ve had the pre-wire conversation. Schedule the missing ones.' },
  ],
  warningSigns: [
    'One-size message regardless of audience',
    'Repeating your position louder when challenged',
    'Surprised by objections in meetings (missed pre-wiring)',
    'Ploughing on after the room has visibly disengaged',
  ],
  diagnosticSignals: ['Framing in the listener\'s terms', 'Responsiveness to cues / pushback', 'One-size vs. tailored message', 'References to stakeholder interests'],
  furtherReading: ['Fisher & Ury — Getting to Yes (interests vs. positions)', 'Wharton — influence & persuasive leadership', 'Bates ExPI — Intentionality, Inclusiveness'],
  grounding: ['Fisher & Ury', 'Wharton / CCL', 'Bates ExPI'],
};
