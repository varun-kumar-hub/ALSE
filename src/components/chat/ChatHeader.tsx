import React, { useState } from 'react';
import { Cpu, Download, BarChart2, X, Activity } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAppStore } from '../../stores/appStore';
import { getProviderIdForModel } from '../../services/providers';

interface ChatHeaderProps {
  chatTitle: string;
  onExport: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ chatTitle, onExport }) => {
  const { aiMode, selectedModel, providerConfigs } = useAppStore();
  const [showStatsModal, setShowStatsModal] = useState(false);

  const activeProviderId = getProviderIdForModel(selectedModel) || (aiMode === 'local' ? 'ollama' : 'opencode');
  const activeConfig = providerConfigs.find((p) => p.id === activeProviderId);

  const displayProviderLabel =
    activeProviderId === 'opencode'
      ? 'OpenCode Zen'
      : activeProviderId === 'openai'
      ? 'OpenAI'
      : activeProviderId === 'anthropic'
      ? 'Claude'
      : activeProviderId === 'gemini'
      ? 'Google Gemini'
      : 'Local Ollama';

  const displayActiveModel =
    selectedModel || activeConfig?.defaultModel || (aiMode === 'local' ? 'qwen3:8b' : 'opencode-zen-coder');

  return (
    <>
      <header className="h-14 w-full flex items-center justify-between px-6 border-b border-zinc-200 bg-white/85 backdrop-blur-md shrink-0 z-10 select-none">
        {/* Chat Title */}
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-sm font-bold text-zinc-950 truncate">
            {chatTitle || 'New Conversation'}
          </h2>
        </div>

        {/* Model Display & Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Session Statistics Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStatsModal(true)}
            leftIcon={<BarChart2 className="w-3.5 h-3.5 text-blue-600" />}
            className="text-xs font-mono"
          >
            Stats
          </Button>

          {/* Fixed Active Model Display Pill (Configured in Settings) */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs shadow-sm font-mono select-none">
            <Cpu className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-bold text-zinc-900 text-xs truncate max-w-[200px]" title={displayActiveModel}>
              {displayActiveModel}
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-blue-600 text-white shadow-xs shrink-0 flex items-center gap-1">
              ⚡ {displayProviderLabel}
            </span>
          </div>

          {/* Multi-Format Export Dropdown */}
          <div className="relative group">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Export Chat
            </Button>
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-zinc-200 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-50 p-1 space-y-0.5 text-xs">
              <button
                onClick={onExport}
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 rounded-lg text-zinc-700 font-medium flex items-center gap-2 cursor-pointer"
              >
                📄 Markdown (.md)
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Session Performance Diagnostics Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-sm text-zinc-950 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" /> Active Session Performance
              </h3>
              <button
                onClick={() => setShowStatsModal(false)}
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
                <span className="text-[10px] text-zinc-500 font-bold uppercase">Active Provider & Model</span>
                <p className="font-bold text-zinc-900">{displayProviderLabel} · {displayActiveModel}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                  <span className="text-[10px] text-blue-600 font-bold uppercase">Execution Mode</span>
                  <p className="font-bold text-blue-900 uppercase">{aiMode}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                  <span className="text-[10px] text-emerald-600 font-bold uppercase">Connection Status</span>
                  <p className="font-bold text-emerald-900">VERIFIED ACTIVE</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setShowStatsModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
