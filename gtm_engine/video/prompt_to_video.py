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


def _video_style() -> str:
    """The coherent visual STYLE block (a single, self-consistent aesthetic — the thing that
    actually works, vs a fragmented checklist). Editable in brand_standards.json positioning."""
    try:
        from gtm_engine.config import DATA_DIR
        from gtm_engine.utils.file_io import load_json
        bp = DATA_DIR / "brand_standards.json"
        if bp.exists():
            pos = (load_json(bp) or {}).get("positioning", {}) or {}
            if (pos.get("video_style") or "").strip():
                return pos["video_style"].strip()
    except Exception:
        pass
    return ("Bold Editorial. Near-black background, only the presenter and the words. One "
            "signal-green accent for the key word/number, white for the rest. Big bold text "
            "lands word-by-word on the hardest lines — the words ARE the display, no lower "
            "thirds, no decoration. Smash cuts between points. Measured, heavy, uncluttered.")


def _frame(voice: str) -> list[str]:
    """The brief for HeyGen's Prompt-to-Video flow: format + one coherent STYLE block +
    delivery. This flow generates a plan you approve, and REWARDS detail — so we lead with a
    self-consistent style and then (in _assemble) a concrete scene-by-scene with real data."""
    # Minimal header only: format + "give me a plan first". No duration (the script sets that),
    # no presenter line (the avatar carries it), no end-handle. STYLE + scenes come from _assemble.
    return [
        "Create a vertical (9:16) short-form video for LinkedIn and Instagram — a talking-head "
        "presenter intercut with clean, animated data visualisations.",
        "FIRST, give me a scene-by-scene plan to review before you generate (don't auto-proceed).",
    ]


def build_agent_prompt(concept: str, script: str, mode: str, data_text: str,
                       voice: str) -> str:
    """A lean fallback prompt (used when the AI script step is unavailable): the light
    frame + whatever script/angle we have. No design micro-management."""
    from gtm_engine.utils.text_clean import clean_text
    out = _frame(voice)
    if script.strip():
        out.append("SCRIPT (the exact words, in order — this sets the length):\n"
                   + clean_text(script.strip()))
    else:
        out.append("TOPIC / ANGLE:\n" + clean_text(concept.strip()))
    style = _video_style()
    if style:
        out.append("STYLE — applies to the DATA / ANALYSIS GRAPHICS ONLY (the presenter, framing, "
                   "captions and transitions are yours): " + style + ".")
    out.append("At the lines with a figure, show it as a simple bar chart or a big number — never "
               "a gauge/dial. Only use numbers that appear in the script; never invent one.")
    return "\n\n".join(out)


def _assemble(script_lines: list[str], scenes: list[dict], data_text: str, voice: str) -> str:
    """Turn a script + detailed scenes into the paste-ready prompt for HeyGen's Prompt-to-Video.
    A concrete SCENE-BY-SCENE (voiceover + a specific animated data visual per beat) is what
    produced the result that worked — this flow generates a plan you approve, so detail helps."""
    from gtm_engine.utils.text_clean import clean_text
    out = _frame(voice)
    # 1) SCRIPT in one block (sets the length). 2) STYLE — analysis graphics only. 3) A minimal
    # SHOT breakdown: 'Avatar + angle' for presenter, or the precise analysis + where it comes in.
    lines = list(script_lines) or [str(sc.get("say", "")) for sc in scenes if str(sc.get("say", "")).strip()]
    lines = [clean_text(l) for l in lines if clean_text(l)]
    if lines:
        out.append("SCRIPT (the exact words, in order — this sets the length):\n" + "\n".join(lines))
    style = _video_style()
    if style:
        out.append("STYLE — applies to the DATA / ANALYSIS GRAPHICS ONLY (the presenter, framing, "
                   "captions and transitions are yours to design): " + style + ".")
    if scenes:
        angles = ["front", "slight left angle", "slight right angle", "closer"]
        ai, rows = 0, []
        for i, sc in enumerate(scenes, 1):
            roll = (sc.get("roll") or "").lower()
            vis = clean_text((sc.get("visual") or sc.get("on_screen") or "").strip())
            is_analysis = (roll == "data") or (
                vis and "presenter" not in vis.lower() and "avatar" not in vis.lower())
            if is_analysis and vis:
                cue = " ".join(clean_text((sc.get("say") or "").strip()).split()[:8])
                row = f"{i}. Analysis — {vis}"
                if cue:
                    row += f' — in on "{cue}"'
                rows.append(row)
            else:
                rows.append(f"{i}. Avatar — {angles[ai % len(angles)]}")
                ai += 1
        out.append("SCENE / SHOT BREAKDOWN (minimal — for each moment: either 'Avatar' + a camera "
                   "angle, or the analysis animation and where it comes in; nothing more):\n"
                   + "\n".join(rows))
    out.append("Only use numbers that appear in the script; never invent a figure.")
    return "\n\n".join(out)


