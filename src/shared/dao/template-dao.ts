import { getDB } from '../db';
import { STORES } from '../constants';
import type { Template } from '../types';

export async function getAllTemplates(): Promise<Template[]> {
  const db = await getDB();
  return db.getAll(STORES.TEMPLATES);
}

export async function getTemplateById(id: string): Promise<Template | undefined> {
  const db = await getDB();
  return db.get(STORES.TEMPLATES, id);
}

export async function createTemplate(
  data: Omit<Template, 'id' | 'createdAt'>,
): Promise<Template> {
  const db = await getDB();
  const template: Template = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  await db.put(STORES.TEMPLATES, template);
  return template;
}

export async function updateTemplate(
  id: string,
  changes: Partial<Template>,
): Promise<Template | undefined> {
  const db = await getDB();
  const existing = await db.get(STORES.TEMPLATES, id);
  if (!existing) return undefined;

  const updated: Template = {
    ...existing,
    ...changes,
    id,
  };
  await db.put(STORES.TEMPLATES, updated);
  return updated;
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORES.TEMPLATES, id);
}
