"""Layer 3B — Derivative Pipeline.

From every master asset, automatically generate ALL derivative formats.
Channel prioritisation determines sequencing — not whether to deploy.

Every derivative is tagged with full metadata for the feedback loop.
Each pipeline step saves intermediate output — never lose work to a failed API call.
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

from gtm_engine.config import DATA_DIR, CONTENT_QUEUE_DIR
from gtm_engine.brand import benchmark_check, quick_forbidden_check
from gtm_engine.utils.ai_client import call_ai
from gtm_engine.utils.file_io import save_json
from gtm_engine.utils.logger import log_decision

logger = logging.getLogger(__name__)

# All derivative formats with their AI provider and generation config
DERIVATIVE_FORMATS = {
    "long_form_article": {
        "provider": "claude",
        "description": "800-1500 word article for Substack/Blog",
        "channels": ["substack", "blog"],
    },
    "linkedin_article": {
        "provider": "claude",
        "description": "Condensed professional framing for LinkedIn",
        "channels": ["linkedin"],
    },
    "linkedin_carousel": {
        "provider": "gemini",
        "description": "6-10 slide arc with text per slide + generated slide images",
        "channels": ["linkedin"],
        "generates_media": True,
    },
    "short_post_linkedin": {
        "provider": "gemini",
        "description": "3 angle variations for LinkedIn short post",
        "channels": ["linkedin"],
    },
    "short_post_twitter": {
        "provider": "gemini",
        "description": "Twitter/X thread (5 tweets)",
        "channels": ["twitter"],
    },
    "reel_script": {
        "provider": "claude",
        "description": "45-75 second Reel/TikTok/YouTube Short script + generated video clips",
        "channels": ["instagram", "tiktok", "youtube_shorts"],
        "generates_media": True,
    },
    "talking_head_script": {
        "provider": "claude",
        "description": "3-5 minute expert style video script + generated video clips",
        "channels": ["youtube", "linkedin_video"],
        "generates_media": True,
    },
    "email_broadcast": {
        "provider": "claude",
        "description": "Email for established lists (500+)",
        "channels": ["email"],
    },
    "email_lifecycle": {
        "provider": "claude",
        "description": "Triggered sequence email with 3 subject line variants",
        "channels": ["email"],
    },
    "reddit_post": {
        "provider": "claude",
        "description": "Community-first post, zero pitch",
        "channels": ["reddit"],
    },
    "visual_brief": {
        "provider": "gemini",
        "description": "Art direction + generated social graphic via Imagen",
        "channels": ["instagram", "linkedin"],
        "generates_media": True,
    },
}

# System prompts per derivative format
DERIVATIVE_PROMPTS = {
    "long_form_article": """Generate a long-form article (800-1500 words) from this master asset.
Maintain the full narrative arc. Expand examples. Add depth.
Return JSON: {"title": "...", "body": "markdown body", "meta_description": "..."}""",

    "linkedin_article": """Condense this master asset into a LinkedIn article (400-700 words).
Professional framing. Keep the hook and the insight. Cut the fat.
Return JSON: {"body": "...", "hook": "first two lines"}""",

    "linkedin_carousel": """Create a LinkedIn carousel from this master asset.
6-10 slides. Each slide: one key point, punchy text (under 30 words per slide).
Slide 1: Hook. Last slide: CTA (soft, discussion-driving).
Return JSON: {"slides": [{"slide_number": 1, "headline": "...", "body": "...", "design_note": "..."}]}""",

    "short_post_linkedin": """Generate 3 LinkedIn short post variations from this master asset.
Each under 300 words. Different angles on the same insight.
Strong hook in first line (visible before 'see more'). End with question, not pitch.
Return JSON: {"variants": [{"angle": "...", "body": "...", "hashtags": [...]}]}""",

    "short_post_twitter": """Generate a Twitter/X thread (5 tweets) from this master asset.
Tweet 1: Hook with the key insight. Tweets 2-4: Supporting points. Tweet 5: Perspective close.
Each tweet under 280 chars. Thread should stand alone without the master asset.
Return JSON: {"tweets": [{"number": 1, "text": "..."}]}""",

    "reel_script": """Generate a 20-second social media reel script from this master asset.

This reel uses NO PRESENTER. It's text-over-B-roll with voiceover narration.
The visuals are atmospheric B-roll (data viz, city shots, abstract textures).
The voice carries the authority — there is no face on screen.

CRITICAL: Write EXACTLY what will be spoken aloud. 50-60 words maximum
(150 wpm speaking pace = ~20 seconds).

Structure (one continuous monologue):
- HOOK (0-6s, ~15 words): Provocative opening that stops the scroll
- INSIGHT (6-15s, ~25 words): The uncomfortable truth with evidence
- CLOSE (15-20s, ~15 words): A thought that lingers

Also provide:
- 3 B-roll visual concepts (one per section) — no people, cinematic, atmospheric
- Text overlay phrases to appear on screen at key moments

