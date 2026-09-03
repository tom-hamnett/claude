"""Prompt-to-Video — the HeyGen Video Agent path.

The higher-polish alternative to compositing reels ourselves: our engine writes a
tight, on-brand PROMPT (the input) from a social piece, hands it to HeyGen's Video
Agent API (which scripts, picks scenes/b-roll and renders), then downloads the finished
MP4 (the output) and hangs it on the piece so it flows into the Publish Queue.

Two ways to get the output:
  • render_for_piece()  — fully automated via the API (pins your avatar/voice)
  • attach_uploaded_video() — for when you render in the HeyGen app and drop the MP4 in

Public:
  agent_prompt_for_piece(piece_id) -> str          (the paste-ready prompt)
  render_for_piece(piece_id, on_status) -> Path|None
  attach_uploaded_video(piece_id, src_path) -> Path
  start_agent(piece_id) / is_rendering / status_of / result_of / error_of
"""

import logging
import os
import shutil
import threading
from pathlib import Path

logger = logging.getLogger(__name__)

# Brand palette (mirrors gtm_engine.video.dataviz) — spelled out so the agent matches it.
_PALETTE = ("background near-black green-black #080F0C; text near-white #E9F2EC; "
            "muted labels/axes #788C82; primary accent signal-green #20C878; "
            "contrast/'bad' accent gold #FFD166; gridlines #1E2E26")


def _handle() -> str:
    try:
        from gtm_engine.config import DATA_DIR
        from gtm_engine.utils.file_io import load_json
        bp = DATA_DIR / "brand_standards.json"
        if bp.exists():
            pos = (load_json(bp) or {}).get("positioning", {}) or {}
            return pos.get("handle") or pos.get("persona") or "The Rational Strategist"
    except Exception:
        pass
    return "The Rational Strategist"


def build_agent_prompt(concept: str, script: str, mode: str, data_text: str,
                       voice: str) -> str:
    """Compose the Video Agent prompt: format + presenter tone + brand palette +
    the script, plus a data-visualisation instruction that NEVER invents numbers."""
    handle = _handle()
    parts = [
        "Create a ~40-second vertical (9:16) short-form video for LinkedIn and Instagram "
        "Reels — a single talking-head presenter with clean, minimal ANIMATED data graphics "
        "on a dark background. This is a sharp business/strategy channel; credible and "
        "understated, never flashy corporate-stock. No handshake/skyline B-roll.",
        f"BRAND: {handle}. Delivery is measured, low-energy, authoritative — the tone of "
        "someone reading a board pack they've made peace with. Full stops between sentences, "
        "real air in the gaps, no upward 'sales' lift at line ends. Numbers spoken slowly "
        "and cleanly.",
        f"PALETTE (match exactly): {_PALETTE}. One accent green; gold only for a 'bad'/"
        "contrast value. Sans-serif, tight, modern. Captions burned in, one short line at a "
        "time, synced to the speech.",
    ]
    if voice:
        parts.append("VOICE GUARDRAILS: " + voice.strip())
    if script.strip():
        parts.append("SCRIPT (deliver these lines, in order):\n" + script.strip())
    else:
        parts.append("TOPIC / ANGLE:\n" + concept.strip())
    parts.append(
        "DATA GRAPHICS: wherever the script states a figure or a before→after, render it as "
        "a clean animated graphic — a counting number, a bar, or a two-point line — that "
        "animates in ON the words it belongs to. Use ONLY numbers that appear in the script; "
        "never invent or add a statistic. If a number would need context to be meaningful, "
        "show that context (label + unit) or leave it out.")
    if (data_text or "").strip():
        parts.append("REFERENCE FIGURES (the only numbers you may visualise):\n"
                     + data_text.strip()[:1200])
    parts.append(f"End on a soft close and a lower-third handle: {handle}.")
    return "\n\n".join(parts)


def agent_prompt_for_piece(piece_id: int) -> str:
    """Build the prompt for a Content Studio social piece (uses its caption/body/mode,
    the batch's blog for context, brand voice, and any tagged data — nothing else)."""
    from gtm_engine.content_studio import ContentStudioStore
    from gtm_engine.content_studio.generator import _brand_voice, _data_text
    store = ContentStudioStore()
    p = store.get_piece(piece_id)
    if not p:
        return ""
    concept = f"{p.caption or ''}\n{p.body or ''}".strip()
    # A reel piece may already carry a written script in meta (from the producer brief).
    script = ((p.meta or {}).get("script") or "").strip()
    batch = store.get_batch(p.batch_id)
    data_text = _data_text(batch.data_source_id) if (batch and batch.data_source_id) else ""
    return build_agent_prompt(concept, script, p.content_mode or "insight", data_text,
                              _brand_voice())


