"""Google Gemini media generation — video (Veo), images (Imagen), and TTS.

All visual and audio content is generated through the Google Gemini API.
This keeps the stack to two providers: Anthropic (Claude) for thinking,
Google (Gemini) for everything else.
"""

import json
import logging
import time
from pathlib import Path

from tenacity import retry, stop_after_attempt, wait_exponential

from gtm_engine.config import GOOGLE_API_KEY, CONTENT_QUEUE_DIR

logger = logging.getLogger(__name__)

OUTPUT_MEDIA_DIR = CONTENT_QUEUE_DIR / "media"
OUTPUT_MEDIA_DIR.mkdir(parents=True, exist_ok=True)


def _get_client():
    """Get a configured Google GenAI client."""
    from google import genai
    return genai.Client(api_key=GOOGLE_API_KEY)


# --- Video Generation (Veo) ---

def generate_video(
    prompt: str,
    output_path: Path | None = None,
    model: str = "veo-3.1-generate-preview",
    duration: int = 8,
    aspect_ratio: str = "16:9",
    resolution: str = "720p",
) -> Path | None:
    """Generate a video clip from a text prompt using Google Veo.

    Returns the path to the saved video file, or None on failure.
    Costs ~$0.80-3.20 per 8-second clip depending on resolution.
    """
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY not set — skipping video generation")
        return None

    client = _get_client()
    from google.genai import types

    logger.info("Generating video: %s (model=%s, %ds, %s)", prompt[:60], model, duration, resolution)

    try:
        operation = client.models.generate_videos(
            model=model,
            prompt=prompt,
            config=types.GenerateVideosConfig(
                number_of_videos=1,
                duration_seconds=duration,
                aspect_ratio=aspect_ratio,
            ),
        )

        # Poll until done (video generation takes 30-120 seconds)
        max_wait = 300  # 5 minutes max
        waited = 0
        while not operation.done and waited < max_wait:
            time.sleep(10)
            waited += 10
            operation = client.operations.get(operation)
            logger.info("  Video generation: %ds elapsed...", waited)

        if not operation.done:
            logger.error("Video generation timed out after %ds", max_wait)
            return None

        if not operation.result or not operation.result.generated_videos:
            logger.error("Video generation returned no results")
            return None

        # Save the video — download from URI since .save() doesn't work for remote videos
        video = operation.result.generated_videos[0]
        if output_path is None:
            output_path = OUTPUT_MEDIA_DIR / f"video_{int(time.time())}.mp4"

        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Try direct save first, fall back to downloading from URI
        try:
            video.video.save(str(output_path))
        except Exception:
            # Download from the video URI
            import httpx
            video_uri = video.video.uri if hasattr(video.video, 'uri') else None
            if video_uri:
                logger.info("  Downloading video from URI...")
                resp = httpx.get(video_uri)
                resp.raise_for_status()
                output_path.write_bytes(resp.content)
            else:
                # Try accessing raw bytes
                if hasattr(video.video, 'video_bytes'):
                    output_path.write_bytes(video.video.video_bytes)
                elif hasattr(video.video, 'data'):
                    output_path.write_bytes(video.video.data)
                else:
                    logger.error("Cannot extract video data — no save/uri/bytes method available")
                    return None

        logger.info("Video saved to %s", output_path)
        return output_path

    except Exception as e:
        logger.error("Video generation failed: %s", e)
        return None


# --- Image Generation (Imagen) ---

