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
    <header className="h-14 w-full flex items-center justify-between px-6 border-b border-zinc-200 bg-white/85 backdrop-blur-md shrink-0 z-10">
      {/* Chat Title */}
      <div className="flex items-center gap-3 min-w-0">
        <h2 className="text-sm font-bold text-zinc-950 truncate">
          {chatTitle || 'New Conversation'}
        </h2>
      </div>

      {/* Model Selector & Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Model Dropdown */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs shadow-sm">
          <Cpu className="w-4 h-4 text-blue-600" />
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-transparent text-zinc-800 text-xs font-mono focus:outline-none cursor-pointer"
          >
            {models.length > 0 ? (
              models.map((m) => (
                <option key={m.name} value={m.name} className="bg-white text-zinc-800">
                  {m.name}
                </option>
              ))
            ) : (
              <option value="llama3.2" className="bg-white text-zinc-800">
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
