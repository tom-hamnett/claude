"""Data-viz B-roll — turns the real numbers in the script into branded proof visuals.

For a data product the highest-performing B-roll isn't stock footage, it's the
data itself. When a beat is "here's a number/result" and the user hasn't uploaded
a screenshot, the choreographer emits a `chart` shot with a small `data_spec`, and
this module renders it to a 1080×1920 PNG in the brand's signal-green palette. The
compositor then cuts to it exactly like any other cutaway.

A data_spec (dict) is one of:
  {"chart_type":"stat",  "value":"-11.4%", "label":"MAX DRAWDOWN", "sub":"52-week live test"}
  {"chart_type":"bar",   "title":"Return vs benchmark", "unit":"%",
                          "bars":[{"label":"ATLAS","value":34.2},{"label":"S&P 500","value":11.0}]}
  {"chart_type":"line",  "title":"Equity curve · 52 weeks", "series":[100,103,101,108,...],
                          "note":"every trade logged"}
  {"chart_type":"table", "title":"The log, losses and all",
                          "rows":[["Week 12","+2.3%"],["Week 13","-1.1%"], ...]}

Everything is rendered with PIL primitives — no matplotlib/numpy dependency, no
system fonts required — so it works on the 1GB Streamlit box without new weight.
"""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Brand palette (dark ground so the accent and white numbers pop on mobile).
BG      = (8, 15, 12)          # near-black signal-green tint
PANEL   = (16, 28, 23)         # card panels
INK     = (233, 242, 236)      # near-white
MUTED   = (120, 140, 130)      # labels / axes
ACCENT  = (32, 200, 120)       # signal green (bright for on-dark)
ACCENT2 = (255, 209, 102)      # gold — for the "loss" / contrast accent
GRID    = (30, 46, 38)

CHART_TYPES = {"stat", "bar", "line", "table"}

_FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
_FONT_REG = [
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def _font(size: int, bold: bool = True):
    from PIL import ImageFont
    for p in (_FONT_CANDIDATES if bold else _FONT_REG):
        if Path(p).exists():
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    try:
        return ImageFont.load_default(size=size)
    except Exception:
        return ImageFont.load_default()


def _num(v) -> float:
    """Best-effort parse of a value that may carry %, +, commas, currency."""
    try:
        return float(v)
    except (TypeError, ValueError):
        pass
    s = str(v).strip()
    neg = s.startswith("-") or s.startswith("−")
    keep = "".join(c for c in s if c.isdigit() or c == ".")
    try:
        n = float(keep) if keep else 0.0
    except ValueError:
        n = 0.0
    return -n if neg else n


def _kicker(d, W, y, text):
    f = _font(int(W * 0.032), bold=True)
    t = (text or "").upper()
    # letter-spaced kicker
    x = int(W * 0.09)
    for ch in t:
        d.text((x, y), ch, font=f, fill=ACCENT)
        x += d.textlength(ch, font=f) + int(W * 0.006)


def render_dataviz(spec: dict, out_png: Path, W: int = 1080, H: int = 1920) -> Path | None:
    """Render a data_spec to a branded vertical PNG. Returns the path, or None."""
    ct = (spec or {}).get("chart_type")
    if ct not in CHART_TYPES:
        return None
    from PIL import Image, ImageDraw
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    try:
        if ct == "stat":
            _draw_stat(d, spec, W, H)
        elif ct == "bar":
            _draw_bar(d, spec, W, H)
        elif ct == "line":
            _draw_line(d, spec, W, H)
        elif ct == "table":
            _draw_table(d, spec, W, H)
    except Exception as e:
        logger.info("dataviz render failed (%s): %s", ct, e)
        return None
    img.save(out_png)
    return out_png


def _center(d, text, font, y, W, fill):
    w = d.textlength(text, font=font)
    d.text(((W - w) / 2, y), text, font=font, fill=fill)


def _draw_stat(d, spec, W, H):
    """One giant number — the single most-quoted figure, impossible to miss."""
    value = str(spec.get("value") or "—")
    label = str(spec.get("label") or "").upper()
    sub = str(spec.get("sub") or "")
    is_loss = value.strip().startswith("-") or value.strip().startswith("−")
    col = ACCENT2 if is_loss else ACCENT
    # fit the number to width
    size = int(W * 0.36)
    vf = _font(size, bold=True)
    while d.textlength(value, font=vf) > W * 0.82 and size > 40:
        size = int(size * 0.9)
        vf = _font(size, bold=True)
    _kicker(d, W, int(H * 0.30), label or "THE NUMBER")
    _center(d, value, vf, int(H * 0.40), W, col)
    # accent underline
    vw = d.textlength(value, font=vf)
    ux = (W - vw) / 2
    uy = int(H * 0.40) + int(vf.size * 1.02)
    d.rectangle([ux, uy, ux + vw, uy + max(6, int(W * 0.012))], fill=col)
    if sub:
        sf = _font(int(W * 0.040), bold=False)
        for i, ln in enumerate(_wrap(d, sub, sf, int(W * 0.78))):
            _center(d, ln, sf, uy + int(H * 0.05) + i * int(sf.size * 1.3), W, MUTED)


def _wrap(d, text, font, max_w):
    words, lines, cur = str(text).split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if d.textlength(trial, font=font) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur); cur = w
    if cur:
        lines.append(cur)
    return lines or [""]


