import React, { useState } from 'react';
import { Plus, Globe, FolderPlus, FileUp, ChevronDown, MessageSquare } from 'lucide-react';

interface QuickActionsBarProps {
  onNewChat: () => void;
  onNewResearch: () => void;
  onNewProject: () => void;
  onUploadFile: () => void;
  compact?: boolean;
}

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  onNewChat,
  onNewResearch,
  onNewProject,
  onUploadFile,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2 py-1">
        <button
          onClick={onNewChat}
          title="New Chat"
          className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative select-none">
      {/* Primary Action Button with Dropdown Trigger */}
      <div className="flex items-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all">
        <button
          onClick={onNewChat}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 font-extrabold text-xs cursor-pointer active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 py-2.5 border-l border-blue-500/60 hover:bg-blue-800/40 rounded-r-xl transition-colors cursor-pointer"
          title="Creation Options"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Creation Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-12 left-0 right-0 z-50 bg-white border border-zinc-200 rounded-2xl shadow-xl p-1 space-y-0.5 animate-in fade-in duration-150 text-xs font-semibold text-zinc-700">
          <button
            onClick={() => {
              onNewChat();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span>New Chat</span>
          </button>

          <button
            onClick={() => {
              onNewProject();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-amber-50 hover:text-amber-900 transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-amber-600" />
            <span>New Project Workspace</span>
          </button>

          <button
            onClick={() => {
              onNewResearch();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-purple-50 hover:text-purple-900 transition-colors"
          >
            <Globe className="w-4 h-4 text-purple-600" />
            <span>Deep Research Session</span>
          </button>

          <button
            onClick={() => {
              onUploadFile();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
          >
            <FileUp className="w-4 h-4 text-emerald-600" />
            <span>Upload & Parse Document</span>
          </button>
        </div>
      )}
    </div>
  );
};
