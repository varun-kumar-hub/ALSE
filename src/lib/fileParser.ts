/**
 * LearnForge Advanced Client-Side File Parser
 * Extracts and formats text, code, JSON, CSV, logs, and document contents
 * for full LLM analysis and conversational QA.
 */

export interface ParsedFileInfo {
  name: string;
  size: string;
  type: string;
  content: string;
  lineCount: number;
  wordCount: number;
  preview: string;
  isTruncated: boolean;
}

const MAX_CHAR_LIMIT = 45000; // ~10k tokens safe payload

export async function parseUploadedFile(file: File): Promise<ParsedFileInfo> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
  const sizeKb = Math.round(file.size / 1024);
  const sizeStr = file.size > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;

  let textContent = '';

  try {
    if (file.type.includes('text') || isCodeOrTextExtension(extension)) {
      textContent = await readFileAsText(file);
    } else if (extension === 'pdf') {
      textContent = await readPdfFallback(file);
    } else {
      // Generic binary/text fallback reader
      textContent = await readFileAsText(file);
    }
  } catch (err) {
    textContent = `[Error reading file ${file.name}: ${err}]`;
  }

  const lines = textContent.split('\n');
  const lineCount = lines.length;
  const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;

  let isTruncated = false;
  if (textContent.length > MAX_CHAR_LIMIT) {
    textContent = textContent.slice(0, MAX_CHAR_LIMIT) + `\n\n[...File truncated at ${MAX_CHAR_LIMIT} characters for optimal processing...]`;
    isTruncated = true;
  }

  const preview = lines.slice(0, 5).join('\n');

  return {
    name: file.name,
    size: sizeStr,
    type: extension || 'file',
    content: textContent,
    lineCount,
    wordCount,
    preview,
    isTruncated,
  };
}

function isCodeOrTextExtension(ext: string): boolean {
  const codeExts = [
    'txt', 'md', 'json', 'csv', 'tsv', 'yaml', 'yml', 'xml', 'html', 'css', 'scss',
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'rs',
    'go', 'php', 'rb', 'swift', 'kt', 'sql', 'sh', 'bat', 'ps1', 'env', 'log',
    'dockerfile', 'ini', 'toml', 'cfg'
  ];
  return codeExts.includes(ext);
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

async function readPdfFallback(file: File): Promise<string> {
  // Simple PDF text stream extraction fallback
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let rawStr = '';
  // Extract printable ascii/utf-8 characters
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if ((b >= 32 && b <= 126) || b === 10 || b === 13) {
      rawStr += String.fromCharCode(b);
    }
  }
  // Strip binary metadata tags
  const clean = rawStr.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
    .replace(/\s{3,}/g, '\n')
    .trim();

  return clean.length > 50 ? clean : `[PDF Document: ${file.name}, Raw Size: ${(file.size / 1024).toFixed(1)} KB]`;
}

/**
 * Format parsed file context into structured LLM prompt
 */
export function formatFilePrompt(fileInfo: ParsedFileInfo, userQuestion: string): string {
  const header = `--- [ATTACHED FILE: ${fileInfo.name} (${fileInfo.size}, ${fileInfo.lineCount} lines)] ---`;
  const footer = `--- [END OF ATTACHED FILE: ${fileInfo.name}] ---`;

  if (!userQuestion.trim()) {
    return `${header}\n${fileInfo.content}\n${footer}\n\nPlease provide a comprehensive summary and analysis of this file.`;
  }

  return `${header}\n${fileInfo.content}\n${footer}\n\nUser Question regarding this file:\n${userQuestion.trim()}`;
}