def _title_block(d, spec, W, H):
    title = str(spec.get("title") or "")
    tf = _font(int(W * 0.058), bold=True)
    y = int(H * 0.16)
    _kicker(d, W, int(H * 0.12), "PROOF")
    for ln in _wrap(d, title, tf, int(W * 0.84)):
        d.text((int(W * 0.09), y), ln, font=tf, fill=INK)
        y += int(tf.size * 1.2)
    return y + int(H * 0.02)


def _draw_bar(d, spec, W, H):
    """Horizontal bars — a comparison (you vs benchmark). Winner in green."""
    top = _title_block(d, spec, W, H)
    bars = spec.get("bars") or []
    if not bars:
        raise ValueError("no bars")
    unit = str(spec.get("unit") or "")
    vals = [_num(b.get("value")) for b in bars]
    mx = max([abs(v) for v in vals] + [1.0])
    best = max(range(len(vals)), key=lambda i: vals[i]) if vals else -1
    x0 = int(W * 0.09)
    bar_w_max = int(W * 0.72)
    row_h = min(int(H * 0.14), int((H * 0.62) / max(1, len(bars))))
    lf = _font(int(W * 0.044), bold=True)
    vf = _font(int(W * 0.05), bold=True)
    y = top + int(H * 0.03)
    for i, b in enumerate(bars):
        label = str(b.get("label") or "")
        v = vals[i]
        d.text((x0, y), label, font=lf, fill=INK)
        yb = y + int(lf.size * 1.15)
        w = max(8, int(bar_w_max * (abs(v) / mx)))
        col = ACCENT if i == best else (90, 110, 100)
        d.rounded_rectangle([x0, yb, x0 + w, yb + int(row_h * 0.42)],
                            radius=int(row_h * 0.10), fill=col)
        vtxt = f"{v:g}{unit}"
        d.text((x0 + w + int(W * 0.02), yb - int(row_h * 0.02)), vtxt, font=vf, fill=col)
        y += row_h


def _draw_line(d, spec, W, H):
    """A line chart — the equity curve / trend. Fills under the line in accent."""
    top = _title_block(d, spec, W, H)
    series = [_num(v) for v in (spec.get("series") or [])]
    if len(series) < 2:
        raise ValueError("series too short")
    x0, x1 = int(W * 0.09), int(W * 0.91)
    y0, y1 = top + int(H * 0.06), int(H * 0.80)
    lo, hi = min(series), max(series)
    rng = (hi - lo) or 1.0
    n = len(series)
    def px(i): return x0 + (x1 - x0) * i / (n - 1)
    def py(v): return y1 - (y1 - y0) * (v - lo) / rng
    # gridlines
    for g in range(4):
        gy = y0 + (y1 - y0) * g / 3
        d.line([(x0, gy), (x1, gy)], fill=GRID, width=2)
    pts = [(px(i), py(v)) for i, v in enumerate(series)]
    # fill under curve
    d.polygon([(x0, y1)] + pts + [(x1, y1)], fill=(16, 40, 30))
    d.line(pts, fill=ACCENT, width=max(4, int(W * 0.008)), joint="curve")
    # endpoint dot + last value
    ex, ey = pts[-1]
    r = int(W * 0.014)
    d.ellipse([ex - r, ey - r, ex + r, ey + r], fill=ACCENT)
    ef = _font(int(W * 0.05), bold=True)
    last = series[-1]
    d.text((min(ex + int(W * 0.02), W - int(W * 0.22)), ey - int(ef.size)),
           f"{last:g}", font=ef, fill=ACCENT)
    note = str(spec.get("note") or "")
    if note:
        nf = _font(int(W * 0.038), bold=False)
        _center(d, note, nf, y1 + int(H * 0.03), W, MUTED)


def _draw_table(d, spec, W, H):
    """A mini ledger — the transparency move: the log, losses included."""
    top = _title_block(d, spec, W, H)
    rows = spec.get("rows") or []
    if not rows:
        raise ValueError("no rows")
    rows = rows[:8]
    x0, x1 = int(W * 0.09), int(W * 0.91)
    rf = _font(int(W * 0.05), bold=True)
    vf = _font(int(W * 0.05), bold=True)
    y = top + int(H * 0.03)
    row_h = min(int(H * 0.085), int((H * 0.66) / max(1, len(rows))))
    for r in rows:
        cells = list(r) if isinstance(r, (list, tuple)) else [str(r)]
        left = str(cells[0]) if cells else ""
        right = str(cells[1]) if len(cells) > 1 else ""
        d.text((x0, y), left, font=rf, fill=INK)
        is_loss = right.strip().startswith("-") or right.strip().startswith("−")
        col = ACCENT2 if is_loss else ACCENT
        rw = d.textlength(right, font=vf)
        d.text((x1 - rw, y), right, font=vf, fill=col)
        d.line([(x0, y + int(row_h * 0.82)), (x1, y + int(row_h * 0.82))], fill=GRID, width=2)
        y += row_h


def clean_spec(spec) -> dict | None:
    """Validate/normalise a data_spec from the choreographer. None if unusable."""
    if not isinstance(spec, dict):
        return None
    ct = spec.get("chart_type")
    if ct not in CHART_TYPES:
        return None
    if ct == "stat" and not str(spec.get("value") or "").strip():
        return None
    if ct == "bar" and not (spec.get("bars") and len(spec["bars"]) >= 2):
        return None
    if ct == "line" and not (spec.get("series") and len(spec["series"]) >= 2):
        return None
    if ct == "table" and not (spec.get("rows") and len(spec["rows"]) >= 2):
        return None
    return spec
