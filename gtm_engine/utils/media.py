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
                    import base64
                    image_bytes = p.read_bytes()
                    mime = "image/png" if p.suffix == ".png" else "image/jpeg"
                    ref_image_objects.append(
                        types.Image(
                            image_bytes=base64.b64encode(image_bytes).decode("utf-8"),
                            mime_type=mime,
                        )
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

        # Extract audio data — Google TTS returns raw PCM, wrap as proper WAV
        if response.candidates and response.candidates[0].content.parts:
            part = response.candidates[0].content.parts[0]
            audio_data = part.inline_data.data
            mime_type = part.inline_data.mime_type or "audio/L16;rate=24000"

            # Parse sample rate from mime type (e.g. "audio/L16;rate=24000")
            sample_rate = 24000
            if "rate=" in mime_type:
                try:
                    sample_rate = int(mime_type.split("rate=")[1].split(";")[0])
                except (ValueError, IndexError):
                    pass

            # Wrap raw PCM data in a proper WAV file using the wave module
            import wave
            with wave.open(str(output_path), "wb") as wav_file:
                wav_file.setnchannels(1)       # Mono
                wav_file.setsampwidth(2)       # 16-bit
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(audio_data)

            logger.info("Voiceover saved to %s (%d Hz)", output_path, sample_rate)
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

def _generate_with_imagen(prompt: str, output_path: Path, aspect_ratio: str = "16:9") -> Path | None:
    """Generate an image using Imagen 4 Ultra via generate_images API.

    Uses the dedicated Imagen endpoint for photorealistic output.
    """
    client = _get_client()
    from google.genai import types

    logger.info("Generating image (imagen-4.0-ultra, %s): %s", aspect_ratio, prompt[:80])

    try:
        response = client.models.generate_images(
            model="imagen-4.0-ultra-generate-001",
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio=aspect_ratio,
            ),
        )

        if not response.generated_images:
            logger.warning("Imagen returned no images — falling back to Nano Banana 2")
            return None

        image = response.generated_images[0]
        # Try multiple extraction paths depending on SDK version
        image_bytes = None
        if hasattr(image, "image") and hasattr(image.image, "image_bytes"):
            image_bytes = image.image.image_bytes
        elif hasattr(image, "image_bytes"):
            image_bytes = image.image_bytes

        if not image_bytes:
            logger.warning("Could not extract image bytes from Imagen response")
            return None

        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(image_bytes)
        logger.info("Imagen image saved to %s", output_path)
        return output_path

    except Exception as e:
        logger.warning("Imagen generation failed (%s) — falling back to Nano Banana 2", e)
        return None


def _generate_with_nano_banana(
    prompt: str,
    output_path: Path,
    reference_image: Path | None = None,
) -> Path | None:
    """Generate an image using Nano Banana 2 (gemini-3-pro-image-preview).

    If reference_image is provided, Gemini uses it as a visual anchor to
    maintain character/style consistency. This is how we lock Theo across
    multiple shots — generate a Hero image once, then pass it as reference
    to every subsequent shot.
    """
    client = _get_client()
    from google.genai import types

    logger.info("Generating image (nano-banana-2): %s", prompt[:80])
    if reference_image:
        logger.info("  Using reference image: %s", reference_image)

    # Build contents: optional reference image first, then text prompt
    contents = []
    if reference_image and Path(reference_image).exists():
        import PIL.Image
        pil_image = PIL.Image.open(str(reference_image))
        contents.append(pil_image)

    contents.append(prompt)

    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=contents,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        ),
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)

    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.mime_type.startswith("image/"):
            output_path.write_bytes(part.inline_data.data)
            logger.info("Nano Banana image saved to %s", output_path)
            return output_path

    logger.error("No image found in Nano Banana response")
    return None


