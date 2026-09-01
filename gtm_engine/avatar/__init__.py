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
    driving_video_path: Path | None = None   # performance source (Option 2)
    character_image_path: Path | None = None  # target character for transfer
    image_key: str = ""                       # HeyGen image_key -> Avatar IV (av4)
    template_id: str = ""                      # HeyGen template -> full-automation path
    gesture: bool = True                      # transfer body/hand motion too
    background: str = "#0d1b2a"
    aspect_ratio: str = "9:16"
    motion_prompt: str = ""
    expressiveness: float = 0.5              # 0..1
    speed: float = 1.0                        # voice pace (0.5–1.5); <1 = slower, breathes
    hd: bool = False                          # 1080p (more credits) vs 720p
    callback_url: str | None = None


class AvatarProvider(ABC):
    """Base interface every avatar provider must implement."""

    provider_id: str = "base"
    provider_name: str = "Base"
    requires_api_key: bool = True
    supports_voice_clone: bool = False
    supports_audio_upload: bool = False
    supports_performance_transfer: bool = False
    last_error: str = ""              # set by render()/transfer() on failure

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

    def transfer_performance(self, req: RenderRequest) -> Path | None:
        """Drive req.character_image_path with the performance in
        req.driving_video_path (video-to-video). None if unsupported."""
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
    supports_performance_transfer = True

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

    def transfer_performance(self, req: RenderRequest) -> Path | None:
        """Simulate performance transfer: preview the character with a label."""
        try:
            from PIL import Image, ImageDraw
        except Exception:
            return None
        dims = {"9:16": (540, 960), "16:9": (960, 540), "1:1": (720, 720)}
        w, h = dims.get(req.aspect_ratio, (540, 960))
        if req.character_image_path and Path(req.character_image_path).exists():
            img = Image.open(str(req.character_image_path)).convert("RGB").resize((w, h))
        else:
            img = Image.new("RGB", (w, h), req.background or "#0d1b2a")
        d = ImageDraw.Draw(img)
        d.rectangle([0, h - 84, w, h], fill="#0d1b2a")
        d.text((20, h - 74), "SIMULATED PERFORMANCE TRANSFER", fill="#ffd166")
        d.text((20, h - 52), f"gesture={req.gesture} · expr={req.expressiveness} · {req.aspect_ratio}",
               fill="#8aa0c0")
        d.text((20, h - 30), "your take -> this character (Act-Two, simulated)", fill="#66d9a0")
        out = req.output_path.with_suffix(".png")
        out.parent.mkdir(parents=True, exist_ok=True)
        img.save(out)
        return out


