import React, { useState } from 'react';
import { MessageSquare, Pin, Trash2, Edit2, Check, X } from 'lucide-react';
import { Chat } from '../../services/types';

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return 'Just now';
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  return `${Math.floor(diffSec / 86400)}d ago`;
}

interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
  onSelect: () => void;
  onRename: (newTitle: string) => void;
  onPinToggle: () => void;
  onDelete: () => void;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({
  chat,
  isActive,
  onSelect,
  onRename,
  onPinToggle,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title);

  const handleSaveRename = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (editTitle.trim() && editTitle !== chat.title) {
      onRename(editTitle.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      onClick={() => !isEditing && onSelect()}
      className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
        isActive
          ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm'
          : 'text-zinc-600 hover:text-zinc-800 hover:bg-zinc-50 border border-transparent'
      }`}
    >
      <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-zinc-500'}`} />

      {isEditing ? (
        <form onSubmit={handleSaveRename} className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full bg-white border border-blue-300 rounded px-2 py-0.5 text-xs text-zinc-950 focus:outline-none"
            autoFocus
          />
          <button type="submit" className="p-0.5 text-emerald-400 hover:text-emerald-300">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => setIsEditing(false)} className="p-0.5 text-zinc-600 hover:text-zinc-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        <div className="flex-1 min-w-0 flex flex-col">
          <span className="truncate text-xs font-semibold">{chat.title}</span>
          <span className="text-[9px] text-zinc-400 font-mono">{formatRelativeTime(chat.updated_at)}</span>
        </div>
      )}

      {/* Action buttons on hover */}
      {!isEditing && (
        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPinToggle();
            }}
            title={chat.pinned ? 'Unpin chat' : 'Pin chat'}
            className={`p-1 rounded hover:bg-zinc-100 transition-colors ${
              chat.pinned ? 'text-blue-600' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditTitle(chat.title);
              setIsEditing(true);
            }}
            title="Rename chat"
            className="p-1 rounded text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete chat"
            className="p-1 rounded text-zinc-500 hover:text-rose-600 hover:bg-zinc-100 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

