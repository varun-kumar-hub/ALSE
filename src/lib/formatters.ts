import { FormattedSection, QueryIntent } from '../services/types';

/**
 * Parses raw AI markdown response text into structured section blocks
 * to power dynamic adaptive UI layouts in ChatMessage.
 */
export function parseResponseSections(content: string, intent: QueryIntent): FormattedSection[] {
  if (!content.trim()) return [];

  // Match headers (# Header, ## Header, **Header:**)
  const headerRegex = /(?:^|\n)(#{1,4}\s+|[0-9]+\.\s+\*\*|\*\*([^*]+)\*\*:?)/gm;
  const sections: FormattedSection[] = [];
  
  const matches = [...content.matchAll(headerRegex)];

  if (matches.length === 0) {
    return [
      {
        title: getDefaultSectionTitle(intent),
        type: intent,
        content: content.trim(),
      },
    ];
  }

  let lastIndex = 0;
  let currentTitle = 'Overview';

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex && i === 0) {
      const introText = content.slice(0, matchIndex).trim();
      if (introText) {
        sections.push({
          title: 'Summary',
          type: 'intro',
          content: introText,
        });
      }
    }

    const nextIndex = i + 1 < matches.length ? (matches[i + 1].index ?? content.length) : content.length;
    currentTitle = match[0].replace(/^[#\s0-9.*:]+/, '').trim();
    const sectionBody = content.slice(matchIndex + match[0].length, nextIndex).trim();

    if (sectionBody) {
      sections.push({
        title: currentTitle || 'Section',
        type: getSectionType(currentTitle, intent),
        content: sectionBody,
      });
    }

    lastIndex = nextIndex;
  }

  return sections.length > 0
    ? sections
    : [
        {
          title: 'Answer',
          type: 'general',
          content: content.trim(),
        },
      ];
}

function getDefaultSectionTitle(intent: QueryIntent): string {
  switch (intent) {
    case 'research':
      return 'Research Response';
    case 'comparison':
      return 'Comparison Analysis';
    case 'coding':
      return 'Solution & Code';
    case 'planning':
      return 'Project Plan';
    default:
      return 'Answer';
  }
}

function getSectionType(title: string, defaultIntent: QueryIntent): string {
  const t = title.toLowerCase();
  if (t.includes('code') || t.includes('implementation') || t.includes('solution')) return 'code';
  if (t.includes('table') || t.includes('versus') || t.includes('compare')) return 'table';
  if (t.includes('pros') || t.includes('cons') || t.includes('recommendation')) return 'tradeoffs';
  if (t.includes('overview') || t.includes('finding') || t.includes('summary')) return 'summary';
  if (t.includes('task') || t.includes('timeline') || t.includes('step')) return 'timeline';
  return defaultIntent;
}
