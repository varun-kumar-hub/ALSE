import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Bot,
  Cpu,
  HardDrive,
  Download,
  Check,
  X,
  ShieldCheck,
  Cloud,
  Sparkles,
  Key,
  Globe,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAppStore } from '../../stores/appStore';
import { getDefaultWorkspacePath } from '../../services/workspace';
import { pullModelStream } from '../../services/ollama';
import { DEFAULT_PROVIDER_CONFIGS, mergeProviderConfigs } from '../../services/providers';
import { AiExecutionMode, ProviderConfig } from '../../services/types';

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const {
    assistantName,
    selectedModel,
    models,
    theme,
    workspaceLocation,
    responseStyle: savedResponseStyle,
    autoStartOllama: savedAutoStartOllama,
    keepOllamaRunning: savedKeepOllamaRunning,
    aiMode: savedAiMode,
    defaultProvider: savedDefaultProvider,
    providerConfigs: savedProviderConfigs,
    updateSetting,
    refreshModels,
  } = useAppStore();

  const [name, setName] = useState(assistantName);
  const [workspacePath, setWorkspacePath] = useState(workspaceLocation);
  const [selectedTheme, setSelectedTheme] = useState(theme);
  const [defaultModel, setDefaultModel] = useState(selectedModel);
  const [responseStyle, setResponseStyle] = useState(savedResponseStyle);
  const [autoStartOllama, setAutoStartOllama] = useState(savedAutoStartOllama);
  const [keepOllamaRunning, setKeepOllamaRunning] = useState(savedKeepOllamaRunning);

  const [aiMode, setAiMode] = useState<AiExecutionMode>(savedAiMode || 'hybrid');
  const [defaultProvider, setDefaultProvider] = useState(savedDefaultProvider || 'ollama');
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>(() =>
    mergeProviderConfigs(savedProviderConfigs || DEFAULT_PROVIDER_CONFIGS)
  );

  const [pullModelInput, setPullModelInput] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullStatus, setPullStatus] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savedProviderId, setSavedProviderId] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceLocation) {
      getDefaultWorkspacePath().then(setWorkspacePath);
    }
  }, [workspaceLocation]);

  const handleSave = async () => {
    await updateSetting('assistantName', name);
    await updateSetting('theme', selectedTheme);
    await updateSetting('defaultModel', defaultModel);
    await updateSetting('workspaceLocation', workspacePath);
    await updateSetting('responseStyle', responseStyle);
    await updateSetting('autoStartOllama', String(autoStartOllama));
    await updateSetting('keepOllamaRunning', String(keepOllamaRunning));
    await updateSetting('aiMode', aiMode);
    await updateSetting('defaultProvider', defaultProvider);
    await updateSetting('providerConfigs', JSON.stringify(providerConfigs));

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleSaveProvider = async (id: string) => {
    await updateSetting('providerConfigs', JSON.stringify(providerConfigs));
    setSavedProviderId(id);
    setTimeout(() => setSavedProviderId(null), 2000);
  };

  const handlePullModel = async () => {
    if (!pullModelInput.trim() || isPulling) return;
    setIsPulling(true);
    setPullStatus('Initializing pull...');
    try {
      await pullModelStream(pullModelInput.trim(), (chunk) => {
        setPullStatus(chunk.status || 'Downloading model...');
      });
      await refreshModels();
      setPullStatus('Download complete!');
      setPullModelInput('');
    } catch (err) {
      setPullStatus(`Pull error: ${err}`);
    } finally {
      setIsPulling(false);
    }
  };

  const updateProviderConfig = (id: string, updates: Partial<ProviderConfig>) => {
    setProviderConfigs((prev) =>
      prev.map((cfg) => {
        if (cfg.id === id) {
          const next = { ...cfg, ...updates };
          if ('apiKey' in updates) {
            next.apiKeySet = Boolean(updates.apiKey && updates.apiKey.trim().length > 0);
          }
          return next;
        }
        return cfg;
      })
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/25 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-3xl bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-[#f6f5f2]/60">
          <div className="flex items-center gap-2.5">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-zinc-950">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Section: AI Provider Architecture */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-4 h-4" /> AI Execution Mode & Providers
            </h3>

            {/* Mode selection */}
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setAiMode('local')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  aiMode === 'local'
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-500'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  {aiMode === 'local' && <Check className="w-3.5 h-3.5 text-blue-600" />}
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
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-500'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Cloud className="w-4 h-4 text-blue-600" />
                  {aiMode === 'cloud' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </div>
                <div className="mt-2">
                  <p className="font-bold text-zinc-900">Cloud Mode</p>
                  <p className="text-[10px] text-zinc-500">API Keys (OpenAI, Claude...)</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAiMode('hybrid')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  aiMode === 'hybrid'
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-500'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  {aiMode === 'hybrid' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </div>
                <div className="mt-2">
                  <p className="font-bold text-zinc-900">Hybrid Mode</p>
                  <p className="text-[10px] text-zinc-500">Smart Capability Routing</p>
                </div>
              </button>
            </div>

            {/* Provider Cards */}
            <div className="space-y-3 pt-2">
              <label className="text-[11px] font-semibold text-zinc-700">Configured Providers</label>
              <div className="space-y-2.5">
                {providerConfigs.map((cfg) => (
                  <div
                    key={cfg.id}
                    className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900">{cfg.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            cfg.kind === 'local'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {cfg.kind}
                        </span>
                        {cfg.kind === 'cloud' && cfg.apiKeySet && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Key Set
                          </span>
                        )}
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cfg.enabled}
                          onChange={(e) => updateProviderConfig(cfg.id, { enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {cfg.kind === 'cloud' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-zinc-600 flex items-center gap-1">
                            <Key className="w-3 h-3 text-zinc-400" /> API Key
                          </label>
                          <input
                            type="password"
                            placeholder="sk-..."
                            value={cfg.apiKey || ''}
                            onChange={(e) => updateProviderConfig(cfg.id, { apiKey: e.target.value })}
                            className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-950 font-mono focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-zinc-600">Default Model</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={cfg.defaultModel}
                              onChange={(e) => updateProviderConfig(cfg.id, { defaultModel: e.target.value })}
                              className="flex-1 bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-950 font-mono focus:outline-none focus:border-blue-500"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => handleSaveProvider(cfg.id)}
                              leftIcon={
                                savedProviderId === cfg.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : undefined
                              }
                              className="shrink-0"
                            >
                              {savedProviderId === cfg.id ? 'Saved!' : 'Save'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Capabilities badges */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {cfg.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200/60 text-zinc-600 font-mono"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <hr className="border-zinc-200" />

          {/* Section: Assistant Identity */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
              <Bot className="w-4 h-4" /> Assistant Identity & UI
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Assistant Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nexus Agent"
              />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">Theme</label>
                <select
                  value={selectedTheme}
                  onChange={(e) => setSelectedTheme(e.target.value as typeof selectedTheme)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-950 focus:outline-none focus:border-blue-500"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">Response Layout Style</label>
                <select
                  value={responseStyle}
                  onChange={(e) => setResponseStyle(e.target.value as typeof responseStyle)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-950 focus:outline-none focus:border-blue-500"
                >
                  <option value="adaptive">Adaptive (Auto-detect Query Intent)</option>
                  <option value="detailed">Detailed & Comprehensive</option>
                  <option value="concise">Concise & Direct</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">Default Local Provider</label>
                <select
                  value={defaultProvider}
                  onChange={(e) => setDefaultProvider(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-950 focus:outline-none focus:border-blue-500"
                >
                  {providerConfigs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <hr className="border-zinc-200" />

          {/* Section: Local Runtime & Models */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4" /> Local Models (Ollama)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">Default Local Ollama Model</label>
                <select
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-950 focus:outline-none focus:border-blue-500 font-mono"
                >
                  {models.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                  {models.length === 0 && <option value="llama3.2">llama3.2</option>}
                </select>
              </div>

              {/* Download new model input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">Download New Local Model</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. mistral, qwen2.5, phi3"
                    value={pullModelInput}
                    onChange={(e) => setPullModelInput(e.target.value)}
                    className="flex-1 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-950 focus:outline-none"
                  />
                  <Button
                    size="sm"
                    onClick={handlePullModel}
                    isLoading={isPulling}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    Pull
                  </Button>
                </div>
                {pullStatus && (
                  <p className="text-[11px] text-blue-600 font-mono truncate">{pullStatus}</p>
                )}
              </div>
            </div>

            {/* Runtime service toggles */}
            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-zinc-700">
                <input
                  type="checkbox"
                  checked={autoStartOllama}
                  onChange={(e) => setAutoStartOllama(e.target.checked)}
                  className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Automatically start AI Runtime services on app launch</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-zinc-700">
                <input
                  type="checkbox"
                  checked={keepOllamaRunning}
                  onChange={(e) => setKeepOllamaRunning(e.target.checked)}
                  className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Keep AI Runtime services running after closing app</span>
              </label>
            </div>
          </div>

          <hr className="border-zinc-200" />

          {/* Section: Local Workspace */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-4 h-4" /> Workspace & Privacy
            </h3>
            <Input
              label="Local Workspace Path"
              value={workspacePath}
              onChange={(e) => setWorkspacePath(e.target.value)}
              placeholder="~/nexus-agent-workspace"
            />
            <div className="p-3 rounded-xl bg-[#f6f5f2]/60 border border-zinc-200 text-zinc-500 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <ShieldCheck className="w-4 h-4" /> Privacy Guarantee
              </div>
              <p className="text-[11px]">
                All local database records and messages remain on your machine. API keys for Cloud providers are stored locally on your device.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-[#f6f5f2]/80 flex items-center justify-between">
          <span className="text-xs text-zinc-500">All settings save locally</span>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              leftIcon={savedSuccess ? <Check className="w-4 h-4" /> : undefined}
            >
              {savedSuccess ? 'Saved!' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
