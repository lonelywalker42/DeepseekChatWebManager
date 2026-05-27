\# DeepSeekChat Manager



\## 1. 工具形态与整体架构

\- \*\*浏览器扩展\*\*：注入 DeepSeek 网页版（chat.deepseek.com），解析对话 DOM，抓取会话数据。  

\- \*\*本地 Web 管理界面\*\*：扩展内置的独立页面（如 `chrome-extension://<id>/manager.html`），以 React SPA 形式提供主题管理、会话浏览、总结模板配置等功能。  

\- \*\*数据存储\*\*：扩展本地 IndexedDB 存储所有主题、会话和模板，无需外部服务，保证隐私和离线可用。  



\*\*为什么不用额外的本地服务器？\*\*  

全部打包为浏览器扩展，安装即用，零部署成本，跨平台（Chrome/Edge/Firefox 兼容），适合个人效率工具的场景。



\## 2. 核心概念模型（围绕 Topic）

Topic（主题）

├── id (UUID)

├── title

├── type: idea-discussion | code-generation | knowledge-qa | other

├── status: active | completed | archived

├── tags: string\[]

├── progressSummary: string (Markdown)

├── createdAt, updatedAt

└── sessions: Session\[]

└── Session（会话）

├── id (UUID)

├── title (自动抓取或手动填写)

├── sourceUrl (DeepSeek 对话原始 URL)

├── parentSessionId? (上一个延续会话的 id)

├── summary? (该会话的阶段小结 Markdown)

├── createdAt (抓取时间)

├── messages: Message\[]

│ └── Message { role, content, timestamp }

└── continuationPrompt? (自动生成的“延续提示词”)





\## 3. 关键功能详细设计



\### A. 会话抓取（浏览器扩展 Content Script）

\- \*\*触发方式\*\*：  

&#x20; - 用户点击扩展图标弹出气泡，点击「抓取当前对话」。  

&#x20; - 或在管理界面中预先创建 Topic，然后在网页端点「追加到当前 Topic」。  

\- \*\*DOM 解析\*\*：  

&#x20; - 识别对话容器（通过特定 class/结构，需定期适配 DeepSeek 页面更新）。  

&#x20; - 提取每条消息的角色（用户/助手）、内容和时间戳。  

&#x20; - 提取当前对话的标题（可从页面 title 或特定元素获取）。  

\- \*\*冲突处理\*\*：若同一对话已抓取过（通过 URL 去重），则提示“更新”还是“新建会话”。  

\- \*\*存储\*\*：通过 `chrome.runtime.sendMessage` 将结构化数据发送给 Background，存入 IndexedDB。



\### B. 管理界面

\- \*\*单页应用\*\*（使用 React + Tailwind CSS 快速构建），打包到扩展中。  

\- \*\*导航\*\*：  

&#x20; - 左侧 Topic 列表（可筛选 type、状态、搜索）。  

&#x20; - 选中 Topic 后显示其 Session 时间线，用连线表示父会话关系。  

&#x20; - 右侧可查看某个 Session 的完整消息（折叠/展开）。  

\- \*\*Topic 操作\*\*：新建、编辑（标题、类型、标签）、归档、删除。  

\- \*\*Session 操作\*\*：手动创建（粘贴内容）、抓取来的自动关联到 Topic、设置父会话、删除、重新抓取更新。



\### C. 总结与延续机制

\- \*\*总结执行\*\*：  

&#x20; 1. 用户在 DeepSeek 对话框的末尾，输入由工具生成的「总结提示词」。  

&#x20; 2. 提示词包含自定义模板（如“请用以下 Markdown 模板总结本次讨论进度：### 已解决\\n...### 待解决\\n...### 下一步”），用户发送后助手生成总结。  

&#x20; 3. 用户再次点击「抓取总结」按钮，工具会只提取本次对话最后一条助手消息，并填入 Session 的 `summary` 字段。  

\- \*\*模板管理\*\*：在管理界面提供默认模板，用户可修改、创建多个模板（例如“代码生成类总结”、“知识问答类总结”），抓取总结时选择模板。  

\- \*\*延续上下文生成\*\*：  

&#x20; - 当需要开启新会话延续旧 Topic 时，管理界面可根据 Topic 的最新进度总结和上一个 Session 的总结，自动生成一段「延续上下文提示词」，用户复制后粘贴到新对话开头。  

&#x20; - 内容示例：“我们正在讨论 \[Topic title]，之前的进度是：\[progressSummary]。上次会话结尾：\[lastSession.summary]。请基于此继续。”  

\- \*\*父会话关联\*\*：在 Session 详情中可手动选择父会话，建立显式链条；时间线视图会清晰展示。



\### D. 搜索与导出

\- \*\*全文搜索\*\*：在管理界面内对消息内容、总结进行搜索（使用 IndexedDB 游标遍历或前端搜索库 lunr.js）。  

\- \*\*导出\*\*：  

&#x20; - 单个 Topic 可导出为 Markdown 文件（包含所有会话、消息和总结）。  

&#x20; - 支持导出整个数据库为 JSON，用于备份迁移。



\## 4. 技术栈确认

\- \*\*浏览器扩展\*\*：Manifest V3，使用 TypeScript 编写。  

\- \*\*后台脚本\*\*：Service Worker（处理消息中转、存储操作）。  

\- \*\*内容脚本\*\*：注入 DeepSeek 页面，负责 DOM 解析和抓取触发。  

\- \*\*管理界面\*\*：React 18 + TypeScript，打包工具使用 Vite（配置为库模式，输出为扩展页面）。  

\- \*\*存储\*\*：idb（IndexedDB 封装库）方便操作。  

