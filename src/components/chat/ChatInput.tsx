import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Globe,
  Paperclip,
  X,
  FileCode,
  Square,
} from 'lucide-react';
import { parseUploadedFile, formatFilePrompt, ParsedFileInfo } from '../../lib/fileParser';
import { useAppStore } from '../../stores/appStore';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, onStop }) => {
  const { isStreaming } = useAppStore();
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [attachedFile, setAttachedFile] = useState<ParsedFileInfo | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasValue = input.trim().length > 0 || attachedFile !== null;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!input.trim() && !attachedFile) return;

    let fullPrompt = input.trim();
    if (attachedFile) {
      fullPrompt = formatFilePrompt(attachedFile, fullPrompt);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsParsingFile(true);
      try {
        const parsed = await parseUploadedFile(file);
        setAttachedFile(parsed);
        setIsExpanded(true);
      } catch (err) {
        console.error('File parsing error:', err);
      } finally {
        setIsParsingFile(false);
      }
    }
  };

  return (
    <div className="p-4 md:p-6 select-none bg-transparent transition-colors">
      <div className="mx-auto max-w-3xl">
        <div
          className={`relative w-full bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all rounded-xl p-3 ${
            isExpanded || hasValue ? 'border-zinc-400 dark:border-zinc-600' : ''
          }`}
          onClick={() => textareaRef.current?.focus()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".txt,.pdf,.doc,.docx,.md,.json,.js,.ts,.tsx,.py,.java,.c,.cpp,.rs,.go,.sql,.html,.css,.csv,.log,.env,.yaml,.yml"
          />

          {attachedFile && (
            <div className="px-3 pt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100 text-xs font-mono border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                <FileCode className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                <span className="truncate max-w-[220px] font-semibold">{attachedFile.name}</span>
                <span className="text-[10px] text-zinc-500">
                  ({attachedFile.size} · {attachedFile.lineCount} lines)
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAttachedFile(null);
                  }}
                  className="p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
                  title="Remove file"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            </div>
          )}

          {isParsingFile && (
            <div className="px-3 pt-2 flex items-center gap-2 text-xs font-mono text-zinc-500 animate-pulse">
              <span>Parsing file content...</span>
            </div>
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
            placeholder={attachedFile ? `Ask any question or instruction about ${attachedFile.name}...` : "Ask LearnForge anything..."}
            rows={1}
            className="w-full resize-none bg-transparent px-3 pt-2 pb-10 text-sm leading-relaxed text-zinc-950 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none font-sans"
          />

          <div className="absolute bottom-3 left-4 right-14 flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setWebSearchEnabled(!webSearchEnabled);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                  webSearchEnabled
                    ? 'bg-zinc-100 dark:bg-zinc-850 text-zinc-950 dark:text-white border border-zinc-300 dark:border-zinc-700 font-semibold'
                    : 'bg-transparent text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-850 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-zinc-500" />
                <span>Search</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition cursor-pointer"
              >
                <Paperclip className="w-3.5 h-3.5 text-zinc-500" />
                <span>Attach</span>
              </button>
            </div>
          </div>

          {isStreaming ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStop();
              }}
              className="absolute bottom-3 right-3 flex h-7 items-center gap-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold shadow-xs transition active:scale-95 cursor-pointer"
              title="Stop generating response"
            >
              <Square className="h-3 w-3 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSubmit();
              }}
              disabled={!hasValue}
              className={`absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-lg transition cursor-pointer ${
                hasValue
                  ? 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95 shadow-2xs'
                  : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
              }`}
              title="Send message"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
