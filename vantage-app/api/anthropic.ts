import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, licenceFrom, reserve, readJson, KEYS } from './_lib';

// Thin pass-through to Claude. The client builds the full Messages payload
// (system, messages, schema, etc.); we inject the key and meter (text = free).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const lic = licenceFrom(req);
  const r = await reserve(lic, 'transcript', 0);
  if (!r.ok) { res.status(r.status || 402).json({ error: r.reason }); return; }
  if (!KEYS.anthropic) { res.status(500).json({ error: 'Server missing ANTHROPIC_API_KEY' }); return; }
  const { payload } = await readJson(req);
  if (!payload) { res.status(400).json({ error: 'Missing payload' }); return; }
  const up = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': KEYS.anthropic, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(payload),
  });
  const text = await up.text();
  res.status(up.status).setHeader('content-type', 'application/json').send(text);
}
