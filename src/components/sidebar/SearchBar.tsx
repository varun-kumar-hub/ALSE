import React from 'react';
import { Search, X } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

export const SearchBar: React.FC = () => {
  const { searchQuery, setSearchQuery } = useAppStore();

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
      <input
        type="text"
        placeholder="Search conversations..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-8 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 transition-all"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 p-0.5 rounded-full hover:bg-zinc-100"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};


