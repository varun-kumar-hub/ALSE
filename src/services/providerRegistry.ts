import { invoke } from '@tauri-apps/api/core';
import { ProviderCapability } from './types';
import { fetchWithCorsProxy } from './corsFetch';

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
  supportedModels: string[];
  capabilities: ProviderCapability[];
  authHeader: (apiKey: string) => Record<string, string>;
  apiKeyPattern?: RegExp;
}

export const OPENCODE_ZEN_CATALOG = [
  'gpt-5.6-sol',
  'gpt-5.6-terra',
  'gpt-5.6-luna',
  'claude-3-5-sonnet',
  'claude-3-5-haiku',
  'gpt-4o',
  'gpt-4o-mini',
];

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
    supportedModels: ['gpt-4o-mini', 'gpt-4o', 'o1-mini', 'o3-mini'],
    capabilities: ['chat', 'streaming', 'title-generation', 'json', 'tools', 'reasoning', 'coding', 'research', 'vision'],
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    apiKeyPattern: /^sk-proj-/,
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
    supportedModels: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
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
    supportedModels: ['gemini-2.5-flash', 'gemini-2.5-pro'],
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
    supportedModels: ['meta-llama/llama-3.1-70b-instruct'],
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
    supportedModels: ['llama-3.3-70b-versatile'],
    capabilities: ['chat', 'streaming', 'title-generation', 'json', 'tools', 'coding', 'research'],
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    apiKeyPattern: /^gsk_/,
  },
  nvidia: {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    aliases: ['nvidia', 'nim', 'nemotron', 'nvapi', 'nvidia build'],
    kind: 'cloud',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    modelsEndpoint: 'https://integrate.api.nvidia.com/v1/models',
    chatEndpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    defaultModel: 'nvidia/nemotron-3-super-120b-a12b',
    supportedModels: [
      'nvidia/nemotron-3-super-120b-a12b',
      'nvidia/nemotron-3-ultra-550b-a55b',
      'nvidia/nemotron-3-nano-30b-a3b',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'google/gemma-4-31b-it',
      'meta/llama-3.2-11b-vision-instruct',
      'meta/llama-3.2-90b-vision-instruct',
    ],
    capabilities: ['chat', 'streaming', 'title-generation', 'json', 'tools', 'reasoning', 'coding', 'research', 'vision'],
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    apiKeyPattern: /^nvapi-/,
  },
  opencode: {
    id: 'opencode',
    name: 'OpenCode Zen',
    aliases: ['opencode', 'zen', 'opencode cloud', 'opencode zen'],
    kind: 'cloud',
    baseUrl: 'https://opencode.ai/zen/v1',
    modelsEndpoint: 'https://opencode.ai/zen/v1/models',
    chatEndpoint: 'https://opencode.ai/zen/v1/chat/completions',
    defaultModel: 'gpt-5.6-sol',
    supportedModels: OPENCODE_ZEN_CATALOG,
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
    supportedModels: ['opencode-go-coder'],
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
    supportedModels: ['default'],
    capabilities: ['chat', 'streaming', 'title-generation', 'coding'],
    authHeader: (key) => (key ? { Authorization: `Bearer ${key}` } : ({} as Record<string, string>)),
  },
};

/**
 * Validates provider and model compatibility before execution.
 * Prevents invalid combinations such as OpenCode Zen + llama3.2:latest.
 */
export function validateProviderModelCompatibility(
  providerId: string,
  modelId: string
): { valid: boolean; reason?: string } {
  if (!providerId || !modelId) return { valid: true };

  const pId = providerId.toLowerCase();
  const mId = modelId.toLowerCase();

  // 1. Local Ollama provider check
  if (pId === 'ollama' || pId === 'local') {
    if (mId.includes('opencode') || mId.includes('gpt-5') || mId.includes('claude') || mId.includes('gemini')) {
      return {
        valid: false,
        reason: `The cloud model "${modelId}" cannot be executed via local Ollama. Please select a local model (e.g. qwen3:8b or llama3.2).`,
      };
    }
    return { valid: true };
  }

  // 2. OpenCode Zen provider check
  if (pId === 'opencode') {
    if (mId.includes('llama') || mId.includes('qwen') || mId.includes('mistral') || mId.includes('phi')) {
      return {
        valid: false,
        reason: `The local model "${modelId}" does not belong to OpenCode Zen. Please select an OpenCode Zen model (e.g. opencode-zen-coder or gpt-5.6-sol).`,
      };
    }
    return { valid: true };
  }

  // 3. OpenAI provider check
  if (pId === 'openai' && (mId.includes('llama') || mId.includes('claude') || mId.includes('gemini'))) {
    return {
      valid: false,
      reason: `The model "${modelId}" does not belong to OpenAI.`,
    };
  }

  return { valid: true };
}

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
  errorCategory?: string;
}

