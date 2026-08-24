export interface OllamaModel {
  name: string;
  size?: number;
  digest?: string;
  modified_at?: string;
  details?: {
    format?: string;
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface SourceContribution {
  name: string;
  percentage: number;
}

export interface SourceItem {
  id?: string;
  title: string;
  url?: string;
  domain?: string;
  type?: 'web' | 'wiki' | 'rfc' | 'doc' | 'pdf' | 'local' | 'paper';
  snippet?: string;
  favicon?: string;
  timestamp?: string;
  relevance?: number;
}

export interface ChatMessage {
  id?: string;
  chat_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
  tokens_used?: number;
  input_tokens?: number;
  output_tokens?: number;
  context_tokens?: number;
  embedding_tokens?: number;
  generation_time_ms?: number;
  first_token_ms?: number;
  speed_tps?: number;
  intent?: QueryIntent;
  confidence_score?: number;
  confidence_reason?: string;
  sources_breakdown?: SourceContribution[];
  execution_graph?: string[];
  cost_estimate?: string;
  provider_used?: string;
  model_used?: string;
  timestamp_iso?: string;
  timezone?: string;
  sources_used?: (SourceItem | string)[];
  tools_used?: string[];
  thinking?: string;
  user_prompt?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  instructions?: string;
  created_at: string;
  updated_at: string;
  is_archived?: boolean;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  name: string;
  size: number;
  type: string;
  path?: string;
  uploaded_at: string;
}

export interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  pinned: boolean;
  model?: string;
  project_id?: string;
  context_summary?: string;
}

export interface ChatStreamChunk {
  model?: string;
  message?: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface PullProgressChunk {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export interface StartupResult {
  installed: boolean;
  running: boolean;
  started_by_us: boolean;
  error?: string;
}

export interface StartupCheckResult {
  step: string;
  status: 'pending' | 'running' | 'success' | 'warning' | 'error';
  message: string;
}

export interface SystemInfo {
  os: string;
  arch: string;
  hostname: string;
}

export interface AppSettings {
  assistantName: string;
  theme: 'dark' | 'light' | 'system';
  defaultModel: string;
  aiMode: AiExecutionMode;
  defaultProvider: string;
  providerConfigs: ProviderConfig[];
  workspaceLocation: string;
  responseStyle: 'adaptive' | 'detailed' | 'concise';
  autoStartOllama: boolean;
  keepOllamaRunning: boolean;
  onboardingComplete: boolean;
  skipLauncherInDev: boolean;
}

export type QueryIntent =
  | 'general'
  | 'biography'
  | 'definition'
  | 'explanation'
  | 'coding'
  | 'debugging'
  | 'research'
  | 'summarization'
  | 'translation'
  | 'mathematics'
  | 'creative-writing'
  | 'email-document'
  | 'data-analysis'
  | 'file-analysis'
  | 'planning'
  | 'comparison'
  | 'brainstorming'
  | 'study-notes'
  | 'medical'
  | 'legal'
  | 'image-analysis'
  | 'documentation';

export interface FormattedSection {
  title: string;
  type: string;
  content: string;
}

export type TimelineStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export type TimelinePhase = 'analyze' | 'gather' | 'plan' | 'generate' | 'validate' | 'format';

export interface ThinkingTimelineStep {
  id: string;
  title: string;
  detail?: string;
  phase: TimelinePhase;
  status: TimelineStepStatus;
  timestamp?: string;
}

export type AiExecutionMode = 'local' | 'cloud' | 'hybrid';

export type ProviderCapability =
  | 'chat'
  | 'streaming'
  | 'embeddings'
  | 'vision'
  | 'speech-to-text'
  | 'text-to-speech'
  | 'title-generation'
  | 'json'
  | 'tools'
  | 'reasoning'
  | 'coding'
  | 'research';

export interface ProviderConfig {
  id: string;
  name: string;
  kind: 'local' | 'cloud';
  enabled: boolean;
  defaultModel: string;
  apiKeySet?: boolean;
  apiKey?: string;
  baseUrl?: string;
  discoveredModels?: string[];
  isCustom?: boolean;
  capabilities: ProviderCapability[];
}

export interface ProviderRouteRequest {
  intent?: QueryIntent;
  capabilities: ProviderCapability[];
  containsPrivateData?: boolean;
  needsCurrentInfo?: boolean;
}

export interface NormalizedProviderResponse {
  content: string;
  reasoning?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    estimatedCostUsd?: number;
  };
  finishReason?: string;
  toolCalls?: unknown[];
  images?: string[];
  metadata?: Record<string, unknown>;
}
