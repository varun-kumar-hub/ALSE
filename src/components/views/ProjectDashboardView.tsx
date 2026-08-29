import React, { useState } from 'react';
import {
  Folder,
  Plus,
  MessageSquare,
  ArrowRight,
  Trash2,
  Share2,
  Calendar,
  Send,
  Award,
  Globe,
  Lock,
  Check,
  Copy,
  Download,
  X,
  User,
  QrCode,
  FileText,
  Search,
  Sparkles,
} from 'lucide-react';
import { ProjectItem, toggleProjectPublicStatus } from '../../services/database';
import { ps6Db } from '../../services/ps6Database';
import { ConceptMastery } from '../../services/ps6Types';
import { shareSubjectToUserId } from '../../services/userService';
import { KnowledgeView } from './KnowledgeView';
import { AnalyticsView } from './AnalyticsView';
import { StoryChallengeView } from './StoryChallengeView';
import { SubjectTaskTracker } from '../tasks/SubjectTaskTracker';
import { getSubjectTaskStats } from '../../services/taskService';
import { Chat } from '../../services/types';

interface ProjectDashboardViewProps {
  project: ProjectItem;
  projectChats: Chat[];
  activeChatId: string | null;
  onBackToProjects?: () => void;
  onSelectChat: (chatId: string) => void;
  onNewChat: (initialPrompt?: string) => void;
  onDeleteChat: (chatId: string) => void;
  onOpenAssessment?: () => void;
  onSendMessage?: (userPrompt: string) => Promise<void> | void;
  onExport?: () => void;
}

