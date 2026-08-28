import React from 'react';
import {
  Brain,
  Plus,
  Compass,
  Zap,
  Network,
  ArrowRight,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

interface OSDashboardProps {
  onNewChat: () => void;
  onOpenSettings: () => void;
}

export const OSDashboard: React.FC<OSDashboardProps> = ({ onNewChat, onOpenSettings }) => {
  const {
    aiMode,
    selectedModel,
  } = useAppStore();

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50 dark:bg-zinc-950 p-8 select-none space-y-8 animate-in fade-in duration-200 text-zinc-900 dark:text-zinc-100 font-sans transition-colors">
      {/* Top Welcome Header Card */}
      <div className="max-w-4xl mx-auto rounded-2xl bg-white dark:bg-zinc-900/80 p-8 border border-zinc-200 dark:border-zinc-850 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors">
        <div className="space-y-3 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs border border-zinc-200 dark:border-zinc-750 font-mono">
            <Brain className="w-4 h-4 text-blue-500" />
            <span>LearnForge Adaptive Learning Agent</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
            Welcome to LearnForge
          </h1>
          <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-mono">
            ChatGPT-like conversational AI coupled with real-time learner modeling, knowledge graph extraction, and adaptive PS6 intervention ranking.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={onNewChat}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 dark:bg-white text-white dark:text-zinc-950 font-bold text-xs shadow-sm hover:bg-blue-500 dark:hover:bg-zinc-200 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Start Learning Session</span>
          </button>
        </div>
      </div>

      {/* 4 Primary Quick Action Cards */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={onNewChat}
          className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-850 hover:border-blue-500/40 dark:hover:border-zinc-700 shadow-xs transition cursor-pointer space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-blue-500 dark:text-white group-hover:scale-105 transition-transform">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-950 dark:text-white">Ask Anything</h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">Natural conversational teaching</p>
          </div>
        </div>

        <div
          onClick={onNewChat}
          className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-850 hover:border-blue-500/40 dark:hover:border-zinc-700 shadow-xs transition cursor-pointer space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-blue-500 dark:text-white group-hover:scale-105 transition-transform">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-950 dark:text-white">Deep Research</h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">Extract concept graphs & sources</p>
          </div>
        </div>

        <div
          onClick={onNewChat}
          className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-850 hover:border-blue-500/40 dark:hover:border-zinc-700 shadow-xs transition cursor-pointer space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-blue-500 dark:text-white group-hover:scale-105 transition-transform">
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-950 dark:text-white">Story Challenge</h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">5-10 adaptive decision points</p>
          </div>
        </div>

        <div
          onClick={onNewChat}
          className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-850 hover:border-blue-500/40 dark:hover:border-zinc-700 shadow-xs transition cursor-pointer space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-purple-500 dark:text-white group-hover:scale-105 transition-transform">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-950 dark:text-white">Knowledge Graph</h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">Track concepts & prerequisites</p>
          </div>
        </div>
      </div>

      {/* System Runtime Status */}
      <div className="max-w-4xl mx-auto rounded-2xl bg-white dark:bg-zinc-900/40 p-6 border border-zinc-200 dark:border-zinc-850 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-950 dark:text-white flex items-center gap-2 font-mono uppercase tracking-wider">
            Active Runtime Execution
          </span>
          <button
            onClick={onOpenSettings}
            className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-blue-500 transition flex items-center gap-1 cursor-pointer font-mono"
          >
            <span>Configure Runtime Settings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 flex items-center justify-between">
            <span className="text-zinc-500">Executing Model</span>
            <span className="font-bold text-zinc-950 dark:text-white truncate max-w-[200px]">
              {selectedModel || 'gpt-5.6-sol'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 flex items-center justify-between">
            <span className="text-zinc-500">Execution Mode</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">
              {aiMode === 'local' ? 'Local Mode' : 'Cloud Active'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