class RunwayProvider(AvatarProvider):
    """Runway Act-Two performance transfer (video-to-video).

    Drives a target character (your AI-restyled photo) with your recorded
    performance video, transferring facial expression + (optionally) body and
    hand gestures. This is the engine that actually echoes your delivery.

    API (https://docs.dev.runwayml.com):
      POST /v1/character_performance  -> { id }
      GET  /v1/tasks/{id}             -> { status, output: [url] }
    character and reference are passed as data: URIs or HTTPS URLs.
    Reference performance must be <= 10s (our Hook+Bookend is ~8s).
    """

    provider_id = "runway"
    provider_name = "Runway Act-Two (performance transfer)"
    supports_performance_transfer = True

    API_BASE = "https://api.dev.runwayml.com/v1"
    RUNWAY_VERSION = "2024-11-06"

    def __init__(self):
        self.api_key = os.getenv("RUNWAY_API_KEY", "")

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "X-Runway-Version": self.RUNWAY_VERSION,
            "Content-Type": "application/json",
        }

    def list_avatars(self) -> list[dict]:
        return []   # Runway uses a character image, not a saved avatar id

    def list_voices(self) -> list[dict]:
        return []

    def render(self, req: RenderRequest) -> Path | None:
        """Runway is performance-transfer only — no audio-drive path."""
        logger.info("RunwayProvider.render is not used; call transfer_performance")
        return None

    @staticmethod
    def _data_uri(path: Path) -> str:
        import base64
        import mimetypes
        path = Path(path)
        mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        b64 = base64.b64encode(path.read_bytes()).decode()
        return f"data:{mime};base64,{b64}"

    def transfer_performance(self, req: RenderRequest) -> Path | None:
        if not self.is_configured():
            raise AvatarProviderError("RUNWAY_API_KEY not set")
        if not (req.driving_video_path and req.character_image_path):
            logger.error("Runway needs both a driving video and a character image")
            return None

        import time
        import httpx

        ratio = {"9:16": "720:1280", "16:9": "1280:720", "1:1": "960:960"}.get(
            req.aspect_ratio, "720:1280")
        payload = {
            "character": {"type": "image", "uri": self._data_uri(req.character_image_path)},
            "reference": {"type": "video", "uri": self._data_uri(req.driving_video_path)},
            "ratio": ratio,
            "bodyControl": req.gesture,
            "expressiveness": int(round(req.expressiveness * 5)),  # 0..5
        }
        try:
            r = httpx.post(f"{self.API_BASE}/character_performance",
                           headers=self._headers(), json=payload, timeout=60)
            r.raise_for_status()
            task_id = (r.json() or {}).get("id")
            if not task_id:
                logger.error("Runway returned no task id: %s", r.text[:300])
                return None
            logger.info("Runway Act-Two task submitted: %s", task_id)
            return self._poll_and_download(task_id, req.output_path)
        except Exception as e:
            logger.error("Runway transfer failed: %s", e)
            return None

    def _poll_and_download(self, task_id: str, output_path: Path,
                           max_wait: int = 900) -> Path | None:
        import time
        import httpx
        waited = 0
        while waited < max_wait:
            time.sleep(10)
            waited += 10
            try:
                tr = httpx.get(f"{self.API_BASE}/tasks/{task_id}",
                               headers=self._headers(), timeout=20)
                if tr.status_code != 200:
                    continue
                td = tr.json() or {}
                status = td.get("status", "")
                logger.info("Runway status (%ds): %s", waited, status)
                if status == "SUCCEEDED":
                    out = td.get("output") or []
                    url = out[0] if out else None
                    if not url:
                        return None
                    output_path = output_path.with_suffix(".mp4")
                    output_path.parent.mkdir(parents=True, exist_ok=True)
                    dr = httpx.get(url, follow_redirects=True, timeout=180)
                    dr.raise_for_status()
                    output_path.write_bytes(dr.content)
                    logger.info("Runway video saved to %s", output_path)
                    return output_path
                if status in ("FAILED", "CANCELLED"):
                    logger.error("Runway task %s: %s", status, td)
                    return None
            except Exception as e:
                logger.error("Runway poll error: %s", e)
        logger.error("Runway polling timed out")
        return None


