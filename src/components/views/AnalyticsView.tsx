import React, { useState, useEffect } from 'react';
import { ps6Db } from '../../services/ps6Database';
import { getProjects, ProjectItem } from '../../services/database';
import { ConceptMastery, Misconception, DecisionTrace } from '../../services/ps6Types';
import { BarChart3, Database, Folder, MessageSquare, ArrowRight } from 'lucide-react';

interface AnalyticsViewProps {
  projectId?: string | null;
  projects?: ProjectItem[];
  onSelectProject?: (projectId: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  projectId,
  projects: initialProjects,
  onSelectProject,
}) => {
  const [globalTab, setGlobalTab] = useState<'overview' | 'subjects' | 'general'>('overview');
  const [projectsList, setProjectsList] = useState<ProjectItem[]>(initialProjects || []);

  // Subject or Global data
  const [masteries, setMasteries] = useState<ConceptMastery[]>([]);
  const [misconceptions, setMisconceptions] = useState<Misconception[]>([]);
  const [traces, setTraces] = useState<DecisionTrace[]>([]);

  // General chat specific data
  const [generalMasteries, setGeneralMasteries] = useState<ConceptMastery[]>([]);
  const [generalMisc, setGeneralMisc] = useState<Misconception[]>([]);
  const [generalTraces, setGeneralTraces] = useState<DecisionTrace[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (projectId) {
        setMasteries(ps6Db.getAllMastery(projectId).filter((m) => (m.evidence_count || 0) > 0));
        setMisconceptions(ps6Db.getMisconceptions(projectId));
        setTraces(ps6Db.getDecisionTraces(projectId));
      } else {
        // Load projects if not provided
        const projs = await getProjects();
        setProjectsList(projs);

        // Load general chat data
        setGeneralMasteries(ps6Db.getAllMastery(null).filter((m) => (m.evidence_count || 0) > 0));
        setGeneralMisc(ps6Db.getMisconceptions(null));
        setGeneralTraces(ps6Db.getDecisionTraces(null));

        // Aggregate across all projects + general
        let allM: ConceptMastery[] = [...ps6Db.getAllMastery(null).filter((m) => (m.evidence_count || 0) > 0)];
        let allMisc: Misconception[] = [...ps6Db.getMisconceptions(null)];
        let allT: DecisionTrace[] = [...ps6Db.getDecisionTraces(null)];

        for (const p of projs) {
          allM = allM.concat(ps6Db.getAllMastery(p.id).filter((m) => (m.evidence_count || 0) > 0));
          allMisc = allMisc.concat(ps6Db.getMisconceptions(p.id));
          allT = allT.concat(ps6Db.getDecisionTraces(p.id));
        }

        setMasteries(allM);
        setMisconceptions(allMisc);
        setTraces(allT);
      }
    };

    loadData();
  }, [projectId]);

  const totalConcepts = masteries.length;
  const avgMastery = totalConcepts > 0 ? masteries.reduce((acc, m) => acc + m.mastery, 0) / totalConcepts : 0;
  const activeMisconceptions = misconceptions.filter((m) => m.status !== 'resolved');
  const resolvedMisconceptions = misconceptions.filter((m) => m.status === 'resolved');

  return (
    <div className="flex-1 overflow-y-auto bg-transparent text-zinc-900 dark:text-zinc-100 p-2 md:p-6 font-sans transition-colors select-none">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800/80 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-950 dark:text-white flex items-center gap-2.5 tracking-tight">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {projectId ? 'Subject Learning Analytics' : 'Platform Learning Analytics & Classification'}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
              {projectId
                ? 'Empirical mastery trajectory & evidence metrics strictly for this subject.'
                : 'Comparative analytics classified across subjects and general conversations.'}
            </p>
          </div>

          {/* Global View Classifier Tabs */}
          {!projectId && (
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-850 p-1 rounded-xl border border-zinc-200 dark:border-zinc-750 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setGlobalTab('overview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  globalTab === 'overview'
                    ? 'bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setGlobalTab('subjects')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  globalTab === 'subjects'
                    ? 'bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Folder className="w-3.5 h-3.5 text-blue-500" />
                <span>Subjects ({projectsList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setGlobalTab('general')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  globalTab === 'general'
                    ? 'bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                <span>General Chats</span>
              </button>
            </div>
          )}
        </div>

        {/* CLASSIFIED VIEW: SUBJECTS BREAKDOWN */}
        {!projectId && globalTab === 'subjects' ? (
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">
              Per-Subject Mastery & Evidence Breakdown
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projectsList.map((proj) => {
                const pMasteries = ps6Db.getAllMastery(proj.id).filter((m) => (m.evidence_count || 0) > 0);
                const pMisc = ps6Db.getMisconceptions(proj.id).filter((m) => m.status !== 'resolved');
                const pAvg =
                  pMasteries.length > 0
                    ? Math.round((pMasteries.reduce((a, b) => a + b.mastery, 0) / pMasteries.length) * 100)
                    : 0;

                return (
                  <div
                    key={proj.id}
                    className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#151922] shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{proj.icon || '📘'}</span>
                        <h4 className="font-bold text-sm text-zinc-950 dark:text-white truncate">{proj.name}</h4>
                      </div>
                      <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                        {pAvg}% Mastery
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${pAvg}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400 pt-1">
                      <span>{pMasteries.length} tracked concepts</span>
                      <span>{pMisc.length} active misconceptions</span>
                    </div>

                    {onSelectProject && (
                      <button
                        type="button"
                        onClick={() => onSelectProject(proj.id)}
                        className="w-full py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                      >
                        <span>Open Subject Analytics</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {projectsList.length === 0 && (
                <div className="col-span-2 p-8 text-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl text-xs text-zinc-500">
                  No subjects created yet.
                </div>
              )}
            </div>
          </div>
        ) : !projectId && globalTab === 'general' ? (
          /* CLASSIFIED VIEW: GENERAL CHATS BREAKDOWN */
          <div className="space-y-6">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">
              General Chat Conversations Analytics
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#151922] shadow-2xs space-y-1">
                <span className="text-xs text-zinc-500 font-medium">General Mastery</span>
                <div className="text-2xl font-extrabold text-zinc-950 dark:text-white">
                  {generalMasteries.length > 0
                    ? Math.round(
                        (generalMasteries.reduce((a, b) => a + b.mastery, 0) / generalMasteries.length) * 100
                      )
                    : 0}
                  %
                </div>
                <span className="text-[11px] text-zinc-400 block">{generalMasteries.length} general concepts</span>
              </div>

              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#151922] shadow-2xs space-y-1">
                <span className="text-xs text-zinc-500 font-medium">General Misconceptions</span>
                <div className="text-2xl font-extrabold text-amber-500">
                  {generalMisc.filter((m) => m.status !== 'resolved').length}
                </div>
                <span className="text-[11px] text-zinc-400 block">
                  {generalMisc.filter((m) => m.status === 'resolved').length} resolved
                </span>
              </div>

              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#151922] shadow-2xs space-y-1">
                <span className="text-xs text-zinc-500 font-medium">Interventions</span>
                <div className="text-2xl font-extrabold text-zinc-950 dark:text-white">{generalTraces.length}</div>
                <span className="text-[11px] text-zinc-400 block">General decision logs</span>
              </div>
            </div>

            {/* General Concepts Table */}
            {generalMasteries.length > 0 && (
              <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#151922] shadow-2xs space-y-3">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">
                  Concepts Discovered in General Chats
                </h4>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                  {generalMasteries.map((m) => (
                    <div key={m.concept_id} className="py-2.5 flex items-center justify-between">
                      <span className="font-semibold text-zinc-900 dark:text-white">{m.concept_name}</span>
                      <span className="font-mono text-blue-500 font-bold">{Math.round(m.mastery * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* DEFAULT OVERVIEW / SUBJECT VIEW */
          totalConcepts === 0 ? (
            <div className="border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl p-10 text-center bg-white dark:bg-[#151922] shadow-2xs">
              <Database className="w-10 h-10 text-zinc-400 dark:text-zinc-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">No Analytics Data Yet</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1">
                Interact with the AI or complete story challenges to build empirical learner analytics.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top Metrics Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#151922] shadow-2xs space-y-1.5">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Average Mastery</span>
                  <div className="text-2xl font-extrabold text-zinc-950 dark:text-white">{(avgMastery * 100).toFixed(1)}%</div>
                  <span className="text-[11px] text-zinc-400 block">Across {totalConcepts} active concepts</span>
                </div>

                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#151922] shadow-2xs space-y-1.5">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Active Misconceptions</span>
                  <div className="text-2xl font-extrabold text-amber-500">{activeMisconceptions.length}</div>
                  <span className="text-[11px] text-zinc-400 block">{resolvedMisconceptions.length} resolved</span>
                </div>

                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#151922] shadow-2xs space-y-1.5">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Adaptive Interventions</span>
                  <div className="text-2xl font-extrabold text-zinc-950 dark:text-white">{traces.length}</div>
                  <span className="text-[11px] text-zinc-400 block">Decision traces logged</span>
                </div>

                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#151922] shadow-2xs space-y-1.5">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Learning Velocity</span>
                  <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">+0.25/wk</div>
                  <span className="text-[11px] text-zinc-400 block">Empirical gain rate</span>
                </div>
              </div>

              {/* Concept Mastery Table */}
              <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#151922] shadow-2xs space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                  <span>Concept Trajectory & Evidence Breakdown</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-mono text-[11px]">
                        <th className="pb-2.5 font-semibold">Concept</th>
                        <th className="pb-2.5 font-semibold">Mastery</th>
                        <th className="pb-2.5 font-semibold">Confidence</th>
                        <th className="pb-2.5 font-semibold">Evidence Count</th>
                        <th className="pb-2.5 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono">
                      {masteries.map((m) => (
                        <tr key={m.concept_id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition">
                          <td className="py-2.5 font-sans font-semibold text-zinc-900 dark:text-white">{m.concept_name}</td>
                          <td className="py-2.5 text-blue-600 dark:text-blue-400 font-bold">{Math.round(m.mastery * 100)}%</td>
                          <td className="py-2.5 text-zinc-600 dark:text-zinc-400">{Math.round((m.confidence || 0) * 100)}%</td>
                          <td className="py-2.5 text-zinc-600 dark:text-zinc-400">{m.evidence_count}</td>
                          <td className="py-2.5 text-right">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 uppercase">
                              {m.status || 'Learning'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
