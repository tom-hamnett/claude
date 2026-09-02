"""Publish Helper — the frictionless hand-off to each channel.

No platform here has a reliable posting API for a solo publisher (Substack has
none at all), so instead of pretending, we make the copy-and-paste take ~15
seconds and come out correctly formatted every time:
  • format the piece for the target channel (Substack markdown, an X thread split
    into ≤280-char tweets, LinkedIn plain text with breathing room, Reddit markdown)
  • open that channel's composer (prefilling the first tweet / the Reddit title
    where the platform allows it)

Public:
  channels_for(piece) -> [channel ids]
  format_for(piece, channel) -> str          (the text to paste)
  composer(piece, channel) -> (label, url)   (button to open the channel)
"""

import re
from urllib.parse import quote

CHANNELS = {
    "substack": "Substack",
    "linkedin": "LinkedIn",
    "x": "X / Twitter",
    "reddit": "Reddit",
}
X_LIMIT = 275


def channels_for(piece) -> list[str]:
    """Which channels make sense for this piece, most-native first."""
    if piece.kind == "blog":
        return ["substack", "linkedin", "x", "reddit"]
    if piece.kind == "article":
        native = {"linkedin_post": "linkedin", "linkedin_article": "linkedin",
                  "reddit_post": "reddit", "x_thread": "x", "forum_post": "reddit"}.get(piece.channel)
        order = ([native] if native else []) + ["substack", "linkedin", "x", "reddit"]
        seen, out = set(), []
        for c in order:
            if c not in seen:
                seen.add(c); out.append(c)
        return out
    # social (reel / carousel): a caption to accompany the media
    return ["linkedin", "x", "substack", "reddit"]


def _plain(md: str) -> str:
    """Markdown → plain text (LinkedIn/X strip markdown)."""
    t = md or ""
    t = re.sub(r"^#{1,6}\s*", "", t, flags=re.M)          # headers
    t = re.sub(r"\*\*(.+?)\*\*", r"\1", t)                # bold
    t = re.sub(r"(?<!\*)\*(?!\*)(.+?)\*", r"\1", t)       # italic
    t = re.sub(r"`(.+?)`", r"\1", t)                      # inline code
    t = re.sub(r"\[(.+?)\]\((.+?)\)", r"\1 (\2)", t)      # links → text (url)
    t = re.sub(r"^\s*[-*]\s+", "• ", t, flags=re.M)       # bullets
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def _strip_leading_title(body: str, title: str) -> str:
    """Drop a leading H1 / repeated title line so we control the title once."""
    b = (body or "").lstrip()
    lines = b.split("\n")
    if not lines:
        return b
    first = lines[0].strip()
    bare = re.sub(r"^#{1,6}\s*", "", first).strip()
    if first.startswith("#") or (title and bare.lower() == title.strip().lower()):
        return "\n".join(lines[1:]).lstrip()
    return b


def _body_of(piece) -> str:
    if piece.kind == "social":
        # a reel/carousel posts as media + a caption
        return (piece.caption or piece.body or piece.title or "").strip()
    return _strip_leading_title(piece.body or "", piece.title or "")


def _x_thread(title: str, body: str, piece) -> str:
    text = _plain(body)
    chunks, cur = [], ""
    for sent in re.split(r"(?<=[.!?])\s+", text):
        if not sent:
            continue
        if len(cur) + len(sent) + 1 <= X_LIMIT:
            cur = (cur + " " + sent).strip()
        else:
            if cur:
                chunks.append(cur)
            cur = sent[:X_LIMIT]
    if cur:
        chunks.append(cur)
    hook = (piece.caption or title or "").strip()
    tweets = ([hook[:X_LIMIT]] if hook and piece.kind == "blog" else []) + chunks
    tweets = [t for t in tweets if t]
    if len(tweets) <= 1:
        return tweets[0] if tweets else ""
    n = len(tweets)
    return "\n\n".join(f"{i}/{n}  {t}" for i, t in enumerate(tweets, 1))


def format_for(piece, channel: str) -> str:
    """The text to paste into `channel`, formatted for it."""
    title = (piece.title or piece.caption or "").strip()
    body = _body_of(piece)
    if channel == "substack":
        head = f"# {title}\n\n" if (piece.kind == "blog" and title) else ""
        return (head + body).strip()
    if channel == "reddit":
        return (f"{title}\n\n{_plain(body)}").strip() if title else _plain(body)
    if channel == "linkedin":
        parts = [title] if title and piece.kind == "blog" else []
        parts.append(_plain(body))
        note = "\n\n[Attach your rendered video]" if (piece.kind == "social" and piece.format == "reel") \
            else ("\n\n[Attach your carousel slide images]" if piece.kind == "social" else "")
        return ("\n\n".join(p for p in parts if p) + note).strip()
    if channel == "x":
        return _x_thread(title, body, piece)
    return body


def composer(piece, channel: str) -> tuple[str, str]:
    """(button label, URL) to open the channel's composer, prefilled where possible."""
    if channel == "x":
        first = format_for(piece, "x").split("\n\n")[0][:X_LIMIT]
        return ("↗ Open X", "https://twitter.com/intent/tweet?text=" + quote(first))
    if channel == "reddit":
        title = (piece.title or piece.caption or "")[:290]
        return ("↗ Open Reddit", "https://www.reddit.com/submit?title=" + quote(title))
    if channel == "substack":
        return ("↗ Open Substack", "https://substack.com/publish/post")
    if channel == "linkedin":
        return ("↗ Open LinkedIn", "https://www.linkedin.com/feed/")
    return ("↗ Open", "https://example.com")