def generate_character(photo_path: Path, description: str, output_path: Path) -> Path | None:
    """Create a 'close-but-not-you' character image from a photo (Nano Banana).

    Uses the uploaded photo as a visual anchor and restyles it per the
    description (altered likeness, authoritative setting). Needs GOOGLE_API_KEY;
    returns None if unavailable so the UI can fall back to a manual upload.
    """
    from gtm_engine.utils.media import generate_image
    prompt = (
        "Create a photorealistic portrait of a person clearly INSPIRED BY but "
        "NOT identical to the reference photo — change hairstyle, jawline and "
        "styling enough that they are not recognisable as the same individual, "
        "while keeping a similar age, build and overall vibe. "
        f"Setting and styling: {description}. "
        "Authoritative, credible, well-lit, neutral professional background, "
        "head-and-shoulders framing suitable for a talking-head video."
    )
    try:
        return generate_image(prompt, output_path=output_path, quality="standard",
                              aspect_ratio="9:16", reference_image=Path(photo_path))
    except Exception as e:
        logger.error("Character generation failed: %s", e)
        return None


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
            out = []
            # Studio / stock avatars (classic — stiffer).
            for a in (data.get("avatars", []) if isinstance(data, dict) else []):
                out.append({
                    "id": a.get("avatar_id", ""),
                    "name": a.get("avatar_name", ""),
                    "preview_url": a.get("preview_image_url", ""),
                    "gender": a.get("gender", ""),
                })
            # Photo avatars (Avatar IV — expressive). Prefix the id so render()
            # knows to use the talking_photo character type.
            for tp in (data.get("talking_photos", []) if isinstance(data, dict) else []):
                tp_id = tp.get("talking_photo_id", "")
                if not tp_id:
                    continue
                out.append({
                    "id": f"tp:{tp_id}",
                    "name": f"{tp.get('talking_photo_name', tp_id)} (photo · expressive)",
                    "preview_url": tp.get("preview_image_url", ""),
                    "gender": "",
                })
            return out
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

    def upload_image(self, image_path: Path) -> str | None:
        """Upload a photo and return its image_key (drives Avatar IV / av4)."""
        if not self.is_configured():
            raise AvatarProviderError("HEYGEN_API_KEY not set")
        try:
            import httpx
            p = Path(image_path)
            mime = "image/jpeg" if p.suffix.lower() in (".jpg", ".jpeg") else "image/png"
            r = httpx.post(
                "https://upload.heygen.com/v1/asset",
                headers={"X-Api-Key": self.api_key, "Content-Type": mime},
                content=p.read_bytes(), timeout=120,
            )
            r.raise_for_status()
            d = r.json().get("data", {}) or {}
            return d.get("image_key") or d.get("id")
        except Exception as e:
            logger.error("HeyGen upload_image failed: %s", e)
            return None

    def get_template_variables(self, template_id: str) -> dict:
        """Return {variable_name: type} for a HeyGen template (text/image/…)."""
        try:
            import httpx
            r = httpx.get(f"{self.API_V2}/template/{template_id}",
                          headers=self._headers(), timeout=20)
            r.raise_for_status()
            data = r.json().get("data", {}) or {}
            vs = data.get("variables", {}) or {}
            return {n: (v.get("type", "text") if isinstance(v, dict) else "text")
                    for n, v in vs.items()}
        except Exception as e:
            logger.error("get_template_variables failed: %s", e)
            return {}

    def _render_template(self, req: "RenderRequest", width: int, height: int) -> "Path | None":
        """Full automation: render the user's HeyGen template, filling the script
        into its first text variable. The avatar/look/style live in the template."""
        import httpx
        self.last_error = ""
        tid = req.template_id
        varmap = self.get_template_variables(tid)
        text_vars = [n for n, t in varmap.items() if t == "text"]
        if not text_vars:
            self.last_error = ("Your HeyGen template has no text variable for the script. "
                               "In HeyGen, mark the script text box as a variable, then reuse "
                               "the template id.")
            return None
        script_var = text_vars[0]
        payload = {
            "title": "Quantum Tools reel",
            "caption": False,
            "variables": {
                script_var: {"name": script_var, "type": "text",
                             "properties": {"content": req.script}},
            },
            "dimension": {"width": width, "height": height},
        }
        if req.callback_url:
            payload["callback_url"] = req.callback_url
        try:
            r = httpx.post(f"{self.API_V2}/template/{tid}/generate",
                           headers=self._headers(), json=payload, timeout=30)
            if r.status_code != 200:
                self.last_error = f"HeyGen template {r.status_code}: {r.text[:250]}"
                return None
            vid = (r.json().get("data", {}) or {}).get("video_id")
            if not vid:
                self.last_error = f"template returned no video_id: {r.text[:200]}"
                return None
            if req.callback_url:
                return None
            result = self._poll_and_download(vid, req.output_path)
            if not result and not self.last_error:
                self.last_error = "template render didn't complete (timeout/failed)."
            return result
        except Exception as e:
            self.last_error = f"template exception: {e}"
            return None

    def _render_av4(self, req: "RenderRequest", width: int, height: int) -> "Path | None":
        """Avatar IV (expressive) render — from either an uploaded photo's
        image_key OR an existing Avatar IV avatar/look you already built."""
        import httpx
        self.last_error = ""
        voice_id = req.voice_id
        if not voice_id:
            voices = self.list_voices()
            voice_id = voices[0]["id"] if voices else ""
        payload = {
            "video_title": (req.script or "GTM reel").strip()[:60] or "GTM reel",
            "script": req.script,
            "voice_id": voice_id,
            "dimension": {"width": width, "height": height},
        }
        if req.image_key:
            payload["image_key"] = req.image_key
        elif req.avatar_id.startswith("tp:"):
            # Reference an EXISTING Avatar IV avatar/look (the id you copied).
            payload["talking_photo_id"] = req.avatar_id[3:]
        if req.motion_prompt:
            payload["custom_motion_prompt"] = req.motion_prompt
            payload["enhance_custom_motion_prompt"] = True
        if req.callback_url:
            payload["callback_url"] = req.callback_url
        try:
            r = httpx.post(f"{self.API_V2}/video/av4/generate",
                           headers=self._headers(), json=payload, timeout=30)
            if r.status_code != 200:
                self.last_error = f"HeyGen av4 {r.status_code}: {r.text[:250]}"
                return None
            vid = (r.json().get("data", {}) or {}).get("video_id")
            if not vid:
                self.last_error = f"av4 returned no video_id: {r.text[:200]}"
                return None
            if req.callback_url:
                return None
            result = self._poll_and_download(vid, req.output_path)
            if not result and not self.last_error:
                self.last_error = "av4 render didn't complete (timeout/failed)."
            return result
        except Exception as e:
            self.last_error = f"av4 exception: {e}"
            return None

    # ── render ───────────────────────────────────────────────────────────────
    def render(self, req: RenderRequest) -> Path | None:
        if not self.is_configured():
            raise AvatarProviderError("HEYGEN_API_KEY not set")

        import httpx

        # 720p by default (cheaper credits); HD renders at full 1080p.
        if req.hd:
            dims = {"9:16": (1080, 1920), "16:9": (1920, 1080), "1:1": (1080, 1080)}
        else:
            dims = {"9:16": (720, 1280), "16:9": (1280, 720), "1:1": (720, 720)}
        width, height = dims.get(req.aspect_ratio, dims["9:16"])

        # Full automation with the user's OWN trained avatar: a HeyGen template
        # (avatar/look/style baked in; we fill the script). Preferred path.
        if req.template_id:
            return self._render_template(req, width, height)

        # Avatar IV (expressive) needs an uploaded photo's image_key. HeyGen's API
        # will NOT drive a trained avatar/look by id — so a "tp:" look with no
        # image_key can't render; tell the user to add a photo rather than 400.
        if req.image_key:
            return self._render_av4(req, width, height)
        if req.avatar_id.startswith("tp:"):
            self.last_error = ("Avatar IV needs an uploaded photo. HeyGen's API can't render "
                               "from a trained avatar/look id — in Cast & Voice, use "
                               "'⭐ Avatar IV — upload a photo' (a photo of your presenter).")
            return None

        # Voice block: audio upload takes precedence over TTS (mutually exclusive).
        if req.audio_asset_id:
            voice_block = {"type": "audio", "audio_asset_id": req.audio_asset_id}
        else:
            voice_id = req.voice_id
            if not voice_id:
                voices = self.list_voices()
                voice_id = voices[0]["id"] if voices else ""
            voice_block = {"type": "text", "input_text": req.script, "voice_id": voice_id}
            # Speed <1 slows the delivery so it breathes (HeyGen accepts 0.5–1.5).
            try:
                sp = round(float(req.speed), 2)
                if 0.5 <= sp <= 1.5 and sp != 1.0:
                    voice_block["speed"] = sp
            except (TypeError, ValueError):
                pass

        # A "tp:" prefix marks a photo avatar (Avatar IV — expressive), which
        # uses the talking_photo character type; otherwise a studio avatar.
        if req.avatar_id.startswith("tp:"):
            base_character = {"type": "talking_photo", "talking_photo_id": req.avatar_id[3:]}
        else:
            base_character = {"type": "avatar", "avatar_id": req.avatar_id, "avatar_style": "normal"}

        # Expressive fields (motion_prompt / expressiveness) only apply to
        # Avatar IV/V avatars; classic avatars ignore or reject them. We attempt
        # them, then transparently retry without on a 400 so any avatar works.
        expressive_character = dict(base_character)
        if req.motion_prompt:
            expressive_character["motion_prompt"] = req.motion_prompt
        # HeyGen expressiveness is 0..1; pass through.
        expressive_character["expressiveness"] = round(float(req.expressiveness), 2)

        def _build(character):
            p = {
                "video_inputs": [{
                    "character": character,
                    "voice": voice_block,
                    "background": {"type": "color", "value": req.background},
                }],
                "dimension": {"width": width, "height": height},
            }
            if req.callback_url:
                p["callback_url"] = req.callback_url
            return p

        def _submit(character) -> tuple[str | None, int, str]:
            r = httpx.post(f"{self.API_V2}/video/generate", headers=self._headers(),
                           json=_build(character), timeout=30)
            vid = None
            if r.status_code == 200:
                vid = (r.json().get("data", {}) or {}).get("video_id")
            return vid, r.status_code, r.text[:300]

        self.last_error = ""
        try:
            video_id, code, body = _submit(expressive_character)
            if not video_id and code == 400:
                # Retry without the expressive fields (classic avatar path).
                logger.info("HeyGen 400 with expressive fields (%s) — retrying plain", body)
                video_id, code, body = _submit(base_character)
            if not video_id:
                self.last_error = f"HeyGen submit {code}: {body}"
                logger.error("HeyGen returned no video_id (%s): %s", code, body)
                return None
            logger.info("HeyGen render submitted: %s", video_id)

            if req.callback_url:
                return None  # webhook path — caller handles completion
            result = self._poll_and_download(video_id, req.output_path)
            if not result and not self.last_error:
                self.last_error = "HeyGen render didn't complete (timeout or failed status)."
            return result
        except Exception as e:
            self.last_error = f"HeyGen render exception: {e}"
            logger.error("HeyGen render failed: %s", e)
            return None

    # ── Cinematic Avatar (Seedance / "Avatar Shots") ──────────────────────────
    def list_avatar_looks(self, group_id: str) -> list[dict]:
        """List the looks in an avatar group so the user can pick look ids for
        cinematic renders. Best-effort — returns [] if the endpoint shape differs."""
        if not self.is_configured() or not group_id:
            return []
        try:
            import httpx
            r = httpx.get(f"{self.API_V2}/avatar_group/{group_id}/avatars",
                          headers=self._headers(), timeout=20)
            r.raise_for_status()
            data = r.json().get("data", {}) or {}
            looks = data.get("avatar_list", data.get("avatars", [])) if isinstance(data, dict) else []
            out = []
            for lk in looks:
                lid = lk.get("id") or lk.get("avatar_id") or lk.get("look_id") or ""
                if lid:
                    out.append({"id": lid, "name": lk.get("name") or lk.get("avatar_name") or lid,
                                "preview_url": lk.get("image_url") or lk.get("preview_image_url", "")})
            return out
        except Exception as e:
            logger.error("HeyGen list_avatar_looks failed: %s", e)
            return []

    def generate_cinematic(self, prompt: str, look_ids: list[str], output_path: Path,
                           aspect_ratio: str = "9:16", duration: int | None = None,
                           resolution: str = "720p", title: str = "Cinematic reel") -> Path | None:
        """Seedance 'Avatar Shots' — cast your verified digital twin in a cinematic
        scene (full-body motion + camera work). POST /v3/videos type cinematic_avatar.
        Runs on your HeyGen key/credits. Returns the downloaded mp4, or None."""
        import httpx
        self.last_error = ""
        if not self.is_configured():
            raise AvatarProviderError("HEYGEN_API_KEY not set")
        ids = [i for i in (look_ids or []) if i][:3]
        if not ids:
            self.last_error = "No avatar look id set for cinematic render."
            return None
        payload = {
            "type": "cinematic_avatar",
            "prompt": (prompt or "").strip()[:10000] or "A confident professional presenter, cinematic.",
            "avatar_id": ids,
            "aspect_ratio": aspect_ratio,
            "resolution": resolution,
            "title": title[:100],
        }
        if duration:
            payload["duration"] = max(4, min(15, int(duration)))
        else:
            payload["auto_duration"] = True
        try:
            r = httpx.post(f"{self.API_V3}/videos", headers=self._headers(),
                           json=payload, timeout=30)
            if r.status_code not in (200, 201):
                self.last_error = f"HeyGen cinematic {r.status_code}: {r.text[:250]}"
                return None
            vid = (r.json().get("data", {}) or {}).get("video_id")
            if not vid:
                self.last_error = f"cinematic returned no video_id: {r.text[:200]}"
                return None
            result = self._poll_v3(vid, output_path)
            if not result and not self.last_error:
                self.last_error = "cinematic render didn't complete (timeout/failed)."
            return result
        except Exception as e:
            self.last_error = f"cinematic exception: {e}"
            return None

    def _poll_v3(self, video_id: str, output_path: Path, max_wait: int = 900) -> Path | None:
        """Poll GET /v3/videos/{id} until completed, then download video_url."""
        import httpx
        waited = 0
        while waited < max_wait:
            time.sleep(10)
            waited += 10
            try:
                sr = httpx.get(f"{self.API_V3}/videos/{video_id}",
                               headers=self._headers(), timeout=20)
                if sr.status_code != 200:
                    continue
                sd = sr.json().get("data", {}) or {}
                status = sd.get("status", "")
                logger.info("HeyGen cinematic status (%ds): %s", waited, status)
                if status == "completed":
                    url = sd.get("video_url") or sd.get("video_url_caption")
                    if not url:
                        return None
                    output_path.parent.mkdir(parents=True, exist_ok=True)
                    dr = httpx.get(url, follow_redirects=True, timeout=300)
                    dr.raise_for_status()
                    output_path.write_bytes(dr.content)
                    return output_path
                if status == "failed":
                    self.last_error = f"cinematic failed: {str(sd.get('error') or sd)[:250]}"
                    return None
            except Exception as e:
                logger.error("HeyGen v3 poll error: %s", e)
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
                    self.last_error = f"HeyGen job failed: {str(sd.get('error') or sd)[:250]}"
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
    mode TEXT DEFAULT 'voice_clone',     -- voice_clone | record | hybrid | transfer
    motion_prompt TEXT DEFAULT '',
    expressiveness REAL DEFAULT 0.5,
    background TEXT DEFAULT '#0d1b2a',
    aspect_ratio TEXT DEFAULT '9:16',
    character_image_path TEXT DEFAULT '',
    character_description TEXT DEFAULT '',
    gesture INTEGER DEFAULT 1,
    fal_model TEXT DEFAULT '',
    updated_at TEXT
);
"""

# Columns added after the table first shipped — applied idempotently on load.
_CONFIG_MIGRATIONS = {
    "character_image_path": "TEXT DEFAULT ''",
    "character_description": "TEXT DEFAULT ''",
    "gesture": "INTEGER DEFAULT 1",
    "fal_model": "TEXT DEFAULT ''",
}


class AvatarConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    provider: str = "none"
    avatar_id: str = ""
    avatar_name: str = ""
    voice_id: str = ""
    voice_name: str = ""
    mode: str = "voice_clone"            # voice_clone | record | hybrid | transfer
    motion_prompt: str = ""
    expressiveness: float = 0.5
    background: str = "#0d1b2a"
    aspect_ratio: str = "9:16"
    character_image_path: str = ""
    character_description: str = ""
    gesture: bool = True
    fal_model: str = ""                   # fal.ai text→video model id for generated b-roll
    updated_at: str = ""

    def is_ready(self) -> bool:
        """True when we have enough to produce on the chosen provider."""
        if self.provider in ("", "none"):
            return False
        if self.provider == "runway":
            return bool(self.character_image_path)
        if self.provider == "mock":
            return True
        return bool(self.avatar_id)


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
            # Add any columns introduced after this table first shipped.
            existing = {r[1] for r in conn.execute("PRAGMA table_info(avatar_config)")}
            for col, decl in _CONFIG_MIGRATIONS.items():
                if col not in existing:
                    conn.execute(f"ALTER TABLE avatar_config ADD COLUMN {col} {decl}")
            conn.commit()

    def load(self) -> AvatarConfig:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM avatar_config WHERE id = 1").fetchone()
            if not row:
                # provider falls back to the AVATAR_PROVIDER env var if set
                return AvatarConfig(provider=os.getenv("AVATAR_PROVIDER", "none").lower())
            keys = row.keys()
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
                character_image_path=(row["character_image_path"] if "character_image_path" in keys else "") or "",
                character_description=(row["character_description"] if "character_description" in keys else "") or "",
                gesture=bool(row["gesture"]) if "gesture" in keys and row["gesture"] is not None else True,
                fal_model=(row["fal_model"] if "fal_model" in keys else "") or "",
                updated_at=row["updated_at"] or "",
            )

    def save(self, cfg: AvatarConfig) -> None:
        cfg.updated_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO avatar_config (
                    id, provider, avatar_id, avatar_name, voice_id, voice_name,
                    mode, motion_prompt, expressiveness, background, aspect_ratio,
                    character_image_path, character_description, gesture, fal_model, updated_at
                ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    provider=excluded.provider, avatar_id=excluded.avatar_id,
                    avatar_name=excluded.avatar_name, voice_id=excluded.voice_id,
                    voice_name=excluded.voice_name, mode=excluded.mode,
                    motion_prompt=excluded.motion_prompt, expressiveness=excluded.expressiveness,
                    background=excluded.background, aspect_ratio=excluded.aspect_ratio,
                    character_image_path=excluded.character_image_path,
                    character_description=excluded.character_description,
                    gesture=excluded.gesture, fal_model=excluded.fal_model,
                    updated_at=excluded.updated_at
                """,
                (cfg.provider, cfg.avatar_id, cfg.avatar_name, cfg.voice_id, cfg.voice_name,
                 cfg.mode, cfg.motion_prompt, cfg.expressiveness, cfg.background,
                 cfg.aspect_ratio, cfg.character_image_path, cfg.character_description,
                 1 if cfg.gesture else 0, cfg.fal_model, cfg.updated_at),
            )
            conn.commit()


# ---------------------------------------------------------------------------
# Registry + factory
# ---------------------------------------------------------------------------

PROVIDERS: dict[str, type[AvatarProvider]] = {
    "none": NoAvatarProvider,
    "mock": MockProvider,
    "heygen": HeyGenProvider,
    "runway": RunwayProvider,
    # Future: "d-id", "synthesia", "hedra"
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
