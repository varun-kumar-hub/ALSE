import { validateAndNormalizeUrl } from './urlValidator';
import { acquireWebPage } from './webAcquisitionEngine';

export type ResourceType =
  | 'Web Page'
  | 'API'
  | 'API Documentation'
  | 'JSON'
  | 'Document'
  | 'Feed'
  | 'Sitemap'
  | 'External Reference'
  | 'Protected Resource'
  | 'Failed Resource';

export interface DiscoveredResource {
  url: string;
  parentUrl?: string;
  depth: number;
  type: ResourceType;
  httpStatus: number;
  title?: string;
  snippet?: string;
  discoveredFrom?: string;
}

export interface CrawlStatistics {
  pagesScanned: number;
  resourcesDiscovered: number;
  apisDiscovered: number;
  documentsDiscovered: number;
  protectedCount: number;
  failedCount: number;
  durationMs: number;
}

export interface URLResearchDataset {
  targetUrl: string;
  domain: string;
  stats: CrawlStatistics;
  resources: DiscoveredResource[];
  siteMapTree: Record<string, string[]>;
  publicApis: DiscoveredResource[];
  protectedResources: DiscoveredResource[];
  contextText: string;
  sources: { title: string; url: string; domain: string }[];
  toolsUsed: string[];
}

export interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  concurrency?: number;
  requestTimeoutMs?: number;
  sameOrigin?: boolean;
}

export class URLIntelligenceEngine {
  async runDeepResearch(
    startUrl: string,
    options: CrawlOptions = {},
    onProgress?: (msg: string) => void
  ): Promise<URLResearchDataset> {
    const startTime = Date.now();
    const validated = validateAndNormalizeUrl(startUrl);

    if (!validated.valid || !validated.normalizedUrl || !validated.domain) {
      throw new Error(`Invalid URL: ${validated.reason || 'Could not parse target URL'}`);
    }

    const targetUrl = validated.normalizedUrl;
    const domain = validated.domain;
    const origin = new URL(targetUrl).origin;

    const maxPages = options.maxPages ?? 30;
    const maxDepth = options.maxDepth ?? 3;

    onProgress?.(`✦ Validated URL: ${domain}`);

    const visited = new Set<string>();
    const queue: { url: string; depth: number; parent?: string }[] = [{ url: targetUrl, depth: 0 }];

    const resources: DiscoveredResource[] = [];
    const siteMapTree: Record<string, string[]> = {};
    const sources: { title: string; url: string; domain: string }[] = [];

    // 1. Discover robots.txt & sitemap.xml
    onProgress?.(`✦ Scanning sitemaps & robots.txt...`);
    await this.discoverSitemapAndRobots(origin, queue, visited, resources);

    // 2. Discover OpenAPI/Swagger specs
    onProgress?.(`✦ Checking public API specifications...`);
    await this.discoverApiEndpoints(origin, resources);

    // 3. Crawl Same-Origin BFS Queue
    onProgress?.(`✦ Crawling website structure (max ${maxPages} pages)...`);
    
    while (queue.length > 0 && visited.size < maxPages) {
      const current = queue.shift()!;
      if (visited.has(current.url)) continue;
      visited.add(current.url);

      onProgress?.(`✦ Processing page (${visited.size}/${maxPages}): ${current.url}`);

      try {
        const isExternal = !current.url.startsWith(origin);
        if (isExternal) {
          resources.push({
            url: current.url,
            parentUrl: current.parent,
            depth: current.depth,
            type: 'External Reference',
            httpStatus: 200,
            title: current.url,
          });
          continue;
        }

        const pageContent = await acquireWebPage(current.url);
        const title = pageContent.title || current.url;

        const links: string[] = [];
        const linkMatches = pageContent.markdown.matchAll(/\((https?:\/\/[^\s)]+)\)/gi);
        for (const m of linkMatches) {
          if (m[1]) links.push(m[1]);
        }

        resources.push({
          url: current.url,
          parentUrl: current.parent,
          depth: current.depth,
          type: this.classifyResource(current.url, 'text/html'),
          httpStatus: 200,
          title,
          snippet: pageContent.metadata?.description || pageContent.markdown.slice(0, 200),
        });

        sources.push({
          title,
          url: current.url,
          domain,
        });

        // Record child links for site map
        siteMapTree[current.url] = links;

        if (current.depth < maxDepth) {
          for (const link of links) {
            if (!visited.has(link) && link.startsWith(origin)) {
              queue.push({ url: link, depth: current.depth + 1, parent: current.url });
            }
          }
        }
      } catch (err: unknown) {
        const errMsg = String(err);
        const isProtected = errMsg.includes('401') || errMsg.includes('403');
        const resType: ResourceType = isProtected ? 'Protected Resource' : 'Failed Resource';

        resources.push({
          url: current.url,
          parentUrl: current.parent,
          depth: current.depth,
          type: resType,
          httpStatus: isProtected ? 403 : 500,
          title: `[${resType}] ${current.url}`,
          snippet: errMsg,
        });
      }
    }

