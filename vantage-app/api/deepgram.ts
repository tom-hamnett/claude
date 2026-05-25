import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, licenceFrom, reserve, readJson, KEYS } from './_lib';

// Audio transcription. Client uploads the file to Blob and sends us the URL,
// so we bypass request-body limits. We meter audio quota by the detected duration.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const lic = licenceFrom(req);
  if (!KEYS.deepgram) { res.status(500).json({ error: 'Server missing DEEPGRAM_API_KEY' }); return; }
  const { fileUrl } = await readJson(req);
  if (!fileUrl) { res.status(400).json({ error: 'Missing fileUrl' }); return; }

  const media = await fetch(fileUrl);
  if (!media.ok) { res.status(400).json({ error: 'Could not read uploaded media' }); return; }
  const buf = Buffer.from(await media.arrayBuffer());

  const params = 'model=nova-2&diarize=true&punctuate=true&utterances=true&smart_format=true';
  const dg = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: 'POST',
    headers: { Authorization: `Token ${KEYS.deepgram}`, 'Content-Type': 'audio/*' },
    body: buf,
  });
  const data = await dg.json();
  if (!dg.ok) { res.status(dg.status).json(data); return; }

  const dur = data?.metadata?.duration || 0;
  const r = await reserve(lic, 'audio', dur);
  if (!r.ok) { res.status(r.status || 402).json({ error: r.reason }); return; }
  res.json(data);
}
