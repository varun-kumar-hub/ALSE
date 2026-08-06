import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Sparkles } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, onStop }) => {
  const { isStreaming, selectedModel, assistantName } = useAppStore();
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as text grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || isStreaming) return;
    onSend(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 shrink-0">
      <div className="relative glass-panel rounded-2xl border border-slate-800 focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all p-3 shadow-xl">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${assistantName}... (Shift+Enter for newline)`}
          rows={1}
          disabled={isStreaming}
          className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none max-h-48 leading-relaxed pr-12"
        />

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 mt-1">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>{selectedModel}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-500 select-none">
              Press <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700">Enter ↵</kbd> to send
            </span>

            {isStreaming ? (
              <button
                onClick={onStop}
                className="p-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white shadow-md transition-all cursor-pointer"
                title="Stop generation"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!input.trim()}
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
