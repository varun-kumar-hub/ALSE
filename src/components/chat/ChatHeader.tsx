import React from 'react';
import { Cpu, Download, Folder, MessageSquare, Sun, Moon, Menu, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

interface ChatHeaderProps {
  chatTitle: string;
  projectName?: string | null;
  onExport: () => void;
  onToggleSidebar?: () => void;
  onBackToSubjectChats?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  chatTitle,
  projectName,
  onExport,
  onToggleSidebar,
  onBackToSubjectChats,
}) => {
  const { executionConfig, aiMode, selectedModel, theme, setTheme } = useAppStore();

  const displayActiveModel = selectedModel || executionConfig.modelName;
  const modeLabel = aiMode === 'local' ? 'Local' : 'Cloud';

  return (
    <header className="h-14 w-full flex items-center justify-between px-4 sm:px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f0f12] text-zinc-900 dark:text-white shrink-0 z-10 select-none transition-colors">
      {/* Title & Context Badge with Back Navigation */}
      <div className="flex items-center gap-2.5 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer"
            title="Toggle Navigation Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {projectName ? (
          <button
            type="button"
            onClick={onBackToSubjectChats}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 font-mono transition cursor-pointer group shadow-2xs"
            title={`Go back to all chats in ${projectName}`}
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-500 group-hover:text-blue-500 transition shrink-0" />
            <Folder className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="font-bold text-zinc-950 dark:text-white truncate max-w-[160px]">{projectName}</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 font-sans">
              Chats
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 font-mono">
            <MessageSquare className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">General Workspace</span>
          </div>
        )}

        <span className="text-zinc-400 dark:text-zinc-600 font-mono text-xs">/</span>

        <h2 className="text-xs font-semibold text-zinc-950 dark:text-white truncate font-sans">
          {chatTitle || 'LearnForge'}
        </h2>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Quick Theme Toggle Button */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-zinc-300" /> : <Moon className="w-3.5 h-3.5 text-zinc-700" />}
        </button>

        {/* Model Display Badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-xs font-mono">
          <Cpu className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
          <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs truncate max-w-[180px]">
            {displayActiveModel}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
            {modeLabel}
          </span>
        </div>

        {/* Export Button */}
        <button
          onClick={onExport}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-850 text-zinc-800 dark:text-zinc-200 text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-zinc-500" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
