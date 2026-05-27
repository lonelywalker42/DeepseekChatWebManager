import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendMessage } from '../../shared/messaging';
import { useAppStore } from '../stores/app-store';
import TopicForm from '../components/TopicForm';
import ConfirmDialog from '../components/ConfirmDialog';
import type { Topic, Session, TopicStatus, TopicType } from '../../shared/types';

const TOPIC_TYPES: { value: TopicType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'idea-discussion', label: 'Idea Discussion' },
  { value: 'code-generation', label: 'Code Generation' },
  { value: 'knowledge-qa', label: 'Knowledge QA' },
  { value: 'other', label: 'Other' },
];

const TOPIC_STATUSES: { value: TopicStatus | ''; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

export default function TopicList() {
  const navigate = useNavigate();
  const showToast = useAppStore((s) => s.showToast);

  const [topics, setTopics] = useState<Topic[]>([]);
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<TopicStatus | ''>('');
  const [filterType, setFilterType] = useState<TopicType | ''>('');
  const [searchText, setSearchText] = useState('');

  const loadTopics = useCallback(async () => {
    setLoading(true);
    const res = await sendMessage<Topic[]>({
      type: 'GET_TOPICS',
      payload: {
        ...(filterStatus ? { status: filterStatus as TopicStatus } : {}),
        ...(filterType ? { type: filterType as TopicType } : {}),
      },
    });
    if (res.ok) {
      setTopics(res.data);

      // Fetch session counts for each topic
      const counts: Record<string, number> = {};
      await Promise.all(
        res.data.map(async (topic) => {
          const sessionRes = await sendMessage<Session[]>({
            type: 'GET_SESSIONS',
            payload: { topicId: topic.id },
          });
          if (sessionRes.ok) {
            counts[topic.id] = sessionRes.data.length;
          }
        }),
      );
      setSessionCounts(counts);
    } else {
      showToast(res.error, 'error');
    }
    setLoading(false);
  }, [filterStatus, filterType, showToast]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  // Filter and sort topics
  const displayedTopics = useMemo(() => {
    let filtered = [...topics];

    // Text search on title
    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      filtered = filtered.filter((t) => t.title.toLowerCase().includes(query));
    }

    // Sort by updatedAt descending
    filtered.sort((a, b) => b.updatedAt - a.updatedAt);

    return filtered;
  }, [topics, searchText]);

  const handleDeleteTopic = async () => {
    if (!deletingTopicId) return;
    const res = await sendMessage({ type: 'DELETE_TOPIC', payload: { id: deletingTopicId } });
    if (res.ok) {
      showToast('Topic deleted');
      setTopics((prev) => prev.filter((t) => t.id !== deletingTopicId));
    } else {
      showToast(res.error, 'error');
    }
    setDeletingTopicId(null);
  };

  const deletingTopic = topics.find((t) => t.id === deletingTopicId);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Topics</h1>
        <button
          onClick={() => setShowTopicForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          + New Topic
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as TopicStatus | '')}
          className="px-3 py-1.5 border rounded text-sm"
        >
          {TOPIC_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as TopicType | '')}
          className="px-3 py-1.5 border rounded text-sm"
        >
          {TOPIC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search topics..."
          className="px-3 py-1.5 border rounded text-sm flex-1 min-w-[200px]"
        />
      </div>

      {/* Topic cards */}
      {loading ? (
        <div className="text-gray-500 text-sm py-8 text-center">Loading topics...</div>
      ) : displayedTopics.length === 0 ? (
        <div className="text-gray-500 text-sm py-8 text-center">
          {topics.length === 0
            ? 'No topics yet. Click "New Topic" to get started.'
            : 'No topics match your filters.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayedTopics.map((topic) => (
            <div
              key={topic.id}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/topic/${topic.id}`)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-gray-900 text-sm leading-tight flex-1 mr-2 line-clamp-2">
                  {topic.title}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingTopicId(topic.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 rounded flex-shrink-0"
                  title="Delete topic"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-2 mb-2">
                {/* Type badge */}
                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                  {topic.type}
                </span>

                {/* Status badge */}
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    topic.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : topic.status === 'completed'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {topic.status}
                </span>
              </div>

              {/* Tags */}
              {topic.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {topic.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-2 border-t">
                <span>
                  {sessionCounts[topic.id] ?? 0} session
                  {(sessionCounts[topic.id] ?? 0) !== 1 ? 's' : ''}
                </span>
                <span>{new Date(topic.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Topic modal */}
      {showTopicForm && (
        <TopicForm
          onClose={() => setShowTopicForm(false)}
          onSaved={() => {
            setShowTopicForm(false);
            loadTopics();
          }}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deletingTopicId}
        title="Delete Topic"
        message={
          deletingTopic
            ? `Are you sure you want to delete "${deletingTopic.title}"? This will also delete all associated sessions and cannot be undone.`
            : 'Are you sure you want to delete this topic?'
        }
        onConfirm={handleDeleteTopic}
        onCancel={() => setDeletingTopicId(null)}
      />
    </div>
  );
}
