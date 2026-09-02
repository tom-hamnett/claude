"""The batch cascade: one brief → 1 blog → 5 articles → 10 social concepts.

Three Claude calls (blog, articles, social) keep cost bounded. Everything is stored
as ContentPieces under the batch. A social "reel" concept hands straight off to the
video engine we built; a "carousel" carries its slide text for later layout.
"""

import json
import logging
import threading
from pathlib import Path

logger = logging.getLogger(__name__)

N_ARTICLES = 5
N_SOCIAL = 10

# ── background runner (generation survives the phone closing the tab) ──
_BG: dict = {}
_BG_LOCK = threading.Lock()


def is_generating(batch_id: int) -> bool:
    with _BG_LOCK:
        return batch_id in _BG


def progress_of(batch_id: int):
    with _BG_LOCK:
        return (_BG.get(batch_id) or {}).get("progress")


def start_batch(batch_id: int) -> None:
    """Kick off the cascade on a daemon thread; no-op if already running."""
    if is_generating(batch_id):
        return

    def _prog(i, t, label):
        with _BG_LOCK:
            if batch_id in _BG:
                _BG[batch_id]["progress"] = (i, t, label)

    def _run():
        try:
            generate_batch(batch_id, on_progress=_prog)
        except Exception as e:
            logger.error("batch runner crashed for %d: %s", batch_id, e)
        finally:
            with _BG_LOCK:
                _BG.pop(batch_id, None)

    th = threading.Thread(target=_run, name=f"batch-{batch_id}", daemon=True)
    with _BG_LOCK:
        _BG[batch_id] = {"thread": th, "progress": (0, 3, "Starting…")}
    th.start()


def _extract_json(raw: str, array: bool = False):
    a, b = (raw.find("["), raw.rfind("]")) if array else (raw.find("{"), raw.rfind("}"))
    if a == -1 or b == -1:
        return [] if array else {}
    try:
        return json.loads(raw[a:b + 1])
    except Exception:
        return [] if array else {}


def _brand_voice() -> str:
    """A short brand-voice line for the prompts (from brand standards if present)."""
    try:
        from gtm_engine.config import DATA_DIR
        from gtm_engine.utils.file_io import load_json
        bp = DATA_DIR / "brand_standards.json"
        if bp.exists():
            bs = load_json(bp) or {}
            voice = bs.get("voice", {}) or {}
            tone = ", ".join(voice.get("tone_descriptors", [])[:6])
            forbidden = ", ".join(voice.get("forbidden_phrases", [])[:8])
            if tone or forbidden:
                return (f"Voice: {tone or 'sharp, transparent, anti-guru'}. "
                        + (f"Never use: {forbidden}." if forbidden else ""))
    except Exception:
        pass
    return ("Voice: sharp, transparent, anti-guru. Teach and demonstrate, never pitch. "
            "No hype words (game-changer, revolutionary, unlock).")


def _data_text(data_source_id) -> str:
    """The interpreted reference material for a batch — could be numbers, a CV, a
    deck, a PDF, a described image/video, or a fetched link. Ground the content in it."""
    if not data_source_id:
        return ""
    try:
        from gtm_engine.data_vault import DataVault
        src = DataVault().get(data_source_id)
        if src and (src.content or "").strip():
            kind = "REAL DATA (use these exact numbers, never invent)" if src.source_type == "dataset" \
                else "REFERENCE MATERIAL the user provided (draw the facts, story and substance from it)"
            return f"\n{kind}:\n{src.content[:6000]}\n"
    except Exception:
        pass
    return ""


def _brief_block(batch) -> str:
    from gtm_engine.content_studio import CONTENT_TYPE_BY_ID
    from gtm_engine.content_studio.templates import get_structure
    types = ", ".join(CONTENT_TYPE_BY_ID[t]["label"] for t in batch.content_types
                      if t in CONTENT_TYPE_BY_ID) or "general"
    block = (
        f"TOPIC: {batch.title}\n"
        f"CONTENT TYPE(S): {types}\n"
        f"BACKGROUND (use this — it's the substance):\n{batch.background or '(none given)'}\n"
        f"{_data_text(batch.data_source_id)}"
        f"\nBLOG STRUCTURE TO FOLLOW:\n{get_structure(batch.template_id)}\n"
    )
    if (batch.examples or "").strip():
        block += ("\nEMULATE THIS EXAMPLE for structure, rhythm and tone (do not copy its "
                  f"content, copy its STYLE):\n\"\"\"\n{batch.examples[:2000]}\n\"\"\"\n")
    return block


