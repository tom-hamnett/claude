import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '../components/Shell';

// The portable Vantage agent recipe — paste into the assistant you already have.
const RECIPE = `You are Vantage, an executive-presence & communication coach. Evaluate ONE person — me (the primary speaker, or turns labelled "Me:") — using the meeting transcript that already exists in this environment.

Rules: (1) SELF-ONLY — read the whole conversation for context but evaluate and report on ME only; never rate or characterise other people. (2) REDACT before output — remove names of others, emails, phone numbers, card/ID numbers, URLs, company and project names; quote only my own words and redact PII inside them; never output the full transcript. (3) EVIDENCE — every point cites a short quote (with an approx timestamp if available). (4) ANTI-BIAS — judge effectiveness toward my goal and natural style; never penalise accent or introversion; never reward raw talk-time. (5) At most THREE priorities.

Assess (score 1-4 only where the conversation evidences it): composure under pressure, gravitas/credibility, concise & strategic communication, audience calibration, emotional regulation, deep listening, inquiry/calibrated questions, empathy/trust, observation-vs-evaluation, difficult-conversation handling, assertiveness/clear requests, negotiation/value, consultative/discovery, self-awareness.

Also estimate from my turns: talk-time share, words/min, number of questions and how many were open ("what/how") vs closed, filler frequency, longest unbroken monologue.

Output: a short readable summary I can act on, then this JSON —
{"overall":n,"headline":"","situation":"","signals":{"talkTimeShare":n,"wordsPerMin":n,"questions":n,"openQuestionRatio":n,"fillersPer100w":n,"longestMonologueWords":n},"findings":[{"type":"strength|growth","competency":"","quote":"","note":"","suggestion":""}],"priorities":[{"title":"","why":"","drill":""}]}

If there is no usable transcript, say so plainly and stop. Apply this to my most recent meeting.`;

const ASSISTANTS = [
  { id: 'copilot', label: 'Microsoft Copilot', icon: '🟦', steps: [
    'Open Copilot in Teams or Office (your work account).',
    'Paste the recipe below and point it at your last meeting’s transcript.',
    'Run it — or save it as a Copilot Studio agent named "Vantage Coach" to reuse.',
  ] },
  { id: 'gemini', label: 'Google Gemini', icon: '🟩', steps: [
    'Open Gemini → Gems → New Gem (your work account).',
    'Paste the recipe as the Gem’s instructions; name it "Vantage Coach".',
    'Attach your Meet transcript from Drive and run.',
  ] },
  { id: 'claude', label: 'Claude', icon: '🟧', steps: [
    'Open Claude → Projects → New Project.',
    'Paste the recipe as the Project’s custom instructions.',
    'Add the transcript (paste or upload) and run.',
  ] },
  { id: 'other', label: 'Another assistant', icon: '✦', steps: [
    'Open the AI assistant your organisation provides.',
    'Paste the recipe.',
    'Paste or attach the meeting transcript and run.',
  ] },
] as const;

export default function Capture() {
  const [a, setA] = useState<typeof ASSISTANTS[number]>(ASSISTANTS[0]);
  const [copied, setCopied] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  function copy() { navigator.clipboard?.writeText(RECIPE); setCopied(true); setTimeout(() => setCopied(false), 1500); }

  return (
    <Page title="Auto-capture" subtitle="No installs, no IT. Use the AI assistant your organisation already gives you — Copilot, Gemini or Claude — to analyse your meetings where they live. It reads the transcript the meeting already produced, evaluates only you, redacts the rest, and hands back a private result.">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className="card p-5">
            <span className="label block mb-2">1 · Which assistant do you have?</span>
            <div className="grid grid-cols-2 gap-2">
              {ASSISTANTS.map((x) => (
                <button key={x.id} onClick={() => setA(x)} className={`text-left rounded-xl border p-3 transition ${a.id === x.id ? 'border-brand-400 bg-brand-50' : 'border-ink-200 hover:border-brand-300'}`}>
                  <div className="text-lg">{x.icon}</div>
                  <div className="font-semibold text-sm text-ink-900">{x.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <span className="label block mb-2">2 · Regenerate the Vantage agent there</span>
            <ol className="list-decimal ml-5 space-y-1.5 text-sm text-ink-700">
              {a.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>

          <div className="ai-card text-sm">
            <div className="label mb-1">Why this is private</div>
            <p className="text-ink-600">The analysis runs inside your organisation’s own assistant — within its compliance boundary. The recipe makes it evaluate only you and redact names and personal data. Only the result you choose to paste into Vantage ever leaves. We coach you, not the room.</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="label">3 · Copy the agent recipe</span>
              <button onClick={copy} className="btn-secondary btn-sm">{copied ? 'Copied ✓' : 'Copy recipe'}</button>
            </div>
            <pre className="bg-ink-900 text-ink-50 rounded-xl p-3 text-[11px] leading-relaxed max-h-72 overflow-auto whitespace-pre-wrap">{RECIPE}</pre>
            <p className="text-xs text-ink-400 mt-2">Paste this where your assistant asks for instructions, then run it on your latest meeting.</p>
          </div>

          <div className="card p-5">
            <span className="label block mb-1">4 · Bring the result back (optional)</span>
            <p className="text-ink-500 text-sm mb-3">Paste the result your assistant returns into Vantage to build your private history and trends — or just act on it there.</p>
            <Link to="/evaluate" className="btn-primary w-full">Add a result / upload manually →</Link>
          </div>

          <div className="card p-4">
            <button onClick={() => setAdvanced((v) => !v)} className="text-sm font-semibold text-ink-700 flex items-center gap-2">
              Advanced: installed companion agent <span className={`text-ink-300 transition ${advanced ? 'rotate-90' : ''}`}>›</span>
            </button>
            {advanced && (
              <div className="mt-3 text-sm text-ink-600 space-y-2">
                <p>For power users / self-hosters who want a device-local binary or automatic native-video capture, a folder-watching agent processes recordings locally and sends only a minimal redacted package. See <code>vantage-app/local-agent</code>.</p>
                <pre className="bg-ink-900 text-ink-50 rounded-xl p-3 text-xs overflow-x-auto whitespace-pre-wrap">ANTHROPIC_API_KEY=your-key node agent.mjs "~/OneDrive/Recordings" --every 30</pre>
                <p className="text-xs text-ink-400">Local-first by default (needs ffmpeg + a local Whisper). Add <code>--cloud</code> only if you accept raw media leaving the device.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
