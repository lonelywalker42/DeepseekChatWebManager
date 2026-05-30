import { useState } from 'react';
import Markdown from 'react-markdown';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
      {/* Toolbar */}
      <div className="flex px-2 py-1" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)' }}>
        <button
          onClick={() => setEditing(false)}
          className="px-3 py-1 text-xs rounded mr-1 transition-all duration-150"
          style={!editing
            ? { backgroundColor: 'var(--color-card-bg)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontWeight: 500, color: 'var(--color-text-primary)' }
            : { color: 'var(--color-text-secondary)' }
          }
          onMouseEnter={(e) => { if (editing) e.currentTarget.style.backgroundColor = 'var(--color-border-light)'; }}
          onMouseLeave={(e) => { if (editing) e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          Preview
        </button>
        <button
          onClick={() => setEditing(true)}
          className="px-3 py-1 text-xs rounded transition-all duration-150"
          style={editing
            ? { backgroundColor: 'var(--color-card-bg)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontWeight: 500, color: 'var(--color-text-primary)' }
            : { color: 'var(--color-text-secondary)' }
          }
          onMouseEnter={(e) => { if (!editing) e.currentTarget.style.backgroundColor = 'var(--color-border-light)'; }}
          onMouseLeave={(e) => { if (!editing) e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          Edit
        </button>
      </div>

      {/* Content */}
      {editing ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Write markdown here...'}
          className="w-full p-3 text-sm min-h-[150px] resize-y focus:outline-none"
          style={{ backgroundColor: 'var(--color-card-bg)', color: 'var(--color-text-primary)' }}
          autoFocus
        />
      ) : (
        <div className="p-3 prose prose-sm dark:prose-invert max-w-none min-h-[150px]" style={{ backgroundColor: 'var(--color-card-bg)' }}>
          {value ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="italic" style={{ color: 'var(--color-text-tertiary)' }}>{placeholder || 'Nothing to preview'}</p>
          )}
        </div>
      )}
    </div>
  );
}
