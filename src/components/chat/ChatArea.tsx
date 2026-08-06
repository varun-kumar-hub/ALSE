import React, { useRef, useEffect } from 'react';
import { Bot, BookOpen, GitCompare, Code2, Calendar } from 'lucide-react';
import { ChatHeader } from './ChatHeader';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { StreamingIndicator } from './StreamingIndicator';
import { ChatMessage as ChatMessageType } from '../../services/types';
import { useAppStore } from '../../stores/appStore';

interface ChatAreaProps {
  chatTitle: string;
  messages: ChatMessageType[];
  onSendMessage: (prompt: string) => void;
  onStopStreaming: () => void;
  onRegenerate: () => void;
  onExport: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  chatTitle,
  messages,
  onSendMessage,
  onStopStreaming,
  onRegenerate,
  onExport,
}) => {
  const { isStreaming, streamingContent, generationStage, assistantName } = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as messages arrive or tokens stream
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, generationStage]);

  return (
    <div className="flex-1 h-screen flex flex-col bg-slate-950/40 relative overflow-hidden">
      {/* Header */}
      <ChatHeader chatTitle={chatTitle} onExport={onExport} />

      {/* Main Messages Scroll Container */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          /* Empty Chat Welcome Screen */
          <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto space-y-6 select-none animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-500/10 pulse-glow">
              <Bot className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold gradient-text">
                How can {assistantName} help you today?
              </h2>
              <p className="text-xs text-slate-400">
                Ask research questions, compare technologies, write code, or plan projects.
              </p>
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="grid grid-cols-2 gap-3 w-full text-left pt-2">
              <button
                onClick={() => onSendMessage('Explain quantum computing principles with key takeaways')}
                className="glass-card p-3 rounded-2xl text-xs space-y-1 hover:border-indigo-500/40 text-slate-300 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-semibold text-sky-400">
                  <BookOpen className="w-3.5 h-3.5" /> Technical Research
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  Explain quantum computing principles
                </p>
              </button>

              <button
                onClick={() => onSendMessage('Compare PostgreSQL vs SQLite vs MongoDB for local desktop apps')}
                className="glass-card p-3 rounded-2xl text-xs space-y-1 hover:border-purple-500/40 text-slate-300 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-semibold text-purple-400">
                  <GitCompare className="w-3.5 h-3.5" /> Architecture Compare
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  PostgreSQL vs SQLite vs MongoDB
                </p>
              </button>

              <button
                onClick={() => onSendMessage('Write a Rust async function to stream HTTP NDJSON chunks')}
                className="glass-card p-3 rounded-2xl text-xs space-y-1 hover:border-emerald-500/40 text-slate-300 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                  <Code2 className="w-3.5 h-3.5" /> Code Solution
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  Write a Rust async stream handler
                </p>
              </button>

              <button
                onClick={() => onSendMessage('Create a 4-week roadmap for launching an MVP AI Desktop app')}
                className="glass-card p-3 rounded-2xl text-xs space-y-1 hover:border-amber-500/40 text-slate-300 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                  <Calendar className="w-3.5 h-3.5" /> Project Roadmap
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  Create a 4-week AI MVP roadmap
                </p>
              </button>
            </div>
          </div>
        ) : (
          /* Render Messages */
          <div className="py-4">
            {messages.map((msg, idx) => (
              <ChatMessage
                key={msg.id || idx}
                message={msg}
                onRegenerate={idx === messages.length - 1 ? onRegenerate : undefined}
                onExport={onExport}
              />
            ))}

            {/* In-flight streaming message */}
            {isStreaming && (
              <div className="py-4 px-4 md:px-8 bg-slate-900/30 border-t border-slate-900">
                <div className="max-w-4xl mx-auto flex flex-col gap-3">
                  <StreamingIndicator stage={generationStage} />
                  {streamingContent && (
                    <ChatMessage
                      message={{
                        role: 'assistant',
                        content: streamingContent,
                      }}
                    />
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Box */}
      <ChatInput onSend={onSendMessage} onStop={onStopStreaming} />
    </div>
  );
};
