import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { User, Bot, BookOpen, GitCompare, Code2, Calendar, Copy, Check } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../../services/types';
import { ResponseActions } from './ResponseActions';
import { RuntimeMetadataCard } from './RuntimeMetadataCard';
import { ThinkingCard } from './ThinkingCard';
import { parseThinkingAndContent } from '../../lib/thoughtExtractor';
import { buildExecutionRuntimeMetadata } from '../../lib/runtimeMetadata';
import { detectQueryIntent } from '../../lib/intentDetector';
import { useAppStore } from '../../stores/appStore';

interface ChatMessageProps {
  message: ChatMessageType;
  onRegenerate?: () => void;
  onExport?: () => void;
  isStreaming?: boolean;
}

function extractNodeText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractNodeText).join('');
  if (React.isValidElement(node)) {
    return extractNodeText((node.props as { children?: React.ReactNode }).children);
  }
  return '';
}

const CodeBlock: React.FC<React.HTMLAttributes<HTMLPreElement>> = ({ children, ...props }) => {
  const [copied, setCopied] = React.useState(false);
  const code = extractNodeText(children);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="group/code relative select-text">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-2 top-2 z-10 rounded-md border border-zinc-700 bg-zinc-950/90 px-2 py-1 text-[11px] font-semibold text-zinc-200 opacity-0 shadow-sm transition-opacity hover:bg-zinc-900 group-hover/code:opacity-100"
        title="Copy code block"
      >
        {copied ? 'Copied' : 'Copy Code'}
      </button>
      <pre {...props}>{children}</pre>
    </div>
  );
};

const MarkdownContent: React.FC<{ content: string }> = ({ content }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeHighlight]}
    components={{ pre: CodeBlock }}
  >
    {content}
  </ReactMarkdown>
);

export const ChatMessageComponent: React.FC<ChatMessageProps> = ({
  message,
  onRegenerate,
  onExport,
  isStreaming = false,
}) => {
  const { assistantName, selectedModel, aiMode } = useAppStore();
  const [copiedQuery, setCopiedQuery] = React.useState(false);
  const isUser = message.role === 'user';

  const handleCopyQuery = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 1600);
  };

  // Intent classification for dynamic response layout
  const intent = message.intent ?? detectQueryIntent(message.user_prompt || message.content);

  // Extract thinking / reasoning blocks with context-specific dynamic activity sentences
  const sourceTitles: string[] = (message.sources_used || []).map((s) => (typeof s === 'string' ? s : s.title));
  const parsed = parseThinkingAndContent(
    message.content,
    message.user_prompt,
    intent,
    sourceTitles
  );
  const displayContent = parsed.content || (parsed.thinking ? '' : message.content);

  const getIntentBadge = () => {
    switch (intent) {
      case 'research':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
            <BookOpen className="w-3 h-3" /> Research Report
          </span>
        );
      case 'comparison':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100">
            <GitCompare className="w-3 h-3" /> Comparison Matrix
          </span>
        );
      case 'coding':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
            <Code2 className="w-3 h-3" /> Code Solution
          </span>
        );
      case 'planning':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
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
        isUser ? 'bg-transparent' : 'bg-white/55 border-y border-zinc-200/80'
      }`}
    >
      <div className="max-w-4xl mx-auto flex gap-4 items-start">
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm select-none ${
            isUser
              ? 'bg-zinc-100 border border-zinc-200 text-zinc-600'
              : 'bg-blue-50 border border-blue-100 text-blue-600'
          }`}
        >
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>

        {/* Content Container */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header info */}
          <div className="flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-900">
                {isUser ? 'You' : assistantName}
              </span>
              {!isUser && getIntentBadge()}
            </div>
            {isUser ? (
              <button
                type="button"
                onClick={handleCopyQuery}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-2 py-0.5 rounded-lg cursor-pointer"
                title="Copy query text"
              >
                {copiedQuery ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-zinc-500" />}
                <span>{copiedQuery ? 'Copied' : 'Copy'}</span>
              </button>
            ) : (
              <ResponseActions
                content={displayContent || message.content}
                onRegenerate={onRegenerate}
                onExport={onExport}
              />
            )}
          </div>

          {/* User Message */}
          {isUser ? (
            <p className="text-[15px] text-zinc-800 whitespace-pre-wrap leading-relaxed select-text">
              {message.content}
            </p>
          ) : (
            /* Assistant Message — Agent Activity Timeline + Clean Markdown */
            <div className="space-y-3 select-text">
              <ThinkingCard
                isStreaming={isStreaming}
                userPrompt={message.user_prompt}
                intent={intent}
                sourcesCount={message.sources_used?.length || 0}
                toolsCount={message.tools_used?.length || 0}
                generationTimeMs={message.generation_time_ms || 1800}
                provider={message.provider_used || (aiMode === 'local' ? 'ollama' : 'cloud')}
                model={message.model_name || message.model_used || selectedModel}
                activities={parsed.activities}
                thinking={parsed.thinking}
              />

              {displayContent ? (
                <div className="markdown-body text-[15px] space-y-4 select-text">
                  <MarkdownContent content={displayContent} />
                </div>
              ) : isStreaming ? (
                <div className="flex items-center gap-2 text-xs text-zinc-500 py-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  <span>Formulating response...</span>
                </div>
              ) : null}

              {/* Real Execution Path Runtime Metadata Card */}
              {!isStreaming && (
                <RuntimeMetadataCard
                  metadata={buildExecutionRuntimeMetadata(
                    message.model_name || message.model_used || selectedModel || 'gpt-5.6-sol',
                    message.provider_used || (aiMode === 'local' ? 'ollama' : 'opencode'),
                    message.mode_used || aiMode,
                    intent,
                    message.user_prompt || '',
                    displayContent || message.content,
                    Date.now() - (message.generation_time_ms || 2100),
                    message.sources_used || [],
                    message.tools_used || []
                  )}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ChatMessage = React.memo(ChatMessageComponent, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.role === next.message.role &&
    prev.message.content === next.message.content &&
    prev.message.intent === next.message.intent &&
    prev.onRegenerate === next.onRegenerate &&
    prev.onExport === next.onExport
  );
});

