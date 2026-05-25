// Client helpers for self-hosted mode (node server.mjs on your machine).
// Files are POSTed directly to the local server (no size limits, no Blob, no CORS).
import type { EvaluationResult } from '../types';
import { parseDeepgram, type Transcription } from './media';
import type { VideoContext } from './video';

export async function selfhostTranscribe(file: File): Promise<Transcription> {
  const r = await fetch('/api/transcribe', { method: 'POST', headers: { 'content-type': file.type || 'audio/*' }, body: file });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error || `Transcription failed (${r.status})`);
  return parseDeepgram(d);
}

export async function selfhostVideo(file: File, ctx: VideoContext): Promise<EvaluationResult> {
  const params = new URLSearchParams({
    interaction: ctx.interaction,
    whoAmI: ctx.whoAmI || 'the primary speaker',
    modules: ctx.activeModules.join(','),
  });
  const r = await fetch(`/api/video?${params.toString()}`, { method: 'POST', headers: { 'content-type': file.type || 'video/mp4' }, body: file });
  const text = await r.text();
  if (!r.ok) {
    let msg = text;
    try { msg = JSON.parse(text).error; } catch { /* keep raw */ }
    throw new Error(msg || `Video analysis failed (${r.status})`);
  }
  return JSON.parse(text) as EvaluationResult;
}
