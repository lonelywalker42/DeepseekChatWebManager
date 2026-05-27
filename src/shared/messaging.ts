import type { Topic, Session, Template, ScrapedSessionData, TopicStatus, TopicType } from './types';

// Request types
export type MessageRequest =
  | { type: 'SCRAPE_SESSION'; payload: ScrapedSessionData & { topicId?: string } }
  | { type: 'GET_TOPICS'; payload?: { status?: TopicStatus; type?: TopicType } }
  | { type: 'GET_TOPIC'; payload: { id: string } }
  | { type: 'CREATE_TOPIC'; payload: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'> }
  | { type: 'UPDATE_TOPIC'; payload: { id: string; changes: Partial<Topic> } }
  | { type: 'DELETE_TOPIC'; payload: { id: string } }
  | { type: 'GET_SESSIONS'; payload: { topicId: string } }
  | { type: 'GET_SESSION_DETAIL'; payload: { sessionId: string } }
  | { type: 'UPDATE_SESSION'; payload: { id: string; changes: Partial<Session> } }
  | { type: 'DELETE_SESSION'; payload: { id: string } }
  | { type: 'CREATE_SESSION'; payload: ScrapedSessionData & { topicId: string } }
  | { type: 'GET_TEMPLATES' }
  | { type: 'CREATE_TEMPLATE'; payload: Omit<Template, 'id' | 'createdAt'> }
  | { type: 'UPDATE_TEMPLATE'; payload: { id: string; changes: Partial<Template> } }
  | { type: 'DELETE_TEMPLATE'; payload: { id: string } }
  | { type: 'SEARCH'; payload: { query: string } }
  | { type: 'EXPORT_TOPIC'; payload: { topicId: string } }
  | { type: 'EXPORT_ALL' }
  | { type: 'IMPORT_ALL'; payload: { data: string } }
  | { type: 'SCRAPE_SUMMARY'; payload: { sessionUrl: string; summaryText: string } };

// Response types
export type MessageResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string }
  | { conflict: true; existingSession: Session };

// Send a message to the background service worker
export async function sendMessage<T = unknown>(msg: MessageRequest): Promise<MessageResponse<T>> {
  return chrome.runtime.sendMessage(msg);
}
