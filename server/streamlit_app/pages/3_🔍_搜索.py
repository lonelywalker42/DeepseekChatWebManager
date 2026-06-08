"""Semantic search page."""

import streamlit as st
import requests

API_BASE = "http://localhost:8000"

st.set_page_config(page_title="语义搜索", page_icon="🔍", layout="wide")

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
    .search-result {
        background: rgba(30,27,75,0.6);
        border: 1px solid rgba(129,140,248,0.15);
        border-radius: 1rem;
        padding: 1.5rem;
        margin-bottom: 0.8rem;
        transition: border-color 0.2s;
    }
    .search-result:hover { border-color: rgba(129,140,248,0.4); }
    .result-title { font-size: 1.1rem; font-weight: 600; color: #e0e7ff; }
    .result-summary { color: #94a3b8; font-size: 0.9rem; line-height: 1.5; margin: 0.4rem 0; }
    .result-tag {
        display: inline-block;
        background: rgba(99,102,241,0.15);
        border: 1px solid rgba(99,102,241,0.25);
        border-radius: 1rem;
        padding: 0.15rem 0.7rem;
        font-size: 0.78rem;
        color: #a5b4fc;
        margin-right: 0.3rem;
    }
    .score-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.3rem 0.8rem;
        border-radius: 1rem;
        font-size: 0.85rem;
        font-weight: 600;
    }
    .score-high { background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
    .score-mid { background: rgba(234,179,8,0.15); color: #facc15; border: 1px solid rgba(234,179,8,0.3); }
    .score-low { background: rgba(100,116,139,0.15); color: #94a3b8; border: 1px solid rgba(100,116,139,0.3); }
    .suggestion-card {
        background: rgba(30,27,75,0.5);
        border: 1px solid rgba(129,140,248,0.12);
        border-radius: 0.8rem;
        padding: 1.2rem;
        height: 100%;
    }
    .suggestion-title { font-weight: 600; color: #e0e7ff; font-size: 0.95rem; }
    .suggestion-summary { color: #94a3b8; font-size: 0.85rem; margin-top: 0.3rem; }
</style>
""", unsafe_allow_html=True)

# ── Hero ──
st.markdown("""
<div class="page-hero">
    <h1>🔍 语义搜索</h1>
    <p>用自然语言搜索知识库，向量嵌入驱动的语义匹配</p>
</div>
""", unsafe_allow_html=True)

# ── Search input ──
query = st.text_input(
    "搜索",
    placeholder="例如：Python 多线程如何绕过 GIL？",
    help="输入自然语言描述，系统将通过语义相似度匹配最相关的知识卡片",
    label_visibility="collapsed",
)

if query.strip():
    with st.spinner("🔍 搜索中..."):
        try:
            resp = requests.post(
                f"{API_BASE}/api/v1/cards/search",
                json={"query": query, "limit": 20},
                timeout=15,
            )
            resp.raise_for_status()
            results = resp.json()
        except Exception as e:
            st.error(f"搜索失败: {e}")
            results = []

    if not results:
        st.markdown("""
        <div style="text-align:center;padding:3rem;color:#64748b">
            <div style="font-size:3rem;margin-bottom:1rem">🔍</div>
            <h3 style="color:#94a3b8">未找到相关结果</h3>
            <p>试试其他关键词，或先上传一些对话</p>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown(f"### 找到 {len(results)} 个相关结果")

        for result in results:
            card = result["card"]
            score = result["score"]

            # Score styling
            if score >= 0.9:
                score_cls = "score-high"
                score_icon = "🟢"
            elif score >= 0.8:
                score_cls = "score-mid"
                score_icon = "🟡"
            else:
                score_cls = "score-low"
                score_icon = "⚪"

            tags_html = "".join([f'<span class="result-tag">{t}</span>' for t in card.get("tags", [])])

            st.markdown(f"""
            <div class="search-result">
                <div style="display:flex;justify-content:space-between;align-items:flex-start">
                    <div class="result-title">{card['title']}</div>
                    <span class="score-badge {score_cls}">{score_icon} {score:.0%}</span>
                </div>
                <div class="result-summary">{card.get('summary', '')}</div>
                <div>{tags_html}</div>
            </div>
            """, unsafe_allow_html=True)

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
                except Exception as e:
                    st.error(f"获取详情失败: {e}")

else:
    # ── Empty state ──
    st.markdown("""
    <div style="text-align:center;padding:2rem;color:#64748b">
        <div style="font-size:3rem;margin-bottom:0.5rem">💡</div>
        <p style="color:#94a3b8">输入搜索内容开始语义搜索</p>
    </div>
    """, unsafe_allow_html=True)

    # ── Recent cards ──
    try:
        cards = requests.get(f"{API_BASE}/api/v1/cards/?limit=6", timeout=5).json()
        if cards:
            st.markdown("### 📌 最近的知识卡片")
            for i in range(0, len(cards), 3):
                cols = st.columns(3)
                for j, col in enumerate(cols):
                    if i + j >= len(cards):
                        break
                    card = cards[i + j]
                    with col:
                        summary = card.get("summary", "") or ""
                        if len(summary) > 80:
                            summary = summary[:80] + "..."
                        st.markdown(f"""
                        <div class="suggestion-card">
                            <div class="suggestion-title">{card['title']}</div>
                            <div class="suggestion-summary">{summary}</div>
                        </div>
                        """, unsafe_allow_html=True)
    except Exception:
        pass
