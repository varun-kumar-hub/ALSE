import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Send,
  SlidersHorizontal,
  Square,
  Sparkles,
  Globe,
  Paperclip,
  X,
  FileText,
} from 'lucide-react';
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
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasValue = input.trim().length > 0 || attachedFile !== null;

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
    if ((!input.trim() && !attachedFile) || isStreaming) return;

    let fullPrompt = input.trim();
    if (attachedFile) {
      fullPrompt = `[Attached File: ${attachedFile.name}]\n\n${fullPrompt}`;
    }
    if (!webSearchEnabled) {
      fullPrompt = `${fullPrompt} --no-web-search`;
    }

    onSend(fullPrompt);
    setInput('');
    setAttachedFile(null);
    setIsExpanded(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setAttachedFile({
        name: file.name,
        size: `${sizeMb} MB`,
      });
      setIsExpanded(true);
    }
  };

  const cycleEffort = () => {
    setEffort((current) =>
      current === 'Low' ? 'Balanced' : current === 'Balanced' ? 'Deep' : 'Low'
    );
  };

  return (
    <div className="w-full shrink-0 px-4 pb-5 pt-2 select-none">
      <div className="mx-auto max-w-3xl transition-all duration-300">
        {/* Sleek Minimalist Card Container */}
        <div
          className={`relative w-full overflow-hidden bg-white/95 border transition-all duration-300 shadow-sm ${
            isExpanded || hasValue
              ? 'rounded-3xl border-zinc-200/90 shadow-md focus-within:border-zinc-400 focus-within:shadow-xl'
              : 'rounded-full border-zinc-200 hover:border-zinc-300 hover:shadow-md'
          }`}
          style={{
            minHeight: isExpanded || hasValue ? 120 : 50,
            transition: 'min-height 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.3s ease, box-shadow 0.2s ease',
          }}
          onClick={() => {
            if (!isExpanded) {
              setIsExpanded(true);
              textareaRef.current?.focus();
            }
          }}
        >
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".txt,.pdf,.doc,.docx,.md,.json,.js,.ts,.py"
          />

          {/* Attached File Chip (if any) */}
          {attachedFile && (
            <div className="px-4 pt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-medium border border-zinc-200/80">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span className="truncate max-w-[200px]">{attachedFile.name}</span>
                <span className="text-[10px] text-zinc-400 font-mono">({attachedFile.size})</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAttachedFile(null);
                  }}
                  className="p-0.5 hover:bg-zinc-200 rounded-full text-zinc-500 hover:text-zinc-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            </div>
          )}

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setIsExpanded(true);
            }}
            onFocus={() => setIsExpanded(true)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${assistantName} anything...`}
            rows={1}
            disabled={isStreaming}
            className="w-full resize-none bg-transparent px-4 pt-3.5 pb-12 text-[15px] leading-relaxed text-zinc-950 placeholder-zinc-400 outline-none transition-all duration-200"
          />

          {/* Advanced Action Toolbar (Bottom) */}
          <div className="absolute bottom-2.5 left-3 right-12 flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Web Search Toggle */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setWebSearchEnabled(!webSearchEnabled);
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  webSearchEnabled
                    ? 'bg-sky-50 text-sky-700 border border-sky-200/80 shadow-2xs'
                    : 'bg-zinc-100/70 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
                }`}
                title={webSearchEnabled ? 'Live Web Search: Active' : 'Live Web Search: Disabled'}
              >
                <Globe className={`w-3.5 h-3.5 ${webSearchEnabled ? 'text-sky-600' : 'text-zinc-400'}`} />
                <span>Search</span>
              </button>

              {/* Attach File Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100/70 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                title="Attach document or file"
              >
                <Paperclip className="w-3.5 h-3.5 text-zinc-500" />
                <span className="hidden sm:inline">Attach</span>
              </button>

              {/* Reasoning Effort Selector */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cycleEffort();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100/70 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                title="Reasoning effort"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
                <span>{effort}</span>
              </button>

              {/* Model Badge */}
              <div className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-50 border border-zinc-200/60 text-xs font-mono text-zinc-600">
                <Sparkles className="w-3 h-3 text-purple-600" />
                <span className="truncate max-w-[120px]">{selectedModel}</span>
              </div>
            </div>

            {/* Keyboard Hint */}
            <span className="hidden lg:inline text-[10px] text-zinc-400 font-mono">
              Shift + Enter for line break
            </span>
          </div>

          {/* Send / Stop Action Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isStreaming) {
                onStop();
              } else if (hasValue) {
                handleSubmit();
              }
            }}
            disabled={!isStreaming && !hasValue}
            className={`absolute bottom-2.5 right-3 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
              isStreaming
                ? 'bg-rose-600 text-white hover:bg-rose-700 active:scale-95 shadow-sm'
                : hasValue
                ? 'bg-zinc-900 text-white hover:bg-black active:scale-95 shadow-sm'
                : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
            }`}
            title={isStreaming ? 'Stop generation' : hasValue ? 'Send prompt' : 'Voice dictation'}
          >
            {isStreaming ? (
              <Square className="h-3.5 w-3.5 fill-current" />
            ) : hasValue ? (
              <Send className="h-3.5 w-3.5" />
            ) : (
              <Mic className="h-3.5 w-3.5 text-zinc-400" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
