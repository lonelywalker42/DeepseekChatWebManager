"""Knowledge cards browser page."""

import json
import streamlit as st
import requests

API_BASE = "http://localhost:8000"

st.set_page_config(page_title="知识卡片", page_icon="📚", layout="wide")

# ── Page CSS ──
st.markdown("""
<style>
    .page-hero {
        background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%);
        padding: 2rem 2rem;
        border-radius: 1rem;
        margin-bottom: 1.5rem;
        border: 1px solid rgba(129,140,248,0.15);
    }
    .page-hero h1 { font-size: 2rem !important; color: #e0e7ff !important; margin-bottom: 0.3rem !important; }
    .page-hero p { color: #a5b4fc; font-size: 1rem; }
    .card-kb {
        background: rgba(30,27,75,0.6);
        border: 1px solid rgba(129,140,248,0.15);
        border-radius: 1rem;
        padding: 1.5rem;
        height: 100%;
        transition: all 0.2s;
    }
    .card-kb:hover {
        border-color: rgba(129,140,248,0.4);
        box-shadow: 0 8px 30px rgba(99,102,241,0.12);
    }
    .card-title { font-size: 1.1rem; font-weight: 600; color: #e0e7ff; margin-bottom: 0.5rem; }
    .card-summary { color: #94a3b8; font-size: 0.9rem; line-height: 1.5; margin-bottom: 0.8rem; }
    .card-tag {
        display: inline-block;
        background: rgba(99,102,241,0.15);
        border: 1px solid rgba(99,102,241,0.25);
        border-radius: 1rem;
        padding: 0.15rem 0.7rem;
        font-size: 0.78rem;
        color: #a5b4fc;
        margin-right: 0.3rem;
        margin-bottom: 0.3rem;
    }
    .card-meta { color: #64748b; font-size: 0.82rem; margin-top: 0.6rem; }
    .difficulty-badge {
        display: inline-block;
        padding: 0.15rem 0.6rem;
        border-radius: 1rem;
        font-size: 0.78rem;
        font-weight: 500;
    }
    .diff-初级 { background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
    .diff-中级 { background: rgba(234,179,8,0.15); color: #facc15; border: 1px solid rgba(234,179,8,0.3); }
    .diff-高级 { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
    .empty-state {
        text-align: center;
        padding: 4rem 2rem;
        color: #64748b;
    }
    .empty-state .icon { font-size: 4rem; margin-bottom: 1rem; }
    .empty-state h3 { color: #94a3b8; margin-bottom: 0.5rem; }
</style>
""", unsafe_allow_html=True)

# ── Hero ──
st.markdown("""
<div class="page-hero">
    <h1>📚 知识卡片</h1>
    <p>浏览 AI 生成的结构化知识卡片，按标签、难度、分类过滤</p>
</div>
""", unsafe_allow_html=True)

# ── Filters ──
st.markdown("### 🔎 筛选")
fc1, fc2, fc3 = st.columns(3)

with fc1:
    difficulty_filter = st.selectbox("难度", ["全部", "初级", "中级", "高级"], index=0)
with fc2:
    try:
        tags = requests.get(f"{API_BASE}/api/v1/cards/tags/all", timeout=5).json()
        tag_options = ["全部"] + [t["name"] for t in tags]
    except Exception:
        tag_options = ["全部"]
    tag_filter = st.selectbox("标签", tag_options, index=0)
with fc3:
    category_filter = st.text_input("分类前缀", placeholder="如: 编程 > Python")

# Fetch cards
params = {"limit": 200}
if difficulty_filter != "全部":
    params["difficulty"] = difficulty_filter
if tag_filter != "全部":
    params["tag"] = tag_filter
if category_filter.strip():
    params["category"] = category_filter.strip()

try:
    cards = requests.get(f"{API_BASE}/api/v1/cards/", params=params, timeout=10).json()
except Exception as e:
    st.error(f"获取卡片失败: {e}")
    cards = []

if not cards:
    st.markdown("""
    <div class="empty-state">
        <div class="icon">📭</div>
        <h3>暂无知识卡片</h3>
        <p>请先上传 DeepSeek 对话 JSON 文件，AI 将自动生成知识卡片</p>
    </div>
    """, unsafe_allow_html=True)
else:
    st.markdown(f"### 共 {len(cards)} 张卡片")

    for i in range(0, len(cards), 2):
        cols = st.columns(2)
        for j, col in enumerate(cols):
            if i + j >= len(cards):
                break
            card = cards[i + j]
            with col:
                # Difficulty badge
                diff = card.get("difficulty", "")
                diff_html = ""
                if diff:
                    diff_html = f'<span class="difficulty-badge diff-{diff}">{diff}</span>'

                # Tags
                tags_html = "".join([f'<span class="card-tag">{t}</span>' for t in card.get("tags", [])])

                # Category
                cat_html = ""
                if card.get("category_path"):
                    cat_html = f'<div class="card-meta">📁 {card["category_path"]}</div>'

                st.markdown(f"""
                <div class="card-kb">
                    <div class="card-title">{card['title']} {diff_html}</div>
                    <div class="card-summary">{card.get('summary', '')}</div>
                    <div>{tags_html}</div>
                    {cat_html}
                    <div class="card-meta">🕐 {str(card.get('created_at', ''))[:19]}</div>
                </div>
                """, unsafe_allow_html=True)

                # Expand for details
                with st.expander("📖 查看详情"):
                    try:
                        full = requests.get(f"{API_BASE}/api/v1/cards/{card['id']}", timeout=5).json()

                        if full.get("key_points"):
                            st.markdown("**关键要点：**")
                            for kp in full["key_points"]:
                                st.markdown(f"- {kp}")

                        if full.get("code_snippets"):
                            st.markdown("**代码片段：**")
                            for snippet in full["code_snippets"]:
                                st.code(snippet, language="python")

                        if full.get("parent_version_id"):
                            st.info(f"🔗 版本关联: 此卡片有历史版本")
                    except Exception as e:
                        st.error(f"获取详情失败: {e}")
