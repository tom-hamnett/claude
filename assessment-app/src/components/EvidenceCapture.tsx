import { useEffect, useRef, useState } from 'react';
import { db, now, uid } from '../db';
import { Icon } from './Icon';
import type { Evidence, ID } from '../types';

/**
 * Inline evidence capture controls used during assessment.
 *  - 📷  Photo (file picker; iOS opens camera if `capture` is set)
 *  - 🎤  Voice memo (MediaRecorder)
 * Each captured artefact is stored in the `evidence` Dexie table; the calling
 * component is told the new id and adds it to the mark's `evidenceIds`.
 */
export function EvidenceCapture({
  sessionId,
  personId,
  criterionId,
  evidenceIds,
  onAttach,
  onDetach,
  compact = false,
}: {
  sessionId: ID;
  personId?: ID;
  criterionId?: ID;
  evidenceIds: ID[];
  onAttach: (id: ID) => void;
  onDetach: (id: ID) => void;
  compact?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<Evidence[]>([]);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (evidenceIds.length === 0) {
        setItems([]);
        return;
      }
      const rows = await db.evidence.where('id').anyOf(evidenceIds).toArray();
      if (!cancelled) setItems(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [evidenceIds]);

  const onFile = async (file: File) => {
    setError(null);
    try {
      const id = uid();
      const ev: Evidence = {
        id,
        sessionId,
        personId,
        criterionId,
        kind: file.type.startsWith('image') ? 'photo' : 'photo',
        mime: file.type || 'image/jpeg',
        blob: file,
        size: file.size,
        capturedAt: now(),
      };
      await db.evidence.put(ev);
      onAttach(id);
    } catch (e) {
      setError('Could not attach that file.');
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const id = uid();
        const ev: Evidence = {
          id,
          sessionId,
          personId,
          criterionId,
          kind: 'voice',
          mime: blob.type,
          blob,
          size: blob.size,
          capturedAt: now(),
        };
        await db.evidence.put(ev);
        onAttach(id);
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch (err) {
      setError('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
    recorderRef.current = null;
  };

  const remove = async (id: ID) => {
    await db.evidence.delete(id);
    onDetach(id);
  };

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className={compact ? 'btn-ghost text-xs px-2 py-1' : 'btn-secondary'}
          onClick={() => fileRef.current?.click()}
          aria-label="Attach photo"
        >
          <Icon name="camera" size={compact ? 14 : 16} />
          {compact ? '' : 'Photo'}
        </button>
        {recording ? (
          <button
            type="button"
            className={compact ? 'btn-danger text-xs px-2 py-1' : 'btn-danger'}
            onClick={stopRecording}
          >
            <Icon name="mic" size={compact ? 14 : 16} />
            Stop
          </button>
        ) : (
          <button
            type="button"
            className={compact ? 'btn-ghost text-xs px-2 py-1' : 'btn-secondary'}
            onClick={startRecording}
            aria-label="Record voice memo"
          >
            <Icon name="mic" size={compact ? 14 : 16} />
            {compact ? '' : 'Voice'}
          </button>
        )}
        {items.length > 0 && (
          <span className="chip">
            {items.length} attached
          </span>
        )}
      </div>
      {error ? <div className="text-xs text-hot-600">{error}</div> : null}
      {items.length > 0 && !compact && (
        <div className="grid grid-cols-3 gap-2 mt-1">
          {items.map((ev) => (
            <EvidenceTile key={ev.id} evidence={ev} onRemove={() => remove(ev.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function EvidenceTile({
  evidence,
  onRemove,
}: {
  evidence: Evidence;
  onRemove?: () => void;
}) {
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
    const u = URL.createObjectURL(evidence.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [evidence.blob]);

  return (
    <div className="relative group rounded-xl overflow-hidden border border-ink-100 bg-ink-50">
      {evidence.kind === 'photo' ? (
        <img src={url} alt="Evidence" className="w-full aspect-square object-cover" />
      ) : (
        <div className="w-full aspect-square flex flex-col items-center justify-center p-2 bg-brand-50">
          <Icon name="mic" size={28} className="text-brand-600" />
          <audio controls src={url} className="w-full mt-2" />
        </div>
      )}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 right-1 bg-white/90 rounded-full p-1 shadow-soft opacity-0 group-hover:opacity-100 transition"
          aria-label="Remove evidence"
        >
          <Icon name="trash" size={14} />
        </button>
      ) : null}
    </div>
  );
}
