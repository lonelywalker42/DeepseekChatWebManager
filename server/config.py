"""Configuration management for the knowledge base server."""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv


def _get_base_dir() -> Path:
    """Get the base directory for the application.

    - Frozen (PyInstaller EXE): returns the directory containing the executable
    - Development: returns the server/ directory (where config.py lives)
    """
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).parent
    return Path(__file__).parent


# Load .env from base directory
_base_dir = _get_base_dir()
_env_path = _base_dir / ".env"
if _env_path.exists():
    load_dotenv(_env_path)


class Settings:
    """Application settings loaded from environment variables."""

    # LLM API (generic, defaults to DeepSeek for backward compat)
    LLM_API_KEY: str = os.getenv("LLM_API_KEY") or os.getenv("DEEPSEEK_API_KEY", "")
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL") or os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    LLM_MODEL: str = os.getenv("LLM_MODEL") or os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    # Paths — in frozen mode, DATA_DIR is next to the exe
    DATA_DIR: Path = Path(os.getenv("DATA_DIR", str(_base_dir / "data")))

    # Embedding
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-zh-v1.5")

    # Similarity thresholds
    VERSION_THRESHOLD: float = float(os.getenv("VERSION_THRESHOLD", "0.95"))
    RELATED_THRESHOLD: float = float(os.getenv("RELATED_THRESHOLD", "0.88"))

    @property
    def db_path(self) -> Path:
        return self.DATA_DIR / "knowledge.db"

    @property
    def db_url(self) -> str:
        return f"sqlite:///{self.db_path}"

    @property
    def chroma_path(self) -> Path:
        return self.DATA_DIR / "chroma"

    def ensure_dirs(self) -> None:
        """Create data directories if they don't exist."""
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.chroma_path.mkdir(parents=True, exist_ok=True)


settings = Settings()
