import React, { useState } from 'react';
import {
  FolderPlus,
  Search,
  Plus,
  ArrowRight,
  BookOpen,
  Trash2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ProjectItem } from '../../services/database';
import { ps6Db } from '../../services/ps6Database';
import { ConceptMastery } from '../../services/ps6Types';

interface ProjectsViewProps {
  projects: ProjectItem[];
  onSelectProject: (projectId: string) => void;
  onOpenNewProject: () => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  onSelectProject,
  onOpenNewProject,
  onDeleteProject,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'archived'>('all');

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.topic && p.topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filterMode === 'archived') return matchesSearch && p.is_archived;
    if (filterMode === 'active') return matchesSearch && !p.is_archived;
    return matchesSearch;
  });

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-6 md:p-8 space-y-6 transition-colors">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-850 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-blue-500" />
            <span>Learning Subjects</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
            Organize your learning into focused, autonomous adaptive subject workspaces
          </p>
        </div>

        <button
          onClick={onOpenNewProject}
          className="px-4 py-2.5 bg-blue-600 dark:bg-white text-white dark:text-zinc-950 font-bold rounded-xl hover:bg-blue-500 dark:hover:bg-zinc-200 transition text-xs flex items-center gap-2 shadow-sm self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Subject</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-1 rounded-xl w-full sm:w-auto">
          {(['all', 'active', 'archived'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider font-mono transition cursor-pointer ${
                filterMode === mode
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-bold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Subjects Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProjects.map((proj) => {
          const concepts = ps6Db.getConcepts(proj.id);
          const masteryList = ps6Db.getAllMastery(proj.id);

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
            )?.concept_name ||
            concepts[0]?.name ||
            'Core Fundamentals';

          return (
            <div
              key={proj.id}
              className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-2xl p-5 flex flex-col justify-between transition group shadow-sm hover:shadow-md"
            >
              <div className="space-y-4">
                {/* Header Row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-lg shadow-xs">
                      {proj.icon || '📘'}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-zinc-950 dark:text-white group-hover:text-blue-500 transition">
                        {proj.name}
                      </h3>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono block">
                        {proj.topic || 'General Learning'}
                      </span>
                    </div>
                  </div>

                  {!['data-structures', 'agririsk', 'adaptive-learning'].includes(proj.id) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete subject "${proj.name}"?`)) {
                          onDeleteProject(proj.id);
                        }
                      }}
                      className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Description */}
                {proj.description && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed font-sans">
                    {proj.description}
                  </p>
                )}

                {/* Mastery & Progress Indicators */}
                <div className="grid grid-cols-2 gap-3 bg-zinc-50 dark:bg-zinc-950/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-850">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block">
                      Overall Mastery
                    </span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{avgMastery}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block">
                      Progress
                    </span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{progressPercent}%</span>
                  </div>
                </div>

                {/* Current Learning Concept */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block">
                    Current Topic
                  </span>
                  <div className="flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">{currentConcept}</span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-5 border-t border-zinc-200 dark:border-zinc-850/80 mt-4 flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Active</span>
                </span>

                <button
                  onClick={() => onSelectProject(proj.id)}
                  className="px-3.5 py-1.5 bg-blue-600 dark:bg-white text-white dark:text-zinc-950 font-bold rounded-xl hover:bg-blue-500 dark:hover:bg-zinc-200 transition text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <div className="py-16 text-center space-y-3 bg-white dark:bg-zinc-900/40 rounded-2xl border border-zinc-200 dark:border-zinc-850">
          <FolderPlus className="w-10 h-10 text-zinc-400 dark:text-zinc-600 mx-auto" />
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-300">No learning subjects found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto font-mono">
            Create a subject workspace to organize your chats, adaptive learner state, and mastery tracking.
          </p>
          <button
            onClick={onOpenNewProject}
            className="px-4 py-2 bg-blue-600 dark:bg-white text-white dark:text-zinc-950 font-bold rounded-xl hover:bg-blue-500 dark:hover:bg-zinc-200 transition text-xs inline-flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Subject</span>
          </button>
        </div>
      )}
    </div>
  );
};
