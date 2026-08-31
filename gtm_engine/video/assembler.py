"""Auto-assembler — turns an approved job into ONE finished vertical reel.

This is the "agent builds it for me" pipeline. From the producer brief's
Core-Five segments it produces each 4s segment, then stitches them into a
single 9:16 mp4 the founder just reviews and approves:

  1. HOOK    — the presenter (HeyGen Avatar IV, cast in the chosen look)
  2. TENSION — text/data card, or cinematic B-roll (Veo) + voiceover
  3. PIVOT   — data-viz card / B-roll
  4. PROOF   — product/output card / B-roll
  5. BOOKEND — the presenter returns (Avatar IV)

Design principles that make it usable (and cheap to test):
  - It ALWAYS produces a full-length reel. Any segment we can't render richly
    (no HeyGen look, no Veo) falls back to a clean branded TEXT CARD built with
    pure ffmpeg — zero API spend, still watchable. Rich providers just upgrade
    individual segments.
  - It's RESUMABLE. Each finished segment clip is cached on the job (keyed by a
    content hash), so a failure part-way doesn't redo completed segments.
  - Every segment records the METHOD it used (avatar / b-roll / card) so the UI
    can show exactly what happened and what to wire up to make it richer.

All ffmpeg runs use the imageio-ffmpeg binary, so no system ffmpeg is needed.
"""

import hashlib
import json
import logging
import subprocess
import textwrap
from pathlib import Path

from gtm_engine.config import OUTPUT_DIR

logger = logging.getLogger(__name__)

# Uniform spec every segment is normalised to, so the final stitch is clean.
W, H, FPS = 720, 1280, 30
BG_HEX = "0x0a0a0f"          # brand dark
ACCENT = "0xffffff"
SEG_ORDER = ["hook", "tension", "pivot", "proof", "bookend"]
AVATAR_SEGS = {"hook", "bookend"}
DEFAULT_SEG_SECONDS = 4

ASSEMBLY_DIR = OUTPUT_DIR / "assembly"


def _ffmpeg() -> str:
    """Path to a working ffmpeg binary (bundled — no system install needed)."""
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def _run(cmd: list[str], timeout: int = 180) -> bool:
    """Run an ffmpeg command; log stderr on failure. True on success."""
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        if r.returncode != 0:
            logger.error("ffmpeg failed: %s", (r.stderr or "")[-400:])
            return False
        return True
    except Exception as e:
        logger.error("ffmpeg exception: %s", e)
        return False


def _seg_dir(job_id: int) -> Path:
    d = ASSEMBLY_DIR / f"job_{job_id}"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _hash(*parts: str) -> str:
    return hashlib.sha1("|".join(p or "" for p in parts).encode()).hexdigest()[:12]


# ── text rendering (PIL — the bundled ffmpeg has no drawtext filter) ───────────

_FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def _font(size: int):
    from PIL import ImageFont
    for p in _FONT_CANDIDATES:
        if Path(p).exists():
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    try:
        return ImageFont.load_default(size=size)   # Pillow ≥10.1 scalable default
    except Exception:
        return ImageFont.load_default()


def _wrap_to_width(draw, text: str, font, max_w: int) -> list[str]:
    """Greedy word-wrap by measured pixel width."""
    words, lines, cur = (text or "").split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if draw.textlength(trial, font=font) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines or ["…"]


def _render_card_png(headline: str, subline: str, out_png: Path) -> Path:
    """A clean branded card image: centered headline (+ optional gold subline)."""
    from PIL import Image, ImageDraw
    img = Image.new("RGB", (W, H), (10, 10, 15))
    d = ImageDraw.Draw(img)
    hf = _font(66)
    lines = _wrap_to_width(d, headline.strip() or "…", hf, int(W * 0.82))
    lh = int(hf.size * 1.24)
    block_h = lh * len(lines)
    y = (H - block_h) // 2 - (40 if subline.strip() else 0)
    for ln in lines:
        w = d.textlength(ln, font=hf)
        d.text(((W - w) / 2, y), ln, font=hf, fill=(245, 245, 245))
        y += lh
    if subline.strip():
        sf = _font(34)
        slines = _wrap_to_width(d, subline.strip(), sf, int(W * 0.8))
        sy = H - 300
        for ln in slines:
            w = d.textlength(ln, font=sf)
            d.text(((W - w) / 2, sy), ln, font=sf, fill=(255, 209, 102))
            sy += int(sf.size * 1.3)
    img.save(out_png)
    return out_png


