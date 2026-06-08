"""Embedding service with graceful fallback when model is unavailable.

Uses a background thread with timeout to attempt model loading.
If loading hangs (e.g. network issues, CUDA init), falls back immediately.
"""

import hashlib
import logging
import math
import threading

from config import settings

logger = logging.getLogger(__name__)

_model = None
_model_loaded = False
_model_available = False
_lock = threading.Lock()


def _load_model_worker(result: list):
    """Worker function to load model in a thread."""
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(settings.EMBEDDING_MODEL)
        result.append(model)
    except Exception as e:
        logger.warning("Model load failed: %s", type(e).__name__)


def _try_load_model(timeout: int = 8) -> bool:
    """Attempt to load model with timeout. Returns True if successful."""
    global _model, _model_loaded, _model_available
    if _model_loaded:
        return _model_available

    with _lock:
        if _model_loaded:
            return _model_available
        _model_loaded = True

        result = []
        thread = threading.Thread(target=_load_model_worker, args=(result,), daemon=True)
        thread.start()
        thread.join(timeout=timeout)

        if thread.is_alive():
            logger.warning("Embedding model load timed out (%ds). Using hash-based fallback.", timeout)
            _model_available = False
            return False

        if result:
            _model = result[0]
            _model_available = True
            logger.info("Embedding model loaded (dim=%d)", _model.get_sentence_embedding_dimension())
            return True
        else:
            logger.warning("Embedding model unavailable. Using hash-based fallback.")
            _model_available = False
            return False


def _hash_embed(text: str, dim: int = 384) -> list[float]:
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
        return _model.get_sentence_embedding_dimension()
    return 384
