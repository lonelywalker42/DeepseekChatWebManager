"""LLM API calls for summarization, topic splitting, and card generation.

Uses OpenAI-compatible API — works with DeepSeek, OpenAI, Ollama, vLLM, etc.
Configure via LLM_API_KEY, LLM_BASE_URL, LLM_MODEL environment variables.
"""

import json
import logging
import re
from openai import OpenAI

from config import settings

logger = logging.getLogger(__name__)

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_BASE_URL,
        )
    return _client


def _extract_json(text: str) -> dict | list:
    """Extract JSON from LLM response text, handling markdown code blocks."""
    # Try direct parse first
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting from ```json ... ``` blocks
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Try finding first { or [
    for start_char, end_char in [('{', '}'), ('[', ']')]:
        start = text.find(start_char)
        if start == -1:
            continue
        # Find matching end
        depth = 0
        for i in range(start, len(text)):
            if text[i] == start_char:
                depth += 1
            elif text[i] == end_char:
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start:i + 1])
                    except json.JSONDecodeError:
                        break
    raise ValueError(f"Could not extract JSON from response: {text[:200]}...")


def _call_llm(system_prompt: str, user_prompt: str, temperature: float = 0.2) -> str:
    """Call LLM API and return the assistant's response text."""
    client = _get_client()

    # Try with json_object format first
    try:
        response = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        return response.choices[0].message.content
    except Exception as e:
        # Some models don't support response_format, retry without it
        logger.info("response_format not supported, retrying without it: %s", type(e).__name__)
        response = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
        )
        return response.choices[0].message.content


def summarize_session(conversation_text: str) -> dict:
    """Generate a session-level summary from the full conversation."""
    system = (
        "你是一个专业的个人知识管理助手。"
        "请分析以下对话，返回 JSON 格式的会话摘要。"
    )
    user = f"""请分析这段对话并返回 JSON：

{{
  "session_title": "优化后的对话标题（简洁准确）",
  "overall_summary": "此对话整体讨论了什么，得到了哪些结论（2-3句话）",
  "knowledge_domain": ["领域1", "领域2"]
}}

对话内容：
{conversation_text}"""

    result = _call_llm(system, user)
    return _extract_json(result)


def split_topics(conversation_text: str, messages: list[dict]) -> list[dict]:
    """Split conversation into semantic topic segments using LLM."""
    system = (
        "你是一个专业的对话分析助手。"
        "请将对话按语义话题切分，返回 JSON 格式的话题列表。"
    )

    indexed_text = ""
    for i, msg in enumerate(messages):
        role = msg.get("role", "unknown").upper()
        indexed_text += f"[{i}][{role}]: {msg.get('content', '')}\n\n"

    user = f"""请将以下对话按话题切分，返回 JSON 数组：

[
  {{
    "topic_title": "话题标题",
    "start_msg_index": 0,
    "end_msg_index": 5,
    "brief": "此话题讨论了什么（一句话）"
  }}
]

注意：
- 每个话题应该是一个语义完整的讨论单元
- 话题之间不应重叠
- end_msg_index 是包含的（闭区间）
- 确保覆盖所有消息

对话内容（带索引）：
{indexed_text}"""

    result = _call_llm(system, user)
    parsed = _extract_json(result)
    if isinstance(parsed, dict):
        return parsed.get("topics", parsed.get("segments", []))
    return parsed


def generate_card(topic_text: str, topic_title: str) -> dict:
    """Generate a knowledge card from a topic segment."""
    system = (
        "你是一个专业的知识提炼助手。"
        "请从对话片段中提取结构化知识，返回 JSON 格式的知识卡片。"
    )
    user = f"""请从以下对话片段中提取知识，返回 JSON：

{{
  "title": "知识卡片标题",
  "summary": "一句话概括核心知识点",
  "key_points": ["要点1", "要点2", "要点3"],
  "code_snippets": ["代码片段1（如有）"],
  "difficulty": "初级/中级/高级",
  "suggested_tags": ["标签1", "标签2", "标签3"],
  "suggested_category": "领域 > 子领域 > 细分"
}}

注意：
- key_points 提取 3-5 个核心要点
- code_snippets 保留原始格式，标注语言
- suggested_tags 提取 3-5 个关键词标签
- difficulty 根据内容复杂度判断

话题：{topic_title}

对话内容：
{topic_text}"""

    result = _call_llm(system, user)
    return _extract_json(result)
