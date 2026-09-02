"""Content Studio — the front door: one brief → a whole batch of content.

The engine already had a written-content factory (content_factory/) and a video
engine; what it lacked was a simple place to say "make me a batch about X" and a
durable home for the results. This module is that home.

A BATCH is one pillar idea atomised the way the research says works — pillar →
atomise → distribute:
    1 long-form BLOG  →  5 ARTICLES (reframed per channel)  →  10 SOCIAL concepts
Each social concept becomes a reel (via the video engine we built) or a carousel.

Storage mirrors the video job store exactly (SCHEMA_SQL + a migrations dict, DB
path defaulted lazily to config.SQLITE_PATH so it's automatically workspace-scoped
and test-repointable).
"""

import json
import logging
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

logger = logging.getLogger(__name__)


# ── Content-type taxonomy (the categories on the intake; NOT mutually exclusive) ──
# Each maps to a default reel "mode" for when a social concept becomes a video.
CONTENT_TYPES = [
    {"id": "origin",      "icon": "🌱", "label": "Origin / Introduction",
     "blurb": "Who you are, why this exists, the belief behind it.", "reel_mode": "story"},
    {"id": "process",     "icon": "🔧", "label": "Process / How it works",
     "blurb": "An overview of a method or how the thing runs.", "reel_mode": "explainer"},
    {"id": "insight",     "icon": "💡", "label": "Insight / Point of view",
     "blurb": "A sharp take — how to think about a problem.", "reel_mode": "insight"},
    {"id": "data",        "icon": "📊", "label": "Data insight",
     "blurb": "A specific finding from real numbers.", "reel_mode": "insight"},
    {"id": "proof",       "icon": "🎯", "label": "Proof / Case study",
     "blurb": "Results, receipts, a worked example.", "reel_mode": "insight"},
    {"id": "contrarian",  "icon": "⚔️", "label": "Contrarian / Myth-bust",
     "blurb": "The uncomfortable truth the category avoids.", "reel_mode": "insight"},
    {"id": "educational", "icon": "📚", "label": "Educational / How-to",
     "blurb": "Teach a concrete skill or step-by-step.", "reel_mode": "explainer"},
    {"id": "announcement","icon": "📣", "label": "Announcement / Update",
     "blurb": "A launch, a milestone, something new.", "reel_mode": "story"},
]
CONTENT_TYPE_IDS = [t["id"] for t in CONTENT_TYPES]
CONTENT_TYPE_BY_ID = {t["id"]: t for t in CONTENT_TYPES}

# Channels an article is reframed for (kind == "article").
ARTICLE_CHANNELS = [
    {"id": "linkedin_post", "label": "LinkedIn post"},
    {"id": "linkedin_article", "label": "LinkedIn article"},
    {"id": "reddit_post", "label": "Reddit post"},
    {"id": "forum_post", "label": "Forum / community post"},
    {"id": "x_thread", "label": "X / Twitter thread"},
]
SOCIAL_FORMATS = ["reel", "carousel"]

BATCH_STATUSES = ["draft", "generating", "generated", "failed"]
PIECE_STATUSES = ["draft", "ready", "scheduled", "published"]


class ContentBatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: int | None = None
    title: str
    topic: str = ""                                  # short subject line
    content_types: list[str] = Field(default_factory=list)
    background: str = ""                             # detailed context the user typed
    data_source_id: int | None = None               # combined reference source (built at gen time)
    template_id: str = "default"
    examples: str = ""                              # example content to emulate (tone/structure)
    # Raw intake inputs (any format) — interpreted into text when generation runs, so
    # slow multimodal reads (images/video/links) happen off the button, in the thread.
    ref_files: list[str] = Field(default_factory=list)      # uploaded reference file paths
    ref_links: list[str] = Field(default_factory=list)      # reference URLs
    example_files: list[str] = Field(default_factory=list)  # example-to-emulate file paths
    example_links: list[str] = Field(default_factory=list)  # example-to-emulate URLs
    status: str = "draft"
    error: str = ""
    created_at: str = ""
    updated_at: str = ""


