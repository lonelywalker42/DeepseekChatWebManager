import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendMessage } from '../../shared/messaging';
import { useAppStore } from '../stores/app-store';
import TopicForm from '../components/TopicForm';
import ConfirmDialog from '../components/ConfirmDialog';
import { FolderOpen, Plus, Trash2 } from 'lucide-react';
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

const statusColors: Record<TopicStatus, string> = {
  active: 'var(--color-success)',
  completed: 'var(--color-accent)',
  archived: 'var(--color-text-tertiary)',
};

export default function TopicList() {
  const navigate = useNavigate();
  const showToast = useAppStore((s) => s.showToast);

  const [topics, setTopics] = useState<Topic[]>([]);
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);

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
      const counts: Record<string, number> = {};
      await Promise.all(
        res.data.map(async (topic) => {
          const sessionRes = await sendMessage<Session[]>({
            type: 'GET_SESSIONS',
            payload: { topicId: topic.id },
          });
          if (sessionRes.ok) counts[topic.id] = sessionRes.data.length;
        }),
      );
      setSessionCounts(counts);
    } else {
      showToast(res.error, 'error');
    }
    setLoading(false);
  }, [filterStatus, filterType, showToast]);

  useEffect(() => { loadTopics(); }, [loadTopics]);

  const displayedTopics = useMemo(() => {
    let filtered = [...topics];
    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      filtered = filtered.filter((t) => t.title.toLowerCase().includes(query));
    }
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
        <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Topics</h1>
        <button onClick={() => setShowTopicForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Topic
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as TopicStatus | '')} className="input w-auto">
          {TOPIC_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value as TopicType | '')} className="input w-auto">
          {TOPIC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search topics..." className="input flex-1 min-w-[200px]" />
      </div>

      {/* Topic cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-static p-4">
              <div className="skeleton h-5 w-3/4 mb-3 rounded" />
              <div className="flex gap-2 mb-3">
                <div className="skeleton h-5 w-20 rounded-full" />
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
              <div className="flex gap-1 mb-3">
                <div className="skeleton h-5 w-14 rounded-full" />
                <div className="skeleton h-5 w-18 rounded-full" />
              </div>
              <div className="pt-3 mt-3 flex justify-between" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                <div className="skeleton h-4 w-20 rounded" />
                <div className="skeleton h-4 w-24 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : displayedTopics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="w-16 h-16 mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
          <h3 className="text-lg font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            {topics.length === 0 ? 'No topics yet' : 'No topics match your filters'}
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-tertiary)' }}>
            {topics.length === 0
              ? 'Scrape your first conversation from DeepSeek to get started.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
          {topics.length === 0 && (
            <button onClick={() => setShowTopicForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Topic
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayedTopics.map((topic) => (
            <div
              key={topic.id}
              className="card p-4 cursor-pointer group"
              onClick={() => navigate(`/topic/${topic.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-sm leading-tight flex-1 mr-2 line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>
                  {topic.title}
                </h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColors[topic.status] }} title={topic.status} />
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeletingTopicId(topic.id); }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--color-text-tertiary)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}
                    title="Delete topic"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="badge-muted">{topic.type}</span>
              </div>

              {topic.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {topic.tags.map((tag) => <span key={tag} className="badge-primary">{tag}</span>)}
                </div>
              )}

              <div className="flex items-center justify-between text-xs mt-auto pt-3" style={{ color: 'var(--color-text-tertiary)', borderTop: '1px solid var(--color-border-light)' }}>
                <span>{sessionCounts[topic.id] ?? 0} session{(sessionCounts[topic.id] ?? 0) !== 1 ? 's' : ''}</span>
                <span>{new Date(topic.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showTopicForm && (
        <TopicForm
          onClose={() => setShowTopicForm(false)}
          onSaved={() => { setShowTopicForm(false); loadTopics(); }}
        />
      )}

      <ConfirmDialog
        open={!!deletingTopicId}
        title="Delete Topic"
        message={deletingTopic ? `Are you sure you want to delete "${deletingTopic.title}"? This will also delete all associated sessions and cannot be undone.` : 'Are you sure you want to delete this topic?'}
        onConfirm={handleDeleteTopic}
        onCancel={() => setDeletingTopicId(null)}
      />
    </div>
  );
}
