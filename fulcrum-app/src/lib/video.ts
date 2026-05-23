// Native video understanding on Gemini Pro — the visual-presence engine.
// Highest quality (no lite tier); efficiency comes from ~1 fps sampling and a
// sensible media resolution, not from a weaker model. Self-only by instruction.
import type { EvaluationResult, Profile, InteractionType } from '../types';
import { analysisSystem, EVAL_SCHEMA, moduleMapText } from './prompts';

const GEMINI_MODEL = 'gemini-2.5-pro';
const BASE = 'https://generativelanguage.googleapis.com';

// Approximate token/cost model (verify against live pricing at build time).
const TOKENS_PER_SEC = 130; // medium res @ ~1 fps incl. audio
const PRO_INPUT_USD_PER_TOKEN = 1.25 / 1_000_000;

export interface VideoCost {
  tokens: number;
  usd: number;
}

export function estimateVideoCost(durationSec: number): VideoCost {
  const tokens = Math.round(durationSec * TOKENS_PER_SEC);
  return { tokens, usd: tokens * PRO_INPUT_USD_PER_TOKEN + 0.02 };
}

export function getMediaDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    try {
      const el = document.createElement('video');
      el.preload = 'metadata';
      el.onloadedmetadata = () => {
        const d = el.duration && isFinite(el.duration) ? el.duration : 0;
        URL.revokeObjectURL(el.src);
        resolve(d);
      };
      el.onerror = () => resolve(0);
      el.src = URL.createObjectURL(file);
    } catch {
      resolve(0);
    }
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Gemini's responseSchema doesn't accept additionalProperties — strip it.
function geminiSchema(s: any): any {
  if (Array.isArray(s)) return s.map(geminiSchema);
  if (s && typeof s === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(s)) {
      if (k === 'additionalProperties') continue;
      out[k] = geminiSchema(v);
    }
    return out;
  }
  return s;
}

export interface VideoContext {
  profile?: Profile;
  activeModules: number[];
  interaction: InteractionType;
  whoAmI?: string;
}
export interface VideoArgs extends VideoContext {
  geminiKey: string;
  file: File;
}

export const GEMINI_EVAL_SCHEMA = geminiSchema(EVAL_SCHEMA);

export async function analyzeVideoWithGemini(args: VideoArgs): Promise<EvaluationResult> {
  const key = args.geminiKey;
  const file = args.file;

  // 1. Start resumable upload.
  const startRes = await fetch(`${BASE}/upload/v1beta/files?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(file.size),
      'X-Goog-Upload-Header-Content-Type': file.type || 'video/mp4',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: file.name } }),
  });
  if (!startRes.ok) throw new Error(`Gemini upload init failed (${startRes.status}). ${(await startRes.text()).slice(0, 160)}`);
  const uploadUrl = startRes.headers.get('X-Goog-Upload-URL') || startRes.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('Browser could not start the Gemini upload (likely CORS). Use the local agent for video, or analyse the audio track instead.');

  // 2. Upload bytes + finalize.
  const upRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'X-Goog-Upload-Command': 'upload, finalize', 'X-Goog-Upload-Offset': '0' },
    body: file,
  });
  if (!upRes.ok) throw new Error(`Gemini upload failed (${upRes.status}).`);
  let info = (await upRes.json()).file;
  if (!info?.name) throw new Error('Gemini upload returned no file handle.');

  // 3. Wait for processing.
  let tries = 0;
  while (info.state === 'PROCESSING' && tries++ < 90) {
    await sleep(2000);
    const r = await fetch(`${BASE}/v1beta/${info.name}?key=${encodeURIComponent(key)}`);
    info = await r.json();
  }
  if (info.state !== 'ACTIVE') throw new Error('Gemini could not process that video (format or timeout).');

  // 4. Generate the evaluation.
  const body = {
    systemInstruction: { parts: [{ text: videoSystem() }] },
    contents: [
      {
        role: 'user',
        parts: [
          { fileData: { mimeType: info.mimeType || file.type, fileUri: info.uri }, videoMetadata: { fps: 1 } },
          { text: videoUserMessage(args) },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GEMINI_EVAL_SCHEMA,
      mediaResolution: 'MEDIA_RESOLUTION_MEDIUM',
      temperature: 0.4,
    },
  };
  const genRes = await fetch(`${BASE}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const gj = await genRes.json();
  if (!genRes.ok) throw new Error(gj?.error?.message || `Gemini error (${genRes.status}).`);
  const text = (gj.candidates?.[0]?.content?.parts || []).map((p: any) => p.text).join('').trim();
  if (!text) throw new Error('Gemini returned an empty analysis (possibly a safety block).');
  return JSON.parse(text) as EvaluationResult;
}

export function videoSystem(): string {
  return [
    analysisSystem(),
    '',
    'You are watching a VIDEO recording. In addition to words and vocal tone, assess VISUAL PRESENCE: eye contact, posture and openness, gesture, stillness vs. fidget, facial expression, and how the user "holds" the room. Weave the visual, vocal and verbal into integrated, coaching-grade findings (e.g. "your gaze dropped exactly when challenged, undercutting otherwise composed words"). Quote/timestamp specific moments. Evaluate ONLY the user; never assess the other people on screen.',
    '',
    'MODULES:',
    moduleMapText(),
  ].join('\n');
}

export function videoUserMessage(args: VideoContext): string {
  const ctx: string[] = [`Interaction type: ${args.interaction}.`];
  if (args.profile?.role) ctx.push(`User's role: ${args.profile.role}.`);
  if (args.profile?.goals?.length) ctx.push(`Goals: ${args.profile.goals.join(', ')}.`);
  if (args.profile?.styleBaseline) ctx.push(`"This is me" baseline (respect it): ${args.profile.styleBaseline}.`);
  ctx.push(`Which person is the user (evaluate only them): ${args.whoAmI?.trim() || 'the primary speaker / host'}.`);
  ctx.push(`Focus modules: ${args.activeModules.map((n) => 'M' + n).join(', ')}.`);
  return [
    'Watch the whole recording and evaluate the user only — words, vocal tone, and visual presence.',
    '',
    ...ctx,
    '',
    'Return JSON exactly matching the schema.',
  ].join('\n');
}