    const durationMs = Date.now() - startTime;
    onProgress?.(`✦ Completed URL intelligence scan in ${(durationMs / 1000).toFixed(1)}s`);

    // Compile statistics
    const stats: CrawlStatistics = {
      pagesScanned: visited.size,
      resourcesDiscovered: resources.length,
      apisDiscovered: resources.filter((r) => r.type === 'API' || r.type === 'API Documentation').length,
      documentsDiscovered: resources.filter((r) => r.type === 'Document').length,
      protectedCount: resources.filter((r) => r.type === 'Protected Resource').length,
      failedCount: resources.filter((r) => r.type === 'Failed Resource').length,
      durationMs,
    };

    const publicApis = resources.filter((r) => r.type === 'API' || r.type === 'API Documentation');
    const protectedResources = resources.filter((r) => r.type === 'Protected Resource');

    // Build structured context text for AI model
    const contextText = this.buildDatasetContext(startUrl, domain, stats, resources);

    return {
      targetUrl,
      domain,
      stats,
      resources,
      siteMapTree,
      publicApis,
      protectedResources,
      contextText,
      sources,
      toolsUsed: ['URL Intelligence', 'Sitemap Parser', 'HTML Content Extractor'],
    };
  }

  private async discoverSitemapAndRobots(
    origin: string,
    queue: { url: string; depth: number; parent?: string }[],
    visited: Set<string>,
    resources: DiscoveredResource[]
  ): Promise<void> {
    const sitemapUrl = `${origin}/sitemap.xml`;
    try {
      const resp = await fetch(sitemapUrl, { method: 'GET' });
      if (resp.ok) {
        const xmlText = await resp.text();
        resources.push({
          url: sitemapUrl,
          depth: 0,
          type: 'Sitemap',
          httpStatus: 200,
          title: 'XML Sitemap',
        });
        const locMatches = xmlText.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/gi);
        for (const m of locMatches) {
          if (m[1] && !visited.has(m[1]) && m[1].startsWith(origin)) {
            queue.push({ url: m[1], depth: 1, parent: sitemapUrl });
          }
        }
      }
    } catch {
      // Ignore if no sitemap
    }
  }

  private async discoverApiEndpoints(origin: string, resources: DiscoveredResource[]): Promise<void> {
    const candidateApis = [
      `${origin}/openapi.json`,
      `${origin}/swagger.json`,
      `${origin}/api-docs`,
    ];

    for (const url of candidateApis) {
      try {
        const resp = await fetch(url, { method: 'GET' });
        if (resp.ok) {
          resources.push({
            url,
            depth: 1,
            type: 'API Documentation',
            httpStatus: 200,
            title: `OpenAPI Specification (${url})`,
          });
        }
      } catch {
        // Ignore fallback
      }
    }
  }

  private classifyResource(url: string, contentType: string): ResourceType {
    if (/\.(pdf|doc|docx|csv|xlsx|pptx)$/i.test(url)) return 'Document';
    if (/\.(json|xml)$/i.test(url) || contentType.includes('application/json')) return 'JSON';
    if (url.includes('/api/') || url.includes('/v1/') || url.includes('/v2/')) return 'API';
    if (url.includes('swagger') || url.includes('openapi') || url.includes('/docs')) return 'API Documentation';
    if (url.includes('feed') || url.includes('rss')) return 'Feed';
    return 'Web Page';
  }

  private buildDatasetContext(
    targetUrl: string,
    domain: string,
    stats: CrawlStatistics,
    resources: DiscoveredResource[]
  ): string {
    const lines = [
      `[URL Intelligence Dataset for ${targetUrl}]`,
      `Domain: ${domain}`,
      `Scan Statistics: ${stats.pagesScanned} pages scanned, ${stats.resourcesDiscovered} resources discovered, ${stats.apisDiscovered} APIs, ${stats.protectedCount} protected resources.`,
      `Duration: ${(stats.durationMs / 1000).toFixed(1)}s`,
      `\n--- DISCOVERED PUBLIC RESOURCES ---`,
    ];

    resources.forEach((r, idx) => {
      lines.push(`${idx + 1}. [${r.type}] ${r.title || r.url}`);
      lines.push(`   URL: ${r.url}`);
      if (r.snippet) lines.push(`   Summary: ${r.snippet.slice(0, 150)}`);
    });

    return lines.join('\n');
  }
}

export const urlIntelligenceEngine = new URLIntelligenceEngine();
