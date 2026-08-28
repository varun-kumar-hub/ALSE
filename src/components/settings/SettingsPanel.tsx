import React, { useState, useEffect } from 'react';
import {
  Check,
  X,
  ShieldCheck,
  Cloud,
  Globe,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { getDefaultWorkspacePath } from '../../services/workspace';
import { DEFAULT_PROVIDER_CONFIGS, mergeProviderConfigs } from '../../services/providers';
import { AiExecutionMode, ProviderConfig } from '../../services/types';

import { LocalSettings } from './LocalSettings';
import { CloudSettings } from './CloudSettings';

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
  const [aiMode, setAiMode] = useState<AiExecutionMode>(savedAiMode || 'cloud');
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

    const store = useAppStore.getState();
    store.setProviderConfigs(providerConfigs);
    store.setAiMode(aiMode);

    const activeProvider =
      providerConfigs.find(
        (p) => p.kind === (aiMode === 'local' ? 'local' : 'cloud') && p.enabled && (p.apiKeySet || p.kind === 'local')
      ) || providerConfigs.find((p) => p.id === 'opencode');

    if (activeProvider && activeProvider.defaultModel) {
      store.setSelectedModel(activeProvider.defaultModel);
      await updateSetting('defaultModel', activeProvider.defaultModel);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 400);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none text-zinc-100 font-sans">
      <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-850 bg-zinc-950">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">LearnForge Settings</h2>
            <p className="text-xs text-zinc-400 font-mono">Models, Runtime & API Configuration</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-mono">
          {/* Execution Mode Selector Bar */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Globe className="w-3.5 h-3.5 text-zinc-400" /> ACTIVE EXECUTION MODE
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setAiMode('local');
                  updateSetting('aiMode', 'local');
                }}
                className={`p-4 rounded-2xl border text-left flex justify-between transition-all cursor-pointer ${
                  aiMode === 'local'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-white shadow-xs'
                    : 'border-zinc-850 hover:border-zinc-700 bg-zinc-900/60 text-zinc-400'
                }`}
              >
                <div>
                  <ShieldCheck className={`w-5 h-5 mb-2 ${aiMode === 'local' ? 'text-emerald-400' : 'text-zinc-500'}`} />
                  <p className="font-bold text-white text-sm">Local Mode</p>
                  <p className="text-[10px] text-zinc-400">Offline Ollama execution</p>
                </div>
                {aiMode === 'local' && <Check className="w-4 h-4 text-emerald-400" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAiMode('cloud');
                  updateSetting('aiMode', 'cloud');
                }}
                className={`p-4 rounded-2xl border text-left flex justify-between transition-all cursor-pointer ${
                  aiMode === 'cloud'
                    ? 'border-blue-500/50 bg-blue-500/10 text-white shadow-xs'
                    : 'border-zinc-850 hover:border-zinc-700 bg-zinc-900/60 text-zinc-400'
                }`}
              >
                <div>
                  <Cloud className={`w-5 h-5 mb-2 ${aiMode === 'cloud' ? 'text-blue-400' : 'text-zinc-500'}`} />
                  <p className="font-bold text-white text-sm">Cloud Mode</p>
                  <p className="text-[10px] text-zinc-400">Cloud AI Providers</p>
                </div>
                {aiMode === 'cloud' && <Check className="w-4 h-4 text-blue-400" />}
              </button>
            </div>
          </div>

          {/* Dynamic Mode Settings Render */}
          <div className="pt-2">
            {aiMode === 'local' ? (
              <LocalSettings
                workspacePath={workspacePath}
                onWorkspaceChange={setWorkspacePath}
              />
            ) : (
              <CloudSettings
                providerConfigs={providerConfigs}
                updateProviderConfig={updateProviderConfig}
                onSaveProvider={handleSaveProvider}
              />
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 flex items-center justify-between">
          <button
            type="button"
            onClick={async () => {
              if (confirm('Wipe all mock data, test chats, and mastery traces to start 100% fresh from the beginning?')) {
                const { clearAllChatsAndMessages } = await import('../../services/database');
                const { ps6Db } = await import('../../services/ps6Database');
                await clearAllChatsAndMessages();
                ps6Db.clearAllData();
                window.location.reload();
              }
            }}
            className="px-3 py-1.5 text-xs font-mono font-bold text-rose-500 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
          >
            🗑 Reset All Data & Start Fresh
          </button>

          <div className="flex items-center gap-2">
            {savedSuccess && (
              <span className="text-xs font-mono font-semibold text-emerald-500 flex items-center gap-1">
                <Check className="w-4 h-4" /> Saved!
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 dark:bg-white hover:bg-blue-500 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
