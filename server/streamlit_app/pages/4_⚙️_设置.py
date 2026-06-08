"""Settings page — API Key configuration and system info."""

import os
from pathlib import Path

import streamlit as st
import requests

API_BASE = "http://localhost:8000"

st.set_page_config(page_title="设置", page_icon="⚙️", layout="wide")

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
    .settings-section {
        background: rgba(30,27,75,0.6);
        border: 1px solid rgba(129,140,248,0.15);
        border-radius: 1rem;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
    }
    .settings-section h3 {
        color: #e0e7ff;
        font-size: 1.1rem;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid rgba(129,140,248,0.1);
    }
    .info-row {
        display: flex;
        justify-content: space-between;
        padding: 0.6rem 0;
        border-bottom: 1px solid rgba(129,140,248,0.06);
    }
    .info-label { color: #94a3b8; }
    .info-value { color: #e0e7ff; font-family: monospace; font-size: 0.9rem; }
    .status-ok {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        background: rgba(34,197,94,0.12);
        border: 1px solid rgba(34,197,94,0.25);
        border-radius: 1rem;
        padding: 0.3rem 0.8rem;
        color: #4ade80;
        font-size: 0.85rem;
    }
    .status-err {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        background: rgba(239,68,68,0.12);
        border: 1px solid rgba(239,68,68,0.25);
        border-radius: 1rem;
        padding: 0.3rem 0.8rem;
        color: #f87171;
        font-size: 0.85rem;
    }
</style>
""", unsafe_allow_html=True)

# ── Hero ──
st.markdown("""
<div class="page-hero">
    <h1>⚙️ 设置</h1>
    <p>配置 API Key、查看系统状态和数据信息</p>
</div>
""", unsafe_allow_html=True)

c1, c2 = st.columns(2)

# ── Left column ──
with c1:
    # API Key
    st.markdown("""
    <div class="settings-section">
        <h3>🔑 DeepSeek API Key</h3>
    """, unsafe_allow_html=True)

    env_path = Path(__file__).parent.parent.parent / ".env"
    current_key = os.getenv("DEEPSEEK_API_KEY", "")
    if current_key and len(current_key) > 12:
        masked = current_key[:8] + "..." + current_key[-4:]
    else:
        masked = "未配置"

    st.markdown(f'<div style="color:#94a3b8;margin-bottom:1rem">当前: <code style="color:#a5b4fc">{masked}</code></div>', unsafe_allow_html=True)

    new_key = st.text_input("新的 API Key", type="password", placeholder="sk-...", label_visibility="collapsed")
    if st.button("💾 保存 API Key", type="primary", use_container_width=True):
        if new_key.strip():
            env_content = ""
            if env_path.exists():
                env_content = env_path.read_text(encoding="utf-8")
            lines = env_content.split("\n")
            found = False
            for i, line in enumerate(lines):
                if line.startswith("DEEPSEEK_API_KEY="):
                    lines[i] = f"DEEPSEEK_API_KEY={new_key.strip()}"
                    found = True
                    break
            if not found:
                lines.append(f"DEEPSEEK_API_KEY={new_key.strip()}")
            env_path.write_text("\n".join(lines), encoding="utf-8")
            st.success("✅ 已保存。请重启服务使配置生效。")
        else:
            st.warning("请输入有效的 API Key")

    st.markdown("</div>", unsafe_allow_html=True)

    # System info
    st.markdown('<div class="settings-section"><h3>ℹ️ 系统信息</h3>', unsafe_allow_html=True)

    data_dir = Path(__file__).parent.parent.parent / "data"
    db_path = data_dir / "knowledge.db"
    chroma_dir = data_dir / "chroma"

    db_size = f"{db_path.stat().st_size / 1024:.1f} KB" if db_path.exists() else "未创建"
    if chroma_dir.exists():
        chroma_size = sum(f.stat().st_size for f in chroma_dir.rglob("*") if f.is_file())
        chroma_str = f"{chroma_size / 1024:.1f} KB" if chroma_size < 1024 * 1024 else f"{chroma_size / 1024 / 1024:.1f} MB"
    else:
        chroma_str = "未创建"

    st.markdown(f"""
        <div class="info-row"><span class="info-label">数据目录</span><span class="info-value">{data_dir}</span></div>
        <div class="info-row"><span class="info-label">SQLite 数据库</span><span class="info-value">{db_size}</span></div>
        <div class="info-row"><span class="info-label">向量库 (ChromaDB)</span><span class="info-value">{chroma_str}</span></div>
        <div class="info-row"><span class="info-label">嵌入模型</span><span class="info-value">bge-small-zh-v1.5</span></div>
    </div>
    """, unsafe_allow_html=True)

# ── Right column ──
with c2:
    # Service status
    st.markdown('<div class="settings-section"><h3>🏥 服务状态</h3>', unsafe_allow_html=True)

    try:
        health = requests.get(f"{API_BASE}/health", timeout=3).json()
        st.markdown(f'<span class="status-ok">● API 服务运行中 (v{health.get("version", "?")})</span>', unsafe_allow_html=True)
    except Exception:
        st.markdown('<span class="status-err">● API 服务未连接</span>', unsafe_allow_html=True)

    st.markdown("</div>", unsafe_allow_html=True)

    # Config preview
    st.markdown('<div class="settings-section"><h3>📝 当前配置</h3>', unsafe_allow_html=True)

    if env_path.exists():
        env_content = env_path.read_text(encoding="utf-8")
        masked_lines = []
        for line in env_content.split("\n"):
            if line.startswith("DEEPSEEK_API_KEY=") and "=" in line:
                kv = line.split("=", 1)[1]
                if len(kv) > 12:
                    masked_lines.append(f"DEEPSEEK_API_KEY={kv[:8]}...{kv[-4:]}")
                else:
                    masked_lines.append("DEEPSEEK_API_KEY=***")
            elif line.strip():
                masked_lines.append(line)
        st.code("\n".join(masked_lines), language="bash")
    else:
        st.warning("未找到 .env 文件")

    st.markdown("</div>", unsafe_allow_html=True)

    # Danger zone
    st.markdown("""
    <div class="settings-section" style="border-color:rgba(239,68,68,0.2)">
        <h3 style="color:#f87171">⚠️ 危险操作</h3>
    </div>
    """, unsafe_allow_html=True)

    if st.button("🗑️ 清除所有数据", type="secondary", use_container_width=True):
        st.warning("此操作不可撤销！将删除所有会话、卡片、标签和向量数据。")
        if st.button("确认删除", type="primary"):
            try:
                resp = requests.delete(f"{API_BASE}/api/v1/sessions/all", timeout=5)
                st.success("数据已清除")
            except Exception as e:
                st.error(f"清除失败: {e}")
