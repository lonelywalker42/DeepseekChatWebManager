"use client";

import { useState, useRef } from "react";
import { sessionsApi, tasksApi } from "@/lib/api";
import { Upload, FileJson, CheckCircle, XCircle, Loader2, SkipForward, RefreshCw } from "lucide-react";

interface UploadResult {
  id: number;
  name: string;
  title: string;
  msgCount: number;
  url: string | null;
  status: "uploading" | "processing" | "done" | "error" | "skipped";
  action: string;
  detail: string;
  taskId?: string;
}

export default function UploadPage() {
  const [results, setResults] = useState<UploadResult[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  let idCounter = 0;

  const parseFile = async (file: File): Promise<{ title: string; messages: any[]; sourceUrl: string | null }> => {
    const text = await file.text();
    const data = JSON.parse(text);

    let messages: any[] = [];
    let sourceUrl: string | null = null;
    let title = file.name;

    if (Array.isArray(data)) {
      messages = data.filter((m) => m && m.role).map((m) => ({ role: m.role, content: m.content || "" }));
    } else if (typeof data === "object" && data !== null) {
      sourceUrl = data.source_url || data.url || data.conversation_id || null;
      title = data.title || file.name;
      const msgList = data.messages || data.conversation || [];
      if (Array.isArray(msgList)) {
        messages = msgList.filter((m: any) => m && m.role).map((m: any) => ({ role: m.role, content: m.content || "" }));
      }
    }
    return { title, messages, sourceUrl };
  };

  const handleFiles = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      if (!file.name.endsWith(".json")) continue;

      const id = ++idCounter;
      setResults((prev) => [
        { id, name: file.name, title: "", msgCount: 0, url: null, status: "uploading", action: "", detail: "解析中..." },
        ...prev,
      ]);

      try {
        const { title, messages, sourceUrl } = await parseFile(file);

        if (messages.length === 0) {
          setResults((prev) => prev.map((r) => r.id === id ? { ...r, status: "error" as const, detail: "未找到有效消息" } : r));
          continue;
        }

        const userCount = messages.filter((m) => m.role === "user").length;
        const asstCount = messages.filter((m) => m.role === "assistant").length;

        setResults((prev) => prev.map((r) => r.id === id ? {
          ...r, title, msgCount: messages.length, url: sourceUrl,
          detail: `${messages.length} 条消息 (用户 ${userCount} / 助手 ${asstCount})`,
        } : r));

        // Upload
        const resp = await sessionsApi.upload({
          title,
          source_type: "deepseek",
          source_url: sourceUrl,
          original_filename: file.name,
          messages,
        });

        const action = resp.action || "created";
        const detail = resp.detail || "";

        if (action === "skipped") {
          setResults((prev) => prev.map((r) => r.id === id ? {
            ...r, status: "skipped" as const, action: "skipped", detail,
          } : r));
          continue;
        }

        setResults((prev) => prev.map((r) => r.id === id ? {
          ...r, status: "processing" as const, action, detail, taskId: resp.task_id,
        } : r));

        // Poll task
        if (resp.task_id) {
          const poll = setInterval(async () => {
            try {
              const task = await tasksApi.get(resp.task_id);
              if (task.status === "completed") {
                clearInterval(poll);
                setResults((prev) => prev.map((r) => r.id === id ? { ...r, status: "done" as const, detail: task.progress } : r));
              } else if (task.status === "failed") {
                clearInterval(poll);
                setResults((prev) => prev.map((r) => r.id === id ? { ...r, status: "error" as const, detail: task.error || "处理失败" } : r));
              } else {
                setResults((prev) => prev.map((r) => r.id === id ? { ...r, detail: task.progress } : r));
              }
            } catch { clearInterval(poll); }
          }, 2000);
        }
      } catch (e: any) {
        setResults((prev) => prev.map((r) => r.id === id ? { ...r, status: "error" as const, detail: e.message } : r));
      }
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const statusIcon = (r: UploadResult) => {
    switch (r.status) {
      case "uploading": case "processing": return <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />;
      case "done": return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "skipped": return <SkipForward className="w-5 h-5 text-zinc-500" />;
      case "error": return <XCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const actionBadge = (action: string) => {
    switch (action) {
      case "created": return <span className="badge badge-green">新建</span>;
      case "updated": return <span className="badge badge-yellow">增量更新</span>;
      case "skipped": return <span className="badge badge-gray">已跳过</span>;
      default: return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">📤 上传 DeepSeek 对话</h1>
      <p className="text-zinc-400">
        上传 DeepSeek Chat 导出的 JSON 文件，AI 将自动总结、切分话题并生成知识卡片。
        重复上传同一对话将自动增量更新。
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-14 text-center cursor-pointer transition-all
          ${dragging ? "border-indigo-500 bg-indigo-500/5" : "border-zinc-700 hover:border-zinc-600 bg-zinc-900"}`}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-500" />
        <div className="text-zinc-200 font-medium text-lg">拖拽 JSON 文件到这里</div>
        <div className="text-sm text-zinc-500 mt-2">支持批量上传多个文件 · 自动去重 · 增量更新</div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".json"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Incremental info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">🔄 增量更新机制</h3>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-green-400 font-medium mb-1">新建</div>
            <div className="text-zinc-500">首次上传的对话</div>
          </div>
          <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-yellow-400 font-medium mb-1">增量更新</div>
            <div className="text-zinc-500">同 URL 有新消息时</div>
          </div>
          <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-zinc-400 font-medium mb-1">跳过</div>
            <div className="text-zinc-500">无新消息时自动跳过</div>
          </div>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-200">处理记录</h2>
          {results.map((r) => (
            <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 card-hover">
              <div className="flex items-center gap-3">
                {statusIcon(r)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-200 truncate">{r.title || r.name}</span>
                    {actionBadge(r.action)}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1 truncate">{r.detail}</div>
                  {r.url && <div className="text-xs text-zinc-600 mt-0.5 truncate">🔗 {r.url}</div>}
                </div>
                <div className="text-xs text-zinc-600">{r.msgCount > 0 && `${r.msgCount} 条`}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
