import { QueryIntent } from '../services/types';

/**
 * Injects subtle system guidance based on the detected intent to ensure
 * local LLMs structure their output into clean, professional response layouts.
 */
export function optimizePrompt(
  userPrompt: string,
  intent: QueryIntent,
  assistantName = 'Nexus Agent'
): string {
  let formatGuidance = '';
  const noExtraCodeRule = `
Only answer the user's actual request. Do not add code, pseudocode, JSON, API examples, tutorials, or implementation suggestions unless the user explicitly asks for code or the intent is Coding/Debugging. Do not repeat facts or add speculative extra sections.`;

  switch (intent) {
    case 'biography':
      formatGuidance = `
Intent: Biography / Person.
Provide a concise biography only: 3-8 clear sentences or a very short Markdown answer with relevant facts.
Never include code examples, JSON, pseudocode, implementation notes, or "if you want" additions.`;
      break;

    case 'definition':
      formatGuidance = `
Intent: Definition.
Give a direct definition in 1-3 concise paragraphs. Include a brief example only if it clarifies the concept and does not require code.`;
      break;

    case 'explanation':
      formatGuidance = `
Intent: Explanation.
Explain directly and clearly. Use short paragraphs or bullets only when they improve readability. Do not turn the answer into a tutorial unless asked.`;
      break;

    case 'research':
      formatGuidance = `
Intent: Research.
Use clear Markdown sections only when the request benefits from depth:
1. Overview
2. Key Findings
3. Detailed Analysis
4. References / Key Takeaways`;
      break;

    case 'comparison':
      formatGuidance = `
Intent: Comparison.
Please format your response with:
1. Summary
2. Comparison Table (in Markdown)
3. Pros & Cons
4. Recommendation`;
      break;

    case 'coding':
      formatGuidance = `
Intent: Coding.
Please format your response with:
1. Problem Summary
2. Recommended Solution
3. Code Implementation (with proper syntax highlighting)
4. Explanation & Best Practices`;
      break;

    case 'debugging':
      formatGuidance = `
Intent: Debugging.
Identify the likely cause, provide the minimal fix, and include code only when it directly fixes the reported bug or error.`;
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
Show the necessary reasoning and final answer. Keep steps concise.`;
      break;

    case 'creative-writing':
      formatGuidance = `
Intent: Creative Writing.
Produce the requested creative text in the requested style and length. Do not explain the writing unless asked.`;
      break;

    case 'email-document':
      formatGuidance = `
Intent: Email / Document Writing.
Draft or revise the requested document directly. Keep formatting clean and practical.`;
      break;

    case 'data-analysis':
      formatGuidance = `
Intent: Data Analysis.
Focus on observations, calculations, trends, and conclusions from the data the user provides.`;
      break;

    case 'file-analysis':
      formatGuidance = `
Intent: File Analysis.
Discuss only the provided or referenced file content. If no file content is available, ask for it briefly.`;
      break;

    case 'planning':
      formatGuidance = `
Intent: Planning.
Please format your response with:
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

    case 'general':
    default:
      formatGuidance = `
Intent: General Question.
Answer directly in 3-8 concise sentences unless the user asks for more detail.`;
      break;
  }

  const systemMessage = `You are ${assistantName}, a local-first AI assistant. ${formatGuidance.trim()}
${noExtraCodeRule.trim()}
Before finalizing, validate that the answer directly answers the question, contains no unnecessary code, has no repeated facts, and includes no irrelevant sections.`;

  return `${systemMessage}\n\nUser Question:\n${userPrompt}`;
}
