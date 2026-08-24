
import { QueryIntent } from '../services/types';

/**
 * Classifies user intent from prompt content without needing an extra API call.
 */
export function detectQueryIntent(prompt: string): QueryIntent {
  const text = prompt.toLowerCase().trim();

  if (!text) return 'general';

  const hasCodeBlock = /```[\s\S]*```/.test(prompt);
  const hasQuestionShape = /^(who|what|when|where|why|how)\b/.test(text);

  // Auto-detect URLs for URL Intelligence & Deep Research
  if (/(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/i.test(prompt)) {
    return 'research';
  }

  // Person / biography / entity requests must win over generic fallbacks.
  if (
    /\b(who is|who was|tell me about|short description of|brief description of|bio(?:graphy)? of|profile of)\b/.test(text) ||
    /\b(give me|provide|write)\b.*\b(short|brief)?\s*(description|bio|biography)\b.*\b(of|about)\b/.test(text) ||
    /\b(who invented|founder of|creator of|invented by|created by)\b/.test(text) ||
    /^[a-z0-9]{2,6}$/i.test(text) // E.g., "ntr", "srk", "kcr", "ysr", "balayya"
  ) {
    return 'biography';
  }

  if (/\b(translate|translation|convert this (?:text|sentence|paragraph) (?:to|into))\b/.test(text)) {
    return 'translation';
  }

  if (/\b(summarize|summary of|tl;dr|key points from|condense)\b/.test(text)) {
    return 'summarization';
  }

  if (/\b(write|draft|compose|polish|rewrite)\b.*\b(email|letter|memo|document|proposal|resume|cover letter)\b/.test(text)) {
    return 'email-document';
  }

  if (/\b(story|poem|lyrics|screenplay|dialogue|creative|fiction|joke|tagline|slogan)\b/.test(text)) {
    return 'creative-writing';
  }

  if (/\b(calculate|solve|equation|derivative|integral|probability|percentage|mean|median)\b/.test(text) || /[0-9]\s*[+\-*/^=]\s*[0-9]/.test(text)) {
    return 'mathematics';
  }

  if (/\b(debug|stack trace|traceback|exception|runtime error|compile error|failing test|why.*error|fix.*bug)\b/.test(text) || hasCodeBlock) {
    return 'debugging';
  }

  const explicitCodingPatterns = [
    /\b(write|generate|create|build|implement|refactor|modify|update)\b.*\b(code|function|script|component|class|method|api|endpoint|query|regex|program|app)\b/,
    /\b(write|generate|create|build|implement)\b.*\b(python|javascript|typescript|react|rust|sql|html|css|java|go|c\+\+|c#)\b/,
    /\b(create|build)\b.*\b(react component|api|endpoint|cli|web app|tauri app)\b/,
  ];
  if (explicitCodingPatterns.some((pattern) => pattern.test(text))) {
    return 'coding';
  }

  if (/\b(vs|versus|compare|difference between|pros and cons|which is better|tradeoffs|alternative to)\b/.test(text)) {
    return 'comparison';
  }

  if (/\b(plan|roadmap|timeline|schedule|strategy|milestones|objectives|project plan)\b/.test(text)) {
    return 'planning';
  }

  if (/\b(brainstorm|ideas for|suggest ideas|name ideas|ways to)\b/.test(text)) {
    return 'brainstorming';
  }

  if (/\b(analyze this file|review this file|file analysis|attached file|uploaded file|csv|spreadsheet)\b/.test(text)) {
    return 'file-analysis';
  }

  if (/\b(analyze data|data analysis|dataset|chart|statistics|correlation|trend analysis)\b/.test(text)) {
    return 'data-analysis';
  }

  if (/\b(define|definition of|meaning of|what does .+ mean)\b/.test(text) || /^what is\b/.test(text)) {
    return 'definition';
  }

  if (/\b(explain|why does|how does|how do|walk me through)\b/.test(text)) {
    return 'explanation';
  }

  if (/\b(study notes|cheatsheet|flashcards|exam prep|lecture notes)\b/.test(text)) {
    return 'study-notes';
  }

  if (/\b(symptoms|diagnosis|medical|medicine|dosage|treatment|health condition|doctor)\b/.test(text)) {
    return 'medical';
  }

  if (/\b(legal|contract|clause|terms|liability|compliance|statute|lawsuit)\b/.test(text)) {
    return 'legal';
  }

  if (/\b(analyze image|screenshot|picture|photo|diagram|ocr|extract text from image)\b/.test(text)) {
    return 'image-analysis';
  }

  if (/\b(documentation|readme|api doc|user manual|guide|architecture doc)\b/.test(text)) {
    return 'documentation';
  }

  if (/\b(research|deep dive|report on|literature review|sources|citations|references|latest)\b/.test(text) || (!hasQuestionShape && text.length > 240)) {
    return 'research';
  }

  return 'general';
}
