import { useState, useRef, useCallback } from 'react';
import { sendMessage } from '../../shared/messaging';
import { useAppStore } from '../stores/app-store';
import { useTemplates } from '../hooks/useTemplates';
import ConfirmDialog from '../components/ConfirmDialog';
import type { Template } from '../../shared/types';

const AVAILABLE_VARIABLES = [
  { key: '{topic_title}', label: 'Topic title', description: 'The title of the topic' },
  { key: '{topic_type}', label: 'Topic type', description: 'The type of the topic (e.g. code-generation)' },
  { key: '{progress_summary}', label: 'Progress summary', description: 'Current progress summary' },
  { key: '{session_title}', label: 'Last session title', description: 'Title of the last session' },
  { key: '{session_summary}', label: 'Last session summary', description: 'Summary of the last session' },
  { key: '{session_count}', label: 'Session count', description: 'Number of sessions in the topic' },
];

type EditingTemplate = { id?: string; name: string; content: string; isDefault: boolean };

export default function TemplateManager() {
  const showToast = useAppStore((s) => s.showToast);
  const { templates, loading, refresh } = useTemplates();
  const [editing, setEditing] = useState<EditingTemplate | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const handleNew = () => setEditing({ name: '', content: '', isDefault: false });
  const handleEdit = (t: Template) => setEditing({ id: t.id, name: t.name, content: t.content, isDefault: t.isDefault });

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { showToast('Template name is required', 'error'); return; }
    if (editing.id) {
      const res = await sendMessage({ type: 'UPDATE_TEMPLATE', payload: { id: editing.id, changes: { name: editing.name, content: editing.content, isDefault: editing.isDefault } } });
      if (res.ok) { showToast('Template updated'); setEditing(null); await refresh(); } else { showToast(res.error, 'error'); }
    } else {
      const res = await sendMessage({ type: 'CREATE_TEMPLATE', payload: { name: editing.name, content: editing.content, isDefault: editing.isDefault } });
      if (res.ok) { showToast('Template created'); setEditing(null); await refresh(); } else { showToast(res.error, 'error'); }
    }
  };

  const handleSetDefault = async (id: string) => {
    await Promise.all(templates.filter((t) => t.isDefault && t.id !== id).map((t) => sendMessage({ type: 'UPDATE_TEMPLATE', payload: { id: t.id, changes: { isDefault: false } } })));
    const res = await sendMessage({ type: 'UPDATE_TEMPLATE', payload: { id, changes: { isDefault: true } } });
    if (res.ok) { showToast('Default template updated'); await refresh(); } else { showToast(res.error, 'error'); }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const res = await sendMessage({ type: 'DELETE_TEMPLATE', payload: { id: deletingId } });
    if (res.ok) { showToast('Template deleted'); await refresh(); } else { showToast(res.error, 'error'); }
    setDeletingId(null);
  };

  const insertVariable = useCallback((variable: string) => {
    const textarea = contentRef.current;
    if (!textarea || !editing) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = editing.content.substring(0, start) + variable + editing.content.substring(end);
    setEditing({ ...editing, content: newContent });
    requestAnimationFrame(() => { textarea.focus(); const newPos = start + variable.length; textarea.setSelectionRange(newPos, newPos); });
  }, [editing]);

  if (loading) return <div className="p-6"><div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading templates...</div></div>;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Templates</h1>
        <button onClick={handleNew} className="btn-primary">+ New Template</button>
      </div>

      {editing && (
        <div className="card-static p-6 mb-6">
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>{editing.id ? 'Edit Template' : 'New Template'}</h2>
          <div className="mb-4">
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>Name</label>
            <input type="text" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Template name" className="input" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>Content</label>
              <textarea ref={contentRef} value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} placeholder="Write your template content here. Use variables like {topic_title} for dynamic values." rows={12} className="input font-mono resize-y" />
            </div>
            <div className="w-64 flex-shrink-0">
              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>Available Variables</label>
              <div className="card-static p-3 space-y-2">
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-tertiary)' }}>Click a variable to insert it at the cursor position.</p>
                {AVAILABLE_VARIABLES.map((v) => (
                  <button key={v.key} onClick={() => insertVariable(v.key)} className="w-full text-left px-2 py-1.5 rounded group transition-colors"
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-subtle)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                    <code className="text-xs font-mono" style={{ color: 'var(--color-accent)' }}>{v.key}</code>
                    <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{v.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <input type="checkbox" id="isDefault" checked={editing.isDefault} onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })} className="rounded" style={{ accentColor: 'var(--color-accent)' }} />
            <label htmlFor="isDefault" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Set as default template</label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary">{editing.id ? 'Update' : 'Create'}</button>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="text-sm text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>No templates yet. Create one to get started with continuation prompts.</div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <div key={template.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{template.name}</h3>
                    {template.isDefault && <span className="badge-info">Default</span>}
                  </div>
                  <p className="text-xs line-clamp-3" style={{ color: 'var(--color-text-secondary)' }}>
                    {template.content.length > 200 ? template.content.substring(0, 200) + '...' : template.content || '(empty)'}
                  </p>
                </div>
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  {!template.isDefault && <button onClick={() => handleSetDefault(template.id)} className="btn-ghost text-xs">Set Default</button>}
                  <button onClick={() => handleEdit(template)} className="btn-secondary text-xs">Edit</button>
                  <button onClick={() => setDeletingId(template.id)} className="btn-danger text-xs">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog open={!!deletingId} title="Delete Template" message="Are you sure you want to delete this template? This cannot be undone." onConfirm={handleDelete} onCancel={() => setDeletingId(null)} />
    </div>
  );
}
