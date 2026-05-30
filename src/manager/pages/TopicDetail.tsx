import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { sendMessage } from '../../shared/messaging';
import { useAppStore } from '../stores/app-store';
import { useTemplates } from '../hooks/useTemplates';
import { generateContinuationPrompt } from '../../shared/utils/prompt-generator';
import TopicForm from '../components/TopicForm';
import SessionCard from '../components/SessionCard';
import SessionTimeline from '../components/SessionTimeline';
import MarkdownEditor from '../components/MarkdownEditor';
import ConfirmDialog from '../components/ConfirmDialog';
import { Pencil, Trash2 } from 'lucide-react';
import type { Topic, Session, TopicStatus } from '../../shared/types';

const STATUS_OPTIONS: { value: TopicStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const statusStyles: Record<TopicStatus, { bg: string; text: string }> = {
  active: { bg: 'var(--color-success-subtle)', text: 'var(--color-success)' },
  completed: { bg: 'var(--color-accent-subtle)', text: 'var(--color-accent)' },
  archived: { bg: 'var(--color-bg-tertiary)', text: 'var(--color-text-secondary)' },
};

type ViewMode = 'list' | 'timeline';

interface TopicDetailProps {
  embedded?: boolean;
}

export default function TopicDetail({ embedded }: TopicDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const showToast = useAppStore((s) => s.showToast);

  const [topic, setTopic] = useState<Topic | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [deletingTopic, setDeletingTopic] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryValue, setSummaryValue] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const { templates } = useTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [aggregating, setAggregating] = useState(false);

  const loadTopic = useCallback(async () => {
    if (!id) return;
    const res = await sendMessage<Topic>({ type: 'GET_TOPIC', payload: { id } });
    if (res.ok) {
      setTopic(res.data);
      setSummaryValue(res.data.progressSummary);
    } else {
      showToast('Topic not found', 'error');
      navigate('/');
    }
  }, [id, navigate, showToast]);

  const loadSessions = useCallback(async () => {
    if (!id) return;
    const res = await sendMessage<Session[]>({ type: 'GET_SESSIONS', payload: { topicId: id } });
    if (res.ok) setSessions(res.data);
  }, [id]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadTopic(), loadSessions()]);
    setLoading(false);
  }, [loadTopic, loadSessions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (newStatus: TopicStatus) => {
    if (!topic) return;
    const res = await sendMessage({
      type: 'UPDATE_TOPIC',
      payload: { id: topic.id, changes: { status: newStatus } },
    });
    if (res.ok) {
      setTopic({ ...topic, status: newStatus });
      showToast('Status updated');
    } else {
      showToast(res.error, 'error');
    }
  };

  const handleSummarySave = async () => {
    if (!topic) return;
    const res = await sendMessage({
      type: 'UPDATE_TOPIC',
      payload: { id: topic.id, changes: { progressSummary: summaryValue } },
    });
    if (res.ok) {
      setTopic({ ...topic, progressSummary: summaryValue });
      setEditingSummary(false);
      showToast('Summary updated');
    } else {
      showToast(res.error, 'error');
    }
  };

  const handleDeleteTopic = async () => {
    if (!topic) return;
    const res = await sendMessage({ type: 'DELETE_TOPIC', payload: { id: topic.id } });
    if (res.ok) {
      showToast('Topic deleted');
      navigate('/');
    } else {
      showToast(res.error, 'error');
    }
    setDeletingTopic(false);
  };

  const handleDeleteSession = async () => {
    if (!deletingSessionId) return;
    const res = await sendMessage({ type: 'DELETE_SESSION', payload: { id: deletingSessionId } });
    if (res.ok) {
      showToast('Session deleted');
      setSessions((prev) => prev.filter((s) => s.id !== deletingSessionId));
    } else {
      showToast(res.error, 'error');
    }
    setDeletingSessionId(null);
  };

  const getSessionTitle = (sessionId: string) => {
    return sessions.find((s) => s.id === sessionId)?.title || 'Unknown';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading topic...</div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="p-6">
        <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Topic not found.</div>
      </div>
    );
  }

  return (
    <div className={embedded ? 'p-6' : 'p-6 max-w-4xl'}>
      {/* Breadcrumb (only when not embedded in two-panel layout) */}
      {!embedded && (
        <div className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          <Link to="/" className="hover:underline" style={{ color: 'var(--color-accent)' }}>
            Topics
          </Link>
          <span className="mx-1.5" style={{ color: 'var(--color-text-tertiary)' }}>/</span>
          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{topic.title}</span>
        </div>
      )}

      {/* Header */}
      <div className="card-static p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{topic.title}</h1>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Type badge */}
              <span className="badge-muted">{topic.type}</span>

              {/* Status dropdown */}
              <select
                value={topic.status}
                onChange={(e) => handleStatusChange(e.target.value as TopicStatus)}
                className="text-xs px-2.5 py-1 rounded-full border-0 cursor-pointer font-medium focus:ring-2"
                style={{
                  backgroundColor: statusStyles[topic.status].bg,
                  color: statusStyles[topic.status].text,
                  outlineColor: 'var(--color-accent)',
                }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>

              {/* Tags */}
              {topic.tags.map((tag) => (
                <span key={tag} className="badge-primary">{tag}</span>
              ))}
            </div>

            <div className="text-xs mt-2.5" style={{ color: 'var(--color-text-tertiary)' }}>
              Created {new Date(topic.createdAt).toLocaleDateString()} &middot; Updated{' '}
              {new Date(topic.updatedAt).toLocaleDateString()}
            </div>
          </div>

          <div className="flex gap-2 ml-4">
            <button onClick={() => setEditingTopic(topic)} className="btn-secondary flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={() => setDeletingTopic(true)} className="btn-danger flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="card-static p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Progress Summary</h2>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (!id) return;
                setAggregating(true);
                const res = await sendMessage<Session[]>({ type: 'GET_SESSIONS', payload: { topicId: id } });
                if (res.ok) {
                  const sorted = [...res.data].sort((a, b) => a.createdAt - b.createdAt);
                  const aggregated = sorted
                    .map((s, i) => `Session ${i + 1}: ${s.title}\n${s.summary || '(no summary)'}`)
                    .join('\n\n');
                  setSummaryValue(aggregated);
                  setEditingSummary(true);
                  showToast('Progress aggregated from sessions. Review and save.');
                } else {
                  showToast(res.error, 'error');
                }
                setAggregating(false);
              }}
              disabled={aggregating}
              className="btn-ghost text-xs"
            >
              {aggregating ? 'Aggregating...' : 'Aggregate Progress'}
            </button>
            {editingSummary ? (
              <>
                <button onClick={handleSummarySave} className="btn-primary text-xs">Save</button>
                <button onClick={() => { setEditingSummary(false); setSummaryValue(topic.progressSummary); }} className="btn-secondary text-xs">Cancel</button>
              </>
            ) : (
              <button onClick={() => setEditingSummary(true)} className="btn-secondary text-xs">Edit</button>
            )}
          </div>
        </div>
        <MarkdownEditor
          value={summaryValue}
          onChange={setSummaryValue}
          placeholder="No progress summary yet. Click Edit to add one, or use Aggregate Progress to build from sessions."
        />
      </div>

      {/* Continuation Prompt */}
      <div className="card-static p-6 mb-6">
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Generate Continuation Prompt</h2>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          Select a template to generate a continuation prompt using the latest session.
        </p>

        <div className="flex items-center gap-3 mb-4">
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="input flex-1"
          >
            <option value="">Select a template...</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name} {t.isDefault ? '(default)' : ''}</option>
            ))}
          </select>
          <button
            onClick={async () => {
              if (!selectedTemplateId || !topic) return;
              setGenerating(true);
              const template = templates.find((t) => t.id === selectedTemplateId);
              if (!template) { showToast('Template not found', 'error'); setGenerating(false); return; }
              const sessionsRes = await sendMessage<Session[]>({ type: 'GET_SESSIONS', payload: { topicId: topic.id } });
              if (!sessionsRes.ok || sessionsRes.data.length === 0) { showToast('No sessions found for this topic', 'error'); setGenerating(false); return; }
              const latestSession = sessionsRes.data[0];
              const sessionCount = sessionsRes.data.length;
              const prompt = generateContinuationPrompt(topic, latestSession, template, sessionCount);
              setGeneratedPrompt(prompt);
              setGenerating(false);
            }}
            disabled={!selectedTemplateId || generating}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'Generating...' : 'Generate'}
          </button>
        </div>

        {generatedPrompt && (
          <div>
            <textarea
              value={generatedPrompt}
              readOnly
              rows={8}
              className="input font-mono resize-y"
              style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={async () => {
                  try { await navigator.clipboard.writeText(generatedPrompt); showToast('Copied to clipboard'); }
                  catch { showToast('Failed to copy to clipboard', 'error'); }
                }}
                className="btn-secondary text-xs"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sessions */}
      <div className="card-static p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Sessions ({sessions.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'timeline' : 'list')}
              className="btn-secondary text-xs"
            >
              {viewMode === 'list' ? 'Timeline' : 'List'} View
            </button>
            <button
              onClick={() => showToast('Manual session creation coming in Phase 4')}
              className="btn-primary text-xs"
            >
              + Add Session
            </button>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="text-sm text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>
            No sessions yet. Sessions will appear here when captured from DeepSeek.
          </div>
        ) : viewMode === 'timeline' ? (
          <SessionTimeline
            sessions={sessions}
            onSessionClick={(s) => navigate(`/session/${s.id}`)}
          />
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                parentTitle={session.parentSessionId ? getSessionTitle(session.parentSessionId) : undefined}
                onDelete={(sid) => setDeletingSessionId(sid)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {editingTopic && (
        <TopicForm
          topic={editingTopic}
          onClose={() => setEditingTopic(null)}
          onSaved={() => { setEditingTopic(null); loadTopic(); }}
        />
      )}

      <ConfirmDialog
        open={deletingTopic}
        title="Delete Topic"
        message={`Are you sure you want to delete "${topic.title}"? This will also delete all associated sessions and cannot be undone.`}
        onConfirm={handleDeleteTopic}
        onCancel={() => setDeletingTopic(false)}
      />

      <ConfirmDialog
        open={!!deletingSessionId}
        title="Delete Session"
        message="Are you sure you want to delete this session? This cannot be undone."
        onConfirm={handleDeleteSession}
        onCancel={() => setDeletingSessionId(null)}
      />
    </div>
  );
}
