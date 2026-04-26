import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db, getSettings, now, uid } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Scale, Template, TemplateCriterion } from '../types';
import { Icon } from '../components/Icon';
import { ScaleEditor } from '../components/ScaleEditor';
import { ConfirmDialog } from '../components/Modal';
import { RubricGeneratorModal } from '../components/RubricGeneratorModal';

const blank = (): Template => ({
  id: uid(),
  name: '',
  description: '',
  tags: [],
  scale: { min: 1, max: 5, step: 1, labels: ['Emerging', 'Developing', 'Secure', 'Strong', 'Mastery'] },
  criteria: [{ id: uid(), name: '' }],
  createdAt: now(),
  updatedAt: now(),
});

export default function TemplateEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [t, setT] = useState<Template | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const settings = useLiveQuery(() => getSettings(), []);

  useEffect(() => {
    (async () => {
      if (isNew) {
        setT(blank());
      } else {
        const found = await db.templates.get(id!);
        if (found) setT(found);
        else navigate('/templates');
      }
    })();
  }, [id, isNew, navigate]);

  if (!t) return <div className="text-ink-500">Loading…</div>;

  const update = (patch: Partial<Template>) => setT({ ...t, ...patch });
  const setScale = (scale: Scale) => update({ scale });
  const setCriteria = (criteria: TemplateCriterion[]) => update({ criteria });

  const addCriterion = () =>
    setCriteria([...t.criteria, { id: uid(), name: '' }]);

  const removeCriterion = (cid: string) =>
    setCriteria(t.criteria.filter((c) => c.id !== cid));

  const moveCriterion = (cid: string, dir: -1 | 1) => {
    const idx = t.criteria.findIndex((c) => c.id === cid);
    if (idx < 0) return;
    const next = [...t.criteria];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target]!, next[idx]!];
    setCriteria(next);
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    if (t.tags.includes(v)) {
      setTagInput('');
      return;
    }
    update({ tags: [...t.tags, v] });
    setTagInput('');
  };

  const removeTag = (tag: string) =>
    update({ tags: t.tags.filter((x) => x !== tag) });

  const save = async () => {
    const cleanCriteria = t.criteria
      .map((c) => ({ ...c, name: c.name.trim() }))
      .filter((c) => c.name.length > 0);
    if (!t.name.trim() || cleanCriteria.length === 0) return;
    if (t.scale.max <= t.scale.min) return;
    const payload: Template = {
      ...t,
      name: t.name.trim(),
      description: t.description?.trim() || undefined,
      criteria: cleanCriteria,
      updatedAt: now(),
    };
    if (isNew) {
      await db.templates.add(payload);
    } else {
      await db.templates.put(payload);
    }
    navigate('/templates');
  };

  const remove = async () => {
    if (!isNew) await db.templates.delete(t.id);
    navigate('/templates');
  };

  const canSave = !!t.name.trim() && t.criteria.some((c) => c.name.trim()) && t.scale.max > t.scale.min;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/templates" className="btn-ghost">
          <Icon name="chevron-left" size={18} />
          Templates
        </Link>
        {isNew ? (
          <button className="btn-secondary" onClick={() => setShowAI(true)}>
            <Icon name="wand" size={16} />
            Fill with AI
          </button>
        ) : null}
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Template name</label>
          <input
            className="input mt-1"
            placeholder="e.g. Rugby Skills"
            value={t.name}
            onChange={(e) => update({ name: e.target.value })}
            autoFocus
          />
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <input
            className="input mt-1"
            placeholder="What this template is used for"
            value={t.description ?? ''}
            onChange={(e) => update({ description: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Tags</label>
          <div className="flex flex-wrap gap-2 mt-1 items-center">
            {t.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="chip bg-brand-100 text-brand-700"
                onClick={() => removeTag(tag)}
              >
                <Icon name="tag" size={12} />
                {tag}
                <Icon name="close" size={12} />
              </button>
            ))}
            <input
              className="input flex-1 min-w-[140px]"
              placeholder="Add a tag (Enter)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-ink-800">Sliding scale</h2>
        </div>
        <ScaleEditor scale={t.scale} onChange={setScale} />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-ink-800">Criteria</h2>
          <button className="btn-secondary" onClick={addCriterion}>
            <Icon name="plus" size={16} />
            Add criterion
          </button>
        </div>
        <div className="space-y-3">
          {t.criteria.map((c, idx) => (
            <div key={c.id} className="border border-ink-100 rounded-xl p-3 bg-ink-50/40">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-white border border-ink-100 flex items-center justify-center text-ink-500 font-bold text-sm shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <input
                    className="input"
                    placeholder="Criterion name (e.g. Passing accuracy)"
                    value={c.name}
                    onChange={(e) =>
                      setCriteria(
                        t.criteria.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x))
                      )
                    }
                  />
                  <input
                    className="input"
                    placeholder="Description (optional)"
                    value={c.description ?? ''}
                    onChange={(e) =>
                      setCriteria(
                        t.criteria.map((x) =>
                          x.id === c.id ? { ...x, description: e.target.value } : x
                        )
                      )
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    className="btn-ghost p-2"
                    aria-label="Move up"
                    onClick={() => moveCriterion(c.id, -1)}
                  >
                    <Icon name="chevron-left" size={16} className="rotate-90" />
                  </button>
                  <button
                    className="btn-ghost p-2"
                    aria-label="Move down"
                    onClick={() => moveCriterion(c.id, 1)}
                  >
                    <Icon name="chevron-right" size={16} className="rotate-90" />
                  </button>
                  <button
                    className="btn-ghost p-2 text-red-500"
                    aria-label="Remove"
                    onClick={() => removeCriterion(c.id)}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        {!isNew ? (
          <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
            <Icon name="trash" size={16} />
            Delete template
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Link to="/templates" className="btn-secondary">Cancel</Link>
          <button className="btn-primary" disabled={!canSave} onClick={save}>
            <Icon name="check" size={18} />
            {isNew ? 'Create template' : 'Save changes'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete template?"
        message="Existing sessions keep their snapshot and won't be affected."
        confirmLabel="Delete template"
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />

      <RubricGeneratorModal
        open={showAI}
        onClose={() => setShowAI(false)}
        vertical={settings?.defaultVertical}
        onAccept={(rubric) => {
          setT({
            ...t,
            name: rubric.name,
            description: rubric.description,
            scale: rubric.scale,
            criteria: rubric.criteria.map((c) => ({
              id: uid(),
              name: c.name,
              description: c.description,
            })),
            tags: Array.from(new Set([...(t.tags ?? []), ...rubric.tags])),
            vertical: settings?.defaultVertical,
            source: 'ai',
            updatedAt: now(),
          });
        }}
      />
    </div>
  );
}
