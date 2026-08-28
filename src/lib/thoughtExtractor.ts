import { QueryIntent } from '../services/types';
import { buildDynamicAgentActivities } from './thinkingTimeline';

export interface DynamicActivityItem {
  id: string;
  text: string;
  status: 'completed' | 'active' | 'pending';
}

export interface ParsedStreamContent {
  thinking: string;
  content: string;
  isThinkingActive: boolean;
  activities: DynamicActivityItem[];
}

export function parseThinkingAndContent(
  rawText: string,
  userQuery?: string,
  intent: QueryIntent = 'general',
  toolsUsed: string[] = []
): ParsedStreamContent {
  if (!rawText) {
    const baseActivities = userQuery
      ? buildDynamicAgentActivities(userQuery, intent, toolsUsed)
      : [];
    return {
      thinking: '',
      content: '',
      isThinkingActive: false,
      activities: baseActivities.map((desc, idx) => ({
        id: `act-${idx}`,
        text: desc,
        status: 'pending',
      })),
    };
  }

  const thinkOpenTag = '<think>';
  const thinkCloseTag = '</think>';

  let thinking = '';
  let content = rawText;
  let isThinkingActive = false;

  const openIndex = rawText.indexOf(thinkOpenTag);
  const closeIndex = rawText.indexOf(thinkCloseTag);

  if (openIndex !== -1) {
    const afterOpen = rawText.slice(openIndex + thinkOpenTag.length);
    const closeInAfter = afterOpen.indexOf(thinkCloseTag);

    if (closeInAfter === -1) {
      // Check if markdown content / headers started without explicit </think>
      const responseHeaderMatch = afterOpen.match(/\n\s*(#+\s|>\s*\[!|\*\*|[0-9]+\.\s|- \*\*)/);
      if (responseHeaderMatch && responseHeaderMatch.index !== undefined && responseHeaderMatch.index > 0) {
        thinking = afterOpen.slice(0, responseHeaderMatch.index).trim();
        content = (rawText.slice(0, openIndex) + '\n' + afterOpen.slice(responseHeaderMatch.index)).trim();
        isThinkingActive = false;
      } else {
        thinking = afterOpen.trim();
        content = rawText.slice(0, openIndex).trim();
        isThinkingActive = true;
      }
    } else {
      thinking = afterOpen.slice(0, closeInAfter).trim();
      content = (rawText.slice(0, openIndex) + ' ' + afterOpen.slice(closeInAfter + thinkCloseTag.length)).trim();
      isThinkingActive = false;
    }
  } else if (closeIndex !== -1) {
    thinking = rawText.slice(0, closeIndex).trim();
    content = rawText.slice(closeIndex + thinkCloseTag.length).trim();
    isThinkingActive = false;
  } else {
    // Untagged chain-of-thought detection (e.g. models that output internal monologue without <think> tags)
    const reasoningPrefixPattern = /^(?:Okay,\s+the\s+user|Let's\s+see|We\s+need\s+to\s+answer|First,\s+checking|Looking\s+at\s+the\s+intent|The\s+Educational\s+Presentation|I\s+need\s+to\s+follow|According\s+to\s+the\s+system|The\s+system\s+explicitly|Most\s+importantly:)/i;

    if (reasoningPrefixPattern.test(rawText.trim())) {
      // Search for where actual response begins (e.g. markdown heading, greeting, or 'Thus answer:')
      const answerMatch = rawText.match(/\n\s*(?:#+\s|Hello\b|Hi\b|Hey\b|Greetings\b|Thus\s+answer:\s*|Therefore:\s*)/i);
      if (answerMatch && answerMatch.index !== undefined && answerMatch.index > 0) {
        thinking = rawText.slice(0, answerMatch.index).trim();
        content = rawText.slice(answerMatch.index).replace(/^(?:Thus\s+answer:\s*|Therefore:\s*)/i, '').trim();
        isThinkingActive = false;
      } else {
        // The model outputted only internal monologue without final answer
        thinking = rawText.trim();
        isThinkingActive = false;
        if (userQuery && /^(hi|hello|hey|greetings|good\s+morning|good\s+evening)/i.test(userQuery.trim())) {
          content = 'Hello! How can I help you explore and master concepts today?';
        } else {
          content = rawText.trim();
        }
      }
    }
  }

  // Generate dynamic, context-specific activity phrases based on query, tools, and execution
  const baseActivities = userQuery
    ? buildDynamicAgentActivities(userQuery, intent, toolsUsed)
    : [
        'Analyzing the request and identifying key requirements.',
        'Verifying details and organizing key points.',
        'Putting together the structured response.',
      ];

  const total = baseActivities.length;
  let activeIndex = 0;

  if (!isThinkingActive && (content.length > 0 || thinking.length > 0)) {
    activeIndex = total; // all completed
  } else if (isThinkingActive) {
    if (thinking.length < 80) activeIndex = 0;
    else if (thinking.length < 240) activeIndex = Math.min(1, total - 1);
    else activeIndex = Math.min(2, total - 1);
  }

  const activities: DynamicActivityItem[] = baseActivities.map((desc, idx) => {
    let status: 'completed' | 'active' | 'pending' = 'pending';
    if (activeIndex >= total || idx < activeIndex) {
      status = 'completed';
    } else if (idx === activeIndex && isThinkingActive) {
      status = 'active';
    } else {
      status = 'pending';
    }
    return {
      id: `act-${idx}`,
      text: desc,
      status,
    };
  });

  return {
    thinking,
    content,
    isThinkingActive,
    activities,
  };
}
