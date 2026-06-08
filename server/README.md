# DeepSeek 知识库服务

将 DeepSeek Chat 对话自动转化为结构化知识卡片的本地知识库系统。

## 快速开始

### 1. 安装依赖

```bash
cd server
pip install -r requirements.txt
```

### 2. 配置 API Key

```bash
cp .env.example .env
# 编辑 .env，填入你的 DeepSeek API Key
```

### 3. 启动后端服务

```bash
uvicorn main:app --reload --port 8000
```

API 文档：http://localhost:8000/docs

### 4. 启动前端界面

```bash
streamlit run streamlit_app/app.py
```

访问：http://localhost:8501

## 项目结构

```
server/
├── main.py              # FastAPI 入口
├── config.py            # 配置管理
├── models/
│   ├── database.py      # SQLAlchemy 引擎
│   ├── db_models.py     # ORM 模型
│   └── schemas.py       # Pydantic 模型
├── services/
│   ├── preprocessing.py # 消息预处理
│   ├── llm_service.py   # DeepSeek API 调用
│   ├── pipeline.py      # AI 处理管道
│   ├── embedding.py     # 向量嵌入 (bge-small-zh)
│   └── vector_store.py  # ChromaDB 操作
├── api/
│   ├── sessions.py      # 会话上传 API
│   ├── cards.py         # 卡片 CRUD + 搜索
│   └── tasks.py         # 任务状态查询
└── streamlit_app/
    ├── app.py           # Streamlit 主页
    └── pages/           # 多页面
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/sessions/upload` | 上传会话 JSON |
| POST | `/api/v1/sessions/upload-file` | 上传 JSON 文件 |
| GET | `/api/v1/sessions/` | 列出所有会话 |
| GET | `/api/v1/sessions/{id}` | 获取会话详情 |
| DELETE | `/api/v1/sessions/{id}` | 删除会话 |
| GET | `/api/v1/cards/` | 列出卡片（支持过滤） |
| GET | `/api/v1/cards/{id}` | 获取卡片详情 |
| POST | `/api/v1/cards/search` | 语义搜索 |
| GET | `/api/v1/cards/tags/all` | 列出所有标签 |
| DELETE | `/api/v1/cards/{id}` | 删除卡片 |
| GET | `/api/v1/tasks/{id}` | 查询任务状态 |
| GET | `/health` | 健康检查 |

## AI 处理流程

```
上传 JSON → 预处理 → 会话总结 → 话题切分 → 卡片生成 → 标签提取 → 向量化 → 版本关联
```

1. **预处理**：清洗无意义消息，合并连续消息
2. **会话总结**：LLM 生成标题、摘要、知识领域
3. **话题切分**：LLM 按语义切分对话为话题块
4. **卡片生成**：LLM 为每个话题生成结构化知识卡片
5. **标签规范化**：模糊匹配已有标签，避免重复
6. **向量化**：bge-small-zh 嵌入，存入 ChromaDB
7. **版本关联**：余弦相似度 ≥ 0.95 自动建立版本链
