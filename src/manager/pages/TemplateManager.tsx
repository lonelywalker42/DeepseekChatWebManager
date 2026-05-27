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

type EditingTemplate = {
  id?: string;
  name: string;
  content: string;
  isDefault: boolean;
};

export default function TemplateManager() {
  const showToast = useAppStore((s) => s.showToast);
  const { templates, loading, refresh } = useTemplates();

  const [editing, setEditing] = useState<EditingTemplate | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const handleNew = () => {
    setEditing({ name: '', content: '', isDefault: false });
  };

  const handleEdit = (template: Template) => {
    setEditing({
      id: template.id,
      name: template.name,
      content: template.content,
      isDefault: template.isDefault,
    });
  };

  const handleSave = async () => {
    if (!editing) return;

    if (!editing.name.trim()) {
      showToast('Template name is required', 'error');
      return;
    }

    if (editing.id) {
      // Update existing
      const res = await sendMessage({
        type: 'UPDATE_TEMPLATE',
        payload: {
          id: editing.id,
          changes: {
            name: editing.name,
            content: editing.content,
            isDefault: editing.isDefault,
          },
        },
      });
      if (res.ok) {
        showToast('Template updated');
        setEditing(null);
        await refresh();
      } else {
        showToast(res.error, 'error');
      }
    } else {
      // Create new
      const res = await sendMessage({
        type: 'CREATE_TEMPLATE',
        payload: {
          name: editing.name,
          content: editing.content,
          isDefault: editing.isDefault,
        },
      });
      if (res.ok) {
        showToast('Template created');
        setEditing(null);
        await refresh();
      } else {
        showToast(res.error, 'error');
      }
    }
  };

  const handleSetDefault = async (id: string) => {
    // First, unset all defaults
    const unsetPromises = templates
      .filter((t) => t.isDefault && t.id !== id)
      .map((t) =>
        sendMessage({
          type: 'UPDATE_TEMPLATE',
          payload: { id: t.id, changes: { isDefault: false } },
        }),
      );
    await Promise.all(unsetPromises);

    // Then set the new default
    const res = await sendMessage({
      type: 'UPDATE_TEMPLATE',
      payload: { id, changes: { isDefault: true } },
    });
    if (res.ok) {
      showToast('Default template updated');
      await refresh();
    } else {
      showToast(res.error, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const res = await sendMessage({ type: 'DELETE_TEMPLATE', payload: { id: deletingId } });
    if (res.ok) {
      showToast('Template deleted');
      await refresh();
    } else {
      showToast(res.error, 'error');
    }
    setDeletingId(null);
  };

  const insertVariable = useCallback((variable: string) => {
    const textarea = contentRef.current;
    if (!textarea || !editing) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent =
      editing.content.substring(0, start) + variable + editing.content.substring(end);

    setEditing({ ...editing, content: newContent });

    // Restore cursor position after the inserted variable
    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + variable.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  }, [editing]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500 text-sm">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Templates</h1>
        <button
          onClick={handleNew}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + New Template
        </button>
      </div>

      {/* Editor */}
      {editing && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            {editing.id ? 'Edit Template' : 'New Template'}
          </h2>

          {/* Name */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input
              type="text"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="Template name"
              className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-4">
            {/* Content */}
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Content</label>
              <textarea
                ref={contentRef}
                value={editing.content}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                placeholder="Write your template content here. Use variables like {topic_title} for dynamic values."
                rows={12}
                className="w-full px-3 py-2 border rounded text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Variable reference panel */}
            <div className="w-64 flex-shrink-0">
              <label className="block text-xs text-gray-500 mb-1">Available Variables</label>
              <div className="border rounded p-3 bg-gray-50 space-y-2">
                <p className="text-xs text-gray-400 mb-2">
                  Click a variable to insert it at the cursor position.
                </p>
                {AVAILABLE_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => insertVariable(v.key)}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-blue-50 group"
                  >
                    <code className="text-xs text-blue-600 font-mono group-hover:text-blue-800">
                      {v.key}
                    </code>
                    <div className="text-xs text-gray-400">{v.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Default checkbox */}
          <div className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={editing.isDefault}
              onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="isDefault" className="text-sm text-gray-600">
              Set as default template
            </label>
          </div>

          {/* Actions */}
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setEditing(null)}
              className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {editing.id ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Template list */}
      {templates.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-8">
          No templates yet. Create one to get started with continuation prompts.
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white border rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900">{template.name}</h3>
                    {template.isDefault && (
                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-3">
                    {template.content.length > 200
                      ? template.content.substring(0, 200) + '...'
                      : template.content || '(empty)'}
                  </p>
                </div>
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  {!template.isDefault && (
                    <button
                      onClick={() => handleSetDefault(template.id)}
                      className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                      title="Set as default"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(template)}
                    className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingId(template.id)}
                    className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deletingId}
        title="Delete Template"
        message="Are you sure you want to delete this template? This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
