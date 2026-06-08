# DeepSeek 知识库服务

将 DeepSeek Chat 对话自动转化为结构化知识卡片的本地知识库系统。Phase 2 完整版。

## 快速开始

### 1. 安装依赖

```bash
cd server
pip install -r requirements.txt
cd web && npm install
```

### 2. 配置

```bash
cp .env.example .env
# 编辑 .env，填入 LLM API Key
```

`.env` 关键配置：

```env
# LLM API（支持所有 OpenAI 兼容接口）
LLM_API_KEY=sk-your-key
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat

# 嵌入模型（本地路径）
EMBEDDING_MODEL=./data/models/BAAI/bge-small-zh-v1.5
```

### 3. 启动

```bash
# 后端（端口 8000）
cd server
python -m uvicorn main:app --reload --port 8000

# 前端（端口 3000，另一个终端）
cd server/web
npm run dev
```

| 服务 | 地址 |
|------|------|
| Next.js 前端 | http://localhost:3000 |
| FastAPI 后端 | http://localhost:8000 |
| API 文档 | http://localhost:8000/docs |
| Streamlit 前端（旧） | http://localhost:8501 |

## 项目结构

```
server/
├── main.py                  # FastAPI 入口 + 路由注册
├── config.py                # 配置管理（LLM、嵌入、路径）
├── .env                     # 环境变量（不提交）
├── requirements.txt         # Python 依赖
├── models/
│   ├── database.py          # SQLAlchemy 引擎 + 会话工厂
│   ├── db_models.py         # ORM 模型（Session, Card, Tag, Task）
│   └── schemas.py           # Pydantic 请求/响应模型
├── services/
│   ├── preprocessing.py     # 消息预处理（清洗、合并、格式化）
│   ├── llm_service.py       # LLM API 调用（OpenAI 兼容）
│   ├── pipeline.py          # AI 处理管道编排 + 任务持久化
│   ├── embedding.py         # 向量嵌入（bge-small-zh，带降级）
│   ├── vector_store.py      # ChromaDB 向量存储
│   └── import_service.py    # 外部文档解析（MD/PDF/TXT）
├── api/
│   ├── sessions.py          # 会话上传（去重 + 增量更新）
│   ├── cards.py             # 卡片 CRUD + 语义搜索
│   ├── tasks.py             # 任务状态查询
│   ├── tags.py              # 标签审核（确认/合并/删除）
│   ├── graph.py             # 知识图谱（节点/边/邻居）
│   ├── import_doc.py        # 文档导入 API
│   └── settings.py          # LLM 配置管理 API
├── streamlit_app/           # Streamlit 前端（Phase 1，保留）
│   ├── app.py               # 主页仪表盘
│   └── pages/               # 上传、卡片、搜索、设置
├── web/                     # Next.js 前端（Phase 2）
│   ├── package.json
│   ├── src/
│   │   ├── app/             # App Router 页面
│   │   │   ├── page.tsx     # 首页仪表盘
│   │   │   ├── upload/      # 上传对话
│   │   │   ├── cards/       # 卡片浏览 + 详情
│   │   │   ├── graph/       # 知识图谱可视化
│   │   │   ├── tags/        # 标签审核
│   │   │   ├── import/      # 文档导入
│   │   │   └── settings/    # LLM 配置
│   │   ├── components/      # 共用组件
│   │   └── lib/api.ts       # API 客户端
│   └── public/
└── data/                    # 数据目录（不提交）
    ├── knowledge.db         # SQLite 数据库
    ├── chroma/              # ChromaDB 向量库
    └── models/              # 本地嵌入模型
```

## 功能

### 上传对话

- 支持 DeepSeek 导出的 JSON 格式（含 `mapping` 树状结构）
- 自动按会话拆分（一个 JSON 文件可含多个对话）
- **增量更新**：以 `source_url` 为主键，重复上传自动检测新消息
- 三种结果：新建 / 增量更新 / 跳过

### AI 处理管道

```
上传 JSON → 预处理 → 会话总结 → 话题切分 → 卡片生成 → 标签提取 → 向量化 → 版本关联
```

