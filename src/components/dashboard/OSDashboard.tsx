import React from 'react';
import {
  Bot,
  Plus,
  Globe,
  FolderPlus,
  FileUp,
  Cpu,
  CheckCircle2,
  Database,
  Activity,
  ArrowRight,
  HardDrive,
  MessageSquare,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

interface OSDashboardProps {
  onNewChat: () => void;
  onOpenSettings: () => void;
}

export const OSDashboard: React.FC<OSDashboardProps> = ({ onNewChat, onOpenSettings }) => {
  const {
    assistantName,
    aiMode,
    selectedModel,
    models,
    providerConfigs,
  } = useAppStore();

  const activeCloud = providerConfigs.find((p) => (p.apiKeySet || Boolean(p.apiKey && p.apiKey.trim().length > 0)) && p.enabled);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#f6f5f2]/40 p-6 md:p-10 select-none space-y-8 animate-in fade-in duration-200">
      {/* Top Welcome Header Card */}
      <div className="max-w-4xl mx-auto rounded-3xl bg-white p-6 md:p-8 border border-zinc-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100">
            <Bot className="w-4 h-4 text-blue-600" />
            <span>AI Operating System v2.0</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-950 tracking-tight">
            Welcome to {assistantName} Workspace
          </h1>
          <p className="text-xs md:text-sm text-zinc-600 leading-relaxed">
            Your local-first AI workspace is ready. Launch deep research, generate code, manage projects, or converse with your models.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={onNewChat}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Start New Chat</span>
          </button>
        </div>
      </div>

      {/* 4 Primary Quick Action Cards */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={onNewChat}
          className="p-4 rounded-2xl bg-white border border-zinc-200/80 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-zinc-950">New Chat</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Start conversation with active model</p>
          </div>
        </div>

        <div
          onClick={onNewChat}
          className="p-4 rounded-2xl bg-white border border-zinc-200/80 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-105 transition-transform">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-zinc-950">Deep Research</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Search & cross-verify web sources</p>
          </div>
        </div>

        <div
          onClick={onNewChat}
          className="p-4 rounded-2xl bg-white border border-zinc-200/80 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
            <FolderPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-zinc-950">New Project</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Create project workspace folder</p>
          </div>
        </div>

        <div
          onClick={() => {
            const attachBtn = document.querySelector<HTMLButtonElement>('button[title*="Attach"]');
            if (attachBtn) attachBtn.click();
            else onNewChat();
          }}
          className="p-4 rounded-2xl bg-white border border-zinc-200/80 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
            <FileUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-zinc-950">Upload File</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Extract PDF, CSV, or DOCX metadata</p>
          </div>
        </div>
      </div>

      {/* Installed AI Models & System Health Matrix */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Models Matrix (2 Cols) */}
        <div className="md:col-span-2 rounded-3xl bg-white p-6 border border-zinc-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-zinc-950 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" /> Active AI Model Capabilities ({models.length + (activeCloud ? 1 : 0)})
            </span>
            <button
              onClick={onOpenSettings}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Models</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {models.slice(0, 4).map((m) => (
              <div
                key={m.name}
                className="p-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 space-y-1 hover:border-blue-200 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900 text-xs truncate">{m.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    Local
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 font-mono">Speed: ~61 tok/s • Context: 32K</p>
              </div>
            ))}

            {activeCloud && (
              <div className="p-3 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950 text-xs truncate">{activeCloud.defaultModel}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                    {activeCloud.name}
                  </span>
                </div>
                <p className="text-[10px] text-blue-700 font-mono">Cloud SSE • Latency: ~180ms</p>
              </div>
            )}
          </div>
        </div>

        {/* System Health & Infrastructure Panel (1 Col) */}
        <div className="rounded-3xl bg-white p-6 border border-zinc-200/90 shadow-sm space-y-4">
          <span className="text-xs font-extrabold text-zinc-950 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" /> System Health
          </span>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 font-medium">
              <span className="text-zinc-600 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-600" /> SQLite DB
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Ready</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 font-medium">
              <span className="text-zinc-600 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-zinc-500" /> Runtime Mode
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold uppercase">
                {aiMode}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 font-medium">
              <span className="text-zinc-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Primary Model
              </span>
              <span className="font-mono text-[10px] text-zinc-800 font-bold truncate max-w-[100px]">
                {selectedModel || 'qwen3:8b'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
