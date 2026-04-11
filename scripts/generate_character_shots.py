"""Character Shot Generator — Nano Banana 2 (gemini-3-pro-image-preview)

Two-stage workflow for character consistency:

STAGE 1 — Generate the Hero reference image (once):
    python scripts/generate_character_shots.py theo hero

STAGE 2 — Generate shot stills using Hero as reference (maintains identity):
    python scripts/generate_character_shots.py theo 01
    python scripts/generate_character_shots.py theo 02
    python scripts/generate_character_shots.py theo 03
    python scripts/generate_character_shots.py theo all

Why the two stages: Nano Banana 2 generates independent characters from
text prompts alone. Passing the Hero image as a visual reference locks
the character identity across shots so Theo looks like the same being
in every environment.

Output: references/influencers/<character>/
  - hero.png           (generated first, approved by user)
  - shot_XX_start.png  (generated using hero as reference)
  - shot_XX_end.png    (generated using hero as reference)

Cost: ~£0.03 per image via Nano Banana 2 (much cheaper than Imagen Ultra).
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


def generate_hero(character_id: str, manifest: dict) -> Path | None:
    """Generate the canonical Hero reference image.

    This is the visual source of truth — generated once, then used as a
    reference image for every subsequent shot to maintain identity.
    """
    hero_data = manifest.get("hero")
    if not hero_data:
        logger.error("No hero definition in manifest for %s", character_id)
        return None

    output_dir = CHARACTERS_DIR / character_id
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "hero.png"

    logger.info("=" * 70)
    logger.info("  GENERATING HERO REFERENCE IMAGE")
    logger.info("  Character: %s", manifest["character"]["name"])
    logger.info("=" * 70)

    # Hero image has no reference — it IS the reference
    result = generate_image(
        prompt=hero_data["prompt"],
        output_path=output_path,
        quality="standard",  # Nano Banana 2 — cheap
    )

    if result:
        logger.info("[OK] Hero saved to %s", result)
        logger.info("")
        logger.info("NEXT STEP:")
        logger.info("  1. Open references/influencers/%s/hero.png", character_id)
        logger.info("  2. Approve or refine the hero image")
        logger.info("  3. Once approved, run:")
        logger.info("     python scripts/generate_character_shots.py %s all", character_id)
    else:
        logger.error("[FAIL] Hero generation failed")

    return result


def generate_shot_frame(
    character_id: str,
    shot: dict,
    frame_type: str,
    hero_reference: Path,
) -> Path | None:
    """Generate a single frame using the Hero image as visual reference.

    Passes hero.png as the reference image so Nano Banana maintains the
    exact character identity across shots.
    """
    prompt_key = f"{frame_type}_frame_prompt"
    prompt = shot.get(prompt_key)
    if not prompt:
        logger.error("No %s prompt found for shot %s", frame_type, shot.get("id"))
        return None

    output_dir = CHARACTERS_DIR / character_id
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"shot_{shot['id']}_{frame_type}.png"

    logger.info("Shot %s [%s]: %s", shot["id"], frame_type, shot["name"])

    result = generate_image(
        prompt=prompt,
        output_path=output_path,
        quality="standard",  # Nano Banana 2 — supports reference_image
        reference_image=hero_reference,
    )

    if result:
        logger.info("  [OK] %s", result.name)
    else:
        logger.error("  [FAIL] %s", output_path.name)

    return result


def main():
    setup_logging()

    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    character_id = sys.argv[1]
    target = sys.argv[2] if len(sys.argv) > 2 else "hero"
    frame_arg = sys.argv[3] if len(sys.argv) > 3 else "both"

    manifest = load_manifest(character_id)
    hero_path = CHARACTERS_DIR / character_id / "hero.png"

    print(f"\n{'=' * 70}")
    print(f"  Character: {manifest['character']['name']}")
    print(f"  Voice: {manifest['character']['voice']['tts_voice']} (British RP)")
    print(f"{'=' * 70}\n")

    # Hero mode — generate the canonical reference image
    if target == "hero":
        generate_hero(character_id, manifest)
        return

    # Shot mode — requires hero.png to exist
    if not hero_path.exists():
        print(f"[ERROR] Hero image not found at {hero_path}")
        print(f"        Run this first: python scripts/generate_character_shots.py {character_id} hero")
        sys.exit(1)

    shots = manifest["shots"]
    if target != "all":
        shots = [s for s in shots if s["id"] == target]
        if not shots:
            print(f"[ERROR] Shot '{target}' not found in manifest")
            sys.exit(1)

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
        print(f"    Reference: {hero_path.name}")
        for frame_type in frame_types:
            result = generate_shot_frame(character_id, shot, frame_type, hero_path)
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
        print(f"  Review the stills in references/influencers/{character_id}/")
        print("  If approved, animate with: python scripts/animate_character_shot.py " + character_id + " 01")


if __name__ == "__main__":
    main()
