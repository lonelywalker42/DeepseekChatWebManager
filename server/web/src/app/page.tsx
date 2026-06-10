"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { sessionsApi, cardsApi, tagsApi } from "@/lib/api";
import { BookOpen, MessageSquare, Tags, Globe, Trash2 } from "lucide-react";

export default function Home() {
  const [stats, setStats] = useState({ sessions: 0, cards: 0, tags: 0, domains: 0 });
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([sessionsApi.list(), cardsApi.list({ limit: "200" }), tagsApi.list()])
      .then(([s, c, t]) => {
        const domains = new Set<string>();
        s.forEach((sess: any) => sess.knowledge_domain?.forEach((d: string) => domains.add(d)));
        setStats({ sessions: s.length, cards: c.length, tags: t.length, domains: domains.size });
        setSessions(s.slice(0, 5));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`确定删除会话「${title}」？\n\n该操作将同时删除该会话下的所有知识卡片，且不可撤销。`)) return;
    try {
      await sessionsApi.delete(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setStats((prev) => ({ ...prev, sessions: prev.sessions - 1 }));
    } catch (err: any) {
      alert(`删除失败：${err.message}`);
    }
  };

  const statCards = [
    { icon: MessageSquare, label: "会话", value: stats.sessions, color: "text-indigo-400", href: "/sessions" },
    { icon: BookOpen, label: "知识卡片", value: stats.cards, color: "text-purple-400", href: "/cards" },
    { icon: Tags, label: "标签", value: stats.tags, color: "text-pink-400", href: "/tags" },
    { icon: Globe, label: "知识领域", value: stats.domains, color: "text-cyan-400", href: null },
  ];

  if (error) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="bg-gradient-to-br from-zinc-900 via-indigo-950/30 to-zinc-900 rounded-2xl p-8 border border-zinc-800">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">🧠 DeepSeek 知识库</h1>
          <p className="text-zinc-400 text-lg">AI 驱动的个人知识管理系统</p>
        </div>
        <div className="bg-zinc-900 border border-red-800/50 rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-zinc-200 mb-2">无法连接后端服务</h2>
          <p className="text-zinc-400 mb-4">{error}</p>
          <p className="text-sm text-zinc-500">请先启动后端服务：运行 <code className="bg-zinc-800 px-2 py-1 rounded text-indigo-400">start.bat</code> 或手动执行：</p>
          <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 mt-3 text-sm text-zinc-300 text-left inline-block">
            cd server{'\n'}python -m uvicorn main:app --reload --port 8000
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-gradient-to-br from-zinc-900 via-indigo-950/30 to-zinc-900 rounded-2xl p-8 border border-zinc-800">
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">🧠 DeepSeek 知识库</h1>
        <p className="text-zinc-400 text-lg">AI 驱动的个人知识管理系统</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Card = s.href ? Link : "div";
          return (
            <Card key={s.label} href={s.href as any} className={`bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-center card-hover ${s.href ? "cursor-pointer" : ""}`}>
              <s.icon className={`w-8 h-8 mx-auto mb-2 ${s.color}`} />
              <div className="text-3xl font-bold text-zinc-100">{loading ? "..." : s.value}</div>
              <div className="text-sm text-zinc-500 mt-1">{s.label}</div>
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-zinc-200 mb-4">📋 最近会话</h2>
        {sessions.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
            暂无数据，请先上传对话
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <Link key={s.id} href={`/sessions/${s.id}`} className="block bg-zinc-900 border border-zinc-800 rounded-lg p-4 card-hover relative group">
                <button
                  onClick={(e) => handleDeleteSession(e, s.id, s.title)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/50"
                  title="删除会话"
                >
                  <Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-400" />
                </button>
                <div className="font-medium text-zinc-200 pr-8">{s.title}</div>
                <div className="text-sm text-zinc-500 mt-1">
                  💬 {s.message_count} 条消息 · 🃏 {s.card_count} 张卡片 · 🕐 {s.uploaded_at?.slice(0, 19)}
                </div>
                {s.overall_summary && <div className="text-sm text-zinc-400 mt-2">{s.overall_summary}</div>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
