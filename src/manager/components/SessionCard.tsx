import { useNavigate } from 'react-router-dom';
import { Trash2, ExternalLink, ArrowRight } from 'lucide-react';
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
    <div className="card p-4 group">
      <div className="flex items-start justify-between">
        <div
          className="flex-1 cursor-pointer min-w-0"
          onClick={() => navigate(`/session/${session.id}`)}
        >
          <h4 className="font-semibold text-sm text-slate-900 truncate">{session.title}</h4>

          {session.sourceUrl && (
            <a
              href={session.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-600 hover:text-brand-700 hover:underline truncate flex items-center gap-1 mt-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              {session.sourceUrl.replace(/^https?:\/\//, '').slice(0, 40)}
            </a>
          )}

          {parentTitle && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <ArrowRight className="w-3 h-3 flex-shrink-0" />
              Continuation of: <span className="font-medium">{parentTitle}</span>
            </p>
          )}

          {previewText && (
            <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{previewText}</p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
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
            className="ml-3 p-1 text-slate-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete session"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
