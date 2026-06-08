"""API endpoints for tag management and review."""

import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession
from sqlalchemy import func

from models.database import get_db
from models.db_models import Tag, Card, CardTag

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/tags", tags=["tags"])


@router.get("/")
def list_tags(
    status: str | None = None,
    db: DbSession = Depends(get_db),
):
    """List all tags with optional status filter."""
    query = db.query(Tag)
    if status:
        query = query.filter(Tag.status == status)
    tags = query.order_by(Tag.usage_count.desc()).all()
    result = []
    for t in tags:
        card_count = db.query(CardTag).filter(CardTag.tag_name == t.name).count()
        result.append({
            "name": t.name,
            "status": t.status,
            "usage_count": t.usage_count,
            "card_count": card_count,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })
    return result


@router.get("/pending")
def list_pending_tags(db: DbSession = Depends(get_db)):
    """List tags pending review (suggested status)."""
    tags = db.query(Tag).filter(Tag.status == "suggested").order_by(Tag.usage_count.desc()).all()
    result = []
    for t in tags:
        # Get associated cards
        card_ids = [ct.card_id for ct in db.query(CardTag).filter(CardTag.tag_name == t.name).all()]
        cards = []
        if card_ids:
            card_objs = db.query(Card).filter(Card.id.in_(card_ids)).limit(5).all()
            cards = [{"id": c.id, "title": c.title} for c in card_objs]
        result.append({
            "name": t.name,
            "status": t.status,
            "usage_count": t.usage_count,
            "cards": cards,
        })
    return result


@router.put("/{tag_name}/confirm")
def confirm_tag(tag_name: str, db: DbSession = Depends(get_db)):
    """Confirm a suggested tag."""
    tag = db.query(Tag).filter(Tag.name == tag_name).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    tag.status = "confirmed"
    db.commit()
    return {"ok": True, "name": tag.name, "status": tag.status}


@router.put("/merge")
def merge_tags(
    source_tags: list[str],
    target_name: str,
    db: DbSession = Depends(get_db),
):
    """Merge multiple tags into one target tag."""
    # Upsert target tag
    target = db.query(Tag).filter(Tag.name == target_name).first()
    if not target:
        target = Tag(name=target_name, status="confirmed", usage_count=0)
        db.add(target)

    total_usage = 0
    for source_name in source_tags:
        if source_name == target_name:
            continue
        source = db.query(Tag).filter(Tag.name == source_name).first()
        if not source:
            continue

        # Re-link all card_tags from source to target
        links = db.query(CardTag).filter(CardTag.tag_name == source_name).all()
        for link in links:
            # Check if target link already exists
            existing = db.query(CardTag).filter(
                CardTag.card_id == link.card_id,
                CardTag.tag_name == target_name,
            ).first()
            if not existing:
                link.tag_name = target_name
            else:
                db.delete(link)

        total_usage += source.usage_count
        db.delete(source)

    target.usage_count += total_usage
    target.status = "confirmed"
    db.commit()

    return {"ok": True, "target": target_name, "merged": len(source_tags)}


@router.delete("/{tag_name}")
def delete_tag(tag_name: str, db: DbSession = Depends(get_db)):
    """Delete a tag and all its card associations."""
    tag = db.query(Tag).filter(Tag.name == tag_name).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    # CardTag entries are cascade-deleted
    db.delete(tag)
    db.commit()
    return {"ok": True}
