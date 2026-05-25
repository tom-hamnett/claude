#!/usr/bin/env node
// VANTAGE local capture agent — watches folders for recordings and evaluates them.
// LOCAL-FIRST by default: transcription, signal extraction and PII redaction run on
// THIS machine; only a minimal, redacted evidence package (redacted transcript +
// numeric signals) is sent to the judge. Raw audio/video never leaves the device
// unless you explicitly pass --cloud.
//
//   ANTHROPIC_API_KEY=...  node agent.mjs "<folder>" [--every <min>]
//   (local-first needs ffmpeg + a local Whisper — see README and transcribe.mjs)
//
//   Opt-in raw-media cloud path (full visual presence via Gemini, cloud ASR via Deepgram):
//   ANTHROPIC_API_KEY=... GEMINI_API_KEY=... DEEPGRAM_API_KEY=... node agent.mjs "<folder>" --cloud
import fs from 'node:fs';
import path from 'node:path';
import { redact, summariseCounts } from './redact.mjs';
import { extractSignals } from './signals.mjs';
import { transcribe, localAvailable } from './transcribe.mjs';

const rawArgs = process.argv.slice(2);
let everyMin = 0;
let cloud = false;
const folders = [];
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--every') everyMin = Number(rawArgs[++i]) || 0;
  else if (rawArgs[i] === '--cloud') cloud = true;
  else folders.push(rawArgs[i]);
}
if (!folders.length) { console.error('Usage: node agent.mjs <folder> [more folders...] [--every <minutes>] [--cloud]'); process.exit(1); }

const ANTHROPIC = process.env.ANTHROPIC_API_KEY;
const GEMINI = process.env.GEMINI_API_KEY;
const DEEPGRAM = process.env.DEEPGRAM_API_KEY;
const DAILY_VIDEO_MIN = Number(process.env.VANTAGE_DAILY_VIDEO_MIN || 60);
const GEMINI_MODEL = process.env.VANTAGE_GEMINI_MODEL || 'gemini-2.5-pro';

const VIDEO = new Set(['.mp4', '.mov', '.webm', '.mkv', '.m4v']);
const AUDIO = new Set(['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.flac']);
const TEXT = new Set(['.txt', '.vtt', '.srt', '.md']);
const STATE = path.join(process.cwd(), '.vantage-agent-usage.json');

const RULES = `You are VANTAGE, an executive-presence & leadership-communication assessor.
Rules: read the whole conversation for context but EVALUATE ONLY the user (the primary/most-frequent speaker; lines labelled "Me:" if present). Never rate other participants. Every finding must quote a specific moment. Never penalise accent or introversion. Surface at most 3 priorities. Score competencies 1-4: composure, gravitas, conciseness, calibration, regulation, listening, inquiry, trust, observation, difficult, assertiveness, negotiation, consultative, self-awareness.
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

// Judge from the MINIMAL EVIDENCE PACKAGE — redacted transcript + local signals.
async function judgeText(transcript, durationSec) {
  const { text, counts } = redact(transcript);
  const signals = extractSignals(text, durationSec);
  const user = `Evaluate the user (primary speaker: ${signals.primarySpeaker}) only.
