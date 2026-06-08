"""API endpoints for application settings (LLM config, etc.)."""

import os
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/settings", tags=["settings"])

_env_path = Path(__file__).parent.parent / ".env"


class LLMConfig(BaseModel):
    api_key: str = ""
    base_url: str = ""
    model: str = ""


class LLMConfigResponse(BaseModel):
    api_key_masked: str
    base_url: str
    model: str


def _mask_key(key: str) -> str:
    if not key or len(key) < 12:
        return "***"
    return key[:6] + "..." + key[-4:]


def _read_env() -> dict:
    """Read .env file into a dict."""
    env = {}
    if _env_path.exists():
        for line in _env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def _write_env(updates: dict) -> None:
    """Update .env file with new values."""
    env = _read_env()

    # Map generic names to both generic and legacy keys
    key_mapping = {
        "LLM_API_KEY": ["LLM_API_KEY"],
        "LLM_BASE_URL": ["LLM_BASE_URL"],
        "LLM_MODEL": ["LLM_MODEL"],
    }

    for key, value in updates.items():
        if value:  # Only update non-empty values
            env[key] = value

    # Write back
    lines = []
    written = set()
    for key, value in env.items():
        lines.append(f"{key}={value}")
        written.add(key)

    # Ensure new keys are added even if they weren't in the file
    for key, value in updates.items():
        if key not in written and value:
            lines.append(f"{key}={value}")

    _env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


@router.get("/llm", response_model=LLMConfigResponse)
def get_llm_config():
    """Get current LLM configuration (API key is masked)."""
    return LLMConfigResponse(
        api_key_masked=_mask_key(settings.LLM_API_KEY),
        base_url=settings.LLM_BASE_URL,
        model=settings.LLM_MODEL,
    )


@router.put("/llm")
def update_llm_config(config: LLMConfig):
    """Update LLM configuration. Writes to .env file."""
    updates = {}
    if config.api_key:
        updates["LLM_API_KEY"] = config.api_key
    if config.base_url:
        updates["LLM_BASE_URL"] = config.base_url
    if config.model:
        updates["LLM_MODEL"] = config.model

    if not updates:
        raise HTTPException(status_code=400, detail="No values to update")

    _write_env(updates)

    # Reload config in memory
    if config.api_key:
        settings.LLM_API_KEY = config.api_key
    if config.base_url:
        settings.LLM_BASE_URL = config.base_url
    if config.model:
        settings.LLM_MODEL = config.model

    # Reset the OpenAI client so it picks up new config
    import services.llm_service as llm_svc
    llm_svc._client = None

    return {"ok": True, "message": "LLM config updated. Restart recommended for full effect."}