Return JSON:
{
    "spoken_script": "complete spoken text as one paragraph",
    "hook_text": "hook portion (~15 words)",
    "insight_text": "insight portion (~25 words)",
    "close_text": "closing portion (~15 words)",
    "b_roll_scenes": [
        {"scene": "hook", "visual": "detailed description of cinematic B-roll for hook", "text_overlay": "short punchy text to display"},
        {"scene": "insight", "visual": "B-roll for insight section", "text_overlay": "key phrase to display"},
        {"scene": "close", "visual": "B-roll for close", "text_overlay": "final thought text"}
    ],
    "word_count": 55,
    "estimated_duration": "20s"
}""",

    "talking_head_script": """Generate a 3-5 minute expert-style video script from this master asset.
Format: [COLD OPEN 0-20s] [CONTEXT 20-60s] [3 KEY INSIGHTS 60-240s] [CLOSE + CTA]
Word-for-word with presenter direction. B-roll suggestions in brackets.
Return JSON: {"title": "...", "script": "...", "duration": "...", "b_roll_notes": [...]}""",

    "email_broadcast": """Generate an email broadcast from this master asset.
For established lists (500+ subscribers). 300-500 words. One clear CTA.
3 subject line variants. Preview text.
Return JSON: {"subject_lines": ["A", "B", "C"], "preview_text": "...", "body": "...", "cta": "..."}""",

    "email_lifecycle": """Generate a lifecycle email from this master asset.
This is triggered email (Day 3 style — the uncomfortable truth email).
150-300 words. Strong hook. One insight. One soft CTA.
3 subject line variants optimised for open rate.
Return JSON: {"day": "3", "theme": "uncomfortable truth", "subject_lines": ["A", "B", "C"], "preview_text": "...", "body": "...", "cta": "..."}""",

    "reddit_post": """Generate a Reddit post from this master asset.
Community-first. ZERO promotional intent. Genuine contribution.
Written as a community member sharing insight, not a brand posting content.
If it reads like marketing, rewrite it until it doesn't.
Return JSON: {"title": "...", "body": "...", "subreddit_suggestions": [...], "flair_suggestions": [...]}""",

    "visual_brief": """Generate a visual art direction brief from this master asset.
