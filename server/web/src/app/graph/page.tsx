"use client";

import { useEffect, useRef, useState } from "react";
import { graphApi } from "@/lib/api";

export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });
  const [showTypes, setShowTypes] = useState({ session: true, card: true, tag: true });
  const [allNodes, setAllNodes] = useState<any[]>([]);
  const [allEdges, setAllEdges] = useState<any[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    Promise.all([graphApi.nodes(), graphApi.edges()])
      .then(([nodes, edges]) => {
        setAllNodes(nodes);
        setAllEdges(edges);
        setStats({ nodes: nodes.length, edges: edges.length });

        if (nodes.length === 0) {
          setLoading(false);
          return;
        }

        renderGraph(nodes, edges);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const renderGraph = (nodes: any[], edges: any[]) => {
    if (!containerRef.current) return;

    Promise.all([import("vis-network"), import("vis-data")]).then(([{ Network }, { DataSet }]) => {
      const nodeColors: Record<string, string> = {
        session: "#6366f1",
        card: "#a855f7",
        tag: "#ec4899",
      };

      const nodeShapes: Record<string, string> = {
        session: "square",
        card: "dot",
        tag: "diamond",
      };

      const nodeSizes: Record<string, number> = {
        session: 30,
        card: 22,
        tag: 16,
      };

      const filteredNodes = nodes.filter((n: any) => showTypes[n.type as keyof typeof showTypes]);
      const filteredNodeIds = new Set(filteredNodes.map((n: any) => n.id));
      const filteredEdges = edges.filter((e: any) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));

      const visNodes = new DataSet(
        filteredNodes.map((n: any) => ({
          id: n.id,
          label: n.label.length > 15 ? n.label.slice(0, 15) + "..." : n.label,
          fullLabel: n.label,
          color: {
            background: nodeColors[n.type] || "#71717a",
            border: nodeColors[n.type] || "#71717a",
            highlight: { background: "#818cf8", border: "#6366f1" },
          },
          font: { color: "#e4e4e7", size: 11, face: "Inter, system-ui, sans-serif" },
          shape: nodeShapes[n.type] || "dot",
          size: nodeSizes[n.type] || 20,
          title: `<div style="max-width:200px"><b>${n.type === "session" ? "📋 会话" : n.type === "card" ? "🃏 卡片" : "🏷️ 标签"}</b><br/>${n.label}</div>`,
          type: n.type,
        }))
      );

      const visEdges = new DataSet(
        filteredEdges.map((e: any, i: number) => ({
          id: i,
          from: e.source,
          to: e.target,
          color: {
            color: "#3f3f46",
            highlight: "#6366f1",
            opacity: 0.6,
          },
          arrows: e.type === "VERSION_OF" ? "to" : undefined,
          dashes: e.type === "TAGGED",
          width: e.type === "VERSION_OF" ? 2 : 1,
          smooth: { type: "continuous", roundness: 0.3 },
        }))
      );

      const nodeCount = filteredNodes.length;
      const isLarge = nodeCount > 150;

      if (networkRef.current) {
        networkRef.current.destroy();
      }

      networkRef.current = new Network(
        containerRef.current!,
        { nodes: visNodes, edges: visEdges },
        {
          physics: {
            solver: "forceAtlas2Based",
            forceAtlas2Based: {
              gravitationalConstant: isLarge ? -80 : -50,
              centralGravity: 0.008,
              springLength: isLarge ? 180 : 140,
              springConstant: 0.02,
              damping: 0.85,
            },
            stabilization: {
              enabled: true,
              iterations: isLarge ? 40 : 80,
              updateInterval: 25,
            },
            adaptiveTimestep: true,
          },
          interaction: {
            hover: true,
            tooltipDelay: 150,
            hideEdgesOnDrag: isLarge,
            hideNodesOnDrag: isLarge,
            zoomView: true,
            dragView: true,
            multiselect: true,
            navigationButtons: true,
            keyboard: { enabled: true },
          },
          nodes: {
            borderWidth: 2,
            shadow: { enabled: !isLarge, color: "rgba(0,0,0,0.3)", size: 8, x: 2, y: 2 },
            font: { face: "Inter, system-ui, sans-serif" },
          },
          edges: {
            smooth: { enabled: true, type: "continuous", roundness: 0.3 },
          },
          layout: {
            improvedLayout: !isLarge,
          },
        }
      );

      // Click to show full label
      networkRef.current.on("click", (params: any) => {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          const node = visNodes.get(nodeId);
          if (node) {
            visNodes.update({ id: nodeId, label: node.fullLabel || node.label });
            setTimeout(() => {
              const label = node.fullLabel || node.label;
              if (label.length > 15) {
                visNodes.update({ id: nodeId, label: label.slice(0, 15) + "..." });
              }
            }, 3000);
          }
        }
      });

      setLoading(false);
    });
  };

  const toggleType = (type: keyof typeof showTypes) => {
    const newShowTypes = { ...showTypes, [type]: !showTypes[type] };
    setShowTypes(newShowTypes);
    renderGraph(allNodes, allEdges);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">🕸️ 知识图谱</h1>
        <div className="text-sm text-zinc-500">
          {stats.nodes} 个节点 · {stats.edges} 条边
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {[
            { key: "session" as const, label: "会话", color: "bg-indigo-500", count: allNodes.filter(n => n.type === "session").length },
            { key: "card" as const, label: "卡片", color: "bg-purple-500", count: allNodes.filter(n => n.type === "card").length },
            { key: "tag" as const, label: "标签", color: "bg-pink-500", count: allNodes.filter(n => n.type === "tag").length },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => toggleType(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                showTypes[t.key]
                  ? "bg-zinc-800 text-zinc-200 border border-zinc-700"
                  : "bg-zinc-900 text-zinc-500 border border-zinc-800"
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded ${t.color} ${showTypes[t.key] ? "" : "opacity-30"}`}></span>
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-sm text-zinc-500 animate-pulse">加载中...</div>
        )}
      </div>

      {!loading && stats.nodes === 0 && (
        <div className="text-center text-zinc-500 py-12 bg-zinc-900 rounded-xl border border-zinc-800">
          📭 暂无图谱数据，请先上传对话生成知识卡片
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl"
        style={{ height: "calc(100vh - 220px)" }}
      />
    </div>
  );
}
