import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type PlanStepStatus = 'pending' | 'active' | 'success' | 'error' | 'warning';

export interface PlanStep {
  id: string;
  title: string;
  content?: React.ReactNode;
  status: PlanStepStatus;
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

  const hasActive = steps.some((step) => step.status === 'active');
  const allSuccess = steps.length > 0 && steps.every((step) => step.status === 'success');

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

  const getStatusColor = (status: PlanStepStatus) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/20';
      case 'active':
        return 'bg-cyan-500/15 text-cyan-300 ring-cyan-400/30';
      case 'error':
        return 'bg-rose-500/15 text-rose-300 ring-rose-400/20';
      case 'warning':
        return 'bg-amber-500/15 text-amber-300 ring-amber-400/20';
      case 'pending':
      default:
        return 'bg-slate-800 text-slate-500 ring-slate-700';
    }
  };

  const renderStatusIcon = (step: PlanStep) => {
    if (step.status === 'success') return <Check className="w-3.5 h-3.5" />;
    if (step.status === 'active') return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
    if (step.status === 'error' || step.status === 'warning') {
      return <AlertTriangle className="w-3.5 h-3.5" />;
    }
    return step.icon || <Circle className="w-2 h-2 fill-current" />;
  };

  return (
    <div className={cn('w-full font-sans text-slate-100', className)}>
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
        <button
          type="button"
          onClick={() => setIsMainExpanded((value) => !value)}
          className={cn(
            'flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors',
            isMainExpanded ? 'border-b border-slate-800 bg-slate-950/60' : 'hover:bg-slate-900/60'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-5 w-5 items-center justify-center">
              {hasActive ? (
                <Loader2 className="w-4 h-4 text-cyan-300 animate-spin" />
              ) : allSuccess ? (
                <Check className="w-4 h-4 text-emerald-300" />
              ) : (
                <Sparkles className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <span className="text-sm font-semibold text-slate-100">{title}</span>
          </div>

          <div className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200">
            {isMainExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </div>
        </button>

        <div
          className={cn(
            'grid bg-slate-950/20 transition-all duration-300',
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
                      step.status === 'pending' ? 'opacity-55' : 'opacity-100'
                    )}
                  >
                    {!isLast && (
                      <div className="absolute left-[11px] top-7 bottom-[-10px] z-0 w-px bg-slate-800" />
                    )}

                    <div className="relative z-10 mt-0.5 h-6 w-6 flex-none">
                      <div
                        className={cn(
                          'flex h-full w-full items-center justify-center rounded-full ring-4 ring-slate-950 transition-colors',
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
                          Boolean(step.content) && 'cursor-pointer hover:bg-slate-900/70'
                        )}
                        onClick={(event) => step.content && toggleStep(step.id, event)}
                      >
                        <span
                          className={cn(
                            'text-sm font-medium tracking-tight',
                            step.status === 'active' && 'font-semibold text-slate-50',
                            step.status === 'error' && 'font-semibold text-rose-300',
                            step.status === 'warning' && 'font-semibold text-amber-300',
                            step.status === 'success' && 'text-slate-200',
                            step.status === 'pending' && 'text-slate-500'
                          )}
                        >
                          {step.title}
                        </span>

                        <div className="flex items-center gap-3">
                          {step.duration && (
                            <span className="font-mono text-[11px] tabular-nums text-slate-500">
                              {step.duration}
                            </span>
                          )}
                          {step.content && (
                            <span className="text-slate-600 transition-colors group-hover:text-slate-300">
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
