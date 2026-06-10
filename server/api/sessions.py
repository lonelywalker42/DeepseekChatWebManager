"""API endpoints for session upload and management — with incremental updates."""

import hashlib
import json
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session as DbSession

from models.database import get_db
from models.db_models import Session as SessionModel, Card, CardTag
from models.schemas import SessionUpload, SessionResponse, MessageInput
from services.pipeline import process_session, get_task_status

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/sessions", tags=["sessions"])


# ── Helpers ──────────────────────────────────────────────────

def _msg_hash(msg: dict | MessageInput) -> str:
    """Compute a hash for a single message (role + content)."""
    if isinstance(msg, MessageInput):
        role, content = msg.role, msg.content
    else:
        role, content = msg.get("role", ""), msg.get("content", "")
    return hashlib.md5(f"{role}:{content}".encode()).hexdigest()


def _messages_fingerprint(messages: list[MessageInput]) -> set[str]:
    """Compute a set of content hashes for all messages."""
    return {_msg_hash(m) for m in messages}


def _find_existing_by_url(db: DbSession, source_url: str) -> SessionModel | None:
    """Find an existing session by its source URL."""
    if not source_url:
        return None
    return db.query(SessionModel).filter(SessionModel.source_url == source_url).first()


def _delete_session_cards(db: DbSession, session_id: str) -> int:
    """Delete all cards (and their vectors) for a session. Returns count."""
    cards = db.query(Card).filter(Card.session_id == session_id).all()
    count = len(cards)
    for card in cards:
        if card.embedding_id:
            try:
                from services.vector_store import delete_vector
                delete_vector(card.id)
            except Exception:
                pass
        # CardTag entries are cascade-deleted
    # Bulk delete
    db.query(Card).filter(Card.session_id == session_id).delete()
    db.commit()
    return count


def _run_pipeline(session_id: str, messages: list[MessageInput], task_id: str):
    """Background task wrapper — creates its own DB session to avoid lifecycle issues."""
    from models.database import SessionLocal
    db = SessionLocal()
    try:
        process_session(db, session_id, messages, task_id)
    except Exception as e:
        logger.error("Pipeline failed for session %s: %s", session_id, e)
        from services.pipeline import _tasks
        if task_id in _tasks:
            _tasks[task_id].update(status="failed", error=str(e))
    finally:
        db.close()


def _walk_mapping(mapping: dict, node_id: str) -> list[MessageInput]:
    """Walk the DeepSeek mapping tree (DFS) and extract messages."""
    node = mapping.get(node_id)
    if not node:
        return []

    messages = []

    # Extract fragments from this node's message
    msg = node.get("message")
    if msg and msg.get("fragments"):
        for frag in msg["fragments"]:
            content = frag.get("content", "")
            if not content:
                continue
            frag_type = frag.get("type", "")
            if frag_type == "REQUEST":
                messages.append(MessageInput(role="user", content=content))
            elif frag_type == "RESPONSE":
                messages.append(MessageInput(role="assistant", content=content))
            # THINK fragments are skipped (reasoning trace)

    # Recurse into children
    for child_id in node.get("children", []):
        messages.extend(_walk_mapping(mapping, child_id))

    return messages


def _parse_deepseek_json(data: dict | list) -> tuple[list[MessageInput], str | None]:
    """Parse DeepSeek export JSON into MessageInput list. Returns (messages, source_url)."""
    messages = []
    source_url = None

    # Case 1: Array of conversations with mapping (typical DeepSeek export)
    if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict) and "mapping" in data[0]:
        # Take the first conversation (or caller handles multiple)
        conv = data[0]
        conv_id = conv.get("id", "")
        source_url = f"https://chat.deepseek.com/c/{conv_id}" if conv_id else None
        messages = _walk_mapping(conv["mapping"], "root")
        return messages, source_url

    # Case 2: Single conversation with mapping
    if isinstance(data, dict) and "mapping" in data:
        conv_id = data.get("id", "")
        source_url = f"https://chat.deepseek.com/c/{conv_id}" if conv_id else None
        messages = _walk_mapping(data["mapping"], "root")
        return messages, source_url

    # Case 3: Simple messages array
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and "role" in item:
                messages.append(MessageInput(
                    role=item.get("role", "user"),
                    content=item.get("content", ""),
                    timestamp=item.get("timestamp"),
                ))
        return messages, source_url

    # Case 4: Object with messages/conversation array
    if isinstance(data, dict):
        source_url = data.get("source_url") or data.get("url") or data.get("conversation_id")
        msg_list = data.get("messages", data.get("conversation", []))
        if isinstance(msg_list, list):
            for item in msg_list:
                if isinstance(item, dict) and "role" in item:
                    messages.append(MessageInput(
                        role=item.get("role", "user"),
                        content=item.get("content", ""),
                        timestamp=item.get("timestamp"),
                    ))

    return messages, source_url


