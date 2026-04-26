import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Modal } from './Modal';
import { db, now, uid } from '../db';
import type { Evidence, ID } from '../types';

/**
 * Signature capture for sign-off (construction/health). Renders a touch-canvas
 * the user signs with finger or stylus. On save we serialise to a PNG blob
 * and store as Evidence row with kind=signature.
 */
export function SignaturePadModal({
  open,
  onClose,
  sessionId,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  sessionId: ID;
  onSave: (evidenceId: ID) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Match canvas pixel size to its CSS size, with DPR for crisp ink.
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#181b25';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [open]);

  const pos = (e: PointerEvent | React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (e as PointerEvent).clientX - rect.left, y: (e as PointerEvent).clientY - rect.top };
  };

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current!;
    canvas.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const p = pos(e);
    if (last.current) {
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    last.current = p;
    setHasInk(true);
  };
  const end = (e: React.PointerEvent) => {
    drawing.current = false;
    last.current = null;
    canvasRef.current?.releasePointerCapture(e.pointerId);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasInk(false);
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasInk) return;
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), 'image/png'));
    if (!blob) return;
    const id = uid();
    const ev: Evidence = {
      id,
      sessionId,
      kind: 'signature',
      mime: 'image/png',
      blob,
      size: blob.size,
      capturedAt: now(),
      transcript: name || undefined,
    };
    await db.evidence.put(ev);
    onSave(id);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Icon name="signature" size={20} className="text-brand-600" />
          Sign off
        </div>
      }
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={clear} disabled={!hasInk}>
            Clear
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={!hasInk}>
            <Icon name="check" size={16} />
            Save signature
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label htmlFor="sigpad-name" className="label mb-1 block">
            Name (printed)
          </label>
          <input
            id="sigpad-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Print full name"
          />
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white overflow-hidden">
          <canvas
            ref={canvasRef}
            className="block w-full h-56 touch-none cursor-crosshair"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
          />
        </div>
        <div className="text-xs text-ink-400 text-center">
          Sign with finger or stylus. Captured locally; never sent to a server.
        </div>
      </div>
    </Modal>
  );
}
