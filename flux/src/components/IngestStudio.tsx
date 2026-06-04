import { useRef, useState } from 'react';
import { now, uid } from '../db';
import { getKnowledgeForProject, putKnowledgeMany, putProcess } from '../store';
import { ingestSource, rawToSteps, researchBenchmarks, synthesizeProcess } from '../services/fluxAI';
import { AIError } from '../services/ai';
import { humanSize, isBinaryKind, MAX_FILE_BYTES, readFileAsBase64, readFileAsText, sourceKindFor } from '../lib/files';
import Icon, { type IconName } from './Icon';
import { AIError_, Spinner } from './AIRun';
import type { Process, Project, Source, SourceKind } from '../types';

const KIND_META: Record<SourceKind, { label: string; icon: IconName }> = {
  text: { label: 'Notes', icon: 'edit' },
  document: { label: 'Document', icon: 'book' },
  image: { label: 'Image', icon: 'map' },
  audio: { label: 'Audio', icon: 'spark' },
  video: { label: 'Video', icon: 'flow' },
  eventlog: { label: 'Event log', icon: 'portfolio' },
};

export default function IngestStudio({
  process,
  project,
  onSynthesized,
}: {
  process: Process;
  project: Project;
  onSynthesized: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [textKind, setTextKind] = useState<SourceKind>('text');
  const [research, setResearch] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const sources = process.sources ?? [];
  const ready = sources.filter((s) => s.status === 'ready');

  /** Persist a new/updated source against the latest process snapshot. */
  async function saveSources(next: Source[], base: Process = process) {
    await putProcess({ ...base, sources: next });
  }

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    const list = Array.from(files);
    let working = [...sources];
    for (const file of list) {
      const kind = sourceKindFor(file);
      const src: Source = {
        id: uid(),
        kind,
        name: file.name,
        mime: file.type || undefined,
        sizeBytes: file.size,
        status: 'processing',
        createdAt: now(),
      };
      working = [...working, src];
      await saveSources(working);
      setBusy(true);
      try {
        if (isBinaryKind(kind)) {
          if (file.size > MAX_FILE_BYTES) {
            throw new AIError(`${file.name} is ${humanSize(file.size)} — over the ${humanSize(MAX_FILE_BYTES)} limit.`);
          }
          const dataB64 = await readFileAsBase64(file);
          const r = await ingestSource({ project, kind, name: file.name, mime: file.type || 'application/octet-stream', dataB64 });
          working = working.map((s) => (s.id === src.id ? { ...s, status: 'ready', ...r } : s));
        } else {
          // Text / event-log: store the content directly (cheap, instant).
          const content = await readFileAsText(file);
          working = working.map((s) =>
            s.id === src.id ? { ...s, status: 'ready', extraction: content.slice(0, 40000), summary: `${KIND_META[kind].label}: ${file.name}` } : s,
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not process file.';
        working = working.map((s) => (s.id === src.id ? { ...s, status: 'error', error: msg } : s));
        setError(msg);
      }
      await saveSources(working);
    }
    setBusy(false);
    if (fileInput.current) fileInput.current.value = '';
  }

  async function addText() {
    if (!text.trim()) return;
    const src: Source = {
      id: uid(),
      kind: textKind,
      name: textKind === 'eventlog' ? 'Pasted event log' : 'Pasted notes',
      status: 'ready',
      extraction: text.trim().slice(0, 40000),
      summary: textKind === 'eventlog' ? 'Pasted event-log data' : 'Pasted notes / description',
      createdAt: now(),
    };
    await saveSources([...sources, src]);
    setText('');
  }

  async function removeSource(id: string) {
    await saveSources(sources.filter((s) => s.id !== id));
  }

  async function doResearch() {
    setBusy(true);
    setError(null);
    try {
      const name = process.name && process.name !== 'New process' ? process.name : project.scope || 'Process';
      const cards = await researchBenchmarks({ project, processName: name });
      await putKnowledgeMany(cards);
      setResearch(`${cards.length} benchmark/reference cards added to the Knowledge library`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Research failed.');
    } finally {
      setBusy(false);
    }
  }

  async function synthesize() {
    setBusy(true);
    setError(null);
    try {
      const knowledge = await getKnowledgeForProject(project.id);
      const { map, clarifications } = await synthesizeProcess({ project, sources: ready, knowledge });
      const steps = rawToSteps(map.steps ?? []);
      const keepName = process.name && process.name !== 'New process';
      const keptDismissed = (process.clarifications ?? []).filter((c) => c.status !== 'open');
      await putProcess({
        ...process,
        name: keepName ? process.name : map.name || process.name,
        trigger: map.trigger ?? process.trigger,
        owner: map.owner ?? process.owner,
        annualVolume: map.annualVolume ?? process.annualVolume,
        sipoc: map.sipoc ?? process.sipoc,
        steps,
        clarifications: [...keptDismissed, ...clarifications],
        status: 'mapped',
      });
      onSynthesized();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Synthesis failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
        }}
        className={`card flex flex-col items-center justify-center border-2 border-dashed p-8 text-center transition ${
          dragOver ? 'border-flux-500 bg-flux-50' : 'border-ink-200'
        }`}
      >
        <Icon name="download" className="h-8 w-8 rotate-180 text-flux-500" />
        <p className="mt-2 font-medium text-ink-700">Drop interviews, recordings, documents, screenshots or event logs</p>
        <p className="text-sm text-ink-400">Audio / video / PDF / images / CSV — FLUX picks the right model for each. Large media uploads to Gemini automatically.</p>
        <button className="btn-outline mt-3" onClick={() => fileInput.current?.click()} disabled={busy}>
          <Icon name="plus" className="h-4 w-4" /> Choose files
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* Paste text */}
      <div className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="label mb-0">Or paste text</span>
          <select className="input w-auto py-1 text-xs" value={textKind} onChange={(e) => setTextKind(e.target.value as SourceKind)}>
            <option value="text">Notes / description</option>
            <option value="eventlog">Event-log / data</option>
          </select>
        </div>
        <textarea
          className="input min-h-[110px]"
          placeholder="Paste a process description, interview notes, an SOP, or pasted log data…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-2 flex justify-end">
          <button className="btn-outline" onClick={addText} disabled={!text.trim()}>
            <Icon name="plus" className="h-4 w-4" /> Add as source
          </button>
        </div>
      </div>

      <AIError_ message={error} />

      {/* Source list */}
      {sources.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Sources ({sources.length})</h3>
          {sources.map((s) => (
            <div key={s.id} className="card p-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-flux-600"><Icon name={KIND_META[s.kind].icon} className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-ink-800">{s.name}</span>
                    <span className="chip bg-ink-100 text-ink-500">{KIND_META[s.kind].label}</span>
                    {s.sizeBytes ? <span className="text-xs text-ink-400">{humanSize(s.sizeBytes)}</span> : null}
                    <StatusDot s={s} />
                  </div>
                  {s.summary && <p className="mt-1 text-sm text-ink-600">{s.summary}</p>}
                  {s.error && <p className="mt-1 text-sm text-nva-600">⚠ {s.error}</p>}
                  {s.observations && <Observations s={s} />}
                  {s.providerUsed && <div className="mt-1 text-[11px] text-ink-400">processed by {s.providerUsed}</div>}
                </div>
                <button className="text-ink-300 hover:text-nva-600" onClick={() => removeSource(s.id)}>
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="font-semibold text-ink-800">Synthesise the current-state map</div>
          <p className="text-sm text-ink-500">FLUX reconciles every source into one standardized map and flags the gaps to follow up.</p>
          {research && <p className="mt-1 text-xs text-va-600">✓ {research}</p>}
        </div>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={doResearch} disabled={busy}>
            {busy ? <Spinner /> : <><Icon name="knowledge" className="h-4 w-4" /> Research benchmarks</>}
          </button>
          <button className="btn-flux" onClick={synthesize} disabled={busy || !ready.length}>
            {busy ? <Spinner label="Synthesising…" /> : <><Icon name="spark" className="h-4 w-4" /> Synthesise map ({ready.length})</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusDot({ s }: { s: Source }) {
  if (s.status === 'processing') return <span className="chip bg-flux-100 text-flux-700"><Spinner /> processing</span>;
  if (s.status === 'error') return <span className="chip bg-nva-100 text-nva-700">error</span>;
  return <span className="chip bg-va-100 text-va-700">ready</span>;
}

function Observations({ s }: { s: Source }) {
  const o = s.observations!;
  const row = (label: string, items?: string[]) =>
    items && items.length ? (
      <div className="text-xs text-ink-500">
        <span className="font-semibold text-ink-600">{label}:</span> {items.slice(0, 6).join(' · ')}
      </div>
    ) : null;
  return (
    <div className="mt-2 space-y-0.5 rounded-lg bg-ink-50 p-2">
      {row('Steps', o.steps)}
      {row('Actors', o.actors)}
      {row('Systems', o.systems)}
      {row('Pains', o.pains)}
      {row('Timings', o.timings)}
    </div>
  );
}
