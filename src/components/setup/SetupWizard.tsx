import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ProgressBar } from './ProgressBar';
import { AgentPlanning, PlanStep } from '../ui/AgentPlanning';
import { prepareRuntime, RuntimeProgress } from '../../services/runtime';
import { useAppStore } from '../../stores/appStore';

const SETUP_STEPS = [
  { id: 'system', label: 'Checking System' },
  { id: 'components', label: 'Installing Required Components' },
  { id: 'runtime', label: 'Preparing AI Runtime' },
  { id: 'models', label: 'Downloading AI Models' },
  { id: 'workspace', label: 'Creating Workspace' },
  { id: 'database', label: 'Initializing Database' },
  { id: 'services', label: 'Starting AI Services' },
  { id: 'health', label: 'Final Verification' },
];

interface StepState {
  id: string;
  label: string;
  status: RuntimeProgress['status'];
  detail?: string;
}

export const SetupWizard: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { refreshModels, updateSetting, setRuntimeReady } = useAppStore();
  const [steps, setSteps] = useState<StepState[]>(
    SETUP_STEPS.map((step) => ({ ...step, status: 'pending' }))
  );
  const [progress, setProgress] = useState(0);
  const [headline, setHeadline] = useState('Preparing your environment...');
  const [isRunning, setIsRunning] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  const completedCount = useMemo(
    () => steps.filter((step) => step.status === 'success').length,
    [steps]
  );

  const updateStep = (progressEvent: RuntimeProgress) => {
    setSteps((current) =>
      current.map((step) =>
        step.id === progressEvent.step
          ? { ...step, status: progressEvent.status }
          : step
      )
    );
    setProgress(progressEvent.progress);
    setHeadline(progressEvent.label);
    if (progressEvent.detail) {
      setDiagnostics((current) => [...current, progressEvent.detail as string]);
      setSteps((current) =>
        current.map((step) =>
          step.id === progressEvent.step ? { ...step, detail: progressEvent.detail } : step
        )
      );
    }
  };

  const runRuntimeManager = async () => {
    setIsRunning(true);
    setIsReady(false);
    setError(null);
    setDiagnostics([]);
    setProgress(0);
    setHeadline('Preparing your environment...');
    setSteps(SETUP_STEPS.map((step) => ({ ...step, status: 'pending' })));

    const result = await prepareRuntime(updateStep);

    if (result.ready) {
      setIsReady(true);
      setProgress(100);
      setHeadline('Ready');
      await updateSetting('workspaceLocation', result.workspace_path);
      await refreshModels();
      setRuntimeReady(true);
    } else {
      setError('Required component could not be initialized.');
      setDiagnostics(result.diagnostics);
    }

    setIsRunning(false);
  };

  useEffect(() => {
    runRuntimeManager();
  }, []);

  const planningSteps: PlanStep[] = steps.map((step) => ({
    id: step.id,
    title: step.label,
    status:
      step.status === 'running'
        ? 'active'
        : step.status === 'warning'
          ? 'warning'
          : step.status === 'error'
            ? 'error'
            : step.status,
    defaultExpanded: step.status === 'running' || step.status === 'error',
    content: step.detail ? (
      <p className="rounded-md border border-slate-800 bg-slate-950/70 p-3 font-mono text-[11px] leading-relaxed text-slate-400">
        {step.detail}
      </p>
    ) : undefined,
  }));

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-950 p-3 select-none">
      <div className="mx-auto flex h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl">
        <div className="shrink-0 px-7 py-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-slate-100">Welcome to AI OS</h1>
              <p className="text-sm text-slate-400">{headline}</p>
            </div>
            </div>
            {isReady && (
              <Button
                size="sm"
                onClick={onComplete}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="shrink-0"
              >
                Open
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 space-y-3">
              <div className="flex gap-3">
                <XCircle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-sm font-semibold text-rose-100">
                    Unable to prepare AI Runtime
                  </h2>
                  <p className="text-xs text-rose-200/80 mt-1">
                    Reason: {error}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={runRuntimeManager}
                  disabled={isRunning}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Retry
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails((value) => !value)}
                  rightIcon={
                    showDetails ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )
                  }
                >
                  View Details
                </Button>
              </div>
            </div>
          ) : (
            <ProgressBar progress={progress} label="Setup Progress" />
          )}

          <AgentPlanning
            key={isReady ? 'ready' : 'running'}
            title="Preparing your environment"
            steps={planningSteps}
            defaultExpanded={!isReady}
          />

          {showDetails && diagnostics.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 max-h-40 overflow-y-auto">
              {diagnostics.map((line, index) => (
                <p key={`${line}-${index}`} className="font-mono text-[11px] text-slate-400">
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="shrink-0 border-t border-slate-800 bg-slate-950/70 p-5">
          <Button
            size="lg"
            disabled={!isReady}
            onClick={onComplete}
            rightIcon={<ArrowRight className="w-5 h-5" />}
            className="w-full"
          >
            {isReady ? 'Open AI OS' : `${completedCount} / ${steps.length} Complete`}
          </Button>
        </div>
      </div>
    </div>
  );
};
