import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Brain,
  Network,
  Compass,
  Zap,
  BarChart3,
  FlaskConical,
  Eye,
  Settings,
  Plus,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit2,
  FolderPlus,
  BookOpen,
  Pin,
  PinOff,
  Circle,
  FolderInput,
  FolderOutput,
  MoreVertical,
  Search,
  Sun,
  Moon,
  ArrowRight,
  Award,
} from 'lucide-react';
import { Chat } from '../../services/types';
import { ProjectItem, moveChatToProject, moveChatToGroup, toggleChatReadStatus } from '../../services/database';
import { useAppStore } from '../../stores/appStore';

interface SidebarProps {
  chats: Chat[];
  projects: ProjectItem[];
  activeProjectId: string | null;
  activeChatId: string | null;
  activeView: string;
  onSelectView: (view: string) => void;
  onSelectProject: (projectId: string | null) => void;
  onNewChat: () => void;
  onOpenNewProject: () => void;
  onSelectChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  onTogglePin: (id: string, currentPin: boolean) => void;
  onDeleteChat: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onOpenSettings: () => void;
  onRefreshData?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  isPinned?: boolean;
  onTogglePinSidebar?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  projects,
  activeProjectId,
  activeChatId,
  activeView,
  onSelectView,
  onSelectProject,
  onNewChat,
  onOpenNewProject,
  onSelectChat,
  onRenameChat,
  onTogglePin,
  onDeleteChat,
  onDeleteProject,
  onOpenSettings,
  onRefreshData,
  isOpen = true,
  onClose,
  isPinned = true,
  onTogglePinSidebar,
}) => {
  const { theme, setTheme } = useAppStore();
  const [isGeneralExpanded, setIsGeneralExpanded] = useState(true);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const [isToolsExpanded, setIsToolsExpanded] = useState(true);
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<Record<string, boolean>>({});

  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [activeMenuChatId, setActiveMenuChatId] = useState<string | null>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<'project' | 'group' | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState('');

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const isSubjectExpanded = (projId: string) => {
    if (expandedSubjectIds[projId] !== undefined) {
      return expandedSubjectIds[projId];
    }
    return activeProjectId === projId;
  };

  const toggleSubjectExpanded = (projId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSubjectIds((prev) => ({
      ...prev,
      [projId]: !isSubjectExpanded(projId),
    }));
  };

  // Close context menu on global click
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveMenuChatId(null);
      setActiveSubmenu(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleStartRename = (c: Chat) => {
    setEditingChatId(c.id);
    setEditingTitle(c.title);
    setActiveMenuChatId(null);
  };

  const handleFinishRename = (id: string) => {
    if (editingTitle.trim()) {
      onRenameChat(id, editingTitle.trim());
    }
    setEditingChatId(null);
  };

  const handleMoveToProject = async (chatId: string, targetProjectId: string | null) => {
    await moveChatToProject(chatId, targetProjectId);
    setActiveMenuChatId(null);
    if (onRefreshData) onRefreshData();
  };

  const handleMoveToGroup = async (chatId: string, groupName: string | null) => {
    await moveChatToGroup(chatId, groupName);
    setActiveMenuChatId(null);
    if (onRefreshData) onRefreshData();
  };

  const handleToggleRead = async (chatId: string, currentReadStatus?: boolean) => {
    await toggleChatReadStatus(chatId, !currentReadStatus);
    setActiveMenuChatId(null);
    if (onRefreshData) onRefreshData();
  };

  const renderChatItem = (c: Chat) => {
    const isActive = activeView === 'chat' && activeChatId === c.id;
    const isEditing = editingChatId === c.id;
    const isMenuOpen = activeMenuChatId === c.id;
    const isUnread = c.is_read === false;

    return (
      <div
        key={c.id}
        onClick={() => {
          onSelectView('chat');
          onSelectChat(c.id);
          if (isUnread) toggleChatReadStatus(c.id, true);
        }}
        className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition cursor-pointer select-none ${
          isActive
            ? 'bg-zinc-800 dark:bg-zinc-850 text-white font-semibold border-l-2 border-blue-500 shadow-xs'
            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
        }`}
      >
        {isEditing ? (
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onBlur={() => handleFinishRename(c.id)}
            onKeyDown={(e) => e.key === 'Enter' && handleFinishRename(c.id)}
            autoFocus
            className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white text-xs px-2 py-0.5 rounded-lg border border-zinc-300 dark:border-zinc-700 w-full outline-none"
          />
        ) : (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {c.pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0" />}
            {isUnread && <Circle className="w-2 h-2 fill-blue-500 text-blue-500 shrink-0" />}
            <span className="truncate">{c.title}</span>
          </div>
        )}

        {/* Action buttons on Hover */}
        <div className="flex items-center gap-0.5 shrink-0 ml-1">
          {/* Quick Delete / Close button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Close / Delete chat "${c.title}"?`)) {
                onDeleteChat(c.id);
              }
            }}
            className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition cursor-pointer"
            title="Delete / Close Chat"
          >
            <Trash2 className="w-3 h-3" />
          </button>

          {/* Action Menu Trigger Button (⋮) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuChatId(isMenuOpen ? null : c.id);
              setActiveSubmenu(null);
            }}
            className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white opacity-0 group-hover:opacity-100 transition"
            title="Chat Options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Floating Context Menu */}
        {isMenuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-2 top-8 z-50 w-48 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-1.5 text-xs text-zinc-800 dark:text-zinc-200 font-sans space-y-0.5 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Pin / Unpin */}
            <button
              onClick={() => {
                onTogglePin(c.id, c.pinned);
                setActiveMenuChatId(null);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-left transition"
            >
              <div className="flex items-center gap-2">
                {c.pinned ? <PinOff className="w-3.5 h-3.5 text-amber-500" /> : <Pin className="w-3.5 h-3.5 text-amber-500" />}
                <span>{c.pinned ? 'Unpin' : 'Pin'}</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">P</span>
            </button>

            {/* Mark as Unread / Read */}
            <button
              onClick={() => handleToggleRead(c.id, c.is_read)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-left transition"
            >
              <div className="flex items-center gap-2">
                <Circle className={`w-3.5 h-3.5 ${isUnread ? 'text-zinc-400' : 'fill-blue-500 text-blue-500'}`} />
                <span>{isUnread ? 'Mark as Read' : 'Mark as Unread'}</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">U</span>
            </button>

            {/* Rename */}
            <button
              onClick={() => handleStartRename(c)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-left transition"
            >
              <div className="flex items-center gap-2">
                <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Rename</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">R</span>
            </button>

            {/* Add to Subject Submenu */}
            <div className="relative">
              <button
                onClick={() => setActiveSubmenu(activeSubmenu === 'project' ? null : 'project')}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-left transition"
              >
                <div className="flex items-center gap-2">
                  <FolderInput className="w-3.5 h-3.5 text-purple-500" />
                  <span>Add to Subject</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {activeSubmenu === 'project' && (
                <div className="absolute left-full top-0 ml-1 w-44 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-1.5 text-xs space-y-0.5">
                  <button
                    onClick={() => handleMoveToProject(c.id, null)}
                    className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 font-mono text-[11px]"
                  >
                    💬 General Workspace
                  </button>
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleMoveToProject(c.id, p.id)}
                      className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 font-mono text-[11px] truncate flex items-center gap-1.5"
                    >
                      <span>{p.icon || '📘'}</span>
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                  <div className="border-t border-zinc-200 dark:border-zinc-850 pt-1 mt-1">
                    <button
                      onClick={() => {
                        onOpenNewProject();
                        setActiveMenuChatId(null);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-blue-500 font-semibold"
                    >
                      + New Subject
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Move to Group Submenu */}
            <div className="relative">
              <button
                onClick={() => setActiveSubmenu(activeSubmenu === 'group' ? null : 'group')}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-left transition"
              >
                <div className="flex items-center gap-2">
                  <FolderOutput className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Move to Group</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {activeSubmenu === 'group' && (
                <div className="absolute left-full top-0 ml-1 w-44 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-1.5 text-xs space-y-0.5">
                  <button
                    onClick={() => handleMoveToGroup(c.id, null)}
                    className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 font-mono text-[11px]"
                  >
                    Ungrouped
                  </button>
                  {['Academics', 'Interviews', 'Exam Prep', 'Personal'].map((grp) => (
                    <button
                      key={grp}
                      onClick={() => handleMoveToGroup(c.id, grp)}
                      className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 font-mono text-[11px]"
                    >
                      📁 {grp}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Delete Chat */}
            <div className="border-t border-zinc-200 dark:border-zinc-850 pt-1 mt-1">
              <button
                onClick={() => {
                  if (confirm(`Delete conversation "${c.title}"?`)) {
                    onDeleteChat(c.id);
                  }
                  setActiveMenuChatId(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-rose-500/10 text-rose-500 font-semibold text-left transition"
              >
                <div className="flex items-center gap-2">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </div>
                <span className="text-[10px] font-mono text-rose-400">D</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-150"
        />
      )}

      <aside
        className={`h-screen w-64 bg-white dark:bg-[#101318] border-r border-zinc-200 dark:border-zinc-800/80 flex flex-col shrink-0 select-none z-50 font-sans text-zinc-900 dark:text-zinc-100 shadow-xs transition-all duration-200 ${
          isOpen ? 'fixed inset-y-0 left-0 md:static' : 'hidden md:flex'
        }`}
      >
        {/* Product Title Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
          <div>
            <button
              type="button"
              onClick={() => {
                onSelectProject(null);
                onSelectView('welcome');
              }}
              className="text-base font-extrabold text-zinc-950 dark:text-white tracking-tight flex items-center gap-2 hover:opacity-80 transition cursor-pointer text-left"
              title="Go to Welcome / Home"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-xs"></span>
              LearnForge
            </button>
            {activeProject ? (
              <button
                type="button"
                onClick={() => onSelectView('project_dashboard')}
                className="group/subj inline-flex items-center gap-1 text-[10px] font-mono text-blue-600 dark:text-blue-400 hover:underline mt-0.5 cursor-pointer text-left"
                title={`Open ${activeProject.name} Workspace`}
              >
                <span>Subject: {activeProject.name}</span>
                <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover/subj:opacity-100 transition" />
              </button>
            ) : (
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono block mt-0.5">
                General Workspace
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onTogglePinSidebar && (
              <button
                onClick={onTogglePinSidebar}
                className="p-1 rounded-lg text-zinc-400 hover:text-blue-500 transition cursor-pointer"
                title={isPinned ? 'Unpin Sidebar (Collapsible)' : 'Pin Sidebar'}
              >
                {isPinned ? <Pin className="w-3.5 h-3.5 text-blue-500" /> : <PinOff className="w-3.5 h-3.5 text-zinc-400" />}
              </button>
            )}
          </div>
        </div>

      {/* New Chat Primary Action Button */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800/80">
        <button
          onClick={onNewChat}
          className="w-full py-2.5 px-3 bg-blue-600 dark:bg-white text-white dark:text-zinc-950 font-bold rounded-xl hover:bg-blue-500 dark:hover:bg-zinc-200 transition text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{activeProject ? `New Chat in ${activeProject.name}` : 'New General Chat'}</span>
        </button>
      </div>

      {/* Quick Search Bar */}
      <div className="px-3 pt-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search chats & subjects..."
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-[#11151b] border border-zinc-200 dark:border-zinc-800/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500 transition"
          />
        </div>
      </div>

      {/* Scrollable Navigation Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* WORKSPACE Section */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono px-3 block">
            WORKSPACE
          </span>

          <button
            onClick={() => onSelectView('projects')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
              activeView === 'projects'
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold border-l-2 border-blue-500 shadow-2xs'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'
            }`}
          >
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span>Subjects Dashboard</span>
          </button>

          {/* General Chat Header & List */}
          <div>
            <div
              onClick={() => {
                onSelectProject(null);
                onSelectView('chat');
                setIsGeneralExpanded(!isGeneralExpanded);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer group ${
                activeProjectId === null && activeView === 'chat'
                  ? 'bg-zinc-100 dark:bg-zinc-850 text-zinc-950 dark:text-white font-semibold'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                <span>General Chat</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectProject(null);
                    onNewChat();
                  }}
                  className="p-1 rounded-lg text-zinc-400 hover:text-blue-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
                  title="New General Chat"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                {isGeneralExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                )}
              </div>
            </div>

            {/* General Chats Container */}
            {activeProjectId === null && isGeneralExpanded && (
              <div className="pl-2 ml-3 border-l border-zinc-200 dark:border-zinc-850 my-1 space-y-1">
                {/* Pinned Section */}
                {chats.filter((c) => !c.project_id && c.pinned && c.title.toLowerCase().includes(sidebarSearch.toLowerCase())).length > 0 && (
                  <div className="space-y-0.5 mb-2">
                    <span className="text-[10px] font-mono text-amber-500 font-bold uppercase px-3 block">
                      📌 PINNED
                    </span>
                    {chats.filter((c) => !c.project_id && c.pinned && c.title.toLowerCase().includes(sidebarSearch.toLowerCase())).map(renderChatItem)}
                  </div>
                )}

                {/* Ungrouped General Chats */}
                {chats.filter((c) => !c.project_id && !c.pinned && c.title.toLowerCase().includes(sidebarSearch.toLowerCase())).map(renderChatItem)}

                {chats.filter((c) => !c.project_id && c.title.toLowerCase().includes(sidebarSearch.toLowerCase())).length === 0 && (
                  <div className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectProject(null);
                        onNewChat();
                      }}
                      className="w-full py-2 px-3 text-center rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-500 hover:border-blue-500/50 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Start New General Chat</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SUBJECTS Section */}
        <div className="space-y-1 pt-1 border-t border-zinc-200 dark:border-zinc-850">
          <div className="flex items-center justify-between px-3 py-1.5">
            <button
              type="button"
              onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
              className="flex items-center gap-1.5 text-left group cursor-pointer"
            >
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono group-hover:text-zinc-950 dark:group-hover:text-white">
                SUBJECTS ({projects.length})
              </span>
              <span className="text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300">
                {isProjectsExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenNewProject}
              className="p-1 rounded-lg text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition cursor-pointer"
              title="Create New Subject"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {isProjectsExpanded && (
            <div className="space-y-1">
              {projects.map((proj) => {
                const isSelected = activeProjectId === proj.id;
                const isExpanded = isSubjectExpanded(proj.id);
                const projChats = chats.filter(
                  (c) => c.project_id === proj.id && c.title.toLowerCase().includes(sidebarSearch.toLowerCase())
                );
                const projPinned = projChats.filter((c) => c.pinned);
                const projUnpinned = projChats.filter((c) => !c.pinned);

                return (
                  <div key={proj.id} className="space-y-1">
                    <div
                      onClick={() => {
                        if (isSelected && isExpanded) {
                          setExpandedSubjectIds((prev) => ({ ...prev, [proj.id]: false }));
                        } else {
                          onSelectProject(proj.id);
                          onSelectView('project_dashboard');
                          setExpandedSubjectIds((prev) => ({ ...prev, [proj.id]: true }));
                        }
                      }}
                      className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-100 dark:bg-zinc-850 text-zinc-950 dark:text-white font-semibold border-l-2 border-blue-500'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => toggleSubjectExpanded(proj.id, e)}
                          className="p-0.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
                          title={isExpanded ? 'Collapse subject conversations' : 'Expand subject conversations'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span className="text-xs">{proj.icon || '📘'}</span>
                        <span className="truncate">{proj.name}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Plus button directly on Subject row */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProject(proj.id);
                            setExpandedSubjectIds((prev) => ({ ...prev, [proj.id]: true }));
                            onNewChat();
                          }}
                          className="p-1 rounded-lg text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                          title={`Start new chat in ${proj.name}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Action */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete subject "${proj.name}"?`)) {
                              onDeleteProject(proj.id);
                            }
                          }}
                          className="hidden group-hover:block p-1 text-zinc-400 hover:text-rose-500 cursor-pointer"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Per-Subject Chats Container */}
                    {isExpanded && (
                      <div className="pl-2 ml-3 border-l border-zinc-200 dark:border-zinc-850 my-1 space-y-1">
                        {projPinned.length > 0 && (
                          <div className="space-y-0.5 mb-2">
                            <span className="text-[10px] font-mono text-amber-500 font-bold uppercase px-3 block">
                              📌 PINNED
                            </span>
                            {projPinned.map(renderChatItem)}
                          </div>
                        )}
                        {projUnpinned.map(renderChatItem)}
                        {projChats.length === 0 && (
                          <div className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectProject(proj.id);
                                onNewChat();
                              }}
                              className="w-full py-2 px-3 text-center rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-dashed border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Start Chat in {proj.name}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* + New Subject Action Button */}
              <button
                onClick={onOpenNewProject}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-850 transition mt-2 shadow-xs cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5 text-blue-500" />
                <span>+ New Subject</span>
              </button>
            </div>
          )}
        </div>

        {/* WORKSPACE TOOLS Section */}
        <div className="space-y-1 pt-2 border-t border-zinc-200 dark:border-zinc-850">
          <button
            type="button"
            onClick={() => setIsToolsExpanded(!isToolsExpanded)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition cursor-pointer text-left group"
          >
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono group-hover:text-zinc-950 dark:group-hover:text-white">
              ADAPTIVE TOOLS
            </span>
            <span className="text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 p-0.5">
              {isToolsExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
          </button>

          {isToolsExpanded && (
            <div className="space-y-0.5">
              {(
                [
                  { id: 'dashboard', label: 'Adaptive Dashboard', icon: BarChart3 },
                  { id: 'custom_assessment', label: 'Assessments', icon: Award },
                  { id: 'learn', label: 'Learn', icon: Brain },
                  { id: 'knowledge', label: 'Knowledge', icon: Network },
                  { id: 'research', label: 'Research', icon: Compass },
                  { id: 'story_challenge', label: 'Story Challenge', icon: Zap },
                  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                  { id: 'evaluation_lab', label: 'Evaluation Lab', icon: FlaskConical },
                  { id: 'judge_control', label: 'Judge Control', icon: Eye },
                ] as const
              ).map((tool) => {
                const ToolIcon = tool.icon;
                const isActive = activeView === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => onSelectView(tool.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-zinc-100 dark:bg-zinc-850 text-zinc-950 dark:text-white font-semibold'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <ToolIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                    <span>{tool.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer Settings & Theme Toggle */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-850 flex items-center justify-between gap-2">
        <button
          onClick={onOpenSettings}
          className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition cursor-pointer"
        >
          <Settings className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <span>Settings</span>
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-blue-500 transition cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
        </button>
      </div>
    </aside>
  </>
);
};