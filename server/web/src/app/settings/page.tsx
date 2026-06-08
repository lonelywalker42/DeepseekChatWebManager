"use client";

import { useEffect, useState } from "react";
import { healthApi, settingsApi } from "@/lib/api";
import { Server, Cpu, Database, Brain, Save, CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const [health, setHealth] = useState<any>(null);
  const [llm, setLlm] = useState({ api_key_masked: "", base_url: "", model: "" });
  const [editLlm, setEditLlm] = useState({ api_key: "", base_url: "", model: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    healthApi.check().then(setHealth).catch(() => {});
    settingsApi.getLLM().then(setLlm).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {};
      if (editLlm.api_key) payload.api_key = editLlm.api_key;
      if (editLlm.base_url) payload.base_url = editLlm.base_url;
      if (editLlm.model) payload.model = editLlm.model;

      if (Object.keys(payload).length === 0) {
        setSaving(false);
        return;
      }

      await settingsApi.updateLLM(payload);
      const updated = await settingsApi.getLLM();
      setLlm(updated);
      setEditLlm({ api_key: "", base_url: "", model: "" });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      alert("保存失败: " + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">⚙️ 设置</h1>

      {/* LLM Config */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-400" /> LLM 模型配置
        </h2>
        <p className="text-sm text-zinc-500 mb-4">
          支持所有 OpenAI 兼容 API（DeepSeek、OpenAI、Ollama、vLLM 等）
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">当前 API Key</label>
            <div className="text-sm text-zinc-300 bg-zinc-800 px-3 py-2 rounded-lg font-mono">
              {llm.api_key_masked || "未配置"}
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">当前 Base URL</label>
            <div className="text-sm text-zinc-300 bg-zinc-800 px-3 py-2 rounded-lg font-mono">
              {llm.base_url || "未配置"}
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">当前模型</label>
            <div className="text-sm text-zinc-300 bg-zinc-800 px-3 py-2 rounded-lg font-mono">
              {llm.model || "未配置"}
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <h3 className="text-sm font-medium text-zinc-300 mb-3">修改配置</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">新的 API Key（留空则不修改）</label>
                <input
                  type="password"
                  value={editLlm.api_key}
                  onChange={(e) => setEditLlm({ ...editLlm, api_key: e.target.value })}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">新的 Base URL（留空则不修改）</label>
                <input
                  type="text"
                  value={editLlm.base_url}
                  onChange={(e) => setEditLlm({ ...editLlm, base_url: e.target.value })}
                  placeholder="https://api.deepseek.com"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">新的模型名（留空则不修改）</label>
                <input
                  type="text"
                  value={editLlm.model}
                  onChange={(e) => setEditLlm({ ...editLlm, model: e.target.value })}
                  placeholder="deepseek-chat"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving || (!editLlm.api_key && !editLlm.base_url && !editLlm.model)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-white transition-colors"
              >
                {saving ? "保存中..." : saved ? <><CheckCircle className="w-4 h-4" /> 已保存</> : <><Save className="w-4 h-4" /> 保存配置</>}
              </button>
            </div>
          </div>
        </div>
      </div>

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

      {/* System Info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-indigo-400" /> 系统信息
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-zinc-400">后端</span><span className="text-zinc-300">FastAPI + SQLAlchemy</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">向量库</span><span className="text-zinc-300">ChromaDB</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">嵌入模型</span><span className="text-zinc-300">bge-small-zh-v1.5</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">前端</span><span className="text-zinc-300">Next.js + Tailwind CSS</span></div>
        </div>
      </div>

      {/* API Docs */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-400" /> API 文档
        </h2>
        <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
          http://localhost:8000/docs →
        </a>
      </div>
    </div>
  );
}
