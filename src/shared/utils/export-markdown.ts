import type { Topic, Session } from '../types';

export function exportTopicAsMarkdown(topic: Topic, sessions: Session[]): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${topic.title}`);
  lines.push('');

  // Metadata
  lines.push(`**Type**: ${topic.type} | **Status**: ${topic.status} | **Tags**: ${topic.tags.join(', ') || 'None'}`);
  lines.push('');

  // Progress Summary
  lines.push('## Progress Summary');
  lines.push('');
  lines.push(topic.progressSummary || '_No progress summary._');
  lines.push('');

  lines.push('---');
  lines.push('');

  // Sessions
  sessions.forEach((session, index) => {
    lines.push(`## Session ${index + 1}: ${session.title}`);
    lines.push('');

    if (session.sourceUrl) {
      lines.push(`- **Source**: ${session.sourceUrl}`);
    }
    lines.push(`- **Date**: ${new Date(session.createdAt).toLocaleDateString()}`);

    // Parent session
    if (session.parentSessionId) {
      const parentSession = sessions.find((s) => s.id === session.parentSessionId);
      lines.push(`- **Parent**: ${parentSession ? parentSession.title : session.parentSessionId}`);
    } else {
      lines.push('- **Parent**: None');
    }

    lines.push('');

    // Messages
    if (session.messages && session.messages.length > 0) {
      lines.push('### Messages');
      lines.push('');

      for (const msg of session.messages) {
        const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
        lines.push(`**${role}**: ${msg.content}`);
        lines.push('');
      }
    }

    // Summary
    if (session.summary) {
      lines.push('### Summary');
      lines.push('');
      lines.push(session.summary);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  });

  return lines.join('\n');
}
