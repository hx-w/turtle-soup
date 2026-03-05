import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import { env } from '../../lib/env';

let _gameModel: LanguageModel | null | undefined = undefined;
let _creationModel: LanguageModel | null | undefined = undefined;

export function getModel(): LanguageModel | null {
  if (_gameModel !== undefined) return _gameModel;

  const { AI_API_KEY, AI_BASE_URL, AI_PROVIDER, AI_MODEL } = env;

  if (!AI_API_KEY || !AI_BASE_URL || !AI_PROVIDER) {
    _gameModel = null;
    return null;
  }

  const provider = createOpenAICompatible({
    name: AI_PROVIDER,
    baseURL: AI_BASE_URL,
    apiKey: AI_API_KEY,
  });

  _gameModel = provider(AI_MODEL || 'deepseek-chat');
  return _gameModel;
}

export function getCreationModel(): LanguageModel | null {
  if (_creationModel !== undefined) return _creationModel;

  // Prefer creation-specific config, fallback to general AI config
  const apiKey = env.CREATION_AI_API_KEY || env.AI_API_KEY;
  const baseUrl = env.CREATION_AI_BASE_URL || env.AI_BASE_URL;
  const providerName = env.CREATION_AI_PROVIDER || env.AI_PROVIDER;
  const model = env.CREATION_AI_MODEL || env.AI_MODEL;

  if (!apiKey || !baseUrl || !providerName) {
    _creationModel = null;
    return null;
  }

  const providerInstance = createOpenAICompatible({
    name: providerName,
    baseURL: baseUrl,
    apiKey: apiKey,
  });

  _creationModel = providerInstance(model || 'gpt-4-turbo');
  return _creationModel;
}

export function isAiAvailable(): boolean {
  return getModel() !== null;
}

export function isCreationAiAvailable(): boolean {
  return getCreationModel() !== null;
}

export function getRequestTimeout(): number {
  return env.AI_REQUEST_TIMEOUT;
}
