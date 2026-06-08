"use client";

import { useState, useRef, useEffect } from "react";
import { sessionsApi, tasksApi } from "@/lib/api";
import { Upload, CheckCircle, XCircle, Loader2, SkipForward } from "lucide-react";

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

/** Walk the DeepSeek mapping tree (DFS) and extract messages in order. */
function walkMapping(mapping: Record<string, any>, nodeId: string): any[] {
  const node = mapping[nodeId];
  if (!node) return [];

  const msgs: any[] = [];

  // If this node has a message, extract fragments
  if (node.message?.fragments) {
    for (const frag of node.message.fragments) {
      if (!frag.content) continue;
      // REQUEST → user, RESPONSE → assistant, THINK → thinking
      if (frag.type === "REQUEST") {
        msgs.push({ role: "user", content: frag.content });
      } else if (frag.type === "RESPONSE") {
        msgs.push({ role: "assistant", content: frag.content });
      }
      // THINK fragments are skipped for card generation (reasoning trace)
    }
  }

  // Recurse into children
  if (node.children) {
    for (const childId of node.children) {
      msgs.push(...walkMapping(mapping, childId));
    }
  }

  return msgs;
}

/** Parse a DeepSeek export JSON file. Returns an array of conversations. */
function parseDeepSeekExport(data: any): { title: string; messages: any[]; sourceUrl: string }[] {
  const conversations: { title: string; messages: any[]; sourceUrl: string }[] = [];

  // Case 1: Array of conversations (typical DeepSeek export)
  if (Array.isArray(data)) {
    for (const conv of data) {
      if (!conv.mapping) continue;
      const title = conv.title || "Untitled";
      const sourceUrl = conv.id ? `https://chat.deepseek.com/c/${conv.id}` : "";
      const messages = walkMapping(conv.mapping, "root");
      if (messages.length > 0) {
        conversations.push({ title, messages, sourceUrl });
      }
    }
    return conversations;
  }

  // Case 2: Single conversation object with mapping
  if (data.mapping) {
    const title = data.title || "Untitled";
    const sourceUrl = data.id ? `https://chat.deepseek.com/c/${data.id}` : "";
    const messages = walkMapping(data.mapping, "root");
    if (messages.length > 0) {
      conversations.push({ title, messages, sourceUrl });
    }
    return conversations;
  }

  // Case 3: Simple {title, messages} format (legacy/other exporters)
  if (data.messages && Array.isArray(data.messages)) {
    const messages = data.messages
      .filter((m: any) => m && m.role)
      .map((m: any) => ({ role: m.role, content: m.content || "" }));
    if (messages.length > 0) {
      conversations.push({
        title: data.title || "Untitled",
        messages,
        sourceUrl: data.source_url || data.url || "",
      });
    }
    return conversations;
  }

  // Case 4: Plain array of messages
  if (Array.isArray(data) && data.length > 0 && data[0].role) {
    const messages = data.filter((m: any) => m.role).map((m: any) => ({ role: m.role, content: m.content || "" }));
    conversations.push({ title: "Imported Chat", messages, sourceUrl: "" });
  }

  return conversations;
}

