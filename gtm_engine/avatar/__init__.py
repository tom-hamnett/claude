"""Avatar Provider Abstraction — provider-agnostic interface.

The engine writes the script and producer brief. The avatar provider
(HeyGen today; D-ID / Synthesia / Hedra / a future video-to-video engine
later) turns the spoken lines into a talking-head video of the user's
chosen avatar. The user brings their own API key (BYOK).

Design (Option 1 — audio-driven, see docs/HEYGEN_WORKFLOW):
  - One-time: the user creates an avatar in HeyGen (a 15s reference clip →
    Avatar V learns how they move) and optionally clones their voice. The
    engine just needs the resulting avatar_id (+ optional voice_id).
  - Per video: the engine sends the spoken script for the Hook + Bookend
    segments. It can drive the avatar two ways, which are mutually
    exclusive on HeyGen's /v3/videos endpoint:
        * text  -> script + voice_id (cloned or stock voice)  [hands-off]
        * audio -> an uploaded recording via audio_asset_id    [your take]
    "Hybrid" = default to the cloned voice, but let the user drop in a real
    recording for a specific piece.
  - The middle Core-Five segments (Tension/Pivot/Proof) are product screens
    and data-viz — no avatar — so only ~8s of avatar footage is ever
    rendered per reel.

The abstraction keeps a `driving_video` hook on the request so a future
video-to-video provider (frame-exact performance transfer, Option 2) can
be slotted in without changing callers.
"""

import json
import logging
import os
import sqlite3
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel, ConfigDict

logger = logging.getLogger(__name__)


class AvatarProviderError(Exception):
    """Raised when an avatar provider call fails."""


@dataclass
class RenderRequest:
    """Everything a provider needs to render one avatar clip.

    Either (script + voice_id) OR audio_asset_id drives the mouth/motion —
    they are mutually exclusive. driving_video_path is reserved for a future
    performance-transfer provider and ignored by audio-driven providers.
    """
    script: str
    avatar_id: str
    output_path: Path
    voice_id: str | None = None
    audio_asset_id: str | None = None
    driving_video_path: Path | None = None   # reserved (Option 2)
    background: str = "#0d1b2a"
    aspect_ratio: str = "9:16"
    motion_prompt: str = ""
    expressiveness: float = 0.5              # 0..1
    callback_url: str | None = None


class AvatarProvider(ABC):
    """Base interface every avatar provider must implement."""

    provider_id: str = "base"
    provider_name: str = "Base"
    requires_api_key: bool = True
    supports_voice_clone: bool = False
    supports_audio_upload: bool = False

    @abstractmethod
    def is_configured(self) -> bool:
        """Return True if this provider has all required credentials."""
        ...

    @abstractmethod
    def list_avatars(self) -> list[dict]:
        """Return available avatars: [{id, name, preview_url}]."""
        ...

    @abstractmethod
    def list_voices(self) -> list[dict]:
        """Return available voices for this provider."""
        ...

    @abstractmethod
    def render(self, req: RenderRequest) -> Path | None:
        """Render an avatar clip to req.output_path. None on failure."""
        ...

    # Optional capabilities — providers override when supported.
    def upload_audio(self, audio_path: Path) -> str | None:
        """Upload a recording; return an audio_asset_id. None if unsupported."""
        return None

    def clone_voice(self, sample_path: Path, name: str) -> str | None:
        """Clone a voice from a sample; return a voice_id. None if unsupported."""
        return None


class NoAvatarProvider(AvatarProvider):
    """No-avatar mode — content uses TTS voiceover + B-roll only.

    The default when no avatar provider is configured. render() is a no-op
    so the pipeline can still produce the (avatar-free) middle segments.
    """

    provider_id = "none"
    provider_name = "No Avatar (voiceover + B-roll only)"
    requires_api_key = False

    def is_configured(self) -> bool:
        return True

    def list_avatars(self) -> list[dict]:
        return []

    def list_voices(self) -> list[dict]:
        return []

    def render(self, req: RenderRequest) -> Path | None:
        logger.info("No-avatar mode — skipping avatar render")
        return None


