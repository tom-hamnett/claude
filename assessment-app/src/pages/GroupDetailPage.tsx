import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, now, uid } from '../db';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { Modal, ConfirmDialog } from '../components/Modal';
import type { Person } from '../types';
import { fmtRelative } from '../lib/format';

export default function GroupDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [bulk, setBulk] = useState('');
  const [editing, setEditing] = useState<Person | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);

  const group = useLiveQuery(() => db.groups.get(id), [id]);
  const people = useLiveQuery(
    () =>
      db.people
        .where('groupId')
        .equals(id)
        .filter((p) => !p.archived)
        .sortBy('name'),
    [id]
  );
  const sessions = useLiveQuery(
    () => db.sessions.where('groupId').equals(id).reverse().sortBy('date'),
    [id]
  );

  if (!group) {
    return <div className="text-ink-500">Group not found.</div>;
  }

  const addOne = async (name: string) => {
    const t = now();
    await db.people.add({
      id: uid(),
      groupId: id,
      name: name.trim(),
      createdAt: t,
    });
    await db.groups.update(id, { updatedAt: t });
  };

  const addBulk = async () => {
    const names = bulk
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    const t = now();
    await db.people.bulkAdd(
      names.map((name) => ({ id: uid(), groupId: id, name, createdAt: t }))
    );
    await db.groups.update(id, { updatedAt: t });
    setBulk('');
    setAdding(false);
  };

  const archivePerson = async (personId: string) => {
    await db.people.update(personId, { archived: true });
  };

  const renamePerson = async () => {
    if (!editing) return;
    await db.people.update(editing.id, { name: editing.name.trim() });
    setEditing(null);
  };

  const deleteGroup = async () => {
    await db.transaction('rw', db.groups, db.people, db.sessions, db.marks, async () => {
      const sess = await db.sessions.where('groupId').equals(id).toArray();
      for (const s of sess) {
        await db.marks.where('sessionId').equals(s.id).delete();
      }
      await db.sessions.where('groupId').equals(id).delete();
      await db.people.where('groupId').equals(id).delete();
      await db.groups.delete(id);
    });
    navigate('/groups');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/groups" className="btn-ghost">
          <Icon name="chevron-left" size={18} />
          Groups
        </Link>
      </div>

      <div className="card p-5 flex items-center gap-4">
        <Avatar name={group.name} size={56} />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold text-ink-800 truncate">{group.name}</h1>
          {group.subject ? <div className="text-ink-500">{group.subject}</div> : null}
          <div className="text-xs text-ink-400 mt-1">
            {people?.length ?? 0} people · {sessions?.length ?? 0} sessions
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setEditingGroup(true)}>
            <Icon name="pencil" size={16} />
            Edit
          </button>
          <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
            <Icon name="trash" size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link to={`/sessions/new?group=${id}`} className="btn-primary">
          <Icon name="play" size={18} />
          Start session
        </Link>
        <button className="btn-secondary" onClick={() => setAdding(true)}>
          <Icon name="plus" size={18} />
          Add people
        </button>
      </div>

      <section>
        <h2 className="font-bold text-ink-800 mb-2">People</h2>
        {people && people.length === 0 ? (
          <div className="card p-6 text-ink-500">
            No one in this group yet.{' '}
            <button className="text-brand-600 font-semibold" onClick={() => setAdding(true)}>
              Add people →
            </button>
          </div>
        ) : (
          <div className="card divide-y divide-ink-100">
            {people?.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3">
                <Avatar name={p.name} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink-800 truncate">{p.name}</div>
                  {p.externalId ? (
                    <div className="text-xs text-ink-400">ID: {p.externalId}</div>
                  ) : null}
                </div>
                <button
                  className="btn-ghost p-2"
                  aria-label="Edit"
                  onClick={() => setEditing(p)}
                >
                  <Icon name="pencil" size={16} />
                </button>
                <button
                  className="btn-ghost p-2 text-red-500"
                  aria-label="Remove"
                  onClick={() => archivePerson(p.id)}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-bold text-ink-800 mb-2">Recent sessions for this group</h2>
        {sessions && sessions.length === 0 ? (
          <div className="card p-6 text-ink-500">No sessions yet.</div>
        ) : (
          <div className="space-y-2">
            {sessions?.slice(0, 8).map((s) => (
              <Link
                key={s.id}
                to={`/sessions/${s.id}`}
                className="card p-4 flex items-center gap-3 hover:shadow-lift"
              >
                <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Icon name="session" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink-800 truncate">{s.title}</div>
                  <div className="text-xs text-ink-500">{fmtRelative(s.date)}</div>
                </div>
                <span
                  className={`chip ${
                    s.status === 'complete' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {s.status === 'complete' ? 'Complete' : 'In progress'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={adding}
        title="Add people"
        onClose={() => setAdding(false)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={addBulk} disabled={!bulk.trim()}>
              <Icon name="check" size={18} />
              Add
            </button>
          </>
        }
      >
        <p className="text-ink-500 text-sm mb-2">
          One name per line. Paste straight from your spreadsheet.
        </p>
        <textarea
          className="input min-h-[180px] font-mono"
          placeholder={'Aiden Carter\nBella Hughes\nCharlie Singh'}
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
        />
      </Modal>

      <Modal
        open={!!editing}
        title="Edit person"
        onClose={() => setEditing(null)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={renamePerson} disabled={!editing?.name.trim()}>
              <Icon name="check" size={18} />
              Save
            </button>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <div>
              <label className="label">Name</label>
              <input
                className="input mt-1"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                autoFocus
              />
            </div>
            <div>
              <label className="label">External ID (optional)</label>
              <input
                className="input mt-1"
                placeholder="e.g. school admission number"
                value={editing.externalId ?? ''}
                onChange={(e) => setEditing({ ...editing, externalId: e.target.value })}
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={editingGroup}
        title="Edit group"
        onClose={() => setEditingGroup(false)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditingGroup(false)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={async () => {
                await db.groups.update(id, { updatedAt: now() });
                setEditingGroup(false);
              }}
            >
              <Icon name="check" size={18} />
              Save
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Group name</label>
            <input
              className="input mt-1"
              defaultValue={group.name}
              onChange={(e) => db.groups.update(id, { name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Subject / context</label>
            <input
              className="input mt-1"
              defaultValue={group.subject ?? ''}
              onChange={(e) => db.groups.update(id, { subject: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this group?"
        message="This permanently deletes the group, its people, sessions, and marks. This can't be undone."
        confirmLabel="Delete group"
        onConfirm={deleteGroup}
        onClose={() => setConfirmDelete(false)}
      />

      {/* Quick-add inline (dev convenience) */}
      <QuickAddInline onAdd={addOne} />
    </div>
  );
}

function QuickAddInline({ onAdd }: { onAdd: (name: string) => void | Promise<void> }) {
  const [val, setVal] = useState('');
  return (
    <div className="card p-3 flex gap-2">
      <input
        className="input"
        placeholder="Quick add: type a name and press Enter"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={async (e) => {
          if (e.key === 'Enter' && val.trim()) {
            await onAdd(val.trim());
            setVal('');
          }
        }}
      />
      <button
        className="btn-secondary"
        disabled={!val.trim()}
        onClick={async () => {
          await onAdd(val.trim());
          setVal('');
        }}
      >
        <Icon name="plus" size={16} />
        Add
      </button>
    </div>
  );
}
