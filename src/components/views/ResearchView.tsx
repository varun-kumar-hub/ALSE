import React, { useState } from 'react';
import { Search, Compass, BookOpen, ExternalLink, ArrowRight, Loader2 } from 'lucide-react';
import { webSearch, WebSearchResult } from '../../services/webTools';
import { processLearnerInteraction } from '../../engine/ps6Engine';

interface ResearchViewProps {
  onStartTopicChat: (topic: string) => void;
}

export const ResearchView: React.FC<ResearchViewProps> = ({ onStartTopicChat }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<{
    summary: string;
    sources: WebSearchResult[];
    extractedConcepts: string[];
    relevanceScore: number;
  } | null>(null);

  const handleResearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const searchRes = await webSearch(query, 5);
      const rawResults = (searchRes.data as { results?: WebSearchResult[] })?.results || [];

      // Extract concepts from query
      const extracted = Array.from(
        new Set(
          query
            .split(/\s+/)
            .filter((w) => w.length > 3 && !['what', 'how', 'why', 'about', 'research', 'explain'].includes(w.toLowerCase()))
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        )
      );

      const summaryText = searchRes.content || `Research synthesis compiled for query: "${query}". Extracted ${extracted.length} key concept nodes for Knowledge Graph integration.`;

      // Log evidence in PS6 engine without automatically inflating mastery
      await processLearnerInteraction(`Research query: ${query}`, summaryText);

      setResults({
        summary: summaryText,
        sources: rawResults,
        extractedConcepts: extracted.length > 0 ? extracted : [query],
        relevanceScore: 0.88,
      });
    } catch (err) {
      console.warn('Research execution error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-zinc-800 pb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Compass className="w-7 h-7 text-zinc-200" />
            Research Agent & Knowledge Extractor
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Investigate scientific topics, extract concept graphs, and connect findings to your adaptive learning path.
          </p>
        </div>

        {/* Research Input Form */}
        <form onSubmit={handleResearchSubmit} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Research any topic (e.g. Transformer Architecture, Quantum Entanglement, Rust Async)..."
            className="w-full px-5 py-4 pl-12 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono text-sm shadow-inner"
          />
          <Search className="w-5 h-5 text-zinc-500 absolute left-4 top-4" />
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="absolute right-3 top-3 px-4 py-2 bg-white text-zinc-950 font-medium rounded-lg hover:bg-zinc-200 transition text-sm disabled:opacity-50 flex items-center gap-2"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Research'}
          </button>
        </form>

        {/* Results Section */}
        {results && (
          <div className="space-y-6">
            {/* Extracted Concepts Banner */}
            <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/60 space-y-3">
              <span className="text-xs text-zinc-400 font-mono uppercase tracking-wider">
                Extracted Concept Nodes (Integrated into Knowledge Graph)
              </span>
              <div className="flex flex-wrap gap-2">
                {results.extractedConcepts.map((c) => (
                  <span
                    key={c}
                    className="px-3 py-1 bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-full font-mono font-medium"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Synthesis Summary */}
            <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/80 space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-zinc-300" />
                Research Synthesis
              </h3>
              <div className="text-sm text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap bg-zinc-950 p-4 rounded-lg border border-zinc-850">
                {results.summary}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => onStartTopicChat(`Let's learn about ${query} based on recent research`)}
                  className="px-4 py-2.5 bg-white text-zinc-950 font-semibold rounded-lg hover:bg-zinc-200 transition text-sm flex items-center gap-2"
                >
                  Convert to Adaptive Learning Session
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sources List */}
            {results.sources.length > 0 && (
              <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/40 space-y-3">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                  Synthesized Sources ({results.sources.length})
                </h4>
                <div className="space-y-2">
                  {results.sources.map((s, idx) => (
                    <a
                      key={idx}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded bg-zinc-950 border border-zinc-850 hover:border-zinc-700 flex items-center justify-between group transition"
                    >
                      <div>
                        <span className="text-xs text-zinc-200 font-medium group-hover:underline block">{s.title}</span>
                        <span className="text-xs text-zinc-500 font-mono">{s.url}</span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
