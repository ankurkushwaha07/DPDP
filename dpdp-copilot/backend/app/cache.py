"""
Simple in-memory cache with TTL (time-to-live).

Caches:
- RAG retrieval results (same query → same chunks)
- Obligation mappings (deterministic, never changes)
- LLM responses for identical inputs (saves API calls)

For production, replace with Redis (Upstash free tier).
"""

import time
import hashlib
import json
import logging
from typing import Any, Optional, Callable
from functools import wraps

logger = logging.getLogger("cache")

_cache: dict[str, tuple[Any, float]] = {}
DEFAULT_TTL = 3600  # 1 hour


def cache_key(prefix: str, *args, **kwargs) -> str:
    """Generate a deterministic cache key from prefix + arguments."""
    content = json.dumps(
        {"args": args, "kwargs": kwargs},
        sort_keys=True,
        default=str,
    )
    hash_val = hashlib.md5(content.encode()).hexdigest()[:12]
    return f"{prefix}:{hash_val}"


def cache_get(key: str) -> Optional[Any]:
    """
    Get value from cache.
    Returns None if key doesn't exist or has expired.
    Expired entries are cleaned up on access.
    """
    if key in _cache:
        value, expiry = _cache[key]
        if time.time() < expiry:
            logger.debug(f"Cache HIT: {key}")
            return value
        else:
            del _cache[key]
            logger.debug(f"Cache EXPIRED: {key}")
    return None


def cache_set(key: str, value: Any, ttl: int = DEFAULT_TTL) -> None:
    """Store a value in cache with TTL (seconds)."""
    _cache[key] = (value, time.time() + ttl)
    logger.debug(f"Cache SET: {key} (TTL={ttl}s)")


def cache_delete(key: str) -> bool:
    """Delete a specific key from cache. Returns True if key existed."""
    if key in _cache:
        del _cache[key]
        return True
    return False


def cache_clear() -> int:
    """Clear all cache entries. Returns count of cleared entries."""
    count = len(_cache)
    _cache.clear()
    logger.info(f"Cache cleared: {count} entries removed")
    return count


def cache_stats() -> dict:
    """Get cache statistics."""
    now = time.time()
    total = len(_cache)
    expired = sum(1 for _, (_, expiry) in _cache.items() if now >= expiry)
    return {
        "total_entries": total,
        "active_entries": total - expired,
        "expired_entries": expired,
    }


def cached(prefix: str, ttl: int = DEFAULT_TTL) -> Callable:
    """
    Decorator for caching function results.

    Usage:
        @cached("rag_query", ttl=1800)
        def get_relevant_sections(query: str) -> list:
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            key = cache_key(prefix, *args, **kwargs)
            result = cache_get(key)
            if result is not None:
                return result
            result = func(*args, **kwargs)
            cache_set(key, result, ttl)
            return result
        return wrapper
    return decorator