class MockProvider(AvatarProvider):
    """Offline simulation — renders a branded preview frame, no external calls.

    Lets the whole Produce -> Review -> Approve loop be exercised (and demoed)
    without a HeyGen key or any spend. It writes a PNG 'preview frame' showing
    the spoken line, standing in for the rendered clip.
    """

    provider_id = "mock"
    provider_name = "Simulation (offline preview, no key)"
    requires_api_key = False
    supports_voice_clone = True
    supports_audio_upload = True

    def is_configured(self) -> bool:
        return True

    def list_avatars(self) -> list[dict]:
        return [{"id": "mock-avatar", "name": "Simulated Avatar", "preview_url": ""}]

    def list_voices(self) -> list[dict]:
        return [{"id": "mock-voice", "name": "Simulated Voice", "language": "en"}]

    def upload_audio(self, audio_path: Path) -> str | None:
        return "mock-audio-asset"

    def clone_voice(self, sample_path: Path, name: str) -> str | None:
        return "mock-voice"

    def render(self, req: RenderRequest) -> Path | None:
        """Draw a preview frame so the pipeline has a real artefact to show."""
        try:
            from PIL import Image, ImageDraw
        except Exception:
            logger.warning("Pillow unavailable; mock render returns None")
            return None

        dims = {"9:16": (540, 960), "16:9": (960, 540), "1:1": (720, 720)}
        w, h = dims.get(req.aspect_ratio, (540, 960))
        img = Image.new("RGB", (w, h), req.background or "#0d1b2a")
        d = ImageDraw.Draw(img)
        # avatar placeholder
        cx, cy, r = w // 2, int(h * 0.32), int(w * 0.16)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill="#1b2e44", outline="#6c63ff", width=4)
        d.text((cx - 10, cy - 12), "🙂", fill="#ffffff")
        # spoken line, wrapped
        line = (req.script or "").strip() or "(no script)"
        words, cur, rows = line.split(), "", []
        for word in words:
            if len(cur) + len(word) + 1 > 34:
                rows.append(cur); cur = word
            else:
                cur = f"{cur} {word}".strip()
        if cur:
            rows.append(cur)
        y = int(h * 0.55)
        for row in rows[:8]:
            d.text((40, y), row, fill="#ffffff")
            y += 26
        d.text((40, h - 60), "SIMULATED PREVIEW — not a real render", fill="#ffd166")
        d.text((40, h - 36), f"expressiveness {req.expressiveness} · {req.aspect_ratio}",
               fill="#8aa0c0")

        out = req.output_path.with_suffix(".png")
        out.parent.mkdir(parents=True, exist_ok=True)
        img.save(out)
        logger.info("Mock render wrote preview frame to %s", out)
        return out


