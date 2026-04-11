"""Character Shot Generator — Nano Banana 2 (gemini-3-pro-image-preview)

Generates locked character stills for the Core-Five framework.
Reads the character manifest from references/influencers/<character>/manifest.json
and produces high-fidelity composite stills using Nano Banana 2.

Usage:
    python scripts/generate_character_shots.py theo 01          # Shot 01 only
    python scripts/generate_character_shots.py theo 01 start    # Start frame only
    python scripts/generate_character_shots.py theo all         # All shots, all frames

Output: references/influencers/<character>/shot_XX_<frame>.png

Costs approximately £0.03 per image (Nano Banana 2 / gemini-3-pro-image-preview).
"""

import sys
import json
from pathlib import Path
import logging

# Add repo root to path so gtm_engine imports work
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from gtm_engine.utils.media import generate_image
from gtm_engine.utils.logger import setup_logging

logger = logging.getLogger(__name__)

CHARACTERS_DIR = Path(__file__).resolve().parent.parent / "references" / "influencers"


def load_manifest(character_id: str) -> dict:
    """Load the character manifest JSON."""
    manifest_path = CHARACTERS_DIR / character_id / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(
            f"No manifest found at {manifest_path}. "
            f"Create one with the character description and shot setups."
        )
    return json.loads(manifest_path.read_text())


def generate_shot_frame(character_id: str, shot: dict, frame_type: str) -> Path | None:
    """Generate a single frame (start or end) for a shot setup.

    Returns the path to the saved image, or None on failure.
    """
    prompt_key = f"{frame_type}_frame_prompt"
    prompt = shot.get(prompt_key)
    if not prompt:
        logger.error("No %s prompt found for shot %s", frame_type, shot.get("id"))
        return None

    output_dir = CHARACTERS_DIR / character_id
    output_dir.mkdir(parents=True, exist_ok=True)

    output_path = output_dir / f"shot_{shot['id']}_{frame_type}.png"

    logger.info("Generating shot %s %s frame: %s", shot["id"], frame_type, shot["name"])
    logger.info("Output: %s", output_path)

    # Use ULTRA quality for character keystone images — this is the visual source of truth
    result = generate_image(
        prompt=prompt,
        output_path=output_path,
        quality="ultra",
    )

    if result:
        logger.info("[OK] Saved to %s", result)
    else:
        logger.error("[FAIL] Shot %s %s frame generation failed", shot["id"], frame_type)

    return result


def main():
    setup_logging()

    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    character_id = sys.argv[1]
    shot_arg = sys.argv[2] if len(sys.argv) > 2 else "all"
    frame_arg = sys.argv[3] if len(sys.argv) > 3 else "both"

    manifest = load_manifest(character_id)
    shots = manifest["shots"]

    print(f"\n{'=' * 70}")
    print(f"  Character: {manifest['character']['name']}")
    print(f"  Voice: {manifest['character']['voice']['tts_voice']} (British RP)")
    print(f"{'=' * 70}\n")

    # Filter shots
    if shot_arg != "all":
        shots = [s for s in shots if s["id"] == shot_arg]
        if not shots:
            print(f"Shot '{shot_arg}' not found in manifest.")
            sys.exit(1)

    # Determine which frames to generate
    if frame_arg == "both":
        frame_types = ["start", "end"]
    elif frame_arg in ("start", "end"):
        frame_types = [frame_arg]
    else:
        frame_types = ["start", "end"]

    # Generate
    results = []
    for shot in shots:
        print(f"\n--- SHOT {shot['id']}: {shot['name']} ---")
        print(f"    Purpose: {shot['narrative_purpose']}")
        for frame_type in frame_types:
            result = generate_shot_frame(character_id, shot, frame_type)
            results.append({
                "shot": shot["id"],
                "frame": frame_type,
                "path": str(result) if result else None,
            })

    # Summary
    print(f"\n{'=' * 70}")
    print(f"  GENERATION COMPLETE")
    print(f"{'=' * 70}")
    successful = sum(1 for r in results if r["path"])
    print(f"  Generated: {successful}/{len(results)}")
    for r in results:
        status = "[OK]" if r["path"] else "[FAIL]"
        print(f"  {status} Shot {r['shot']} {r['frame']}: {r['path'] or 'failed'}")
    print()

    if successful == len(results):
        print("  [ NEXT STEP ]")
        print("  Inspect the generated stills in references/influencers/{}/".format(character_id))
        print("  If approved, proceed to animation with Veo 3.1 startFrame.")
        print("  If NOT approved, refine the prompts in manifest.json and re-run.")
        print()


if __name__ == "__main__":
    main()
