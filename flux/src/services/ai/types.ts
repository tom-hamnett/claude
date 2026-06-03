export type AIProviderId = 'anthropic' | 'openai' | 'gemini';

export type AIRole = 'user' | 'assistant' | 'system';

export interface AIMessage {
  role: AIRole;
  content: string;
}

export interface AICompleteRequest {
  /** Optional system prompt. */
  system?: string;
  messages: AIMessage[];
  maxTokens?: number;
  /** 0..1. Lower = more deterministic. */
  temperature?: number;
  /** If set, the provider returns strictly-parseable JSON of this shape. */
  jsonSchema?: object;
  signal?: AbortSignal;
}

export interface AICompleteResult {
  text: string;
  json?: unknown;
  inputTokens?: number;
  outputTokens?: number;
  provider: AIProviderId;
  model: string;
}

export interface AIProvider {
  id: AIProviderId;
  label: string;
  defaultModel: string;
  models: { id: string; label: string; notes?: string }[];
  validateKey(key: string): { ok: boolean; reason?: string };
  complete(req: AICompleteRequest, opts: { apiKey: string; model: string }): Promise<AICompleteResult>;
}

export class AIError extends Error {
  constructor(
    message: string,
    public readonly cause?: { provider: AIProviderId; status?: number; raw?: unknown },
  ) {
    super(message);
    this.name = 'AIError';
  }
}

export function friendlyMessage(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as { error?: { message?: string } };
  return r.error?.message;
}

export async function safeJson(resp: Response): Promise<unknown> {
  try {
    return await resp.json();
  } catch {
    return undefined;
  }
}

export function tryParseJson(text: string): unknown {
  // Models sometimes wrap JSON in ```json fences or add prose. Be tolerant.
  let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Last resort: grab the outermost {...} or [...] block.
    const match = cleaned.match(/[{[][\s\S]*[}\]]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}
