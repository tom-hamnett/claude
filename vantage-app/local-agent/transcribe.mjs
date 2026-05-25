// Local-first transcription. Prefers an on-device engine so raw audio/video never
// leaves the machine; falls back to cloud ASR only if explicitly allowed.
//
// On-device path needs:  ffmpeg (audio extract + duration)  +  a local Whisper.
// Whisper is auto-detected, or set it explicitly:
//   VANTAGE_WHISPER_CMD='whisper-cli -m /path/ggml-base.en.bin -f {in} -otxt -of {out}'
//   (use {in} for the wav path and {out} for the output basename; .txt is read back)
// Known engines auto-tried: whisper-cli, main (whisper.cpp), whisper (OpenAI CLI).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const has = (cmd) => { try { return spawnSync(cmd, ['--help'], { stdio: 'ignore' }).status !== null; } catch { return false; } };

export function hasFfmpeg() { return has('ffmpeg'); }

export function probeDurationSec(file) {
  try {
    const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' });
    const s = parseFloat((r.stdout || '').trim());
    return Number.isFinite(s) ? Math.round(s) : 0;
  } catch { return 0; }
}

function extractAudio(file) {
  const wav = path.join(os.tmpdir(), `vantage-${Date.now()}.wav`);
  const r = spawnSync('ffmpeg', ['-y', '-i', file, '-ac', '1', '-ar', '16000', '-vn', wav], { stdio: 'ignore' });
  if (r.status !== 0 || !fs.existsSync(wav)) throw new Error('ffmpeg audio extraction failed');
  return wav;
}

// Resolve a local whisper invocation. Returns a function (wavPath) -> transcript, or null.
function findWhisper() {
  const tmpl = process.env.VANTAGE_WHISPER_CMD;
  if (tmpl) return (wav) => runTemplate(tmpl, wav);
  for (const bin of ['whisper-cli', 'main']) { // whisper.cpp
    const model = process.env.VANTAGE_WHISPER_MODEL;
    if (has(bin) && model) return (wav) => runTemplate(`${bin} -m ${model} -f {in} -otxt -of {out}`, wav);
  }
  if (has('whisper')) { // OpenAI/openai-whisper CLI
    return (wav) => {
      const dir = path.dirname(wav);
      const r = spawnSync('whisper', [wav, '--model', process.env.VANTAGE_WHISPER_MODEL || 'base', '--output_format', 'txt', '--output_dir', dir], { encoding: 'utf8' });
      if (r.status !== 0) throw new Error('whisper CLI failed');
      const txt = wav.replace(/\.wav$/, '.txt');
      return fs.existsSync(txt) ? fs.readFileSync(txt, 'utf8').trim() : (r.stdout || '').trim();
    };
  }
  return null;
}

function runTemplate(tmpl, wav) {
  const out = path.join(os.tmpdir(), `vantage-out-${Date.now()}`);
  const args = tmpl.replace('{in}', wav).replace('{out}', out).split(/\s+/);
  const r = spawnSync(args[0], args.slice(1), { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${args[0]} failed`);
  const txt = `${out}.txt`;
  const text = fs.existsSync(txt) ? fs.readFileSync(txt, 'utf8') : (r.stdout || '');
  return text.replace(/\[\d{2}:\d{2}[:.]\d{2}.*?\]/g, '').trim(); // strip whisper.cpp timestamps if present
}

export function localAvailable() { return hasFfmpeg() && !!findWhisper(); }

async function deepgram(file, key) {
  const buf = fs.readFileSync(file);
  const r = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&diarize=true&punctuate=true&utterances=true&smart_format=true', {
    method: 'POST', headers: { Authorization: `Token ${key}`, 'Content-Type': 'audio/*' }, body: buf,
  });
  if (!r.ok) throw new Error(`Deepgram ${r.status}`);
  const d = await r.json();
  const us = d?.results?.utterances || [];
  return us.map((u) => `Speaker ${u.speaker ?? 0}: ${u.transcript}`).join('\n') || d?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
}

/**
 * Transcribe a media file.
 * @returns {Promise<{transcript:string, source:'local'|'cloud', durationSec:number}>}
 */
export async function transcribe(file, { cloudAllowed = false, deepgramKey = '' } = {}) {
  if (localAvailable()) {
    const durationSec = probeDurationSec(file);
    const wav = extractAudio(file);
    try {
      const whisper = findWhisper();
      const transcript = whisper(wav);
      if (!transcript) throw new Error('empty local transcript');
      return { transcript, source: 'local', durationSec };
    } finally { try { fs.unlinkSync(wav); } catch { /* ignore */ } }
  }
  if (cloudAllowed && deepgramKey) {
    const transcript = await deepgram(file, deepgramKey);
    return { transcript, source: 'cloud', durationSec: 0 };
  }
  throw new Error('no local ASR (install ffmpeg + a local Whisper, or pass --cloud with DEEPGRAM_API_KEY)');
}

// self-test (capability probe only):  node transcribe.mjs
const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  console.log('ffmpeg:', hasFfmpeg());
  console.log('local whisper:', !!findWhisper());
  console.log('local ASR available:', localAvailable());
}
