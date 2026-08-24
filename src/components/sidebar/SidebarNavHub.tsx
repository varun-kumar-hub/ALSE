import React, { useState } from 'react';
import {
  MessageSquare,
  Folder,
  Globe,
  BookOpen,
  ChevronRight,
  ChevronDown,
  BarChart2,
  Download,
  Cpu,
  Bot,
  Brain,
  Terminal,
} from 'lucide-react';
import { Chat } from '../../services/types';
import { ChatList } from './ChatList';

interface SidebarNavHubProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  onTogglePin: (id: string, currentPin: boolean) => void;
  onDeleteChat: (id: string) => void;
  searchQuery?: string;
}

export const SidebarNavHub: React.FC<SidebarNavHubProps> = ({
  chats,
  activeChatId,
  onSelectChat,
  onRenameChat,
  onTogglePin,
  onDeleteChat,
}) => {
  const [activeItem, setActiveItem] = useState<string>('chats');

  // Progressive Disclosure Expandable Groups
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [isResearchOpen, setIsResearchOpen] = useState(true);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isDevOpen, setIsDevOpen] = useState(false);
  const [isChatsListOpen, setIsChatsListOpen] = useState(true);

  return (
    <div className="flex-1 flex flex-col min-h-0 select-none text-xs overflow-y-auto p-2 space-y-3 font-medium text-zinc-700">
      {/* 📂 Tier 1: WORKSPACE & CHATS */}
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
          className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider hover:text-zinc-700 transition-colors"
        >
          <span>Workspace & Chats</span>
          {isWorkspaceOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>

        {isWorkspaceOpen && (
          <div className="space-y-0.5 pl-1 animate-in fade-in duration-150">
            {/* Chats Sub-Section */}
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setActiveItem('chats');
                  setIsChatsListOpen(!isChatsListOpen);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all ${
                  activeItem === 'chats' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-zinc-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span>Chats</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono text-zinc-400 font-bold">{chats.length}</span>
                  {isChatsListOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </div>
              </button>

              {/* Collapsible Chat History List */}
              {isChatsListOpen && activeItem === 'chats' && (
                <div className="pl-2 pt-1 border-l-2 border-zinc-100 space-y-1">
                  <ChatList
                    chats={chats}
                    activeChatId={activeChatId}
                    onSelectChat={onSelectChat}
                    onRenameChat={onRenameChat}
                    onTogglePin={onTogglePin}
                    onDeleteChat={onDeleteChat}
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveItem('projects')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all ${
                activeItem === 'projects' ? 'bg-amber-50 text-amber-900 font-bold' : 'hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-amber-600" />
                <span>Projects</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* 🔬 Tier 2: RESEARCH & HUBS */}
      <div className="space-y-1 pt-1 border-t border-zinc-100">
        <button
          type="button"
          onClick={() => setIsResearchOpen(!isResearchOpen)}
          className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider hover:text-zinc-700 transition-colors"
        >
          <span>Research & Hubs</span>
          {isResearchOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>

        {isResearchOpen && (
          <div className="space-y-0.5 pl-1 animate-in fade-in duration-150">
            <button
              type="button"
              onClick={() => setActiveItem('research')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all ${
                activeItem === 'research' ? 'bg-purple-50 text-purple-900 font-bold' : 'hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-600" />
                <span>Deep Research</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveItem('notes')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all ${
                activeItem === 'notes' ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Knowledge & Notes</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveItem('reports')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all ${
                activeItem === 'reports' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-600" />
                <span>Analytics & Reports</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveItem('downloads')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all ${
                activeItem === 'downloads' ? 'bg-cyan-50 text-cyan-900 font-bold' : 'hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-cyan-600" />
                <span>Downloads & Exports</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* 🤖 Tier 3: AI & INTELLIGENCE */}
      <div className="space-y-1 pt-1 border-t border-zinc-100">
        <button
          type="button"
          onClick={() => setIsAiOpen(!isAiOpen)}
          className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider hover:text-zinc-700 transition-colors"
        >
          <span>AI & Intelligence</span>
          {isAiOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>

        {isAiOpen && (
          <div className="space-y-0.5 pl-1 animate-in fade-in duration-150">
            <button
              type="button"
              onClick={() => {
                const settingsBtn = document.querySelector<HTMLButtonElement>('button[title="Open Settings"]');
                settingsBtn?.click();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-zinc-100 text-zinc-700 transition-colors cursor-pointer"
            >
              <Bot className="w-4 h-4 text-indigo-600" />
              <span>Agents</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const settingsBtn = document.querySelector<HTMLButtonElement>('button[title="Open Settings"]');
                settingsBtn?.click();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-zinc-100 text-zinc-700 transition-colors cursor-pointer"
            >
              <Cpu className="w-4 h-4 text-purple-600" />
              <span>Models & Providers</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const settingsBtn = document.querySelector<HTMLButtonElement>('button[title="Open Settings"]');
                settingsBtn?.click();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-zinc-100 text-zinc-700 transition-colors cursor-pointer"
            >
              <Brain className="w-4 h-4 text-emerald-600" />
              <span>Memory & RAG</span>
            </button>
          </div>
        )}
      </div>

      {/* 🛠 Tier 4: DEVELOPER & SYSTEM */}
      <div className="space-y-1 pt-1 border-t border-zinc-100">
        <button
          type="button"
          onClick={() => setIsDevOpen(!isDevOpen)}
          className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider hover:text-zinc-700 transition-colors"
        >
          <span>Developer & System</span>
          {isDevOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>

        {isDevOpen && (
          <div className="space-y-0.5 pl-1 animate-in fade-in duration-150">
            <button
              type="button"
              onClick={() => {
                const debugBtn = document.querySelector<HTMLButtonElement>('button[data-debug-toggle]');
                debugBtn?.click();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-zinc-100 text-zinc-700 transition-colors"
            >
              <Terminal className="w-4 h-4 text-emerald-600" />
              <span>Diagnostics & Logs</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
