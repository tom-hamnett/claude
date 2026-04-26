import type { AIProviderId } from '../../types';
import { anthropicProvider } from './anthropic';
import { openaiProvider } from './openai';
import { geminiProvider } from './gemini';
import type { AIProvider } from './types';

export const providers: Record<AIProviderId, AIProvider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  gemini: geminiProvider,
};

export const providerList: AIProvider[] = [
  anthropicProvider,
  openaiProvider,
  geminiProvider,
];

export function getProvider(id: AIProviderId): AIProvider {
  return providers[id];
}

export * from './types';
