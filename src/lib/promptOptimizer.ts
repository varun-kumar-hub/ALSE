import { QueryIntent } from '../services/types';

/**
 * Injects subtle system guidance based on the detected intent to ensure
 * local LLMs structure their output into clean, professional response layouts.
 */
export function optimizePrompt(
  userPrompt: string,
  intent: QueryIntent,
  assistantName = 'AI OS'
): string {
  let formatGuidance = '';

  switch (intent) {
    case 'research':
      formatGuidance = `
Please format your response into clear Markdown sections:
1. Overview
2. Key Findings
3. Detailed Analysis
4. References / Key Takeaways`;
      break;

    case 'comparison':
      formatGuidance = `
Please format your response with:
1. Summary
2. Comparison Table (in Markdown)
3. Pros & Cons
4. Recommendation`;
      break;

    case 'coding':
      formatGuidance = `
Please format your response with:
1. Problem Summary
2. Recommended Solution
3. Code Implementation (with proper syntax highlighting)
4. Explanation & Best Practices`;
      break;

    case 'planning':
      formatGuidance = `
Please format your response with:
1. Core Objectives
2. Actionable Tasks / Steps
3. Estimated Timeline
4. Potential Risks & Mitigation`;
      break;

    case 'general':
    default:
      formatGuidance = `
Please keep your answer clear, structured, and easy to read using clean Markdown styling.`;
      break;
  }

  const systemMessage = `You are ${assistantName}, a local-first AI assistant. ${formatGuidance.trim()}`;

  return `${systemMessage}\n\nUser Question:\n${userPrompt}`;
}
