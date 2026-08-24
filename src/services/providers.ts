import { invoke, Channel } from '@tauri-apps/api/core';
import { streamChat as streamOllamaChat, generateChatTitle as generateOllamaTitle } from './ollama';
import { PROVIDER_REGISTRY, validateProviderModelCompatibility } from './providerRegistry';
import { fetchWithCorsProxy } from './corsFetch';
import {
  AiExecutionMode,
  ChatMessage,
  ChatStreamChunk,
  NormalizedProviderResponse,
  ProviderCapability,
  ProviderConfig,
  ProviderRouteRequest,
} from './types';

export interface AiProvider {
  config: ProviderConfig;
  healthCheck(): Promise<boolean>;
  stream(
    model: string,
    messages: ChatMessage[],
    onChunk: (chunk: ChatStreamChunk) => void
  ): Promise<void>;
  chat?(model: string, messages: ChatMessage[]): Promise<NormalizedProviderResponse>;
  embeddings?(input: string): Promise<number[]>;
  vision?(): Promise<NormalizedProviderResponse>;
  speechToText?(): Promise<NormalizedProviderResponse>;
  textToSpeech?(): Promise<NormalizedProviderResponse>;
  generateTitle(model: string, prompt: string): Promise<string>;
  countTokens?(messages: ChatMessage[]): Promise<number>;
}

const LOCAL_CAPABILITIES: ProviderCapability[] = [
  'chat',
  'streaming',
  'title-generation',
  'coding',
  'embeddings',
];

export const CLOUD_CAPABILITIES: ProviderCapability[] = [
  'chat',
  'streaming',
  'title-generation',
  'json',
  'tools',
  'reasoning',
  'coding',
  'research',
  'vision',
];

export const DEFAULT_PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    id: 'ollama',
    name: 'Local AI (Ollama)',
    kind: 'local',
    enabled: true,
    defaultModel: 'qwen3:8b',
    capabilities: LOCAL_CAPABILITIES,
  },
  ...Object.values(PROVIDER_REGISTRY).map((reg) => ({
    id: reg.id,
    name: reg.name,
    kind: reg.kind,
    enabled: false,
    defaultModel: reg.defaultModel,
    apiKeySet: false,
    apiKey: '',
    baseUrl: reg.isCustom ? reg.baseUrl : undefined,
    isCustom: reg.isCustom,
    capabilities: reg.capabilities,
  })),
];

export function getModelAgentRoleLabel(modelName: string): string {
  const lower = modelName.toLowerCase();
  if (lower.includes('coder') || lower.includes('sol')) return `${modelName} (Coding Agent)`;
  if (lower.includes('qwen3')) return `${modelName} (General Agent)`;
  if (lower.includes('embed')) return `${modelName} (Embeddings / Memory / RAG)`;
  if (lower.includes('llama3') || lower.includes('llama-3') || lower.includes('llama 3')) {
    return `${modelName} (General Agent - Alt)`;
  }
  return modelName;
}

export function resolveModelForCapability(
  intent: ProviderRouteRequest['intent'],
  selectedModel: string,
  installedModels: string[] = []
): string {
  if (intent === 'coding' || intent === 'debugging') {
    const coderModel = installedModels.find((m) => m.toLowerCase().includes('coder'));
    if (coderModel) return coderModel;
  }

  if ((intent as string) === 'embeddings') {
    const embedModel = installedModels.find((m) => m.toLowerCase().includes('embed'));
    if (embedModel) return embedModel;
  }

  if (intent === 'data-analysis' || intent === 'mathematics' || intent === 'research') {
    const reasoningModel = installedModels.find((m) => m.toLowerCase().includes('qwen3'));
    if (reasoningModel) return reasoningModel;
  }

  return selectedModel;
}

class OllamaProvider implements AiProvider {
  config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async stream(
    model: string,
    messages: ChatMessage[],
    onChunk: (chunk: ChatStreamChunk) => void
  ): Promise<void> {
    await streamOllamaChat(model, messages, onChunk);
  }

