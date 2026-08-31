"""Video Job layer — turns an approved Producer Brief into an avatar reel.

This is the PRODUCE step of the pipeline (Approve -> Produce -> Review):

  1. create_job_from_brief(idea_id)
     Reads the producer brief, pulls the Hook + Bookend spoken lines (the
     only segments the avatar appears in), and creates a VideoJob.

  2. render_job(job_id, audio_path=None)
     Loads the saved AvatarConfig + provider and renders the avatar clip.
       - voice_clone mode -> HeyGen speaks the script in the cloned voice
       - record mode      -> uploads audio_path, avatar lip-syncs your take
       - hybrid           -> record if audio given, else voice clone
     If no provider is configured it produces a DRY RUN: the job is stored
     with the exact request it *would* send, so the UI stays fully usable
     without a key.

  3. apply_revision(job_id, note)
     Free-text review. Claude classifies the note and either rewrites the
     script (re-render needed), adjusts delivery params (re-render from the
     same audio), or routes a visual note to the (non-avatar) editor. Every
     revision is logged on the job.

Only the Hook + Bookend (~8s) are rendered as avatar footage; the middle
Core-Five segments are product screens / data-viz assembled separately.
"""

import json
import logging
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

from gtm_engine.config import OUTPUT_DIR
from gtm_engine.avatar import (
    AvatarConfig, AvatarConfigStore, RenderRequest, get_provider,
)

logger = logging.getLogger(__name__)

# Rough talking-head budget: ~2.5 words/sec over a 4s segment ≈ 10 words.
WORDS_PER_SEGMENT_MAX = 14
FORBIDDEN = [
    "game-changer", "game changer", "revolutionary", "disruptive",
    "innovative", "cutting-edge", "unlock", "synergy",
]

STATUSES = ["needs_provider", "needs_input", "queued", "rendering", "ready", "failed", "approved"]

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS video_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idea_id INTEGER NOT NULL,
    brief_id INTEGER,
    status TEXT NOT NULL DEFAULT 'queued',
    provider TEXT DEFAULT 'none',
    avatar_id TEXT DEFAULT '',
    voice_id TEXT DEFAULT '',
    mode TEXT DEFAULT 'voice_clone',
    hook_text TEXT DEFAULT '',
    bookend_text TEXT DEFAULT '',
    motion_prompt TEXT DEFAULT '',
    expressiveness REAL DEFAULT 0.5,
    audio_asset_id TEXT DEFAULT '',
    video_path TEXT DEFAULT '',
    dry_run_request TEXT DEFAULT '',
    qa_issues TEXT DEFAULT '[]',
    revisions TEXT DEFAULT '[]',
    script_approved INTEGER DEFAULT 0,
    driving_video_path TEXT DEFAULT '',
    character_image_path TEXT DEFAULT '',
    engine TEXT DEFAULT 'audio',
    environment_id INTEGER,
    camera_note TEXT DEFAULT '',
    hook_type TEXT DEFAULT 'rotate',
    tone TEXT DEFAULT '',
    passion REAL DEFAULT 0.5,
    own_hook TEXT DEFAULT '',
    error TEXT DEFAULT '',
    look_id INTEGER,
    assembly_json TEXT DEFAULT '{}',
    script_override TEXT DEFAULT '',
    cinematic_prompt TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_video_jobs_idea ON video_jobs(idea_id);
