import React, { useState, useEffect } from 'react';
import { ps6Db } from '../../services/ps6Database';
import { ConceptMastery, Misconception } from '../../services/ps6Types';
import { Network, Database, AlertTriangle } from 'lucide-react';

export const KnowledgeView: React.FC = () => {
  const [masteries, setMasteries] = useState<ConceptMastery[]>([]);
  const [misconceptions, setMisconceptions] = useState<Misconception[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<ConceptMastery | null>(null);

  useEffect(() => {
    const loadedMasteries = ps6Db.getAllMastery();
    const loadedMisc = ps6Db.getMisconceptions();
    setMasteries(loadedMasteries);
    setMisconceptions(loadedMisc);
    if (loadedMasteries.length > 0) setSelectedConcept(loadedMasteries[0]);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-8 transition-colors select-none">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-850 pb-6">
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-white flex items-center gap-3">
            <Network className="w-7 h-7 text-blue-500" />
            Knowledge Graph & Concept Mastery
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
            Dynamic graph visualization of extracted concept nodes, prerequisite linkages, and mastery confidence
          </p>
        </div>

        {masteries.length === 0 ? (
          <div className="border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl p-12 text-center bg-white dark:bg-zinc-900/40">
            <Database className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-200">Knowledge Graph is Empty</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-2 font-mono">
              As you interact with LearnForge, new concepts, prerequisites, and mastery evidence will populate automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Concept Node Cards */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-500">
                Discovered Concept Nodes ({masteries.length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {masteries.map((m) => {
                  const percent = Math.round(m.mastery * 100);
                  const isSelected = selectedConcept?.concept_id === m.concept_id;

                  return (
                    <div
                      key={m.concept_id}
                      onClick={() => setSelectedConcept(m)}
                      className={`p-5 rounded-2xl border transition cursor-pointer space-y-3 ${
                        isSelected
                          ? 'border-blue-500 bg-white dark:bg-zinc-900 shadow-sm'
                          : 'border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-zinc-950 dark:text-white">
                          {m.concept_name}
                        </span>
                        <span
                          className={`text-xs font-mono font-bold ${
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

                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
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

                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                        <span>Evidence: {m.evidence_count}</span>
                        <span>Confidence: {Math.round(m.confidence * 100)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Node Inspector */}
            {selectedConcept && (
              <div className="border border-zinc-200 dark:border-zinc-850 rounded-2xl p-6 bg-white dark:bg-zinc-900/80 space-y-4 shadow-xs h-fit">
                <div className="border-b border-zinc-200 dark:border-zinc-850 pb-3">
                  <span className="text-[10px] font-mono text-blue-500 font-bold uppercase block">
                    CONCEPT INSPECTOR
                  </span>
                  <h3 className="text-lg font-bold text-zinc-950 dark:text-white">
                    {selectedConcept.concept_name}
                  </h3>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-850">
                    <span className="text-zinc-500">Mastery Level</span>
                    <span className="font-bold text-zinc-950 dark:text-white">
                      {Math.round(selectedConcept.mastery * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-850">
                    <span className="text-zinc-500">Confidence</span>
                    <span className="font-bold text-zinc-950 dark:text-white">
                      {Math.round(selectedConcept.confidence * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-850">
                    <span className="text-zinc-500">Evidence Count</span>
                    <span className="font-bold text-zinc-950 dark:text-white">
                      {selectedConcept.evidence_count}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-850">
                    <span className="text-zinc-500">Status</span>
                    <span className="font-bold text-emerald-500 uppercase">{selectedConcept.status}</span>
                  </div>
                </div>

                {/* Related Misconceptions */}
                {misconceptions.filter((m) => m.concept_id === selectedConcept.concept_id).length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      Active Misconceptions
                    </span>
                    {misconceptions
                      .filter((m) => m.concept_id === selectedConcept.concept_id)
                      .map((m) => (
                        <p key={m.id} className="text-xs text-amber-800 dark:text-amber-300 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 font-sans">
                          {m.description}
                        </p>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
