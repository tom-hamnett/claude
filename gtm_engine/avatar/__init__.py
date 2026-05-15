"""Avatar Provider Abstraction — provider-agnostic interface.

The engine generates the script and producer brief. The avatar provider
(HeyGen, D-ID, Synthesia, Hedra, or 'none') turns that script into a
talking-head video of the user's chosen avatar.

This module exposes a single `AvatarProvider` interface. Each provider
implementation maps the engine's request to its own API. The user brings
their own API key (BYOK).

Usage:
    from gtm_engine.avatar import get_provider
    provider = get_provider()  # reads AVATAR_PROVIDER env var
    video_path = provider.generate_video(
        script="The exact spoken text",
        avatar_id="user's trained avatar id",
        output_path=Path("output.mp4"),
    )
"""

import logging
import os
from abc import ABC, abstractmethod
from pathlib import Path

logger = logging.getLogger(__name__)


class AvatarProviderError(Exception):
    """Raised when an avatar provider call fails."""


class AvatarProvider(ABC):
    """Base interface every avatar provider must implement."""

    provider_id: str = "base"
    provider_name: str = "Base"
    requires_api_key: bool = True

    @abstractmethod
    def is_configured(self) -> bool:
        """Return True if this provider has all required credentials."""
        ...

    @abstractmethod
    def list_avatars(self) -> list[dict]:
        """Return a list of available avatars: [{id, name, preview_url}]."""
        ...

    @abstractmethod
    def generate_video(
        self,
        script: str,
        avatar_id: str,
        output_path: Path,
        voice_id: str | None = None,
        background: str = "transparent",
        aspect_ratio: str = "9:16",
    ) -> Path | None:
        """Generate a video and save it to output_path.

        Returns the saved path on success, None on failure.
        """
        ...

    @abstractmethod
    def list_voices(self) -> list[dict]:
        """Return available voices for this provider."""
        ...


class NoAvatarProvider(AvatarProvider):
    """No-avatar mode — content uses TTS voiceover + B-roll only.

    This is the default when no avatar provider is configured.
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

    def generate_video(self, *args, **kwargs) -> Path | None:
        logger.info("No-avatar mode — skipping avatar video generation")
        return None


class HeyGenProvider(AvatarProvider):
    """HeyGen Avatar API integration.

    Requires HEYGEN_API_KEY in environment. Pricing starts around $49/mo
    for the creator tier. User trains an avatar from a 2-minute video of
    themselves; the engine calls v2 of HeyGen's API to render videos.
    """

    provider_id = "heygen"
    provider_name = "HeyGen"
    API_BASE = "https://api.heygen.com/v2"

    def __init__(self):
        self.api_key = os.getenv("HEYGEN_API_KEY", "")

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def _headers(self) -> dict:
        return {
            "X-Api-Key": self.api_key,
            "Content-Type": "application/json",
        }

    def list_avatars(self) -> list[dict]:
        """Fetch the user's trained avatars from HeyGen."""
        if not self.is_configured():
            return []
        try:
            import httpx
            r = httpx.get(f"{self.API_BASE}/avatars", headers=self._headers(), timeout=20)
            r.raise_for_status()
            data = r.json().get("data", {})
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
        """Fetch the available voices from HeyGen."""
        if not self.is_configured():
            return []
        try:
            import httpx
            r = httpx.get(f"{self.API_BASE}/voices", headers=self._headers(), timeout=20)
            r.raise_for_status()
            data = r.json().get("data", {})
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

    def generate_video(
        self,
        script: str,
        avatar_id: str,
        output_path: Path,
        voice_id: str | None = None,
        background: str = "transparent",
        aspect_ratio: str = "9:16",
    ) -> Path | None:
        """Generate a video via HeyGen v2 API and download to output_path.

        HeyGen's flow:
        1. POST /v2/video/generate with the avatar + script — returns video_id
        2. Poll GET /v2/video_status?video_id=... until status == "completed"
        3. Download the video_url to disk
        """
        if not self.is_configured():
            raise AvatarProviderError("HEYGEN_API_KEY not set")

        import time
        import httpx

        # Default voice if not provided — HeyGen needs a voice_id always
        if not voice_id:
            voices = self.list_voices()
            voice_id = voices[0]["id"] if voices else ""

        # Map aspect ratio to dimensions
        dimensions = {"9:16": (720, 1280), "16:9": (1280, 720), "1:1": (720, 720)}
        width, height = dimensions.get(aspect_ratio, (720, 1280))

        # Step 1: submit generation
        payload = {
            "video_inputs": [
                {
                    "character": {
                        "type": "avatar",
                        "avatar_id": avatar_id,
                        "avatar_style": "normal",
                    },
                    "voice": {
                        "type": "text",
                        "input_text": script,
                        "voice_id": voice_id,
                    },
                    "background": {
                        "type": "color" if background == "transparent" else "color",
                        "value": "#0a0a0f" if background == "transparent" else background,
                    },
                }
            ],
            "dimension": {"width": width, "height": height},
        }

        try:
            r = httpx.post(
                f"{self.API_BASE}/video/generate",
                headers=self._headers(),
                json=payload,
                timeout=30,
            )
            r.raise_for_status()
            video_id = r.json().get("data", {}).get("video_id")
            if not video_id:
                logger.error("HeyGen did not return a video_id")
                return None
            logger.info("HeyGen video submitted: %s", video_id)

            # Step 2: poll status
            video_url = None
            max_wait = 600  # 10 minutes
            waited = 0
            while waited < max_wait:
                time.sleep(10)
                waited += 10
                status_r = httpx.get(
                    f"{self.API_BASE}/video_status.get",
                    params={"video_id": video_id},
                    headers=self._headers(),
                    timeout=20,
                )
                if status_r.status_code != 200:
                    continue
                status_data = status_r.json().get("data", {})
                status = status_data.get("status", "")
                logger.info("HeyGen status (%ds): %s", waited, status)
                if status == "completed":
                    video_url = status_data.get("video_url")
                    break
                if status == "failed":
                    logger.error("HeyGen generation failed: %s", status_data)
                    return None

            if not video_url:
                logger.error("HeyGen polling timed out")
                return None

            # Step 3: download
            output_path.parent.mkdir(parents=True, exist_ok=True)
            download_r = httpx.get(video_url, follow_redirects=True, timeout=120)
            download_r.raise_for_status()
            output_path.write_bytes(download_r.content)
            logger.info("HeyGen video saved to %s", output_path)
            return output_path

        except Exception as e:
            logger.error("HeyGen generation failed: %s", e)
            return None


# ---------------------------------------------------------------------------
# Registry + factory
# ---------------------------------------------------------------------------

PROVIDERS: dict[str, type[AvatarProvider]] = {
    "none": NoAvatarProvider,
    "heygen": HeyGenProvider,
    # Future: "d-id": DIDProvider, "synthesia": SynthesiaProvider, "hedra": HedraProvider
}


def get_provider(provider_id: str | None = None) -> AvatarProvider:
    """Get the active avatar provider.

    Args:
        provider_id: explicit provider id, or None to read AVATAR_PROVIDER env var
                     (defaults to 'none').
    """
    if not provider_id:
        provider_id = os.getenv("AVATAR_PROVIDER", "none").lower()

    cls = PROVIDERS.get(provider_id, NoAvatarProvider)
    return cls()


def list_providers() -> list[dict]:
    """Return metadata about all known providers (for UI)."""
    return [
        {
            "id": p_id,
            "name": cls().provider_name,
            "requires_api_key": cls.requires_api_key,
            "configured": cls().is_configured(),
        }
        for p_id, cls in PROVIDERS.items()
    ]
