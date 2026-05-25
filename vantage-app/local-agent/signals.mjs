// Local deterministic signal extraction from a (diarised) transcript. Runs on the
// user's machine. These numeric signals anchor the cloud judge so it drifts less —
// and they are cheap to send, unlike raw media. No network, no model.
import { pathToFileURL } from 'node:url';

const FILLERS = /\b(um+|uh+|er+|like|you know|sort of|kind of|basically|literally|i mean)\b/gi;
const OPEN = /\b(what|how|tell me|walk me|describe|why)\b/i;
const WHY = /\bwhy\b/i;
const HEDGES = /\b(just|maybe|sort of|kind of|i think|i guess|probably|perhaps|a bit|kinda)\b/gi;
const ABSOLUTES = /\b(always|never|everyone|no one|nobody|nothing|everything)\b/gi;

// Split "Speaker N:" / "Me:" diarised lines into turns. Falls back to one turn.
function turns(transcript) {
  const lines = transcript.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = [];
  for (const line of lines) {
    const m = line.match(/^(?:\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s*)?(Me|Speaker\s*\d+|[A-Z][a-z]+)\s*:\s*(.*)$/);
    if (m) out.push({ speaker: m[1].replace(/\s+/g, ' ').trim(), text: m[2] });
    else if (out.length) out[out.length - 1].text += ' ' + line;
    else out.push({ speaker: 'Speaker 0', text: line });
  }
  return out;
}

const wc = (s) => (s.match(/\b[\w'-]+\b/g) || []).length;

export function extractSignals(transcript, durationSec = 0) {
  const t = turns(transcript);
  // primary speaker = the one with the most words (proxy for "the user")
  const bySpeaker = {};
  for (const turn of t) bySpeaker[turn.speaker] = (bySpeaker[turn.speaker] || 0) + wc(turn.text);
  const speakers = Object.keys(bySpeaker);
  const primary = speakers.sort((a, b) => bySpeaker[b] - bySpeaker[a])[0] || 'Speaker 0';

  const mine = t.filter((x) => x.speaker === primary);
  const myText = mine.map((x) => x.text).join(' ');
  const myWords = wc(myText);
  const totalWords = Object.values(bySpeaker).reduce((a, b) => a + b, 0) || 1;

  const questions = (myText.match(/\?/g) || []).length;
  const myQuestionSentences = myText.split(/(?<=[.?!])\s+/).filter((s) => s.includes('?'));
  const openQ = myQuestionSentences.filter((s) => OPEN.test(s)).length;
  const whyQ = myQuestionSentences.filter((s) => WHY.test(s)).length;

  const longestMonologue = Math.max(0, ...mine.map((x) => wc(x.text)));
  const fillers = (myText.match(FILLERS) || []).length;
  const hedges = (myText.match(HEDGES) || []).length;
  const absolutes = (myText.match(ABSOLUTES) || []).length;

  return {
    primarySpeaker: primary,
    speakers: speakers.length,
    talkTimeRatio: Number((myWords / totalWords).toFixed(2)),
    myWords,
    wordsPerMin: durationSec ? Math.round((myWords / durationSec) * 60) : null,
    questions,
    openQuestionRatio: questions ? Number((openQ / questions).toFixed(2)) : 0,
    whyQuestions: whyQ,
    longestMonologueWords: longestMonologue,
    fillersPer100w: myWords ? Number(((fillers / myWords) * 100).toFixed(1)) : 0,
    hedgesPer100w: myWords ? Number(((hedges / myWords) * 100).toFixed(1)) : 0,
    absolutesPer100w: myWords ? Number(((absolutes / myWords) * 100).toFixed(1)) : 0,
  };
}

// self-test:  node signals.mjs
const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  const sample = `Speaker 0: So I think we should just ship it on Friday, basically because the client always wants things fast and I, um, kind of feel we have no choice and there's nothing else we can do and honestly I could talk about this for a really long time without stopping.
Speaker 1: What's your read on the risk?
Speaker 0: What would have to be true for that to work? How are you seeing it?`;
  console.log(JSON.stringify(extractSignals(sample, 60), null, 2));
}
