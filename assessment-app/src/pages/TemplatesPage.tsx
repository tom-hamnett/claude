import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSettings, now, uid } from '../db';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/Layout';
import { EmptyState } from '../components/Empty';
import { AIBadge, AIUpsell } from '../components/AIBadge';
import { RubricGeneratorModal } from '../components/RubricGeneratorModal';
import { GALLERY, VERTICAL_LABELS, instantiateGalleryTemplate } from '../services/seeds/galleryTemplates';
import type { Template, Vertical } from '../types';

export default function TemplatesPage() {
  const templates = useLiveQuery(() => db.templates.orderBy('updatedAt').reverse().toArray(), []);
  const settings = useLiveQuery(() => getSettings(), []);
  const [showGen, setShowGen] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [filter, setFilter] = useState<Vertical | 'all'>('all');
  const navigate = useNavigate();

  const verticals = useMemo(() => {
    const set = new Set<Vertical>();
    templates?.forEach((t) => t.vertical && set.add(t.vertical));
    return Array.from(set);
  }, [templates]);

  const filtered = useMemo(() => {
    if (!templates) return [];
    if (filter === 'all') return templates;
    return templates.filter((t) => t.vertical === filter);
  }, [templates, filter]);

  const aiTier = settings?.license?.tier;
  const aiUnlocked = aiTier && aiTier !== 'free';

  const onAcceptGenerated = async (rubric: {
    name: string;
    description: string;
    scale: { min: number; max: number; step: number; labels: string[] };
    criteria: { name: string; description: string }[];
    tags: string[];
  }) => {
    const t = now();
    const tpl: Template = {
      id: uid(),
      name: rubric.name,
      description: rubric.description,
      scale: rubric.scale,
      criteria: rubric.criteria.map((c) => ({ id: uid(), name: c.name, description: c.description })),
      tags: rubric.tags,
      vertical: settings?.defaultVertical,
      source: 'ai',
      createdAt: t,
      updatedAt: t,
    };
    await db.templates.add(tpl);
    navigate(`/templates/${tpl.id}`);
  };

  return (
    <div>
      <PageHeader
        title="Templates"
        subtitle="Reusable criterion sets — pick one when you start a session."
        actions={
          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={() => setShowGallery(true)}>
              <Icon name="template" size={16} />
              Gallery
            </button>
            <button
              className={aiUnlocked ? 'btn-primary' : 'btn-gold'}
              onClick={() => setShowGen(true)}
              title="Generate a rubric with AI"
            >
              <Icon name="wand" size={16} />
              {aiUnlocked ? 'Generate' : 'Generate (AI)'}
            </button>
            <Link to="/templates/new" className="btn-secondary">
              <Icon name="plus" size={18} />
              Blank
            </Link>
          </div>
        }
      />

      {verticals.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <button
            className={`chip ${filter === 'all' ? 'chip-brand' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          {verticals.map((v) => (
            <button
              key={v}
              className={`chip ${filter === v ? 'chip-brand' : ''}`}
              onClick={() => setFilter(v)}
            >
              {VERTICAL_LABELS[v].emoji} {VERTICAL_LABELS[v].label}
            </button>
          ))}
        </div>
      )}

      {filtered && filtered.length === 0 ? (
        <EmptyState
          icon="template"
          title="No templates yet"
          description="Templates let you reuse criteria + scale across sessions. Generate one with AI, browse the gallery, or build from scratch."
          action={
            <button className={aiUnlocked ? 'btn-primary' : 'btn-gold'} onClick={() => setShowGen(true)}>
              <Icon name="wand" size={18} />
              {aiUnlocked ? 'Generate with AI' : 'Try AI generator'}
            </button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered?.map((t) => (
            <Link
              key={t.id}
              to={`/templates/${t.id}`}
              className="card p-4 hover:shadow-lift transition flex flex-col"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-ink-800 truncate">{t.name}</div>
                    {t.source === 'ai' ? <AIBadge /> : null}
                  </div>
                  {t.description ? (
                    <div className="text-sm text-ink-500 line-clamp-2 mt-0.5">{t.description}</div>
                  ) : null}
                </div>
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                  <Icon name="template" size={18} />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {t.vertical ? (
                  <span className="chip-brand">
                    {VERTICAL_LABELS[t.vertical].emoji} {VERTICAL_LABELS[t.vertical].label}
                  </span>
                ) : null}
                {t.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="chip">
                    <Icon name="tag" size={12} />
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-3 text-xs text-ink-500 flex items-center gap-3">
                <span>{t.criteria.length} criteria</span>
                <span>·</span>
                <span>
                  Scale {t.scale.min}–{t.scale.max}
                </span>
                {t.source === 'gallery' ? (
                  <>
                    <span>·</span>
                    <span>From gallery</span>
                  </>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}

      {!aiUnlocked && (
        <div className="mt-6 ai-card flex items-start gap-3">
          <Icon name="wand" size={22} className="text-brand-600 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-ink-800">One-line briefs become full rubrics</h3>
              <AIUpsell />
            </div>
            <p className="text-sm text-ink-600">
              Type "Y9 oracy in MFL" or "site safety walk for steel frame" and Sigma drafts a 4-7 criterion
              rubric with a sliding scale, ready to use. Unlock for £4.99 (BYOK) or subscribe.
            </p>
          </div>
        </div>
      )}

      <RubricGeneratorModal
        open={showGen}
        onClose={() => setShowGen(false)}
        vertical={settings?.defaultVertical}
        onAccept={onAcceptGenerated}
      />

      <GalleryModal
        open={showGallery}
        onClose={() => setShowGallery(false)}
        onPick={async (g) => {
          const tpl = instantiateGalleryTemplate(g);
          await db.templates.add(tpl as Template);
          setShowGallery(false);
          navigate(`/templates/${tpl.id}`);
        }}
      />
    </div>
  );
}

function GalleryModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (g: typeof GALLERY[number]) => void;
}) {
  const [vertical, setVertical] = useState<Vertical | 'all'>('all');
  const list = useMemo(
    () => (vertical === 'all' ? GALLERY : GALLERY.filter((g) => g.vertical === vertical)),
    [vertical],
  );
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-3xl rounded-t-3xl md:rounded-2xl shadow-lift max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-ink-100">
          <div className="font-bold text-lg text-ink-800 flex items-center gap-2">
            <Icon name="template" size={20} />
            Template gallery
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-ink-100" aria-label="Close">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="px-5 pt-3 flex items-center gap-2 overflow-x-auto pb-1">
          <button className={`chip ${vertical === 'all' ? 'chip-brand' : ''}`} onClick={() => setVertical('all')}>
            All
          </button>
          {(['school', 'tuition', 'sport', 'health', 'construction', 'corporate'] as Vertical[]).map((v) => (
            <button
              key={v}
              className={`chip ${vertical === v ? 'chip-brand' : ''}`}
              onClick={() => setVertical(v)}
            >
              {VERTICAL_LABELS[v].emoji} {VERTICAL_LABELS[v].label}
            </button>
          ))}
        </div>
        <div className="p-5 overflow-y-auto flex-1 grid sm:grid-cols-2 gap-3">
          {list.map((g, i) => (
            <button
              key={i}
              onClick={() => onPick(g)}
              className="text-left card p-4 hover:shadow-lift transition active:scale-[0.99]"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{VERTICAL_LABELS[g.vertical].emoji}</span>
                <div className="font-bold text-ink-800">{g.name}</div>
              </div>
              <div className="text-sm text-ink-600 mt-1 line-clamp-2">{g.description}</div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {g.tags.slice(0, 4).map((t) => (
                  <span key={t} className="chip">{t}</span>
                ))}
              </div>
              <div className="mt-2 text-xs text-ink-500">
                {g.criteria.length} criteria · Scale {g.scale.min}–{g.scale.max}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
