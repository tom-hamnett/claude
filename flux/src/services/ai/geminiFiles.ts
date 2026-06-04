import { AIError } from './types';

/**
 * Gemini Files API — resumable upload for media too large to inline (audio,
 * video, big PDFs). Returns a fileUri that generateContent can reference via a
 * fileData part. Browser-direct, using the same API key as the rest of Gemini.
 *
 * Flow (per Google's resumable protocol):
 *   1) POST .../upload/v1beta/files  (command: start) → returns an upload URL
 *   2) POST <upload URL>             (command: upload, finalize) with the bytes
 *   3) GET  .../v1beta/files/<id>    poll until state === ACTIVE
 */
const BASE = 'https://generativelanguage.googleapis.com';

function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function uploadFileToGemini(opts: {
  apiKey: string;
  dataB64: string;
  mime: string;
  name?: string;
  signal?: AbortSignal;
}): Promise<{ fileUri: string; mimeType: string }> {
  const bytes = b64ToBytes(opts.dataB64);
  const numBytes = bytes.byteLength;
  // Copy into a plain ArrayBuffer so it satisfies BodyInit/BufferSource (TS 5.7+).
  const body = new ArrayBuffer(numBytes);
  new Uint8Array(body).set(bytes);

  // 1) Start resumable session.
  let startResp: Response;
  try {
    startResp = await fetch(`${BASE}/upload/v1beta/files?key=${encodeURIComponent(opts.apiKey)}`, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(numBytes),
        'X-Goog-Upload-Header-Content-Type': opts.mime,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { display_name: opts.name ?? 'flux-source' } }),
      signal: opts.signal,
    });
  } catch (err) {
    throw new AIError(err instanceof Error ? err.message : 'Network error starting Gemini upload.', { provider: 'gemini' });
  }
  if (!startResp.ok) {
    throw new AIError(`Gemini upload start failed (${startResp.status}). If this is a CORS error, large-file upload needs a proxy.`, {
      provider: 'gemini',
      status: startResp.status,
    });
  }
  const uploadUrl = startResp.headers.get('X-Goog-Upload-URL') || startResp.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new AIError('Gemini did not return an upload URL.', { provider: 'gemini' });

  // 2) Upload bytes and finalize. (Do NOT set Content-Length — the browser sets it.)
  let upResp: Response;
  try {
    upResp = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' },
      body,
      signal: opts.signal,
    });
  } catch (err) {
    throw new AIError(err instanceof Error ? err.message : 'Network error uploading to Gemini.', { provider: 'gemini' });
  }
  if (!upResp.ok) {
    throw new AIError(`Gemini upload failed (${upResp.status}).`, { provider: 'gemini', status: upResp.status });
  }
  const uploaded = (await upResp.json()) as { file?: { name?: string; uri?: string; mimeType?: string; state?: string } };
  let file = uploaded.file;
  if (!file?.uri || !file.name) throw new AIError('Gemini upload returned no file reference.', { provider: 'gemini' });

  // 3) Poll until ACTIVE (video/large audio is processed asynchronously).
  let state = file.state ?? 'PROCESSING';
  for (let i = 0; i < 40 && state === 'PROCESSING'; i++) {
    await sleep(2000);
    const poll = await fetch(`${BASE}/v1beta/${file.name}?key=${encodeURIComponent(opts.apiKey)}`, { signal: opts.signal });
    if (poll.ok) {
      const pd = (await poll.json()) as { uri?: string; mimeType?: string; state?: string };
      state = pd.state ?? state;
      file = { ...file, uri: pd.uri ?? file.uri, mimeType: pd.mimeType ?? file.mimeType };
    }
  }
  if (state === 'FAILED') throw new AIError('Gemini could not process this file. Try a smaller/standard format.', { provider: 'gemini' });
  if (state === 'PROCESSING') throw new AIError('Gemini is still processing the file — try again in a moment.', { provider: 'gemini' });

  return { fileUri: file.uri!, mimeType: file.mimeType ?? opts.mime };
}
