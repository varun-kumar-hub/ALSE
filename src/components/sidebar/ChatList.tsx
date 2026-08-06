import React from 'react';
import { Pin } from 'lucide-react';
import { Chat } from '../../services/types';
import { ChatListItem } from './ChatListItem';
import { useAppStore } from '../../stores/appStore';

interface ChatListProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onTogglePin: (id: string, currentPin: boolean) => void;
  onDeleteChat: (id: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  activeChatId,
  onSelectChat,
  onRenameChat,
  onTogglePin,
  onDeleteChat,
}) => {
  const { searchQuery } = useAppStore();

  const filtered = chats.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedChats = filtered.filter((c) => c.pinned);
  const unpinnedChats = filtered.filter((c) => !c.pinned);

  // Date grouping for unpinned chats
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const weekStart = todayStart - 6 * 86400000;

  const todayChats: Chat[] = [];
  const yesterdayChats: Chat[] = [];
  const thisWeekChats: Chat[] = [];
  const olderChats: Chat[] = [];

  unpinnedChats.forEach((chat) => {
    const time = new Date(chat.updated_at).getTime();
    if (time >= todayStart) todayChats.push(chat);
    else if (time >= yesterdayStart) yesterdayChats.push(chat);
    else if (time >= weekStart) thisWeekChats.push(chat);
    else olderChats.push(chat);
  });

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs">
        {searchQuery ? 'No matching conversations' : 'No chats yet. Start a new chat above!'}
      </div>
    );
  }

  const renderSection = (title: string, items: Chat[], icon?: React.ReactNode) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1 my-3">
        <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
          {icon}
          <span>{title}</span>
        </div>
        <div className="space-y-0.5">
          {items.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              isActive={chat.id === activeChatId}
              onSelect={() => onSelectChat(chat.id)}
              onRename={(newTitle) => onRenameChat(chat.id, newTitle)}
              onPinToggle={() => onTogglePin(chat.id, chat.pinned)}
              onDelete={() => onDeleteChat(chat.id)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto px-2 space-y-1">
      {renderSection('Pinned', pinnedChats, <Pin className="w-3 h-3 text-indigo-400" />)}
      {renderSection('Today', todayChats)}
      {renderSection('Yesterday', yesterdayChats)}
      {renderSection('This Week', thisWeekChats)}
      {renderSection('Older', olderChats)}
    </div>
  );
};
