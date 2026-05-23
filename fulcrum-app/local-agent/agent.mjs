#!/usr/bin/env node
// FULCRUM local passive agent — watches a folder for transcripts and evaluates
// them with your Anthropic key. Opt-in, local-only. No dependencies.
//
//   ANTHROPIC_API_KEY=sk-ant-... node agent.mjs /path/to/transcripts
//
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!dir) { console.error('Usage: node agent.mjs <folder>'); process.exit(1); }
if (!apiKey) { console.error('Set ANTHROPIC_API_KEY first.'); process.exit(1); }

const EXT = new Set(['.txt', '.vtt', '.srt', '.md']);
const MODEL = process.env.FULCRUM_MODEL || 'claude-opus-4-7';

const SYSTEM = `You are FULCRUM, an executive-presence and leadership-communication assessor.
Rules: read the whole conversation for context but EVALUATE ONLY the user (lines labelled "Me:"; if unlabelled, the whole text is the user). Never rate other participants. Every finding must quote a specific moment. Never penalise accent or introversion. Surface at most 3 priorities.
Score these competencies 1-4: composure, gravitas, conciseness, calibration, regulation, listening, inquiry, trust, observation, difficult, assertiveness, negotiation, consultative, self-awareness.
Return ONLY JSON: {"overall":n,"headline":"","situation":"","findings":[{"type":"strength|growth","competency":"","quote":"","note":"","suggestion":""}],"priorities":[{"title":"","why":"","drill":""}]}`;

function stripCues(t) {
  return t.split(/\r?\n/).filter((l) => !/^\s*WEBVTT/.test(l) && !/^\s*\d+\s*$/.test(l) && !/-->/.test(l)).join('\n').trim();
}

async function analyze(file) {
  const out = file.replace(/\.[^.]+$/, '') + '.fulcrum.json';
  if (fs.existsSync(out)) return;
  const transcript = stripCues(fs.readFileSync(file, 'utf8'));
  if (!transcript) return;
  console.log(`→ evaluating ${path.basename(file)}`);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      thinking: { type: 'adaptive' },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `Evaluate this conversation for the user only:\n"""\n${transcript}\n"""\nReturn only the JSON.` }],
    }),
  });
  if (!res.ok) { console.error(`  API error ${res.status}: ${await res.text()}`); return; }
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  const json = text.replace(/^```json?\s*/i, '').replace(/```$/, '');
  fs.writeFileSync(out, json);
  console.log(`  ✓ report written: ${path.basename(out)}`);
}

console.log(`FULCRUM agent watching ${dir} (model ${MODEL}). Drop transcripts in. Ctrl-C to stop.`);
for (const f of fs.readdirSync(dir)) if (EXT.has(path.extname(f))) analyze(path.join(dir, f)).catch(console.error);
fs.watch(dir, (_e, f) => {
  if (f && EXT.has(path.extname(f))) {
    const full = path.join(dir, f);
    setTimeout(() => fs.existsSync(full) && analyze(full).catch(console.error), 400);
  }
});
