import type { EvaluationResult, Profile, InteractionType, CoachMessage } from '../types';
import { analysisSystem, analysisUserMessage, EVAL_SCHEMA, coachSystem } from './prompts';

const ANTHROPIC_VERSION = '2023-06-01';

// Lazy-load the SDK so nothing Node-ish runs at app boot. Only loaded when the
// user actually runs an evaluation or chats with the coach.
async function makeClient(apiKey: string) {
  const mod = await import('@anthropic-ai/sdk');
  const Anthropic = mod.default;
  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
    defaultHeaders: {
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
  });
}

export interface AnalysisArgs {
  apiKey: string;
  model: string;
  effort: 'low' | 'medium' | 'high';
  transcript: string;
  profile?: Profile;
  activeModules: number[];
  interaction: InteractionType;
  deliveryContext?: string;
}

export async function runAnalysis(args: AnalysisArgs): Promise<EvaluationResult> {
  const client = await makeClient(args.apiKey);
  const params: any = {
    model: args.model || 'claude-opus-4-7',
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    system: [{ type: 'text', text: analysisSystem(), cache_control: { type: 'ephemeral' } }],
    output_config: {
      effort: args.effort,
      format: { type: 'json_schema', schema: EVAL_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: analysisUserMessage(args.transcript, args.profile, args.activeModules, args.interaction, args.deliveryContext),
      },
    ],
  };
  const res: any = await client.messages.create(params);
  const text = (res.content || [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('')
    .trim();
  return JSON.parse(stripFences(text)) as EvaluationResult;
}

function stripFences(s: string): string {
  return s.replace(/^```json?\s*/i, '').replace(/```$/i, '').trim();
}

export interface CoachArgs {
  apiKey: string;
  model: string;
  effort: 'low' | 'medium' | 'high';
  profile?: Profile;
  history: CoachMessage[];
  context?: string;
  onText: (full: string) => void;
}

export async function streamCoach(args: CoachArgs): Promise<string> {
  const client = await makeClient(args.apiKey);
  const sys = args.context
    ? `${coachSystem(args.profile)}\n\nCURRENT CONTEXT:\n${args.context}`
    : coachSystem(args.profile);

  const messages = args.history.map((m) => ({ role: m.role, content: m.content }));
  const params: any = {
    model: args.model || 'claude-opus-4-7',
    max_tokens: 4000,
    thinking: { type: 'adaptive' },
    output_config: { effort: args.effort },
    system: [{ type: 'text', text: sys, cache_control: { type: 'ephemeral' } }],
    messages,
  };

  let full = '';
  const stream: any = client.messages.stream(params);
  stream.on('text', (delta: string) => {
    full += delta;
    args.onText(full);
  });
  await stream.finalMessage();
  return full;
}

/** Duck-typed error description — no SDK import needed at call time. */
export function describeApiError(e: any): string {
  const status = e?.status ?? e?.statusCode;
  const type = e?.error?.type || e?.type;
  if (status === 401 || type === 'authentication_error') return 'Your API key was rejected. Check it in Settings.';
  if (status === 403 || type === 'permission_error') return 'This API key lacks permission for the requested model.';
  if (status === 429 || type === 'rate_limit_error') return 'Rate limited by the API — wait a moment and try again.';
  if (status === 400) return `Bad request to the API: ${e?.error?.message || e?.message || 'check the model and inputs.'}`;
  if (e?.name === 'APIConnectionError' || /fetch|network/i.test(String(e?.message))) return 'Network error reaching the Claude API. Check your connection.';
  return e?.error?.message || e?.message || 'Something went wrong calling the API.';
}
