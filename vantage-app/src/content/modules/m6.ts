import type { Module } from '../../types';

export const m6: Module = {
  number: 6,
  slug: 'crucial-conversations',
  title: 'Crucial Conversations (STATE)',
  track: 'influence',
  book: { part: 4, partTitle: 'High-Stakes Application — Conversations, Feedback, Negotiation, and Sales', chapter: 7, chapterTitle: 'Difficult Conversations — The System That Changes Outcomes' },
  oneLiner: 'Raise the hard thing, keep it safe, and stay in dialogue when the temperature rises.',
  estReadMin: 20,
  whyItMatters:
    'This is the clearest place where real-life skill diverges from classroom knowledge. Everyone knows a hard conversation should stay calm; almost nobody is composed when the other person pushes back. The conversations you avoid — the underperformer, the peer who undermined you, the boss who overcommitted you — are exactly the ones that determine your reputation. This module gives you a repeatable system (STATE) for walking into them and keeping the relationship intact.',
  learningObjectives: [
    'Open a hard conversation so the other person stays in dialogue instead of going defensive.',
    'Use the STATE path: share facts, tell your story tentatively, ask for theirs.',
    'Keep psychological safety alive when the temperature rises.',
    'Repair a rupture after things have gone wrong.',
  ],
  keyTerms: [
    { term: 'Make it safe', def: 'The Crucial Conversations move of establishing mutual respect and shared purpose so the other person doesn\'t move to silence or aggression.' },
    { term: 'Silence & violence', def: 'The two ways people leave dialogue when safety drops: silence (withdrawing, going vague) and violence (sarcasm, controlling, attacking).' },
    { term: 'STATE', def: 'Share the facts, Tell your story (tentatively), Ask for their path, Talk tentatively, Encourage testing — the path for raising a hard issue without triggering defence.' },
    { term: 'Contrast', def: 'A repair move: "What I\'m not saying… what I am saying…" — clears up the misread before it derails the talk.' },
  ],
  subAreas: ['Raising issues without starting a fight', 'Making it safe', 'STATE the path', 'Staying in dialogue under heat', 'Watching for silence/violence', 'Repair after rupture'],
  competencyIds: ['difficult', 'composure', 'observation'],
  lessons: [
    {
      id: 'm6-l1',
      title: 'Open it safe',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'Hard conversations go wrong in the first thirty seconds. Open with blame and the other person moves to defence or attack; avoid it entirely and the issue festers. The skill is to open in a way that keeps them in dialogue — which means leading with **intent and safety**, then the facts.' },
        { type: 'callout', tone: 'mechanic', title: 'The opening sequence', md: '**1. Shared purpose** — "I want this project (or our working relationship) to go well." \n**2. Permission / intent** — "Can we talk about what happened on Tuesday?" \n**3. Facts, not judgement** — describe the observable, then ask for their view.' },
        {
          type: 'goodbad',
          rows: [
            { dimension: 'Opening', poor: '"You really dropped the ball on this."', good: '"I want us to deliver well together — can we look at what happened with the report?"' },
            { dimension: 'The issue', poor: '"You\'re unreliable." (character)', good: '"The last two reports came in after the deadline." (observation)' },
            { dimension: 'Their turn', poor: 'Builds the case and waits to win.', good: '"What\'s your read on it?" — then actually listens.' },
          ],
        },
      ],
    },
    {
      id: 'm6-l2',
      title: 'STATE the path',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'Once it\'s open, the hardest part is sharing your view without it landing as an accusation. The STATE path keeps you in dialogue: start with what is hard to argue with (facts), offer your interpretation as a tentative story, and genuinely invite theirs.' },
        {
          type: 'steps',
          items: [
            '**Share the facts** — start with the observable, not the conclusion. Facts are the least controversial and the most persuasive place to begin.',
            '**Tell your story tentatively** — "I\'m starting to wonder if…" not "It\'s obvious that…". Tentative language invites dialogue; certainty invites defence.',
            '**Ask for their path** — "How do you see it?" Genuinely. Then listen at Level 2 (Module 2).',
            '**Talk tentatively, encourage testing** — hold your story lightly enough that new facts can change it.',
          ],
        },
        { type: 'callout', tone: 'example', title: 'Facts → tentative story → their view', md: '"The last two reports came in after the deadline *(fact)*. I\'m starting to wonder whether the scope is unrealistic, or whether something else is getting in the way *(tentative story)* — how does it look from your side? *(ask)*"' },
        {
          type: 'check',
          q: 'Which opening best follows the STATE path?',
          options: [
            { text: '"It\'s pretty clear you\'re not taking this seriously."', correct: false, why: 'A certain story stated as fact — it invites defence, not dialogue.' },
            { text: '"Two reports were late this month. I\'m wondering if the scope is off, or if something else is going on — what\'s your read?"', correct: true, why: 'Facts first, story held tentatively, genuine invitation for their path.' },
            { text: '"Everyone\'s noticed the reports slipping."', correct: false, why: '"Everyone\'s noticed" is unverifiable and feels like an ambush — safety collapses.' },
          ],
        },
      ],
    },
    {
      id: 'm6-l3',
      title: 'Stay in it & repair',
      estMin: 6,
      blocks: [
        { type: 'p', md: 'Even a perfect opening can heat up. When it does, your job is to keep safety alive — which is where Module 1\'s regulation pays off. Watch for the signs that the other person has moved to **silence** (withdrawing, going vague) or **violence** (sarcasm, attacking), and rebuild safety before continuing with the content.' },
        { type: 'callout', tone: 'tip', title: 'The repair moves', md: '**Step out and rebuild:** "I think this came out wrong — let me try again." \n**Contrast:** "What I\'m *not* saying is that you don\'t care. What I *am* saying is the deadline slipped and it cost us." \n**Recommit to shared purpose:** "We both want this to work."' },
        { type: 'p', md: 'And when *you* are the one who ruptured something — snapped, dismissed, got it wrong — repair quickly and cleanly: name it, own it, no long justification. "I was sharp in there and that wasn\'t fair. I\'m sorry." Repair is a leadership behaviour, not a weakness.' },
        { type: 'tryit', md: 'Pick one conversation you\'ve been avoiding. Write the opening sequence (shared purpose → intent → one fact, not a verdict) and the tentative story you\'ll offer. You don\'t have to have it yet — just draft the first three sentences.' },
      ],
    },
  ],
  principles: [
    'Open with shared purpose and intent, then facts — never blame.',
    'STATE: facts first, story tentatively, then genuinely ask for theirs.',
    'Watch for silence/violence; rebuild safety before continuing.',
    'Repair fast and clean when you get it wrong — it\'s a leadership move.',
  ],
  practice: [
    { kind: 'observe', title: 'Silence/violence spotting', body: 'For a week, watch for the moment safety drops in conversations — when someone withdraws or gets sharp. Just notice the trigger and the tell.' },
    { kind: 'experiment', title: 'One hard thing', body: 'Have one conversation you\'ve been avoiding, using the STATE path. Lead with shared purpose; share a fact, then a tentative story, then ask.' },
    { kind: 'record', title: 'Heat check', body: 'Record (with consent) or debrief a tough conversation. A VANTAGE evaluation reads whether you opened safe, stayed composed under pushback, and shared facts before conclusions.' },
    { kind: 'reflect', title: 'Repair audit', body: 'Recall a recent rupture you caused or left unrepaired. Draft the clean repair: name it, own it, recommit. Then decide whether to actually send it.' },
  ],
  warningSigns: [
    'Avoiding the conversation entirely, or opening with blame',
    'Stating your story as certain fact ("it\'s obvious that…")',
    'Escalating or withdrawing when pushed back',
    'Leaving ruptures unrepaired',
  ],
  diagnosticSignals: ['Opening with safety/intent vs. avoidance or attack', 'Facts before conclusions; tentative story language', 'Composure when challenged back', 'Checking understanding; repair markers'],
  furtherReading: ['Crucial Conversations (Make it Safe, STATE, Contrast)', 'Difficult Conversations (Stone, Patton, Heen)', 'Oren Jay Sofer — Say What You Mean', 'Bates ExPI — Composure, Concern'],
  grounding: ['Crucial Conversations', 'Stone/Patton/Heen', 'Sofer / NVC', 'Bates ExPI'],
};
