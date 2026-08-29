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
import { LearnForgeLogo } from '../ui/LearnForgeLogo';

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
    <div className="flex-1 h-full overflow-y-auto bg-[#fafafa] dark:bg-[#09090b] p-8 select-none space-y-8 animate-in fade-in duration-150 text-zinc-900 dark:text-zinc-100 font-sans transition-colors">
      {/* Top Welcome Header Card (Hero Primary Feature Surface) */}
      <div className="max-w-4xl mx-auto rounded-xl bg-white dark:bg-[#121215] p-8 border border-zinc-200 dark:border-zinc-800 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors">
        <div className="space-y-3 max-w-lg">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100 font-bold text-xs border border-zinc-200 dark:border-zinc-800 font-mono">
            <LearnForgeLogo size={16} />
            <span>LearnForge Adaptive Learning Agent</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
            Welcome to LearnForge
          </h1>
          <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
            High-performance AI tutor with real-time concept extraction, Bayesian knowledge tracing, and personalized mastery paths.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={onNewChat}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold text-xs shadow-2xs hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer active:scale-98"
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
          className="p-5 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 shadow-2xs transition-all cursor-pointer space-y-3 group active:scale-98"
        >
          <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white transition-transform">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-950 dark:text-white">Ask Anything</h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">Natural conversational teaching</p>
          </div>
        </div>

        <div
          onClick={onNewChat}
          className="p-5 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 shadow-2xs transition cursor-pointer space-y-3 group active:scale-98"
        >
          <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white transition-transform">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-950 dark:text-white">Deep Research</h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">Extract concept graphs & sources</p>
          </div>
        </div>

        <div
          onClick={onNewChat}
          className="p-5 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 shadow-2xs transition cursor-pointer space-y-3 group active:scale-98"
        >
          <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white transition-transform">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-950 dark:text-white">Story Challenge</h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">Adaptive decision scenarios</p>
          </div>
        </div>

        <div
          onClick={onNewChat}
          className="p-5 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 shadow-2xs transition cursor-pointer space-y-3 group active:scale-98"
        >
          <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white transition-transform">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-950 dark:text-white">Knowledge Graph</h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">Track concepts & prerequisites</p>
          </div>
        </div>
      </div>

      {/* System Runtime Status */}
      <div className="max-w-4xl mx-auto rounded-xl bg-white dark:bg-[#121215] p-6 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-950 dark:text-white flex items-center gap-2 font-mono uppercase tracking-wider">
            Active Runtime Execution
          </span>
          <button
            onClick={onOpenSettings}
            className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition flex items-center gap-1 cursor-pointer font-mono"
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
