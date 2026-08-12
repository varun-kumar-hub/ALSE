import React, { useState } from 'react';
import {
  Cpu,
  Zap,
  Clock,
  Database,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ListOrdered,
  Bot,
} from 'lucide-react';
import { RuntimeMetadata } from '../../lib/runtimeMetadata';

interface RuntimeMetadataCardProps {
  metadata: RuntimeMetadata;
}

export const RuntimeMetadataCard: React.FC<RuntimeMetadataCardProps> = ({ metadata }) => {
  const [showDetails, setShowDetails] = useState(false);

  const durationSec = (metadata.generationTimeMs / 1000).toFixed(1);

  const getModeAccent = () => {
    switch (metadata.mode) {
      case 'local':
        return {
          badge: '🟢 LOCAL',
          bg: 'bg-emerald-50/60',
          border: 'border-emerald-200/80',
          text: 'text-emerald-800',
          badgeStyle: 'bg-emerald-100 text-emerald-800',
        };
      case 'cloud':
        return {
          badge: '🔵 CLOUD',
          bg: 'bg-blue-50/60',
          border: 'border-blue-200/80',
          text: 'text-blue-800',
          badgeStyle: 'bg-blue-100 text-blue-800',
        };
      case 'hybrid':
      default:
        return {
          badge: '🟣 HYBRID',
          bg: 'bg-purple-50/60',
          border: 'border-purple-200/80',
          text: 'text-purple-800',
          badgeStyle: 'bg-purple-100 text-purple-800',
        };
    }
  };

  const accent = getModeAccent();

  return (
    <div className="mt-3 select-none text-xs border border-zinc-200/80 rounded-2xl bg-zinc-50/70 overflow-hidden transition-all shadow-sm">
      {/* Dynamic Mode Header & Metric Bar */}
      <div className={`p-3 border-b ${accent.border} ${accent.bg} space-y-2`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold font-mono uppercase ${accent.badgeStyle}`}>
              {accent.badge}
            </span>
            <span className="font-extrabold text-zinc-900 text-xs flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-zinc-700" /> {metadata.model}
            </span>
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-900 font-bold cursor-pointer transition-colors"
          >
            <span>{showDetails ? 'Hide Execution Log' : 'Execution Details'}</span>
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Dynamic Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
          <div>
            <span className="text-[9px] text-zinc-400 block uppercase font-bold">Provider</span>
            <span className="font-bold text-zinc-800">{metadata.provider}</span>
          </div>

          <div>
            <span className="text-[9px] text-zinc-400 block uppercase font-bold">Execution Agent</span>
            <span className="font-bold text-zinc-800 flex items-center gap-1">
              <Bot className="w-3 h-3 text-blue-600" /> {metadata.agent}
            </span>
          </div>

          <div>
            <span className="text-[9px] text-zinc-400 block uppercase font-bold">Duration / Latency</span>
            <span className="font-bold text-zinc-800 flex items-center gap-1">
              <Clock className="w-3 h-3 text-zinc-500" /> {durationSec}s
            </span>
          </div>

          <div>
            {metadata.mode === 'local' && metadata.speedTokPerSec ? (
              <>
                <span className="text-[9px] text-zinc-400 block uppercase font-bold">Generation Speed</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" /> {metadata.speedTokPerSec} tok/s
                </span>
              </>
            ) : (
              <>
                <span className="text-[9px] text-zinc-400 block uppercase font-bold">API Streaming</span>
                <span className="font-bold text-blue-700">SSE Active</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sources Used Section (STRICT: Only displays sources ACTUALLY used) */}
      <div className="p-2.5 px-3 bg-white border-b border-zinc-100 flex items-center gap-2 flex-wrap text-[11px]">
        <span className="font-bold text-zinc-500 uppercase tracking-wider text-[9px] flex items-center gap-1">
          <Database className="w-3 h-3 text-emerald-600" /> Sources Used:
        </span>
        {metadata.sourcesUsed.map((src, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/70 font-semibold text-[10px]"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {src}
          </span>
        ))}
      </div>

      {/* Expanded Execution Log & Timestamps */}
      {showDetails && (
        <div className="p-3 bg-zinc-950 text-zinc-100 font-mono text-[11px] space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800 pb-1 text-[10px] uppercase font-bold">
            <span className="flex items-center gap-1">
              <ListOrdered className="w-3 h-3 text-blue-400" /> Execution Pipeline Log
            </span>
            <span>Application State</span>
          </div>

          <div className="space-y-1 pt-1">
            {metadata.timestamps.map((t, idx) => (
              <div key={idx} className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-400">{t.time}</span>
                <span className="text-emerald-400 font-semibold">✓ {t.step}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-zinc-800 flex justify-between text-[10px] text-zinc-400">
            <span>Tokens Transferred: {metadata.inputTokens} → {metadata.outputTokens}</span>
            <span>Total: {metadata.totalTokens} Tokens</span>
          </div>
        </div>
      )}
    </div>
  );
};
