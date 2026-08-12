import React from 'react';
import { Search } from 'lucide-react';

interface UniversalSearchProps {
  value: string;
  onChange: (val: string) => void;
  compact?: boolean;
}

export const UniversalSearch: React.FC<UniversalSearchProps> = ({
  value,
  onChange,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="flex justify-center py-1">
        <button
          title="Search Everything (Ctrl+K)"
          className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative select-none px-1">
      <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
      <input
        type="text"
        placeholder="Search everything (Ctrl+K)..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-8 pr-7 py-1.5 bg-zinc-100/80 border border-zinc-200/80 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
      />
      <kbd className="absolute right-2 top-2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-200/60 text-zinc-500 pointer-events-none">
        ⌘K
      </kbd>
    </div>
  );
};
