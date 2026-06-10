# DeepSeekChat Manager — 开发文档

## 整体架构

项目包含两个独立子系统：

```
DeepseekManager/
├── src/                    # Chrome 扩展（TypeScript + React）
├── server/                 # 知识库后端（Python + FastAPI）
│   ├── api/                # REST API 端点
│   ├── services/           # 业务逻辑（LLM、嵌入、管道）
│   ├── models/             # 数据模型（SQLAlchemy + Pydantic）
│   ├── streamlit_app/      # Streamlit 前端（Phase 1）
│   └── web/                # Next.js 前端（Phase 2）
├── manifest.json           # Chrome 扩展清单
├── vite.config.ts          # 扩展构建配置
└── package.json            # 扩展依赖
```

### 数据流

```
Chrome 扩展 ──chrome.runtime.sendMessage──> Background ──> IndexedDB
                                                    ↓
Next.js 前端 ──HTTP──> FastAPI 后端 ──> SQLite + ChromaDB
Streamlit   ──HTTP──> FastAPI 后端 ──> SQLite + ChromaDB
```

---

## Chrome 扩展

### 技术栈

| 技术 | 用途 |
|------|------|
| Manifest V3 | Chrome 扩展架构 |
| TypeScript | 类型安全 |
| React 19 | 管理界面 |
| Vite + @crxjs/vite-plugin | 构建 |
| Tailwind CSS v3 | 样式 |
| Zustand | 状态管理 |
| react-router-dom v7 | 路由（HashRouter） |
| idb | IndexedDB 封装 |

### 三个运行时上下文

1. **Content Script** (`src/content/`) — 注入 chat.deepseek.com，抓取对话 DOM
2. **Background Service Worker** (`src/background/`) — 消息路由 + IndexedDB 操作
3. **Manager UI** (`src/manager/`) — React SPA，HashRouter

### 关键约束

- Content Script 不导入 `src/shared/messaging.ts`（避免 @crxjs 打包冲突）
- Background 入口必须命名为 `service-worker.ts`
- Content Script 使用内联样式（无 Tailwind）
- Manager 使用 HashRouter（chrome-extension:// 不支持 BrowserRouter）

---

## 知识库后端

### 技术栈

| 技术 | 用途 |
|------|------|
| FastAPI | REST API 框架 |
| SQLAlchemy + SQLite | 关系数据存储 |
| ChromaDB | 向量存储 |
| sentence-transformers | 嵌入模型（bge-small-zh-v1.5） |
| OpenAI SDK | LLM API 调用（兼容 DeepSeek/OpenAI/Ollama） |
| PyMuPDF | PDF 解析 |
| Next.js 16 | 前端框架（App Router + Turbopack） |
| Tailwind CSS | 前端样式 |
| vis-network + vis-data | 知识图谱可视化 |
| react-markdown + remark-math + rehype-katex | Markdown/LaTeX 渲染（会话回放） |

### 核心模块

#### `services/llm_service.py`
- 使用 OpenAI SDK，支持所有兼容 API
- `_call_llm()`: 统一调用入口，自动 fallback（`response_format` 不支持时从文本提取 JSON）
- `_extract_json()`: 从 LLM 响应中提取 JSON（支持 markdown 代码块、裸文本）

#### `services/pipeline.py`
- `process_session()`: 完整处理管道（预处理→总结→切分→卡片→标签→向量化→版本关联）
- 任务状态持久化到 SQLite `tasks` 表
- 内存缓存 + DB 双写，重启自动恢复

#### `services/embedding.py`
- 本地加载 bge-small-zh-v1.5（512 维）
- 降级方案：模型不可用时使用 hash-based 伪向量

#### `api/sessions.py`
- 去重：以 `source_url` 为主键查询已有会话
- 增量：比较消息数量，有新增则删除旧卡片重新处理
- 支持 DeepSeek `mapping` 树状格式解析

### 数据模型

| 表 | 说明 |
|----|------|
| sessions | 会话（title, source_url, summary, domain） |
| cards | 知识卡片（title, summary, key_points, code_snippets, difficulty） |
| tags | 标签（name, status, usage_count） |
| card_tags | 卡片-标签关联 |
| tasks | 任务状态（持久化，重启恢复） |

### 配置管理

`.env` 文件（不提交到 git）：

```env
LLM_API_KEY=sk-...           # LLM API Key
LLM_BASE_URL=https://...     # API Base URL
LLM_MODEL=deepseek-chat      # 模型名
EMBEDDING_MODEL=./data/models/BAAI/bge-small-zh-v1.5
DATA_DIR=./data
VERSION_THRESHOLD=0.95
RELATED_THRESHOLD=0.88
```

兼容旧配置：优先读 `LLM_*`，fallback 到 `DEEPSEEK_*`。

### 启动命令

**Windows 一键启动（推荐）：**
```bash
start.bat    # 自动安装依赖并启动后端 + 前端
```

**手动启动：**
```bash
# 后端
cd server
python -m uvicorn main:app --reload --port 8000

# Next.js 前端
cd server/web
npm run dev

# Streamlit 前端（可选）
cd server
python -m streamlit run streamlit_app/app.py
```

---

## 开发阶段

### Phase 1 ✅ MVP
- FastAPI 后端 + AI 处理管道
- Streamlit 前端（上传、卡片、搜索、设置）
- SQLite + ChromaDB 存储
- 增量更新

### Phase 2 ✅ 完整知识库
- Next.js 前端（卡片流、详情、图谱、标签审核、文档导入）
- 知识图谱 API（节点/边/邻居查询）+ 自适应性能优化
- 标签审核 API（确认/合并/删除）
- 外部文档导入（MD/PDF/TXT）
- 任务持久化
- LLM 配置可替换
- 会话详情页（对话回放，支持 Markdown/LaTeX/代码高亮）
- 知识卡片删除功能
- 导入页面状态持久化（sessionStorage）
- Windows 一键启动脚本（start.bat）
- 数据库自动迁移（新增 messages_json 列）

### Phase 3 计划
- Chrome 扩展集成（推送到本地服务）
- 安卓客户端
- 视频/音频转文字
- 浏览器剪藏插件
