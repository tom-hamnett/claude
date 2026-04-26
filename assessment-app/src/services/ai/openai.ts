import type { AICompleteRequest, AICompleteResult, AIProvider } from './types';
import { AIError } from './types';

export const openaiProvider: AIProvider = {
  id: 'openai',
  label: 'OpenAI',
  defaultModel: 'gpt-5-mini',
  models: [
    { id: 'gpt-5-mini', label: 'GPT-5 mini', notes: 'Default. Fast and cheap.' },
    { id: 'gpt-5', label: 'GPT-5', notes: 'Highest quality.' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini', notes: 'Stable fallback.' },
  ],
  validateKey(key) {
    if (!key) return { ok: false, reason: 'Key is empty.' };
    if (!key.startsWith('sk-')) return { ok: false, reason: 'OpenAI keys start with sk-' };
    if (key.length < 30) return { ok: false, reason: 'Key looks too short.' };
    return { ok: true };
  },
  async complete(req: AICompleteRequest, opts) {
    const messages = [];
    if (req.system) messages.push({ role: 'system', content: req.system });
    for (const m of req.messages) messages.push({ role: m.role, content: m.content });

    const body: Record<string, unknown> = {
      model: opts.model,
      messages,
      max_tokens: req.maxTokens ?? 1024,
      temperature: req.temperature ?? 0.4,
    };
    if (req.jsonSchema) body.response_format = { type: 'json_object' };

    let resp: Response;
    try {
      resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${opts.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: req.signal,
      });
    } catch (err) {
      throw new AIError(
        err instanceof Error ? err.message : 'Network error contacting OpenAI.',
        { provider: 'openai' },
      );
    }

    if (!resp.ok) {
      const raw = await safeJson(resp);
      throw new AIError(
        `OpenAI ${resp.status}: ${friendlyMessage(raw) || resp.statusText}`,
        { provider: 'openai', status: resp.status, raw },
      );
    }
    const data = (await resp.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = data.choices?.[0]?.message?.content ?? '';
    const json = req.jsonSchema ? tryParseJson(text) : undefined;
    return {
      text,
      json,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
      provider: 'openai',
      model: opts.model,
    } satisfies AICompleteResult;
  },
};

function friendlyMessage(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as { error?: { message?: string } };
  return r.error?.message;
}

async function safeJson(resp: Response): Promise<unknown> {
  try {
    return await resp.json();
  } catch {
    return undefined;
  }
}

function tryParseJson(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return undefined;
  }
}
