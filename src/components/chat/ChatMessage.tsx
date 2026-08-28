import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import {
  User,
  Bot,
  Copy,
  Check,
  BookOpen,
  AlertCircle,
  Lightbulb,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../../services/types';
import { ResponseActions } from './ResponseActions';
import { ThinkingCard } from './ThinkingCard';
import { parseThinkingAndContent } from '../../lib/thoughtExtractor';
import { cleanEducationalContent } from '../../lib/responseFilter';

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
      <pre className="p-4 rounded-xl bg-zinc-950 text-zinc-100 border border-zinc-800 overflow-x-auto shadow-2xs leading-relaxed" {...props}>
        {children}
      </pre>
    </div>
  );
};

const CustomBlockquote: React.FC<React.HTMLAttributes<HTMLQuoteElement>> = ({ children, ...props }) => {
  const text = extractNodeText(children).trim();

  // Callout detection: > [!DEFINITION], > [!IMPORTANT], > [!TIP], > [!WARNING], > [!TAKEAWAY]
  if (text.startsWith('[!DEFINITION]')) {
    const cleanContent = text.replace('[!DEFINITION]', '').trim();
    return (
      <div className="my-3 p-4 rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/60 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100 flex items-start gap-3 text-xs shadow-2xs font-sans">
        <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <span className="font-bold uppercase tracking-wider text-[10px] text-blue-700 dark:text-blue-300 block">Definition</span>
          <div className="leading-relaxed">{cleanContent}</div>
        </div>
      </div>
    );
  }

  if (text.startsWith('[!IMPORTANT]')) {
    const cleanContent = text.replace('[!IMPORTANT]', '').trim();
    return (
      <div className="my-3 p-4 rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 flex items-start gap-3 text-xs shadow-2xs font-sans">
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <span className="font-bold uppercase tracking-wider text-[10px] text-amber-700 dark:text-amber-300 block">Important</span>
          <div className="leading-relaxed">{cleanContent}</div>
        </div>
      </div>
    );
  }

  if (text.startsWith('[!TIP]')) {
    const cleanContent = text.replace('[!TIP]', '').trim();
    return (
      <div className="my-3 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 flex items-start gap-3 text-xs shadow-2xs font-sans">
        <Lightbulb className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-700 dark:text-emerald-300 block">Exam & Learning Tip</span>
          <div className="leading-relaxed">{cleanContent}</div>
        </div>
      </div>
    );
  }

  if (text.startsWith('[!WARNING]')) {
    const cleanContent = text.replace('[!WARNING]', '').trim();
    return (
      <div className="my-3 p-4 rounded-xl border border-rose-200 dark:border-rose-800/80 bg-rose-50/60 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100 flex items-start gap-3 text-xs shadow-2xs font-sans">
        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <span className="font-bold uppercase tracking-wider text-[10px] text-rose-700 dark:text-rose-300 block">Common Pitfall / Warning</span>
          <div className="leading-relaxed">{cleanContent}</div>
        </div>
      </div>
    );
  }

  if (text.startsWith('[!TAKEAWAY]') || text.startsWith('[!NOTE]')) {
    const cleanContent = text.replace(/\[!(TAKEAWAY|NOTE)\]/, '').trim();
    return (
      <div className="my-3 p-4 rounded-xl border border-purple-200 dark:border-purple-800/80 bg-purple-50/60 dark:bg-purple-950/30 text-purple-950 dark:text-purple-100 flex items-start gap-3 text-xs shadow-2xs font-sans">
        <Award className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <span className="font-bold uppercase tracking-wider text-[10px] text-purple-700 dark:text-purple-300 block">Key Takeaways</span>
          <div className="leading-relaxed">{cleanContent}</div>
        </div>
      </div>
    );
  }

  return (
    <blockquote className="border-l-4 border-blue-500/60 pl-4 py-1 my-3 text-xs text-zinc-600 dark:text-zinc-400 italic bg-zinc-50/50 dark:bg-zinc-900/30 rounded-r-lg" {...props}>
      {children}
    </blockquote>
  );
};

const CustomTable: React.FC<React.HTMLAttributes<HTMLTableElement>> = ({ children, ...props }) => (
  <div className="my-4 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#101318] shadow-2xs">
    <table className="w-full text-left text-xs border-collapse" {...props}>
      {children}
    </table>
  </div>
);

const CustomThead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, ...props }) => (
  <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-950 dark:text-white font-bold border-b border-zinc-200 dark:border-zinc-800 uppercase text-[11px] tracking-wider" {...props}>
    {children}
  </thead>
);

const CustomTh: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ children, ...props }) => (
  <th className="px-4 py-3 border-r border-zinc-200 dark:border-zinc-800/60 last:border-r-0" {...props}>
    {children}
  </th>
);

const CustomTd: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ children, ...props }) => (
  <td className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800/60 border-r border-zinc-200 dark:border-zinc-800/60 last:border-r-0 text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans" {...props}>
    {children}
  </td>
);

const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  const cleaned = React.useMemo(() => cleanEducationalContent(content), [content]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        pre: CodeBlock,
        blockquote: CustomBlockquote,
        table: CustomTable,
        thead: CustomThead,
        th: CustomTh,
        td: CustomTd,
        h1: ({ children }) => <h1 className="text-xl font-extrabold text-zinc-950 dark:text-white mt-4 mb-2 pb-1 border-b border-zinc-200 dark:border-zinc-800">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-bold text-zinc-900 dark:text-white mt-4 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-3 mb-1.5">{children}</h3>,
        p: ({ children }) => <p className="mb-3 leading-relaxed text-zinc-800 dark:text-zinc-200">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-zinc-800 dark:text-zinc-200">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-zinc-800 dark:text-zinc-200">{children}</ol>,
        strong: ({ children }) => <strong className="font-bold text-zinc-950 dark:text-white">{children}</strong>,
      }}
    >
      {cleaned}
    </ReactMarkdown>
  );
};

export const ChatMessageComponent: React.FC<ChatMessageProps> = ({
  message,
  onRegenerate,
  onExport,
  isStreaming = false,
}) => {
  const [copiedQuery, setCopiedQuery] = React.useState(false);
  const isUser = message.role === 'user';

  const parsed = React.useMemo(() => {
    if (isUser) return { thinking: '', content: message.content, isThinkingActive: false, activities: [] };
    return parseThinkingAndContent(message.content);
  }, [message.content, isUser]);

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
                content={parsed.content || message.content}
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
              {(parsed.thinking || isStreaming || (parsed.activities && parsed.activities.length > 0)) ? (
                <ThinkingCard
                  isStreaming={isStreaming && parsed.isThinkingActive}
                  thinking={parsed.thinking}
                  activities={parsed.activities}
                />
              ) : null}
              {parsed.content ? <MarkdownContent content={parsed.content} /> : null}
              {isStreaming && parsed.isThinkingActive && !parsed.content && (
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 py-1 font-mono">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>Reasoning through concepts...</span>
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
