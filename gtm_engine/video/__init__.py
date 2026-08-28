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

STATUSES = ["needs_provider", "queued", "rendering", "ready", "failed", "approved"]

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
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_video_jobs_idea ON video_jobs(idea_id);
"""


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
            job.created_at, job.updated_at,
        )
        with self._connect() as conn:
            if job.id:
                conn.execute(
                    """UPDATE video_jobs SET idea_id=?, brief_id=?, status=?, provider=?,
                       avatar_id=?, voice_id=?, mode=?, hook_text=?, bookend_text=?,
                       motion_prompt=?, expressiveness=?, audio_asset_id=?, video_path=?,
                       dry_run_request=?, qa_issues=?, revisions=?, created_at=?, updated_at=?
                       WHERE id=?""",
                    (*cols, job.id),
                )
                conn.commit()
                return job.id
            cur = conn.execute(
                """INSERT INTO video_jobs (idea_id, brief_id, status, provider, avatar_id,
                   voice_id, mode, hook_text, bookend_text, motion_prompt, expressiveness,
                   audio_asset_id, video_path, dry_run_request, qa_issues, revisions,
                   created_at, updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
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
            created_at=row["created_at"], updated_at=row["updated_at"],
        )


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

    job = existing or VideoJob(idea_id=idea_id)
    job.brief_id = brief.id
    job.provider = cfg.provider
    job.avatar_id = cfg.avatar_id
    job.voice_id = cfg.voice_id
    job.mode = cfg.mode
    job.hook_text = hook_text
    job.bookend_text = bookend_text
    job.motion_prompt = cfg.motion_prompt or brief.voice_directive
    job.expressiveness = cfg.expressiveness
    job.qa_issues = run_qa(hook_text, bookend_text)
    job.status = "queued" if cfg.is_ready() else "needs_provider"
    job.id = store.save(job)
    return job


def render_job(job_id: int, audio_path: Path | str | None = None) -> VideoJob | None:
    """Render (or dry-run) the avatar clip for a job."""
    store = VideoJobStore()
    job = store.get(job_id)
    if not job:
        return None

    cfg = AvatarConfigStore().load()
    provider = get_provider(cfg.provider)
    out_path = OUTPUT_DIR / "videos" / f"idea_{job.idea_id}_job_{job.id}.mp4"

    req = RenderRequest(
        script=job.spoken_script,
        avatar_id=cfg.avatar_id,
        output_path=out_path,
        voice_id=cfg.voice_id or None,
        background=cfg.background,
        aspect_ratio=cfg.aspect_ratio,
        motion_prompt=job.motion_prompt,
        expressiveness=job.expressiveness,
    )

    # Decide the drive path from the mode.
    use_audio = (cfg.mode == "record") or (cfg.mode == "hybrid" and audio_path)
    if use_audio and audio_path and provider.supports_audio_upload and cfg.is_ready():
        asset_id = provider.upload_audio(Path(audio_path))
        if asset_id:
            req.audio_asset_id = asset_id
            job.audio_asset_id = asset_id

    # No usable provider -> DRY RUN. Store the request for display.
    if not cfg.is_ready() or not provider.is_configured():
        job.status = "needs_provider"
        job.dry_run_request = json.dumps({
            "provider": cfg.provider or "none",
            "avatar_id": cfg.avatar_id or "(not set)",
            "drive": "audio_upload" if req.audio_asset_id else f"voice:{cfg.voice_id or 'default'}",
            "script": job.spoken_script,
            "motion_prompt": job.motion_prompt,
            "expressiveness": job.expressiveness,
            "aspect_ratio": cfg.aspect_ratio,
        }, indent=2)
        job.id = store.save(job)
        logger.info("Dry-run render for job %d (no provider configured).", job.id)
        return job

    job.status = "rendering"
    store.save(job)
    try:
        result = provider.render(req)
    except Exception as e:
        logger.error("Render failed for job %d: %s", job.id, e)
        result = None

    if result:
        job.video_path = str(result)
        job.status = "ready"
    else:
        job.status = "failed"
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
