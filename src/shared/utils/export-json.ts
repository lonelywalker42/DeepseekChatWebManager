import { sendMessage } from '../messaging';

export async function exportAllAsJSON(): Promise<string> {
  const res = await sendMessage({ type: 'EXPORT_ALL' });
  if (!res.ok) {
    throw new Error((res as { ok: false; error: string }).error);
  }
  return JSON.stringify(res.data, null, 2);
}

export async function importAllFromJSON(jsonString: string): Promise<void> {
  const res = await sendMessage({ type: 'IMPORT_ALL', payload: { data: jsonString } });
  if (!res.ok) {
    throw new Error((res as { ok: false; error: string }).error);
  }
}
