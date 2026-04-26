import type { AICompleteRequest, AICompleteResult, AIProvider } from './types';
import { AIError } from './types';

/**
 * Anthropic provider — calls the Messages API directly from the browser.
 * Requires `anthropic-dangerous-direct-browser-access: true` header. The user has
 * accepted the risk by entering their key in BYOK mode; the managed tier never
 * exposes the platform key to the browser (it routes through the Quantum Tools
 * edge proxy with a session token instead).
 */
export const anthropicProvider: AIProvider = {
  id: 'anthropic',
  label: 'Anthropic Claude',
  defaultModel: 'claude-sonnet-4-6',
  models: [
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', notes: 'Best balance of cost and quality.' },
    { id: 'claude-opus-4-7', label: 'Claude Opus 4.7', notes: 'Highest quality. Pricier; slower.' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', notes: 'Fast and cheap; good for in-flow coaching.' },
  ],
  validateKey(key) {
    if (!key) return { ok: false, reason: 'Key is empty.' };
    if (!key.startsWith('sk-ant-')) return { ok: false, reason: 'Anthropic keys start with sk-ant-' };
    if (key.length < 30) return { ok: false, reason: 'Key looks too short.' };
    return { ok: true };
  },
  async complete(req: AICompleteRequest, opts) {
    const body: Record<string, unknown> = {
      model: opts.model,
      max_tokens: req.maxTokens ?? 1024,
      temperature: req.temperature ?? 0.4,
      messages: req.messages.map((m) => ({ role: m.role === 'system' ? 'user' : m.role, content: m.content })),
    };
    if (req.system) body.system = req.system;
    // Force JSON via tool-use trick when a schema is supplied.
    if (req.jsonSchema) {
      body.tools = [
        {
          name: 'return_result',
          description: 'Return the structured result.',
          input_schema: req.jsonSchema,
        },
      ];
      body.tool_choice = { type: 'tool', name: 'return_result' };
    }

    let resp: Response;
    try {
      resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': opts.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
        signal: req.signal,
      });
    } catch (err) {
      throw new AIError(
        err instanceof Error ? err.message : 'Network error contacting Anthropic.',
        { provider: 'anthropic' },
      );
    }

    if (!resp.ok) {
      const raw = await safeJson(resp);
      throw new AIError(
        `Anthropic ${resp.status}: ${friendlyMessage(raw) || resp.statusText}`,
        { provider: 'anthropic', status: resp.status, raw },
      );
    }
    const data = (await resp.json()) as {
      content: Array<{ type: string; text?: string; input?: unknown }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    let text = '';
    let json: unknown = undefined;
    for (const c of data.content ?? []) {
      if (c.type === 'text' && typeof c.text === 'string') text += c.text;
      if (c.type === 'tool_use' && c.input !== undefined) {
        json = c.input;
        text ||= JSON.stringify(c.input);
      }
    }
    if (!json && req.jsonSchema) json = tryParseJson(text);

    return {
      text,
      json,
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
      provider: 'anthropic',
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
  // Sometimes models wrap JSON in ```json fences. Strip them.
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return undefined;
  }
}
