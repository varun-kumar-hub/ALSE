/**
 * Web tools — search, extract, crawl.
 * Self-contained TypeScript implementation for DuckDuckGo search, HTML text extraction, and bounded crawling.
 */

import { acquireWebPage } from './webAcquisitionEngine';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const FETCH_CAP_BYTES = 512 * 1024; // 512 KB cap

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebToolResult {
  ok: boolean;
  content: string;
  data?: unknown;
  error?: string;
}

// ── HTML → Plain Text Extractor ─────────────────────────────────────────────

const SKIP_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'head',
  'nav',
  'footer',
  'header',
  'aside',
  'form',
  'button',
  'svg',
  'iframe',
  'template',
]);

/**
 * Converts raw HTML string into clean plain text and extracts link URLs.
 */
export function htmlToTextAndLinks(rawHtml: string): { text: string; links: string[] } {
  const links: string[] = [];

  // Remove skip tags along with their content
  let cleanedHtml = rawHtml;
  SKIP_TAGS.forEach((tag) => {
    const reg = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    cleanedHtml = cleanedHtml.replace(reg, ' ');
  });

  // Extract href links from remaining HTML
  const linkMatches = cleanedHtml.matchAll(/<a\s+[^>]*href=["'](https?:\/\/[^"']+)["']/gi);
  for (const match of linkMatches) {
    if (match[1]) links.push(match[1]);
  }

  // Strip remaining HTML tags
  let text = cleanedHtml.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // Normalize whitespace
  text = text.replace(/\s{3,}/g, '  ').trim();

  return { text, links };
}

// ── URL Safety & DDG Unwrap ──────────────────────────────────────────────────

