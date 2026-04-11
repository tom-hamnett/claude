"""Brief Queue — user-submitted natural-language content requests.

A Brief is a natural-language request from the founder, like:
  "Introductory founder series — 5 pieces introducing me and why
   Quantum Tools exists. Mix of reels and LinkedIn posts."

The Brief is sent to Claude, which generates a batch of Ideas that
specifically serve the brief (not a generic batch from the strategy).
The Ideas are tagged with the brief_id so you can see what came from
where.

Brief types:
- series: a multi-piece content series with a theme
- product_launch: introducing a product
- feature_deep_dive: focused on one capability
- data_showcase: content built around a specific data source
- response: responding to a market event, news, or customer signal
- custom: anything else

A Brief flows: draft → generating → complete → archived
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
CREATE TABLE IF NOT EXISTS briefs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    brief_type TEXT,
    target_count INTEGER DEFAULT 5,
    target_products TEXT,          -- JSON array
    target_segments TEXT,          -- JSON array
    data_source_ids TEXT,          -- JSON array of DataSource ids to reference
    status TEXT NOT NULL DEFAULT 'draft',
    generated_idea_ids TEXT,       -- JSON array
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_briefs_status ON briefs(status);
CREATE INDEX IF NOT EXISTS idx_briefs_type ON briefs(brief_type);
"""


BRIEF_TYPES = [
    "series",
    "product_launch",
    "feature_deep_dive",
    "data_showcase",
    "response",
    "custom",
]


class Brief(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: int | None = None
    title: str
    description: str
    brief_type: str = "custom"
    target_count: int = 5
    target_products: list[str] = Field(default_factory=list)
    target_segments: list[str] = Field(default_factory=list)
    data_source_ids: list[int] = Field(default_factory=list)
    status: str = "draft"  # draft | generating | complete | archived
    generated_idea_ids: list[int] = Field(default_factory=list)
    notes: str = ""
    created_at: str = ""
    updated_at: str = ""


class BriefQueue:
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

    def create(self, brief: Brief) -> int:
        now = datetime.now(timezone.utc).isoformat()
        if not brief.created_at:
            brief.created_at = now
        brief.updated_at = now

        with self._connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO briefs (
                    title, description, brief_type, target_count,
                    target_products, target_segments, data_source_ids,
                    status, generated_idea_ids, notes, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    brief.title, brief.description, brief.brief_type, brief.target_count,
                    json.dumps(brief.target_products), json.dumps(brief.target_segments),
                    json.dumps(brief.data_source_ids), brief.status,
                    json.dumps(brief.generated_idea_ids), brief.notes,
                    brief.created_at, brief.updated_at,
                ),
            )
            conn.commit()
            return cursor.lastrowid

    def get(self, brief_id: int) -> Brief | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM briefs WHERE id = ?", (brief_id,)).fetchone()
            return self._row_to_brief(row) if row else None

    def list_all(self, status: str | None = None) -> list[Brief]:
        query = "SELECT * FROM briefs"
        params = []
        if status:
            query += " WHERE status = ?"
            params.append(status)
        query += " ORDER BY created_at DESC"
        with self._connect() as conn:
            rows = conn.execute(query, params).fetchall()
            return [self._row_to_brief(r) for r in rows]

    def update_status(self, brief_id: int, status: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE briefs SET status = ?, updated_at = ? WHERE id = ?",
                (status, datetime.now(timezone.utc).isoformat(), brief_id),
            )
            conn.commit()

    def attach_generated_ideas(self, brief_id: int, idea_ids: list[int]) -> None:
        with self._connect() as conn:
            row = conn.execute("SELECT generated_idea_ids FROM briefs WHERE id = ?", (brief_id,)).fetchone()
            if not row:
                return
            existing = json.loads(row["generated_idea_ids"] or "[]")
            existing.extend(idea_ids)
            conn.execute(
                "UPDATE briefs SET generated_idea_ids = ?, updated_at = ? WHERE id = ?",
                (json.dumps(existing), datetime.now(timezone.utc).isoformat(), brief_id),
            )
            conn.commit()

    def delete(self, brief_id: int) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM briefs WHERE id = ?", (brief_id,))
            conn.commit()

    def _row_to_brief(self, row: sqlite3.Row) -> Brief:
        return Brief(
            id=row["id"],
            title=row["title"],
            description=row["description"],
            brief_type=row["brief_type"] or "custom",
            target_count=row["target_count"] or 5,
            target_products=json.loads(row["target_products"] or "[]"),
            target_segments=json.loads(row["target_segments"] or "[]"),
            data_source_ids=json.loads(row["data_source_ids"] or "[]"),
            status=row["status"],
            generated_idea_ids=json.loads(row["generated_idea_ids"] or "[]"),
            notes=row["notes"] or "",
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
