"""Database schema — SQLite for local dev, Supabase for production.

Tables:
- briefs: GTM brief snapshots
- strategies: Generated strategies linked to briefs
- content_items: All generated content with tags
- deployments: Publishing records
- performance: Metrics per deployment
- decisions: Logged strategic decisions
- stage_gates: Stage gate review records
"""

import sqlite3
import logging
from pathlib import Path

from gtm_engine.config import SQLITE_PATH

logger = logging.getLogger(__name__)

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS briefs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    data JSON NOT NULL
);

CREATE TABLE IF NOT EXISTS strategies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brief_id INTEGER NOT NULL REFERENCES briefs(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    data JSON NOT NULL
);

CREATE TABLE IF NOT EXISTS content_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    strategy_id INTEGER NOT NULL REFERENCES strategies(id),
    content_type TEXT NOT NULL,
    segment TEXT,
    channel TEXT,
    objective TEXT,
    edginess_principle TEXT,
    ai_model TEXT,
    content TEXT NOT NULL,
    tags JSON,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'draft'
);

CREATE TABLE IF NOT EXISTS deployments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_item_id INTEGER NOT NULL REFERENCES content_items(id),
    channel TEXT NOT NULL,
    published_at TEXT,
    platform_post_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deployment_id INTEGER NOT NULL REFERENCES deployments(id),
    recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
    metrics JSON NOT NULL
);

CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    category TEXT NOT NULL,
    decision TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    data JSON
);

CREATE TABLE IF NOT EXISTS stage_gates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    responses JSON NOT NULL,
    report TEXT
);
"""


def init_db(db_path: Path | None = None) -> sqlite3.Connection:
    """Initialise the SQLite database and return a connection."""
    path = db_path or SQLITE_PATH
    path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(path))
    conn.executescript(SCHEMA_SQL)
    conn.commit()

    logger.info("Database initialised at %s", path)
    return conn
