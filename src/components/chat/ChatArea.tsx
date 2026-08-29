import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ArrowDown,
  Sparkles,
  BookOpen,
  Code2,
  GitBranch,
  Brain,
  Zap,
} from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatMessage as ChatMessageType } from '../../services/types';
import { useAppStore } from '../../stores/appStore';

interface ChatAreaProps {
  chatTitle?: string;
  projectName?: string | null;
  messages: ChatMessageType[];
  onSendMessage: (prompt: string) => void;
  onStopStreaming: () => void;
  onRegenerate: () => void;
  onExport: () => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  chatTitle: _chatTitle,
  projectName,
  messages,
  onSendMessage,
  onStopStreaming,
  onRegenerate,
  onExport,
  onEditMessage,
}) => {
  const {
    isStreaming,
    streamingContent,
  } = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const scrollFrameRef = useRef<number | null>(null);
  const scrollListenerFrameRef = useRef<number | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

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
  }, [messages, streamingContent, scrollToBottom]);

  const handleJumpToLatest = () => {
    autoScrollRef.current = true;
    setShowJumpToLatest(false);
    scrollToBottom('smooth');
  };

  const subjectStarters = projectName
    ? [
        {
          icon: <BookOpen className="w-4 h-4 text-blue-500" />,
          title: `Explain ${projectName}`,
          prompt: `Please provide a comprehensive, authoritative explanation of ${projectName} with definitions, core principles, and key equations.`,
        },
        {
          icon: <Code2 className="w-4 h-4 text-emerald-500" />,
          title: 'Code Implementation',
          prompt: `Write a clean, step-by-step Python/C++ code implementation with comments demonstrating ${projectName}.`,
        },
        {
          icon: <GitBranch className="w-4 h-4 text-purple-500" />,
          title: 'Architecture & Diagrams',
          prompt: `Create an interactive Mermaid diagram illustrating the workflow and architecture of ${projectName}, and explain key trade-offs.`,
        },
        {
          icon: <Brain className="w-4 h-4 text-amber-500" />,
          title: 'Diagnostic Mastery Q&A',
          prompt: `Test my knowledge on ${projectName} with 3 progressive diagnostic questions with real-world scenarios.`,
        },
      ]
    : [
        {
          icon: <BookOpen className="w-4 h-4 text-blue-500" />,
          title: 'Deep Learning & Neural Networks',
          prompt: 'Explain backpropagation and gradient descent in deep neural networks with full mathematical derivations and diagrams.',
        },
        {
          icon: <Code2 className="w-4 h-4 text-emerald-500" />,
          title: 'Distributed Systems & Algorithms',
          prompt: 'Explain the Raft consensus algorithm with state machine diagrams and a complete Python implementation.',
        },
        {
          icon: <GitBranch className="w-4 h-4 text-purple-500" />,
          title: 'Computer Networks & TCP/IP',
          prompt: 'Explain TCP 3-Way Handshake, flow control, and congestion control with sequence diagrams.',
        },
        {
          icon: <Zap className="w-4 h-4 text-amber-500" />,
          title: 'Operating Systems & Concurrency',
          prompt: 'Explain Virtual Memory, Page Tables, and TLB caching with memory layout diagrams.',
        },
      ];

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-zinc-950 text-zinc-950 dark:text-white relative overflow-hidden transition-colors">
      {/* Main Messages Scroll Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto px-4 py-10 md:py-16 space-y-8 animate-in fade-in duration-200 select-none">
            {/* Header Greeting */}
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-2">
                {projectName ? <BookOpen className="w-7 h-7" /> : <Sparkles className="w-7 h-7" />}
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
                {projectName ? `Master ${projectName}` : 'What would you like to explore today?'}
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 font-sans max-w-md mx-auto leading-relaxed">
                {projectName
                  ? `Ask any conceptual question, generate architectural diagrams, or request code implementations for ${projectName}.`
                  : 'High-performance AI tutor with real-time concept extraction, LaTeX formulas, diagrams, and working code.'}
              </p>
            </div>

            {/* Quick Starter Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subjectStarters.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSendMessage(item.prompt)}
                  className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500/80 hover:shadow-xs transition text-left space-y-1.5 cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed font-sans">
                    {item.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Render Messages */
          <div className="py-4 space-y-4">
            {messages.map((msg, idx) => (
              <ChatMessage
                key={msg.id || idx}
                message={msg}
                onRegenerate={idx === messages.length - 1 ? onRegenerate : undefined}
                onExport={onExport}
                onEditMessage={onEditMessage}
              />
            ))}

            {/* In-flight streaming message */}
            {isStreaming && (
              <ChatMessage
                isStreaming={true}
                message={{
                  role: 'assistant',
                  content: streamingContent,
                  user_prompt: [...messages].reverse().find((m) => m.role === 'user')?.content,
                }}
              />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {showJumpToLatest && (
        <button
          type="button"
          onClick={handleJumpToLatest}
          className="absolute bottom-24 right-6 z-20 inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 shadow-lg transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
