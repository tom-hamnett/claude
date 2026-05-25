import type { Module } from '../../types';

export const m10: Module = {
  number: 10,
  slug: 'lateral-leadership',
  title: 'Lateral Leadership & Coalition Building',
  track: 'influence',
  book: { part: 4, partTitle: 'High-Stakes Application — Conversations, Feedback, Negotiation, and Sales', chapter: 11, chapterTitle: 'Leading Leaders — Influence in the Peer Layer' },
  oneLiner: 'Lead the people who don\'t report to you — peers, seniors, stakeholders — by negotiation, not authority.',
  estReadMin: 20,
  whyItMatters:
    'The hardest leadership challenge is rarely managing down — it is managing sideways: peers, senior colleagues, and stakeholders who have no obligation to follow you and their own priorities. This intensifies at every level; the higher you go, the more of your leadership is exercised through influence rather than instruction. Jeswald Salacuse\'s finding: peer leadership requires the negotiation mindset applied to every significant relationship — interest-discovery, reciprocity, and the slow construction of relational trust that converts compliance into commitment.',
  learningObjectives: [
    'Treat lateral leadership as an ongoing negotiation of mutual value, not a positional bargain.',
    'Build and sequence a coalition map across sponsors, allies, neutrals, skeptics, and blockers.',
    'Identify and win the informal influencers before the formal decision.',
    'Run an effective upward-influence conversation with a senior stakeholder.',
  ],
  keyTerms: [
    { term: 'Leadership negotiation', def: 'Salacuse\'s view that peer leadership is an ongoing exchange of value, trust, and commitment — built on shared interests, relationship, legitimacy, communication, commitment, trust, and reciprocity.' },
    { term: 'Coalition map', def: 'An influence strategy: identify the actors who must move, assess each one\'s stance and interest, plan the relationship investment, and sequence your approach.' },
    { term: 'Informal influencer', def: 'The person others look to before forming an opinion — often more important to win than the formal decision-maker, regardless of title.' },
  ],
  subAreas: ['Leadership as negotiation', 'Shared interests & reciprocity', 'Coalition mapping & sequencing', 'Informal influence networks', 'Upward influence', 'Relationship investment'],
  competencyIds: ['lateral', 'calibration'],
  lessons: [
    {
      id: 'm10-l1',
      title: 'Leadership is negotiated, not instructed',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'Leadership at the peer level is, at its core, a negotiation — not a positional bargain, but an ongoing exchange of value, trust, and mutual commitment. Authority produces compliance; relationship produces commitment. Salacuse names seven elements you can actively manage:' },
        {
          type: 'list',
          ordered: true,
          items: [
            '**Shared interests** — find where your interests genuinely overlap (the work of Module 9, applied to the relationship).',
            '**Relationship** — transactional relationships get transactional cooperation; investment is the precondition for everything else.',
            '**Legitimacy** — built from expertise, track record, and consistency between what you say and do.',
            '**Communication** — clear, consistent framing of your direction, or others fill the vacuum with their own.',
            '**Commitment** — specific, public commitments with a timeline outlast goodwill.',
            '**Trust** — competence, integrity, and (most leveraged) relational trust (Module 3).',
            '**Reciprocity** — giving first creates the conditions for receiving when you need it.',
          ],
        },
        { type: 'callout', tone: 'warn', title: 'The most common mistake', md: 'Contacting peers only when you need something. That is maintaining a list of contacts, not building a relationship — and the resources are mysteriously always unavailable when you ask.' },
      ],
    },
    {
      id: 'm10-l2',
      title: 'The coalition map & informal influencers',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'Before any significant lateral challenge — a change programme, a cross-functional initiative, a big resource request — build a **coalition map**. It is not a stakeholder list; it is an influence strategy.' },
        {
          type: 'steps',
          items: [
            'Identify the key actors — who must move, support, or simply not oppose for this to succeed.',
            'Assess each one\'s stance: **Sponsor** (will advocate), **Ally** (supportive), **Neutral** (could go either way), **Skeptic** (unaddressed concerns), **Blocker** (actively opposed).',
            'Identify their interests — not what you need from them, but what they need from the changed situation.',
            'Plan the relationship investment each needs before they move.',
            'Sequence: start with Sponsors and Allies, use their visible support to move Neutrals, then Skeptics, and address Blockers last and directly.',
          ],
        },
        { type: 'callout', tone: 'key', title: 'Win the informal influencers first', md: 'Every organisation has a formal power structure (the org chart) and an informal one (the people others look to before forming opinions). The formal decision is often a ratification of a conclusion the organisation already reached informally. Winning the informal influencers — by engaging them genuinely as peers, early, with information — moves the neutral middle before you have spoken to it.' },
        {
          type: 'check',
          q: 'A peer team keeps deprioritising shared work. The best first move is:',
          options: [
            { text: 'Escalate to senior leadership to force the priority.', correct: false, why: 'Escalating before addressing the peer\'s concern wins the formal battle and loses the war — they cooperate even less, and they know you went over their head.' },
            { text: '"What\'s making this hard to prioritise for your team? What would need to be different for it to move up your list?"', correct: true, why: 'Interest-discovery surfaces the real blocker and opens a negotiated path rather than a forced one.' },
            { text: 'Build a more detailed business case and resend it.', correct: false, why: 'A better argument rarely moves a conversation the other party isn\'t having with you; the interest and relationship are the lever.' },
          ],
        },
      ],
    },
    {
      id: 'm10-l3',
      title: 'The upward influence conversation',
      estMin: 6,
      blocks: [
        { type: 'p', md: 'Influencing people more senior than you — without authority, often without access — is the influence challenge most consistently avoided, because the power gap makes failure feel risky. There is a specific structure that respects their constraints:' },
        {
          type: 'steps',
          items: [
            '**Establish relevance through their priorities** — "You said [X] was your focus this year; I have something that speaks directly to that." (This invokes their own stated commitment.)',
            '**Be brief** — make the governing thought clear in ninety seconds (Module 5), then respond to questions. They will not give thirty minutes.',
            '**Be direct about what you need** — "Here\'s what I\'m asking for, and here\'s why it serves [their priority]." Senior leaders are comfortable with direct asks; they dislike people who take a long time to get to the point.',
            '**Offer the choice, not the prescription** — "I see two ways, here\'s the tradeoff — which would you prefer?" Respects their authority and makes the decision easy.',
          ],
        },
        { type: 'callout', tone: 'example', title: 'Win cooperation before approval', md: 'The CMO who needed the skeptical CTO\'s resources stopped building better business cases and spent three months genuinely understanding his world — discovering his real concern was technical debt, not ROI. She restructured the proposal to *reduce* complexity, and had the yes before she ever made the formal ask.' },
        { type: 'tryit', md: 'In one meeting where you need cooperation from someone who doesn\'t report to you, open by asking about their priorities: "Before I share what I need, I want to understand what\'s taking up most of your attention right now." Listen genuinely — then build your case from what you hear.' },
      ],
    },
  ],
  principles: [
    'Lateral leadership is negotiated, not instructed — authority gets compliance, relationship gets commitment.',
    'Invest in the relationship before you need it; reciprocity comes first.',
    'Map the coalition and sequence it: sponsors and allies first, blockers last and directly.',
    'Win the informal influencers before the formal decision.',
    'Upward: connect to their stated priority, be brief, be direct about the ask.',
  ],
  practice: [
    { kind: 'observe', title: 'Informal-influencer audit', body: 'In your organisation, who do people look to before forming opinions on significant initiatives? List them — and note whether they are on your radar for your current work.' },
    { kind: 'experiment', title: 'Relationship investment', body: 'Identify one person whose cooperation you need but haven\'t invested in. This week, have one conversation entirely about what they care about — no agenda beyond understanding.' },
    { kind: 'record', title: 'Lateral influence check', body: 'Record a cross-functional or stakeholder conversation. A VANTAGE evaluation reads whether you discovered their interests, invested before asking, and framed the ask around what they care about.' },
    { kind: 'reflect', title: 'The coalition map', body: 'For your most important current initiative, name each key actor, their stance, their primary interest, and the one investment you need to make before they will move.' },
  ],
  warningSigns: [
    'Relying on authority, mandate, or escalation to move peers',
    'Contacting people only when you need something',
    'Ignoring the blockers, or working around them',
    'Confusing formal authority with influence; missing the informal influencers',
  ],
  diagnosticSignals: ['Discovers interests/priorities before the ask', 'Invests in the relationship before needing it', 'Maps and sequences stakeholders', 'Upward: connects to their priority, brief, direct ask'],
  furtherReading: ['Jeswald Salacuse — Leading Leaders', 'Jeffrey Pfeffer — organisational power and influence', 'Amy Edmondson — psychological safety in cross-functional teams', 'Dale Carnegie — How to Win Friends and Influence People'],
  grounding: ['Salacuse (Leading Leaders)', 'Pfeffer', 'Edmondson', 'Carnegie', 'Dare to Lead'],
};
