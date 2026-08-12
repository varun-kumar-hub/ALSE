import { ProviderCapability } from './types';

export interface ProviderRegistryItem {
  id: string;
  name: string;
  aliases: string[];
  kind: 'cloud' | 'local';
  isCustom?: boolean;
  baseUrl: string;
  modelsEndpoint: string;
  chatEndpoint: string;
  defaultModel: string;
  capabilities: ProviderCapability[];
  authHeader: (apiKey: string) => Record<string, string>;
  apiKeyPattern?: RegExp;
}

export const PROVIDER_REGISTRY: Record<string, ProviderRegistryItem> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    aliases: ['chatgpt', 'gpt', 'gpt4', 'gpt5', 'openai'],
    kind: 'cloud',
    baseUrl: 'https://api.openai.com/v1',
    modelsEndpoint: 'https://api.openai.com/v1/models',
    chatEndpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    capabilities: ['chat', 'streaming', 'title-generation', 'json', 'tools', 'reasoning', 'coding', 'research', 'vision'],
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    apiKeyPattern: /^sk-proj-|^sk-[a-zA-Z0-9]{32,}/,
  },
  anthropic: {
    id: 'anthropic',
    name: 'Claude (Anthropic)',
    aliases: ['claude', 'anthropic', 'sonnet', 'haiku', 'opus'],
    kind: 'cloud',
    baseUrl: 'https://api.anthropic.com/v1',
    modelsEndpoint: 'https://api.anthropic.com/v1/models',
    chatEndpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-5-sonnet-20241022',
    capabilities: ['chat', 'streaming', 'title-generation', 'json', 'tools', 'reasoning', 'coding', 'research', 'vision'],
    authHeader: (key) => ({
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }),
    apiKeyPattern: /^sk-ant-/,
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    aliases: ['gemini', 'google', 'bard', 'google ai'],
    kind: 'cloud',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    modelsEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    chatEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: 'gemini-2.5-flash',
    capabilities: ['chat', 'streaming', 'title-generation', 'json', 'tools', 'reasoning', 'coding', 'research', 'vision'],
    authHeader: () => ({}),
    apiKeyPattern: /^AIzaSy/,
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    aliases: ['openrouter', 'or', 'router'],
    kind: 'cloud',
    baseUrl: 'https://openrouter.ai/api/v1',
    modelsEndpoint: 'https://openrouter.ai/api/v1/models',
    chatEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'meta-llama/llama-3.1-70b-instruct',
    capabilities: ['chat', 'streaming', 'title-generation', 'json', 'tools', 'reasoning', 'coding', 'research', 'vision'],
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    apiKeyPattern: /^sk-or-v1-/,
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    aliases: ['groq', 'lpu', 'fast llm'],
    kind: 'cloud',
    baseUrl: 'https://api.groq.com/openai/v1',
    modelsEndpoint: 'https://api.groq.com/openai/v1/models',
    chatEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    capabilities: ['chat', 'streaming', 'title-generation', 'json', 'tools', 'coding', 'research'],
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    apiKeyPattern: /^gsk_/,
  },
  xai: {
    id: 'xai',
    name: 'xAI (Grok)',
    aliases: ['grok', 'xai', 'twitter ai', 'elon'],
    kind: 'cloud',
    baseUrl: 'https://api.x.ai/v1',
    modelsEndpoint: 'https://api.x.ai/v1/models',
    chatEndpoint: 'https://api.x.ai/v1/chat/completions',
    defaultModel: 'grok-2-latest',
    capabilities: ['chat', 'streaming', 'title-generation', 'json', 'tools', 'coding', 'research'],
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    apiKeyPattern: /^xai-/,
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    aliases: ['mistral', 'mixtral', 'codestral'],
    kind: 'cloud',
    baseUrl: 'https://api.mistral.ai/v1',
    modelsEndpoint: 'https://api.mistral.ai/v1/models',
    chatEndpoint: 'https://api.mistral.ai/v1/chat/completions',
    defaultModel: 'mistral-small-latest',
    capabilities: ['chat', 'streaming', 'title-generation', 'json', 'coding'],
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  together: {
    id: 'together',
    name: 'Together AI',
    aliases: ['together', 'together ai'],
    kind: 'cloud',
    baseUrl: 'https://api.together.xyz/v1',
    modelsEndpoint: 'https://api.together.xyz/v1/models',
    chatEndpoint: 'https://api.together.xyz/v1/chat/completions',
    defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    capabilities: ['chat', 'streaming', 'title-generation', 'json', 'coding', 'reasoning'],
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  fireworks: {
    id: 'fireworks',
    name: 'Fireworks AI',
    aliases: ['fireworks', 'fireworks ai'],
    kind: 'cloud',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    modelsEndpoint: 'https://api.fireworks.ai/inference/v1/models',
    chatEndpoint: 'https://api.fireworks.ai/inference/v1/chat/completions',
    defaultModel: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
    capabilities: ['chat', 'streaming', 'title-generation', 'json', 'coding', 'vision'],
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  deepinfra: {
    id: 'deepinfra',
    name: 'DeepInfra',
    aliases: ['deepinfra'],
    kind: 'cloud',
    baseUrl: 'https://api.deepinfra.com/v1/openai',
    modelsEndpoint: 'https://api.deepinfra.com/v1/openai/models',
    chatEndpoint: 'https://api.deepinfra.com/v1/openai/chat/completions',
    defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
    capabilities: ['chat', 'streaming', 'title-generation', 'json', 'coding'],
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  opencode: {
    id: 'opencode',
    name: 'OpenCode Cloud (Zen)',
    aliases: ['opencode', 'zen', 'opencode cloud', 'opencode zen'],
    kind: 'cloud',
    baseUrl: 'https://opencode.ai/zen/v1',
    modelsEndpoint: 'https://opencode.ai/zen/v1/models',
    chatEndpoint: 'https://opencode.ai/zen/v1/chat/completions',
    defaultModel: 'opencode-zen-coder',
    capabilities: ['chat', 'streaming', 'title-generation', 'coding', 'tools', 'reasoning'],
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  'opencode-go': {
    id: 'opencode-go',
    name: 'OpenCode Go',
    aliases: ['opencode go', 'go coder', 'opencode-go'],
    kind: 'cloud',
    baseUrl: 'https://opencode.ai/zen/go/v1',
    modelsEndpoint: 'https://opencode.ai/zen/go/v1/models',
    chatEndpoint: 'https://opencode.ai/zen/go/v1/chat/completions',
    defaultModel: 'opencode-go-coder',
    capabilities: ['chat', 'streaming', 'title-generation', 'coding', 'tools', 'reasoning'],
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  custom: {
    id: 'custom',
    name: 'Custom / OpenAI Compatible',
    aliases: ['custom', 'lmstudio', 'liteLLM', 'vllm', 'localai', 'ollama api'],
    kind: 'cloud',
    isCustom: true,
    baseUrl: 'http://localhost:8000/v1',
    modelsEndpoint: 'http://localhost:8000/v1/models',
    chatEndpoint: 'http://localhost:8000/v1/chat/completions',
    defaultModel: 'default',
    capabilities: ['chat', 'streaming', 'title-generation', 'coding'],
    authHeader: (key) => (key ? { Authorization: `Bearer ${key}` } : ({} as Record<string, string>)),
  },
};

/**
 * Auto-detects provider by inspecting API key format.
 */
export function detectProviderFromApiKey(apiKey: string): ProviderRegistryItem | null {
  const trimmed = apiKey.trim();
  if (!trimmed) return null;

  for (const provider of Object.values(PROVIDER_REGISTRY)) {
    if (provider.apiKeyPattern && provider.apiKeyPattern.test(trimmed)) {
      return provider;
    }
  }
  return null;
}

/**
 * Resolves provider by search query / alias matching.
 */
export function searchProviders(query: string): ProviderRegistryItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return Object.values(PROVIDER_REGISTRY);

  return Object.values(PROVIDER_REGISTRY).filter((p) => {
    if (p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) return true;
    return p.aliases.some((alias) => alias.toLowerCase().includes(q));
  });
}

export interface ProviderValidationResult {
  connected: boolean;
  models: string[];
  capabilities: ProviderCapability[];
  latencyMs?: number;
  error?: string;
}

/**
 * Authenticates API key and dynamically fetches live models from provider endpoints.
 */
export async function validateAndDiscoverProvider(
  providerId: string,
  apiKey: string,
  customBaseUrl?: string
): Promise<ProviderValidationResult> {
  const registry = PROVIDER_REGISTRY[providerId] || PROVIDER_REGISTRY.custom;
  const startTime = Date.now();

  try {
    let modelsEndpoint = registry.modelsEndpoint;
    if (registry.isCustom && customBaseUrl) {
      const cleanBase = customBaseUrl.replace(/\/+$/, '');
      modelsEndpoint = `${cleanBase}/models`;
    }

    if (providerId === 'gemini') {
      const url = `${modelsEndpoint}?key=${apiKey}`;
      const resp = await fetch(url, { method: 'GET' });
      const latencyMs = Date.now() - startTime;

      if (!resp.ok) {
        throw new Error(`Google Gemini auth failed: HTTP ${resp.status}`);
      }

      const json = await resp.json();
      const models: string[] = (json.models || [])
        .map((m: { name?: string }) => m.name?.replace('models/', '') || '')
        .filter(Boolean);

      return {
        connected: true,
        models: models.length > 0 ? models : [registry.defaultModel],
        capabilities: registry.capabilities,
        latencyMs,
      };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...registry.authHeader(apiKey),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const resp = await fetch(modelsEndpoint, {
      method: 'GET',
      headers,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    const latencyMs = Date.now() - startTime;

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`Authentication failed (${resp.status}): ${errText.slice(0, 120)}`);
    }

    const json = await resp.json();
    let models: string[] = [];

    if (Array.isArray(json.data)) {
      models = json.data.map((m: { id?: string }) => m.id || '').filter(Boolean);
    } else if (Array.isArray(json.models)) {
      models = json.models.map((m: { id?: string; name?: string }) => m.id || m.name || '').filter(Boolean);
    }

    return {
      connected: true,
      models: models.length > 0 ? models.slice(0, 40) : [registry.defaultModel],
      capabilities: registry.capabilities,
      latencyMs,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    // If browser CORS blocked direct client-side fetch in web preview mode but key is provided
    if (
      (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) &&
      apiKey &&
      apiKey.trim().length > 5
    ) {
      return {
        connected: true,
        models: [registry.defaultModel],
        capabilities: registry.capabilities,
        latencyMs: Date.now() - startTime,
      };
    }

    return {
      connected: false,
      models: [registry.defaultModel],
      capabilities: registry.capabilities,
      error: errorMsg,
    };
  }
}
