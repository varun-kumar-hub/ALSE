import { QueryIntent } from '../services/types';

export interface RuntimeContextOptions {
  mode?: string;
  workspace?: string;
  provider?: string;
  model?: string;
  os?: string;
  language?: string;
}

export function buildRuntimeContextPrompt(
  options: RuntimeContextOptions = {},
  memoryEpisodes: string[] = []
): string {
  const now = new Date();
  const fullDateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const isoDate = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

  const memoryBlock =
    memoryEpisodes.length > 0
      ? `\n[EPISODIC MEMORY & PREVIOUS CONVERSATION EPISODES]\n${memoryEpisodes.join('\n')}`
      : '\n[EPISODIC MEMORY]\n- No prior conversation episodes found.';

  return `[REAL-TIME TEMPORAL SYSTEM CLOCK]
- Today's Exact Date: ${fullDateStr} (${isoDate})
- Current Local Time: ${timeStr}
- Timezone: ${timeZone}
- Current Year: ${now.getFullYear()}
- CRITICAL TEMPORAL ANCHOR: Today is ${fullDateStr}. All temporal reasoning MUST be evaluated relative to TODAY's date (${isoDate}).
${memoryBlock}

[SYSTEM RUNTIME ENVIRONMENT]
- AI Execution Mode: ${options.mode || 'Hybrid'}
- Active Workspace: ${options.workspace || 'Default Workspace'}
- OS Environment: ${options.os || 'Windows 11'}
- Primary AI Provider: ${options.provider || 'Local Ollama'}
- Active Model: ${options.model || 'llama3.2:latest'}`;
}

