import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { sendMessage } from '../../shared/messaging';
import { useAppStore } from '../stores/app-store';
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
      <h1 className="text-xl font-bold text-gray-900 mb-4">Search</h1>

      {/* Search input */}
      <div className="mb-6">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all sessions and messages..."
            className="w-full pl-10 pr-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-8">
          <div className="text-gray-500 text-sm">Searching...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && searched && results.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500 text-sm">
            No results found for &ldquo;{query.trim()}&rdquo;
          </div>
        </div>
      )}

      {/* Initial state */}
      {!loading && !searched && (
        <div className="text-center py-8">
          <div className="text-gray-400 text-sm">
            Type a search query to find sessions and messages.
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-gray-500 mb-2">
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </div>

          {results.map((result) => {
            const topic = topics[result.session.topicId];
            // Find the best snippet to display
            const snippet =
              result.messageMatches.length > 0
                ? result.messageMatches[0].snippet
                : result.session.summary || '';

            return (
              <Link
                key={result.session.id}
                to={`/session/${result.session.id}`}
                className="block bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-medium text-sm text-gray-900">
                    {highlightSnippet(result.session.title, query)}
                  </h3>
                  {result.titleMatch && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded ml-2 flex-shrink-0">
                      title match
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  {topic && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                      {topic.title}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(result.session.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-gray-400">
                    {result.session.messages?.length ?? 0} messages
                  </span>
                </div>

                {snippet && (
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {highlightSnippet(snippet, query)}
                  </p>
                )}

                {result.messageMatches.length > 1 && (
                  <p className="text-xs text-gray-400 mt-1">
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
