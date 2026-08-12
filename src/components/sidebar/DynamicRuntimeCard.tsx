import React from 'react';
import { ShieldCheck, Cloud, Sparkles, Zap } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

interface DynamicRuntimeCardProps {
  compact?: boolean;
}

export const DynamicRuntimeCard: React.FC<DynamicRuntimeCardProps> = ({ compact = false }) => {
  const { aiMode, selectedModel, providerConfigs } = useAppStore();

  const activeCloud =
    providerConfigs.find((p) => (p.apiKeySet || Boolean(p.apiKey && p.apiKey.trim().length > 0)) && p.enabled) ||
    providerConfigs.find((p) => p.apiKeySet || Boolean(p.apiKey && p.apiKey.trim().length > 0));

  const getRuntimeBadge = () => {
    switch (aiMode) {
      case 'local':
        return {
          label: 'Local Mode',
          provider: 'Ollama Runtime',
          model: selectedModel || 'qwen3:8b',
          status: '100% Offline',
          icon: ShieldCheck,
          accent: 'emerald',
          border: 'border-emerald-200',
          bg: 'bg-emerald-50/50',
          color: 'text-emerald-700',
          badgeBg: 'bg-emerald-100 text-emerald-800',
          speed: '62 tok/s',
        };
      case 'cloud':
        return {
          label: 'Cloud Mode',
          provider: activeCloud ? activeCloud.name : 'Cloud Provider',
          model: activeCloud ? activeCloud.defaultModel : 'No Key Set',
          status: activeCloud ? 'Connected' : 'Key Required',
          icon: Cloud,
          accent: 'blue',
          border: 'border-blue-200',
          bg: 'bg-blue-50/50',
          color: 'text-blue-700',
          badgeBg: 'bg-blue-100 text-blue-800',
          speed: '182 ms latency',
        };
      case 'hybrid':
      default:
        return {
          label: 'Hybrid Mode',
          provider: 'Smart Routing',
          model: `${selectedModel || 'Local'} + ${activeCloud ? activeCloud.name : 'Cloud'}`,
          status: 'Ready',
          icon: Sparkles,
          accent: 'purple',
          border: 'border-purple-200',
          bg: 'bg-purple-50/50',
          color: 'text-purple-700',
          badgeBg: 'bg-purple-100 text-purple-800',
          speed: 'Balanced Strategy',
        };
    }
  };

  const runtime = getRuntimeBadge();
  const IconComp = runtime.icon;

  if (compact) {
    return (
      <div className="flex justify-center p-2">
        <div
          title={`${runtime.label} (${runtime.model})`}
          className={`p-2 rounded-xl border ${runtime.border} ${runtime.bg} ${runtime.color}`}
        >
          <IconComp className="w-4 h-4" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        const settingsBtn = document.querySelector<HTMLButtonElement>('button[title="Open Settings"]');
        settingsBtn?.click();
      }}
      title="Click to open Model Manager & Settings"
      className={`p-3 rounded-2xl border ${runtime.border} ${runtime.bg} select-none space-y-2 text-xs hover:shadow-md cursor-pointer transition-all active:scale-[0.99]`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-zinc-900">
          <IconComp className={`w-4 h-4 ${runtime.color}`} />
          <span>{runtime.label}</span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${runtime.badgeBg}`}>
          ✓ {runtime.status}
        </span>
      </div>

      <div className="space-y-0.5 pt-0.5">
        <div className="flex justify-between text-[11px]">
          <span className="text-zinc-500 font-medium">{runtime.provider}</span>
          <span className="font-mono text-zinc-700 font-bold truncate max-w-[120px]">{runtime.model}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono pt-1 border-t border-zinc-200/50">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" /> Runtime Speed
          </span>
          <span>{runtime.speed}</span>
        </div>
      </div>
    </div>
  );
};
