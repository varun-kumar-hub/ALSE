import React from 'react';
import { Loader2, Sparkles, Brain, CheckCircle2 } from 'lucide-react';

interface StreamingIndicatorProps {
  stage: 'idle' | 'initializing' | 'understanding' | 'generating' | 'finalizing';
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({ stage }) => {
  if (stage === 'idle') return null;

  const stageLabels = {
    initializing: 'Starting request...',
    understanding: 'Understanding request...',
    generating: 'Building answer...',
    finalizing: 'Reviewing response...',
  };

  const stageIcons = {
    initializing: <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />,
    understanding: <Brain className="w-4 h-4 text-blue-600 animate-pulse" />,
    generating: <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />,
    finalizing: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  };

  return (
    <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-semibold text-zinc-700 w-fit shadow-sm animate-in fade-in duration-200">
      {stageIcons[stage]}
      <span>{stageLabels[stage]}</span>
    </div>
  );
};
