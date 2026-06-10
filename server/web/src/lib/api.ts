const API_BASE = "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
    });
  } catch (e: any) {
    throw new Error(`无法连接到后端服务 (${API_BASE})，请确认服务已启动`);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Sessions ──
export const sessionsApi = {
  list: () => request<any[]>("/api/v1/sessions/"),
  get: (id: string) => request<any>(`/api/v1/sessions/${id}`),
  messages: (id: string) => request<any>(`/api/v1/sessions/${id}/messages`),
  delete: (id: string) => request<any>(`/api/v1/sessions/${id}`, { method: "DELETE" }),
  upload: (data: any) => request<any>("/api/v1/sessions/upload", { method: "POST", body: JSON.stringify(data) }),
};

// ── Cards ──
export const cardsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<any[]>(`/api/v1/cards/${qs}`);
  },
  get: (id: string) => request<any>(`/api/v1/cards/${id}`),
  delete: (id: string) => request<any>(`/api/v1/cards/${id}`, { method: "DELETE" }),
  search: (query: string, limit = 20) =>
    request<any[]>("/api/v1/cards/search", { method: "POST", body: JSON.stringify({ query, limit }) }),
  tags: () => request<any[]>("/api/v1/cards/tags/all"),
};

// ── Tags ──
export const tagsApi = {
  list: (status?: string) => {
    const qs = status ? `?status=${status}` : "";
    return request<any[]>(`/api/v1/tags/${qs}`);
  },
  pending: () => request<any[]>("/api/v1/tags/pending"),
  confirm: (name: string) => request<any>(`/api/v1/tags/${encodeURIComponent(name)}/confirm`, { method: "PUT" }),
  merge: (sourceTags: string[], targetName: string) =>
    request<any>("/api/v1/tags/merge", {
      method: "PUT",
      body: JSON.stringify({ source_tags: sourceTags, target_name: targetName }),
    }),
  delete: (name: string) => request<any>(`/api/v1/tags/${encodeURIComponent(name)}`, { method: "DELETE" }),
};

// ── Graph ──
export const graphApi = {
  nodes: () => request<any[]>("/api/v1/graph/nodes"),
  edges: () => request<any[]>("/api/v1/graph/edges"),
  neighbors: (cardId: string, depth = 1) => request<any>(`/api/v1/graph/neighbors/${cardId}?depth=${depth}`),
};

// ── Import ──
export const importApi = {
  upload: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/api/v1/import/upload`, { method: "POST", body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  },
};

// ── Tasks ──
export const tasksApi = {
  get: (id: string) => request<any>(`/api/v1/tasks/${id}`),
};

// ── Settings ──
export const settingsApi = {
  getLLM: () => request<{ api_key_masked: string; base_url: string; model: string }>("/api/v1/settings/llm"),
  updateLLM: (config: { api_key?: string; base_url?: string; model?: string }) =>
    request<any>("/api/v1/settings/llm", { method: "PUT", body: JSON.stringify(config) }),
};

// ── Health ──
export const healthApi = {
  check: () => request<any>("/health"),
};
