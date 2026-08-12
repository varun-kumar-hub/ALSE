import React, { useState, useEffect } from 'react';
import {
  Check,
  X,
  ShieldCheck,
  Cloud,
  Sparkles,
  Globe,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useAppStore } from '../../stores/appStore';
import { getDefaultWorkspacePath } from '../../services/workspace';
import { DEFAULT_PROVIDER_CONFIGS, mergeProviderConfigs } from '../../services/providers';
import { AiExecutionMode, ProviderConfig } from '../../services/types';

import { LocalSettings } from './LocalSettings';
import { CloudSettings } from './CloudSettings';
import { HybridSettings } from './HybridSettings';

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const {
    workspaceLocation,
    aiMode: savedAiMode,
    providerConfigs: savedProviderConfigs,
    updateSetting,
  } = useAppStore();

  const [workspacePath, setWorkspacePath] = useState(workspaceLocation);
  const [aiMode, setAiMode] = useState<AiExecutionMode>(savedAiMode || 'hybrid');
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>(() =>
    mergeProviderConfigs(savedProviderConfigs || DEFAULT_PROVIDER_CONFIGS)
  );

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!workspaceLocation) {
      getDefaultWorkspacePath().then(setWorkspacePath);
    }
  }, [workspaceLocation]);

  const handleSave = async () => {
    await updateSetting('workspaceLocation', workspacePath);
    await updateSetting('aiMode', aiMode);
    await updateSetting('providerConfigs', JSON.stringify(providerConfigs));

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleSaveProvider = async () => {
    await updateSetting('providerConfigs', JSON.stringify(providerConfigs));
  };

  const updateProviderConfig = (id: string, updates: Partial<ProviderConfig>) => {
    setProviderConfigs((prev) => {
      const next = prev.map((cfg) => {
        if (cfg.id === id) {
          const updated = { ...cfg, ...updates };
          if ('apiKey' in updates) {
            updated.apiKeySet = Boolean(updates.apiKey && updates.apiKey.trim().length > 0);
          }
          return updated;
        }
        return cfg;
      });
      updateSetting('providerConfigs', JSON.stringify(next));
      return next;
    });
  };

  // Header accent & mode descriptors
  const getHeaderAccent = () => {
    switch (aiMode) {
      case 'local':
        return {
          title: 'Local AI Runtime',
          subtitle: '100% Offline & Private Execution Manager',
          border: 'border-emerald-200',
          bg: 'bg-emerald-50/60',
          color: 'text-emerald-700',
          badgeBg: 'bg-emerald-100 text-emerald-800',
          icon: ShieldCheck,
          footerText: 'Everything runs on your computer. No internet connection required.',
        };
      case 'cloud':
        return {
          title: 'Cloud AI Provider Manager',
          subtitle: 'API Keys & Connected Cloud Endpoints',
          border: 'border-blue-200',
          bg: 'bg-blue-50/60',
          color: 'text-blue-700',
          badgeBg: 'bg-blue-100 text-blue-800',
          icon: Cloud,
          footerText: 'Using official cloud AI provider endpoints. Internet connection required.',
        };
      case 'hybrid':
      default:
        return {
          title: 'Hybrid Intelligence Orchestrator',
          subtitle: 'Automatic Capability Routing & Priority Management',
          border: 'border-purple-200',
          bg: 'bg-purple-50/60',
          color: 'text-purple-700',
          badgeBg: 'bg-purple-100 text-purple-800',
          icon: Sparkles,
          footerText: 'Local models are preferred for privacy. Cloud models are used when required.',
        };
    }
  };

  const activeHeader = getHeaderAccent();
  const HeaderIcon = activeHeader.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/25 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-3xl bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${activeHeader.border} ${activeHeader.bg} transition-colors duration-300`}>
          <div className="flex items-center gap-2.5">
            <HeaderIcon className={`w-5 h-5 ${activeHeader.color}`} />
            <div>
              <h2 className="text-base font-bold text-zinc-950">{activeHeader.title}</h2>
              <p className={`text-[11px] ${activeHeader.color}`}>{activeHeader.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Execution Mode Selector Bar */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-blue-600" /> Select AI Execution Mode
            </label>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setAiMode('local')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  aiMode === 'local'
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  {aiMode === 'local' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <div className="mt-2">
                  <p className="font-bold text-zinc-900">Local Mode</p>
                  <p className="text-[10px] text-zinc-500">100% Offline & Private</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAiMode('cloud')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  aiMode === 'cloud'
                    ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Cloud className="w-4 h-4 text-blue-600" />
                  {aiMode === 'cloud' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </div>
                <div className="mt-2">
                  <p className="font-bold text-zinc-900">Cloud Mode</p>
                  <p className="text-[10px] text-zinc-500">API Keys (OpenAI, Gemini...)</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAiMode('hybrid')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  aiMode === 'hybrid'
                    ? 'border-purple-600 bg-purple-50/70 shadow-sm ring-2 ring-purple-500/20'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  {aiMode === 'hybrid' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                </div>
                <div className="mt-2">
                  <p className="font-bold text-zinc-900">Hybrid Mode</p>
                  <p className="text-[10px] text-zinc-500">Smart Capability Routing</p>
                </div>
              </button>
            </div>
          </div>

          {/* Dynamic Mode Page Render */}
          <div className="pt-2">
            {aiMode === 'local' && (
              <LocalSettings
                workspacePath={workspacePath}
                onWorkspaceChange={setWorkspacePath}
              />
            )}

            {aiMode === 'cloud' && (
              <CloudSettings
                providerConfigs={providerConfigs}
                updateProviderConfig={updateProviderConfig}
                onSaveProvider={handleSaveProvider}
              />
            )}

            {aiMode === 'hybrid' && (
              <HybridSettings providerConfigs={providerConfigs} />
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <p className="text-[11px] text-zinc-500 font-mono italic">
            {activeHeader.footerText}
          </p>

          <div className="flex items-center gap-2">
            {savedSuccess && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4" /> Saved!
              </span>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={handleSave}>
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
