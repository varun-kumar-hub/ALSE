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
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAppStore } from '../../stores/appStore';
import { getDefaultWorkspacePath } from '../../services/workspace';
import { pullModelStream } from '../../services/ollama';

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

  const [pullModelInput, setPullModelInput] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullStatus, setPullStatus] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

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

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/25 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden  max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-[#f6f5f2]/60">
          <div className="flex items-center gap-2.5">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-zinc-950">Local Settings</h2>
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
          {/* Section: Assistant Identity */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
              <Bot className="w-4 h-4" /> Assistant Identity
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Assistant Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nexus Agent"
              />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">
                  Theme
                </label>
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
                <label className="text-xs font-medium text-zinc-700">
                  Response Layout Style
                </label>
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
            </div>
          </div>

          <hr className="border-zinc-200" />

          {/* Section: Runtime & Models */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4" /> AI Runtime & Models
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">
                  Default AI Model
                </label>
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
                <label className="text-xs font-medium text-zinc-700">
                  Download New Model
                </label>
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
                All database records, messages, and downloaded model binaries remain 100% on your local machine. No telemetry or external cloud tracking.
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

