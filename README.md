# DeepSeekChat Manager

[English](#english) | [中文](#中文)

---

<a id="english"></a>

## English

A Chrome browser extension for managing and organizing your DeepSeek AI conversations. Scrape chat sessions from `chat.deepseek.com`, organize them into topics, generate continuation prompts, and search across all your conversations — all stored locally in IndexedDB with zero server dependency.

### Features

#### Conversation Scraping
- One-click scrape of any DeepSeek conversation via floating action button
- Extracts all messages with role (user/assistant), content, and timestamps
- URL-based deduplication with "Update" or "Create New" options
- Scrape summary mode: extract only the last assistant message as a session summary
- Badge notifications on successful scrapes
- **Clickable topic badge**: when a page is already saved to a topic, a badge appears in the top-right corner — click it to open the corresponding topic in the Manager

#### Topic Management
- Organize conversations into Topics with customizable types (Idea Discussion, Code Generation, Knowledge QA, Other)
- Status tracking: Active / Completed / Archived
- Tag system for flexible categorization
- Progress summary with Markdown support
- Filter by status, type, and text search

#### Session Timeline
- Visual timeline showing parent-child session relationships
- Manual session creation for non-DeepSeek conversations
- Editable session titles and summaries
- Full message viewer with role-colored display and Markdown rendering

#### Summary & Continuation
- Customizable summary templates with variable substitution
- Supported variables: `{topic_title}`, `{topic_type}`, `{progress_summary}`, `{session_title}`, `{session_summary}`, `{session_count}`
- One-click continuation prompt generation for seamless topic transitions
- Progress aggregation across all sessions in a topic
- Copy to clipboard for easy pasting into new DeepSeek conversations

#### Search & Export
- Full-text search across all messages, summaries, and titles
- Export single topic as formatted Markdown
- Full database export/import as JSON for backup and migration
- Configurable DOM selectors for adapting to DeepSeek page changes

#### Settings
- DOM selector configuration with reset to defaults
- Error log viewer (last 50 entries)
- Clear all data with double confirmation

### Tech Stack

| Technology | Purpose |
|------------|---------|
| **Manifest V3** | Chrome extension architecture |
| **TypeScript** | Type-safe codebase |
| **React 18** | Management UI |
| **Vite** | Build tool with HMR |
| **@crxjs/vite-plugin** | Chrome extension bundling |
| **Tailwind CSS v3** | Utility-first styling |
| **Zustand** | Lightweight state management |
| **react-router-dom v6** | Client-side routing (HashRouter) |
| **idb** | IndexedDB promise wrapper |
| **react-markdown** | Markdown rendering |

### Project Structure

```
DeepseekManager/
├── manifest.json                          # MV3 manifest
├── vite.config.ts                         # Vite + @crxjs config
├── tsconfig.json
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── background/
│   │   ├── service-worker.ts              # Service worker entry
│   │   └── message-router.ts              # Message dispatcher (18 types)
│   ├── content/
│   │   ├── index.ts                       # Content script entry
│   │   ├── parser.ts                      # DOM parsing logic
│   │   ├── scraper-ui.ts                  # Injected FAB + notifications
│   │   └── selectors.ts                   # Configurable DOM selectors
│   ├── manager/
│   │   ├── index.html                     # Manager SPA entry
│   │   ├── main.tsx                       # React mount point
│   │   ├── App.tsx                        # Route definitions
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx             # Sidebar + header + content
│   │   ├── pages/
│   │   │   ├── TopicList.tsx              # Topic grid with filters
│   │   │   ├── TopicDetail.tsx            # Topic detail + sessions
│   │   │   ├── SessionDetail.tsx          # Session messages + summary
│   │   │   ├── TemplateManager.tsx        # Template CRUD
│   │   │   ├── SearchPage.tsx             # Full-text search
│   │   │   ├── ExportPage.tsx             # Export/Import tools
│   │   │   └── SettingsPage.tsx           # Selectors + error log
│   │   ├── components/
│   │   │   ├── TopicForm.tsx              # Create/edit topic modal
│   │   │   ├── SessionCard.tsx            # Session list item
│   │   │   ├── MessageViewer.tsx          # Chat-style message display
│   │   │   ├── SessionTimeline.tsx        # Parent-child tree view
│   │   │   ├── MarkdownEditor.tsx         # Edit/preview toggle
│   │   │   ├── SearchBar.tsx              # Global search input
│   │   │   └── ConfirmDialog.tsx          # Reusable confirmation modal
│   │   ├── hooks/
│   │   │   ├── useTopics.ts
│   │   │   ├── useSessions.ts
│   │   │   └── useTemplates.ts
│   │   └── stores/
│   │       └── app-store.ts               # Zustand UI state
│   ├── shared/
│   │   ├── types.ts                       # TypeScript interfaces
│   │   ├── constants.ts                   # DB name, version, constants
│   │   ├── db.ts                          # IndexedDB setup via idb
│   │   ├── messaging.ts                   # Typed message helpers
│   │   ├── dao/
│   │   │   ├── topic-dao.ts               # Topic CRUD
│   │   │   ├── session-dao.ts             # Session CRUD
│   │   │   └── template-dao.ts            # Template CRUD
│   │   └── utils/
│   │       ├── prompt-generator.ts        # Template variable replacement
│   │       ├── export-markdown.ts         # Topic -> Markdown export
│   │       ├── export-json.ts             # Full DB export/import
│   │       └── logger.ts                  # Error logging to storage
│   ├── popup.html                         # Extension popup
│   ├── popup.tsx                          # Popup logic (stats + scrape)
│   └── assets/
│       ├── tailwind.css                   # Tailwind entry
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
└── dist/                                  # Build output (load this in Chrome)
```

### Getting Started

#### Prerequisites

- Node.js 18+
- Chrome or Edge browser

#### Install Dependencies

```bash
npm install
```

#### Development Build

```bash
npm run dev
```

This starts Vite with HMR. The `@crxjs/vite-plugin` outputs to `dist/` with live reload support for content scripts and service workers.

#### Production Build

```bash
npm run build
```

#### Load Extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `dist` folder from this project
5. The DeepSeekChat Manager icon appears in the toolbar

#### Usage

##### 1. Scraping Conversations

1. Navigate to `chat.deepseek.com` and open any conversation
2. A floating brain icon (🧠) appears in the bottom-right corner of the page
3. Click the brain icon to expand the menu with two options:
   - **Scrape All** — Extracts the entire conversation (all messages)
   - **Scrape Summary** — Extracts only the last assistant message as a summary
4. After clicking "Scrape All", a **Topic Selector** dialog appears:
   - Select an existing topic from the list to save the session under it
   - Type a new topic name and click "Create" to create a new topic on the fly
   - Click "Skip (Uncategorized)" to save without assigning a topic
5. If the same URL was already scraped, a conflict dialog offers:
   - **Update Existing** — Overwrites the old session with new data
   - **Create New** — Creates a duplicate session
   - **Cancel** — Abort the scrape
6. When revisiting a page already saved to a topic, a **topic badge** appears in the top-right corner — click it to jump directly to that topic in the Manager

##### 2. Managing Topics

1. Click the extension icon in the toolbar, then click **"Open Manager"**
2. The Topic List page shows all your topics with filters:
   - Filter by **Status**: Active / Completed / Archived
   - Filter by **Type**: Idea Discussion / Code Generation / Knowledge QA / Other
   - Search by keyword
3. Click **"New Topic"** to create a topic manually (title, type, status, tags)
4. Click any topic card to open the **Topic Detail** page:
   - View all sessions under this topic
   - Create manual sessions (for non-DeepSeek conversations)
   - Edit the progress summary (Markdown supported)
   - Set parent-child relationships between sessions

##### 3. Viewing Sessions

1. In the Topic Detail page, click any session to open **Session Detail**
2. The session page shows:
   - Full message history with role-colored display (user vs assistant)
   - Markdown rendering for assistant messages
   - Editable session title and summary
   - Session metadata (URL, creation date)
3. Use the **Session Timeline** to visualize parent-child session chains

##### 4. Generating Continuation Prompts

1. In the Template Manager page, create summary templates with variables:
   - `{topic_title}` — Topic name
   - `{topic_type}` — Topic type
   - `{progress_summary}` — Aggregated progress
   - `{session_title}` — Current session title
   - `{session_summary}` — Current session summary
   - `{session_count}` — Number of sessions in the topic
2. In Topic Detail or Session Detail, click **"Generate Continuation Prompt"**
3. The prompt is generated using your template and copied to clipboard
4. Paste it into a new DeepSeek conversation to maintain context

##### 5. Searching & Exporting

1. Use the **Search** page to find messages across all sessions
2. Export a single topic as formatted Markdown via the **Export** page
3. Export the entire database as JSON for backup
4. Import a previously exported JSON file to restore data

##### 6. Settings

1. Open the **Settings** page from the sidebar
2. **DOM Selectors**: View and customize the CSS selectors used for scraping
   - Click "Reset to Defaults" to restore built-in selectors
3. **Error Log**: View the last 50 error entries with timestamps
4. **Danger Zone**: Clear all data (requires double confirmation)

### Data Model

#### Topic
| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Unique identifier |
| title | string | Topic name |
| type | enum | idea-discussion, code-generation, knowledge-qa, other |
| status | enum | active, completed, archived |
| tags | string[] | Categorization tags |
| progressSummary | string (Markdown) | Aggregated progress across sessions |
| createdAt | number | Unix timestamp (ms) |
| updatedAt | number | Unix timestamp (ms) |

#### Session
| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Unique identifier |
| topicId | string | Parent topic reference |
| title | string | Session title (from page title or manual) |
| sourceUrl | string | DeepSeek conversation URL |
| parentSessionId | string? | Previous session in chain |
| summary | string? | Session summary (Markdown) |
| messages | Message[] | Full conversation |
| continuationPrompt | string? | Generated prompt for next session |
| createdAt | number | Unix timestamp (ms) |

#### Message
| Field | Type | Description |
|-------|------|-------------|
| role | enum | user, assistant, system |
| content | string | Message text |
| timestamp | string? | Message timestamp if available |

#### Template
| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Unique identifier |
| name | string | Template name |
| content | string | Markdown with `{variable}` placeholders |
| isDefault | boolean | Default template flag |
| createdAt | number | Unix timestamp (ms) |

### Message Passing Architecture

All communication follows a typed request/response pattern:

```
Content Script  ──chrome.runtime.sendMessage──>  Background (Service Worker)  ──>  IndexedDB
Manager UI      ──chrome.runtime.sendMessage──>  Background (Service Worker)  ──>  IndexedDB
```

#### Supported Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `SCRAPE_SESSION` | Content -> BG | Save scraped conversation |
| `SCRAPE_SUMMARY` | Content -> BG | Save last assistant message as summary |
| `GET_TOPICS` | Manager -> BG | List topics with optional filters |
| `GET_TOPIC` | Manager -> BG | Get single topic by ID |
| `CREATE_TOPIC` | Manager -> BG | Create new topic |
| `UPDATE_TOPIC` | Manager -> BG | Update topic fields |
| `DELETE_TOPIC` | Manager -> BG | Delete topic and all sessions |
| `GET_SESSIONS` | Manager -> BG | List sessions by topic |
| `GET_SESSION_DETAIL` | Manager -> BG | Get single session |
| `CREATE_SESSION` | Manager -> BG | Create session manually |
| `UPDATE_SESSION` | Manager -> BG | Update session fields |
| `DELETE_SESSION` | Manager -> BG | Delete single session |
| `GET_TEMPLATES` | Manager -> BG | List all templates |
| `CREATE_TEMPLATE` | Manager -> BG | Create new template |
| `UPDATE_TEMPLATE` | Manager -> BG | Update template |
| `DELETE_TEMPLATE` | Manager -> BG | Delete template |
| `SEARCH` | Manager -> BG | Full-text search |
| `EXPORT_TOPIC` | Manager -> BG | Export topic with sessions |
| `EXPORT_ALL` | Manager -> BG | Export entire database |
| `IMPORT_ALL` | Manager -> BG | Import database from JSON |

### Adapting to DeepSeek DOM Changes

If DeepSeek updates their page layout and scraping stops working:

1. Open the extension Settings page
2. Update the DOM selectors to match the new page structure
3. Use Chrome DevTools to inspect the DeepSeek page and identify the correct selectors
4. Click "Save" to store overrides (persists in `chrome.storage.local`)
5. Click "Reset to Defaults" to revert to built-in selectors

### Browser Compatibility

| Browser | Status |
|---------|--------|
| Chrome 109+ | Supported (Manifest V3) |
| Edge 109+ | Supported (Chromium-based) |
| Firefox | Not yet supported (would need MV2/MV3 adaptation) |

### License

MIT

---

<a id="中文"></a>

## 中文

一款 Chrome 浏览器扩展，用于管理和组织你的 DeepSeek AI 对话。从 `chat.deepseek.com` 抓取聊天会话，按主题分类管理，生成延续提示词，跨会话全文搜索 —— 所有数据存储在本地 IndexedDB 中，无需任何外部服务。

### 功能特性

#### 会话抓取
- 一键抓取 DeepSeek 对话，通过页面浮动按钮触发
- 提取消息的角色（用户/助手）、内容和时间戳
- 基于 URL 的去重机制，支持"更新已有"或"新建会话"选项
- 摘要抓取模式：仅提取最后一条助手消息作为会话摘要
- 抓取成功后显示角标通知
- **可点击的主题角标**：当页面已保存到某个主题时，右上角会显示主题角标 — 点击即可在管理界面中打开对应主题

#### 主题管理
- 将对话组织到主题中，支持自定义类型（想法讨论、代码生成、知识问答、其他）
- 状态跟踪：进行中 / 已完成 / 已归档
- 标签系统，灵活分类
- 进度总结，支持 Markdown
- 按状态、类型和文本搜索筛选

#### 会话时间线
- 可视化时间线，展示会话间的父子关系
- 手动创建会话，记录非 DeepSeek 来源的对话
- 可编辑的会话标题和摘要
- 完整的消息查看器，角色着色显示，支持 Markdown 渲染

#### 总结与延续
- 可自定义的总结模板，支持变量替换
- 支持的变量：`{topic_title}`、`{topic_type}`、`{progress_summary}`、`{session_title}`、`{session_summary}`、`{session_count}`
- 一键生成延续提示词，实现主题的无缝衔接
- 跨会话的进度汇总
- 一键复制到剪贴板，方便粘贴到新的 DeepSeek 对话

#### 搜索与导出
- 跨所有消息、摘要和标题的全文搜索
- 将单个主题导出为格式化的 Markdown 文件
- 整个数据库导出/导入为 JSON，用于备份和迁移
- 可配置的 DOM 选择器，适应 DeepSeek 页面更新

#### 设置
- DOM 选择器配置，支持恢复默认值
- 错误日志查看器（最近 50 条）
- 清除所有数据（二次确认）

### 技术栈

| 技术 | 用途 |
|------|------|
| **Manifest V3** | Chrome 扩展架构 |
| **TypeScript** | 类型安全的代码库 |
| **React 18** | 管理界面 |
| **Vite** | 构建工具，支持 HMR |
| **@crxjs/vite-plugin** | Chrome 扩展打包 |
| **Tailwind CSS v3** | 实用优先的 CSS 框架 |
| **Zustand** | 轻量级状态管理 |
| **react-router-dom v6** | 客户端路由（HashRouter） |
| **idb** | IndexedDB Promise 封装 |
| **react-markdown** | Markdown 渲染 |

### 项目结构

```
DeepseekManager/
├── manifest.json                          # MV3 清单文件
├── vite.config.ts                         # Vite + @crxjs 配置
├── tsconfig.json
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── background/
│   │   ├── service-worker.ts              # Service Worker 入口
│   │   └── message-router.ts              # 消息分发器（18 种消息类型）
│   ├── content/
│   │   ├── index.ts                       # 内容脚本入口
│   │   ├── parser.ts                      # DOM 解析逻辑
│   │   ├── scraper-ui.ts                  # 注入的浮动按钮 + 通知
│   │   └── selectors.ts                   # 可配置的 DOM 选择器
│   ├── manager/
│   │   ├── index.html                     # 管理界面 SPA 入口
│   │   ├── main.tsx                       # React 挂载点
│   │   ├── App.tsx                        # 路由定义
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx             # 侧边栏 + 顶栏 + 内容区
│   │   ├── pages/
│   │   │   ├── TopicList.tsx              # 主题列表（带筛选）
│   │   │   ├── TopicDetail.tsx            # 主题详情 + 会话列表
│   │   │   ├── SessionDetail.tsx          # 会话消息 + 摘要
│   │   │   ├── TemplateManager.tsx        # 模板管理
│   │   │   ├── SearchPage.tsx             # 全文搜索
│   │   │   ├── ExportPage.tsx             # 导出/导入工具
│   │   │   └── SettingsPage.tsx           # 选择器配置 + 错误日志
│   │   ├── components/
│   │   │   ├── TopicForm.tsx              # 创建/编辑主题弹窗
│   │   │   ├── SessionCard.tsx            # 会话列表项
│   │   │   ├── MessageViewer.tsx          # 聊天风格消息展示
│   │   │   ├── SessionTimeline.tsx        # 父子关系树状图
│   │   │   ├── MarkdownEditor.tsx         # 编辑/预览切换
│   │   │   ├── SearchBar.tsx              # 全局搜索栏
│   │   │   └── ConfirmDialog.tsx          # 通用确认弹窗
│   │   ├── hooks/
│   │   │   ├── useTopics.ts
│   │   │   ├── useSessions.ts
│   │   │   └── useTemplates.ts
│   │   └── stores/
│   │       └── app-store.ts               # Zustand UI 状态
│   ├── shared/
│   │   ├── types.ts                       # TypeScript 接口定义
│   │   ├── constants.ts                   # 数据库名称、版本、常量
│   │   ├── db.ts                          # IndexedDB 初始化（idb）
│   │   ├── messaging.ts                   # 类型化的消息辅助函数
│   │   ├── dao/
│   │   │   ├── topic-dao.ts               # 主题 CRUD
│   │   │   ├── session-dao.ts             # 会话 CRUD
│   │   │   └── template-dao.ts            # 模板 CRUD
│   │   └── utils/
│   │       ├── prompt-generator.ts        # 模板变量替换
│   │       ├── export-markdown.ts         # 主题 -> Markdown 导出
│   │       ├── export-json.ts             # 全量数据库导出/导入
│   │       └── logger.ts                  # 错误日志存储
│   ├── popup.html                         # 扩展弹窗
│   ├── popup.tsx                          # 弹窗逻辑（统计 + 抓取）
│   └── assets/
│       ├── tailwind.css                   # Tailwind 入口
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
└── dist/                                  # 构建输出（在 Chrome 中加载此目录）
```

### 快速开始

#### 环境要求

- Node.js 18+
- Chrome 或 Edge 浏览器

#### 安装依赖

```bash
npm install
```

#### 开发构建

```bash
npm run dev
```

启动 Vite 开发服务器，支持 HMR。`@crxjs/vite-plugin` 输出到 `dist/` 目录，内容脚本和 Service Worker 支持热重载。

#### 生产构建

```bash
npm run build
```

#### 在 Chrome 中加载扩展

1. 打开 `chrome://extensions`
2. 开启右上角的 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择本项目的 `dist` 文件夹
5. 工具栏中出现 DeepSeekChat Manager 图标

#### 使用方法

##### 1. 抓取对话

1. 访问 `chat.deepseek.com` 并打开任意对话
2. 页面右下角会出现浮动大脑图标（🧠）
3. 点击大脑图标展开菜单，有两个选项：
   - **Scrape All** — 提取整个对话（所有消息）
   - **Scrape Summary** — 仅提取最后一条助手消息作为摘要
4. 点击 "Scrape All" 后，弹出**主题选择器**对话框：
   - 从列表中选择一个已有主题，将会话保存到该主题下
   - 输入新主题名称并点击 "Create"，即时创建新主题
   - 点击 "Skip (Uncategorized)" 跳过主题分配，保存为未分类
5. 如果同一 URL 已被抓取过，会弹出冲突对话框：
   - **Update Existing** — 用新数据覆盖旧会话
   - **Create New** — 创建一个重复的新会话
   - **Cancel** — 取消本次抓取
6. 当再次访问已保存到主题的页面时，右上角会显示**主题角标** — 点击即可跳转到管理界面中对应的

##### 2. 管理主题

1. 点击工具栏中的扩展图标，然后点击 **"Open Manager"**
2. 主题列表页面展示所有主题，支持筛选：
   - 按**状态**筛选：进行中 / 已完成 / 已归档
   - 按**类型**筛选：想法讨论 / 代码生成 / 知识问答 / 其他
   - 关键字搜索
3. 点击 **"New Topic"** 手动创建主题（标题、类型、状态、标签）
4. 点击任意主题卡片进入**主题详情**页面：
   - 查看该主题下的所有会话
   - 手动创建会话（用于非 DeepSeek 来源的对话）
   - 编辑进度总结（支持 Markdown）
   - 设置会话间的父子关系

##### 3. 查看会话

1. 在主题详情页面中，点击任意会话进入**会话详情**页面
2. 会话页面展示：
   - 完整的消息历史，角色着色显示（用户 vs 助手）
   - 助手消息的 Markdown 渲染
   - 可编辑的会话标题和摘要
   - 会话元数据（URL、创建时间）
3. 使用**会话时间线**可视化父子会话链

##### 4. 生成延续提示词

1. 在模板管理页面中，创建包含变量的总结模板：
   - `{topic_title}` — 主题名称
   - `{topic_type}` — 主题类型
   - `{progress_summary}` — 汇总的进度
   - `{session_title}` — 当前会话标题
   - `{session_summary}` — 当前会话摘要
   - `{session_count}` — 主题下的会话数量
2. 在主题详情或会话详情页面中，点击 **"Generate Continuation Prompt"**
3. 系统使用你的模板生成提示词并自动复制到剪贴板
4. 粘贴到新的 DeepSeek 对话中，保持上下文连贯

##### 5. 搜索与导出

1. 使用**搜索**页面在所有会话中查找消息
2. 通过**导出**页面将单个主题导出为格式化的 Markdown 文件
3. 将整个数据库导出为 JSON 用于备份
4. 导入之前导出的 JSON 文件以恢复数据

##### 6. 设置

1. 从侧边栏打开**设置**页面
2. **DOM 选择器**：查看和自定义抓取使用的 CSS 选择器
   - 点击 "Reset to Defaults" 恢复内置选择器
3. **错误日志**：查看最近 50 条带时间戳的错误记录
4. **危险区域**：清除所有数据（需二次确认）

### 数据模型

#### Topic（主题）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 唯一标识符 |
| title | string | 主题名称 |
| type | 枚举 | idea-discussion, code-generation, knowledge-qa, other |
| status | 枚举 | active, completed, archived |
| tags | string[] | 分类标签 |
| progressSummary | string (Markdown) | 跨会话的进度汇总 |
| createdAt | number | Unix 时间戳（毫秒） |
| updatedAt | number | Unix 时间戳（毫秒） |

#### Session（会话）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 唯一标识符 |
| topicId | string | 所属主题 ID |
| title | string | 会话标题（来自页面标题或手动输入） |
| sourceUrl | string | DeepSeek 对话 URL |
| parentSessionId | string? | 上一个延续会话的 ID |
| summary | string? | 会话摘要（Markdown） |
| messages | Message[] | 完整对话内容 |
| continuationPrompt | string? | 生成的延续提示词 |
| createdAt | number | Unix 时间戳（毫秒） |

#### Message（消息）
| 字段 | 类型 | 说明 |
|------|------|------|
| role | 枚举 | user, assistant, system |
| content | string | 消息文本 |
| timestamp | string? | 消息时间戳（如有） |

#### Template（模板）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 唯一标识符 |
| name | string | 模板名称 |
| content | string | 包含 `{variable}` 占位符的 Markdown |
| isDefault | boolean | 是否为默认模板 |
| createdAt | number | Unix 时间戳（毫秒） |

### 消息传递架构

所有通信遵循类型化的请求/响应模式：

```
内容脚本  ──chrome.runtime.sendMessage──>  Background (Service Worker)  ──>  IndexedDB
管理界面  ──chrome.runtime.sendMessage──>  Background (Service Worker)  ──>  IndexedDB
```

#### 支持的消息类型

| 类型 | 方向 | 说明 |
|------|------|------|
| `SCRAPE_SESSION` | 内容脚本 -> BG | 保存抓取的对话 |
| `SCRAPE_SUMMARY` | 内容脚本 -> BG | 保存最后一条助手消息为摘要 |
| `GET_TOPICS` | 管理界面 -> BG | 获取主题列表（可筛选） |
| `GET_TOPIC` | 管理界面 -> BG | 按 ID 获取单个主题 |
| `CREATE_TOPIC` | 管理界面 -> BG | 创建新主题 |
| `UPDATE_TOPIC` | 管理界面 -> BG | 更新主题字段 |
| `DELETE_TOPIC` | 管理界面 -> BG | 删除主题及其所有会话 |
| `GET_SESSIONS` | 管理界面 -> BG | 按主题获取会话列表 |
| `GET_SESSION_DETAIL` | 管理界面 -> BG | 获取单个会话 |
| `CREATE_SESSION` | 管理界面 -> BG | 手动创建会话 |
| `UPDATE_SESSION` | 管理界面 -> BG | 更新会话字段 |
| `DELETE_SESSION` | 管理界面 -> BG | 删除单个会话 |
| `GET_TEMPLATES` | 管理界面 -> BG | 获取所有模板 |
| `CREATE_TEMPLATE` | 管理界面 -> BG | 创建新模板 |
| `UPDATE_TEMPLATE` | 管理界面 -> BG | 更新模板 |
| `DELETE_TEMPLATE` | 管理界面 -> BG | 删除模板 |
| `SEARCH` | 管理界面 -> BG | 全文搜索 |
| `EXPORT_TOPIC` | 管理界面 -> BG | 导出主题及会话 |
| `EXPORT_ALL` | 管理界面 -> BG | 导出整个数据库 |
| `IMPORT_ALL` | 管理界面 -> BG | 从 JSON 导入数据库 |

### 适配 DeepSeek 页面更新

如果 DeepSeek 更新了页面布局导致抓取失败：

1. 打开扩展的设置页面
2. 更新 DOM 选择器以匹配新的页面结构
3. 使用 Chrome DevTools 检查 DeepSeek 页面，找到正确的选择器
4. 点击"保存"存储覆盖值（持久化到 `chrome.storage.local`）
5. 点击"恢复默认"可还原为内置选择器

### 浏览器兼容性

| 浏览器 | 状态 |
|--------|------|
| Chrome 109+ | 支持（Manifest V3） |
| Edge 109+ | 支持（基于 Chromium） |
| Firefox | 暂不支持（需要 MV2/MV3 适配） |

### 开源协议

MIT
