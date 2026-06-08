"""Upload page — drag-and-drop JSON file upload with incremental update support."""

import json
import time
import streamlit as st
import requests

API_BASE = "http://localhost:8000"

st.set_page_config(page_title="上传对话", page_icon="📤", layout="wide")

# ── Page CSS ──
st.markdown("""
<style>
    .page-hero {
        background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%);
        padding: 2rem 2rem;
        border-radius: 1rem;
        margin-bottom: 2rem;
        border: 1px solid rgba(129,140,248,0.15);
    }
    .page-hero h1 { font-size: 2rem !important; color: #e0e7ff !important; margin-bottom: 0.3rem !important; }
    .page-hero p { color: #a5b4fc; font-size: 1rem; }
    .upload-card {
        background: rgba(30,27,75,0.6);
        border: 1px solid rgba(129,140,248,0.15);
        border-radius: 1rem;
        padding: 1.5rem;
        margin-bottom: 1rem;
    }
    .file-info {
        display: flex;
        gap: 1.5rem;
        flex-wrap: wrap;
        margin: 0.8rem 0;
    }
    .file-info-item {
        background: rgba(99,102,241,0.1);
        border: 1px solid rgba(99,102,241,0.2);
        border-radius: 0.6rem;
        padding: 0.4rem 0.9rem;
        color: #c7d2fe;
        font-size: 0.88rem;
    }
    .action-created {
        background: rgba(34,197,94,0.12);
        border: 1px solid rgba(34,197,94,0.3);
        border-radius: 0.8rem;
        padding: 1rem 1.2rem;
        color: #4ade80;
    }
    .action-updated {
        background: rgba(234,179,8,0.12);
        border: 1px solid rgba(234,179,8,0.3);
        border-radius: 0.8rem;
        padding: 1rem 1.2rem;
        color: #facc15;
    }
    .action-skipped {
        background: rgba(100,116,139,0.12);
        border: 1px solid rgba(100,116,139,0.3);
        border-radius: 0.8rem;
        padding: 1rem 1.2rem;
        color: #94a3b8;
    }
    .progress-card {
        background: rgba(30,27,75,0.5);
        border: 1px solid rgba(129,140,248,0.15);
        border-radius: 0.8rem;
        padding: 1.2rem;
        margin: 0.5rem 0;
    }
    .tip-card {
        background: rgba(99,102,241,0.08);
        border: 1px solid rgba(99,102,241,0.2);
        border-radius: 1rem;
        padding: 1.5rem;
    }
    .tip-card h3 { color: #e0e7ff; margin-bottom: 0.8rem; }
    .tip-card li { color: #94a3b8; margin-bottom: 0.4rem; line-height: 1.6; }
</style>
""", unsafe_allow_html=True)

# ── Hero ──
st.markdown("""
<div class="page-hero">
    <h1>📤 上传 DeepSeek 对话</h1>
    <p>上传 .json 文件，自动去重 · 增量更新 · AI 生成知识卡片</p>
</div>
""", unsafe_allow_html=True)

# ── File uploader ──
uploaded_files = st.file_uploader(
    "拖拽 JSON 文件到这里，或点击选择",
    type=["json"],
    accept_multiple_files=True,
    help="支持 DeepSeek Chat 导出的 JSON 文件。重复上传同一对话将自动增量更新。",
)

