import React from 'react';
import { Loader2, Sparkles, Brain, CheckCircle2 } from 'lucide-react';

interface StreamingIndicatorProps {
  stage: 'idle' | 'initializing' | 'understanding' | 'generating' | 'finalizing';
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({ stage }) => {
  if (stage === 'idle') return null;

  const stageLabels = {
    initializing: 'Initializing local AI engine...',
    understanding: 'Understanding request & intent...',
    generating: 'Generating response...',
    finalizing: 'Finalizing formatting...',
  };

  const stageIcons = {
    initializing: <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />,
    understanding: <Brain className="w-4 h-4 text-purple-400 animate-pulse" />,
    generating: <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />,
    finalizing: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  };

  return (
    <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-xs font-medium text-indigo-300 w-fit backdrop-blur-md animate-in fade-in duration-200">
      {stageIcons[stage]}
      <span>{stageLabels[stage]}</span>
    </div>
  );
};
