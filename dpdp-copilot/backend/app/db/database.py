"""
SQLite database connection manager.
Uses WAL mode for better concurrent read performance.
Context manager pattern ensures connections are always closed.
"""

import sqlite3
import os
import logging
from contextlib import contextmanager
from app.config import DB_PATH

logger = logging.getLogger("database")

# Path to schema file relative to this file's location
_SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


def init_db():
    """
    Initialize database on app startup.
    Creates tables if they don't exist. Safe to call multiple times.
    """
    os.makedirs(os.path.dirname(DB_PATH) if os.path.dirname(DB_PATH) else ".", exist_ok=True)

    with get_db() as conn:
        with open(_SCHEMA_PATH, "r", encoding="utf-8") as f:
            conn.executescript(f.read())

    logger.info(f"Database initialized at {DB_PATH}")


@contextmanager
def get_db():
    """
    Context manager for database connections.

    Usage:
        with get_db() as conn:
            cur = conn.execute("SELECT ...")
            rows = cur.fetchall()
        # connection is auto-committed on success, rolled back on error, always closed
    """
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row  # Access columns by name
    conn.execute("PRAGMA journal_mode=WAL")  # Better concurrent reads
    conn.execute("PRAGMA foreign_keys=ON")  # Enforce FK constraints
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
