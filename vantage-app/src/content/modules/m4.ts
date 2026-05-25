import type { Module } from '../../types';

export const m4: Module = {
  number: 4,
  slug: 'regulation',
  title: 'Mindful Presence, Confidence & Emotional Regulation',
  track: 'presence',
  oneLiner: 'Catch your triggers at the choice-point and respond on purpose, not on impulse.',
  estReadMin: 18,
  whyItMatters:
    'Every other skill in this curriculum — listening, clarity, hard conversations — becomes unavailable the moment you are emotionally hijacked. Regulation is the foundation beneath the foundation. It is also the most private skill: nobody sees you do it, they only see the steadiness it produces. This module teaches the inner mechanics of staying composed and confident when it counts.',
  learningObjectives: [
    'Locate your personal triggers and early-warning body signals.',
    'Use the choice-point to interrupt reactivity before it drives behaviour.',
    'Separate the story you tell yourself from what actually happened.',
    'Down-regulate in seconds with breath and attention.',
  ],
  keyTerms: [
    { term: 'Trigger', def: 'A stimulus that reliably fires a strong reaction in you — a tone, a topic, a kind of person, being interrupted or doubted.' },
    { term: 'Mastering your stories', def: 'The Crucial Conversations idea that between an event and your feeling sits a story you told yourself — and you can choose a more accurate story.' },
    { term: 'Down-regulation', def: 'Calming the nervous system\'s stress response. A slow exhale is the fastest reliable lever.' },
  ],
  subAreas: ['Self-awareness', 'The choice-point / pause', 'Nervous-system regulation', 'Trigger / reactivity management', 'Mastering your stories', 'Steady delivery under stress'],
  competencyIds: ['regulation', 'composure'],
  lessons: [
    {
      id: 'm4-l1',
      title: 'The gap between stimulus and response',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'Reactivity feels instant — someone questions your work and you\'re defending before you\'ve decided to. But it isn\'t instant. There is always a gap, however small, between the stimulus and your response. Regulation is the practice of finding that gap and standing in it long enough to choose.' },
        { type: 'callout', tone: 'mechanic', title: 'The internal mechanic', md: '**1. Notice the activation** — heat in the chest, a clench, the urge to defend. Your body fires *before* your mind; the body signal is your early-warning system.\n\n**2. One slow exhale** — a longer out-breath is the fastest way to tell your nervous system you are safe.\n\n**3. Name it, silently** — "I\'m getting defensive." Naming a feeling reliably reduces its grip.\n\n**4. Choose intention** — "what do I actually want here?" — and respond from that.' },
        { type: 'p', md: 'The aim is not to feel nothing. Feeling is fine — feeling *driving you* is the problem. The target is: feel it, and still choose.' },
        {
          type: 'goodbad',
          rows: [
            { dimension: 'Work is criticised', poor: 'Instant defence: "Well that\'s because you didn\'t…"', good: 'Breath. "Tell me more about what\'s not working."' },
            { dimension: 'Interrupted repeatedly', poor: 'Goes silent and resentful, or talks over.', good: 'Notices the irritation, names the pattern calmly: "Can I finish this one thought?"' },
          ],
        },
      ],
    },
    {
      id: 'm4-l2',
      title: 'Master your stories',
      estMin: 7,
      blocks: [
        { type: 'p', md: 'Most of our strongest reactions are not to events but to the **stories we tell about them**. Your manager replies "ok." to your update. The event is two characters. The story might be "they\'re unhappy with me" — and now you\'re anxious all afternoon over punctuation.' },
        {
          type: 'steps',
          items: [
            'Separate fact from story: what literally happened vs. what I made it mean.',
            'Notice the "villain / victim / helpless" stories — they\'re the usual suspects.',
            'Ask: "what else could be true?" — generate two other plausible stories.',
            'Act from the most useful accurate story, not the most threatening one.',
          ],
        },
        { type: 'callout', tone: 'tip', title: 'The clarifying move', md: 'When a story is firing, the cure is often a question: *"When you said X, what did you mean?"* Reality is usually less threatening than the story.' },
        {
          type: 'check',
          q: 'You feel a flash of defensiveness when challenged in a meeting. The most regulated next move is:',
          options: [
            { text: 'Suppress it completely and show no reaction.', correct: false, why: 'Suppression isn\'t regulation — it leaks out and reads as brittle. The goal is to feel it and still choose.' },
            { text: 'Notice the trigger, take a slow exhale, and get curious about the challenge.', correct: true, why: 'Notice → down-regulate → choose curiosity. That is the choice-point in action.' },
            { text: 'Defend your position immediately so you don\'t look weak.', correct: false, why: 'That is the reaction driving the behaviour — exactly what regulation prevents.' },
          ],
        },
      ],
    },
  ],
  principles: [
    'There is always a gap between stimulus and response — regulation lives there.',
    'The body signals first; learn your early-warning sensations.',
    'A slow exhale is the fastest down-regulation lever you have.',
    'Separate the event from the story; choose the accurate one.',
  ],
  practice: [
    { kind: 'observe', title: 'Trigger journal', body: 'For a week, jot down each time you felt a strong reaction: what triggered it, where you felt it in your body, and the story you told. Patterns will emerge fast.' },
    { kind: 'experiment', title: 'One breath, one name', body: 'In real conversations, when you feel activated, take one slow exhale and silently name the feeling before responding. Notice the difference in what you say next.' },
    { kind: 'record', title: 'Recovery speed', body: 'Record a likely-to-be-tense conversation. Afterwards, find the moment you got triggered and time how long until you recovered. A VANTAGE evaluation reads defensiveness and recovery for you.' },
    { kind: 'reflect', title: 'What else could be true?', body: 'Take a recent reaction. Write the event (just the facts), the story you told, and two other stories that also fit the facts.' },
  ],
  warningSigns: [
    'Defending before you\'ve decided to',
    'A barbed reply whose tone lingers for the rest of the conversation',
    'Replaying ambiguous messages and assuming the worst',
    'Going flat/withdrawn under stress',
  ],
  diagnosticSignals: ['Non-defensiveness when challenged', 'Naming vs. acting out tension', 'Recovery speed after a provocation', 'Self-talk markers (blame/absolutes vs. ownership)'],
  furtherReading: ['Oren Jay Sofer — Say What You Mean (presence, intention)', 'Crucial Conversations — Master My Stories', 'Bates ExPI — Composure, Restraint'],
  grounding: ['Sofer — Say What You Mean', 'Crucial Conversations', 'Bates ExPI', 'NVC / proprietary database (mindfulness & pause)'],
};
