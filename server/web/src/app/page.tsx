"use client";

import { useEffect, useState } from "react";
import { sessionsApi, cardsApi, tagsApi } from "@/lib/api";
import { BookOpen, MessageSquare, Tags, Globe } from "lucide-react";

export default function Home() {
  const [stats, setStats] = useState({ sessions: 0, cards: 0, tags: 0, domains: 0 });
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([sessionsApi.list(), cardsApi.list({ limit: "200" }), tagsApi.list()])
      .then(([s, c, t]) => {
        const domains = new Set<string>();
        s.forEach((sess: any) => sess.knowledge_domain?.forEach((d: string) => domains.add(d)));
        setStats({ sessions: s.length, cards: c.length, tags: t.length, domains: domains.size });
        setSessions(s.slice(0, 5));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { icon: MessageSquare, label: "会话", value: stats.sessions, color: "text-indigo-400" },
    { icon: BookOpen, label: "知识卡片", value: stats.cards, color: "text-purple-400" },
    { icon: Tags, label: "标签", value: stats.tags, color: "text-pink-400" },
    { icon: Globe, label: "知识领域", value: stats.domains, color: "text-cyan-400" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-gradient-to-br from-zinc-900 via-indigo-950/30 to-zinc-900 rounded-2xl p-8 border border-zinc-800">
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">🧠 DeepSeek 知识库</h1>
        <p className="text-zinc-400 text-lg">AI 驱动的个人知识管理系统</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-center card-hover">
            <s.icon className={`w-8 h-8 mx-auto mb-2 ${s.color}`} />
            <div className="text-3xl font-bold text-zinc-100">{loading ? "..." : s.value}</div>
            <div className="text-sm text-zinc-500 mt-1">{s.label}</div>
          </div>
        ))}
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
              <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 card-hover">
                <div className="font-medium text-zinc-200">{s.title}</div>
                <div className="text-sm text-zinc-500 mt-1">
                  💬 {s.message_count} 条消息 · 🃏 {s.card_count} 张卡片 · 🕐 {s.uploaded_at?.slice(0, 19)}
                </div>
                {s.overall_summary && <div className="text-sm text-zinc-400 mt-2">{s.overall_summary}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
