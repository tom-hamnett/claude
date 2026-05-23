import type { Module } from '../../types';

export const m5: Module = {
  number: 5,
  slug: 'listening-trust',
  title: 'Empathy, Listening & Trust Building',
  track: 'connection',
  oneLiner: 'Hear what actually matters, ask the question that opens people up, and build trust.',
  estReadMin: 22,
  whyItMatters:
    'Presence is not only projection — it is connection. The most influential people in any room are usually the best listeners, and the highest-leverage move in any conversation is a genuine question. This module is also the convergence point of the whole curriculum: deep listening and calibrated questions are the same core skill that powers negotiation, sales, leadership, and every hard conversation. Master this and everything downstream gets easier.',
  learningObjectives: [
    'Listen to understand rather than to reply — and prove it with reflect-backs.',
    'Ask open, calibrated questions and leave space for the answer.',
    'Hear the feeling and need beneath what is said.',
    'Build trust and psychological safety so people bring their best.',
  ],
  keyTerms: [
    { term: 'Reflect-back', def: 'Briefly paraphrasing what you heard before responding ("so the real worry is X") — the most reliable proof that you listened.' },
    { term: 'Calibrated question', def: 'An open "how/what" question that gently hands the other person the problem ("how can we make this work?"), letting them engage instead of resist.' },
    { term: 'Labeling', def: 'Naming the other person\'s apparent emotion ("it sounds like this is frustrating") to defuse it and build rapport — from tactical empathy.' },
    { term: 'Psychological safety', def: 'The shared belief that it\'s safe to speak up, disagree, and be wrong — the precondition for honest, useful conversation.' },
  ],
  subAreas: ['Deep / reflective listening', 'Interruption control', 'Question quality (open / calibrated)', 'Acknowledgement & labeling', 'Relational awareness / warmth', 'Psychological safety'],
  competencyIds: ['listening', 'inquiry', 'trust'],
  lessons: [
    {
      id: 'm5-l1',
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
      id: 'm5-l2',
      title: 'The highest-leverage move: questions',
      estMin: 8,
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
        { type: 'callout', tone: 'example', title: 'The convergence in one ladder', md: 'Negotiation\'s "interests not positions," Voss\'s calibrated questions, and SPIN\'s discovery questions are the same skill: \n*"How does this work today?"* → *"Where does it break?"* → *"What does that cost you?"* → *"What would fixing it be worth?"*' },
        {
          type: 'check',
          q: 'A teammate says "this plan is never going to work." The strongest first move is:',
          options: [
            { text: '"Yes it will, here\'s why." (defend the plan)', correct: false, why: 'Advocacy meets resistance with resistance and you learn nothing.' },
            { text: '"What would have to be true for it to work?" (open, calibrated) — then listen.', correct: true, why: 'A calibrated question surfaces the real objection and hands them the problem to solve with you.' },
            { text: '"Why are you always so negative?" (a "why" at the person)', correct: false, why: '"Why" at the person triggers defensiveness and kills the conversation.' },
          ],
        },
      ],
    },
    {
      id: 'm5-l3',
      title: 'Feelings, needs & trust',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'Beneath positions are interests; beneath interests are **feelings and needs**. People rarely say "I need to feel respected" — they say "this is a waste of time." Hearing the need beneath the complaint is what lets you respond to the real thing.' },
        { type: 'callout', tone: 'tip', title: 'Label the feeling, name the need', md: 'Try: *"It sounds like you wanted more of a say in this — is that it?"* Labeling the feeling and naming the likely need defuses heat and makes people feel understood, which is the foundation of trust.' },
        { type: 'h', text: 'Building safety' },
        { type: 'p', md: 'Trust grows where it\'s safe to speak. You build safety by acknowledging contributions genuinely, inviting the quiet voice, crediting others, and making it explicitly okay to disagree. People bring their best to rooms where they won\'t be punished for honesty.' },
        { type: 'tryit', md: 'In your next conversation, run the "**ask one layer deeper**" drill: every time you\'d normally give your opinion, first ask one open question and listen fully. At least once, follow an answer with "say more about that."' },
      ],
    },
  ],
  principles: [
    'Listen to understand, not to reply — and prove it with a reflect-back.',
    'Questions outperform statements; ask, then leave the silence.',
    '"What/how", never "why" at a person.',
    'Hear the feeling and need beneath the words.',
    'Safety first: people open up where it\'s safe to be honest.',
  ],
  practice: [
    { kind: 'observe', title: 'Statement-or-question', body: 'For a week, silently classify each of your contributions as a statement or a question. Most people are shocked how rarely they ask.' },
    { kind: 'experiment', title: 'Ask one layer deeper', body: 'In one conversation, replace your first opinion with one open question and full listening. Follow at least one answer with "say more."' },
    { kind: 'record', title: 'Listening ratio', body: 'Record a conversation. Before reading the report, count your questions and judge how many were genuinely open. A FULCRUM evaluation measures question-rate, open-vs-closed ratio, talk-time and reflect-backs.' },
    { kind: 'reflect', title: 'Need beneath the complaint', body: 'Recall a recent complaint someone made to you. Write the feeling and the need that were probably underneath it. What would responding to *that* have looked like?' },
  ],
  warningSigns: [
    'Talking the large majority of the airtime',
    'Closed or leading questions; "why" aimed at people',
    'Answering your own questions / filling the silence',
    'Jumping to advice or rebuttal before reflecting',
  ],
  diagnosticSignals: ['Reflect-backs / paraphrases', 'Question rate and open-vs-closed ratio', 'Post-question silence', 'Interruptions and talk-time ratio'],
  furtherReading: ['Chris Voss — Never Split the Difference (calibrated questions, labeling)', 'Neil Rackham — SPIN Selling', 'Oren Jay Sofer — Say What You Mean (listening, needs)'],
  grounding: ['Sofer / NVC', 'Voss', 'Rackham (SPIN)', 'Spitzberg & Cupach (attentiveness)', 'Bates ExPI (Inclusiveness, Interactivity)'],
};
