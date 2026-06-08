"""Streamlit main entry point — DeepSeek Knowledge Base homepage."""

import streamlit as st
import requests

API_BASE = "http://localhost:8000"

# ── Page config ──
st.set_page_config(
    page_title="DeepSeek 知识库",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS ──
st.markdown("""
<style>
    /* Global font */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    .stApp {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* Hero section */
    .hero {
        background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
        padding: 3rem 2.5rem;
        border-radius: 1.2rem;
        margin-bottom: 2rem;
        position: relative;
        overflow: hidden;
    }
    .hero::before {
        content: '';
        position: absolute;
        top: -50%; left: -50%;
        width: 200%; height: 200%;
        background: radial-gradient(circle at 30% 70%, rgba(99,102,241,0.15) 0%, transparent 50%),
                    radial-gradient(circle at 70% 30%, rgba(168,85,247,0.1) 0%, transparent 50%);
        animation: pulse 8s ease-in-out infinite alternate;
    }
    @keyframes pulse {
        0% { transform: scale(1) rotate(0deg); }
        100% { transform: scale(1.05) rotate(3deg); }
    }
    .hero-content { position: relative; z-index: 1; }
    .hero h1 {
        font-size: 2.8rem !important;
        font-weight: 700;
        background: linear-gradient(135deg, #c7d2fe 0%, #e0e7ff 40%, #f0abfc 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.5rem;
        line-height: 1.2;
    }
    .hero p {
        color: #a5b4fc;
        font-size: 1.15rem;
        font-weight: 300;
        line-height: 1.6;
        max-width: 600px;
    }

    /* Stats cards */
    .stat-card {
        background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
        border: 1px solid rgba(129,140,248,0.2);
        border-radius: 1rem;
        padding: 1.5rem;
        text-align: center;
        transition: transform 0.2s, border-color 0.2s;
    }
    .stat-card:hover {
        transform: translateY(-2px);
        border-color: rgba(129,140,248,0.5);
    }
    .stat-icon {
        font-size: 2.2rem;
        margin-bottom: 0.5rem;
    }
    .stat-value {
        font-size: 2.5rem;
        font-weight: 700;
        color: #e0e7ff;
        line-height: 1;
        margin-bottom: 0.3rem;
    }
    .stat-label {
        font-size: 0.9rem;
        color: #a5b4fc;
        font-weight: 400;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    /* Feature cards */
    .feature-card {
        background: rgba(30,27,75,0.6);
        border: 1px solid rgba(129,140,248,0.15);
        border-radius: 1rem;
        padding: 1.8rem;
        height: 100%;
        transition: all 0.25s ease;
    }
    .feature-card:hover {
        border-color: rgba(129,140,248,0.4);
        background: rgba(30,27,75,0.8);
        transform: translateY(-3px);
        box-shadow: 0 12px 40px rgba(99,102,241,0.15);
    }
    .feature-icon {
        font-size: 2.5rem;
        margin-bottom: 1rem;
        display: inline-block;
    }
    .feature-title {
        font-size: 1.2rem;
        font-weight: 600;
        color: #e0e7ff;
        margin-bottom: 0.5rem;
    }
    .feature-desc {
        font-size: 0.92rem;
        color: #94a3b8;
        line-height: 1.6;
    }

    /* Pipeline section */
    .pipeline-step {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.8rem 1.2rem;
        background: rgba(30,27,75,0.4);
        border-radius: 0.8rem;
        margin-bottom: 0.6rem;
        border-left: 3px solid #6366f1;
    }
    .pipeline-num {
        background: #4f46e5;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        font-weight: 600;
        flex-shrink: 0;
    }
    .pipeline-text {
        color: #c7d2fe;
        font-size: 0.95rem;
    }

    /* Recent session */
    .session-item {
        background: rgba(30,27,75,0.5);
        border: 1px solid rgba(129,140,248,0.12);
        border-radius: 0.8rem;
        padding: 1rem 1.2rem;
        margin-bottom: 0.6rem;
        transition: border-color 0.2s;
    }
    .session-item:hover {
        border-color: rgba(129,140,248,0.3);
    }
    .session-title {
        font-weight: 600;
        color: #e0e7ff;
        font-size: 1rem;
    }
    .session-meta {
        color: #64748b;
        font-size: 0.85rem;
        margin-top: 0.3rem;
    }

    /* Sidebar styling */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #0f0c29 0%, #1e1b4b 100%);
    }
    [data-testid="stSidebar"] .stMarkdown p,
    [data-testid="stSidebar"] .stMarkdown li {
        color: #a5b4fc;
    }

    /* Section headers */
    .section-header {
        font-size: 1.4rem;
        font-weight: 600;
        color: #e0e7ff;
        margin: 2rem 0 1rem 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .section-header::after {
        content: '';
        flex: 1;
        height: 1px;
        background: linear-gradient(90deg, rgba(129,140,248,0.3), transparent);
        margin-left: 0.5rem;
    }

    /* Status badge */
    .status-online {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        background: rgba(34,197,94,0.15);
        border: 1px solid rgba(34,197,94,0.3);
        border-radius: 2rem;
        padding: 0.3rem 1rem;
        color: #4ade80;
        font-size: 0.85rem;
        font-weight: 500;
    }
    .status-dot {
        width: 8px; height: 8px;
        background: #4ade80;
        border-radius: 50%;
        animation: blink 2s ease-in-out infinite;
    }
    @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
    }

    /* Footer */
    .footer {
        text-align: center;
        padding: 2rem 0 1rem;
        color: #475569;
        font-size: 0.85rem;
    }
    .footer a {
        color: #818cf8;
        text-decoration: none;
    }

    /* Hide Streamlit defaults */
    #MainMenu { visibility: hidden; }
    footer { visibility: hidden; }
    header { visibility: hidden; }
</style>
""", unsafe_allow_html=True)

# ── Sidebar ──
with st.sidebar:
    st.markdown("### 🧠 知识库导航")
    st.markdown("---")
    st.page_link("streamlit_app/app.py", label="🏠 首页", icon="🏠")
    st.page_link("streamlit_app/pages/1_📤_上传.py", label="📤 上传对话", icon="📤")
    st.page_link("streamlit_app/pages/2_📚_知识卡片.py", label="📚 知识卡片", icon="📚")
    st.page_link("streamlit_app/pages/3_🔍_搜索.py", label="🔍 语义搜索", icon="🔍")
    st.page_link("streamlit_app/pages/4_⚙️_设置.py", label="⚙️ 设置", icon="⚙️")
    st.markdown("---")
    st.caption("v0.1.0 · Phase 1 MVP")

# ── Hero Section ──
st.markdown("""
<div class="hero">
    <div class="hero-content">
        <h1>🧠 DeepSeek 知识库</h1>
        <p>将 DeepSeek 对话自动转化为结构化知识卡片。<br>
        AI 驱动的总结、切分、标签提取与语义搜索，打造你的第二大脑。</p>
    </div>
</div>
""", unsafe_allow_html=True)

# ── Service Status ──
service_ok = False
try:
    resp = requests.get(f"{API_BASE}/health", timeout=2)
    service_ok = resp.status_code == 200
except Exception:
    pass

if service_ok:
    st.markdown('<span class="status-online"><span class="status-dot"></span> 本地服务运行中</span>', unsafe_allow_html=True)
else:
    st.error("❌ 本地服务未启动。请运行 `cd server && python -m uvicorn main:app --reload`")
    st.stop()

# ── Stats Dashboard ──
try:
    sessions = requests.get(f"{API_BASE}/api/v1/sessions/", timeout=5).json()
    cards = requests.get(f"{API_BASE}/api/v1/cards/?limit=200", timeout=5).json()
    tags = requests.get(f"{API_BASE}/api/v1/cards/tags/all", timeout=5).json()

    st.markdown('<div class="section-header">📊 数据概览</div>', unsafe_allow_html=True)

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(f"""
        <div class="stat-card">
            <div class="stat-icon">📚</div>
            <div class="stat-value">{len(sessions)}</div>
            <div class="stat-label">会话</div>
        </div>
        """, unsafe_allow_html=True)
    with c2:
        st.markdown(f"""
        <div class="stat-card">
            <div class="stat-icon">🃏</div>
            <div class="stat-value">{len(cards)}</div>
            <div class="stat-label">知识卡片</div>
        </div>
        """, unsafe_allow_html=True)
    with c3:
        st.markdown(f"""
        <div class="stat-card">
            <div class="stat-icon">🏷️</div>
            <div class="stat-value">{len(tags)}</div>
            <div class="stat-label">标签</div>
        </div>
        """, unsafe_allow_html=True)
    with c4:
        domains = set()
        for s in sessions:
            if s.get("knowledge_domain"):
                for d in (s["knowledge_domain"] if isinstance(s["knowledge_domain"], list) else []):
                    domains.add(d)
        st.markdown(f"""
        <div class="stat-card">
            <div class="stat-icon">🌐</div>
            <div class="stat-value">{len(domains)}</div>
            <div class="stat-label">知识领域</div>
        </div>
        """, unsafe_allow_html=True)

except Exception as e:
    st.warning(f"获取统计数据失败: {e}")
    sessions, cards, tags = [], [], []

# ── Recent Sessions ──
if sessions:
    st.markdown('<div class="section-header">📋 最近会话</div>', unsafe_allow_html=True)

    for s in sessions[:5]:
        domain_str = ""
        if s.get("knowledge_domain"):
            dlist = s["knowledge_domain"] if isinstance(s["knowledge_domain"], list) else []
            domain_str = " · ".join(dlist) if dlist else ""

        st.markdown(f"""
        <div class="session-item">
            <div class="session-title">📄 {s['title']}</div>
            <div class="session-meta">
                💬 {s['message_count']} 条消息 &nbsp;·&nbsp;
                🃏 {s['card_count']} 张卡片 &nbsp;·&nbsp;
                🕐 {str(s.get('uploaded_at', ''))[:19]}
                {" &nbsp;·&nbsp; 📁 " + domain_str if domain_str else ""}
            </div>
        </div>
        """, unsafe_allow_html=True)

        if s.get("overall_summary"):
            st.markdown(f"<div style='color:#94a3b8;font-size:0.9rem;padding:0 0.5rem 0.5rem;'>{s['overall_summary']}</div>", unsafe_allow_html=True)

# ── Features + Pipeline ──
st.markdown('<div class="section-header">✨ 功能特性</div>', unsafe_allow_html=True)

f1, f2, f3, f4 = st.columns(4)
with f1:
    st.markdown("""
    <div class="feature-card">
        <div class="feature-icon">📤</div>
        <div class="feature-title">智能导入</div>
        <div class="feature-desc">上传 DeepSeek 对话 JSON，AI 自动解析、清洗、结构化处理。</div>
    </div>
    """, unsafe_allow_html=True)
with f2:
    st.markdown("""
    <div class="feature-card">
        <div class="feature-icon">✂️</div>
        <div class="feature-title">话题切分</div>
        <div class="feature-desc">LLM 按语义自动将长对话切分为独立话题块，精准提取知识。</div>
    </div>
    """, unsafe_allow_html=True)
with f3:
    st.markdown("""
    <div class="feature-card">
        <div class="feature-icon">🔍</div>
        <div class="feature-title">语义搜索</div>
        <div class="feature-desc">基于向量嵌入的语义搜索，用自然语言找到最相关的知识。</div>
    </div>
    """, unsafe_allow_html=True)
with f4:
    st.markdown("""
    <div class="feature-card">
        <div class="feature-icon">🔗</div>
        <div class="feature-title">版本关联</div>
        <div class="feature-desc">相似度 ≥95% 的卡片自动建立版本链，保留全部历史。</div>
    </div>
    """, unsafe_allow_html=True)

# ── Pipeline ──
st.markdown('<div class="section-header">⚙️ AI 处理流程</div>', unsafe_allow_html=True)

p1, p2 = st.columns([1, 1])
with p1:
    steps = [
        ("1", "📥 预处理", "清洗无意义消息，合并连续消息，格式化角色标注"),
        ("2", "📝 会话总结", "LLM 生成标题、整体摘要、知识领域分类"),
        ("3", "✂️ 话题切分", "LLM 按语义转折点切分对话为独立话题块"),
        ("4", "🃏 卡片生成", "LLM 提取关键要点、代码片段、难度评估"),
        ("5", "🏷️ 标签规范化", "模糊匹配已有标签库，避免重复，新标签待审核"),
        ("6", "📐 向量化", "bge-small-zh 本地嵌入，存入 ChromaDB"),
        ("7", "🔗 版本关联", "余弦相似度计算，≥95% 自动建立版本链"),
    ]
    for num, title, desc in steps:
        st.markdown(f"""
        <div class="pipeline-step">
            <div class="pipeline-num">{num}</div>
            <div><strong style="color:#e0e7ff">{title}</strong><br>
            <span style="color:#94a3b8;font-size:0.85rem">{desc}</span></div>
        </div>
        """, unsafe_allow_html=True)

with p2:
    st.markdown("""
    <div class="feature-card" style="height:100%">
        <div class="feature-icon">🚀</div>
        <div class="feature-title">快速开始</div>
        <div class="feature-desc" style="line-height:1.8">
            <strong>1.</strong> 点击左侧 <strong>📤 上传</strong> 页面<br>
            <strong>2.</strong> 拖拽 DeepSeek 对话 JSON 文件<br>
            <strong>3.</strong> 点击「开始处理」，等待 AI 分析<br>
            <strong>4.</strong> 在 <strong>📚 知识卡片</strong> 浏览结果<br>
            <strong>5.</strong> 在 <strong>🔍 搜索</strong> 用自然语言检索<br>
            <br>
            <em style="color:#818cf8">💡 也可通过 Chrome 扩展直接推送对话到知识库</em>
        </div>
    </div>
    """, unsafe_allow_html=True)

# ── Footer ──
st.markdown("""
<div class="footer">
    DeepSeek Knowledge Base · Phase 1 MVP · Built with FastAPI + Streamlit + ChromaDB
</div>
""", unsafe_allow_html=True)
