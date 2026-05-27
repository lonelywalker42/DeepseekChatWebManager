import { useNavigate } from 'react-router-dom';
import type { Session } from '../../shared/types';

interface SessionCardProps {
  session: Session;
  parentTitle?: string;
  onDelete?: (sessionId: string) => void;
}

export default function SessionCard({ session, parentTitle, onDelete }: SessionCardProps) {
  const navigate = useNavigate();

  const messageCount = session.messages?.length ?? 0;
  const previewText = session.summary ? session.summary.slice(0, 100) : '';

  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div
          className="flex-1 cursor-pointer min-w-0"
          onClick={() => navigate(`/session/${session.id}`)}
        >
          <h4 className="font-medium text-sm text-gray-900 truncate">{session.title}</h4>

          {session.sourceUrl && (
            <a
              href={session.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline truncate block mt-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {session.sourceUrl}
            </a>
          )}

          {parentTitle && (
            <p className="text-xs text-gray-500 mt-1">
              Continuation of: <span className="font-medium">{parentTitle}</span>
            </p>
          )}

          {previewText && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{previewText}</p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span>{messageCount} message{messageCount !== 1 ? 's' : ''}</span>
            <span>{new Date(session.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(session.id);
            }}
            className="ml-3 p-1 text-gray-400 hover:text-red-500 rounded"
            title="Delete session"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
