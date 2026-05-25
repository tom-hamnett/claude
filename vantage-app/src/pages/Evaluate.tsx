import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { db, getProfile, getSettings, recordUsage, getTodayUsage, saveMedia } from '../db';
import { MODULES } from '../content/curriculum';
import { analyze } from '../lib/analysis';
import { describeApiError } from '../lib/ai';
import { analyzeVideoWithGemini, estimateVideoCost, getMediaDuration, type VideoCost } from '../lib/video';
import { managedTranscribe, managedVideo } from '../lib/managed';
import { selfhostTranscribe, selfhostVideo } from '../lib/selfhost';
import {
  transcribeWithDeepgram, buildDiarizedTranscript, computeFlow, sampleLines, buildDeliveryContext,
  type Transcription, type FlowMetrics, type Prosody,
} from '../lib/media';
import { extractProsody } from '../lib/prosody';
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
  return text.split(/\r?\n/).filter((l) => !/^\s*WEBVTT/.test(l) && !/^\s*\d+\s*$/.test(l) && !/-->/.test(l)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
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
  const [hasAsr, setHasAsr] = useState(false);
  const [hasGemini, setHasGemini] = useState(false);
  const [managed, setManaged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [isVideo, setIsVideo] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCost, setVideoCost] = useState<VideoCost | null>(null);
  const [whoAmI, setWhoAmI] = useState('');

  // media
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [userSpeaker, setUserSpeaker] = useState<number | null>(null);
  const [flow, setFlow] = useState<FlowMetrics | null>(null);
  const [prosody, setProsody] = useState<Prosody | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      profile.current = p;
      const s = await getSettings();
      const backend = s.aiMode === 'local' || (s.aiMode === 'managed' && !!s.vantageKey?.trim());
      setManaged(backend);
      setHasKey(!!s.apiKey?.trim() || backend);
      setHasAsr(!!s.asrKey?.trim() || backend);
      setHasGemini(!!s.geminiKey?.trim() || backend);
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

  function cycle(n: number) { setWeights((w) => ({ ...w, [n]: ((w[n] ?? 0) + 1) % 4 })); }

  async function onTextFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setTranscript(stripCues(await f.text()));
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  }

  function onMediaFile(f: File | null) {
    setMediaFile(f); setTranscription(null); setUserSpeaker(null); setFlow(null); setProsody(null);
    setVideoDuration(0); setVideoCost(null);
    const vid = !!f && f.type.startsWith('video/');
    setIsVideo(vid);
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''));
    if (vid && f) getMediaDuration(f).then((d) => { setVideoDuration(d); setVideoCost(estimateVideoCost(d)); });
  }

  async function runVideo() {
    if (!mediaFile) return;
    const s = await getSettings();
    if (s.aiMode === 'byo' && !s.geminiKey?.trim()) { setError('Add a Gemini key in Settings, or switch to Managed/Self-hosted, to analyse video.'); return; }
    if (activeModules.length === 0) { setError('Select at least one module to score against.'); return; }
    const today = await getTodayUsage();
    const mins = (videoDuration || 0) / 60;
    if (s.dailyVideoMinutes > 0 && today.videoSec / 60 + mins > s.dailyVideoMinutes) {
      if (!confirm(`This will exceed your daily video budget (${s.dailyVideoMinutes} min). Continue anyway?`)) return;
    }
    setBusy(true); setError('');
    try {
      const ctx = { profile: profile.current, activeModules, interaction, whoAmI };
      const result = s.aiMode === 'managed'
        ? await managedVideo(mediaFile, videoDuration || 0, ctx, s.vantageKey)
        : s.aiMode === 'local'
          ? await selfhostVideo(mediaFile, ctx)
          : await analyzeVideoWithGemini({ geminiKey: s.geminiKey, file: mediaFile, ...ctx });
      const cost = estimateVideoCost(videoDuration || 0);
      await recordUsage({ videoSec: videoDuration || 0, estUsd: cost.usd });
      const id = crypto.randomUUID();
      await db.evaluations.put({
        id, createdAt: Date.now(),
        title: title.trim() || 'Video evaluation',
        interactionType: interaction, source: 'media',
        transcriptPreview: '(native video analysis — visual presence, tone & words)',
        weightsUsed: weights, result, demo: false,
        mediaSeconds: videoDuration, delivery: true,
        mediaKind: 'video',
      });
      if (mediaFile) await saveMedia(id, mediaFile);
      nav(`/evaluate/${id}`);
    } catch (e) {
      setError(describeApiError(e));
    } finally { setBusy(false); }
  }

  async function transcribe() {
    if (!mediaFile) return;
    const s = await getSettings();
    if (s.aiMode === 'byo' && !s.asrKey?.trim()) { setError('Add a speech-to-text (Deepgram) key in Settings, or switch to Managed/Self-hosted.'); return; }
    setTranscribing(true); setError('');
    try {
      const t = s.aiMode === 'managed' ? await managedTranscribe(mediaFile, s.vantageKey)
        : s.aiMode === 'local' ? await selfhostTranscribe(mediaFile)
        : await transcribeWithDeepgram(mediaFile, s.asrKey);
      setTranscription(t);
      pickSpeaker(t, t.speakers[0]); // sensible default; user can change
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setTranscribing(false);
    }
  }

  function pickSpeaker(t: Transcription, sp: number) {
    setUserSpeaker(sp);
    setTranscript(buildDiarizedTranscript(t, sp));
    const f = computeFlow(t, sp);
    setFlow(f);
    setProsody(null);
    if (mediaFile) {
      const ranges = t.utterances.filter((u) => u.speaker === sp).map((u) => ({ start: u.start, end: u.end }));
      extractProsody(mediaFile, ranges).then(setProsody).catch(() => setProsody(null));
    }
  }

  async function toggleRecord() {
    if (recording) { recRef.current?.stop(); setRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (ev) => chunks.push(ev.data);
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        onMediaFile(new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' }));
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start(); recRef.current = rec; setRecording(true);
    } catch { setError('Microphone blocked. Upload a file or paste a transcript instead.'); }
  }

  async function run() {
    if (!transcript.trim() || activeModules.length === 0) return;
    setBusy(true); setError('');
    try {
      const deliveryContext = flow && transcription && userSpeaker != null
        ? buildDeliveryContext(flow, prosody, transcription.durationSec) : undefined;
      const { result, demo } = await analyze({ transcript, profile: profile.current, activeModules, interaction, deliveryContext });
      await recordUsage(transcription ? { audioSec: transcription.durationSec } : { transcripts: 1 });
      const id = crypto.randomUUID();
      await db.evaluations.put({
        id, createdAt: Date.now(),
        title: title.trim() || INTERACTIONS.find((i) => i.id === interaction)!.label,
        interactionType: interaction,
        source: transcription ? 'media' : 'paste',
        transcriptPreview: transcript.slice(0, 280),
        weightsUsed: weights, result, demo,
        mediaSeconds: transcription?.durationSec,
        delivery: !!deliveryContext,
        transcriptFull: transcript,
        utterances: transcription?.utterances,
        mediaKind: mediaFile ? (mediaFile.type.startsWith('video/') ? 'video' : 'audio') : undefined,
      });
      if (mediaFile) await saveMedia(id, mediaFile);
      nav(`/evaluate/${id}`);
    } catch (e) {
      setError(describeApiError(e));
    } finally { setBusy(false); }
  }

  return (
    <Page title="Evaluate a conversation" subtitle="Holistic but self-only: we read the whole conversation — words, tone, and flow — to understand the situation, then score and coach only you.">
      {!hasKey && (
        <div className="rounded-2xl border border-gold-200 bg-gold-50 p-4 mb-5 text-sm text-ink-700">
          <strong>Offline preview mode.</strong> Add your Anthropic key in <a className="text-brand-600 font-semibold" href="/settings">Settings</a> for a holistic, evidence-quoted evaluation. For audio/video, also add a Deepgram speech-to-text key.
        </div>
      )}

      <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-3 mb-5 text-sm text-ink-700 flex items-center justify-between gap-3">
        <span>Tired of uploading after every meeting? <strong>Auto-capture</strong> watches your recordings folder and does this for you.</span>
        <Link to="/capture" className="btn-secondary btn-sm whitespace-nowrap">Set up →</Link>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-5">
          {/* Media */}
          <div className="card p-5" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onMediaFile(f); }}>
            <div className="flex items-center justify-between mb-2">
              <span className="label">🎬 Audio / video {hasAsr ? '' : '(needs speech-to-text key)'}</span>
              <div className="flex gap-2">
                <label className="btn-secondary btn-sm cursor-pointer">
                  Choose file
                  <input type="file" accept="audio/*,video/*" className="hidden" onChange={(e) => onMediaFile(e.target.files?.[0] ?? null)} />
                </label>
                <button onClick={toggleRecord} className={recording ? 'btn-danger btn-sm' : 'btn-secondary btn-sm'}>{recording ? '■ Stop' : '● Record'}</button>
              </div>
            </div>
            <p className="text-xs text-ink-400 mb-3">Upload a meeting recording (mp3/m4a/wav/mp4/mov…) or record now. We transcribe it, separate the speakers, and measure your tone, interruptions and flow — then score only you.</p>

            {mediaFile && (
              <div className="rounded-xl border border-ink-100 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm text-ink-700 truncate">📎 {mediaFile.name}{isVideo ? ' · video' : ''}</span>
                </div>
                {isVideo && hasGemini && !transcription && (
                  <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3 mb-2">
                    <div className="label mb-1">🎥 Deep video evaluation (Gemini Pro)</div>
                    <p className="text-xs text-ink-500 mb-2">
                      Watches your eye contact, posture, gesture, expression and tone as motion — highest quality.
                      Est. cost <strong>${videoCost ? videoCost.usd.toFixed(2) : '…'}</strong> for {videoDuration ? Math.max(1, Math.round(videoDuration / 60)) : '…'} min.
                    </p>
                    <input className="input mb-2 text-sm" placeholder="Which person are you? (e.g. host, person on the left)" value={whoAmI} onChange={(e) => setWhoAmI(e.target.value)} />
                    <button onClick={runVideo} disabled={busy || activeModules.length === 0} className="btn-primary btn-sm w-full">
                      {busy ? 'Analysing video…' : 'Run video evaluation →'}
                    </button>
                    {hasAsr && <button onClick={transcribe} disabled={transcribing} className="btn-ghost btn-sm w-full mt-1">or analyse audio only</button>}
                  </div>
                )}
                {(!isVideo || !hasGemini) && !transcription && (
                  <div className="mb-2">
                    {isVideo && !hasGemini && <p className="text-xs text-gold-700 mb-1">Add a Gemini key in Settings for full video (visual presence). For now, analysing the audio only:</p>}
                    <button onClick={transcribe} disabled={transcribing || !hasAsr} className="btn-primary btn-sm whitespace-nowrap">
                      {transcribing ? 'Transcribing…' : 'Transcribe & measure delivery'}
                    </button>
                  </div>
                )}
                {transcription && (
                  <div>
                    <span className="label block mb-1.5">Which voice is you?</span>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {sampleLines(transcription).map(({ speaker, sample }) => (
                        <button key={speaker} onClick={() => pickSpeaker(transcription, speaker)}
                          className={`text-left max-w-full rounded-lg border px-3 py-1.5 text-xs transition ${userSpeaker === speaker ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:border-brand-300'}`}>
                          <span className="font-semibold">{userSpeaker === speaker ? '✓ Me' : `Speaker ${speaker}`}:</span> <span className="opacity-70">“{sample}…”</span>
                        </button>
                      ))}
                    </div>
                    {flow && (
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <span className="chip-teal">talk-time {Math.round(flow.talkRatio * 100)}%</span>
                        <span className="chip">{flow.interruptions} interruptions</span>
                        <span className="chip">{flow.paceWpm} wpm</span>
                        <span className="chip">{flow.avgResponseLatencySec.toFixed(1)}s avg pause</span>
                        <span className="chip">{prosody ? `pitch var ${Math.round(prosody.pitchVariationHz)}Hz` : 'measuring tone…'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Transcript */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="label">Transcript {transcription ? '(auto-filled — editable)' : ''}</span>
              <label className="btn-secondary btn-sm cursor-pointer">
                Upload .txt/.vtt/.srt
                <input type="file" accept=".txt,.vtt,.srt,.md,text/plain" className="hidden" onChange={onTextFile} />
              </label>
            </div>
            <textarea
              className="input min-h-[220px] font-mono text-sm leading-relaxed"
              placeholder={'Or paste a conversation here.\n\nLabel speakers to isolate yourself:\nMe: So the headline is we should ship Friday.\nJordan: I\'m worried about vendor sign-off.\nMe: What would have to be true for Friday to work?'}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
            <p className="text-xs text-ink-400 mt-2">Lines labelled <code>Me:</code> are scored; other speakers are context only and never evaluated.</p>
          </div>

          <div className="card p-5">
            <span className="label block mb-2">What kind of conversation?</span>
            <div className="flex flex-wrap gap-2 mb-4">
              {INTERACTIONS.map((it) => (
                <button key={it.id} onClick={() => setInteraction(it.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${interaction === it.id ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:border-brand-300'}`}>{it.label}</button>
              ))}
            </div>
            <label className="block"><span className="label block mb-1.5">Title (optional)</span>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly leadership sync" /></label>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="label">Score against</span>
              <span className="text-xs text-ink-400">{activeModules.length} active</span>
            </div>
            <p className="text-xs text-ink-400 mb-3">Tap to cycle: off → 1× → 2× → 3×. Defaults from your profile.</p>
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

          {flow && (
            <div className="ai-card text-sm">
              <div className="label mb-1">Delivery & dynamics measured ✓</div>
              <p className="text-ink-600 text-xs">Your tone, interruptions, pace and flow will be factored into the evaluation — alongside the words.</p>
            </div>
          )}

          <button onClick={run} disabled={busy || !transcript.trim() || activeModules.length === 0} className="btn-primary w-full py-3 text-base">
            {busy ? 'Analysing…' : hasKey ? 'Run holistic evaluation →' : 'Run offline preview →'}
          </button>
          {error && <div className="text-sm text-hot-600 text-center">{error}</div>}
          {busy && <p className="text-xs text-ink-400 text-center">Reading the whole conversation — words, tone and flow — scoring only you…</p>}
        </div>
      </div>
    </Page>
  );
}
