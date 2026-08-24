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
      thinking = afterOpen.trim();
      content = rawText.slice(0, openIndex).trim();
      isThinkingActive = true;
    } else {
      thinking = afterOpen.slice(0, closeInAfter).trim();
      content = (rawText.slice(0, openIndex) + ' ' + afterOpen.slice(closeInAfter + thinkCloseTag.length)).trim();
      isThinkingActive = false;
    }
  } else if (closeIndex !== -1) {
    thinking = rawText.slice(0, closeIndex).trim();
    content = rawText.slice(closeIndex + thinkCloseTag.length).trim();
    isThinkingActive = false;
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
