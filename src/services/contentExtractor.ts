/**
 * Rich Content Extraction Engine
 * Strips ads, cookie banners, navigation, and footers.
 * Extracts article text, headings, tables, code blocks, and JSON-LD metadata.
 */

export interface ExtractedPageContent {
  title: string;
  markdown: string;
  links: string[];
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

  // Extract all links & form endpoints BEFORE noise removal
  const links: string[] = [];
  doc.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href')?.trim();
    if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
      try {
        const absolute = new URL(href, url).toString();
        if (!links.includes(absolute)) links.push(absolute);
      } catch {}
    }
  });

  doc.querySelectorAll('form[action]').forEach((f) => {
    const action = f.getAttribute('action')?.trim();
    if (action) {
      try {
        const absolute = new URL(action, url).toString();
        if (!links.includes(absolute)) links.push(absolute);
      } catch {}
    }
  });

  // Extract Next.js / JSON-LD / Hydration data BEFORE noise removal
  let nextJsHydratedData = '';
  doc.querySelectorAll('script[id="__NEXT_DATA__"], script[type="application/ld+json"]').forEach((el) => {
    const raw = el.textContent?.trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const pageProps = parsed.props?.pageProps || parsed;
        const jsonStr = JSON.stringify(pageProps, null, 2);
        if (jsonStr.length > 20) {
          nextJsHydratedData += `\n\n[Hydrated Page Props / Structured Data]:\n${jsonStr.slice(0, 8000)}`;
        }
      } catch {}
    }
  });

  // Strip noise elements (ads, cookie banners, script tags, style, etc)
  const noiseSelectors = [
    'script',
    'style',
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

  // Extract Main Body Content preserving layout structure
  const mainEl = doc.querySelector('main, article, #content, .content') || doc.body;
  
  // Convert block elements into structured text with newlines
  const textLines: string[] = [];
  mainEl.querySelectorAll('h1, h2, h3, h4, p, li, section, div, article').forEach((el) => {
    const directText = el.childNodes.length === 1 && el.childNodes[0].nodeType === 3
      ? el.textContent?.trim()
      : null;
    if (directText && directText.length > 1) {
      textLines.push(directText);
    }
  });

  let rawBodyText = textLines.length > 5 
    ? textLines.join('\n') 
    : (mainEl.textContent || '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n');

  const fullCleanedContent = (rawBodyText + nextJsHydratedData).trim();

  return {
    title,
    markdown: fullCleanedContent.slice(0, 15000), // Cap at 15k chars
    links,
    headings: headings.slice(0, 15),
    codeBlocks: codeBlocks.slice(0, 10),
    tables: tables.slice(0, 5),
    metadata,
    engineUsed,
    fetchTimeMs,
  };
}
