"use client";

import { useEffect, useState } from "react";
import { tagsApi } from "@/lib/api";
import { Check, Merge, Trash2, RefreshCw } from "lucide-react";

export default function TagsPage() {
  const [tags, setTags] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mergeTarget, setMergeTarget] = useState("");
  const [tab, setTab] = useState<"all" | "pending">("pending");

  const refresh = () => {
    setLoading(true);
    Promise.all([tagsApi.list(), tagsApi.pending()])
      .then(([all, p]) => { setTags(all); setPending(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const confirmTag = async (name: string) => {
    await tagsApi.confirm(name);
    refresh();
  };

  const deleteTag = async (name: string) => {
    if (!confirm(`确定删除标签「${name}」？`)) return;
    await tagsApi.delete(name);
    refresh();
  };

  const mergeTags = async () => {
    const sourceTags = Array.from(selected);
    if (sourceTags.length < 2 || !mergeTarget) return;
    await tagsApi.merge(sourceTags, mergeTarget);
    setSelected(new Set());
    setMergeTarget("");
    refresh();
  };

  const toggleSelect = (name: string) => {
    const next = new Set(selected);
    next.has(name) ? next.delete(name) : next.add(name);
    setSelected(next);
  };

  const list = tab === "pending" ? pending : tags;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">🏷️ 标签审核</h1>
        <button onClick={refresh} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "pending" ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20" : "bg-zinc-900 text-zinc-400 border border-zinc-800"}`}
        >
          待审核 ({pending.length})
        </button>
        <button
          onClick={() => setTab("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "all" ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20" : "bg-zinc-900 text-zinc-400 border border-zinc-800"}`}
        >
          全部标签 ({tags.length})
        </button>
      </div>

      {/* Merge bar */}
      {selected.size >= 2 && (
        <div className="bg-zinc-900 border border-indigo-500/20 rounded-xl p-4 flex items-center gap-3">
          <span className="text-sm text-zinc-300">已选 {selected.size} 个标签，合并为：</span>
          <input
            type="text"
            placeholder="目标标签名"
            value={mergeTarget}
            onChange={(e) => setMergeTarget(e.target.value)}
            className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200"
          />
          <button
            onClick={mergeTags}
            disabled={!mergeTarget}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm text-white"
          >
            <Merge className="w-4 h-4 inline mr-1" /> 合并
          </button>
        </div>
      )}

      {/* Tag list */}
      {loading ? (
        <div className="text-center text-zinc-500 py-8">加载中...</div>
      ) : list.length === 0 ? (
        <div className="text-center text-zinc-500 py-12 bg-zinc-900 rounded-xl border border-zinc-800">
          {tab === "pending" ? "✅ 没有待审核的标签" : "📭 暂无标签"}
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((t: any) => (
            <div key={t.name} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center gap-4 card-hover">
              <input
                type="checkbox"
                checked={selected.has(t.name)}
                onChange={() => toggleSelect(t.name)}
                className="w-4 h-4 accent-indigo-500"
              />
              <div className="flex-1">
                <span className="font-medium text-zinc-200">{t.name}</span>
                <span className="text-sm text-zinc-500 ml-3">使用 {t.usage_count} 次 · {t.card_count ?? 0} 张卡片</span>
              </div>
              <span className={`badge ${t.status === "confirmed" ? "badge-green" : "badge-yellow"}`}>
                {t.status === "confirmed" ? "已确认" : "待审核"}
              </span>
              {t.status !== "confirmed" && (
                <button onClick={() => confirmTag(t.name)} className="p-1.5 rounded bg-zinc-800 hover:bg-green-900/30 text-zinc-400 hover:text-green-400" title="确认">
                  <Check className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => deleteTag(t.name)} className="p-1.5 rounded bg-zinc-800 hover:bg-red-900/30 text-zinc-400 hover:text-red-400" title="删除">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
