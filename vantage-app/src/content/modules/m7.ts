import type { Module } from '../../types';

export const m7: Module = {
  number: 7,
  slug: 'assertiveness',
  title: 'Needs, Requests, Boundaries & Assertiveness',
  track: 'influence',
  oneLiner: 'Own what you need, ask for it clearly, and set boundaries — directly and kindly.',
  estReadMin: 16,
  whyItMatters:
    'A surprising share of communication failures are not conflicts at all — they are things never clearly asked for. People hint, soften, over-apologise, or stay quiet, then feel resentful when their unspoken need isn\'t met. Assertiveness is the bridge between passivity (you disappear) and aggression (you steamroll): saying what you need as a clear, doable request, and holding a boundary without apology. It is also, for many capable people, the single biggest unlock.',
  learningObjectives: [
    'Turn a vague need or complaint into a concrete, doable request.',
    'Distinguish a request (allows "no") from a demand (punishes "no").',
    'Say no cleanly, without over-justifying.',
    'Set and hold a boundary while staying warm.',
  ],
  keyTerms: [
    { term: 'Request vs. demand', def: 'A request leaves the other person genuinely free to decline; a demand punishes refusal. People can feel the difference instantly, and it changes how they respond.' },
    { term: 'Clear ask', def: 'A specific, observable, doable action with a who/what/when — "send me a one-line status by Friday noon," not "communicate better."' },
    { term: 'Boundary', def: 'A limit on what you will accept, stated calmly and held without anger or apology.' },
  ],
  subAreas: ['Owning your needs', 'Concrete requests', 'Boundary-setting', 'Directness', 'Saying no', 'Checking agreement'],
  competencyIds: ['assertiveness', 'observation'],
  lessons: [
    {
      id: 'm7-l1',
      title: 'From complaint to clear request',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'Most unmet needs never make it into a request. They come out as complaints ("nobody keeps me in the loop"), hints ("it\'d be nice if…"), or silence — and then resentment. The skill is to convert the need into a **concrete, doable ask**: specific, observable, with a who/what/when.' },
        { type: 'callout', tone: 'mechanic', title: 'The conversion', md: '**Feeling → need → request.** \n"I\'m frustrated" (feeling) → "I need to know where things stand" (need) → "Could you send a one-line status by Friday noon?" (request). \nThe request is the only part the other person can actually act on.' },
        {
          type: 'goodbad',
          rows: [
            { dimension: 'Wanting updates', poor: '"You never tell me what\'s going on."', good: '"Would you text me by 5 if you\'ll be late?"' },
            { dimension: 'Wanting better work', poor: '"Can you be more thorough?"', good: '"Can you add a risks section and proof it before sending?"' },
            { dimension: 'Wanting respect in meetings', poor: 'Says nothing, fumes.', good: '"I\'d like to finish my point before we move on — that work?"' },
          ],
        },
      ],
    },
    {
      id: 'm7-l2',
      title: 'Requests, demands & the clean no',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'A real request leaves room for "no." A demand dressed as a request — where refusal will be punished with coldness or guilt — is felt instantly, and it erodes trust. Make genuine requests, and check they actually work for the other person: *"does that work for you?"* That small check converts a demand into a request.' },
        { type: 'h', text: 'Saying no cleanly' },
        { type: 'p', md: 'The flip side of assertiveness is the clean no. Over-explaining a refusal signals that you don\'t feel entitled to it and invites negotiation. A clean no is brief, warm, and firm — and usually needs no more than one sentence of reason.' },
        { type: 'callout', tone: 'example', title: 'The clean no', md: '"I can\'t take that on this week without dropping something — which would you like me to prioritise?" \n"That doesn\'t work for me, but here\'s what I can do instead." \nWarm. Firm. No paragraph of apology.' },
        {
          type: 'check',
          q: 'Which is a genuine request rather than a disguised demand?',
          options: [
            { text: '"You\'ll have the deck done by tonight, right?" (said with an edge)', correct: false, why: 'Refusal is clearly not safe here — that\'s a demand wearing a question mark.' },
            { text: '"Could you get the deck to me by tonight — and if that\'s not realistic, tell me and we\'ll re-plan?"', correct: true, why: 'It\'s specific, doable, and genuinely allows "no" — a request, not a demand.' },
            { text: '"It would be really great if maybe someone could possibly look at the deck."', correct: false, why: 'No clear who/what/when — so vague it can\'t be acted on or declined.' },
          ],
        },
        { type: 'tryit', md: 'Find one thing you\'ve been hinting at or stewing about. Write it as a clean request: specific action, who, by when, and a "does that work?" check.' },
      ],
    },
  ],
  principles: [
    'Convert feeling → need → concrete request; only the request is actionable.',
    'Make requests, not demands — leave a real "no" on the table.',
    'A clean no is brief, warm, and firm — no paragraph of apology.',
    'Kind and direct are not opposites; the best asks are both.',
  ],
  practice: [
    { kind: 'observe', title: 'Hint-watch', body: 'For a week, catch every time you hint, soften, or stay silent instead of asking. Just notice the pattern and the cost.' },
    { kind: 'experiment', title: 'One clean ask', body: 'Make one request you\'d normally hint at, in clear form: specific action + who + when + "does that work?"' },
    { kind: 'record', title: 'Ask audit', body: 'Record a meeting where you needed something. A VANTAGE evaluation reads whether your asks were specific and doable, or vague/hinted, and whether you over-softened.' },
    { kind: 'reflect', title: 'Your hardest no', body: 'Write the clean version of a "no" you\'ve been avoiding. One sentence of reason, one alternative if you have one.' },
  ],
  warningSigns: [
    'Complaints and hints instead of requests',
    'Vague asks with no who/what/when',
    'Over-apologising; can\'t say no without a paragraph',
    'Demands disguised as requests (refusal clearly unsafe)',
  ],
  diagnosticSignals: ['Specific actionable asks vs. hints/complaints', 'Saying no cleanly; boundaries', 'Over-softening / over-apologising', 'Request vs. demand framing; checking agreement'],
  furtherReading: ['Oren Jay Sofer — Say What You Mean (needs, requests)', 'Bates ExPI — Assertiveness', 'Crucial Conversations'],
  grounding: ['Sofer / NVC', 'Bates ExPI', 'Crucial Conversations'],
};
