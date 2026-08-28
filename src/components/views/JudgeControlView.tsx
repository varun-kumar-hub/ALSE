import React, { useState, useEffect } from 'react';
import { ps6Db } from '../../services/ps6Database';
import { DecisionTrace } from '../../services/ps6Types';
import { Eye, Layers, ArrowDown, Sparkles } from 'lucide-react';

export const JudgeControlView: React.FC = () => {
  const [traces, setTraces] = useState<DecisionTrace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<DecisionTrace | null>(null);

  useEffect(() => {
    const loadedTraces = ps6Db.getDecisionTraces();
    setTraces(loadedTraces);
    if (loadedTraces.length > 0) setSelectedTrace(loadedTraces[0]);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-zinc-800 pb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Eye className="w-7 h-7 text-zinc-200" />
            Judge Control & Decision Trace Inspector
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Auditable step-by-step decision log explaining PS6 ML action ranking and intervention selection.
          </p>
        </div>

        {traces.length === 0 ? (
          <div className="border border-dashed border-zinc-800 rounded-xl p-12 text-center bg-zinc-900/40">
            <Layers className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-200">No Decision Traces Recorded</h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto mt-2">
              As you ask questions or take challenges, the PS6 ML engine logs every state evaluation and candidate ranking trace here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs">
            {/* Left Trace Log List */}
            <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-900/60 space-y-3">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-2">
                Logged Traces ({traces.length})
              </h3>
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {traces.map((t) => {
                  const isSelected = selectedTrace?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTrace(t)}
                      className={`p-3 rounded-lg border cursor-pointer transition ${
                        isSelected ? 'border-white bg-zinc-850' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex justify-between items-center text-white font-semibold">
                        <span>{t.concept}</span>
                        <span className="text-[10px] text-zinc-400">
                          {new Date(t.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between">
                        <span>{t.selected_action}</span>
                        <span className="text-emerald-400">+{(t.outcome_gain || 0.2).toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Trace Flow Diagram */}
            {selectedTrace && (
              <div className="lg:col-span-2 border border-zinc-800 rounded-xl p-6 bg-zinc-900/70 space-y-6">
                <div className="border-b border-zinc-850 pb-4 flex justify-between items-center">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-zinc-300" />
                    Structured Trace for "{selectedTrace.concept}"
                  </h3>
                  <span className="text-zinc-500">{new Date(selectedTrace.timestamp).toLocaleString()}</span>
                </div>

                {/* Flow Chain */}
                <div className="space-y-4">
                  {/* Step 1: Learner State */}
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                    <span className="text-zinc-500 font-bold uppercase text-[10px]">1. Learner State</span>
                    <p className="text-zinc-200 text-sm">
                      Mastery: {(selectedTrace.current_mastery * 100).toFixed(0)}% | Has Misconception:{' '}
                      {selectedTrace.has_misconception ? 'YES' : 'NO'}
                    </p>
                  </div>

                  <ArrowDown className="w-4 h-4 text-zinc-600 mx-auto" />

                  {/* Step 2: Detected Gap */}
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                    <span className="text-zinc-500 font-bold uppercase text-[10px]">2. Identified Knowledge Gap</span>
                    <p className="text-zinc-200 text-sm">{selectedTrace.detected_gap}</p>
                  </div>

                  <ArrowDown className="w-4 h-4 text-zinc-600 mx-auto" />

                  {/* Step 3: Ranked Candidate Interventions */}
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                    <span className="text-zinc-500 font-bold uppercase text-[10px]">
                      3. Candidate Actions & Predicted Gains (XGBoost ML Ranker)
                    </span>
                    <div className="space-y-2">
                      {selectedTrace.candidates.map((cand, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded border text-xs flex justify-between items-center ${
                            cand.action === selectedTrace.selected_action
                              ? 'border-white bg-zinc-900 text-white font-bold'
                              : 'border-zinc-850 bg-zinc-950 text-zinc-400'
                          }`}
                        >
                          <span>{cand.action}</span>
                          <div className="flex gap-4">
                            <span>Cost: {cand.cost}</span>
                            <span>Pred Gain: +{cand.predicted_gain}</span>
                            <span className="text-white font-mono">Util: {cand.utility}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <ArrowDown className="w-4 h-4 text-zinc-600 mx-auto" />

                  {/* Step 4: Selected Action & Rationale */}
                  <div className="p-4 rounded-xl bg-white text-zinc-950 space-y-2 shadow-lg">
                    <span className="text-zinc-700 font-bold uppercase text-[10px]">4. Selected Next Action</span>
                    <h4 className="text-lg font-bold">{selectedTrace.selected_action}</h4>
                    <p className="text-xs text-zinc-800">{selectedTrace.selected_reason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