# ── API Endpoints ────────────────────────────────────────────

@router.post("/upload", response_model=dict)
async def upload_session(
    upload: SessionUpload,
    background_tasks: BackgroundTasks,
    db: DbSession = Depends(get_db),
):
    """
    Upload a session with dedup + incremental update.

    - If source_url matches an existing session: compare messages, process only if new content exists.
    - Otherwise: create a new session.
    """
    # ── Dedup check by source_url ──
    existing = _find_existing_by_url(db, upload.source_url)

    if existing:
        # Compare messages to find new content
        old_hashes = _messages_fingerprint([
            MessageInput(role=m.role, content=m.content)
            for m in []  # We don't store raw messages in DB, so we compare counts
        ])

        # We stored message_count, so compare counts first
        old_count = existing.message_count
        new_count = len(upload.messages)

        if new_count <= old_count:
            # No new messages
            return {
                "session_id": existing.id,
                "task_id": None,
                "action": "skipped",
                "detail": f"无新消息（已有 {old_count} 条，上传 {new_count} 条），跳过处理",
            }

        # Has new messages — delete old cards and reprocess
        deleted_count = _delete_session_cards(db, existing.id)
        logger.info(
            "Incremental update for session %s: %d → %d messages, deleted %d old cards",
            existing.id, old_count, new_count, deleted_count,
        )

        # Update session record
        existing.message_count = new_count
        existing.title = upload.title or existing.title
        existing.messages_json = json.dumps([m.model_dump() for m in upload.messages], ensure_ascii=False)
        existing.processed_at = None  # Reset
        db.commit()

        # Register task and run pipeline
        task_id = str(uuid.uuid4())
        from services.pipeline import create_task
        create_task(db, task_id, existing.id)
        background_tasks.add_task(_run_pipeline, existing.id, upload.messages, task_id)

        return {
            "session_id": existing.id,
            "task_id": task_id,
            "action": "updated",
            "detail": f"检测到新增 {new_count - old_count} 条消息（共 {new_count} 条），正在重新处理",
        }

    # ── No duplicate — create new session ──
    session_id = str(uuid.uuid4())
    task_id = str(uuid.uuid4())

    session = SessionModel(
        id=session_id,
        title=upload.title,
        source_type=upload.source_type,
        source_url=upload.source_url,
        original_filename=upload.original_filename,
        message_count=len(upload.messages),
        messages_json=json.dumps([m.model_dump() for m in upload.messages], ensure_ascii=False),
        uploaded_at=datetime.now(timezone.utc),
    )
    db.add(session)
    db.commit()

    from services.pipeline import create_task
    create_task(db, task_id, session_id)
    background_tasks.add_task(_run_pipeline, session_id, upload.messages, task_id)

    return {
        "session_id": session_id,
        "task_id": task_id,
        "action": "created",
        "detail": f"新建会话，{len(upload.messages)} 条消息",
    }


