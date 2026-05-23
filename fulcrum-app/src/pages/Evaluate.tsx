import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db, getProfile, getSettings } from '../db';
import { MODULES } from '../content/curriculum';
import { analyze } from '../lib/analysis';
import { describeApiError } from '../lib/ai';
import { Page } from '../components/Shell';
import type { InteractionType, Profile } from '../types';

const INTERACTIONS: { id: InteractionType; label: string }[] = [
  { id: 'team-update', label: 'Team / status update' },
  { id: 'one-to-one', label: 'One-to-one' },
  { id: 'difficult-conversation', label: 'Difficult conversation' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'sales-discovery', label: 'Sales / discovery call' },
  { id: 'presentation', label: 'Presentation / pitch' },
  { id: 'interview', label: 'Interview' },
  { id: 'other', label: 'Other' },
];

function stripCues(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((l) => !/^\s*WEBVTT/.test(l) && !/^\s*\d+\s*$/.test(l) && !/-->/.test(l) && !/^\s*\[\d{1,2}:\d{2}/.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function Evaluate() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const profile = useRef<Profile | undefined>(undefined);

  const [transcript, setTranscript] = useState('');
  const [title, setTitle] = useState('');
  const [interaction, setInteraction] = useState<InteractionType>('team-update');
  const [weights, setWeights] = useState<Record<number, number>>({});
  const [hasKey, setHasKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const [recUrl, setRecUrl] = useState('');

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      profile.current = p;
      const s = await getSettings();
      setHasKey(!!s.apiKey?.trim());
      const base: Record<number, number> = {};
      for (const m of MODULES) base[m.number] = p?.weights?.[m.number] ?? 1;
      const focus = params.get('modules');
      if (focus) {
        for (const m of MODULES) base[m.number] = 0;
        focus.split(',').forEach((n) => (base[Number(n)] = 3));
      }
      setWeights(base);
    })();
  }, []);

  const activeModules = useMemo(() => MODULES.filter((m) => (weights[m.number] ?? 0) > 0).map((m) => m.number), [weights]);

  function cycle(n: number) {
    setWeights((w) => ({ ...w, [n]: ((w[n] ?? 0) + 1) % 4 }));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setTranscript(stripCues(text));
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  }

  async function toggleRecord() {
    if (recording) {
      recRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (ev) => chunks.push(ev.data);
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch {
      setError('Microphone access was blocked. You can paste or upload a transcript instead.');
    }
  }

  async function run() {
    if (!transcript.trim() || activeModules.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const { result, demo } = await analyze({ transcript, profile: profile.current, activeModules, interaction });
      const id = crypto.randomUUID();
      await db.evaluations.put({
        id,
        createdAt: Date.now(),
        title: title.trim() || INTERACTIONS.find((i) => i.id === interaction)!.label,
        interactionType: interaction,
        source: recUrl ? 'record' : 'paste',
        transcriptPreview: transcript.slice(0, 280),
        weightsUsed: weights,
        result,
        demo,
      });
      nav(`/evaluate/${id}`);
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="Evaluate a conversation" subtitle="Holistic but self-only: we read the whole conversation to understand the situation, then score and coach only you — never the other people in the room.">
      {!hasKey && (
        <div className="rounded-2xl border border-gold-200 bg-gold-50 p-4 mb-5 text-sm text-ink-700">
          <strong>Offline preview mode.</strong> Without an API key you'll get a fast heuristic read (question rate, hedging, talk-time, etc.). For a holistic, evidence-quoted evaluation, add your Anthropic key in <a className="text-brand-600 font-semibold" href="/settings">Settings</a>.
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="label">Transcript</span>
              <div className="flex gap-2">
                <label className="btn-secondary btn-sm cursor-pointer">
                  Upload .txt/.vtt/.srt
                  <input type="file" accept=".txt,.vtt,.srt,.md,text/plain" className="hidden" onChange={onFile} />
                </label>
                <button onClick={toggleRecord} className={recording ? 'btn-danger btn-sm' : 'btn-secondary btn-sm'}>
                  {recording ? '■ Stop' : '● Record'}
                </button>
              </div>
            </div>
            <textarea
              className="input min-h-[260px] font-mono text-sm leading-relaxed"
              placeholder={'Paste your conversation here.\n\nTip: label speakers so we can isolate you:\n\nMe: So the headline is we should ship Friday.\nJordan: I\'m worried about the vendor sign-off.\nMe: What would have to be true for Friday to work?'}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
            {recUrl && (
              <div className="mt-3 text-sm text-ink-500">
                <audio controls src={recUrl} className="w-full" />
                <p className="text-xs mt-1">Audio captured locally. Audio→transcript needs an ASR provider (roadmap); for now, paste the transcript above to analyse.</p>
              </div>
            )}
            <p className="text-xs text-ink-400 mt-2">Label your lines <code>Me:</code> to isolate your speech; other speakers are used for context only and are never evaluated.</p>
          </div>

          <div className="card p-5">
            <span className="label block mb-2">What kind of conversation?</span>
            <div className="flex flex-wrap gap-2 mb-4">
              {INTERACTIONS.map((it) => (
                <button key={it.id} onClick={() => setInteraction(it.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${interaction === it.id ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:border-brand-300'}`}>
                  {it.label}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="label block mb-1.5">Title (optional)</span>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly leadership sync" />
            </label>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="label">Score against</span>
              <span className="text-xs text-ink-400">{activeModules.length} active</span>
            </div>
            <p className="text-xs text-ink-400 mb-3">Tap to cycle weight: off → 1× → 2× → 3×. Defaults come from your profile.</p>
            <div className="space-y-1.5 max-h-[320px] overflow-auto pr-1">
              {MODULES.map((m) => {
                const w = weights[m.number] ?? 0;
                return (
                  <button key={m.number} onClick={() => cycle(m.number)} className={`w-full flex items-center gap-2 text-left rounded-xl border px-3 py-2 transition ${w > 0 ? 'border-brand-200 bg-brand-50/50' : 'border-ink-100 bg-white opacity-60'}`}>
                    <span className={`flex-none text-[10px] font-bold w-8 text-center rounded-md py-0.5 ${w > 0 ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-400'}`}>{w > 0 ? `${w}×` : 'off'}</span>
                    <span className="text-sm text-ink-700 truncate">M{m.number} {m.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={run} disabled={busy || !transcript.trim() || activeModules.length === 0} className="btn-primary w-full py-3 text-base">
            {busy ? 'Analysing…' : hasKey ? 'Run holistic evaluation →' : 'Run offline preview →'}
          </button>
          {error && <div className="text-sm text-hot-600 text-center">{error}</div>}
          {busy && (
            <div className="space-y-2">
              <div className="skeleton h-4 w-3/4 mx-auto" />
              <div className="skeleton h-4 w-2/3 mx-auto" />
              <p className="text-xs text-ink-400 text-center">Reading the whole conversation, scoring only you…</p>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
