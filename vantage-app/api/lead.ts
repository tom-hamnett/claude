// Lead capture for the marketing playbook download. Prototype: validates and logs.
// Wire to a CRM / email tool (HubSpot, Customer.io, a Google Sheet, etc.) by
// filling in the TODO. Falls back to a no-op log when nothing is configured, and
// optionally persists to Vercel KV when available so leads aren't lost.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, readJson } from './_lib';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const body = await readJson(req);
  const email = String(body?.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) { res.status(400).json({ error: 'A valid email is required.' }); return; }

  const lead = {
    email,
    company: String(body?.company || '').slice(0, 200),
    role: String(body?.role || '').slice(0, 200),
    seniority: String(body?.seniority || '').slice(0, 100),
    challenges: Array.isArray(body?.challenges) ? body.challenges.slice(0, 10).map(String) : [],
    recommendedModules: Array.isArray(body?.recommendedModules) ? body.recommendedModules.slice(0, 10) : [],
    source: String(body?.source || 'playbook').slice(0, 50),
    createdAt: Date.now(),
  };

  // Best-effort persistence to Vercel KV if configured (so leads survive).
  try {
    if (process.env.KV_REST_API_URL) {
      const { kv } = await import('@vercel/kv');
      await kv.set(`lead:${email}:${lead.createdAt}`, lead);
      await kv.sadd('leads', email);
    }
  } catch { /* ignore — non-blocking */ }

  // TODO: forward to your CRM / email platform here (HubSpot, Customer.io, …).
  console.log('[lead]', JSON.stringify(lead));

  res.status(200).json({ ok: true });
}
