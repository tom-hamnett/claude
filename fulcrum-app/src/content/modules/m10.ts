import type { Module } from '../../types';

export const m10: Module = {
  number: 10,
  slug: 'deliberate-practice',
  title: 'Self-Awareness, Habit Change & Deliberate Practice',
  track: 'practice',
  oneLiner: 'Turn feedback into one focus at a time, practised in real life, until it sticks.',
  estReadMin: 16,
  whyItMatters:
    'This is the module that makes all the others work. The reason training usually fails is the "transfer problem": people learn skills in a workshop that never show up in real meetings. The fix is not more content — it is a deliberate-practice loop run against your real conversations. This module teaches you how to use FULCRUM (and feedback in general) so that insight becomes habit, and habit becomes who you are.',
  learningObjectives: [
    'Recognise your recurring patterns across conversations, not just one-offs.',
    'Pick a single focus rather than trying to fix everything at once.',
    'Run a deliberate-practice loop: diagnose → focus → practise in real life → re-measure.',
    'Respond to feedback reflectively instead of defensively.',
  ],
  keyTerms: [
    { term: 'The transfer problem', def: 'The well-documented gap between learning a skill and it actually showing up in real behaviour. Closed only by practising in real situations with feedback.' },
    { term: 'Deliberate practice', def: 'Focused repetition of a specific sub-skill at the edge of your ability, with immediate feedback — the engine of real expertise.' },
    { term: 'One focus', def: 'Working a single behaviour at a time (e.g. "ask one more question") rather than diffusing effort across many.' },
  ],
  subAreas: ['Pattern recognition', 'Reflection', 'Goal-setting', 'Practice planning', 'Targeted drills', 'Progress / trend review'],
  competencyIds: ['self-awareness'],
  lessons: [
    {
      id: 'm10-l1',
      title: 'Why training usually fails — and the fix',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'You have probably been on a great communication course and changed nothing. That is not a personal failing — it is the **transfer problem**, and it is universal. Skills learned in a room reliably fail to transfer to real behaviour unless transfer is deliberately supported. Knowledge is not the bottleneck; practice with feedback is.' },
        { type: 'callout', tone: 'key', title: 'The loop that actually changes behaviour', md: '**Diagnose** a real conversation → **pick one focus** → **practise it in your next real conversation** → **re-measure** → repeat. \nFULCRUM is built to run exactly this loop: the evaluation is the feedback, the modules are the instruction, your real meetings are the practice ground.' },
        { type: 'p', md: 'The two most common ways people sabotage the loop: trying to fix five things at once (so none stick), and treating a single insight as "done" without ever practising it. Depth beats breadth. One behaviour, practised until automatic, then the next.' },
        {
          type: 'goodbad',
          rows: [
            { dimension: 'After feedback', poor: 'Notes ten things to improve; overwhelmed; changes nothing.', good: 'Picks the one highest-leverage focus for the next two weeks.' },
            { dimension: 'Practice', poor: 'Waits for the next workshop.', good: 'Practises the one focus in real conversations this week.' },
            { dimension: 'Review', poor: 'Never re-measures.', good: 'Re-uploads and checks whether the metric actually moved.' },
          ],
        },
      ],
    },
    {
      id: 'm10-l2',
      title: 'Run your loop',
      estMin: 6,
      blocks: [
        { type: 'h', text: 'See the pattern, not the incident' },
        { type: 'p', md: 'A single awkward moment tells you little; a pattern across conversations tells you what to work on. This is what the trend view is for — when "interrupts when stressed" or "talk-time creeps up in conflict" shows up across several uploads, you\'ve found a real focus, not a one-off.' },
        { type: 'h', text: 'Pick one focus and make it concrete' },
        {
          type: 'steps',
          items: [
            'Choose the single behaviour with the most leverage right now.',
            'Make it observable: not "listen better" but "ask one open question before giving my view."',
            'Attach it to a trigger: "every time I\'m about to disagree, first reflect back."',
            'Practise it in real conversations for two weeks; then re-measure.',
          ],
        },
        { type: 'h', text: 'Take feedback like a pro' },
        { type: 'p', md: 'How you receive feedback is itself a presence behaviour. The reflexive defence ("yes but…") shuts learning down. The professional move: get curious, ask for the specific example, thank them, and decide later what to act on. You don\'t have to agree with feedback to learn from it.' },
        {
          type: 'check',
          q: 'A FULCRUM report flags six things to improve. What\'s the best response?',
          options: [
            { text: 'Work on all six this week to improve fastest.', correct: false, why: 'Diffusing effort across six is how none of them stick — the classic failure mode.' },
            { text: 'Pick the single highest-leverage one, make it concrete, and practise it in real conversations for two weeks.', correct: true, why: 'One focus, made observable, practised in real life, then re-measured. That\'s the loop.' },
            { text: 'Feel discouraged and put it off.', correct: false, why: 'The report is a map, not a verdict — the point is to pick one thing and move.' },
          ],
        },
        { type: 'tryit', md: 'After your next evaluation, write your single focus for the next two weeks as a trigger-action rule: "When ___, I will ___." Put it where you\'ll see it before meetings.' },
      ],
    },
  ],
  principles: [
    'Knowledge isn\'t the bottleneck — practice with feedback is.',
    'One focus at a time; depth beats breadth.',
    'Make the focus observable and trigger-linked.',
    'Re-measure — if the metric didn\'t move, it didn\'t transfer.',
    'Receive feedback with curiosity, not defence.',
  ],
  practice: [
    { kind: 'observe', title: 'Spot your pattern', body: 'Look across your last few FULCRUM evaluations (or reflect on recent conversations). What shows up repeatedly? That recurring thing is your focus.' },
    { kind: 'experiment', title: 'One focus, two weeks', body: 'Choose a single trigger-action rule and run it in real conversations for two weeks. Don\'t add a second until the first is automatic.' },
    { kind: 'record', title: 'Re-measure', body: 'Re-upload a conversation after two weeks of practice and check the trend view: did the specific metric actually move?' },
    { kind: 'reflect', title: 'Feedback reflex audit', body: 'Recall the last piece of critical feedback you got. What was your first internal reaction? Write the curious version you\'d use next time.' },
  ],
  warningSigns: [
    'Trying to fix many things at once',
    'Insight with no practice or follow-through',
    'Never re-measuring',
    'Defensive "yes but" reflex to feedback',
  ],
  diagnosticSignals: ['Recognising patterns across interactions', 'Linking insight to a concrete action', 'Following through on a chosen focus', 'Reflective vs. defensive response to feedback'],
  furtherReading: ['Kirkpatrick — levels of training evaluation', 'Lacerenza et al. — leadership-training transfer', 'CCL — 70-20-10 development', 'Anders Ericsson — deliberate practice'],
  grounding: ['Kirkpatrick / Lacerenza (transfer)', 'CCL (70-20-10)', 'Deliberate-practice research'],
};
