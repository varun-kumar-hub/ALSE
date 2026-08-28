import React, { useState } from 'react';
import {
  ShieldCheck,
  Cpu,
  Download,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { pullModelStream } from '../../services/ollama';

interface LocalSettingsProps {
  workspacePath: string;
  onWorkspaceChange?: (path: string) => void;
}

export const LocalSettings: React.FC<LocalSettingsProps> = ({
  workspacePath,
}) => {
  const { models, refreshModels } = useAppStore();

  const [pullModelInput, setPullModelInput] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullStatus, setPullStatus] = useState('');

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
    <div className="space-y-6 animate-in fade-in duration-200 select-none text-xs text-zinc-900 dark:text-zinc-100">
      {/* Local Runtime Status Card */}
      <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h4 className="font-bold text-sm text-zinc-950 dark:text-white">Local AI Runtime Active</h4>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400/80 font-mono">100% Offline & Private System Execution</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-[10px] flex items-center gap-1.5 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Ollama Active
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 text-[11px] font-mono">
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-zinc-500 text-[10px] block uppercase">Active Workspace</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate block">{workspacePath || 'D:\\NexusAgent'}</span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-zinc-500 text-[10px] block uppercase">Model Storage</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate block">C:\Users\.ollama\models</span>
          </div>
        </div>
      </div>

      {/* Installed Models Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Installed Local Models ({models.length})
          </h4>
          <button
            onClick={() => refreshModels()}
            className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-mono text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {models.length > 0 ? (
            models.map((m) => (
              <div
                key={m.name}
                className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/80 flex items-center justify-between shadow-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="font-bold text-zinc-950 dark:text-white truncate font-mono">{m.name}</p>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Size: {m.size ? (m.size / (1024 * 1024 * 1024)).toFixed(2) : '4.20'} GB
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/20">
                  Ready
                </span>
              </div>
            ))
          ) : (
            <>
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/80 flex items-center justify-between">
                <div>
                  <p className="font-bold text-zinc-950 dark:text-white font-mono">qwen3:8b</p>
                  <p className="text-[10px] text-zinc-500">General Intelligence Agent</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/20">
                  Ready
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/80 flex items-center justify-between">
                <div>
                  <p className="font-bold text-zinc-950 dark:text-white font-mono">qwen2.5-coder:7b</p>
                  <p className="text-[10px] text-zinc-500">Coding Specialist Agent</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/20">
                  Ready
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Model Puller / Manager */}
      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/80 space-y-3">
        <h4 className="text-xs font-mono font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Pull / Download Local Model
        </h4>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. llama3:8b, mistral, codellama..."
            value={pullModelInput}
            onChange={(e) => setPullModelInput(e.target.value)}
            disabled={isPulling}
            className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 font-mono text-xs focus:outline-none focus:border-emerald-500 transition"
          />
          <button
            onClick={handlePullModel}
            disabled={!pullModelInput.trim() || isPulling}
            className="px-4 py-2 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl font-mono text-xs flex items-center gap-2 transition cursor-pointer shadow-xs"
          >
            {isPulling ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isPulling ? 'Pulling...' : 'Pull'}</span>
          </button>
        </div>
        {pullStatus && (
          <p className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 animate-pulse">{pullStatus}</p>
        )}
      </div>
    </div>
  );
};
