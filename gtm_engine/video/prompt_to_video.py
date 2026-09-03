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


def _assemble(script_lines: list[str], scenes: list[dict], data_text: str, voice: str) -> str:
    """Turn a written script + scene beats into the final paste-ready Video Agent prompt,
    wrapped in the fixed brand frame. This is exactly what gets sent to HeyGen."""
    handle = _handle()
    out = [
        "Create a ~40-second vertical (9:16) short-form video for LinkedIn and Instagram "
        "Reels — a single talking-head presenter with clean, minimal ANIMATED data graphics "
        "on a dark background. Sharp business/strategy channel; credible and understated, "
        "never flashy corporate-stock. No handshake/skyline B-roll.",
        f"BRAND: {handle}. Delivery is measured, low-energy, authoritative — the tone of "
        "someone reading a board pack they've made peace with. Full stops between sentences, "
        "real air in the gaps, no upward 'sales' lift at line ends. Numbers spoken slowly.",
        f"PALETTE (match exactly): {_PALETTE}. One accent green; gold only for a 'bad'/"
        "contrast value. Captions burned in, one short line at a time, synced to the speech.",
    ]
    if voice:
        out.append("VOICE GUARDRAILS: " + voice.strip())
    if script_lines:
        out.append("SCRIPT (deliver these lines, in order):\n"
                   + "\n".join(f"- {ln}" for ln in script_lines))
    if scenes:
        beats = []
        for i, sc in enumerate(scenes, 1):
            beat = (sc.get("beat") or f"Scene {i}").strip()
            say = (sc.get("say") or "").strip()
            osd = (sc.get("on_screen") or "").strip()
            line = f"{i}. [{beat}]"
            if say:
                line += f' Presenter: "{say}"'
            if osd:
                line += f" — On screen: {osd}"
            beats.append(line)
        out.append("SCENE BREAKDOWN (what appears when):\n" + "\n".join(beats))
    out.append(
        "DATA GRAPHICS: render any figure or before→after as a clean animated graphic — a "
        "counting number, a bar, or a two-point line — that animates in ON the words it "
        "belongs to. Use ONLY numbers that appear in the script above; never invent or add a "
        "statistic. If a number needs context to be meaningful, show the label + unit or drop it.")
    if (data_text or "").strip():
        out.append("REFERENCE FIGURES (the only numbers you may visualise):\n"
                   + data_text.strip()[:1200])
    out.append(f"End on a soft close and a lower-third handle: {handle}.")
    return "\n\n".join(out)


def compose_agent_prompt(piece_id: int) -> str:
    """Write a full reviewable prompt — SCRIPT + SCENE BREAKDOWN — for a social piece,
    using Claude, and store it on the piece (meta['agent_prompt'] + meta['script']).
    Falls back to the deterministic frame if the AI call fails. Returns the prompt."""
    import json as _json
    from gtm_engine.content_studio import ContentStudioStore
    from gtm_engine.content_studio.generator import _brand_voice, _data_text
    from gtm_engine.utils.ai_client import call_claude
    store = ContentStudioStore()
    p = store.get_piece(piece_id)
    if not p:
        return ""
    batch = store.get_batch(p.batch_id)
    blog = next((b for b in store.list_pieces(p.batch_id, kind="blog")), None)
    data_text = _data_text(batch.data_source_id) if (batch and batch.data_source_id) else ""
    voice = _brand_voice()
    concept = f"{p.caption or ''}\n{p.body or ''}".strip()

    sys = ("You script a ~40-second vertical talking-head reel with animated data graphics. "
           + voice + " Write for the EAR: short spoken lines, one idea each, spoken rhythm. "
           "Structure it hook → tension → proof → payoff → soft close. Use ONLY numbers that "
           "appear in the material given; never invent a statistic. Return ONLY JSON: "
           "{\"script\":[\"line\",...], \"scenes\":[{\"beat\":\"Hook|Tension|Proof|Payoff|"
           "Close\",\"say\":\"the spoken line(s) for this beat\",\"on_screen\":\"what the "
           "viewer sees — e.g. an animated bar of X, a counter 34→9, presenter only\"}]}")
    ctx = f"CONCEPT / ANGLE:\n{concept}\n\n"
    if blog and (blog.body or "").strip():
        ctx += f"BLOG CONTEXT (for facts/tone):\n{blog.body[:2500]}\n\n"
    if data_text.strip():
        ctx += f"REFERENCE FIGURES (the only numbers allowed):\n{data_text[:1200]}\n\n"
    raw = call_claude(ctx + "Return ONLY the JSON.", system=sys, max_tokens=1500)
    script_lines, scenes = [], []
    s, e = raw.find("{"), raw.rfind("}")
    if s != -1:
        try:
            d = _json.loads(raw[s:e + 1])
            script_lines = [str(x).strip() for x in (d.get("script") or []) if str(x).strip()]
            scenes = [sc for sc in (d.get("scenes") or []) if isinstance(sc, dict)]
        except Exception:
            pass
    if script_lines or scenes:
        prompt = _assemble(script_lines, scenes, data_text, voice)
    else:
        # AI unavailable/failed — deterministic frame from whatever the piece already has.
        prompt = build_agent_prompt(concept, ((p.meta or {}).get("script") or ""),
                                    p.content_mode or "insight", data_text, voice)
    p.meta = {**(p.meta or {}), "agent_prompt": prompt,
              "script": "\n".join(script_lines) or (p.meta or {}).get("script", "")}
    store.save_piece(p)
    return prompt


