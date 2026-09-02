"""Carousel engine — tight square slides for LinkedIn / Instagram.

A carousel is its own medium (not a reel): 5–7 square 1080×1080 slides, mostly
INSIGHT, occasionally one DATA slide, opening on a cover hook and closing on a soft
CTA. Kept deliberately short — a swipe, not an essay. Rendered with PIL in the same
signal-green brand palette as the data-viz, so it sits alongside the reels.

Public:
  make_carousel_from_piece(piece_id) -> list[png paths]   (generates + renders + stores)
  render_carousel(slides, out_dir, prefix) -> list[png paths]
"""

import json
import logging
from pathlib import Path

from gtm_engine.video.dataviz import (BG, INK, MUTED, ACCENT, ACCENT2, GRID, _font, _wrap, _num)

logger = logging.getLogger(__name__)

SW = SH = 1080                      # square
N_MIN, N_MAX = 5, 7
_HANDLE = "quantumtools.ai"


def _footer(d, idx: int, total: int):
    f = _font(int(SW * 0.028), bold=True)
    d.text((int(SW * 0.07), int(SH * 0.92)), _HANDLE, font=f, fill=MUTED)
    pg = f"{idx + 1} / {total}"
    w = d.textlength(pg, font=f)
    d.text((SW - int(SW * 0.07) - w, int(SH * 0.92)), pg, font=f, fill=MUTED)


def _kicker(d, y: int, text: str, col=ACCENT):
    f = _font(int(SW * 0.03), bold=True)
    x = int(SW * 0.08)
    for ch in (text or "").upper():
        d.text((x, y), ch, font=f, fill=col)
        x += d.textlength(ch, font=f) + int(SW * 0.006)


def _slide_cover(d, s, idx, total):
    _kicker(d, int(SH * 0.14), "swipe →")
    tf = _font(int(SW * 0.088), bold=True)
    lines = _wrap(d, s.get("title", ""), tf, int(SW * 0.84))[:5]
    y = int(SH * 0.30)
    for ln in lines:
        d.text((int(SW * 0.08), y), ln, font=tf, fill=INK)
        y += int(tf.size * 1.16)
    d.rectangle([int(SW * 0.08), y + int(SH * 0.02),
                 int(SW * 0.08) + int(SW * 0.16), y + int(SH * 0.02) + max(6, int(SW * 0.012))],
                fill=ACCENT)
    if s.get("body"):
        bf = _font(int(SW * 0.04), bold=False)
        for i, ln in enumerate(_wrap(d, s["body"], bf, int(SW * 0.8))[:2]):
            d.text((int(SW * 0.08), y + int(SH * 0.07) + i * int(bf.size * 1.3)), ln,
                   font=bf, fill=MUTED)
    _footer(d, idx, total)


def _slide_text(d, s, idx, total, kicker="Insight"):
    _kicker(d, int(SH * 0.12), kicker)
    tf = _font(int(SW * 0.066), bold=True)
    y = int(SH * 0.20)
    for ln in _wrap(d, s.get("title", ""), tf, int(SW * 0.84))[:4]:
        d.text((int(SW * 0.08), y), ln, font=tf, fill=INK)
        y += int(tf.size * 1.16)
    body = s.get("body", "")
    if body:
        bf = _font(int(SW * 0.046), bold=False)
        y += int(SH * 0.03)
        for ln in _wrap(d, body, bf, int(SW * 0.84))[:8]:
            d.text((int(SW * 0.08), y), ln, font=bf, fill=(210, 224, 216))
            y += int(bf.size * 1.34)
    _footer(d, idx, total)


def _slide_stat(d, s, idx, total):
    _kicker(d, int(SH * 0.16), s.get("label", "the number"))
    value = str(s.get("value", "—"))
    is_loss = value.strip().startswith("-") or value.strip().startswith("−")
    col = ACCENT2 if is_loss else ACCENT
    size = int(SW * 0.28)
    vf = _font(size, bold=True)
    while d.textlength(value, font=vf) > SW * 0.84 and size > 40:
        size = int(size * 0.9); vf = _font(size, bold=True)
    w = d.textlength(value, font=vf)
    d.text(((SW - w) / 2, int(SH * 0.34)), value, font=vf, fill=col)
    d.rectangle([(SW - w) / 2, int(SH * 0.34) + int(vf.size * 1.02),
                 (SW - w) / 2 + w, int(SH * 0.34) + int(vf.size * 1.02) + max(6, int(SW * 0.012))],
                fill=col)
    if s.get("body") or s.get("sub"):
        bf = _font(int(SW * 0.042), bold=False)
        txt = s.get("body") or s.get("sub")
        for i, ln in enumerate(_wrap(d, txt, bf, int(SW * 0.8))[:3]):
            lw = d.textlength(ln, font=bf)
            d.text(((SW - lw) / 2, int(SH * 0.60) + i * int(bf.size * 1.3)), ln, font=bf, fill=MUTED)
    _footer(d, idx, total)


