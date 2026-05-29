"""Database connection factory.

Transparently routes to either:
- Local SQLite (default, for development)
- Turso / libsql (for Streamlit Cloud deployment)

Every module that currently does `sqlite3.connect(str(SQLITE_PATH))`
should instead call `get_connection()` from this module.

Turso setup (free tier):
  1. Install CLI: curl -sSfL https://get.tur.so/install.sh | bash
  2. turso auth signup
  3. turso db create gtm-engine
  4. turso db tokens create gtm-engine
  5. Add to .env:
     TURSO_DATABASE_URL=libsql://gtm-engine-<your-org>.turso.io
     TURSO_AUTH_TOKEN=<token>
"""

import logging
import sqlite3
from pathlib import Path

from gtm_engine.config import TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, SQLITE_PATH

logger = logging.getLogger(__name__)

_turso_available = False
try:
    import libsql_experimental as libsql
    _turso_available = True
except ImportError:
    pass


def get_connection(db_path: Path | None = None) -> sqlite3.Connection:
    """Get a database connection — Turso if configured, otherwise local SQLite.

    Returns a standard sqlite3.Connection-compatible object.
    """
    if TURSO_DATABASE_URL and TURSO_AUTH_TOKEN:
        return _get_turso_connection()

    # Local SQLite
    path = db_path or SQLITE_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    return conn


def _get_turso_connection() -> sqlite3.Connection:
    """Connect to Turso via libsql."""
    if not _turso_available:
        logger.warning(
            "Turso configured but libsql_experimental not installed. "
            "Run: pip install libsql-experimental"
        )
        # Fall back to local
        SQLITE_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(SQLITE_PATH))
        conn.row_factory = sqlite3.Row
        return conn

    try:
        conn = libsql.connect(
            database=TURSO_DATABASE_URL,
            auth_token=TURSO_AUTH_TOKEN,
        )
        conn.row_factory = sqlite3.Row
        logger.info("Connected to Turso: %s", TURSO_DATABASE_URL[:50])
        return conn
    except Exception as e:
        logger.error("Turso connection failed: %s — falling back to local SQLite", e)
        SQLITE_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(SQLITE_PATH))
        conn.row_factory = sqlite3.Row
        return conn


def is_cloud_db() -> bool:
    """Return True if we're using Turso (cloud DB)."""
    return bool(TURSO_DATABASE_URL and TURSO_AUTH_TOKEN)
