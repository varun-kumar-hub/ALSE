import { QueryIntent } from '../services/types';

const CODE_ALLOWED_INTENTS: QueryIntent[] = ['coding', 'debugging'];

const CODE_INTRO_PATTERNS = [
  /^here(?:'s| is)\s+(?:a|an)?\s*(?:python|javascript|typescript|react|rust|sql|html|css)?\s*(?:code|example|implementation|script)\b/i,
  /^you can (?:also )?(?:implement|create|write|use) (?:this|it) (?:in|with)\b/i,
  /^if you want to (?:create|implement|write|code|build)\b/i,
  /^(?:sample|example|alternative) implementation\b/i,
];

/**
 * Final safety pass over model output. It removes common "helpful but unwanted"
 * additions for non-coding intents and collapses duplicate lines/paragraphs.
 */
export function filterResponseForIntent(content: string, intent: QueryIntent): string {
  if (!content.trim()) return content;

  const allowCode = CODE_ALLOWED_INTENTS.includes(intent);
  const withoutCode = allowCode ? content : removeCodeAdditions(content);
  return removeRedundancy(withoutCode).trim();
}

function removeCodeAdditions(content: string): string {
  const lines = content.split(/\r?\n/);
  const kept: string[] = [];
  let inCodeFence = false;
  let skipSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^```/.test(trimmed)) {
      inCodeFence = !inCodeFence;
      continue;
    }

    if (inCodeFence) continue;

    if (/^(#{1,6}\s*)?(code|implementation|example code|sample code|python example|api example|pseudocode)\b[:\s-]*/i.test(trimmed)) {
      skipSection = true;
      continue;
    }

    if (skipSection && /^(#{1,6}\s+|\*\*[^*]+\*\*:?)\s*/.test(trimmed)) {
      skipSection = false;
    }

    if (skipSection || CODE_INTRO_PATTERNS.some((pattern) => pattern.test(trimmed))) {
      continue;
    }

    kept.push(line);
  }

  return kept.join('\n');
}

function removeRedundancy(content: string): string {
  const paragraphs = content.split(/\n{2,}/);
  const seenParagraphs = new Set<string>();
  const filteredParagraphs: string[] = [];

  for (const paragraph of paragraphs) {
    const normalizedParagraph = normalizeForComparison(paragraph);
    if (!normalizedParagraph || seenParagraphs.has(normalizedParagraph)) continue;

    seenParagraphs.add(normalizedParagraph);
    filteredParagraphs.push(removeDuplicateLines(paragraph.trim()));
  }

  return filteredParagraphs.join('\n\n').replace(/\n{3,}/g, '\n\n');
}

function removeDuplicateLines(paragraph: string): string {
  const seenLines = new Set<string>();
  const lines = paragraph.split(/\r?\n/);

  return lines
    .filter((line) => {
      const normalizedLine = normalizeForComparison(line);
      if (!normalizedLine) return true;
      if (seenLines.has(normalizedLine)) return false;
      seenLines.add(normalizedLine);
      return true;
    })
    .join('\n');
}

function normalizeForComparison(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`*_#>\-[\]().,:;!?]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
