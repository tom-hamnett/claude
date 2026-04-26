import type { AIProviderId } from '../../types';

export type AIRole = 'user' | 'assistant' | 'system';

export interface AIMessage {
  role: AIRole;
  content: string;
}

export interface AICompleteRequest {
  /** Optional system prompt — used as Anthropic system or OpenAI system message. */
  system?: string;
  messages: AIMessage[];
  /** Hard cap on output tokens. */
  maxTokens?: number;
  /** 0..1. Lower = more deterministic. Defaults to 0.4 for assessment use. */
  temperature?: number;
  /**
   * If set, the provider is asked to return strictly-parseable JSON of this shape.
   * Implementation: Anthropic uses tool-use forcing; OpenAI uses response_format=json_object;
   * Gemini uses response_mime_type=application/json.
   */
  jsonSchema?: object;
  /** Abort controller signal for cancellation. */
  signal?: AbortSignal;
}

export interface AICompleteResult {
  text: string;
  /** Parsed JSON object if jsonSchema was supplied and the response parsed cleanly. */
  json?: unknown;
  inputTokens?: number;
  outputTokens?: number;
  provider: AIProviderId;
  model: string;
}

export interface AIProvider {
  id: AIProviderId;
  /** Human-readable label for UI. */
  label: string;
  /** Default model id when user hasn't picked one. */
  defaultModel: string;
  /** Models exposed in the provider picker. */
  models: { id: string; label: string; notes?: string }[];
  /** Does the supplied key have the right shape? */
  validateKey(key: string): { ok: boolean; reason?: string };
  /** Make a chat completion. Throws AIError on failure. */
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
