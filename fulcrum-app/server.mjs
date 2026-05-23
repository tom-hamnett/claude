#!/usr/bin/env node
// FULCRUM self-hosted server — run the whole app on your own machine with your
// own keys. No Vercel, no CORS, no serverless time/size limits, no per-user keys.
// Zero dependencies (Node 18+).
//
//   1) npm run build
//   2) GEMINI_API_KEY=... ANTHROPIC_API_KEY=... DEEPGRAM_API_KEY=... node server.mjs
//   3) open the printed http://localhost:8787  and choose Settings → "Self-hosted"
//
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');
const PORT = Number(process.env.PORT || 8787);
const GEMINI = process.env.GEMINI_API_KEY || '';
const ANTHROPIC = process.env.ANTHROPIC_API_KEY || '';
const DEEPGRAM = process.env.DEEPGRAM_API_KEY || '';
const GEMINI_MODEL = process.env.FULCRUM_GEMINI_MODEL || 'gemini-2.5-pro';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const RULES = `You are FULCRUM, an executive-presence & leadership-communication assessor.
Read the whole conversation for context but EVALUATE ONLY the user (the person identified, or the primary/most-frequent speaker; lines labelled "Me:" if present). Never rate other participants. Every finding must quote/timestamp a specific moment. Never penalise accent or introversion. Surface at most 3 priorities. Score competencies 1-4: composure, gravitas, conciseness, calibration, regulation, listening, inquiry, trust, observation, difficult, assertiveness, negotiation, consultative, self-awareness.
Return ONLY JSON: {"overall":number,"headline":"","situation":"","moduleScores":[{"moduleNumber":1,"score":3,"summary":""}],"findings":[{"type":"strength|growth","competencyId":"","moduleNumber":1,"timestampLabel":"","quote":"","note":"","suggestion":""}],"priorities":[{"title":"","why":"","moduleNumbers":[1],"drill":""}]}`;
const VIDEO_RULES = RULES + `\nThis is a VIDEO: also assess visual presence — eye contact, posture, gesture, stillness, expression — woven with tone and words.`;

const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
const parseJson = (t) => JSON.parse(String(t).replace(/^```json?\s*/i, '').replace(/```$/i, '').trim());

function readBody(req) {
  return new Promise((resolve) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => resolve(Buffer.concat(c))); });
}

async function anthropic(payload) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': ANTHROPIC, 'anthropic-version': '2023-06-01' }, body: JSON.stringify(payload),
  });
  return { status: r.status, text: await r.text() };
}

async function deepgram(buf, contentType) {
  const r = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&diarize=true&punctuate=true&utterances=true&smart_format=true', {
    method: 'POST', headers: { Authorization: `Token ${DEEPGRAM}`, 'Content-Type': contentType || 'audio/*' }, body: buf,
  });
  return { status: r.status, text: await r.text() };
}

async function geminiVideo(buf, mime, userMessage) {
  const start = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI}`, {
    method: 'POST', headers: { 'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start', 'X-Goog-Upload-Header-Content-Length': String(buf.length), 'X-Goog-Upload-Header-Content-Type': mime, 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: { display_name: 'fulcrum' } }),
  });
  const uploadUrl = start.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('Gemini upload init failed');
  const up = await fetch(uploadUrl, { method: 'POST', headers: { 'X-Goog-Upload-Command': 'upload, finalize', 'X-Goog-Upload-Offset': '0' }, body: buf });
  let info = (await up.json()).file;
  let tries = 0;
  while (info?.state === 'PROCESSING' && tries++ < 120) { await sleep(2000); info = await (await fetch(`https://generativelanguage.googleapis.com/v1beta/${info.name}?key=${GEMINI}`)).json(); }
  if (info?.state !== 'ACTIVE') throw new Error('Gemini could not process the video');
  const body = {
    systemInstruction: { parts: [{ text: VIDEO_RULES }] },
    contents: [{ role: 'user', parts: [{ fileData: { mimeType: info.mimeType || mime, fileUri: info.uri }, videoMetadata: { fps: 1 } }, { text: userMessage }] }],
    generationConfig: { responseMimeType: 'application/json', mediaResolution: 'MEDIA_RESOLUTION_MEDIUM', temperature: 0.4 },
  };
  const g = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const gj = await g.json();
  if (!g.ok) throw new Error(gj?.error?.message || 'Gemini error');
  return parseJson((gj.candidates?.[0]?.content?.parts || []).map((p) => p.text).join(''));
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon' };

function serveStatic(req, res) {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = path.join(DIST, p);
  if (!file.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  try {
    if (url.pathname === '/api/anthropic' && req.method === 'POST') {
      if (!ANTHROPIC) return json(res, 500, { error: 'Server missing ANTHROPIC_API_KEY' });
      const body = JSON.parse((await readBody(req)).toString() || '{}');
      const { status, text } = await anthropic(body.payload);
      res.writeHead(status, { 'content-type': 'application/json' }); return res.end(text);
    }
    if (url.pathname === '/api/transcribe' && req.method === 'POST') {
      if (!DEEPGRAM) return json(res, 500, { error: 'Server missing DEEPGRAM_API_KEY' });
      const buf = await readBody(req);
      const { status, text } = await deepgram(buf, req.headers['content-type']);
      res.writeHead(status, { 'content-type': 'application/json' }); return res.end(text);
    }
    if (url.pathname === '/api/video' && req.method === 'POST') {
      if (!GEMINI) return json(res, 500, { error: 'Server missing GEMINI_API_KEY' });
      const buf = await readBody(req);
      const who = url.searchParams.get('whoAmI') || 'the primary speaker';
      const interaction = url.searchParams.get('interaction') || 'conversation';
      const modules = url.searchParams.get('modules') || '';
      const mime = req.headers['content-type'] || 'video/mp4';
      const userMessage = `Watch the whole recording and evaluate the user only — words, vocal tone, and visual presence. Interaction: ${interaction}. The user is: ${who}. Focus modules: ${modules}. Return only the JSON.`;
      const result = await geminiVideo(buf, mime, userMessage);
      return json(res, 200, result);
    }
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'Unknown endpoint' });
    return serveStatic(req, res);
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
});

if (!fs.existsSync(DIST)) { console.error('No dist/ found. Run `npm run build` first.'); process.exit(1); }
server.listen(PORT, () => {
  console.log(`\n  FULCRUM running at  http://localhost:${PORT}\n`);
  console.log(`  Engines:  Anthropic ${ANTHROPIC ? 'on' : 'OFF'} · Gemini video ${GEMINI ? 'on' : 'OFF'} · Deepgram audio ${DEEPGRAM ? 'on' : 'OFF'}`);
  console.log(`  In the app: Settings → AI engine → "Self-hosted".\n`);
});
