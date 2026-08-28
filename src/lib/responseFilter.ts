/**
 * LearnForge Clean Educational Response Filter
 * Strips meta commentary, prompt artifacts, leaked internal reasoning, and duplicate sections from model responses.
 */

const META_PATTERNS = [
  /^We need to (answer|provide|define|structure|explain|make sure).+?\n/gim,
  /^We'll do:.+?\n/gim,
  /^Thus answer:.+?\n/gim,
  /^According to (guidelines|the protocols|the system).+?\n/gim,
  /^Must base answer strictly.+?\n/gim,
  /^Okay, the user just said.+?\n/gim,
  /^First, checking the temporal anchor.+?\n/gim,
  /^Looking at the intent classification.+?\n/gim,
  /^The Educational Presentation Protocol.+?\n/gim,
  /^The Cognitive Planning protocol.+?\n/gim,
  /^Most importantly: "Never output meta commentary".+?\n/gim,
  /^I recall that in the previous conversation.+?\n/gim,
  /^The system (warns against|explicitly says).+?\n/gim,
  /^I need to (explain|define|structure|make sure|understand|analyze|follow).+?\n/gim,
  /^I will (structure|provide|now explain|break down|format|answer).+?\n/gim,
  /^I should (ensure|keep in mind|note that|mention).+?\n/gim,
  /^Given today's date.+?\n/gim,
  /^Looking at the current real-time clock.+?\n/gim,
  /^The search results (show|indicate|contain).+?\n/gim,
  /^Based on (the provided|my reasoning|the search results).+?\n/gim,
  /^Since the provided search results.+?\n/gim,
  /^Let me (analyze|break down|explain|structure|think about).+?\n/gim,
  /\\think[\s\S]*?\\endthink/gi,
];

export function cleanEducationalContent(rawText: string): string {
  if (!rawText) return '';

  let cleaned = rawText;

  // 1. Remove raw <think>...</think> and \think...\endthink tags
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned.replace(/\\think[\s\S]*?\\endthink/gi, '');
  cleaned = cleaned.trim();

  // 2. Strip leading meta-commentary artifacts
  for (const pattern of META_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // 3. Remove duplicate repeated blocks if the model echoed the entire response twice
  const titleMatch = cleaned.match(/^(#+\s+[^\n]+)/);
  if (titleMatch) {
    const title = titleMatch[1];
    const secondTitleIndex = cleaned.indexOf(title, title.length);
    if (secondTitleIndex !== -1 && secondTitleIndex > 80) {
      const firstPart = cleaned.slice(0, secondTitleIndex).trim();
      const secondPart = cleaned.slice(secondTitleIndex).trim();
      if (firstPart.length > 50 && secondPart.length > 50) {
        // If the two parts start identically, keep the cleanest one
        cleaned = firstPart;
      }
    }
  }

  // 4. Normalize multiple consecutive blank lines to at most two
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

export function filterResponseForIntent(rawText: string, _intent?: string): string {
  return cleanEducationalContent(rawText);
}
