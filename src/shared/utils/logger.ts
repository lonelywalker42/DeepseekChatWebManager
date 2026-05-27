export interface LogEntry {
  timestamp: number;
  message: string;
  details?: string;
}

const STORAGE_KEY = 'error_log';
const MAX_ENTRIES = 50;

export function logError(message: string, details?: unknown): void {
  console.error('[DeepSeekManager]', message, details);

  const entry: LogEntry = {
    timestamp: Date.now(),
    message,
    details: details !== undefined ? String(details) : undefined,
  };

  try {
    chrome.storage.local.get(STORAGE_KEY, (result: Record<string, LogEntry[]>) => {
      const log: LogEntry[] = result[STORAGE_KEY] || [];
      log.unshift(entry);
      // Keep only the last MAX_ENTRIES
      const trimmed = log.slice(0, MAX_ENTRIES);
      chrome.storage.local.set({ [STORAGE_KEY]: trimmed });
    });
  } catch {
    // storage may be unavailable
  }
}

export async function getRecentErrors(): Promise<LogEntry[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return (result[STORAGE_KEY] as LogEntry[]) || [];
  } catch {
    return [];
  }
}

export async function clearErrors(): Promise<void> {
  try {
    await chrome.storage.local.remove(STORAGE_KEY);
  } catch {
    // ignore
  }
}
