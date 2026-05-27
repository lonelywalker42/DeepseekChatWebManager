import { useState, useEffect, useCallback } from 'react';
import { sendMessage } from '../../shared/messaging';
import type { Template } from '../../shared/types';

interface UseTemplatesResult {
  templates: Template[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useTemplates(): UseTemplatesResult {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await sendMessage<Template[]>({ type: 'GET_TEMPLATES' });
    if (res.ok) {
      setTemplates(res.data);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { templates, loading, error, refresh };
}
