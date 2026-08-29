import React, { useState, useEffect, useCallback } from 'react';
import { StoryDecisionPoint, InterventionType } from '../../services/ps6Types';
import { rankActionsML } from '../../services/ps6MlClient';
import { ps6Db } from '../../services/ps6Database';
import { getProjects } from '../../services/database';
import { getSubjectStorySteps } from '../../services/subjectStoryGenerator';
import {
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Clock,
  Trophy,
  Brain,
  X,
  Sparkles,
  Lightbulb,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';

interface StoryChallengeViewProps {
  projectId?: string | null;
  topicName?: string;
  onExplainInChat?: (prompt: string) => void;
}

interface StepAttempt {
  selectedOptionId: string;
  isCorrect: boolean;
  isAnswered: boolean;
  timestamp: number;
}

interface StoredAdaptiveState {
  attempts: Record<number, StepAttempt>;
  currentStepIdx: number;
  score: number;
  budgetRemaining: number;
  currentMastery: number;
  confidence: number;
  learnerAbility: number;
  recentAccuracy: number;
  repeatedErrors: number;
  hasMisconception: boolean;
  sessionCompleted: boolean;
}

export const StoryChallengeView: React.FC<StoryChallengeViewProps> = ({
  projectId,
  topicName,
  onExplainInChat,
}) => {
  const [activeSubjectName, setActiveSubjectName] = useState<string>(topicName || 'Operating Systems');
  const [storySteps, setStorySteps] = useState<StoryDecisionPoint[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [budgetRemaining, setBudgetRemaining] = useState(10);
  const [attempts, setAttempts] = useState<Record<number, StepAttempt>>({});

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

  const getStorageKey = useCallback((subj: string) => {
    return `learnforge_story_state_${subj.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }, []);

  // Save state to localStorage whenever attempts or progress changes
  const saveStateToStorage = useCallback(
    (
      subj: string,
      nextAttempts: Record<number, StepAttempt>,
      stepIdx: number,
      newScore: number,
      newBudget: number,
      mastery: number,
      conf: number,
      ability: number,
      acc: number,
      repErr: number,
      miscon: boolean,
      completed: boolean
    ) => {
      const stateObj: StoredAdaptiveState = {
        attempts: nextAttempts,
        currentStepIdx: stepIdx,
        score: newScore,
        budgetRemaining: newBudget,
        currentMastery: mastery,
        confidence: conf,
        learnerAbility: ability,
        recentAccuracy: acc,
        repeatedErrors: repErr,
        hasMisconception: miscon,
        sessionCompleted: completed,
      };
      try {
        localStorage.setItem(getStorageKey(subj), JSON.stringify(stateObj));
      } catch (err) {
        console.warn('Failed to save adaptive state:', err);
      }
    },
    [getStorageKey]
  );

  // Resolve subject and load persistent state
  useEffect(() => {
    const resolveSubject = async () => {
      let subj = topicName || 'Operating Systems';
      if (projectId) {
        const projs = await getProjects();
        const found = projs.find((p) => p.id === projectId);
        if (found) {
          subj = found.name;
        }
      }
      setActiveSubjectName(subj);

      const generatedSteps = getSubjectStorySteps(subj);
      setStorySteps(generatedSteps);

      // Check if persistent attempt state exists for this subject
      const savedRaw = localStorage.getItem(getStorageKey(subj));
      if (savedRaw) {
        try {
          const saved: StoredAdaptiveState = JSON.parse(savedRaw);
          const restoredAttempts = saved.attempts || {};
          setAttempts(restoredAttempts);

          const safeStepIdx = Math.min(saved.currentStepIdx ?? 0, generatedSteps.length - 1);
          setCurrentStepIdx(safeStepIdx);
          setScore(saved.score ?? 0);
          setBudgetRemaining(saved.budgetRemaining ?? 10);
          setCurrentMastery(saved.currentMastery ?? 0.46);
          setConfidence(saved.confidence ?? 0.71);
          setLearnerAbility(saved.learnerAbility ?? 0.48);
          setRecentAccuracy(saved.recentAccuracy ?? 0.52);
          setRepeatedErrors(saved.repeatedErrors ?? 0);
          setHasMisconception(saved.hasMisconception ?? false);
          setSessionCompleted(Boolean(saved.sessionCompleted));

          // Restore current step's answered status
          const currentAttempt = restoredAttempts[safeStepIdx];
          if (currentAttempt && currentAttempt.isAnswered) {
            setSelectedOptionId(currentAttempt.selectedOptionId);
            setIsAnswered(true);
          } else {
            setSelectedOptionId(null);
            setIsAnswered(false);
          }
          return;
        } catch (e) {
          console.warn('Error reading saved adaptive state:', e);
        }
      }

      // Default fresh state if no previous attempt exists
      setAttempts({});
      setCurrentStepIdx(0);
      setSelectedOptionId(null);
      setIsAnswered(false);
      setScore(0);
      setBudgetRemaining(10);
      setCurrentMastery(0.46);
      setConfidence(0.71);
      setLearnerAbility(0.48);
      setRecentAccuracy(0.52);
      setRepeatedErrors(1);
      setHasMisconception(true);
      setSessionCompleted(false);
    };

    resolveSubject();
  }, [projectId, topicName, getStorageKey]);

  const currentPoint = storySteps[currentStepIdx] || storySteps[0];

  const handleSelectOption = (optId: string) => {
    if (isAnswered) return;
    setSelectedOptionId(optId);
  };

  const handleStepClick = (idx: number) => {
    if (idx === currentStepIdx) return;
    setCurrentStepIdx(idx);
    const existingAttempt = attempts[idx];
    if (existingAttempt && existingAttempt.isAnswered) {
      setSelectedOptionId(existingAttempt.selectedOptionId);
      setIsAnswered(true);
    } else {
      setSelectedOptionId(null);
      setIsAnswered(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOptionId || isAnswered || !currentPoint) return;
    setIsAnswered(true);

    const selectedOpt = currentPoint.options.find((o) => o.id === selectedOptionId);
    const isCorrect = selectedOpt?.is_correct || false;

    const newScore = score + (isCorrect ? 1 : 0);
    const newMastery = isCorrect ? Math.min(0.98, currentMastery + 0.12) : Math.max(0.15, currentMastery - 0.08);
    const newAccuracy = isCorrect ? Math.min(0.95, recentAccuracy + 0.15) : Math.max(0.20, recentAccuracy - 0.12);
    const newConfidence = isCorrect ? Math.min(0.95, confidence + 0.08) : confidence;
    const newAbility = isCorrect ? Math.min(0.95, learnerAbility + 0.08) : Math.max(0.10, learnerAbility - 0.06);
    const newMiscon = !isCorrect && Boolean(selectedOpt?.misconception_flag);
    const newRepeatedErrors = newMiscon ? repeatedErrors + 1 : repeatedErrors;
    const nextBudget = Math.max(0, budgetRemaining - 1);

    setScore(newScore);
    setCurrentMastery(newMastery);
    setRecentAccuracy(newAccuracy);
    setConfidence(newConfidence);
    setLearnerAbility(newAbility);
    setHasMisconception(newMiscon);
    setRepeatedErrors(newRepeatedErrors);
    setBudgetRemaining(nextBudget);

    const updatedAttempts = {
      ...attempts,
      [currentStepIdx]: {
        selectedOptionId,
        isCorrect,
        isAnswered: true,
        timestamp: Date.now(),
      },
    };
    setAttempts(updatedAttempts);

    saveStateToStorage(
      activeSubjectName,
      updatedAttempts,
      currentStepIdx,
      newScore,
      nextBudget,
      newMastery,
      newConfidence,
      newAbility,
      newAccuracy,
      newRepeatedErrors,
      newMiscon,
      sessionCompleted
    );

    // Invoke ML Action Ranker for dynamic next intervention guidance
    try {
      const rankingRes = await rankActionsML({
        concept: currentPoint.options[0]?.concept_id || 'core_concept',
        current_mastery: newMastery,
        learner_ability: newAbility,
        has_misconception: newMiscon,
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
    } catch (e) {
      console.warn('ML action ranking error:', e);
    }
  };

  const handleNextStep = () => {
    if (currentStepIdx + 1 < storySteps.length) {
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      const nextAttempt = attempts[nextIdx];
      if (nextAttempt && nextAttempt.isAnswered) {
        setSelectedOptionId(nextAttempt.selectedOptionId);
        setIsAnswered(true);
      } else {
        setSelectedOptionId(null);
        setIsAnswered(false);
      }
      saveStateToStorage(
        activeSubjectName,
        attempts,
        nextIdx,
        score,
        budgetRemaining,
        currentMastery,
        confidence,
        learnerAbility,
        recentAccuracy,
        repeatedErrors,
        hasMisconception,
        sessionCompleted
      );
    } else {
      setSessionCompleted(true);
      saveStateToStorage(
        activeSubjectName,
        attempts,
        currentStepIdx,
        score,
        budgetRemaining,
        currentMastery,
        confidence,
        learnerAbility,
        recentAccuracy,
        repeatedErrors,
        hasMisconception,
        true
      );
      ps6Db.saveStorySession({
        id: crypto.randomUUID(),
        topic: activeSubjectName,
        current_step: storySteps.length,
        total_steps: storySteps.length,
        score,
        time_spent_seconds: 240,
        budget_remaining: budgetRemaining,
        history: [],
      });
    }
  };

  const handleRestart = () => {
    if (
      Object.keys(attempts).length > 0 &&
      !window.confirm(`Restart Adaptive Learning for "${activeSubjectName}"? This will reset all your question answers and score.`)
    ) {
      return;
    }

    try {
      localStorage.removeItem(getStorageKey(activeSubjectName));
    } catch (e) {
      console.warn('Error clearing state:', e);
    }

    setAttempts({});
    setCurrentStepIdx(0);
    setSelectedOptionId(null);
    setIsAnswered(false);
    setScore(0);
    setBudgetRemaining(10);
    setCurrentMastery(0.46);
    setConfidence(0.71);
    setLearnerAbility(0.48);
    setRecentAccuracy(0.52);
    setRepeatedErrors(1);
    setHasMisconception(true);
    setSessionCompleted(false);
  };

  if (storySteps.length === 0 || !currentPoint) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-zinc-500 font-mono text-xs">
        Initializing adaptive learning workspace...
      </div>
    );
  }

  const selectedOpt = currentPoint.options.find((o) => o.id === selectedOptionId);
  const isCorrect = selectedOpt?.is_correct || false;
  const attemptedCount = Object.keys(attempts).length;

  return (
    <div className="flex-1 overflow-hidden bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans relative transition-colors select-none">
      {/* Workspace Top Header Bar */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-[#0f0f12] shadow-2xs">
        <div>
          <h1 className="text-base font-extrabold text-zinc-950 dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Adaptive Learning Workspace — {activeSubjectName}
          </h1>
          <p className="text-xs text-zinc-500 font-sans mt-0.5">
            Autonomous decision-driven story scenario with real-time concept evidence
          </p>
        </div>

        <div className="flex items-center gap-2.5 font-mono text-xs">
          {/* Explicit Restart Button */}
          <button
            type="button"
            onClick={handleRestart}
            className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 font-sans font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
            title="Reset and start this adaptive scenario again"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart Adaptive Learning</span>
          </button>

          <span className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 font-semibold">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            Budget: {budgetRemaining}/10
          </span>
          <span className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white flex items-center gap-1.5 font-semibold">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Score: {score}/{storySteps.length}
          </span>
        </div>
      </div>

      {sessionCompleted ? (
        /* Completion Summary Screen */
        <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
          <div className="max-w-md w-full border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 bg-white dark:bg-[#121215] text-center space-y-6 shadow-2xs">
            <Trophy className="w-16 h-16 text-amber-500 mx-auto" />
            <div>
              <h2 className="text-xl font-extrabold text-zinc-950 dark:text-white">Scenario Complete!</h2>
              <p className="text-xs text-zinc-500 font-mono mt-1.5">
                Final Score: {score} / {storySteps.length} ({((score / storySteps.length) * 100).toFixed(0)}% Mastery)
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-3 font-sans leading-relaxed">
                All 8 decision points have been evaluated. You can review individual questions above or restart the adaptive run below.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setSessionCompleted(false);
                  setCurrentStepIdx(0);
                  const attempt0 = attempts[0];
                  if (attempt0) {
                    setSelectedOptionId(attempt0.selectedOptionId);
                    setIsAnswered(true);
                  }
                }}
                className="w-full py-2.5 bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white font-bold rounded-lg transition text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                Review Questions & Explanations
              </button>

              <button
                onClick={handleRestart}
                className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition text-xs flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-98"
              >
                <RotateCcw className="w-4 h-4" />
                Restart Adaptive Learning
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Streamlined Responsive Workspace Layout */
        <div className="flex-1 overflow-y-auto flex flex-col p-4 md:p-6 space-y-4 max-w-6xl w-full mx-auto">
          {/* Top Horizontal Step Progression Bar */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 shadow-2xs flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            {storySteps.map((step, idx) => {
              const attempt = attempts[idx];
              const isDone = Boolean(attempt?.isAnswered);
              const isCurrent = idx === currentStepIdx;
              const wasCorrect = attempt?.isCorrect;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepClick(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 whitespace-nowrap transition shrink-0 cursor-pointer ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : isDone
                      ? wasCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60'
                        : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60'
                      : 'text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                  }`}
                >
                  {isDone ? (
                    wasCorrect ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    )
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-white shrink-0 animate-pulse" />
                  ) : (
                    <span className="w-2 h-2 rounded-full border border-zinc-300 dark:border-zinc-700 shrink-0" />
                  )}
                  <span>
                    D{step.id}: {step.title.split(':')[1]?.trim() || step.title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Main 2-Column Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-start">
            {/* Left/Center Decision & Challenge Card (8 cols) */}
            <div className="lg:col-span-8 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 md:p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 font-mono text-xs">
                <span className="text-zinc-500 uppercase font-bold text-[10px] tracking-wider flex items-center gap-1.5">
                  <span>Decision Point {currentPoint.id} of {storySteps.length}</span>
                  {isAnswered && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isCorrect
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {isCorrect ? 'COMPLETED (CORRECT)' : 'COMPLETED (INCORRECT)'}
                    </span>
                  )}
                </span>
                <span className="text-zinc-700 dark:text-zinc-300 font-semibold">{activeSubjectName}</span>
              </div>

              <div>
                <h2 className="text-base font-bold text-zinc-950 dark:text-white">{currentPoint.title}</h2>
                <div className="text-xs text-zinc-700 dark:text-zinc-300 mt-2.5 leading-relaxed font-mono bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  {currentPoint.scenario}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {currentPoint.options.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  let optStyle =
                    'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-zinc-400 dark:hover:border-zinc-600 text-zinc-800 dark:text-zinc-200';
                  if (isAnswered) {
                    if (opt.is_correct)
                      optStyle =
                        'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold shadow-2xs';
                    else if (isSelected && !opt.is_correct)
                      optStyle =
                        'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-medium';
                  } else if (isSelected) {
                    optStyle =
                      'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 font-semibold shadow-2xs';
                  }

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectOption(opt.id)}
                      disabled={isAnswered}
                      className={`w-full p-3.5 rounded-lg border text-left text-xs transition flex items-center justify-between gap-3 cursor-pointer ${optStyle}`}
                    >
                      <span className="leading-relaxed">{opt.text}</span>
                      {isAnswered && opt.is_correct && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Correct</span>
                        </span>
                      )}
                      {isAnswered && isSelected && !opt.is_correct && (
                        <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-mono text-[11px] font-bold shrink-0">
                          <XCircle className="w-4 h-4" />
                          <span>Your Choice</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* POST-SUBMISSION DETAILED EXPLANATION CARD */}
              {isAnswered && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-3 pt-2">
                  {/* Status Banner */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                      isCorrect
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100'
                        : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/80 text-rose-950 dark:text-rose-100'
                    }`}
                  >
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className="font-bold text-xs block">
                        {isCorrect ? '✅ Correct Answer!' : '❌ Incorrect Selection'}
                      </span>
                      {selectedOpt?.misconception_flag && !isCorrect && (
                        <p className="text-[11px] text-rose-800 dark:text-rose-300 font-mono leading-relaxed">
                          ⚠️ <strong>Identified Misconception:</strong> {selectedOpt.misconception_flag}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Comprehensive Explanation Breakdown */}
                  {currentPoint.explanation && (
                    <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200 font-mono">
                          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>Concept Breakdown & In-Depth Explanation</span>
                        </div>
                        {onExplainInChat && (
                          <button
                            type="button"
                            onClick={() => {
                              const prompt = `I have a doubt on this diagnostic question for "${activeSubjectName}":\n\n**${currentPoint.title}**\n\n**Scenario**: ${currentPoint.scenario}\n\n**Key Principle**: ${currentPoint.explanation}\n\nPlease clear my doubt in detail with step-by-step reasoning and intuitive examples.`;
                              onExplainInChat(prompt);
                            }}
                            className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-sans text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                            title={projectId ? 'Open a new chat in this subject to clear your doubt' : 'Open a new chat in General Chats to clear your doubt'}
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>{projectId ? 'Ask Doubt in Subject Chat' : 'Ask Doubt in General Chat'}</span>
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans whitespace-pre-line">
                        {currentPoint.explanation}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Submit & Next Action Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-[11px] font-mono text-zinc-400">
                  {attemptedCount} of {storySteps.length} attempted
                </span>

                <div className="flex items-center gap-2">
                  {!isAnswered ? (
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={!selectedOptionId}
                      className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition text-xs disabled:opacity-40 cursor-pointer shadow-xs active:scale-98"
                    >
                      Submit Choice
                    </button>
                  ) : (
                    <button
                      onClick={handleNextStep}
                      className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition text-xs flex items-center gap-2 cursor-pointer shadow-xs active:scale-98"
                    >
                      <span>
                        {currentStepIdx + 1 < storySteps.length ? 'Next Decision Point' : 'View Final Summary'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Agent Intelligence Panel (4 cols) */}
            <div className="lg:col-span-4 space-y-4 font-mono text-xs">
              {/* Learner State */}
              <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-2xs space-y-3">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  LEARNER STATE
                </span>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Mastery</span>
                    <span className="text-zinc-950 dark:text-white font-bold font-mono">
                      {(currentMastery * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${currentMastery * 100}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center pt-1 text-zinc-600 dark:text-zinc-400">
                    <span>Confidence</span>
                    <span className="text-zinc-900 dark:text-white font-semibold">
                      {(confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                    <span>Difficulty Fit</span>
                    <span className="text-zinc-900 dark:text-white font-semibold">
                      {learnerAbility > 0.6 ? 'Hard' : learnerAbility > 0.4 ? 'Medium' : 'Easy'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                    <span>Misconceptions</span>
                    <span className={hasMisconception ? 'text-amber-500 font-bold' : 'text-emerald-500'}>
                      {hasMisconception ? '1 Detected' : 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                    <span>Remaining Budget</span>
                    <span className="text-zinc-900 dark:text-white font-semibold">{budgetRemaining} / 10</span>
                  </div>
                </div>
              </div>

              {/* Next Intervention */}
              <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-2xs space-y-2.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  NEXT INTERVENTION
                </span>
                <div>
                  <span className="font-bold text-zinc-950 dark:text-white block">{selectedIntervention}</span>
                  <span className="text-[11px] text-zinc-500 block">
                    Expected Gain: +{(expectedGain * 100).toFixed(0)}%
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTransparencyModal(true)}
                  className="w-full py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-[11px] transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>Why this action?</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decision Transparency Modal ("Why this action?") */}
      {showTransparencyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f0f12] rounded-2xl p-6 space-y-6 shadow-2xl font-mono text-xs">
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                WHY THIS ACTION?
              </h3>
              <button
                onClick={() => setShowTransparencyModal(false)}
                className="text-zinc-400 hover:text-zinc-950 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Learner State Evidence Breakdown */}
            <div className="grid grid-cols-2 gap-2 text-zinc-700 dark:text-zinc-300">
              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex justify-between">
                <span className="text-zinc-400">Recent Accuracy</span>
                <span>{(recentAccuracy * 100).toFixed(0)}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex justify-between">
                <span className="text-zinc-400">Repeated Errors</span>
                <span>{repeatedErrors}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex justify-between">
                <span className="text-zinc-400">Current Mastery</span>
                <span>{(currentMastery * 100).toFixed(0)}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex justify-between">
                <span className="text-zinc-400">Misconception</span>
                <span className={hasMisconception ? 'text-amber-500 font-bold' : 'text-emerald-500'}>
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
                      { action: 'EASIER_CHALLENGE', predicted_gain: 0.04 },
                      { action: 'HARDER_CHALLENGE', predicted_gain: 0.09 },
                      { action: 'MISCONCEPTION_REMEDIATION', predicted_gain: 0.12 },
                    ]
                ).map((cand: any, idx: number) => {
                  const isChosen = cand.action === selectedIntervention;
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border flex justify-between items-center ${
                        isChosen
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 font-bold text-blue-950 dark:text-blue-100'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {isChosen && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        {cand.action}
                      </span>
                      <span>+{(cand.predicted_gain * 100).toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Model Rationale */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">POLICY RATIONALE</span>
              <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed">{selectedReason}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
