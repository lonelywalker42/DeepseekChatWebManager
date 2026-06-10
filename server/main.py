"""FastAPI application entry point for the knowledge base server."""

import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from models.database import init_db
from api.sessions import router as sessions_router
from api.cards import router as cards_router
from api.tasks import router as tasks_router
from api.tags import router as tags_router
from api.graph import router as graph_router
from api.import_doc import router as import_router
from api.settings import router as settings_router
from api.chat import router as chat_router


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    logger.info("Initializing knowledge base database...")
    init_db()
    logger.info("Database ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="DeepSeek Knowledge Base",
    description="Local knowledge base powered by DeepSeek Chat conversations",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow extension and Streamlit to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # MVP: allow all; tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(sessions_router)
app.include_router(cards_router)
app.include_router(tasks_router)
app.include_router(tags_router)
app.include_router(graph_router)
app.include_router(import_router)
app.include_router(settings_router)
app.include_router(chat_router)


# ── Static file serving (for bundled EXE mode) ──────────────
def _get_static_dir() -> Path | None:
    """Get the static files directory (Next.js export output)."""
    if getattr(sys, 'frozen', False):
        # PyInstaller EXE: static files are bundled in _MEIPASS
        base = Path(sys._MEIPASS)
    else:
        # Development: static files are in server/web/out
        base = Path(__file__).parent / "web" / "out"
    return base if base.exists() else None


_static_dir = _get_static_dir()
if _static_dir:
    # Serve Next.js static export — must be AFTER all API routes
    app.mount("/", StaticFiles(directory=str(_static_dir), html=True), name="static")
    logger.info("Serving static frontend from: %s", _static_dir)


@app.get("/health")
def health_check():
    """Health check endpoint for the Chrome extension to detect service status."""
    return {"status": "ok", "version": "0.1.0"}


@app.get("/")
def root():
    return {
        "name": "DeepSeek Knowledge Base",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
