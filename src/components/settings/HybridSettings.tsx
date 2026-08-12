import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Cloud,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { ProviderConfig } from '../../services/types';
import { useAppStore } from '../../stores/appStore';

interface HybridSettingsProps {
  providerConfigs: ProviderConfig[];
}

export const HybridSettings: React.FC<HybridSettingsProps> = ({ providerConfigs }) => {
  const { models, selectedModel, setSelectedModel, aiMode, updateSetting } = useAppStore();
  const [modelStrategy, setModelStrategy] = useState<'manual' | 'auto'>('manual');
  const [executionPriority, setExecutionPriority] = useState<'cloud-first' | 'local-first'>('cloud-first');

  const handlePriorityChange = (priority: 'cloud-first' | 'local-first') => {
    setExecutionPriority(priority);
    if (priority === 'cloud-first') {
      updateSetting('aiMode', 'cloud');
    } else {
      updateSetting('aiMode', 'local');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-250 select-none text-xs">
      {/* Header Card */}
      <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <div>
              <h4 className="font-bold text-sm text-purple-950">Model & Intelligence Control Center</h4>
              <p className="text-[10px] text-purple-700">Configure manual model selection vs automatic intent routing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Model Override vs Smart Auto-Routing */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5 uppercase tracking-wider">
          <Sliders className="w-4 h-4 text-purple-600" /> Model Selection Mode
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            onClick={() => setModelStrategy('manual')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all space-y-2 ${
              modelStrategy === 'manual'
                ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500'
                : 'border-zinc-200 bg-white hover:border-zinc-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-950 text-xs">Strict Manual Selection (Recommended)</span>
              {modelStrategy === 'manual' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Always use the exact model you select in the top header dropdown. No automatic overriding.
            </p>
          </div>

          <div
            onClick={() => setModelStrategy('auto')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all space-y-2 ${
              modelStrategy === 'auto'
                ? 'border-purple-500 bg-purple-50/50 shadow-sm ring-1 ring-purple-500'
                : 'border-zinc-200 bg-white hover:border-zinc-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-950 text-xs">Smart Intent Auto-Routing</span>
              {modelStrategy === 'auto' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Automatically selects specialized models based on query intent (Coding, Research, Q&A).
            </p>
          </div>
        </div>
      </div>

      {/* Primary Execution Priority Selector */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5 uppercase tracking-wider">
          <Zap className="w-4 h-4 text-amber-500" /> Primary Execution Priority
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            onClick={() => handlePriorityChange('cloud-first')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all space-y-2 ${
              aiMode === 'cloud' || executionPriority === 'cloud-first'
                ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500'
                : 'border-zinc-200 bg-white hover:border-zinc-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-950 text-xs flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-blue-600" /> Cloud AI First
              </span>
              {(aiMode === 'cloud' || executionPriority === 'cloud-first') && (
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
              )}
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Prioritize cloud providers (OpenCode, OpenAI, Claude, Gemini). Never fallback silently to local.
            </p>
          </div>

          <div
            onClick={() => handlePriorityChange('local-first')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all space-y-2 ${
              aiMode === 'local' || executionPriority === 'local-first'
                ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-500'
                : 'border-zinc-200 bg-white hover:border-zinc-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-950 text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Local AI First (Offline)
              </span>
              {(aiMode === 'local' || executionPriority === 'local-first') && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Run models 100% locally via Ollama. Maximum privacy with 0 API costs.
            </p>
          </div>
        </div>
      </div>

      {/* Manual Selected Model Selector */}
      <div className="p-4 rounded-2xl border border-zinc-200 bg-white space-y-3 shadow-sm">
        <label className="text-xs font-bold text-zinc-900 block">
          Currently Selected Model Target
        </label>
        <div className="flex items-center gap-3">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-mono font-bold focus:outline-none focus:border-blue-500"
          >
            <optgroup label="Local Ollama Models">
              {models.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} (Local)
                </option>
              ))}
            </optgroup>
            <optgroup label="Connected Cloud Models">
              {providerConfigs
                .filter((p) => p.apiKeySet || Boolean(p.apiKey && p.apiKey.trim().length > 0))
                .map((p) => (
                  <option key={p.id} value={p.defaultModel}>
                    {p.defaultModel} ({p.name})
                  </option>
                ))}
            </optgroup>
          </select>
        </div>
      </div>
    </div>
  );
};
