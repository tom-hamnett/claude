import type { Module } from '../../types';

export const m2: Module = {
  number: 2,
  slug: 'active-listening',
  title: 'Active Listening: Depth & Presence',
  track: 'connection',
  book: { part: 2, partTitle: 'Connection — Listening, Empathy, and Trust', chapter: 2, chapterTitle: 'Listening That Changes the Room' },
  oneLiner: 'Listen at a depth others can feel — track meaning, mirror, and ask the question that opens people up.',
  estReadMin: 20,
  whyItMatters:
    'The most influential people in any room are usually the best listeners, and the highest-leverage move in any conversation is a genuine question. Listening is also the convergence point of the whole curriculum: deep listening and calibrated questions are the same core skill that powers empathy, negotiation, sales, leadership, and every hard conversation. Master this and everything downstream gets easier.',
  learningObjectives: [
    'Listen to understand rather than to reply — and prove it with reflect-backs.',
    'Recognise which of the three levels of listening you are operating at, and reset to Level 2/3.',
    'Use the mirror — repeating the last few words, then silence — to draw people out.',
    'Ask open, calibrated questions and leave space for the answer.',
  ],
  keyTerms: [
    { term: 'Levels of listening', def: 'Level 1: listening to your own response. Level 2: fully focused on the other person. Level 3: attending to words, tone, and what sits underneath. Most people live at Level 1.' },
    { term: 'Reflect-back', def: 'Briefly paraphrasing what you heard before responding ("so the real worry is X") — the most reliable proof that you listened.' },
    { term: 'Mirror', def: 'Repeating the last two or three significant words the other person said, then going quiet — a low-effort prompt that makes them expand.' },
    { term: 'Calibrated question', def: 'An open "how/what" question that gently hands the other person the problem ("how can we make this work?"), letting them engage instead of resist.' },
  ],
  subAreas: ['Deep / reflective listening', 'Levels of listening', 'Mirroring', 'Interruption control', 'Question quality (open / calibrated)', 'Talk-time balance'],
  competencyIds: ['listening', 'inquiry'],
  lessons: [
    {
      id: 'm2-l1',
      title: 'Listening to understand',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'Most "listening" is just waiting to talk — we hear the first few words, decide what we think, and spend the rest of the other person\'s turn loading our reply. Real listening means tracking *them*, not your rebuttal, and proving it.' },
        { type: 'callout', tone: 'mechanic', title: 'The internal mechanic', md: '**1. Drop your answer** — notice the urge to reply and set it down.\n**2. Track their meaning** — what are they actually saying, and what\'s underneath it?\n**3. Reflect before you respond** — "so what matters most here is…" Let them confirm or correct.' },
        { type: 'p', md: 'The reflect-back is the move that changes everything. It proves you heard, it lets them correct your understanding, and — counter-intuitively — it makes *you* more persuasive, because people will not be moved by someone who hasn\'t understood them.' },
        {
          type: 'goodbad',
          rows: [
            { dimension: 'Someone shares a problem', poor: 'Jumps straight to advice / your own similar story.', good: '"So the part that\'s really weighing on you is the timeline — have I got that right?"' },
            { dimension: 'They make a point', poor: 'Brief "ok" then pivots to your agenda.', good: 'Builds on their point before adding yours.' },
            { dimension: 'They\'re upset', poor: 'Tries to fix the feeling away.', good: 'Names it: "that sounds genuinely frustrating."' },
          ],
        },
      ],
    },
    {
      id: 'm2-l2',
      title: 'The three levels — and the mirror',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'Listening happens at three levels. **Level 1** is internal: you are listening to your own thoughts, your rebuttal, your next point. **Level 2** is focused: your attention is fully on the other person. **Level 3** is global: you take in their words, their tone, and what sits underneath. Most professionals spend most conversations at Level 1 and believe they are listening.' },
        { type: 'callout', tone: 'key', title: 'Catch the drop, and reset', md: 'The skill is not staying at Level 3 forever — nobody does. It is *noticing* when you\'ve dropped to Level 1 (you\'re rehearsing your reply) and deliberately resetting your attention to the person in front of you.' },
        { type: 'h', text: 'The mirror' },
        { type: 'p', md: 'The simplest Level-2 tool is the **mirror**: repeat the last two or three significant words the other person said, with genuine curiosity, then go quiet. It costs almost nothing, signals that you are tracking them, and reliably makes them elaborate — often revealing what they had not planned to say.' },
        { type: 'callout', tone: 'example', title: 'The mirror in use', md: 'Them: "…and honestly the timeline is just not realistic."\nYou: "Not realistic?" *(then silence)*\nThem: "Right — because the data team is already underwater, and if we promise Friday we\'ll miss it and look worse than if we\'d said next week."' },
      ],
    },
    {
      id: 'm2-l3',
      title: 'The highest-leverage move: questions',
      estMin: 6,
      blocks: [
        { type: 'p', md: 'Across leadership, negotiation, and sales, the same discovery keeps being made: **questions outperform statements.** A good question shifts you from advocating to understanding, signals confidence (you don\'t need to fill the air with your own answer), and makes the other person do the thinking.' },
        { type: 'h', text: 'What makes a question good' },
        {
          type: 'list',
          items: [
            '**Open, not closed.** "What\'s your read?" opens; "Do you agree?" shuts down.',
            '**"What" and "how", not "why".** "Why did you do that?" triggers defence; "What were you weighing?" gets the same answer without the threat.',
            '**Calibrated.** "How can we make this work given the deadline?" hands them the problem so they engage.',
            '**Then: silence.** A question is only as good as the space you leave for the answer. Ask, then stop talking.',
          ],
        },
        {
          type: 'check',
          q: 'A teammate says "this plan is never going to work." The strongest first move is:',
          options: [
            { text: '"Yes it will, here\'s why." (defend the plan)', correct: false, why: 'Advocacy meets resistance with resistance and you learn nothing.' },
            { text: '"What would have to be true for it to work?" (open, calibrated) — then listen.', correct: true, why: 'A calibrated question surfaces the real objection and hands them the problem to solve with you.' },
            { text: '"Why are you always so negative?" (a "why" at the person)', correct: false, why: '"Why" at the person triggers defensiveness and kills the conversation.' },
          ],
        },
        { type: 'tryit', md: 'In your next conversation, run the "**ask one layer deeper**" drill: every time you\'d normally give your opinion, first ask one open question and listen fully. At least once, mirror their last few words and let the silence sit.' },
      ],
    },
  ],
  principles: [
    'Listen to understand, not to reply — and prove it with a reflect-back.',
    'Notice when you drop to Level 1 and reset to the person in front of you.',
    'The mirror plus silence draws out what people had not planned to say.',
    'Questions outperform statements; ask, then leave the silence.',
    '"What/how", never "why" at a person.',
  ],
  practice: [
    { kind: 'observe', title: 'Statement-or-question', body: 'For a week, silently classify each of your contributions as a statement or a question. Most people are shocked how rarely they ask.' },
    { kind: 'experiment', title: 'Mirror once a day', body: 'Once a day, when someone says something significant, mirror their last two or three words and go quiet. Notice how often they expand.' },
    { kind: 'record', title: 'Listening ratio', body: 'Record a conversation. Before reading the report, count your questions and judge how many were genuinely open. A VANTAGE evaluation measures question-rate, open-vs-closed ratio, talk-time and reflect-backs.' },
    { kind: 'reflect', title: 'Where did I drop to Level 1?', body: 'Recall a recent conversation. Identify the moment your attention went to your own reply. What were you missing while you were there?' },
  ],
  warningSigns: [
    'Talking the large majority of the airtime',
    'Closed or leading questions; "why" aimed at people',
    'Answering your own questions / filling the silence',
    'Jumping to advice or rebuttal before reflecting',
  ],
  diagnosticSignals: ['Reflect-backs / paraphrases', 'Mirrors followed by silence', 'Question rate and open-vs-closed ratio', 'Interruptions and talk-time ratio'],
  furtherReading: ['Chris Voss — Never Split the Difference (mirroring, calibrated questions)', 'Co-Active Coaching — the three levels of listening', 'Oren Jay Sofer — Say What You Mean (presence, listening)', 'Neil Rackham — SPIN Selling'],
  grounding: ['Voss', 'Co-Active (levels of listening)', 'Sofer / NVC', 'Rackham (SPIN)', 'Bates ExPI (Inclusiveness, Interactivity)'],
};
