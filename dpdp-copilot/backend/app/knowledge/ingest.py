"""
DPDP Knowledge Base ingestion pipeline.

Reads DPDP Act 2023 and DPDP Rules 2025 source documents,
chunks them, embeds with all-MiniLM-L6-v2, and stores in ChromaDB.

Includes a synthetic knowledge generator that creates chunks from
the hardcoded section_map.py, so the system works even without PDF files.

Usage:
    python -m app.knowledge.ingest --rebuild
"""

import os
import logging
import uuid
import chromadb
from chromadb.utils import embedding_functions

from app.config import CHROMA_DIR, CHROMA_COLLECTION_NAME, EMBEDDING_MODEL_NAME, DPDP_SOURCES_DIR
from app.knowledge.chunker import chunk_text, extract_text_from_pdf
from app.knowledge.section_map import DPDP_SECTIONS, DPDP_RULES, OBLIGATION_CATEGORIES

logger = logging.getLogger("ingest")


def get_chroma_client() -> chromadb.PersistentClient:
    """Get or create a persistent ChromaDB client."""
    os.makedirs(CHROMA_DIR, exist_ok=True)
    return chromadb.PersistentClient(path=CHROMA_DIR)


def get_embedding_function():
    """Get the sentence-transformers embedding function."""
    return embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=EMBEDDING_MODEL_NAME
    )


def get_or_create_collection(client=None):
    """Get or create the DPDP knowledge collection."""
    if client is None:
        client = get_chroma_client()
    ef = get_embedding_function()
    return client.get_or_create_collection(
        name=CHROMA_COLLECTION_NAME,
        embedding_function=ef,
        metadata={"description": "DPDP Act 2023 + Rules 2025 knowledge base"},
    )


def ingest_all_sources():
    """
    Main ingestion function. Processes all available sources:
    1. PDF files in data/sources/ (if any exist)
    2. Synthetic knowledge from section_map.py (always)

    Safe to call multiple times — rebuilds the collection from scratch.
    """
    client = get_chroma_client()

    # Delete existing collection if it exists
    try:
        client.delete_collection(CHROMA_COLLECTION_NAME)
        logger.info("Deleted existing collection for rebuild")
    except Exception as e:
        logger.info("Could not delete existing collection (none or locked): %s", e)

    collection = get_or_create_collection(client)

    all_chunks = []

    # 1. Process PDF files if available
    pdf_sources = {
        "dpdp_act_2023": ["dpdp_act_2023.pdf", "DPDP_Act_2023.pdf"],
        "dpdp_rules_2025": ["dpdp_rules_2025.pdf", "DPDP_Rules_2025.pdf"],
    }

    for source_name, filenames in pdf_sources.items():
        for filename in filenames:
            pdf_path = os.path.join(DPDP_SOURCES_DIR, filename)
            if os.path.exists(pdf_path):
                try:
                    text = extract_text_from_pdf(pdf_path)
                    chunks = chunk_text(text, source_name)
                    all_chunks.extend(chunks)
                    logger.info(f"Processed {pdf_path}: {len(chunks)} chunks")
                except Exception as e:
                    logger.error(f"Failed to process {pdf_path}: {e}")
                break  # Found the file, don't try alternate names

    # 2. Always add synthetic knowledge from section map
    synthetic = _generate_synthetic_knowledge()
    all_chunks.extend(synthetic)
    logger.info(f"Generated {len(synthetic)} synthetic knowledge chunks")

    # 3. Ingest all chunks into ChromaDB
    if not all_chunks:
        logger.warning("No chunks to ingest!")
        return 0

    # ChromaDB has batch size limits, process in batches of 100
    batch_size = 100
    total_ingested = 0

    for i in range(0, len(all_chunks), batch_size):
        batch = all_chunks[i:i + batch_size]

        ids = [str(uuid.uuid4()) for _ in batch]
        documents = [chunk["text"] for chunk in batch]
        metadatas = [chunk["metadata"] for chunk in batch]

        collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
        )
        total_ingested += len(batch)

    logger.info(f"Ingestion complete: {total_ingested} chunks in collection '{CHROMA_COLLECTION_NAME}'")
    return total_ingested


def _generate_synthetic_knowledge() -> list[dict]:
    """
    Generate high-quality knowledge chunks from the hardcoded section map.
    This ensures the RAG system works even without PDF files.

    Creates chunks that combine:
    - Section title and summary
    - Obligation category description
    - Penalty information
    """
    chunks = []

    # Generate chunks from DPDP Act sections
    for ref, data in DPDP_SECTIONS.items():
        text = (
            f"{ref}: {data['title']}\n\n"
            f"{data['summary']}\n\n"
            f"Applicable obligations: {', '.join(data['obligations'])}\n"
            f"Penalty for non-compliance: {data.get('penalties', 'Not specified')}"
        )

        for obligation in data["obligations"]:
            chunks.append({
                "text": text,
                "metadata": {
                    "source": "dpdp_act_2023_reference",
                    "section": ref,
                    "obligation_category": obligation,
                    "chunk_index": 0,
                },
            })

    # Generate chunks from DPDP Rules
    for ref, data in DPDP_RULES.items():
        text = (
            f"{ref}: {data['title']}\n\n"
            f"{data['summary']}\n\n"
            f"Applicable obligations: {', '.join(data['obligations'])}"
        )

        for obligation in data["obligations"]:
            chunks.append({
                "text": text,
                "metadata": {
                    "source": "dpdp_rules_2025_reference",
                    "section": ref,
                    "obligation_category": obligation,
                    "chunk_index": 0,
                },
            })

    # Generate chunks from obligation category descriptions
    for cat_name, cat_data in OBLIGATION_CATEGORIES.items():
        sections_str = ", ".join(cat_data["act_sections"] + cat_data["rules_refs"])
        text = (
            f"DPDP Obligation: {cat_name}\n\n"
            f"Description: {cat_data['description']}\n\n"
            f"Relevant sections: {sections_str}\n\n"
            f"This obligation requires the Data Fiduciary to comply with "
            f"{sections_str} of the Digital Personal Data Protection Act, 2023 "
            f"and the DPDP Rules, 2025."
        )

        chunks.append({
            "text": text,
            "metadata": {
                "source": "obligation_reference",
                "section": sections_str,
                "obligation_category": cat_name,
                "chunk_index": 0,
            },
        })

    return chunks


# ============================================================
# CLI ENTRY POINT
# ============================================================

if __name__ == "__main__":
    import argparse

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    parser = argparse.ArgumentParser(description="DPDP Knowledge Base Ingestion")
    parser.add_argument("--rebuild", action="store_true", help="Rebuild the entire knowledge base")
    args = parser.parse_args()

    if args.rebuild:
        count = ingest_all_sources()
        print(f"Ingestion complete: {count} chunks")
    else:
        print("Use --rebuild to rebuild the knowledge base")
