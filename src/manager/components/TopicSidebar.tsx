import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { sendMessage } from '../../shared/messaging';
import { useAppStore } from '../stores/app-store';
import TopicForm from './TopicForm';
import ConfirmDialog from './ConfirmDialog';
import { Plus, Search, Trash2, Pencil, MoreHorizontal, FolderOpen } from 'lucide-react';
import type { Topic, Session, TopicStatus, TopicType } from '../../shared/types';

const TOPIC_TYPES: { value: TopicType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'idea-discussion', label: 'Idea' },
  { value: 'code-generation', label: 'Code' },
  { value: 'knowledge-qa', label: 'QA' },
  { value: 'other', label: 'Other' },
];

const TOPIC_STATUSES: { value: TopicStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Done' },
  { value: 'archived', label: 'Archived' },
];

const statusColors: Record<TopicStatus, string> = {
  active: '#10B981',
  completed: '#3B82F6',
  archived: '#94A3B8',
};

const typeEmojis: Record<TopicType, string> = {
  'idea-discussion': '\u{1F4A1}',
  'code-generation': '\u{1F4BB}',
  'knowledge-qa': '\u{2753}',
  other: '\u{1F4C4}',
};

export default function TopicSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const showToast = useAppStore((s) => s.showToast);

  const [topics, setTopics] = useState<Topic[]>([]);
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<TopicStatus | ''>('');
  const [filterType, setFilterType] = useState<TopicType | ''>('');
  const [searchText, setSearchText] = useState('');

  // Current selected topic from URL
  const selectedTopicId = useMemo(() => {
    const match = location.pathname.match(/^\/topic\/(.+)$/);
    return match ? match[1] : null;
  }, [location.pathname]);

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
      // Fetch session counts in parallel
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

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const displayedTopics = useMemo(() => {
    let filtered = [...topics];
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter((t) => t.title.toLowerCase().includes(q));
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
      if (selectedTopicId === deletingTopicId) navigate('/');
    } else {
      showToast(res.error, 'error');
    }
    setDeletingTopicId(null);
  };

  const deletingTopic = topics.find((t) => t.id === deletingTopicId);

  return (
    <>
      {/* Search + filters */}
      <div className="px-3 pt-3 pb-2 space-y-2 flex-shrink-0">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-text-sidebar-muted)' }} />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search topics..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg outline-none transition-colors"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--color-text-sidebar)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 flex-wrap">
          {TOPIC_STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilterStatus(s.value as TopicStatus | '')}
              className="px-2 py-0.5 text-[11px] rounded-full transition-all duration-150"
              style={{
                backgroundColor: filterStatus === s.value ? 'var(--color-accent)' : 'rgba(255,255,255,0.05)',
                color: filterStatus === s.value ? '#fff' : 'var(--color-text-sidebar-muted)',
                border: `1px solid ${filterStatus === s.value ? 'var(--color-accent)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {TOPIC_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value as TopicType | '')}
              className="px-2 py-0.5 text-[11px] rounded-full transition-all duration-150"
              style={{
                backgroundColor: filterType === t.value ? 'var(--color-accent)' : 'rgba(255,255,255,0.05)',
                color: filterType === t.value ? '#fff' : 'var(--color-text-sidebar-muted)',
                border: `1px solid ${filterType === t.value ? 'var(--color-accent)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* New Topic button */}
        <button
          onClick={() => setShowTopicForm(true)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: '#fff',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
        >
          <Plus className="w-3.5 h-3.5" />
          New Topic
        </button>
      </div>

      {/* Topic list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
        {loading ? (
          <div className="space-y-2 p-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-lg" />
            ))}
          </div>
        ) : displayedTopics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <FolderOpen className="w-8 h-8 mb-2" style={{ color: 'var(--color-text-sidebar-muted)' }} />
            <p className="text-xs" style={{ color: 'var(--color-text-sidebar-muted)' }}>
              {topics.length === 0 ? 'No topics yet' : 'No matches'}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {displayedTopics.map((topic) => {
              const isSelected = selectedTopicId === topic.id;
              return (
                <div
                  key={topic.id}
                  className="group relative rounded-lg cursor-pointer transition-all duration-150"
                  style={{
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : 'transparent',
                    borderLeft: isSelected ? '2px solid var(--color-accent)' : '2px solid transparent',
                  }}
                  onClick={() => navigate(`/topic/${topic.id}`)}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div className="px-3 py-2.5 flex items-start gap-2.5">
                    {/* Status dot */}
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: statusColors[topic.status] }}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px]">{typeEmojis[topic.type]}</span>
                        <h4
                          className="text-[13px] font-medium truncate"
                          style={{ color: 'var(--color-text-sidebar)' }}
                        >
                          {topic.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px]" style={{ color: 'var(--color-text-sidebar-muted)' }}>
                          {sessionCounts[topic.id] ?? 0} sessions
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--color-text-sidebar-muted)' }}>
                          {new Date(topic.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* Context menu button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setContextMenuId(contextMenuId === topic.id ? null : topic.id);
                      }}
                      className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      style={{ color: 'var(--color-text-sidebar-muted)' }}
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Context menu dropdown */}
                  {contextMenuId === topic.id && (
                    <div
                      className="absolute right-2 top-full z-20 rounded-lg shadow-lg py-1 min-w-[120px] animate-fade-in"
                      style={{
                        backgroundColor: 'var(--color-card-bg)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTopic(topic);
                          setContextMenuId(null);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs w-full transition-colors"
                        style={{ color: 'var(--color-text-primary)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingTopicId(topic.id);
                          setContextMenuId(null);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs w-full transition-colors"
                        style={{ color: 'var(--color-danger)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-danger-subtle)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {(showTopicForm || editingTopic) && (
        <TopicForm
          topic={editingTopic}
          onClose={() => { setShowTopicForm(false); setEditingTopic(null); }}
          onSaved={() => { setShowTopicForm(false); setEditingTopic(null); loadTopics(); }}
        />
      )}

      <ConfirmDialog
        open={!!deletingTopicId}
        title="Delete Topic"
        message={
          deletingTopic
            ? `Are you sure you want to delete "${deletingTopic.title}"? This will also delete all associated sessions.`
            : 'Are you sure you want to delete this topic?'
        }
        onConfirm={handleDeleteTopic}
        onCancel={() => setDeletingTopicId(null)}
      />
    </>
  );
}
