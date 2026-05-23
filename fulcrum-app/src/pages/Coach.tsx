import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getProfile, getSettings } from '../db';
import { streamCoach, describeApiError, buildCoachPayload, extractText } from '../lib/ai';
import { managedAnthropic } from '../lib/managed';
import { buildCoachContext } from '../lib/coachContext';
import { Markdown } from '../lib/markdown';
import type { CoachMessage } from '../types';

const THREAD = 'main';
const SUGGESTIONS = [
  'I have a tense 1:1 tomorrow — help me prepare.',
  'How do I stop rambling in exec meetings?',
  'A teammate keeps interrupting me. What do I do?',
  'Explain the difference between a request and a demand.',
];

export default function Coach() {
  const messages = useLiveQuery(() => db.coach.where('threadId').equals(THREAD).sortBy('createdAt'), []) || [];
  const [params] = useSearchParams();
  const evalId = params.get('eval') || undefined;
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [hasKey, setHasKey] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSettings().then((s) => setHasKey(!!s.apiKey?.trim() || s.aiMode === 'local' || (s.aiMode === 'managed' && !!s.fulcrumKey?.trim())));
  }, []);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, streaming]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming !== null) return;
    setError('');
    setInput('');
    const userMsg: CoachMessage = { id: crypto.randomUUID(), threadId: THREAD, role: 'user', content, createdAt: Date.now() };
    await db.coach.put(userMsg);

    const settings = await getSettings();
    const isManaged = settings.aiMode === 'local' || (settings.aiMode === 'managed' && !!settings.fulcrumKey?.trim());
    if (!settings.apiKey?.trim() && !isManaged) {
      setError('The coach needs an Anthropic key (BYO), a FULCRUM key (Managed), or the local server (Self-hosted). Set it in Settings.');
      return;
    }
    const profile = await getProfile();
    const history = [...(await db.coach.where('threadId').equals(THREAD).sortBy('createdAt'))];
    const context = await buildCoachContext(evalId);
    setStreaming('');
    try {
      if (isManaged) {
        const payload = buildCoachPayload({ model: settings.coachModel, effort: settings.effort, profile, history: history.map((m) => ({ ...m })), context });
        const res = await managedAnthropic(payload, settings.fulcrumKey || 'local');
        const final = extractText(res);
        await db.coach.put({ id: crypto.randomUUID(), threadId: THREAD, role: 'assistant', content: final, createdAt: Date.now() });
      } else {
        const final = await streamCoach({
          apiKey: settings.apiKey, model: settings.coachModel, effort: settings.effort,
          profile, history: history.map((m) => ({ ...m })), context, onText: (full) => setStreaming(full),
        });
        await db.coach.put({ id: crypto.randomUUID(), threadId: THREAD, role: 'assistant', content: final, createdAt: Date.now() });
      }
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setStreaming(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 h-[calc(100dvh-3.5rem)] md:h-screen-safe flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="font-display text-2xl text-ink-900">Coach</h1>
          <p className="text-ink-400 text-sm">Prep, interpret, practise — grounded in your modules.</p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => db.coach.where('threadId').equals(THREAD).delete()} className="btn-ghost btn-sm">Clear</button>
        )}
      </div>

      {!hasKey && (
        <div className="rounded-2xl border border-gold-200 bg-gold-50 p-3 mb-3 text-sm text-ink-700">
          The coach runs on Claude — add your API key in <Link to="/settings" className="text-brand-600 font-semibold">Settings</Link> to chat.
        </div>
      )}

      {evalId && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-3 mb-3 text-sm text-ink-700">
          ✦ I've got your evaluation and recent history in mind — ask me anything about it, or how to improve.
        </div>
      )}

      <div ref={scroller} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && streaming === null && (
          <div className="ai-card">
            <p className="text-ink-700 mb-3">I'm your communication coach. Tell me what's coming up, paste a tricky message, or ask me anything about the modules.</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="text-left text-sm px-3 py-2 rounded-xl border border-brand-200 bg-white hover:bg-brand-50 text-ink-700">{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => <Bubble key={m.id} role={m.role} content={m.content} />)}
        {streaming !== null && <Bubble role="assistant" content={streaming || '…'} />}
        {error && <div className="text-sm text-hot-600">{error}</div>}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex items-end gap-2 pt-2 border-t border-ink-100"
      >
        <textarea
          className="input flex-1 min-h-[48px] max-h-40 resize-none"
          placeholder="Ask the coach…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
        />
        <button type="submit" disabled={streaming !== null || !input.trim()} className="btn-primary h-12 px-5">
          {streaming !== null ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}

function Bubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${isUser ? 'bg-brand-500 text-white' : 'bg-white border border-ink-100 text-ink-800 shadow-soft'}`}>
        {isUser ? <p className="whitespace-pre-wrap">{content}</p> : <Markdown text={content} className="text-sm leading-relaxed" />}
      </div>
    </div>
  );
}
