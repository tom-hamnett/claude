"""Essay Engine — the master asset.

Everything starts here. You develop ONE essay through a Socratic Q&A that pushes for
insight, it's written in a Situation–Complication–Question–Answer structure, and it carries
a required VISUAL LIBRARY (VIZ 1, VIZ 2, …) — real/uploaded where possible, else clearly
labelled 'illustrative'. Every channel derivative (reel, carousel, X thread, LinkedIn/
Substack post) is then a faithful derivative that REFERENCES those named visuals rather than
inventing its own.

Public:
  Visual, Essay (pydantic models)
  EssayStore — workspace-scoped SQLite CRUD
"""

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field


class Visual(BaseModel):
    """One named analysis graphic in an essay's visual library (VIZ 1, VIZ 2, …)."""
    model_config = ConfigDict(extra="ignore")
    id: str = ""                       # "VIZ 1" etc. (assigned on add)
    title: str = ""                    # short name, e.g. "Utilisation vs cash"
    chart_type: str = "bar chart"      # bar chart | grouped bars | line chart | big number | before/after | stacked bar
    spec: str = ""                     # the data: values, labels, the comparison
    caption: str = ""                  # short on-screen kicker
    kind: str = "illustrative"         # real | uploaded | illustrative
    image_path: str = ""               # set when kind == uploaded

    def is_illustrative(self) -> bool:
        return self.kind == "illustrative"


class Essay(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: int | None = None
    title: str
    topic: str = ""
    qa: list[dict] = Field(default_factory=list)     # [{"q":..., "a":...}]
    body: str = ""                                    # the SCQA essay (markdown)
    visuals: list[Visual] = Field(default_factory=list)
    status: str = "drafting"                          # drafting | ready | generated
    created_at: str = ""
    updated_at: str = ""

    def has_analysis(self) -> bool:
        """The mandatory gate: you can't derive channel content without at least one visual."""
        return bool(self.visuals)


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS essays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    topic TEXT DEFAULT '',
    qa TEXT DEFAULT '[]',
    body TEXT DEFAULT '',
    visuals TEXT DEFAULT '[]',
    status TEXT DEFAULT 'drafting',
    created_at TEXT,
    updated_at TEXT
);
"""
_MIGRATIONS: dict[str, str] = {}


class EssayStore:
    """DB-backed home for essays and their visual libraries (workspace-scoped)."""

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
            existing = {r[1] for r in conn.execute("PRAGMA table_info(essays)").fetchall()}
            for col, decl in _MIGRATIONS.items():
                if col not in existing:
                    conn.execute(f"ALTER TABLE essays ADD COLUMN {col} {decl}")
            conn.commit()

    def create(self, e: Essay) -> int:
        now = datetime.now(timezone.utc).isoformat()
        e.created_at = e.created_at or now
        e.updated_at = now
        with self._connect() as conn:
            cur = conn.execute(
                """INSERT INTO essays (title, topic, qa, body, visuals, status, created_at, updated_at)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (e.title, e.topic, json.dumps(e.qa), e.body,
                 json.dumps([v.model_dump() for v in e.visuals]),
                 e.status, e.created_at, e.updated_at),
            )
            conn.commit()
            return cur.lastrowid

    def save(self, e: Essay) -> int:
        if not e.id:
            return self.create(e)
        e.updated_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """UPDATE essays SET title=?, topic=?, qa=?, body=?, visuals=?, status=?, updated_at=?
                   WHERE id=?""",
                (e.title, e.topic, json.dumps(e.qa), e.body,
                 json.dumps([v.model_dump() for v in e.visuals]),
                 e.status, e.updated_at, e.id),
            )
            conn.commit()
            return e.id

    def get(self, essay_id: int) -> Essay | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM essays WHERE id=?", (essay_id,)).fetchone()
            return self._row(row) if row else None

    def list_all(self, limit: int = 100) -> list[Essay]:
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM essays ORDER BY updated_at DESC LIMIT ?",
                                (limit,)).fetchall()
            return [self._row(r) for r in rows]

    def delete(self, essay_id: int) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM essays WHERE id=?", (essay_id,))
            conn.commit()

    def _row(self, row: sqlite3.Row) -> Essay:
        keys = row.keys()
        g = lambda k, d=None: row[k] if k in keys and row[k] is not None else d
        return Essay(
            id=row["id"], title=row["title"], topic=g("topic", ""),
            qa=json.loads(g("qa", "[]") or "[]"),
            body=g("body", ""),
            visuals=[Visual(**v) for v in json.loads(g("visuals", "[]") or "[]")],
            status=g("status", "drafting"),
            created_at=g("created_at", ""), updated_at=g("updated_at", ""),
        )
