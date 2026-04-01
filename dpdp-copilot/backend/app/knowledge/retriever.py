"""
ChromaDB retrieval layer for DPDP knowledge base.

Provides semantic search and obligation-based lookup.
Results are cached to reduce redundant embedding computations.
"""

import logging
from app.knowledge.ingest import get_or_create_collection
from app.cache import cached

logger = logging.getLogger("retriever")


@cached("rag_query", ttl=3600)
def get_relevant_sections(query: str, n_results: int = 5) -> list[dict]:
    """
    Semantic search: find the most relevant DPDP sections for a query.

    Args:
        query: Natural language query (e.g., "consent requirements for children")
        n_results: Number of results to return (default 5)

    Returns:
        List of dicts sorted by relevance:
        [
            {
                "text": "Section 9: Processing of personal data of children...",
                "section": "Section 9",
                "source": "dpdp_act_2023_reference",
                "obligation_category": "children_data",
                "distance": 0.45
            }
        ]
    """
    try:
        collection = get_or_create_collection()
        results = collection.query(
            query_texts=[query],
            n_results=min(n_results, 10),  # Cap at 10
        )

        if not results or not results["documents"] or not results["documents"][0]:
            logger.warning(f"No results for query: '{query[:50]}...'")
            return []

        sections = []
        for i in range(len(results["documents"][0])):
            doc = results["documents"][0][i]
            meta = results["metadatas"][0][i] if results["metadatas"] else {}
            distance = results["distances"][0][i] if results["distances"] else 0.0

            sections.append({
                "text": doc,
                "section": meta.get("section", "unknown"),
                "source": meta.get("source", "unknown"),
                "obligation_category": meta.get("obligation_category", "general"),
                "distance": round(distance, 4),
            })

        logger.debug(f"Query '{query[:30]}...' returned {len(sections)} results")
        return sections

    except Exception as e:
        logger.error(f"Retrieval failed for query '{query[:50]}...': {e}")
        return []


@cached("rag_obligation", ttl=7200)
def get_sections_by_obligation(category: str, n_results: int = 5) -> list[dict]:
    """
    Filtered search: get all chunks tagged with a specific obligation category.

    Uses ChromaDB's metadata filtering for exact matches.

    Args:
        category: Obligation category (e.g., "consent", "children_data")
        n_results: Max results to return

    Returns:
        Same format as get_relevant_sections()
    """
    try:
        collection = get_or_create_collection()
        results = collection.query(
            query_texts=[f"DPDP {category} obligation requirements"],
            n_results=min(n_results, 10),
            where={"obligation_category": category},
        )

        if not results or not results["documents"] or not results["documents"][0]:
            logger.warning(f"No results for obligation: '{category}'")
            return []

        sections = []
        for i in range(len(results["documents"][0])):
            doc = results["documents"][0][i]
            meta = results["metadatas"][0][i] if results["metadatas"] else {}
            distance = results["distances"][0][i] if results["distances"] else 0.0

            sections.append({
                "text": doc,
                "section": meta.get("section", "unknown"),
                "source": meta.get("source", "unknown"),
                "obligation_category": meta.get("obligation_category", category),
                "distance": round(distance, 4),
            })

        return sections

    except Exception as e:
        logger.error(f"Obligation lookup failed for '{category}': {e}")
        return []


def get_context_for_obligations(obligation_categories: list[str], max_chunks_per_category: int = 3) -> str:
    """
    Build a combined context string from multiple obligation categories.
    Used to construct LLM prompts with relevant DPDP text.

    Args:
        obligation_categories: List of categories to fetch context for
        max_chunks_per_category: Max chunks per category

    Returns:
        Combined text string with section separators
    """
    all_texts = []
    seen_texts = set()

    for category in obligation_categories:
        chunks = get_sections_by_obligation(category, n_results=max_chunks_per_category)
        for chunk in chunks:
            text = chunk["text"]
            if text not in seen_texts:
                seen_texts.add(text)
                all_texts.append(text)

    return "\n---\n".join(all_texts)
