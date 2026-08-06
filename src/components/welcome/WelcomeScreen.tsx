import React, { useState } from 'react';
import { Bot, ArrowRight, ShieldCheck, Cpu, HardDrive } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAppStore } from '../../stores/appStore';

interface WelcomeScreenProps {
  onContinue: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onContinue }) => {
  const { assistantName, updateSetting } = useAppStore();
  const [name, setName] = useState(assistantName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      await updateSetting('assistantName', name.trim());
    }
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
            Nexus Agent
          </h1>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto">
            Your local-first, privacy-focused intelligent AI platform.
          </p>
        </div>

        {/* Custom Assistant Name Form */}
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
            <p className="text-xs text-zinc-500">
              Stored locally on your device. You can change this anytime in Settings.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <ShieldCheck className="w-5 h-5 text-emerald-600 mb-1.5" />
              <span className="text-xs font-semibold text-zinc-900">100% Local</span>
              <span className="text-[10px] text-zinc-500">No cloud upload</span>
            </div>
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <Cpu className="w-5 h-5 text-blue-600 mb-1.5" />
              <span className="text-xs font-semibold text-zinc-900">AI Runtime</span>
              <span className="text-[10px] text-zinc-500">Prepared for you</span>
            </div>
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <HardDrive className="w-5 h-5 text-teal-600 mb-1.5" />
              <span className="text-xs font-semibold text-zinc-900">SQLite Storage</span>
              <span className="text-[10px] text-zinc-500">Local-first data</span>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full text-base py-3 font-semibold"
            rightIcon={<ArrowRight className="w-5 h-5" />}
          >
            Get Started
          </Button>
        </form>
      </div>
    </div>
  );
};
