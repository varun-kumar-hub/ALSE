import React, { useState, useEffect } from 'react';
import {
  X,
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  AssessmentQuestion,
  AssessmentResult,
  generateAdaptiveAssessment,
  submitAssessmentAnswers,
} from '../../services/assessmentEngine';

interface AssessmentModalProps {
  isOpen: boolean;
  topicTitle: string;
  extractedConcepts?: string[];
  onClose: () => void;
  onStartRemediationChat: (prompt: string) => void;
}

export const AssessmentModal: React.FC<AssessmentModalProps> = ({
  isOpen,
  topicTitle,
  extractedConcepts = [],
  onClose,
  onStartRemediationChat,
}) => {
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [responseTimes, setResponseTimes] = useState<Record<string, number>>({});
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<AssessmentResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      const generated = generateAdaptiveAssessment(topicTitle, extractedConcepts);
      setQuestions(generated);
      setCurrentIndex(0);
      setSelectedAnswers({});
      setResponseTimes({});
      setResults(null);
      setQuestionStartTime(Date.now());
    }
  }, [isOpen, topicTitle]);

  if (!isOpen) return null;

  const currentQ = questions[currentIndex];
  const totalQ = questions.length;
  const isLastQuestion = currentIndex === totalQ - 1;

  const handleSelectOption = (optionIndex: number) => {
    if (results) return; // Locked when result shown
    const elapsed = Date.now() - questionStartTime;
    setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: optionIndex }));
    setResponseTimes((prev) => ({ ...prev, [currentQ.id]: (prev[currentQ.id] || 0) + elapsed }));
  };

  const handleNext = () => {
    if (currentIndex < totalQ - 1) {
      setCurrentIndex((prev) => prev + 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await submitAssessmentAnswers(questions, selectedAnswers, responseTimes);
      setResults(res);
    } catch (err) {
      console.warn('Assessment evaluation error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemediate = () => {
    if (!results || results.weakConcepts.length === 0) {
      onStartRemediationChat(`Let's review the key concepts of ${topicTitle} with examples.`);
    } else {
      const weakList = results.weakConcepts.join(', ');
      onStartRemediationChat(
        `I need help understanding these weak areas from my assessment on ${topicTitle}: ${weakList}. Please explain why I might have made mistakes and provide clear examples.`
      );
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-2xl bg-white dark:bg-[#151922] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-sans transition-colors">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-850 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                Adaptive Assessment: {topicTitle}
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono">
                {results ? 'Assessment Results & Knowledge State' : `Question ${currentIndex + 1} of ${totalQ}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {!results ? (
            /* Question Phase */
            currentQ && (
              <div className="space-y-6">
                {/* Progress bar */}
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${((currentIndex + 1) / totalQ) * 100}%` }}
                  />
                </div>

                {/* Concept Tag */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-mono font-bold border border-blue-200 dark:border-blue-800/60 uppercase tracking-wider">
                    Topic: {currentQ.concept_name}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Target Difficulty: {(currentQ.difficulty * 100).toFixed(0)}%
                  </span>
                </div>

                {/* Question Prompt */}
                <h4 className="text-base font-bold text-zinc-950 dark:text-white leading-snug">
                  {currentQ.question}
                </h4>

                {/* Options List */}
                <div className="space-y-3 pt-1">
                  {currentQ.options.map((opt, optIdx) => {
                    const isSelected = selectedAnswers[currentQ.id] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(optIdx)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3 text-xs leading-relaxed cursor-pointer font-sans ${
                          isSelected
                            ? 'bg-blue-500/10 border-blue-500 text-blue-950 dark:text-blue-100 font-semibold shadow-2xs'
                            : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 mt-0.5 border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-500 font-bold'
                              : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="flex-1">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            /* Results Phase */
            <div className="space-y-6">
              {/* Score Header */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/40 text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-xl shadow-xs mx-auto">
                  {results.scorePercent}%
                </div>
                <h4 className="text-base font-bold text-zinc-950 dark:text-white">
                  {results.scorePercent >= 75 ? 'Strong Mastery Demonstrated!' : 'Learning Opportunities Identified'}
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono max-w-md mx-auto">
                  Answered {results.correctCount} of {results.totalQuestions} questions correctly. Interaction evidence has updated your BKT learner model.
                </p>
              </div>

              {/* Concept Mastery Breakdown */}
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider block">
                  Concept Mastery Adjustments
                </span>
                <div className="space-y-2">
                  {Object.entries(results.conceptBreakdown).map(([cId, item]) => (
                    <div
                      key={cId}
                      className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        {item.correct ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        )}
                        <span className="font-semibold text-zinc-900 dark:text-zinc-200">{item.concept_name}</span>
                      </div>
                      <span
                        className={`font-bold ${
                          item.masteryChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                        }`}
                      >
                        {item.masteryChange >= 0 ? `+${(item.masteryChange * 100).toFixed(0)}%` : `${(item.masteryChange * 100).toFixed(0)}%`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detected Misconceptions */}
              {results.detectedMisconceptions.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs font-mono">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Identified Misconception Flags</span>
                  </div>
                  {results.detectedMisconceptions.map((m, idx) => (
                    <p key={idx} className="text-xs text-amber-900 dark:text-amber-200 pl-6 leading-relaxed">
                      • {m}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-850 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60">
          {!results ? (
            <>
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-40 transition cursor-pointer font-mono"
              >
                Previous
              </button>

              {isLastQuestion ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || selectedAnswers[currentQ?.id] === undefined}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Submit Assessment'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={selectedAnswers[currentQ?.id] === undefined}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  Next Question
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer font-mono"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleRemediate}
                className="px-5 py-2.5 bg-blue-600 dark:bg-white text-white dark:text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs hover:bg-blue-500 dark:hover:bg-zinc-200 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400 dark:text-zinc-900" />
                Remediate & Explain Concepts
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
