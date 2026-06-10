"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { sessionsApi } from "@/lib/api";
import { ArrowLeft, Trash2, RefreshCw, RotateCcw, Sparkles } from "lucide-react";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = () => {
    setLoading(true);
    sessionsApi.list()
      .then((data) => {
        // Sort by uploaded_at descending
        const sorted = data.sort((a: any, b: any) =>
          (b.uploaded_at || "").localeCompare(a.uploaded_at || "")
        );
        setSessions(sorted);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSessions(); }, []);

  const handleDelete = async (e: React.MouseEvent, sessionId: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`确定删除会话「${title}」？\n\n该操作将同时删除该会话下的所有知识卡片，且不可撤销。`)) return;
    try {
      await sessionsApi.delete(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err: any) {
      alert(`删除失败：${err.message}`);
    }
  };

  const handleRetry = async (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await sessionsApi.retry(sessionId);
      alert("已提交重新处理，请稍后刷新查看结果");
      fetchSessions();
    } catch (err: any) {
      alert(`操作失败：${err.message}`);
    }
  };

  const handleSummarize = async (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await sessionsApi.summarize(sessionId);
      alert("已提交摘要生成，请稍后刷新查看结果");
    } catch (err: any) {
      alert(`操作失败：${err.message}`);
    }
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300">
          <ArrowLeft className="w-4 h-4" /> 返回仪表盘
        </Link>
        <div className="bg-zinc-900 border border-red-800/50 rounded-xl p-8 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300">
            <ArrowLeft className="w-4 h-4" /> 返回
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100">📋 全部会话</h1>
          <span className="text-sm text-zinc-500">共 {sessions.length} 个</span>
        </div>
        <button onClick={fetchSessions} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="text-center text-zinc-500 py-12">加载中...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center text-zinc-500 py-12 bg-zinc-900 rounded-xl border border-zinc-800">
          📭 暂无会话，请先上传对话
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const isFailed = !s.processed_at && s.message_count > 0;
            const noSummary = !s.overall_summary;
            return (
              <Link
                key={s.id}
                href={`/sessions/${s.id}`}
                className="block bg-zinc-900 border border-zinc-800 rounded-lg p-4 card-hover relative group"
              >
                <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {noSummary && (
                    <button
                      onClick={(e) => handleSummarize(e, s.id)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-indigo-900/50 transition-colors"
                      title="生成摘要"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                    </button>
                  )}
                  {isFailed && (
                    <button
                      onClick={(e) => handleRetry(e, s.id)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-yellow-900/50 transition-colors"
                      title="重新处理"
                    >
                      <RotateCcw className="w-4 h-4 text-yellow-400" />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(e, s.id, s.title)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-900/50 transition-colors"
                    title="删除会话"
                  >
                    <Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-400" />
                  </button>
                </div>
                <div className="font-medium text-zinc-200 pr-20">{s.title}</div>
                <div className="flex items-center gap-3 text-sm text-zinc-500 mt-1 flex-wrap">
                  <span>💬 {s.message_count} 条消息</span>
                  <span>🃏 {s.card_count} 张卡片</span>
                  {s.uploaded_at && <span>🕐 {s.uploaded_at.slice(0, 10)}</span>}
                  {isFailed && (
                    <span className="badge badge-yellow">处理未完成</span>
                  )}
                  {s.source_url && (
                    <span className="text-zinc-600 truncate max-w-xs">🔗 {s.source_url}</span>
                  )}
                </div>
                {s.overall_summary && (
                  <div className="text-sm text-zinc-400 mt-2 line-clamp-2">{s.overall_summary}</div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
