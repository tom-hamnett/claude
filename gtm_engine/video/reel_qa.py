"""Pre-render QA — a FREE, deterministic check that runs on the draft/plan BEFORE
you spend a HeyGen credit.

The whole point: catch the things that made the last reel wrong (13s not 25s, a
naked placeholder card, a caption printed twice, no proof visual, a flat run-on
script) while it's still free to fix. Returns a checklist the UI shows on the draft
and a `ready` flag that gates the paid button. No API calls — pure inspection of the
shot list, the script and (if a draft exists) the rendered duration.

A check: {"name", "ok": bool, "severity": "block|warn|info", "detail"}.
preflight(job) -> {"ready": bool, "score": int, "checks": [...], "blockers": [...], "warnings": [...]}.
"""

import logging
import re

logger = logging.getLogger(__name__)

TARGET_LO, TARGET_HI = 20, 32        # seconds — the sweet spot for this format
DUR_BLOCK_LO, DUR_BLOCK_HI = 16, 38  # outside this is a hard fail
WORDS_LO, WORDS_HI = 60, 95          # ~24-32s spoken with pauses
HOOK_MAX_WORDS = 16
LONG_SENTENCE = 20                   # avg words/sentence above this reads flat/run-on

_PLACEHOLDER = re.compile(r"\b(placeholder|lorem ipsum|todo|tbd|xxx|\[.*?\]|<.*?>)\b", re.I)


def _script_for(job) -> str:
    """The reel's spoken script: from the shot list if present, else the override/brief."""
    if job.shot_list:
        return " ".join((s.get("spoken") or "").strip() for s in job.shot_list).strip()
    if job.script_override:
        return job.script_override
    try:
        from gtm_engine.producer import ProducerBriefLibrary
        b = ProducerBriefLibrary().get_for_idea(job.idea_id)
        if b and b.spoken_script:
            return b.spoken_script
    except Exception:
        pass
    return job.spoken_script or ""


def _draft_duration(job) -> float | None:
    """Probe the current rendered reel's duration (the draft), or None."""
    from pathlib import Path
    if not job.video_path or not Path(job.video_path).exists():
        return None
    try:
        from gtm_engine.video.assembler import _probe_duration
        return _probe_duration(Path(job.video_path))
    except Exception:
        return None


def preflight(job) -> dict:
    """Run the free deterministic checks. Returns the checklist + a ready flag."""
    checks: list[dict] = []
    script = _script_for(job)
    words = re.findall(r"[A-Za-z0-9']+", script)
    n_words = len(words)
    sentences = [s for s in re.split(r"[.!?]+", script) if s.strip()]
    shots = job.shot_list or []

    def add(name, ok, severity, detail):
        checks.append({"name": name, "ok": ok, "severity": severity, "detail": detail})

    # 1 · Duration (only when a draft has been rendered)
    dur = _draft_duration(job)
    if dur is not None:
        if DUR_BLOCK_LO <= dur <= DUR_BLOCK_HI and not (TARGET_LO <= dur <= TARGET_HI):
            add("Length", False, "warn", f"{dur:.0f}s — aim for {TARGET_LO}-{TARGET_HI}s.")
        elif dur < DUR_BLOCK_LO:
            add("Length", False, "block", f"Only {dur:.0f}s — far too short (target {TARGET_LO}-{TARGET_HI}s). Lengthen the script.")
        elif dur > DUR_BLOCK_HI:
            add("Length", False, "block", f"{dur:.0f}s — too long (target {TARGET_LO}-{TARGET_HI}s). Trim the script.")
        else:
            add("Length", True, "info", f"{dur:.0f}s — in the sweet spot.")

    # 2 · Script word count (proxy for length before a draft exists)
    if n_words < 45:
        add("Script length", False, "block", f"{n_words} words — a ~13s reel. Needs {WORDS_LO}-{WORDS_HI}.")
    elif n_words < WORDS_LO:
        add("Script length", False, "warn", f"{n_words} words — likely under {TARGET_LO}s. Aim for {WORDS_LO}-{WORDS_HI}.")
    elif n_words > WORDS_HI + 25:
        add("Script length", False, "warn", f"{n_words} words — likely over {TARGET_HI}s. Trim.")
    else:
        add("Script length", True, "info", f"{n_words} words — good for {TARGET_LO}-{TARGET_HI}s.")

    # 3 · Pacing / breath — flat run-ons vs sentences that breathe
    if sentences:
        avg = n_words / len(sentences)
        if len(sentences) < 3 and n_words > 25:
            add("Pacing", False, "warn", f"Only {len(sentences)} sentence(s) — no room to breathe. Break it up.")
        elif avg > LONG_SENTENCE:
            add("Pacing", False, "warn", f"~{avg:.0f} words/sentence — reads flat. Shorter sentences give the voice pauses.")
        else:
            add("Pacing", True, "info", f"{len(sentences)} sentences, ~{avg:.0f} words each — breathes.")

    # 4 · Hook length
    if shots:
        hook = (shots[0].get("spoken") or "").strip()
    else:
        hook = sentences[0].strip() if sentences else ""
    hw = len(re.findall(r"[A-Za-z0-9']+", hook))
    if hook and hw > HOOK_MAX_WORDS:
        add("Hook", False, "warn", f"Opening line is {hw} words — a hook should land in ≤{HOOK_MAX_WORDS}.")
    elif hook:
        add("Hook", True, "info", f"Opens in {hw} words.")

    # 5 · Placeholder / leaked text
    ph = [s for s in shots if _PLACEHOLDER.search((s.get("caption") or "") + " " + (s.get("spoken") or ""))]
    if _PLACEHOLDER.search(script) or ph:
        add("Placeholder text", False, "block", "Placeholder/bracketed text found — it will render on screen. Remove it.")

    # 6 · Caption duplicates the spoken line (would double-print)
    dupes = [s for s in shots if (s.get("caption") or "").strip()
             and (s.get("caption") or "").strip().lower() == (s.get("spoken") or "").strip().lower()]
    if dupes:
        add("Captions", False, "warn", f"{len(dupes)} caption(s) repeat the spoken line word-for-word — trim to a short label.")

    # 7 · Proof visuals present (the whole point of a data reel)
    if shots:
        from collections import Counter
        mix = Counter(s.get("visual") for s in shots)
        proof = mix.get("screenshot", 0) + mix.get("chart", 0)
        cards = mix.get("card", 0)
        mode = getattr(job, "content_mode", "insight")
        if mode in ("insight", "explainer") and proof == 0:
            add("Proof visuals", False, "block" if mode == "insight" else "warn",
                "No screenshots or charts — a data reel needs its proof on screen. Attach data or a screenshot.")
        else:
            add("Proof visuals", True, "info", f"{proof} proof visual(s) in the cut.")
        if cards > 2:
            add("Text cards", False, "warn", f"{cards} plain text cards — they read as filler. Prefer proof visuals or the presenter.")

    blockers = [c for c in checks if not c["ok"] and c["severity"] == "block"]
    warnings = [c for c in checks if not c["ok"] and c["severity"] == "warn"]
    score = max(0, 100 - 30 * len(blockers) - 8 * len(warnings))
    return {
        "ready": not blockers,
        "score": score,
        "checks": checks,
        "blockers": [c["detail"] for c in blockers],
        "warnings": [c["detail"] for c in warnings],
    }
