import React from 'react';
import { Cpu, Download, Folder, MessageSquare, Sun, Moon, Menu } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAppStore } from '../../stores/appStore';

interface ChatHeaderProps {
  chatTitle: string;
  projectName?: string | null;
  onExport: () => void;
  onToggleSidebar?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ chatTitle, projectName, onExport, onToggleSidebar }) => {
  const { executionConfig, aiMode, selectedModel, theme, setTheme } = useAppStore();

  const displayActiveModel = selectedModel || executionConfig.modelName;
  const modeLabel = aiMode === 'local' ? 'Local' : 'Cloud';

  return (
    <header className="h-14 w-full flex items-center justify-between px-4 sm:px-6 border-b border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#151922] text-zinc-900 dark:text-white shrink-0 z-10 select-none shadow-2xs transition-colors">
      {/* Title & Context Badge */}
      <div className="flex items-center gap-2.5 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 text-zinc-700 dark:text-zinc-300 hover:text-blue-500 transition cursor-pointer"
            title="Toggle Navigation Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 font-mono">
          {projectName ? (
            <>
              <Folder className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="font-semibold text-zinc-950 dark:text-white truncate">{projectName}</span>
            </>
          ) : (
            <>
              <MessageSquare className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">General Workspace</span>
            </>
          )}
        </div>

        <span className="text-zinc-400 dark:text-zinc-600 font-mono text-xs">/</span>

        <h2 className="text-sm font-bold text-zinc-950 dark:text-white truncate">
          {chatTitle || 'LearnForge'}
        </h2>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Quick Theme Toggle Button */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-blue-500 transition cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
        </button>

        {/* Model Display Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono">
          <Cpu className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
          <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs truncate max-w-[180px]">
            {displayActiveModel}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
            {modeLabel}
          </span>
        </div>

        {/* Export Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onExport}
          leftIcon={<Download className="w-3.5 h-3.5" />}
          className="text-xs border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-850"
        >
          Export Chat
        </Button>
      </div>
    </header>
  );
};
