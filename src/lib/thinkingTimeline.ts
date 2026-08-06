import {
  QueryIntent,
  ThinkingTimelineStep,
  TimelinePhase,
  TimelineStepStatus,
} from '../services/types';

type StepTemplate = Omit<ThinkingTimelineStep, 'status'>;

const PHASE_ORDER: TimelinePhase[] = ['analyze', 'gather', 'plan', 'generate', 'validate', 'format'];

const INTENT_STEPS: Record<QueryIntent, StepTemplate[]> = {
  general: [
    step('understand-question', 'Understanding the question', 'analyze'),
    step('recall-context', 'Checking conversation context', 'gather'),
    step('build-answer', 'Building direct answer', 'generate'),
    step('review-answer', 'Checking relevance and brevity', 'validate'),
    step('format-answer', 'Formatting response', 'format'),
  ],
  biography: [
    step('understand-person', 'Understanding biography request', 'analyze'),
    step('known-facts', 'Searching internal knowledge', 'gather'),
    step('verify-facts', 'Verifying known facts', 'validate'),
    step('write-biography', 'Generating concise biography', 'generate'),
    step('format-biography', 'Formatting response', 'format'),
  ],
  definition: [
    step('understand-term', 'Understanding term or concept', 'analyze'),
    step('select-definition', 'Choosing the clearest definition', 'plan'),
    step('write-definition', 'Generating direct definition', 'generate'),
    step('check-clarity', 'Validating clarity', 'validate'),
    step('format-definition', 'Formatting answer', 'format'),
  ],
  explanation: [
    step('understand-concept', 'Understanding concept', 'analyze'),
    step('choose-level', 'Choosing explanation level', 'plan'),
    step('create-example', 'Creating helpful example', 'generate'),
    step('check-clarity', 'Validating clarity', 'validate'),
    step('format-explanation', 'Formatting answer', 'format'),
  ],
  coding: [
    step('understand-code-request', 'Understanding coding request', 'analyze'),
    step('select-patterns', 'Selecting implementation patterns', 'plan'),
    step('plan-structure', 'Planning structure', 'plan'),
    step('generate-code', 'Generating implementation', 'generate'),
    step('review-code', 'Reviewing code', 'validate'),
    step('format-code', 'Formatting code', 'format'),
  ],
  debugging: [
    step('understand-error', 'Understanding bug or error', 'analyze'),
    step('inspect-symptoms', 'Identifying likely cause', 'gather'),
    step('plan-fix', 'Planning minimal fix', 'plan'),
    step('generate-fix', 'Generating fix', 'generate'),
    step('review-fix', 'Reviewing corrected behavior', 'validate'),
    step('format-debugging', 'Formatting debugging notes', 'format'),
  ],
  research: [
    step('understand-research', 'Understanding research objective', 'analyze'),
    step('scope-research', 'Planning research scope', 'plan'),
    step('gather-findings', 'Gathering available knowledge', 'gather'),
    step('cross-check', 'Cross-checking information', 'validate'),
    step('organize-report', 'Organizing sections', 'plan'),
    step('write-report', 'Generating research report', 'generate'),
    step('format-report', 'Formatting report', 'format'),
  ],
  summarization: [
    step('understand-summary', 'Understanding summary goal', 'analyze'),
    step('identify-main-points', 'Identifying main points', 'gather'),
    step('remove-duplicates', 'Removing duplicate details', 'validate'),
    step('write-summary', 'Generating summary', 'generate'),
    step('format-summary', 'Formatting summary', 'format'),
  ],
  translation: [
    step('detect-language-task', 'Understanding translation request', 'analyze'),
    step('preserve-meaning', 'Preserving meaning and tone', 'plan'),
    step('translate-text', 'Generating translation', 'generate'),
    step('review-translation', 'Checking translation quality', 'validate'),
    step('format-translation', 'Formatting translation', 'format'),
  ],
  mathematics: [
    step('understand-problem', 'Understanding math problem', 'analyze'),
    step('choose-method', 'Choosing solution method', 'plan'),
    step('solve-stepwise', 'Solving step by step', 'generate'),
    step('check-result', 'Checking result', 'validate'),
    step('format-math', 'Formatting final answer', 'format'),
  ],
  'creative-writing': [
    step('understand-creative-brief', 'Understanding creative brief', 'analyze'),
    step('select-style', 'Choosing style and voice', 'plan'),
    step('draft-text', 'Drafting creative text', 'generate'),
    step('polish-text', 'Polishing wording', 'validate'),
    step('format-draft', 'Formatting draft', 'format'),
  ],
  'email-document': [
    step('understand-document', 'Understanding document goal', 'analyze'),
    step('identify-audience', 'Identifying audience and tone', 'plan'),
    step('draft-document', 'Drafting document', 'generate'),
    step('review-document', 'Reviewing clarity and completeness', 'validate'),
    step('format-document', 'Formatting document', 'format'),
  ],
  'data-analysis': [
    step('understand-data-question', 'Understanding analysis goal', 'analyze'),
    step('inspect-data', 'Inspecting provided data', 'gather'),
    step('identify-patterns', 'Identifying patterns and trends', 'generate'),
    step('check-conclusions', 'Checking conclusions', 'validate'),
    step('format-analysis', 'Formatting analysis', 'format'),
  ],
  'file-analysis': [
    step('check-file-context', 'Checking available file context', 'gather'),
    step('identify-structure', 'Identifying visible structure', 'analyze'),
    step('analyze-content', 'Analyzing available content', 'generate'),
    step('summarize-findings', 'Summarizing findings', 'generate'),
    step('check-gaps', 'Checking for missing file content', 'validate'),
    step('format-report', 'Formatting report', 'format'),
  ],
  planning: [
    step('understand-objective', 'Understanding objective', 'analyze'),
    step('define-scope', 'Defining scope and constraints', 'plan'),
    step('sequence-work', 'Sequencing work', 'generate'),
    step('check-risks', 'Checking risks and dependencies', 'validate'),
    step('format-plan', 'Formatting plan', 'format'),
  ],
  comparison: [
    step('understand-comparison', 'Understanding comparison request', 'analyze'),
    step('choose-criteria', 'Identifying comparison criteria', 'plan'),
    step('collect-characteristics', 'Collecting characteristics', 'gather'),
    step('structure-comparison', 'Structuring side-by-side comparison', 'generate'),
    step('generate-conclusion', 'Generating conclusion', 'format'),
  ],
  brainstorming: [
    step('understand-ideation', 'Understanding brainstorming goal', 'analyze'),
    step('set-constraints', 'Identifying useful constraints', 'plan'),
    step('generate-ideas', 'Generating distinct ideas', 'generate'),
    step('remove-overlap', 'Removing overlapping ideas', 'validate'),
    step('format-ideas', 'Formatting idea list', 'format'),
  ],
};