def compose_agent_prompt(piece_id: int, broll_notes: str = "") -> str:
    """Write a full reviewable prompt — SCRIPT + SCENE-BY-SCENE — for a social piece, using
    Claude, and store it on the piece (meta['agent_prompt'] + meta['script'] + meta['broll_notes']).
    `broll_notes` is the user's required brief for what the graphics/cutaways should show — the
    on-screen visuals are BUILT FROM IT, not invented. Falls back to a deterministic frame if
    the AI call fails. Returns the prompt."""
    import json as _json
    from gtm_engine.content_studio import ContentStudioStore
    from gtm_engine.content_studio.generator import _brand_voice, _data_text
    from gtm_engine.utils.ai_client import call_claude
    store = ContentStudioStore()
    p = store.get_piece(piece_id)
    if not p:
        return ""
    batch = store.get_batch(p.batch_id)
    # The b-roll brief: what the user typed for this reel, else the batch's CORE ANALYSIS
    # (defined once at intake) so the reel graphics stay consistent with the blog/articles.
    broll_notes = ((broll_notes or "").strip() or (p.meta or {}).get("broll_notes", "")
                   or (getattr(batch, "analysis", "") or "").strip())
    blog = next((b for b in store.list_pieces(p.batch_id, kind="blog")), None)
    data_text = _data_text(batch.data_source_id) if (batch and batch.data_source_id) else ""
    voice = _brand_voice()
    concept = f"{p.caption or ''}\n{p.body or ''}".strip()

    sys = ("You script a short-form vertical (9:16) talking-head reel with a few animated DATA "
           "visualisations, for HeyGen's Prompt-to-Video (it generates a plan the user approves). "
           + voice + " Write for the EAR: short spoken lines, one idea each; keep the whole thing "
           "punchy short-form — a handful of scenes. Use ONLY numbers that appear in the "
           "material; never invent a statistic. For each scene give: beat, roll ('presenter' or "
           "'data'), say (the spoken lines), and visual. For a PRESENTER scene, set visual to "
           "'presenter on camera'. For a DATA scene, SPECIFY THE ANALYSIS PRECISELY — this is the "
           "part HeyGen can't guess: name a chart type from this ALLOWED SET ONLY — bar chart, "
           "grouped bars, line chart (1-2 lines), a big counting number, a before/after pair, or "
           "a simple stacked bar — and give the actual values/labels, the comparison, and a "
           "short caption. Do NOT use gauges, dials, speedometers, needles, spotlights, network/"
           "node webs, maps, particles, or any 'draws / sweeps / fills / disperses across' "
           "frame-by-frame choreography — HeyGen renders those literally and badly. Return ONLY "
           "JSON: {\"script\":[\"line\"], \"scenes\":[{\"beat\":\"\",\"roll\":\"presenter|data\","
           "\"say\":\"...\",\"visual\":\"a precise chart spec from the allowed set, or presenter "
           "on camera\"}]}")
    ctx = f"CONCEPT / ANGLE:\n{concept}\n\n"
    if broll_notes:
        ctx += ("VISUALS BRIEF — the graphics / b-roll / cutaways to build the scenes from "
                "(use THESE):\n" + broll_notes[:1500] + "\n\n")
    if blog and (blog.body or "").strip():
        ctx += f"BLOG CONTEXT (for facts/tone):\n{blog.body[:2500]}\n\n"
    if data_text.strip():
        ctx += f"REFERENCE FIGURES (the only numbers allowed):\n{data_text[:1200]}\n\n"
    # Detailed scene visuals need room — too small a cap truncates the JSON and yields nothing.
    raw = call_claude(ctx + "Return ONLY the JSON.", system=sys, max_tokens=4000)
    script_lines, scenes = [], []
    s, e = raw.find("{"), raw.rfind("}")
    if s != -1:
        try:
            d = _json.loads(raw[s:e + 1])
            script_lines = [str(x).strip() for x in (d.get("script") or []) if str(x).strip()]
            scenes = [sc for sc in (d.get("scenes") or []) if isinstance(sc, dict)]
            # If the model put the words only inside the scenes (no top-level script), derive
            # the script from the scenes' spoken lines so the Script box is never blank.
            if not script_lines and scenes:
                script_lines = [str(sc.get("say", "")).strip() for sc in scenes
                                if str(sc.get("say", "")).strip()]
        except Exception:
            pass
    # Safety net: if we got a script but no scenes (e.g. truncated/partial JSON), build a
    # scene per line so the plan is never blank — the user can flesh out the visuals.
    if script_lines and not scenes:
        scenes = [{"beat": f"Scene {i + 1}", "roll": "", "say": ln, "visual": ""}
                  for i, ln in enumerate(script_lines)]
    if script_lines or scenes:
        prompt = _assemble(script_lines, scenes, data_text, voice)
    else:
        # AI unavailable/failed — deterministic frame from whatever the piece already has.
        prompt = build_agent_prompt(concept, ((p.meta or {}).get("script") or ""),
                                    p.content_mode or "insight", data_text, voice)
    p.meta = {**(p.meta or {}), "agent_prompt": prompt,
              "script": "\n".join(script_lines) or (p.meta or {}).get("script", ""),
              "scenes": scenes, "broll_notes": broll_notes}
    store.save_piece(p)
    return prompt


