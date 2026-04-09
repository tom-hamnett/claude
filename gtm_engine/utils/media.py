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
    reference_images: list[Path] | None = None,
) -> Path | None:
    """Generate a video clip from a text prompt using Google Veo.

    Pass reference_images (up to 3 paths) for character consistency.
    Returns the path to the saved video file, or None on failure.
    """
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY not set -- skipping video generation")
        return None

    client = _get_client()
    from google.genai import types

    ref_note = f" +{len(reference_images)} refs" if reference_images else ""
    logger.info("Generating video%s: %s (model=%s, %ds)", ref_note, prompt[:60], model, duration)

    try:
        # Build config with optional reference images
        config = types.GenerateVideosConfig(
            number_of_videos=1,
            duration_seconds=duration,
            aspect_ratio=aspect_ratio,
        )

        # Add reference images for character consistency
        ref_image_objects = []
        if reference_images:
            for ref_path in reference_images[:3]:  # Veo supports up to 3
                p = Path(ref_path)
                if p.exists():
                    ref_image_objects.append(
                        types.Image.from_file(str(p))
                    )

        kwargs = {
            "model": model,
            "prompt": prompt,
            "config": config,
        }
        if ref_image_objects:
            kwargs["image"] = ref_image_objects[0]  # Primary reference

        operation = client.models.generate_videos(**kwargs)

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


# --- TTS Voice Generation ---

def generate_voiceover(
    text: str,
    output_path: Path | None = None,
    voice_name: str = "Zephyr",
) -> Path | None:
    """Generate a voiceover audio file using Google TTS.

    Uses gemini-2.5-flash-preview-tts for consistent British-style voice.
    Returns the path to the saved WAV file.
    """
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY not set -- skipping TTS")
        return None

    client = _get_client()
    from google.genai import types

    if output_path is None:
        output_path = OUTPUT_MEDIA_DIR / f"voiceover_{int(time.time())}.wav"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    logger.info("Generating voiceover (%d words): %s...", len(text.split()), text[:60])

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-preview-tts",
            contents=text,
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name=voice_name,
                        )
                    )
                ),
            ),
        )

        # Extract audio data
        if response.candidates and response.candidates[0].content.parts:
            audio_data = response.candidates[0].content.parts[0].inline_data.data
            output_path.write_bytes(audio_data)
            logger.info("Voiceover saved to %s", output_path)
            return output_path

        logger.error("TTS returned no audio")
        return None

    except Exception as e:
        logger.error("TTS generation failed: %s", e)
        return None


# --- ffmpeg helpers ---

