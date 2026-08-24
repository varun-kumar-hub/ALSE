import { SourceItem } from '../services/types';

export interface ExecutionTimestampStep {
  time: string;
  step: string;
  details?: string;
  completed: boolean;
}

export interface RuntimeMetadata {
  model: string;
  provider: string;
  mode: 'local' | 'cloud' | 'hybrid';
  agent: string;
  generationTimeMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  speedTokPerSec?: number;
  timestamps: ExecutionTimestampStep[];
  toolsUsed: string[];
  sourcesUsed: SourceItem[];
}

/**
 * Normalizes provider IDs to human-readable names
 */
export function normalizeProviderName(providerId?: string, mode: 'local' | 'cloud' | 'hybrid' = 'local'): string {
  if (mode === 'local' || providerId === 'ollama') return 'Ollama';
  if (!providerId) return mode === 'cloud' ? 'Cloud Provider' : 'Ollama';

  const map: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    gemini: 'Google Gemini',
    groq: 'Groq Cloud',
    openrouter: 'OpenRouter',
    opencode: 'OpenCode Cloud (Zen)',
    'opencode-go': 'OpenCode Go',
    mistral: 'Mistral AI',
    together: 'Together AI',
    fireworks: 'Fireworks AI',
    deepinfra: 'DeepInfra',
    custom: 'Custom API',
  };

  return map[providerId] || providerId;
}

/**
 * Estimate token count using word/character heuristic (1 token ~ 3.8 characters)
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 3.8));
}

/**
 * Format current timestamp (e.g. 18:42:31)
 */
export function formatCurrentTime(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Finalize runtime metadata after stream completion
 */
export function buildExecutionRuntimeMetadata(
  model: string,
  providerId: string,
  mode: 'local' | 'cloud' | 'hybrid',
  intentCategory: string,
  promptText: string,
  responseText: string,
  startTimeMs: number,
  actualSources: (SourceItem | string)[] = [],
  toolsExecuted: string[] = []
): RuntimeMetadata {
  const durationMs = Math.max(100, Date.now() - startTimeMs);
  const durationSec = durationMs / 1000;

  const inputTokens = estimateTokenCount(promptText);
  const outputTokens = estimateTokenCount(responseText);
  const totalTokens = inputTokens + outputTokens;
  const rawSpeed = Math.round(outputTokens / durationSec);

  const providerName = normalizeProviderName(providerId, mode);

  // Derive agent name from intent
  const agentMap: Record<string, string> = {
    coding: 'Coder Agent',
    debugging: 'Coder Agent',
    research: 'Research Agent',
    biography: 'Research Agent',
    planning: 'Planner Agent',
    image: 'Vision Agent',
    memory: 'Memory Agent',
  };
  const agent = agentMap[intentCategory] || 'General Assistant';

  const now = formatCurrentTime();
  const timestamps: ExecutionTimestampStep[] = [
    { time: now, step: 'Query Received', completed: true },
    { time: now, step: `Intent Engine: ${intentCategory}`, completed: true },
    { time: now, step: `Agent Selected: ${agent}`, completed: true },
    { time: now, step: `Model Routing: ${model} (${providerName})`, completed: true },
    { time: now, step: 'LLM Content Generation', completed: true },
    { time: now, step: 'Response Rendered', completed: true },
  ];

  // Convert raw strings to SourceItem objects for backwards compatibility
  const normalizedSources: SourceItem[] = actualSources.map((src) => {
    if (typeof src === 'string') {
      return {
        title: src,
        domain: src.toLowerCase().includes('wiki') ? 'wikipedia.org' : 'local',
        type: src.toLowerCase().includes('wiki') ? 'wiki' : 'local',
      };
    }
    return src;
  });

  return {
    model,
    provider: providerName,
    mode,
    agent,
    generationTimeMs: durationMs,
    inputTokens,
    outputTokens,
    totalTokens,
    speedTokPerSec: rawSpeed || 45,
    timestamps,
    toolsUsed: toolsExecuted,
    sourcesUsed: normalizedSources,
  };
}
