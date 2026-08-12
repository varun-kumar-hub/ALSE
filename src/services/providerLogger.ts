export interface ProviderLogEntry {
  id: string;
  timestamp: string;
  providerId: string;
  providerName: string;
  model: string;
  endpoint: string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  success: boolean;
  statusCode?: number;
  error?: string;
}

const LOG_STORAGE_KEY = 'nexus_agent_provider_logs_v1';
const MAX_LOG_ENTRIES = 200;

export function getProviderLogs(): ProviderLogEntry[] {
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function logProviderRequest(entry: Omit<ProviderLogEntry, 'id' | 'timestamp'>): ProviderLogEntry {
  const fullEntry: ProviderLogEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };

  try {
    const logs = getProviderLogs();
    logs.unshift(fullEntry);
    if (logs.length > MAX_LOG_ENTRIES) {
      logs.length = MAX_LOG_ENTRIES;
    }
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.warn('Failed to store provider log entry:', err);
  }

  return fullEntry;
}

export function clearProviderLogs(): void {
  try {
    localStorage.removeItem(LOG_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear provider logs:', err);
  }
}
