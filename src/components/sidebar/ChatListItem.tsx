import React, { useState } from 'react';
import { MessageSquare, Pin, Trash2, Edit2, Check, X } from 'lucide-react';
import { Chat } from '../../services/types';

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
          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
      }`}
    >
      <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />

      {isEditing ? (
        <form onSubmit={handleSaveRename} className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full bg-slate-950 border border-indigo-500/50 rounded px-2 py-0.5 text-xs text-slate-100 focus:outline-none"
            autoFocus
          />
          <button type="submit" className="p-0.5 text-emerald-400 hover:text-emerald-300">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => setIsEditing(false)} className="p-0.5 text-slate-400 hover:text-slate-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        <span className="flex-1 truncate">{chat.title}</span>
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
            className={`p-1 rounded hover:bg-slate-800 transition-colors ${
              chat.pinned ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
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
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete chat"
            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