export function optimizePrompt(
  userPrompt: string,
  intent: QueryIntent,
  assistantName = 'LearnForge Agent',
  contextOptions: RuntimeContextOptions = {},
  retrievedContext = '',
  memoryEpisodes: string[] = []
): string {
  const cleanQuery = (userPrompt || '').trim();
  const isGreeting = /^(hi|hello|hey|greetings|howdy|good\s+(morning|afternoon|evening|day)|sup|yo|what's\s+up|hi\s+there|hello\s+there)\b[!.?]*$/i.test(
    cleanQuery
  );

  let formatGuidance = '';

  if (isGreeting) {
    formatGuidance = `
[CONVERSATIONAL GREETING HANDLING]
- The user sent a friendly greeting (${cleanQuery}).
- Respond warmly, politely, and concisely as ${assistantName}.
- Welcome the learner and ask how you can help them explore concepts, study subjects, solve problems, or prepare for assessments today.
- STRICT RULE: NEVER output an unsolicited biographical article, random historical figure (such as Albert Einstein or any other entity), or a lengthy unprompted essay in response to a simple greeting.`;
  } else {
    switch (intent) {
      case 'biography':
        formatGuidance = `
Intent: Biography / Historical Entity Analysis.
Format your response with:
1. Overview
2. Early Life & Background
3. Career & Major Contributions
4. Notable Works / Timeline
5. Key Takeaways`;
        break;

      case 'coding':
        formatGuidance = `
Intent: Software Engineering & Optimized Code Implementation.
Formatting & Engineering Standards:
1. Complete, Fully Optimized Code Implementation:
   - Provide complete, runnable, production-grade code in the requested language (Python, TypeScript, C++, Rust, etc.).
   - Never truncate, omit functions, or use placeholders (never write "// rest of code", "/* TODO */", or "...").
2. Algorithmic Complexity Breakdown:
   - Detail the exact Big-O Time and Space Complexity with mathematical notation.
3. Verification & Test Scenarios:
   - Include test cases validating normal behavior, boundary values, and edge cases.
4. Key Engineering Insights & Optimization Rationale:
   - Explain why this implementation is optimal.`;
        break;

      case 'debugging':
        formatGuidance = `
Intent: Code Optimization & Debugging.
Formatting & Engineering Standards:
1. Root Cause & Inefficiency Analysis:
   - Identify bugs, edge-case hazards, or bottlenecks.
2. Complete Fully Optimized Code:
   - Provide the complete drop-in replacement code with fixes applied.
3. Complexity & Correctness Contrast:
   - Contrast before vs. after performance.`;
        break;

      case 'research':
        formatGuidance = `
Intent: Deep Research.
Format your response with:
1. Executive Summary
2. Core Objectives
3. Background & Context
4. Detailed Findings & Analysis
5. Evidence & Alternative Views
6. Key Takeaways & Sources`;
        break;

      case 'comparison':
        formatGuidance = `
Intent: Product / Concept Comparison.
Format your response with:
1. Quick Recommendation
2. Comprehensive Comparison Table (in Markdown)
3. Pros & Cons Analysis
4. Performance & Trade-offs
5. Ideal Use Cases`;
        break;

      case 'file-analysis':
        formatGuidance = `
Intent: File / Document Analysis.
Format your response with:
1. Document Summary
2. Key Topics & Core Findings
3. Actionable Items
4. Critical Observations`;
        break;

      case 'study-notes':
        formatGuidance = `
Intent: Study Notes.
Format your response with:
1. Topic Summary
2. Core Concepts & Definitions
3. Key Formulas / Mechanisms
4. Practice Questions & Retention Check`;
        break;

      case 'mathematics':
        formatGuidance = `
Intent: Mathematics.
Show the necessary step-by-step reasoning, mathematical equations, and final answer clearly.`;
        break;

      case 'creative-writing':
        formatGuidance = `
Intent: Creative Writing.
Produce the requested creative text directly in the requested style and length.`;
        break;

      case 'email-document':
        formatGuidance = `
Intent: Email / Document Writing.
Draft or revise the requested document directly with clean, practical formatting.`;
        break;

      case 'data-analysis':
        formatGuidance = `
Intent: Data Analysis.
Focus on observations, calculations, trends, and conclusions from the data provided.`;
        break;

      case 'planning':
        formatGuidance = `
Intent: Planning.
Format your response with:
1. Core Objectives
2. Actionable Tasks / Steps
3. Estimated Timeline
4. Potential Risks & Mitigation`;
        break;

      case 'brainstorming':
        formatGuidance = `
Intent: Brainstorming.
Give a focused list of distinct ideas with actionable rationale.`;
        break;

      case 'image-analysis':
        formatGuidance = `
Intent: Image / Diagram Analysis.
Format your response with:
1. Image Content Summary
2. Visual Elements & Text Extracted
3. Key Observations & Meaning`;
        break;

      case 'documentation':
        formatGuidance = `
Intent: Documentation / README.
Format your response with:
1. Overview & Purpose
2. Quick Start / Installation
3. API / Component Reference
4. Usage Examples`;
        break;

      case 'general':
      default:
        formatGuidance = `
Intent: Educational Mastery & Concept Explanation.
Explain directly, accurately, and comprehensively with clear structure, key mechanisms, and concrete examples.`;
        break;
    }
  }

  const codingAndImplementationRule = `
Coding & Implementation Capabilities:
- You are a master educator in computer science, software engineering, mathematics, and systems.
- When explaining computing topics, algorithms, or technical mechanisms, provide clean, idiomatic code snippets alongside theoretical explanations.`;

  const antiHallucinationRules = `
Educational Delivery & Completeness:
- Directly write the complete educational explanation.
- NEVER output mere outlines or placeholder summaries.
- Deliver authoritative, well-structured teaching tailored precisely to the user's specific request.`;

  const visualFormattingRules = isGreeting
    ? ''
    : `
Educational Presentation Guidelines:
- Begin directly with the topic title and definition (e.g. # Backpropagation in Neural Networks, ## Definition).
- For scientific diagrams, network architectures, flowcharts, and system state transitions: include an interactive '\`\`\`mermaid ... \`\`\`' diagram for visual intuition. In Mermaid node definitions, ALWAYS enclose node label text in double quotes (e.g. A["Client Request"] --> B["Server Node"]).
- Include Markdown comparison tables when contrasting features or algorithms.
- Conclude educational explanations with a concise "## Key Takeaways" section.`;

  const runtimeContext = buildRuntimeContextPrompt(contextOptions, memoryEpisodes);

  const systemMessage = `You are ${assistantName}, an elite AI educational tutor and adaptive learning guide.
${runtimeContext}

${retrievedContext ? `[RETRIEVED REFERENCE CONTEXT]\n${retrievedContext.trim()}\n` : ''}
${formatGuidance.trim()}
${visualFormattingRules.trim()}
${codingAndImplementationRule.trim()}
${antiHallucinationRules.trim()}

Deliver direct, comprehensive, and authoritative conceptual mastery tailored precisely to what the user asks.`;

  return systemMessage;
}

export function buildSystemPrompt(
  intent: QueryIntent,
  assistantName = 'LearnForge Agent',
  contextOptions: RuntimeContextOptions = {},
  retrievedContext = '',
  memoryEpisodes: string[] = []
): string {
  return optimizePrompt('', intent, assistantName, contextOptions, retrievedContext, memoryEpisodes);
}