"""

# Columns added after video_jobs first shipped — applied idempotently.
_JOB_MIGRATIONS = {
    "script_approved": "INTEGER DEFAULT 0",
    "driving_video_path": "TEXT DEFAULT ''",
    "character_image_path": "TEXT DEFAULT ''",
    "engine": "TEXT DEFAULT 'audio'",
    "environment_id": "INTEGER",
    "camera_note": "TEXT DEFAULT ''",
    "hook_type": "TEXT DEFAULT 'rotate'",
    "tone": "TEXT DEFAULT ''",
    "passion": "REAL DEFAULT 0.5",
    "own_hook": "TEXT DEFAULT ''",
    "error": "TEXT DEFAULT ''",
    "look_id": "INTEGER",
    "assembly_json": "TEXT DEFAULT '{}'",
    "script_override": "TEXT DEFAULT ''",
    "cinematic_prompt": "TEXT DEFAULT ''",
}


class VideoJob(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: int | None = None
    idea_id: int
    brief_id: int | None = None
    status: str = "queued"
    provider: str = "none"
    avatar_id: str = ""
    voice_id: str = ""
    mode: str = "voice_clone"
    hook_text: str = ""
    bookend_text: str = ""
    motion_prompt: str = ""
    expressiveness: float = 0.5
    audio_asset_id: str = ""
    video_path: str = ""
    dry_run_request: str = ""
    qa_issues: list[str] = Field(default_factory=list)
    revisions: list[dict] = Field(default_factory=list)
    script_approved: bool = False
    driving_video_path: str = ""
    character_image_path: str = ""
    engine: str = "audio"                # audio | transfer
    environment_id: int | None = None    # per-reel environment (overrides character)
    camera_note: str = ""                # per-reel camera direction (used in assembly)
    hook_type: str = "rotate"            # hook archetype id, or 'rotate'
    tone: str = ""                       # sharp | measured | warm | ...
    passion: float = 0.5                 # 0 calm .. 1 fired-up
    own_hook: str = ""                   # user-written hook (verbatim), optional
    error: str = ""                      # last render error, for display
    look_id: int | None = None           # chosen look (character's Look Library)
    assembly_json: str = "{}"            # auto-assembler state (segment clips/methods)
    script_override: str = ""            # hand-edited full narration (verbatim), optional
    cinematic_prompt: str = ""           # per-reel cinematic scene direction (Seedance)
    created_at: str = ""
    updated_at: str = ""

    @property
    def spoken_script(self) -> str:
        return " ".join(x for x in (self.hook_text, self.bookend_text) if x).strip()


class VideoJobStore:
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
            existing = {r[1] for r in conn.execute("PRAGMA table_info(video_jobs)")}
            for col, decl in _JOB_MIGRATIONS.items():
                if col not in existing:
                    conn.execute(f"ALTER TABLE video_jobs ADD COLUMN {col} {decl}")
            conn.commit()

    def save(self, job: VideoJob) -> int:
        now = datetime.now(timezone.utc).isoformat()
        if not job.created_at:
            job.created_at = now
        job.updated_at = now
        cols = (
            job.idea_id, job.brief_id, job.status, job.provider, job.avatar_id,
            job.voice_id, job.mode, job.hook_text, job.bookend_text, job.motion_prompt,
            job.expressiveness, job.audio_asset_id, job.video_path, job.dry_run_request,
            json.dumps(job.qa_issues), json.dumps(job.revisions),
            1 if job.script_approved else 0, job.driving_video_path,
            job.character_image_path, job.engine, job.environment_id, job.camera_note,
            job.hook_type, job.tone, job.passion, job.own_hook, job.error,
            job.look_id, job.assembly_json, job.script_override, job.cinematic_prompt,
            job.created_at, job.updated_at,
        )
        with self._connect() as conn:
            if job.id:
                conn.execute(
                    """UPDATE video_jobs SET idea_id=?, brief_id=?, status=?, provider=?,
                       avatar_id=?, voice_id=?, mode=?, hook_text=?, bookend_text=?,
                       motion_prompt=?, expressiveness=?, audio_asset_id=?, video_path=?,
                       dry_run_request=?, qa_issues=?, revisions=?, script_approved=?,
                       driving_video_path=?, character_image_path=?, engine=?,
                       environment_id=?, camera_note=?, hook_type=?, tone=?, passion=?, own_hook=?,
                       error=?, look_id=?, assembly_json=?, script_override=?, cinematic_prompt=?,
                       created_at=?, updated_at=? WHERE id=?""",
                    (*cols, job.id),
                )
                conn.commit()
                return job.id
            cur = conn.execute(
                """INSERT INTO video_jobs (idea_id, brief_id, status, provider, avatar_id,
                   voice_id, mode, hook_text, bookend_text, motion_prompt, expressiveness,
                   audio_asset_id, video_path, dry_run_request, qa_issues, revisions,
                   script_approved, driving_video_path, character_image_path, engine,
                   environment_id, camera_note, hook_type, tone, passion, own_hook, error,
                   look_id, assembly_json, script_override, cinematic_prompt,
                   created_at, updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                cols,
            )
            conn.commit()
            return cur.lastrowid

    def get(self, job_id: int) -> VideoJob | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM video_jobs WHERE id=?", (job_id,)).fetchone()
            return self._row(row) if row else None

    def get_for_idea(self, idea_id: int) -> VideoJob | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM video_jobs WHERE idea_id=? ORDER BY created_at DESC LIMIT 1",
                (idea_id,),
            ).fetchone()
            return self._row(row) if row else None

    def _row(self, row: sqlite3.Row) -> VideoJob:
        keys = row.keys()
        def g(k, d=""):
            return row[k] if k in keys and row[k] is not None else d
        return VideoJob(
            id=row["id"], idea_id=row["idea_id"], brief_id=row["brief_id"],
            status=row["status"], provider=row["provider"], avatar_id=row["avatar_id"],
            voice_id=row["voice_id"], mode=row["mode"], hook_text=row["hook_text"],
            bookend_text=row["bookend_text"], motion_prompt=row["motion_prompt"],
            expressiveness=row["expressiveness"] if row["expressiveness"] is not None else 0.5,
            audio_asset_id=row["audio_asset_id"], video_path=row["video_path"],
            dry_run_request=row["dry_run_request"],
            qa_issues=json.loads(row["qa_issues"] or "[]"),
            revisions=json.loads(row["revisions"] or "[]"),
            script_approved=bool(g("script_approved", 0)),
            driving_video_path=g("driving_video_path", ""),
            character_image_path=g("character_image_path", ""),
            engine=g("engine", "audio") or "audio",
            environment_id=g("environment_id", None),
            camera_note=g("camera_note", "") or "",
            hook_type=g("hook_type", "rotate") or "rotate",
            tone=g("tone", "") or "",
            passion=g("passion", 0.5) if g("passion", 0.5) is not None else 0.5,
            own_hook=g("own_hook", "") or "",
            error=g("error", "") or "",
            look_id=g("look_id", None),
            assembly_json=g("assembly_json", "{}") or "{}",
            script_override=g("script_override", "") or "",
            cinematic_prompt=g("cinematic_prompt", "") or "",
            created_at=row["created_at"], updated_at=row["updated_at"],
        )


