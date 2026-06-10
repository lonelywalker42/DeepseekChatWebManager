# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Chrome 扩展
```bash
npm run dev        # Vite dev server with HMR (content scripts + service worker auto-reload)
npm run build      # tsc type-check + vite production build → dist/
npm run preview    # Preview production build
```

### 知识库后端

**一键启动（Windows）：**
```bash
start.bat    # 自动启动后端 + 前端，首次运行自动安装依赖
```

**手动启动：**
```bash
cd server
python -m uvicorn main:app --reload --port 8000   # FastAPI 后端
python -m streamlit run streamlit_app/app.py        # Streamlit 前端（可选）

cd server/web
npm run dev                                          # Next.js 前端（端口 3000）
npm run build                                        # Next.js 生产构建
```

No test framework is configured. `tsc` is used only for type-checking (`noEmit: true`); Vite handles all bundling.

Load the extension in Chrome: `chrome://extensions` → Developer mode → Load unpacked → select `dist/`.

## Architecture

项目包含两个独立子系统：Chrome 扩展 + 知识库后端。

### Chrome 扩展（Manifest V3）

三个隔离的运行时上下文：

#### Content Script (`src/content/`)
注入 `chat.deepseek.com`。通过可配置选择器抓取对话 DOM（`selectors.ts`），解析消息（`parser.ts`），注入浮动按钮（`scraper-ui.ts`）。入口：`index.ts`。

**关键**：Content Script 不导入 `src/shared/messaging.ts`，内联自己的 `sendMessage`。因为 @crxjs/vite-plugin 会将共享模块作为公共依赖打包，导致 content 和 background 脚本合并。

#### Background Service Worker (`src/background/`)
`service-worker.ts` → `message-router.ts`。所有 IndexedDB 访问的中心枢纽。接收来自 content script 和 manager UI 的消息，分发到 DAO 层。20 种消息类型定义在 `src/shared/messaging.ts`。

**关键**：Background 入口必须命名为 `service-worker.ts`（不是 `index.ts`）。@crxjs/vite-plugin 使用文件名映射入口点到输出块。

#### Manager UI (`src/manager/`)
完整 React SPA（HashRouter）。通过 `chrome.runtime.sendMessage()` 与 background 通信。

### 知识库后端（FastAPI + Next.js）

#### 后端 (`server/`)
FastAPI REST API + AI 处理管道。核心模块：
- `services/llm_service.py` — LLM API 调用（OpenAI 兼容，支持 DeepSeek/OpenAI/Ollama）
- `services/pipeline.py` — 完整处理管道 + 任务持久化
- `services/embedding.py` — 向量嵌入（bge-small-zh，带降级）
- `services/import_service.py` — 外部文档解析（MD/PDF/TXT）
- `api/sessions.py` — 去重 + 增量更新 + 重试 + 摘要生成
- `api/chat.py` — AI 对话 API（调用 LLM）
- `api/settings.py` — LLM 配置管理（运行时可修改）

存储：SQLite（sessions, cards, tags, tasks）+ ChromaDB（向量）

#### 前端 (`server/web/`)
Next.js 16 App Router + Tailwind CSS。页面：
- `/` — 仪表盘（统计卡片可点击跳转）
- `/chat` — AI 对话（调用 LLM API，结束后保存为会话）
- `/upload` — 上传对话（DeepSeek JSON，批量处理限制10并发）
- `/sessions` — 会话管理（列表、删除、重试、生成摘要）
- `/sessions/[id]` — 会话详情（对话回放 + 知识卡片）
- `/cards` — 卡片浏览 + `/cards/[id]` 详情（可跳转会话）
- `/graph` — 知识图谱（vis-network，节点类型筛选）
- `/tags` — 标签审核（全选、批量确认/删除/合并）
- `/import` — 文档导入（状态持久化）
- `/settings` — LLM 配置

## Data Flow

```
Chrome 扩展 ──sendMessage──> Background ──> IndexedDB (via idb)

Next.js 前端 ──HTTP──> FastAPI 后端 ──> SQLite + ChromaDB
Streamlit   ──HTTP──> FastAPI 后端 ──> SQLite + ChromaDB
```

## Key Constraints

### Chrome 扩展
- **HashRouter only** — `chrome-extension://` URLs don't support BrowserRouter
- **No `window` in service worker** — background code must not use DOM APIs
- **Inline styles in content script** — no Tailwind in content script context
- **Sentinel topic** — `__uncategorized__` is auto-created for sessions without a topic

### 知识库后端
- **OpenAI 兼容 API** — LLM 调用使用 OpenAI SDK，可替换为任何兼容端点
- **任务持久化** — 任务状态写入 SQLite `tasks` 表，重启自动恢复
- **嵌入降级** — 模型不可用时使用 hash-based 伪向量，管道不中断
- **增量更新** — source_url 为主键，重复上传只处理新增消息
- **DeepSeek mapping 格式** — JSON 解析支持树状结构（REQUEST/RESPONSE/THINK 片段）

## Core Types (`src/shared/types.ts`)

`Topic`, `Session`, `Message`, `Template`, `ScrapedSessionData`. All IDs via `crypto.randomUUID()`, timestamps via `Date.now()`.

## Styling

- Manager UI: Tailwind CSS utility classes
- Content script scraper UI: Pure inline/injected styles (no external CSS)
- Popup: Inline styles
- Next.js 前端: Tailwind CSS 暗色主题（indigo accent）
