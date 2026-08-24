import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MessageSquare,
  FileText,
  Settings,
  FolderKanban,
  Zap,
  Plus,
  Trash2,
  X,
  Bot,
  Brain,
  Globe,
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { Chat } from '../services/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  chats: Chat[];
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  chats,
  onSelectChat,
  onNewChat,
  onOpenSettings,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { aiMode, setAiMode, selectedModel } = useAppStore();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open triggered via App handler
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

  const trimmed = query.trim().toLowerCase();

  const filteredChats = chats.filter(
    (c) => c.title.toLowerCase().includes(trimmed) || c.model.toLowerCase().includes(trimmed)
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center pt-20 p-4 select-none animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Input */}
        <div className="p-3 border-b border-zinc-200 flex items-center gap-2.5 bg-zinc-50/80">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search chats, projects, files, actions, memory (Ctrl+K)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-zinc-500 bg-white border border-zinc-200 rounded shadow-xs">
            ESC
          </kbd>
        </div>

        {/* Command Palette Content List */}
        <div className="p-2 overflow-y-auto space-y-3 divide-y divide-zinc-100">
          {/* Quick Actions */}
          <div className="space-y-1 pt-1">
            <span className="px-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Quick Actions
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
              <button
                onClick={() => {
                  onNewChat();
                  onClose();
                }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-blue-50 text-zinc-800 hover:text-blue-700 text-xs font-semibold transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>Start New Chat Session</span>
              </button>

              <button
                onClick={() => {
                  onOpenSettings();
                  onClose();
                }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-zinc-100 text-zinc-800 text-xs font-semibold transition-all cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-zinc-500" />
                <span>Cloud & Local Provider Settings</span>
              </button>

              <button
                onClick={() => {
                  const nextMode = aiMode === 'cloud' ? 'local' : aiMode === 'local' ? 'hybrid' : 'cloud';
                  setAiMode(nextMode);
                }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-purple-50 text-zinc-800 hover:text-purple-700 text-xs font-semibold transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-purple-600" />
                <span>Toggle AI Mode (Current: {aiMode.toUpperCase()})</span>
              </button>
            </div>
          </div>

          {/* Conversations */}
          {filteredChats.length > 0 && (
            <div className="pt-2 space-y-1">
              <span className="px-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Recent Conversations ({filteredChats.length})</span>
                <span className="text-[9px] font-normal text-zinc-400">Active Model: {selectedModel}</span>
              </span>
              <div className="space-y-0.5 pt-1">
                {filteredChats.slice(0, 5).map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => {
                      onSelectChat(chat.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-zinc-100 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-600 shrink-0" />
                      <span className="text-xs font-medium text-zinc-800 truncate">{chat.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 shrink-0 ml-2">
                      {chat.model}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>Nexus Agent Universal Search</span>
          <span>Press ESC to exit</span>
        </div>
      </div>
    </div>
  );
};