  async generateTitle(model: string, prompt: string): Promise<string> {
    return generateOllamaTitle(model, prompt);
  }
}

class OpenAICompatibleProvider implements AiProvider {
  config: ProviderConfig;
  private endpoint: string;

  constructor(config: ProviderConfig, endpoint?: string) {
    this.config = config;
    const reg = PROVIDER_REGISTRY[config.id];
    if (endpoint) {
      this.endpoint = endpoint;
    } else if (config.baseUrl && config.baseUrl.trim().length > 0) {
      const norm = normalizeBaseUrl(config.id, config.baseUrl);
      this.endpoint = `${norm}/chat/completions`;
    } else if (reg && reg.chatEndpoint) {
      this.endpoint = reg.chatEndpoint;
    } else {
      const norm = normalizeBaseUrl(config.id);
      this.endpoint = `${norm}/chat/completions`;
    }
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(this.config.enabled && this.config.apiKey);
  }

  async stream(
    model: string,
    messages: ChatMessage[],
    onChunk: (chunk: ChatStreamChunk) => void
  ): Promise<void> {
    if (!this.config.apiKey || !this.config.apiKey.trim()) {
      onChunk({
        done: true,
        message: {
          role: 'assistant',
          content: `Cloud Request Failed (${this.config.name})\n\nProvider: ${this.config.name}\nModel: ${model || this.config.defaultModel}\n\nReason: API Key missing or not configured. Please add your key in Settings -> Cloud Providers.`,
        },
      });
      return;
    }

    // Try Tauri native streaming command first (bypasses browser CORS completely)
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      try {
        const channel = new Channel<{ done: boolean; content?: string; error?: string }>();
        channel.onmessage = (msg) => {
          if (msg.error) {
            onChunk({
              done: true,
              message: {
                role: 'assistant',
                content: `Cloud Request Failed (${this.config.name})\n\nProvider: ${this.config.name}\nModel: ${model || this.config.defaultModel}\n\nReason: ${msg.error}`,
              },
            });
            return;
          }
          if (msg.content) {
            onChunk({
              done: false,
              message: { role: 'assistant', content: msg.content },
            });
          }
          if (msg.done) {
            onChunk({ done: true });
          }
        };

        await invoke('cloud_chat_stream', {
          endpoint: this.endpoint,
          model: model || this.config.defaultModel,
          apiKey: this.config.apiKey.trim(),
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          onChunk: channel,
        });
        return;
      } catch (nativeErr) {
        console.warn('Native cloud stream failed, attempting CORS fallback:', nativeErr);
      }
    }

    // Browser Mode fallback fetch
    try {
      const response = await fetchWithCorsProxy(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: model || this.config.defaultModel,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        onChunk({
          done: true,
          message: {
            role: 'assistant',
            content: `Cloud Request Failed (${this.config.name})\n\nProvider: ${this.config.name}\nModel: ${model || this.config.defaultModel}\n\nReason: HTTP ${response.status} ${response.statusText} - ${errorText.slice(0, 150) || 'Request rejected by cloud endpoint.'}`,
          },
        });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body reader not available.');
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') {
              onChunk({ done: true });
              return;
            }
            try {
              const json = JSON.parse(dataStr);
              const deltaContent = json.choices?.[0]?.delta?.content || '';
              if (deltaContent) {
                onChunk({
                  done: false,
                  message: { role: 'assistant', content: deltaContent },
                });
              }
            } catch {
              // ignore partial chunk parse errors
            }
          }
        }
      }

      onChunk({ done: true });
    } catch (err) {
      onChunk({
        done: true,
        message: {
          role: 'assistant',
          content: `Cloud Request Failed (${this.config.name})\n\nProvider: ${this.config.name}\nModel: ${model || this.config.defaultModel}\n\nReason: ${err instanceof Error ? err.message : String(err)}`,
        },
      });
    }
  }

  async generateTitle(_model: string, prompt: string): Promise<string> {
    return prompt.trim().slice(0, 48) || 'New Chat';
  }
}

