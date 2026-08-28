import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { DynamicActivityItem } from '../../lib/thoughtExtractor';
import { QueryIntent } from '../../services/types';

interface ThinkingCardProps {
  isStreaming?: boolean;
  userPrompt?: string;
  intent?: QueryIntent;
  sourcesCount?: number;
  toolsCount?: number;
  generationTimeMs?: number;
  provider?: string;
  model?: string;
  activities?: DynamicActivityItem[];
  thinking?: string;
  defaultExpanded?: boolean;
}

export const ThinkingCard: React.FC<ThinkingCardProps> = ({
  isStreaming = false,
  intent = 'general',
  sourcesCount = 0,
  toolsCount = 0,
  generationTimeMs = 0,
  provider,
  model,
  activities = [],
  thinking,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-collapse when generation finishes
  useEffect(() => {
    if (!isStreaming) {
      setIsExpanded(false);
    }
  }, [isStreaming]);

  // Compute adaptive summary label for collapsed state
  const getSummaryLabel = (): string => {
    if (intent === 'research' && sourcesCount > 0) {
      return `Researched · ${sourcesCount} source${sourcesCount > 1 ? 's' : ''}`;
    }
    if (sourcesCount > 0) {
      return `Searched · ${sourcesCount} source${sourcesCount > 1 ? 's' : ''}`;
    }
    if (toolsCount > 0) {
      return `Completed ${toolsCount} action${toolsCount > 1 ? 's' : ''}`;
    }
    const sec = Math.max(1, Math.round((generationTimeMs || 1500) / 1000));
    return `Thought for ${sec}s`;
  };

  // Filter activities to exclude search steps if web search wasn't performed
  const filteredActivities = activities.filter((act) => {
    if (sourcesCount === 0 && /\b(search|source|retriev)\b/i.test(act.text)) {
      return false;
    }
    return true;
  });

  const displayActivities =
    filteredActivities.length > 0
      ? filteredActivities
      : [
          { id: 'a1', text: 'Understanding your request', status: 'completed' as const },
          { id: 'a2', text: 'Selecting relevant information', status: 'completed' as const },
          { id: 'a3', text: 'Preparing response', status: 'completed' as const },
        ];

  return (
    <div className="w-full my-1.5 select-none font-sans text-xs">
      {/* Collapsible minimal Header Row */}
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
        className="group inline-flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-lg hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer text-left border-none bg-transparent shadow-none outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
      >
        <Sparkles
          className={`w-3.5 h-3.5 shrink-0 ${
            isStreaming ? 'text-blue-600 dark:text-blue-400 animate-spin' : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'
          }`}
        />

        <span className="font-medium text-xs text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white">
          {isStreaming ? 'Thinking...' : getSummaryLabel()}
        </span>

        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 shrink-0" />
        )}
      </button>

      {/* Expanded High-Level Activities Panel */}
      {isExpanded && (
        <div className="mt-1.5 mb-2.5 pl-3 py-1 border-l-2 border-zinc-200/80 dark:border-zinc-700/80 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400 animate-in fade-in duration-150 select-text">
          {displayActivities.map((act, i) => {
            const isCompleted = act.status === 'completed' || !isStreaming;
            const isActive = act.status === 'active' && isStreaming;

            return (
              <div key={act.id || i} className="flex items-center gap-2">
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : isActive ? (
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 ml-1 shrink-0" />
                )}
                <span
                  className={
                    isActive
                      ? 'text-blue-700 dark:text-blue-300 font-medium'
                      : isCompleted
                      ? 'text-zinc-700 dark:text-zinc-300'
                      : 'text-zinc-400 dark:text-zinc-500'
                  }
                >
                  {act.text}
                </span>
              </div>
            );
          })}

          {(provider || model) && (
            <div className="pt-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
              Engine: {provider === 'ollama' || provider === 'local' ? 'Local Model' : 'Cloud Provider'} ({model || 'qwen3:8b'})
            </div>
          )}

          {thinking && (
            <div className="pt-2 text-xs text-zinc-600 dark:text-zinc-400 font-sans leading-relaxed whitespace-pre-wrap select-text border-t border-zinc-100 dark:border-zinc-800 mt-2">
              {thinking}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
