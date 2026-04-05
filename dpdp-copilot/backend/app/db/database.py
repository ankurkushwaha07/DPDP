"""
PostgreSQL database connection manager.
Replaces sqlite3 for cloud deployments with a compatibility wrapper.
"""

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
import os
import logging
from contextlib import contextmanager
from app.config import DATABASE_URL

logger = logging.getLogger("database")

# Path to schema file relative to this file's location
_SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")

class SQLiteCompatWrapper:
    """Wrapper to make psycopg2 look like sqlite3's connection object."""
    def __init__(self, conn):
        self.conn = conn
        
    def execute(self, query, params=None):
        # Convert sqlite '?' to postgres '%s'
        pg_query = query.replace('?', '%s')
        cur = self.conn.cursor()
        if params is not None:
            cur.execute(pg_query, params)
        else:
            cur.execute(pg_query)
        return cur
        
    def commit(self):
        self.conn.commit()
        
    def rollback(self):
        self.conn.rollback()
        
    def close(self):
        self.conn.close()

def init_db():
    """
    Initialize database on app startup.
    Creates tables if they don't exist. Safe to call multiple times.
    """
    if not DATABASE_URL:
        logger.warning("No DATABASE_URL configured. Skipping DB init.")
        return

    with get_db() as conn:
        with open(_SCHEMA_PATH, "r", encoding="utf-8") as f:
            query = f.read()
            # Split schema.sql by semicolon for cleaner loading, or run in one block.
            # Postgres execute handles block execution reasonably well if wrapped.
            conn.execute(query)

    logger.info("Database initialized successfully on Remote Postgres.")


_pool = None

def get_pool():
    global _pool
    if _pool is None and DATABASE_URL:
        _pool = ConnectionPool(DATABASE_URL, min_size=1, max_size=10, kwargs={"row_factory": dict_row})
    return _pool

@contextmanager
def get_db():
    """
    Context manager for Postgres database connections.
    Uses psycopg_pool to reuse connections and prevent Neon DB throttling.
    """
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL is required.")
        
    pool = get_pool()
    with pool.connection() as conn:
        compat_conn = SQLiteCompatWrapper(conn)
        try:
            yield compat_conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
# End of file
