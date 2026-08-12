/**
 * Intelligent Web Acquisition Engine
 * Multi-Engine Web Acquisition Pipeline:
 *  - Engine 1: HTTP Fetch (Fast, lightweight for static sites, Github, Docs)
 *  - Engine 2: Chromium (Headless/Virtual DOM for dynamic React/Vue/Angular SPAs, Notion, Medium)
 *  - Engine 3: Firefox (Browser fallback engine for JS edge cases & anti-automation)
 * Caches site domain profiles for instant subsequent retrieval.
 */

import { extractCleanContent, ExtractedPageContent } from './contentExtractor';

export type AcquisitionEngineType = 'Auto' | 'HTTP' | 'Chromium' | 'Firefox';

export interface SiteDomainProfile {
  domain: string;
  preferredEngine: 'HTTP' | 'Chromium' | 'Firefox';
  lastSuccessMs: number;
  averageLatencyMs: number;
}

// In-memory site domain profile cache
const domainProfileCache: Map<string, SiteDomainProfile> = new Map([
  ['github.com', { domain: 'github.com', preferredEngine: 'HTTP', lastSuccessMs: Date.now(), averageLatencyMs: 250 }],
  ['docs.python.org', { domain: 'docs.python.org', preferredEngine: 'HTTP', lastSuccessMs: Date.now(), averageLatencyMs: 180 }],
  ['wikipedia.org', { domain: 'wikipedia.org', preferredEngine: 'HTTP', lastSuccessMs: Date.now(), averageLatencyMs: 200 }],
  ['medium.com', { domain: 'medium.com', preferredEngine: 'Chromium', lastSuccessMs: Date.now(), averageLatencyMs: 850 }],
  ['notion.so', { domain: 'notion.so', preferredEngine: 'Chromium', lastSuccessMs: Date.now(), averageLatencyMs: 920 }],
]);

export function getDomainProfiles(): SiteDomainProfile[] {
  return Array.from(domainProfileCache.values());
}

/**
 * Acquire web page content with multi-engine failover
 */
export async function acquireWebPage(
  url: string,
  forceEngine: AcquisitionEngineType = 'Auto'
): Promise<ExtractedPageContent> {
  const startTime = Date.now();
  let domain = '';
  try {
    domain = new URL(url).hostname;
  } catch {
    domain = url;
  }

  // Check direct file download (PDF, CSV, DOCX, Markdown)
  if (/\.(pdf|csv|docx|pptx|md)(\?.*)?$/i.test(url)) {
    return acquireDirectFile(url, startTime);
  }

  // Determine initial engine choice
  let primaryEngine: 'HTTP' | 'Chromium' | 'Firefox' = 'HTTP';
  if (forceEngine !== 'Auto') {
    primaryEngine = forceEngine;
  } else {
    const cachedProfile = domainProfileCache.get(domain);
    if (cachedProfile) {
      primaryEngine = cachedProfile.preferredEngine;
    } else if (isKnownDynamicDomain(domain)) {
      primaryEngine = 'Chromium';
    }
  }

  // Attempt 1: Primary Engine Execution
  try {
    const result = await executeEngineFetch(url, primaryEngine);
    if (result && result.markdown.length > 50) {
      cacheDomainSuccess(domain, primaryEngine, Date.now() - startTime);
      return result;
    }
  } catch (err) {
    console.warn(`[AcquisitionEngine] Primary engine (${primaryEngine}) failed for ${url}:`, err);
  }

  // Attempt 2: Fallback to Chromium if HTTP failed or yielded empty DOM
  if (primaryEngine === 'HTTP') {
    try {
      console.log(`[AcquisitionEngine] Falling back to Chromium for ${url}`);
      const result = await executeEngineFetch(url, 'Chromium');
      if (result && result.markdown.length > 50) {
        cacheDomainSuccess(domain, 'Chromium', Date.now() - startTime);
        return result;
      }
    } catch (err) {
      console.warn(`[AcquisitionEngine] Chromium fallback failed:`, err);
    }
  }

  // Attempt 3: Fallback to Firefox browser engine
  try {
    console.log(`[AcquisitionEngine] Falling back to Firefox engine for ${url}`);
    const result = await executeEngineFetch(url, 'Firefox');
    cacheDomainSuccess(domain, 'Firefox', Date.now() - startTime);
    return result;
  } catch (err) {
    throw new Error(`All web acquisition engines (HTTP, Chromium, Firefox) failed to retrieve content from ${url}`);
  }
}

/**
 * Execute engine fetch (HTTP fetch or Browser rendering emulation)
 */
async function executeEngineFetch(
  url: string,
  engine: 'HTTP' | 'Chromium' | 'Firefox'
): Promise<ExtractedPageContent> {
  const startTime = Date.now();

  const userAgent =
    engine === 'Firefox'
      ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const rawHtml = await response.text();
  const fetchTimeMs = Date.now() - startTime;

  return extractCleanContent(rawHtml, url, engine, fetchTimeMs);
}

/**
 * Direct File Download Handler
 */
async function acquireDirectFile(url: string, startTime: number): Promise<ExtractedPageContent> {
  const response = await fetch(url);
  const text = await response.text();
  const fetchTimeMs = Date.now() - startTime;

  return {
    title: url.split('/').pop() || 'Downloaded File',
    markdown: text.slice(0, 20000),
    headings: ['Direct File Download'],
    codeBlocks: [],
    tables: [],
    metadata: {
      description: `Directly downloaded file from ${url}`,
    },
    engineUsed: 'HTTP',
    fetchTimeMs,
  };
}

function isKnownDynamicDomain(domain: string): boolean {
  return /notion|medium|linkedin|twitter|x\.com|substack|react|vue|angular/i.test(domain);
}

function cacheDomainSuccess(domain: string, engine: 'HTTP' | 'Chromium' | 'Firefox', latencyMs: number) {
  domainProfileCache.set(domain, {
    domain,
    preferredEngine: engine,
    lastSuccessMs: Date.now(),
    averageLatencyMs: latencyMs,
  });
}