if uploaded_files:
    for uploaded_file in uploaded_files:
        try:
            data = json.loads(uploaded_file.read())
        except json.JSONDecodeError:
            st.error(f"❌ {uploaded_file.name}: 不是有效的 JSON 文件")
            continue

        # Parse messages
        messages = []
        source_url = None
        if isinstance(data, list):
            messages = [{"role": m.get("role", "user"), "content": m.get("content", "")} for m in data if isinstance(m, dict)]
        elif isinstance(data, dict):
            source_url = data.get("source_url") or data.get("url") or data.get("conversation_id")
            msg_list = data.get("messages", data.get("conversation", []))
            if isinstance(msg_list, list):
                messages = [{"role": m.get("role", "user"), "content": m.get("content", "")} for m in msg_list if isinstance(m, dict)]

        title = data.get("title", uploaded_file.name) if isinstance(data, dict) else uploaded_file.name
        user_count = sum(1 for m in messages if m.get("role") == "user")
        assistant_count = sum(1 for m in messages if m.get("role") == "assistant")

        # URL badge
        url_badge = ""
        if source_url:
            url_badge = f'<div class="file-info-item">🔗 URL: {source_url[:50]}...</div>' if len(str(source_url)) > 50 else f'<div class="file-info-item">🔗 URL: {source_url}</div>'

        st.markdown(f"""
        <div class="upload-card">
            <div style="font-size:1.15rem;font-weight:600;color:#e0e7ff;margin-bottom:0.5rem">📄 {uploaded_file.name}</div>
            <div class="file-info">
                <div class="file-info-item">📝 {title}</div>
                <div class="file-info-item">💬 {len(messages)} 条消息</div>
                <div class="file-info-item">👤 用户 {user_count}</div>
                <div class="file-info-item">🤖 助手 {assistant_count}</div>
                {url_badge}
            </div>
        </div>
        """, unsafe_allow_html=True)

        process_key = f"process_{uploaded_file.name}"
        if st.button("🚀 开始处理", key=process_key, type="primary", use_container_width=True):
            if not messages:
                st.error("❌ 未找到有效消息")
                continue

            with st.spinner("正在检查重复并上传..."):
                try:
                    resp = requests.post(
                        f"{API_BASE}/api/v1/sessions/upload",
                        json={
                            "title": title,
                            "source_type": "deepseek",
                            "source_url": source_url,
                            "original_filename": uploaded_file.name,
                            "messages": messages,
                        },
                        timeout=10,
                    )
                    resp.raise_for_status()
                    result = resp.json()

                    action = result.get("action", "created")
                    detail = result.get("detail", "")
                    task_id = result.get("task_id")

                    # Show action result
                    if action == "skipped":
                        st.markdown(f"""
                        <div class="action-skipped">
                            <strong>⏭️ 已跳过</strong> — {detail}
                        </div>
                        """, unsafe_allow_html=True)
                        continue
                    elif action == "updated":
                        st.markdown(f"""
                        <div class="action-updated">
                            <strong>🔄 增量更新</strong> — {detail}
                        </div>
                        """, unsafe_allow_html=True)
                    else:
                        st.markdown(f"""
                        <div class="action-created">
                            <strong>✅ 新建会话</strong> — {detail}
                        </div>
                        """, unsafe_allow_html=True)

                    if task_id:
                        st.session_state[f"task_id_{uploaded_file.name}"] = task_id

                except Exception as e:
                    st.error(f"❌ 上传失败: {e}")
                    continue

        # Poll task status
        task_key = f"task_id_{uploaded_file.name}"
        if task_key in st.session_state:
            task_id = st.session_state[task_key]

            st.markdown('<div class="progress-card">', unsafe_allow_html=True)
            status_placeholder = st.empty()
            progress_bar = st.progress(0)

            pipeline_steps = ["预处理消息", "生成会话摘要", "切分话题", "生成知识卡片", "向量化"]

            for attempt in range(120):
                try:
                    task_resp = requests.get(f"{API_BASE}/api/v1/tasks/{task_id}", timeout=5)
                    if task_resp.status_code == 200:
                        task = task_resp.json()
                        status = task["status"]
                        progress_text = task.get("progress", "")

                        if status == "completed":
                            progress_bar.progress(1.0)
                            status_placeholder.success(f"✅ {progress_text}")
                            del st.session_state[task_key]
                            break
                        elif status == "failed":
                            status_placeholder.error(f"❌ 处理失败: {task.get('error', '未知错误')}")
                            del st.session_state[task_key]
                            break
                        else:
                            pct = min(0.9, attempt / 100)
                            for i, step in enumerate(pipeline_steps):
                                if step in progress_text:
                                    pct = max(pct, (i + 1) / len(pipeline_steps))
                            progress_bar.progress(pct)
                            status_placeholder.info(f"⏳ {progress_text}")
                            time.sleep(2)
                except Exception:
                    time.sleep(2)

            st.markdown('</div>', unsafe_allow_html=True)

else:
    # ── Empty state ──
    st.markdown("""
    <div class="tip-card">
        <h3>💡 如何获取 DeepSeek 对话 JSON？</h3>
        <ol>
            <li>打开 <a href="https://chat.deepseek.com" target="_blank" style="color:#818cf8">chat.deepseek.com</a> 并进行对话</li>
            <li>使用本项目的 <strong>Chrome 扩展</strong>抓取对话（推荐）</li>
            <li>在扩展的 Manager 中导出 JSON 文件</li>
            <li>或者直接上传 DeepSeek 的对话导出文件</li>
        </ol>
    </div>
    """, unsafe_allow_html=True)

    # ── Incremental update explanation ──
    st.markdown("### 🔄 增量更新机制")
    st.markdown("""
    <div style="background:rgba(30,27,75,0.4);border-radius:0.8rem;padding:1.2rem;
                border-left:3px solid #6366f1;margin-bottom:1rem">
        <div style="color:#e0e7ff;font-weight:600;margin-bottom:0.5rem">同一对话多次上传时的行为：</div>
        <div style="color:#94a3b8;line-height:1.8">
            <strong>1. 去重检测</strong> — 以对话 URL 为主键查询是否已存在<br>
            <strong>2. 消息比对</strong> — 比较新旧消息数量和内容<br>
            <strong>3. 跳过 / 更新</strong> — 无新消息则跳过；有新增则删除旧卡片后重新处理<br>
            <br>
            <em style="color:#818cf8">💡 这样可以多次导出同一对话而不会产生重复卡片</em>
        </div>
    </div>
    """, unsafe_allow_html=True)

    steps = [
        ("🧹", "预处理", "清洗无意义消息，合并连续消息"),
        ("📝", "会话总结", "AI 生成标题、摘要、知识领域"),
        ("✂️", "话题切分", "AI 按语义将对话切分为独立话题"),
        ("🃏", "卡片生成", "AI 提取关键要点和代码片段"),
        ("🏷️", "标签提取", "自动提取并规范化标签"),
        ("📐", "向量化", "嵌入模型生成语义向量"),
        ("🔗", "版本关联", "自动关联相似历史知识卡片"),
    ]
    for icon, title, desc in steps:
        st.markdown(f"""
        <div style="display:flex;align-items:center;gap:1rem;padding:0.5rem 1rem;
                    background:rgba(30,27,75,0.3);border-radius:0.5rem;margin-bottom:0.3rem;
                    border-left:3px solid #6366f1">
            <span style="font-size:1.1rem">{icon}</span>
            <div>
                <strong style="color:#e0e7ff">{title}</strong>
                <span style="color:#94a3b8;font-size:0.88rem"> — {desc}</span>
            </div>
        </div>
        """, unsafe_allow_html=True)