Describe the visual that should accompany this content on Instagram/LinkedIn.
Include: composition, colour palette (dark bg #0a0a0f, accent #6c63ff, hot #ff6b6b, gold #ffd166),
typography direction, data visualisation elements, mood.
Return JSON: {"concept": "...", "composition": "...", "colour_notes": "...", "typography": "...", "data_viz": "...", "mood": "..."}""",
}

DERIVATIVE_SYSTEM_BASE = """You are generating a derivative content piece from a master asset
for Quantum Tools. The master asset contains the full idea. You are adapting it for a
specific format and channel.

BRAND VOICE: Sharp, transparent, anti-guru. Confident without arrogance.
Teach, demonstrate, make them reach for it. Never sell.
FORBIDDEN: game-changer, revolutionary, unlock your potential, disruptive, innovative, cutting-edge.
EDGINESS: 8/10. Say the uncomfortable thing. Show your work. Have a point of view.

Return ONLY valid JSON matching the format specified."""


def generate_derivative(
    master_asset: dict,
    format_name: str,
    run_benchmark: bool = True,
    generate_media: bool = False,
) -> dict:
    """Generate a single derivative from a master asset.

    Saves the derivative to the content queue with full metadata tags.
    If generate_media=True and the format supports it, also generates
    actual video/image files via Google Veo/Imagen.
    """
    if format_name not in DERIVATIVE_FORMATS:
        raise ValueError(f"Unknown format: {format_name}. Available: {list(DERIVATIVE_FORMATS.keys())}")

    fmt_config = DERIVATIVE_FORMATS[format_name]
    provider = fmt_config["provider"]
    format_prompt = DERIVATIVE_PROMPTS.get(format_name, "Generate content. Return JSON.")

    prompt = (
        f"MASTER ASSET:\n"
        f"Title: {master_asset.get('title', '')}\n"
        f"Hook: {master_asset.get('hook', '')}\n"
        f"Uncomfortable Truth: {master_asset.get('uncomfortable_truth', '')}\n"
        f"Point of View: {master_asset.get('point_of_view', '')}\n\n"
        f"BODY:\n{master_asset.get('body', '')[:3000]}\n\n"
        f"FORMAT INSTRUCTIONS:\n{format_prompt}"
    )

    system = DERIVATIVE_SYSTEM_BASE

    logger.info("Generating %s derivative via %s", format_name, provider)

    try:
        response = call_ai(
            prompt=prompt,
            system=system,
            provider=provider,
            max_tokens=4096,
            temperature=0.8,
        )

        # Parse
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3].rstrip()
        raw = json.loads(cleaned)

    except Exception as e:
        logger.error("Failed to generate %s: %s", format_name, e)
        raw = {"error": str(e), "body": ""}

    # Build derivative record with full tags
    derivative_id = f"DRV-{str(uuid.uuid4())[:6].upper()}"
    derivative = {
        "id": derivative_id,
        "master_asset_id": master_asset.get("id", ""),
        "format": format_name,
        "channels": fmt_config["channels"],
        "provider": provider,
        "content": raw,
        "tags": {
            "master_asset_id": master_asset.get("id", ""),
            "format": format_name,
            "channel": fmt_config["channels"][0] if fmt_config["channels"] else "",
            "segment": master_asset.get("segment", ""),
            "target_segments": master_asset.get("target_segments", []),
            "strategic_objective": "awareness",
            "edginess_principles": master_asset.get("edginess_principles_applied", []),
            "ai_provider": provider,
            "audience_stage": "cold",
            "boost_recommended": format_name in ("reel_script", "visual_brief"),
            "urgency": "standard",
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "draft",
        "benchmark_result": None,
    }

    # Optional benchmark check
    if run_benchmark and raw.get("body"):
        body_text = raw.get("body", raw.get("script", json.dumps(raw)))
        if isinstance(body_text, str) and len(body_text) > 50:
            benchmark = benchmark_check(body_text, channel=derivative["tags"]["channel"], content_type=format_name)
            derivative["benchmark_result"] = benchmark
            if benchmark.get("approved"):
                derivative["status"] = "approved"

    # Generate actual media if this format supports it
    if fmt_config.get("generates_media") and generate_media:
        media_paths = _generate_media_for_derivative(format_name, raw, master_asset)
        if media_paths:
            derivative["media"] = media_paths

    # Save to content queue
    save_json(derivative, CONTENT_QUEUE_DIR / f"{derivative_id}_{format_name}.json")

    return derivative


def _generate_media_for_derivative(format_name: str, content: dict, master_asset: dict) -> dict:
    """Generate actual media files (video/images) for a derivative.

    Called automatically when a derivative format has generates_media=True.
    Uses Google Veo for video, Imagen for images.
    """
    from gtm_engine.utils.media import (
        generate_reel_media, generate_carousel_images,
        generate_social_graphic, generate_video,
    )

    title = master_asset.get("title", "")
    media = {}

    try:
        if format_name == "reel_script":
            # Pass the full content dict — new pipeline handles both old and new formats
            media = generate_reel_media(content, title=title)
            logger.info("  Reel production: %s", "COMPLETE" if media.get("finished_reel") else "partial")

        elif format_name == "talking_head_script":
            # Generate a video clip from the script opening using brand standards
            script_text = content.get("script", "")[:200]
            if script_text:
                from gtm_engine.utils.media import (
                    generate_video, generate_social_graphic, _get_video_prompt,
                )
                thumb = generate_social_graphic(title, style="linkedin")
                media["thumbnail"] = thumb
                # Video for the cold open — uses Discursive Portrait style
                clip_prompt = _get_video_prompt(script_text, scene_type="discursive")
                clip = generate_video(
                    clip_prompt, duration=8, aspect_ratio="16:9",
                )
                media["intro_clip"] = str(clip) if clip else None
                logger.info("  Generated talking head intro clip + thumbnail")

        elif format_name == "linkedin_carousel":
            slides = content.get("slides", [])
            if slides:
                paths = generate_carousel_images(slides)
                media["slide_images"] = paths
                logger.info("  Generated %d carousel slide images", len(paths))

        elif format_name == "visual_brief":
            # Turn the brief into an actual image
            concept = content.get("concept", content.get("body", title))
            if concept:
                graphic = generate_social_graphic(title, subtitle=concept[:100])
                media["social_graphic"] = graphic
                logger.info("  Generated social graphic from visual brief")

    except Exception as e:
        logger.warning("  Media generation failed for %s: %s", format_name, e)

    return media


def generate_all_derivatives(
    master_asset: dict,
    formats: list[str] | None = None,
    run_benchmark: bool = False,
    generate_media: bool = False,
) -> list[dict]:
    """Generate ALL derivative formats from a master asset.

    Default behaviour: generate everything. Pass formats= to limit.
    Benchmark checking is off by default for batch runs (run separately).
    Set generate_media=True to also produce actual video/image files via Google APIs.
    """
    target_formats = formats or list(DERIVATIVE_FORMATS.keys())
    derivatives = []

    logger.info(
        "Generating %d derivatives from %s: %s",
        len(target_formats), master_asset.get("id"), master_asset.get("title", "")[:60],
    )

    for fmt in target_formats:
        try:
            derivative = generate_derivative(
                master_asset, fmt,
                run_benchmark=run_benchmark,
                generate_media=generate_media,
            )
            derivatives.append(derivative)
            logger.info("  [OK] %s -> %s", fmt, derivative["id"])
        except Exception as e:
            logger.error("  [FAIL] %s: %s", fmt, e)
            continue

    # Save batch manifest
    manifest = {
        "master_asset_id": master_asset.get("id"),
        "master_asset_title": master_asset.get("title"),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_derivatives": len(derivatives),
        "derivatives": [
            {"id": d["id"], "format": d["format"], "status": d["status"]}
            for d in derivatives
        ],
    }
    save_json(manifest, CONTENT_QUEUE_DIR / f"derivatives_{master_asset.get('id', 'unknown')}.json")

    log_decision(
        "derivative_pipeline",
        f"Generated {len(derivatives)} derivatives from {master_asset.get('id')}",
        f"Formats: {[d['format'] for d in derivatives]}",
    )

    return derivatives