def _out_path(piece_id: int) -> Path:
    from gtm_engine.config import OUTPUT_DIR
    d = OUTPUT_DIR / "prompt_to_video"
    d.mkdir(parents=True, exist_ok=True)
    return d / f"piece_{piece_id}.mp4"


def render_for_piece(piece_id: int, on_status=None) -> "Path | None":
    """Build the prompt, render it through HeyGen's Video Agent (pinning the configured
    avatar/voice), download the MP4, and store it on the piece. Returns the path or None."""
    from gtm_engine.content_studio import ContentStudioStore
    from gtm_engine.avatar import get_provider, AvatarConfigStore

    def _say(msg):
        if on_status:
            try:
                on_status(msg)
            except Exception:
                pass

    store = ContentStudioStore()
    p = store.get_piece(piece_id)
    if not p:
        return None
    provider = get_provider("heygen")
    if not provider.is_configured():
        p.meta = {**(p.meta or {}), "agent_error": "No HEYGEN_API_KEY set."}
        store.save_piece(p)
        return None

    prompt = agent_prompt_for_piece(piece_id)
    cfg = AvatarConfigStore().load()
    _say("Submitting to HeyGen Video Agent…")
    out = _out_path(piece_id)
    result = provider.render_video_agent(
        prompt, out,
        avatar_id=cfg.avatar_id or "",
        voice_id=cfg.voice_id or "",
        style_id=os.getenv("HEYGEN_STYLE_ID", ""),
        brand_kit_id=os.getenv("HEYGEN_BRAND_KIT_ID", ""),
        orientation="portrait",
    )
    p = store.get_piece(piece_id)  # reload (may have changed)
    if result:
        p.meta = {**(p.meta or {}), "video_path": str(result), "agent_prompt": prompt,
                  "video_source": "heygen_agent", "agent_error": ""}
        p.status = "ready"
        store.save_piece(p)
        _say("Done.")
        try:
            from gtm_engine.persistence import backup_quietly
            backup_quietly()
        except Exception:
            pass
        return result
    err = getattr(provider, "last_error", "") or "Render failed."
    p.meta = {**(p.meta or {}), "agent_error": err, "agent_prompt": prompt}
    store.save_piece(p)
    _say(f"Failed: {err}")
    return None


def attach_uploaded_video(piece_id: int, src_path) -> "Path | None":
    """Store an MP4 the user rendered in the HeyGen app onto the piece (the manual
    output path). Copies it into the workspace and marks the piece ready."""
    from gtm_engine.content_studio import ContentStudioStore
    store = ContentStudioStore()
    p = store.get_piece(piece_id)
    if not p:
        return None
    out = _out_path(piece_id)
    shutil.copyfile(str(src_path), out)
    p.meta = {**(p.meta or {}), "video_path": str(out), "video_source": "heygen_app",
              "agent_error": ""}
    p.status = "ready"
    store.save_piece(p)
    try:
        from gtm_engine.persistence import backup_quietly
        backup_quietly()
    except Exception:
        pass
    return out


# ── background runner (survives the phone closing the tab) ────────────────────
_BG: dict = {}
_BG_LOCK = threading.Lock()


def is_rendering(piece_id: int) -> bool:
    with _BG_LOCK:
        e = _BG.get(piece_id)
        return bool(e) and not e.get("done")


def status_of(piece_id: int) -> str:
    with _BG_LOCK:
        return (_BG.get(piece_id) or {}).get("status", "")


def result_of(piece_id: int) -> str:
    with _BG_LOCK:
        return (_BG.get(piece_id) or {}).get("result", "")


def error_of(piece_id: int) -> str:
    with _BG_LOCK:
        return (_BG.get(piece_id) or {}).get("error", "")


def start_agent(piece_id: int) -> None:
    """Kick off a Video Agent render on a daemon thread; no-op if already running."""
    if is_rendering(piece_id):
        return

    def _status(msg):
        with _BG_LOCK:
            if piece_id in _BG:
                _BG[piece_id]["status"] = msg

    def _run():
        res, err = None, ""
        try:
            res = render_for_piece(piece_id, on_status=_status)
            if not res:
                from gtm_engine.content_studio import ContentStudioStore
                pp = ContentStudioStore().get_piece(piece_id)
                err = (pp.meta or {}).get("agent_error", "Failed.") if pp else "Failed."
        except Exception as e:
            logger.error("prompt-to-video runner crashed for %s: %s", piece_id, e)
            err = str(e)
        with _BG_LOCK:
            if piece_id in _BG:
                _BG[piece_id]["done"] = True
                _BG[piece_id]["result"] = str(res) if res else ""
                _BG[piece_id]["error"] = err
                _BG[piece_id]["status"] = "Done." if res else f"Failed: {err}"

    with _BG_LOCK:
        _BG[piece_id] = {"status": "Starting…", "result": "", "error": "", "done": False}
    th = threading.Thread(target=_run, name=f"agent-{piece_id}", daemon=True)
    th.start()
