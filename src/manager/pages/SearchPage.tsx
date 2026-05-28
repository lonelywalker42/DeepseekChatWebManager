import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { sendMessage } from '../../shared/messaging';
import { useAppStore } from '../stores/app-store';
import { Search, SearchX } from 'lucide-react';
import type { Topic, Session } from '../../shared/types';

interface SearchResult {
  session: Session;
  titleMatch: boolean;
  summaryMatch: boolean;
  messageMatches: { index: number; snippet: string }[];
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const showToast = useAppStore((s) => s.showToast);

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [topics, setTopics] = useState<Record<string, Topic>>({});
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        setResults([]);
        setSearched(false);
        return;
      }

      setLoading(true);
      setSearched(true);

      const res = await sendMessage<SearchResult[]>({
        type: 'SEARCH',
        payload: { query: trimmed },
      });

      if (res.ok) {
        setResults(res.data);

        // Fetch topics for displaying topic names
        const topicIds = new Set(res.data.map((r) => r.session.topicId));
        const topicsMap: Record<string, Topic> = {};
        await Promise.all(
          Array.from(topicIds).map(async (topicId) => {
            const topicRes = await sendMessage<Topic>({
              type: 'GET_TOPIC',
              payload: { id: topicId },
            });
            if (topicRes.ok && topicRes.data) {
              topicsMap[topicId] = topicRes.data;
            }
          }),
        );
        setTopics(topicsMap);
      } else {
        showToast(res.error, 'error');
      }

      setLoading(false);
    },
    [showToast],
  );

  // Search on initial load if query param exists
  useEffect(() => {
    const initialQuery = searchParams.get('q');
    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search on typing
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      const trimmed = query.trim();
      if (trimmed) {
        setSearchParams({ q: trimmed }, { replace: true });
        performSearch(trimmed);
      } else {
        setResults([]);
        setSearched(false);
        setSearchParams({}, { replace: true });
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const highlightSnippet = (text: string, searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return text;

    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-4">Search</h1>

      {/* Search input */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all sessions and messages..."
            className="w-full pl-10 pr-4 py-3 text-base border border-slate-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                       placeholder:text-slate-400"
            autoFocus
          />
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card-static p-4">
              <div className="skeleton h-5 w-3/4 mb-2 rounded" />
              <div className="flex gap-2 mb-2">
                <div className="skeleton h-5 w-20 rounded-full" />
                <div className="skeleton h-5 w-24 rounded" />
              </div>
              <div className="skeleton h-4 w-full rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state - no results */}
      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <SearchX className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-500 mb-1">No results found</h3>
          <p className="text-sm text-slate-400">
            No matches for &ldquo;{query.trim()}&rdquo;. Try a different search term.
          </p>
        </div>
      )}

      {/* Initial state */}
      {!loading && !searched && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-500 mb-1">Search your conversations</h3>
          <p className="text-sm text-slate-400">
            Type a search query to find sessions and messages.
          </p>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-slate-500 mb-2">
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </div>

          {results.map((result) => {
            const topic = topics[result.session.topicId];
            const snippet =
              result.messageMatches.length > 0
                ? result.messageMatches[0].snippet
                : result.session.summary || '';

            return (
              <Link
                key={result.session.id}
                to={`/session/${result.session.id}`}
                className="block card p-4"
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-sm text-slate-900">
                    {highlightSnippet(result.session.title, query)}
                  </h3>
                  {result.titleMatch && (
                    <span className="badge-info ml-2 flex-shrink-0">title match</span>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  {topic && (
                    <span className="badge-muted">{topic.title}</span>
                  )}
                  <span className="text-xs text-slate-400">
                    {new Date(result.session.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-slate-400">
                    {result.session.messages?.length ?? 0} messages
                  </span>
                </div>

                {snippet && (
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {highlightSnippet(snippet, query)}
                  </p>
                )}

                {result.messageMatches.length > 1 && (
                  <p className="text-xs text-slate-400 mt-1">
                    +{result.messageMatches.length - 1} more match
                    {result.messageMatches.length - 1 !== 1 ? 'es' : ''} in messages
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
