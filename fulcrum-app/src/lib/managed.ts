// Client helpers for the managed (FULCRUM-hosted) proxy. Used when the user is
// on a FULCRUM key instead of their own provider keys. Large media is uploaded
// straight to Vercel Blob, then the serverless function does the provider call.
import { upload } from '@vercel/blob/client';
import type { EvaluationResult } from '../types';
import { parseDeepgram, type Transcription } from './media';
import { videoSystem, videoUserMessage, GEMINI_EVAL_SCHEMA, type VideoContext } from './video';

const headers = (key: string) => ({ 'content-type': 'application/json', 'x-fulcrum-key': key });

export async function managedAnthropic(payload: any, key: string): Promise<any> {
  const r = await fetch('/api/anthropic', { method: 'POST', headers: headers(key), body: JSON.stringify({ license: key, payload }) });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error || `Proxy error (${r.status})`);
  return d;
}

async function uploadMedia(file: File, key: string): Promise<string> {
  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/blob-upload',
    clientPayload: JSON.stringify({ license: key }),
    multipart: true,
  });
  return blob.url;
}

export async function managedTranscribe(file: File, key: string): Promise<Transcription> {
  const fileUrl = await uploadMedia(file, key);
  const r = await fetch('/api/deepgram', { method: 'POST', headers: headers(key), body: JSON.stringify({ license: key, fileUrl }) });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error || `Transcription failed (${r.status})`);
  return parseDeepgram(d);
}

export async function managedVideo(file: File, durationSec: number, ctx: VideoContext, key: string): Promise<EvaluationResult> {
  const fileUrl = await uploadMedia(file, key);
  const r = await fetch('/api/gemini-video', {
    method: 'POST',
    headers: headers(key),
    body: JSON.stringify({ license: key, fileUrl, durationSec, mimeType: file.type, system: videoSystem(), userMessage: videoUserMessage(ctx), schema: GEMINI_EVAL_SCHEMA }),
  });
  const text = await r.text();
  if (!r.ok) {
    let msg = text;
    try { msg = JSON.parse(text).error; } catch { /* keep raw */ }
    throw new Error(msg || `Video analysis failed (${r.status})`);
  }
  return JSON.parse(text) as EvaluationResult;
}

export async function managedUsage(key: string): Promise<any | null> {
  try {
    const r = await fetch('/api/usage', { headers: { 'x-fulcrum-key': key } });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
