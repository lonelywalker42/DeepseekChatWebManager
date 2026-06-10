"use client";

import { useEffect, useRef, useState } from "react";
import { graphApi } from "@/lib/api";

export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    Promise.all([graphApi.nodes(), graphApi.edges()])
      .then(([nodes, edges]) => {
        setStats({ nodes: nodes.length, edges: edges.length });

        if (nodes.length === 0) {
          setLoading(false);
          return;
        }

        // Dynamic import for vis-network (client-side only)
        Promise.all([import("vis-network"), import("vis-data")]).then(([{ Network }, { DataSet }]) => {
          const nodeColors: Record<string, string> = {
            session: "#6366f1",
            card: "#a855f7",
            tag: "#ec4899",
          };

          const visNodes = new DataSet(
            nodes.map((n: any) => ({
              id: n.id,
              label: n.label,
              color: { background: nodeColors[n.type] || "#71717a", border: nodeColors[n.type] || "#71717a" },
              font: { color: "#e4e4e7", size: 12 },
              shape: n.type === "tag" ? "diamond" : n.type === "session" ? "square" : "dot",
              size: n.type === "session" ? 25 : n.type === "tag" ? 18 : 20,
              title: `${n.type}: ${n.label}`,
            }))
          );

          const visEdges = new DataSet(
            edges.map((e: any, i: number) => ({
              id: i,
              from: e.source,
              to: e.target,
              color: { color: "#3f3f46", highlight: "#6366f1" },
              arrows: e.type === "VERSION_OF" ? "to" : undefined,
              dashes: e.type === "TAGGED",
              width: e.type === "VERSION_OF" ? 2 : 1,
            }))
          );

          const nodeCount = nodes.length;
          const isLarge = nodeCount > 200;

          new Network(
            containerRef.current!,
            { nodes: visNodes, edges: visEdges },
            {
              physics: {
                solver: "forceAtlas2Based",
                forceAtlas2Based: {
                  gravitationalConstant: isLarge ? -60 : -40,
                  centralGravity: 0.01,
                  springLength: isLarge ? 150 : 120,
                  damping: 0.8,
                },
                stabilization: {
                  enabled: true,
                  iterations: isLarge ? 50 : 100,
                  updateInterval: 50,
                },
                adaptiveTimestep: true,
              },
              interaction: {
                hover: true,
                tooltipDelay: 200,
                hideEdgesOnDrag: isLarge,
                hideNodesOnDrag: isLarge,
              },
              nodes: {
                borderWidth: 2,
                shadow: !isLarge,
                font: { face: "Inter, system-ui, sans-serif" },
              },
              edges: {
                smooth: { enabled: !isLarge, type: "continuous", roundness: 0.5 },
              },
              layout: {
                improvedLayout: !isLarge,
              },
            }
          );

          setLoading(false);
        });
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">🕸️ 知识图谱</h1>
        <div className="text-sm text-zinc-500">
          {stats.nodes} 个节点 · {stats.edges} 条边
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-sm">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-500"></span> 会话</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-500"></span> 卡片</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-pink-500" style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}></span> 标签</span>
      </div>

      {loading && (
        <div className="text-center text-zinc-500 py-8">加载图谱数据...</div>
      )}

      {!loading && stats.nodes === 0 && (
        <div className="text-center text-zinc-500 py-12 bg-zinc-900 rounded-xl border border-zinc-800">
          📭 暂无图谱数据，请先上传对话生成知识卡片
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl"
        style={{ height: "calc(100vh - 200px)" }}
      />
    </div>
  );
}
