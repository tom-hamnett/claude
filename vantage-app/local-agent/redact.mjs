// Local PII / sensitive-content redaction. Runs on the user's machine before any
// text leaves it. Rules-based (no model, no network). Returns redacted text plus
// counts of what was removed, so the agent can report exactly what was minimised.
//
// Extend with your own sensitive terms (client/company/people names) via:
//   VANTAGE_REDACT_TERMS="Acme Corp,Project Titan,Jane Doe"
import { pathToFileURL } from 'node:url';

const PATTERNS = [
  // order matters: most specific first
  ['[EMAIL]', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g],
  ['[URL]', /\b(?:https?:\/\/|www\.)[^\s)]+/gi],
  ['[CARD]', /\b(?:\d[ -]?){13,16}\b/g],
  // phone: optional +, brackets, 7+ digits with separators — but not pure HH:MM(:SS) timecodes
  ['[PHONE]', /(?<!\d)(?:\+?\d{1,3}[ .-]?)?(?:\(\d{1,4}\)[ .-]?)?\d{2,4}[ .-]?\d{3,4}[ .-]?\d{2,4}(?!\d)/g],
  ['[ID]', /\b[A-Z]{2,}\d{4,}\b/g], // ref/booking/NI-style alphanum ids
];

// Keep timecodes (00:00, 0:00:00, [00:01:23]) and short numbers intact.
const TIMECODE = /^\[?\d{1,2}:\d{2}(:\d{2})?\]?$/;

function redactPhones(text) {
  return text.replace(PATTERNS[3][1], (m) => {
    const digits = (m.match(/\d/g) || []).length;
    if (digits < 7) return m;                 // too short to be a phone number
    if (TIMECODE.test(m.trim())) return m;    // a timecode, not a phone
    return '[PHONE]';
  });
}

export function redact(input, extraTerms = process.env.VANTAGE_REDACT_TERMS) {
  let text = String(input || '');
  const counts = {};
  const bump = (label, n) => { if (n) counts[label] = (counts[label] || 0) + n; };

  for (const [label, re] of PATTERNS) {
    if (label === '[PHONE]') continue; // handled separately to respect timecodes
    text = text.replace(re, () => { bump(label, 1); return label; });
  }
  text = redactPhones(text);
  bump('[PHONE]', (text.match(/\[PHONE\]/g) || []).length);

  // user-supplied sensitive terms (names, projects, clients)
  const terms = (extraTerms || '').split(',').map((t) => t.trim()).filter(Boolean);
  for (const t of terms) {
    const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const n = (text.match(re) || []).length;
    if (n) { text = text.replace(re, '[REDACTED]'); bump('[REDACTED]', n); }
  }
  return { text, counts };
}

export function summariseCounts(counts) {
  const parts = Object.entries(counts).map(([k, v]) => `${v}×${k}`);
  return parts.length ? parts.join(', ') : 'nothing matched';
}

// self-test:  node redact.mjs
const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  const sample = `Speaker 0: Hi, email me at jane.doe@acme.com or call +44 7700 900123.
[00:01:23] Speaker 1: Our card on file is 4111 1111 1111 1111, ref ABC12345.
Speaker 0: See https://acme.com/deal — Project Titan is on track.`;
  const { text, counts } = redact(sample, 'Project Titan');
  console.log('--- redacted ---\n' + text + '\n--- counts ---\n' + summariseCounts(counts));
}
