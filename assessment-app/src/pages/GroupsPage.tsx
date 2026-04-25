import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, now, uid } from '../db';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/Layout';
import { EmptyState } from '../components/Empty';

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
        title="Classes"
        subtitle="A class is any group you assess — students, players, employees."
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Icon name="plus" size={18} />
            New class
          </button>
        }
      />

      {groups && groups.length === 0 ? (
        <EmptyState
          icon="group"
          title="No classes yet"
          description="Create a class to add students and start assessing."
          action={
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Icon name="plus" size={18} />
              New class
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
                <div className="font-semibold text-ink-800 truncate">{g.name}</div>
                {g.subject ? <div className="text-xs text-ink-500 truncate">{g.subject}</div> : null}
                <div className="text-xs text-ink-400 mt-1">
                  {peopleCounts?.get(g.id) ?? 0} people
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
      createdAt: t,
      updatedAt: t,
    });
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      title="New class"
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
          <label className="label">Class name</label>
          <input
            className="input mt-1"
            placeholder="e.g. Year 7 PE — Set A"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="label">Subject / context (optional)</label>
          <input
            className="input mt-1"
            placeholder="e.g. Physical Education"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
