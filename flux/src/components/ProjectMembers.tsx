import { useState } from 'react';
import { inviteMember, removeMember, useProjectMembers } from '../store';
import { isCloud } from '../services/supabase';
import { useAuth } from '../services/auth';
import Icon from './Icon';
import Modal from './Modal';
import { Spinner } from './AIRun';
import type { Project } from '../types';

/**
 * Project sharing. A project is private to its creator + the people invited
 * here (within your email domain). Cloud mode only — local mode is single-user.
 */
export default function ProjectMembers({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  if (!isCloud) return null;
  const members = undefined; // resolved inside modal
  void members;
  return (
    <>
      <button className="btn-tint-brand text-sm" onClick={() => setOpen(true)}>
        <Icon name="projects" className="h-4 w-4" /> Share
      </button>
      {open && <MembersModal project={project} onClose={() => setOpen(false)} />}
    </>
  );
}

function MembersModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const auth = useAuth();
  const members = useProjectMembers(project.id);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function invite() {
    const clean = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
      setError('Enter a valid email.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await inviteMember(project.id, clean);
      setEmail('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not invite.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Share "${project.name}"`}>
      <p className="mb-3 text-sm text-ink-500">
        This project is private. Only its creator and the people below can see it. Invite anyone by email (clients and colleagues alike) — they'll see it next time they sign in.
      </p>

      <div className="flex gap-2">
        <input
          className="input"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && invite()}
        />
        <button className="btn-primary shrink-0" onClick={invite} disabled={busy || !email.trim()}>
          {busy ? <Spinner /> : <><Icon name="plus" className="h-4 w-4" /> Invite</>}
        </button>
      </div>
      {error && <div className="mt-2 text-sm text-nva-600">{error}</div>}

      <div className="mt-4 space-y-2">
        {members === undefined ? (
          <div className="text-sm text-ink-400"><Spinner label="Loading members…" /></div>
        ) : members.length === 0 ? (
          <div className="text-sm text-ink-400">No members yet.</div>
        ) : (
          members.map((m) => (
            <div key={m.email} className="flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-2 text-sm">
              <Icon name="projects" className="h-4 w-4 text-ink-400" />
              <span className="flex-1 text-ink-700">{m.email}{m.email === (auth.userEmail ?? '').toLowerCase() ? ' (you)' : ''}</span>
              <span className="chip bg-ink-100 text-ink-500 capitalize">{m.role}</span>
              {m.role !== 'owner' && (
                <button className="text-ink-300 hover:text-nva-600" onClick={() => removeMember(project.id, m.email)} title="Remove">
                  <Icon name="x" className="h-4 w-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