def _slide_cta(d, s, idx, total):
    _kicker(d, int(SH * 0.16), "the takeaway")
    tf = _font(int(SW * 0.072), bold=True)
    y = int(SH * 0.28)
    for ln in _wrap(d, s.get("title", ""), tf, int(SW * 0.84))[:4]:
        d.text((int(SW * 0.08), y), ln, font=tf, fill=INK)
        y += int(tf.size * 1.16)
    hf = _font(int(SW * 0.05), bold=True)
    d.text((int(SW * 0.08), int(SH * 0.78)), s.get("body") or f"See it run · {_HANDLE}",
           font=hf, fill=ACCENT)
    _footer(d, idx, total)


def render_carousel(slides: list[dict], out_dir: Path, prefix: str = "slide") -> list[str]:
    """Render each slide dict to a 1080² PNG. Returns the paths in order."""
    from PIL import Image, ImageDraw
    out_dir.mkdir(parents=True, exist_ok=True)
    paths, total = [], len(slides)
    for i, s in enumerate(slides):
        img = Image.new("RGB", (SW, SH), BG)
        d = ImageDraw.Draw(img)
        typ = s.get("type", "insight")
        try:
            if typ == "cover":
                _slide_cover(d, s, i, total)
            elif typ == "data":
                _slide_stat(d, s, i, total)
            elif typ == "cta":
                _slide_cta(d, s, i, total)
            else:
                _slide_text(d, s, i, total)
        except Exception as e:
            logger.info("slide %d render failed: %s", i, e)
            _slide_text(d, s, i, total)
        p = out_dir / f"{prefix}_{i:02d}.png"
        img.save(p)
        paths.append(str(p))
    return paths


def generate_carousel_slides(concept: str, blog_excerpt: str, voice: str) -> list[dict]:
    """Ask Claude for a tight square-carousel slide plan. Returns [] on failure."""
    from gtm_engine.utils.ai_client import call_claude
    sys = ("You design SQUARE carousels for LinkedIn/Instagram — a swipe, not an essay. Produce "
           f"{N_MIN}–{N_MAX} slides, MOSTLY insight, AT MOST ONE 'data' slide (only if there's a "
           "real number worth a full slide). Keep each slide SHORT: title ≤ 8 words, body ≤ 28 "
           "words. First slide type='cover' (the scroll-stopping hook); last type='cta' (a soft "
           "close). " + voice + " Return ONLY JSON: {\"slides\":[{\"type\":\"cover|insight|data|"
           "cta\",\"title\":\"...\",\"body\":\"...\",\"value\":\"(data only, e.g. -11.4%)\","
           "\"label\":\"(data only, e.g. MAX DRAWDOWN)\"}]}")
    raw = call_claude(f"CONCEPT: {concept}\n\nBLOG CONTEXT:\n{blog_excerpt[:3000]}\n\n"
                      "Return ONLY the JSON.", system=sys, max_tokens=1500)
    s, e = raw.find("{"), raw.rfind("}")
    try:
        data = json.loads(raw[s:e + 1]) if s != -1 else {}
    except Exception:
        return []
    slides = [sl for sl in (data.get("slides") or [])
              if isinstance(sl, dict) and (sl.get("title") or sl.get("value"))]
    return slides[:N_MAX]


def make_carousel_from_piece(piece_id: int) -> list[str]:
    """Generate + render a square carousel for a social 'carousel' piece. Stores the
    slide PNG paths on the piece (meta['slides']) and marks it ready. Returns paths."""
    from gtm_engine.content_studio import ContentStudioStore
    from gtm_engine.content_studio.generator import _brand_voice
    from gtm_engine.config import OUTPUT_DIR
    store = ContentStudioStore()
    p = store.get_piece(piece_id)
    if not p:
        return []
    blog = next((b for b in store.list_pieces(p.batch_id, kind="blog")), None)
    concept = f"{p.caption}\n{p.body}".strip()
    slides = generate_carousel_slides(concept, blog.body if blog else "", _brand_voice())
    if not slides:
        return []
    out = OUTPUT_DIR / "carousels" / f"batch_{p.batch_id}" / f"piece_{p.id}"
    paths = render_carousel(slides, out, prefix="slide")
    p.meta = {**(p.meta or {}), "slides": paths, "slide_specs": slides}
    p.format = "carousel"
    p.status = "ready"
    store.save_piece(p)
    return paths