def _render_overlay_png(text: str, out_png: Path) -> Path:
    """Transparent lower-third caption to composite over B-roll (RGBA)."""
    from PIL import Image, ImageDraw
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f = _font(52)
    lines = _wrap_to_width(d, text.strip(), f, int(W * 0.86))
    lh = int(f.size * 1.25)
    y = H - 360
    for ln in lines:
        w = d.textlength(ln, font=f)
        x = (W - w) / 2
        d.rectangle([x - 18, y - 8, x + w + 18, y + f.size + 10], fill=(0, 0, 0, 140))
        d.text((x, y), ln, font=f, fill=(255, 255, 255, 255))
        y += lh
    img.save(out_png)
    return out_png


# ── segment builders ──────────────────────────────────────────────────────────

def _still_to_clip(png: Path, seconds: int, out: Path, audio: Path | None = None) -> Path | None:
    """Turn a still image into a normalised clip with a silent (or VO) audio track."""
    ff = _ffmpeg()
    cmd = [ff, "-y", "-loop", "1", "-i", str(png)]
    if audio and Path(audio).exists():
        cmd += ["-i", str(audio)]
    else:
        cmd += ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"]
    cmd += ["-t", str(seconds), "-r", str(FPS),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "44100",
            "-ac", "2", "-shortest", str(out)]
    return out if _run(cmd) and out.exists() else None


def _text_card(headline: str, subline: str, seconds: int, out: Path) -> Path | None:
    """A branded text card as a finished clip (PIL image → video)."""
    png = out.with_suffix(".png")
    _render_card_png(headline, subline, png)
    return _still_to_clip(png, seconds, out)


def _video_finalize(src: Path, out: Path, seconds: int | None = None,
                    audio: str | Path | None = "keep",
                    overlay_png: Path | None = None) -> Path | None:
    """Normalise a video clip to the uniform spec. audio: 'keep' source audio,
    a Path (external track), or None (silence). Optional caption overlay PNG."""
    ff = _ffmpeg()
    cmd = [ff, "-y", "-i", str(src)]
    ext_audio = isinstance(audio, (str, Path)) and audio != "keep"
    if overlay_png and Path(overlay_png).exists():
        cmd += ["-i", str(overlay_png)]
    if ext_audio and Path(audio).exists():
        cmd += ["-i", str(audio)]
    elif audio is None:
        cmd += ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"]
    scale = (f"scale={W}:{H}:force_original_aspect_ratio=decrease,"
             f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=black,fps={FPS},setsar=1")
    if overlay_png and Path(overlay_png).exists():
        fc = f"[0:v]{scale}[bg];[bg][1:v]overlay=0:0[v]"
        cmd += ["-filter_complex", fc, "-map", "[v]"]
        audio_idx = 2
    else:
        cmd += ["-vf", scale, "-map", "0:v:0"]
        audio_idx = 1
    if ext_audio and Path(audio).exists():
        cmd += ["-map", f"{audio_idx}:a:0", "-shortest"]
    elif audio is None:
        cmd += ["-map", f"{audio_idx}:a:0", "-shortest"]
    else:  # keep source audio
        cmd += ["-map", "0:a:0?"]
    if seconds:
        cmd += ["-t", str(seconds)]
    cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "44100",
            "-ac", "2", str(out)]
    return out if _run(cmd) and out.exists() else None


def _normalize(src: Path, out: Path, seconds: int | None = None) -> Path | None:
    """Normalise a clip that already carries its own audio (e.g. an avatar take)."""
    return _video_finalize(src, out, seconds=seconds, audio="keep")


def _avatar_segment(seg: dict, ctx: dict, out: Path) -> Path | None:
    """Render the presenter for a hook/bookend segment via the avatar provider,
    then normalise. Returns None if the provider can't produce it (→ card fallback)."""
    from gtm_engine.avatar import RenderRequest, get_provider
    provider = get_provider(ctx["provider"])
    if not getattr(provider, "is_configured", lambda: False)():
        return None
    image_key = ctx.get("image_key") or ""
    avatar_id = ctx.get("avatar_id") or ""
    # Avatar IV via API needs a photo image_key (from the cast look). A bare
    # trained-avatar id can't be driven by the API, so skip → card fallback.
    if not image_key and not (avatar_id and not avatar_id.startswith("tp:")):
        return None
    raw = out.with_name(out.stem + "_raw.mp4")
    req = RenderRequest(
        script=seg.get("spoken_text", "").strip() or "…",
        avatar_id=avatar_id,
        output_path=raw,
        voice_id=ctx.get("voice_id") or None,
        background=ctx.get("background", "#0a0a0f"),
        aspect_ratio="9:16",
        motion_prompt=ctx.get("motion_prompt", ""),
        expressiveness=ctx.get("expressiveness", 0.5),
        image_key=image_key,
    )
    result = provider.render(req)
    if not result or not Path(result).exists():
        logger.info("avatar segment fell back to card: %s",
                    getattr(provider, "last_error", ""))
        return None
    return _normalize(Path(result), out)


