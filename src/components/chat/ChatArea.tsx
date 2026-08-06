import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ArrowDown, Bot } from 'lucide-react';
import { ChatHeader } from './ChatHeader';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { StreamingIndicator } from './StreamingIndicator';
import { AgentPlanning, PlanStep } from '../ui/AgentPlanning';
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
  const {
    isStreaming,
    streamingContent,
    generationStage,
    thinkingTimeline,
    assistantName,
  } = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const scrollFrameRef = useRef<number | null>(null);
  const scrollListenerFrameRef = useRef<number | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const thinkingSteps: PlanStep[] = thinkingTimeline.map((step) => ({
    id: step.id,
    title: step.title,
    status: step.status,
    duration: step.status === 'running' ? '...' : undefined,
    defaultExpanded: step.status === 'running',
    content: step.detail ? (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600">
        {step.detail}
      </div>
    ) : undefined,
  }));

  const isNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom <= 100;
  }, []);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
      if (scrollListenerFrameRef.current !== null) {
        cancelAnimationFrame(scrollListenerFrameRef.current);
      }
    };
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (scrollFrameRef.current !== null) return;

    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const container = scrollContainerRef.current;
      if (!container) return;

      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    });
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollListenerFrameRef.current !== null) return;

    scrollListenerFrameRef.current = requestAnimationFrame(() => {
      scrollListenerFrameRef.current = null;
      const nearBottom = isNearBottom();
      autoScrollRef.current = nearBottom;
      setShowJumpToLatest(!nearBottom && isStreaming);
    });
  }, [isNearBottom, isStreaming]);

  useEffect(() => {
    if (!isStreaming) {
      setShowJumpToLatest(false);
      return;
    }

    const shouldFollow = isNearBottom();
    autoScrollRef.current = shouldFollow;
    setShowJumpToLatest(!shouldFollow);

    if (shouldFollow) {
      scrollToBottom('auto');
    }
  }, [isStreaming, isNearBottom, scrollToBottom]);

  useEffect(() => {
    if (autoScrollRef.current) {
      scrollToBottom('auto');
    }
  }, [messages.length, streamingContent, thinkingTimeline, scrollToBottom]);

  const handleJumpToLatest = () => {
    autoScrollRef.current = true;
    setShowJumpToLatest(false);
    scrollToBottom('smooth');
  };

  return (
    <div className="flex-1 h-screen flex flex-col bg-[#f6f5f2] relative overflow-hidden">
      {/* Header */}
      <ChatHeader chatTitle={chatTitle} onExport={onExport} />

      {/* Main Messages Scroll Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {messages.length === 0 ? (
          /* Empty Chat Welcome Screen */
          <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto space-y-6 select-none animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
              <Bot className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950">
                How can {assistantName} help you today?
              </h2>
              <p className="text-sm text-zinc-500">
                Ask research questions, compare technologies, write code, or plan projects.
              </p>
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
              <div className="py-4 px-4 md:px-8 bg-transparent">
                <div className="max-w-4xl mx-auto flex flex-col gap-3">
                  {thinkingSteps.length > 0 && (
                    <AgentPlanning
                      title="Execution plan"
                      steps={thinkingSteps}
                      defaultExpanded
                      className="max-w-2xl"
                    />
                  )}
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

      {showJumpToLatest && (
        <button
          type="button"
          onClick={handleJumpToLatest}
          className="absolute bottom-24 right-6 z-20 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-lg transition-colors hover:bg-zinc-50 hover:text-zinc-950"
          title="Jump to latest message"
        >
          <ArrowDown className="h-4 w-4" />
          <span>Jump to Latest</span>
        </button>
      )}

      {/* Input Box */}
      <ChatInput onSend={onSendMessage} onStop={onStopStreaming} />
    </div>
  );
};
