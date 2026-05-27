import type { Topic, Session, Template } from '../types';

/**
 * Generate a continuation prompt by replacing template variables with actual data.
 */
export function generateContinuationPrompt(
  topic: Topic,
  session: Session,
  template: Template,
  sessionCount: number,
): string {
  let result = template.content;

  result = result.replace(/\{topic_title\}/g, topic.title);
  result = result.replace(/\{topic_type\}/g, topic.type);
  result = result.replace(/\{progress_summary\}/g, topic.progressSummary);
  result = result.replace(/\{session_title\}/g, session.title);
  result = result.replace(/\{session_summary\}/g, session.summary || '(no summary)');
  result = result.replace(/\{session_count\}/g, sessionCount.toString());

  return result;
}
