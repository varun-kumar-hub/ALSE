import { ReactNode, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot,
  ChevronDown,
  Code2,
  Database,
  FileText,
  Globe,
  Mail,
  Search,
  Settings,
  TerminalSquare,
  Wrench,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ToolCallEntry {
  tool_name: string;
  tool_category: string;
  message?: string;
  show_category?: boolean;
  tool_call_id?: string;
  inputs?: Record<string, unknown>;
  output?: string;
  icon_url?: string;
  integration_name?: string;
}

export interface IntegrationInfo {
  iconUrl?: string;
  name?: string;
}

export interface ToolCallsSectionProps {
  toolCalls: ToolCallEntry[];
  integrations?: Map<string, IntegrationInfo>;
  maxIconsToShow?: number;
  defaultExpanded?: boolean;
  className?: string;
  iconSize?: number;
  renderIcon?: (call: ToolCallEntry, size: number) => ReactNode;
  renderContent?: (content: unknown) => ReactNode;
}

function formatToolName(name: string) {
  return name
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function categoryLabel(category: string) {
  return formatToolName(category || 'general');
}

function CompactMarkdown({ content }: { content: unknown }) {
  const rendered =
    typeof content === 'string' ? content : `\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\``;

  return (
    <div className="markdown-body text-[11px] leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{rendered}</ReactMarkdown>
    </div>
  );
}

function categoryIcon(call: ToolCallEntry, size: number) {
  if (call.icon_url) {
    return (
      <img
        src={call.icon_url}
        alt=""
        className="rounded-lg object-cover"
        style={{ width: size + 10, height: size + 10 }}
      />
    );
  }

  const iconClass = 'text-current';
  const iconSize = Math.max(14, size - 3);
  const category = call.tool_category.toLowerCase();
  const Icon =
    category.includes('mail') || category.includes('gmail')
      ? Mail
      : category.includes('search')
        ? Search
        : category.includes('code') || category.includes('executor')
          ? Code2
          : category.includes('database') || category.includes('memory')
            ? Database
            : category.includes('web') || category.includes('browser')
              ? Globe
              : category.includes('file') || category.includes('document')
                ? FileText
                : category.includes('terminal')
                  ? TerminalSquare
                  : category.includes('agent') || category.includes('handoff')
                    ? Bot
                    : category.includes('setting')
                      ? Settings
                      : Wrench;

  return <Icon className={iconClass} size={iconSize} />;
}

export function ToolCallsSection({
  toolCalls,
  integrations,
  maxIconsToShow = 10,
  defaultExpanded = false,
  className,
  iconSize = 21,
  renderIcon,
  renderContent,
}: ToolCallsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [expandedCalls, setExpandedCalls] = useState<Set<number>>(new Set());

  const integrationLookup = useMemo(
    () => integrations ?? new Map<string, IntegrationInfo>(),
    [integrations]
  );

  const getIconUrl = (call: ToolCallEntry) =>
    call.icon_url ?? integrationLookup.get(call.tool_category)?.iconUrl;

  const getIntegrationName = (call: ToolCallEntry) =>
    call.integration_name ?? integrationLookup.get(call.tool_category)?.name;

  const defaultRenderIcon = (call: ToolCallEntry, size: number) => (
    <div className="flex h-8 w-8 min-w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700">
      {getIconUrl(call) ? (
        <img src={getIconUrl(call)} alt="" className="h-full w-full rounded-lg object-cover" />
      ) : (
        categoryIcon(call, size)
      )}
    </div>
  );

  const iconRenderer = renderIcon || defaultRenderIcon;
  const contentRenderer = renderContent || ((content: unknown) => <CompactMarkdown content={content} />);

  const toggleCallExpansion = (index: number) => {
    setExpandedCalls((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const renderStackedIcons = () => {
    const seenCategories = new Set<string>();
    const uniqueIcons = toolCalls.filter((call) => {
      const category = call.tool_category || 'general';
      if (seenCategories.has(category)) return false;
      seenCategories.add(category);
      return true;
    });
    const displayIcons = uniqueIcons.slice(0, maxIconsToShow);

    return (
      <div className="flex min-h-8 items-center -space-x-2">
        {displayIcons.map((call, index) => (
          <div
            key={`${call.tool_name}-${index}`}
            className="relative flex min-w-8 items-center justify-center"
            style={{
              rotate: displayIcons.length > 1 ? (index % 2 === 0 ? '8deg' : '-8deg') : '0deg',
              zIndex: index,
            }}
          >
            {iconRenderer(call, iconSize)}
          </div>
        ))}
        {uniqueIcons.length > maxIconsToShow && (
          <div className="z-0 flex h-7 min-h-7 w-7 min-w-7 items-center justify-center rounded-lg bg-zinc-100 text-xs font-normal text-zinc-500">
            +{uniqueIcons.length - maxIconsToShow}
          </div>
        )}
      </div>
    );
  };

  if (toolCalls.length === 0) return null;

  return (
    <div className={cn('w-fit max-w-[35rem]', className)}>
      <button
        type="button"
        onClick={() => setIsExpanded((value) => !value)}
        className="flex cursor-pointer items-center gap-2 py-2 text-zinc-500 hover:text-zinc-950"
      >
        {renderStackedIcons()}
        <span className="text-xs font-medium transition-all duration-200">
          Used {toolCalls.length} tool{toolCalls.length > 1 ? 's' : ''}
        </span>
        <ChevronDown
          className={cn('w-4 h-4 transition-transform duration-200', isExpanded && 'rotate-180')}
        />
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="space-y-0 pt-1">
          {toolCalls.map((call, index) => {
            const hasCategoryText =
              call.show_category !== false && call.tool_category && call.tool_category !== 'unknown';
            const hasDetails = Boolean(call.inputs || call.output);
            const isCallExpanded = expandedCalls.has(index);

            return (
              <div key={call.tool_call_id || `${call.tool_name}-step-${index}`} className="flex items-stretch gap-2">
                <div className="flex flex-col items-center self-stretch">
                  <div className="flex min-h-8 min-w-8 shrink-0 items-center justify-center">
                    {iconRenderer(call, iconSize)}
                  </div>
                  {index < toolCalls.length - 1 && <div className="min-h-4 w-px flex-1 bg-zinc-200" />}
                </div>

                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className={cn(
                      'group flex items-center gap-1 text-left',
                      hasDetails && 'cursor-pointer',
                      !hasCategoryText && 'pt-2'
                    )}
                    onClick={() => hasDetails && toggleCallExpansion(index)}
                  >
                    <p
                      className={cn(
                        'text-xs font-medium text-zinc-600',
                        hasDetails && 'group-hover:text-zinc-950'
                      )}
                    >
                      {call.message || formatToolName(call.tool_name)}
                    </p>
                    {hasDetails && (
                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 text-zinc-500 transition-transform',
                          isCallExpanded && 'rotate-180'
                        )}
                      />
                    )}
                  </button>

                  {hasCategoryText && (
                    <p className="text-[11px] capitalize text-zinc-500">
                      {getIntegrationName(call) || categoryLabel(call.tool_category)}
                    </p>
                  )}

                  {isCallExpanded && hasDetails && (
                    <div className="mb-3 mt-2 w-fit space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-[11px]">
                      {call.inputs && Object.keys(call.inputs).length > 0 && (
                        <div className="flex flex-col">
                          <span className="mb-1 font-medium text-zinc-500">Input</span>
                          {contentRenderer(call.inputs)}
                        </div>
                      )}
                      {call.output && (
                        <div className="flex flex-col">
                          <span className="mb-1 font-medium text-zinc-500">Output</span>
                          {contentRenderer(call.output)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

