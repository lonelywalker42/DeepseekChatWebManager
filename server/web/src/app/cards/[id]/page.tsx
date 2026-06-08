"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cardsApi } from "@/lib/api";
import { ArrowLeft, Copy, Check } from "lucide-react";

export default function CardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    cardsApi.get(id).then(setCard).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <div className="text-center text-zinc-500 py-12">加载中...</div>;
  if (!card) return <div className="text-center text-zinc-500 py-12">卡片未找到</div>;

  const keyPoints: string[] = card.key_points || [];
  const codeSnippets: string[] = card.code_snippets || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/cards" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300">
        <ArrowLeft className="w-4 h-4" /> 返回卡片列表
      </Link>

      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-start justify-between mb-3">
          <h1 className="text-2xl font-bold text-zinc-100">{card.title}</h1>
          {card.difficulty && (
            <span className={`badge ${card.difficulty === "初级" ? "badge-green" : card.difficulty === "中级" ? "badge-yellow" : "badge-red"}`}>
              {card.difficulty}
            </span>
          )}
        </div>
        {card.summary && <p className="text-zinc-400 text-lg mb-4">{card.summary}</p>}
        <div className="flex flex-wrap gap-2">
          {card.tags?.map((t: string) => (
            <span key={t} className="badge badge-blue">{t}</span>
          ))}
        </div>
        {card.category_path && (
          <div className="text-sm text-zinc-600 mt-3">📁 {card.category_path}</div>
        )}
      </div>

      {/* Key Points */}
      {keyPoints.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-zinc-200 mb-3">📌 关键要点</h2>
          <ul className="space-y-2">
            {keyPoints.map((kp, i) => (
              <li key={i} className="flex gap-2 text-zinc-300">
                <span className="text-indigo-400 mt-0.5">•</span>
                <span>{kp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Code Snippets */}
      {codeSnippets.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-zinc-200 mb-3">💻 代码片段</h2>
          <div className="space-y-3">
            {codeSnippets.map((code, i) => (
              <div key={i} className="relative group">
                <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300 overflow-x-auto">
                  {code}
                </pre>
                <button
                  onClick={() => copyCode(code)}
                  className="absolute top-2 right-2 p-1.5 rounded bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copied === code ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Version Info */}
      {card.parent_version_id && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-zinc-200 mb-3">🔗 版本关联</h2>
          <p className="text-zinc-400">此卡片有历史版本</p>
          <Link href={`/cards/${card.parent_version_id}`} className="text-indigo-400 hover:underline text-sm mt-2 inline-block">
            查看历史版本 →
          </Link>
        </div>
      )}
    </div>
  );
}