@router.post("/upload-file", response_model=dict)
async def upload_session_file(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    db: DbSession = Depends(get_db),
):
    """Upload a DeepSeek JSON file with dedup + incremental update.

    Supports:
    - Array of conversations with mapping tree (typical DeepSeek export)
    - Single conversation object with mapping
    - Simple messages array/object
    """
    content = await file.read()
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")

    # Case: Array of conversations with mapping (DeepSeek export)
    if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict) and "mapping" in data[0]:
        results = []
        for conv in data:
            messages = _walk_mapping(conv.get("mapping", {}), "root")
            if not messages:
                continue
            conv_id = conv.get("id", "")
            source_url = f"https://chat.deepseek.com/c/{conv_id}" if conv_id else None
            title = conv.get("title", file.filename or "Untitled")
            upload = SessionUpload(
                title=title,
                source_type="deepseek",
                source_url=source_url,
                original_filename=file.filename,
                messages=messages,
            )
            result = await upload_session(upload, background_tasks, db)
            results.append(result)
        return {"conversations": results, "total": len(results)}

    # Single conversation or simple format
    messages, source_url = _parse_deepseek_json(data)
    title = data.get("title", file.filename or "Untitled") if isinstance(data, dict) else file.filename

    upload = SessionUpload(
        title=title,
        source_type="deepseek",
        source_url=source_url,
        original_filename=file.filename,
        messages=messages,
    )
    return await upload_session(upload, background_tasks, db)


@router.get("/", response_model=list[SessionResponse])
def list_sessions(db: DbSession = Depends(get_db)):
    """List all sessions."""
    sessions = db.query(SessionModel).order_by(SessionModel.uploaded_at.desc()).all()
    result = []
    for s in sessions:
        card_count = db.query(Card).filter(Card.session_id == s.id).count()
        domains = json.loads(s.knowledge_domain) if s.knowledge_domain else []
        result.append(SessionResponse(
            id=s.id,
            title=s.title,
            source_type=s.source_type,
            source_url=s.source_url,
            overall_summary=s.overall_summary,
            knowledge_domain=domains,
            message_count=s.message_count,
            card_count=card_count,
            uploaded_at=s.uploaded_at,
            processed_at=s.processed_at,
        ))
    return result


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(session_id: str, db: DbSession = Depends(get_db)):
    """Get session details."""
    s = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    card_count = db.query(Card).filter(Card.session_id == s.id).count()
    domains = json.loads(s.knowledge_domain) if s.knowledge_domain else []
    return SessionResponse(
        id=s.id,
        title=s.title,
        source_type=s.source_type,
        source_url=s.source_url,
        overall_summary=s.overall_summary,
        knowledge_domain=domains,
        message_count=s.message_count,
        card_count=card_count,
        uploaded_at=s.uploaded_at,
        processed_at=s.processed_at,
    )


@router.get("/{session_id}/messages")
def get_session_messages(session_id: str, db: DbSession = Depends(get_db)):
    """Get raw messages for a session (for conversation replay)."""
    s = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = json.loads(s.messages_json) if s.messages_json else []
    return {"session_id": session_id, "title": s.title, "messages": messages}


@router.delete("/{session_id}")
def delete_session(session_id: str, db: DbSession = Depends(get_db)):
    """Delete a session and all its cards."""
    s = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")

    _delete_session_cards(db, session_id)
    db.delete(s)
    db.commit()
    return {"ok": True}


@router.post("/{session_id}/retry")
async def retry_session(
    session_id: str,
    background_tasks: BackgroundTasks,
    db: DbSession = Depends(get_db),
):
    """Re-process a session (delete old cards and re-run pipeline)."""
    s = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")

    if not s.messages_json:
        raise HTTPException(status_code=400, detail="No stored messages to reprocess")

    messages = [MessageInput(**m) for m in json.loads(s.messages_json)]

    # Delete old cards
    _delete_session_cards(db, session_id)

    # Reset session state
    s.processed_at = None
    s.overall_summary = None
    db.commit()

    # Register task and run pipeline
    task_id = str(uuid.uuid4())
    from services.pipeline import create_task
    create_task(db, task_id, session_id)
    background_tasks.add_task(_run_pipeline, session_id, messages, task_id)

    return {
        "session_id": session_id,
        "task_id": task_id,
        "detail": f"重新处理，{len(messages)} 条消息",
    }
