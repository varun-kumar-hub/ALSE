/**
 * Rich Content Extraction Engine
 * Strips ads, cookie banners, navigation, and footers.
 * Extracts article text, headings, tables, code blocks, and JSON-LD metadata.
 */

export interface ExtractedPageContent {
  title: string;
  markdown: string;
  headings: string[];
  codeBlocks: string[];
  tables: string[];
  metadata: {
    author?: string;
    publishedDate?: string;
    description?: string;
    canonicalUrl?: string;
  };
  engineUsed: 'HTTP' | 'Chromium' | 'Firefox';
  fetchTimeMs: number;
}

export function extractCleanContent(
  rawHtml: string,
  url: string,
  engineUsed: 'HTTP' | 'Chromium' | 'Firefox',
  fetchTimeMs: number
): ExtractedPageContent {
  // DOMParser browser execution
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  // Extract Title
  const title =
    doc.querySelector('title')?.textContent?.trim() ||
    doc.querySelector('h1')?.textContent?.trim() ||
    url;

  // Extract Metadata & JSON-LD
  const metadata: ExtractedPageContent['metadata'] = {};
  const descMeta = doc.querySelector('meta[name="description"], meta[property="og:description"]');
  if (descMeta) metadata.description = descMeta.getAttribute('content') || undefined;

  const authorMeta = doc.querySelector('meta[name="author"], meta[property="article:author"]');
  if (authorMeta) metadata.author = authorMeta.getAttribute('content') || undefined;

  const dateMeta = doc.querySelector('meta[property="article:published_time"], meta[name="date"]');
  if (dateMeta) metadata.publishedDate = dateMeta.getAttribute('content') || undefined;

  // Strip noise elements (ads, cookie banners, nav, footer, sidebar)
  const noiseSelectors = [
    'script',
    'style',
    'nav',
    'footer',
    'header',
    'aside',
    'form',
    'iframe',
    'noscript',
    '.ad',
    '.ads',
    '.cookie-banner',
    '#cookie-banner',
    '.navigation',
    '.sidebar',
    '.comments',
  ];

  noiseSelectors.forEach((sel) => {
    doc.querySelectorAll(sel).forEach((el) => el.remove());
  });

  // Extract Headings
  const headings: string[] = [];
  doc.querySelectorAll('h1, h2, h3').forEach((h) => {
    const text = h.textContent?.trim();
    if (text && text.length > 2) headings.push(text);
  });

  // Extract Code Blocks
  const codeBlocks: string[] = [];
  doc.querySelectorAll('pre code, pre').forEach((c) => {
    const code = c.textContent?.trim();
    if (code && code.length > 5) codeBlocks.push(code);
  });

  // Extract Tables
  const tables: string[] = [];
  doc.querySelectorAll('table').forEach((t) => {
    const rows: string[] = [];
    t.querySelectorAll('tr').forEach((tr) => {
      const cols = Array.from(tr.querySelectorAll('th, td'))
        .map((td) => td.textContent?.trim() || '')
        .join(' | ');
      if (cols) rows.push(`| ${cols} |`);
    });
    if (rows.length > 0) tables.push(rows.join('\n'));
  });

  // Extract Main Body Content
  const mainEl = doc.querySelector('main, article, #content, .content') || doc.body;
  let textContent = mainEl.textContent || '';

  // Clean whitespace & paragraph breaks
  const cleanedMarkdown = textContent
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  return {
    title,
    markdown: cleanedMarkdown.slice(0, 15000), // Cap at 15k chars
    headings: headings.slice(0, 15),
    codeBlocks: codeBlocks.slice(0, 10),
    tables: tables.slice(0, 5),
    metadata,
    engineUsed,
    fetchTimeMs,
  };
}
