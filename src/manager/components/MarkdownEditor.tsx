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
    <div className="border rounded">
      {/* Toolbar */}
      <div className="flex border-b bg-gray-50 px-2 py-1 rounded-t">
        <button
          onClick={() => setEditing(false)}
          className={`px-3 py-1 text-xs rounded mr-1 ${
            !editing ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          Preview
        </button>
        <button
          onClick={() => setEditing(true)}
          className={`px-3 py-1 text-xs rounded ${
            editing ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:bg-gray-100'
          }`}
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
          autoFocus
        />
      ) : (
        <div className="p-3 prose prose-sm max-w-none min-h-[150px]">
          {value ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-gray-400 italic">{placeholder || 'Nothing to preview'}</p>
          )}
        </div>
      )}
    </div>
  );
}
