import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, SlidersHorizontal, Square, Sparkles } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, onStop }) => {
  const { isStreaming, selectedModel, assistantName } = useAppStore();
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [effort, setEffort] = useState<'Low' | 'Balanced' | 'Deep'>('Balanced');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasValue = input.trim().length > 0;

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

  useEffect(() => {
    if (isStreaming) {
      setIsExpanded(true);
    }
  }, [isStreaming]);

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
    setIsExpanded(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    if (!hasValue && !isStreaming) {
      setIsExpanded(false);
    }
  };

  const cycleEffort = () => {
    setEffort((current) =>
      current === 'Low' ? 'Balanced' : current === 'Balanced' ? 'Deep' : 'Low'
    );
  };

  return (
    <div className="w-full shrink-0 px-4 pb-5 pt-3">
      <div
        onBlur={handleBlur}
        className="mx-auto flex w-full justify-center"
        style={{
          maxWidth: isExpanded || hasValue ? 760 : 420,
          transition:
            'max-width 0.38s cubic-bezier(0.175, 0.885, 0.32, 1.12)',
        }}
      >
        <div
          className={`relative w-full overflow-hidden border bg-white shadow-sm transition-all duration-300 ${
            isExpanded || hasValue
              ? 'rounded-3xl border-zinc-200 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10'
              : 'rounded-full border-zinc-200 hover:border-zinc-300 hover:shadow-md'
          }`}
          style={{
            minHeight: isExpanded || hasValue ? 118 : 50,
            transition:
              'min-height 0.32s cubic-bezier(0.175, 0.885, 0.32, 1.12), border-radius 0.32s ease, box-shadow 0.2s ease',
          }}
          onMouseDown={(event) => {
            if (event.target !== textareaRef.current) {
              event.preventDefault();
              setIsExpanded(true);
              textareaRef.current?.focus();
            }
          }}
        >
          {!isExpanded && !hasValue && (
            <button
              type="button"
              onClick={() => {
                setIsExpanded(true);
                requestAnimationFrame(() => textareaRef.current?.focus());
              }}
              className="absolute inset-0 flex items-center justify-between px-4 text-left text-sm font-medium text-zinc-500"
            >
              <span>Message {assistantName}...</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                <Mic className="h-4 w-4" />
              </span>
            </button>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setIsExpanded(true);
            }}
            onFocus={() => setIsExpanded(true)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${assistantName}...`}
            rows={1}
            disabled={isStreaming}
            className={`w-full resize-none bg-transparent px-4 pb-12 pt-4 text-[15px] leading-relaxed text-zinc-950 placeholder-zinc-400 outline-none transition-all duration-200 ${
              isExpanded || hasValue ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          />

          <div
            className={`absolute bottom-2 left-3 right-12 flex items-center gap-2 transition-all duration-300 ${
              isExpanded || hasValue
                ? 'translate-y-0 opacity-100'
                : 'translate-y-2 opacity-0 pointer-events-none'
            }`}
          >
            <div className="relative flex min-w-0 items-center gap-1 rounded-full bg-zinc-50 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-600">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-blue-600" />
              <span className="truncate font-mono">{selectedModel}</span>
            </div>

            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={cycleEffort}
              className="hidden items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:flex"
              title="Cycle reasoning effort"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>{effort}</span>
            </button>

            <span className="ml-auto hidden items-center gap-1 text-[10px] text-zinc-400 sm:inline-flex">
              Enter to send
            </span>
          </div>

          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={isStreaming ? onStop : hasValue ? handleSubmit : () => textareaRef.current?.focus()}
            disabled={!isStreaming && !hasValue}
            className={`absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${
              isStreaming
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : hasValue
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-zinc-100 text-zinc-400'
            }`}
            title={isStreaming ? 'Stop generation' : hasValue ? 'Send message' : 'Type a message'}
          >
            <span className="relative flex h-full w-full items-center justify-center">
              <Send
                className={`absolute h-4 w-4 transition-all duration-300 ${
                  !isStreaming && hasValue ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                }`}
              />
              <Square
                className={`absolute h-4 w-4 fill-current transition-all duration-300 ${
                  isStreaming ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                }`}
              />
              <Mic
                className={`absolute h-4 w-4 transition-all duration-300 ${
                  !isStreaming && !hasValue ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                }`}
              />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