def _reassemble_prompt(piece_id: int) -> str:
    """Rebuild the full paste-ready prompt from the piece's stored script + scenes (no AI) —
    so an edited script flows straight into what gets pasted. Stores + returns the prompt."""
    from gtm_engine.content_studio import ContentStudioStore
    from gtm_engine.content_studio.generator import _brand_voice, _data_text
    store = ContentStudioStore()
    p = store.get_piece(piece_id)
    if not p:
        return ""
    meta = p.meta or {}
    script_lines = [ln for ln in (meta.get("script") or "").split("\n") if ln.strip()]
    scenes = meta.get("scenes") or []
    batch = store.get_batch(p.batch_id)
    data_text = _data_text(batch.data_source_id) if (batch and batch.data_source_id) else ""
    prompt = _assemble(script_lines, scenes, data_text, _brand_voice())
    p.meta = {**meta, "agent_prompt": prompt}
    store.save_piece(p)
    return prompt


def script_from_prompt(prompt: str) -> str:
    """Last-resort: pull the spoken lines out of an already-built prompt (for reels made
    before the script was stored separately). Handles the VO: "..." scene format and a
    'SCRIPT' section of '- ' lines. Returns '' if nothing recognisable."""
    if not prompt:
        return ""
    import re
    lines = prompt.split("\n")
    vo = [m.group(1).strip() for ln in lines
          if (m := re.search(r'VO:\s*"(.+?)"', ln.strip()))]
    if vo:
        return "\n".join(vo)
    out, collecting = [], False
    for ln in lines:
        s = ln.strip()
        if not collecting:
            if s.upper().startswith("SCRIPT"):
                collecting = True
            continue
        if s.startswith("- "):
            out.append(s[2:].strip())
        elif s == "":
            continue
        elif out:
            break
    return "\n".join(out)


