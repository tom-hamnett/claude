"""Casting — the Character and Environment libraries.

The simple, repeatable workflow: set up a small cast of characters and a
range of environments once, then per reel just pick who delivers it and
where. A Character is a reusable on-camera identity (a HeyGen avatar + voice
+ persona + default cinematic direction); an Environment is a named setting/
background. Both are workspace-scoped so each tenant has its own cast.
"""

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    persona TEXT DEFAULT '',
    avatar_id TEXT DEFAULT '',
    avatar_name TEXT DEFAULT '',
    voice_id TEXT DEFAULT '',
    voice_name TEXT DEFAULT '',
    photo_path TEXT DEFAULT '',
    cinematic_direction TEXT DEFAULT '',
    expressiveness REAL DEFAULT 0.5,
    environment_id INTEGER,
    is_default INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS environments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    background_type TEXT DEFAULT 'color',   -- color | image
    background_value TEXT DEFAULT '#0d1b2a',
    created_at TEXT NOT NULL
);
"""


class Character(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: int | None = None
    name: str
    persona: str = ""                    # who they are / how they come across
    avatar_id: str = ""                  # HeyGen avatar id
    avatar_name: str = ""
    voice_id: str = ""
    voice_name: str = ""
    photo_path: str = ""
    cinematic_direction: str = ""        # default delivery direction
    expressiveness: float = 0.5
    environment_id: int | None = None
    is_default: bool = False
    created_at: str = ""
    updated_at: str = ""

    def is_ready(self) -> bool:
        """True when this character can drive a HeyGen text→video render."""
        return bool(self.avatar_id)


class Environment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: int | None = None
    name: str
    description: str = ""
    background_type: str = "color"       # color | image
    background_value: str = "#0d1b2a"
    created_at: str = ""


# Starter cast + environments — generic, fully editable. avatar_id/voice_id are
# left blank for the user to attach once HeyGen is connected.
STARTER_CHARACTERS = [
    {"name": "The Analyst",
     "persona": "Calm, authoritative domain expert. Speaks in short, precise sentences. "
                "Credible, never salesy. The person you trust to tell you the uncomfortable truth.",
     "cinematic_direction": "Measured and direct. Steady eye contact. Lean in slightly on the key line."},
    {"name": "The Founder",
     "persona": "Warm, candid builder. Personal and human, a little wry. Talks like a smart "
                "friend who happens to know this cold.",
     "cinematic_direction": "Conversational and warm. Natural pauses. A small smile on the open and close."},
    {"name": "The Contrarian",
     "persona": "Sharp, provocative, quietly confident. Says the thing everyone thinks and "
                "nobody says. Punches at the category, never at people.",
     "cinematic_direction": "Crisp and pointed. A beat of silence before the punchline. Cool, not shouty."},
]

STARTER_ENVIRONMENTS = [
    {"name": "Dark Studio", "description": "Deep navy seamless backdrop, single key light — premium, focused.",
     "background_type": "color", "background_value": "#0d1b2a"},
    {"name": "Modern Office", "description": "Soft-blurred contemporary office, warm daylight.",
     "background_type": "color", "background_value": "#1b2e44"},
    {"name": "Minimal Light", "description": "Clean off-white wall, bright and neutral — approachable.",
     "background_type": "color", "background_value": "#eef2f7"},
    {"name": "Authority / Bookshelf", "description": "Blurred bookshelf, lamp-lit — expert, considered.",
     "background_type": "color", "background_value": "#241d18"},
    {"name": "Newsroom", "description": "Cool blue-grey set with subtle depth — timely, credible.",
     "background_type": "color", "background_value": "#152638"},
]


class CastingStore:
    """Workspace-scoped store for characters + environments."""

    def __init__(self, db_path: Path | None = None):
        from gtm_engine.config import SQLITE_PATH
        self.db_path = db_path or SQLITE_PATH
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
            conn.commit()

    # ── environments ──
    def list_environments(self) -> list[Environment]:
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM environments ORDER BY id").fetchall()
            return [Environment(**dict(r)) for r in rows]

    def save_environment(self, env: Environment) -> int:
        with self._connect() as conn:
            if env.id:
                conn.execute(
                    "UPDATE environments SET name=?, description=?, background_type=?, background_value=? WHERE id=?",
                    (env.name, env.description, env.background_type, env.background_value, env.id),
                )
                conn.commit()
                return env.id
            cur = conn.execute(
                "INSERT INTO environments (name, description, background_type, background_value, created_at) VALUES (?,?,?,?,?)",
                (env.name, env.description, env.background_type, env.background_value,
                 datetime.now(timezone.utc).isoformat()),
            )
            conn.commit()
            return cur.lastrowid

    def get_environment(self, env_id: int) -> Environment | None:
        with self._connect() as conn:
            r = conn.execute("SELECT * FROM environments WHERE id=?", (env_id,)).fetchone()
            return Environment(**dict(r)) if r else None

    # ── characters ──
    def list_characters(self) -> list[Character]:
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM characters ORDER BY is_default DESC, id").fetchall()
            return [self._char(r) for r in rows]

    def get_character(self, char_id: int) -> Character | None:
        with self._connect() as conn:
            r = conn.execute("SELECT * FROM characters WHERE id=?", (char_id,)).fetchone()
            return self._char(r) if r else None

    def get_default_character(self) -> Character | None:
        chars = self.list_characters()
        for c in chars:
            if c.is_default:
                return c
        return chars[0] if chars else None

    def save_character(self, ch: Character) -> int:
        now = datetime.now(timezone.utc).isoformat()
        if not ch.created_at:
            ch.created_at = now
        ch.updated_at = now
        with self._connect() as conn:
            if ch.is_default:  # only one default
                conn.execute("UPDATE characters SET is_default=0")
            vals = (ch.name, ch.persona, ch.avatar_id, ch.avatar_name, ch.voice_id,
                    ch.voice_name, ch.photo_path, ch.cinematic_direction, ch.expressiveness,
                    ch.environment_id, 1 if ch.is_default else 0, ch.created_at, ch.updated_at)
            if ch.id:
                conn.execute(
                    """UPDATE characters SET name=?, persona=?, avatar_id=?, avatar_name=?,
                       voice_id=?, voice_name=?, photo_path=?, cinematic_direction=?,
                       expressiveness=?, environment_id=?, is_default=?, created_at=?, updated_at=?
                       WHERE id=?""",
                    (*vals, ch.id),
                )
                conn.commit()
                return ch.id
            cur = conn.execute(
                """INSERT INTO characters (name, persona, avatar_id, avatar_name, voice_id,
                   voice_name, photo_path, cinematic_direction, expressiveness, environment_id,
                   is_default, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                vals,
            )
            conn.commit()
            return cur.lastrowid

    def delete_character(self, char_id: int) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM characters WHERE id=?", (char_id,))
            conn.commit()

    def seed_if_empty(self) -> None:
        """Populate the starter cast + environments if none exist yet."""
        if not self.list_environments():
            for e in STARTER_ENVIRONMENTS:
                self.save_environment(Environment(**e))
        if not self.list_characters():
            envs = self.list_environments()
            default_env = envs[0].id if envs else None
            for i, c in enumerate(STARTER_CHARACTERS):
                self.save_character(Character(
                    environment_id=default_env, is_default=(i == 0), **c))

    def _char(self, row: sqlite3.Row) -> Character:
        d = dict(row)
        d["is_default"] = bool(d.get("is_default"))
        return Character(**d)