# ── Audio extraction (video take -> wav for HeyGen) ──────────────────────────

AUDIO_EXTS = {".mp3", ".wav"}
VIDEO_EXTS = {".mp4", ".mov", ".webm", ".m4a", ".aac", ".mkv"}


def extract_audio(src: Path) -> Path | None:
    """Extract a HeyGen-friendly wav from a video/other file. None on failure.

    Uses the ffmpeg binary bundled by imageio-ffmpeg, so it works on hosts
    (e.g. Streamlit Cloud) with no system ffmpeg.
    """
    src = Path(src)
    if not src.exists():
        return None
    try:
        import subprocess
        import imageio_ffmpeg
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        out = src.with_suffix(".extracted.wav")
        subprocess.run(
            [ffmpeg, "-y", "-i", str(src), "-vn",
             "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "1", str(out)],
            check=True, capture_output=True,
        )
        return out if out.exists() and out.stat().st_size > 0 else None
    except Exception as e:
        logger.error("Audio extraction failed for %s: %s", src, e)
        return None


def resolve_audio_take(src: Path) -> Path | None:
    """Return a HeyGen-ready audio file: pass mp3/wav through, else extract."""
    src = Path(src)
    if src.suffix.lower() in AUDIO_EXTS:
        return src
    return extract_audio(src)


# ── QA ──────────────────────────────────────────────────────────────────────

def run_qa(hook_text: str, bookend_text: str) -> list[str]:
    """Brand/technical QA on the avatar-spoken lines. Returns a list of issues."""
    issues: list[str] = []
    for label, text in (("Hook", hook_text), ("Bookend", bookend_text)):
        if not text.strip():
            issues.append(f"{label} line is empty.")
            continue
        wc = len(text.split())
        if wc > WORDS_PER_SEGMENT_MAX:
            issues.append(f"{label} is {wc} words — trim to ≤{WORDS_PER_SEGMENT_MAX} to fit ~4s.")
        low = text.lower()
        for bad in FORBIDDEN:
            if bad in low:
                issues.append(f"{label} uses a forbidden phrase: '{bad}'.")
    return issues


# ── Look selection ────────────────────────────────────────────────────────────

_LOOK_SYSTEM = """You are a creative director casting the right WARDROBE/SETTING (a "look")
for one short vertical social video. You are given the reel's hook + closing line, its
tone, and a numbered list of available looks (each a short description of wardrobe,
setting and vibe). Pick the single look that best fits the energy and subject of THIS
reel. Match a sharp/provocative reel to a bolder look, a warm/human reel to a softer
one, an authoritative/analytical reel to a more formal one.

Return ONLY a JSON object:
{"look_number": <the number of the best look>, "rationale": "<one short sentence why>"}"""


def suggest_look(job: "VideoJob", looks: list) -> tuple[int | None, str]:
    """Ask Claude which look best fits this reel. Returns (look_id, rationale).

    Falls back to the first look (no rationale) if the model is unavailable or
    the response can't be parsed — so a look is always chosen when any exist.
    """
    if not looks:
        return None, ""
    if len(looks) == 1:
        return looks[0].id, "Only look available."
    try:
        from gtm_engine.utils.ai_client import call_claude
        catalogue = "\n".join(
            f"{i+1}. {lk.name or 'Look'} — {lk.description or '(no description)'}"
            for i, lk in enumerate(looks)
        )
        prompt = (
            f"HOOK: {job.hook_text}\n"
            f"CLOSING: {job.bookend_text}\n"
            f"TONE: {job.tone or 'default'} | PASSION: {job.passion}\n\n"
            f"AVAILABLE LOOKS:\n{catalogue}\n\nReturn ONLY the JSON."
        )
        raw = call_claude(prompt, system=_LOOK_SYSTEM, max_tokens=300)
        s, e = raw.find("{"), raw.rfind("}")
        data = json.loads(raw[s : e + 1]) if s != -1 and e != -1 else {}
        n = int(data.get("look_number", 0))
        if 1 <= n <= len(looks):
            return looks[n - 1].id, str(data.get("rationale", "")).strip()
    except Exception as exc:
        logger.info("suggest_look fell back to first look: %s", exc)
    return looks[0].id, ""


# ── Build / render ────────────────────────────────────────────────────────────

def create_job_from_brief(idea_id: int) -> VideoJob | None:
    """Create (or refresh) a VideoJob from the idea's latest producer brief."""
    from gtm_engine.producer import ProducerBriefLibrary

    brief = ProducerBriefLibrary().get_for_idea(idea_id)
    if not brief:
        logger.error("No producer brief for idea %d; generate one first.", idea_id)
        return None

    segs = brief.segments_json or {}
    hook_text = (segs.get("hook", {}) or {}).get("spoken_text", "").strip()
    bookend_text = (segs.get("bookend", {}) or {}).get("spoken_text", "").strip()
    # Fall back to splitting the full script if segments are missing.
    if not hook_text and brief.spoken_script:
        hook_text = brief.spoken_script.split(".")[0].strip()
    if not bookend_text and brief.spoken_script:
        bookend_text = brief.spoken_script.split(".")[-1].strip()

    cfg = AvatarConfigStore().load()
    store = VideoJobStore()
    existing = store.get_for_idea(idea_id)

    # Resolve the active character from the Casting library (avatar + voice + env).
    character = None
    try:
        from gtm_engine.casting import CastingStore
        cs = CastingStore()
        cs.seed_if_empty()
        character = cs.get_default_character()
    except Exception:
        character = None

    job = existing or VideoJob(idea_id=idea_id)
    job.brief_id = brief.id
    job.provider = cfg.provider
    job.mode = cfg.mode
    job.hook_text = hook_text
    job.bookend_text = bookend_text
    job.engine = "transfer" if (cfg.provider == "runway" or cfg.mode == "transfer") else "audio"

    if character:
        job.avatar_id = character.avatar_id or cfg.avatar_id
        job.voice_id = character.voice_id or cfg.voice_id
        job.expressiveness = character.expressiveness
        # Per-reel direction: seed from the character, but keep any the user
        # already set on an existing job so refines don't wipe their edits.
        if not (existing and existing.motion_prompt):
            job.motion_prompt = character.cinematic_direction or brief.voice_directive
        if not (existing and existing.environment_id):
            job.environment_id = character.environment_id
        job.character_image_path = character.photo_path or cfg.character_image_path
        # Auto-cast a look from the character's Look Library (keep any the user
        # already chose on an existing job).
        if not (existing and existing.look_id):
            try:
                looks = cs.list_looks(character.id) if character.id else []
                if looks:
                    job.look_id, _ = suggest_look(job, looks)
            except Exception:
                pass
    else:
        job.avatar_id = cfg.avatar_id
        job.voice_id = cfg.voice_id
        job.expressiveness = cfg.expressiveness
        job.motion_prompt = cfg.motion_prompt or brief.voice_directive
        job.character_image_path = cfg.character_image_path

    # Ready when the provider can run with what this character supplies.
    if cfg.provider in ("", "none"):
        ready = False
    elif cfg.provider == "mock":
        ready = True
    elif cfg.provider == "runway":
        ready = bool(job.character_image_path)
    else:  # heygen etc. — needs an avatar id
        ready = bool(job.avatar_id)

    job.qa_issues = run_qa(hook_text, bookend_text)
    job.status = "queued" if ready else "needs_provider"
    job.id = store.save(job)
    return job


def update_job_production(job_id: int, motion_prompt: str | None = None,
                          environment_id: int | None = None,
                          camera_note: str | None = None,
                          hook_type: str | None = None, tone: str | None = None,
                          passion: float | None = None,
                          own_hook: str | None = None,
                          look_id: int | None = None,
                          script_override: str | None = None,
                          cinematic_prompt: str | None = None) -> VideoJob | None:
    """Save per-reel direction (motion, environment, camera, hook, tone, passion,
    own-hook, look, hand-edited script). Only provided fields are updated. Pass
    look_id=0 to clear the look back to Auto; script_override='' to clear it."""
    store = VideoJobStore()
    job = store.get(job_id)
    if not job:
        return None
    if motion_prompt is not None:
        job.motion_prompt = motion_prompt
    if environment_id is not None:
        job.environment_id = environment_id or None
    if camera_note is not None:
        job.camera_note = camera_note
    if hook_type is not None:
        job.hook_type = hook_type
    if tone is not None:
        job.tone = tone
    if passion is not None:
        job.passion = passion
    if own_hook is not None:
        job.own_hook = own_hook
    if look_id is not None:
        job.look_id = look_id or None
    if script_override is not None:
        job.script_override = script_override
    if cinematic_prompt is not None:
        job.cinematic_prompt = cinematic_prompt
    job.id = store.save(job)
    return store.get(job.id)


def regenerate_script(job_id: int, refinement: str = "") -> VideoJob | None:
    """Rewrite the script for a job using its stored direction (hook/tone/
    passion/own-hook), then refresh the job's Hook/Bookend from the new brief."""
    from gtm_engine.producer import generate_producer_brief
    store = VideoJobStore()
    job = store.get(job_id)
    if not job:
        return None
    brief = generate_producer_brief(
        job.idea_id, refinement=refinement, hook_type=job.hook_type or "rotate",
        tone=job.tone, passion=job.passion, own_hook=job.own_hook,
    )
    if not brief:
        return job
    return create_job_from_brief(job.idea_id)


def auto_sharpen(job_id: int, max_rounds: int = 3) -> tuple["VideoJob | None", list[dict]]:
    """Claude-driven pre-render self-review loop. Repeatedly evaluates the 5-point
    content DNA and rewrites the script to fix weak points, until it passes (or
    max_rounds is hit). Cheap (text only) — runs before any render is spent.

    Returns (job, rounds) where rounds is a per-pass log:
      [{"round", "weak_before":[labels], "fixed":bool, "note":<refinement sent>}]
    """
    from gtm_engine.hooks import evaluate_dna
    from gtm_engine.producer import ProducerBriefLibrary

    store = VideoJobStore()
    job = store.get(job_id)
    if not job:
        return None, []

    product = ""
    try:
        from gtm_engine.ideas import IdeaBank
        idea = IdeaBank().get(job.idea_id)
        product = (idea.product if idea else "") or ""
    except Exception:
        product = ""

    rounds: list[dict] = []
    for r in range(max_rounds):
        brief = ProducerBriefLibrary().get_for_idea(job.idea_id)
        full_script = (brief.spoken_script if brief else job.spoken_script) or job.spoken_script
        dna = evaluate_dna(job.hook_text, job.bookend_text, full_script, product)
        weak = [c for c in dna if not c["ok"]]
        if not weak:
            rounds.append({"round": r + 1, "weak_before": [], "fixed": True, "note": ""})
            break
        # Turn the weak points into a precise rewrite instruction for Claude.
        fixes = "; ".join(f"{c['label']}: {c['note']}" for c in weak)
        note = ("Sharpen the script so every content-DNA point is satisfied. "
                f"Specifically fix — {fixes}. Keep it punchy and on-brand; "
                "weave the product in once, lightly; keep the CTA soft.")
        rounds.append({"round": r + 1, "weak_before": [c["label"] for c in weak],
                       "fixed": False, "note": note})
        regenerate_script(job.id, refinement=note)
        job = store.get(job.id)
        if not job:
            break

    if job:
        job.revisions.append({
            "note": "Auto-sharpen (Claude pre-render review)",
            "change_type": "auto_sharpen",
            "rationale": f"{len(rounds)} round(s); "
                         f"{'passed' if rounds and rounds[-1]['fixed'] else 'best effort'}.",
            "at": datetime.now(timezone.utc).isoformat(),
        })
        job.id = store.save(job)
    return store.get(job.id) if job else None, rounds


def attach_finished_video(job_id: int, video_bytes: bytes, filename: str) -> VideoJob | None:
    """Attach a video the user produced elsewhere (e.g. HeyGen app) to the job."""
    store = VideoJobStore()
    job = store.get(job_id)
    if not job:
        return None
    ext = Path(filename).suffix.lower() or ".mp4"
    out = OUTPUT_DIR / "videos" / f"idea_{job.idea_id}_final{ext}"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(video_bytes)
    job.video_path = str(out)
    job.status = "ready"
    job.error = ""
    job.id = store.save(job)
    return store.get(job.id)


def approve_script(job_id: int) -> VideoJob | None:
    """Gate the workflow: lock the Hook/Bookend script + production before render."""
    store = VideoJobStore()
    job = store.get(job_id)
    if not job:
        return None
    job.script_approved = True
    job.id = store.save(job)
    return store.get(job.id)


def render_job(job_id: int, audio_path: Path | str | None = None,
               driving_video_path: Path | str | None = None) -> VideoJob | None:
    """Produce (or dry-run) a job. Dispatches by engine:

    - transfer (Runway): drive the character image with the recorded video.
    - audio (HeyGen): lip-sync the avatar to text/voice or an uploaded take.
    """
    store = VideoJobStore()
    job = store.get(job_id)
    if not job:
        return None

    cfg = AvatarConfigStore().load()
    provider = get_provider(cfg.provider)
    out_path = OUTPUT_DIR / "videos" / f"idea_{job.idea_id}_job_{job.id}.mp4"

    # Fill in from the active character only where the job doesn't already have
    # a value — so per-reel production edits (motion, environment) are honoured,
    # and a job created before the cast was set up still gets an avatar.
    background = cfg.background
    image_key = ""
    template_id = ""
    try:
        from gtm_engine.casting import CastingStore
        cs = CastingStore()
        ch = cs.get_default_character()
        if ch:
            image_key = ch.image_key or ""
            template_id = ch.template_id or ""
            if not job.avatar_id and ch.avatar_id:
                job.avatar_id = ch.avatar_id
            if not job.voice_id and ch.voice_id:
                job.voice_id = ch.voice_id
            if not job.expressiveness:
                job.expressiveness = ch.expressiveness
            if not job.motion_prompt and ch.cinematic_direction:
                job.motion_prompt = ch.cinematic_direction
            if not job.character_image_path and ch.photo_path:
                job.character_image_path = ch.photo_path
        # Look: a per-reel look from the Look Library overrides the character's
        # default image_key (the wardrobe/setting this specific reel is cast in).
        if job.look_id:
            look = cs.get_look(job.look_id)
            if look and look.image_key:
                image_key = look.image_key
                if look.photo_path and not job.character_image_path:
                    job.character_image_path = look.photo_path
        # Environment: per-reel job value wins, else the character's default.
        env_id = job.environment_id or (ch.environment_id if ch else None)
        if env_id:
            env = cs.get_environment(env_id)
            if env and env.background_type == "color":
                background = env.background_value
    except Exception:
        pass

    req = RenderRequest(
        script=job.spoken_script,
        avatar_id=job.avatar_id,
        output_path=out_path,
        voice_id=job.voice_id or None,
        background=background,
        aspect_ratio=cfg.aspect_ratio,
        motion_prompt=job.motion_prompt,
        expressiveness=job.expressiveness,
        gesture=cfg.gesture,
        character_image_path=Path(job.character_image_path) if job.character_image_path else None,
        image_key=image_key,
        template_id=template_id,
    )
    if driving_video_path:
        job.driving_video_path = str(driving_video_path)
        req.driving_video_path = Path(driving_video_path)

    is_transfer = job.engine == "transfer" or (provider.supports_performance_transfer and cfg.provider == "runway")

    # Job-level readiness: the character/inputs the chosen provider needs.
    if cfg.provider in ("", "none"):
        ready = False
    elif cfg.provider == "mock":
        ready = True
    elif is_transfer:
        ready = bool(req.character_image_path)
    else:
        ready = bool(job.avatar_id or req.image_key or req.template_id)  # avatar id / photo / template

    # For audio-drive providers, an uploaded take can drive the mouth.
    if not is_transfer:
        use_audio = (cfg.mode == "record") or (cfg.mode == "hybrid" and audio_path)
        if use_audio and audio_path and provider.supports_audio_upload and ready:
            asset_id = provider.upload_audio(Path(audio_path))
            if asset_id:
                req.audio_asset_id = asset_id
                job.audio_asset_id = asset_id

    # Transfer needs a driving video + character image before it can run.
    transfer_missing_input = is_transfer and not (req.driving_video_path and req.character_image_path)

    # No usable provider / missing input -> DRY RUN. Store the request for display.
    if not ready or not provider.is_configured() or transfer_missing_input:
        job.status = "needs_input" if transfer_missing_input and ready else "needs_provider"
        job.dry_run_request = json.dumps({
            "engine": job.engine,
            "provider": cfg.provider or "none",
            "avatar_id": job.avatar_id or "(n/a for transfer)",
            "voice_id": job.voice_id or "(default)",
            "character_image": job.character_image_path or "(not set)",
            "driving_video": job.driving_video_path or "(record & upload your take)",
            "background": background,
            "script": job.spoken_script,
            "expressiveness": job.expressiveness,
            "aspect_ratio": cfg.aspect_ratio,
        }, indent=2)
        job.id = store.save(job)
        logger.info("Dry-run/needs-input for job %d (%s).", job.id, job.status)
        return job

    job.status = "rendering"
    store.save(job)
    err = ""
    try:
        if is_transfer:
            result = provider.transfer_performance(req)
        else:
            result = provider.render(req)
        err = getattr(provider, "last_error", "") or ""
    except Exception as e:
        logger.error("Produce failed for job %d: %s", job.id, e)
        result = None
        err = str(e)[:250]

    if result:
        job.video_path = str(result)
        job.status = "ready"
        job.error = ""
    else:
        job.status = "failed"
        job.error = err or "Render failed (no detail returned)."
    job.id = store.save(job)
    return job


# ── Free-text review ──────────────────────────────────────────────────────────

_CLASSIFY_SYSTEM = """You route a reviewer's free-text note about a short talking-head
video into one actionable change. The avatar speaks only two lines: a HOOK
(opening ~4s) and a BOOKEND (closing ~4s). Everything else in the reel is
product screens / data-viz handled by a separate editor.

Classify the note into exactly one change_type:
  - "script"  : the wording of the hook and/or bookend should change
  - "delivery": same words, but energy/motion/expressiveness/pacing changes
  - "visual"  : about backgrounds, b-roll, charts, product screens (NOT the avatar)
  - "unclear" : cannot tell; ask for clarification

Rules:
  - Keep each spoken line punchy: <= 14 words, no forbidden phrases
    (game-changer, revolutionary, disruptive, innovative, cutting-edge, unlock, synergy).
  - expressiveness is 0.0 (flat) to 1.0 (high energy).
Return ONLY a JSON object:
{
  "change_type": "script|delivery|visual|unclear",
  "updated_hook_text": "<new hook or empty to keep>",
  "updated_bookend_text": "<new bookend or empty to keep>",
  "updated_motion_prompt": "<new motion direction or empty>",
  "updated_expressiveness": <number 0..1 or null>,
  "note_for_editor": "<instruction for the visual editor, if change_type=visual>",
  "rationale": "<one sentence>"
}"""


def classify_review_note(note: str, job: VideoJob) -> dict:
    """Ask Claude to turn a free-text review note into a structured change."""
    from gtm_engine.utils.ai_client import call_claude

    prompt = (
        f"CURRENT HOOK: {job.hook_text}\n"
        f"CURRENT BOOKEND: {job.bookend_text}\n"
        f"CURRENT MOTION: {job.motion_prompt or '(none)'}\n"
        f"CURRENT EXPRESSIVENESS: {job.expressiveness}\n\n"
        f"REVIEWER NOTE: {note}\n\nReturn ONLY the JSON."
    )
    raw = call_claude(prompt, system=_CLASSIFY_SYSTEM, max_tokens=800, temperature=0.3)
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].rstrip()
    s, e = cleaned.find("{"), cleaned.rfind("}")
    if s == -1 or e == -1:
        return {"change_type": "unclear", "rationale": "Could not parse the note."}
    try:
        return json.loads(cleaned[s : e + 1])
    except json.JSONDecodeError:
        return {"change_type": "unclear", "rationale": "Could not parse the note."}


