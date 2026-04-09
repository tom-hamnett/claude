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
                # Must include API key for authenticated download
                download_url = video_uri
                if "?" in download_url:
                    download_url += f"&key={GOOGLE_API_KEY}"
                else:
                    download_url += f"?key={GOOGLE_API_KEY}"
                resp = httpx.get(download_url, follow_redirects=True, timeout=120)
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


# --- Image Generation (Gemini native) ---

@retry(wait=wait_exponential(min=2, max=30), stop=stop_after_attempt(3))
def generate_image(
    prompt: str,
    output_path: Path | None = None,
    quality: str = "standard",
) -> Path | None:
    """Generate an image using Google's image generation models.

    quality="standard" uses gemini-3-pro-image-preview (fast, cheap, good for slides/social)
    quality="ultra" uses imagen-4.0-ultra-generate-001 (best photorealism, slower)

    Returns the path to the saved image file, or None on failure.
    """
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY not set -- skipping image generation")
        return None

    client = _get_client()
    from google.genai import types

    # Route to the right model based on quality tier
    if quality == "ultra":
        model = "imagen-4.0-ultra-generate-001"
    else:
        model = "gemini-3-pro-image-preview"

    logger.info("Generating image (%s): %s", model.split("/")[-1], prompt[:80])

    try:
        response = client.models.generate_content(
            model=model,
            contents=f"Generate an image: {prompt}",
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
            ),
        )

        # Extract image from response parts
        if output_path is None:
            output_path = OUTPUT_MEDIA_DIR / f"image_{int(time.time())}.png"
        output_path.parent.mkdir(parents=True, exist_ok=True)

        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                image_bytes = part.inline_data.data
                output_path.write_bytes(image_bytes)
                logger.info("Image saved to %s", output_path)
                return output_path

        logger.error("No image found in Gemini response")
        return None

    except Exception as e:
        logger.error("Image generation failed: %s", e)
        return None


# --- Brand-aware prompt building ---

def _get_video_prompt(script_text: str, scene_type: str = "talking_head") -> str:
    """Build a video generation prompt from brand standards.

    Pulls presenter description, environment, lighting, and camera
    direction from brand_standards.json so every clip is consistent.
    """
    try:
        from gtm_engine.brand import load_brand_standards
        standards = load_brand_standards()
        presenter = standards.get("presenter", {})
        production = standards.get("video_production", {})
        ai_template = production.get("ai_prompt_template", "")
    except Exception:
        presenter = {}
        production = {}
        ai_template = ""

    if ai_template:
        # Use the master AI prompt template with script content injected
        subject = presenter.get("description", "Male presenter, early 30s-40s, British")
        prompt = ai_template.replace("[Subject]", f"{subject} delivering: '{script_text[:150]}'")
    else:
        # Fallback
        prompt = (
            f"{presenter.get('description', 'Professional male presenter')}, "
            f"{presenter.get('demeanour', 'calm and authoritative')}. "
            f"Delivering: '{script_text[:150]}'. "
            f"Cinematography: Medium close-up, 50mm lens, shallow depth of field. "
            f"Lighting: Moody side-lighting, Rembrandt style, soft shadows. "
            f"Environment: Minimalist modern study, dark walnut textures. "
            f"Color grade: Desaturated earth tones, deep blacks, film grain."
        )

    # Add wardrobe and performance notes
    wardrobe = presenter.get("wardrobe", "")
    if wardrobe:
        prompt += f" Wardrobe: {wardrobe}."

    eyeline = production.get("eyeline", "")
    if eyeline and scene_type == "discursive":
        prompt += f" {eyeline}"

    return prompt


def _get_image_prompt(title: str, subtitle: str = "", style: str = "social") -> str:
    """Build an image generation prompt from brand standards."""
    try:
        from gtm_engine.brand import load_brand_standards
        standards = load_brand_standards()
        colours = standards.get("visual", {}).get("colours", {})
        bg = colours.get("background", "#0a0a0f")
        accent = colours.get("primary_accent", "#6c63ff")
        gold = colours.get("gold_accent", "#ffd166")
        typography = standards.get("visual", {}).get("typography", {})
        heading_font = typography.get("headings", "Playfair Display")
    except Exception:
        bg, accent, gold, heading_font = "#0a0a0f", "#6c63ff", "#ffd166", "Playfair Display"

    return (
        f"Cinematic still frame, dark background ({bg}). "
        f"Bold headline text: '{title}'. "
        f"{'Subtitle: ' + subtitle + '. ' if subtitle else ''}"
        f"Colour accents: purple ({accent}), gold ({gold}). "
        f"Typography: {heading_font} style for headings. "
        f"Desaturated earth tones, deep blacks, film grain, Kodak Portra 400 aesthetic. "
        f"Minimalist, intellectual, sophisticated. No stock photography."
    )


# --- Batch media generation for derivatives ---

def generate_reel_media(script_sections: list[dict], title: str = "") -> dict:
    """Generate video clips and assemble media for a reel script.

    Uses brand standards for consistent presenter, environment, and style.
    Optimised for 15-20 second social media reels (3 clips max).
    Structure: Hook (8s) + Insight (8s) + CTA (4s) = ~20 seconds.
    """
    results = {"clips": [], "thumbnail": None}

    # Generate a thumbnail image
    thumb_path = generate_image(
        _get_image_prompt(title, style="thumbnail"),
        output_path=OUTPUT_MEDIA_DIR / f"thumb_{int(time.time())}.png",
    )
    results["thumbnail"] = str(thumb_path) if thumb_path else None

    # Maximum 3 clips for a reel: Hook, Insight, CTA
    max_clips = 3
    clip_durations = [8, 8, 4]  # Hook=8s, Insight=8s, CTA=4s = 20s total

    for i, section in enumerate(script_sections[:max_clips]):
        script_text = section.get("script", section.get("text", ""))
        clip_prompt = _get_video_prompt(script_text, scene_type="talking_head")
        duration = clip_durations[i] if i < len(clip_durations) else 4

        clip_path = generate_video(
            clip_prompt,
            output_path=OUTPUT_MEDIA_DIR / f"reel_clip_{i}_{int(time.time())}.mp4",
            model="veo-3.1-fast-generate-preview",
            duration=duration,
            aspect_ratio="9:16",
            resolution="720p",
        )
        if clip_path:
            results["clips"].append(str(clip_path))

    return results


def generate_carousel_images(slides: list[dict]) -> list[str]:
    """Generate images for each slide of a LinkedIn carousel.

    Uses brand standards for consistent visual identity.
    """
    paths = []
    for i, slide in enumerate(slides):
        headline = slide.get("headline", slide.get("text", f"Slide {i+1}"))
        body = slide.get("body", "")

        prompt = _get_image_prompt(
            headline,
            subtitle=f"Slide {i+1}. {body[:60]}" if body else f"Slide {i+1}",
            style="carousel",
        )

        path = generate_image(
            prompt,
            output_path=OUTPUT_MEDIA_DIR / f"carousel_slide_{i}_{int(time.time())}.png",
        )
        if path:
            paths.append(str(path))

    return paths


def generate_social_graphic(title: str, subtitle: str = "", style: str = "linkedin") -> str | None:
    """Generate a single social media graphic using brand standards.

    Returns path to the generated image, or None on failure.
    """
    prompt = _get_image_prompt(title, subtitle=subtitle, style=style)
    path = generate_image(prompt)
    return str(path) if path else None
