import { useState, useEffect, useCallback } from 'react';
import { sendMessage } from '../../shared/messaging';
import type { Session } from '../../shared/types';

interface UseSessionsResult {
  sessions: Session[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSessions(topicId: string): UseSessionsResult {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await sendMessage<Session[]>({ type: 'GET_SESSIONS', payload: { topicId } });
    if (res.ok) {
      setSessions(res.data);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, [topicId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sessions, loading, error, refresh };
}
