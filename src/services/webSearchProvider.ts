import { WebSearchResult } from './webTools';

export interface ToolExecutionLog {
  tool: string;
  provider: string;
  query: string;
  status: 'success' | 'error';
  resultCount?: number;
  durationMs: number;
  error?: string;
}

export interface WebSearchPipelineResult {
  ok: boolean;
  query: string;
  results: WebSearchResult[];
  toolsUsed: string[];
  sourcesUsed: { title: string; url?: string; domain?: string; type?: string }[];
  contextText: string;
  logs: ToolExecutionLog[];
}

export interface WebSearchProvider {
  id: string;
  name: string;
  search(query: string, limit?: number): Promise<WebSearchResult[]>;
}

export function unwrapDdgRedirect(url: string): string {
  if (!url) return url;
  if (/duckduckgo\.com\/l\/\?/i.test(url) || url.includes('/l/?uddg=')) {
    try {
      const parsedUrl = new URL(url.startsWith('//') ? `https:${url}` : url);
      const uddg = parsedUrl.searchParams.get('uddg');
      if (uddg) return decodeURIComponent(uddg);
    } catch {}
  }
  return url;
}

export class DuckDuckGoSearchProvider implements WebSearchProvider {
  id = 'duckduckgo';
  name = 'DuckDuckGo';

  async search(query: string, limit = 5): Promise<WebSearchResult[]> {
    let trimmedQuery = query
      .replace(/[?#$&*!]+/g, ' ')
      .replace(/\b(can you|try again|please|list all|what is|tell me|explain this|show me)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!trimmedQuery || trimmedQuery.length < 3) return [];

    if (trimmedQuery.startsWith('site:')) {
      trimmedQuery = trimmedQuery.replace(/^site:/i, '').replace(/[\/:]+/g, ' ') + ' portal endpoints';
    }

    const isBrowser = typeof window !== 'undefined' && !('__TAURI_INTERNALS__' in window);
    const results: WebSearchResult[] = [];

    let rawHtml = '';
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(trimmedQuery)}`;

    if (!isBrowser) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      try {
        const resp = await fetch(ddgUrl, {
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `q=${encodeURIComponent(trimmedQuery)}`,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));
        if (resp.ok) rawHtml = await resp.text();
      } catch {
        // Continue to fallback
      }
    } else {
      try {
        const proxyDdg = `/proxy/ddg/html/?q=${encodeURIComponent(trimmedQuery)}`;
        const resp = await fetch(proxyDdg);
        if (resp.ok) rawHtml = await resp.text();
      } catch {
        // Fallback
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
      while ((match = reg.exec(rawHtml)) !== null && results.length < limit) {
        let rawHref = match[1];
        if (rawHref.startsWith('//')) rawHref = `https:${rawHref}`;
        rawHref = unwrapDdgRedirect(rawHref);
        const title = match[2].replace(/<[^>]+>/g, '').trim();
        const snippet = snippets[idx] || '';

        if (rawHref.startsWith('http')) {
          results.push({ title, url: rawHref, snippet });
        }
        idx++;
      }
    }

    return results;
  }
}

export class WikipediaSearchProvider implements WebSearchProvider {
  id = 'wikipedia';
  name = 'Wikipedia API';

  async search(query: string, limit = 5): Promise<WebSearchResult[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const results: WebSearchResult[] = [];
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        trimmedQuery
      )}&utf8=&format=json&origin=*`;
      const resp = await fetch(wikiUrl);
      if (resp.ok) {
        const json = await resp.json();
        const searchItems = json.query?.search || [];
        for (const item of searchItems.slice(0, limit)) {
          results.push({
            title: item.title,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
            snippet: item.snippet.replace(/<[^>]+>/g, '').trim(),
          });
        }
      }
    } catch {
      // Ignore fallback
    }

    return results;
  }
}

export class WebToolPipeline {
  private providers: WebSearchProvider[] = [
    new DuckDuckGoSearchProvider(),
    new WikipediaSearchProvider(),
  ];

  async executeSearch(query: string, limit = 5): Promise<WebSearchPipelineResult> {
    const logs: ToolExecutionLog[] = [];
    let results: WebSearchResult[] = [];
    let successfulProviderName = '';

    for (const provider of this.providers) {
      const pStart = Date.now();
      try {
        const res = await provider.search(query, limit);
        const duration = Date.now() - pStart;
        if (res.length > 0) {
          results = res;
          successfulProviderName = provider.name;
          logs.push({
            tool: 'web_search',
            provider: provider.name,
            query,
            status: 'success',
            resultCount: res.length,
            durationMs: duration,
          });
          break;
        } else {
          logs.push({
            tool: 'web_search',
            provider: provider.name,
            query,
            status: 'error',
            durationMs: duration,
            error: 'No results returned',
          });
        }
      } catch (err) {
        logs.push({
          tool: 'web_search',
          provider: provider.name,
          query,
          status: 'error',
          durationMs: Date.now() - pStart,
          error: String(err),
        });
      }
    }

    if (results.length === 0) {
      return {
        ok: false,
        query,
        results: [],
        toolsUsed: ['Web Search'],
        sourcesUsed: [],
        contextText: '',
        logs,
      };
    }

    const sourcesUsed = results.map((r) => {
      let domain = 'web';
      try {
        domain = new URL(r.url).hostname.replace('www.', '');
      } catch {
        // fallback
      }
      return {
        title: r.title,
        url: r.url,
        domain,
        type: domain.includes('wikipedia') ? 'wiki' : 'web',
      };
    });

    const contextText = results
      .map((r, idx) => `[Source ${idx + 1}: ${r.title}] (${r.url})\n${r.snippet}`)
      .join('\n\n');

    return {
      ok: true,
      query,
      results,
      toolsUsed: [`Web Search (${successfulProviderName})`],
      sourcesUsed,
      contextText,
      logs,
    };
  }
}

export const defaultWebPipeline = new WebToolPipeline();
