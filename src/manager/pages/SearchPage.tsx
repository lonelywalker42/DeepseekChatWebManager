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

  const performSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    const res = await sendMessage<SearchResult[]>({ type: 'SEARCH', payload: { query: trimmed } });
    if (res.ok) {
      setResults(res.data);
      const topicIds = new Set(res.data.map((r) => r.session.topicId));
      const topicsMap: Record<string, Topic> = {};
      await Promise.all(Array.from(topicIds).map(async (topicId) => {
        const topicRes = await sendMessage<Topic>({ type: 'GET_TOPIC', payload: { id: topicId } });
        if (topicRes.ok && topicRes.data) topicsMap[topicId] = topicRes.data;
      }));
      setTopics(topicsMap);
    } else { showToast(res.error, 'error'); }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    const initialQuery = searchParams.get('q');
    if (initialQuery) { setQuery(initialQuery); performSearch(initialQuery); }
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const trimmed = query.trim();
      if (trimmed) { setSearchParams({ q: trimmed }, { replace: true }); performSearch(trimmed); }
      else { setResults([]); setSearched(false); setSearchParams({}, { replace: true }); }
    }, 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [query]);

  const highlightSnippet = (text: string, searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return text;
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="px-0.5 rounded dark:bg-yellow-900/40 bg-yellow-200">{part}</mark> : part
    );
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Search</h1>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search across all sessions and messages..."
            className="w-full pl-10 pr-4 py-3 text-base rounded-lg focus:outline-none focus:ring-2 transition-colors"
            style={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
            autoFocus />
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card-static p-4">
              <div className="skeleton h-5 w-3/4 mb-2 rounded" />
              <div className="flex gap-2 mb-2"><div className="skeleton h-5 w-20 rounded-full" /><div className="skeleton h-5 w-24 rounded" /></div>
              <div className="skeleton h-4 w-full rounded" />
            </div>
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <SearchX className="w-16 h-16 mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
          <h3 className="text-lg font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>No results found</h3>
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>No matches for &ldquo;{query.trim()}&rdquo;. Try a different search term.</p>
        </div>
      )}

      {!loading && !searched && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-16 h-16 mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
          <h3 className="text-lg font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Search your conversations</h3>
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Type a search query to find sessions and messages.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>{results.length} result{results.length !== 1 ? 's' : ''} found</div>
          {results.map((result) => {
            const topic = topics[result.session.topicId];
            const snippet = result.messageMatches.length > 0 ? result.messageMatches[0].snippet : result.session.summary || '';
            return (
              <Link key={result.session.id} to={`/session/${result.session.id}`} className="block card p-4">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{highlightSnippet(result.session.title, query)}</h3>
                  {result.titleMatch && <span className="badge-info ml-2 flex-shrink-0">title match</span>}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {topic && <span className="badge-muted">{topic.title}</span>}
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{new Date(result.session.createdAt).toLocaleDateString()}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{result.session.messages?.length ?? 0} messages</span>
                </div>
                {snippet && <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>{highlightSnippet(snippet, query)}</p>}
                {result.messageMatches.length > 1 && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>+{result.messageMatches.length - 1} more match{result.messageMatches.length - 1 !== 1 ? 'es' : ''} in messages</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
