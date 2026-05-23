import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, saveSettings, wipeAllData, getTodayUsage } from '../db';
import { Page } from '../components/Shell';
import type { Settings as S, UsageDay } from '../types';

const MODELS = [
  { id: 'claude-opus-4-7', label: 'Claude Opus 4.7 — most capable' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 — fast & strong' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 — fastest' },
];

export default function Settings() {
  const nav = useNavigate();
  const [s, setS] = useState<S | null>(null);
  const [saved, setSaved] = useState(false);
  const [usage, setUsage] = useState<UsageDay | null>(null);

  useEffect(() => { getSettings().then(setS); getTodayUsage().then(setUsage); }, []);
  if (!s) return null;

  async function patch(p: Partial<S>) {
    const next = { ...s!, ...p };
    setS(next);
    await saveSettings(p);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  return (
    <Page title="Settings" subtitle="FULCRUM is local-first and BYO-key. Your key and all data live only in this browser." action={saved ? <span className="chip-teal">Saved ✓</span> : undefined}>
      <div className="space-y-6 max-w-2xl">
        <section className="card p-5">
          <h2 className="font-display text-lg text-ink-900 mb-1">AI engine</h2>
          <p className="text-ink-500 text-sm mb-4">Paste your Anthropic API key to unlock holistic evaluations and the coach. It's stored only in your browser (IndexedDB) and sent directly to Claude — there is no FULCRUM server.</p>
          <label className="block mb-4">
            <span className="label block mb-1.5">Anthropic API key</span>
            <input type="password" className="input font-mono" value={s.apiKey} onChange={(e) => patch({ apiKey: e.target.value })} placeholder="sk-ant-…" />
            <span className="text-xs text-ink-400 mt-1 block">Get one at console.anthropic.com. Without it, the app runs in offline-preview mode.</span>
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="label block mb-1.5">Evaluation model</span>
              <select className="input" value={s.model} onChange={(e) => patch({ model: e.target.value })}>
                {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label block mb-1.5">Coach model</span>
              <select className="input" value={s.coachModel} onChange={(e) => patch({ coachModel: e.target.value })}>
                {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
          </div>
          <label className="block mt-4">
            <span className="label block mb-1.5">Effort (depth vs. speed)</span>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map((e) => (
                <button key={e} onClick={() => patch({ effort: e })} className={`flex-1 py-2 rounded-xl border text-sm font-medium capitalize ${s.effort === e ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600'}`}>{e}</button>
              ))}
            </div>
          </label>
          <label className="block mt-4">
            <span className="label block mb-1.5">Speech-to-text key (Deepgram) — for audio</span>
            <input type="password" className="input font-mono" value={s.asrKey} onChange={(e) => patch({ asrKey: e.target.value })} placeholder="Deepgram API key" />
            <span className="text-xs text-ink-400 mt-1 block">Transcribes and separates speakers, so we can measure your tone, interruptions, pace and flow. Free key at deepgram.com.</span>
          </label>
          <label className="block mt-4">
            <span className="label block mb-1.5">Gemini key — for video (visual presence)</span>
            <input type="password" className="input font-mono" value={s.geminiKey} onChange={(e) => patch({ geminiKey: e.target.value })} placeholder="Gemini API key" />
            <span className="text-xs text-ink-400 mt-1 block">Enables full video analysis on Gemini Pro — eye contact, posture, gesture and expression, watched as motion. Always highest quality; efficiency comes from ~1 fps sampling, not a weaker model. Key from aistudio.google.com.</span>
          </label>
        </section>

        <section className="card p-5">
          <h2 className="font-display text-lg text-ink-900 mb-1">Passive agent (optional)</h2>
          <p className="text-ink-500 text-sm mb-4">
            Let a local agent find new recordings and queue them for evaluation automatically, instead of uploading each one by hand. It is strictly opt-in. A web app cannot read your files automatically, so this works with the companion <code>local-agent</code> (see the repo) running on your machine — it watches a folder you choose and never sends audio anywhere except your own Claude calls.
          </p>
          <label className="flex items-center justify-between rounded-xl border border-ink-200 p-3">
            <div>
              <div className="font-semibold text-ink-800 text-sm">Enable passive agent</div>
              <div className="text-xs text-ink-400">Auto-detect & queue new recordings (requires the local companion).</div>
            </div>
            <button onClick={() => patch({ passiveAgent: !s.passiveAgent })} className={`relative w-12 h-7 rounded-full transition ${s.passiveAgent ? 'bg-brand-500' : 'bg-ink-200'}`}>
              <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition ${s.passiveAgent ? 'left-[1.375rem]' : 'left-0.5'}`} />
            </button>
          </label>
        </section>

        <section className="card p-5">
          <h2 className="font-display text-lg text-ink-900 mb-1">Spend controls</h2>
          <p className="text-ink-500 text-sm mb-4">FULCRUM always uses the highest-quality models — cost is controlled by budgets, never by lowering quality. Transcripts are free, audio is cheap, video is metered. A soft daily video budget warns you before a big spend.</p>
          <label className="block mb-4">
            <span className="label block mb-1.5">Daily video budget (minutes, 0 = unlimited)</span>
            <input type="number" min={0} className="input" value={s.dailyVideoMinutes} onChange={(e) => patch({ dailyVideoMinutes: Math.max(0, Number(e.target.value) || 0) })} />
          </label>
          {usage && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <Mini label="Video today" value={`${Math.round(usage.videoSec / 60)}m`} />
              <Mini label="Audio today" value={`${Math.round(usage.audioSec / 60)}m`} />
              <Mini label="Est. spend today" value={`$${usage.estUsd.toFixed(2)}`} />
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-display text-lg text-ink-900 mb-1">Privacy & data</h2>
          <p className="text-ink-500 text-sm mb-4">Everything you do stays on this device. We evaluate and report on you only — never the other people in your conversations.</p>
          <label className="block mb-4">
            <span className="label block mb-1.5">Auto-delete evaluations after</span>
            <select className="input" value={s.retentionDays} onChange={(e) => patch({ retentionDays: Number(e.target.value) })}>
              <option value={0}>Keep forever</option>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </label>
          <button
            onClick={async () => { if (confirm('Delete all evaluations, progress, coach history and profile? This cannot be undone.')) { await wipeAllData(); nav('/'); } }}
            className="btn-danger"
          >
            Delete all my data
          </button>
        </section>

        <p className="text-xs text-ink-400">FULCRUM · part of the Quantum Tools house. Curriculum grounded in Bates ExPI, Hewlett/CTI, Spitzberg–Cupach, Sofer, Crucial Conversations, Getting to Yes, Voss, and SPIN.</p>
      </div>
    </Page>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-50 p-3">
      <div className="font-display text-lg text-ink-900">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-ink-400 font-semibold">{label}</div>
    </div>
  );
}
