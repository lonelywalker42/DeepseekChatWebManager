import { useState, useEffect, useCallback } from 'react';
import { sendMessage } from '../../shared/messaging';
import type { Topic, TopicStatus, TopicType } from '../../shared/types';

interface UseTopicsResult {
  topics: Topic[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useTopics(filters?: { status?: TopicStatus; type?: TopicType }): UseTopicsResult {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await sendMessage<Topic[]>({ type: 'GET_TOPICS', payload: filters });
    if (res.ok) {
      setTopics(res.data);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, [filters?.status, filters?.type]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { topics, loading, error, refresh };
}
