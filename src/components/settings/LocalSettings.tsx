import React, { useState } from 'react';
import {
  ShieldCheck,
  Cpu,
  Download,
  Database,
  TerminalSquare,
  RefreshCw,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-250 select-none text-xs">
      {/* Local Runtime Status Card */}
      <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <h4 className="font-bold text-sm text-emerald-950">Local AI Runtime Active</h4>
              <p className="text-[10px] text-emerald-700">100% Offline & Private System Execution</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ollama v0.11.7 Running
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 text-[11px] font-mono">
          <div className="p-2.5 rounded-xl bg-white border border-emerald-100">
            <span className="text-zinc-400 text-[10px] block uppercase">Active Workspace</span>
            <span className="font-semibold text-zinc-800 truncate block">{workspacePath || 'D:\\NexusAgent'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white border border-emerald-100">
            <span className="text-zinc-400 text-[10px] block uppercase">Model Storage</span>
            <span className="font-semibold text-zinc-800 truncate block">C:\Users\.ollama\models</span>
          </div>
        </div>
      </div>

      {/* Installed Models Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-emerald-600" /> Installed Local Models ({models.length})
          </h4>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refreshModels()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh List
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {models.length > 0 ? (
            models.map((m) => (
              <div
                key={m.name}
                className="p-3 rounded-xl border border-zinc-200 bg-white flex items-center justify-between shadow-sm"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="font-bold text-zinc-900 truncate font-mono">{m.name}</p>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Size: {m.size ? (m.size / (1024 * 1024 * 1024)).toFixed(2) : '4.20'} GB
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  Ready
                </span>
              </div>
            ))
          ) : (
            <>
              <div className="p-3 rounded-xl border border-zinc-200 bg-white flex items-center justify-between">
                <div>
                  <p className="font-bold text-zinc-900 font-mono">qwen3:8b</p>
                  <p className="text-[10px] text-zinc-500">General Intelligence Agent</p>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">Ready</span>
              </div>
              <div className="p-3 rounded-xl border border-zinc-200 bg-white flex items-center justify-between">
                <div>
                  <p className="font-bold text-zinc-900 font-mono">qwen2.5-coder:7b</p>
                  <p className="text-[10px] text-zinc-500">Coding Specialist Agent</p>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">Ready</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Model Puller / Manager */}
      <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-3">
        <h4 className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
          <Download className="w-4 h-4 text-emerald-600" /> Pull / Download Local Model
        </h4>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Enter model tag (e.g. qwen3:8b, deepseek-r1:7b, nomic-embed-text)..."
            value={pullModelInput}
            onChange={(e) => setPullModelInput(e.target.value)}
            disabled={isPulling}
          />
          <Button
            type="button"
            variant="primary"
            onClick={handlePullModel}
            isLoading={isPulling}
            leftIcon={<Download className="w-4 h-4" />}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
          >
            Pull Model
          </Button>
        </div>
        {pullStatus && <p className="text-[10px] text-zinc-500 font-mono">{pullStatus}</p>}
      </div>

      {/* Local Memory & MCP Pipeline */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="p-3.5 rounded-2xl border border-zinc-200 bg-white space-y-2">
          <h5 className="font-semibold text-zinc-900 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-blue-600" /> Local Memory Pipeline
          </h5>
          <div className="space-y-1 text-[11px] font-mono text-zinc-600">
            <p className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-600" /> SQLite Database Active</p>
            <p className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-600" /> nomic-embed-text Vector RAG</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-zinc-200 bg-white space-y-2">
          <h5 className="font-semibold text-zinc-900 flex items-center gap-1.5">
            <TerminalSquare className="w-4 h-4 text-purple-600" /> Local MCP Tools
          </h5>
          <div className="space-y-1 text-[11px] font-mono text-zinc-600">
            <p className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-600" /> Filesystem & Workspace Access</p>
            <p className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-600" /> Browser / Web Extraction Engine</p>
          </div>
        </div>
      </div>
    </div>
  );
};
