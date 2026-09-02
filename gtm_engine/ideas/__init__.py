"""Idea Bank — structured content concept storage.

An Idea is a seed concept that flows through the approval funnel:
    idea_draft → idea_approved → content_generated → content_approved → deployed

Each Idea has a funnel_level that positions it on the narrative ladder:
    umbrella → product → feature → proof

And a segment_type that maps it to a Core-Five slot:
    hook | tension | pivot | proof | bookend | standalone

Ideas are stored in SQLite and queried via the IdeaBank class.
"""

import json
import logging
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from gtm_engine.config import SQLITE_PATH

logger = logging.getLogger(__name__)


class Idea(BaseModel):
    """A single content idea with funnel positioning and tagging."""

    id: int | None = None
    title: str
    hook: str  # The one-line pattern interrupt
    angle: str  # The specific argument or POV
    data_requirement: str = ""  # What data/source this needs (or "none")
    content_mode: str = "insight"  # insight | story | explainer — the demo type (drives the reel)
    data_source_id: int | None = None  # Data Vault source tagged to this idea (feeds the script)
    funnel_level: str  # umbrella | product | feature | proof
    product: str = ""  # "" for umbrella, or PRISM / Analyst's Edge / APEX / ATLAS
    target_segment: str = ""  # which customer segment
    segment_type: str = "standalone"  # hook | tension | pivot | proof | bookend | standalone
    strategic_objective: str = "awareness"  # awareness | trust | conversion
    edginess_score: int = 7  # 1-10
    estimated_reach: str = "medium"  # low | medium | high
    tags: list[str] = Field(default_factory=list)
    notes: str = ""
    status: str = "idea_draft"  # see STATE_MACHINE
    created_at: str = ""
    updated_at: str = ""
    content_piece_ids: list[str] = Field(default_factory=list)  # ids of generated content

    model_config = ConfigDict(extra="ignore")


# Canonical list of funnel levels (in order, wide → narrow)
FUNNEL_LEVELS = [
    "umbrella",   # Quantum Tools identity, founder story, market thesis
    "product",    # PRISM / Analyst's Edge / APEX / ATLAS product positioning
    "feature",    # Specific capabilities (e.g. "PRISM's 5-source validation")
    "proof",      # Concrete data points, benchmarks, case examples
]

# Canonical state machine (see approval/__init__.py for transition logic)
STATES = [
    "idea_draft",         # Newly generated, needs human review
    "idea_approved",      # Approved for content generation
    "idea_rejected",      # Rejected (kept for reference)
    "content_generated",  # Content produced but not yet reviewed
    "content_approved",   # Content approved for deployment
    "content_rejected",   # Content rejected (can be regenerated)
    "deployment_scheduled",  # Queued for deployment
    "deployed",           # Live
    "archived",           # Removed from active pipeline
]


# --- Database schema ---

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    hook TEXT NOT NULL,
    angle TEXT NOT NULL,
    data_requirement TEXT,
    content_mode TEXT DEFAULT 'insight',
    data_source_id INTEGER,
    funnel_level TEXT NOT NULL,
    product TEXT,
    target_segment TEXT,
    segment_type TEXT,
    strategic_objective TEXT,
    edginess_score INTEGER,
    estimated_reach TEXT,
    tags TEXT,  -- JSON array
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'idea_draft',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    content_piece_ids TEXT  -- JSON array
);

CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_funnel_level ON ideas(funnel_level);
CREATE INDEX IF NOT EXISTS idx_ideas_product ON ideas(product);
CREATE INDEX IF NOT EXISTS idx_ideas_segment_type ON ideas(segment_type);

CREATE TABLE IF NOT EXISTS state_transitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,  -- 'idea' or 'content'
    entity_id TEXT NOT NULL,
    from_state TEXT,
    to_state TEXT NOT NULL,
    reason TEXT,
    actor TEXT DEFAULT 'system',
    timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transitions_entity ON state_transitions(entity_type, entity_id);
