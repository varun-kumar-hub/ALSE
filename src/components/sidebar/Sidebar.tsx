import React from 'react';
import {
  Plus,
  Bot,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { SearchBar } from './SearchBar';
import { ChatList } from './ChatList';
import { Chat } from '../../services/types';
import { useAppStore } from '../../stores/appStore';

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  onTogglePin: (id: string, currentPin: boolean) => void;
  onDeleteChat: (id: string) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onRenameChat,
  onTogglePin,
  onDeleteChat,
  onOpenSettings,
}) => {
  const {
    sidebarOpen,
    toggleSidebar,
    assistantName,
    selectedModel,
    isBackendReady,
  } = useAppStore();

  if (!sidebarOpen) {
    return (
      <div className="fixed top-3 left-3 z-30">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 backdrop-blur-md shadow-lg transition-all cursor-pointer"
          title="Open Sidebar"
        >
          <PanelLeft className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-72 h-screen flex flex-col bg-slate-950/90 border-r border-slate-800/80 backdrop-blur-xl shrink-0 select-none z-20 transition-all duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-900">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-100 leading-tight">
              {assistantName}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">v1.0 • Phase 1</span>
          </div>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition-colors"
          title="Collapse Sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3 space-y-3">
        <Button
          variant="primary"
          size="md"
          className="w-full justify-start text-xs font-semibold py-2.5 shadow-md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={onNewChat}
        >
          New Chat
        </Button>
        <SearchBar />
      </div>

      {/* Conversations List */}
      <ChatList
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={onSelectChat}
        onRenameChat={onRenameChat}
        onTogglePin={onTogglePin}
        onDeleteChat={onDeleteChat}
      />

      {/* Bottom Status & Settings */}
      <div className="p-3 border-t border-slate-900 bg-slate-950/60 space-y-2">
        {/* Model Indicator Badge */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isBackendReady ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'
              }`}
            />
            <span className="font-mono text-[11px] text-slate-300 truncate">
              {selectedModel || 'No Model'}
            </span>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        </div>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
