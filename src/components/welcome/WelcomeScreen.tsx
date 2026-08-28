import React, { useState } from 'react';
import { Brain, ArrowRight, ShieldCheck, Cloud } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAppStore } from '../../stores/appStore';
import { AiExecutionMode } from '../../services/types';

interface WelcomeScreenProps {
  onContinue: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onContinue }) => {
  const { assistantName, aiMode: currentAiMode, updateSetting } = useAppStore();
  const [name, setName] = useState(assistantName || 'LearnForge Agent');
  const [selectedMode, setSelectedMode] = useState<AiExecutionMode>(currentAiMode || 'cloud');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      await updateSetting('assistantName', name.trim());
    }
    await updateSetting('aiMode', selectedMode);
    await updateSetting('onboardingComplete', 'true');
    onContinue();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 p-6 relative overflow-hidden select-none text-white font-sans">
      <div className="relative z-10 max-w-lg w-full rounded-2xl bg-zinc-900 p-8 border border-zinc-800 shadow-xl space-y-8 animate-in fade-in zoom-in duration-300">
        {/* App Logo & Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 text-white mb-2 shadow-sm">
            <Brain className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Welcome to LearnForge
          </h1>
          <p className="text-xs text-blue-400 font-mono font-semibold uppercase tracking-wider">
            Forge Your Path to Mastery
          </p>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto font-sans leading-relaxed">
            An AI-powered adaptive learning platform that continuously understands the learner and shapes their learning journey toward mastery.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Input
              label="What would you like to call your adaptive learning agent?"
              placeholder="e.g. LearnForge Agent, Antigravity..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-base py-3 bg-zinc-950 border-zinc-800 text-white"
              autoFocus
            />
          </div>

          {/* AI Execution Mode Selection */}
          <div className="space-y-3 font-mono text-xs">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              AI Execution Mode
            </label>
            <div className="grid grid-cols-1 gap-3">
              {/* Local Mode */}
              <div
                onClick={() => setSelectedMode('local')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedMode === 'local'
                    ? 'border-white bg-zinc-850 shadow-sm'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950'
                }`}
              >
                <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Local AI Mode</span>
                    <input
                      type="radio"
                      name="aiMode"
                      checked={selectedMode === 'local'}
                      onChange={() => setSelectedMode('local')}
                      className="text-white"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Runs offline with local Ollama models. Complete privacy.
                  </p>
                </div>
              </div>

              {/* Cloud Mode */}
              <div
                onClick={() => setSelectedMode('cloud')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedMode === 'cloud'
                    ? 'border-white bg-zinc-850 shadow-sm'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950'
                }`}
              >
                <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 mt-0.5">
                  <Cloud className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Cloud AI Mode</span>
                    <input
                      type="radio"
                      name="aiMode"
                      checked={selectedMode === 'cloud'}
                      onChange={() => setSelectedMode('cloud')}
                      className="text-white"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Use cloud providers (OpenAI, Claude, Gemini, Groq). Lightweight execution.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full text-base py-3 font-bold bg-white text-zinc-950 hover:bg-zinc-200"
            rightIcon={<ArrowRight className="w-5 h-5" />}
          >
            Continue to LearnForge
          </Button>
        </form>
      </div>
    </div>
  );
};
