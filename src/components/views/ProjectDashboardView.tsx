import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Brain,
  MessageSquare,
  Network,
  BarChart3,
  History,
  Sparkles,
  Plus,
  Play,
} from 'lucide-react';
import { ProjectItem } from '../../services/database';
import { ps6Db } from '../../services/ps6Database';
import { ConceptMastery } from '../../services/ps6Types';
import { ChatArea } from '../chat/ChatArea';
import { StoryChallengeView } from './StoryChallengeView';
import { KnowledgeView } from './KnowledgeView';
import { AnalyticsView } from './AnalyticsView';
import { JudgeControlView } from './JudgeControlView';
import { Chat, ChatMessage as ChatMessageType } from '../../services/types';

interface ProjectDashboardViewProps {
  project: ProjectItem;
  projectChats: Chat[];
  activeChatId: string | null;
  messages: ChatMessageType[];
  onBackToProjects: () => void;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onSendMessage: (prompt: string) => void;
  onStopStreaming: () => void;
  onRegenerate: () => void;
  onExport: () => void;
}

export const ProjectDashboardView: React.FC<ProjectDashboardViewProps> = ({
  project,
  projectChats,
  activeChatId,
  messages,
  onBackToProjects,
  onSelectChat,
  onNewChat,
  onSendMessage,
  onStopStreaming,
  onRegenerate,
  onExport,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'learn' | 'chat' | 'concepts' | 'progress' | 'history'
  >('overview');

  const masteryList = ps6Db.getAllMastery(project.id);
  const misconceptions = ps6Db.getMisconceptions(project.id);
  const traces = ps6Db.getDecisionTraces(project.id);

  const avgMastery =
    masteryList.length > 0
      ? Math.round(
          (masteryList.reduce((acc: number, m: ConceptMastery) => acc + m.mastery, 0) /
            masteryList.length) *
            100
        )
      : 50;

  const masteredCount = masteryList.filter((m: ConceptMastery) => m.mastery >= 0.7).length;
  const progressPercent =
    masteryList.length > 0 ? Math.round((masteredCount / masteryList.length) * 100) : 35;

  const currentConcept =
    masteryList.find(
      (m: ConceptMastery) => m.status === 'learning' || m.status === 'struggling'
    ) ||
    masteryList[0] || { concept_name: 'Core Concepts', mastery: 0.5 };

  const budgetTotal = project.learning_budget || 30;
  const budgetUsed = Math.min(traces.length * 2, budgetTotal);

  const activeChat = projectChats.find((c) => c.id === activeChatId);

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden transition-colors">
      {/* Subject Dashboard Top Bar */}
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 transition-colors">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToProjects}
            className="p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer"
            title="Back to Subjects"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">{project.icon || '📘'}</span>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white tracking-tight">{project.name}</h2>
              {project.topic && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-lg font-mono font-semibold bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {project.topic}
                </span>
              )}
            </div>
            {project.goal && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">{project.goal}</p>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-850 self-start md:self-auto overflow-x-auto">
          {(
            [
              { id: 'overview', label: 'Overview', icon: BookOpen },
              { id: 'learn', label: 'Learn', icon: Brain },
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'concepts', label: 'Concepts', icon: Network },
              { id: 'progress', label: 'Progress', icon: BarChart3 },
              { id: 'history', label: 'History', icon: History },
            ] as const
          ).map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs border border-zinc-200 dark:border-zinc-700'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-850'
                }`}
              >
                <IconComponent className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl space-y-1 shadow-xs">
                <span className="text-xs font-mono text-zinc-500 uppercase block">
                  Overall Mastery
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{avgMastery}%</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Target: 80%+</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${avgMastery}%` }}
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl space-y-1 shadow-xs">
                <span className="text-xs font-mono text-zinc-500 uppercase block">
                  Learning Progress
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{progressPercent}%</span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {masteredCount}/{masteryList.length} Mastered
                  </span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl space-y-1 shadow-xs">
                <span className="text-xs font-mono text-zinc-500 uppercase block">
                  Interaction Budget
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">
                    {budgetUsed}/{budgetTotal}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">Interactions Used</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min((budgetUsed / budgetTotal) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Current Learning Section */}
            <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-850 pb-4">
                <div>
                  <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 uppercase tracking-wider block font-bold">
                    CURRENT LEARNING FOCUS
                  </span>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white mt-0.5">
                    {currentConcept.concept_name}
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-amber-600 dark:text-amber-300">
                  Mastery: {Math.round(currentConcept.mastery * 100)}%
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">Recommended Next Action:</span>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      {misconceptions.length > 0
                        ? `Remediate misconception on ${currentConcept.concept_name}`
                        : `Practice challenge scenarios for ${currentConcept.concept_name}`}
                    </span>
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('learn')}
                  className="px-5 py-2.5 bg-blue-600 dark:bg-white text-white dark:text-zinc-950 font-bold rounded-xl hover:bg-blue-500 dark:hover:bg-zinc-200 transition text-xs flex items-center justify-center gap-2 shadow-xs self-start sm:self-auto cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Continue Learning</span>
                </button>
              </div>
            </div>

            {/* Concept Mastery List */}
            <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-6 space-y-4 shadow-xs">
              <h3 className="text-sm font-mono font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                CONCEPT MASTERY BREAKDOWN
              </h3>

              <div className="space-y-3">
                {masteryList.map((m: ConceptMastery) => {
                  const percent = Math.round(m.mastery * 100);
                  return (
                    <div key={m.concept_id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-zinc-800 dark:text-zinc-300 font-semibold">{m.concept_name}</span>
                        <span
                          className={`font-bold ${
                            percent >= 70
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : percent >= 50
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {percent}%
                        </span>
                      </div>
                      <div className="w-full bg-zinc-100 dark:bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-850">
                        <div
                          className={`h-full rounded-full transition-all ${
                            percent >= 70
                              ? 'bg-emerald-500'
                              : percent >= 50
                              ? 'bg-blue-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* LEARN TAB */}
        {activeTab === 'learn' && <StoryChallengeView />}

        {/* CHAT TAB (Subject Isolated) */}
        {activeTab === 'chat' && (
          <div className="h-full flex">
            {/* Subject Chat Sidebar list */}
            <div className="w-64 border-r border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 p-4 space-y-4 shrink-0 hidden sm:block">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 uppercase">
                  Subject Chats
                </span>
                <button
                  onClick={onNewChat}
                  className="p-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:text-zinc-950 dark:hover:text-white text-zinc-600 dark:text-zinc-400 text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </button>
              </div>

              <div className="space-y-1 overflow-y-auto">
                {projectChats.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onSelectChat(c.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition truncate cursor-pointer ${
                      c.id === activeChatId
                        ? 'bg-zinc-100 dark:bg-zinc-850 text-zinc-950 dark:text-white font-bold border-l-2 border-blue-500'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-950 dark:hover:text-white'
                    }`}
                  >
                    {c.title}
                  </button>
                ))}

                {projectChats.length === 0 && (
                  <p className="text-xs text-zinc-400 italic py-2">No subject chats yet.</p>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 h-full">
              <ChatArea
                chatTitle={activeChat?.title || `${project.name} Workspace`}
                messages={messages}
                onSendMessage={onSendMessage}
                onStopStreaming={onStopStreaming}
                onRegenerate={onRegenerate}
                onExport={onExport}
              />
            </div>
          </div>
        )}

        {/* CONCEPTS TAB */}
        {activeTab === 'concepts' && <KnowledgeView />}

        {/* PROGRESS TAB */}
        {activeTab === 'progress' && <AnalyticsView />}

        {/* HISTORY TAB */}
        {activeTab === 'history' && <JudgeControlView />}
      </div>
    </div>
  );
};
