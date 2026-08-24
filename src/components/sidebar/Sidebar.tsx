import React, { useState, useRef } from 'react';
import {
  Bot,
  Settings,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  Activity,
  HardDrive,
  Pin,
} from 'lucide-react';
import { Chat } from '../../services/types';
import { useAppStore } from '../../stores/appStore';

import { QuickActionsBar } from './QuickActionsBar';
import { UniversalSearch } from './UniversalSearch';
import { SidebarNavHub } from './SidebarNavHub';

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
  } = useAppStore();

  const [activeWorkspace, setActiveWorkspace] = useState('Personal');
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCompact, setIsCompact] = useState(false);
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_pinned') !== 'false';
    } catch {
      return true;
    }
  });

  const togglePinState = () => {
    setIsPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_pinned', String(next));
      } catch {}
      return next;
    });
  };

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const workspaces = ['Personal', 'Research', 'College', 'Development', 'Work', 'Startup'];

  const handleMouseEnter = () => {
    if (!isPinned) {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      setIsCompact(false);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        setIsCompact(true);
      }, 250);
    }
  };

  if (!sidebarOpen) {
    return (
      <div className="fixed top-3 left-3 z-30">
        <button
          onClick={toggleSidebar}
          className="p-2.5 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950 border border-zinc-200/90 shadow-xl backdrop-blur-md transition-all cursor-pointer"
          title="Open Sidebar"
        >
          <PanelLeft className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`h-screen flex flex-col bg-white border-r border-zinc-200 shrink-0 select-none z-20 transition-all duration-300 ${
        isCompact ? 'w-16' : 'w-72'
      }`}
    >
      {/* Workspace Switcher & App Header */}
      <div className="p-3 border-b border-zinc-200/80 bg-[#f6f5f2]/40 relative">
        {isCompact ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => {
                setIsPinned(true);
                setIsCompact(false);
              }}
              className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm hover:scale-105 transition-all cursor-pointer"
              title="Expand & Pin Sidebar"
            >
              <Bot className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm shrink-0">
                <Bot className="w-4 h-4" />
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-zinc-950 truncate leading-tight">
                    🤖 {assistantName}
                  </span>
                </div>

                {/* Workspace Selector Dropdown Trigger */}
                <button
                  onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
                  className="flex items-center gap-1 text-[10px] font-semibold text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                >
                  <span>Workspace: <strong className="text-blue-700 font-bold">{activeWorkspace}</strong></span>
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={togglePinState}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isPinned ? 'text-blue-600 bg-blue-50' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
                }`}
                title={isPinned ? 'Unpin Sidebar (Enable Auto-Collapse)' : 'Pin Sidebar (Lock Open)'}
              >
                <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-blue-600' : ''}`} />
              </button>

              <button
                onClick={() => {
                  setIsPinned(false);
                  setIsCompact(true);
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer ml-0.5"
                title="Collapse Sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Workspace Dropdown Menu */}
        {isWorkspaceMenuOpen && !isCompact && (
          <div className="absolute top-14 left-3 right-3 z-50 bg-white border border-zinc-200 rounded-2xl shadow-xl p-1.5 space-y-0.5 animate-in fade-in duration-150">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1 block">
              Switch Workspace
            </span>
            {workspaces.map((ws) => (
              <button
                key={ws}
                onClick={() => {
                  setActiveWorkspace(ws);
                  setIsWorkspaceMenuOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeWorkspace === ws
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                📂 {ws} Workspace
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions Bar */}
      <div className="p-2 border-b border-zinc-100">
        <QuickActionsBar
          onNewChat={onNewChat}
          onNewResearch={onNewChat}
          onNewProject={onNewChat}
          onUploadFile={() => {
            const attachBtn = document.querySelector<HTMLButtonElement>('button[title="Attach files"]');
            attachBtn?.click();
          }}
          compact={isCompact}
        />
      </div>

      {/* Universal Command Search */}
      <div className="p-2 border-b border-zinc-100">
        <UniversalSearch value={searchQuery} onChange={setSearchQuery} compact={isCompact} />
      </div>

      {/* Navigation Hub */}
      {!isCompact && (
        <SidebarNavHub
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={onSelectChat}
          onRenameChat={onRenameChat}
          onTogglePin={onTogglePin}
          onDeleteChat={onDeleteChat}
          searchQuery={searchQuery}
        />
      )}

      {/* Footer Status & Controls */}
      <div className="p-2 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs mt-auto">
        {isCompact ? (
          <div className="flex flex-col items-center gap-1.5 w-full py-1">
            <button
              onClick={() => {
                const debugBtn = document.querySelector<HTMLButtonElement>('button[data-debug-toggle]');
                debugBtn?.click();
              }}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-700 hover:bg-white transition-colors"
              title="Open Developer Debug Panel"
            >
              <Activity className="w-4 h-4 text-emerald-600" />
            </button>
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-950 hover:bg-white transition-colors"
              title="Open Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsPinned(true);
                setIsCompact(false);
              }}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-950 hover:bg-white transition-colors"
              title="Expand & Pin Sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
              <span className="flex items-center gap-1 font-semibold text-emerald-700">
                <Activity className="w-3 h-3 text-emerald-600" /> System Healthy
              </span>
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-zinc-400" /> Workspace Ready
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const debugBtn = document.querySelector<HTMLButtonElement>('button[data-debug-toggle]');
                  debugBtn?.click();
                }}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-700 hover:bg-white transition-colors"
                title="Open Developer Debug Panel"
              >
                <Activity className="w-4 h-4 text-emerald-600" />
              </button>
              <button
                onClick={() => {
                  setIsPinned(false);
                  setIsCompact(true);
                }}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-950 hover:bg-white transition-colors"
                title="Compact Sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenSettings}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-950 hover:bg-white transition-colors"
                title="Open Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
