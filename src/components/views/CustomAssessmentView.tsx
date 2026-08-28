import React, { useState } from 'react';
import {
  Award,
  Sparkles,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Target,
  Brain,
  Sliders,
  Zap,
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

const PRESET_TOPICS = [
  'Deep Learning & Neural Networks',
  'Operating Systems & Concurrency',
  'Computer Networks & TCP/IP',
  'Data Structures & Algorithms (DSA)',
  'Machine Learning Fundamentals',
  'Database Management & SQL Optimizations',
  'Cloud Architecture & Microservices',
  'Rust Memory Safety & Lifetimes',
];

export const CustomAssessmentView: React.FC<CustomAssessmentViewProps> = ({
  onStartRemediationChat,
}) => {
  const [topic, setTopic] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [questionCount, setQuestionCount] = useState<number>(3);

  // Active quiz state
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [responseTimes, setResponseTimes] = useState<Record<string, number>>({});
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [results, setResults] = useState<AssessmentResult | null>(null);

  const activeTopic = topic || customInput.trim() || 'Custom Knowledge Assessment';

  const handleStartQuiz = () => {
    const selectedTopic = customInput.trim() || topic || 'General Computer Science';
    const generated = generateAdaptiveAssessment(selectedTopic, [selectedTopic]);
    setQuestions(generated.slice(0, questionCount));
    setCurrentIndex(0);
    setSelectedAnswers({});
    setResponseTimes({});
    setResults(null);
    setStartTime(Date.now());
    setIsQuizActive(true);
  };

  const handleSelectOption = (optionIndex: number) => {
    if (results) return;
    const currentQ = questions[currentIndex];
    const elapsed = Date.now() - startTime;
    setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: optionIndex }));
    setResponseTimes((prev) => ({ ...prev, [currentQ.id]: (prev[currentQ.id] || 0) + elapsed }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setStartTime(Date.now());
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setStartTime(Date.now());
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
    <div className="flex-1 h-full flex flex-col bg-[#fbfcfd] dark:bg-[#0d0f12] text-zinc-900 dark:text-zinc-100 overflow-y-auto font-sans transition-colors select-none">
      <div className="max-w-3xl w-full mx-auto px-4 py-8 md:py-12 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
                Custom Topic Assessment
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                Evaluate knowledge mastery across any custom subject with Bayesian Knowledge Tracing
              </p>
            </div>
          </div>
        </div>

        {!isQuizActive ? (
          /* Topic Configuration Card */
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-[#151922] border border-zinc-200 dark:border-zinc-800/80 shadow-sm space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                  <Target className="w-3.5 h-3.5 text-blue-500" /> Enter Custom Assessment Topic
                </label>
                <input
                  type="text"
                  placeholder="e.g. Transformer Attention Mechanics, Linux Kernel Scheduling, Raft Consensus..."
                  value={customInput}
                  onChange={(e) => {
                    setCustomInput(e.target.value);
                    if (topic) setTopic('');
                  }}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:border-blue-500 transition font-sans"
                />
              </div>

              {/* Preset Topic Pills */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-zinc-500">Or pick from popular learning topics:</span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_TOPICS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTopic(t);
                        setCustomInput('');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                        topic === t
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700/60'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assessment Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-mono flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-500" /> Target Difficulty
                  </label>
                  <div className="flex gap-1.5">
                    {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDifficulty(d)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-semibold capitalize transition cursor-pointer ${
                          difficulty === d
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-xs'
                            : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-mono flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-blue-500" /> Question Count
                  </label>
                  <div className="flex gap-1.5">
                    {[3, 5, 10].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setQuestionCount(count)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          questionCount === count
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {count} Questions
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartQuiz}
                  className="w-full py-3.5 bg-blue-600 dark:bg-white hover:bg-blue-500 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-bold rounded-2xl transition flex items-center justify-center gap-2 shadow-sm text-sm cursor-pointer"
                >
                  <Brain className="w-4 h-4" />
                  <span>Start Adaptive Assessment for "{customInput.trim() || topic || 'Deep Learning & Neural Networks'}"</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Active Assessment Stage */
          <div className="p-6 rounded-3xl bg-white dark:bg-[#151922] border border-zinc-200 dark:border-zinc-800/80 shadow-sm space-y-6">
            {!results ? (
              /* Question Phase */
              currentQ && (
                <div className="space-y-6">
                  {/* Progress Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400">
                      Topic: {activeTopic}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
                      Question {currentIndex + 1} of {totalQ}
                    </span>
                  </div>

                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${((currentIndex + 1) / totalQ) * 100}%` }}
                    />
                  </div>

                  <h3 className="text-base font-bold text-zinc-950 dark:text-white leading-snug">
                    {currentQ.question}
                  </h3>

                  <div className="space-y-3">
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
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer shadow-xs"
                      >
                        Next Question
                      </button>
                    )}
                  </div>
                </div>
              )
            ) : (
              /* Results Phase */
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/40 text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-xl shadow-xs mx-auto">
                    {results.scorePercent}%
                  </div>
                  <h4 className="text-base font-bold text-zinc-950 dark:text-white">
                    {results.scorePercent >= 75 ? 'Strong Mastery Demonstrated!' : 'Learning Opportunities Identified'}
                  </h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    You answered {results.correctCount} of {results.totalQuestions} questions correctly.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
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
                          `Let's review the weak areas from my assessment on ${activeTopic}: ${results.weakConcepts.join(', ') || activeTopic}.`
                        )
                      }
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Start Adaptive Remediation</span>
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
