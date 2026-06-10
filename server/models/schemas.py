"""Pydantic request/response models."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ── Request models ──────────────────────────────────────────

class MessageInput(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None


class SessionUpload(BaseModel):
    title: str
    source_type: str = "deepseek"
    source_url: Optional[str] = None
    original_filename: Optional[str] = None
    messages: list[MessageInput]


class SearchRequest(BaseModel):
    query: str
    limit: int = 20


# ── Response models ─────────────────────────────────────────

class TagResponse(BaseModel):
    name: str
    status: str
    usage_count: int

    model_config = {"from_attributes": True}


class CardResponse(BaseModel):
    id: str
    session_id: str
    title: str
    summary: Optional[str] = None
    key_points: list[str] = []
    code_snippets: list[str] = []
    difficulty: Optional[str] = None
    category_path: Optional[str] = None
    tags: list[str] = []
    parent_version_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class CardListItem(BaseModel):
    id: str
    session_id: str
    title: str
    summary: Optional[str] = None
    difficulty: Optional[str] = None
    category_path: Optional[str] = None
    tags: list[str] = []
    created_at: Optional[datetime] = None


class SessionResponse(BaseModel):
    id: str
    title: str
    source_type: str
    source_url: Optional[str] = None
    overall_summary: Optional[str] = None
    knowledge_domain: list[str] = []
    message_count: int = 0
    card_count: int = 0
    uploaded_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SearchResultItem(BaseModel):
    card: CardListItem
    score: float
    matched_snippet: Optional[str] = None


class TaskStatus(BaseModel):
    task_id: str
    status: str  # pending / processing / completed / failed
    progress: str = ""
    session_id: Optional[str] = None
    card_count: int = 0
    error: Optional[str] = None
