"""API endpoints for card CRUD and semantic search."""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session as DbSession

from models.database import get_db
from models.db_models import Card, Tag, CardTag, Session as SessionModel
from models.schemas import CardResponse, CardListItem, SearchRequest, SearchResultItem
from services import embedding, vector_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/cards", tags=["cards"])


def _card_to_response(card: Card, db: DbSession) -> CardResponse:
    """Convert a Card ORM object to CardResponse."""
    tags = [ct.tag_name for ct in db.query(CardTag).filter(CardTag.card_id == card.id).all()]
    key_points = json.loads(card.key_points) if card.key_points else []
    code_snippets = json.loads(card.code_snippets) if card.code_snippets else []

    return CardResponse(
        id=card.id,
        session_id=card.session_id,
        title=card.title,
        summary=card.summary,
        key_points=key_points,
        code_snippets=code_snippets,
        difficulty=card.difficulty,
        category_path=card.category_path,
        tags=tags,
        parent_version_id=card.parent_version_id,
        created_at=card.created_at,
        updated_at=card.updated_at,
    )


def _card_to_list_item(card: Card, db: DbSession) -> CardListItem:
    """Convert a Card ORM object to CardListItem (lighter)."""
    tags = [ct.tag_name for ct in db.query(CardTag).filter(CardTag.card_id == card.id).all()]
    return CardListItem(
        id=card.id,
        session_id=card.session_id,
        title=card.title,
        summary=card.summary,
        difficulty=card.difficulty,
        category_path=card.category_path,
        tags=tags,
        created_at=card.created_at,
    )


@router.get("/", response_model=list[CardListItem])
def list_cards(
    tag: str | None = Query(None, description="Filter by tag name"),
    difficulty: str | None = Query(None, description="Filter by difficulty"),
    category: str | None = Query(None, description="Filter by category path prefix"),
    session_id: str | None = Query(None, description="Filter by session ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: DbSession = Depends(get_db),
):
    """List cards with optional filters."""
    query = db.query(Card)

    if session_id:
        query = query.filter(Card.session_id == session_id)
    if difficulty:
        query = query.filter(Card.difficulty == difficulty)
    if category:
        query = query.filter(Card.category_path.like(f"{category}%"))
    if tag:
        card_ids = [ct.card_id for ct in db.query(CardTag).filter(CardTag.tag_name == tag).all()]
        query = query.filter(Card.id.in_(card_ids))

    cards = query.order_by(Card.created_at.desc()).offset(offset).limit(limit).all()
    return [_card_to_list_item(c, db) for c in cards]


@router.get("/{card_id}", response_model=CardResponse)
def get_card(card_id: str, db: DbSession = Depends(get_db)):
    """Get full card details."""
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return _card_to_response(card, db)


@router.delete("/{card_id}")
def delete_card(card_id: str, db: DbSession = Depends(get_db)):
    """Delete a card."""
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    if card.embedding_id:
        try:
            vector_store.delete_vector(card.id)
        except Exception:
            pass

    db.delete(card)
    db.commit()
    return {"ok": True}


@router.post("/search", response_model=list[SearchResultItem])
def search_cards(request: SearchRequest, db: DbSession = Depends(get_db)):
    """Semantic search across knowledge cards."""
    if not request.query.strip():
        return []

    # Vectorize the query
    query_vector = embedding.embed_text(request.query)

    # Search similar vectors
    results = vector_store.search_similar(query_vector, n_results=request.limit)

    items = []
    for result in results:
        card = db.query(Card).filter(Card.id == result["card_id"]).first()
        if not card:
            continue
        items.append(SearchResultItem(
            card=_card_to_list_item(card, db),
            score=result["score"],
            matched_snippet=card.summary,
        ))

    return items


@router.get("/tags/all", response_model=list[dict])
def list_tags(db: DbSession = Depends(get_db)):
    """List all tags with usage counts."""
    tags = db.query(Tag).order_by(Tag.usage_count.desc()).all()
    return [{"name": t.name, "status": t.status, "usage_count": t.usage_count} for t in tags]
