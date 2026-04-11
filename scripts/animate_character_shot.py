"""Character Animation — Veo 3.1 with startFrame

Animates an approved character still into a 4-second video clip.
Uses the full veo-3.1-generate-preview model (not fast) for hero character
shots where quality matters. The start frame is passed as the literal first
frame of the video, so character consistency is locked from frame 1.

Usage:
    python scripts/animate_character_shot.py theo 01           # Shot 01 full animation
    python scripts/animate_character_shot.py theo 01 --fast    # Use fast model (cheaper)
    python scripts/animate_character_shot.py theo all          # All 3 shots

Costs:
- veo-3.1-generate-preview: ~£3.20 per 4-second clip (hero quality)
- veo-3.1-fast-generate-preview: ~£0.40 per 4-second clip (faster, less polish)

Output: references/influencers/theo/shot_XX_animated.mp4
"""

import sys
import json
import time
from pathlib import Path
import logging

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from gtm_engine.utils.media import generate_video
from gtm_engine.utils.logger import setup_logging

logger = logging.getLogger(__name__)

CHARACTERS_DIR = Path(__file__).resolve().parent.parent / "references" / "influencers"


def load_manifest(character_id: str) -> dict:
    """Load the character manifest JSON."""
    manifest_path = CHARACTERS_DIR / character_id / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(f"No manifest at {manifest_path}")
    return json.loads(manifest_path.read_text())


def animate_shot(character_id: str, shot: dict, use_fast: bool = False) -> Path | None:
    """Animate a shot using Veo 3.1 with the approved start frame.

    Loads the approved start frame PNG and passes it to Veo as the
    first frame. The animation_directive from the manifest becomes
    the text prompt describing the motion.
    """
    shot_id = shot["id"]
    character_dir = CHARACTERS_DIR / character_id

    # Verify the approved start frame exists
    start_frame_path = character_dir / f"shot_{shot_id}_start.png"
    if not start_frame_path.exists():
        logger.error(
            "Start frame not found at %s. Run generate_character_shots.py first.",
            start_frame_path,
        )
        return None

    # Build the animation prompt: canonical character description + animation directive
    character_desc = shot.get("character_description", "")
    animation_directive = shot.get("animation_directive", "")

    # Pull the canonical description from the manifest if available
    try:
        manifest = load_manifest(character_id)
        canonical = manifest.get("character", {}).get("canonical_description", "")
    except Exception:
        canonical = ""

    animation_prompt = (
        f"{canonical}. "
        f"{animation_directive} "
        f"Cinematic, photorealistic, 8k, high contrast lighting, same environment "
        f"as the starting frame. Character identity must remain exactly the same."
    )

    # Choose model
    model = "veo-3.1-fast-generate-preview" if use_fast else "veo-3.1-generate-preview"
    model_label = "FAST" if use_fast else "FULL"

    logger.info("=" * 70)
    logger.info("  SHOT %s: %s", shot_id, shot["name"])
    logger.info("  Model: %s (%s)", model, model_label)
    logger.info("  Start frame: %s", start_frame_path)
    logger.info("=" * 70)

    # Animate — generate_video already handles reference_images correctly
    output_path = character_dir / f"shot_{shot_id}_animated.mp4"
    result = generate_video(
        prompt=animation_prompt,
        output_path=output_path,
        model=model,
        duration=shot.get("duration_seconds", 4),
        aspect_ratio="16:9",
        resolution="720p",
        reference_images=[start_frame_path],
    )

    if result:
        logger.info("[OK] Animation saved: %s", result)
    else:
        logger.error("[FAIL] Animation failed for shot %s", shot_id)

    return result


def main():
    setup_logging()

    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    character_id = sys.argv[1]
    shot_arg = sys.argv[2] if len(sys.argv) > 2 else "all"
    use_fast = "--fast" in sys.argv

    manifest = load_manifest(character_id)
    shots = manifest["shots"]

    # Filter shots
    if shot_arg not in ("all", "--fast"):
        shots = [s for s in shots if s["id"] == shot_arg]
        if not shots:
            print(f"Shot '{shot_arg}' not found in manifest.")
            sys.exit(1)

    print(f"\n{'=' * 70}")
    print(f"  Character Animation: {manifest['character']['name']}")
    print(f"  Shots to animate: {len(shots)}")
    print(f"  Model: {'veo-3.1-fast-generate-preview (cheap)' if use_fast else 'veo-3.1-generate-preview (full quality)'}")
    print(f"{'=' * 70}\n")

    results = []
    for shot in shots:
        result = animate_shot(character_id, shot, use_fast=use_fast)
        results.append({"shot": shot["id"], "path": str(result) if result else None})

    print(f"\n{'=' * 70}")
    print(f"  ANIMATION COMPLETE")
    print(f"{'=' * 70}")
    successful = sum(1 for r in results if r["path"])
    print(f"  Animated: {successful}/{len(results)}")
    for r in results:
        status = "[OK]" if r["path"] else "[FAIL]"
        print(f"  {status} Shot {r['shot']}: {r['path'] or 'failed'}")
    print()


if __name__ == "__main__":
    main()
