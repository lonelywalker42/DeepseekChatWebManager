import Markdown from 'react-markdown';
import type { Message } from '../../shared/types';

interface MessageViewerProps {
  messages: Message[];
}

const roleConfig = {
  user: {
    label: 'You',
    bubbleClass: 'bg-indigo-600 text-white rounded-2xl rounded-br-md',
    labelClass: 'text-indigo-200',
    dotColor: 'bg-indigo-400',
  },
  assistant: {
    label: 'Assistant',
    bubbleClass: 'bg-slate-100 text-slate-800 rounded-2xl rounded-bl-md',
    labelClass: 'text-slate-400',
    dotColor: 'bg-emerald-400',
  },
  thinking: {
    label: 'Thinking',
    bubbleClass: 'bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-2xl rounded-bl-md',
    labelClass: 'text-indigo-500',
    dotColor: 'bg-violet-400',
  },
  system: {
    label: 'System',
    bubbleClass: 'bg-amber-50 text-amber-900 border border-amber-200 rounded-2xl rounded-bl-md',
    labelClass: 'text-amber-600',
    dotColor: 'bg-amber-400',
  },
};

export default function MessageViewer({ messages }: MessageViewerProps) {
  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <span className="text-xl">💬</span>
        </div>
        <p className="text-sm">No messages yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((msg, idx) => {
        const config = roleConfig[msg.role] || roleConfig.system;
        const isUser = msg.role === 'user';

        return (
          <div
            key={idx}
            className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            {/* Avatar dot for non-user messages */}
            {!isUser && (
              <div className={`w-2 h-2 rounded-full ${config.dotColor} flex-shrink-0 mb-2`} />
            )}

            <div className={`max-w-[80%] ${isUser ? 'order-1' : ''}`}>
              {/* Role label */}
              <div className={`text-xs font-medium mb-1 px-1 ${config.labelClass}`}>
                {config.label}
              </div>

              {/* Bubble */}
              <div className={`px-4 py-2.5 ${config.bubbleClass}`}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none text-slate-800">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                ) : msg.role === 'thinking' ? (
                  <div className="text-sm whitespace-pre-wrap font-mono text-indigo-800 opacity-80">
                    {msg.content}
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>

              {/* Timestamp */}
              {msg.timestamp && (
                <div className={`text-xs text-slate-400 mt-1 px-1 ${isUser ? 'text-right' : ''}`}>
                  {new Date(msg.timestamp).toLocaleString()}
                </div>
              )}
            </div>

            {/* Avatar dot for user messages */}
            {isUser && (
              <div className={`w-2 h-2 rounded-full ${config.dotColor} flex-shrink-0 mb-2 order-2`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
