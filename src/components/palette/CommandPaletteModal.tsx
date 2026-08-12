import React, { useState, useEffect } from 'react';
import {
  Search,
  MessageSquare,
  FolderPlus,
  Globe,
  FileUp,
  Cpu,
  Zap,
  Settings,
  Terminal,
  X,
  BookOpen,
  BarChart2,
  Download,
  Bot,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: 'Actions' | 'Navigation' | 'AI & Tools' | 'Developer';
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onNewChat,
  onOpenSettings,
}) => {
  const [query, setQuery] = useState('');
  const { setSelectedModel } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          const btn = document.querySelector<HTMLButtonElement>('button[data-cmd-palette]');
          btn?.click();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const commands: CommandItem[] = [
    {
      id: 'new-chat',
      title: 'New Chat Session',
      category: 'Actions',
      icon: <MessageSquare className="w-4 h-4 text-blue-600" />,
      shortcut: '⌘N',
      action: () => {
        onNewChat();
        onClose();
      },
    },
    {
      id: 'new-project',
      title: 'Create Project Workspace',
      category: 'Actions',
      icon: <FolderPlus className="w-4 h-4 text-amber-600" />,
      action: () => {
        alert('Creating New Workspace Project...');
        onClose();
      },
    },
    {
      id: 'start-research',
      title: 'Launch Deep Research Engine',
      category: 'Actions',
      icon: <Globe className="w-4 h-4 text-purple-600" />,
      action: () => {
        alert('Launching Deep Research Engine...');
        onClose();
      },
    },
    {
      id: 'upload-file',
      title: 'Upload File / Parse Document',
      category: 'Actions',
      icon: <FileUp className="w-4 h-4 text-emerald-600" />,
      action: () => {
        alert('Opening File Parser...');
        onClose();
      },
    },
    {
      id: 'select-opencode',
      title: 'Switch Model: OpenCode Zen (opencode-zen-coder)',
      category: 'AI & Tools',
      icon: <Zap className="w-4 h-4 text-blue-600" />,
      action: () => {
        setSelectedModel('opencode-zen-coder');
        onClose();
      },
    },
    {
      id: 'select-gpt4o',
      title: 'Switch Model: OpenAI GPT-4o',
      category: 'AI & Tools',
      icon: <Cpu className="w-4 h-4 text-emerald-600" />,
      action: () => {
        setSelectedModel('gpt-4o');
        onClose();
      },
    },
    {
      id: 'select-qwen',
      title: 'Switch Model: Qwen3 8B (Local)',
      category: 'AI & Tools',
      icon: <Bot className="w-4 h-4 text-purple-600" />,
      action: () => {
        setSelectedModel('qwen3:8b');
        onClose();
      },
    },
    {
      id: 'nav-notes',
      title: 'Open AI Knowledge Notebook',
      category: 'Navigation',
      icon: <BookOpen className="w-4 h-4 text-blue-600" />,
      action: () => {
        const notebookBtn = document.querySelector<HTMLButtonElement>('button[title="Open AI Notebook"]');
        notebookBtn?.click();
        onClose();
      },
    },
    {
      id: 'nav-reports',
      title: 'Open Generated Reports',
      category: 'Navigation',
      icon: <BarChart2 className="w-4 h-4 text-emerald-600" />,
      action: () => {
        onClose();
      },
    },
    {
      id: 'nav-downloads',
      title: 'Open Downloaded Assets',
      category: 'Navigation',
      icon: <Download className="w-4 h-4 text-cyan-600" />,
      action: () => {
        onClose();
      },
    },
    {
      id: 'open-settings',
      title: 'Open System Settings & AI Providers',
      category: 'Navigation',
      icon: <Settings className="w-4 h-4 text-zinc-600" />,
      shortcut: '⌘,',
      action: () => {
        onOpenSettings();
        onClose();
      },
    },
    {
      id: 'open-debug',
      title: 'Open Developer Debug Panel',
      category: 'Developer',
      icon: <Terminal className="w-4 h-4 text-emerald-500" />,
      action: () => {
        const debugBtn = document.querySelector<HTMLButtonElement>('button[data-debug-toggle]');
        debugBtn?.click();
        onClose();
      },
    },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-150 select-none text-xs">
      <div className="w-full max-w-xl bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Search Header Input */}
        <div className="p-3 border-b border-zinc-100 flex items-center gap-3 bg-zinc-50/50">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            type="text"
            placeholder="Type a command or search (e.g. New Chat, OpenCode, Settings, Debug)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-zinc-950 font-medium placeholder-zinc-400 focus:outline-none"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 font-medium">
              No commands found matching "{query}"
            </div>
          ) : (
            filteredCommands.map((cmd) => (
              <button
                key={cmd.id}
                onClick={cmd.action}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left font-medium text-zinc-800 hover:bg-blue-50 hover:text-blue-900 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {cmd.icon}
                  <span className="truncate">{cmd.title}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-500 font-mono group-hover:bg-blue-100 group-hover:text-blue-700">
                    {cmd.category}
                  </span>
                </div>

                {cmd.shortcut && (
                  <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer Hint */}
        <div className="p-2.5 px-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>Navigate with ↑ ↓ and Press Enter</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};