def strip_audio_and_overlay(
    video_path: str,
    audio_path: str,
    output_path: Path | None = None,
) -> str | None:
    """Strip audio from a video and overlay a new audio track using ffmpeg."""
    import subprocess

    if output_path is None:
        output_path = OUTPUT_MEDIA_DIR / f"final_{int(time.time())}.mp4"

    try:
        cmd = [
            "ffmpeg", "-y",
            "-i", str(video_path),
            "-i", str(audio_path),
            "-c:v", "copy",
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-shortest",
            str(output_path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode == 0:
            logger.info("Audio overlay complete: %s", output_path)
            return str(output_path)
        else:
            logger.error("Audio overlay failed: %s", result.stderr[:200])
            return None
    except Exception as e:
        logger.error("Audio overlay failed: %s", e)
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

def _get_reference_images() -> list[Path]:
    """Load presenter reference images from the data directory.

    Shuffles the order each time so Veo picks a different starting
    pose/setting per reel, while keeping the same face throughout.
    """
    import random
    from gtm_engine.config import DATA_DIR
    refs = []
    for name in ["presenter_ref_1.png", "presenter_ref_2.png", "presenter_ref_3.png",
                  "presenter_reference.png"]:
        p = DATA_DIR / name
        if p.exists():
            refs.append(p)
    random.shuffle(refs)
    return refs[:3]


def generate_reel_media(reel_content: dict, title: str = "") -> dict:
    """Full reel production pipeline.

    1. Generate TTS voiceover (consistent voice, sets timing)
    2. Generate talking head clips with reference images (consistent face, one setting)
    3. Generate B-roll clip (detail shot, no person)
    4. Stitch video clips with crossfade
    5. Strip Veo audio and overlay TTS voiceover
    6. Generate thumbnail

    Input: reel_content dict from the reel_script derivative (has spoken_script,
           hook_text, insight_text, close_text, b_roll_description).
    """
    results = {"clips": [], "thumbnail": None, "voiceover": None, "finished_reel": None}
    ref_images = _get_reference_images()
    ts = int(time.time())

    # Handle both old format (sections list) and new format (spoken_script)
    spoken_script = reel_content.get("spoken_script", "")
    b_roll_desc = reel_content.get("b_roll_description", "City skyline through glass window, soft focus")

    # If old format, extract text from sections
    if not spoken_script and reel_content.get("sections"):
        spoken_script = " ".join(
            s.get("script", s.get("text", ""))
            for s in reel_content.get("sections", [])
        )

    if not spoken_script:
        logger.error("No spoken script found in reel content")
        return results

    # --- Step 1: Generate TTS voiceover (sets the timing) ---
    logger.info("Step 1/5: Generating voiceover...")
    voiceover_path = generate_voiceover(
        spoken_script,
        output_path=OUTPUT_MEDIA_DIR / f"vo_{ts}.wav",
    )
    results["voiceover"] = str(voiceover_path) if voiceover_path else None

    # --- Step 2: Generate talking head clips (one setting, reference images) ---
    logger.info("Step 2/5: Generating talking head clips (same character, same setting)...")
    setting_prompt = _get_video_prompt(spoken_script[:100], scene_type="discursive")

    # Two talking head clips: hook (8s) and insight+close (8s)
    for i, label in enumerate(["hook", "insight_close"]):
        clip_path = generate_video(
            setting_prompt,
            output_path=OUTPUT_MEDIA_DIR / f"reel_{label}_{ts}.mp4",
            model="veo-3.1-fast-generate-preview",
            duration=8,
            aspect_ratio="9:16",
            resolution="720p",
            reference_images=ref_images,
        )
        if clip_path:
            results["clips"].append(str(clip_path))

    # --- Step 3: Generate B-roll clip (no person, detail shot) ---
    logger.info("Step 3/5: Generating B-roll...")
    broll_prompt = (
        f"{b_roll_desc}. Cinematic, shallow depth of field, "
        f"desaturated earth tones, slow subtle movement. No people. "
        f"Kodak Portra 400 color grade."
    )
    broll_path = generate_video(
        broll_prompt,
        output_path=OUTPUT_MEDIA_DIR / f"reel_broll_{ts}.mp4",
        model="veo-3.1-fast-generate-preview",
        duration=4,
        aspect_ratio="9:16",
        resolution="720p",
    )
    if broll_path:
        results["b_roll"] = str(broll_path)

    # --- Step 4: Stitch clips (hook + broll + insight) with crossfade ---
    logger.info("Step 4/5: Stitching clips...")
    stitch_order = []
    if len(results["clips"]) >= 1:
        stitch_order.append(results["clips"][0])  # Hook
    if results.get("b_roll"):
        stitch_order.append(results["b_roll"])  # B-roll intercut
    if len(results["clips"]) >= 2:
        stitch_order.append(results["clips"][1])  # Insight + close

    stitched = None
    if len(stitch_order) > 1:
        stitched = stitch_clips(stitch_order, title=title,
                                output_path=OUTPUT_MEDIA_DIR / f"reel_stitched_{ts}.mp4")

    # --- Step 5: Overlay TTS voiceover ---
    if stitched and voiceover_path:
        logger.info("Step 5/5: Overlaying voiceover...")
        final = strip_audio_and_overlay(
            stitched, str(voiceover_path),
            output_path=OUTPUT_MEDIA_DIR / f"reel_final_{ts}.mp4",
        )
        if final:
            results["finished_reel"] = final
    elif stitched:
        results["finished_reel"] = stitched

    # --- Thumbnail ---
    thumb_path = generate_image(
        _get_image_prompt(title, style="thumbnail"),
        output_path=OUTPUT_MEDIA_DIR / f"thumb_{ts}.png",
    )
    results["thumbnail"] = str(thumb_path) if thumb_path else None

    logger.info("Reel production complete: %s", results.get("finished_reel", "no final output"))
    return results


def stitch_clips(clip_paths: list[str], title: str = "", output_path: Path | None = None) -> str | None:
    """Concatenate video clips into one finished video using ffmpeg.

    Creates a concat list file, runs ffmpeg, and returns the output path.
    """
    import subprocess
    import tempfile

    if not clip_paths:
        return None

    if output_path is None:
        output_path = OUTPUT_MEDIA_DIR / f"reel_finished_{int(time.time())}.mp4"

    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Create ffmpeg concat list
    concat_file = OUTPUT_MEDIA_DIR / f"concat_{int(time.time())}.txt"
    with open(concat_file, "w") as f:
        for clip in clip_paths:
            # ffmpeg needs forward slashes and escaped paths
            safe_path = str(Path(clip).resolve()).replace("\\", "/")
            f.write(f"file '{safe_path}'\n")

    try:
        cmd = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", str(concat_file),
            "-c", "copy",
            str(output_path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)

        if result.returncode == 0:
            logger.info("Stitched %d clips into %s", len(clip_paths), output_path)
            return str(output_path)
        else:
            logger.error("ffmpeg stitch failed: %s", result.stderr[:200])
            return None
    except FileNotFoundError:
        logger.warning("ffmpeg not installed -- clips not stitched")
        return None
    except Exception as e:
        logger.error("Stitch failed: %s", e)
        return None
    finally:
        # Clean up concat file
        concat_file.unlink(missing_ok=True)


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
