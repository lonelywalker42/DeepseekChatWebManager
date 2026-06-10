"use client";

import { Suspense } from "react";

export default function SessionDetailPageWrapper() {
  return (
    <Suspense fallback={<div className="text-center text-zinc-500 py-12">加载中...</div>}>
      <SessionDetailPage />
    </Suspense>
  );
}

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { sessionsApi, cardsApi } from "@/lib/api";
import { ArrowLeft, User, Bot, BookOpen, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import "katex/dist/katex.min.css";

function SessionDetailPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"conversation" | "cards">("conversation");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      sessionsApi.get(id),
      sessionsApi.messages(id),
      cardsApi.list({ session_id: id }),
    ])
      .then(([s, msgData, c]) => {
        setSession(s);
        setMessages(msgData.messages || []);
        setCards(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (!id) return <div className="text-center text-zinc-500 py-12">缺少会话 ID</div>;
  if (loading) return <div className="text-center text-zinc-500 py-12">加载中...</div>;
  if (!session) return <div className="text-center text-zinc-500 py-12">会话未找到</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/sessions" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300">
        <ArrowLeft className="w-4 h-4" /> 返回会话列表
      </Link>

      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-zinc-100 mb-2">{session.title}</h1>
        <div className="text-sm text-zinc-500 space-y-1">
          <div>💬 {session.message_count} 条消息 · 🃏 {session.card_count} 张卡片</div>
          {session.source_url && (
            <div>🔗 <a href={session.source_url} target="_blank" rel="noopener" className="text-indigo-400 hover:underline">{session.source_url}</a></div>
          )}
          {session.uploaded_at && <div>🕐 上传于 {session.uploaded_at.slice(0, 19).replace("T", " ")}</div>}
        </div>
        {session.overall_summary && (
          <p className="text-zinc-400 mt-3">{session.overall_summary}</p>
        )}
        {!session.overall_summary && (
          <button
            onClick={async () => {
              try {
                await sessionsApi.summarize(id);
                alert("已提交摘要生成，请稍后刷新查看结果");
              } catch (err: any) {
                alert(`操作失败：${err.message}`);
              }
            }}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/20 text-sm text-indigo-400 transition-colors"
          >
            <Sparkles className="w-4 h-4" /> 生成摘要
          </button>
        )}
        {session.knowledge_domain?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {session.knowledge_domain.map((d: string) => (
              <span key={d} className="badge badge-blue">{d}</span>
            ))}
          </div>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("conversation")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "conversation"
              ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
              : "text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800"
          }`}
        >
          💬 原始对话 ({messages.length})
        </button>
        <button
          onClick={() => setTab("cards")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "cards"
              ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
              : "text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800"
          }`}
        >
          🃏 知识卡片 ({cards.length})
        </button>
      </div>

      {/* Conversation */}
      {tab === "conversation" && (
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-zinc-500 py-12 bg-zinc-900 rounded-xl border border-zinc-800">
              📭 此会话没有保存原始对话（可能是旧版本上传的）
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "" : ""}`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  msg.role === "user" ? "bg-indigo-500/20" : "bg-purple-500/20"
                }`}>
                  {msg.role === "user"
                    ? <User className="w-4 h-4 text-indigo-400" />
                    : <Bot className="w-4 h-4 text-purple-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-zinc-500 mb-1">
                    {msg.role === "user" ? "用户" : "助手"}
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 prose prose-invert prose-sm max-w-none prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800 prose-code:text-indigo-300 prose-headings:text-zinc-200 prose-p:text-zinc-300 prose-strong:text-zinc-200 prose-a:text-indigo-400">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex, rehypeHighlight]}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Cards */}
      {tab === "cards" && (
        <div className="space-y-3">
          {cards.length === 0 ? (
            <div className="text-center text-zinc-500 py-12 bg-zinc-900 rounded-xl border border-zinc-800">
              📭 此会话暂无知识卡片
            </div>
          ) : (
            cards.map((card) => (
              <Link
                key={card.id}
                href={`/cards/detail?id=${card.id}`}
                className="block bg-zinc-900 border border-zinc-800 rounded-xl p-5 card-hover"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-zinc-200">{card.title}</h3>
                  {card.difficulty && (
                    <span className={`badge ${card.difficulty === "初级" ? "badge-green" : card.difficulty === "中级" ? "badge-yellow" : "badge-red"}`}>
                      {card.difficulty}
                    </span>
                  )}
                </div>
                {card.summary && <p className="text-sm text-zinc-400 line-clamp-2">{card.summary}</p>}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {card.tags?.map((t: string) => (
                    <span key={t} className="badge badge-blue">{t}</span>
                  ))}
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