class ContentPiece(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: int | None = None
    batch_id: int
    kind: str = "blog"                              # blog | article | social
    channel: str = ""                              # linkedin_post / reddit_post / instagram / ...
    format: str = ""                               # long_form | article | reel | carousel
    title: str = ""
    body: str = ""                                 # the written content (or carousel slides text)
    outline: list[str] = Field(default_factory=list)
    caption: str = ""                              # social hook / short caption
    content_mode: str = ""                          # reel mode when kind==social & format==reel
    parent_id: int | None = None                    # blog for articles; article for social
    status: str = "draft"
    idea_id: int | None = None                      # linked Idea once pushed to the video engine
    video_job_id: int | None = None
    meta: dict = Field(default_factory=dict)
    created_at: str = ""
    updated_at: str = ""


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS content_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    topic TEXT DEFAULT '',
    content_types TEXT DEFAULT '[]',
    background TEXT DEFAULT '',
    data_source_id INTEGER,
    template_id TEXT DEFAULT 'default',
    examples TEXT DEFAULT '',
    ref_files TEXT DEFAULT '[]',
    ref_links TEXT DEFAULT '[]',
    example_files TEXT DEFAULT '[]',
    example_links TEXT DEFAULT '[]',
    status TEXT DEFAULT 'draft',
    error TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS content_pieces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    kind TEXT DEFAULT 'blog',
    channel TEXT DEFAULT '',
    format TEXT DEFAULT '',
    title TEXT DEFAULT '',
    body TEXT DEFAULT '',
    outline TEXT DEFAULT '[]',
    caption TEXT DEFAULT '',
    content_mode TEXT DEFAULT '',
    parent_id INTEGER,
    status TEXT DEFAULT 'draft',
    idea_id INTEGER,
    video_job_id INTEGER,
    meta TEXT DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pieces_batch ON content_pieces(batch_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON content_batches(status);
"""

_BATCH_MIGRATIONS: dict[str, str] = {
    "ref_files": "TEXT DEFAULT '[]'", "ref_links": "TEXT DEFAULT '[]'",
    "example_files": "TEXT DEFAULT '[]'", "example_links": "TEXT DEFAULT '[]'",
}
_PIECE_MIGRATIONS: dict[str, str] = {}


class ContentStudioStore:
    """DB-backed home for content batches and their pieces (workspace-scoped)."""

    def __init__(self, db_path: Path | None = None):
        if db_path is None:
            from gtm_engine.config import SQLITE_PATH as _P
            db_path = _P
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        from gtm_engine.db.connection import get_connection
        conn = get_connection(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(SCHEMA_SQL)
            for table, migs in (("content_batches", _BATCH_MIGRATIONS),
                                ("content_pieces", _PIECE_MIGRATIONS)):
                existing = {r[1] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()}
                for col, decl in migs.items():
                    if col not in existing:
                        conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {decl}")
            conn.commit()

    # ── batches ──
    def create_batch(self, b: ContentBatch) -> int:
        now = datetime.now(timezone.utc).isoformat()
        b.created_at = b.created_at or now
        b.updated_at = now
        with self._connect() as conn:
            cur = conn.execute(
                """INSERT INTO content_batches (title, topic, content_types, background,
                   data_source_id, template_id, examples, ref_files, ref_links, example_files,
                   example_links, status, error, created_at, updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (b.title, b.topic, json.dumps(b.content_types), b.background, b.data_source_id,
                 b.template_id, b.examples, json.dumps(b.ref_files), json.dumps(b.ref_links),
                 json.dumps(b.example_files), json.dumps(b.example_links),
                 b.status, b.error, b.created_at, b.updated_at),
            )
            conn.commit()
            return cur.lastrowid

    def save_batch(self, b: ContentBatch) -> int:
        if not b.id:
            return self.create_batch(b)
        b.updated_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """UPDATE content_batches SET title=?, topic=?, content_types=?, background=?,
                   data_source_id=?, template_id=?, examples=?, ref_files=?, ref_links=?,
                   example_files=?, example_links=?, status=?, error=?, updated_at=?
                   WHERE id=?""",
                (b.title, b.topic, json.dumps(b.content_types), b.background, b.data_source_id,
                 b.template_id, b.examples, json.dumps(b.ref_files), json.dumps(b.ref_links),
                 json.dumps(b.example_files), json.dumps(b.example_links),
                 b.status, b.error, b.updated_at, b.id),
            )
            conn.commit()
            return b.id

    def get_batch(self, batch_id: int) -> ContentBatch | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM content_batches WHERE id=?", (batch_id,)).fetchone()
            return self._batch(row) if row else None

    def list_batches(self, limit: int = 100) -> list[ContentBatch]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM content_batches ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
            return [self._batch(r) for r in rows]

    def delete_batch(self, batch_id: int) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM content_pieces WHERE batch_id=?", (batch_id,))
            conn.execute("DELETE FROM content_batches WHERE id=?", (batch_id,))
            conn.commit()

    # ── pieces ──
    def add_piece(self, p: ContentPiece) -> int:
        now = datetime.now(timezone.utc).isoformat()
        p.created_at = p.created_at or now
        p.updated_at = now
        with self._connect() as conn:
            cur = conn.execute(
                """INSERT INTO content_pieces (batch_id, kind, channel, format, title, body,
                   outline, caption, content_mode, parent_id, status, idea_id, video_job_id,
                   meta, created_at, updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (p.batch_id, p.kind, p.channel, p.format, p.title, p.body, json.dumps(p.outline),
                 p.caption, p.content_mode, p.parent_id, p.status, p.idea_id, p.video_job_id,
                 json.dumps(p.meta), p.created_at, p.updated_at),
            )
            conn.commit()
            return cur.lastrowid

    def save_piece(self, p: ContentPiece) -> int:
        if not p.id:
            return self.add_piece(p)
        p.updated_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """UPDATE content_pieces SET kind=?, channel=?, format=?, title=?, body=?,
                   outline=?, caption=?, content_mode=?, parent_id=?, status=?, idea_id=?,
                   video_job_id=?, meta=?, updated_at=? WHERE id=?""",
                (p.kind, p.channel, p.format, p.title, p.body, json.dumps(p.outline), p.caption,
                 p.content_mode, p.parent_id, p.status, p.idea_id, p.video_job_id,
                 json.dumps(p.meta), p.updated_at, p.id),
            )
            conn.commit()
            return p.id

    def get_piece(self, piece_id: int) -> ContentPiece | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM content_pieces WHERE id=?", (piece_id,)).fetchone()
            return self._piece(row) if row else None

    def list_pieces(self, batch_id: int, kind: str | None = None) -> list[ContentPiece]:
        q, params = "SELECT * FROM content_pieces WHERE batch_id=?", [batch_id]
        if kind:
            q += " AND kind=?"; params.append(kind)
        q += " ORDER BY id ASC"
        with self._connect() as conn:
            return [self._piece(r) for r in conn.execute(q, params).fetchall()]

    def counts_by_type(self) -> dict[str, int]:
        """How many BATCHES cover each content type (for the rotation dashboard)."""
        counts = {t: 0 for t in CONTENT_TYPE_IDS}
        for b in self.list_batches(limit=500):
            for t in b.content_types:
                if t in counts:
                    counts[t] += 1
        return counts

    def piece_counts(self) -> dict[str, int]:
        """Totals by kind across all batches (blog / article / social)."""
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT kind, COUNT(*) n FROM content_pieces GROUP BY kind").fetchall()
            return {r["kind"]: r["n"] for r in rows}

    # ── row → model ──
    def _batch(self, row: sqlite3.Row) -> ContentBatch:
        keys = row.keys()
        g = lambda k, d=None: row[k] if k in keys and row[k] is not None else d
        return ContentBatch(
            id=row["id"], title=row["title"], topic=g("topic", ""),
            content_types=json.loads(g("content_types", "[]") or "[]"),
            background=g("background", ""), data_source_id=g("data_source_id"),
            template_id=g("template_id", "default"), examples=g("examples", ""),
            ref_files=json.loads(g("ref_files", "[]") or "[]"),
            ref_links=json.loads(g("ref_links", "[]") or "[]"),
            example_files=json.loads(g("example_files", "[]") or "[]"),
            example_links=json.loads(g("example_links", "[]") or "[]"),
            status=g("status", "draft"), error=g("error", ""),
            created_at=row["created_at"], updated_at=row["updated_at"],
        )

    def _piece(self, row: sqlite3.Row) -> ContentPiece:
        keys = row.keys()
        g = lambda k, d=None: row[k] if k in keys and row[k] is not None else d
        return ContentPiece(
            id=row["id"], batch_id=row["batch_id"], kind=g("kind", "blog"),
            channel=g("channel", ""), format=g("format", ""), title=g("title", ""),
            body=g("body", ""), outline=json.loads(g("outline", "[]") or "[]"),
            caption=g("caption", ""), content_mode=g("content_mode", ""),
            parent_id=g("parent_id"), status=g("status", "draft"),
            idea_id=g("idea_id"), video_job_id=g("video_job_id"),
            meta=json.loads(g("meta", "{}") or "{}"),
            created_at=row["created_at"], updated_at=row["updated_at"],
        )
