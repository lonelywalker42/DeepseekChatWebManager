import Markdown from 'react-markdown';
import type { Message } from '../../shared/types';

interface MessageViewerProps {
  messages: Message[];
}

export default function MessageViewer({ messages }: MessageViewerProps) {
  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
          <span className="text-xl">💬</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>No messages yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((msg, idx) => {
        const isUser = msg.role === 'user';
        const isAssistant = msg.role === 'assistant';
        const isThinking = msg.role === 'thinking';

        // Role label
        const label = isUser ? 'You' : msg.role === 'assistant' ? 'Assistant' : msg.role === 'thinking' ? 'Thinking' : 'System';

        // Bubble styles
        let bubbleStyle: React.CSSProperties;
        let labelColor: string;
        let dotColor: string;

        if (isUser) {
          bubbleStyle = { backgroundColor: '#4f46e5', color: '#fff', borderRadius: '16px 16px 4px 16px' };
          labelColor = 'rgba(165,180,252,0.8)';
          dotColor = '#818cf8';
        } else if (isAssistant) {
          bubbleStyle = { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderRadius: '16px 16px 16px 4px' };
          labelColor = 'var(--color-text-tertiary)';
          dotColor = '#34d399';
        } else if (isThinking) {
          bubbleStyle = { backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-text-primary)', borderRadius: '16px 16px 16px 4px', border: '1px solid var(--color-border)' };
          labelColor = 'var(--color-accent)';
          dotColor = '#a78bfa';
        } else {
          bubbleStyle = { backgroundColor: 'var(--color-warning-subtle)', color: 'var(--color-text-primary)', borderRadius: '16px 16px 16px 4px', border: '1px solid var(--color-border)' };
          labelColor = 'var(--color-warning)';
          dotColor = '#fbbf24';
        }

        return (
          <div
            key={idx}
            className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            {!isUser && (
              <div className="w-2 h-2 rounded-full flex-shrink-0 mb-2" style={{ backgroundColor: dotColor }} />
            )}

            <div className={`max-w-[80%] ${isUser ? 'order-1' : ''}`}>
              <div className="text-xs font-medium mb-1 px-1" style={{ color: labelColor }}>
                {label}
              </div>

              <div className="px-4 py-2.5" style={bubbleStyle}>
                {isAssistant ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                ) : isThinking ? (
                  <div className="text-sm whitespace-pre-wrap font-mono opacity-80">
                    {msg.content}
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>

              {msg.timestamp && (
                <div className={`text-xs mt-1 px-1 ${isUser ? 'text-right' : ''}`} style={{ color: 'var(--color-text-tertiary)' }}>
                  {new Date(msg.timestamp).toLocaleString()}
                </div>
              )}
            </div>

            {isUser && (
              <div className="w-2 h-2 rounded-full flex-shrink-0 mb-2 order-2" style={{ backgroundColor: dotColor }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
