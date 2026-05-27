import * as topicDao from '../shared/dao/topic-dao';
import * as sessionDao from '../shared/dao/session-dao';
import * as templateDao from '../shared/dao/template-dao';
import { UNCATEGORIZED_TOPIC_ID } from '../shared/constants';
import type { MessageRequest, MessageResponse } from '../shared/messaging';
import type { Topic } from '../shared/types';

async function ensureUncategorizedTopic(): Promise<Topic> {
  let topic = await topicDao.getTopicById(UNCATEGORIZED_TOPIC_ID);
  if (!topic) {
    topic = await topicDao.createTopic({
      title: 'Uncategorized',
      type: 'other',
      status: 'active',
      tags: [],
      progressSummary: '',
    });
    // Override the generated id with our fixed one
    await topicDao.updateTopic(topic.id, { id: UNCATEGORIZED_TOPIC_ID } as any);
    // Re-fetch to get the correct id
    topic = await topicDao.getTopicById(UNCATEGORIZED_TOPIC_ID) ?? topic;
  }
  return topic;
}

export async function handleMessage(
  request: MessageRequest,
): Promise<MessageResponse> {
  try {
    switch (request.type) {
      case 'SCRAPE_SESSION': {
        const existing = await sessionDao.getSessionByUrl(request.payload.sourceUrl);
        if (existing) {
          return { conflict: true, existingSession: existing };
        }
        const topicId = request.payload.topicId ?? UNCATEGORIZED_TOPIC_ID;
        if (!request.payload.topicId) {
          await ensureUncategorizedTopic();
        }
        const session = await sessionDao.createSession({
          ...request.payload,
          topicId,
        });
        return { ok: true, data: session };
      }

      case 'GET_TOPICS': {
        const topics = await topicDao.getAllTopics(request.payload);
        return { ok: true, data: topics };
      }

      case 'GET_TOPIC': {
        const topic = await topicDao.getTopicById(request.payload.id);
        return { ok: true, data: topic };
      }

      case 'CREATE_TOPIC': {
        const topic = await topicDao.createTopic(request.payload);
        return { ok: true, data: topic };
      }

      case 'UPDATE_TOPIC': {
        const topic = await topicDao.updateTopic(request.payload.id, request.payload.changes);
        return { ok: true, data: topic };
      }

      case 'DELETE_TOPIC': {
        await sessionDao.deleteSessionsByTopic(request.payload.id);
        await topicDao.deleteTopic(request.payload.id);
        return { ok: true, data: null };
      }

      case 'GET_SESSIONS': {
        const sessions = await sessionDao.getSessionsByTopic(request.payload.topicId);
        return { ok: true, data: sessions };
      }

      case 'GET_SESSION_DETAIL': {
        const session = await sessionDao.getSessionById(request.payload.sessionId);
        return { ok: true, data: session };
      }

      case 'UPDATE_SESSION': {
        const session = await sessionDao.updateSession(request.payload.id, request.payload.changes);
        return { ok: true, data: session };
      }

      case 'DELETE_SESSION': {
        await sessionDao.deleteSession(request.payload.id);
        return { ok: true, data: null };
      }

      case 'CREATE_SESSION': {
        const session = await sessionDao.createSession(request.payload);
        return { ok: true, data: session };
      }

      case 'GET_TEMPLATES': {
        const templates = await templateDao.getAllTemplates();
        return { ok: true, data: templates };
      }

      case 'CREATE_TEMPLATE': {
        const template = await templateDao.createTemplate(request.payload);
        return { ok: true, data: template };
      }

      case 'UPDATE_TEMPLATE': {
        const template = await templateDao.updateTemplate(request.payload.id, request.payload.changes);
        return { ok: true, data: template };
      }

      case 'DELETE_TEMPLATE': {
        await templateDao.deleteTemplate(request.payload.id);
        return { ok: true, data: null };
      }

      case 'SEARCH': {
        const query = request.payload.query.toLowerCase();
        const allSessions = await sessionDao.getAllSessions();
        const results = allSessions
          .map((session) => {
            const titleMatch = session.title.toLowerCase().includes(query);
            const summaryMatch = session.summary?.toLowerCase().includes(query) ?? false;
            const messageMatches = session.messages
              .map((msg, idx) => ({
                index: idx,
                content: msg.content,
                matched: msg.content.toLowerCase().includes(query),
              }))
              .filter((m) => m.matched);

            if (!titleMatch && !summaryMatch && messageMatches.length === 0) return null;

            return {
              session,
              titleMatch,
              summaryMatch,
              messageMatches: messageMatches.map((m) => ({
                index: m.index,
                snippet: m.content.slice(0, 200),
              })),
            };
          })
          .filter(Boolean);

        return { ok: true, data: results };
      }

      case 'EXPORT_TOPIC': {
        const topic = await topicDao.getTopicById(request.payload.topicId);
        if (!topic) return { ok: false, error: 'Topic not found' };
        const sessions = await sessionDao.getSessionsByTopic(request.payload.topicId);
        return { ok: true, data: { topic, sessions } };
      }

      case 'EXPORT_ALL': {
        const topics = await topicDao.getAllTopics();
        const sessions = await sessionDao.getAllSessions();
        const templates = await templateDao.getAllTemplates();
        return { ok: true, data: { topics, sessions, templates } };
      }

      case 'SCRAPE_SUMMARY': {
        const { sessionUrl, summaryText } = request.payload;
        const existingSession = await sessionDao.getSessionByUrl(sessionUrl);
        if (!existingSession) {
          return {
            ok: false,
            error:
              'No session found for this URL. Please scrape the full conversation first.',
          };
        }
        const updated = await sessionDao.updateSession(existingSession.id, {
          summary: summaryText,
        });
        return { ok: true, data: updated };
      }

      case 'IMPORT_ALL': {
        const { topics, sessions, templates } = JSON.parse(request.payload.data);
        // Clear existing data
        const allTopics = await topicDao.getAllTopics();
        for (const t of allTopics) await topicDao.deleteTopic(t.id);
        const allSessions = await sessionDao.getAllSessions();
        for (const s of allSessions) await sessionDao.deleteSession(s.id);
        const allTemplates = await templateDao.getAllTemplates();
        for (const tmpl of allTemplates) await templateDao.deleteTemplate(tmpl.id);
        // Import new data
        for (const t of topics) {
          await topicDao.createTopic(t);
        }
        for (const s of sessions) {
          await sessionDao.createSession(s);
        }
        for (const tmpl of templates) {
          await templateDao.createTemplate(tmpl);
        }
        return { ok: true, data: null };
      }

      default:
        return { ok: false, error: `Unknown message type: ${(request as any).type}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[DeepSeekManager] Message handler error:', message);
    return { ok: false, error: message };
  }
}
