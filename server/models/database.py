"""SQLAlchemy engine and session factory."""

import logging
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


engine = create_engine(
    settings.db_url,
    connect_args={"check_same_thread": False},  # SQLite needs this
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _run_migrations() -> None:
    """Run simple column-addition migrations for SQLite."""
    inspector = inspect(engine)
    columns = {col["name"] for col in inspector.get_columns("sessions")}
    with engine.begin() as conn:
        if "messages_json" not in columns:
            logger.info("Migration: adding messages_json column to sessions table")
            conn.execute(text("ALTER TABLE sessions ADD COLUMN messages_json TEXT"))


def init_db() -> None:
    """Create all tables and run migrations."""
    from models import db_models  # noqa: F401 — ensure models are registered
    settings.ensure_dirs()
    Base.metadata.create_all(bind=engine)
    _run_migrations()


def get_db():
    """FastAPI dependency for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
