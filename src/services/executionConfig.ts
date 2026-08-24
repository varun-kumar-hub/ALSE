import { AiExecutionMode, ProviderCapability, ProviderConfig } from './types';
import { getProviderIdForModel } from './providers';

export interface AuthoritativeExecutionConfig {
  mode: AiExecutionMode;
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
  endpoint: string;
  capabilities: ProviderCapability[];
  connectionStatus: 'connected' | 'disconnected' | 'verifying';
  timestamp: string;
}

export function buildAuthoritativeExecutionConfig(
  mode: AiExecutionMode,
  selectedModel: string,
  providerConfigs: ProviderConfig[],
  isOllamaReady = true
): AuthoritativeExecutionConfig {
  const timestamp = new Date().toISOString();

  // 1. LOCAL Mode Strict State
  if (mode === 'local') {
    const localModel = selectedModel && getProviderIdForModel(selectedModel) === 'ollama'
      ? selectedModel
      : 'qwen3:8b';

    return {
      mode: 'local',
      providerId: 'ollama',
      providerName: 'Local AI (Ollama)',
      modelId: localModel,
      modelName: localModel,
      endpoint: 'http://localhost:11434',
      capabilities: ['chat', 'streaming', 'coding', 'title-generation'],
      connectionStatus: isOllamaReady ? 'connected' : 'disconnected',
      timestamp,
    };
  }

  // 2. CLOUD Mode Strict State
  if (mode === 'cloud') {
    // Find active configured cloud provider (OpenCode Zen preferred, then any key set)
    const configuredCloud =
      providerConfigs.find((p) => p.kind === 'cloud' && p.enabled && (p.apiKeySet || p.id === 'opencode')) ||
      providerConfigs.find((p) => p.id === 'opencode') ||
      providerConfigs.find((p) => p.kind === 'cloud');

    const providerId = configuredCloud?.id || 'opencode';
    const providerName =
      providerId === 'opencode'
        ? 'OpenCode Zen'
        : providerId === 'openai'
        ? 'OpenAI'
        : providerId === 'anthropic'
        ? 'Claude'
        : providerId === 'gemini'
        ? 'Google Gemini'
        : configuredCloud?.name || 'Cloud Provider';

    const targetModel =
      selectedModel && getProviderIdForModel(selectedModel) !== 'ollama'
        ? selectedModel
        : configuredCloud?.defaultModel || 'gpt-5.6-sol';

    return {
      mode: 'cloud',
      providerId,
      providerName,
      modelId: targetModel,
      modelName: targetModel,
      endpoint: configuredCloud?.baseUrl || 'https://opencode.ai/zen/v1',
      capabilities: configuredCloud?.capabilities || ['chat', 'streaming', 'coding', 'tools', 'reasoning'],
      connectionStatus: configuredCloud?.apiKeySet ? 'connected' : 'disconnected',
      timestamp,
    };
  }

  // 3. HYBRID Mode State
  const targetProviderId = getProviderIdForModel(selectedModel) || 'opencode';
  const matchedConfig = providerConfigs.find((p) => p.id === targetProviderId);

  const providerName =
    targetProviderId === 'opencode'
      ? 'OpenCode Zen'
      : targetProviderId === 'openai'
      ? 'OpenAI'
      : targetProviderId === 'anthropic'
      ? 'Claude'
      : targetProviderId === 'gemini'
      ? 'Google Gemini'
      : targetProviderId === 'ollama'
      ? 'Local AI (Ollama)'
      : 'AI Provider';

  return {
    mode: 'hybrid',
    providerId: targetProviderId,
    providerName,
    modelId: selectedModel || 'gpt-5.6-sol',
    modelName: selectedModel || 'gpt-5.6-sol',
    endpoint: matchedConfig?.baseUrl || 'https://opencode.ai/zen/v1',
    capabilities: matchedConfig?.capabilities || ['chat', 'streaming', 'coding'],
    connectionStatus: 'connected',
    timestamp,
  };
}

/**
 * Hard Network Isolation Guard
 * Rejects cloud calls in Local mode, and rejects Ollama calls in Cloud mode.
 */
export function validateNetworkCallAuthorization(
  mode: AiExecutionMode,
  targetUrl: string,
  providerId: string
): { authorized: boolean; reason?: string } {
  if (mode === 'local') {
    if (providerId !== 'ollama' || (!targetUrl.includes('localhost') && !targetUrl.includes('127.0.0.1'))) {
      return {
        authorized: false,
        reason: `[Strict Execution Violation] Local Mode active! Cloud network request to (${targetUrl}) is strictly forbidden.`,
      };
    }
  }

  if (mode === 'cloud') {
    if (providerId === 'ollama' || targetUrl.includes('localhost:11434') || targetUrl.includes('127.0.0.1:11434')) {
      return {
        authorized: false,
        reason: `[Strict Execution Violation] Cloud Mode active! Local Ollama request to (${targetUrl}) is strictly forbidden.`,
      };
    }
  }

  return { authorized: true };
}
