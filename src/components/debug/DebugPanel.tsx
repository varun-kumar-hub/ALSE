import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Activity,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Cpu,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { getProviderLogs, clearProviderLogs, ProviderLogEntry } from '../../services/providerLogger';
import { PROVIDER_REGISTRY } from '../../services/providerRegistry';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onClose }) => {
  const { aiMode, selectedModel, providerConfigs, defaultProvider } = useAppStore();
  const [logs, setLogs] = useState<ProviderLogEntry[]>([]);

  useEffect(() => {
    if (isOpen) {
      setLogs(getProviderLogs());
    }
  }, [isOpen]);

  const handleRefresh = () => {
    setLogs(getProviderLogs());
  };

  const handleClear = () => {
    clearProviderLogs();
    setLogs([]);
  };

  if (!isOpen) return null;

  const activeConfig =
    providerConfigs.find((p) => (p.apiKeySet || Boolean(p.apiKey && p.apiKey.trim().length > 0)) && p.enabled) ||
    providerConfigs.find((p) => p.id === defaultProvider) ||
    providerConfigs[0];

  const regInfo = PROVIDER_REGISTRY[activeConfig?.id || 'ollama'];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-zinc-950 text-zinc-100 border-l border-zinc-800 shadow-2xl flex flex-col select-none text-xs font-mono animate-in slide-in-from-right duration-200">
      {/* Panel Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-sm text-zinc-100">AI OS Developer Debug Panel</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
            v1.0
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Refresh Logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
            title="Clear Logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Close Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active System Architecture & Route Info */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/40 space-y-3">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
          Current Execution Environment
        </span>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
            <span className="text-[9px] text-zinc-500 block uppercase">Execution Mode</span>
            <span className="font-bold text-blue-400 uppercase flex items-center gap-1">
              <Globe className="w-3 h-3" /> {aiMode} Mode
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
            <span className="text-[9px] text-zinc-500 block uppercase">Active Provider</span>
            <span className="font-bold text-emerald-400 truncate block">
              {activeConfig?.name || 'Local Ollama'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
            <span className="text-[9px] text-zinc-500 block uppercase">Active Model Target</span>
            <span className="font-bold text-amber-400 truncate flex items-center gap-1">
              <Cpu className="w-3 h-3" /> {selectedModel || activeConfig?.defaultModel || 'qwen3:8b'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
            <span className="text-[9px] text-zinc-500 block uppercase">Target Endpoint</span>
            <span className="font-bold text-purple-400 truncate block text-[10px]">
              {regInfo?.chatEndpoint || 'http://localhost:11434/api/chat'}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Inference Request Logs */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="flex items-center justify-between pb-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-400" /> Recent Request Logs ({logs.length})
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-zinc-600 space-y-2">
            <Terminal className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs">No inference requests logged yet.</p>
            <p className="text-[10px] text-zinc-700">
              Send a message in the chat to view live request routes and latency logs.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`p-3 rounded-xl border space-y-1.5 transition-all ${
                  log.success
                    ? 'bg-zinc-900/90 border-zinc-800 hover:border-emerald-800/80'
                    : 'bg-rose-950/20 border-rose-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-[11px]">
                    {log.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                    <span className="text-zinc-200">{log.providerName}</span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-amber-400 truncate max-w-[120px]">{log.model}</span>
                  </div>

                  <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {(log.durationMs / 1000).toFixed(2)}s
                  </span>
                </div>

                <div className="text-[10px] text-zinc-400 truncate font-mono">
                  URL: <span className="text-zinc-300">{log.endpoint}</span>
                </div>

                {log.error && (
                  <p className="text-[10px] text-rose-400 bg-rose-950/40 p-1.5 rounded border border-rose-900/40">
                    Error: {log.error}
                  </p>
                )}

                <div className="flex items-center justify-between text-[9px] text-zinc-500 pt-1 border-t border-zinc-800/50">
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span>
                    Tokens: {log.inputTokens ?? 0} in / {log.outputTokens ?? 0} out
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
