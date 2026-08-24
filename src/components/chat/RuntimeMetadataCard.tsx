import React, { useState } from 'react';
import {
  Cpu,
  Zap,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ListOrdered,
  Bot,
  Globe,
  Wrench,
  ExternalLink,
  BookOpen,
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
          badgeStyle: 'bg-emerald-100 text-emerald-800',
        };
      case 'cloud':
        return {
          badge: '🔵 CLOUD',
          bg: 'bg-blue-50/60',
          border: 'border-blue-200/80',
          badgeStyle: 'bg-blue-100 text-blue-800',
        };
      case 'hybrid':
      default:
        return {
          badge: '🟣 HYBRID',
          bg: 'bg-purple-50/60',
          border: 'border-purple-200/80',
          badgeStyle: 'bg-purple-100 text-purple-800',
        };
    }
  };

  const accent = getModeAccent();
  const hasSources = metadata.sourcesUsed && metadata.sourcesUsed.length > 0;
  const hasTools = metadata.toolsUsed && metadata.toolsUsed.length > 0;

  return (
    <div className="mt-3 select-none text-xs border border-zinc-200/80 rounded-2xl bg-zinc-50/70 overflow-hidden transition-all shadow-sm">
      {/* Header & Key Metric Bar */}
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
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-900 font-bold cursor-pointer transition-colors"
          >
            <span>{showDetails ? 'Hide Execution Details' : 'Execution Details'}</span>
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
            <span className="text-[9px] text-zinc-400 block uppercase font-bold">Realtime Tokens Used</span>
            <span className="font-bold text-blue-700 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500 shrink-0" />
              {metadata.totalTokens} tok ({metadata.inputTokens}in / {metadata.outputTokens}out)
            </span>
          </div>
        </div>
      </div>

      {/* 📚 SOURCES USED SECTION (Information Sources Only) */}
      <div className="p-2.5 px-3 bg-white border-b border-zinc-100 flex items-center gap-2 flex-wrap text-[11px]">
        <span className="font-bold text-zinc-500 uppercase tracking-wider text-[9px] flex items-center gap-1 mr-1">
          <BookOpen className="w-3 h-3 text-emerald-600" /> SOURCES USED {hasSources ? `· ${metadata.sourcesUsed.length}` : '· Model Knowledge'}:
        </span>

        {hasSources ? (
          metadata.sourcesUsed.map((src, idx) => {
            const domainLabel = src.domain || (src.url ? new URL(src.url).hostname : 'source');
            return src.url ? (
              <a
                key={idx}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/70 font-semibold text-[10px] transition-colors cursor-pointer"
                title={src.title || src.url}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="truncate max-w-[180px]">{src.title || domainLabel}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
            ) : (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/70 font-semibold text-[10px]"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{src.title || domainLabel}</span>
              </span>
            );
          })
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-700 font-semibold text-[10px]">
            <span>Model Internal Knowledge</span>
          </span>
        )}
      </div>

      {/* Expanded Execution Details (Tools Used & Pipeline Log) */}
      {showDetails && (
        <div className="p-3 bg-zinc-950 text-zinc-100 font-mono text-[11px] space-y-3 animate-in fade-in duration-150">
          {/* 🔧 TOOLS USED SECTION */}
          {hasTools && (
            <div className="space-y-1 pb-2 border-b border-zinc-800">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Wrench className="w-3 h-3 text-amber-400" /> Tools Used
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {metadata.toolsUsed.map((tool, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-zinc-800 text-amber-300 border border-zinc-700 text-[10px] font-semibold flex items-center gap-1"
                  >
                    <Globe className="w-2.5 h-2.5" /> {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pipeline Log */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800 pb-1 text-[10px] uppercase font-bold">
              <span className="flex items-center gap-1">
                <ListOrdered className="w-3 h-3 text-blue-400" /> Execution Pipeline Log
              </span>
              <span>Sources Retrieved: {metadata.sourcesUsed.length}</span>
            </div>

            <div className="space-y-1 pt-1">
              {metadata.timestamps.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-400">{t.time}</span>
                  <span className="text-emerald-400 font-semibold">✓ {t.step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800 flex justify-between text-[10px] text-zinc-400">
            <span>Tokens: {metadata.inputTokens} input → {metadata.outputTokens} output</span>
            <span>Total: {metadata.totalTokens} Tokens</span>
          </div>
        </div>
      )}
    </div>
  );
};
