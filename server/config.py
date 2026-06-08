"""Configuration management for the knowledge base server."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from server/ directory
_env_path = Path(__file__).parent / ".env"
load_dotenv(_env_path)


class Settings:
    """Application settings loaded from environment variables."""

    # DeepSeek API
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_BASE_URL: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    # Paths
    DATA_DIR: Path = Path(os.getenv("DATA_DIR", Path(__file__).parent / "data"))

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