\- \*\*UI 风格\*\*：简洁工具型，可用 Tailwind CSS 或 Ant Design（轻量）。



\## 5. 开发计划（Coding Plan）



\### 阶段一：扩展脚手架与存储层

\*\*目标\*\*：搭建可加载的浏览器扩展骨架，实现 IndexedDB Schema 和基本读写。



| 任务 | 详细说明 |

|------|----------|

| \*\*初始化项目\*\* | 使用 Vite + React + TypeScript 模板，配合 `@crxjs/vite-plugin` 快速构建 Manifest V3 扩展。 |

| \*\*Manifest 配置\*\* | 声明权限：`activeTab`、`storage`、`scripting`，host\_permissions 包含 `\*://chat.deepseek.com/\*`。 |

| \*\*IndexedDB 设计\*\* | 定义 `topics`、`sessions`、`templates` 三个 object store，使用 `idb` 库创建 DAO 层（CRUD 方法）。 |

| \*\*Background 消息路由\*\* | 建立 `chrome.runtime.onMessage` 监听，分发到对应的存储操作（saveSession, getTopic 等）。 |

| \*\*基础 UI 页面\*\* | 创建 `manager.html`，加载 React 应用，显示 Topic 列表（空数据硬编码验证）。 |



\### 阶段二：会话抓取功能

\*\*目标\*\*：在 DeepSeek 页面注入内容脚本，能解析对话并保存。



| 任务 | 详细说明 |

|------|----------|

| \*\*Content Script 注入\*\* | 对 `chat.deepseek.com` 页面注入 `content.ts`，监听 `DOMContentLoaded` 后添加自定义抓取按钮（或通过扩展图标触发）。 |

| \*\*DOM 解析逻辑\*\* | 分析 DeepSeek 当前页面结构（如主对话区域的容器、每条消息的 class），编写选择器提取角色、内容、时间戳。需定期适配，初始版本针对性抓取。 |

| \*\*抓取控制\*\* | 通过 `window.postMessage` 或 `chrome.runtime.sendMessage` 与 Background 通信；点击抓取后获取当前 URL，避免重复抓取。 |

| \*\*保存到 IndexedDB\*\* | Background 收到抓取数据后，判断是否已有该 URL 的会话，若无则创建新 Session（自动生成标题，缺省关联到“未分类” Topic）。 |

| \*\*简易通知\*\* | 抓取完成后弹出扩展角标或通知，引导用户进入管理界面关联 Topic。 |



\### 阶段三：管理界面核心交互

\*\*目标\*\*：实现 Topic 和 Session 的 CRUD、关联、时间线展示。



| 任务 | 详细说明 |

|------|----------|

| \*\*Topic 管理页\*\* | 列表展示（可过滤 status/type），新建/编辑表单（包含标题、类型、标签），删除 Topic 时级联删除下属 Session。 |

| \*\*Session 列表与详情\*\* | 选中 Topic 后显示其所有 Session（按时间倒序），点击某条查看消息列表（可折叠，支持搜索高亮）。 |

| \*\*父会话关联\*\* | Session 详情中提供下拉选择同 Topic 下的其他 Session 作为父级，支持“取消关联”。时间线视图用竖线连接父子节点。 |

| \*\*手动创建 Session\*\* | 支持手动粘贴对话内容（JSON 或纯文本），快速记录非 DeepSeek 来源的对话。 |

| \*\*进度总结展示\*\* | Topic 详情页顶部显示 `progressSummary`，可手动编辑（Markdown）。 |



\### 阶段四：总结与模板功能

\*\*目标\*\*：实现模板管理、抓取总结、延续提示词生成。



| 任务 | 详细说明 |

|------|----------|

| \*\*模板管理\*\* | 管理界面新增“总结模板”页，列出默认模板，用户可增删改；模板变量支持 `{topic\_title}` 等。 |

| \*\*抓取总结\*\* | 在 Content Script 中增加“抓取最后助手消息”功能；或用户手动选中最后一条消息右键发送。消息体存入当前 Session 的 `summary`。 |

| \*\*生成延续提示词\*\* | 在 Topic 或 Session 操作菜单提供“生成延续提示词”，根据模板拼接进度总结和最后会话总结，复制到剪贴板。 |

| \*\*进度汇总\*\* | 提供“汇总 Topic 进度”按钮，自动将该 Topic 下所有 Session 的 summary 拼接为初步的 `progressSummary`，用户可修改。 |



\### 阶段五：搜索、导出与健壮性

\*\*目标\*\*：提升长期使用体验。



| 任务 | 详细说明 |

|------|----------|

| \*\*全文搜索\*\* | 在管理界面顶部加搜索框，输入关键词后遍历所有 Session 的消息和总结进行匹配，展示结果列表并支持跳转。 |

| \*\*导出 Markdown\*\* | 单个 Topic 导出为格式良好的 Markdown，包含标题、类型、进度总结、每个会话的父子关系和消息。 |

| \*\*数据备份/恢复\*\* | 导出/导入整个 IndexedDB 为 JSON 文件。 |

| \*\*错误处理与日志\*\* | 抓取失败时显示明确错误原因；添加简单的错误日志查看页（开发用）。 |

| \*\*适配性维护\*\* | 将 DOM 选择器配置化，方便 DeepSeek 页面更新时快速调整。 |



\### 开发顺序建议

1\. 一、二阶段同步进行：先搭好扩展和存储，再实现抓取（可验证基础流程）。  

2\. 三阶段实现管理，此时工具已经可用：能抓取、能分类浏览。  

3\. 四阶段加入总结和延续功能，形成完整工作流。  

4\. 五阶段打磨、测试、发布。  

