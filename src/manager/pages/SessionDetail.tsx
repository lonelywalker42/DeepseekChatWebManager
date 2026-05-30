import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { sendMessage } from '../../shared/messaging';
import { useAppStore } from '../stores/app-store';
import { useTemplates } from '../hooks/useTemplates';
import { generateContinuationPrompt } from '../../shared/utils/prompt-generator';
import MarkdownEditor from '../components/MarkdownEditor';
import MessageViewer from '../components/MessageViewer';
import type { Topic, Session } from '../../shared/types';

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
    const res = await sendMessage<Session>({ type: 'GET_SESSION_DETAIL', payload: { sessionId: id } });
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

  const loadTopicAndSiblings = useCallback(async (sessionData: Session) => {
    const topicRes = await sendMessage<Topic>({ type: 'GET_TOPIC', payload: { id: sessionData.topicId } });
    if (topicRes.ok) setTopic(topicRes.data);
    const siblingsRes = await sendMessage<Session[]>({ type: 'GET_SESSIONS', payload: { topicId: sessionData.topicId } });
    if (siblingsRes.ok) setSiblingSessions(siblingsRes.data.filter((s) => s.id !== sessionData.id));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const sessionData = await loadSession();
    if (sessionData) await loadTopicAndSiblings(sessionData);
    setLoading(false);
  }, [loadSession, loadTopicAndSiblings]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleTitleSave = async () => {
    if (!session || !titleValue.trim()) return;
    const res = await sendMessage({ type: 'UPDATE_SESSION', payload: { id: session.id, changes: { title: titleValue.trim() } } });
    if (res.ok) { setSession({ ...session, title: titleValue.trim() }); setEditingTitle(false); showToast('Title updated'); }
    else { showToast(res.error, 'error'); }
  };

  const handleSummarySave = async () => {
    if (!session) return;
    const res = await sendMessage({ type: 'UPDATE_SESSION', payload: { id: session.id, changes: { summary: summaryValue } } });
    if (res.ok) { setSession({ ...session, summary: summaryValue }); setEditingSummary(false); showToast('Summary updated'); }
    else { showToast(res.error, 'error'); }
  };

  const handleParentChange = async (newParentId: string | '') => {
    if (!session) return;
    const res = await sendMessage({ type: 'UPDATE_SESSION', payload: { id: session.id, changes: { parentSessionId: newParentId || undefined } } });
    if (res.ok) { setSession({ ...session, parentSessionId: newParentId || undefined }); showToast('Parent session updated'); }
    else { showToast(res.error, 'error'); }
  };

  if (loading) {
    return <div className="p-6"><div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading session...</div></div>;
  }
  if (!session) {
    return <div className="p-6"><div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Session not found.</div></div>;
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        <Link to="/" className="hover:underline" style={{ color: 'var(--color-accent)' }}>Topics</Link>
        {topic && (
          <>
            <span className="mx-1.5" style={{ color: 'var(--color-text-tertiary)' }}>/</span>
            <Link to={`/topic/${topic.id}`} className="hover:underline" style={{ color: 'var(--color-accent)' }}>{topic.title}</Link>
          </>
        )}
        <span className="mx-1.5" style={{ color: 'var(--color-text-tertiary)' }}>/</span>
        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{session.title}</span>
      </div>

      {/* Header */}
      <div className="card-static p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <div className="flex items-center gap-2 mb-2">
                <input type="text" value={titleValue} onChange={(e) => setTitleValue(e.target.value)} className="input flex-1 text-lg" autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') { setEditingTitle(false); setTitleValue(session.title); } }} />
                <button onClick={handleTitleSave} className="btn-primary">Save</button>
                <button onClick={() => { setEditingTitle(false); setTitleValue(session.title); }} className="btn-secondary">Cancel</button>
              </div>
            ) : (
              <h1 className="text-lg font-semibold mb-2 cursor-pointer transition-colors" style={{ color: 'var(--color-text-primary)' }}
                onClick={() => setEditingTitle(true)} title="Click to edit title"
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
              >
                {session.title}
              </h1>
            )}
            {session.sourceUrl && (
              <a href={session.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline" style={{ color: 'var(--color-accent)' }}>
                {session.sourceUrl}
              </a>
            )}
            <div className="text-xs mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
              Created {new Date(session.createdAt).toLocaleDateString()} &middot; {session.messages?.length ?? 0} messages
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="card-static p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Session Summary</h2>
          {editingSummary ? (
            <div className="flex gap-2">
              <button onClick={handleSummarySave} className="btn-primary text-xs">Save</button>
              <button onClick={() => { setEditingSummary(false); setSummaryValue(session.summary || ''); }} className="btn-secondary text-xs">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setEditingSummary(true)} className="btn-secondary text-xs">Edit</button>
          )}
        </div>
        <MarkdownEditor value={summaryValue} onChange={setSummaryValue} placeholder="No summary yet. Click Edit to add one." />
      </div>

      {/* Parent Session Selector */}
      <div className="card-static p-6 mb-6">
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Parent Session</h2>
        <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>Set a parent session to indicate this is a continuation of a previous conversation.</p>
        <select value={session.parentSessionId || ''} onChange={(e) => handleParentChange(e.target.value)} className="input">
          <option value="">None (root session)</option>
          {siblingSessions.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>

      {/* Continuation Prompt */}
      <div className="card-static p-6 mb-6">
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Generate Continuation Prompt</h2>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>Select a template to generate a continuation prompt for this session.</p>
        <div className="flex items-center gap-3 mb-4">
          <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} className="input flex-1">
            <option value="">Select a template...</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name} {t.isDefault ? '(default)' : ''}</option>)}
          </select>
          <button onClick={async () => {
            if (!selectedTemplateId || !topic || !session) return;
            setGenerating(true);
            const template = templates.find((t) => t.id === selectedTemplateId);
            if (!template) { showToast('Template not found', 'error'); setGenerating(false); return; }
            const sessionsRes = await sendMessage<Session[]>({ type: 'GET_SESSIONS', payload: { topicId: topic.id } });
            const sessionCount = sessionsRes.ok ? sessionsRes.data.length : 0;
            setGeneratedPrompt(generateContinuationPrompt(topic, session, template, sessionCount));
            setGenerating(false);
          }} disabled={!selectedTemplateId || generating} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
            {generating ? 'Generating...' : 'Generate'}
          </button>
        </div>
        {generatedPrompt && (
          <div>
            <textarea value={generatedPrompt} readOnly rows={8} className="input font-mono resize-y" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={async () => { try { await navigator.clipboard.writeText(generatedPrompt); showToast('Copied to clipboard'); } catch { showToast('Failed to copy', 'error'); } }} className="btn-secondary text-xs">Copy to Clipboard</button>
              <button onClick={async () => {
                if (!session) return;
                setSavingPrompt(true);
                const res = await sendMessage({ type: 'UPDATE_SESSION', payload: { id: session.id, changes: { continuationPrompt: generatedPrompt } } });
                if (res.ok) { setSession({ ...session, continuationPrompt: generatedPrompt }); showToast('Prompt saved to session'); }
                else { showToast(res.error, 'error'); }
                setSavingPrompt(false);
              }} disabled={savingPrompt} className="btn-primary text-xs disabled:opacity-50">
                {savingPrompt ? 'Saving...' : 'Save to Session'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="card-static p-6">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Messages ({session.messages?.length ?? 0})</h2>
        <MessageViewer messages={session.messages || []} />
      </div>
    </div>
  );
}