def plan_text_of(piece) -> str:
    """The editable SCENE PLAN as text — one block per scene, mirroring the plan HeyGen
    returns:  [Beat · roll] / VO: ... / Visual: ...  . Falls back to parsing the built prompt."""
    meta = getattr(piece, "meta", None) or {}
    scenes = meta.get("scenes") or []
    blocks = []
    for sc in scenes:
        beat = str(sc.get("beat", "")).strip()
        roll = str(sc.get("roll", "")).strip()
        say = str(sc.get("say", "")).strip()
        vis = str(sc.get("visual", "") or sc.get("on_screen", "")).strip()
        head = f"[{beat}" + (f" · {roll}" if roll else "") + "]"
        b = head
        if say:
            b += f"\nVO: {say}"
        if vis:
            b += f"\nVisual: {vis}"
        blocks.append(b)
    if blocks:
        return "\n\n".join(blocks)
    return _plan_from_prompt(meta.get("agent_prompt", ""))


def _plan_from_prompt(prompt: str) -> str:
    """Recover an editable scene plan from a built prompt's SCENE-BY-SCENE section (old reels)."""
    import re
    scenes = _scenes_from_prompt_scenes(prompt)
    blocks = []
    for sc in scenes:
        head = f"[{sc['beat']}" + (f" · {sc['roll']}" if sc.get("roll") else "") + "]"
        b = head
        if sc.get("say"):
            b += f"\nVO: {sc['say']}"
        if sc.get("visual"):
            b += f"\nVisual: {sc['visual']}"
        blocks.append(b)
    return "\n\n".join(blocks)


def _scenes_from_prompt_scenes(prompt: str) -> list[dict]:
    """Parse the 'N. beat · roll / VO: ".." / Visual: ..' blocks out of a built prompt."""
    import re
    if not prompt:
        return []
    scenes, cur = [], None
    for ln in prompt.split("\n"):
        s = ln.strip()
        m = re.match(r"^\d+\.\s+(.*)$", s)
        if m:
            if cur:
                scenes.append(cur)
            head = m.group(1)
            beat, roll = (head.split("·", 1) + [""])[:2]
            cur = {"beat": beat.strip(), "roll": roll.strip(), "say": "", "visual": ""}
        elif cur and s.lower().startswith("vo:"):
            cur["say"] = s[3:].strip().strip('"')
        elif cur and s.lower().startswith("visual:"):
            cur["visual"] = s[7:].strip()
    if cur:
        scenes.append(cur)
    return scenes


def _scenes_from_plan_text(text: str) -> list[dict]:
    """Parse the edited scene-plan text back into scene dicts."""
    import re
    scenes = []
    for block in re.split(r"\n\s*\n", text or ""):
        lines = [l for l in block.split("\n") if l.strip()]
        if not lines:
            continue
        head = lines[0].strip().strip("[]").strip()
        beat, roll = (head.split("·", 1) + [""])[:2]
        sc = {"beat": beat.strip(), "roll": roll.strip(), "say": "", "visual": ""}
        for l in lines[1:]:
            ls = l.strip()
            if ls.lower().startswith("vo:"):
                sc["say"] = ls[3:].strip().strip('"')
            elif ls.lower().startswith("visual:"):
                sc["visual"] = ls[7:].strip()
            elif not sc["visual"] and not ls.lower().startswith(("vo", "visual")):
                sc["visual"] = ls
        scenes.append(sc)
    return scenes


