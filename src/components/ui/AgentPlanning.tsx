import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Loader2,
  BrainCircuit,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type PlanStepStatus = 'pending' | 'active' | 'success' | 'error' | 'warning';
export type TimelineStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export interface PlanStep {
  id: string;
  title: string;
  content?: React.ReactNode;
  status: PlanStepStatus | TimelineStepStatus;
  icon?: React.ReactNode;
  duration?: string;
  defaultExpanded?: boolean;
}

export interface AgentPlanningProps {
  title?: string;
  steps: PlanStep[];
  defaultExpanded?: boolean;
  className?: string;
}

export const AgentPlanning: React.FC<AgentPlanningProps> = ({
  title = 'Preparing environment',
  steps,
  defaultExpanded = true,
  className,
}) => {
  const [isMainExpanded, setIsMainExpanded] = useState(defaultExpanded);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>(() =>
    steps.reduce((acc, step) => {
      acc[step.id] = Boolean(step.defaultExpanded);
      return acc;
    }, {} as Record<string, boolean>)
  );

  const hasActive = steps.some((step) => step.status === 'active' || step.status === 'running');
  const allSuccess =
    steps.length > 0 &&
    steps.every((step) => step.status === 'success' || step.status === 'completed');

  const normalizedExpandedSteps = useMemo(() => {
    const next = { ...expandedSteps };
    for (const step of steps) {
      if (step.defaultExpanded && next[step.id] === undefined) {
        next[step.id] = true;
      }
    }
    return next;
  }, [expandedSteps, steps]);

  const toggleStep = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setExpandedSteps((current) => ({ ...current, [id]: !current[id] }));
  };

  const getStatusColor = (status: PlanStep['status']) => {
    switch (status) {
      case 'completed':
      case 'success':
        return 'bg-emerald-100 text-emerald-700 ring-emerald-500/20';
      case 'running':
      case 'active':
        return 'bg-blue-100 text-blue-700 ring-blue-500/30';
      case 'failed':
      case 'error':
        return 'bg-rose-100 text-rose-700 ring-rose-500/20';
      case 'skipped':
      case 'warning':
        return 'bg-amber-100 text-amber-700 ring-amber-500/20';
      case 'pending':
      default:
        return 'bg-zinc-100 text-zinc-400 ring-zinc-200';
    }
  };

  const renderStatusIcon = (step: PlanStep) => {
    if (step.status === 'success' || step.status === 'completed') {
      return <Check className="w-3.5 h-3.5" />;
    }
    if (step.status === 'active' || step.status === 'running') {
      return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
    }
    if (
      step.status === 'error' ||
      step.status === 'warning' ||
      step.status === 'failed' ||
      step.status === 'skipped'
    ) {
      return <AlertTriangle className="w-3.5 h-3.5" />;
    }
    return step.icon || <Circle className="w-2 h-2 fill-current" />;
  };

  return (
    <div className={cn('w-full font-sans text-zinc-950', className)}>
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setIsMainExpanded((value) => !value)}
          className={cn(
            'flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors',
            isMainExpanded ? 'border-b border-zinc-200 bg-zinc-50' : 'hover:bg-zinc-50'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-5 w-5 items-center justify-center">
              {hasActive ? (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              ) : allSuccess ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <BrainCircuit className="w-4 h-4 text-zinc-500" />
              )}
            </div>
            <span className="text-sm font-semibold text-zinc-950">{title}</span>
          </div>

          <div className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700">
            {isMainExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </div>
        </button>

        <div
          className={cn(
            'grid bg-white transition-all duration-300',
            isMainExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          )}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col p-5">
              {steps.map((step, index) => {
                const isStepExpanded = Boolean(normalizedExpandedSteps[step.id]);
                const isLast = index === steps.length - 1;

                return (
                  <div
                    key={step.id}
                    className={cn(
                      'relative flex gap-4',
                      step.status === 'pending' || step.status === 'skipped'
                        ? 'opacity-55'
                        : 'opacity-100'
                    )}
                  >
                    {!isLast && (
                      <div className="absolute left-[11px] top-7 bottom-[-10px] z-0 w-px bg-zinc-200" />
                    )}

                    <div className="relative z-10 mt-0.5 h-6 w-6 flex-none">
                      <div
                        className={cn(
                          'flex h-full w-full items-center justify-center rounded-full ring-4 ring-white transition-colors',
                          getStatusColor(step.status)
                        )}
                      >
                        {renderStatusIcon(step)}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 pb-5">
                      <button
                        type="button"
                        className={cn(
                          'group -mx-2 flex w-full items-center justify-between rounded-md px-2 py-1 text-left transition-colors',
                          Boolean(step.content) && 'cursor-pointer hover:bg-zinc-50'
                        )}
                        onClick={(event) => step.content && toggleStep(step.id, event)}
                      >
                        <span
                          className={cn(
                            'text-sm font-medium tracking-tight',
                            (step.status === 'active' || step.status === 'running') &&
                              'font-semibold text-zinc-950',
                            (step.status === 'error' || step.status === 'failed') &&
                              'font-semibold text-rose-700',
                            (step.status === 'warning' || step.status === 'skipped') &&
                              'font-semibold text-amber-700',
                            (step.status === 'success' || step.status === 'completed') &&
                              'text-zinc-800',
                            step.status === 'pending' && 'text-zinc-500'
                          )}
                        >
                          {step.title}
                        </span>

                        <div className="flex items-center gap-3">
                          {step.duration && (
                            <span className="font-mono text-[11px] tabular-nums text-zinc-500">
                              {step.duration}
                            </span>
                          )}
                          {step.content && (
                            <span className="text-zinc-400 transition-colors group-hover:text-zinc-700">
                              {isStepExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </span>
                          )}
                        </div>
                      </button>

                      {step.content && (
                        <div
                          className={cn(
                            'grid transition-all duration-300',
                            isStepExpanded
                              ? 'mt-2 grid-rows-[1fr] opacity-100'
                              : 'mt-0 grid-rows-[0fr] opacity-0'
                          )}
                        >
                          <div className="overflow-hidden">
                            <div className="pb-2 pt-1">{step.content}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