def apply_revision(job_id: int, note: str, auto_render: bool = True) -> VideoJob | None:
    """Apply a free-text review note to a job, logging it and re-rendering."""
    store = VideoJobStore()
    job = store.get(job_id)
    if not job:
        return None

    change = classify_review_note(note, job)
    ctype = change.get("change_type", "unclear")

    if ctype == "script":
        if change.get("updated_hook_text"):
            job.hook_text = change["updated_hook_text"].strip()
        if change.get("updated_bookend_text"):
            job.bookend_text = change["updated_bookend_text"].strip()
        job.qa_issues = run_qa(job.hook_text, job.bookend_text)
    elif ctype == "delivery":
        if change.get("updated_motion_prompt"):
            job.motion_prompt = change["updated_motion_prompt"].strip()
        if change.get("updated_expressiveness") is not None:
            try:
                job.expressiveness = max(0.0, min(1.0, float(change["updated_expressiveness"])))
            except (TypeError, ValueError):
                pass

    job.revisions.append({
        "note": note,
        "change_type": ctype,
        "rationale": change.get("rationale", ""),
        "note_for_editor": change.get("note_for_editor", ""),
        "at": datetime.now(timezone.utc).isoformat(),
    })
    # A visual note doesn't need an avatar re-render; script/delivery do.
    needs_rerender = ctype in ("script", "delivery")
    job.status = "queued" if needs_rerender else job.status
    job.id = store.save(job)

    if auto_render and needs_rerender:
        return render_job(job.id)
    return store.get(job.id)


# Full-reel auto-assembler (hook + middle + bookend → one stitched mp4).
from gtm_engine.video.assembler import assemble_reel  # noqa: E402,F401
