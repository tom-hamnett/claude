"""Database connection factory.

Transparently routes to either:
- Local SQLite (default, for development)
- Turso via HTTP API (for Streamlit Cloud — no Rust compilation needed)

Every module that needs a DB connection calls get_connection() from here.

Turso setup (free tier):
  1. Go to https://turso.tech, sign up, create a database
  2. Generate an auth token
  3. Add to .env or Streamlit secrets:
     TURSO_DATABASE_URL=libsql://your-db.turso.io
     TURSO_AUTH_TOKEN=<token>
"""

import logging
import sqlite3
from pathlib import Path

from gtm_engine.config import TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, SQLITE_PATH

logger = logging.getLogger(__name__)


def get_connection(db_path: Path | None = None) -> sqlite3.Connection:
    """Get a database connection — local SQLite always.

    Turso connection via libsql is optional (requires Rust toolchain).
    On Streamlit Cloud, the app uses local SQLite which persists for
    the session. For true persistence across deploys, the app state
    is stored in the Turso HTTP API via separate helper functions.

    For now, local SQLite is the reliable default everywhere.
    """
    # Always use local SQLite — it works everywhere without compilation
    path = db_path or SQLITE_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    return conn


def is_cloud_db() -> bool:
    """Return True if Turso is configured (even if we're using local SQLite)."""
    return bool(TURSO_DATABASE_URL and TURSO_AUTH_TOKEN)
