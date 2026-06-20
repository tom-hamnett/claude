import { useRef, useState } from 'react';
import { now, uid } from '../db';
import { putProject } from '../store';
import { ingestSource } from '../services/fluxAI';
import { AIError } from '../services/ai';
import { humanSize, isBinaryKind, MAX_FILE_BYTES, readFileAsText, sourceKindFor } from '../lib/files';
import Icon from './Icon';
import { AIError_, Spinner } from './AIRun';
import type { Project, Source } from '../types';

/**
 * Project-level repository: drop in the overview material that frames the whole
 * engagement (org chart, budget, headcount roster, KPI dashboards, project
 * brief). It's ingested and added to the project context every process inherits.
 */
export default function ProjectRepository({ project }: { project: Project }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const sources = project.sources ?? [];

  async function save(next: Source[]) {
    await putProject({ ...project, sources: next });
  }

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    let working = [...sources];
    for (const file of Array.from(files)) {
      const kind = sourceKindFor(file);
      const src: Source = { id: uid(), kind, name: file.name, mime: file.type || undefined, sizeBytes: file.size, status: 'processing', createdAt: now() };
      working = [...working, src];
      await save(working);
      setBusy(true);
      try {
        if (isBinaryKind(kind)) {
          if (file.size > MAX_FILE_BYTES) throw new AIError(`${file.name} is ${humanSize(file.size)} — over the limit.`);
          const r = await ingestSource({ project, kind, name: file.name, mime: file.type || 'application/octet-stream', file });
          working = working.map((s) => (s.id === src.id ? { ...s, status: 'ready', ...r } : s));
        } else {
          const content = await readFileAsText(file);
          working = working.map((s) => (s.id === src.id ? { ...s, status: 'ready', extraction: content.slice(0, 40000), summary: file.name } : s));
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not process file.';
        working = working.map((s) => (s.id === src.id ? { ...s, status: 'error', error: msg } : s));
        setError(msg);
      }
      await save(working);
    }
    setBusy(false);
    if (fileInput.current) fileInput.current.value = '';
  }

  async function addText() {
    if (!text.trim()) return;
    const src: Source = { id: uid(), kind: 'text', name: 'Pasted note', status: 'ready', extraction: text.trim().slice(0, 40000), summary: 'Pasted project note', createdAt: now() };
    await save([...sources, src]);
    setText('');
  }

  async function remove(id: string) {
    await save(sources.filter((s) => s.id !== id));
  }

  return (
    <div className="card p-4">
      <div className="mb-1 flex items-center gap-2">
        <Icon name="knowledge" className="h-5 w-5 text-flux-600" />
        <h3 className="font-semibold text-ink-800">Project repository</h3>
        <span className="text-sm text-ink-400">— shared context for every process</span>
      </div>
      <p className="mb-3 text-sm text-ink-500">Org chart, budget, headcount roster, KPI dashboards, project brief… FLUX reads these when mapping and diagnosing.</p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files); }}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 text-center transition ${dragOver ? 'border-flux-500 bg-flux-50' : 'border-ink-200'}`}
      >
        <p className="text-sm text-ink-500">Drop files here, or</p>
        <button className="btn-outline mt-2" onClick={() => fileInput.current?.click()} disabled={busy}>
          {busy ? <Spinner /> : <><Icon name="plus" className="h-4 w-4" /> Add files</>}
        </button>
        <input ref={fileInput} type="file" multiple hidden onChange={(e) => e.target.files && handleFiles(e.target.files)} />
      </div>

      <div className="mt-2 flex gap-2">
        <input className="input" placeholder="…or paste a quick note / assumption" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addText()} />
        <button className="btn-outline shrink-0" onClick={addText} disabled={!text.trim()}>Add</button>
      </div>

      <AIError_ message={error} />

      {sources.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {sources.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-1.5 text-sm">
              <Icon name="book" className="h-4 w-4 shrink-0 text-ink-400" />
              <span className="truncate font-medium text-ink-700">{s.name}</span>
              {s.status === 'processing' && <span className="chip bg-flux-100 text-flux-700"><Spinner /> processing</span>}
              {s.status === 'error' && <span className="chip bg-nva-100 text-nva-700">error</span>}
              {s.status === 'ready' && <span className="chip bg-va-100 text-va-700">ready</span>}
              <span className="flex-1" />
              <button className="text-ink-300 hover:text-nva-600" onClick={() => remove(s.id)}><Icon name="trash" className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
