"""Core-Five Segment Library.

Locks the 20-second reel architecture into 5 modular State Blocks of 4 seconds each.
Each segment has a defined purpose, aesthetic, generation method, and reusable
asset requirements. This is the structural spine of every reel produced by the
engine — every content idea must fit one of these segment types.

Segments (Quantum Tools revision — Agitation replaced with Tension, Outcome with Proof):

    1. HOOK     — 0-4s   — Hyper-stylised character (Theo)        — Veo from Nano Banana still
    2. TENSION  — 4-8s   — Uncomfortable truth, data/text-led     — Data viz or Theo close-up
    3. PIVOT    — 8-12s  — Clean data visualisation               — Gemini image or screen recording
    4. PROOF    — 12-16s — Actual product output (not claims)     — Screen recording or Veo B-roll
    5. BOOKEND  — 16-20s — Return to Hook state, CTA              — Reuse Hook environment
"""

import json
from pathlib import Path

from gtm_engine.config import DATA_DIR

SEGMENTS_CONFIG_PATH = DATA_DIR / "core_five_segments.json"

# The locked Core-Five spec
CORE_FIVE = {
    "version": "2.0",
    "updated_at": "2026-04-11",
    "total_duration_seconds": 20,
    "segments": [
        {
            "id": "hook",
            "order": 1,
            "name": "Hook",
            "duration_seconds": 4,
            "purpose": "Pattern interrupt — stop the scroll in under 1 second",
            "narrative_role": "Pose a provocative question or state an uncomfortable truth",
            "visual_type": "hyper_stylised_character",
            "generation_method": "nano_banana_still_then_veo_startframe",
            "locked_character": "theo",
            "environment_id": "executive_reflection_pool",
            "aesthetic_constraints": [
                "Photorealistic cinematic (NOT 3D render, NOT illustration)",
                "Moody corporate lighting, Rembrandt style",
                "Architectural digest scale",
                "Character must look imposing and ageless",
                "Impossible physics signature (rotating halos, still water)",
            ],
            "audio_type": "high_energy_hook_statement",
            "typical_text_overlay": "One provocative line (max 6 words)",
            "reusable_asset": True,
            "reusable_asset_note": "Generate Hook environment once, reuse across all reels",
        },
        {
            "id": "tension",
            "order": 2,
            "name": "Tension",
            "duration_seconds": 4,
            "purpose": "Define the uncomfortable truth the viewer is living with",
            "narrative_role": "Name the pain, name the cost, name the hidden trade-off",
            "visual_type": "data_led_text_or_character_closeup",
            "generation_method": "gemini_image_or_character_closeup",
            "environment_id": "variable",
            "aesthetic_constraints": [
                "Text-forward or data-forward — viewer must READ something",
                "Dark background with bold typography",
                "Minimal, austere, intellectual",
                "NOT UGC iPhone aesthetic (Quantum Tools is not consumer-casual)",
                "Brand palette: #0a0a0f bg, #6c63ff accent, #ffd166 emphasis",
            ],
            "audio_type": "continued_narration",
            "typical_text_overlay": "The data point or cost (e.g. '£150K/yr on research that doesn\\'t differentiate')",
            "reusable_asset": False,
            "reusable_asset_note": "Generated fresh per idea — content varies",
        },
        {
            "id": "pivot",
            "order": 3,
            "name": "Pivot",
            "duration_seconds": 4,
            "purpose": "Introduce the solution via unarguable logic",
            "narrative_role": "Show the new way — here is what works, here is why",
            "visual_type": "clean_data_visualisation",
            "generation_method": "gemini_image_or_programmatic_chart",
            "environment_id": "brand_data_viz",
            "aesthetic_constraints": [
                "Dark background (#0a0a0f)",
                "Purple (#6c63ff) and gold (#ffd166) accents only",
                "Playfair Display for headlines, DM Sans for labels",
                "Non-3D charts — no flashy BI dashboard look",
                "Data must be specific and legible",
                "Rapid metric reveals, animated counters",
            ],
            "audio_type": "continued_narration",
            "typical_text_overlay": "The new metric or framework (e.g. '5 sources. 1 figure. 100% auditable.')",
            "reusable_asset": True,
            "reusable_asset_note": "Template-based — reuse chart style, vary data",
        },
        {
            "id": "proof",
            "order": 4,
            "name": "Proof",
            "duration_seconds": 4,
            "purpose": "Show the actual product doing the thing (not a claim, an artefact)",
            "narrative_role": "Here is the output. Here is what happens when you use this.",
            "visual_type": "product_output_or_screen_recording",
            "generation_method": "screen_recording_or_veo_broll",
            "environment_id": "variable",
            "aesthetic_constraints": [
                "Real product output (Excel diagnostic, PRISM benchmark, Atlas report)",
                "Fast cuts if multiple views (max 1 second per cut)",
                "Subtle zoom-in to key numbers or phrases",
                "Dark theme consistent with brand",
                "NO generic office stock footage",
            ],
            "audio_type": "continued_narration",
            "typical_text_overlay": "Caption pointing to the key data (e.g. '2,847 employees. 12 functions. 5 minutes.')",
            "reusable_asset": False,
            "reusable_asset_note": "Product-specific — varies per idea",
        },
        {
            "id": "bookend",
            "order": 5,
            "name": "Bookend",
            "duration_seconds": 4,
            "purpose": "Return to Hook state, deliver the CTA",
            "narrative_role": "Close the loop — come back to the character, land the action",
            "visual_type": "hyper_stylised_character_matching_hook",
            "generation_method": "nano_banana_still_then_veo_startframe",
            "locked_character": "theo",
            "environment_id": "match_hook",
            "aesthetic_constraints": [
                "EXACT same environment as Hook (no deviation)",
                "Same character pose family (can be variant — seated → leaning, walking → standing)",
                "Same colour grade, same lens, same lighting",
                "End on a held frame for 0.5s before cut",
                "Character 'addresses' the viewer (helmet turns toward camera)",
            ],
            "audio_type": "quiet_authority_cta",
            "typical_text_overlay": "The single action (e.g. 'See it run. quantumtools.ai')",
            "reusable_asset": True,
            "reusable_asset_note": "Matches Hook asset — reused",
        },
    ],
    "transitions": {
        "hook_to_tension": "Hard cut with 0.1s flash frame",
        "tension_to_pivot": "Smooth crossfade 0.3s",
        "pivot_to_proof": "Hard cut — the logic lands",
        "proof_to_bookend": "Crossfade 0.3s back to character",
    },
    "inviolable_rules": [
        "No single shot exceeds 4 seconds",
        "Hook and Bookend must match exactly",
        "Character is always Theo, generated via startFrame from hero.png",
        "Hyper-stylised aesthetic (Hook/Bookend) never blends with data-led (Tension/Pivot/Proof)",
        "Voice is continuous — Google TTS Charon with British RP directive",
        "No founder face, no human presenter, no recorded footage",
    ],
}


def init_segments_config() -> dict:
    """Write the Core-Five config to disk if it doesn't exist."""
    if not SEGMENTS_CONFIG_PATH.exists():
        SEGMENTS_CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        SEGMENTS_CONFIG_PATH.write_text(json.dumps(CORE_FIVE, indent=2))
    return CORE_FIVE


def load_segments() -> dict:
    """Load the Core-Five config."""
    if SEGMENTS_CONFIG_PATH.exists():
        return json.loads(SEGMENTS_CONFIG_PATH.read_text())
    return init_segments_config()


def get_segment(segment_id: str) -> dict | None:
    """Get a single segment spec by id."""
    segments = load_segments()
    for seg in segments["segments"]:
        if seg["id"] == segment_id:
            return seg
    return None


def list_segment_ids() -> list[str]:
    """Return the list of segment ids in order."""
    segments = load_segments()
    return [s["id"] for s in segments["segments"]]