def generate_batch(batch_id: int, on_progress=None) -> dict:
    """Run the full cascade for a batch. Returns {ok, blog, n_articles, n_social, error}."""
    from gtm_engine.content_studio import ContentStudioStore, ContentPiece, CONTENT_TYPE_BY_ID
    from gtm_engine.utils.ai_client import call_claude

    store = ContentStudioStore()
    batch = store.get_batch(batch_id)
    if not batch:
        return {"ok": False, "error": "batch not found"}
    batch.status = "generating"; batch.error = ""; store.save_batch(batch)

    def prog(i, t, label):
        if on_progress:
            on_progress(i, t, label)

    # 0 · Interpret ANY uploaded files / links (CV, PDF, deck, image, video, URL) into
    # reference text — done here in the thread so slow multimodal reads never block the UI.
    try:
        from gtm_engine.utils.ingest import ingest_references, interpret_upload, interpret_url
        if (batch.ref_files or batch.ref_links) and not batch.data_source_id:
            prog(0, 3, "Reading your uploads & links")
            sid, _notes = ingest_references(
                files=[(p, Path(p).name) for p in batch.ref_files],
                links=batch.ref_links, name=f"Refs — {batch.title[:40]}")
            if sid:
                batch.data_source_id = sid; store.save_batch(batch)
        if batch.example_files or batch.example_links:
            ex_bits = [batch.examples] if batch.examples else []
            for p in batch.example_files:
                t, _ = interpret_upload(p, Path(p).name)
                if t:
                    ex_bits.append(f"[example — {Path(p).name}]\n{t[:2500]}")
            for u in batch.example_links:
                t = interpret_url(u)
                if t:
                    ex_bits.append(f"[example — {u}]\n{t[:2500]}")
            if ex_bits:
                batch.examples = "\n\n".join(ex_bits)[:8000]; store.save_batch(batch)
    except Exception as e:
        logger.info("intake interpretation note: %s", e)

    voice = _brand_voice()
    brief = _brief_block(batch)
    # default reel mode from the first content type
    modes = [CONTENT_TYPE_BY_ID[t]["reel_mode"] for t in batch.content_types
             if t in CONTENT_TYPE_BY_ID]
    default_mode = modes[0] if modes else "insight"

    try:
        # 1 · BLOG (the pillar)
        prog(1, 3, "Writing the long-form blog")
        blog_sys = ("You are an elite founder-brand writer. Write ONE long-form blog (900–1300 "
                    "words) that TEACHES and DEMONSTRATES — proof over promises, one idea, a soft "
                    "close. " + voice + " Return ONLY JSON: "
                    '{"title":"...","subtitle":"...","body":"...(markdown, the full blog)...",'
                    '"outline":["section 1","section 2",...]}')
        blog = _extract_json(call_claude(brief + "\nReturn ONLY the JSON.", system=blog_sys,
                                         max_tokens=4000))
        if not blog.get("body"):
            raise RuntimeError("blog generation returned nothing")
        blog_piece = ContentPiece(
            batch_id=batch_id, kind="blog", channel="blog", format="long_form",
            title=blog.get("title", batch.title), body=blog.get("body", ""),
            outline=blog.get("outline", []) or [], status="ready",
            meta={"subtitle": blog.get("subtitle", "")})
        blog_pid = store.add_piece(blog_piece)

        # 2 · ARTICLES (atomise into channel reframes)
        prog(2, 3, f"Reframing into {N_ARTICLES} articles")
        art_sys = (f"You are a content atomiser. From the blog below, write {N_ARTICLES} ARTICLES, "
                   "each REFRAMED for a specific channel — never paste the same text. Channels to "
                   "cover: LinkedIn post, LinkedIn article, Reddit post (community-first, zero "
                   "pitch), a niche forum post, an X/Twitter thread. " + voice + " Return ONLY a "
                   'JSON array of exactly ' + str(N_ARTICLES) + ' objects: '
                   '[{"channel":"linkedin_post|linkedin_article|reddit_post|forum_post|x_thread",'
                   '"title":"...","body":"...(the full post, formatted for that channel)..."}]')
        articles = _extract_json(
            call_claude(f"BLOG:\n{blog.get('body','')[:6000]}\n\nReturn ONLY the JSON array.",
                        system=art_sys, max_tokens=4000), array=True)
        n_art = 0
        for a in (articles or [])[:N_ARTICLES]:
            if not isinstance(a, dict) or not a.get("body"):
                continue
            store.add_piece(ContentPiece(
                batch_id=batch_id, kind="article", channel=a.get("channel", "linkedin_post"),
                format="article", title=a.get("title", ""), body=a.get("body", ""),
                parent_id=blog_pid, status="draft"))
            n_art += 1

        # 3 · SOCIAL concepts (reels + carousels)
        prog(3, 3, f"Generating {N_SOCIAL} social concepts")
        soc_sys = (f"You are a short-form social strategist. From the blog, produce {N_SOCIAL} "
                   "SOCIAL CONCEPTS — a mix of REELS (short video, hook + spoken angle) and "
                   "CAROUSELS (a titled sequence of 5–7 slides). Each must be a distinct atom of "
                   "the blog (a stat, a step, a myth, a quote, a proof point). " + voice + " Return "
                   'ONLY a JSON array of ' + str(N_SOCIAL) + ' objects: '
                   '[{"format":"reel|carousel","hook":"scroll-stopping first line (≤12 words)",'
                   '"angle":"what it says / for a reel a 2-3 sentence spoken seed; for a carousel a '
                   '| -separated list of slide lines","content_mode":"insight|story|explainer"}]')
        social = _extract_json(
            call_claude(f"BLOG:\n{blog.get('body','')[:6000]}\n\nReturn ONLY the JSON array.",
                        system=soc_sys, max_tokens=3500), array=True)
        n_soc = 0
        for s in (social or [])[:N_SOCIAL]:
            if not isinstance(s, dict) or not (s.get("hook") or s.get("angle")):
                continue
            fmt = s.get("format") if s.get("format") in ("reel", "carousel") else "reel"
            store.add_piece(ContentPiece(
                batch_id=batch_id, kind="social", channel="social", format=fmt,
                title=(s.get("hook") or "")[:80], caption=s.get("hook", ""),
                body=s.get("angle", ""), content_mode=(s.get("content_mode") or default_mode),
                parent_id=blog_pid, status="draft"))
            n_soc += 1

        batch.status = "generated"; store.save_batch(batch)
        try:
            from gtm_engine.persistence import backup_quietly
            backup_quietly()
        except Exception:
            pass
        return {"ok": True, "blog": blog.get("title", ""), "n_articles": n_art, "n_social": n_soc}
    except Exception as e:
        logger.error("batch %d generation failed: %s", batch_id, e)
        batch.status = "failed"; batch.error = str(e)[:300]; store.save_batch(batch)
        return {"ok": False, "error": str(e)[:300]}


