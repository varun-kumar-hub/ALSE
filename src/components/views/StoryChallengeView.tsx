import React, { useState } from 'react';
import { StoryDecisionPoint, InterventionType } from '../../services/ps6Types';
import { rankActionsML } from '../../services/ps6MlClient';
import { ps6Db } from '../../services/ps6Database';
import {
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Clock,
  Trophy,
  Brain,
  HelpCircle,
  X,
  Sparkles,
} from 'lucide-react';

const OS_STORY_STEPS: StoryDecisionPoint[] = [
  {
    id: 1,
    title: 'D1: Diagnostic — Processes vs Threads',
    scenario:
      'You are architecture-reviewing a high-throughput web server experiencing slow request initialization. Worker threads are being replaced with heavy process spawns. What architectural trade-off occurs?',
    options: [
      {
        id: '1a',
        text: 'Processes share the same heap memory space, causing memory corruption',
        is_correct: false,
        concept_id: 'processes',
        misconception_flag: 'Confusing process address space isolation with shared thread memory',
      },
      {
        id: '1b',
        text: 'Processes have independent virtual address spaces, increasing spawn and context-switch memory overhead',
        is_correct: true,
        concept_id: 'processes',
      },
      {
        id: '1c',
        text: 'Threads cannot execute concurrently on multi-core processors',
        is_correct: false,
        concept_id: 'threads',
      },
    ],
  },
  {
    id: 2,
    title: 'D2: Concept Check — CPU Scheduling Algorithms',
    scenario:
      'A real-time database system suffers from long queue times for short read queries because long-running analytical queries hold the CPU. Which scheduling policy minimizes average waiting time for short bursts?',
    options: [
      {
        id: '2a',
        text: 'First-Come, First-Served (FCFS)',
        is_correct: false,
        concept_id: 'cpu_scheduling',
        misconception_flag: 'Assuming FCFS prevents convoy effect',
      },
      {
        id: '2b',
        text: 'Shortest Job First (SJF) / Shortest Remaining Time First (SRTF)',
        is_correct: true,
        concept_id: 'cpu_scheduling',
      },
      {
        id: '2c',
        text: 'Static Priority Scheduling with zero preemption',
        is_correct: false,
        concept_id: 'cpu_scheduling',
      },
    ],
  },
  {
    id: 3,
    title: 'D3: Challenge — Synchronization & Race Conditions',
    scenario:
      'Two threads increment a shared global counter variable `counter++` concurrently without locks. On a multi-core system, why does the final count periodically fall short of expected totals?',
    options: [
      {
        id: '3a',
        text: 'Read-Modify-Write instructions (mov, add, mov) are non-atomic, allowing interleaved store updates',
        is_correct: true,
        concept_id: 'race_conditions',
      },
      {
        id: '3b',
        text: 'The CPU cache invalidates odd-numbered variables automatically',
        is_correct: false,
        concept_id: 'race_conditions',
      },
      {
        id: '3c',
        text: 'Compiler optimization deletes duplicate increment loops',
        is_correct: false,
        concept_id: 'race_conditions',
      },
    ],
  },
  {
    id: 4,
    title: 'D4: Misconception Detection — Starvation vs Deadlock',
    scenario:
      'A low-priority process has been waiting in the ready queue for 45 minutes while higher-priority processes continually preempt the CPU. Is this system in a Deadlock state?',
    options: [
      {
        id: '4a',
        text: 'Yes, because the low-priority process is completely unable to make progress',
        is_correct: false,
        concept_id: 'deadlocks',
        misconception_flag: 'Confusing starvation (indefinite delay) with deadlock (circular block state)',
      },
      {
        id: '4b',
        text: 'No, this is Starvation. Deadlock requires a circular wait state where blocked processes wait on each other',
        is_correct: true,
        concept_id: 'deadlocks',
      },
      {
        id: '4c',
        text: 'Yes, any process waiting over 5 minutes is defined as deadlocked by POSIX standards',
        is_correct: false,
        concept_id: 'deadlocks',
      },
    ],
  },
  {
    id: 5,
    title: 'D5: Explanation — Necessary Conditions for Deadlock',
    scenario:
      'To prevent deadlocks in a storage controller managing disk units, which set of four simultaneous conditions MUST hold for a deadlock to exist?',
    options: [
      {
        id: '5a',
        text: 'Mutual Exclusion, Hold & Wait, No Preemption, and Circular Wait',
        is_correct: true,
        concept_id: 'deadlock_conditions',
      },
      {
        id: '5b',
        text: 'High CPU Usage, Low RAM, Disk I/O Throttling, and Page Faults',
        is_correct: false,
        concept_id: 'deadlock_conditions',
      },
      {
        id: '5c',
        text: 'Preemption, Priority Inversion, Thread Pooling, and Spinlocking',
        is_correct: false,
        concept_id: 'deadlock_conditions',
      },
    ],
  },
  {
    id: 6,
    title: 'D6: Reinforcement — Critical Section & Semaphores',
    scenario:
      'You are implementing access control for a shared pool of 3 printer hardware channels. Which synchronization primitive is designed to limit concurrent access to N resources?',
    options: [
      {
        id: '6a',
        text: 'Counting Semaphore initialized to N = 3',
        is_correct: true,
        concept_id: 'synchronization',
      },
      {
        id: '6b',
        text: 'Binary Mutex initialized to 1',
        is_correct: false,
        concept_id: 'synchronization',
      },
      {
        id: '6c',
        text: 'Volatile boolean variable with no memory barriers',
        is_correct: false,
        concept_id: 'synchronization',
      },
    ],
  },
  {
    id: 7,
    title: 'D7: Adaptive Challenge — Banker\'s Algorithm Safe State',
    scenario:
      'An OS resource allocator receives a request from Process P1 for 2 RAM units. The allocator evaluates whether granting this request leaves the system in a "Safe State". What guarantees safety?',
    options: [
      {
        id: '7a',
        text: 'There exists at least one execution sequence where all remaining processes can fulfill maximum demands without deadlock',
        is_correct: true,
        concept_id: 'deadlocks',
      },
      {
        id: '7b',
        text: 'Total available free RAM units equal total allocated RAM units',
        is_correct: false,
        concept_id: 'deadlocks',
      },
      {
        id: '7c',
        text: 'P1 immediately releases all locks upon receiving CPU slice',
        is_correct: false,
        concept_id: 'deadlocks',
      },
    ],
  },
  {
    id: 8,
    title: 'D8: Final Evaluation — Priority Inversion & Ceiling Protocol',
    scenario:
      'A high-priority mars rover task is blocked waiting on a mutex held by a low-priority task, while medium-priority tasks prevent the low-priority task from finishing. How do modern kernel schedulers resolve this?',
    options: [
      {
        id: '8a',
        text: 'Priority Inheritance Protocol: temporarily elevate the low-priority thread\'s priority to match the blocked high-priority thread',
        is_correct: true,
        concept_id: 'operating_systems',
      },
      {
        id: '8b',
        text: 'Terminate all medium-priority threads automatically',
        is_correct: false,
        concept_id: 'operating_systems',
      },
      {
        id: '8c',
        text: 'Reboot the kernel whenever thread wait exceeds 10ms',
        is_correct: false,
        concept_id: 'operating_systems',
      },
    ],
  },
];

