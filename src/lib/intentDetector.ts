import { QueryIntent } from '../services/types';

/**
 * Classifies user intent from prompt content without needing an extra API call.
 */
export function detectQueryIntent(prompt: string): QueryIntent {
  const text = prompt.toLowerCase().trim();

  // 1. Coding intent
  const codingKeywords = [
    'code',
    'function',
    'script',
    'bug',
    'error',
    'fix',
    'implement',
    'refactor',
    'python',
    'javascript',
    'typescript',
    'react',
    'rust',
    'sql',
    'html',
    'css',
    'api',
    'class',
    'method',
  ];
  if (codingKeywords.some((k) => text.includes(k)) || /```[\s\S]*```/.test(prompt)) {
    return 'coding';
  }

  // 2. Comparison intent
  const comparisonKeywords = [
    'vs',
    'versus',
    'compare',
    'difference between',
    'pros and cons',
    'which is better',
    'tradeoffs',
    'alternative to',
  ];
  if (comparisonKeywords.some((k) => text.includes(k))) {
    return 'comparison';
  }

  // 3. Planning intent
  const planningKeywords = [
    'plan',
    'roadmap',
    'timeline',
    'schedule',
    'steps to',
    'how to build',
    'strategy',
    'milestones',
    'objectives',
  ];
  if (planningKeywords.some((k) => text.includes(k))) {
    return 'planning';
  }

  // 4. Research intent
  const researchKeywords = [
    'explain',
    'what is',
    'why does',
    'how does',
    'history of',
    'overview',
    'deep dive',
    'architecture',
    'mechanism',
    'research',
    'summary',
    'analyze',
  ];
  if (researchKeywords.some((k) => text.includes(k)) || text.length > 200) {
    return 'research';
  }

  return 'general';
}
