// Audio/video → speaker-diarized transcript + non-verbal dynamics.
// Uses Deepgram (browser-callable). Video files work too — Deepgram extracts the audio.

export interface Utterance {
  speaker: number;
  text: string;
  start: number;
  end: number;
}

export interface Transcription {
  utterances: Utterance[];
  durationSec: number;
  speakers: number[];
}

export async function transcribeWithDeepgram(file: File, key: string): Promise<Transcription> {
  const params = new URLSearchParams({
    model: 'nova-2',
    diarize: 'true',
    punctuate: 'true',
    utterances: 'true',
    smart_format: 'true',
  });
  const res = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
    method: 'POST',
    headers: { Authorization: `Token ${key}`, 'Content-Type': file.type || 'audio/*' },
    body: file,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Speech-to-text failed (${res.status}). ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  let us = data?.results?.utterances as any[] | undefined;

  // Fallback: group diarized words if utterances are absent.
  if (!us || !us.length) {
    const words = data?.results?.channels?.[0]?.alternatives?.[0]?.words as any[] | undefined;
    us = groupWords(words || []);
  }

  const utterances: Utterance[] = (us || [])
    .filter((u) => (u.transcript ?? u.text ?? '').trim())
    .map((u) => ({ speaker: u.speaker ?? 0, text: (u.transcript ?? u.text).trim(), start: u.start ?? 0, end: u.end ?? 0 }));

  if (!utterances.length) throw new Error('No speech was detected in that file.');

  const durationSec = data?.metadata?.duration ?? utterances[utterances.length - 1].end;
  const speakers = [...new Set(utterances.map((u) => u.speaker))].sort((a, b) => a - b);
  return { utterances, durationSec, speakers };
}

function groupWords(words: any[]): any[] {
  const out: any[] = [];
  let cur: any = null;
  for (const w of words) {
    const sp = w.speaker ?? 0;
    if (!cur || cur.speaker !== sp) {
      cur = { speaker: sp, transcript: w.punctuated_word ?? w.word, start: w.start, end: w.end };
      out.push(cur);
    } else {
      cur.transcript += ' ' + (w.punctuated_word ?? w.word);
      cur.end = w.end;
    }
  }
  return out;
}

const wc = (s: string) => (s.trim().match(/\b[\w’']+\b/g) || []).length;

function fmt(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function sampleLines(t: Transcription): { speaker: number; sample: string }[] {
  return t.speakers.map((sp) => ({
    speaker: sp,
    sample: t.utterances.find((u) => u.speaker === sp)?.text.slice(0, 90) ?? '',
  }));
}

export function buildDiarizedTranscript(t: Transcription, userSpeaker: number): string {
  return t.utterances
    .map((u) => `[${fmt(u.start)}] ${u.speaker === userSpeaker ? 'Me' : `Speaker ${u.speaker}`}: ${u.text}`)
    .join('\n');
}

export interface FlowMetrics {
  userTalkSec: number;
  otherTalkSec: number;
  talkRatio: number; // user share 0..1
  interruptions: number; // times user started over someone
  timesInterrupted: number; // times someone started over user
  avgResponseLatencySec: number;
  longestMonologueSec: number;
  paceWpm: number;
}

export function computeFlow(t: Transcription, userSpeaker: number): FlowMetrics {
  const u = t.utterances;
  let userTalk = 0, otherTalk = 0, userWords = 0, interruptions = 0, timesInterrupted = 0, longest = 0;
  const latencies: number[] = [];
  for (let i = 0; i < u.length; i++) {
    const cur = u[i];
    const dur = Math.max(0, cur.end - cur.start);
    if (cur.speaker === userSpeaker) {
      userTalk += dur;
      userWords += wc(cur.text);
      longest = Math.max(longest, dur);
    } else {
      otherTalk += dur;
    }
    if (i > 0) {
      const prev = u[i - 1];
      const overlap = cur.start < prev.end - 0.2;
      if (cur.speaker === userSpeaker && prev.speaker !== userSpeaker) {
        if (overlap) interruptions++;
        else latencies.push(Math.max(0, cur.start - prev.end));
      } else if (cur.speaker !== userSpeaker && prev.speaker === userSpeaker && overlap) {
        timesInterrupted++;
      }
    }
  }
  const total = userTalk + otherTalk || 1;
  return {
    userTalkSec: userTalk,
    otherTalkSec: otherTalk,
    talkRatio: userTalk / total,
    interruptions,
    timesInterrupted,
    avgResponseLatencySec: latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
    longestMonologueSec: longest,
    paceWpm: userTalk > 0 ? Math.round((userWords / userTalk) * 60) : 0,
  };
}

export interface Prosody {
  meanPitchHz: number;
  pitchVariationHz: number; // std dev — proxy for vocal expressiveness/dynamism
  energyVariation: number; // 0..1 — variation in loudness
}

export function buildDeliveryContext(flow: FlowMetrics, prosody: Prosody | null, durationSec: number): string {
  const pct = Math.round(flow.talkRatio * 100);
  const lines = [
    'DELIVERY & DYNAMICS (measured from the audio — use these to assess the user\'s tone, pace, interruptions, and how the conversation flowed; still evaluate ONLY the user):',
    `- Conversation length: ${fmt(durationSec)}.`,
    `- Talk-time: you spoke ~${pct}% of the time (${Math.round(flow.userTalkSec)}s of ${Math.round(flow.userTalkSec + flow.otherTalkSec)}s).`,
    `- You spoke over / interrupted others ~${flow.interruptions} time(s); others spoke over you ~${flow.timesInterrupted} time(s).`,
    `- Your average pause before responding: ${flow.avgResponseLatencySec.toFixed(1)}s (very short can read as reactive; a beat reads as composed).`,
    `- Longest unbroken stretch you spoke: ${Math.round(flow.longestMonologueSec)}s.`,
    `- Your speaking pace: ~${flow.paceWpm} words/min (≈120–160 is typically clear; much faster can read as rushed/anxious).`,
  ];
  if (prosody) {
    lines.push(
      `- Vocal pitch variation: ${Math.round(prosody.pitchVariationHz)} Hz around a mean of ${Math.round(prosody.meanPitchHz)} Hz (more variation = more expressive/engaged; very flat can read as disengaged or tense).`,
      `- Loudness variation: ${(prosody.energyVariation * 100).toFixed(0)}% (dynamic emphasis vs. monotone).`,
    );
  }
  lines.push('Interpret these as evidence of the user\'s composure, listening, expressiveness and flow. Do not rate the other participants.');
  return lines.join('\n');
}
