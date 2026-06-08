"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cardsApi } from "@/lib/api";
import { Search, Filter } from "lucide-react";

export default function CardsPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ tag: "", difficulty: "", q: "" });

  const fetchCards = () => {
    setLoading(true);
    const params: Record<string, string> = { limit: "200" };
    if (filter.tag) params.tag = filter.tag;
    if (filter.difficulty) params.difficulty = filter.difficulty;
    cardsApi.list(params).then(setCards).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    cardsApi.tags().then((t) => setTags(t.map((x: any) => x.name))).catch(() => {});
    fetchCards();
  }, [filter.tag, filter.difficulty]);

  const filtered = filter.q
    ? cards.filter((c) => c.title.includes(filter.q) || c.summary?.includes(filter.q))
    : cards;

  const diffBadge = (d: string) => {
    const cls = d === "初级" ? "badge-green" : d === "中级" ? "badge-yellow" : d === "高级" ? "badge-red" : "badge-gray";
    return <span className={`badge ${cls}`}>{d}</span>;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">📚 知识卡片</h1>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="搜索卡片..."
            value={filter.q}
            onChange={(e) => setFilter({ ...filter, q: e.target.value })}
            className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={filter.difficulty}
          onChange={(e) => setFilter({ ...filter, difficulty: e.target.value })}
          className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300"
        >
          <option value="">全部难度</option>
          <option value="初级">初级</option>
          <option value="中级">中级</option>
          <option value="高级">高级</option>
        </select>
        <select
          value={filter.tag}
          onChange={(e) => setFilter({ ...filter, tag: e.target.value })}
          className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300"
        >
          <option value="">全部标签</option>
          {tags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="text-center text-zinc-500 py-12">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-zinc-500 py-12">📭 暂无知识卡片</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((card) => (
            <Link
              key={card.id}
              href={`/cards/${card.id}`}
              className="block bg-zinc-900 border border-zinc-800 rounded-xl p-5 card-hover"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-zinc-200 flex-1">{card.title}</h3>
                {card.difficulty && diffBadge(card.difficulty)}
              </div>
              {card.summary && <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{card.summary}</p>}
              <div className="flex flex-wrap gap-1.5">
                {card.tags?.map((t: string) => (
                  <span key={t} className="badge badge-blue">{t}</span>
                ))}
              </div>
              {card.category_path && (
                <div className="text-xs text-zinc-600 mt-2">📁 {card.category_path}</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
