import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { sendMessage } from '../../shared/messaging';
import { useAppStore } from '../stores/app-store';
import { useTemplates } from '../hooks/useTemplates';
import { generateContinuationPrompt } from '../../shared/utils/prompt-generator';
import MarkdownEditor from '../components/MarkdownEditor';
import MessageViewer from '../components/MessageViewer';
import type { Topic, Session, Template } from '../../shared/types';

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const showToast = useAppStore((s) => s.showToast);

  const [session, setSession] = useState<Session | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [siblingSessions, setSiblingSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryValue, setSummaryValue] = useState('');
  const { templates } = useTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);

  const loadSession = useCallback(async () => {
    if (!id) return;
    const res = await sendMessage<Session>({
      type: 'GET_SESSION_DETAIL',
      payload: { sessionId: id },
    });
    if (res.ok) {
      setSession(res.data);
      setTitleValue(res.data.title);
      setSummaryValue(res.data.summary || '');
      return res.data;
    } else {
      showToast('Session not found', 'error');
      navigate('/');
      return null;
    }
  }, [id, navigate, showToast]);

  const loadTopicAndSiblings = useCallback(
    async (sessionData: Session) => {
      const topicRes = await sendMessage<Topic>({
        type: 'GET_TOPIC',
        payload: { id: sessionData.topicId },
      });
      if (topicRes.ok) {
        setTopic(topicRes.data);
      }

      const siblingsRes = await sendMessage<Session[]>({
        type: 'GET_SESSIONS',
        payload: { topicId: sessionData.topicId },
      });
      if (siblingsRes.ok) {
        setSiblingSessions(siblingsRes.data.filter((s) => s.id !== sessionData.id));
      }
    },
    [],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    const sessionData = await loadSession();
    if (sessionData) {
      await loadTopicAndSiblings(sessionData);
    }
    setLoading(false);
  }, [loadSession, loadTopicAndSiblings]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTitleSave = async () => {
    if (!session || !titleValue.trim()) return;
    const res = await sendMessage({
      type: 'UPDATE_SESSION',
      payload: { id: session.id, changes: { title: titleValue.trim() } },
    });
    if (res.ok) {
      setSession({ ...session, title: titleValue.trim() });
      setEditingTitle(false);
      showToast('Title updated');
    } else {
      showToast(res.error, 'error');
    }
  };

  const handleSummarySave = async () => {
    if (!session) return;
    const res = await sendMessage({
      type: 'UPDATE_SESSION',
      payload: { id: session.id, changes: { summary: summaryValue } },
    });
    if (res.ok) {
      setSession({ ...session, summary: summaryValue });
      setEditingSummary(false);
      showToast('Summary updated');
    } else {
      showToast(res.error, 'error');
    }
  };

  const handleParentChange = async (newParentId: string | '') => {
    if (!session) return;
    const res = await sendMessage({
      type: 'UPDATE_SESSION',
      payload: {
        id: session.id,
        changes: { parentSessionId: newParentId || undefined },
      },
    });
    if (res.ok) {
      setSession({
        ...session,
        parentSessionId: newParentId || undefined,
      });
      showToast('Parent session updated');
    } else {
      showToast(res.error, 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500 text-sm">Loading session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6">
        <div className="text-gray-500 text-sm">Session not found.</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4">
        <Link to="/" className="hover:text-blue-600 hover:underline">
          Topics
        </Link>
        {topic && (
          <>
            <span className="mx-1">/</span>
            <Link to={`/topic/${topic.id}`} className="hover:text-blue-600 hover:underline">
              {topic.title}
            </Link>
          </>
        )}
        <span className="mx-1">/</span>
        <span className="text-gray-900">{session.title}</span>
      </div>

      {/* Header */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 border rounded text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTitleSave();
                    if (e.key === 'Escape') {
                      setEditingTitle(false);
                      setTitleValue(session.title);
                    }
                  }}
                />
                <button
                  onClick={handleTitleSave}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingTitle(false);
                    setTitleValue(session.title);
                  }}
                  className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <h1
                className="text-xl font-bold text-gray-900 mb-2 cursor-pointer hover:text-blue-600"
                onClick={() => setEditingTitle(true)}
                title="Click to edit title"
              >
                {session.title}
              </h1>
            )}

            {session.sourceUrl && (
              <a
                href={session.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline"
              >
                {session.sourceUrl}
              </a>
            )}

            <div className="text-xs text-gray-400 mt-2">
              Created {new Date(session.createdAt).toLocaleDateString()} &middot;{' '}
              {session.messages?.length ?? 0} messages
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Session Summary</h2>
          {editingSummary ? (
            <div className="flex gap-2">
              <button
                onClick={handleSummarySave}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingSummary(false);
                  setSummaryValue(session.summary || '');
                }}
                className="px-3 py-1 text-xs border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingSummary(true)}
              className="px-3 py-1 text-xs border rounded hover:bg-gray-50"
            >
              Edit
            </button>
          )}
        </div>
        <MarkdownEditor
          value={summaryValue}
          onChange={setSummaryValue}
          placeholder="No summary yet. Click Edit to add one."
        />
      </div>

      {/* Parent Session Selector */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Parent Session</h2>
        <p className="text-xs text-gray-500 mb-2">
          Set a parent session to indicate this is a continuation of a previous conversation.
        </p>
        <select
          value={session.parentSessionId || ''}
          onChange={(e) => handleParentChange(e.target.value)}
          className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">None (root session)</option>
          {siblingSessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      {/* Continuation Prompt */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Generate Continuation Prompt</h2>
        <p className="text-xs text-gray-500 mb-3">
          Select a template to generate a continuation prompt for this session.
        </p>

        <div className="flex items-center gap-3 mb-4">
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a template...</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.isDefault ? '(default)' : ''}
              </option>
            ))}
          </select>
          <button
            onClick={async () => {
              if (!selectedTemplateId || !topic || !session) return;
              setGenerating(true);

              const template = templates.find((t) => t.id === selectedTemplateId);
              if (!template) {
                showToast('Template not found', 'error');
                setGenerating(false);
                return;
              }

              // Get session count for the topic
              const sessionsRes = await sendMessage<Session[]>({
                type: 'GET_SESSIONS',
                payload: { topicId: topic.id },
              });
              const sessionCount = sessionsRes.ok ? sessionsRes.data.length : 0;

              const prompt = generateContinuationPrompt(topic, session, template, sessionCount);
              setGeneratedPrompt(prompt);
              setGenerating(false);
            }}
            disabled={!selectedTemplateId || generating}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="w-full px-3 py-2 border rounded text-sm font-mono bg-gray-50 resize-y"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(generatedPrompt);
                    showToast('Copied to clipboard');
                  } catch {
                    showToast('Failed to copy to clipboard', 'error');
                  }
                }}
                className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={async () => {
                  if (!session) return;
                  setSavingPrompt(true);
                  const res = await sendMessage({
                    type: 'UPDATE_SESSION',
                    payload: { id: session.id, changes: { continuationPrompt: generatedPrompt } },
                  });
                  if (res.ok) {
                    setSession({ ...session, continuationPrompt: generatedPrompt });
                    showToast('Prompt saved to session');
                  } else {
                    showToast(res.error, 'error');
                  }
                  setSavingPrompt(false);
                }}
                disabled={savingPrompt}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {savingPrompt ? 'Saving...' : 'Save to Session'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Messages ({session.messages?.length ?? 0})
        </h2>
        <MessageViewer messages={session.messages || []} />
      </div>
    </div>
  );
}