"""


class IdeaBank:
    """SQLite-backed idea bank with CRUD + query operations."""

    def __init__(self, db_path: Path | None = None):
        # Resolve the default lazily from config so a test (or runtime) that
        # repoints SQLITE_PATH is honoured — matches VideoJobStore/DataVault.
        if db_path is None:
            from gtm_engine.config import SQLITE_PATH as _CONFIG_PATH
            db_path = _CONFIG_PATH
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _get_conn(self):
        """Get a DB connection — Turso if configured, local SQLite otherwise."""
        from gtm_engine.db.connection import get_connection
        return get_connection(self.db_path)

    def _connect(self) -> sqlite3.Connection:
        conn = self._get_conn()
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(SCHEMA_SQL)
            # Idempotent migrations for columns added after ideas first shipped.
            existing = {r[1] for r in conn.execute("PRAGMA table_info(ideas)").fetchall()}
            for col, decl in (("content_mode", "TEXT DEFAULT 'insight'"),
                              ("data_source_id", "INTEGER")):
                if col not in existing:
                    conn.execute(f"ALTER TABLE ideas ADD COLUMN {col} {decl}")
            conn.commit()

    # --- CRUD ---

    def create(self, idea: Idea) -> int:
        """Insert an idea and return its new id."""
        now = datetime.now(timezone.utc).isoformat()
        if not idea.created_at:
            idea.created_at = now
        idea.updated_at = now

        with self._connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO ideas (
                    title, hook, angle, data_requirement, content_mode, data_source_id,
                    funnel_level, product, target_segment, segment_type, strategic_objective,
                    edginess_score, estimated_reach, tags, notes, status,
                    created_at, updated_at, content_piece_ids
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    idea.title, idea.hook, idea.angle, idea.data_requirement,
                    idea.content_mode, idea.data_source_id,
                    idea.funnel_level, idea.product, idea.target_segment,
                    idea.segment_type, idea.strategic_objective, idea.edginess_score,
                    idea.estimated_reach, json.dumps(idea.tags), idea.notes,
                    idea.status, idea.created_at, idea.updated_at,
                    json.dumps(idea.content_piece_ids),
                ),
            )
            conn.commit()
            return cursor.lastrowid

    def create_many(self, ideas: list[Idea]) -> list[int]:
        """Bulk insert. Returns the list of new ids."""
        return [self.create(idea) for idea in ideas]

    def get(self, idea_id: int) -> Idea | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM ideas WHERE id = ?", (idea_id,)).fetchone()
            return self._row_to_idea(row) if row else None

    def update_status(self, idea_id: int, status: str, reason: str = "") -> None:
        """Update an idea's status and log the transition."""
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            # Get current status for the transition log
            current = conn.execute(
                "SELECT status FROM ideas WHERE id = ?", (idea_id,)
            ).fetchone()
            from_state = current["status"] if current else None

            conn.execute(
                "UPDATE ideas SET status = ?, updated_at = ? WHERE id = ?",
                (status, now, idea_id),
            )
            conn.execute(
                """
                INSERT INTO state_transitions
                    (entity_type, entity_id, from_state, to_state, reason, actor, timestamp)
                VALUES ('idea', ?, ?, ?, ?, 'user', ?)
                """,
                (str(idea_id), from_state, status, reason, now),
            )
            conn.commit()

    def set_demo_setup(self, idea_id: int, content_mode: str | None = None,
                       data_source_id: int | None = None, clear_data: bool = False) -> None:
        """Tag the demo type and/or the Data Vault source onto an idea (before the
        script is written). Only the provided fields change."""
        now = datetime.now(timezone.utc).isoformat()
        sets, params = [], []
        if content_mode is not None:
            sets.append("content_mode = ?"); params.append(content_mode)
        if clear_data:
            sets.append("data_source_id = ?"); params.append(None)
        elif data_source_id is not None:
            sets.append("data_source_id = ?"); params.append(data_source_id)
        if not sets:
            return
        sets.append("updated_at = ?"); params.append(now)
        params.append(idea_id)
        with self._connect() as conn:
            conn.execute(f"UPDATE ideas SET {', '.join(sets)} WHERE id = ?", params)
            conn.commit()

    def clear_all(self) -> int:
        """Delete every idea (a 'start fresh' — e.g. to clear the demo). Returns the
        number removed. Does not touch strategy/cast/brand."""
        with self._connect() as conn:
            n = conn.execute("SELECT COUNT(*) FROM ideas").fetchone()[0]
            conn.execute("DELETE FROM ideas")
            conn.commit()
        return int(n or 0)

    def bulk_update_status(self, idea_ids: list[int], status: str, reason: str = "") -> int:
        """Bulk status update. Returns the number of rows affected."""
        count = 0
        for idea_id in idea_ids:
            self.update_status(idea_id, status, reason)
            count += 1
        return count

    def attach_content(self, idea_id: int, content_piece_id: str) -> None:
        """Link a generated content piece to an idea."""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT content_piece_ids FROM ideas WHERE id = ?", (idea_id,)
            ).fetchone()
            if not row:
                return
            existing = json.loads(row["content_piece_ids"] or "[]")
            if content_piece_id not in existing:
                existing.append(content_piece_id)
            conn.execute(
                "UPDATE ideas SET content_piece_ids = ?, updated_at = ? WHERE id = ?",
                (
                    json.dumps(existing),
                    datetime.now(timezone.utc).isoformat(),
                    idea_id,
                ),
            )
            conn.commit()

    # --- Query ---

    def list_all(
        self,
        status: str | None = None,
        funnel_level: str | None = None,
        product: str | None = None,
        segment_type: str | None = None,
        limit: int = 500,
    ) -> list[Idea]:
        """Query ideas with optional filters."""
        query = "SELECT * FROM ideas WHERE 1=1"
        params: list[Any] = []

        if status:
            query += " AND status = ?"
            params.append(status)
        if funnel_level:
            query += " AND funnel_level = ?"
            params.append(funnel_level)
        if product:
            query += " AND product = ?"
            params.append(product)
        if segment_type:
            query += " AND segment_type = ?"
            params.append(segment_type)

        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        with self._connect() as conn:
            rows = conn.execute(query, params).fetchall()
            return [self._row_to_idea(row) for row in rows]

    def counts_by_status(self) -> dict[str, int]:
        """Return a count of ideas per status."""
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT status, COUNT(*) as n FROM ideas GROUP BY status"
            ).fetchall()
            return {row["status"]: row["n"] for row in rows}

    def counts_by_funnel(self) -> dict[str, int]:
        """Return a count of ideas per funnel level."""
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT funnel_level, COUNT(*) as n FROM ideas GROUP BY funnel_level"
            ).fetchall()
            return {row["funnel_level"]: row["n"] for row in rows}

    def _row_to_idea(self, row: sqlite3.Row) -> Idea:
        keys = row.keys()
        return Idea(
            id=row["id"],
            title=row["title"],
            hook=row["hook"],
            angle=row["angle"],
            data_requirement=row["data_requirement"] or "",
            content_mode=(row["content_mode"] if "content_mode" in keys and row["content_mode"] else "insight"),
            data_source_id=(row["data_source_id"] if "data_source_id" in keys else None),
            funnel_level=row["funnel_level"],
            product=row["product"] or "",
            target_segment=row["target_segment"] or "",
            segment_type=row["segment_type"] or "standalone",
            strategic_objective=row["strategic_objective"] or "awareness",
            edginess_score=row["edginess_score"] or 7,
            estimated_reach=row["estimated_reach"] or "medium",
            tags=json.loads(row["tags"] or "[]"),
            notes=row["notes"] or "",
            status=row["status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            content_piece_ids=json.loads(row["content_piece_ids"] or "[]"),
        )
