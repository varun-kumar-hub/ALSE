import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { User, Bot, Sparkles, BookOpen, GitCompare, Code2, Calendar } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../../services/types';
import { ResponseActions } from './ResponseActions';
import { detectQueryIntent } from '../../lib/intentDetector';
import { parseResponseSections } from '../../lib/formatters';
import { useAppStore } from '../../stores/appStore';

interface ChatMessageProps {
  message: ChatMessageType;
  onRegenerate?: () => void;
  onExport?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onRegenerate,
  onExport,
}) => {
  const { assistantName } = useAppStore();
  const isUser = message.role === 'user';

  // Intent classification for dynamic response layout
  const intent = message.intent ?? detectQueryIntent(message.content);
  const sections = !isUser ? parseResponseSections(message.content, intent) : [];

  const getIntentBadge = () => {
    switch (intent) {
      case 'research':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">
            <BookOpen className="w-3 h-3" /> Research Report
          </span>
        );
      case 'comparison':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
            <GitCompare className="w-3 h-3" /> Comparison Matrix
          </span>
        );
      case 'coding':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            <Code2 className="w-3 h-3" /> Code Solution
          </span>
        );
      case 'planning':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            <Calendar className="w-3 h-3" /> Project Roadmap
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`group w-full py-6 px-4 md:px-8 transition-colors ${
        isUser ? 'bg-transparent' : 'bg-slate-900/30 border-y border-slate-900/60'
      }`}
    >
      <div className="max-w-4xl mx-auto flex gap-4 items-start">
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
            isUser
              ? 'bg-slate-800 border border-slate-700 text-slate-300'
              : 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-400'
          }`}
        >
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>

        {/* Content Container */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">
                {isUser ? 'You' : assistantName}
              </span>
              {!isUser && getIntentBadge()}
            </div>
            {!isUser && (
              <ResponseActions
                content={message.content}
                onRegenerate={onRegenerate}
                onExport={onExport}
              />
            )}
          </div>

          {/* User Message */}
          {isUser ? (
            <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
          ) : (
            /* Assistant Message — Markdown or Adaptive Layout Cards */
            <div className="markdown-body text-sm space-y-4">
              {sections.length > 1 ? (
                <div className="space-y-4">
                  {sections.map((section, idx) => (
                    <div
                      key={idx}
                      className="glass-card rounded-2xl p-4 border border-slate-800/80 space-y-2"
                    >
                      <h4 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        {section.title}
                      </h4>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                      >
                        {section.content}
                      </ReactMarkdown>
                    </div>
                  ))}
                </div>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {message.content}
                </ReactMarkdown>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
