"""Text sanitiser — kill the 'tofu' boxes.

Characters a video/caption font can't render show up as boxes (□ / ☒ / the U+FFFD
replacement char). They come from emoji, star/symbol glyphs, and files read with the
wrong encoding. This strips those and normalises fancy punctuation to safe equivalents,
while KEEPING real currency and percent signs (£ $ € %). Run it on any text that will
end up in a HeyGen prompt, on-screen caption, or an ingested source.
"""

import re
import unicodedata

# Fancy punctuation → safe ASCII (arrows/dashes/quotes/ellipsis that often tofu).
_MAP = {
    "‘": "'", "’": "'", "‚": "'", "‛": "'",
    "“": '"', "”": '"', "„": '"',
    "–": "-", "—": "-", "‒": "-", "‑": "-", "―": "-",
    "…": "...", " ": " ", " ": " ", " ": " ",
    "•": "-", "‣": "-", "●": "-", "▪": "-",
    "→": " to ", "➔": " to ", "➡": " to ", "⮕": " to ",
    "�": "",   # the replacement char (bad-encoding tofu)
}
_KEEP_SYMBOLS = set("£$€%#&+=@°")   # symbols we deliberately keep


def clean_text(s: str) -> str:
    """Return `s` with tofu-prone characters removed and fancy punctuation normalised.
    Keeps letters, numbers, ordinary punctuation, whitespace and £ $ € % # & + = @ °."""
    if not s:
        return s
    for k, v in _MAP.items():
        s = s.replace(k, v)
    out = []
    for ch in s:
        if ch in _KEEP_SYMBOLS or ch in "\n\t":
            out.append(ch)
            continue
        cat = unicodedata.category(ch)
        # Letters (L*), numbers (N*), punctuation (P*), separators (Z*), combining marks (Mn)
        if cat[0] in ("L", "N", "P", "Z") or cat == "Mn":
            out.append(ch)
        # everything else — symbols (S*, incl. emoji/stars/arrows), control/format (C*) — dropped
    s = "".join(out)
    s = re.sub(r"[ \t]{2,}", " ", s)          # collapse runs of spaces
    s = re.sub(r"\n{3,}", "\n\n", s)          # collapse blank-line runs
    return s.strip()
