import type { Module } from '../../types';

export const m1: Module = {
  number: 1,
  slug: 'executive-presence',
  title: 'Executive Presence & Leadership Narrative',
  track: 'presence',
  oneLiner: 'The composure, credibility, and story that make people see you as a leader.',
  estReadMin: 22,
  whyItMatters:
    'Executive presence is the single most common reason capable people are told they are "not ready" for the next level — and the least concretely explained. It is not a personality you are born with; it is a set of observable behaviours: how you hold yourself under pressure, how deeply you know your material, and how clearly you tell the story of where you are taking things. This module makes those behaviours visible and trainable, so "show more gravitas" stops being a fog and becomes a checklist.',
  learningObjectives: [
    'Define executive presence behaviourally — as composure, substance, and narrative — rather than as an innate trait.',
    'Recognise the specific signals that read as "senior" vs. "junior" in real conversations.',
    'Use the pause as your most reliable on-demand presence move.',
    'Build a one-line leadership narrative you can deploy in any high-stakes room.',
  ],
  keyTerms: [
    { term: 'Gravitas', def: 'The felt sense that someone has weight and substance — that they know their material and can be trusted under pressure. The largest component of executive presence.' },
    { term: 'The choice-point', def: 'The gap between something happening (a challenge, a silence) and your response. Presence lives in widening that gap so you can choose.' },
    { term: 'Leadership narrative', def: 'A short, repeatable account of who you are, what you stand for, and where you are taking things — the through-line beneath your individual contributions.' },
    { term: 'Six questions deep', def: 'Sylvia Ann Hewlett\'s test of substance: can you keep answering follow-ups several layers down without losing footing?' },
  ],
  subAreas: [
    'Gravitas & credibility ("know it cold")',
    'Composure & seniority signals',
    'Leadership story / narrative',
    'Authenticity & personal brand',
    'Vocal & physical command (delivery)',
  ],
  competencyIds: ['gravitas', 'composure'],
  lessons: [
    {
      id: 'm1-l1',
      title: 'What presence actually is',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'When people say someone "has presence", they reach for vague words — gravitas, authority, that *something*. The vagueness is the problem: you can\'t practise a vibe. So let\'s replace the vibe with three observable ingredients.' },
        {
          type: 'list',
          ordered: true,
          items: [
            '**Composure** — how you behave under pressure (challenge, silence, interruption). The clearest readout of presence.',
            '**Substance** — how well you know your material, several questions deep. The largest single component of gravitas.',
            '**Narrative** — the coherent story of who you are and where you are taking things, beneath any single contribution.',
          ],
        },
        { type: 'p', md: 'Notice what is *not* on the list: height, accent, extroversion, a deep voice, a expensive suit. Those are surface signals people sometimes mistake for presence — and treating them as the standard is exactly how "executive presence" becomes a biased, exclusionary code. FULCRUM scores effectiveness toward **your** goals in **your** style. Presence is behaviour, not costume.' },
        {
          type: 'callout',
          tone: 'key',
          title: 'The reframe that changes everything',
          md: 'Presence is not a fixed personality trait you either have or lack. It is a **set of specific behaviours under pressure** — and behaviours can be learned, measured, and improved. That is the entire premise of this product.',
        },
        {
          type: 'check',
          q: 'A colleague is told they "lack executive presence." Which response best reflects this module\'s view?',
          options: [
            { text: 'They need a more commanding voice and a sharper wardrobe.', correct: false, why: 'These are surface signals often mistaken for presence — and chasing them entrenches a biased standard.' },
            { text: 'Presence is innate; some people just have it.', correct: false, why: 'This is precisely the myth the module dismantles. Presence is behavioural and trainable.' },
            { text: 'We should identify which behaviours — composure, substance, narrative — are missing in real moments.', correct: true, why: 'Exactly. Turn the vague label into specific, observable behaviours you can practise.' },
          ],
        },
      ],
    },
    {
      id: 'm1-l2',
      title: 'Composure: the pause as your power move',
      estMin: 8,
      blocks: [
        { type: 'p', md: 'Under pressure — a pointed question, a silence after you speak, a challenge to your numbers — the gap between *stimulus* and *response* shrinks toward zero. You react: you speed up, defend, over-explain, or freeze. The skill of composure is widening that gap so you can **choose** your response. We call that gap the choice-point.' },
        {
          type: 'callout',
          tone: 'mechanic',
          title: 'The internal mechanic: a three-beat reset',
          md: '**1. Notice the activation** — the flash of heat, the urge to jump in. The urge *is* your cue.\n\n**2. Anchor for one breath** — feel your feet, one slow exhale. One breath is enough.\n\n**3. Choose, then speak** — ask yourself silently, *"what matters here?"* and respond from that, not from the reaction.',
        },
        { type: 'p', md: 'The pause does double duty. It gives *you* control — and to everyone watching, a person who does not rush to fill the air **reads as confident**. Silence is not weakness; only the unsure scramble to fill it.' },
        {
          type: 'goodbad',
          rows: [
            { dimension: 'After a tough challenge', poor: 'Answers in under a second; "Well, actually—"; pitch and pace rise.', good: 'One beat of silence; steady tone; "Good challenge — let me think for a second."' },
            { dimension: 'In a silence', poor: 'Rushes to fill it; over-explains.', good: 'Lets a 2–3 second silence sit; uses it.' },
            { dimension: 'When interrupted', poor: 'Talks over, or surrenders the floor and never returns.', good: '"Let me finish this thought, then I want to hear yours."' },
            { dimension: 'Under provocation', poor: 'Defends, justifies, gets sharp.', good: 'Names it calmly: "I can tell this one\'s loaded — say more."' },
          ],
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Don\'t confuse suppression with composure',
          md: 'Going flat and robotic is not grounded — it reads as checked-out or brittle. The target is **settled *and* engaged**: you feel the pressure and still choose.',
        },
        { type: 'tryit', md: 'In your next meeting, pick one rule: **after any direct or challenging question, take one full breath before answering — every time.** Notice what happens to the quality of your answers and the room\'s response.' },
      ],
    },
    {
      id: 'm1-l3',
      title: 'Substance & your leadership narrative',
      estMin: 7,
      blocks: [
        { type: 'h', text: 'Substance: be six questions deep' },
        { type: 'p', md: 'Gravitas is, above all, the sense that you **know your stuff cold**. The test is depth: when someone follows up, and follows up again, do you stay grounded — or thin out? You earn this in preparation, not in the room. Before a high-stakes conversation, anticipate the second, third, and fourth question behind your headline, and know where your evidence is.' },
        {
          type: 'callout',
          tone: 'tip',
          title: 'Prep drill: the question ladder',
          md: 'Write your recommendation. Then write the obvious challenge to it. Then the challenge to *that*. Go four rungs down. You rarely need rung four — but knowing it is there is what lets you stay calm at rung two.',
        },
        { type: 'h', text: 'Narrative: the through-line' },
        { type: 'p', md: 'Senior people are not just competent task-by-task; they carry a **narrative** — a short, coherent account of who they are, what they stand for, and where they are taking things. It turns a list of contributions into a leader people can follow.' },
        {
          type: 'steps',
          items: [
            'Who you are (in one phrase): "I\'m the person who turns messy problems into shipped decisions."',
            'What you stand for: the principle you optimise for ("clarity over cleverness").',
            'Where you\'re taking it: the direction you\'re pulling toward ("getting us from reactive to deliberate").',
          ],
        },
        {
          type: 'check',
          q: 'What is the most reliable way to be "six questions deep" in the room?',
          options: [
            { text: 'Speak more confidently and avoid admitting uncertainty.', correct: false, why: 'Bravado collapses under follow-up. Substance is earned, not performed.' },
            { text: 'Anticipate the ladder of follow-up questions beforehand and know where your evidence is.', correct: true, why: 'Depth is built in preparation — the question ladder is the drill.' },
            { text: 'Bring more slides.', correct: false, why: 'Hewlett\'s research specifically warns against leaning on props; depth of knowledge beats volume of material.' },
          ],
        },
      ],
    },
  ],
  principles: [
    'Substance first: you cannot project authority you have not earned in preparation.',
    'The pause is power — a person who does not rush to fill the air owns the room.',
    'Own the frame: state positions, don\'t hedge them into invisibility.',
    'Authenticity beats imitation: presence in your own style outperforms a borrowed one.',
  ],
  practice: [
    { kind: 'observe', title: 'Spot the choice-point', body: 'For one week, simply notice the urge to jump in. Each time you feel it, silently label it ("there it is") and take one breath before speaking. Tally how often you catch it.' },
    { kind: 'experiment', title: 'The one-breath rule', body: 'In one real meeting, take a full breath after every direct or challenging question before you answer. Watch the effect on your answers and the room.' },
    { kind: 'record', title: 'Pressure tape', body: 'Record a meeting where you expect to be challenged or to present. Afterwards, find your three highest-pressure moments and ask: did I react, suppress, or stay grounded? Then run a FULCRUM evaluation and compare with its read of your pause length and pace under pressure.' },
    { kind: 'reflect', title: 'Your narrative', body: 'Write your three-line leadership narrative (who you are / what you stand for / where you\'re taking it). Say it aloud until it sounds like you, not a brochure.' },
  ],
  warningSigns: [
    'Answering challenges in under a second; pitch and pace spiking under pressure',
    'Hedging language: "this might be silly, but…", "just", "maybe possibly"',
    'Going flat/robotic and mistaking it for calm',
    'Thinning out by the second or third follow-up question',
  ],
  diagnosticSignals: [
    'Pause-before-response after challenging turns',
    'Speech-rate and pitch stability under pressure vs. your baseline',
    'Hedge/filler density and up-talk',
    'Depth held across follow-ups',
  ],
  furtherReading: [
    'Sylvia Ann Hewlett — Executive Presence (gravitas, communication, appearance)',
    'Bates ExPI — Composure, Confidence, Vision facets',
    'Oren Jay Sofer — Say What You Mean (presence, the pause)',
  ],
  grounding: ['Bates ExPI', 'Hewlett / CTI', 'Sofer — Say What You Mean', 'Spitzberg & Cupach (composure)'],
};
