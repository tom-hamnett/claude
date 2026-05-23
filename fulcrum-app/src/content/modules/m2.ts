import type { Module } from '../../types';

export const m2: Module = {
  number: 2,
  slug: 'strategic-communication',
  title: 'Strategic & Concise Communication',
  track: 'clarity',
  oneLiner: 'Lead with the answer, structure top-down, and land the point at the right altitude.',
  estReadMin: 18,
  whyItMatters:
    'Careers stall not because people are wrong, but because they take too long to be right out loud. Senior audiences decide in seconds whether you are worth listening to, and they reward the person who lands the point fast and at the right level. This module gives you the structures — recommendation-first, the pyramid, altitude control — that make you sound like you already operate a level up.',
  learningObjectives: [
    'Lead with your recommendation or headline instead of building up to it.',
    'Structure any message top-down using the pyramid principle.',
    'Match "altitude" — level of detail — to your audience.',
    'Cut the words between you and your point.',
  ],
  keyTerms: [
    { term: 'Recommendation-first (BLUF)', def: 'Bottom Line Up Front: state the answer, decision, or ask in the first sentence, then support it.' },
    { term: 'Pyramid principle', def: 'Barbara Minto\'s structure: lead with the single governing thought, supported by a few grouped arguments, each supported by detail.' },
    { term: 'Altitude', def: 'The level of abstraction you speak at. Executives want 30,000 feet; specialists want ground level. Matching altitude is half of being understood.' },
  ],
  subAreas: ['Recommendation-first framing', 'Message architecture (pyramid)', 'Brevity & synthesis', 'Altitude / decision clarity', 'Clarity under pressure'],
  competencyIds: ['conciseness'],
  lessons: [
    {
      id: 'm2-l1',
      title: 'Lead with the answer',
      estMin: 6,
      blocks: [
        { type: 'p', md: 'Most people communicate the way they *think* — bottom-up. They walk you through the context, the analysis, the considerations, and *then*, finally, the conclusion. It feels thorough. To a busy listener it feels like waiting. By the time the point arrives, attention is gone.' },
        { type: 'p', md: 'Flip it. **State the conclusion first**, then support it. This is "recommendation-first" or BLUF — Bottom Line Up Front. It signals seniority because it shows you know what matters and respects the listener\'s time.' },
        {
          type: 'goodbad',
          rows: [
            { dimension: 'Status update', poor: '"So we looked at three vendors, and vendor A had X, vendor B had Y… [3 mins later] …so I think we go with B."', good: '"Recommendation: go with vendor B. Three reasons — then the one risk."' },
            { dimension: 'Asking for a decision', poor: 'Long context, hoping they infer the ask.', good: '"I need a decision on budget by Thursday. Here\'s the choice."' },
            { dimension: 'Answering a question', poor: '"Well, it depends, there are a few factors…"', good: '"Short answer: yes, with one caveat. The caveat is…"' },
          ],
        },
        {
          type: 'callout',
          tone: 'tip',
          title: 'The headline test',
          md: 'Before you speak, finish this sentence in your head: *"If they remember one line, it should be ___."* Say that line first.',
        },
      ],
    },
    {
      id: 'm2-l2',
      title: 'Structure with the pyramid',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'Once you\'ve led with the answer, support it with structure. The pyramid principle: one **governing thought** at the top, supported by **three (ish) grouped arguments**, each supported by detail. The magic is that the listener always knows where they are.' },
        {
          type: 'steps',
          items: [
            'Governing thought: the single thing you want them to believe or do.',
            'Key lines: the 2–4 reasons it\'s true (grouped, mutually exclusive).',
            'Support: the evidence under each — used only if asked.',
          ],
        },
        { type: 'p', md: 'Signposting makes the structure audible: *"There are three things. First… second… third."* Listeners relax when they can count.' },
        {
          type: 'callout',
          tone: 'mechanic',
          title: 'One idea per breath',
          md: 'Long, subordinate-clause-laden sentences are where points go to die. A useful internal rule: **one idea per breath.** Short sentences. The pause between them does the structuring.',
        },
        {
          type: 'check',
          q: 'Your exec interrupts your detailed analysis with "What\'s the headline?" What does this tell you?',
          options: [
            { text: 'They\'re impatient and you should talk faster.', correct: false, why: 'Speed isn\'t the fix — structure is. Faster bottom-up is still bottom-up.' },
            { text: 'You buried the lede; lead with the governing thought, then offer detail on request.', correct: true, why: 'The interrupt is a structure signal. Recommendation-first, support on demand.' },
            { text: 'They don\'t care about rigour.', correct: false, why: 'They care about it in the right order — answer first, evidence available beneath.' },
          ],
        },
      ],
    },
    {
      id: 'm2-l3',
      title: 'Altitude control',
      estMin: 5,
      blocks: [
        { type: 'p', md: 'The same content fails or lands depending on **altitude** — how high or low you pitch the detail. A board wants the 30,000-foot view and the one number that matters. An engineer wants the mechanism. Speaking at the wrong altitude reads as "doesn\'t get it," even when you\'re completely right.' },
        {
          type: 'table',
          columns: ['Audience', 'Altitude', 'What they want first'],
          rows: [
            ['Board / exec', '30,000 ft', 'The decision, the risk, the number'],
            ['Cross-functional peers', '10,000 ft', 'The trade-offs and what you need from them'],
            ['Your team / specialists', 'Ground', 'The mechanism, the how, the detail'],
          ],
        },
        { type: 'callout', tone: 'example', title: 'Same fact, three altitudes', md: '**Board:** "We\'ll hit the deadline; the only risk is vendor sign-off."\n\n**Peers:** "Timeline\'s fine if legal turns the contract around in a week — can you help?"\n\n**Team:** "Here\'s the dependency graph; the vendor contract is on the critical path at step 4."' },
        { type: 'tryit', md: 'Take something you need to communicate this week. Write the **one headline sentence**, then write it at all three altitudes. Notice how the words change while the truth doesn\'t.' },
      ],
    },
  ],
  principles: [
    'Recommendation first — the answer, then the support.',
    'Structure top-down; signpost so the listener can count.',
    'Match altitude to the audience; the wrong altitude reads as not "getting it".',
    'Brevity is respect: cut the words between you and your point.',
  ],
  practice: [
    { kind: 'observe', title: 'Lede-watch', body: 'For a week, in your own emails and updates, find where the actual point is. Is it in sentence one — or paragraph three? Just notice.' },
    { kind: 'experiment', title: 'Headline-first', body: 'In one meeting and three emails, force yourself to lead with the recommendation/ask in the first sentence. Support only on request.' },
    { kind: 'record', title: 'Time-to-point', body: 'Record an update and time how long until your main point lands. Then run a FULCRUM evaluation — it measures words-before-the-ask and structure markers.' },
    { kind: 'reflect', title: 'The 30-second version', body: 'Pick a complex topic and write the version you\'d give if you had 30 seconds in a lift. That is usually the version you should have led with.' },
  ],
  warningSigns: [
    'Building context for minutes before the point lands',
    'Being interrupted with "what\'s the headline / so what?"',
    'Long sentences with stacked clauses; no audible structure',
    'Same level of detail regardless of audience',
  ],
  diagnosticSignals: ['Recommendation-first vs. bottom-up', 'Time-to-point / words-before-the-ask', 'Structure markers ("three things")', 'Over-detail and tangents'],
  furtherReading: ['Barbara Minto — The Pyramid Principle', 'Hewlett / CTI — communication component of executive presence'],
  grounding: ['Hewlett / CTI', 'Minto Pyramid Principle', 'Spitzberg & Cupach (coordination)'],
};
