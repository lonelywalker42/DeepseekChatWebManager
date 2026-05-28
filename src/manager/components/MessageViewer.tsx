import Markdown from 'react-markdown';
import type { Message } from '../../shared/types';

interface MessageViewerProps {
  messages: Message[];
}

export default function MessageViewer({ messages }: MessageViewerProps) {
  if (!messages || messages.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-8">No messages yet.</div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg, idx) => {
        const isUser = msg.role === 'user';
        const isAssistant = msg.role === 'assistant';
        const isThinking = msg.role === 'thinking';

        return (
          <div
            key={idx}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2.5 ${
                isUser
                  ? 'bg-blue-600 text-white'
                  : isThinking
                  ? 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                  : isAssistant
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-yellow-50 text-yellow-900 border border-yellow-200'
              }`}
            >
              {/* Role label */}
              <div
                className={`text-xs font-medium mb-1 ${
                  isUser
                    ? 'text-blue-200'
                    : isThinking
                    ? 'text-indigo-500'
                    : isAssistant
                    ? 'text-gray-400'
                    : 'text-yellow-600'
                }`}
              >
                {isUser ? 'You' : isThinking ? 'Thinking' : isAssistant ? 'Assistant' : 'System'}
                {msg.timestamp && (
                  <span className="ml-2 font-normal">
                    {new Date(msg.timestamp).toLocaleString()}
                  </span>
                )}
              </div>

              {/* Content */}
              {isAssistant ? (
                <div className="prose prose-sm max-w-none text-gray-900">
                  <Markdown>{msg.content}</Markdown>
                </div>
              ) : isThinking ? (
                <div className="text-sm whitespace-pre-wrap font-mono text-indigo-800 opacity-80">{msg.content}</div>
              ) : (
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
