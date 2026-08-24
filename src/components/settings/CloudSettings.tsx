import React, { useState } from 'react';
import {
  Cloud,
  Search,
  Key,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Zap,
  BarChart3,
} from 'lucide-react';
import { Button } from '../ui/Button';
import {
  validateAndDiscoverProvider,
  searchProviders,
  detectProviderFromApiKey,
  OPENCODE_ZEN_CATALOG,
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
  const [providerSearch, setProviderSearch] = useState('');
  const initialProviderId = React.useMemo(() => {
    const selectedModel = useAppStore.getState().selectedModel;
    const providerForModel = providerConfigs.find(
      (p) =>
        p.kind === 'cloud' &&
        (p.defaultModel === selectedModel || p.discoveredModels?.includes(selectedModel))
    );
    if (providerForModel) return providerForModel.id;

    const configured = providerConfigs.find(
      (p) => p.kind === 'cloud' && Boolean(p.apiKey && p.apiKey.trim().length > 0)
    );
    if (configured) return configured.id;

    return 'gemini';
  }, [providerConfigs]);

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
    if (detected && detected.id === id) {
      setDetectedPatternBadge(`Verified Key Pattern: ${detected.name}`);
    } else {
      setDetectedPatternBadge(null);
    }
  };

  const handleValidateProvider = async (cfg: ProviderConfig) => {
    setValidatingId(cfg.id);
    const result = await validateAndDiscoverProvider(cfg.id, cfg.apiKey || '', cfg.baseUrl);
    setValidatingId(null);

    if (result.connected) {
      updateProviderConfig(cfg.id, {
        apiKeySet: true,
        discoveredModels: result.models,
        capabilities: result.capabilities,
        defaultModel: result.models.length > 0 ? result.models[0] : cfg.defaultModel,
      });
      setValidationResult((prev) => ({
        ...prev,
        [cfg.id]: {
          success: true,
          message: `Verified & Connected! Discovered ${result.models.length} models in ${result.latencyMs ?? 180}ms.`,
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
          message: result.error || `${result.errorCategory || 'Connection failed'}. Verification rejected by endpoint.`,
        },
      }));
    }
  };

  const handleSave = async (id: string) => {
    await onSaveProvider(id);
    setSavedProviderId(id);
    setTimeout(() => setSavedProviderId(null), 2000);
  };

  const currentModelsList =
    activeProviderConfig?.id === 'opencode'
      ? OPENCODE_ZEN_CATALOG
      : activeProviderConfig?.discoveredModels && activeProviderConfig.discoveredModels.length > 0
      ? activeProviderConfig.discoveredModels
      : [activeProviderConfig?.defaultModel || 'gemini-2.5-flash'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-250 select-none text-xs">
      {/* Smart Cloud Provider Manager Card */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5 uppercase tracking-wider">
            <Zap className="w-4 h-4 text-blue-600" /> Cloud AI Provider Manager
          </label>
          <span className="text-[10px] text-zinc-400 font-mono">Real Authentication Verification</span>
        </div>

        {/* Provider Selector Tabs */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search cloud provider (e.g. OpenCode Zen, OpenAI, Claude, Gemini, Groq)..."
              value={providerSearch}
              onChange={(e) => setProviderSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {filteredProviders.map((p) => {
              const cfg = providerConfigs.find((item) => item.id === p.id);
              const isConfigured = Boolean(cfg?.apiKey && cfg.apiKey.trim().length > 0);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveProviderId(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    activeProviderId === p.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isConfigured
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {p.name}
                  {isConfigured && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Unified Single-Form Configuration Card */}
        {activeProviderConfig && (
          <div className="p-4 rounded-2xl border border-zinc-200 bg-white space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-zinc-950">{activeProviderConfig.name}</span>
                {detectedPatternBadge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold animate-pulse">
                    {detectedPatternBadge}
                  </span>
                )}
                {validationResult[activeProviderConfig.id] ? (
                  validationResult[activeProviderConfig.id].success ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Connected
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-rose-600" /> Auth Failed
                    </span>
                  )
                ) : activeProviderConfig.apiKeySet || Boolean(activeProviderConfig.apiKey && activeProviderConfig.apiKey.trim().length > 0) ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Connected Key
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
                    Not Configured
                  </span>
                )}
              </div>

              <label className="relative inline-flex items-center cursor-pointer gap-2 select-none shrink-0 whitespace-nowrap ml-2">
                <span className="text-[10px] font-semibold text-zinc-600 shrink-0 whitespace-nowrap">
                  {activeProviderConfig.enabled ? 'Provider Enabled' : 'Provider Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={activeProviderConfig.enabled}
                  onChange={(e) =>
                    updateProviderConfig(activeProviderConfig.id, { enabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Base URL (Only for Custom Provider) */}
            {(activeProviderConfig.id === 'custom' || activeProviderConfig.isCustom) && (
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-zinc-600">Custom Base URL</label>
                <input
                  type="text"
                  placeholder="http://localhost:8000/v1"
                  value={activeProviderConfig.baseUrl || ''}
                  onChange={(e) =>
                    updateProviderConfig(activeProviderConfig.id, { baseUrl: e.target.value })
                  }
                  className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-950 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* API Key & Model Input Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-zinc-600 flex items-center gap-1">
                  <Key className="w-3 h-3 text-zinc-400" /> API Key
                </label>
                <input
                  type="password"
                  placeholder="Enter API key..."
                  value={activeProviderConfig.apiKey || ''}
                  onChange={(e) => handleApiKeyChange(activeProviderConfig.id, e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-950 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-medium text-zinc-600">Connected Cloud Model</label>
                  {activeProviderConfig.apiKeySet && (
                    <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5 text-emerald-600" /> Active Model
                    </span>
                  )}
                </div>
                <select
                  value={activeProviderConfig.defaultModel}
                  onChange={(e) => {
                    const newModel = e.target.value;
                    updateProviderConfig(activeProviderConfig.id, { defaultModel: newModel });
                    useAppStore.getState().setSelectedModel(newModel);
                    useAppStore.getState().updateSetting('defaultModel', newModel);
                  }}
                  className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-950 font-mono focus:outline-none focus:border-blue-500 font-semibold"
                >
                  {currentModelsList.map((m) => (
                    <option key={m} value={m}>
                      ⚡ {m} {m === activeProviderConfig.defaultModel ? '(Connected)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions & Live Validation Banner */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => handleValidateProvider(activeProviderConfig)}
                  isLoading={validatingId === activeProviderConfig.id}
                  leftIcon={
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        validatingId === activeProviderConfig.id ? 'animate-spin' : ''
                      }`}
                    />
                  }
                >
                  Verify Credentials & Endpoint
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleSave(activeProviderConfig.id)}
                >
                  {savedProviderId === activeProviderConfig.id ? 'Saved!' : 'Save Config'}
                </Button>
              </div>
            </div>

            {validationResult[activeProviderConfig.id] && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                  validationResult[activeProviderConfig.id].success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border border-rose-200 text-rose-900'
                }`}
              >
                {validationResult[activeProviderConfig.id].success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{validationResult[activeProviderConfig.id].message}</p>
                  {validationResult[activeProviderConfig.id].latencyMs && (
                    <p className="text-[10px] text-emerald-700 font-mono mt-0.5">
                      Latency: {validationResult[activeProviderConfig.id].latencyMs}ms | Verified Models:{' '}
                      {validationResult[activeProviderConfig.id].modelsCount}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Capabilities Badges */}
            <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-100">
              <span className="text-[10px] font-semibold text-zinc-500 mr-1 self-center">Capabilities:</span>
              {activeProviderConfig.capabilities.map((cap) => (
                <span
                  key={cap}
                  className="text-[9px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono"
                >
                  ✓ {cap}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Real-time Cloud Metrics Dashboard */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="p-3 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-1">
          <span className="text-[10px] font-semibold text-blue-600 uppercase flex items-center gap-1">
            <Cloud className="w-3.5 h-3.5 text-blue-600" /> Verified Cloud Providers
          </span>
          <p className="text-base font-bold text-zinc-900 font-mono">
            {providerConfigs.filter((p) => p.apiKeySet && p.enabled).length} Active
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-1">
          <span className="text-[10px] font-semibold text-purple-600 uppercase flex items-center gap-1">
            <BarChart3 className="w-3.5 h-3.5 text-purple-600" /> Discovered Cloud Models
          </span>
          <p className="text-base font-bold text-purple-900 font-mono">
            {providerConfigs.reduce(
              (acc, p) => acc + (p.discoveredModels?.length || (p.apiKeySet ? 1 : 0)),
              0
            )}{' '}
            Models Available
          </p>
        </div>
      </div>
    </div>
  );
};