def describe_look(image_path) -> str:
    """One-line description of a presenter look (wardrobe/setting/vibe) via Gemini
    vision — used to auto-label a character's looks. Returns '' if unavailable."""
    if not GOOGLE_API_KEY:
        return ""
    try:
        from pathlib import Path
        import PIL.Image
        client = _get_client()
        img = PIL.Image.open(str(Path(image_path)))
        prompt = ("Describe this person's look for a talking-head video in ONE short line: "
                  "wardrobe, setting, and vibe/energy. Example: 'navy blazer, book-lined study, "
                  "authoritative and calm'. Max 14 words, no preamble.")
        r = client.models.generate_content(model="gemini-2.5-flash", contents=[img, prompt])
        return (getattr(r, "text", "") or "").strip().strip('"')[:200]
    except Exception as e:
        logger.error("describe_look failed: %s", e)
        return ""


@retry(wait=wait_exponential(min=2, max=30), stop=stop_after_attempt(3))
def generate_image(
    prompt: str,
    output_path: Path | None = None,
    quality: str = "standard",
    aspect_ratio: str = "16:9",
    reference_image: Path | None = None,
) -> Path | None:
    """Generate an image using Google's image generation models.

    quality="standard" → Nano Banana 2 (gemini-3-pro-image-preview) — cheapest, supports reference images
    quality="ultra" → Imagen 4 Ultra (best photorealism, no reference image support)

    reference_image: Optional path to a PNG/JPG to use as a visual anchor.
    Only works with standard quality (Nano Banana 2). Ensures character and
    style consistency across multiple generations.

    Returns the path to the saved image file, or None on failure.
    """
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY not set -- skipping image generation")
        return None

    if output_path is None:
        output_path = OUTPUT_MEDIA_DIR / f"image_{int(time.time())}.png"

    try:
        # Try Imagen Ultra first if requested
        if quality == "ultra":
            result = _generate_with_imagen(prompt, output_path, aspect_ratio=aspect_ratio)
            if result:
                return result
            # Fall through to Nano Banana

        # Standard path: Nano Banana 2 (supports reference image)
        return _generate_with_nano_banana(prompt, output_path, reference_image=reference_image)

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