@retry(wait=wait_exponential(min=2, max=30), stop=stop_after_attempt(3))
def generate_image(
    prompt: str,
    output_path: Path | None = None,
    model: str = "imagen-3.0-generate-002",
    aspect_ratio: str = "1:1",
) -> Path | None:
    """Generate an image from a text prompt using Google Imagen.

    Returns the path to the saved image file, or None on failure.
    Costs ~$0.02-0.06 per image.
    """
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY not set — skipping image generation")
        return None

    client = _get_client()
    from google.genai import types

    logger.info("Generating image: %s", prompt[:80])

    try:
        response = client.models.generate_images(
            model=model,
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio=aspect_ratio,
            ),
        )

        if not response.generated_images:
            logger.error("Image generation returned no results")
            return None

        image = response.generated_images[0]
        if output_path is None:
            output_path = OUTPUT_MEDIA_DIR / f"image_{int(time.time())}.png"

        output_path.parent.mkdir(parents=True, exist_ok=True)
        image.image.save(str(output_path))
        logger.info("Image saved to %s", output_path)
        return output_path

    except Exception as e:
        logger.error("Image generation failed: %s", e)
        return None


# --- Batch media generation for derivatives ---

def generate_reel_media(script_sections: list[dict], title: str = "") -> dict:
    """Generate video clips and assemble media for a reel script.

    Takes the structured reel script sections and generates a video clip
    for each section. Returns paths to all generated media.
    """
    results = {"clips": [], "thumbnail": None}

    # Generate a thumbnail image
    thumb_prompt = (
        f"Professional dark background (#0a0a0f), modern data visualization style. "
        f"Bold text overlay in purple (#6c63ff). Topic: {title}. "
        f"Clean, minimal, high contrast. No people."
    )
    thumb_path = generate_image(
        thumb_prompt,
        output_path=OUTPUT_MEDIA_DIR / f"thumb_{int(time.time())}.png",
        aspect_ratio="9:16",
    )
    results["thumbnail"] = str(thumb_path) if thumb_path else None

    # Generate video clips for each section
    for i, section in enumerate(script_sections):
        clip_prompt = (
            f"Professional talking-head style presenter explaining: "
            f"{section.get('script', section.get('text', ''))}. "
            f"Dark modern office background. Confident, authoritative tone. "
            f"Clean lighting, shallow depth of field."
        )
        clip_path = generate_video(
            clip_prompt,
            output_path=OUTPUT_MEDIA_DIR / f"reel_clip_{i}_{int(time.time())}.mp4",
            duration=4,
            aspect_ratio="9:16",
            resolution="720p",
        )
        if clip_path:
            results["clips"].append(str(clip_path))

    return results


def generate_carousel_images(slides: list[dict]) -> list[str]:
    """Generate images for each slide of a LinkedIn carousel.

    Returns list of paths to generated images.
    """
    paths = []
    for i, slide in enumerate(slides):
        headline = slide.get("headline", slide.get("text", f"Slide {i+1}"))
        body = slide.get("body", "")

        prompt = (
            f"Professional presentation slide, dark background (#0a0a0f). "
            f"Large bold headline in white: '{headline}'. "
            f"Subtitle text in light gray. Purple accent (#6c63ff) for emphasis. "
            f"Clean modern design. Playfair Display heading style. "
            f"Slide {i+1} of a business carousel."
        )

        path = generate_image(
            prompt,
            output_path=OUTPUT_MEDIA_DIR / f"carousel_slide_{i}_{int(time.time())}.png",
            aspect_ratio="1:1",
        )
        if path:
            paths.append(str(path))

    return paths


def generate_social_graphic(title: str, subtitle: str = "", style: str = "linkedin") -> str | None:
    """Generate a single social media graphic.

    Returns path to the generated image, or None on failure.
    """
    aspect = "1:1" if style == "instagram" else "1.91:1"

    prompt = (
        f"Professional social media graphic. Dark background (#0a0a0f). "
        f"Bold headline: '{title}'. "
        f"{'Subtitle: ' + subtitle + '. ' if subtitle else ''}"
        f"Purple accent (#6c63ff), gold highlight (#ffd166). "
        f"Clean typography, modern data-driven aesthetic. "
        f"No stock photos. Minimal design."
    )

    path = generate_image(prompt, aspect_ratio=aspect)
    return str(path) if path else None
