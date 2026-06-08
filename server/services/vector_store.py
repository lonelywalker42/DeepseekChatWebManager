"""ChromaDB vector store operations."""

import logging
import chromadb

from config import settings

logger = logging.getLogger(__name__)

_client: chromadb.ClientAPI | None = None
_collection: chromadb.Collection | None = None

COLLECTION_NAME = "knowledge_cards"


def _get_collection() -> chromadb.Collection:
    global _client, _collection
    if _collection is None:
        settings.ensure_dirs()
        _client = chromadb.PersistentClient(path=str(settings.chroma_path))
        _collection = _client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("ChromaDB collection '%s' ready (%d vectors)", COLLECTION_NAME, _collection.count())
    return _collection


def add_vector(card_id: str, embedding: list[float], metadata: dict | None = None) -> str:
    """Add a card embedding to the vector store. Returns the vector ID."""
    collection = _get_collection()
    vector_id = f"card_{card_id}"
    collection.upsert(
        ids=[vector_id],
        embeddings=[embedding],
        metadatas=[metadata or {}],
    )
    return vector_id


def search_similar(embedding: list[float], n_results: int = 10) -> list[dict]:
    """Search for similar vectors. Returns list of {id, score, metadata}."""
    collection = _get_collection()
    if collection.count() == 0:
        return []

    results = collection.query(
        query_embeddings=[embedding],
        n_results=min(n_results, collection.count()),
        include=["distances", "metadatas"],
    )

    items = []
    for i, vec_id in enumerate(results["ids"][0]):
        # ChromaDB returns distances (lower = more similar for cosine)
        # Convert to similarity score: 1 - distance
        distance = results["distances"][0][i] if results["distances"] else 0
        score = 1.0 - distance
        metadata = results["metadatas"][0][i] if results["metadatas"] else {}
        items.append({
            "id": vec_id,
            "card_id": metadata.get("card_id", vec_id.replace("card_", "")),
            "score": round(score, 4),
            "metadata": metadata,
        })
    return items


def delete_vector(card_id: str) -> None:
    """Remove a card's embedding from the vector store."""
    collection = _get_collection()
    vector_id = f"card_{card_id}"
    try:
        collection.delete(ids=[vector_id])
    except Exception:
        logger.warning("Vector %s not found for deletion", vector_id)


def get_all_embeddings() -> list[dict]:
    """Return all stored embeddings with their metadata."""
    collection = _get_collection()
    if collection.count() == 0:
        return []
    results = collection.get(include=["metadatas", "embeddings"])
    items = []
    for i, vec_id in enumerate(results["ids"]):
        metadata = results["metadatas"][i] if results["metadatas"] else {}
        embedding = results["embeddings"][i] if results["embeddings"] else None
        items.append({"id": vec_id, "metadata": metadata, "embedding": embedding})
    return items
