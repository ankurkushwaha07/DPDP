"""
ChromaDB collection maintenance utilities.

Provides:
- health_check(): Quick liveness check
- get_collection_stats(): Document count and RAM estimate
- rebuild_collection(): Full delete + re-ingest
- cleanup_expired(): Remove orphaned data (future use)
"""

import logging
import chromadb
from app.config import CHROMA_DIR, CHROMA_COLLECTION_NAME

logger = logging.getLogger("chroma_maintenance")


def health_check() -> bool:
    """
    Quick check that ChromaDB is responding and has data.

    Returns:
        True if collection exists and has at least 1 document.
        False on any error.
    """
    try:
        client = chromadb.PersistentClient(path=CHROMA_DIR)
        collection = client.get_collection(CHROMA_COLLECTION_NAME)
        count = collection.count()
        return count > 0
    except Exception as e:
        logger.error(f"ChromaDB health check failed: {e}")
        return False


def get_collection_stats() -> dict:
    """
    Get current ChromaDB collection statistics.

    Returns:
        Dict with collection name, document count, and estimated RAM usage.
        Returns empty dict on error.
    """
    try:
        client = chromadb.PersistentClient(path=CHROMA_DIR)
        collection = client.get_collection(CHROMA_COLLECTION_NAME)
        count = collection.count()

        return {
            "collection": CHROMA_COLLECTION_NAME,
            "document_count": count,
            "estimated_ram_mb": round(count * 0.005, 2),  # ~5KB per doc with 384-dim vectors
        }
    except Exception as e:
        logger.error(f"Failed to get collection stats: {e}")
        return {
            "collection": CHROMA_COLLECTION_NAME,
            "document_count": 0,
            "estimated_ram_mb": 0,
            "error": str(e),
        }


def rebuild_collection() -> int:
    """
    Full rebuild: delete collection and re-ingest all sources.

    Use when:
    - DPDP Rules are updated (new amendments)
    - Chunk strategy changes
    - Embedding model changes

    Returns:
        Number of chunks ingested
    """
    logger.info("Starting collection rebuild...")

    client = chromadb.PersistentClient(path=CHROMA_DIR)

    # Delete existing
    try:
        client.delete_collection(CHROMA_COLLECTION_NAME)
        logger.info("Deleted existing collection")
    except Exception:
        logger.info("No existing collection to delete")

    # Re-ingest
    from app.knowledge.ingest import ingest_all_sources
    count = ingest_all_sources()

    logger.info(f"Collection rebuilt: {count} chunks ingested")
    return count
