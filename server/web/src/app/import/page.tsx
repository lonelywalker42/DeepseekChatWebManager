"use client";

import { useState, useRef } from "react";
import { importApi, tasksApi } from "@/lib/api";
import { Upload, FileText, File, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function ImportPage() {
  const [results, setResults] = useState<any[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const id = Date.now() + Math.random();
      setResults((prev) => [...prev, { id, name: file.name, status: "uploading", detail: "" }]);

      try {
        const res = await importApi.upload(file);
        setResults((prev) =>
          prev.map((r) => r.id === id ? { ...r, status: "processing", taskId: res.task_id, sessionId: res.session_id, detail: res.detail } : r)
        );

        // Poll task status
        if (res.task_id) {
          const poll = setInterval(async () => {
            try {
              const task = await tasksApi.get(res.task_id);
              if (task.status === "completed") {
                clearInterval(poll);
                setResults((prev) => prev.map((r) => r.id === id ? { ...r, status: "done", detail: task.progress } : r));
              } else if (task.status === "failed") {
                clearInterval(poll);
                setResults((prev) => prev.map((r) => r.id === id ? { ...r, status: "error", detail: task.error } : r));
              } else {
                setResults((prev) => prev.map((r) => r.id === id ? { ...r, detail: task.progress } : r));
              }
            } catch { clearInterval(poll); }
          }, 2000);
        }
      } catch (e: any) {
        setResults((prev) => prev.map((r) => r.id === id ? { ...r, status: "error", detail: e.message } : r));
      }
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const icon = (status: string) => {
    switch (status) {
      case "uploading": case "processing": return <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />;
      case "done": return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "error": return <XCircle className="w-5 h-5 text-red-400" />;
      default: return <FileText className="w-5 h-5 text-zinc-400" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">📥 文档导入</h1>
      <p className="text-zinc-400">上传 Markdown、PDF 或文本文件，AI 将自动解析并生成知识卡片</p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
          ${dragging ? "border-indigo-500 bg-indigo-500/5" : "border-zinc-700 hover:border-zinc-600 bg-zinc-900"}`}
      >
        <Upload className="w-10 h-10 mx-auto mb-3 text-zinc-500" />
        <div className="text-zinc-300 font-medium">拖拽文件到这里，或点击选择</div>
        <div className="text-sm text-zinc-500 mt-1">支持 .md · .pdf · .txt 格式</div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".md,.markdown,.pdf,.txt,.text"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Supported formats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: FileText, label: "Markdown", desc: "按 ## 标题自动切分话题" },
          { icon: File, label: "PDF", desc: "按页提取文本，自动结构化" },
          { icon: FileText, label: "纯文本", desc: "按段落智能切分" },
        ].map((f) => (
          <div key={f.label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <f.icon className="w-6 h-6 mx-auto mb-2 text-zinc-400" />
            <div className="text-sm font-medium text-zinc-300">{f.label}</div>
            <div className="text-xs text-zinc-500 mt-1">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-200">处理记录</h2>
          {results.map((r) => (
            <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center gap-3">
              {icon(r.status)}
              <div className="flex-1">
                <div className="text-sm font-medium text-zinc-200">{r.name}</div>
                <div className="text-xs text-zinc-500">{r.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
