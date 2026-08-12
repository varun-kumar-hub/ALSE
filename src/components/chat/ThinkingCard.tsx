import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, CircleDot, Circle, Loader2 } from 'lucide-react';
import { DynamicActivityItem } from '../../lib/thoughtExtractor';

interface ThinkingCardProps {
  activities?: DynamicActivityItem[];
  thinking?: string;
  isStreaming?: boolean;
  defaultExpanded?: boolean;
}

export const ThinkingCard: React.FC<ThinkingCardProps> = ({
  activities = [],
  thinking = '',
  isStreaming = false,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (activities.length === 0 && !isStreaming && !thinking) return null;

  return (
    <div className="w-full my-3 rounded-2xl border border-zinc-200/90 bg-white text-zinc-900 shadow-sm overflow-hidden transition-all duration-200">
      {/* Header bar */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-zinc-50/80 hover:bg-zinc-100/80 transition-colors text-left select-none border-b border-zinc-100"
      >
        <div className="flex items-center gap-2.5">
          {isStreaming ? (
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-3 h-3" />
            </div>
          )}

          <span className="text-xs font-bold tracking-wide text-zinc-800 uppercase font-mono">
            {isStreaming ? 'Thinking' : 'Thought Process'}
          </span>

          <span className="text-zinc-300">•</span>

          {isStreaming ? (
            <span className="text-xs text-blue-600 font-medium animate-pulse">
              Working on request...
            </span>
          ) : (
            <span className="text-xs text-emerald-700 font-medium">
              Completed
            </span>
          )}
        </div>

        {/* Right side toggle controls */}
        <div className="flex items-center gap-2 text-zinc-400 hover:text-zinc-600">
          <span className="text-xs font-mono">•••</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Expandable Natural Dynamic Activities */}
      {isExpanded && (
        <div className="p-4 bg-white space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="relative pl-6 space-y-3.5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-zinc-200/80">
            {activities.map((item) => {
              const isCompleted = item.status === 'completed';
              const isActive = item.status === 'active';
              const isPending = item.status === 'pending';

              return (
                <div
                  key={item.id}
                  className={`relative flex items-start gap-2.5 transition-all duration-200 ${
                    isPending ? 'opacity-40' : 'opacity-100'
                  }`}
                >
                  {/* Status Indicator Bullet */}
                  <div className="absolute -left-6 top-0.5 flex items-center justify-center bg-white rounded-full">
                    {isCompleted ? (
                      <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-500/40 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                      </div>
                    ) : isActive ? (
                      <div className="w-4 h-4 rounded-full bg-blue-50 border border-blue-500 flex items-center justify-center text-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.25)]">
                        <CircleDot className="w-2.5 h-2.5 animate-spin-slow" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-zinc-100 border border-zinc-300 flex items-center justify-center text-zinc-400">
                        <Circle className="w-2 h-2" />
                      </div>
                    )}
                  </div>

                  {/* Dynamic Natural Activity Sentence */}
                  <p
                    className={`text-[13px] leading-relaxed select-text ${
                      isActive
                        ? 'text-blue-700 font-medium'
                        : isCompleted
                        ? 'text-zinc-800'
                        : 'text-zinc-400'
                    }`}
                  >
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
