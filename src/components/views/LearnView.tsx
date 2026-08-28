import React, { useState, useEffect } from 'react';
import { ps6Db } from '../../services/ps6Database';
import { ConceptMastery, DecisionTrace, Misconception } from '../../services/ps6Types';
import { Brain, Target, ArrowRight, ShieldAlert, Sparkles, BookOpen, Clock, Activity } from 'lucide-react';

interface LearnViewProps {
  onStartTopicChat: (topic: string) => void;
}

export const LearnView: React.FC<LearnViewProps> = ({ onStartTopicChat }) => {
  const [masteries, setMasteries] = useState<ConceptMastery[]>([]);
  const [misconceptions, setMisconceptions] = useState<Misconception[]>([]);
  const [latestTrace, setLatestTrace] = useState<DecisionTrace | null>(null);

  useEffect(() => {
    // Only load concepts that have recorded interaction evidence
    const all = ps6Db.getAllMastery().filter((m) => (m.evidence_count || 0) > 0);
    setMasteries(all);
    setMisconceptions(ps6Db.getMisconceptions().filter((m) => m.status !== 'resolved'));
    const traces = ps6Db.getDecisionTraces();
    if (traces.length > 0) setLatestTrace(traces[0]);
  }, []);

  const weakConcepts = masteries.filter((m) => m.mastery < 0.5);
  const strongConcepts = masteries.filter((m) => m.mastery >= 0.7);
  const currentFocus = latestTrace?.concept || (masteries.length > 0 ? masteries[0].concept_name : null);

  const hasData = masteries.length > 0;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-8 transition-colors select-none">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-850 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white flex items-center gap-3">
              <Brain className="w-7 h-7 text-blue-500" />
              Adaptive Learning Focus
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Real-time learner model recommendations based on observed interaction evidence
            </p>
          </div>
          <button
            onClick={() => onStartTopicChat('Machine Learning')}
            className="px-4 py-2 bg-blue-600 dark:bg-white text-white dark:text-zinc-950 font-semibold rounded-xl hover:bg-blue-500 dark:hover:bg-zinc-200 transition text-sm flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400 dark:text-zinc-900" />
            Start Learning Topic
          </button>
        </div>

        {!hasData ? (
          /* Empty State */
          <div className="border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl p-12 text-center bg-white dark:bg-zinc-900/40 space-y-2">
            <BookOpen className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-200">No Learning Evidence Yet</h3>
            <p className="text-sm text-zinc-500 max-w-md mx-auto mt-2 font-sans">
              Start chatting or learning to build your learner model. The PS6 engine continuously analyzes interactions to discover concepts and tailor recommendations.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => onStartTopicChat('Teach me Python')}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-sm border border-zinc-200 dark:border-zinc-700 transition cursor-pointer font-mono"
              >
                "Teach me Python"
              </button>
              <button
                onClick={() => onStartTopicChat('Explain attention mechanisms')}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-sm border border-zinc-200 dark:border-zinc-700 transition cursor-pointer font-mono"
              >
                "Explain Attention Mechanisms"
              </button>
            </div>
          </div>
        ) : (
          /* Real Data Layout */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Primary Recommendation Card */}
            <div className="md:col-span-2 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-6 bg-white dark:bg-zinc-900/70 space-y-6 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Recommended Action
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono font-semibold">
                  Target: {currentFocus || 'General'}
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-zinc-950 dark:text-white">
                  {latestTrace?.selected_action || 'EXPLANATION'}
                </h2>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-2 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-850 leading-relaxed font-mono">
                  {latestTrace?.selected_reason || 'Focusing on core concepts based on initial comprehension signals.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Current Capability</span>
                  <span className="text-2xl font-bold text-zinc-950 dark:text-white font-mono mt-1 block">
                    {latestTrace ? `${(latestTrace.current_mastery * 100).toFixed(0)}%` : 'Unknown'}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Predicted Learning Gain</span>
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
                    +{latestTrace ? (latestTrace.outcome_gain || 0.25).toFixed(2) : '0.20'}
                  </span>
                </div>
              </div>

              {currentFocus && (
                <button
                  onClick={() => onStartTopicChat(`Explain ${currentFocus} with step-by-step examples`)}
                  className="w-full py-3 bg-blue-600 dark:bg-white text-white dark:text-zinc-950 font-bold rounded-xl hover:bg-blue-500 dark:hover:bg-zinc-200 transition flex items-center justify-center gap-2 text-sm shadow-xs cursor-pointer"
                >
                  Execute Intervention: {latestTrace?.selected_action || 'EXPLANATION'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Right Column: Status & Misconceptions */}
            <div className="space-y-6">
              {/* Misconceptions Warning Card */}
              {misconceptions.length > 0 && (
                <div className="border border-amber-500/30 bg-amber-500/10 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                    <ShieldAlert className="w-4 h-4" />
                    Active Misconception Alert
                  </div>
                  {misconceptions.map((m) => (
                    <div key={m.id} className="text-xs text-amber-900 dark:text-amber-200 bg-white/50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-500/20 leading-relaxed font-sans">
                      <span className="font-bold text-amber-700 dark:text-amber-300">{m.concept_name}:</span> {m.description}
                    </div>
                  ))}
                </div>
              )}

              {/* Weak Concepts */}
              <div className="border border-zinc-200 dark:border-zinc-850 rounded-2xl p-5 bg-white dark:bg-zinc-900/40 space-y-3 shadow-xs">
                <h4 className="text-xs font-bold font-mono text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  Concepts Needing Practice
                </h4>
                {weakConcepts.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No weak concepts detected.</p>
                ) : (
                  <div className="space-y-2">
                    {weakConcepts.map((c) => (
                      <div key={c.concept_id} className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 flex items-center justify-between text-xs font-mono">
                        <span className="text-zinc-900 dark:text-zinc-200 font-semibold">{c.concept_name}</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{(c.mastery * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Strong Concepts */}
              <div className="border border-zinc-200 dark:border-zinc-850 rounded-2xl p-5 bg-white dark:bg-zinc-900/40 space-y-3 shadow-xs">
                <h4 className="text-xs font-bold font-mono text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  Mastered Concepts
                </h4>
                {strongConcepts.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No concepts fully mastered yet.</p>
                ) : (
                  <div className="space-y-2">
                    {strongConcepts.map((c) => (
                      <div key={c.concept_id} className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 flex items-center justify-between text-xs font-mono">
                        <span className="text-zinc-900 dark:text-zinc-200 font-semibold">{c.concept_name}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{(c.mastery * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
