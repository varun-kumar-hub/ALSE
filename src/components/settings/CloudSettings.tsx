import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import {
  validateAndDiscoverProvider,
  searchProviders,
  detectProviderFromApiKey,
  OPENCODE_ZEN_CATALOG,
  PROVIDER_REGISTRY,
} from '../../services/providerRegistry';
import { ProviderConfig } from '../../services/types';
import { useAppStore } from '../../stores/appStore';

interface CloudSettingsProps {
  providerConfigs: ProviderConfig[];
  updateProviderConfig: (id: string, updates: Partial<ProviderConfig>) => void;
  onSaveProvider: (id: string) => void;
}

export const CloudSettings: React.FC<CloudSettingsProps> = ({
  providerConfigs,
  updateProviderConfig,
  onSaveProvider,
}) => {
  const selectedModel = useAppStore((state) => state.selectedModel);
  const [providerSearch, setProviderSearch] = useState('');

  const isProviderActive = (cfg?: ProviderConfig) => {
    if (!cfg || !cfg.enabled) return false;
    if (cfg.defaultModel === selectedModel) return true;
    if (cfg.discoveredModels?.includes(selectedModel)) return true;
    return false;
  };

  const initialProviderId = React.useMemo(() => {
    const activeProvider = providerConfigs.find(
      (p) =>
        p.kind === 'cloud' &&
        p.enabled &&
        (p.defaultModel === selectedModel || p.discoveredModels?.includes(selectedModel))
    );
    if (activeProvider) return activeProvider.id;

    const configured = providerConfigs.find(
      (p) => p.kind === 'cloud' && Boolean(p.apiKey && p.apiKey.trim().length > 0)
    );
    if (configured) return configured.id;

    return 'gemini';
  }, [providerConfigs, selectedModel]);

  const [activeProviderId, setActiveProviderId] = useState(initialProviderId);
  const [detectedPatternBadge, setDetectedPatternBadge] = useState<string | null>(null);

  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<
    Record<string, { success: boolean; message: string; latencyMs?: number; modelsCount?: number }>
  >({});
  const [savedProviderId, setSavedProviderId] = useState<string | null>(null);

  const activeProviderConfig =
    providerConfigs.find((p) => p.id === activeProviderId) || providerConfigs[0];
  const filteredProviders = searchProviders(providerSearch).filter((p) => p.kind === 'cloud');

  const handleApiKeyChange = (id: string, newKey: string) => {
    updateProviderConfig(id, { apiKey: newKey, apiKeySet: Boolean(newKey.trim()) });
    const detected = detectProviderFromApiKey(newKey);
    if (detected) {
      if (detected.id === id) {
        setDetectedPatternBadge(`Verified Key Pattern: ${detected.name}`);
      } else {
        setDetectedPatternBadge(`⚠️ Key format matches ${detected.name} (switch tab to configure)`);
      }
    } else {
      setDetectedPatternBadge(null);
    }
  };

  const handleMakeActiveModel = (cfg: ProviderConfig, targetModelOverride?: string) => {
    const modelToActivate = targetModelOverride || cfg.defaultModel || (cfg.discoveredModels && cfg.discoveredModels[0]) || 'gemini-2.5-flash';
    const store = useAppStore.getState();
    const currentActiveModel = store.selectedModel;
    const currentActiveProvider = store.providerConfigs.find(p => p.defaultModel === currentActiveModel)?.name || 'Default';

    if (currentActiveModel && currentActiveModel !== modelToActivate) {
      store.openModelSwitchModal({
        isOpen: true,
        actionType: 'switch_active_model',
        providerId: cfg.id,
        providerName: cfg.name,
        targetModel: modelToActivate,
        currentActiveModel,
        currentActiveProvider,
      });
      return;
    }

    updateProviderConfig(cfg.id, { enabled: true, defaultModel: modelToActivate });
    useAppStore.getState().setSelectedModel(modelToActivate);
    useAppStore.getState().updateSetting('defaultModel', modelToActivate);
  };

  const handleValidateProvider = async (cfg: ProviderConfig) => {
    setValidatingId(cfg.id);
    const result = await validateAndDiscoverProvider(cfg.id, cfg.apiKey || '', cfg.baseUrl);
    setValidatingId(null);

    if (result.connected) {
      const activeModel = (cfg.defaultModel && result.models.includes(cfg.defaultModel))
        ? cfg.defaultModel
        : (result.models.length > 0 ? result.models[0] : cfg.defaultModel || 'gpt-5.6-sol');

      updateProviderConfig(cfg.id, {
        apiKeySet: true,
        enabled: true,
        discoveredModels: result.models,
        capabilities: result.capabilities,
        defaultModel: activeModel,
      });
      useAppStore.getState().setSelectedModel(activeModel);
      useAppStore.getState().updateSetting('defaultModel', activeModel);

      setValidationResult((prev) => ({
        ...prev,
        [cfg.id]: {
          success: true,
          message: `Verified & Connected! Discovered ${result.models.length} models in ${result.latencyMs ?? 180}ms. Set as Active Model!`,
          latencyMs: result.latencyMs,
          modelsCount: result.models.length,
        },
      }));
    } else {
      updateProviderConfig(cfg.id, {
        apiKeySet: false,
      });
      setValidationResult((prev) => ({
        ...prev,
        [cfg.id]: {
          success: false,
          message: `Connection test failed for ${cfg.name}. Check your API Key & endpoint configuration.`,
        },
      }));
    }
  };

  const handleSave = async (id: string) => {
    await onSaveProvider(id);
    setSavedProviderId(id);
    setTimeout(() => setSavedProviderId(null), 2000);
  };

  const regItem = PROVIDER_REGISTRY[activeProviderConfig?.id || ''];
  const currentModelsList =
    activeProviderConfig?.id === 'opencode'
      ? OPENCODE_ZEN_CATALOG
      : activeProviderConfig?.id === 'gemini'
      ? [
          'gemini-2.5-flash',
          'gemini-2.5-pro',
          'gemini-1.5-flash',
          'gemini-1.5-pro',
          'gemini-2.0-flash',
          'gemini-3.6-flash',
        ]
      : activeProviderConfig?.discoveredModels && activeProviderConfig.discoveredModels.length > 0
      ? activeProviderConfig.discoveredModels
      : regItem?.supportedModels || [activeProviderConfig?.defaultModel || 'gemini-2.5-flash'];

  const isActiveCurrent = isProviderActive(activeProviderConfig);
  const hasKeyCurrent = activeProviderConfig?.apiKeySet || Boolean(activeProviderConfig?.apiKey && activeProviderConfig.apiKey.trim().length > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none text-xs text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Smart Cloud Provider Manager Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 uppercase tracking-wider font-mono">
            <Zap className="w-4 h-4 text-blue-500" /> Cloud AI Provider Manager
          </label>
          <span className="text-[10px] text-zinc-500 font-mono">Real Authentication Verification</span>
        </div>

        {/* Provider Selector Tabs */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search cloud provider (e.g. OpenCode Zen, OpenAI, Claude, Gemini, Groq)..."
              value={providerSearch}
              onChange={(e) => setProviderSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500 transition font-sans"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {filteredProviders.map((p) => {
              const cfg = providerConfigs.find((item) => item.id === p.id);
              const isConfigured = Boolean(cfg?.apiKey && cfg.apiKey.trim().length > 0);
              const isActive = isProviderActive(cfg);

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveProviderId(p.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                    activeProviderId === p.id
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : isActive
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      : isConfigured
                      ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 hover:bg-blue-500/20'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-850 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {p.name}
                  {isActive ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/40 inline-block animate-pulse" title="Active Connected Model" />
                  ) : isConfigured ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" title="Key Configured" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Unified Configuration Card */}
        {activeProviderConfig && (
          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-zinc-950 dark:text-white">{activeProviderConfig.name}</span>
                {detectedPatternBadge && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 font-mono font-bold">
                    {detectedPatternBadge}
                  </span>
                )}
                {validationResult[activeProviderConfig.id] ? (
                  validationResult[activeProviderConfig.id].success ? (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-mono font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Connected & Active
                    </span>
                  ) : (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 font-mono font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-rose-500" /> Auth Failed
                    </span>
                  )
                ) : isActiveCurrent ? (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-emerald-500" /> Active Model Provider
                  </span>
                ) : hasKeyCurrent ? (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300 font-mono font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-blue-500" /> Key Configured (Ready)
                  </span>
                ) : (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-mono">
                    Not Configured
                  </span>
                )}
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={activeProviderConfig.enabled}
                onClick={() => {
                  const nextState = !activeProviderConfig.enabled;
                  updateProviderConfig(activeProviderConfig.id, { enabled: nextState });
                  if (nextState) {
                    handleMakeActiveModel(activeProviderConfig);
                  }
                }}
                className="inline-flex items-center gap-2 cursor-pointer select-none shrink-0 whitespace-nowrap ml-auto"
              >
                <span className="text-[10px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 shrink-0 whitespace-nowrap">
                  {activeProviderConfig.enabled ? 'Provider Enabled' : 'Provider Disabled'}
                </span>
                <div
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                    activeProviderConfig.enabled ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      activeProviderConfig.enabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </button>
            </div>

            {/* Base URL (Only for Custom Provider) */}
            {(activeProviderConfig.id === 'custom' || activeProviderConfig.isCustom) && (
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">Custom Base URL</label>
                <input
                  type="text"
                  placeholder="http://localhost:8000/v1"
                  value={activeProviderConfig.baseUrl || ''}
                  onChange={(e) =>
                    updateProviderConfig(activeProviderConfig.id, { baseUrl: e.target.value })
                  }
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            )}

            {/* API Key Input Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                  <span>API Key</span>
                  <a
                    href={(activeProviderConfig as any).apiKeyDocsUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Get Key
                  </a>
                </label>
                <input
                  type="password"
                  placeholder="Enter API key..."
                  value={activeProviderConfig.apiKey || ''}
                  onChange={(e) => handleApiKeyChange(activeProviderConfig.id, e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 font-mono focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Model Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">Connected Cloud Model</label>
                <select
                  value={activeProviderConfig.defaultModel || currentModelsList[0]}
                  onChange={(e) => handleMakeActiveModel(activeProviderConfig, e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-blue-500 transition"
                >
                  {currentModelsList.map((m) => (
                    <option key={m} value={m} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleValidateProvider(activeProviderConfig)}
                disabled={validatingId === activeProviderConfig.id}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${validatingId === activeProviderConfig.id ? 'animate-spin' : ''}`} />
                <span>{validatingId === activeProviderConfig.id ? 'Testing...' : 'Verify Credentials & Endpoint'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave(activeProviderConfig.id)}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                {savedProviderId === activeProviderConfig.id ? 'Saved!' : 'Save Config'}
              </button>
            </div>

            {/* Validation Feedback Banner */}
            {validationResult[activeProviderConfig.id] && (
              <div
                className={`p-3 rounded-xl text-xs font-mono border ${
                  validationResult[activeProviderConfig.id].success
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
                }`}
              >
                {validationResult[activeProviderConfig.id].message}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
