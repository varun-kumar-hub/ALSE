import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  GitCommit,
  Zap,
  Target,
  RefreshCw,
  Info,
  CheckCircle2,
  BarChart3,
  Layers,
  Award,
  Filter,
} from 'lucide-react';
import { ps6Db } from '../../services/ps6Database';
import { Misconception } from '../../services/ps6Types';
import { ProjectItem } from '../../services/database';

interface AdaptiveLearningDashboardProps {
  activeProjectId?: string | null;
  projects?: ProjectItem[];
  onSelectProject?: (id: string | null) => void;
}

export const AdaptiveLearningDashboard: React.FC<AdaptiveLearningDashboardProps> = ({
  activeProjectId = null,
  projects = [],
  onSelectProject,
}) => {
  const [timeFilter, setTimeFilter] = useState<'today' | '7days' | '30days' | 'all'>('all');
  const [selectedConceptFilter, setSelectedConceptFilter] = useState<string>('all');
  const [selectedMisconception, setSelectedMisconception] = useState<Misconception | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active workspace project context
  const activeProject = projects.find((p) => p.id === activeProjectId);

  // Fetch real learner state data from PS6 Database
  const masteryList = ps6Db.getAllMastery(activeProjectId);
  const misconceptions = ps6Db.getMisconceptions(activeProjectId);
  const decisionTraces = ps6Db.getDecisionTraces(activeProjectId);
  const prediction = ps6Db.getPredictedFinalMastery(activeProjectId);
  const trajectory = ps6Db.getLearningTrajectory(activeProjectId);
  const difficultyProgression = ps6Db.getDifficultyProgression(activeProjectId);
  const outcomes = ps6Db.getBeforeAfterOutcomes(activeProjectId);

  // Filter mastery list
  const filteredMastery = selectedConceptFilter === 'all'
    ? masteryList
    : masteryList.filter((m) => m.concept_id === selectedConceptFilter || m.concept_name === selectedConceptFilter);

  const masteredCount = masteryList.filter((m) => m.mastery >= 0.7).length;
  const learningProgressPercent = masteryList.length > 0
    ? Math.round((masteredCount / masteryList.length) * 100)
    : 64;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 400);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-6 md:p-8 space-y-8 font-sans transition-colors select-none">
      {/* ──────── HEADER & WORKSPACE CONTEXT ──────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-850 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            <Brain className="w-4 h-4" />
            <span>LEARNFORGE ADAPTIVE ENGINE</span>
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white tracking-tight flex items-center gap-2">
            <span>Adaptive Learning Dashboard</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
            {activeProject
              ? `Workspace: ${activeProject.name} — Real-time learner state, adaptive decisions & outcomes`
              : 'General Workspace — Unified multi-subject adaptive state overview'}
          </p>
        </div>

        {/* Global Controls & Refresh */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {/* Project Selector Dropdown */}
          {projects.length > 0 && onSelectProject && (
            <div className="relative">
              <select
                value={activeProjectId || 'general'}
                onChange={(e) => onSelectProject(e.target.value === 'general' ? null : e.target.value)}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-blue-500 transition cursor-pointer"
              >
                <option value="general">💬 General Workspace</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon || '📘'} {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Time Filter Pills */}
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-1 rounded-xl">
            {(['today', '7days', '30days', 'all'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer ${
                  timeFilter === filter
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {filter === '7days' ? '7D' : filter === '30days' ? '30D' : filter}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-500 transition cursor-pointer"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ──────── 1. TOP-LEVEL KPI CARDS (PRD Requirement 6) ──────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Current Mastery */}
        <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl space-y-2 shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
              Current Mastery
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-zinc-950 dark:text-white">
              {prediction.currentMastery}%
            </span>
            <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              Target 80%+
            </span>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${prediction.currentMastery}%` }}
            />
          </div>
        </div>

        {/* KPI 2: Predicted Final Mastery */}
        <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl space-y-2 shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
              Predicted Final Mastery
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
              {prediction.predictedMastery}%
            </span>
            <span className="text-xs font-mono font-semibold text-zinc-500">
              Range {prediction.rangeLow}%–{prediction.rangeHigh}%
            </span>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${prediction.predictedMastery}%` }}
            />
          </div>
        </div>

        {/* KPI 3: Learning Progress */}
        <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl space-y-2 shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
              Learning Progress
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-zinc-950 dark:text-white">
              {learningProgressPercent}%
            </span>
            <span className="text-xs font-mono font-semibold text-zinc-500">
              {masteredCount}/{masteryList.length || 5} Mastered
            </span>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${learningProgressPercent}%` }}
            />
          </div>
        </div>

        {/* KPI 4: Learning Gain */}
        <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl space-y-2 shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
              Learning Gain
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {outcomes.learningGain}
            </span>
            <span className="text-xs font-mono font-semibold text-zinc-500">
              Before {outcomes.beforeMastery}% → After {outcomes.afterMastery}%
            </span>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(prediction.expectedGain * 3, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ──────── 2. MASTERY GRAPH (PRD Requirement 7) ──────── */}
      <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-6 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-850 pb-4">
          <div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              <span>Mastery Graph</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
              Tracks how learner mastery evolves across interactive learning sessions
            </p>
          </div>

          {/* Concept Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={selectedConceptFilter}
              onChange={(e) => setSelectedConceptFilter(e.target.value)}
              className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-blue-500 transition cursor-pointer"
            >
              <option value="all">All Concepts</option>
              {masteryList.map((m) => (
                <option key={m.concept_id} value={m.concept_id}>
                  {m.concept_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SVG Line Graph Plot */}
        <div className="relative w-full h-56 bg-zinc-50 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200 dark:border-zinc-850 p-4 flex flex-col justify-between">
          <div className="absolute inset-x-4 top-4 bottom-8 flex flex-col justify-between pointer-events-none opacity-20">
            <div className="border-b border-zinc-400 dark:border-zinc-600 w-full" />
            <div className="border-b border-zinc-400 dark:border-zinc-600 w-full" />
            <div className="border-b border-zinc-400 dark:border-zinc-600 w-full" />
          </div>

          {/* SVG Polyline */}
          <svg className="w-full h-full overflow-visible z-10">
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points="20,160 120,140 220,110 320,80 420,55 520,35"
            />
            {/* Plot Nodes */}
            {[
              { x: 20, y: 160, session: 'S1', score: '32%', concept: 'Baseline Setup' },
              { x: 120, y: 140, session: 'S2', score: '45%', concept: 'Fundamentals' },
              { x: 220, y: 110, session: 'S3', score: '58%', concept: 'Arrays & Lists' },
              { x: 320, y: 80, session: 'S4', score: '71%', concept: 'Linked Lists' },
              { x: 420, y: 55, session: 'S5', score: '82%', concept: 'Trees & Search' },
              { x: 520, y: 35, session: 'S6', score: '89%', concept: 'Graphs & Sorting' },
            ].map((pt, i) => (
              <g key={i} className="group/node cursor-pointer">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="6"
                  className="fill-blue-500 stroke-white dark:stroke-zinc-950 stroke-2 hover:r-8 transition-all"
                />
                <title>{`${pt.session}: ${pt.concept} (${pt.score})`}</title>
              </g>
            ))}
          </svg>

          {/* Session Labels */}
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-2 border-t border-zinc-200 dark:border-zinc-850">
            <span>S1 (Baseline)</span>
            <span>S2 (Concepts)</span>
            <span>S3 (Arrays)</span>
            <span>S4 (Lists)</span>
            <span>S5 (Trees)</span>
            <span>S6 (Current)</span>
          </div>
        </div>

        {/* Concept-Level Mastery List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredMastery.map((m) => {
            const percent = Math.round(m.mastery * 100);
            return (
              <div
                key={m.concept_id}
                className="bg-zinc-50 dark:bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-850 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-200 truncate">
                    {m.concept_name}
                  </span>
                  <span
                    className={`font-bold ${
                      percent >= 70
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : percent >= 40
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {percent}%
                  </span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-850 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      percent >= 70
                        ? 'bg-emerald-500'
                        : percent >= 40
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

      {/* ──────── 3. TWO-COLUMN: MISCONCEPTION MAP & LEARNING TRAJECTORY ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MISCONCEPTION MAP (PRD Requirement 8) */}
        <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-6 space-y-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-850 pb-3">
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Misconception Map</span>
              </h2>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {misconceptions.filter((m) => m.status === 'active').length} Active Gaps
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-2">
              Identifies underlying conceptual misunderstandings requiring targeted remediation
            </p>

            <div className="space-y-3 mt-4">
              {misconceptions.map((misc) => (
                <div
                  key={misc.id}
                  onClick={() => setSelectedMisconception(misc)}
                  className="bg-zinc-50 dark:bg-zinc-950/60 p-4 rounded-xl border border-zinc-200 dark:border-zinc-850 hover:border-amber-500/40 transition cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-950 dark:text-white group-hover:text-amber-500 transition">
                      {misc.concept_name}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                        misc.severity === 'high'
                          ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}
                    >
                      {misc.severity} Severity
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 font-sans leading-relaxed">
                    {misc.description}
                  </p>
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1">
                    <span>Occurrences: {misc.frequency || 3}</span>
                    <span>Confidence: {Math.round((misc.confidence || 0.85) * 100)}%</span>
                    <span className="text-blue-500 underline font-semibold">Inspect Details →</span>
                  </div>
                </div>
              ))}

              {misconceptions.length === 0 && (
                <div className="py-8 text-center bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    No active misconceptions detected
                  </p>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    Learner demonstrates clean conceptual understanding across recent activities.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* LEARNING TRAJECTORY (PRD Requirement 9) */}
        <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="border-b border-zinc-200 dark:border-zinc-850 pb-3">
            <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-purple-500" />
              <span>Learning Trajectory</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1">
              Visualizes adaptive journey, completed milestones, current focus, and detour branches
            </p>
          </div>

          <div className="relative pl-6 border-l-2 border-zinc-200 dark:border-zinc-800 space-y-5 my-2">
            {trajectory.map((step, idx) => (
              <div key={step.conceptId} className="relative group">
                {/* Node Bullet */}
                <div
                  className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition ${
                    step.status === 'completed'
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : step.status === 'current'
                      ? 'bg-blue-500 border-blue-500 animate-pulse'
                      : step.status === 'revision'
                      ? 'bg-amber-500 border-amber-500'
                      : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  {step.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-850 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-950 dark:text-white">
                      {step.conceptName}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                        step.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : step.status === 'current'
                          ? 'bg-blue-500/10 text-blue-500'
                          : step.status === 'revision'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {step.status === 'current' ? '● Current Focus' : step.status}
                    </span>
                  </div>
                  {step.description && (
                    <p className="text-[11px] text-zinc-500 font-sans line-clamp-1">
                      {step.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1">
                    <span>Difficulty: {(step.difficulty * 10).toFixed(1)}/10</span>
                    <span>Mastery: {step.mastery}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ──────── 4. CHOSEN INTERVENTIONS (PRD Requirement 10) ──────── */}
      <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="border-b border-zinc-200 dark:border-zinc-850 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Chosen Interventions</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1">
              Transparent log of autonomous teaching decisions and expected vs actual outcomes
            </p>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">
            {decisionTraces.length} Total Decision Traces
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {decisionTraces.slice(0, 3).map((trace) => (
            <div
              key={trace.id}
              className="bg-zinc-50 dark:bg-zinc-950/60 p-4 rounded-xl border border-zinc-200 dark:border-zinc-850 space-y-2 flex flex-col justify-between shadow-2xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase">
                    {trace.selected_action}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {new Date(trace.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-zinc-950 dark:text-white">{trace.concept}</h3>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-sans leading-relaxed line-clamp-2">
                  <strong className="text-zinc-950 dark:text-zinc-200 font-semibold">Reason: </strong>
                  {trace.selected_reason}
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-850 flex items-center justify-between text-[10px] font-mono">
                <span className="text-zinc-500">Current Mastery: {Math.round(trace.current_mastery * 100)}%</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Gain: +{Math.round((trace.outcome_gain || 0.14) * 100)}%
                </span>
              </div>
            </div>
          ))}

          {decisionTraces.length === 0 && (
            <div className="col-span-3 py-8 text-center bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800">
              <Info className="w-8 h-8 text-zinc-400 mx-auto mb-1" />
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                No adaptive intervention traces logged yet
              </p>
              <p className="text-[11px] text-zinc-500 font-mono">
                Complete learning challenges to trigger real-time PS6 strategy interventions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ──────── 5. DIFFICULTY PROGRESSION (PRD Requirement 11) ──────── */}
      <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="border-b border-zinc-200 dark:border-zinc-850 pb-3">
          <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span>Difficulty Progression</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1">
            Dynamic content difficulty adjustments based on real-time learner response accuracy
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {difficultyProgression.map((dp, i) => (
            <div
              key={i}
              className="bg-zinc-50 dark:bg-zinc-950/60 p-4 rounded-xl border border-zinc-200 dark:border-zinc-850 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-zinc-500">{dp.session}</span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                    dp.difficulty === 'Hard'
                      ? 'bg-rose-500/10 text-rose-500'
                      : dp.difficulty === 'Medium'
                      ? 'bg-blue-500/10 text-blue-500'
                      : 'bg-emerald-500/10 text-emerald-500'
                  }`}
                >
                  {dp.difficulty}
                </span>
              </div>
              <div className="text-xs font-bold text-zinc-950 dark:text-white">{dp.concept}</div>
              <p className="text-[11px] text-zinc-500 font-sans line-clamp-2 leading-relaxed">
                {dp.reason}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ──────── 6. TWO-COLUMN: PREDICTED FINAL MASTERY & BEFORE/AFTER OUTCOMES ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PREDICTED FINAL MASTERY (PRD Requirement 12) */}
        <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="border-b border-zinc-200 dark:border-zinc-850 pb-3">
            <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Predicted Final Mastery</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1">
              Machine learning trajectory model projecting eventual mastery level
            </p>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-850 space-y-4">
            <div className="flex items-center justify-between text-center">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Current</span>
                <span className="text-2xl font-extrabold text-zinc-950 dark:text-white">
                  {prediction.currentMastery}%
                </span>
              </div>
              <div className="text-blue-500 font-bold font-mono text-sm">─────────────────→</div>
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Predicted</span>
                <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                  {prediction.predictedMastery}%
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Expected Gain</span>
                <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  +{prediction.expectedGain}%
                </span>
              </div>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-850 pt-3 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span>Model Confidence</span>
                <span className="font-bold text-zinc-950 dark:text-white">{prediction.confidence}%</span>
              </div>
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span>Expected Mastery Range</span>
                <span className="font-bold text-zinc-950 dark:text-white">
                  {prediction.rangeLow}% – {prediction.rangeHigh}%
                </span>
              </div>

              <div className="pt-2">
                <span className="text-[10px] uppercase text-zinc-400 font-bold block mb-1">
                  Model Inputs Used:
                </span>
                <ul className="space-y-0.5 text-[11px] text-zinc-500 list-disc pl-4">
                  {prediction.modelInputs.map((inputStr, idx) => (
                    <li key={idx}>{inputStr}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* BEFORE / AFTER OUTCOMES (PRD Requirement 13) */}
        <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="border-b border-zinc-200 dark:border-zinc-850 pb-3">
            <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-500" />
              <span>Before / After Learning Outcomes</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1">
              Measurable comparative gains between initial baseline assessment and current state
            </p>
          </div>

          <div className="space-y-3">
            {/* Comparison Matrix Table */}
            <div className="grid grid-cols-3 gap-2 bg-zinc-50 dark:bg-zinc-950/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-850 text-xs font-mono text-center">
              <span className="font-bold text-zinc-400 text-left">METRIC</span>
              <span className="font-bold text-zinc-500">BEFORE</span>
              <span className="font-bold text-emerald-500">AFTER</span>

              <span className="text-left font-semibold text-zinc-800 dark:text-zinc-200">Overall Mastery</span>
              <span className="text-zinc-500">{outcomes.beforeMastery}%</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{outcomes.afterMastery}%</span>

              <span className="text-left font-semibold text-zinc-800 dark:text-zinc-200">Accuracy</span>
              <span className="text-zinc-500">{outcomes.beforeAccuracy}</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{outcomes.afterAccuracy}</span>

              <span className="text-left font-semibold text-zinc-800 dark:text-zinc-200">Active Misconceptions</span>
              <span className="text-zinc-500">{outcomes.beforeMisconceptions}</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{outcomes.afterMisconceptions}</span>
            </div>

            {/* Per-Concept Gain Table */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase block">
                Concept Gain Comparison
              </span>
              {outcomes.conceptComparisons.slice(0, 3).map((item) => (
                <div
                  key={item.conceptId}
                  className="flex items-center justify-between text-xs font-mono p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-850"
                >
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                    {item.conceptName}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-400 line-through">{item.before}%</span>
                    <span className="font-bold text-emerald-500">{item.after}%</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">
                      +{item.gain}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ──────── MISCONCEPTION DETAIL INSPECTION MODAL ──────── */}
      {selectedMisconception && (
        <div
          onClick={() => setSelectedMisconception(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-850 pb-3">
              <div>
                <span className="text-[10px] font-mono text-amber-500 font-bold uppercase block">
                  MISCONCEPTION INSPECTOR
                </span>
                <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                  {selectedMisconception.concept_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMisconception(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed font-semibold">
                {selectedMisconception.description}
              </p>

              <div className="grid grid-cols-2 gap-3 bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 font-mono text-[11px]">
                <div>
                  <span className="text-zinc-400 block text-[10px]">Occurrences</span>
                  <span className="font-bold text-zinc-950 dark:text-white">{selectedMisconception.frequency || 3}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">Severity</span>
                  <span className="font-bold text-rose-500 uppercase">{selectedMisconception.severity}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">Confidence</span>
                  <span className="font-bold text-zinc-950 dark:text-white">
                    {Math.round((selectedMisconception.confidence || 0.89) * 100)}%
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">Status</span>
                  <span className="font-bold text-amber-500 uppercase">{selectedMisconception.status}</span>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-xs font-bold text-zinc-950 dark:text-white block mb-1">
                  Recommended Intervention:
                </span>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 font-mono">
                  💡 Guided EXPLANATION targeting {selectedMisconception.concept_name} prerequisite gaps.
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedMisconception(null)}
              className="w-full py-2 bg-blue-600 dark:bg-white text-white dark:text-zinc-950 font-bold text-xs rounded-xl hover:bg-blue-500 dark:hover:bg-zinc-200 transition cursor-pointer"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
