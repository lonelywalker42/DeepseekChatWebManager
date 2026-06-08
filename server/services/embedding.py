"""Embedding service using sentence-transformers (bge-small-zh).

The model is loaded from a local path (downloaded via modelscope).
Falls back to hash-based pseudo-embedding if the model is unavailable.
"""

import hashlib
import logging
import math

from config import settings

logger = logging.getLogger(__name__)

_model = None
_model_loaded = False
_model_available = False


def _try_load_model() -> bool:
    """Attempt to load the embedding model. Returns True if successful."""
    global _model, _model_loaded, _model_available
    if _model_loaded:
        return _model_available
    _model_loaded = True

    try:
        from sentence_transformers import SentenceTransformer
        logger.info("Loading embedding model: %s", settings.EMBEDDING_MODEL)
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
        _model_available = True
        dim = _model.get_embedding_dimension()
        logger.info("Embedding model loaded (dim=%d)", dim)
        return True
    except Exception as e:
        logger.warning("Embedding model unavailable. Using hash-based fallback. Reason: %s", type(e).__name__)
        _model_available = False
        return False


def _hash_embed(text: str, dim: int = 512) -> list[float]:
    """Hash-based pseudo-embedding fallback."""
    h = hashlib.sha256(text.encode("utf-8")).digest()
    values = []
    for i in range(dim // 32 + 1):
        chunk = hashlib.sha256(h + i.to_bytes(4, "big")).digest()
        values.extend(chunk)
    vec = [(b - 128) / 128.0 for b in values[:dim]]
    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        vec = [v / norm for v in vec]
    return vec


def is_available() -> bool:
    return _try_load_model()


def embed_text(text: str) -> list[float]:
    if _try_load_model() and _model is not None:
        return _model.encode(text, normalize_embeddings=True).tolist()
    return _hash_embed(text)


def embed_texts(texts: list[str]) -> list[list[float]]:
    if _try_load_model() and _model is not None:
        return [v.tolist() for v in _model.encode(texts, normalize_embeddings=True, batch_size=32)]
    return [_hash_embed(t) for t in texts]


def get_embedding_dimension() -> int:
    if _try_load_model() and _model is not None:
        return _model.get_embedding_dimension()
    return 512