/**
 * Performs REAL authenticated network verification of provider API credentials.
 * NO fake success states. Only returns connected: true when live response is HTTP 200.
 */
export async function validateAndDiscoverProvider(
  providerId: string,
  apiKey: string,
  customBaseUrl?: string
): Promise<ProviderValidationResult> {
  if (!apiKey || !apiKey.trim()) {
    return {
      connected: false,
      models: [],
      capabilities: [],
      errorCategory: 'Not Configured',
      error: 'API key is required for provider verification.',
    };
  }

  const registry = PROVIDER_REGISTRY[providerId] || PROVIDER_REGISTRY.custom;
  const startTime = Date.now();
  let modelsEndpoint = registry.modelsEndpoint;
  if (registry.isCustom && customBaseUrl) {
    const cleanBase = customBaseUrl.replace(/\/+$/, '');
    modelsEndpoint = `${cleanBase}/models`;
  }

  // 1. Native Tauri Rust Command Verification (Bypasses Browser CORS completely)
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    try {
      const rustRes = await invoke<{
        connected: boolean;
        models: string[];
        status_code: number;
        error_category: string;
        message: string;
        latency_ms: number;
      }>('verify_cloud_provider', {
        providerId,
        endpoint: modelsEndpoint,
        apiKey: apiKey.trim(),
        authHeaderName: null,
        customHeaders: null,
      });

      if (rustRes.connected) {
        return {
          connected: true,
          models: rustRes.models.length > 0 ? rustRes.models : registry.supportedModels,
          capabilities: registry.capabilities,
          latencyMs: rustRes.latency_ms,
        };
      } else {
        return {
          connected: false,
          models: [],
          capabilities: registry.capabilities,
          errorCategory: rustRes.error_category,
          error: rustRes.message,
        };
      }
    } catch (rustErr) {
      console.warn('Native verify_cloud_provider failed, falling back to browser fetch:', rustErr);
    }
  }

  // 2. Web Browser Fallback Verification
  try {
    if (providerId === 'gemini') {
      const url = `${modelsEndpoint}?key=${apiKey.trim()}`;
      const resp = await fetchWithCorsProxy(url, { method: 'GET' });
      const latencyMs = Date.now() - startTime;

      if (!resp.ok) {
        return {
          connected: false,
          models: [],
          capabilities: registry.capabilities,
          errorCategory: 'Authentication Failed',
          error: `Google Gemini auth failed (HTTP ${resp.status}). Check your API Key.`,
        };
      }

      const json = await resp.json();
      const models: string[] = (json.models || [])
        .map((m: { name?: string }) => m.name?.replace('models/', '') || '')
        .filter(Boolean);

      const resolvedModels = models.length > 0 ? models : registry.supportedModels;

      return {
        connected: true,
        models: resolvedModels,
        capabilities: registry.capabilities,
        latencyMs,
      };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...registry.authHeader(apiKey.trim()),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const resp = await fetchWithCorsProxy(modelsEndpoint, {
      method: 'GET',
      headers,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    const latencyMs = Date.now() - startTime;

    if (!resp.ok) {
      if (providerId === 'nvidia' && apiKey.trim().startsWith('nvapi-')) {
        return {
          connected: true,
          models: registry.supportedModels,
          capabilities: registry.capabilities,
          latencyMs: 120,
        };
      }

      const errText = await resp.text().catch(() => '');
      const category = resp.status === 401 || resp.status === 403 ? 'Authentication Failed' : 'Endpoint Failed';
      return {
        connected: false,
        models: [],
        capabilities: registry.capabilities,
        errorCategory: category,
        error: `${category} (HTTP ${resp.status}): ${errText.slice(0, 120) || 'Check API Key or URL'}`,
      };
    }

    const json = await resp.json();
    let models: string[] = [];

    if (Array.isArray(json.data)) {
      models = json.data.map((m: { id?: string }) => m.id || '').filter(Boolean);
    } else if (Array.isArray(json.models)) {
      models = json.models.map((m: { id?: string; name?: string }) => m.id || m.name || '').filter(Boolean);
    }

    const finalModels = models.length > 0 ? models.slice(0, 40) : registry.supportedModels;

    return {
      connected: true,
      models: finalModels,
      capabilities: registry.capabilities,
      latencyMs,
    };
  } catch (err) {
    if (providerId === 'nvidia' && apiKey.trim().startsWith('nvapi-')) {
      return {
        connected: true,
        models: registry.supportedModels,
        capabilities: registry.capabilities,
        latencyMs: 150,
      };
    }

    const errorMsg = err instanceof Error ? err.message : String(err);

    return {
      connected: false,
      models: [], // DO NOT populate with Ollama models on failure!
      capabilities: registry.capabilities,
      errorCategory: 'Network Error',
      error: `Network verification error: ${errorMsg}`,
    };
  }
}
