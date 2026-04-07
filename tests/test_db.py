"""Tests for database schema initialisation."""

import sqlite3
from pathlib import Path

from gtm_engine.db.schema import init_db


def test_init_db_creates_tables(tmp_path: Path):
    """init_db should create all expected tables."""
    db_path = tmp_path / "test.db"
    conn = init_db(db_path)

    cursor = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    )
    tables = {row[0] for row in cursor.fetchall()}

    expected = {
        "briefs", "strategies", "content_items",
        "deployments", "performance", "decisions", "stage_gates",
    }
    assert expected.issubset(tables)
    conn.close()
