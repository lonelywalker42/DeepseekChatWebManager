"""Message preprocessing: clean, merge, and format conversation messages."""

import re
from models.schemas import MessageInput


# Patterns for filtering meaningless messages
_EMOJI_ONLY = re.compile(
    r"^[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF"
    r"\U0001F1E0-\U0001F1FF\U00002702-\U000027B0\U0000FE00-\U0000FE0F"
    r"\U0000200D\U00002640\U00002642\s]+$"
)
_SHORT_THRESHOLD = 3  # messages shorter than this are dropped
_STOP_WORDS = {"继续", "好的", "嗯", "哦", "好", "是的", "对", "ok", "okay", "yes", "no"}


def clean_messages(messages: list[MessageInput]) -> list[MessageInput]:
    """Remove meaningless messages (emoji-only, ultra-short, stop words)."""
    cleaned = []
    for msg in messages:
        content = msg.content.strip()
        if not content:
            continue
        if len(content) < _SHORT_THRESHOLD:
            continue
        if _EMOJI_ONLY.match(content):
            continue
        if content.lower() in _STOP_WORDS:
            continue
        cleaned.append(MessageInput(
            role=msg.role,
            content=content,
            timestamp=msg.timestamp,
        ))
    return cleaned


def merge_consecutive(messages: list[MessageInput]) -> list[MessageInput]:
    """Merge consecutive messages from the same role into one."""
    if not messages:
        return []

    merged = [messages[0]]
    for msg in messages[1:]:
        if msg.role == merged[-1].role:
            merged[-1] = MessageInput(
                role=merged[-1].role,
                content=merged[-1].content + "\n\n" + msg.content,
                timestamp=merged[-1].timestamp or msg.timestamp,
            )
        else:
            merged.append(msg)
    return merged


def format_for_llm(messages: list[MessageInput]) -> str:
    """Format messages into a single text block for LLM consumption."""
    lines = []
    for msg in messages:
        role_label = {
            "user": "USER",
            "assistant": "ASSISTANT",
            "system": "SYSTEM",
            "thinking": "THINKING",
        }.get(msg.role, msg.role.upper())
        lines.append(f"[{role_label}]: {msg.content}")
    return "\n\n".join(lines)


def preprocess(messages: list[MessageInput]) -> tuple[list[MessageInput], str]:
    """Full preprocessing pipeline. Returns (cleaned_messages, formatted_text)."""
    cleaned = clean_messages(messages)
    merged = merge_consecutive(cleaned)
    text = format_for_llm(merged)
    return merged, text