Deterministic signals computed locally (anchor your scores to these; don't just restate them):
${JSON.stringify(signals)}
Redacted transcript (PII removed on-device):
"""
${text}
"""
Return only the JSON.`;
  const result = await anthropic(RULES, user);
  return { result, egress: `redacted transcript + signals (${summariseCounts(counts)})` };
}

// Opt-in raw-media cloud path: full visual presence via native Gemini video.
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
  try { const mb = fs.statSync(file).size / 1e6; return Math.max(1, Math.round(mb / 8)); } catch { return 5; }
}

async function processFile(file) {
  const out = file.replace(/\.[^.]+$/, '') + '.vantage.json';
  if (fs.existsSync(out)) return;
  const ext = path.extname(file).toLowerCase();
  if (!VIDEO.has(ext) && !AUDIO.has(ext) && !TEXT.has(ext)) return;
  if (!ANTHROPIC) { console.log(`  (skip, no ANTHROPIC_API_KEY) ${path.basename(file)}`); return; }
  try {
    let result, egress, mode;

    if (TEXT.has(ext)) {
      mode = 'local';
      const r = await judgeText(strip(fs.readFileSync(file, 'utf8')), 0);
      result = r.result; egress = r.egress;
    } else if (localAvailable()) {
      // LOCAL-FIRST: raw media stays on device; we transcribe + extract signals locally.
      mode = 'local';
      console.log(`→ ${VIDEO.has(ext) ? 'video' : 'audio'} (local): ${path.basename(file)}`);
      const { transcript, durationSec } = await transcribe(file, { cloudAllowed: false });
      const r = await judgeText(transcript, durationSec);
      result = r.result; egress = r.egress + (VIDEO.has(ext) ? ' · visual presence not analysed in local mode (use --cloud for native video)' : '');
    } else if (cloud && VIDEO.has(ext) && GEMINI) {
      // OPT-IN raw-media cloud path with full visual presence.
      mode = 'cloud';
      const u = loadUsage();
      const mins = durationMin(file);
      if (DAILY_VIDEO_MIN > 0 && u.videoMin + mins > DAILY_VIDEO_MIN) { console.log(`  (daily video budget reached, queuing) ${path.basename(file)}`); return; }
      console.log(`→ video (CLOUD, raw upload): ${path.basename(file)}`);
      result = await gemini(file);
      egress = 'RAW VIDEO uploaded to Gemini';
      saveUsage({ date: u.date, videoMin: u.videoMin + mins });
    } else if (cloud && DEEPGRAM) {
      // OPT-IN cloud ASR (audio leaves the device) → redacted text judge.
      mode = 'cloud';
      console.log(`→ ${VIDEO.has(ext) ? 'video' : 'audio'} (CLOUD ASR): ${path.basename(file)}`);
      const { transcript, durationSec } = await transcribe(file, { cloudAllowed: true, deepgramKey: DEEPGRAM });
      const r = await judgeText(transcript, durationSec);
      result = r.result; egress = 'RAW AUDIO uploaded to Deepgram, then ' + r.egress;
    } else {
      console.log(`  (skip ${path.basename(file)}) local ASR unavailable — install ffmpeg + a local Whisper, or run with --cloud`);
      return;
    }

    fs.writeFileSync(out, JSON.stringify(result, null, 2));
    console.log(`  ✓ ${path.basename(out)}  [${mode}] sent: ${egress}`);
  } catch (e) { console.error(`  ✗ ${path.basename(file)}: ${e.message}`); }
}

function scanAll() {
  for (const dir of folders) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) processFile(path.join(dir, f));
  }
}

const localOn = localAvailable();
const privacy = localOn
  ? 'local-first (raw media stays on device; only redacted transcript + signals egress)'
  : (cloud ? 'CLOUD fallback enabled (raw media may be uploaded)' : 'local ASR unavailable — install ffmpeg + Whisper, or pass --cloud');
console.log(`VANTAGE agent watching:\n${folders.map((f) => '  ' + f).join('\n')}
Privacy: ${privacy}
Judge ${ANTHROPIC ? 'on (Claude)' : 'OFF — set ANTHROPIC_API_KEY'} · ${everyMin > 0 ? 'rescan every ' + everyMin + 'm' : 'real-time'}. Ctrl-C to stop.`);
scanAll();
for (const dir of folders) {
  if (!fs.existsSync(dir)) { console.error(`  (missing) ${dir}`); continue; }
  fs.watch(dir, (_e, f) => { if (f) { const full = path.join(dir, f); setTimeout(() => fs.existsSync(full) && processFile(full), 800); } });
}
if (everyMin > 0) setInterval(scanAll, everyMin * 60 * 1000);
