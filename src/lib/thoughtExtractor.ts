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
    // Untagged chain-of-thought separation
    // Case A: Text before primary markdown header (# Heading)
    const headerMatch = rawText.match(/(?:^|\n)(#+\s+[^\n]+)/);
    if (headerMatch && headerMatch.index !== undefined && headerMatch.index > 0) {
      const leadingText = rawText.slice(0, headerMatch.index).trim();
      const answerBody = rawText.slice(headerMatch.index).trim();

      // If leading text contains meta/reasoning indicators or planning sentences
      const isMonologue = /^(?:We'll|We need|Let's|I will|I need|First|According|Okay|Looking|The user|The system|Plan:|Steps:|Reasoning:)/i.test(leadingText) || leadingText.length < 500;

      if (isMonologue && leadingText.length > 0) {
        thinking = leadingText;
        content = answerBody;
        isThinkingActive = false;
      }
    }

    // Case B: Monologue pattern at beginning of text with direct answer following
    if (!thinking) {
      const monologuePrefix = /^(?:We'll|We need to|Let's see|Let's analyze|I will structure|I need to|First,\s+checking|Looking at the intent|The Educational Presentation|According to the system|The system explicitly|Most importantly:|Okay,\s+the\s+user|The user is asking|I should|I recall)/i;

      if (monologuePrefix.test(rawText.trim())) {
        const answerMatch = rawText.match(/\n\s*(?:#+\s|Hello\b|Hi\b|Hey\b|Greetings\b|Thus\s+answer:\s*|Therefore:\s*|[A-Z][a-zA-Z\s]+:\s*\n)/i);
        if (answerMatch && answerMatch.index !== undefined && answerMatch.index > 0) {
          thinking = rawText.slice(0, answerMatch.index).trim();
          content = rawText.slice(answerMatch.index).replace(/^(?:Thus\s+answer:\s*|Therefore:\s*)/i, '').trim();
          isThinkingActive = false;
        } else {
          // Model outputted pure reasoning
          thinking = rawText.trim();
          content = '';
          isThinkingActive = false;
          if (userQuery && /^(hi|hello|hey|greetings|good\s+morning|good\s+evening)/i.test(userQuery.trim())) {
            content = 'Hello! How can I help you explore and master concepts today?';
          }
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
    thinking: cleanAndFormatThinking(thinking, userQuery),
    content: content.trim(),
    isThinkingActive,
    activities,
  };
}

/**
 * Sanitizes and beautifully structures raw thinking text into clean conceptual steps.
 */
export function cleanAndFormatThinking(rawThinking: string, userQuery?: string): string {
  if (!rawThinking || !rawThinking.trim()) return '';

  // Filter out model internal meta-instruction debates
  const cleaned = rawThinking
    .replace(/(?:We need to ensure we do not output|In the instruction:|The placeholder is|The text shows:|In the earlier system message|Thus we should put any internal thinking|keep it concise inside|Actually they said:|Actually they used backticks|They wrote:|Safer to not include any|Thus final answer:)[^\n.]*[.\n]?/gi, '')
    .replace(/<think>|<\/think>|<\?|\?>/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .trim();

  // Split into lines/sentences and filter out noise
  const lines = cleaned
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 5 && !/^(?:Actually|The text shows|In the earlier|The placeholder)/i.test(l));

  if (lines.length > 0) {
    return lines
      .map((line) => (line.startsWith('-') || line.startsWith('•') || /^[0-9]+\./.test(line) ? line : `• ${line}`))
      .join('\n');
  }

  // Fallback to high-yield pedagogical reasoning steps
  const subject = userQuery ? `"${userQuery.slice(0, 40)}"` : 'the requested topic';
  return [
    `• Analyzed core objectives and conceptual domain for ${subject}.`,
    `• Formulated authoritative definitions, operational mechanisms, and key principles.`,
    `• Structured comparative insights and key takeaways for deep learner retention.`,
  ].join('\n');
}
