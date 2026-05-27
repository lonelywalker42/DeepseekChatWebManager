import { openDB, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, STORES } from './constants';

let dbInstance: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Topics store
      if (!db.objectStoreNames.contains(STORES.TOPICS)) {
        const topicStore = db.createObjectStore(STORES.TOPICS, { keyPath: 'id' });
        topicStore.createIndex('by-status', 'status');
        topicStore.createIndex('by-type', 'type');
        topicStore.createIndex('by-updated', 'updatedAt');
      }

      // Sessions store
      if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
        const sessionStore = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
        sessionStore.createIndex('by-topic', 'topicId');
        sessionStore.createIndex('by-url', 'sourceUrl', { unique: true });
        sessionStore.createIndex('by-created', 'createdAt');
      }

      // Templates store
      if (!db.objectStoreNames.contains(STORES.TEMPLATES)) {
        const templateStore = db.createObjectStore(STORES.TEMPLATES, { keyPath: 'id' });
        templateStore.createIndex('by-name', 'name');
      }
    },
  });

  return dbInstance;
}
