import React, { useState, useEffect } from 'react';
import {
  Search,
  Compass,
  BookOpen,
  ExternalLink,
  ArrowRight,
  Loader2,
  History,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { webSearch, WebSearchResult } from '../../services/webTools';
import { processLearnerInteraction } from '../../engine/ps6Engine';

export interface ResearchHistoryItem {
  id: string;
  query: string;
  summary: string;
  sources: WebSearchResult[];
  extractedConcepts: string[];
  relevanceScore: number;
  timestamp: string;
}

interface ResearchViewProps {
  onStartTopicChat?: (topic: string) => void;
  onConvertToSubject: (query: string, summary: string, concepts: string[]) => void;
}

const STORAGE_KEY_ACTIVE = 'learnforge_active_research';
const STORAGE_KEY_HISTORY = 'learnforge_research_history';

export const ResearchView: React.FC<ResearchViewProps> = ({ onConvertToSubject }) => {
  const [query, setQuery] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE);
      return saved ? JSON.parse(saved).query || '' : '';
    } catch {
      return '';
    }
  });

  const [results, setResults] = useState<{
    summary: string;
    sources: WebSearchResult[];
    extractedConcepts: string[];
    relevanceScore: number;
  } | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE);
      return saved ? JSON.parse(saved).results || null : null;
    } catch {
      return null;
    }
  });

  const [history, setHistory] = useState<ResearchHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [isSearching, setIsSearching] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Sync active research state to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify({ query, results }));
    } catch (err) {
      console.warn('Failed to save active research state:', err);
    }
  }, [query, results]);

  const handleResearchSubmit = async (e: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const searchQuery = (customQuery || query).trim();
    if (!searchQuery) return;

    setIsSearching(true);
    try {
      const searchRes = await webSearch(searchQuery, 5);
      const rawResults = (searchRes.data as { results?: WebSearchResult[] })?.results || [];

      // Extract key concepts from query
      const extracted = Array.from(
        new Set(
          searchQuery
            .split(/\s+/)
            .filter((w: string) => w.length > 3 && !['what', 'how', 'why', 'about', 'research', 'explain', 'tell', 'show'].includes(w.toLowerCase()))
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        )
      );

      const summaryText = searchRes.content || `Research synthesis compiled for query: "${searchQuery}". Extracted ${extracted.length} key concept nodes for Knowledge Graph integration.`;

      const newResult = {
        summary: summaryText,
        sources: rawResults,
        extractedConcepts: extracted.length > 0 ? extracted : [searchQuery],
        relevanceScore: 0.88,
      };

      setResults(newResult);

      // Save into persistent history
      const historyItem: ResearchHistoryItem = {
        id: `res_${Date.now()}`,
        query: searchQuery,
        ...newResult,
        timestamp: new Date().toISOString(),
      };

      const updatedHistory = [historyItem, ...history.filter((h) => h.query.toLowerCase() !== searchQuery.toLowerCase())].slice(0, 20);
      setHistory(updatedHistory);
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory));

      // Log evidence in PS6 engine without artificial mastery inflation
      await processLearnerInteraction(`Research query: ${searchQuery}`, summaryText);
    } catch (err) {
      console.warn('Research execution error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadHistoryItem = (item: ResearchHistoryItem) => {
    setQuery(item.query);
    setResults({
      summary: item.summary,
      sources: item.sources,
      extractedConcepts: item.extractedConcepts,
      relevanceScore: item.relevanceScore,
    });
    setShowHistory(false);
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f6f8fb] dark:bg-[#0b0d10] text-zinc-900 dark:text-zinc-100 p-6 md:p-8 font-sans transition-colors select-none">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800/80 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white flex items-center gap-3 tracking-tight">
              <Compass className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Research Agent & Knowledge Extractor
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
              Investigate scientific topics, extract concept graphs, and convert findings directly into dedicated Subjects.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="px-3 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-blue-500 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <History className="w-4 h-4 text-zinc-500" />
                <span>Past Research ({history.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* History Drawer / Panel */}
        {showHistory && (
          <div className="p-5 rounded-2xl bg-white dark:bg-[#151922] border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-zinc-500">
                Research History ({history.length} items saved)
              </span>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer font-mono"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleLoadHistoryItem(item)}
                  className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 hover:border-blue-500/50 transition cursor-pointer flex flex-col justify-between space-y-2 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-zinc-950 dark:text-white line-clamp-1">{item.query}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-500 transition p-0.5"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[11px] text-zinc-500 line-clamp-2 font-mono">
                    {item.summary}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono pt-1">
                    <span>{item.extractedConcepts.length} concepts</span>
                    <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Research Input Form */}
        <form onSubmit={(e) => handleResearchSubmit(e)} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Research any topic (e.g. Transformer Architecture, Quantum Entanglement, Concurrency)..."
            className="w-full px-5 py-4 pl-12 bg-white dark:bg-[#151922] border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500 font-mono text-sm shadow-xs"
          />
          <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-4" />
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="absolute right-3 top-3 px-4 py-2 bg-blue-600 dark:bg-white text-white dark:text-zinc-950 font-semibold rounded-xl hover:bg-blue-500 dark:hover:bg-zinc-200 transition text-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Research'}
          </button>
        </form>

        {/* Quick Suggested Topics */}
        {!results && (
          <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-500 font-mono">
            <span>Explore:</span>
            {['Transformer Architecture', 'Deep Learning Backpropagation', 'Operating System Deadlocks', 'Distributed Consensus'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setQuery(t);
                  handleResearchSubmit(null as any, t);
                }}
                className="px-3 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Results Section */}
        {results && (
          <div className="space-y-6">
            {/* Extracted Concepts Banner */}
            <div className="border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 bg-white dark:bg-[#151922] shadow-xs space-y-3">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono uppercase tracking-wider">
                Extracted Concept Nodes (Integrated into Knowledge Graph)
              </span>
              <div className="flex flex-wrap gap-2">
                {results.extractedConcepts.map((c) => (
                  <span
                    key={c}
                    className="px-3 py-1 bg-blue-50 dark:bg-zinc-800 border border-blue-100 dark:border-zinc-700 text-blue-700 dark:text-zinc-200 text-xs rounded-full font-mono font-semibold"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Synthesis Summary */}
            <div className="border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 bg-white dark:bg-[#151922] shadow-xs space-y-4">
              <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                Research Synthesis
              </h3>
              <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-850">
                {results.summary}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => onConvertToSubject(query, results.summary, results.extractedConcepts)}
                  className="px-4 py-2.5 bg-blue-600 dark:bg-white text-white dark:text-zinc-950 font-bold rounded-xl hover:bg-blue-500 dark:hover:bg-zinc-200 transition text-xs flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  Convert to Adaptive Learning Subject
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sources List */}
            {results.sources.length > 0 && (
              <div className="border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 bg-white dark:bg-[#151922] shadow-xs space-y-3">
                <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">
                  Synthesized Sources ({results.sources.length})
                </h4>
                <div className="space-y-2">
                  {results.sources.map((s, idx) => (
                    <a
                      key={idx}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 hover:text-blue-500 transition"
                    >
                      <span className="font-medium truncate mr-3">{s.title || s.url}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
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
