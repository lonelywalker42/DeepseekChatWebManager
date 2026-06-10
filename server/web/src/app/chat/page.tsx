"use client";

import { useState, useRef, useEffect } from "react";
import { chatApi, sessionsApi } from "@/lib/api";
import { Send, Bot, User, Square, Save, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import "katex/dist/katex.min.css";

const STORAGE_KEY = "chat-state";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionTitle, setSessionTitle] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return sessionStorage.getItem(STORAGE_KEY + "-title") || "";
    } catch { return ""; }
  });
  const [saving, setSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Persist messages to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY + "-title", sessionTitle);
  }, [sessionTitle]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    // Add empty assistant message for streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      let fullContent = "";
      for await (const chunk of chatApi.stream(newMessages)) {
        fullContent += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: fullContent };
          return updated;
        });
      }
    } catch (e: any) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `❌ 错误：${e.message}`,
        };
        return updated;
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleStop = () => {
    // Note: SSE doesn't support client-side abort easily
    // This is a UI placeholder - the stream will complete naturally
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndSession = async () => {
    if (messages.length === 0) {
      alert("对话为空，无法保存");
      return;
    }

    const title = sessionTitle.trim() || `对话 ${new Date().toLocaleString("zh-CN")}`;

    if (!confirm(`确定结束对话并保存为会话「${title}」？\n\n系统将生成摘要和知识卡片。`)) return;

    setSaving(true);
    try {
      await sessionsApi.upload({
        title,
        source_type: "chat",
        source_url: null,
        original_filename: null,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      alert("会话已保存，正在后台生成摘要和知识卡片");
      setMessages([]);
      setSessionTitle("");
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY + "-title");
    } catch (e: any) {
      alert(`保存失败：${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    if (messages.length === 0) return;
    if (!confirm("确定清空当前对话？")) return;
    setMessages([]);
    setSessionTitle("");
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY + "-title");
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-3rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between py-4 border-b border-zinc-800">
        <h1 className="text-2xl font-bold text-zinc-100">💬 AI 对话</h1>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="会话标题（可选）"
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 w-48"
          />
          <button
            onClick={handleEndSession}
            disabled={messages.length === 0 || saving}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm text-white flex items-center gap-1"
          >
            <Save className="w-4 h-4" /> {saving ? "保存中..." : "结束并保存"}
          </button>
          <button
            onClick={handleClear}
            disabled={messages.length === 0}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-400"
            title="清空对话"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 py-20">
            <Bot className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
            <p className="text-lg">开始一个新的对话</p>
            <p className="text-sm mt-2">输入消息后按 Enter 发送，对话结束后点击"结束并保存"</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                msg.role === "user" ? "bg-indigo-500/20" : "bg-purple-500/20"
              }`}
            >
              {msg.role === "user" ? (
                <User className="w-4 h-4 text-indigo-400" />
              ) : (
                <Bot className="w-4 h-4 text-purple-400" />
              )}
            </div>
            <div
              className={`max-w-[80%] rounded-xl p-4 ${
                msg.role === "user"
                  ? "bg-indigo-600/20 border border-indigo-500/20"
                  : "bg-zinc-900 border border-zinc-800"
              }`}
            >
              {msg.role === "user" ? (
                <p className="text-zinc-200 whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800 prose-code:text-indigo-300 prose-headings:text-zinc-200 prose-p:text-zinc-300 prose-strong:text-zinc-200 prose-a:text-indigo-400">
                  {msg.content ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex, rehypeHighlight]}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <div className="flex items-center gap-1 text-zinc-500">
                      <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="py-4 border-t border-zinc-800">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            rows={1}
            className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 resize-none"
          />
          <button
            onClick={loading ? handleStop : handleSend}
            disabled={!input.trim() && !loading}
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-white"
          >
            {loading ? <Square className="w-5 h-5" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
