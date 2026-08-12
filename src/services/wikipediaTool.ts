/**
 * Wikipedia & Wikidata Knowledge Retrieval Tool
 * Provides zero-hallucination factual grounding for biographies, movies, historical facts, and entities.
 */

export interface WikipediaSearchResult {
  title: string;
  snippet: string;
  pageid: number;
}

export interface WikipediaPageSummary {
  title: string;
  extract: string;
  description?: string;
  contentUrl?: string;
  thumbnailUrl?: string;
}

/**
 * Search Wikipedia for entity query
 */
export async function searchWikipedia(query: string, limit = 3): Promise<WikipediaSearchResult[]> {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    query
  )}&utf8=&format=json&origin=*`;

  const response = await fetch(searchUrl);
  if (!response.ok) return [];

  const data = await response.json();
  const searchItems = data.query?.search || [];

  return searchItems.slice(0, limit).map((item: { title: string; snippet: string; pageid: number }) => ({
    title: item.title,
    snippet: item.snippet.replace(/<[^>]+>/g, ''), // Strip HTML tags
    pageid: item.pageid,
  }));
}

/**
 * Fetch canonical Wikipedia page summary
 */
export async function fetchWikipediaSummary(title: string): Promise<WikipediaPageSummary | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    return {
      title: data.title || title,
      extract: data.extract || '',
      description: data.description,
      contentUrl: data.content_urls?.desktop?.page,
      thumbnailUrl: data.thumbnail?.source,
    };
  } catch (err) {
    console.warn(`Wikipedia fetch error for ${title}:`, err);
    return null;
  }
}

/**
 * Full Fact-Grounding Tool: Search + Fetch Exact Summary
 */
export async function getFactGroundedSummary(query: string): Promise<string> {
  try {
    const searchResults = await searchWikipedia(query, 2);
    if (searchResults.length === 0) return '';

    const primaryTitle = searchResults[0].title;
    const summary = await fetchWikipediaSummary(primaryTitle);

    if (!summary || !summary.extract) return '';

    let resultMarkdown = `### Wikipedia Grounded Facts: ${summary.title}\n`;
    if (summary.description) {
      resultMarkdown += `*${summary.description}*\n\n`;
    }
    resultMarkdown += `${summary.extract}\n\n`;
    if (summary.contentUrl) {
      resultMarkdown += `**Source**: [${summary.title}](${summary.contentUrl})`;
    }

    return resultMarkdown;
  } catch (err) {
    console.warn('Fact grounding error:', err);
    return '';
  }
}