export default function UploadPage() {
  const [results, setResults] = useState<UploadResult[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);
  const intervalsRef = useRef<Set<NodeJS.Timeout>>(new Set());

  // Cleanup all intervals on unmount
  useEffect(() => {
    return () => {
      intervalsRef.current.forEach((id) => clearInterval(id));
      intervalsRef.current.clear();
    };
  }, []);

  const handleFiles = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      if (!file.name.endsWith(".json")) continue;

      let data: any;
      try {
        const text = await file.text();
        data = JSON.parse(text);
      } catch {
        const id = ++idRef.current;
        setResults((prev) => [
          { id, name: file.name, title: "", msgCount: 0, url: null, status: "error", action: "", detail: "JSON 解析失败" },
          ...prev,
        ]);
        continue;
      }

      const conversations = parseDeepSeekExport(data);

      if (conversations.length === 0) {
        const id = ++idRef.current;
        setResults((prev) => [
          { id, name: file.name, title: "", msgCount: 0, url: null, status: "error", action: "", detail: "未找到有效对话" },
          ...prev,
        ]);
        continue;
      }

      // Process each conversation
      for (const conv of conversations) {
        const id = ++idRef.current;
        const userCount = conv.messages.filter((m) => m.role === "user").length;
        const asstCount = conv.messages.filter((m) => m.role === "assistant").length;

        setResults((prev) => [
          {
            id, name: file.name, title: conv.title, msgCount: conv.messages.length,
            url: conv.sourceUrl, status: "uploading", action: "",
            detail: `${conv.messages.length} 条消息 (用户 ${userCount} / 助手 ${asstCount})`,
          },
          ...prev,
        ]);

        try {
          const resp = await sessionsApi.upload({
            title: conv.title,
            source_type: "deepseek",
            source_url: conv.sourceUrl || null,
            original_filename: file.name,
            messages: conv.messages,
          });

          const action = resp.action || "created";
          const detail = resp.detail || "";

          if (action === "skipped") {
            setResults((prev) => prev.map((r) => r.id === id ? { ...r, status: "skipped" as const, action, detail } : r));
            continue;
          }

          setResults((prev) => prev.map((r) => r.id === id ? { ...r, status: "processing" as const, action, detail, taskId: resp.task_id } : r));

          // Poll task status
          if (resp.task_id) {
            const task_id = resp.task_id;
            const poll = setInterval(async () => {
              try {
                const task = await tasksApi.get(task_id);
                if (task.status === "completed") {
                  clearInterval(poll);
                  intervalsRef.current.delete(poll);
                  setResults((prev) => prev.map((r) => r.id === id ? { ...r, status: "done" as const, detail: task.progress } : r));
                } else if (task.status === "failed") {
                  clearInterval(poll);
                  intervalsRef.current.delete(poll);
                  setResults((prev) => prev.map((r) => r.id === id ? { ...r, status: "error" as const, detail: task.error || "处理失败" } : r));
                } else {
                  setResults((prev) => prev.map((r) => r.id === id ? { ...r, detail: task.progress } : r));
                }
              } catch {
                clearInterval(poll);
                intervalsRef.current.delete(poll);
              }
            }, 2000);
            intervalsRef.current.add(poll);
          }
        } catch (e: any) {
          setResults((prev) => prev.map((r) => r.id === id ? { ...r, status: "error" as const, detail: e.message } : r));
        }
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
      case "uploading": case "processing": return <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />;
      case "done": return <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />;
      case "skipped": return <SkipForward className="w-5 h-5 text-zinc-500 shrink-0" />;
      case "error": return <XCircle className="w-5 h-5 text-red-400 shrink-0" />;
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
        上传 DeepSeek Chat 导出的 JSON 文件，系统自动按会话拆分并逐个处理。
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
        <div className="text-sm text-zinc-500 mt-2">
          支持 DeepSeek 导出格式 · 自动按会话拆分 · 批量上传 · 增量更新
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".json"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Format info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">📋 支持的 JSON 格式</h3>
        <div className="text-xs text-zinc-500 space-y-1">
          <p><strong className="text-zinc-400">DeepSeek 导出格式：</strong>含 <code>mapping</code> 树状结构，自动遍历提取 REQUEST/RESPONSE 片段</p>
          <p><strong className="text-zinc-400">简单格式：</strong>含 <code>messages</code> 数组的 JSON 对象</p>
          <p><strong className="text-zinc-400">纯消息数组：</strong>直接为 <code>[{"{role, content}"}]</code> 格式</p>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-200">处理记录 ({results.length})</h2>
          {results.map((r) => (
            <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                {statusIcon(r)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-zinc-200">{r.title || r.name}</span>
                    {actionBadge(r.action)}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">{r.detail}</div>
                  {r.url && <div className="text-xs text-zinc-600 mt-0.5">🔗 {r.url}</div>}
                </div>
                {r.msgCount > 0 && <div className="text-xs text-zinc-600 shrink-0">{r.msgCount} 条</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
