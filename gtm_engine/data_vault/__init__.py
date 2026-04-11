"""Data Vault — the single source of truth for real data that content references.

A Data Source is any piece of real data the founder has: Atlas 52-week
performance log, F1 grid benchmark output, a verbatim customer quote, a
PRISM sample reconciliation, etc. Ideas that reference real data can
link to a data source by id, and content generation will only run when
the required data exists.

Source types:
- dataset: tabular or structured data (JSON, CSV-as-markdown)
- benchmark: named reference output (F1 grid, FTSE 100 sample)
- quote: verbatim customer / industry quote
- metric: single number or KPI with context
- document: markdown / text document
- url: link to external source
"""

import json
import logging
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

from gtm_engine.config import SQLITE_PATH

logger = logging.getLogger(__name__)

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS data_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    source_type TEXT,
    content TEXT,              -- actual data (markdown, JSON, text)
    related_products TEXT,     -- JSON array of product names
    tags TEXT,                 -- JSON array
    verified INTEGER DEFAULT 0,
    freshness TEXT,            -- e.g. "2026-04-10" or "live" or "stale"
    source_url TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_data_type ON data_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_data_verified ON data_sources(verified);
"""


class DataSource(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: int | None = None
    name: str
    description: str = ""
    source_type: str = "document"  # dataset, benchmark, quote, metric, document, url
    content: str = ""
    related_products: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    verified: bool = False
    freshness: str = ""
    source_url: str = ""
    notes: str = ""
    created_at: str = ""
    updated_at: str = ""


SOURCE_TYPES = ["dataset", "benchmark", "quote", "metric", "document", "url"]


class DataVault:
    def __init__(self, db_path: Path | None = None):
        self.db_path = db_path or SQLITE_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(SCHEMA_SQL)
            conn.commit()

    def create(self, source: DataSource) -> int:
        now = datetime.now(timezone.utc).isoformat()
        if not source.created_at:
            source.created_at = now
        source.updated_at = now

        with self._connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO data_sources (
                    name, description, source_type, content,
                    related_products, tags, verified, freshness,
                    source_url, notes, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    source.name, source.description, source.source_type, source.content,
                    json.dumps(source.related_products), json.dumps(source.tags),
                    1 if source.verified else 0, source.freshness,
                    source.source_url, source.notes, source.created_at, source.updated_at,
                ),
            )
            conn.commit()
            return cursor.lastrowid

    def get(self, source_id: int) -> DataSource | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM data_sources WHERE id = ?", (source_id,)).fetchone()
            return self._row_to_source(row) if row else None

    def list_all(
        self,
        source_type: str | None = None,
        verified_only: bool = False,
        product: str | None = None,
    ) -> list[DataSource]:
        query = "SELECT * FROM data_sources WHERE 1=1"
        params: list = []
        if source_type:
            query += " AND source_type = ?"
            params.append(source_type)
        if verified_only:
            query += " AND verified = 1"

        query += " ORDER BY verified DESC, created_at DESC"

        with self._connect() as conn:
            rows = conn.execute(query, params).fetchall()
            sources = [self._row_to_source(r) for r in rows]

        if product:
            sources = [s for s in sources if product in s.related_products]

        return sources

    def search(self, query: str) -> list[DataSource]:
        """Simple LIKE search across name, description, and content."""
        pattern = f"%{query}%"
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT * FROM data_sources
                WHERE name LIKE ? OR description LIKE ? OR content LIKE ?
                ORDER BY verified DESC
                """,
                (pattern, pattern, pattern),
            ).fetchall()
            return [self._row_to_source(r) for r in rows]

    def delete(self, source_id: int) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM data_sources WHERE id = ?", (source_id,))
            conn.commit()

    def verify(self, source_id: int) -> None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE data_sources SET verified = 1, updated_at = ? WHERE id = ?",
                (datetime.now(timezone.utc).isoformat(), source_id),
            )
            conn.commit()

    def _row_to_source(self, row: sqlite3.Row) -> DataSource:
        return DataSource(
            id=row["id"],
            name=row["name"],
            description=row["description"] or "",
            source_type=row["source_type"] or "document",
            content=row["content"] or "",
            related_products=json.loads(row["related_products"] or "[]"),
            tags=json.loads(row["tags"] or "[]"),
            verified=bool(row["verified"]),
            freshness=row["freshness"] or "",
            source_url=row["source_url"] or "",
            notes=row["notes"] or "",
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
