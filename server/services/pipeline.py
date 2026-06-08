"""Orchestrates the full AI processing pipeline for a session."""

import json
import logging
import uuid
from datetime import datetime, timezone
from difflib import SequenceMatcher

from sqlalchemy.orm import Session as DbSession

from models.db_models import Session as SessionModel, Card, Tag, CardTag
from models.schemas import MessageInput
from services import preprocessing, llm_service, embedding, vector_store
from config import settings

logger = logging.getLogger(__name__)

# In-memory task tracking (MVP simplicity)
_tasks: dict[str, dict] = {}


def get_task_status(task_id: str) -> dict | None:
    return _tasks.get(task_id)


def _update_task(task_id: str, **kwargs) -> None:
    if task_id in _tasks:
        _tasks[task_id].update(kwargs)


def _find_similar_tags(tag_name: str, existing_tags: list[str], threshold: float = 0.7) -> str | None:
    """Find the best matching existing tag using sequence matching."""
    best_match = None
    best_score = 0
    for existing in existing_tags:
        score = SequenceMatcher(None, tag_name.lower(), existing.lower()).ratio()
        if score > best_score and score >= threshold:
            best_score = score
            best_match = existing
    return best_match


def process_session(
    db: DbSession,
    session_id: str,
    messages: list[MessageInput],
    task_id: str | None = None,
) -> dict:
    """
    Full processing pipeline:
    1. Preprocess messages
    2. Generate session summary
    3. Split into topics
    4. Generate knowledge cards for each topic
    5. Extract and normalize tags
    6. Vectorize and find similar cards (version linking)
    """
    if task_id:
        _update_task(task_id, status="processing", progress="预处理消息...")

    # ── Step 1: Preprocess ──
    cleaned_msgs, conversation_text = preprocessing.preprocess(messages)
    msg_dicts = [{"role": m.role, "content": m.content} for m in cleaned_msgs]

    logger.info("Preprocessed %d → %d messages for session %s", len(messages), len(cleaned_msgs), session_id)

    # ── Step 2: Session summary ──
    if task_id:
        _update_task(task_id, progress="生成会话摘要...")

    try:
        summary_data = llm_service.summarize_session(conversation_text)
    except Exception as e:
        import traceback
        print(f"[PIPELINE ERROR] Session summarization failed: {e}", flush=True)
        traceback.print_exc()
        logger.error("Session summarization failed: %s", e)
        summary_data = {
            "session_title": f"Session {session_id[:8]}",
            "overall_summary": "摘要生成失败",
            "knowledge_domain": [],
        }

    # Update session record
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if session:
        session.title = summary_data.get("session_title", session.title)
        session.overall_summary = summary_data.get("overall_summary", "")
        session.knowledge_domain = json.dumps(summary_data.get("knowledge_domain", []), ensure_ascii=False)
        session.message_count = len(cleaned_msgs)
        session.processed_at = datetime.now(timezone.utc)
        db.commit()

    # ── Step 3: Topic splitting ──
    if task_id:
        _update_task(task_id, progress="切分话题...")

    try:
        topics = llm_service.split_topics(conversation_text, msg_dicts)
    except Exception as e:
        import traceback
        print(f"[PIPELINE ERROR] Topic splitting failed: {e}", flush=True)
        traceback.print_exc()
        logger.error("Topic splitting failed: %s", e)
        # Fallback: treat the entire conversation as one topic
        topics = [{
            "topic_title": summary_data.get("session_title", "整个对话"),
            "start_msg_index": 0,
            "end_msg_index": len(cleaned_msgs) - 1,
            "brief": summary_data.get("overall_summary", ""),
        }]

    logger.info("Split into %d topics", len(topics))

    # ── Step 4 & 5: Generate cards and tags ──
    if task_id:
        _update_task(task_id, progress=f"生成知识卡片 (0/{len(topics)})...")

    cards_created = []
    existing_tags = [t.name for t in db.query(Tag).all()]

    for i, topic in enumerate(topics):
        if task_id:
            _update_task(task_id, progress=f"生成知识卡片 ({i + 1}/{len(topics)})...")

        start_idx = topic.get("start_msg_index", 0)
        end_idx = topic.get("end_msg_index", len(cleaned_msgs) - 1)

        # Extract topic segment text
        segment_msgs = cleaned_msgs[start_idx:end_idx + 1]
        segment_text = preprocessing.format_for_llm(segment_msgs)

        # Generate card via LLM
        try:
            card_data = llm_service.generate_card(segment_text, topic.get("topic_title", ""))
        except Exception as e:
            import traceback
            print(f"[PIPELINE ERROR] Card generation failed for topic {i}: {e}", flush=True)
            traceback.print_exc()
            logger.error("Card generation failed for topic %d: %s", i, e)
            card_data = {
                "title": topic.get("topic_title", f"话题 {i + 1}"),
                "summary": topic.get("brief", ""),
                "key_points": [],
                "code_snippets": [],
                "difficulty": "未知",
                "suggested_tags": [],
                "suggested_category": "",
            }

        # Create card record
        card_id = str(uuid.uuid4())
        card = Card(
            id=card_id,
            session_id=session_id,
            title=card_data.get("title", topic.get("topic_title", "")),
            summary=card_data.get("summary", ""),
            key_points=json.dumps(card_data.get("key_points", []), ensure_ascii=False),
            code_snippets=json.dumps(card_data.get("code_snippets", []), ensure_ascii=False),
            difficulty=card_data.get("difficulty", ""),
            category_path=card_data.get("suggested_category", ""),
        )
        db.add(card)

        # Process tags
        suggested_tags = card_data.get("suggested_tags", [])
        for tag_name in suggested_tags:
            tag_name = tag_name.strip()
            if not tag_name:
                continue

            # Normalize: find similar existing tag
            matched_tag = _find_similar_tags(tag_name, existing_tags)
            final_tag_name = matched_tag or tag_name

            # Upsert tag
            tag = db.query(Tag).filter(Tag.name == final_tag_name).first()
            if tag:
                tag.usage_count += 1
            else:
                tag = Tag(name=final_tag_name, status="suggested", usage_count=1)
                db.add(tag)
                existing_tags.append(final_tag_name)

            # Link card to tag
            db.add(CardTag(card_id=card_id, tag_name=final_tag_name))

        # Vectorize and find similar cards
        try:
            embed_text = f"{card_data.get('title', '')} {card_data.get('summary', '')} {' '.join(card_data.get('key_points', []))}"
            vector = embedding.embed_text(embed_text)
            vector_id = vector_store.add_vector(
                card_id=card_id,
                embedding=vector,
                metadata={"card_id": card_id, "title": card_data.get("title", "")},
            )
            card.embedding_id = vector_id

            # Find similar cards for version linking
            similar = vector_store.search_similar(vector, n_results=5)
            for item in similar:
                if item["card_id"] == card_id:
                    continue
                if item["score"] >= settings.VERSION_THRESHOLD:
                    card.parent_version_id = item["card_id"]
                    logger.info("Version link: %s → %s (score=%.3f)", card_id, item["card_id"], item["score"])
                    break

        except Exception as e:
            logger.error("Vectorization failed for card %s: %s", card_id, e)

        cards_created.append(card)

    db.commit()

    if task_id:
        _update_task(
            task_id,
            status="completed",
            progress=f"完成！生成 {len(cards_created)} 张知识卡片",
            card_count=len(cards_created),
        )

    logger.info("Pipeline complete: %d cards created for session %s", len(cards_created), session_id)

    return {
        "session_id": session_id,
        "cards_created": len(cards_created),
        "topics": len(topics),
    }
