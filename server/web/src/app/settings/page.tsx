"use client";

import { useEffect, useState } from "react";
import { healthApi } from "@/lib/api";
import { Server, Database, Cpu } from "lucide-react";

export default function SettingsPage() {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    healthApi.check().then(setHealth).catch(() => {});
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">⚙️ 设置</h1>

      {/* Service Status */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-indigo-400" /> 服务状态
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">API 服务</span>
            {health ? (
              <span className="badge badge-green">● 运行中 (v{health.version})</span>
            ) : (
              <span className="badge badge-red">● 未连接</span>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-indigo-400" /> 系统信息
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-zinc-400">后端框架</span><span className="text-zinc-300">FastAPI + SQLAlchemy</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">向量库</span><span className="text-zinc-300">ChromaDB</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">嵌入模型</span><span className="text-zinc-300">bge-small-zh-v1.5</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">前端框架</span><span className="text-zinc-300">Next.js + Tailwind CSS</span></div>
        </div>
      </div>

      {/* API Docs Link */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-400" /> API 文档
        </h2>
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:underline"
        >
          http://localhost:8000/docs →
        </a>
      </div>
    </div>
  );
}
