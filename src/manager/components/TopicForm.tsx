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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">{isEdit ? 'Edit Topic' : 'New Topic'}</h2>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter topic title"
                className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TopicType)}
                className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TopicStatus)}
                className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags <span className="text-gray-400">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. react, typescript, chrome-extension"
                className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Progress Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Progress Summary
              </label>
              <textarea
                value={progressSummary}
                onChange={(e) => setProgressSummary(e.target.value)}
                placeholder="Describe the current progress..."
                rows={4}
                className="w-full px-3 py-2 border rounded text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Topic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