def _broll_segment(seg: dict, out: Path, narrate: bool = False) -> Path | None:
    """Cinematic B-roll (Veo, no people) for a middle segment, with a burnt caption.

    By default the B-roll is SILENT — captions carry the message and the only voice
    in the finished reel is the presenter's (on the hook/bookend). Set narrate=True
    to add an AI voiceover (note: it won't match the presenter's cloned voice).
    Returns None if Veo is unavailable (→ card fallback)."""
    from gtm_engine.config import GOOGLE_API_KEY
    if not GOOGLE_API_KEY:
        return None
    try:
        from gtm_engine.utils.media import generate_video, generate_voiceover
    except Exception:
        return None
    seconds = int(seg.get("duration_seconds") or DEFAULT_SEG_SECONDS)
    visual = seg.get("visual_direction", "").strip()
    prompt = (f"{visual}. ABSOLUTELY NO PEOPLE, no faces, no hands. Cinematic, shallow "
              f"depth of field, slow subtle movement. Dark, moody, desaturated. 9:16 vertical.")
    clip = generate_video(prompt, output_path=out.with_name(out.stem + "_broll.mp4"),
                          model="veo-3.1-fast-generate-preview", duration=seconds,
                          aspect_ratio="9:16")
    if not clip or not Path(clip).exists():
        return None
    # Voiceover only if explicitly asked for (it won't match the presenter's voice).
    spoken = seg.get("spoken_text", "").strip()
    vo = (generate_voiceover(spoken, output_path=out.with_name(out.stem + "_vo.wav"))
          if (narrate and spoken) else None)
    overlay = seg.get("text_overlay", "").strip()
    overlay_png = None
    if overlay:
        overlay_png = _render_overlay_png(overlay, out.with_name(out.stem + "_ov.png"))
    # Use the VO as the audio bed (or silence); Veo's own audio is discarded.
    audio = vo if (vo and Path(vo).exists()) else None
    return _video_finalize(Path(clip), out, seconds=seconds, audio=audio,
                           overlay_png=overlay_png)


def _build_segment(seg_id: str, seg: dict, ctx: dict, out: Path,
                   include_broll: bool, narrate_middle: bool = False) -> tuple[Path | None, str]:
    """Build one segment. Returns (clip_path, method). Falls back to a text card
    so a segment is ALWAYS produced."""
    seconds = int(seg.get("duration_seconds") or DEFAULT_SEG_SECONDS)
    if seg_id in AVATAR_SEGS:
        clip = _avatar_segment(seg, ctx, out)
        if clip:
            return clip, "avatar"
    elif include_broll:
        clip = _broll_segment(seg, out, narrate=narrate_middle)
        if clip:
            return clip, "b-roll"
    # Fallback card: overlay for the headline, spoken line as subline.
    headline = seg.get("text_overlay", "").strip() or seg.get("spoken_text", "").strip()
    subline = seg.get("spoken_text", "").strip() if seg_id in AVATAR_SEGS else ""
    card = _text_card(headline, subline, seconds, out)
    return card, "card"


# ── orchestrator ──────────────────────────────────────────────────────────────