export const StoryChallengeView: React.FC = () => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [budgetRemaining, setBudgetRemaining] = useState(10);

  // Learner State tracking
  const [currentMastery, setCurrentMastery] = useState(0.46);
  const [confidence, setConfidence] = useState(0.71);
  const [learnerAbility, setLearnerAbility] = useState(0.48);
  const [recentAccuracy, setRecentAccuracy] = useState(0.52);
  const [repeatedErrors, setRepeatedErrors] = useState(1);
  const [hasMisconception, setHasMisconception] = useState(true);

  // ML Next Action Selection
  const [selectedIntervention, setSelectedIntervention] = useState<InterventionType>('EXPLANATION');
  const [expectedGain, setExpectedGain] = useState(0.14);
  const [selectedReason, setSelectedReason] = useState(
    'Highest expected learning gain (+14%) for current learner state with active misconception'
  );
  const [candidateActions, setCandidateActions] = useState<any[]>([]);

  const [showTransparencyModal, setShowTransparencyModal] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  const currentPoint = OS_STORY_STEPS[currentStepIdx];

  const handleSelectOption = (optId: string) => {
    if (isAnswered) return;
    setSelectedOptionId(optId);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOptionId || isAnswered) return;
    setIsAnswered(true);

    const selectedOpt = currentPoint.options.find((o) => o.id === selectedOptionId);
    const isCorrect = selectedOpt?.is_correct || false;

    if (isCorrect) {
      setScore((prev) => prev + 1);
      setCurrentMastery((prev) => Math.min(0.98, prev + 0.12));
      setRecentAccuracy((prev) => Math.min(0.95, prev + 0.15));
      setConfidence((prev) => Math.min(0.95, prev + 0.08));
      setLearnerAbility((prev) => Math.min(0.95, prev + 0.08));
      if (!selectedOpt?.misconception_flag) {
        setHasMisconception(false);
      }
    } else {
      setCurrentMastery((prev) => Math.max(0.15, prev - 0.08));
      setRecentAccuracy((prev) => Math.max(0.20, prev - 0.12));
      setLearnerAbility((prev) => Math.max(0.10, prev - 0.06));
      if (selectedOpt?.misconception_flag) {
        setHasMisconception(true);
        setRepeatedErrors((prev) => prev + 1);
      }
    }

    const nextBudget = Math.max(0, budgetRemaining - 1);
    setBudgetRemaining(nextBudget);

    // Invoke ML Action Ranker
    const rankingRes = await rankActionsML({
      concept: currentPoint.options[0].concept_id,
      current_mastery: isCorrect ? currentMastery + 0.12 : Math.max(0.15, currentMastery - 0.08),
      learner_ability: learnerAbility,
      has_misconception: !isCorrect && Boolean(selectedOpt?.misconception_flag),
      budget_remaining: nextBudget,
      candidate_actions: [
        'REVISION',
        'HINT',
        'EXPLANATION',
        'EASIER_CHALLENGE',
        'HARDER_CHALLENGE',
        'MISCONCEPTION_REMEDIATION',
        'SCENARIO_BRANCH',
      ],
    });

    if (rankingRes.selected_intervention) {
      setSelectedIntervention(rankingRes.selected_intervention.action);
      setExpectedGain(rankingRes.selected_intervention.predicted_gain);
      setSelectedReason(rankingRes.selected_intervention.reason);
      setCandidateActions(rankingRes.all_ranked_candidates);
    }
  };

  const handleNextStep = () => {
    if (currentStepIdx + 1 < OS_STORY_STEPS.length) {
      setCurrentStepIdx((prev) => prev + 1);
      setSelectedOptionId(null);
      setIsAnswered(false);
    } else {
      setSessionCompleted(true);
      ps6Db.saveStorySession({
        id: crypto.randomUUID(),
        topic: 'Operating Systems & Concurrency',
        current_step: OS_STORY_STEPS.length,
        total_steps: OS_STORY_STEPS.length,
        score: score + (currentPoint.options.find((o) => o.id === selectedOptionId)?.is_correct ? 1 : 0),
        time_spent_seconds: 240,
        budget_remaining: budgetRemaining,
        history: [],
      });
    }
  };

  const handleRestart = () => {
    setCurrentStepIdx(0);
    setSelectedOptionId(null);
    setIsAnswered(false);
    setScore(0);
    setBudgetRemaining(10);
    setCurrentMastery(0.46);
    setConfidence(0.71);
    setHasMisconception(true);
    setRepeatedErrors(1);
    setSessionCompleted(false);
  };

  return (
    <div className="flex-1 overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col font-sans relative">
      {/* Workspace Header */}
      <div className="p-4 border-b border-zinc-850 flex items-center justify-between shrink-0 bg-zinc-950">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-white" />
            Adaptive Learning Workspace — Operating Systems
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Autonomous decision-driven story scenario adapting to real-time learner evidence
          </p>
        </div>
        <div className="flex items-center gap-4 font-mono text-xs">
          <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            Budget: {budgetRemaining}/10
          </span>
          <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-300 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-zinc-400" />
            Score: {score}/{OS_STORY_STEPS.length}
          </span>
        </div>
      </div>

      {sessionCompleted ? (
        /* Completion Summary Screen */
        <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
          <div className="max-w-md w-full border border-zinc-800 rounded-xl p-8 bg-zinc-900/60 text-center space-y-6">
            <Trophy className="w-16 h-16 text-white mx-auto" />
            <div>
              <h2 className="text-2xl font-bold text-white">Scenario Complete!</h2>
              <p className="text-sm text-zinc-400 mt-2 font-mono">
                Final Score: {score} / {OS_STORY_STEPS.length} ({((score / OS_STORY_STEPS.length) * 100).toFixed(0)}% Mastery)
              </p>
            </div>
            <button
              onClick={handleRestart}
              className="w-full py-3 bg-white text-zinc-950 font-bold rounded-lg hover:bg-zinc-200 transition text-sm flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Restart Adaptive Session
            </button>
          </div>
        </div>
      ) : (
        /* 3-Column UI Layout (Section 23 & 24) */
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Session Progression Timeline */}
          <div className="w-56 border-r border-zinc-850 p-4 bg-zinc-950/80 overflow-y-auto shrink-0 font-mono text-xs space-y-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-3">
              SESSION PROGRESS
            </span>
            {OS_STORY_STEPS.map((step, idx) => {
              const isDone = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <div
                  key={step.id}
                  className={`p-2.5 rounded-lg border flex items-center gap-2.5 transition ${
                    isCurrent
                      ? 'border-white bg-zinc-850 text-white font-bold'
                      : isDone
                      ? 'border-zinc-850 bg-zinc-950 text-zinc-400'
                      : 'border-zinc-900 bg-zinc-950/50 text-zinc-600'
                  }`}
                >
                  <span className="shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isCurrent ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-white block animate-pulse" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full border border-zinc-700 block" />
                    )}
                  </span>
                  <span className="truncate">D{step.id} {step.title.split(':')[1]?.trim() || ''}</span>
                </div>
              );
            })}
          </div>

          {/* CENTER: Actual Learning Activity */}
          <div className="flex-1 overflow-y-auto p-6 bg-zinc-950 space-y-6">
            <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/60 space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-3 font-mono text-xs">
                <span className="text-zinc-400 uppercase font-bold">
                  Decision Point {currentPoint.id} of {OS_STORY_STEPS.length}
                </span>
                <span className="text-zinc-500">Operating Systems</span>
              </div>

              <div>
                <h2 className="text-lg font-bold text-white">{currentPoint.title}</h2>
                <p className="text-sm text-zinc-300 mt-3 leading-relaxed font-mono bg-zinc-950 p-4 rounded-lg border border-zinc-850">
                  {currentPoint.scenario}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentPoint.options.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  let optStyle = 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-zinc-200';
                  if (isAnswered) {
                    if (opt.is_correct) optStyle = 'border-emerald-500/80 bg-emerald-950/20 text-emerald-200 font-medium';
                    else if (isSelected && !opt.is_correct) optStyle = 'border-rose-500/80 bg-rose-950/20 text-rose-200';
                  } else if (isSelected) {
                    optStyle = 'border-white bg-zinc-850 text-white font-medium';
                  }

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectOption(opt.id)}
                      disabled={isAnswered}
                      className={`w-full p-4 rounded-xl border text-left text-sm transition flex items-center justify-between ${optStyle}`}
                    >
                      <span>{opt.text}</span>
                      {isAnswered && opt.is_correct && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                      {isAnswered && isSelected && !opt.is_correct && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Submit & Next Buttons */}
              <div className="pt-2 flex justify-end">
                {!isAnswered ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!selectedOptionId}
                    className="px-6 py-2.5 bg-white text-zinc-950 font-bold rounded-lg hover:bg-zinc-200 transition text-sm disabled:opacity-50"
                  >
                    Submit Choice
                  </button>
                ) : (
                  <button
                    onClick={handleNextStep}
                    className="px-6 py-2.5 bg-white text-zinc-950 font-bold rounded-lg hover:bg-zinc-200 transition text-sm flex items-center gap-2"
                  >
                    Next Decision Point
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Agent Intelligence Panel (Section 25) */}
          <div className="w-72 border-l border-zinc-850 p-5 bg-zinc-950/90 overflow-y-auto shrink-0 space-y-6 font-mono text-xs">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Brain className="w-4 h-4 text-zinc-300" />
              Agent Intelligence
            </h3>

            {/* Current State */}
            <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-900/60 space-y-3">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">CURRENT STATE</span>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Mastery</span>
                  <span className="text-white font-bold font-mono">{(currentMastery * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-white transition-all duration-300" style={{ width: `${currentMastery * 100}%` }} />
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-zinc-400">Confidence</span>
                  <span className="text-zinc-200">{(confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Difficulty Fit</span>
                  <span className="text-zinc-200">{learnerAbility > 0.6 ? 'Hard' : learnerAbility > 0.4 ? 'Medium' : 'Easy'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Misconceptions</span>
                  <span className={hasMisconception ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                    {hasMisconception ? '1 Detected' : 'None'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Remaining Budget</span>
                  <span className="text-zinc-200">{budgetRemaining} / 10</span>
                </div>
              </div>
            </div>

            {/* Next Intervention */}
            <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-900/60 space-y-3">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">NEXT INTERVENTION</span>
              <div>
                <h4 className="text-sm font-bold text-white uppercase">{selectedIntervention}</h4>
                <div className="text-xs text-emerald-400 font-semibold mt-1">
                  Expected Gain: +{(expectedGain * 100).toFixed(0)}%
                </div>
              </div>

              {/* Decision Transparency Button */}
              <button
                onClick={() => setShowTransparencyModal(true)}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold border border-zinc-700 transition flex items-center justify-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5 text-zinc-300" />
                Why this action?
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decision Transparency Modal ("Why this action?") (Section 26) */}
      {showTransparencyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full border border-zinc-800 bg-zinc-950 rounded-xl p-6 space-y-6 shadow-2xl font-mono text-xs">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-white" />
                WHY THIS ACTION?
              </h3>
              <button onClick={() => setShowTransparencyModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Learner State Evidence Breakdown */}
            <div className="grid grid-cols-2 gap-2 text-zinc-300">
              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-850 flex justify-between">
                <span className="text-zinc-400">Recent Accuracy</span>
                <span>{(recentAccuracy * 100).toFixed(0)}%</span>
              </div>
              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-850 flex justify-between">
                <span className="text-zinc-400">Repeated Errors</span>
                <span>{repeatedErrors}</span>
              </div>
              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-850 flex justify-between">
                <span className="text-zinc-400">Current Mastery</span>
                <span>{(currentMastery * 100).toFixed(0)}%</span>
              </div>
              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-850 flex justify-between">
                <span className="text-zinc-400">Misconception</span>
                <span className={hasMisconception ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                  {hasMisconception ? 'Detected' : 'None'}
                </span>
              </div>
            </div>

            {/* Candidate Interventions Table */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">CANDIDATE ACTIONS</span>
              <div className="space-y-1.5">
                {(candidateActions.length > 0
                  ? candidateActions
                  : [
                      { action: 'REVISION', predicted_gain: 0.06 },
                      { action: 'HINT', predicted_gain: 0.05 },
                      { action: 'EXPLANATION', predicted_gain: 0.14 },
                      { action: 'EASIER_CHALLENGE', predicted_gain: 0.10 },
                      { action: 'HARDER_CHALLENGE', predicted_gain: 0.03 },
                    ]
                ).map((cand: any) => {
                  const isSelected = cand.action === selectedIntervention;
                  return (
                    <div
                      key={cand.action}
                      className={`p-2 rounded border flex justify-between items-center ${
                        isSelected
                          ? 'border-white bg-zinc-900 text-white font-bold'
                          : 'border-zinc-850 bg-zinc-950 text-zinc-400'
                      }`}
                    >
                      <span>{cand.action}</span>
                      <div className="flex items-center gap-2">
                        <span>+{(cand.predicted_gain * 100).toFixed(0)}%</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Decision Rationale */}
            <div className="p-4 rounded-xl bg-white text-zinc-950 space-y-1">
              <span className="text-[10px] font-bold uppercase text-zinc-700 block">Selected: {selectedIntervention}</span>
              <p className="text-xs text-zinc-800 font-semibold">{selectedReason}</p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowTransparencyModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg text-xs"
              >
                Close Explanation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

