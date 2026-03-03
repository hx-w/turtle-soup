import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import { env } from '../../lib/env';

let _model: LanguageModel | null | undefined = undefined;

export function getModel(): LanguageModel | null {
  if (_model !== undefined) return _model;

  const { AI_API_KEY, AI_BASE_URL, AI_PROVIDER, AI_MODEL } = env;

  if (!AI_API_KEY || !AI_BASE_URL || !AI_PROVIDER) {
    _model = null;
    return null;
  }

  const provider = createOpenAICompatible({
    name: AI_PROVIDER,
    baseURL: AI_BASE_URL,
    apiKey: AI_API_KEY,
  });

  _model = provider(AI_MODEL || 'deepseek-chat');
  return _model;
}

export function isAiAvailable(): boolean {
  return getModel() !== null;
}

export function getRequestTimeout(): number {
  return env.AI_REQUEST_TIMEOUT;
}
