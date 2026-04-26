import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSettings, now, uid } from '../db';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/Layout';
import { EmptyState } from '../components/Empty';
import { VERTICAL_LABELS } from '../services/seeds/galleryTemplates';
import type { Vertical } from '../types';

export default function GroupsPage() {
  const [open, setOpen] = useState(false);

  const groups = useLiveQuery(() => db.groups.orderBy('name').toArray(), []);
  const peopleCounts = useLiveQuery(async () => {
    const all = await db.people.toArray();
    const m = new Map<string, number>();
    for (const p of all) {
      if (p.archived) continue;
      m.set(p.groupId, (m.get(p.groupId) ?? 0) + 1);
    }
    return m;
  }, []);

  return (
    <div>
      <PageHeader
        title="Groups"
        subtitle="A group is any cohort you assess — a class, a team, a site, a ward."
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Icon name="plus" size={18} />
            New group
          </button>
        }
      />

      {groups && groups.length === 0 ? (
        <EmptyState
          icon="group"
          title="No groups yet"
          description="Create a group to add people and start assessing."
          action={
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Icon name="plus" size={18} />
              New group
            </button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups?.map((g) => (
            <Link
              key={g.id}
              to={`/groups/${g.id}`}
              className="card p-4 flex items-center gap-3 hover:shadow-lift transition"
            >
              <Avatar name={g.name} size={48} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="font-semibold text-ink-800 truncate">{g.name}</div>
                </div>
                {g.subject ? <div className="text-xs text-ink-500 truncate">{g.subject}</div> : null}
                <div className="text-xs text-ink-400 mt-1 flex items-center gap-2">
                  <span>{peopleCounts?.get(g.id) ?? 0} people</span>
                  {g.vertical ? (
                    <>
                      <span>·</span>
                      <span>
                        {VERTICAL_LABELS[g.vertical].emoji} {VERTICAL_LABELS[g.vertical].label}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
              <Icon name="chevron-right" size={20} />
            </Link>
          ))}
        </div>
      )}

      <NewGroupModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function NewGroupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [vertical, setVertical] = useState<Vertical | undefined>();
  const settings = useLiveQuery(() => getSettings(), []);

  useEffect(() => {
    if (open) setVertical(settings?.defaultVertical);
  }, [open, settings?.defaultVertical]);

  const reset = () => {
    setName('');
    setSubject('');
  };

  const submit = async () => {
    if (!name.trim()) return;
    const t = now();
    await db.groups.add({
      id: uid(),
      name: name.trim(),
      subject: subject.trim() || undefined,
      vertical,
      createdAt: t,
      updatedAt: t,
    });
    reset();
    onClose();
  };

  const verticals: Vertical[] = ['school', 'tuition', 'sport', 'health', 'construction', 'corporate', 'field', 'other'];

  return (
    <Modal
      open={open}
      title="New group"
      onClose={() => {
        reset();
        onClose();
      }}
      footer={
        <>
          <button
            className="btn-secondary"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </button>
          <button className="btn-primary" disabled={!name.trim()} onClick={submit}>
            <Icon name="check" size={18} />
            Create
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label htmlFor="group-name" className="label">
            Group name
          </label>
          <input
            id="group-name"
            className="input mt-1"
            placeholder="e.g. Year 7 PE — Set A · Site B North · Ward 4 students"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="group-subject" className="label">
            Context (optional)
          </label>
          <input
            id="group-subject"
            className="input mt-1"
            placeholder="e.g. PE · Steel frame · Year 1 paeds"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div>
          <div className="label mb-1">Domain</div>
          <div className="flex flex-wrap gap-1.5">
            {verticals.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVertical((cur) => (cur === v ? undefined : v))}
                className={`chip ${vertical === v ? 'chip-brand' : ''}`}
              >
                {VERTICAL_LABELS[v].emoji} {VERTICAL_LABELS[v].label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
