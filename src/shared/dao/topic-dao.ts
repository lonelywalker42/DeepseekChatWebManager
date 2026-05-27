import { getDB } from '../db';
import { STORES } from '../constants';
import type { Topic, TopicStatus, TopicType } from '../types';

export async function getAllTopics(filters?: { status?: TopicStatus; type?: TopicType }): Promise<Topic[]> {
  const db = await getDB();
  let topics = await db.getAll(STORES.TOPICS);

  if (filters?.status) {
    topics = topics.filter((t) => t.status === filters.status);
  }
  if (filters?.type) {
    topics = topics.filter((t) => t.type === filters.type);
  }

  return topics.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getTopicById(id: string): Promise<Topic | undefined> {
  const db = await getDB();
  return db.get(STORES.TOPICS, id);
}

export async function createTopic(data: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>): Promise<Topic> {
  const db = await getDB();
  const now = Date.now();
  const topic: Topic = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await db.put(STORES.TOPICS, topic);
  return topic;
}

export async function updateTopic(id: string, changes: Partial<Topic>): Promise<Topic | undefined> {
  const db = await getDB();
  const existing = await db.get(STORES.TOPICS, id);
  if (!existing) return undefined;

  const updated: Topic = {
    ...existing,
    ...changes,
    id, // ensure id cannot be changed
    updatedAt: Date.now(),
  };
  await db.put(STORES.TOPICS, updated);
  return updated;
}

export async function deleteTopic(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORES.TOPICS, id);
}
