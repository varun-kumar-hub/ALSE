import React, { useState } from 'react';
import {
  Award,
  Target,
  Brain,
  Sliders,
  Zap,
  CheckCircle2,
  XCircle,
  MessageSquare,
  HelpCircle,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react';
import {
  AssessmentQuestion,
  generateAdaptiveAssessment,
  submitAssessmentAnswers,
  AssessmentResult,
} from '../../services/assessmentEngine';

interface CustomAssessmentViewProps {
  onStartRemediationChat?: (prompt: string) => void;
}

export const CustomAssessmentView: React.FC<CustomAssessmentViewProps> = ({
  onStartRemediationChat,
}) => {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [questionCount, setQuestionCount] = useState<number>(8);

  // Active quiz state
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [responseTimes, setResponseTimes] = useState<Record<string, number>>({});
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [results, setResults] = useState<AssessmentResult | null>(null);

  const activeTopic = topic.trim() || 'Custom Knowledge Assessment';

  const handleStartQuiz = () => {
    const selectedTopic = topic.trim() || 'General Engineering & Computing';
    const count = Math.max(8, questionCount || 8);
    const generated = generateAdaptiveAssessment(selectedTopic, [selectedTopic], count);
    setQuestions(generated);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setResponseTimes({});
    setQuestionStartTime(Date.now());
    setResults(null);
    setIsQuizActive(true);
  };

  const handleSelectOption = (optIdx: number) => {
    if (!currentQ) return;
    const elapsed = (Date.now() - questionStartTime) / 1000;
    setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: optIdx }));
    setResponseTimes((prev) => ({ ...prev, [currentQ.id]: elapsed }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handleSubmit = async () => {
    const res = await submitAssessmentAnswers(questions, selectedAnswers, responseTimes);
    setResults(res);
  };

  const handleReset = () => {
    setIsQuizActive(false);
    setResults(null);
    setSelectedAnswers({});
    setResponseTimes({});
  };

  const currentQ = questions[currentIndex];
  const totalQ = questions.length;

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 p-6 font-sans select-none">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                Custom Topic Assessment
              </h2>
              <p className="text-xs text-zinc-500 font-sans mt-0.5">
                Generate real-time adaptive assessments on any custom computer science or technical topic
              </p>
            </div>
          </div>
        </div>

        {/* Configuration State */}
        {!isQuizActive ? (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 space-y-5">
              {/* Topic Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                  <Target className="w-3.5 h-3.5 text-zinc-500" /> Enter Custom Assessment Topic
                </label>
                <input
                  type="text"
                  placeholder="e.g. CUDA Kernel Optimization, Raft Consensus, Graph Neural Networks..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 font-sans focus:outline-none focus:border-blue-500 transition shadow-2xs"
                />
              </div>

              {/* Assessment Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                    <Brain className="w-3.5 h-3.5 text-zinc-500" /> Target Difficulty
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setDifficulty(lvl)}
                        className={`py-2 text-xs font-semibold rounded-xl capitalize transition cursor-pointer border ${
                          difficulty === lvl
                            ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-xs'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                    <Sliders className="w-3.5 h-3.5 text-zinc-500" /> Questions Count (Min 8)
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[8, 10, 12, 15].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setQuestionCount(cnt)}
                        className={`py-2 text-xs font-semibold rounded-xl transition cursor-pointer border ${
                          questionCount === cnt
                            ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-xs'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                        }`}
                      >
                        {cnt} Qs
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Banner */}
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                <button
                  type="button"
                  onClick={handleStartQuiz}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer active:scale-98"
                >
                  <Zap className="w-4 h-4" />
                  <span>Start Adaptive Assessment</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Active Assessment Stage */
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-6">
            {!results ? (
              currentQ && (
                <div className="space-y-5">
                  {/* Progress Header */}
                  <div className="flex items-center justify-between font-mono text-xs text-zinc-500 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      Question {currentIndex + 1} of {totalQ}
                    </span>
                    <span>Topic: {activeTopic}</span>
                  </div>

                  {/* Question Stem */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-zinc-950 dark:text-white leading-relaxed">
                      {currentQ.question}
                    </h3>
                  </div>

                  {/* Options */}
                  <div className="space-y-2.5">
                    {currentQ.options.map((opt, optIdx) => {
                      const isSelected = selectedAnswers[currentQ.id] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(optIdx)}
                          className={`w-full p-3.5 rounded-xl border text-left text-xs transition flex items-start gap-3 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-600 text-blue-950 dark:text-blue-100 font-semibold shadow-2xs'
                              : 'bg-zinc-50/50 dark:bg-zinc-850/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-800 dark:text-zinc-200'
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
                          <span className="flex-1 leading-relaxed">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={handlePrev}
                      disabled={currentIndex === 0}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-750 disabled:opacity-40 transition cursor-pointer"
                    >
                      Previous
                    </button>

                    {currentIndex === totalQ - 1 ? (
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={Object.keys(selectedAnswers).length === 0}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition cursor-pointer shadow-xs"
                      >
                        Submit Assessment
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition cursor-pointer shadow-xs"
                      >
                        Next Question
                      </button>
                    )}
                  </div>
                </div>
              )
            ) : (
              /* Results & Detailed Question Review Phase */
              <div className="space-y-6">
                {/* Score Header */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/40 text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-xl shadow-xs mx-auto">
                    {results.scorePercent}%
                  </div>
                  <h4 className="text-base font-bold text-zinc-950 dark:text-white">
                    {results.scorePercent >= 75 ? 'Strong Mastery Demonstrated!' : 'Learning Opportunities Identified'}
                  </h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    You answered {results.correctCount} of {results.totalQuestions} questions correctly for <strong>{activeTopic}</strong>.
                  </p>
                </div>

                {/* Question-by-Question Review with Doubt Clearing */}
                <div className="space-y-3">
                  <span className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider block">
                    Question Breakdown & Doubt Clearing
                  </span>
                  <div className="space-y-3">
                    {questions.map((q, qIdx) => {
                      const chosenIdx = selectedAnswers[q.id];
                      const isCorrect = chosenIdx === q.correct_index;
                      const chosenOptText = chosenIdx !== undefined ? q.options[chosenIdx] : 'Unanswered';
                      const correctOptText = q.options[q.correct_index];

                      return (
                        <div
                          key={q.id}
                          className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200 dark:border-zinc-800 space-y-3 text-xs font-sans"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              {isCorrect ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <p className="font-semibold text-zinc-900 dark:text-zinc-100 leading-relaxed">
                                  Q{qIdx + 1}. {q.question}
                                </p>
                                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                                  Concept: {q.concept_name}
                                </p>
                              </div>
                            </div>

                            {onStartRemediationChat && (
                              <button
                                type="button"
                                onClick={() => {
                                  const prompt = `I have a doubt on Question ${qIdx + 1} from my assessment on "${activeTopic}":\n\n**Question**: ${q.question}\n- **My Selection**: ${chosenOptText}\n- **Correct Answer**: ${correctOptText}\n- **Explanation**: ${q.explanation}\n\nPlease clear my doubt step-by-step with an intuitive real-world example and explain why the correct option is true.`;
                                  onStartRemediationChat(prompt);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold font-sans flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-2xs"
                                title="Open a new chat in General Chats to explain this question in detail"
                              >
                                <HelpCircle className="w-3.5 h-3.5" />
                                <span>Ask Doubt in Chat</span>
                              </button>
                            )}
                          </div>

                          {/* Answer Comparison */}
                          <div className="pl-6 space-y-1 text-[11px] font-mono">
                            {!isCorrect && (
                              <p className="text-rose-600 dark:text-rose-400">
                                Your answer: <span className="line-through">{chosenOptText}</span>
                              </p>
                            )}
                            <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              Correct answer: {correctOptText}
                            </p>
                          </div>

                          {/* Explanation */}
                          {q.explanation && (
                            <div className="ml-6 p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 text-zinc-800 dark:text-zinc-200 text-xs leading-relaxed font-sans">
                              <div className="flex items-center gap-1.5 text-blue-900 dark:text-blue-300 font-bold font-mono text-[11px] mb-1">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                                <span>Explanation</span>
                              </div>
                              <p>{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Detected Misconceptions */}
                {results.detectedMisconceptions.length > 0 && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs font-mono">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Identified Misconception Flags</span>
                    </div>
                    {results.detectedMisconceptions.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 pl-6">
                        <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-mono">
                          • {m}
                        </p>
                        {onStartRemediationChat && (
                          <button
                            type="button"
                            onClick={() => {
                              const prompt = `During my assessment on "${activeTopic}", I encountered this misconception: "${m}". Can you provide a clear conceptual breakdown and an intuitive counter-example to resolve this misconception?`;
                              onStartRemediationChat(prompt);
                            }}
                            className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-amber-500/20 text-amber-900 dark:text-amber-200 hover:bg-amber-500/30 transition cursor-pointer shrink-0"
                          >
                            Explain Misconception
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                  >
                    Take Another Assessment
                  </button>

                  {onStartRemediationChat && (
                    <button
                      type="button"
                      onClick={() =>
                        onStartRemediationChat(
                          `Let's review the weak areas and clarify doubts from my assessment on "${activeTopic}": ${results.weakConcepts.join(', ') || activeTopic}.`
                        )
                      }
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Clear All Doubts in General Chat</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