class HeyGenProvider(AvatarProvider):
    """HeyGen Video Generation API (audio-driven, Option 1).

    Requires HEYGEN_API_KEY. The user creates their avatar + (optional)
    voice clone in HeyGen once; the engine renders talking-head clips from
    the script text (cloned/stock voice) or from an uploaded recording.

    Endpoints used (see https://developers.heygen.com):
      POST /v2/video/generate      submit a render -> video_id
      GET  /v1/video_status.get    poll status/URL (fallback to webhooks)
      POST /v1/asset/upload        upload a recording -> audio asset id
      GET  /v2/avatars, /v2/voices list avatars / voices
    """

    provider_id = "heygen"
    provider_name = "HeyGen"
    supports_voice_clone = True
    supports_audio_upload = True

    API_V2 = "https://api.heygen.com/v2"
    API_V1 = "https://api.heygen.com/v1"
    API_V3 = "https://api.heygen.com/v3"

    def __init__(self):
        self.api_key = os.getenv("HEYGEN_API_KEY", "")

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def _headers(self) -> dict:
        return {"X-Api-Key": self.api_key, "Content-Type": "application/json"}

    # ── discovery ──────────────────────────────────────────────────────────
    def list_avatars(self) -> list[dict]:
        if not self.is_configured():
            return []
        try:
            import httpx
            r = httpx.get(f"{self.API_V2}/avatars", headers=self._headers(), timeout=20)
            r.raise_for_status()
            data = r.json().get("data", {}) or {}
            avatars = data.get("avatars", []) if isinstance(data, dict) else []
            return [
                {
                    "id": a.get("avatar_id", ""),
                    "name": a.get("avatar_name", ""),
                    "preview_url": a.get("preview_image_url", ""),
                    "gender": a.get("gender", ""),
                }
                for a in avatars
            ]
        except Exception as e:
            logger.error("HeyGen list_avatars failed: %s", e)
            return []

    def list_voices(self) -> list[dict]:
        if not self.is_configured():
            return []
        try:
            import httpx
            r = httpx.get(f"{self.API_V2}/voices", headers=self._headers(), timeout=20)
            r.raise_for_status()
            data = r.json().get("data", {}) or {}
            voices = data.get("voices", []) if isinstance(data, dict) else []
            return [
                {
                    "id": v.get("voice_id", ""),
                    "name": v.get("name", ""),
                    "language": v.get("language", ""),
                    "gender": v.get("gender", ""),
                }
                for v in voices
            ]
        except Exception as e:
            logger.error("HeyGen list_voices failed: %s", e)
            return []

    # ── uploads / cloning ────────────────────────────────────────────────────
    def upload_audio(self, audio_path: Path) -> str | None:
        """Upload a recording so it can drive a render via audio_asset_id.

        POST /v3/assets, multipart form-data (field 'file'), <=32MB, mp3/wav.
        Returns data.asset_id.
        """
        if not self.is_configured():
            raise AvatarProviderError("HEYGEN_API_KEY not set")
        try:
            import httpx
            audio_path = Path(audio_path)
            mime = "audio/mpeg" if audio_path.suffix.lower() == ".mp3" else "audio/wav"
            r = httpx.post(
                f"{self.API_V3}/assets",
                headers={"X-Api-Key": self.api_key},   # let httpx set multipart boundary
                files={"file": (audio_path.name, audio_path.read_bytes(), mime)},
                timeout=180,
            )
            r.raise_for_status()
            data = r.json().get("data", {}) or {}
            return data.get("asset_id") or data.get("id")
        except Exception as e:
            logger.error("HeyGen upload_audio failed: %s", e)
            return None

    def clone_voice(self, sample_path: Path, name: str) -> str | None:
        """Voice cloning is provisioned in the HeyGen app/enterprise API.

        We surface the capability but return None here so the UI can direct
        the user to create the clone once and paste back the voice_id.
        """
        logger.info("HeyGen voice cloning is a one-time setup in the HeyGen app.")
        return None

    # ── render ───────────────────────────────────────────────────────────────
    def render(self, req: RenderRequest) -> Path | None:
        if not self.is_configured():
            raise AvatarProviderError("HEYGEN_API_KEY not set")

        import httpx

        dims = {"9:16": (720, 1280), "16:9": (1280, 720), "1:1": (720, 720)}
        width, height = dims.get(req.aspect_ratio, (720, 1280))

        # Voice block: audio upload takes precedence over TTS (mutually exclusive).
        if req.audio_asset_id:
            voice_block = {"type": "audio", "audio_asset_id": req.audio_asset_id}
        else:
            voice_id = req.voice_id
            if not voice_id:
                voices = self.list_voices()
                voice_id = voices[0]["id"] if voices else ""
            voice_block = {"type": "text", "input_text": req.script, "voice_id": voice_id}

        # v2 /video/generate accepts avatar_id + avatar_style (+ scale/offset).
        # motion_prompt / expressiveness are v3/Avatar-V concepts and would be
        # rejected here, so they're carried on the job for QA/display only.
        character = {"type": "avatar", "avatar_id": req.avatar_id, "avatar_style": "normal"}

        payload = {
            "video_inputs": [{
                "character": character,
                "voice": voice_block,
                "background": {"type": "color", "value": req.background},
            }],
            "dimension": {"width": width, "height": height},
        }
        if req.callback_url:
            payload["callback_url"] = req.callback_url

        try:
            r = httpx.post(f"{self.API_V2}/video/generate", headers=self._headers(),
                           json=payload, timeout=30)
            r.raise_for_status()
            video_id = (r.json().get("data", {}) or {}).get("video_id")
            if not video_id:
                logger.error("HeyGen returned no video_id: %s", r.text[:300])
                return None
            logger.info("HeyGen render submitted: %s", video_id)

            # If a webhook was supplied, let the caller handle completion.
            if req.callback_url:
                return None

            # Otherwise poll.
            return self._poll_and_download(video_id, req.output_path)
        except Exception as e:
            logger.error("HeyGen render failed: %s", e)
            return None

    def _poll_and_download(self, video_id: str, output_path: Path,
                           max_wait: int = 600) -> Path | None:
        import httpx
        waited = 0
        while waited < max_wait:
            time.sleep(10)
            waited += 10
            try:
                sr = httpx.get(f"{self.API_V1}/video_status.get",
                               params={"video_id": video_id},
                               headers=self._headers(), timeout=20)
                if sr.status_code != 200:
                    continue
                sd = sr.json().get("data", {}) or {}
                status = sd.get("status", "")
                logger.info("HeyGen status (%ds): %s", waited, status)
                if status == "completed":
                    url = sd.get("video_url")
                    if not url:
                        return None
                    output_path.parent.mkdir(parents=True, exist_ok=True)
                    dr = httpx.get(url, follow_redirects=True, timeout=180)
                    dr.raise_for_status()
                    output_path.write_bytes(dr.content)
                    logger.info("HeyGen video saved to %s", output_path)
                    return output_path
                if status == "failed":
                    logger.error("HeyGen generation failed: %s", sd)
                    return None
            except Exception as e:
                logger.error("HeyGen poll error: %s", e)
        logger.error("HeyGen polling timed out")
        return None