export const ProjectDashboardView: React.FC<ProjectDashboardViewProps> = ({
  project,
  projectChats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onOpenAssessment,
}) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'chats' | 'sources' | 'analytics' | 'challenges'>('tasks');
  const [quickInput, setQuickInput] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTab, setShareTab] = useState<'userId' | 'link' | 'export'>('userId');
  const [targetUserId, setTargetUserId] = useState('');
  const [shareNote, setShareNote] = useState('');
  const [shareSuccessMsg, setShareSuccessMsg] = useState<string | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedAnki, setCopiedAnki] = useState(false);
  const [isPublic, setIsPublic] = useState(project.is_public || false);

  // Load subject mastery stats & task stats
  const masteryList: ConceptMastery[] = ps6Db.getAllMastery(project.id);
  const avgMastery =
    masteryList.length > 0
      ? Math.round((masteryList.reduce((acc, m) => acc + m.mastery, 0) / masteryList.length) * 100)
      : 0;

  const taskStats = getSubjectTaskStats(project.id, project);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    const prompt = quickInput.trim();
    setQuickInput('');
    onNewChat(prompt);
  };

  const handleTogglePublic = async () => {
    const nextStatus = !isPublic;
    setIsPublic(nextStatus);
    await toggleProjectPublicStatus(project.id, nextStatus);
  };

  const handleSendToUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim()) return;
    const res = shareSubjectToUserId(targetUserId, project, shareNote);
    if (res.success) {
      setShareSuccessMsg(res.message);
      setTargetUserId('');
      setShareNote('');
      setTimeout(() => setShareSuccessMsg(null), 3000);
    }
  };

  const handleCopyShareLink = async () => {
    const shareUrl = `https://learnforge.app/s/${project.id}?subject=${encodeURIComponent(project.name)}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1600);
  };

  const handleExportJson = () => {
    const data = {
      subject: project.name,
      topic: project.topic,
      goal: project.goal,
      description: project.description,
      mastery_profile: masteryList,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}-curriculum.json`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 1600);
  };

  const handleExportMarkdown = async () => {
    const md = `# ${project.name}\n\n**Goal:** ${project.goal || 'Domain Mastery'}\n\n**Description:**\n${project.description || ''}\n\n## Curriculum Modules\n${masteryList.map((m, i) => `${i + 1}. **${m.concept_name}** — Mastery: ${(m.mastery * 100).toFixed(0)}%`).join('\n')}\n\n---\n*Exported from LearnForge Adaptive Learning*`;
    await navigator.clipboard.writeText(md);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 1600);
  };

  const handleExportAnki = async () => {
    const ankiText = masteryList
      .map((m) => `${m.concept_name}\tComprehensive adaptive learning checkpoint in ${project.name}`)
      .join('\n');
    await navigator.clipboard.writeText(ankiText);
    setCopiedAnki(true);
    setTimeout(() => setCopiedAnki(false), 1600);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Recent';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredChats = projectChats.filter((c) =>
    c.title.toLowerCase().includes(chatSearchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 h-full flex flex-col bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 overflow-y-auto font-sans transition-colors select-none">
      <div className="max-w-5xl w-full mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Project Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white shrink-0 shadow-2xs">
              <Folder className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
                  {project.name}
                </h1>
              </div>
              {project.goal && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono line-clamp-1 mt-0.5">
                  {project.goal}
                </p>
              )}
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Direct Public/Private Toggle Button */}
            <button
              type="button"
              onClick={handleTogglePublic}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                isPublic
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200'
              }`}
              title={
                isPublic
                  ? 'Public in Community (Click to switch to Private)'
                  : 'Private (Click to publish to Community)'
              }
            >
              {isPublic ? <Globe className="w-3.5 h-3.5 text-emerald-500" /> : <Lock className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{isPublic ? 'Public' : 'Private'}</span>
            </button>

            {/* Subject Assessment */}
            {onOpenAssessment && (
              <button
                type="button"
                onClick={onOpenAssessment}
                className="px-3 py-1.5 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-98"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Subject Assessment</span>
              </button>
            )}

            {/* Enhanced Share Button */}
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Central Hero Input Pill */}
        <form onSubmit={handleQuickSubmit} className="relative">
          <div className="w-full bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 shadow-2xs focus-within:border-zinc-400 dark:focus-within:border-zinc-600 transition-all flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNewChat()}
              className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer shrink-0"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder={`New chat in ${project.name}...`}
              className="flex-1 bg-transparent text-xs text-zinc-950 dark:text-white placeholder-zinc-400 outline-none font-sans"
            />

            <button
              type="submit"
              disabled={!quickInput.trim()}
              className="p-1.5 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 disabled:opacity-30 transition cursor-pointer shrink-0 shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-sans transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'tasks'
                ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-2xs font-bold'
                : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850'
            }`}
          >
            <span>🎯 Tasks ({taskStats.completed}/{taskStats.total})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chats')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-sans transition cursor-pointer shrink-0 ${
              activeTab === 'chats'
                ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-2xs font-bold'
                : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850'
            }`}
          >
            Chats ({projectChats.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sources')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-sans transition cursor-pointer shrink-0 ${
              activeTab === 'sources'
                ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-2xs font-bold'
                : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850'
            }`}
          >
            Sources & Concepts
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-sans transition cursor-pointer shrink-0 ${
              activeTab === 'analytics'
                ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-2xs font-bold'
                : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850'
            }`}
          >
            Analytics ({avgMastery}% Mastery)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('challenges')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-sans transition cursor-pointer shrink-0 ${
              activeTab === 'challenges'
                ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-2xs font-bold'
                : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850'
            }`}
          >
            Adaptive Tutor
          </button>
        </div>

        {/* TAB 0: TASKS & CURRICULUM MILESTONES */}
        {activeTab === 'tasks' && (
          <SubjectTaskTracker
            project={project}
            onStartTaskAction={(payload) => {
              if (payload.type === 'story') {
                setActiveTab('challenges');
              } else if (payload.type === 'assessment' && onOpenAssessment) {
                onOpenAssessment();
              } else {
                onNewChat(payload.prompt);
              }
            }}
            onOpenStoryChallenge={() => setActiveTab('challenges')}
            onOpenAssessment={onOpenAssessment}
          />
        )}

        {/* TAB 1: CHATS LIST */}
        {activeTab === 'chats' && (
          <div className="space-y-3">
            {projectChats.length > 0 && (
              <div className="flex items-center gap-2 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-2xs">
                <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  placeholder={`Search chats in ${project.name}...`}
                  className="w-full bg-transparent text-xs text-zinc-950 dark:text-white outline-none placeholder-zinc-400 font-sans"
                />
                {chatSearchQuery && (
                  <button
                    onClick={() => setChatSearchQuery('')}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <div className="space-y-2">
              {filteredChats.map((chat) => {
                const isActive = activeChatId === chat.id;
                return (
                  <div
                    key={chat.id}
                    onClick={() => onSelectChat(chat.id)}
                    className={`group p-4 rounded-xl transition cursor-pointer flex items-center justify-between gap-4 ${
                      isActive
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 border-2 border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-800/60 hover:shadow-2xs'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-blue-500'}`} />
                        <h3 className={`text-sm font-bold truncate ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-zinc-950 dark:text-white'}`}>
                          {chat.title}
                        </h3>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-600 text-white">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      {chat.context_summary && (
                        <p className="text-xs text-zinc-500 line-clamp-1 pl-6">{chat.context_summary}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(chat.updated_at || chat.created_at)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(chat.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredChats.length === 0 && projectChats.length > 0 && (
                <div className="py-8 text-center text-xs text-zinc-400 font-mono">
                  No chats match "{chatSearchQuery}".
                </div>
              )}

              {projectChats.length === 0 && (
                <div className="py-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-[#121215] space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto text-zinc-700 dark:text-zinc-300 shadow-2xs">
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
                      className="px-4 py-2 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition text-xs flex items-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <span>+ Start Core Tutorial</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
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
            <StoryChallengeView projectId={project.id} onExplainInChat={onNewChat} />
          </div>
        )}
      </div>

      {/* Enhanced Subject Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
          <div className="w-full max-w-lg bg-white dark:bg-[#0f0f12] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-850 text-zinc-950 dark:text-white shadow-2xs">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Share Subject</h3>
                  <p className="text-[11px] text-zinc-500 font-mono">{project.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-1 px-5 pt-3 border-b border-zinc-100 dark:border-zinc-850">
              <button
                type="button"
                onClick={() => setShareTab('userId')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  shareTab === 'userId'
                    ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Send to User ID</span>
              </button>

              <button
                type="button"
                onClick={() => setShareTab('link')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  shareTab === 'link'
                    ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Link & QR</span>
              </button>

              <button
                type="button"
                onClick={() => setShareTab('export')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  shareTab === 'export'
                    ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export & Formats</span>
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-5 space-y-4 text-xs font-sans max-h-[65vh] overflow-y-auto">
              {/* TAB 1: DIRECT USER ID SHARING */}
              {shareTab === 'userId' && (
                <form onSubmit={handleSendToUser} className="space-y-3.5">
                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <span className="font-bold text-xs text-zinc-950 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      Direct Peer-to-Peer Transfer
                    </span>
                    <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                      Send this complete subject curriculum directly to another user's inbox using their unique User ID or handle.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                      Target User ID or Handle
                    </label>
                    <input
                      type="text"
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      placeholder="e.g. USR-4019-STAN or @sophia_ai"
                      className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-zinc-950 dark:text-white placeholder-zinc-400 outline-none focus:border-zinc-400 font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                      Message / Note (Optional)
                    </label>
                    <textarea
                      value={shareNote}
                      onChange={(e) => setShareNote(e.target.value)}
                      placeholder="e.g. Here is the deep learning module we studied for the midterm exam."
                      rows={2}
                      className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-zinc-950 dark:text-white placeholder-zinc-400 outline-none focus:border-zinc-400 resize-none font-sans text-xs"
                    />
                  </div>

                  {shareSuccessMsg && (
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{shareSuccessMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!targetUserId.trim()}
                    className="w-full py-2.5 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 shadow-2xs active:scale-98"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Subject to User</span>
                  </button>
                </form>
              )}

              {/* TAB 2: LINK & LIVE QR CODE */}
              {shareTab === 'link' && (
                <div className="space-y-4">
                  {/* Shareable Link Pill */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                      Direct Web Link
                    </label>
                    <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <span className="flex-1 font-mono text-[11px] text-zinc-700 dark:text-zinc-300 truncate">
                        https://learnforge.app/s/{project.id}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyShareLink}
                        className="px-2.5 py-1 rounded bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-bold font-mono transition flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                      >
                        {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Visual SVG QR Code generator */}
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] flex flex-col items-center justify-center space-y-2.5 text-center">
                    <div className="w-32 h-32 bg-white p-2 rounded-lg border border-zinc-300 shadow-xs flex items-center justify-center">
                      {/* Crisp Procedural QR Pattern */}
                      <svg viewBox="0 0 100 100" className="w-full h-full text-zinc-950 fill-current">
                        <rect x="10" y="10" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="6" />
                        <rect x="18" y="18" width="8" height="8" />
                        <rect x="66" y="10" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="6" />
                        <rect x="74" y="18" width="8" height="8" />
                        <rect x="10" y="66" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="6" />
                        <rect x="18" y="74" width="8" height="8" />
                        <rect x="42" y="14" width="6" height="12" />
                        <rect x="52" y="22" width="8" height="6" />
                        <rect x="42" y="44" width="16" height="16" />
                        <rect x="66" y="44" width="10" height="6" />
                        <rect x="80" y="44" width="6" height="18" />
                        <rect x="44" y="68" width="8" height="18" />
                        <rect x="62" y="76" width="18" height="8" />
                        <rect x="78" y="68" width="8" height="8" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">
                      Scan with mobile device to open study module
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 3: EXPORT & FORMATS */}
              {shareTab === 'export' && (
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block">
                    Portable Formats & Syllabi
                  </span>

                  <div className="grid grid-cols-1 gap-2.5">
                    {/* Markdown Syllabus */}
                    <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                        <div>
                          <span className="font-bold text-zinc-950 dark:text-white block">Markdown Syllabus</span>
                          <span className="text-[10px] text-zinc-500 font-mono">Compatible with Notion, Obsidian</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleExportMarkdown}
                        className="px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-[11px] font-bold font-mono transition flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {copiedMarkdown ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedMarkdown ? 'Copied' : 'Copy MD'}</span>
                      </button>
                    </div>

                    {/* Anki Flashcards Deck */}
                    <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Award className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <span className="font-bold text-zinc-950 dark:text-white block">Anki Flashcard Deck</span>
                          <span className="text-[10px] text-zinc-500 font-mono">Tab-separated questions for Anki import</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleExportAnki}
                        className="px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-[11px] font-bold font-mono transition flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {copiedAnki ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedAnki ? 'Copied' : 'Copy Anki'}</span>
                      </button>
                    </div>

                    {/* JSON Curriculum Package */}
                    <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Download className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div>
                          <span className="font-bold text-zinc-950 dark:text-white block">Full JSON Curriculum</span>
                          <span className="text-[10px] text-zinc-500 font-mono">Portable bundle with mastery profile</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleExportJson}
                        className="px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-[11px] font-bold font-mono transition flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {copiedJson ? <Check className="w-3 h-3 text-emerald-500" /> : <Download className="w-3 h-3" />}
                        <span>{copiedJson ? 'Saved' : 'Download'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 flex justify-end">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold rounded-lg cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
