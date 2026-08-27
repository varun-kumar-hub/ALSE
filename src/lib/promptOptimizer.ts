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
  userPrompt: string,
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
Intent: Definition.
Give a direct definition in 1-3 concise paragraphs. Include a brief example only if it clarifies the concept.`;
      break;

    case 'explanation':
      formatGuidance = `
Intent: Explanation.
Explain directly and clearly. Use short paragraphs or bullets only when they improve readability.`;
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
Intent: General Question / Lookup.
Answer directly in clear, concise paragraphs unless the user asks for more detail.`;
      break;
  }

  const antiHallucinationRules = `
Factual Accuracy & Grounding Rules:
- When [Wikipedia Grounded Facts] or [Live Web Search Results] are provided in the context, your answer MUST BE 100% DERIVED FROM THAT RETRIEVED CONTEXT.
- DO NOT invent movie titles, family relationships, dates, or awards.
- For Jr. NTR (Nandamuri Taraka Rama Rao Jr.), note that his father is Nandamuri Harikrishna and grandfather is N. T. Rama Rao (NTR Sr.). Major films include Ninnu Choodalani (2001), Student No. 1 (2001), Simhadri (2003), Yamadonga (2007), Temper (2015), Nannaku Prematho (2016), Janatha Garage (2016), RRR (2022), and Devara (2024).
- If context is provided, state exact verified facts from the context.`;

  const visualFormattingRules = `
Presentation & Output Formatting Rules:
- Present content with professional typography and clean markdown formatting.
- Use GitHub Flavored Markdown headers (## Section Title, ### Subsection) to divide sections cleanly.
- Use bold lead-ins for bullet points (e.g. - **Key Insight**: explanation...).
- Format tabular data in clean Markdown tables with header borders (| Feature | Detail |).
- Always specify code block language identifiers (e.g. \`\`\`typescript, \`\`\`python).
- Maintain generous line spacing between sections for maximum readability.`;

  const thinkingProcessRules = `
Internal Cognitive Thinking Protocol (MANDATORY):
You MUST ALWAYS begin your response with an authentic, detailed, stream-of-consciousness thinking monologue enclosed inside <think> and </think> tags.
In your <think> section, think through the problem like a human expert solving it in real time:
- State what you are thinking, checking, and evaluating in conversational, natural language.
- Mention what the user is asking and dissect their exact intent.
- Mention current real time and context: note today's date (${new Date().toISOString().split('T')[0]}), the user's likely perspective, and previous memory episodes.
- Detail what you are searching and retrieving: explicitly describe checking Wikipedia facts, live web search results, and knowledge databases.
- Perform internal fact-checking and date verification to ensure every piece of info is accurate and up to date for 2026.
- Decide how to best structure the response clearly before outputting it.

Example of your <think> style:
<think>
The user is asking about Mahesh Babu's filmography and career details. Let me break down what they need.
Looking at the current real-time clock (August 12, 2026), I need to make sure his recent projects and verified filmography are fully accurate.
Let me check the retrieved knowledge context from Wikipedia and live search results. The context contains details about his iconic hits like Murari, Okkadu, Pokiri, Dookudu, Bharat Ane Nenu, Maharshi, and Guntur Kaaram.
Let me cross-reference the release years and notable awards (Nandi Awards, Filmfare Awards South) to avoid any confusion or duplicate titles.
The user will appreciate a structured overview with a summary, career highlights, and a clean chronological filmography table. I'm ready to write out the final response.
</think>

IMPORTANT: Place your entire internal reasoning between <think> and </think>. After </think>, output your polished, finalized markdown response.`;

  const runtimeContext = buildRuntimeContextPrompt(contextOptions, memoryEpisodes);

  const systemMessage = `You are ${assistantName}, a local-first AI assistant.
${runtimeContext}

${retrievedContext ? `[RETRIEVED REFERENCE CONTEXT]\n${retrievedContext.trim()}\n` : ''}
${thinkingProcessRules.trim()}
${formatGuidance.trim()}
${visualFormattingRules.trim()}
${noExtraCodeRule.trim()}
${antiHallucinationRules.trim()}
CRITICAL FACTUAL & CONTEXT GUIDANCE:
- Use the RETRIEVED REFERENCE CONTEXT provided above as helpful background information when relevant to the user's query.
- If the retrieved context is incomplete, empty, or unrelated to the user's prompt, rely on your conversation history, project context, document contents, and internal reasoning to provide a direct, helpful, and comprehensive answer.
- DO NOT apologize or decline to answer based on missing search results unless the user explicitly requested a web search that returned no findings.`;

  return `${systemMessage}\n\nUser Question:\n${userPrompt}`;
}
