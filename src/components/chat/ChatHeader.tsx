import React, { useState } from 'react';
import { Cpu, Download, BarChart2, X, Activity } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAppStore } from '../../stores/appStore';
import { getModelAgentRoleLabel } from '../../services/providers';

interface ChatHeaderProps {
  chatTitle: string;
  onExport: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ chatTitle, onExport }) => {
  const { models, selectedModel, setSelectedModel } = useAppStore();
  const [showStatsModal, setShowStatsModal] = useState(false);

  return (
    <>
      <header className="h-14 w-full flex items-center justify-between px-6 border-b border-zinc-200 bg-white/85 backdrop-blur-md shrink-0 z-10 select-none">
        {/* Chat Title */}
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-sm font-bold text-zinc-950 truncate">
            {chatTitle || 'New Conversation'}
          </h2>
        </div>

        {/* Model Selector & Actions */}
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

          {/* Model Dropdown */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs shadow-sm">
            <Cpu className="w-4 h-4 text-blue-600" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent text-zinc-800 text-xs font-mono font-semibold focus:outline-none cursor-pointer"
            >
              <optgroup label="Local Ollama Models">
                {models.length > 0 ? (
                  models.map((m) => (
                    <option key={m.name} value={m.name} className="bg-white text-zinc-800">
                      {getModelAgentRoleLabel(m.name)}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="qwen3:8b" className="bg-white text-zinc-800">
                      Qwen3:8B (General Agent)
                    </option>
                    <option value="qwen2.5-coder:7b" className="bg-white text-zinc-800">
                      Qwen2.5-Coder:7B (Coding Agent)
                    </option>
                    <option value="llama3.2:latest" className="bg-white text-zinc-800">
                      Llama 3.2 (General Agent - Alt)
                    </option>
                  </>
                )}
              </optgroup>
              <optgroup label="Cloud Models (OpenCode, OpenAI, Claude, Gemini)">
                <option value="opencode-zen-coder" className="bg-white text-zinc-800 font-bold text-blue-700">
                  ⚡ OpenCode Zen (opencode-zen-coder)
                </option>
                <option value="opencode-go-coder" className="bg-white text-zinc-800 font-bold text-blue-700">
                  ⚡ OpenCode Go (opencode-go-coder)
                </option>
                <option value="gpt-4o-mini" className="bg-white text-zinc-800 font-bold text-blue-700">
                  ☁️ OpenAI GPT-4o Mini
                </option>
                <option value="gpt-4o" className="bg-white text-zinc-800 font-bold text-blue-700">
                  ☁️ OpenAI GPT-4o
                </option>
                <option value="claude-3-5-sonnet-20241022" className="bg-white text-zinc-800 font-bold text-purple-700">
                  ☁️ Claude 3.5 Sonnet
                </option>
                <option value="gemini-2.5-flash" className="bg-white text-zinc-800 font-bold text-emerald-700">
                  ☁️ Google Gemini 2.5 Flash
                </option>
                <option value="gemini-2.5-pro" className="bg-white text-zinc-800 font-bold text-emerald-700">
                  ☁️ Google Gemini 2.5 Pro
                </option>
              </optgroup>
            </select>
          </div>

          {/* Multi-Format Export Dropdown (Module 12) */}
          <div className="relative group">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Export Chat
            </Button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50 bg-white border border-zinc-200 rounded-xl shadow-xl p-1 w-32 space-y-0.5 animate-in fade-in duration-100">
              <button
                onClick={onExport}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors flex items-center justify-between"
              >
                <span>Markdown</span>
                <span className="text-[9px] font-mono text-zinc-400">.md</span>
              </button>
              <button
                onClick={onExport}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors flex items-center justify-between"
              >
                <span>Plain Text</span>
                <span className="text-[9px] font-mono text-zinc-400">.txt</span>
              </button>
              <button
                onClick={onExport}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors flex items-center justify-between"
              >
                <span>JSON Dump</span>
                <span className="text-[9px] font-mono text-zinc-400">.json</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Session Statistics Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-zinc-950">Session Statistics</h3>
              </div>
              <button
                onClick={() => setShowStatsModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
                <span className="text-[10px] text-zinc-500 uppercase block">Total Messages</span>
                <span className="text-base font-bold text-zinc-900">42</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
                <span className="text-[10px] text-zinc-500 uppercase block">Input Tokens</span>
                <span className="text-base font-bold text-blue-600">42,510</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
                <span className="text-[10px] text-zinc-500 uppercase block">Output Tokens</span>
                <span className="text-base font-bold text-emerald-600">56,930</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
                <span className="text-[10px] text-zinc-500 uppercase block">Avg Response Speed</span>
                <span className="text-base font-bold text-purple-600">62 t/s</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
                <span className="text-[10px] text-zinc-500 uppercase block">Models Used</span>
                <span className="text-base font-bold text-amber-600">3</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
                <span className="text-[10px] text-zinc-500 uppercase block">MCP / Web Tool Calls</span>
                <span className="text-base font-bold text-cyan-600">18</span>
              </div>
            </div>

            <div className="pt-2 text-right">
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
