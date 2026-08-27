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
 * Fetch full plain-text extract of a Wikipedia page (includes sections like Filmography, Career, etc.)
 */
export async function fetchWikipediaFullExtract(title: string, maxChars = 8000): Promise<string> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(
    title
  )}&format=json&origin=*`;

  try {
    const response = await fetch(url);
    if (!response.ok) return '';

    const data = await response.json();
    const pages = data.query?.pages || {};
    const pageId = Object.keys(pages)[0];
    if (!pageId || pageId === '-1') return '';

    const extract: string = pages[pageId].extract || '';
    if (!extract) return '';

    if (extract.length > maxChars) {
      const filmoMatch = extract.match(/==\s*(Filmography|Career|Discography|Works|Selected filmography|Films)\s*==[\s\S]*/i);
      if (filmoMatch) {
        const lead = extract.slice(0, 2000);
        const section = filmoMatch[0].slice(0, maxChars - 2000);
        return `${lead}\n\n${section}`;
      }
      return extract.slice(0, maxChars);
    }
    return extract;
  } catch (err) {
    console.warn(`Wikipedia full extract error for ${title}:`, err);
    return '';
  }
}

/**
 * Full Fact-Grounding Tool: Search + Fetch Exact Summary & Extended Context
 */
export async function getFactGroundedSummary(query: string): Promise<string> {
  try {
    const searchResults = await searchWikipedia(query, 3);
    if (searchResults.length === 0) return '';

    const primaryTitle = searchResults[0].title;
    const summary = await fetchWikipediaSummary(primaryTitle);

    if (!summary || !summary.extract) return '';

    let resultMarkdown = `### Wikipedia Grounded Facts: ${summary.title}\n`;
    if (summary.description) {
      resultMarkdown += `*${summary.description}*\n\n`;
    }
    resultMarkdown += `${summary.extract}\n\n`;

    const isListOrFilmographyRequest = /\b(movie|movies|film|films|filmography|acted|actor|actress|discography|songs|albums|works|list|roles)\b/i.test(query);

    if (isListOrFilmographyRequest) {
      // 1. Search for a dedicated filmography or works page (e.g. "N. T. Rama Rao Jr. filmography")
      const filmoSearch = await searchWikipedia(`${primaryTitle} filmography`, 3);
      const filmoPage = filmoSearch.find(
        (r) =>
          r.title.toLowerCase().includes('filmography') ||
          r.title.toLowerCase().includes('discography') ||
          r.title.toLowerCase().includes('works')
      );

      if (filmoPage && filmoPage.title !== primaryTitle) {
        const filmoExtract = await fetchWikipediaFullExtract(filmoPage.title, 6000);
        if (filmoExtract) {
          resultMarkdown += `### Detailed Filmography Context (${filmoPage.title}):\n${filmoExtract}\n\n`;
        }
      } else {
        // 2. Fetch full text extract of primary page to capture Filmography/Career sections
        const fullExtract = await fetchWikipediaFullExtract(primaryTitle, 6000);
        if (fullExtract && fullExtract.length > summary.extract.length) {
          resultMarkdown += `### Detailed Career & Works Context:\n${fullExtract}\n\n`;
        }
      }
    }

    if (summary.contentUrl) {
      resultMarkdown += `**Source**: [${summary.title}](${summary.contentUrl})`;
    }

    return resultMarkdown;
  } catch (err) {
    console.warn('Fact grounding error:', err);
    return '';
  }
}

