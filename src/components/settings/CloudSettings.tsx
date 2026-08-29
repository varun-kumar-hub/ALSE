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
    const currentDefaultProvider = useAppStore.getState().defaultProvider;
    if (currentDefaultProvider && providerConfigs.some((p) => p.id === currentDefaultProvider)) {
      return currentDefaultProvider;
    }

    const matchingModelProvider = providerConfigs.find(
      (p) =>
        p.kind === 'cloud' &&
        (p.defaultModel === selectedModel || p.discoveredModels?.includes(selectedModel))
    );
    if (matchingModelProvider) return matchingModelProvider.id;

    if (selectedModel && (selectedModel.toLowerCase().includes('nemotron') || selectedModel.toLowerCase().startsWith('nvidia/'))) {
      return 'nvidia';
    }

    const enabledProvider = providerConfigs.find(
      (p) => p.kind === 'cloud' && p.enabled && Boolean(p.apiKey && p.apiKey.trim().length > 0)
    );
    if (enabledProvider) return enabledProvider.id;

    return 'nvidia';
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
    const modelToActivate = targetModelOverride || cfg.defaultModel || (cfg.discoveredModels && cfg.discoveredModels[0]) || 'nvidia/nemotron-3-super-120b-a12b';
    const store = useAppStore.getState();

    // Exclusively enable this provider and disable others
    providerConfigs.forEach((p) => {
      if (p.kind === 'cloud') {
        const isTarget = p.id === cfg.id;
        updateProviderConfig(p.id, {
          enabled: isTarget,
          ...(isTarget ? { defaultModel: modelToActivate } : {}),
        });
      }
    });

    store.setSelectedModel(modelToActivate);
    store.setDefaultProvider(cfg.id);
    store.updateSetting('defaultModel', modelToActivate);
    store.updateSetting('defaultProvider', cfg.id);
  };

  const handleValidateProvider = async (cfg: ProviderConfig) => {
    setValidatingId(cfg.id);
    const result = await validateAndDiscoverProvider(cfg.id, cfg.apiKey || '', cfg.baseUrl);
    setValidatingId(null);

    if (result.connected) {
      let activeModel = cfg.defaultModel;
      if (!activeModel || !result.models.includes(activeModel)) {
        activeModel =
          result.models.find((m) => m.toLowerCase().includes('nemotron')) ||
          (result.models.length > 0 ? result.models[0] : cfg.defaultModel || 'nvidia/nemotron-3-super-120b-a12b');
      }

      // Exclusively enable verified provider
      providerConfigs.forEach((p) => {
        if (p.kind === 'cloud') {
          const isTarget = p.id === cfg.id;
          updateProviderConfig(p.id, {
            enabled: isTarget,
            ...(isTarget
              ? {
                  apiKeySet: true,
                  discoveredModels: result.models,
                  capabilities: result.capabilities,
                  defaultModel: activeModel,
                }
              : {}),
          });
        }
      });

      const store = useAppStore.getState();
      store.setSelectedModel(activeModel);
      store.setDefaultProvider(cfg.id);
      store.updateSetting('defaultModel', activeModel);
      store.updateSetting('defaultProvider', cfg.id);

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
  const rawModelsList =
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

  const currentModelsList = React.useMemo(() => {
    if (activeProviderConfig?.id === 'nvidia') {
      const guaranteedNemotron = [
        'nvidia/nemotron-3-super-120b-a12b',
        'nvidia/llama-3.1-nemotron-70b-instruct',
        'nvidia/nemotron-4-340b-instruct',
        'nvidia/nemotron-mini-4b-instruct',
        'nvidia/nemotron-3-ultra-550b-a55b',
        'nvidia/nemotron-3-nano-30b-a3b',
      ];
      const merged = Array.from(new Set([...guaranteedNemotron, ...rawModelsList]));
      return merged.sort((a, b) => {
        const aIsNemotron = a.toLowerCase().includes('nemotron') || a.toLowerCase().startsWith('nvidia/');
        const bIsNemotron = b.toLowerCase().includes('nemotron') || b.toLowerCase().startsWith('nvidia/');
        if (aIsNemotron && !bIsNemotron) return -1;
        if (!aIsNemotron && bIsNemotron) return 1;
        return a.localeCompare(b);
      });
    }
    return rawModelsList;
  }, [rawModelsList, activeProviderConfig?.id]);

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
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                    activeProviderId === p.id
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-2xs'
                      : isActive
                      ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-950 dark:text-white border border-zinc-300 dark:border-zinc-700'
                      : isConfigured
                      ? 'bg-zinc-100 dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                      : 'bg-transparent text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {p.name}
                  {isActive ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-950 dark:bg-white inline-block" title="Active Connected Model" />
                  ) : isConfigured ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:text-zinc-500 inline-block" title="Key Configured" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Unified Configuration Card */}
        {activeProviderConfig && (
          <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#151518] space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-zinc-950 dark:text-white">{activeProviderConfig.name}</span>
                {detectedPatternBadge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-mono font-bold">
                    {detectedPatternBadge}
                  </span>
                )}
                {validationResult[activeProviderConfig.id] ? (
                  validationResult[activeProviderConfig.id].success ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-zinc-900 dark:text-white" /> Connected & Active
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 font-mono font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-rose-500" /> Auth Failed
                    </span>
                  )
                ) : isActiveCurrent ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-zinc-900 dark:text-white" /> Active Model Provider
                  </span>
                ) : hasKeyCurrent ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-zinc-600 dark:text-zinc-400" /> Key Configured
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-500 font-mono">
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
                  className={`relative inline-flex h-4 w-8 shrink-0 items-center rounded-full p-0.5 transition-colors duration-150 ease-in-out focus:outline-none ${
                    activeProviderConfig.enabled ? 'bg-zinc-950 dark:bg-white' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full transition duration-150 ease-in-out ${
                      activeProviderConfig.enabled
                        ? 'translate-x-4 bg-white dark:bg-zinc-950'
                        : 'translate-x-0 bg-white dark:bg-zinc-400'
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
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-zinc-500 transition"
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
                    className="text-zinc-900 dark:text-white underline hover:opacity-80"
                  >
                    Get Key
                  </a>
                </label>
                <input
                  type="password"
                  placeholder="Enter API key..."
                  value={activeProviderConfig.apiKey || ''}
                  onChange={(e) => handleApiKeyChange(activeProviderConfig.id, e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 font-mono focus:outline-none focus:border-zinc-500 transition"
                />
              </div>

              {/* Model Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">Connected Cloud Model</label>
                <select
                  value={activeProviderConfig.defaultModel || currentModelsList[0]}
                  onChange={(e) => handleMakeActiveModel(activeProviderConfig, e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-zinc-500 transition"
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
                className="px-3.5 py-1.5 bg-zinc-950 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 text-white dark:text-zinc-950 font-bold text-xs rounded-lg shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-98"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${validatingId === activeProviderConfig.id ? 'animate-spin' : ''}`} />
                <span>{validatingId === activeProviderConfig.id ? 'Testing...' : 'Verify Credentials & Endpoint'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave(activeProviderConfig.id)}
                className="px-3.5 py-1.5 bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-750 font-semibold text-xs rounded-lg transition cursor-pointer"
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
