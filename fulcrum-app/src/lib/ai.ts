import Anthropic from '@anthropic-ai/sdk';
import type { EvaluationResult, Profile, InteractionType, CoachMessage } from '../types';
import { analysisSystem, analysisUserMessage, EVAL_SCHEMA, coachSystem } from './prompts';

const ANTHROPIC_VERSION = '2023-06-01';

function makeClient(apiKey: string) {
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
}

export async function runAnalysis(args: AnalysisArgs): Promise<EvaluationResult> {
  const client = makeClient(args.apiKey);
  const params: any = {
    model: args.model || 'claude-opus-4-7',
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    system: [
      { type: 'text', text: analysisSystem(), cache_control: { type: 'ephemeral' } },
    ],
    output_config: {
      effort: args.effort,
      format: { type: 'json_schema', schema: EVAL_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: analysisUserMessage(args.transcript, args.profile, args.activeModules, args.interaction),
      },
    ],
  };
  const res: any = await client.messages.create(params);
  const text = (res.content || [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('')
    .trim();
  return JSON.parse(text) as EvaluationResult;
}

export interface CoachArgs {
  apiKey: string;
  model: string;
  effort: 'low' | 'medium' | 'high';
  profile?: Profile;
  history: CoachMessage[];
  /** optional extra context block, e.g. an evaluation summary or module text */
  context?: string;
  onText: (full: string) => void;
}

export async function streamCoach(args: CoachArgs): Promise<string> {
  const client = makeClient(args.apiKey);
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

export function describeApiError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return 'Your API key was rejected. Check it in Settings.';
  if (e instanceof Anthropic.PermissionDeniedError) return 'This API key lacks permission for the requested model.';
  if (e instanceof Anthropic.RateLimitError) return 'Rate limited by the API — wait a moment and try again.';
  if (e instanceof Anthropic.APIConnectionError) return 'Network error reaching the Claude API. Check your connection.';
  if (e instanceof Anthropic.APIError) return `API error: ${e.message}`;
  if (e instanceof Error) return e.message;
  return 'Something went wrong.';
}
