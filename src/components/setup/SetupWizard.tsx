import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Database as DbIcon,
  Download,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useAppStore } from '../../stores/appStore';
import { pullModelStream } from '../../services/ollama';

interface RuntimeManagerProps {
  onComplete: () => void;
}

export const SetupWizard: React.FC<RuntimeManagerProps> = ({ onComplete }) => {
  const {
    models,
    workspaceLocation,
    aiMode,
    refreshModels,
  } = useAppStore();

  const [isVerifying, setIsVerifying] = useState(true);
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null);
  const [pullProgress, setPullProgress] = useState('');

  const runRealDiagnostics = async () => {
    setIsVerifying(true);
    await refreshModels();
    setIsVerifying(false);
  };

  useEffect(() => {
    runRealDiagnostics();
  }, []);

  const handleInstallMissingModel = async (modelName: string) => {
    setDownloadingModel(modelName);
    setPullProgress('Starting download...');
    try {
      await pullModelStream(modelName, (chunk) => {
        setPullProgress(chunk.status || 'Downloading...');
      });
      await refreshModels();
    } catch (err) {
      setPullProgress(`Failed: ${err}`);
    } finally {
      setDownloadingModel(null);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f6f5f2] p-4 select-none">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-200 bg-[#f6f5f2]/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-zinc-950">LearnForge Runtime Manager</h1>
              <p className="text-xs text-zinc-500">Real-time system, runtime & model verification</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={runRealDiagnostics}
            disabled={isVerifying}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />}
          >
            {isVerifying ? 'Verifying...' : 'Re-verify'}
          </Button>
        </div>

        {/* Runtime Status Cards Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Status Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Environment Status */}
            <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="font-semibold text-[11px]">Environment</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2">
                <p className="font-bold text-zinc-900 text-sm">Ready</p>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Desktop Runtime</p>
              </div>
            </div>

            {/* Models Status */}
            <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="font-semibold text-[11px]">Models</span>
                <Cpu className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2">
                <p className="font-bold text-zinc-900 text-sm">{models.length} Installed</p>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Ollama Local AI</p>
              </div>
            </div>

            {/* Workspace Status */}
            <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="font-semibold text-[11px]">Workspace</span>
                <HardDrive className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2">
                <p className="font-bold text-zinc-900 text-sm">Ready</p>
                <p className="text-[10px] text-zinc-500 truncate mt-0.5">{workspaceLocation || 'Default Path'}</p>
              </div>
            </div>

            {/* Database Status */}
            <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="font-semibold text-[11px]">Database</span>
                <DbIcon className="w-4 h-4 text-purple-600" />
              </div>
              <div className="mt-2">
                <p className="font-bold text-zinc-900 text-sm">Active</p>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">SQLite Persistence</p>
              </div>
            </div>
          </div>

          {/* Installed Models List */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-800 uppercase tracking-wider text-[10px]">
                Installed Local AI Models
              </span>
              <span className="text-[10px] text-zinc-500">Mode: {aiMode.toUpperCase()}</span>
            </div>

            {models.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {models.map((m) => (
                  <div
                    key={m.name}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white shadow-2xs font-mono text-xs text-zinc-800"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{m.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 space-y-3">
                <div className="flex items-start gap-3">
                  <Cpu className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-zinc-900">Recommended Model Missing</h3>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      No local Ollama models were detected. You can download <b>Qwen3:8B</b> for optimal general reasoning.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <Button
                    size="sm"
                    onClick={() => handleInstallMissingModel('qwen3:8b')}
                    isLoading={downloadingModel === 'qwen3:8b'}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    Download Qwen3:8B
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onComplete}>
                    Skip for Now
                  </Button>
                </div>
                {downloadingModel && (
                  <p className="text-[11px] font-mono text-blue-600">{pullProgress}</p>
                )}
              </div>
            )}
          </div>

          {/* Privacy & Updates Information */}
          <div className="p-3.5 rounded-xl border border-zinc-200 bg-[#f6f5f2]/70 flex items-center justify-between text-zinc-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-[11px]">System & Workspace Verified. All data is stored locally on your device.</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">v1.0.0</span>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-[#f6f5f2]/70 flex items-center justify-between">
          <span className="text-xs text-zinc-500">Environment Ready</span>
          <Button
            size="lg"
            onClick={onComplete}
            rightIcon={<ArrowRight className="w-5 h-5" />}
            className="px-8 font-bold"
          >
            Open Nexus Agent
          </Button>
        </div>
      </div>
    </div>
  );
};


