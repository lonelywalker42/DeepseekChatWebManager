"""SQLAlchemy ORM models for the knowledge base."""

from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship

from models.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    source_type = Column(String, default="deepseek")
    source_url = Column(String, index=True)  # DeepSeek conversation URL (dedup key)
    original_filename = Column(String)
    created_date = Column(String)
    overall_summary = Column(Text)
    knowledge_domain = Column(String)  # JSON array as string
    message_count = Column(Integer, default=0)
    uploaded_at = Column(DateTime, default=_utcnow)
    processed_at = Column(DateTime)

    cards = relationship("Card", back_populates="session", cascade="all, delete-orphan")


class Card(Base):
    __tablename__ = "cards"

    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey("sessions.id", ondelete="CASCADE"))
    title = Column(String, nullable=False)
    summary = Column(Text)
    key_points = Column(Text)  # JSON array
    code_snippets = Column(Text)  # JSON array
    difficulty = Column(String)
    category_path = Column(String)
    embedding_id = Column(String)  # ChromaDB vector ID
    parent_version_id = Column(String, ForeignKey("cards.id"))
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    session = relationship("Session", back_populates="cards")
    tags = relationship("Tag", secondary="card_tags", back_populates="cards")
    version_parent = relationship("Card", remote_side=[id], backref="versions")


class Tag(Base):
    __tablename__ = "tags"

    name = Column(String, primary_key=True)
    status = Column(String, default="suggested")  # suggested / confirmed
    usage_count = Column(Integer, default=1)
    created_at = Column(DateTime, default=_utcnow)

    cards = relationship("Card", secondary="card_tags", back_populates="tags")


class CardTag(Base):
    __tablename__ = "card_tags"

    card_id = Column(String, ForeignKey("cards.id", ondelete="CASCADE"), primary_key=True)
    tag_name = Column(String, ForeignKey("tags.name", ondelete="CASCADE"), primary_key=True)
