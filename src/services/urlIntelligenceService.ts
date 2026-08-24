import { validateAndNormalizeUrl } from './urlValidator';
import { acquireWebPage } from './webAcquisitionEngine';
import { htmlToTextAndLinks } from './webTools';
import { defaultWebPipeline } from './webSearchProvider';

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

    // 1. Search Engine Index Discovery (site:domain)
    onProgress?.(`✦ Searching search engine index for site:${domain}...`);
    try {
      const searchRes = await defaultWebPipeline.executeSearch(`site:${domain}`, 8);
      if (searchRes.ok && searchRes.results.length > 0) {
        for (const r of searchRes.results) {
          if (!visited.has(r.url) && r.url.startsWith(origin)) {
            queue.push({ url: r.url, depth: 1, parent: 'Search Index' });
            resources.push({
              url: r.url,
              depth: 1,
              type: 'Web Page',
              httpStatus: 200,
              title: r.title,
              snippet: r.snippet,
              discoveredFrom: 'Search Engine Index',
            });
            sources.push({ title: r.title, url: r.url, domain });
          }
        }
      }
    } catch {
      // Ignore search fallback errors
    }

    // 2. Discover robots.txt & sitemap.xml
    onProgress?.(`✦ Scanning sitemaps & robots.txt...`);
    await this.discoverSitemapAndRobots(origin, queue, visited, resources);

    // 3. Discover OpenAPI/Swagger specs
    onProgress?.(`✦ Checking public API specifications...`);
    await this.discoverApiEndpoints(origin, resources);

    // 4. Crawl Same-Origin Queue
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

        const links = pageContent.links && pageContent.links.length > 0
          ? pageContent.links
          : htmlToTextAndLinks(pageContent.markdown, current.url).links;

        resources.push({
          url: current.url,
          parentUrl: current.parent,
          depth: current.depth,
          type: this.classifyResource(current.url, 'text/html'),
          httpStatus: 200,
          title,
          snippet: pageContent.metadata?.description || pageContent.markdown.slice(0, 250),
        });

        if (!sources.some((s) => s.url === current.url)) {
          sources.push({
            title,
            url: current.url,
            domain,
          });
        }

        // Extract API & App Routes declared in scripts or page content
        const apiRouteMatches = pageContent.markdown.matchAll(/["'](\/(?:api|v1|v2|auth|student|faculty|portal|courses|results|attendance|fees|registration)[^"'\s>]+)["']/gi);
        for (const m of apiRouteMatches) {
          const route = m[1];
          try {
            const fullUrl = new URL(route, origin).toString();
            if (!resources.some((r) => r.url === fullUrl)) {
              resources.push({
                url: fullUrl,
                depth: current.depth + 1,
                type: route.includes('/api/') ? 'API' : 'Web Page',
                httpStatus: 200,
                title: `Discovered Route: ${route}`,
                discoveredFrom: current.url,
              });
              if (!visited.has(fullUrl)) {
                queue.push({ url: fullUrl, depth: current.depth + 1, parent: current.url });
              }
            }
          } catch {}
        }

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
      toolsUsed: ['URL Intelligence', 'Search Index Grounding', 'Sitemap Parser', 'JavaScript Endpoint Extractor'],
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
      const page = await acquireWebPage(sitemapUrl);
      if (page && page.markdown.length > 10) {
        resources.push({
          url: sitemapUrl,
          depth: 0,
          type: 'Sitemap',
          httpStatus: 200,
          title: 'XML Sitemap',
        });
        const locMatches = page.markdown.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/gi);
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
        const page = await acquireWebPage(url);
        if (page && page.markdown.length > 10) {
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
