#!/usr/bin/env node
// FULCRUM local capture agent — watches folders for recordings and evaluates
// them at full quality. Opt-in, local, no dependencies (Node 18+).
//
//   GEMINI_API_KEY=...  ANTHROPIC_API_KEY=...  DEEPGRAM_API_KEY=... \
//   node agent.mjs "<folder1>" "<folder2>" ...
//
// Point it at your OneDrive / Google Drive / Zoom recording folders (which sync
// automatically) and it becomes your Teams/Meet/Zoom capture connector — no
// OAuth app needed. Video → Gemini Pro; audio → Deepgram + Claude; transcript → Claude.
import fs from 'node:fs';
import path from 'node:path';

const rawArgs = process.argv.slice(2);
let everyMin = 0;
const folders = [];
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--every') everyMin = Number(rawArgs[++i]) || 0;
  else folders.push(rawArgs[i]);
}
if (!folders.length) { console.error('Usage: node agent.mjs <folder> [more folders...] [--every <minutes>]'); process.exit(1); }

const GEMINI = process.env.GEMINI_API_KEY;
const ANTHROPIC = process.env.ANTHROPIC_API_KEY;
const DEEPGRAM = process.env.DEEPGRAM_API_KEY;
const DAILY_VIDEO_MIN = Number(process.env.FULCRUM_DAILY_VIDEO_MIN || 60);
const GEMINI_MODEL = process.env.FULCRUM_GEMINI_MODEL || 'gemini-2.5-pro';

const VIDEO = new Set(['.mp4', '.mov', '.webm', '.mkv', '.m4v']);
const AUDIO = new Set(['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.flac']);
const TEXT = new Set(['.txt', '.vtt', '.srt', '.md']);
const STATE = path.join(process.cwd(), '.fulcrum-agent-usage.json');

const RULES = `You are FULCRUM, an executive-presence & leadership-communication assessor.
Rules: read the whole conversation for context but EVALUATE ONLY the user (the primary/most-frequent speaker; lines labelled "Me:" if present). Never rate other participants. Every finding must quote/timestamp a specific moment. Never penalise accent or introversion. Surface at most 3 priorities. Score competencies 1-4: composure, gravitas, conciseness, calibration, regulation, listening, inquiry, trust, observation, difficult, assertiveness, negotiation, consultative, self-awareness.
Return ONLY JSON: {"overall":n,"headline":"","situation":"","findings":[{"type":"strength|growth","competency":"","quote":"","note":"","suggestion":""}],"priorities":[{"title":"","why":"","drill":""}]}`;

const VIDEO_RULES = RULES + `\nThis is a VIDEO: also assess visual presence — eye contact, posture, gesture, stillness, expression — and weave it with tone and words.`;

function loadUsage() {
  const today = new Date().toISOString().slice(0, 10);
  try { const s = JSON.parse(fs.readFileSync(STATE, 'utf8')); if (s.date === today) return s; } catch { /* ignore */ }
  return { date: today, videoMin: 0 };
}
function saveUsage(u) { try { fs.writeFileSync(STATE, JSON.stringify(u)); } catch { /* ignore */ } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (t) => t.split(/\r?\n/).filter((l) => !/^\s*WEBVTT/.test(l) && !/^\s*\d+\s*$/.test(l) && !/-->/.test(l)).join('\n').trim();
function parseJson(t) { return JSON.parse(t.replace(/^```json?\s*/i, '').replace(/```$/i, '').trim()); }

async function anthropic(system, user) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': ANTHROPIC, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-opus-4-7', max_tokens: 4000, thinking: { type: 'adaptive' }, system: [{ type: 'text', text: system }], messages: [{ role: 'user', content: user }] }),
  });
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${await r.text()}`);
  const d = await r.json();
  return parseJson((d.content || []).filter((b) => b.type === 'text').map((b) => b.text).join(''));
}

async function deepgram(file) {
  const buf = fs.readFileSync(file);
  const r = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&diarize=true&punctuate=true&utterances=true&smart_format=true', {
    method: 'POST', headers: { Authorization: `Token ${DEEPGRAM}`, 'Content-Type': 'audio/*' }, body: buf,
  });
  if (!r.ok) throw new Error(`Deepgram ${r.status}`);
  const d = await r.json();
  const us = d?.results?.utterances || [];
  return us.map((u) => `Speaker ${u.speaker ?? 0}: ${u.transcript}`).join('\n') || d?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
}

async function gemini(file) {
  const buf = fs.readFileSync(file);
  const start = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI}`, {
    method: 'POST',
    headers: { 'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start', 'X-Goog-Upload-Header-Content-Length': String(buf.length), 'X-Goog-Upload-Header-Content-Type': 'video/mp4', 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: { display_name: path.basename(file) } }),
  });
  const uploadUrl = start.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('Gemini upload init failed');
  const up = await fetch(uploadUrl, { method: 'POST', headers: { 'X-Goog-Upload-Command': 'upload, finalize', 'X-Goog-Upload-Offset': '0' }, body: buf });
  let info = (await up.json()).file;
  let tries = 0;
  while (info.state === 'PROCESSING' && tries++ < 90) { await sleep(2000); info = await (await fetch(`https://generativelanguage.googleapis.com/v1beta/${info.name}?key=${GEMINI}`)).json(); }
  if (info.state !== 'ACTIVE') throw new Error('Gemini processing failed');
  const body = {
    systemInstruction: { parts: [{ text: VIDEO_RULES }] },
    contents: [{ role: 'user', parts: [{ fileData: { mimeType: info.mimeType, fileUri: info.uri }, videoMetadata: { fps: 1 } }, { text: 'Evaluate the user only. Return only the JSON.' }] }],
    generationConfig: { responseMimeType: 'application/json', mediaResolution: 'MEDIA_RESOLUTION_MEDIUM' },
  };
  const g = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const gj = await g.json();
  if (!g.ok) throw new Error(gj?.error?.message || 'Gemini error');
  return parseJson((gj.candidates?.[0]?.content?.parts || []).map((p) => p.text).join(''));
}