# ---------------------------------------------------------------------------
# Persisted avatar configuration (per workspace)
# ---------------------------------------------------------------------------

_CONFIG_SCHEMA = """
CREATE TABLE IF NOT EXISTS avatar_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    provider TEXT DEFAULT 'none',
    avatar_id TEXT DEFAULT '',
    avatar_name TEXT DEFAULT '',
    voice_id TEXT DEFAULT '',
    voice_name TEXT DEFAULT '',
    mode TEXT DEFAULT 'voice_clone',     -- voice_clone | record | hybrid
    motion_prompt TEXT DEFAULT '',
    expressiveness REAL DEFAULT 0.5,
    background TEXT DEFAULT '#0d1b2a',
    aspect_ratio TEXT DEFAULT '9:16',
    updated_at TEXT
);
"""


class AvatarConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    provider: str = "none"
    avatar_id: str = ""
    avatar_name: str = ""
    voice_id: str = ""
    voice_name: str = ""
    mode: str = "voice_clone"            # voice_clone | record | hybrid
    motion_prompt: str = ""
    expressiveness: float = 0.5
    background: str = "#0d1b2a"
    aspect_ratio: str = "9:16"
    updated_at: str = ""

    def is_ready(self) -> bool:
        """True when we have enough to render (avatar picked on a real provider)."""
        return self.provider not in ("", "none") and bool(self.avatar_id)


class AvatarConfigStore:
    """Single-row per-workspace store for avatar settings."""

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
            conn.executescript(_CONFIG_SCHEMA)
            conn.commit()

    def load(self) -> AvatarConfig:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM avatar_config WHERE id = 1").fetchone()
            if not row:
                # provider falls back to the AVATAR_PROVIDER env var if set
                return AvatarConfig(provider=os.getenv("AVATAR_PROVIDER", "none").lower())
            return AvatarConfig(
                provider=row["provider"] or "none",
                avatar_id=row["avatar_id"] or "",
                avatar_name=row["avatar_name"] or "",
                voice_id=row["voice_id"] or "",
                voice_name=row["voice_name"] or "",
                mode=row["mode"] or "voice_clone",
                motion_prompt=row["motion_prompt"] or "",
                expressiveness=row["expressiveness"] if row["expressiveness"] is not None else 0.5,
                background=row["background"] or "#0d1b2a",
                aspect_ratio=row["aspect_ratio"] or "9:16",
                updated_at=row["updated_at"] or "",
            )

    def save(self, cfg: AvatarConfig) -> None:
        cfg.updated_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO avatar_config (
                    id, provider, avatar_id, avatar_name, voice_id, voice_name,
                    mode, motion_prompt, expressiveness, background, aspect_ratio, updated_at
                ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    provider=excluded.provider, avatar_id=excluded.avatar_id,
                    avatar_name=excluded.avatar_name, voice_id=excluded.voice_id,
                    voice_name=excluded.voice_name, mode=excluded.mode,
                    motion_prompt=excluded.motion_prompt, expressiveness=excluded.expressiveness,
                    background=excluded.background, aspect_ratio=excluded.aspect_ratio,
                    updated_at=excluded.updated_at
                """,
                (cfg.provider, cfg.avatar_id, cfg.avatar_name, cfg.voice_id, cfg.voice_name,
                 cfg.mode, cfg.motion_prompt, cfg.expressiveness, cfg.background,
                 cfg.aspect_ratio, cfg.updated_at),
            )
            conn.commit()


# ---------------------------------------------------------------------------
# Registry + factory
# ---------------------------------------------------------------------------

PROVIDERS: dict[str, type[AvatarProvider]] = {
    "none": NoAvatarProvider,
    "mock": MockProvider,
    "heygen": HeyGenProvider,
    # Future: "d-id", "synthesia", "hedra", "runway" (video-to-video, Option 2)
}


def get_provider(provider_id: str | None = None) -> AvatarProvider:
    """Get an avatar provider. Falls back to the saved config, then env, then 'none'."""
    if not provider_id:
        try:
            provider_id = AvatarConfigStore().load().provider
        except Exception:
            provider_id = os.getenv("AVATAR_PROVIDER", "none").lower()
    cls = PROVIDERS.get((provider_id or "none").lower(), NoAvatarProvider)
    return cls()


def list_providers() -> list[dict]:
    """Return metadata about all known providers (for UI)."""
    return [
        {
            "id": p_id,
            "name": cls.provider_name,
            "requires_api_key": cls.requires_api_key,
            "configured": cls().is_configured(),
            "supports_voice_clone": cls.supports_voice_clone,
            "supports_audio_upload": cls.supports_audio_upload,
        }
        for p_id, cls in PROVIDERS.items()
    ]
