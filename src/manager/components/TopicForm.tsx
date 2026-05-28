import { useState, useEffect } from 'react';
import { sendMessage } from '../../shared/messaging';
import { useAppStore } from '../stores/app-store';
import type { Topic, TopicType, TopicStatus } from '../../shared/types';

interface TopicFormProps {
  topic?: Topic | null;
  onClose: () => void;
  onSaved: () => void;
}

const TOPIC_TYPES: { value: TopicType; label: string }[] = [
  { value: 'idea-discussion', label: 'Idea Discussion' },
  { value: 'code-generation', label: 'Code Generation' },
  { value: 'knowledge-qa', label: 'Knowledge QA' },
  { value: 'other', label: 'Other' },
];

const TOPIC_STATUSES: { value: TopicStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

export default function TopicForm({ topic, onClose, onSaved }: TopicFormProps) {
  const showToast = useAppStore((s) => s.showToast);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<TopicType>('other');
  const [status, setStatus] = useState<TopicStatus>('active');
  const [tagsInput, setTagsInput] = useState('');
  const [progressSummary, setProgressSummary] = useState('');

  const isEdit = !!topic;

  useEffect(() => {
    if (topic) {
      setTitle(topic.title);
      setType(topic.type);
      setStatus(topic.status);
      setTagsInput(topic.tags.join(', '));
      setProgressSummary(topic.progressSummary);
    }
  }, [topic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Title is required', 'error');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      if (isEdit) {
        const res = await sendMessage({
          type: 'UPDATE_TOPIC',
          payload: {
            id: topic!.id,
            changes: { title: title.trim(), type, status, tags, progressSummary },
          },
        });
        if (res.ok) {
          showToast('Topic updated');
          onSaved();
        } else {
          showToast(res.error, 'error');
        }
      } else {
        const res = await sendMessage({
          type: 'CREATE_TOPIC',
          payload: { title: title.trim(), type, status, tags, progressSummary },
        });
        if (res.ok) {
          showToast('Topic created');
          onSaved();
        } else {
          showToast(res.error, 'error');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-dialog w-full max-w-lg mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">{isEdit ? 'Edit Topic' : 'New Topic'}</h2>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter topic title"
                className="input"
                autoFocus
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TopicType)}
                className="input"
              >
                {TOPIC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TopicStatus)}
                className="input"
              >
                {TOPIC_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tags <span className="text-slate-400">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. react, typescript, chrome-extension"
                className="input"
              />
            </div>

            {/* Progress Summary */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Progress Summary
              </label>
              <textarea
                value={progressSummary}
                onChange={(e) => setProgressSummary(e.target.value)}
                placeholder="Describe the current progress..."
                rows={4}
                className="input resize-y"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Topic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
