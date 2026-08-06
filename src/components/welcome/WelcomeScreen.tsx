import React, { useState } from 'react';
import { Bot, ArrowRight, ShieldCheck, Cloud, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAppStore } from '../../stores/appStore';
import { AiExecutionMode } from '../../services/types';

interface WelcomeScreenProps {
  onContinue: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onContinue }) => {
  const { assistantName, aiMode: currentAiMode, updateSetting } = useAppStore();
  const [name, setName] = useState(assistantName);
  const [selectedMode, setSelectedMode] = useState<AiExecutionMode>(currentAiMode || 'hybrid');

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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f6f5f2] p-6 relative overflow-hidden select-none">
      <div className="relative z-10 max-w-lg w-full rounded-2xl bg-white p-8 border border-zinc-200 shadow-sm space-y-8 animate-in fade-in zoom-in duration-300">
        {/* App Logo & Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 mb-2 shadow-sm">
            <Bot className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight gradient-text">
            Welcome to Nexus Agent
          </h1>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto">
            Choose how you'd like to use AI.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Input
              label="What would you like to call your AI assistant?"
              placeholder="e.g. Nexus Agent, Jarvis, Antigravity..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-base py-3"
              autoFocus
            />
          </div>

          {/* AI Execution Mode Selection */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider block">
              AI Execution Mode
            </label>
            <div className="grid grid-cols-1 gap-3">
              {/* Local Mode */}
              <div
                onClick={() => setSelectedMode('local')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedMode === 'local'
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900">Local AI</span>
                    <input
                      type="radio"
                      name="aiMode"
                      checked={selectedMode === 'local'}
                      onChange={() => setSelectedMode('local')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Runs offline with local Ollama models. Complete privacy, 0 API cost.
                  </p>
                </div>
              </div>

              {/* Cloud Mode */}
              <div
                onClick={() => setSelectedMode('cloud')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedMode === 'cloud'
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 mt-0.5">
                  <Cloud className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900">Cloud AI</span>
                    <input
                      type="radio"
                      name="aiMode"
                      checked={selectedMode === 'cloud'}
                      onChange={() => setSelectedMode('cloud')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Use API keys for OpenAI, Claude, Gemini, Groq. Lightweight, no model downloads.
                  </p>
                </div>
              </div>

              {/* Hybrid Mode (Recommended) */}
              <div
                onClick={() => setSelectedMode('hybrid')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedMode === 'hybrid'
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-500'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900">Hybrid AI</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        Recommended
                      </span>
                    </div>
                    <input
                      type="radio"
                      name="aiMode"
                      checked={selectedMode === 'hybrid'}
                      onChange={() => setSelectedMode('hybrid')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Smart routing: use local AI for private/routine work, cloud AI for advanced tasks.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full text-base py-3 font-semibold"
            rightIcon={<ArrowRight className="w-5 h-5" />}
          >
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
};
