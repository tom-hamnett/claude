import type { Prosody } from './media';

/**
 * Best-effort vocal prosody over the user's spoken ranges. Decodes the audio in
 * the browser and estimates pitch (autocorrelation) + loudness variation.
 * Returns null on any failure (unsupported container, decode error, too little
 * voiced audio) — never throws, so it can't break an evaluation.
 */
export async function extractProsody(file: File, userRanges: { start: number; end: number }[]): Promise<Prosody | null> {
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!AC || !userRanges.length) return null;
    const ctx = new AC();
    const arr = await file.arrayBuffer();
    const buf = await ctx.decodeAudioData(arr.slice(0));
    try { ctx.close(); } catch { /* ignore */ }

    const data = buf.getChannelData(0);
    const sr = buf.sampleRate;
    const frame = Math.floor(sr * 0.04); // 40 ms analysis window
    const hop = Math.floor(sr * 0.05); // 50 ms step
    const minLag = Math.floor(sr / 400); // 400 Hz ceiling
    const maxLag = Math.floor(sr / 70); // 70 Hz floor

    const pitches: number[] = [];
    const energies: number[] = [];
    let frames = 0;
    const MAX = 3000;

    for (const r of userRanges) {
      const s = Math.max(0, Math.floor(r.start * sr));
      const e = Math.min(data.length, Math.floor(r.end * sr));
      for (let i = s; i + frame < e && frames < MAX; i += hop, frames++) {
        const seg = data.subarray(i, i + frame);
        const rms = energyRMS(seg);
        energies.push(rms);
        if (rms > 0.012) {
          const p = acfPitch(seg, sr, minLag, maxLag);
          if (p > 70 && p < 400) pitches.push(p);
        }
      }
    }
    if (pitches.length < 5) return null;

    const meanP = mean(pitches);
    const stdP = std(pitches, meanP);
    const meanE = mean(energies) || 1e-6;
    const stdE = std(energies, meanE);
    return {
      meanPitchHz: meanP,
      pitchVariationHz: stdP,
      energyVariation: Math.min(1, stdE / meanE),
    };
  } catch {
    return null;
  }
}

function energyRMS(seg: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < seg.length; i++) sum += seg[i] * seg[i];
  return Math.sqrt(sum / seg.length);
}

function acfPitch(seg: Float32Array, sr: number, minLag: number, maxLag: number): number {
  let bestLag = -1;
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i + lag < seg.length; i++) sum += seg[i] * seg[i + lag];
    if (sum > best) {
      best = sum;
      bestLag = lag;
    }
  }
  return bestLag > 0 ? sr / bestLag : 0;
}

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const std = (a: number[], m: number) => Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / a.length);
