import type { Module } from '../../types';

export const m6: Module = {
  number: 6,
  slug: 'difficult-conversations',
  title: 'Difficult Conversations, Feedback & Conflict Repair',
  track: 'influence',
  oneLiner: 'Raise the hard thing, give real feedback, and stay in dialogue when it gets hot.',
  estReadMin: 20,
  whyItMatters:
    'This is the clearest place where real-life skill diverges from classroom knowledge. Everyone knows feedback should be specific and kind; almost nobody is composed when the other person pushes back. The conversations you avoid — the underperformer, the peer who undermined you, the boss who overcommitted you — are exactly the ones that determine your reputation. This module gives you a repeatable way to walk into them and keep the relationship intact.',
  learningObjectives: [
    'Open a hard conversation so the other person stays in dialogue instead of going defensive.',
    'Give feedback grounded in observation, not evaluation or character.',
    'Keep psychological safety alive when the temperature rises.',
    'Repair a rupture after things have gone wrong.',
  ],
  keyTerms: [
    { term: 'Make it safe', def: 'The Crucial Conversations move of establishing mutual respect and shared purpose so the other person doesn\'t move to silence or aggression.' },
    { term: 'Observation vs. evaluation', def: 'Describing what observably happened ("the report missed two deadlines") rather than judging character ("you\'re unreliable").' },
    { term: 'Contrast', def: 'A repair move: "What I\'m not saying… what I am saying…" — clears up the misread before it derails the talk.' },
  ],
  subAreas: ['Raising issues without starting a fight', 'Making it safe', 'Giving feedback (observation vs. evaluation)', 'Receiving challenge', 'Staying in dialogue under heat', 'Repair after rupture'],
  competencyIds: ['difficult', 'observation', 'composure'],
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
      title: 'Observation, not evaluation',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'The fastest way to trigger defensiveness is to lead with a judgement of who someone *is*. "You\'re dismissive," "you don\'t care," "you\'re unreliable" — these are evaluations, and they invite a fight about character. Replace them with **observations**: the specific, checkable thing that happened.' },
        { type: 'callout', tone: 'example', title: 'Evaluation → observation', md: '"You never listen" → *"When I was halfway through my point, the topic changed, and I felt cut off."* \n"You\'re always late" → *"The last three stand-ups started without you."* \nThe fact is hard to argue with; the character judgement is impossible to resolve.' },
        { type: 'p', md: 'Then own your interpretation as *yours*: "the story I told myself was that it didn\'t matter to you — is that true?" This separates the fact (theirs to confirm) from the meaning (yours to check), and it keeps the conversation in reality.' },
        {
          type: 'check',
          q: 'Which feedback opening is most likely to keep the other person in dialogue?',
          options: [
            { text: '"You\'ve got a real attitude problem in meetings."', correct: false, why: 'A character evaluation — it invites defence about who they are, not the behaviour.' },
            { text: '"In the last two meetings you cut me off mid-point; the story I told myself was that my input didn\'t matter — can we check that?"', correct: true, why: 'Observation + owned interpretation + a question. Hard to argue with, easy to resolve.' },
            { text: '"Everyone thinks you dominate the room."', correct: false, why: '"Everyone thinks" is unverifiable and feels like an ambush — safety collapses.' },
          ],
        },
      ],
    },
    {
      id: 'm6-l3',
      title: 'Stay in it & repair',
      estMin: 6,
      blocks: [
        { type: 'p', md: 'Even a perfect opening can heat up. When it does, your job is to keep safety alive — which is where Module 4\'s regulation pays off. Watch for the signs that the other person has moved to silence (withdrawing, going vague) or violence (sarcasm, attacking), and rebuild safety before continuing.' },
        { type: 'callout', tone: 'tip', title: 'The repair moves', md: '**Step out and rebuild:** "I think this came out wrong — let me try again." \n**Contrast:** "What I\'m *not* saying is that you don\'t care. What I *am* saying is the deadline slipped and it cost us." \n**Recommit to shared purpose:** "We both want this to work."' },
        { type: 'p', md: 'And when *you* are the one who ruptured something — snapped, dismissed, got it wrong — repair quickly and cleanly: name it, own it, no long justification. "I was sharp in there and that wasn\'t fair. I\'m sorry." Repair is a leadership behaviour, not a weakness.' },
        { type: 'tryit', md: 'Pick one conversation you\'ve been avoiding. Write the opening sequence (shared purpose → intent → one observation, not evaluation). You don\'t have to have it yet — just draft the first three sentences.' },
      ],
    },
  ],
  principles: [
    'Open with shared purpose and intent, then facts — never blame.',
    'Observation, not evaluation; own your interpretation as yours.',
    'Watch for silence/violence; rebuild safety before continuing.',
    'Repair fast and clean when you get it wrong — it\'s a leadership move.',
  ],
  practice: [
    { kind: 'observe', title: 'Eval-spotting', body: 'For a week, catch yourself (and others) making character evaluations. Silently translate each into the observation underneath it.' },
    { kind: 'experiment', title: 'One hard thing', body: 'Have one conversation you\'ve been avoiding, using the opening sequence. Lead with shared purpose; bring one observation, not a judgement.' },
    { kind: 'record', title: 'Heat check', body: 'Record (with consent) or debrief a tough conversation. A FULCRUM evaluation reads whether you opened safe, stayed composed under pushback, and used observation vs. evaluation.' },
    { kind: 'reflect', title: 'Repair audit', body: 'Recall a recent rupture you caused or left unrepaired. Draft the clean repair: name it, own it, recommit. Then decide whether to actually send it.' },
  ],
  warningSigns: [
    'Avoiding the conversation entirely, or opening with blame',
    'Character judgements: "you\'re unreliable / dismissive / negative"',
    'Escalating or withdrawing when pushed back',
    'Leaving ruptures unrepaired',
  ],
  diagnosticSignals: ['Opening with safety/intent vs. avoidance or attack', 'Observation vs. evaluation language', 'Composure when challenged back', 'Checking understanding; repair markers'],
  furtherReading: ['Crucial Conversations (Make it Safe, STATE, Contrast)', 'Oren Jay Sofer — Say What You Mean (observation vs. evaluation)', 'Bates ExPI — Composure, Concern'],
  grounding: ['Crucial Conversations', 'Sofer / NVC', 'Bates ExPI'],
};
