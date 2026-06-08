"""API endpoint for importing external documents (Markdown, PDF, text)."""

import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session as DbSession

from models.database import get_db
from models.db_models import Session as SessionModel
from models.schemas import SessionUpload
from services.import_service import detect_and_parse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/import", tags=["import"])


@router.post("/upload")
async def import_document(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    db: DbSession = Depends(get_db),
):
    """Upload a Markdown, PDF, or text file for AI processing."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        title, messages = detect_and_parse(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ImportError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Failed to parse %s: %s", file.filename, e)
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {e}")

    if not messages:
        raise HTTPException(status_code=400, detail="No content extracted from file")

    # Create session record
    session_id = str(uuid.uuid4())
    task_id = str(uuid.uuid4())

    session = SessionModel(
        id=session_id,
        title=title,
        source_type="import",
        original_filename=file.filename,
        message_count=len(messages),
        uploaded_at=datetime.now(timezone.utc),
    )
    db.add(session)
    db.commit()

    # Register task and run pipeline
    from services.pipeline import _tasks, process_session

    _tasks[task_id] = {
        "task_id": task_id,
        "status": "pending",
        "progress": "等待处理（文档导入）...",
        "session_id": session_id,
        "card_count": 0,
    }

    def _run():
        from models.database import SessionLocal
        sdb = SessionLocal()
        try:
            process_session(sdb, session_id, messages, task_id)
        except Exception as e:
            logger.error("Import pipeline failed: %s", e)
            if task_id in _tasks:
                _tasks[task_id].update(status="failed", error=str(e))
        finally:
            sdb.close()

    background_tasks.add_task(_run)

    return {
        "session_id": session_id,
        "task_id": task_id,
        "action": "created",
        "detail": f"已解析 {file.filename}，提取 {len(messages)} 条消息",
        "title": title,
    }
