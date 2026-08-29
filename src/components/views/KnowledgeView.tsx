import React, { useState, useEffect } from 'react';
import { ps6Db } from '../../services/ps6Database';
import { getProjects } from '../../services/database';
import { ConceptMastery, Misconception } from '../../services/ps6Types';
import { Network, Database, AlertTriangle } from 'lucide-react';

interface KnowledgeViewProps {
  projectId?: string | null;
}

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({ projectId }) => {
  const [masteries, setMasteries] = useState<ConceptMastery[]>([]);
  const [misconceptions, setMisconceptions] = useState<Misconception[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<ConceptMastery | null>(null);
  const [subjectName, setSubjectName] = useState<string>('');

  useEffect(() => {
    const loadKnowledge = async () => {
      let subj = 'General Workspace';
      if (projectId) {
        const projs = await getProjects();
        const found = projs.find((p) => p.id === projectId);
        if (found) subj = found.name;
      }
      setSubjectName(subj);

      let loadedMasteries = ps6Db.getAllMastery(projectId).filter((m) => (m.evidence_count || 0) > 0);
      const loadedMisc = ps6Db.getMisconceptions(projectId);

      // If no interactive evidence recorded yet, populate subject-specific curriculum milestones
      if (loadedMasteries.length === 0 && projectId) {
        const norm = subj.toLowerCase();
        let defaultConcepts: { id: string; name: string }[] = [];

        if (norm.includes('deep learning') || norm.includes('backpropagation') || norm.includes('neural')) {
          defaultConcepts = [
            { id: 'chain_rule', name: 'Multivariate Chain Rule & Backprop' },
            { id: 'activation_functions', name: 'Non-linear Activations (ReLU/GELU)' },
            { id: 'vanishing_gradients', name: 'Vanishing & Exploding Gradients' },
            { id: 'weight_initialization', name: 'He & Xavier Normal Initialization' },
            { id: 'optimizers', name: 'Adaptive Optimizers (Adam / RMSprop)' },
            { id: 'batch_norm', name: 'Batch Normalization & Covariate Shift' },
            { id: 'regularization', name: 'L2 Weight Decay & Dropout' },
            { id: 'loss_functions', name: 'Softmax Cross-Entropy Gradients' },
          ];
        } else if (norm.includes('network') || norm.includes('tcp') || norm.includes('protocol')) {
          defaultConcepts = [
            { id: 'osi_layers', name: 'OSI Model & TCP/IP Layering' },
            { id: 'tcp_handshake', name: 'TCP 3-Way Handshake & State Machine' },
            { id: 'congestion_control', name: 'AIMD Congestion Control & Slow Start' },
            { id: 'subnetting', name: 'Subnetting & CIDR Address Masks' },
            { id: 'dns_architecture', name: 'DNS Recursive vs Iterative Queries' },
            { id: 'http_protocols', name: 'HTTP/2 vs HTTP/3 QUIC Multiplexing' },
            { id: 'routing_algorithms', name: 'Distance Vector vs Link State Routing' },
            { id: 'nat_architecture', name: 'NAT & Port Address Translation' },
          ];
        } else if (norm.includes('operating system') || norm.includes('os') || norm.includes('concurrency')) {
          defaultConcepts = [
            { id: 'processes_vs_threads', name: 'Processes vs Threads & Memory Spaces' },
            { id: 'cpu_scheduling', name: 'CPU Scheduling (SJF / Round-Robin)' },
            { id: 'race_conditions', name: 'Race Conditions & Mutex Locks' },
            { id: 'deadlock_conditions', name: 'Coffman\'s Four Deadlock Conditions' },
            { id: 'virtual_memory', name: 'Virtual Memory & LRU Page Replacement' },
            { id: 'synchronization', name: 'Semaphores & Condition Variables' },
            { id: 'file_systems', name: 'Unix Inodes & Directory Tables' },
          ];
        } else {
          defaultConcepts = [
            { id: 'core_foundations', name: `Core Architectural Foundations of ${subj}` },
            { id: 'operational_mechanics', name: 'Operational Mechanics & Pipelining' },
            { id: 'fault_resilience', name: 'Fault Tolerance & Error Recovery' },
            { id: 'scalability_patterns', name: 'Scalability & Resource Partitioning' },
            { id: 'advanced_synthesis', name: 'Advanced Production Synthesis' },
          ];
        }

        loadedMasteries = defaultConcepts.map((c) => ({
          concept_id: c.id,
          concept_name: c.name,
          mastery: 0.25,
          confidence: 0.35,
          evidence_count: 0,
          last_interaction: new Date().toISOString(),
          status: 'learning' as const,
        }));
      }

      setMasteries(loadedMasteries);
      setMisconceptions(loadedMisc);
      if (loadedMasteries.length > 0) setSelectedConcept(loadedMasteries[0]);
      else setSelectedConcept(null);
    };

    loadKnowledge();
  }, [projectId]);

  return (
    <div className="flex-1 overflow-y-auto bg-transparent text-zinc-900 dark:text-zinc-100 p-2 md:p-6 transition-colors select-none">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
          <h1 className="text-xl font-bold text-zinc-950 dark:text-white flex items-center gap-2.5">
            <Network className="w-5 h-5 text-blue-500" />
            Knowledge Graph & Concept Mastery {subjectName ? `— ${subjectName}` : ''}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
            {projectId
              ? `Concept nodes, prerequisite linkages, and mastery confidence for ${subjectName}.`
              : 'Global visualization across all tracked concepts and subjects.'}
          </p>
        </div>

        {masteries.length === 0 ? (
          <div className="border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl p-10 text-center bg-white dark:bg-[#151922]">
            <Database className="w-10 h-10 text-zinc-400 dark:text-zinc-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-200">No Subject Concepts Discovered Yet</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1 font-mono">
              As you chat or take assessments in this subject, concept nodes and mastery evidence will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Concept Node Cards */}
            <div className="md:col-span-2 space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">
                Discovered Concept Nodes ({masteries.length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {masteries.map((m) => {
                  const percent = Math.round(m.mastery * 100);
                  const isSelected = selectedConcept?.concept_id === m.concept_id;

                  return (
                    <div
                      key={m.concept_id}
                      onClick={() => setSelectedConcept(m)}
                      className={`p-4 rounded-2xl border transition cursor-pointer space-y-2.5 ${
                        isSelected
                          ? 'border-blue-500 bg-white dark:bg-[#181d27] shadow-xs'
                          : 'border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#141820] hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-zinc-950 dark:text-white truncate">
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

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            percent >= 70
                              ? 'bg-emerald-500'
                              : percent >= 40
                              ? 'bg-blue-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                        <span>Evidence: {m.evidence_count}</span>
                        <span>Confidence: {Math.round((m.confidence || 0) * 100)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Concept Inspector Sidebar */}
            <div>
              {selectedConcept ? (
                <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#151922] shadow-xs space-y-4">
                  <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    <span className="text-[10px] font-mono font-bold text-blue-500 uppercase tracking-wider block">
                      Concept Inspector
                    </span>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white mt-1">
                      {selectedConcept.concept_name}
                    </h3>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-zinc-500">Mastery Level</span>
                      <span className="font-bold text-zinc-900 dark:text-white">
                        {Math.round(selectedConcept.mastery * 100)}%
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-zinc-500">Confidence</span>
                      <span className="font-bold text-zinc-900 dark:text-white">
                        {Math.round((selectedConcept.confidence || 0) * 100)}%
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-zinc-500">Evidence Count</span>
                      <span className="font-bold text-zinc-900 dark:text-white">
                        {selectedConcept.evidence_count}
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-zinc-500">Status</span>
                      <span className="font-bold text-blue-500 uppercase">
                        {selectedConcept.status || 'Learning'}
                      </span>
                    </div>
                  </div>

                  {/* Misconceptions Alert */}
                  {misconceptions.some((m) => m.concept_id === selectedConcept.concept_id) && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Active Misconception</span>
                      </div>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 font-sans">
                        {
                          misconceptions.find(
                            (m) => m.concept_id === selectedConcept.concept_id
                          )?.description
                        }
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#151922] text-center text-xs text-zinc-400">
                  Select a concept to inspect details
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
