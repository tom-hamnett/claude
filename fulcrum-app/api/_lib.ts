// Shared helpers for the FULCRUM managed proxy (Vercel serverless functions).
// Holds provider keys server-side, validates a FULCRUM licence key, and meters
// per-account quota in Vercel KV. Falls back to "open dev mode" when KV is not
// configured so the proxy still runs for local testing.
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const KEYS = {
  gemini: process.env.GEMINI_API_KEY || '',
  anthropic: process.env.ANTHROPIC_API_KEY || '',
  deepgram: process.env.DEEPGRAM_API_KEY || '',
};

// Default plan granted to a licence on first use (override via env).
const PLAN = {
  videoSec: Number(process.env.FULCRUM_PLAN_VIDEO_MIN || 60) * 60,
  audioSec: Number(process.env.FULCRUM_PLAN_AUDIO_MIN || 600) * 60,
};

export function cors(req: VercelRequest, res: VercelResponse): boolean {
  res.setHeader('Access-Control-Allow-Origin', process.env.FULCRUM_ALLOW_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-fulcrum-key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}

export function licenceFrom(req: VercelRequest): string {
  return (req.headers['x-fulcrum-key'] as string) || (req.body && (req.body as any).license) || '';
}

let _kv: any = null;
async function kv() {
  if (_kv) return _kv;
  if (!process.env.KV_REST_API_URL) return null;
  const m = await import('@vercel/kv');
  _kv = m.kv;
  return _kv;
}

interface Rec { period: string; videoSec: number; audioSec: number; limits: { videoSec: number; audioSec: number } }
const period = () => new Date().toISOString().slice(0, 7); // YYYY-MM

async function load(license: string): Promise<Rec> {
  const store = await kv();
  const fresh: Rec = { period: period(), videoSec: 0, audioSec: 0, limits: { ...PLAN } };
  if (!store) return fresh;
  const rec = (await store.get(`lic:${license}`)) as Rec | null;
  if (!rec) return fresh;
  if (rec.period !== period()) return { ...rec, period: period(), videoSec: 0, audioSec: 0 };
  return rec;
}
async function save(license: string, rec: Rec) {
  const store = await kv();
  if (store) await store.set(`lic:${license}`, rec);
}

/** Returns { ok } and the (post-reservation) record. transcript is unlimited. */
export async function reserve(license: string, kind: 'video' | 'audio' | 'transcript', sec: number) {
  if (!license && process.env.FULCRUM_DEV_OPEN !== 'true') return { ok: false, status: 401, reason: 'Missing FULCRUM key.' };
  const store = await kv();
  if (!store) return { ok: true as const, rec: null }; // dev mode: no metering
  const rec = await load(license);
  if (kind === 'video' && rec.videoSec + sec > rec.limits.videoSec) return { ok: false, status: 402, reason: 'Monthly video quota reached. Top up to continue.' };
  if (kind === 'audio' && rec.audioSec + sec > rec.limits.audioSec) return { ok: false, status: 402, reason: 'Monthly audio quota reached. Top up to continue.' };
  if (kind === 'video') rec.videoSec += sec;
  if (kind === 'audio') rec.audioSec += sec;
  await save(license, rec);
  return { ok: true as const, rec };
}

export async function usage(license: string): Promise<Rec> {
  return load(license);
}

export async function readJson(req: VercelRequest): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); } });
  });
}
