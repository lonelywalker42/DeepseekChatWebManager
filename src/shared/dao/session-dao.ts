import { getDB } from '../db';
import { STORES } from '../constants';
import type { Session, ScrapedSessionData } from '../types';

export async function getSessionsByTopic(topicId: string): Promise<Session[]> {
  const db = await getDB();
  const sessions = await db.getAllFromIndex(STORES.SESSIONS, 'by-topic', topicId);
  return sessions.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getSessionById(id: string): Promise<Session | undefined> {
  const db = await getDB();
  return db.get(STORES.SESSIONS, id);
}

export async function getSessionByUrl(url: string): Promise<Session | undefined> {
  const db = await getDB();
  return db.getFromIndex(STORES.SESSIONS, 'by-url', url);
}

export async function createSession(
  data: ScrapedSessionData & { topicId: string },
): Promise<Session> {
  const db = await getDB();
  const session: Session = {
    id: crypto.randomUUID(),
    topicId: data.topicId,
    title: data.title,
    sourceUrl: data.sourceUrl,
    createdAt: Date.now(),
    messages: data.messages,
  };
  await db.put(STORES.SESSIONS, session);
  return session;
}

export async function updateSession(
  id: string,
  changes: Partial<Session>,
): Promise<Session | undefined> {
  const db = await getDB();
  const existing = await db.get(STORES.SESSIONS, id);
  if (!existing) return undefined;

  const updated: Session = {
    ...existing,
    ...changes,
    id, // ensure id cannot be changed
  };
  await db.put(STORES.SESSIONS, updated);
  return updated;
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORES.SESSIONS, id);
}

export async function deleteSessionsByTopic(topicId: string): Promise<void> {
  const db = await getDB();
  const sessions = await db.getAllFromIndex(STORES.SESSIONS, 'by-topic', topicId);
  const tx = db.transaction(STORES.SESSIONS, 'readwrite');
  for (const session of sessions) {
    await tx.store.delete(session.id);
  }
  await tx.done;
}

export async function getAllSessions(): Promise<Session[]> {
  const db = await getDB();
  return db.getAll(STORES.SESSIONS);
}
