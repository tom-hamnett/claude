"""Essay Engine — the master asset (build brief v2).

A repeatable, AI-assisted engine that takes a topic through an adaptive wave pipeline —
intake → comprehension/research → provocation hunt → evidence dig → personality layer →
five-beat draft → human-voice pass → derivatives. It EXTRACTS from Tom and PROPOSES from
its own research, so he's never blocked by a question he can't answer. Every channel
derivative references the essay's named visual library rather than inventing graphics.

Public: Visual, Essay (models), EssayStore (workspace-scoped SQLite CRUD).
"""

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

# Provenance — lets Tom see how much of the essay is genuinely his.
PROV_TOM = "tom"
PROV_PROPOSED = "engine_proposed"
PROV_APPROVED = "engine_proposed_tom_approved"

AI_MODES = ("led", "adjacent", "none")
STATUSES = ("intake", "research", "wave1", "wave2", "wave3", "draft", "final")


class Visual(BaseModel):
    """One named analysis graphic (VIZ 1, VIZ 2, …) — the essay's evidence, shown where it
    proves a point. Peppered through the argument, never a single block."""
    model_config = ConfigDict(extra="ignore")
    id: str = ""
    title: str = ""
    claim: str = ""                    # the specific claim this piece proves
    chart_type: str = "bar chart"      # bar chart | column | table | word cloud | scatter/quadrant | single-stat | before/after
    spec: str = ""                     # the data: values, labels, comparison
    caption: str = ""
    source: str = ""                   # where the data came from
    kind: str = "illustrative"         # real | uploaded | illustrative
    provenance: str = PROV_PROPOSED
    image_path: str = ""

    def is_illustrative(self) -> bool:
        return self.kind == "illustrative"


class Essay(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: int | None = None
    title: str
    topic: str = ""
    status: str = "intake"
    ai_mode: str = "adjacent"                          # led | adjacent | none

    # intake
    brain_dump: list[str] = Field(default_factory=list)   # raw, incl. voice transcripts
    exclusions: list[str] = Field(default_factory=list)   # what it must NOT be about
    uploads: list[str] = Field(default_factory=list)

    # research (wave zero) — labelled Pole A (prestige) / Pole B (raw)
    research: dict = Field(default_factory=dict)          # {comprehension, standard_practice, pole_a[], pole_b[], gaps[]}

    # provocation (wave one) / personality (wave three)
    provocation: dict = Field(default_factory=dict)       # {wrong_belief, twist, surprises[], common_errors[]}
    personality: dict = Field(default_factory=dict)       # {incredulity, sarcasm_targets[], references[], disqualified_reference}

    # evidence (wave two) lives in the visual library
    visuals: list[Visual] = Field(default_factory=list)

    # output
    draft: str = ""                                       # raw five-beat draft
    body: str = ""                                        # final essay after the human-voice pass
    derivatives: dict = Field(default_factory=dict)       # {linkedin, x, carousel, reel, pullquotes[]}
    provenance: dict = Field(default_factory=dict)        # field -> tom | engine_proposed | ...

    created_at: str = ""
    updated_at: str = ""

    def has_analysis(self) -> bool:
        return bool(self.visuals)

    def _state(self) -> dict:
        return {k: getattr(self, k) for k in _STATE_FIELDS}


# The structured fields we stash in the single `state` JSON column (module-level so pydantic
# doesn't treat it as a private attribute).
_STATE_FIELDS = ("ai_mode", "brain_dump", "exclusions", "uploads", "research",
                 "provocation", "personality", "draft", "provenance")


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS essays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    topic TEXT DEFAULT '',
    status TEXT DEFAULT 'intake',
    body TEXT DEFAULT '',
    visuals TEXT DEFAULT '[]',
    derivatives TEXT DEFAULT '{}',
    state TEXT DEFAULT '{}',
    created_at TEXT,
    updated_at TEXT
);
"""
# Older DBs shipped with a leaner schema — bring them up idempotently.
_MIGRATIONS: dict[str, str] = {
    "status": "TEXT DEFAULT 'intake'", "derivatives": "TEXT DEFAULT '{}'",
    "state": "TEXT DEFAULT '{}'",
}


class EssayStore:
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
                """INSERT INTO essays (title, topic, status, body, visuals, derivatives, state,
                   created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)""",
                (e.title, e.topic, e.status, e.body,
                 json.dumps([v.model_dump() for v in e.visuals]), json.dumps(e.derivatives),
                 json.dumps(e._state()), e.created_at, e.updated_at))
            conn.commit()
            return cur.lastrowid

    def save(self, e: Essay) -> int:
        if not e.id:
            return self.create(e)
        e.updated_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """UPDATE essays SET title=?, topic=?, status=?, body=?, visuals=?, derivatives=?,
                   state=?, updated_at=? WHERE id=?""",
                (e.title, e.topic, e.status, e.body,
                 json.dumps([v.model_dump() for v in e.visuals]), json.dumps(e.derivatives),
                 json.dumps(e._state()), e.updated_at, e.id))
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
        state = json.loads(g("state", "{}") or "{}")
        return Essay(
            id=row["id"], title=row["title"], topic=g("topic", ""),
            status=g("status", "intake"), body=g("body", ""),
            visuals=[Visual(**v) for v in json.loads(g("visuals", "[]") or "[]")],
            derivatives=json.loads(g("derivatives", "{}") or "{}"),
            created_at=g("created_at", ""), updated_at=g("updated_at", ""),
            **{k: state.get(k) for k in _STATE_FIELDS if k in state},
        )