def assemble_reel(job_id: int, include_broll: bool = True, narrate_middle: bool = False,
                  on_progress=None):
    """Assemble the full Core-Five reel for a job into one mp4.

    include_broll: generate cinematic Veo B-roll for the middle segments (costs
    a little per clip). When False (or Veo unavailable) middle segments are clean
    branded text cards — free, still a complete reel.
    narrate_middle: add an AI voiceover to the middle B-roll. Default False so the
    ONLY voice in the reel is the presenter's (on hook/bookend) — the middle rides
    on captions. Enable only if you accept a non-presenter voice in the middle.
    on_progress(step:int, total:int, label:str): optional UI callback.

    Returns the updated VideoJob (video_path set, status 'ready' on success).
    """
    from gtm_engine.video import VideoJobStore
    from gtm_engine.producer import ProducerBriefLibrary

    store = VideoJobStore()
    job = store.get(job_id)
    if not job:
        return None

    brief = ProducerBriefLibrary().get_for_idea(job.idea_id)
    segments = (brief.segments_json if brief else {}) or {}
    if not segments:
        # No breakdown — synthesise a minimal hook/bookend from the job.
        segments = {
            "hook": {"spoken_text": job.hook_text, "text_overlay": job.hook_text,
                     "duration_seconds": 4, "visual_type": "character_in_scene"},
            "bookend": {"spoken_text": job.bookend_text, "text_overlay": job.bookend_text,
                        "duration_seconds": 4, "visual_type": "character_in_scene"},
        }

    ctx = _resolve_context(job)
    state = _load_state(job)
    seg_ids = [s for s in SEG_ORDER if s in segments]
    total = len(seg_ids) + 1
    sd = _seg_dir(job_id)
    methods: dict[str, str] = {}
    clips: list[str] = []

    for i, seg_id in enumerate(seg_ids):
        seg = segments.get(seg_id, {}) or {}
        sig = _hash(seg_id, json.dumps(seg, sort_keys=True), str(include_broll),
                    str(narrate_middle), ctx.get("image_key", ""), ctx.get("motion_prompt", ""))
        cached = state.get("segments", {}).get(seg_id)
        out = sd / f"{i}_{seg_id}_{sig}.mp4"
        if on_progress:
            on_progress(i + 1, total, f"{seg_id.title()} segment")
        if cached and cached.get("sig") == sig and Path(cached["path"]).exists():
            clips.append(cached["path"])
            methods[seg_id] = cached.get("method", "card")
            continue
        clip, method = _build_segment(seg_id, seg, ctx, out, include_broll,
                                      narrate_middle=narrate_middle)
        if not clip:  # last-ditch: a minimal card so the stitch never breaks
            clip = _text_card(seg.get("text_overlay", seg_id.title()), "",
                              int(seg.get("duration_seconds") or DEFAULT_SEG_SECONDS), out)
            method = "card"
        if clip:
            clips.append(str(clip))
            methods[seg_id] = method
            state.setdefault("segments", {})[seg_id] = {
                "sig": sig, "path": str(clip), "method": method}
            _save_state(job, state)

    if not clips:
        job.error = "Assembly produced no segments."
        job.status = "failed"
        job.id = store.save(job)
        return store.get(job.id)

    if on_progress:
        on_progress(total, total, "Stitching the reel")
    reel = sd / "reel_final.mp4"
    ok = _concat(clips, reel)
    if ok and reel.exists():
        # Publish to the job's canonical output path.
        final = OUTPUT_DIR / "videos" / f"idea_{job.idea_id}_reel.mp4"
        final.parent.mkdir(parents=True, exist_ok=True)
        final.write_bytes(reel.read_bytes())
        job.video_path = str(final)
        job.status = "ready"
        job.error = ""
    else:
        job.status = "failed"
        job.error = "Could not stitch the segments together."
    state["methods"] = methods
    state["reel"] = job.video_path
    _save_state(job, state)
    job.id = store.save(job)
    return store.get(job.id)


def _concat(clips: list[str], out: Path) -> bool:
    """Stitch normalised clips with the concat filter (robust across sources)."""
    ff = _ffmpeg()
    cmd = [ff, "-y"]
    for c in clips:
        cmd += ["-i", c]
    n = len(clips)
    streams = "".join(f"[{i}:v:0][{i}:a:0]" for i in range(n))
    cmd += ["-filter_complex", f"{streams}concat=n={n}:v=1:a=1[v][a]",
            "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(out)]
    return _run(cmd, timeout=300)


def _resolve_context(job) -> dict:
    """Gather everything the segment builders need from the cast + cfg."""
    from gtm_engine.avatar import AvatarConfigStore
    cfg = AvatarConfigStore().load()
    ctx = {
        "provider": cfg.provider,
        "avatar_id": job.avatar_id,
        "voice_id": job.voice_id,
        "motion_prompt": job.motion_prompt,
        "expressiveness": job.expressiveness or 0.5,
        "background": cfg.background,
        "image_key": "",
    }
    try:
        from gtm_engine.casting import CastingStore
        cs = CastingStore()
        ch = cs.get_default_character()
        if ch:
            ctx["image_key"] = ch.image_key or ""
            ctx["avatar_id"] = ctx["avatar_id"] or ch.avatar_id
            ctx["voice_id"] = ctx["voice_id"] or ch.voice_id
        # A per-reel cast look overrides the character's default image_key.
        if job.look_id:
            look = cs.get_look(job.look_id)
            if look and look.image_key:
                ctx["image_key"] = look.image_key
    except Exception:
        pass
    return ctx


def _load_state(job) -> dict:
    try:
        return json.loads(job.assembly_json or "{}")
    except Exception:
        return {}


def _save_state(job, state: dict) -> None:
    from gtm_engine.video import VideoJobStore
    job.assembly_json = json.dumps(state)
    VideoJobStore().save(job)
