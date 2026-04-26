import { useState } from 'react';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { db, patchSettings } from '../db';
import type { Vertical } from '../types';
import { GALLERY, VERTICAL_LABELS, instantiateGalleryTemplate } from '../services/seeds/galleryTemplates';

/**
 * Shown on first launch (and re-openable from Settings). Picks a vertical and
 * imports the matching gallery templates so the user has a useful workspace
 * within seconds of opening the app.
 *
 * Horizontal positioning means we don't pretend Sigma is a school app. We
 * meet the user where they work — clipboard in hand, on a site, in a clinic,
 * in a classroom, on a pitch.
 */
export function OnboardingPicker({
  open,
  onClose,
  initialVertical,
}: {
  open: boolean;
  onClose: () => void;
  initialVertical?: Vertical;
}) {
  const [picked, setPicked] = useState<Vertical | undefined>(initialVertical);
  const [importing, setImporting] = useState(false);

  const completePick = async (v: Vertical) => {
    setPicked(v);
    setImporting(true);
    try {
      // Import gallery templates for this vertical that aren't already saved.
      const galleryForVertical = GALLERY.filter((g) => g.vertical === v);
      if (galleryForVertical.length > 0) {
        const existing = await db.templates.where('vertical').equals(v).toArray();
        const existingNames = new Set(existing.map((t) => t.name));
        const toAdd = galleryForVertical.filter((g) => !existingNames.has(g.name));
        if (toAdd.length > 0) {
          await db.templates.bulkAdd(toAdd.map((g) => instantiateGalleryTemplate(g)));
        }
      }
      await patchSettings({ onboarded: true, defaultVertical: v });
    } finally {
      setImporting(false);
      onClose();
    }
  };

  const skip = async () => {
    await patchSettings({ onboarded: true });
    onClose();
  };

  const vs: Vertical[] = ['school', 'tuition', 'sport', 'health', 'construction', 'corporate', 'field', 'other'];

  return (
    <Modal
      open={open}
      onClose={skip}
      title={
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold">
            Σ
          </span>
          Welcome to Sigma
        </div>
      }
      size="lg"
      footer={
        <button className="btn-ghost" onClick={skip}>
          Skip — I'll set this up later
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-ink-700 leading-snug">
            Sigma is a touch-first clipboard for anyone assessing people in the field — schools, sites, clinics, pitches, shops.
            Pick the closest fit and we'll fill your library with credible starting templates.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {vs.map((v) => {
            const meta = VERTICAL_LABELS[v];
            const isPicked = picked === v;
            return (
              <button
                key={v}
                disabled={importing}
                onClick={() => completePick(v)}
                className={`text-left rounded-2xl border p-3 transition active:scale-[0.98] ${
                  isPicked ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-200' : 'border-ink-200 hover:border-brand-200 hover:bg-brand-50/50'
                }`}
              >
                <div className="text-2xl">{meta.emoji}</div>
                <div className="font-bold text-ink-800 mt-1">{meta.label}</div>
                <div className="text-xs text-ink-500 mt-0.5 leading-tight">{meta.tagline}</div>
              </button>
            );
          })}
        </div>
        <div className="text-xs text-ink-400 flex items-center gap-1.5">
          <Icon name="cloud-off" size={14} />
          Sigma works fully offline. Nothing leaves your device until you choose to share or sync.
        </div>
      </div>
    </Modal>
  );
}