function durationMin(file) {
  // rough: assume we can't probe without ffprobe; estimate from file size as a fallback cap guard.
  try { const mb = fs.statSync(file).size / 1e6; return Math.max(1, Math.round(mb / 8)); } catch { return 5; }
}

async function process(file) {
  const out = file.replace(/\.[^.]+$/, '') + '.fulcrum.json';
  if (fs.existsSync(out)) return;
  const ext = path.extname(file).toLowerCase();
  try {
    let result;
    if (VIDEO.has(ext)) {
      if (!GEMINI) { console.log(`  (skip video, no GEMINI_API_KEY) ${path.basename(file)}`); return; }
      const u = loadUsage();
      const mins = durationMin(file);
      if (DAILY_VIDEO_MIN > 0 && u.videoMin + mins > DAILY_VIDEO_MIN) { console.log(`  (daily video budget reached, queuing) ${path.basename(file)}`); return; }
      console.log(`→ video: ${path.basename(file)}`);
      result = await gemini(file);
      saveUsage({ date: u.date, videoMin: u.videoMin + mins });
    } else if (AUDIO.has(ext)) {
      if (!DEEPGRAM || !ANTHROPIC) { console.log(`  (skip audio, need DEEPGRAM_API_KEY + ANTHROPIC_API_KEY) ${path.basename(file)}`); return; }
      console.log(`→ audio: ${path.basename(file)}`);
      const transcript = await deepgram(file);
      result = await anthropic(RULES, `Evaluate the primary speaker (the user) only:\n"""\n${transcript}\n"""\nReturn only the JSON.`);
    } else if (TEXT.has(ext)) {
      if (!ANTHROPIC) { console.log(`  (skip transcript, no ANTHROPIC_API_KEY) ${path.basename(file)}`); return; }
      console.log(`→ transcript: ${path.basename(file)}`);
      result = await anthropic(RULES, `Evaluate the user only:\n"""\n${strip(fs.readFileSync(file, 'utf8'))}\n"""\nReturn only the JSON.`);
    } else { return; }
    fs.writeFileSync(out, JSON.stringify(result, null, 2));
    console.log(`  ✓ ${path.basename(out)}`);
  } catch (e) { console.error(`  ✗ ${path.basename(file)}: ${e.message}`); }
}

function scanAll() {
  for (const dir of folders) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) process(path.join(dir, f));
  }
}

console.log(`FULCRUM agent watching:\n${folders.map((f) => '  ' + f).join('\n')}\nVideo ${GEMINI ? 'on (Gemini ' + GEMINI_MODEL + ')' : 'off'} · Audio ${DEEPGRAM && ANTHROPIC ? 'on' : 'off'} · Daily video budget ${DAILY_VIDEO_MIN}m · ${everyMin > 0 ? 'rescan every ' + everyMin + 'm' : 'real-time'}. Ctrl-C to stop.`);
scanAll();
for (const dir of folders) {
  if (!fs.existsSync(dir)) { console.error(`  (missing) ${dir}`); continue; }
  fs.watch(dir, (_e, f) => { if (f) { const full = path.join(dir, f); setTimeout(() => fs.existsSync(full) && process(full), 800); } });
}
if (everyMin > 0) setInterval(scanAll, everyMin * 60 * 1000);