export function buildThinkingTimeline(
  intent: QueryIntent,
  prompt: string,
  selectedModel: string
): ThinkingTimelineStep[] {
  const baseSteps = INTENT_STEPS[intent] ?? INTENT_STEPS.general;
  const steps = baseSteps.map((template) => ({ ...template, status: 'pending' as const }));

  if (usesReasoningStyle(selectedModel) && shouldAddReasoningReview(intent, prompt)) {
    steps.splice(
      Math.max(steps.findIndex((item) => item.phase === 'validate'), 0),
      0,
      {
        id: 'reasoning-review',
        title: 'Reviewing reasoning path',
        phase: 'validate',
        status: 'pending',
      }
    );
  }

  return steps;
}

export function updateTimelinePhase(
  steps: ThinkingTimelineStep[],
  currentPhase: TimelinePhase,
  status: TimelineStepStatus = 'running'
): ThinkingTimelineStep[] {
  const phaseIndex = PHASE_ORDER.indexOf(currentPhase);

  return steps.map((step) => {
    const stepPhaseIndex = PHASE_ORDER.indexOf(step.phase);
    if (step.status === 'failed' || step.status === 'skipped') return step;
    if (stepPhaseIndex < phaseIndex) return { ...step, status: 'completed' };
    if (stepPhaseIndex === phaseIndex) return { ...step, status };
    return { ...step, status: 'pending' };
  });
}

export function completeTimeline(steps: ThinkingTimelineStep[]): ThinkingTimelineStep[] {
  return steps.map((step) =>
    step.status === 'failed' || step.status === 'skipped'
      ? step
      : { ...step, status: 'completed' }
  );
}

export function failTimelinePhase(
  steps: ThinkingTimelineStep[],
  currentPhase: TimelinePhase
): ThinkingTimelineStep[] {
  let markedFailure = false;

  return steps.map((step) => {
    if (step.phase === currentPhase && !markedFailure) {
      markedFailure = true;
      return { ...step, status: 'failed' };
    }
    if (markedFailure && step.status === 'pending') return { ...step, status: 'skipped' };
    return step.status === 'running' ? { ...step, status: 'failed' } : step;
  });
}

function step(id: string, title: string, phase: TimelinePhase, detail?: string): StepTemplate {
  return { id, title, phase, detail };
}

function usesReasoningStyle(model: string): boolean {
  return /\b(reason|thinking|deepseek|qwen|phi4|gemma3|llama4|70b|32b|12b)\b/i.test(model);
}

function shouldAddReasoningReview(intent: QueryIntent, prompt: string): boolean {
  return (
    prompt.length > 160 ||
    ['research', 'coding', 'debugging', 'mathematics', 'planning', 'comparison'].includes(intent)
  );
}
