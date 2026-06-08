"""API endpoints for knowledge graph — nodes, edges, neighbors."""

import json
import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session as DbSession

from models.database import get_db
from models.db_models import Session as SessionModel, Card, Tag, CardTag

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/graph", tags=["graph"])


def _card_tags(db: DbSession, card_id: str) -> list[str]:
    return [ct.tag_name for ct in db.query(CardTag).filter(CardTag.card_id == card_id).all()]


@router.get("/nodes")
def get_nodes(db: DbSession = Depends(get_db)):
    """Get all graph nodes (sessions, cards, tags)."""
    nodes = []

    # Session nodes
    for s in db.query(SessionModel).all():
        nodes.append({
            "id": f"session:{s.id}",
            "type": "session",
            "label": s.title,
            "data": {"id": s.id, "title": s.title, "message_count": s.message_count},
        })

    # Card nodes
    for c in db.query(Card).all():
        tags = _card_tags(db, c.id)
        nodes.append({
            "id": f"card:{c.id}",
            "type": "card",
            "label": c.title,
            "data": {
                "id": c.id,
                "title": c.title,
                "summary": c.summary,
                "difficulty": c.difficulty,
                "tags": tags,
                "session_id": c.session_id,
            },
        })

    # Tag nodes
    for t in db.query(Tag).all():
        nodes.append({
            "id": f"tag:{t.name}",
            "type": "tag",
            "label": t.name,
            "data": {"name": t.name, "status": t.status, "usage_count": t.usage_count},
        })

    return nodes


@router.get("/edges")
def get_edges(db: DbSession = Depends(get_db)):
    """Get all graph edges."""
    edges = []

    # Session → Card (CONTAINS)
    for c in db.query(Card).all():
        edges.append({
            "source": f"session:{c.session_id}",
            "target": f"card:{c.id}",
            "type": "CONTAINS",
        })

    # Card → Tag (TAGGED)
    for ct in db.query(CardTag).all():
        edges.append({
            "source": f"card:{ct.card_id}",
            "target": f"tag:{ct.tag_name}",
            "type": "TAGGED",
        })

    # Card → Card (VERSION_OF)
    for c in db.query(Card).filter(Card.parent_version_id.isnot(None)).all():
        edges.append({
            "source": f"card:{c.id}",
            "target": f"card:{c.parent_version_id}",
            "type": "VERSION_OF",
        })

    return edges


@router.get("/neighbors/{card_id}")
def get_neighbors(card_id: str, depth: int = Query(1, ge=1, le=3), db: DbSession = Depends(get_db)):
    """Get neighboring nodes of a card up to N hops."""
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        return {"nodes": [], "edges": []}

    visited_cards = set()
    visited_tags = set()
    all_nodes = []
    all_edges = []

    def _add_card(cid: str, current_depth: int):
        if cid in visited_cards or current_depth > depth:
            return
        visited_cards.add(cid)
        c = db.query(Card).filter(Card.id == cid).first()
        if not c:
            return
        tags = _card_tags(db, c.id)
        all_nodes.append({
            "id": f"card:{c.id}",
            "type": "card",
            "label": c.title,
            "data": {"id": c.id, "title": c.title, "summary": c.summary, "difficulty": c.difficulty, "tags": tags},
        })

        # Version links
        if c.parent_version_id:
            all_edges.append({"source": f"card:{c.id}", "target": f"card:{c.parent_version_id}", "type": "VERSION_OF"})
            _add_card(c.parent_version_id, current_depth + 1)

        # Reverse version links
        for child in db.query(Card).filter(Card.parent_version_id == c.id).all():
            all_edges.append({"source": f"card:{child.id}", "target": f"card:{c.id}", "type": "VERSION_OF"})
            _add_card(child.id, current_depth + 1)

        # Tag links
        for tag_name in tags:
            if tag_name not in visited_tags:
                visited_tags.add(tag_name)
                t = db.query(Tag).filter(Tag.name == tag_name).first()
                if t:
                    all_nodes.append({
                        "id": f"tag:{t.name}",
                        "type": "tag",
                        "label": t.name,
                        "data": {"name": t.name, "usage_count": t.usage_count},
                    })
            all_edges.append({"source": f"card:{c.id}", "target": f"tag:{tag_name}", "type": "TAGGED"})

    _add_card(card_id, 1)

    # Add session node
    session = db.query(SessionModel).filter(SessionModel.id == card.session_id).first()
    if session:
        all_nodes.append({
            "id": f"session:{session.id}",
            "type": "session",
            "label": session.title,
            "data": {"id": session.id, "title": session.title},
        })
        all_edges.append({"source": f"session:{session.id}", "target": f"card:{card_id}", "type": "CONTAINS"})

    return {"nodes": all_nodes, "edges": all_edges}