class AnthropicProvider implements AiProvider {
  config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(this.config.enabled && this.config.apiKey);
  }

  async stream(
    model: string,
    messages: ChatMessage[],
    onChunk: (chunk: ChatStreamChunk) => void
  ): Promise<void> {
    if (!this.config.apiKey) {
      onChunk({
        done: true,
        message: {
          role: 'assistant',
          content: `API key for Claude (Anthropic) is missing. Please add your key in Settings -> Cloud Providers.`,
        },
      });
      return;
    }

    try {
      const formattedMessages = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetchWithCorsProxy('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: model || this.config.defaultModel,
          messages: formattedMessages,
          max_tokens: 4096,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error (${response.status}): ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body reader not available.');

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const json = JSON.parse(dataStr);
              if (json.type === 'content_block_delta' && json.delta?.text) {
                onChunk({
                  done: false,
                  message: { role: 'assistant', content: json.delta.text },
                });
              }
            } catch {
              // ignore partial chunk json errors
            }
          }
        }
      }

      onChunk({ done: true });
    } catch (err) {
      onChunk({
        done: true,
        message: {
          role: 'assistant',
          content: `Cloud Request Failed (Anthropic)\n\nReason: ${err instanceof Error ? err.message : String(err)}`,
        },
      });
    }
  }

  async generateTitle(_model: string, prompt: string): Promise<string> {
    return prompt.trim().slice(0, 48) || 'New Chat';
  }
}