def set_plan(piece_id: int, plan_text: str) -> str:
    """Save an edited scene plan (VO + Visual per scene) and rebuild the prompt."""
    from gtm_engine.content_studio import ContentStudioStore
    store = ContentStudioStore()
    p = store.get_piece(piece_id)
    if not p:
        return ""
    scenes = _scenes_from_plan_text(plan_text)
    script = "\n".join(sc.get("say", "") for sc in scenes if sc.get("say"))
    p.meta = {**(p.meta or {}), "scenes": scenes, "script": script}
    store.save_piece(p)
    return _reassemble_prompt(piece_id)


def revise_plan(piece_id: int, instruction: str) -> str:
    """Ask Claude to revise the whole scene plan per a plain instruction (add b-roll, punchier
    hook, natural presenter, etc.), save it, and rebuild the prompt. Returns the new prompt."""
    import json as _json
    from gtm_engine.content_studio import ContentStudioStore
    from gtm_engine.content_studio.generator import _brand_voice
    from gtm_engine.utils.ai_client import call_claude
    store = ContentStudioStore()
    p = store.get_piece(piece_id)
    if not p:
        return ""
    scenes = (p.meta or {}).get("scenes") or []
    sys = ("You revise the scene plan of a short-form vertical talking-head reel with a few "
           "animated data visualisations. Apply the user's instruction; keep it punchy "
           "short-form. For a DATA scene, specify the analysis PRECISELY but use a chart type "
           "from this ALLOWED SET ONLY — bar chart, grouped bars, line chart (1-2 lines), a big "
           "counting number, a before/after pair, or a simple stacked bar — with real values/"
           "labels, the comparison and a short caption. NEVER use gauges, dials, needles, "
           "spotlights, network webs, maps, particles or 'draws/sweeps/fills across' "
           "choreography (HeyGen renders those literally and badly). Presenter scenes: visual "
           "'presenter on camera'. " + _brand_voice() + " Never invent statistics. Return ONLY "
           "JSON: {\"scenes\":[{\"beat\":\"\",\"roll\":\"presenter|data\",\"say\":\"the spoken "
           "lines\",\"visual\":\"precise chart spec from the allowed set, or presenter on "
           "camera\"}]}")
    raw = call_claude(f"CURRENT SCENES:\n{_json.dumps(scenes, ensure_ascii=False)}\n\n"
                      f"INSTRUCTION: {instruction.strip()}\n\nReturn ONLY the revised JSON.",
                      system=sys, max_tokens=3000)
    s, e = raw.find("{"), raw.rfind("}")
    try:
        new = [sc for sc in (_json.loads(raw[s:e + 1]).get("scenes") or []) if isinstance(sc, dict)]
    except Exception:
        new = []
    if new:
        script = "\n".join(sc.get("say", "") for sc in new if sc.get("say"))
        p.meta = {**(p.meta or {}), "scenes": new, "script": script}
        store.save_piece(p)
    return _reassemble_prompt(piece_id)


def set_script(piece_id: int, script_text: str) -> str:
    """Save a manually-edited script and rebuild the prompt. Returns the new prompt."""
    from gtm_engine.content_studio import ContentStudioStore
    from gtm_engine.utils.text_clean import clean_text
    store = ContentStudioStore()
    p = store.get_piece(piece_id)
    if not p:
        return ""
    p.meta = {**(p.meta or {}), "script": clean_text(script_text or "")}
    store.save_piece(p)
    return _reassemble_prompt(piece_id)


