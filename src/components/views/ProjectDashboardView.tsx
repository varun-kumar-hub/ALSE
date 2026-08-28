import React, { useState } from 'react';
import {
  Folder,
  Plus,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Trash2,
  Share2,
  MoreHorizontal,
  Calendar,
  Send,
  Award,
} from 'lucide-react';
import { ProjectItem } from '../../services/database';
import { ps6Db } from '../../services/ps6Database';
import { ConceptMastery } from '../../services/ps6Types';
import { KnowledgeView } from './KnowledgeView';
import { AnalyticsView } from './AnalyticsView';
import { StoryChallengeView } from './StoryChallengeView';
import { Chat } from '../../services/types';

interface ProjectDashboardViewProps {
  project: ProjectItem;
  projectChats: Chat[];
  activeChatId: string | null;
  onBackToProjects?: () => void;
  onSelectChat: (chatId: string) => void;
  onNewChat: (initialPrompt?: string) => void;
  onDeleteChat?: (chatId: string) => void;
  onOpenAssessment?: () => void;
  onSendMessage?: (prompt: string) => void;
  onExport?: () => void;
}

export const ProjectDashboardView: React.FC<ProjectDashboardViewProps> = ({
  project,
  projectChats,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onOpenAssessment,
}) => {
  const [activeTab, setActiveTab] = useState<'chats' | 'sources' | 'analytics' | 'challenges'>('chats');
  const [quickInput, setQuickInput] = useState('');

  const masteryList = ps6Db.getAllMastery(project.id);
  const avgMastery =
    masteryList.length > 0
      ? Math.round(
          (masteryList.reduce((acc: number, m: ConceptMastery) => acc + m.mastery, 0) /
            masteryList.length) *
            100
        )
      : 50;

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    const prompt = quickInput.trim();
    setQuickInput('');
    onNewChat(prompt);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Recent';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#fbfcfd] dark:bg-[#0d0f12] text-zinc-900 dark:text-zinc-100 overflow-y-auto font-sans transition-colors select-none">
      <div className="max-w-3xl w-full mx-auto px-4 py-8 md:py-12 space-y-8">
        {/* Project Header (ChatGPT Projects Style) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs">
              <Folder className="w-5 h-5 fill-blue-500/20 text-blue-500" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
                {project.name}
              </h1>
              {project.goal && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono line-clamp-1 mt-0.5">
                  {project.goal}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAssessment && (
              <button
                type="button"
                onClick={onOpenAssessment}
                className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60 text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Award className="w-3.5 h-3.5 text-blue-500" />
                <span>Take Assessment</span>
              </button>
            )}
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
            <button
              type="button"
              className="p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Big Central Hero Input Pill (ChatGPT Projects Style) */}
        <form onSubmit={handleQuickSubmit} className="relative">
          <div className="w-full bg-white dark:bg-[#161a22] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-2.5 shadow-sm focus-within:border-blue-500/80 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNewChat()}
              className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-blue-500 transition cursor-pointer shrink-0"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder={`New chat in ${project.name}...`}
              className="flex-1 bg-transparent text-sm text-zinc-950 dark:text-white placeholder-zinc-400 outline-none font-sans"
            />

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[11px] font-mono text-zinc-500 font-semibold">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Think
              </span>

              <button
                type="submit"
                disabled={!quickInput.trim()}
                className="p-2 rounded-xl bg-blue-600 dark:bg-white text-white dark:text-zinc-950 disabled:opacity-30 hover:bg-blue-500 dark:hover:bg-zinc-200 transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('chats')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold font-sans transition cursor-pointer ${
              activeTab === 'chats'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            Chats ({projectChats.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sources')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold font-sans transition cursor-pointer ${
              activeTab === 'sources'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            Sources & Concepts
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold font-sans transition cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            Analytics ({avgMastery}% Mastery)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('challenges')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold font-sans transition cursor-pointer ${
              activeTab === 'challenges'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            Adaptive Tutor
          </button>
        </div>

        {/* TAB 1: CHATS LIST (Matching ChatGPT Projects layout) */}
        {activeTab === 'chats' && (
          <div className="space-y-2">
            {projectChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className="group p-4 rounded-2xl bg-white dark:bg-[#151922] border border-zinc-200 dark:border-zinc-800/80 hover:border-blue-500/50 hover:shadow-xs transition cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />
                    <h3 className="text-sm font-bold text-zinc-950 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                      {chat.title}
                    </h3>
                  </div>
                  {chat.context_summary && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 font-sans pl-6">
                      {chat.context_summary}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1 text-xs text-zinc-400 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{formatDate(chat.updated_at || chat.created_at)}</span>
                  </div>

                  {onDeleteChat && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete chat "${chat.title}"?`)) {
                          onDeleteChat(chat.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                      title="Delete Chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {projectChats.length === 0 && (
              <div className="py-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    No chats in {project.name} yet
                  </h3>
                  <p className="text-xs text-zinc-500 font-sans max-w-sm mx-auto">
                    Start your first learning conversation or explore guided topics for this subject.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onNewChat(`Teach me core concepts of ${project.name}`)}
                    className="px-4 py-2 bg-blue-600 dark:bg-white text-white dark:text-zinc-950 font-bold rounded-xl hover:bg-blue-500 dark:hover:bg-zinc-200 transition text-xs flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>+ Start Core Tutorial</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SOURCES & CONCEPTS */}
        {activeTab === 'sources' && (
          <div className="space-y-4">
            <KnowledgeView projectId={project.id} />
          </div>
        )}

        {/* TAB 3: ANALYTICS & MASTERY */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <AnalyticsView projectId={project.id} />
          </div>
        )}

        {/* TAB 4: ADAPTIVE CHALLENGES */}
        {activeTab === 'challenges' && (
          <div className="space-y-4">
            <StoryChallengeView projectId={project.id} />
          </div>
        )}
      </div>
    </div>
  );
};