def make_reel_from_piece(piece_id: int):
    """Turn a social 'reel' concept into a real video job via the existing engine.
    Creates an approved Idea, writes the producer brief, creates the video job.
    Returns the VideoJob (or None). The reel is then produced in the CREATE board."""
    from gtm_engine.content_studio import ContentStudioStore
    from gtm_engine.ideas import Idea, IdeaBank
    store = ContentStudioStore()
    p = store.get_piece(piece_id)
    if not p:
        return None
    batch = store.get_batch(p.batch_id)
    idea = Idea(
        title=(p.title or p.caption or "Reel")[:120],
        hook=p.caption or (p.body or "")[:80],
        angle=(p.body or "")[:400] or (p.caption or ""),
        funnel_level="product",
        segment_type="standalone",
        content_mode=p.content_mode or "insight",
        data_source_id=(batch.data_source_id if batch else None),
        status="idea_approved",
        strategic_objective="awareness",
        tags=["studio", "reel"],
        notes=f"[From content batch #{p.batch_id}, piece #{p.id}]",
    )
    iid = IdeaBank().create(idea)
    try:
        from gtm_engine.producer import generate_producer_brief
        from gtm_engine.video import create_job_from_brief
        generate_producer_brief(iid)
        job = create_job_from_brief(iid)
    except Exception as e:
        logger.error("reel handoff failed for piece %d: %s", piece_id, e)
        job = None
    p.idea_id = iid
    if job:
        p.video_job_id = job.id
        p.status = "ready"
    store.save_piece(p)
    return job
