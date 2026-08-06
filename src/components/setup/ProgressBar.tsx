import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label }) => {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full space-y-1.5 select-none">
      {label && (
        <div className="flex justify-between text-xs text-zinc-500">
          <span>{label}</span>
          <span className="font-mono">{Math.round(clamped)}%</span>
        </div>
      )}
      <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden p-0.5 border border-zinc-200">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-300 shadow-sm"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