export function isUrlSafe(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.startsWith('169.254.') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function unwrapDdgRedirect(url: string): string {
  if (!url || !url.includes('duckduckgo.com/l/?')) return url;
  try {
    const parsed = new URL(url);
    const uddg = parsed.searchParams.get('uddg');
    return uddg ? decodeURIComponent(uddg) : url;
  } catch {
    return url;
  }
}

// ── HTTP Fetcher ─────────────────────────────────────────────────────────────

async function fetchUrlText(url: string, timeoutMs = 8000): Promise<string> {
  if (!isUrlSafe(url)) {
    throw new Error(`Blocked URL for security policy: ${url}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const cappedBuffer = arrayBuffer.slice(0, FETCH_CAP_BYTES);
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(cappedBuffer);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── 1. web_search Tool ───────────────────────────────────────────────────────

export async function webSearch(query: string, limit = 5): Promise<WebToolResult> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { ok: false, content: '', error: 'No query given' };
  }

  const maxResults = Math.max(1, Math.min(limit, 10));
  const results: WebSearchResult[] = [];

  const isBrowser = typeof window !== 'undefined' && !('__TAURI_INTERNALS__' in window);

  // 1. DuckDuckGo HTML Search (Direct in Desktop, CORS Proxied in Browser)
  try {
    let rawHtml = '';
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(trimmedQuery)}`;
    
    if (!isBrowser) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const resp = await fetch(ddgUrl, {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `q=${encodeURIComponent(trimmedQuery)}`,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
      if (resp.ok) rawHtml = await resp.text();
    } else {
      // Browser mode: Fetch through resilient CORS proxies
      try {
        const proxyUrl1 = `https://api.allorigins.win/raw?url=${encodeURIComponent(ddgUrl)}`;
        const resp1 = await fetch(proxyUrl1);
        if (resp1.ok) rawHtml = await resp1.text();
      } catch {
        // try second proxy
        try {
          const proxyUrl2 = `https://corsproxy.io/?url=${encodeURIComponent(ddgUrl)}`;
          const resp2 = await fetch(proxyUrl2);
          if (resp2.ok) rawHtml = await resp2.text();
        } catch {
          // ignore
        }
      }
    }

    if (rawHtml) {
      const reg = /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      const snippetReg = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

      const snippets: string[] = [];
      let snippetMatch: RegExpExecArray | null;
      while ((snippetMatch = snippetReg.exec(rawHtml)) !== null) {
        snippets.push(snippetMatch[1].replace(/<[^>]+>/g, '').trim());
      }

      let match: RegExpExecArray | null;
      let idx = 0;
      while ((match = reg.exec(rawHtml)) !== null && results.length < maxResults) {
        let rawHref = match[1];
        if (rawHref.startsWith('//')) rawHref = `https:${rawHref}`;
        const url = unwrapDdgRedirect(rawHref);
        const title = match[2].replace(/<[^>]+>/g, '').trim();
        const snippet = snippets[idx] || '';

        if (url.startsWith('http') && isUrlSafe(url)) {
          results.push({ title, url, snippet });
        }
        idx++;
      }
    }
  } catch {
    // Proceed to fallbacks
  }

  // Fallback 2: DuckDuckGo Instant Answer API
  if (results.length === 0) {
    try {
      const instantUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(trimmedQuery)}&format=json&no_redirect=1`;
      const resp = await fetch(instantUrl);
      if (resp.ok) {
        const json = await resp.json();
        if (json.AbstractText) {
          results.push({
            title: json.Heading || trimmedQuery,
            url: json.AbstractURL || 'https://duckduckgo.com',
            snippet: json.AbstractText,
          });
        }
        if (Array.isArray(json.RelatedTopics)) {
          for (const item of json.RelatedTopics) {
            if (item.Text && item.FirstURL && results.length < maxResults) {
              results.push({
                title: item.Text.slice(0, 50),
                url: item.FirstURL,
                snippet: item.Text,
              });
            }
          }
        }
      }
    } catch {
      // Ignore and proceed to Fallback 3
    }
  }

  // Fallback 3: Wikipedia REST Search
  if (results.length === 0) {
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        trimmedQuery
      )}&utf8=&format=json&origin=*`;
      const resp = await fetch(wikiUrl);
      if (resp.ok) {
        const json = await resp.json();
        const searchItems = json.query?.search || [];
        for (const item of searchItems.slice(0, maxResults)) {
          results.push({
            title: item.title,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
            snippet: item.snippet.replace(/<[^>]+>/g, ''),
          });
        }
      }
    } catch {
      // All search strategies attempted
    }
  }

  if (results.length === 0) {
    return { ok: false, content: '', error: `No search results retrieved for: "${trimmedQuery}"` };
  }

  const lines = [`Web Search Results for "${trimmedQuery}":\n`];
  results.forEach((r, i) => {
    lines.push(`${i + 1}. **${r.title}**\n   URL: ${r.url}`);
    if (r.snippet) lines.push(`   ${r.snippet.slice(0, 260)}`);
    lines.push('');
  });

  return {
    ok: true,
    content: lines.join('\n'),
    data: { results },
  };
}

// ── 2. web_extract Tool ──────────────────────────────────────────────────────

export async function webExtract(url: string, maxChars = 4000): Promise<WebToolResult> {
  const trimmedUrl = url.trim();
  if (!trimmedUrl.startsWith('http')) {
    return { ok: false, content: '', error: 'A full http(s) URL is required' };
  }

  const cap = Math.max(500, Math.min(maxChars, 12000));

  try {
    const pageContent = await acquireWebPage(trimmedUrl, 'Auto');

    const formatted = `### ${pageContent.title}\n*Engine Used: ${pageContent.engineUsed} | Latency: ${pageContent.fetchTimeMs}ms*\n\n${pageContent.markdown.slice(0, cap)}`;

    return {
      ok: true,
      content: formatted,
      data: {
        url: trimmedUrl,
        length: pageContent.markdown.length,
        engineUsed: pageContent.engineUsed,
        headings: pageContent.headings,
        tables: pageContent.tables,
        metadata: pageContent.metadata,
      },
    };
  } catch (err) {
    return {
      ok: false,
      content: '',
      error: `Acquisition Engine could not fetch ${trimmedUrl}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ── 3. web_crawl Tool ────────────────────────────────────────────────────────

export async function webCrawl(seedUrl: string, depth = 1): Promise<WebToolResult> {
  const trimmedUrl = seedUrl.trim();
  if (!trimmedUrl.startsWith('http')) {
    return { ok: false, content: '', error: 'A full http(s) seed URL is required' };
  }

  const maxDepth = Math.max(1, Math.min(depth, 2));
  const visited = new Set<string>();
  const collected: string[] = [];

  async function crawlPage(targetUrl: string, currentDepth: number): Promise<void> {
    if (visited.has(targetUrl) || collected.length >= 3) return;
    visited.add(targetUrl);

    try {
      const rawHtml = await fetchUrlText(targetUrl, 6000);
      const { text, links } = htmlToTextAndLinks(rawHtml);

      if (text) {
        collected.push(`[${targetUrl}]\n${text.slice(0, 2000)}`);
      }

      if (currentDepth > 1 && collected.length < 3) {
        for (const link of links.slice(0, 5)) {
          if (!visited.has(link) && isUrlSafe(link)) {
            await crawlPage(link, currentDepth - 1);
          }
        }
      }
    } catch {
      // Ignore individual page fetch failures during crawl
    }
  }

  await crawlPage(trimmedUrl, maxDepth);

  if (collected.length === 0) {
    return { ok: false, content: '', error: `Could not extract content from ${trimmedUrl}` };
  }

  const combined = collected.join('\n\n---\n\n').slice(0, 5000);
  return {
    ok: true,
    content: combined,
    data: { visitedPages: Array.from(visited) },
  };
}