1. **预处理**：清洗无意义消息（表情、<3字符），合并连续消息
2. **会话总结**：LLM 生成标题、摘要、知识领域（JSON 输出）
3. **话题切分**：LLM 按语义切分对话为话题块
4. **卡片生成**：LLM 提取标题、要点、代码片段、难度、标签
5. **标签规范化**：模糊匹配已有标签（编辑距离 ≥ 0.7）
6. **向量化**：bge-small-zh-v1.5 本地嵌入（512 维）
7. **版本关联**：余弦相似度 ≥ 0.95 自动建立版本链

### 知识图谱

- 节点类型：Session、Card、Tag
- 边类型：CONTAINS、TAGGED、VERSION_OF
- API 支持全图查询和单节点邻居查询（可设深度）
- 前端 vis-network 力导向图可视化

### 标签审核

- 待审核标签列表（status=suggested）
- 单个确认、批量合并、删除
- 合并时自动重定向所有卡片关联

### 外部文档导入

- Markdown：按 `##` 标题切分话题块
- PDF：PyMuPDF 提取文本，按页/标题切分
- 纯文本：按段落智能切分

### LLM 配置

- 支持所有 OpenAI 兼容 API（DeepSeek、OpenAI、Ollama、vLLM 等）
- 通过 `.env` 或 Web 界面配置
- 运行时可修改，自动重置客户端
- `response_format` 不支持时自动 fallback（从文本提取 JSON）

### 任务持久化

- 任务状态写入 SQLite `tasks` 表
- 服务重启后任务状态自动恢复
- 内存缓存 + DB 双写

## API 端点

### 会话

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/sessions/upload` | 上传会话 JSON（去重+增量） |
| POST | `/api/v1/sessions/upload-file` | 上传 JSON 文件 |
| GET | `/api/v1/sessions/` | 列出所有会话 |
| GET | `/api/v1/sessions/{id}` | 获取会话详情 |
| DELETE | `/api/v1/sessions/{id}` | 删除会话及卡片 |

### 卡片

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/cards/` | 列出卡片（支持 tag/difficulty/category 过滤） |
| GET | `/api/v1/cards/{id}` | 获取卡片详情 |
| POST | `/api/v1/cards/search` | 语义搜索 |
| GET | `/api/v1/cards/tags/all` | 列出所有标签 |
| DELETE | `/api/v1/cards/{id}` | 删除卡片 |

### 标签

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/tags/` | 列出标签（支持 status 过滤） |
| GET | `/api/v1/tags/pending` | 待审核标签 |
| PUT | `/api/v1/tags/{name}/confirm` | 确认标签 |
| PUT | `/api/v1/tags/merge` | 合并标签 |
| DELETE | `/api/v1/tags/{name}` | 删除标签 |

### 图谱

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/graph/nodes` | 所有节点 |
| GET | `/api/v1/graph/edges` | 所有边 |
| GET | `/api/v1/graph/neighbors/{id}` | 卡片邻居（支持 depth 参数） |

### 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/import/upload` | 文档导入（MD/PDF/TXT） |
| GET | `/api/v1/tasks/{id}` | 任务状态 |
| GET | `/api/v1/settings/llm` | 获取 LLM 配置 |
| PUT | `/api/v1/settings/llm` | 更新 LLM 配置 |
| GET | `/health` | 健康检查 |

## 数据模型

### Session（会话）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| title | string | 会话标题 |
| source_type | string | deepseek / import |
| source_url | string | 对话 URL（去重键） |
| overall_summary | text | LLM 生成的摘要 |
| knowledge_domain | JSON | 知识领域列表 |
| message_count | int | 消息数量 |
| processed_at | datetime | 处理完成时间 |

### Card（知识卡片）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| session_id | FK→Session | 所属会话 |
| title | string | 卡片标题 |
| summary | text | 一句话摘要 |
| key_points | JSON | 关键要点列表 |
| code_snippets | JSON | 代码片段列表 |
| difficulty | string | 初级/中级/高级 |
| category_path | string | 分类路径 |
| embedding_id | string | ChromaDB 向量 ID |
| parent_version_id | FK→Card | 版本链父节点 |

### Tag（标签）

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 主键 |
| status | string | suggested / confirmed |
| usage_count | int | 使用次数 |

### Task（任务）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键（task_id） |
| session_id | string | 关联会话 |
| status | string | pending/processing/completed/failed |
| progress | string | 当前进度描述 |
| card_count | int | 已生成卡片数 |
| error | text | 失败原因 |
