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
  }); // e.g. "Wednesday, August 12, 2026"
  const isoDate = now.toISOString().split('T')[0]; // "2026-08-12"
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }); // "11:28:53 AM"
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
- CRITICAL TEMPORAL ANCHOR: Today is ${fullDateStr}. All temporal reasoning (e.g. "latest", "current", "recent", "today", "this year", "upcoming") MUST be evaluated relative to TODAY's date (${isoDate}).
${memoryBlock}

[SYSTEM RUNTIME ENVIRONMENT]
- AI Execution Mode: ${options.mode || 'Hybrid'}
- Active Workspace: ${options.workspace || 'Default Workspace'}
- OS Environment: ${options.os || 'Windows 11'}
- Primary AI Provider: ${options.provider || 'Local Ollama'}
- Active Model: ${options.model || 'llama3.2:latest'}`;
}

export function optimizePrompt(
  _userPrompt: string,
  intent: QueryIntent,
  assistantName = 'Nexus Agent',
  contextOptions: RuntimeContextOptions = {},
  retrievedContext = '',
  memoryEpisodes: string[] = []
): string {
  let formatGuidance = '';
  const noExtraCodeRule = `
Only answer the user's actual request. Do not add code, pseudocode, JSON, API examples, tutorials, or implementation suggestions unless the user explicitly asks for code or the intent is Coding/Debugging. Do not repeat facts or add speculative extra sections.`;

  switch (intent) {
    case 'biography':
      formatGuidance = `
Intent: Biography / Person / Entity Search.
Format your response with:
1. Overview
2. Early Life & Background
3. Career & Major Achievements
4. Notable Works / Timeline
5. Important Takeaways`;
      break;

    case 'coding':
      formatGuidance = `
Intent: Coding.
Format your response with:
1. Overview & Architecture
2. Recommended Solution
3. Code Implementation (clean syntax highlighting)
4. Line-by-line Explanation
5. Best Practices & Edge-case Pitfalls`;
      break;

    case 'debugging':
      formatGuidance = `
Intent: Debugging.
Format your response with:
1. Root Cause Analysis
2. Minimal Fix Code
3. Detailed Explanation
4. Prevention Recommendations`;
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
5. Who Should Choose Which Option`;
      break;

    case 'file-analysis':
      formatGuidance = `
Intent: File / Document Analysis.
Format your response with:
1. Document Summary
2. Key Topics & Core Findings
3. Actionable Items
4. Critical Observations
5. References & Next Steps`;
      break;

    case 'study-notes':
      formatGuidance = `
Intent: Study Notes.
Format your response with:
1. Topic Summary
2. Key Concepts & Definitions
3. Formulas & Step-by-Step Examples
4. Common Exam Pitfalls
5. Summary Checklist`;
      break;

    case 'medical':
      formatGuidance = `
Intent: Health / Medical Info.
Format your response with:
1. General Disclaimer (Non-diagnostic guidance)
2. Symptom / Concept Overview
3. Potential Causes & Medical Context
4. General Wellness Steps (Consult Healthcare Professional)`;
      break;

    case 'legal':
      formatGuidance = `
Intent: Legal / Compliance Analysis.
Format your response with:
1. Executive Context & Legal Scope
2. Clause / Term Analysis
3. Compliance & Liability Considerations
4. Action Items`;
      break;

    case 'definition':
      formatGuidance = `
Intent: Definition & Fundamentals.
Provide a clear definition and explain the core principles directly. Include key algorithms, types, or examples where appropriate to provide a complete, high-quality explanation.`;
      break;

    case 'explanation':
      formatGuidance = `
Intent: Concept Explanation.
Explain clearly and thoroughly. Cover key algorithms, mechanics, and real-world examples.`;
      break;

    case 'summarization':
      formatGuidance = `
Intent: Summarization.
Summarize the provided content without adding unrelated background. Keep duplicate points out.`;
      break;

    case 'translation':
      formatGuidance = `
Intent: Translation.
Return the translation directly. Add a short note only if ambiguity matters.`;
      break;

    case 'mathematics':
      formatGuidance = `
Intent: Mathematics.
Show the necessary reasoning, equations, and final answer clearly.`;
      break;

    case 'creative-writing':
      formatGuidance = `
Intent: Creative Writing.
Produce the requested creative text directly in the requested style and length.`;
      break;

    case 'email-document':
      formatGuidance = `
Intent: Email / Document Writing.
Draft or revise the requested document directly. Keep formatting clean and practical.`;
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
Give a focused list of distinct ideas. Avoid repeating variants of the same idea.`;
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
Intent: General Learning & Explanation.
Explain directly and comprehensively with clear structure, key algorithms, and concepts.`;
      break;
  }

  const antiHallucinationRules = `
Factual Accuracy & Educational Depth:
- Combine your deep pre-trained knowledge with any provided reference context to deliver accurate, rich, and well-rounded explanations.
- When asked for algorithms, mechanisms, or principles, provide the standard, well-established industry methods in detail.
- Never output meta-deliberations or recite prompt constraints.`;

  const visualFormattingRules = `
Educational Presentation Protocol:
- For educational and concept queries, begin directly with the topic title and definition (e.g. # Supervised Learning, ## Definition).
- For casual greetings, conversational inquiries, or brief questions, respond naturally, warmly, and directly without forced heading boilerplate.
- Keep all internal planning strictly inside <think>...</think> tags. Never output meta-commentary (do NOT write "We need to answer...", "According to guidelines...", "Thus answer:").
- Include Markdown comparison tables ONLY when contrasting multiple features, algorithms, or components where a table adds clarity.
- Include flowcharts, diagrams, or code blocks ONLY when necessary and relevant.
- Conclude educational explanations with a concise "## Key Takeaways" section.`;

  const thinkingProcessRules = `
Cognitive Planning & Educational Response Protocol:
- If you formulate internal thoughts or a plan, keep it concise inside <think>...</think> tags.
- Output the complete, structured, and learner-focused educational markdown response directly.`;

  const runtimeContext = buildRuntimeContextPrompt(contextOptions, memoryEpisodes);

  const systemMessage = `You are ${assistantName}, an advanced AI educational tutor and adaptive learning assistant.
${runtimeContext}

${retrievedContext ? `[RETRIEVED REFERENCE CONTEXT]\n${retrievedContext.trim()}\n` : ''}
${thinkingProcessRules.trim()}
${formatGuidance.trim()}
${visualFormattingRules.trim()}
${noExtraCodeRule.trim()}
${antiHallucinationRules.trim()}

CRITICAL PEDAGOGICAL GUIDANCE:
- Focus entirely on clear, conceptual explanations tailored to the learner.
- Deliver structured, beautiful Markdown with definitions, examples, comparison tables, and key takeaways.
- Never output meta-reasoning outside the <think> block.`;

  return systemMessage;
}

export function buildSystemPrompt(
  intent: QueryIntent,
  assistantName = 'Nexus Agent',
  contextOptions: RuntimeContextOptions = {},
  retrievedContext = '',
  memoryEpisodes: string[] = []
): string {
  return optimizePrompt('', intent, assistantName, contextOptions, retrievedContext, memoryEpisodes);
}
