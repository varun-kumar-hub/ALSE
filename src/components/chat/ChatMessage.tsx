import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { User, Bot, Copy, Check } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../../services/types';
import { ResponseActions } from './ResponseActions';

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
    <div className="group/code relative select-text my-3 font-mono text-xs">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-2 top-2 z-10 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 opacity-0 transition-opacity hover:bg-zinc-200 dark:hover:bg-zinc-800 group-hover/code:opacity-100 cursor-pointer"
        title="Copy code block"
      >
        {copied ? 'Copied' : 'Copy Code'}
      </button>
      <pre className="p-4 rounded-xl bg-zinc-950 text-zinc-100 border border-zinc-800 overflow-x-auto shadow-2xs" {...props}>
        {children}
      </pre>
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
  const [copiedQuery, setCopiedQuery] = React.useState(false);
  const isUser = message.role === 'user';

  const handleCopyQuery = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 1600);
  };

  return (
    <div
      className={`group w-full py-4 px-4 md:px-8 flex ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`max-w-[92%] sm:max-w-[82%] flex gap-3 items-start p-4 rounded-2xl transition-all ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs font-sans'
            : 'bg-white dark:bg-[#151922] text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800/80 rounded-tl-xs shadow-2xs font-sans'
        }`}
      >
        {/* Avatar */}
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border select-none ${
            isUser
              ? 'bg-blue-500 border-blue-400 text-white'
              : 'bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-white border-blue-100 dark:border-zinc-700 font-bold'
          }`}
        >
          {isUser ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5" />}
        </div>

        {/* Content Container */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Header info */}
          <div className="flex items-center justify-between select-none pb-0.5">
            <span
              className={`text-xs font-bold ${
                isUser ? 'text-blue-50' : 'text-zinc-950 dark:text-white'
              }`}
            >
              {isUser ? 'You' : 'LearnForge Agent'}
            </span>
            {isUser ? (
              <button
                type="button"
                onClick={handleCopyQuery}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-mono text-blue-100 hover:text-white bg-blue-700/60 px-2 py-0.5 rounded-lg cursor-pointer"
                title="Copy query text"
              >
                {copiedQuery ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3 text-blue-200" />}
                <span>{copiedQuery ? 'Copied' : 'Copy'}</span>
              </button>
            ) : (
              <ResponseActions
                content={message.content}
                onRegenerate={onRegenerate}
                onExport={onExport}
              />
            )}
          </div>

          {/* User Message */}
          {isUser ? (
            <p className="text-[14px] text-white whitespace-pre-wrap leading-relaxed select-text font-sans font-medium">
              {message.content}
            </p>
          ) : (
            /* Assistant Message */
            <div className="space-y-3 select-text text-[14px] text-zinc-900 dark:text-zinc-100 leading-relaxed font-sans">
              <MarkdownContent content={message.content} />
              {isStreaming && (
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 py-1 font-mono">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>Generating adaptive response...</span>
                </div>
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
    prev.isStreaming === next.isStreaming &&
    prev.onRegenerate === next.onRegenerate &&
    prev.onExport === next.onExport
  );
});