class GeminiProvider implements AiProvider {
  config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(this.config.enabled && this.config.apiKey);
  }

  async stream(
    model: string,
    messages: ChatMessage[],
    onChunk: (chunk: ChatStreamChunk) => void
  ): Promise<void> {
    if (!this.config.apiKey) {
      onChunk({
        done: true,
        message: {
          role: 'assistant',
          content: `API key for Google Gemini is missing. Please add your key in Settings -> Cloud Providers.`,
        },
      });
      return;
    }

    try {
      const selectedModelName = model || this.config.defaultModel;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModelName}:streamGenerateContent?alt=sse&key=${this.config.apiKey}`;

      const contents = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const response = await fetchWithCorsProxy(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body reader not available.');

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const json = JSON.parse(dataStr);
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                onChunk({
                  done: false,
                  message: { role: 'assistant', content: text },
                });
              }
            } catch {
              // ignore partial line parse errors
            }
          }
        }
      }

      onChunk({ done: true });
    } catch (err) {
      onChunk({
        done: true,
        message: {
          role: 'assistant',
          content: `Cloud Request Failed (Google Gemini)\n\nReason: ${err instanceof Error ? err.message : String(err)}`,
        },
      });
    }
  }

  async generateTitle(_model: string, prompt: string): Promise<string> {
    return prompt.trim().slice(0, 48) || 'New Chat';
  }
}

class PendingCloudProvider implements AiProvider {
  config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(this.config.enabled && this.config.apiKeySet);
  }

  async stream(
    _model: string,
    _messages: ChatMessage[],
    onChunk: (chunk: ChatStreamChunk) => void
  ): Promise<void> {
    const providerName = this.config.name;
    const content = [
      `Cloud Request Failed (${providerName})`,
      '',
      `Provider: ${providerName}`,
      `Reason: No valid API key entered.`,
      '',
      `Please open Settings -> Cloud Providers and enter your verified ${providerName} API key.`,
    ].join('\n');

    onChunk({
      done: true,
      message: {
        role: 'assistant',
        content,
      },
    });
  }

  async generateTitle(_model: string, prompt: string): Promise<string> {
    return prompt.trim().slice(0, 48) || 'New Chat';
  }
}

export class ProviderManager {
  private providers: AiProvider[];
  private mode: AiExecutionMode;
  private defaultProviderId: string;

  constructor(configs: ProviderConfig[], mode: AiExecutionMode, defaultProviderId: string) {
    this.mode = mode;
    this.defaultProviderId = defaultProviderId;
    const merged = mergeProviderConfigs(configs);

    this.providers = merged.map((config) => {
      if (config.id === 'ollama') {
        return new OllamaProvider(config);
      }
      if (config.apiKey && config.apiKey.trim().length > 0) {
        if (config.id === 'anthropic') {
          return new AnthropicProvider(config);
        }
        if (config.id === 'gemini') {
          return new GeminiProvider(config);
        }
        return new OpenAICompatibleProvider(config);
      }
      return new PendingCloudProvider(config);
    });
  }

  getProviderConfigs(): ProviderConfig[] {
    return this.providers.map((provider) => provider.config);
  }

  async streamChat(
    request: ProviderRouteRequest,
    selectedModel: string,
    messages: ChatMessage[],
    onChunk: (chunk: ChatStreamChunk) => void
  ): Promise<void> {
    const provider = this.selectProvider(request, selectedModel);

    // HARD RUNTIME ASSERTIONS
    if (this.mode === 'cloud') {
      if (provider.config.kind === 'local' || provider.config.id === 'ollama') {
        onChunk({
          done: true,
          message: {
            role: 'assistant',
            content: `Cloud Request Failed (Runtime Isolation Enforcement)\n\nProvider: ${provider.config.name}\nModel: ${selectedModel}\n\nReason: Cloud Mode must not invoke local Ollama provider.`,
          },
        });
        return;
      }
      const targetProviderId = getProviderIdForModel(selectedModel);
      if (targetProviderId === 'ollama') {
        onChunk({
          done: true,
          message: {
            role: 'assistant',
            content: `Cloud Request Failed (Model Isolation Enforcement)\n\nProvider: ${provider.config.name}\nModel: ${selectedModel}\n\nReason: Cloud Mode cannot execute local model "${selectedModel}". Please select a Cloud model.`,
          },
        });
        return;
      }
    }
    if (this.mode === 'local' && provider.config.kind === 'cloud') {
      onChunk({
        done: true,
        message: {
          role: 'assistant',
          content: `Local Request Failed (Runtime Isolation Enforcement)\n\nProvider: ${provider.config.name}\nModel: ${selectedModel}\n\nReason: Local Mode must not invoke cloud AI provider. Please switch to Cloud/Hybrid mode.`,
        },
      });
      return;
    }

    // 1. Model & Provider Compatibility Validation
    const validation = validateProviderModelCompatibility(provider.config.id, selectedModel);
    if (!validation.valid) {
      onChunk({
        done: true,
        message: {
          role: 'assistant',
          content: `Invalid Provider / Model Compatibility:\n\n${validation.reason}`,
        },
      });
      return;
    }

    // Respect user's selected model strictly without auto-overriding
    const targetModel =
      selectedModel && selectedModel.trim().length > 0
        ? selectedModel
        : provider.config.defaultModel || 'opencode-zen-coder';

    await provider.stream(targetModel, messages, onChunk);
  }

  async generateTitle(prompt: string, selectedModel: string): Promise<string> {
    const provider = this.selectProvider(
      { capabilities: ['title-generation'] },
      selectedModel
    );
    const targetModel =
      provider.config.id === 'ollama'
        ? selectedModel
        : provider.config.defaultModel || selectedModel;
    return provider.generateTitle(targetModel, prompt);
  }

  selectProvider(request: ProviderRouteRequest, selectedModel?: string): AiProvider {
    // 1. Execution Mode: Cloud (Strict: Never route to Ollama when mode === 'cloud')
    if (this.mode === 'cloud') {
      if (selectedModel) {
        const targetProviderId = getProviderIdForModel(selectedModel);
        if (targetProviderId && targetProviderId !== 'ollama') {
          const matched = this.providers.find((p) => p.config.id === targetProviderId);
          if (matched) return matched;
        }
      }
      // Prefer any cloud provider that has an API key configured
      const configuredCloud = this.providers.find(
        (p) => p.config.kind === 'cloud' && Boolean(p.config.apiKey && p.config.apiKey.trim().length > 0)
      );
      if (configuredCloud) return configuredCloud;

      const opencode = this.providers.find((p) => p.config.id === 'opencode');
      if (opencode) return opencode;

      const anyCloud = this.providers.find((p) => p.config.kind === 'cloud');
      if (anyCloud) return anyCloud;
    }

    // 2. Execution Mode: Local (Strict: Never route to Cloud when mode === 'local')
    if (this.mode === 'local') {
      const local = this.providers.find((p) => p.config.id === 'ollama');
      if (local) return local;
    }

    // 3. Explicit model routing for Hybrid mode
    if (selectedModel) {
      const targetProviderId = getProviderIdForModel(selectedModel);
      if (targetProviderId) {
        const matched = this.providers.find((p) => p.config.id === targetProviderId);
        if (matched) {
          return matched;
        }
      }
    }

    const providers = this.getEnabledProviders();
    const preferred = this.getPreferredProviders(request, providers);
    const capable = preferred.find((provider) => supportsAll(provider.config, request.capabilities));

    if (capable) return capable;

    return this.providers[0];
  }

  private getEnabledProviders(): AiProvider[] {
    const enabled = this.providers.filter((provider) => provider.config.enabled);
    return enabled.length > 0
      ? enabled
      : this.providers.filter((provider) => provider.config.kind === 'local');
  }

  private getPreferredProviders(
    request: ProviderRouteRequest,
    providers: AiProvider[]
  ): AiProvider[] {
    const defaultProvider = providers.find(
      (provider) => provider.config.id === this.defaultProviderId
    );

    if (this.mode === 'local') {
      return sortWithDefault(
        providers.filter((provider) => provider.config.kind === 'local'),
        defaultProvider
      );
    }

    if (this.mode === 'cloud') {
      return sortWithDefault(
        providers.filter((provider) => provider.config.kind === 'cloud'),
        defaultProvider
      );
    }

    // Hybrid Mode logic
    if (request.containsPrivateData) {
      return sortByKind(providers, 'local', defaultProvider);
    }

    if (
      request.needsCurrentInfo ||
      request.capabilities.includes('research') ||
      request.capabilities.includes('vision') ||
      request.capabilities.includes('reasoning')
    ) {
      return sortByKind(providers, 'cloud', defaultProvider);
    }

    return sortWithDefault(providers, defaultProvider);
  }
}

export function createProviderManager(
  configs: ProviderConfig[],
  mode: AiExecutionMode,
  defaultProviderId: string
): ProviderManager {
  return new ProviderManager(configs, mode, defaultProviderId);
}

export function getCapabilitiesForIntent(intent: ProviderRouteRequest['intent']): ProviderCapability[] {
  switch (intent) {
    case 'coding':
    case 'debugging':
      return ['chat', 'streaming', 'coding'];
    case 'research':
      return ['chat', 'streaming', 'research'];
    case 'data-analysis':
    case 'mathematics':
      return ['chat', 'streaming', 'reasoning'];
    default:
      return ['chat', 'streaming'];
  }
}

export function mergeProviderConfigs(configs: ProviderConfig[]): ProviderConfig[] {
  const incoming = new Map(configs.map((config) => [config.id, config]));
  return DEFAULT_PROVIDER_CONFIGS.map((defaultConfig) => {
    const inc = incoming.get(defaultConfig.id);
    const apiKey = inc?.apiKey ?? defaultConfig.apiKey ?? '';
    return {
      ...defaultConfig,
      ...inc,
      enabled: inc?.enabled ?? defaultConfig.enabled,
      apiKey,
      apiKeySet: Boolean(apiKey && apiKey.trim().length > 0),
      capabilities: inc?.capabilities ?? defaultConfig.capabilities,
    };
  });
}

function supportsAll(config: ProviderConfig, capabilities: ProviderCapability[]): boolean {
  return capabilities.every((capability) => config.capabilities.includes(capability));
}

function sortByKind(
  providers: AiProvider[],
  preferredKind: ProviderConfig['kind'],
  defaultProvider?: AiProvider
): AiProvider[] {
  return sortWithDefault(
    [...providers].sort((a, b) => {
      if (a.config.kind === preferredKind && b.config.kind !== preferredKind) return -1;
      if (a.config.kind !== preferredKind && b.config.kind === preferredKind) return 1;
      return 0;
    }),
    defaultProvider
  );
}

export function getProviderIdForModel(modelName: string): string | null {
  if (!modelName) return null;
  const lower = modelName.toLowerCase();
  if (lower.includes('opencode') || lower.includes('zen-coder') || lower.includes('sol') || lower.includes('terra') || lower.includes('luna')) return 'opencode';
  if (lower.includes('gpt-4') || lower.includes('gpt-3') || lower.includes('openai') || lower.includes('o1-') || lower.includes('o3-')) return 'openai';
  if (lower.includes('claude') || lower.includes('anthropic')) return 'anthropic';
  if (lower.includes('gemini') || lower.includes('google')) return 'gemini';
  if (lower.includes('groq')) return 'groq';
  if (lower.includes('openrouter')) return 'openrouter';
  if (lower.includes('qwen') || lower.includes('llama') || lower.includes('mistral') || lower.includes('phi')) return 'ollama';
  return null;
}

function sortWithDefault(providers: AiProvider[], defaultProvider?: AiProvider): AiProvider[] {
  if (!defaultProvider) return providers;
  return [
    defaultProvider,
    ...providers.filter((provider) => provider.config.id !== defaultProvider.config.id),
  ];
}

export function normalizeBaseUrl(providerId: string, customBaseUrl?: string): string {
  if (customBaseUrl && customBaseUrl.trim().length > 0) {
    let url = customBaseUrl.trim().replace(/\/+$/, '');
    if (!url.endsWith('/v1') && !url.includes('/v1/')) {
      url = `${url}/v1`;
    }
    return url;
  }

  const reg = PROVIDER_REGISTRY[providerId];
  if (reg && reg.baseUrl) {
    return reg.baseUrl.replace(/\/+$/, '');
  }

  if (providerId === 'openrouter') return 'https://openrouter.ai/api/v1';
  if (providerId === 'groq') return 'https://api.groq.com/openai/v1';
  return 'https://api.openai.com/v1';
}

export async function verifyProviderConnection(
  providerId: string,
  apiKey: string,
  baseUrl?: string
): Promise<{ ok: boolean; message: string; modelCount?: number }> {
  if (!apiKey || !apiKey.trim()) {
    return { ok: false, message: 'API key cannot be empty.' };
  }

  const normBaseUrl = normalizeBaseUrl(providerId, baseUrl);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey.trim()}`,
    'Content-Type': 'application/json',
  };

  try {
    const targetUrl = `${normBaseUrl}/models`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const resp = await fetchWithCorsProxy(targetUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (resp.ok) {
      const data = await resp.json();
      const count = Array.isArray(data.data) ? data.data.length : 1;
      return { ok: true, message: `Connected! ${count} models verified.`, modelCount: count };
    }

    if (resp.status === 401) {
      return { ok: false, message: 'HTTP 401 Unauthorized: Invalid API Key.' };
    }
    if (resp.status === 404) {
      return { ok: false, message: `HTTP 404 Not Found: Base URL endpoint (${normBaseUrl}) invalid.` };
    }

    return { ok: false, message: `HTTP ${resp.status} ${resp.statusText}: Key verification failed.` };
  } catch (err) {
    return { ok: false, message: `Connection error: ${err instanceof Error ? err.message : String(err)}` };
  }
}
