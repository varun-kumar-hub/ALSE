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

export interface ChatMessage {
  id?: string;
  chat_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
  tokens_used?: number;
  generation_time_ms?: number;
  intent?: QueryIntent;
}

export interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  pinned: boolean;
  model?: string;
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
  workspaceLocation: string;
  responseStyle: 'adaptive' | 'detailed' | 'concise';
  autoStartOllama: boolean;
  keepOllamaRunning: boolean;
  onboardingComplete: boolean;
}

export type QueryIntent = 'general' | 'research' | 'comparison' | 'coding' | 'planning';

export interface FormattedSection {
  title: string;
  type: string;
  content: string;
}
