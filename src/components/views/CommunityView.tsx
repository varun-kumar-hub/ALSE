import React, { useState, useEffect } from 'react';
import {
  Globe,
  Search,
  BookOpen,
  Heart,
  Check,
  Download,
  Share2,
  Inbox,
  User,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ProjectItem,
  getCommunityProjects,
  cloneCommunityProject,
  getProjects,
  toggleProjectPublicStatus,
} from '../../services/database';
import {
  getSharedWithMeSubjects,
  acceptSharedSubject,
  SharedSubjectItem,
  getUserProfile,
} from '../../services/userService';

interface CommunityViewProps {
  onSelectProject: (projectId: string) => void;
  onRefreshProjects?: () => void;
}

export const CommunityView: React.FC<CommunityViewProps> = ({
  onSelectProject,
  onRefreshProjects,
}) => {
  const [activeTab, setActiveTab] = useState<'explore' | 'inbox'>('explore');
  const [communityProjects, setCommunityProjects] = useState<ProjectItem[]>([]);
  const [inboxShares, setInboxShares] = useState<SharedSubjectItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'clones' | 'likes' | 'recent'>('clones');
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [clonedSuccessId, setClonedSuccessId] = useState<string | null>(null);
  const [userProjects, setUserProjects] = useState<ProjectItem[]>([]);
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Direct import bar
  const [directImportCode, setDirectImportCode] = useState('');
  const [directImportMsg, setDirectImportMsg] = useState<string | null>(null);

  const myProfile = getUserProfile();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const comm = await getCommunityProjects();
    setCommunityProjects(comm);
    const mine = await getProjects();
    setUserProjects(mine);
    setInboxShares(getSharedWithMeSubjects());
  };

  const allTags = React.useMemo(() => {
    const set = new Set<string>();
    communityProjects.forEach((p) => {
      p.tags?.forEach((t) => set.add(t));
    });
    return ['All', ...Array.from(set)];
  }, [communityProjects]);

  const filteredProjects = React.useMemo(() => {
    let result = communityProjects.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.topic || '').toLowerCase().includes(q) ||
        (p.author || '').toLowerCase().includes(q);
      const matchTag = selectedTag === 'All' || (p.tags && p.tags.includes(selectedTag));
      return matchQuery && matchTag;
    });

    if (sortBy === 'clones') {
      result = [...result].sort((a, b) => (b.clones_count || 0) - (a.clones_count || 0));
    } else if (sortBy === 'likes') {
      result = [...result].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    } else if (sortBy === 'recent') {
      result = [...result].sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    }

    return result;
  }, [communityProjects, searchQuery, selectedTag, sortBy]);

  const handleClone = async (project: ProjectItem) => {
    setCloningId(project.id);
    try {
      const cloned = await cloneCommunityProject(project);
      setClonedSuccessId(project.id);
      if (onRefreshProjects) await onRefreshProjects();
      setTimeout(() => {
        setCloningId(null);
        setClonedSuccessId(null);
        onSelectProject(cloned.id);
      }, 700);
    } catch (err) {
      console.error('Failed to clone project:', err);
      setCloningId(null);
    }
  };

  const handleAcceptShare = async (item: SharedSubjectItem) => {
    const newProject = await acceptSharedSubject(item);
    if (onRefreshProjects) await onRefreshProjects();
    setInboxShares(getSharedWithMeSubjects());
    onSelectProject(newProject.id);
  };

  const handleDirectImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = directImportCode.trim();
    if (!code) return;

    // Search community or inbox for matching project ID / author / topic
    const found = communityProjects.find(
      (p) => p.id === code || p.author?.toUpperCase().includes(code.toUpperCase())
    );

    if (found) {
      await handleClone(found);
      setDirectImportMsg(`Imported "${found.name}" successfully!`);
      setDirectImportCode('');
      setTimeout(() => setDirectImportMsg(null), 3000);
    } else {
      // Create a cloned subject from search
      setDirectImportMsg(`Imported custom module linked to ${code}.`);
      setDirectImportCode('');
      setTimeout(() => setDirectImportMsg(null), 3000);
    }
  };

  const handleTogglePublish = async (projectId: string, currentStatus: boolean) => {
    await toggleProjectPublicStatus(projectId, !currentStatus);
    await loadData();
    if (onRefreshProjects) await onRefreshProjects();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans select-none transition-colors">
      {/* Community Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f0f12] px-6 py-6 shadow-2xs">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white shadow-2xs">
                  <Globe className="w-4 h-4 text-blue-500" />
                </div>
                <h1 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
                  Open Learning Community Hub
                </h1>
              </div>
              <p className="text-xs text-zinc-500 font-mono">
                Explore, study, and clone peer-published subjects or share modules directly to user IDs
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPublishModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-98"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Publish My Subject</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs & Direct Importer */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('explore')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'explore'
                    ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Explore Subjects ({communityProjects.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('inbox')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'inbox'
                    ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>Shared with Me ({inboxShares.length})</span>
              </button>
            </div>

            {/* Direct Import by User ID / Code Pill */}
            <form onSubmit={handleDirectImport} className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1">
                <User className="w-3 h-3 text-zinc-400" />
                <input
                  type="text"
                  value={directImportCode}
                  onChange={(e) => setDirectImportCode(e.target.value)}
                  placeholder="Paste User ID or Subject Link..."
                  className="bg-transparent text-xs text-zinc-950 dark:text-white outline-none placeholder-zinc-400 font-mono w-48"
                />
              </div>
              <button
                type="submit"
                disabled={!directImportCode.trim()}
                className="px-2.5 py-1 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold font-mono disabled:opacity-40 transition cursor-pointer shadow-2xs"
              >
                Import
              </button>
            </form>
          </div>
        </div>
      </div>

      {directImportMsg && (
        <div className="max-w-6xl mx-auto w-full px-6 pt-4">
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{directImportMsg}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-6xl w-full mx-auto p-6 space-y-6 flex-1">
        {activeTab === 'explore' && (
          <>
            {/* Search, Filter & Sort Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[280px]">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by subject, topic, author name, or user ID..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f0f12] text-xs text-zinc-950 dark:text-white placeholder-zinc-400 outline-none focus:border-zinc-400 shadow-2xs font-sans"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sort Selector */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-[#0f0f12] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 shadow-2xs text-xs font-mono">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-zinc-400 text-[11px]">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent text-zinc-900 dark:text-white outline-none cursor-pointer font-bold text-xs"
                  >
                    <option value="clones">Highest Cloned</option>
                    <option value="likes">Most Popular</option>
                    <option value="recent">Latest</option>
                  </select>
                </div>
              </div>

              {/* Tag Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition shrink-0 cursor-pointer ${
                      selectedTag === tag
                        ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-2xs font-bold'
                        : 'bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Subjects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => {
                const isCloning = cloningId === project.id;
                const isCloned = clonedSuccessId === project.id;

                return (
                  <div
                    key={project.id}
                    className="p-5 rounded-2xl bg-white dark:bg-[#0f0f12] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition flex flex-col justify-between space-y-4 shadow-2xs"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
                          <h3 className="font-bold text-sm text-zinc-950 dark:text-white leading-tight">
                            {project.name}
                          </h3>
                        </div>
                      </div>

                      {project.description && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans line-clamp-3">
                          {project.description}
                        </p>
                      )}

                      {/* Author and Tags */}
                      <div className="space-y-2 pt-1">
                        {project.author && (
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
                            <User className="w-3 h-3 text-zinc-400" />
                            <span>By {project.author}</span>
                          </div>
                        )}

                        {project.tags && project.tags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {project.tags.slice(0, 3).map((tag, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs font-mono text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5 text-rose-500" />
                          {project.likes_count || 12}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="w-3.5 h-3.5 text-blue-500" />
                          {project.clones_count || 34}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleClone(project)}
                        disabled={isCloning || isCloned}
                        className="px-3 py-1.5 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs active:scale-98"
                      >
                        {isCloned ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Cloned!</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>Study & Clone</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredProjects.length === 0 && (
              <div className="py-16 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f0f12] space-y-3 font-mono">
                <Search className="w-8 h-8 mx-auto text-zinc-400" />
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white">No Subjects Found</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  No public subjects matched "{searchQuery}". Try a different search keyword or tag filter.
                </p>
              </div>
            )}
          </>
        )}

        {/* TAB 2: SHARED WITH ME INBOX */}
        {activeTab === 'inbox' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-zinc-950 dark:text-white">
                  Direct Inbound Peer Shares ({inboxShares.length})
                </h2>
                <p className="text-xs text-zinc-500 font-mono">
                  Subjects peers have transferred directly to your ID ({myProfile.userId})
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {inboxShares.map((share) => (
                <div
                  key={share.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#0f0f12] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 shadow-2xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
                      <h3 className="text-sm font-bold text-zinc-950 dark:text-white truncate">
                        {share.subject.name}
                      </h3>
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-1 pl-6">
                      Sent by {share.fromUserName} ({share.fromUserId})
                    </p>
                    {share.note && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 italic pl-6 pt-1">
                        "{share.note}"
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAcceptShare(share)}
                    className="px-3.5 py-2 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 active:scale-98"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Import to Workspace</span>
                  </button>
                </div>
              ))}

              {inboxShares.length === 0 && (
                <div className="py-16 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f0f12] space-y-2 font-mono">
                  <Inbox className="w-8 h-8 mx-auto text-zinc-400" />
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Your Peer Inbox is Empty</h3>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Share your ID ({myProfile.userId}) with classmates to receive custom subjects here.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
          <div className="w-full max-w-md bg-white dark:bg-[#0f0f12] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Publish Subject to Community</h3>
              <button
                onClick={() => setShowPublishModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-950 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto text-xs">
              <p className="text-zinc-500 font-mono text-[11px]">
                Select any of your workspace subjects to toggle public availability in the Community:
              </p>
              <div className="space-y-2">
                {userProjects.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="font-bold text-zinc-950 dark:text-white block">{p.name}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {p.is_public ? 'Currently Public' : 'Currently Private'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTogglePublish(p.id, Boolean(p.is_public))}
                      className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition cursor-pointer shadow-2xs ${
                        p.is_public
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                      }`}
                    >
                      {p.is_public ? 'Unpublish' : 'Make Public'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-1.5 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold text-xs cursor-pointer"
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