def add_text_overlay(video_path: str, text_overlays: list[dict],
                     output_path: Path | None = None) -> str | None:
    """Burn text overlays onto a video using ffmpeg drawtext filter.

    text_overlays: list of {"text": str, "start": float, "end": float}
    Uses Playfair Display brand font if available, falls back to system font.
    """
    import subprocess

    if output_path is None:
        output_path = OUTPUT_MEDIA_DIR / f"overlaid_{int(time.time())}.mp4"

    # Build drawtext filter chain
    filters = []
    for i, overlay in enumerate(text_overlays):
        text = overlay["text"].replace("'", "").replace(":", "").replace(",", "")
        start = overlay.get("start", 0)
        end = overlay.get("end", start + 3)
        # Center text, large white font, semi-transparent black box behind
        filter_str = (
            f"drawtext=text='{text}':"
            f"fontsize=60:fontcolor=white:"
            f"x=(w-text_w)/2:y=(h-text_h)/2:"
            f"box=1:boxcolor=black@0.6:boxborderw=20:"
            f"enable='between(t,{start},{end})'"
        )
        filters.append(filter_str)

    if not filters:
        return str(video_path)

    filter_chain = ",".join(filters)

    try:
        cmd = [
            "ffmpeg", "-y", "-i", str(video_path),
            "-vf", filter_chain,
            "-c:a", "copy",
            str(output_path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode == 0:
            logger.info("Text overlay complete: %s", output_path)
            return str(output_path)
        logger.error("Text overlay failed: %s", result.stderr[:200])
        return None
    except Exception as e:
        logger.error("Text overlay failed: %s", e)
        return None


def generate_reel_media(reel_content: dict, title: str = "") -> dict:
    """Presenter-free reel production pipeline.

    Default mode: text + B-roll + voiceover (no face on screen).

    Steps:
    1. Generate TTS voiceover (sets timing, carries authority)
    2. Generate 3 atmospheric B-roll clips (no people) per scene
    3. Stitch B-roll clips
    4. Overlay TTS voiceover (strips Veo audio)
    5. Burn text overlays from the script
    6. Generate thumbnail

    Input: reel_content dict from the reel_script derivative.
    Expected keys: spoken_script, b_roll_scenes (with visual + text_overlay per scene).
    """
    results = {"clips": [], "thumbnail": None, "voiceover": None, "finished_reel": None}
    ts = int(time.time())

    spoken_script = reel_content.get("spoken_script", "")
    b_roll_scenes = reel_content.get("b_roll_scenes", [])

    # Backwards compatibility: if using old format, build scenes from old fields
    if not b_roll_scenes:
        old_desc = reel_content.get("b_roll_description", "City skyline through glass, cinematic")
        b_roll_scenes = [
            {"scene": "hook", "visual": old_desc, "text_overlay": reel_content.get("hook_text", "")[:40]},
            {"scene": "insight", "visual": old_desc, "text_overlay": reel_content.get("insight_text", "")[:40]},
            {"scene": "close", "visual": old_desc, "text_overlay": reel_content.get("close_text", "")[:40]},
        ]

    # Extract spoken script from old sections format if needed
    if not spoken_script and reel_content.get("sections"):
        spoken_script = " ".join(
            s.get("script", s.get("text", ""))
            for s in reel_content.get("sections", [])
        )

    if not spoken_script:
        logger.error("No spoken script found in reel content")
        return results

    # --- Step 1: Generate TTS voiceover ---
    logger.info("Step 1/5: Generating voiceover...")
    voiceover_path = generate_voiceover(
        spoken_script,
        output_path=OUTPUT_MEDIA_DIR / f"vo_{ts}.wav",
    )
    results["voiceover"] = str(voiceover_path) if voiceover_path else None

    # --- Step 2: Generate 3 B-roll clips (no people) ---
    logger.info("Step 2/5: Generating %d B-roll clips...", len(b_roll_scenes))
    clip_durations = [7, 8, 5]  # Hook=7s, Insight=8s, Close=5s = 20s total

    for i, scene in enumerate(b_roll_scenes[:3]):
        visual = scene.get("visual", "")
        broll_prompt = (
            f"{visual}. ABSOLUTELY NO PEOPLE, no faces, no hands visible. "
            f"Cinematic, shallow depth of field, slow subtle movement. "
            f"Dark, moody, desaturated earth tones. Kodak Portra 400 color grade. "
            f"Professional documentary aesthetic."
        )
        duration = clip_durations[i] if i < len(clip_durations) else 6

        clip_path = generate_video(
            broll_prompt,
            output_path=OUTPUT_MEDIA_DIR / f"reel_broll_{i}_{ts}.mp4",
            model="veo-3.1-fast-generate-preview",
            duration=duration,
            aspect_ratio="9:16",
            resolution="720p",
        )
        if clip_path:
            results["clips"].append(str(clip_path))

    # --- Step 3: Stitch B-roll clips ---
    if len(results["clips"]) < 1:
        logger.error("No B-roll clips generated -- cannot assemble reel")
        return results

    logger.info("Step 3/5: Stitching B-roll clips...")
    stitched = stitch_clips(
        results["clips"],
        title=title,
        output_path=OUTPUT_MEDIA_DIR / f"reel_stitched_{ts}.mp4",
    ) if len(results["clips"]) > 1 else results["clips"][0]

    # --- Step 4: Overlay TTS voiceover ---
    with_audio = stitched
    if stitched and voiceover_path:
        logger.info("Step 4/5: Overlaying voiceover...")
        with_audio = strip_audio_and_overlay(
            stitched, str(voiceover_path),
            output_path=OUTPUT_MEDIA_DIR / f"reel_with_audio_{ts}.mp4",
        ) or stitched

    # --- Step 5: Burn text overlays ---
    if with_audio and b_roll_scenes:
        logger.info("Step 5/5: Adding text overlays...")
        # Build timed text overlays based on section durations
        overlays = []
        cumulative = 0.0
        for i, scene in enumerate(b_roll_scenes[:3]):
            text = scene.get("text_overlay", "")
            if text:
                section_dur = clip_durations[i] if i < len(clip_durations) else 6
                overlays.append({
                    "text": text,
                    "start": cumulative + 0.5,  # slight delay
                    "end": cumulative + section_dur - 0.3,
                })
                cumulative += section_dur

        final = add_text_overlay(
            with_audio,
            overlays,
            output_path=OUTPUT_MEDIA_DIR / f"reel_final_{ts}.mp4",
        ) or with_audio
        results["finished_reel"] = final
    else:
        results["finished_reel"] = with_audio

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
