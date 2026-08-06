import React from 'react';
import { Cpu, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAppStore } from '../../stores/appStore';

interface ChatHeaderProps {
  chatTitle: string;
  onExport: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ chatTitle, onExport }) => {
  const { models, selectedModel, setSelectedModel } = useAppStore();

  return (
    <header className="h-14 w-full flex items-center justify-between px-6 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md shrink-0 z-10">
      {/* Chat Title */}
      <div className="flex items-center gap-3 min-w-0">
        <h2 className="text-sm font-semibold text-slate-100 truncate">
          {chatTitle || 'New Conversation'}
        </h2>
      </div>

      {/* Model Selector & Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Model Dropdown */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-transparent text-slate-200 text-xs font-mono focus:outline-none cursor-pointer"
          >
            {models.length > 0 ? (
              models.map((m) => (
                <option key={m.name} value={m.name} className="bg-slate-900 text-slate-200">
                  {m.name}
                </option>
              ))
            ) : (
              <option value="llama3.2" className="bg-slate-900 text-slate-200">
                llama3.2 (3B)
              </option>
            )}
          </select>
        </div>

        {/* Export Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onExport}
          leftIcon={<Download className="w-3.5 h-3.5" />}
          className="text-xs"
        >
          Export .md
        </Button>
      </div>
    </header>
  );
};