def agent_prompt_for_piece(piece_id: int, regenerate: bool = False) -> str:
    """Return the reviewable prompt for a piece. Uses the stored one (so you send exactly
    what you reviewed); composes a fresh script+scenes prompt if there isn't one yet, or
    when regenerate=True."""
    from gtm_engine.content_studio import ContentStudioStore
    p = ContentStudioStore().get_piece(piece_id)
    if not p:
        return ""
    stored = (p.meta or {}).get("agent_prompt")
    if stored and not regenerate:
        return stored
    return compose_agent_prompt(piece_id)


def save_agent_prompt(piece_id: int, prompt: str) -> None:
    """Persist an edited prompt so it's exactly what the render sends."""
    from gtm_engine.content_studio import ContentStudioStore
    store = ContentStudioStore()
    p = store.get_piece(piece_id)
    if not p:
        return
    p.meta = {**(p.meta or {}), "agent_prompt": prompt}
    store.save_piece(p)


def resolve_cast() -> dict:
    """What avatar / voice / style the Video Agent render will PIN — resolved from the
    same place the reel engine uses (the casting default character), falling back to the
    avatar config, then env. So a render uses YOUR presenter, not HeyGen's auto-pick.
    style/brand-kit have no UI yet, so they come from env (HEYGEN_STYLE_ID / _BRAND_KIT_ID).
    Empty avatar/voice means HeyGen will auto-pick that field."""
    avatar_id = avatar_name = voice_id = voice_name = ""
    try:
        from gtm_engine.casting import CastingStore
        ch = CastingStore().get_default_character()
        if ch:
            avatar_id, avatar_name = ch.avatar_id or "", ch.avatar_name or ""
            voice_id, voice_name = ch.voice_id or "", ch.voice_name or ""
    except Exception:
        pass
    if not avatar_id or not voice_id:
        try:
            from gtm_engine.avatar import AvatarConfigStore
            cfg = AvatarConfigStore().load()
            if not avatar_id:
                avatar_id, avatar_name = cfg.avatar_id or "", cfg.avatar_name or ""
            if not voice_id:
                voice_id, voice_name = cfg.voice_id or "", cfg.voice_name or ""
        except Exception:
            pass
    return {"avatar_id": avatar_id, "avatar_name": avatar_name,
            "voice_id": voice_id, "voice_name": voice_name,
            "style_id": os.getenv("HEYGEN_STYLE_ID", ""),
            "brand_kit_id": os.getenv("HEYGEN_BRAND_KIT_ID", "")}


def _out_path(piece_id: int) -> Path:
    from gtm_engine.config import OUTPUT_DIR
    d = OUTPUT_DIR / "prompt_to_video"
    d.mkdir(parents=True, exist_ok=True)
    return d / f"piece_{piece_id}.mp4"


def render_for_piece(piece_id: int, on_status=None, prompt: str = "") -> "Path | None":
    """Render a piece through HeyGen's Video Agent (pinning the configured avatar/voice),
    download the MP4, and store it on the piece. Sends EXACTLY `prompt` when given (the
    reviewed/edited text); otherwise the stored reviewed prompt, else a freshly composed
    one. Returns the path or None."""
    from gtm_engine.content_studio import ContentStudioStore
    from gtm_engine.avatar import get_provider

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

    prompt = (prompt or "").strip() or agent_prompt_for_piece(piece_id)
    cast = resolve_cast()   # pin YOUR presenter/voice, not HeyGen's auto-pick
    _say("Submitting to HeyGen Video Agent…")
    out = _out_path(piece_id)
    result = provider.render_video_agent(
        prompt, out,
        avatar_id=cast["avatar_id"],
        voice_id=cast["voice_id"],
        style_id=cast["style_id"],
        brand_kit_id=cast["brand_kit_id"],
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


def start_agent(piece_id: int, prompt: str = "") -> None:
    """Kick off a Video Agent render on a daemon thread; no-op if already running.
    Sends EXACTLY `prompt` (the reviewed text) when given."""
    if is_rendering(piece_id):
        return

    def _status(msg):
        with _BG_LOCK:
            if piece_id in _BG:
                _BG[piece_id]["status"] = msg

    def _run():
        res, err = None, ""
        try:
            res = render_for_piece(piece_id, on_status=_status, prompt=prompt)
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
