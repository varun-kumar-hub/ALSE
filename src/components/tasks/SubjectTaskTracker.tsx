import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  BookOpen,
  Code2,
  HelpCircle,
  Search,
  X,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  SubjectTask,
  TaskPriority,
  TaskStatus,
  TaskType,
  TaskDifficulty,
  getTasksForSubject,
  createSubjectTask,
  updateSubjectTask,
  toggleTaskCompletion,
  deleteSubjectTask,
  resetSubjectTasksToDefault,
  getSubjectTaskStats,
  detectSubjectDomain,
  detectTopicDepth,
} from '../../services/taskService';
import { ProjectItem } from '../../services/database';

interface SubjectTaskTrackerProps {
  project: ProjectItem;
  onStartTaskAction?: (payload: { type: 'chat' | 'assessment' | 'story'; prompt?: string; concept_id?: string }) => void;
  onOpenStoryChallenge?: () => void;
  onOpenAssessment?: () => void;
}

export const SubjectTaskTracker: React.FC<SubjectTaskTrackerProps> = ({
  project,
  onStartTaskAction,
  onOpenStoryChallenge,
  onOpenAssessment,
}) => {
  const [tasks, setTasks] = useState<SubjectTask[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'in_progress' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newConcept, setNewConcept] = useState('');
  const [newType, setNewType] = useState<TaskType>('concept_mastery');
  const [newPriority, setNewPriority] = useState<TaskPriority>('high');
  const [newDifficulty, setNewDifficulty] = useState<TaskDifficulty>('intermediate');
  const [newMinutes, setNewMinutes] = useState(20);

  const loadTasks = () => {
    if (!project?.id) return;
    const list = getTasksForSubject(project.id, project);
    setTasks(list);
  };

  useEffect(() => {
    loadTasks();
  }, [project.id]);

  const stats = getSubjectTaskStats(project.id, project);

  const handleToggle = (taskId: string) => {
    toggleTaskCompletion(taskId, project.id);
    loadTasks();
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    updateSubjectTask(taskId, project.id, { status: newStatus });
    loadTasks();
  };

  const handleDelete = (taskId: string) => {
    deleteSubjectTask(taskId, project.id);
    loadTasks();
  };

  const handleReset = () => {
    resetSubjectTasksToDefault(project.id, project);
    setShowResetConfirm(false);
    loadTasks();
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    createSubjectTask(project.id, {
      title: newTitle.trim(),
      description: newDescription.trim() || `Master key principles and exercises for ${newTitle.trim()}`,
      concept_name: newConcept.trim() || undefined,
      type: newType,
      priority: newPriority,
      difficulty: newDifficulty,
      estimated_minutes: Number(newMinutes) || 15,
      status: 'todo',
      learning_gain_target: newPriority === 'high' ? 0.25 : 0.15,
      action_payload: {
        type: newType === 'story_challenge' ? 'story' : newType === 'diagnostic_quiz' ? 'assessment' : 'chat',
        prompt: `Let's begin an interactive learning task on "${newTitle.trim()}":\n\n${newDescription.trim()}`,
      },
    });

    setNewTitle('');
    setNewDescription('');
    setNewConcept('');
    setNewMinutes(20);
    setShowAddModal(false);
    loadTasks();
  };

  const handleExecuteTask = (task: SubjectTask) => {
    if (task.status === 'todo') {
      updateSubjectTask(task.id, project.id, { status: 'in_progress' });
      loadTasks();
    }

    if (task.type === 'story_challenge' && onOpenStoryChallenge) {
      onOpenStoryChallenge();
      return;
    }

    if (task.type === 'diagnostic_quiz' && onOpenAssessment) {
      onOpenAssessment();
      return;
    }

    if (task.action_payload && onStartTaskAction) {
      onStartTaskAction(task.action_payload);
    } else if (onStartTaskAction) {
      onStartTaskAction({
        type: 'chat',
        prompt: `Let's work through the learning milestone: "${task.title}".\n\nGoal: ${task.description}`,
      });
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.concept_name && t.concept_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    const matchesType = typeFilter === 'all' || t.type === typeFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesType;
  });

  const getTypeIcon = (type: TaskType) => {
    switch (type) {
      case 'concept_mastery':
        return <BookOpen className="w-3.5 h-3.5 text-blue-500" />;
      case 'diagnostic_quiz':
        return <HelpCircle className="w-3.5 h-3.5 text-amber-500" />;
      case 'story_challenge':
        return <Zap className="w-3.5 h-3.5 text-purple-500" />;
      case 'hands_on_coding':
        return <Code2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'prerequisite_review':
        return <RotateCcw className="w-3.5 h-3.5 text-orange-500" />;
      case 'reflection':
        return <Sparkles className="w-3.5 h-3.5 text-pink-500" />;
      default:
        return <Target className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const formatTypeName = (type: TaskType) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER SUMMARY CARD ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
              <Target className="w-4 h-4" />
              <span>SUBJECT MILESTONES & TASK TRACKER</span>
            </div>
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>{project.icon || '📘'}</span>
              <span>{project.name}</span>
            </h2>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-mono font-bold uppercase border border-blue-200 dark:border-blue-800">
                {detectSubjectDomain(project).replace('_', ' ')}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono font-semibold border border-zinc-200 dark:border-zinc-700">
                {detectTopicDepth(project).label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-blue-600 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold rounded-xl hover:bg-blue-500 dark:hover:bg-zinc-200 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              title="Reset tasks to default curriculum"
              className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="text-zinc-600 dark:text-zinc-400">
              Curriculum Progress: {stats.completed} of {stats.total} tasks completed
            </span>
            <span className="text-blue-600 dark:text-blue-400">{stats.progressPercent}%</span>
          </div>
          <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Mini Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="bg-zinc-50 dark:bg-zinc-850/60 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Completed</div>
            <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              {stats.completed} <span className="text-xs text-zinc-400 font-normal">/ {stats.total}</span>
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-850/60 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">In Progress</div>
            <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-0.5">
              {stats.inProgress}
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-850/60 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">Remaining Time</div>
            <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400 font-mono mt-0.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{stats.remainingMinutes}m</span>
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-850/60 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">High Priority Left</div>
            <div className="text-lg font-extrabold text-rose-600 dark:text-rose-400 font-mono mt-0.5">
              {stats.highPriorityRemaining}
            </div>
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input & Dropdowns */}
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search subject tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'all' | 'high' | 'medium' | 'low')}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 font-mono focus:outline-none cursor-pointer"
          >
            <option value="all">Priority: All</option>
            <option value="high">Priority: High</option>
            <option value="medium">Priority: Med</option>
            <option value="low">Priority: Low</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 font-mono focus:outline-none cursor-pointer"
          >
            <option value="all">Type: All Types</option>
            <option value="concept_mastery">Concept Mastery</option>
            <option value="diagnostic_quiz">Diagnostic Quiz</option>
            <option value="story_challenge">Story Challenge</option>
            <option value="hands_on_coding">Hands-on Coding</option>
            <option value="prerequisite_review">Prerequisite Review</option>
            <option value="reflection">Reflection</option>
          </select>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
          {(
            [
              { id: 'all', label: `All (${tasks.length})` },
              { id: 'todo', label: `To-Do (${stats.todo})` },
              { id: 'in_progress', label: `In Progress (${stats.inProgress})` },
              { id: 'completed', label: `Done (${stats.completed})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold font-mono whitespace-nowrap transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white font-bold shadow-2xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TASK CARDS LIST ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center space-y-3">
            <Target className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto" />
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-300">No tasks found</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'Get started by creating your first milestone task for this subject!'}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition cursor-pointer"
            >
              Create New Task
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isInProgress = task.status === 'in_progress';

            return (
              <div
                key={task.id}
                className={`bg-white dark:bg-zinc-900 border rounded-2xl p-4 md:p-5 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isCompleted
                    ? 'border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                    : isInProgress
                    ? 'border-blue-300 dark:border-blue-900/60 ring-1 ring-blue-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                {/* Left: Checkbox + Title + Description */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggle(task.id)}
                    className="mt-0.5 text-zinc-400 hover:text-emerald-500 transition cursor-pointer shrink-0"
                    title={isCompleted ? 'Mark as to-do' : 'Mark as completed'}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                    ) : (
                      <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-600 hover:text-blue-500" />
                    )}
                  </button>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4
                        className={`text-sm font-bold tracking-tight ${
                          isCompleted
                            ? 'line-through text-zinc-400 dark:text-zinc-500 font-medium'
                            : 'text-zinc-900 dark:text-white'
                        }`}
                      >
                        {task.title}
                      </h4>

                      {/* Concept Tag */}
                      {task.concept_name && (
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 rounded-md text-[10px] font-mono font-medium">
                          {task.concept_name}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-2">
                      {task.description}
                    </p>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {/* Type Chip */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md text-[10px] font-mono">
                        {getTypeIcon(task.type)}
                        <span>{formatTypeName(task.type)}</span>
                      </span>

                      {/* Priority Chip */}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${
                          task.priority === 'high'
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                            : task.priority === 'medium'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {task.priority}
                      </span>

                      {/* Difficulty Chip */}
                      <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 rounded-md text-[10px] font-mono">
                        {task.difficulty}
                      </span>

                      {/* Duration */}
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        <span>{task.estimated_minutes}m</span>
                      </span>

                      {/* Expected Gain */}
                      {task.learning_gain_target && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                          <TrendingUp className="w-3 h-3" />
                          <span>+{Math.round(task.learning_gain_target * 100)}% gain</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {/* Status Dropdown */}
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                    className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-[11px] font-mono text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
                  >
                    <option value="todo">To-Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>

                  {/* Start / Launch Task Action */}
                  <button
                    onClick={() => handleExecuteTask(task)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                      isCompleted
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        : 'bg-blue-600 text-white hover:bg-blue-500'
                    }`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isCompleted ? 'Review' : isInProgress ? 'Resume' : 'Start'}</span>
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    title="Delete milestone task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── ADD TASK MODAL ──────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-500" />
                <span>Add Milestone Task for {project.name}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-mono font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Log-Sum-Exp Trick in Softmax Loss"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-mono font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Description & Goal
                </label>
                <textarea
                  rows={2}
                  placeholder="What specifically will be mastered in this task?"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Concept / Domain
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Backpropagation"
                    value={newConcept}
                    onChange={(e) => setNewConcept(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-mono font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Task Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as TaskType)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none cursor-pointer"
                  >
                    <option value="concept_mastery">Concept Mastery</option>
                    <option value="diagnostic_quiz">Diagnostic Quiz</option>
                    <option value="story_challenge">Story Challenge</option>
                    <option value="hands_on_coding">Hands-on Coding</option>
                    <option value="prerequisite_review">Prerequisite Review</option>
                    <option value="reflection">Reflection & Takeaways</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-mono font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none cursor-pointer"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block font-mono font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(e.target.value as TaskDifficulty)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none cursor-pointer"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block font-mono font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Est. Minutes
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={newMinutes}
                    onChange={(e) => setNewMinutes(Number(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition cursor-pointer font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RESET CONFIRMATION MODAL ────────────────────────────────────────── */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-500" />
              <span>Reset Curriculum Tasks?</span>
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              This will restore all default milestone tasks for "{project.name}" back to their initial state.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-xl hover:bg-amber-500 cursor-pointer font-bold"
              >
                Yes, Reset Tasks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
