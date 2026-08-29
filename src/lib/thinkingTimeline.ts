import {
  QueryIntent,
  ThinkingTimelineStep,
  TimelinePhase,
  TimelineStepStatus,
} from '../services/types';

function getCurrentTimeString(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

export interface DetailedThinkingStages {
  stage1Title: string;
  stage1Thoughts: string[];
  stage2Title: string;
  stage2Thoughts: string[];
}

/**
 * Generates natural, query-specific agent activity descriptions dynamically.
 */
export function buildDynamicAgentActivities(
  userPrompt: string,
  intent: QueryIntent,
  _toolsUsed: string[] = []
): string[] {
  const q = (userPrompt || '').trim();
  const lower = q.toLowerCase();

  // 1. Conversational Greeting
  if (/^(hi|hello|hey|greetings|howdy|good\s+(morning|afternoon|evening|day)|sup|yo)\b[!.?]*$/i.test(lower)) {
    return [
      'Recognizing conversational greeting and setting up friendly learner context.',
      'Checking available subjects, active modules, and learning dashboard state.',
      'Preparing welcoming response and offering personalized study assistance.',
    ];
  }

  // 2. Coding & Programming Tasks
  if (
    intent === 'coding' ||
    intent === 'debugging' ||
    /\b(code|function|program|script|react|typescript|python|rust|algorithm|prime|array|sort|oop|class|inheritance)\b/i.test(
      lower
    )
  ) {
    const isPython = /\bpython\b/i.test(lower);
    return [
      `Deconstructing coding requirements and algorithmic constraints for "${q.slice(0, 45)}".`,
      `Formulating complete, production-grade ${isPython ? 'Python' : 'code'} with optimal asymptotic complexity.`,
      'Verifying edge cases, syntax correctness, and providing clear step-by-step explanation.',
    ];
  }

  // 3. Technical & Conceptual Systems (Networking, OS, Data Structures)
  if (
    /\b(tcp|udp|handshake|os|process|thread|deadlock|concurrency|binary tree|graph|data structure|linear search|binary search)\b/i.test(
      lower
    )
  ) {
    return [
      `Analyzing core architectural principles and state transitions for "${q.slice(0, 45)}".`,
      'Structuring intuitive mental models, protocol sequence flows, and formal definitions.',
      'Synthesizing a clean explanation with visual diagrams, complexity analysis, and key takeaways.',
    ];
  }

  // 4. Mathematics & Formal Proofs
  if (
    intent === 'mathematics' ||
    /[0-9]\s*[+\-*/^=]\s*[0-9]/.test(lower) ||
    /\b(solve|equation|derivative|integral|matrix|algebra|calculus|probability)\b/i.test(lower)
  ) {
    return [
      `Dissecting mathematical problem statement and identifying required axioms & formulas.`,
      'Working through step-by-step algebraic isolation and symbolic derivation.',
      'Verifying numerical accuracy and highlighting boundary value principles.',
    ];
  }

  // 5. Comparison
  if (intent === 'comparison' || /\b(vs|versus|difference between|compare)\b/i.test(lower)) {
    return [
      `Identifying evaluation criteria, architectural nuances, and performance trade-offs.`,
      'Constructing a structured markdown comparison matrix across key dimensions.',
      'Formulating actionable synthesis and guidance on ideal use cases.',
    ];
  }

  // 6. General Concept & Learning Query
  return [
    `Analyzing user learning goals and foundational concepts for "${q.slice(0, 45)}${q.length > 45 ? '...' : ''}".`,
    'Synthesizing verified knowledge, real-world analogies, and structured breakdown.',
    'Reviewing clarity and structuring actionable takeaways for deep retention.',
  ];
}

/**
 * Builds a comprehensive, 2-Stage detailed cognitive reasoning plan:
 * Stage 1: Intent & Content Strategy ("What to Give")
 * Stage 2: Pedagogical & Structural Execution ("How to Give & What to Do")
 */
export function generateDetailedThinkingStages(
  userPrompt: string,
  intent: QueryIntent = 'general'
): DetailedThinkingStages {
  const q = (userPrompt || '').trim();
  const lower = q.toLowerCase();

  // Case A: Friendly Greeting
  if (/^(hi|hello|hey|greetings|howdy|good\s+(morning|afternoon|evening|day)|sup|yo)\b[!.?]*$/i.test(lower)) {
    return {
      stage1Title: 'Stage 1: Intent & Content Strategy (What to Give)',
      stage1Thoughts: [
        `• Detected conversational greeting ("${q}"). User is initiating an interaction or opening a study session.`,
        '• Content Scope: Provide a warm, helpful, and concise welcome as LearnForge Agent.',
        '• Avoid unsolicited encyclopedic dumps, random biographies, or off-topic essay generation.',
      ],
      stage2Title: 'Stage 2: Pedagogical & Structural Execution (How to Give & What to Do)',
      stage2Thoughts: [
        '• Tone & Structure: Friendly, encouraging, and supportive educational persona.',
        '• Action: Prompt the user to explore a subject, ask a technical question, test a concept, or continue curriculum tasks.',
        '• Formatting: Keep it brief, polite, and ready to assist immediately.',
      ],
    };
  }

  // Case B: Coding / Algorithmic
  if (intent === 'coding' || intent === 'debugging' || /\b(code|algorithm|function|implement|debug)\b/i.test(lower)) {
    return {
      stage1Title: 'Stage 1: Intent & Content Strategy (What to Give)',
      stage1Thoughts: [
        `• Objective Analysis: User is requesting software engineering implementation or algorithmic logic for "${q.slice(0, 50)}".`,
        '• Core Components Needed: Complete, runnable code, asymptotic complexity analysis (Big-O Time & Space), and edge case handling.',
        '• Prerequisite Mapping: Ensure appropriate data structures and language idioms (Python/TypeScript/Rust) are chosen.',
      ],
      stage2Title: 'Stage 2: Pedagogical & Structural Execution (How to Give & What to Do)',
      stage2Thoughts: [
        '• Structural Breakdown: 1. Overview & Approach -> 2. Complete Optimized Code -> 3. Step-by-Step Walkthrough -> 4. Complexity & Edge Cases.',
        '• Code Quality: Include thorough comments, type hints, and avoid any placeholder omissions (no `// TODO` or `...`).',
        '• Pedagogical Value: Explain *why* this implementation is optimal and how memory locality/branch prediction are respected.',
      ],
    };
  }

  // Case C: Mathematics & Quantitative
  if (intent === 'mathematics' || /[0-9]\s*[+\-*/^=]\s*[0-9]/.test(lower) || /\b(solve|equation|calculus|algebra)\b/i.test(lower)) {
    return {
      stage1Title: 'Stage 1: Intent & Content Strategy (What to Give)',
      stage1Thoughts: [
        `• Mathematical Goal: User requires rigorous solution and conceptual derivation for "${q.slice(0, 50)}".`,
        '• Axiomatic Foundations: Identify governing equations, balance models, and algebraic transformation rules.',
        '• Misconception Guard: Guard against sign transfer loss, illegal distribution, and boundary division by zero.',
      ],
      stage2Title: 'Stage 2: Pedagogical & Structural Execution (How to Give & What to Do)',
      stage2Thoughts: [
        '• Derivation Flow: State given values -> Write fundamental formula -> Show step-by-step algebraic isolation -> State final answer.',
        '• Visual Formatting: Render clean LaTeX formatting ($E = mc^2$, fractions, roots) for mathematical clarity.',
        '• Verification: Substitute solution back into original equation to confirm correctness.',
      ],
    };
  }

  // Case D: General Educational Concept (Physics, History, Biology, CS Concepts, etc.)
  return {
    stage1Title: 'Stage 1: Intent & Content Strategy (What to Give)',
    stage1Thoughts: [
      `• Conceptual Scope: User wants to understand and master "${q.slice(0, 50)}${q.length > 50 ? '...' : ''}".`,
      '• Core Concept Deconstruction: Identify governing definitions, primary mechanisms, historical context, and practical significance.',
      '• Target Depth: Provide balanced intuitive understanding first, supported by formal accuracy and depth.',
    ],
    stage2Title: 'Stage 2: Pedagogical & Structural Execution (How to Give & What to Do)',
    stage2Thoughts: [
      '• Pedagogical Strategy: 1. Clear Title & Definition -> 2. Intuitive Mental Model -> 3. Core Working Mechanisms -> 4. Key Takeaways.',
      '• Visual & Structural Enhancements: Include formatted Markdown tables and visual Mermaid architecture diagrams where helpful.',
      '• Synthesis: Conclude with key retention takeaways and provocative check questions for deep mastery.',
    ],
  };
}

export function buildThinkingTimeline(
  intent: QueryIntent,
  userPrompt: string,
  _modelName = 'qwen3:8b'
): ThinkingTimelineStep[] {
  const dynamicActivities = buildDynamicAgentActivities(userPrompt, intent);
  const now = getCurrentTimeString();

  return [
    {
      id: 'step_analyze',
      phase: 'analyze',
      title: 'Cognitive Analysis & Strategy',
      detail: dynamicActivities[0] || 'Deconstructing user query and identifying conceptual domain.',
      status: 'running',
      timestamp: now,
      subSteps: [
        'Classifying intent and pedagogical depth',
        'Mapping domain prerequisites and core concepts',
      ],
    },
    {
      id: 'step_plan',
      phase: 'plan',
      title: 'Pedagogical & Structural Execution',
      detail: dynamicActivities[1] || 'Structuring comprehensive explanation, diagrams, and code.',
      status: 'pending',
      timestamp: now,
      subSteps: [
        'Formulating step-by-step mental models and definitions',
        'Designing visual diagrams and verification checkpoints',
      ],
    },
    {
      id: 'step_generate',
      phase: 'generate',
      title: 'Synthesis & Response Delivery',
      detail: dynamicActivities[2] || 'Delivering authoritative response with clear key takeaways.',
      status: 'pending',
      timestamp: now,
      subSteps: ['Streaming structured markdown with LaTeX and code blocks'],
    },
  ];
}

export function updateTimelinePhase(
  timeline: ThinkingTimelineStep[],
  phase: TimelinePhase,
  status: TimelineStepStatus = 'running',
  detail?: string
): ThinkingTimelineStep[] {
  return timeline.map((step) => {
    if (step.phase === phase) {
      return {
        ...step,
        status,
        detail: detail || step.detail,
        timestamp: getCurrentTimeString(),
      };
    }
    return step;
  });
}

export function completeTimeline(timeline: ThinkingTimelineStep[]): ThinkingTimelineStep[] {
  return timeline.map((step) => ({
    ...step,
    status: 'completed',
    timestamp: getCurrentTimeString(),
  }));
}

export function failTimelinePhase(
  timeline: ThinkingTimelineStep[],
  phase: TimelinePhase,
  detail?: string
): ThinkingTimelineStep[] {
  return timeline.map((step) => {
    if (step.phase === phase) {
      return {
        ...step,
        status: 'failed',
        detail: detail || step.detail,
        timestamp: getCurrentTimeString(),
      };
    }
    return step;
  });
}
