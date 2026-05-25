import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, licenceFrom, reserve, readJson, KEYS } from './_lib';

const BASE = 'https://generativelanguage.googleapis.com';
const MODEL = process.env.VANTAGE_GEMINI_MODEL || 'gemini-2.5-pro';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Native video analysis. Client uploads to Blob and sends { fileUrl, durationSec,
// mimeType, system, userMessage, schema }. We pre-check the video quota (hard cap),
// fetch the file, run Gemini Pro at 1fps/medium-res, and return the JSON result.
// NOTE: serverless memory/timeout limits apply — best for clips up to ~15–20 min;
// longer recordings should move to a queue/worker (documented as a next step).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const lic = licenceFrom(req);
  if (!KEYS.gemini) { res.status(500).json({ error: 'Server missing GEMINI_API_KEY' }); return; }
  const { fileUrl, durationSec, mimeType, system, userMessage, schema } = await readJson(req);
  if (!fileUrl) { res.status(400).json({ error: 'Missing fileUrl' }); return; }

  const r = await reserve(lic, 'video', Math.round(durationSec || 0));
  if (!r.ok) { res.status(r.status || 402).json({ error: r.reason }); return; }

  try {
    const media = await fetch(fileUrl);
    const bytes = Buffer.from(await media.arrayBuffer());
    const mime = mimeType || 'video/mp4';

    const start = await fetch(`${BASE}/upload/v1beta/files?key=${KEYS.gemini}`, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(bytes.length),
        'X-Goog-Upload-Header-Content-Type': mime, 'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { display_name: 'vantage-upload' } }),
    });
    const uploadUrl = start.headers.get('x-goog-upload-url');
    if (!uploadUrl) { res.status(502).json({ error: 'Gemini upload init failed' }); return; }
    const up = await fetch(uploadUrl, { method: 'POST', headers: { 'X-Goog-Upload-Command': 'upload, finalize', 'X-Goog-Upload-Offset': '0' }, body: bytes });
    let info = (await up.json()).file;
    let tries = 0;
    while (info?.state === 'PROCESSING' && tries++ < 90) { await sleep(2000); info = await (await fetch(`${BASE}/v1beta/${info.name}?key=${KEYS.gemini}`)).json(); }
    if (info?.state !== 'ACTIVE') { res.status(502).json({ error: 'Gemini could not process the video' }); return; }

    const body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ fileData: { mimeType: info.mimeType || mime, fileUri: info.uri }, videoMetadata: { fps: 1 } }, { text: userMessage }] }],
      generationConfig: { responseMimeType: 'application/json', ...(schema ? { responseSchema: schema } : {}), mediaResolution: 'MEDIA_RESOLUTION_MEDIUM', temperature: 0.4 },
    };
    const g = await fetch(`${BASE}/v1beta/models/${MODEL}:generateContent?key=${KEYS.gemini}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const gj = await g.json();
    if (!g.ok) { res.status(g.status).json({ error: gj?.error?.message || 'Gemini error' }); return; }
    const text = (gj.candidates?.[0]?.content?.parts || []).map((p: any) => p.text).join('').trim();
    res.setHeader('content-type', 'application/json').send(text);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
}
