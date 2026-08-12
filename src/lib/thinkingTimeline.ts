import {
  QueryIntent,
  ThinkingTimelineStep,
  TimelinePhase,
  TimelineStepStatus,
} from '../services/types';

const PHASE_ORDER: TimelinePhase[] = ['analyze', 'gather', 'plan', 'generate', 'validate', 'format'];

function getCurrentTimeString(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

/**
 * Generates natural, query-specific agent activity descriptions dynamically.
 * NO generic fixed headings or checklists.
 */
export function buildDynamicAgentActivities(
  userPrompt: string,
  intent: QueryIntent,
  toolsUsed: string[] = []
): string[] {
  const q = userPrompt.trim();
  const lower = q.toLowerCase();

  // 1. Coding & Programming Tasks
  if (
    intent === 'coding' ||
    intent === 'debugging' ||
    /\b(code|function|program|script|react|typescript|python|rust|algorithm|prime|array|sort)\b/i.test(lower)
  ) {
    const isPrime = /\bprime\b/i.test(lower);
    const isReact = /\b(react|component|hook|ui)\b/i.test(lower);
    const isPython = /\bpython\b/i.test(lower);

    if (isPrime) {
      return [
        'Working out an optimal and readable prime-checking approach.',
        'Keeping the logic clean, beginner-friendly, and boundary-checked.',
        'Verifying the algorithm across edge cases (0, 1, negatives, large primes).',
      ];
    }
    if (isReact) {
      return [
        'Planning the component structure, props interface, and state management.',
        'Ensuring reactive re-renders and clean Tailwind / CSS styling.',
        'Drafting production-ready implementation with proper TypeScript types.',
      ];
    }
    return [
      `Working out the implementation approach for "${q.slice(0, 50)}${q.length > 50 ? '...' : ''}".`,
      `Structuring clean, idiomatic ${isPython ? 'Python' : 'code'} with proper error handling.`,
      'Reviewing edge cases and validating the syntax before outputting.',
    ];
  }

  // 2. Technical / Protocol Explanations
  if (
    /\b(three-way handshake|tcp|http|dns|websocket|protocol|architecture|database index)\b/i.test(lower)
  ) {
    if (/\b(tcp|handshake)\b/i.test(lower)) {
      return [
        'Breaking down how the connection is established between client and server.',
        'Connecting SYN, SYN-ACK, and ACK packet sequences to the state transitions.',
        'Structuring a clear timeline diagram to make the handshake intuitive.',
      ];
    }
    return [
      `Deconstructing the core architecture and working principles of ${q.slice(0, 45)}.`,
      'Formulating real-world analogies and sequence flows for clarity.',
      'Putting together an organized explanation with key takeaways.',
    ];
  }

  // 3. People, Biographies & Celebrities
  if (
    intent === 'biography' ||
    /\b(who is|who was|tell me about|biography of|filmography of|actor|director)\b/i.test(lower)
  ) {
    const nameMatch = q.replace(/\b(who is|who was|tell me about|biography of|bio of)\b/gi, '').trim();
    const entity = nameMatch || 'the subject';

    const activities = [
      `Looking up verified career history, background, and major works for ${entity}.`,
    ];

    if (toolsUsed.includes('Wikipedia Grounding') || toolsUsed.includes('Web Search')) {
      activities.push(`Cross-referencing retrieved facts and dates from online sources.`);
    } else {
      activities.push(`Checking chronological milestones, notable achievements, and awards.`);
    }

    activities.push(`Pulling together key highlights and verified details into a structured overview.`);
    return activities;
  }

  // 4. Local Places, Recommendations, Search
  if (/\b(near me|restaurants?|places to visit|hotels?|best [a-z]+ in|recommend)\b/i.test(lower)) {
    return [
      `Checking top-rated recommendations and locations matching "${q.slice(0, 40)}".`,
      'Filtering the available options by relevance, ratings, and practical value.',
      'Curating the best recommendations with helpful tips.',
    ];
  }

  // 5. Mathematical & Algorithmic
  if (intent === 'mathematics' || /[0-9]\s*[+\-*/^=]/.test(lower) || /\b(solve|derivative|integral|equation)\b/i.test(lower)) {
    return [
      'Dissecting the problem parameters and selecting the right formulas.',
      'Working through the calculation step by step to ensure numerical accuracy.',
      'Formatting the final mathematical derivation clearly.',
    ];
  }

  // 6. Comparisons
  if (intent === 'comparison' || /\b(vs|versus|difference between|compare)\b/i.test(lower)) {
    return [
      'Identifying the architectural and functional criteria that actually matter.',
      'Weighing trade-offs, performance nuances, and ideal use cases side-by-side.',
      'Formulating a balanced comparison table and actionable conclusion.',
    ];
  }

  // 7. Dynamic Fallback: Custom tailored to query
  if (q.length < 35) {
    return [
      `Analyzing the specific requirements for "${q}".`,
      'Synthesizing verified knowledge into a clear, direct answer.',
    ];
  }

  return [
    `Analyzing the context surrounding "${q.slice(0, 50)}...".`,
    toolsUsed.length > 0 ? `Consulting retrieved ${toolsUsed.join(', ')} context for up-to-date accuracy.` : 'Verifying details and organizing key points.',
    'Formulating a comprehensive, well-structured response.',
  ];
}

export function buildThinkingTimeline(
  intent: QueryIntent,
  prompt: string,
  _selectedModel: string
): ThinkingTimelineStep[] {
  const dynamicDescriptions = buildDynamicAgentActivities(prompt, intent);
  const nowStr = getCurrentTimeString();

  return dynamicDescriptions.map((desc, idx) => ({
    id: `step-${idx}`,
    title: desc,
    phase: (PHASE_ORDER[idx] || 'generate') as TimelinePhase,
    status: (idx === 0 ? 'running' : 'pending') as TimelineStepStatus,
    timestamp: idx === 0 ? nowStr : undefined,
  }));
}

export function updateTimelinePhase(
  steps: ThinkingTimelineStep[],
  currentPhase: TimelinePhase,
  status: TimelineStepStatus = 'running'
): ThinkingTimelineStep[] {
  const phaseIndex = PHASE_ORDER.indexOf(currentPhase);
  const nowStr = getCurrentTimeString();

  return steps.map((step, idx) => {
    if (step.status === 'failed' || step.status === 'skipped') return step;
    if (idx < phaseIndex) {
      return { ...step, status: 'completed', timestamp: step.timestamp || nowStr };
    }
    if (idx === phaseIndex) {
      return { ...step, status, timestamp: step.timestamp || nowStr };
    }
    return { ...step, status: 'pending' };
  });
}

export function completeTimeline(steps: ThinkingTimelineStep[]): ThinkingTimelineStep[] {
  const nowStr = getCurrentTimeString();
  return steps.map((step) =>
    step.status === 'failed' || step.status === 'skipped'
      ? step
      : { ...step, status: 'completed', timestamp: step.timestamp || nowStr }
  );
}

export function failTimelinePhase(
  steps: ThinkingTimelineStep[],
  currentPhase: TimelinePhase
): ThinkingTimelineStep[] {
  let markedFailure = false;
  const nowStr = getCurrentTimeString();

  return steps.map((step) => {
    if (step.phase === currentPhase && !markedFailure) {
      markedFailure = true;
      return { ...step, status: 'failed', timestamp: nowStr };
    }
    if (markedFailure && step.status === 'pending') return { ...step, status: 'skipped' };
    return step.status === 'running' ? { ...step, status: 'failed', timestamp: nowStr } : step;
  });
}