def revise_script(piece_id: int, instruction: str) -> str:
    """Ask Claude to revise the stored script per a plain-English instruction (like a chat:
    'punchier hook', 'shorter', 'lead with the number'), save it, and rebuild the prompt.
    Returns the new script text (or the current one unchanged on failure)."""
    from gtm_engine.content_studio import ContentStudioStore
    from gtm_engine.content_studio.generator import _brand_voice
    from gtm_engine.utils.ai_client import call_claude
    from gtm_engine.utils.text_clean import clean_text
    store = ContentStudioStore()
    p = store.get_piece(piece_id)
    if not p:
        return ""
    current = (p.meta or {}).get("script", "")
    sys = ("You revise the spoken script of a ~40-second vertical reel. Apply the user's "
           "instruction. Keep it short and for the EAR — one idea per line, spoken rhythm, no "
           "stage directions. " + _brand_voice() + " Never invent statistics that aren't already "
           "there. Return ONLY the revised script as plain lines (one spoken line per line), no "
           "JSON, no commentary, no numbering.")
    raw = call_claude(f"CURRENT SCRIPT:\n{current}\n\nINSTRUCTION: {instruction.strip()}\n\n"
                      "Return ONLY the revised script lines.", system=sys, max_tokens=700)
    new = clean_text((raw or "").strip())
    if not new:
        return current
    p = store.get_piece(piece_id)
    p.meta = {**(p.meta or {}), "script": new}
    store.save_piece(p)
    _reassemble_prompt(piece_id)
    return new


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


def available_looks() -> list[dict]:
    """The avatar 'looks' you can start a reel from — the looks in your presenter's HeyGen
    avatar group, plus the presenter's own avatar as the default. Each look is a distinct
    avatar_id the Video Agent accepts. Returns [{id, name, preview_url}] (a network call);
    [] when HeyGen isn't configured."""
    from gtm_engine.avatar import get_provider
    provider = get_provider("heygen")
    if not provider.is_configured():
        return []
    cast = resolve_cast()
    looks, seen = [], set()
    if cast["avatar_id"]:
        looks.append({"id": cast["avatar_id"],
                      "name": f"{cast['avatar_name'] or 'Current avatar'} (current)",
                      "preview_url": ""})
        seen.add(cast["avatar_id"])
    group_id = ""
    try:
        from gtm_engine.casting import CastingStore
        ch = CastingStore().get_default_character()
        group_id = (ch.avatar_group_id if ch else "") or ""
    except Exception:
        pass
    try:
        pool = provider.list_avatar_looks(group_id) if group_id else provider.list_avatars()
    except Exception:
        pool = []
    for lk in pool or []:
        lid = lk.get("id")
        if lid and lid not in seen:
            seen.add(lid)
            looks.append({"id": lid, "name": lk.get("name") or lid,
                          "preview_url": lk.get("preview_url", "")})
    return looks


def heygen_credits() -> int | None:
    """Remaining HeyGen API credits (0 = out), or None if not configured / unreadable."""
    from gtm_engine.avatar import get_provider
    p = get_provider("heygen")
    return p.remaining_quota() if p.is_configured() else None


def set_look_for_piece(piece_id: int, avatar_id: str) -> None:
    """Pin the starting avatar look for THIS reel (overrides the default cast)."""
    from gtm_engine.content_studio import ContentStudioStore
    store = ContentStudioStore()
    p = store.get_piece(piece_id)
    if not p:
        return
    p.meta = {**(p.meta or {}), "agent_avatar_id": avatar_id}
    store.save_piece(p)


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
    # a per-reel look choice (from the picker) overrides the default avatar
    avatar_id = (p.meta or {}).get("agent_avatar_id") or cast["avatar_id"]
    _say("Submitting to HeyGen Video Agent…")
    out = _out_path(piece_id)
    result = provider.render_video_agent(
        prompt, out,
        avatar_id=avatar_id,
        voice_id=cast["voice_id"],
        style_id=cast["style_id"],
        brand_kit_id=cast["brand_kit_id"],
        orientation="portrait",
        on_status=_say,
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
    # HeyGen often reports a bare 'failed' with no reason — check credits, the usual cause.
    try:
        q = provider.remaining_quota()
    except Exception:
        q = None
    if q is not None:
        err += (f"  ·  HeyGen credits remaining: {q}"
                + ("  — you're out of credits, that's the cause." if q <= 0 else ""))
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
