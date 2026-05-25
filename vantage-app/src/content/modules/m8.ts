import type { Module } from '../../types';

export const m8: Module = {
  number: 8,
  slug: 'negotiation',
  title: 'Negotiation: Interests, BATNA & Calibrated Questions',
  track: 'influence',
  book: { part: 4, partTitle: 'High-Stakes Application — Conversations, Feedback, Negotiation, and Sales', chapter: 9, chapterTitle: 'Negotiation — Interests, Not Positions' },
  oneLiner: 'Work from interests, trade instead of conceding, and protect value to a clean close.',
  estReadMin: 20,
  whyItMatters:
    'Negotiation is not a special event reserved for deals — it is what happens any time two people want different things, which is constantly: scope, deadlines, budget, roles, who does what. People who negotiate well are not aggressive; they are prepared, curious about the other side\'s interests, and calm under pressure. This module gives you the principled-negotiation toolkit and the tactical-empathy moves that hold up when the other side pushes.',
  learningObjectives: [
    'Prepare interests and a BATNA before any negotiation that matters.',
    'Move past positions to the interests underneath — yours and theirs.',
    'Trade concessions instead of giving them away, and handle objections calmly.',
    'Anchor, frame value, and close to a concrete next step.',
  ],
  keyTerms: [
    { term: 'BATNA', def: 'Best Alternative To a Negotiated Agreement — what you\'ll do if this deal fails. Your real source of power; the better it is, the calmer you are.' },
    { term: 'Interests vs. positions', def: 'The position is the demand ("20% off"); the interest is the why (budget certainty, internal fairness). Deals are unlocked at the interest level.' },
    { term: 'Calibrated questions', def: 'Open "how/what" questions that hand the other side a problem to solve ("how am I supposed to do that?") — surfacing interests without conceding.' },
    { term: 'Trade, don\'t concede', def: 'Never give a concession for free; exchange it for something you value ("if X, then Y").' },
  ],
  subAreas: ['Preparation & BATNA', 'Interests vs. positions', 'Opening / anchoring', 'Trading / trade-offs', 'Objection handling', 'Value framing & close'],
  competencyIds: ['negotiation', 'inquiry'],
  lessons: [
    {
      id: 'm8-l1',
      title: 'Prepare: interests and your BATNA',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'Negotiations are won in preparation. Two things to know cold before you walk in: **your BATNA** (what you\'ll do if there\'s no deal) and **the interests on both sides** (the why beneath each demand). A strong BATNA is the source of calm — you can walk, so you don\'t have to flinch.' },
        { type: 'callout', tone: 'mechanic', title: 'The prep sheet', md: '**My interests:** what I actually need (rank them). \n**Their likely interests:** why might they want what they\'re asking? \n**My BATNA:** my best move if we don\'t agree. \n**Trades:** what\'s cheap for me but valuable to them, and vice versa.' },
        { type: 'p', md: 'The classic mistake is to anchor on a single position and bargain over it. The unlock is almost always one layer down: behind "we need it by Friday" might be "my board meets Monday" — which opens options that "Friday vs. next week" never could.' },
        {
          type: 'goodbad',
          rows: [
            { dimension: 'Facing a demand', poor: 'Argues the position harder.', good: '"Help me understand — what makes that date important?"' },
            { dimension: 'Under price pressure', poor: 'Drops the price to save the deal.', good: '"If we can flex on timeline, I can move on scope — what matters most?"' },
          ],
        },
      ],
    },
    {
      id: 'm8-l2',
      title: 'Trade, handle objections, close',
      estMin: 8,
      blocks: [
        { type: 'h', text: 'Trade, never concede' },
        { type: 'p', md: 'Every concession should buy something. The instant you give ground for free, you\'ve trained the other side to push for more. Use conditional language: *"If you can commit to a two-year term, then I can do that rate."* No "if," no "then."' },
        { type: 'h', text: 'Handle objections with tactical empathy' },
        { type: 'p', md: 'Objections are not attacks to repel; they are interests showing themselves. Meet them with calibrated questions and labeling (Module 3) rather than counter-arguments.' },
        { type: 'callout', tone: 'example', title: 'Tactical-empathy moves', md: '**Label:** "It sounds like the budget is the real sticking point." \n**Calibrated question:** "How am I supposed to make that work on our side?" \n**Accusation audit:** "You probably think this is going to be too expensive." \nEach keeps them talking and hands you the information to solve it.' },
        { type: 'h', text: 'Close to a next step' },
        { type: 'p', md: 'A negotiation without a concrete close drifts. End every important conversation with an explicit, agreed next step: who does what, by when. "So we\'re agreed on X; I\'ll send the revised terms today and you\'ll confirm by Thursday — yes?"' },
        {
          type: 'check',
          q: 'The buyer says "your price is too high." The strongest response is:',
          options: [
            { text: 'Immediately offer a discount to keep the deal alive.', correct: false, why: 'Conceding for free trains them to push harder and gives away value with no trade.' },
            { text: '"What\'s driving the budget concern — and what would have to be true for the value to be worth it?"', correct: true, why: 'A calibrated question surfaces the interest behind the objection, opening trades instead of caving.' },
            { text: '"It\'s actually very competitively priced." (defend)', correct: false, why: 'Counter-arguing an objection meets resistance with resistance and learns nothing about the real interest.' },
          ],
        },
        { type: 'tryit', md: 'For a negotiation you have coming up, fill the prep sheet: your interests (ranked), their likely interests, your BATNA, and two trades. Then write one calibrated question for the objection you most expect.' },
      ],
    },
  ],
  principles: [
    'A strong BATNA is the source of calm — know yours.',
    'Work the interests beneath the positions.',
    'Trade, never concede; every give buys something.',
    'Treat objections as interests; meet them with questions, not counter-arguments.',
    'Always close to a concrete, agreed next step.',
  ],
  practice: [
    { kind: 'observe', title: 'Position vs. interest', body: 'In everyday disagreements this week, silently identify the position each side states and guess the interest beneath it.' },
    { kind: 'experiment', title: 'One conditional trade', body: 'In a real negotiation (even a small one — scope, timing), practise one "if X, then Y" instead of a free concession.' },
    { kind: 'record', title: 'Trade & close check', body: 'Record a negotiation. A VANTAGE evaluation reads whether you surfaced interests, traded vs. conceded, handled objections calmly, and closed to a next step.' },
    { kind: 'reflect', title: 'BATNA audit', body: 'For a live negotiation, write your honest BATNA. If it\'s weak, your real job before negotiating is to strengthen it.' },
  ],
  warningSigns: [
    'Anchoring on one position and bargaining over it',
    'Conceding under pressure to save the deal',
    'Counter-arguing objections instead of exploring them',
    'No clear close / next step',
  ],
  diagnosticSignals: ['Uncovering the other side\'s interests', 'Trading / options vs. flat concession', 'Objection handling without defensiveness', 'Anchoring, value framing, clear close'],
  furtherReading: ['Fisher & Ury — Getting to Yes (interests, BATNA, objective criteria)', 'Chris Voss — Never Split the Difference (tactical empathy)', 'Richardson — consultative negotiations'],
  grounding: ['Fisher & Ury', 'Voss', 'Richardson / RICS'],
};
