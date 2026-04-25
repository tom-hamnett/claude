import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, now, uid } from '../db';
import type { Scale, Session, SessionCriterion, Template } from '../types';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/Layout';
import { ScaleEditor } from '../components/ScaleEditor';

const defaultScale = (): Scale => ({
  min: 1,
  max: 5,
  step: 1,
  labels: ['Emerging', 'Developing', 'Secure', 'Strong', 'Mastery'],
});

export default function NewSessionPage() {
  const [params] = useSearchParams();
  const presetGroupId = params.get('group') ?? '';
  const navigate = useNavigate();

  const groups = useLiveQuery(() => db.groups.orderBy('name').toArray(), []);
  const templates = useLiveQuery(() => db.templates.orderBy('updatedAt').reverse().toArray(), []);

  const [groupId, setGroupId] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [scale, setScale] = useState<Scale>(defaultScale());
  const [criteria, setCriteria] = useState<SessionCriterion[]>([{ id: uid(), name: '' }]);

  // Default group from query param once loaded
  useEffect(() => {
    if (presetGroupId && !groupId && groups?.some((g) => g.id === presetGroupId)) {
      setGroupId(presetGroupId);
    }
  }, [presetGroupId, groups, groupId]);

  // When a template is picked, pull its scale + criteria
  const applyTemplate = (t: Template | undefined) => {
    if (!t) {
      setTemplateId('');
      return;
    }
    setTemplateId(t.id);
    setScale({ ...t.scale, labels: t.scale.labels?.slice() });
    setCriteria(t.criteria.map((c) => ({ id: uid(), name: c.name, description: c.description })));
    if (!title.trim()) setTitle(t.name);
  };

  const addCriterion = () =>
    setCriteria([...criteria, { id: uid(), name: '' }]);
  const removeCriterion = (cid: string) =>
    setCriteria(criteria.filter((c) => c.id !== cid));

  const validCriteria = criteria.map((c) => c.name.trim()).filter(Boolean);
  const canStart =
    !!groupId && validCriteria.length > 0 && scale.max > scale.min && !!title.trim();

  const start = async () => {
    const t = now();
    const session: Session = {
      id: uid(),
      groupId,
      templateId: templateId || undefined,
      title: title.trim() || 'Assessment',
      notes: notes.trim() || undefined,
      date: t,
      scale,
      criteria: criteria
        .map((c) => ({ ...c, name: c.name.trim() }))
        .filter((c) => c.name.length > 0),
      createdAt: t,
      updatedAt: t,
      status: 'in_progress',
    };
    await db.sessions.add(session);
    navigate(`/sessions/${session.id}/assess`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/sessions" className="btn-ghost">
          <Icon name="chevron-left" size={18} />
          Sessions
        </Link>
      </div>
      <PageHeader title="New session" subtitle="Pick a class, choose criteria, then start assessing." />

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Class</label>
          {groups && groups.length === 0 ? (
            <div className="mt-2 p-3 rounded-xl bg-amber-50 text-amber-800 text-sm">
              You need a class first.{' '}
              <Link to="/groups" className="font-semibold underline">Create one →</Link>
            </div>
          ) : (
            <div className="mt-1 grid sm:grid-cols-2 gap-2">
              {groups?.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGroupId(g.id)}
                  className={`text-left p-3 rounded-xl border transition ${
                    groupId === g.id
                      ? 'border-brand-400 bg-brand-50'
                      : 'border-ink-100 bg-white hover:bg-ink-50'
                  }`}
                >
                  <div className="font-semibold text-ink-800">{g.name}</div>
                  {g.subject ? <div className="text-xs text-ink-500">{g.subject}</div> : null}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="label">Title</label>
          <input
            className="input mt-1"
            placeholder="e.g. Tuesday rugby — tackling drills"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Lesson notes (optional)</label>
          <textarea
            className="input mt-1 min-h-[80px]"
            placeholder="Anything that adds context to today's marks"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-ink-800">Template</h2>
          <Link to="/templates/new" className="text-sm font-semibold text-brand-600">
            + New template
          </Link>
        </div>
        {templates && templates.length === 0 ? (
          <div className="text-ink-500 text-sm">
            No templates yet — define your criteria below for an ad-hoc session.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => applyTemplate(undefined)}
              className={`text-left p-3 rounded-xl border transition ${
                !templateId ? 'border-brand-400 bg-brand-50' : 'border-ink-100 bg-white hover:bg-ink-50'
              }`}
            >
              <div className="font-semibold text-ink-800">Ad-hoc</div>
              <div className="text-xs text-ink-500">Define criteria yourself</div>
            </button>
            {templates?.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t)}
                className={`text-left p-3 rounded-xl border transition ${
                  templateId === t.id
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-ink-100 bg-white hover:bg-ink-50'
                }`}
              >
                <div className="font-semibold text-ink-800 truncate">{t.name}</div>
                <div className="text-xs text-ink-500 truncate">
                  {t.criteria.length} criteria · scale {t.scale.min}–{t.scale.max}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="font-bold text-ink-800">Sliding scale</h2>
        <ScaleEditor scale={scale} onChange={setScale} />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-ink-800">Criteria</h2>
          <button className="btn-secondary" onClick={addCriterion}>
            <Icon name="plus" size={16} />
            Add criterion
          </button>
        </div>
        <div className="space-y-2">
          {criteria.map((c, idx) => (
            <div key={c.id} className="flex items-start gap-2">
              <div className="w-8 h-10 rounded-lg bg-ink-50 border border-ink-100 flex items-center justify-center text-ink-500 font-bold text-sm shrink-0">
                {idx + 1}
              </div>
              <input
                className="input"
                placeholder="Criterion name"
                value={c.name}
                onChange={(e) =>
                  setCriteria(criteria.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)))
                }
              />
              <button
                className="btn-ghost p-2 text-red-500 shrink-0"
                onClick={() => removeCriterion(c.id)}
                aria-label="Remove"
              >
                <Icon name="trash" size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="sticky bottom-20 md:bottom-4 z-10">
        <div className="card p-3 flex items-center justify-between">
          <div className="text-sm text-ink-500">
            {validCriteria.length} criteria · scale {scale.min}–{scale.max}
          </div>
          <button className="btn-primary" disabled={!canStart} onClick={start}>
            <Icon name="play" size={18} />
            Start assessing
          </button>
        </div>
      </div>
    </div>
  );
}
