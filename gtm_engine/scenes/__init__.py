"""Scene Library — reusable environments separate from characters.

A Scene is a locked situation/environment that can be combined with any
character. Keeping scenes and characters separate means you can:

- Add new characters without regenerating all your scenes
- Add new scenes without regenerating all your characters
- Reference "The Zenith Hotel Lobby" by id from any idea

Each scene has:
- Environment prompt (text description)
- Start frame prompt + end frame prompt (for Nano Banana 2 stills)
- Animation directive (for Veo 3.1 startFrame)
- Optional reference images uploaded by the user
- Narrative purpose (which Core-Five slot it fits best)
"""

import json
import logging
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

from gtm_engine.config import SQLITE_PATH, DATA_DIR

logger = logging.getLogger(__name__)

SCENES_DIR = DATA_DIR.parent / "references" / "scenes"
SCENES_DIR.mkdir(parents=True, exist_ok=True)

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    environment_prompt TEXT,
    start_frame_prompt TEXT,
    end_frame_prompt TEXT,
    animation_directive TEXT,
    narrative_purpose TEXT,
    best_for_segments TEXT,  -- JSON array of Core-Five segment ids
    reference_images TEXT,    -- JSON array of paths
    locked INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"""


class Scene(BaseModel):
    """A reusable environment/situation."""
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    description: str = ""
    environment_prompt: str = ""
    start_frame_prompt: str = ""
    end_frame_prompt: str = ""
    animation_directive: str = ""
    narrative_purpose: str = ""  # e.g. "hook" / "bookend" / "pivot"
    best_for_segments: list[str] = Field(default_factory=list)
    reference_images: list[str] = Field(default_factory=list)
    locked: bool = False
    created_at: str = ""
    updated_at: str = ""


# --- Seed the initial three locked scenes from the Theo manifest ---

INITIAL_SCENES = [
    {
        "id": "executive_reflection_pool",
        "name": "The Executive Reflection Pool",
        "description": "A CEO corner office where the floor is a millimeter-deep pool of black water.",
        "narrative_purpose": "High-authority Hook or Pivot",
        "best_for_segments": ["hook", "bookend"],
        "environment_prompt": "A massive, sprawling, futuristic CEO corner office. The floor is covered in a millimeter-deep, perfectly still pool of reflective black water. Furniture hovers exactly one inch above the water. Floor-to-ceiling windows reveal a hazy cyberpunk metropolis at twilight. Massive dark obsidian desk. Architectural digest scale.",
        "start_frame_prompt": "Cinematic ultra-wide shot using a 16mm lens. Massive futuristic CEO corner office with a millimeter-deep reflective black water floor. Character sits powerfully on a minimalist brass-and-leather sofa hovering one inch above the water. Floor-to-ceiling windows reveal a cyberpunk metropolis at twilight. Moody corporate lighting, hyper-realistic, 8k.",
        "end_frame_prompt": "Cinematic medium-wide shot. Character leaning aggressively forward, elbows on knees, hands steepled. The reflection in the black water remains flawless. High-contrast corporate lighting.",
        "animation_directive": "4-second slow creeping push-in dolly shot. Character shifts weight forward fluidly. Water on the floor remains perfectly still with no ripples.",
        "locked": True,
    },
    {
        "id": "zenith_hotel_lobby",
        "name": "The Zenith Hotel Lobby",
        "description": "A breathtaking corporate hotel atrium fusing brutalism with synthetic biology.",
        "narrative_purpose": "Grounded Agitation or Transition",
        "best_for_segments": ["tension", "pivot"],
        "environment_prompt": "A sprawling hyper-luxurious corporate atrium. Vast walls of seamless white marble. Massive, perfectly symmetrical geometric trees made of translucent bioluminescent frosted glass emitting a warm amber glow. Tiny synthetic fireflies drift in grid patterns. Impossibly high ceilings. Architectural digest scale.",
        "start_frame_prompt": "Cinematic full-body ultra-wide shot, 24mm lens. Character walking confidently down the center of the Zenith Hotel Lobby. Vast white marble walls. Flanking trees of bioluminescent frosted glass emitting warm amber glow. Synthetic fireflies in grid patterns. 8k photorealistic.",
        "end_frame_prompt": "Cinematic medium shot, waist up. Character mid-stride walking toward viewer. Warm amber light reflects off character. Dynamic momentum.",
        "animation_directive": "4-second smooth Steadicam tracking shot moving backward as character walks forward. Glass trees pass through foreground creating parallax.",
        "locked": True,
    },
    {
        "id": "chronos_vip_lounge",
        "name": "The Chronos VIP Lounge",
        "description": "A windowless ultra-elite private club with a reverse-gravity liquid gold chandelier.",
        "narrative_purpose": "Outcome or Bookend CTA",
        "best_for_segments": ["bookend", "proof"],
        "environment_prompt": "A windowless ultra-elite private club. Deep ribbed velvet walls, acoustically deadened. Massive abstract kinetic chandelier of glowing liquid gold droplets suspended in mid-air in reverse gravity. Deep emerald-green velvet curved sofa. Warm gold light.",
        "start_frame_prompt": "Cinematic wide interior shot. Deeply cavernous lounge. Character lounging in a relaxed but dominant posture on a deep plush emerald-green velvet curved sofa. Dark ribbed velvet walls. Massive kinetic chandelier of glowing liquid gold droplets overhead. Warm gold light catches reflections. 8k opulent.",
        "end_frame_prompt": "Cinematic medium close-up. Character addressing the lens directly, one hand raised in open-palm gesture. Liquid gold droplets higher toward ceiling. Deep shadows, rich velvet textures.",
        "animation_directive": "4-second luxurious orbital pan around the sofa. Character turns head smoothly to address camera. Liquid gold droplets drip UPWARD toward ceiling in reverse gravity.",
        "locked": True,
    },
]


class SceneLibrary:
    def __init__(self, db_path: Path | None = None):
        self.db_path = db_path or SQLITE_PATH
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
            conn.commit()

    def seed_if_empty(self) -> int:
        """Seed the three initial locked scenes if the library is empty."""
        with self._connect() as conn:
            existing = conn.execute("SELECT COUNT(*) FROM scenes").fetchone()[0]
            if existing > 0:
                return 0

        for scene_data in INITIAL_SCENES:
            self.create(Scene(**scene_data))
        logger.info("Seeded %d initial scenes", len(INITIAL_SCENES))
        return len(INITIAL_SCENES)

    def create(self, scene: Scene) -> str:
        now = datetime.now(timezone.utc).isoformat()
        if not scene.created_at:
            scene.created_at = now
        scene.updated_at = now

        # Ensure directory exists for reference images
        (SCENES_DIR / scene.id).mkdir(parents=True, exist_ok=True)

        with self._connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO scenes (
                    id, name, description, environment_prompt,
                    start_frame_prompt, end_frame_prompt, animation_directive,
                    narrative_purpose, best_for_segments, reference_images,
                    locked, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    scene.id, scene.name, scene.description, scene.environment_prompt,
                    scene.start_frame_prompt, scene.end_frame_prompt, scene.animation_directive,
                    scene.narrative_purpose,
                    json.dumps(scene.best_for_segments),
                    json.dumps(scene.reference_images),
                    1 if scene.locked else 0,
                    scene.created_at, scene.updated_at,
                ),
            )
            conn.commit()
        return scene.id

    def get(self, scene_id: str) -> Scene | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM scenes WHERE id = ?", (scene_id,)).fetchone()
            return self._row_to_scene(row) if row else None

    def list_all(self) -> list[Scene]:
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM scenes ORDER BY locked DESC, name").fetchall()
            return [self._row_to_scene(r) for r in rows]

    def list_for_segment(self, segment_id: str) -> list[Scene]:
        """Return scenes that are best suited for a given Core-Five segment."""
        return [s for s in self.list_all() if segment_id in s.best_for_segments]

    def attach_reference_image(self, scene_id: str, image_path: str) -> None:
        scene = self.get(scene_id)
        if not scene:
            return
        if image_path not in scene.reference_images:
            scene.reference_images.append(image_path)
        scene.updated_at = datetime.now(timezone.utc).isoformat()
        self.create(scene)

    def delete(self, scene_id: str) -> None:
        """Delete a scene (only if not locked)."""
        scene = self.get(scene_id)
        if scene and scene.locked:
            raise PermissionError(f"Scene {scene_id} is locked and cannot be deleted")
        with self._connect() as conn:
            conn.execute("DELETE FROM scenes WHERE id = ?", (scene_id,))
            conn.commit()

    def _row_to_scene(self, row: sqlite3.Row) -> Scene:
        return Scene(
            id=row["id"],
            name=row["name"],
            description=row["description"] or "",
            environment_prompt=row["environment_prompt"] or "",
            start_frame_prompt=row["start_frame_prompt"] or "",
            end_frame_prompt=row["end_frame_prompt"] or "",
            animation_directive=row["animation_directive"] or "",
            narrative_purpose=row["narrative_purpose"] or "",
            best_for_segments=json.loads(row["best_for_segments"] or "[]"),
            reference_images=json.loads(row["reference_images"] or "[]"),
            locked=bool(row["locked"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
