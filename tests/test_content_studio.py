"""Tests for the Content Studio: batch store, the cascade, and the reel handoff."""

import json
import pytest


@pytest.fixture
def db(tmp_path, monkeypatch):
    p = tmp_path / "studio.db"
    monkeypatch.setattr("gtm_engine.config.SQLITE_PATH", p)
    monkeypatch.setattr("gtm_engine.producer.SQLITE_PATH", p, raising=False)
    return p


def test_store_roundtrip_and_counts(db):
    from gtm_engine.content_studio import ContentStudioStore, ContentBatch, ContentPiece
    store = ContentStudioStore()
    bid = store.create_batch(ContentBatch(title="X", content_types=["contrarian", "data"]))
    assert store.get_batch(bid).content_types == ["contrarian", "data"]
    store.add_piece(ContentPiece(batch_id=bid, kind="blog", format="long_form", title="B"))
    store.add_piece(ContentPiece(batch_id=bid, kind="article", channel="reddit_post"))
    store.add_piece(ContentPiece(batch_id=bid, kind="social", format="reel", caption="Hook"))
    assert store.counts_by_type()["contrarian"] == 1
    assert store.piece_counts() == {"blog": 1, "article": 1, "social": 1}
    assert len(store.list_pieces(bid, kind="social")) == 1


def _fake_claude_factory():
    def fake(prompt, system="", **k):
        if "long-form blog" in system:
            return json.dumps({"title": "The Blog", "subtitle": "s",
                               "body": "# Blog\n\n" + "Real body text. " * 60,
                               "outline": ["Hook", "Proof", "Takeaway"]})
        if "atomiser" in system:
            return json.dumps([{"channel": c, "title": f"A-{c}", "body": "post body " * 25}
                               for c in ["linkedin_post", "linkedin_article", "reddit_post",
                                         "forum_post", "x_thread"]])
        if "social strategist" in system:
            return json.dumps([{"format": "reel" if i % 2 else "carousel",
                                "hook": f"Hook {i}", "angle": "a | b | c",
                                "content_mode": "insight"} for i in range(10)])
        return "{}"
    return fake


def test_generate_batch_cascade(db, monkeypatch):
    from gtm_engine.content_studio import ContentStudioStore, ContentBatch
    import gtm_engine.utils.ai_client as aic
    monkeypatch.setattr(aic, "call_claude", _fake_claude_factory())
    store = ContentStudioStore()
    bid = store.create_batch(ContentBatch(title="Track records lie", content_types=["contrarian"],
                                          background="ATLAS logs every trade"))
    from gtm_engine.content_studio.generator import generate_batch
    res = generate_batch(bid)
    assert res["ok"] and res["n_articles"] == 5 and res["n_social"] == 10
    assert store.get_batch(bid).status == "generated"
    pieces = store.list_pieces(bid)
    kinds = [p.kind for p in pieces]
    assert kinds.count("blog") == 1 and kinds.count("article") == 5 and kinds.count("social") == 10
    # a social reel carries a content_mode for the video engine
    reels = [p for p in pieces if p.kind == "social" and p.format == "reel"]
    assert reels and all(p.content_mode for p in reels)


def test_generate_batch_marks_failed_on_empty_blog(db, monkeypatch):
    from gtm_engine.content_studio import ContentStudioStore, ContentBatch
    import gtm_engine.utils.ai_client as aic
    monkeypatch.setattr(aic, "call_claude", lambda *a, **k: "{}")   # blog returns nothing
    store = ContentStudioStore()
    bid = store.create_batch(ContentBatch(title="x", content_types=["insight"]))
    from gtm_engine.content_studio.generator import generate_batch
    res = generate_batch(bid)
    assert res["ok"] is False
    assert store.get_batch(bid).status == "failed"


def test_make_reel_from_piece_hands_off_to_video_engine(db, monkeypatch):
    from gtm_engine.content_studio import ContentStudioStore, ContentBatch, ContentPiece
    store = ContentStudioStore()
    bid = store.create_batch(ContentBatch(title="B", content_types=["insight"]))
    pid = store.add_piece(ContentPiece(batch_id=bid, kind="social", format="reel",
                                       caption="Nobody logs their losses", body="the angle",
                                       content_mode="insight"))
    # stub the video-engine seam
    import gtm_engine.content_studio.generator as gen
    created = {}
    class _Job:  # minimal stand-in
        id = 77
    def fake_brief(idea_id):
        created["brief"] = idea_id
    def fake_job(idea_id):
        created["job"] = idea_id
        return _Job()
    monkeypatch.setattr("gtm_engine.producer.generate_producer_brief", fake_brief)
    monkeypatch.setattr("gtm_engine.video.create_job_from_brief", fake_job)
    job = gen.make_reel_from_piece(pid)
    assert job is not None and job.id == 77
    p = store.get_piece(pid)
    assert p.idea_id is not None and p.video_job_id == 77 and p.status == "ready"
    # the created idea inherited the content mode
    from gtm_engine.ideas import IdeaBank
    idea = IdeaBank().get(p.idea_id)
    assert idea.content_mode == "insight" and "studio" in idea.tags


def test_batch_stores_raw_intake_inputs(db):
    from gtm_engine.content_studio import ContentStudioStore, ContentBatch
    store = ContentStudioStore()
    bid = store.create_batch(ContentBatch(
        title="X", content_types=["origin"],
        ref_files=["/tmp/cv.pdf"], ref_links=["https://example.com"],
        example_files=["/tmp/post.pdf"], example_links=["https://ex.com/blog"]))
    got = store.get_batch(bid)
    assert got.ref_files == ["/tmp/cv.pdf"] and got.ref_links == ["https://example.com"]
    assert got.example_files == ["/tmp/post.pdf"] and got.example_links == ["https://ex.com/blog"]


def test_ingest_text_formats_and_combine(db, tmp_path):
    from gtm_engine.utils.ingest import interpret_upload, ingest_references
    md = tmp_path / "cv.md"; md.write_text("# CV\nFounder. Built ATLAS.")
    csv = tmp_path / "log.csv"; csv.write_text("week,pnl\n1,2.3\n2,-1.1\n")
    t1, s1 = interpret_upload(str(md)); assert s1 == "document" and "CV" in t1
    t2, s2 = interpret_upload(str(csv)); assert s2 == "dataset" and "week" in t2
    sid, notes = ingest_references(files=[(str(md), "cv.md"), (str(csv), "log.csv")],
                                   links=[], name="Refs")
    from gtm_engine.data_vault import DataVault
    assert sid and "CV" in DataVault().get(sid).content and "week" in DataVault().get(sid).content
    assert all(n.startswith("✓") for n in notes)


def test_generate_reads_uploads_before_writing(db, tmp_path, monkeypatch):
    """A batch with ref_files gets them interpreted into a data source during generation."""
    from gtm_engine.content_studio import ContentStudioStore, ContentBatch
    import gtm_engine.utils.ai_client as aic
    monkeypatch.setattr(aic, "call_claude", _fake_claude_factory())
    ref = tmp_path / "background.md"
    ref.write_text("Origin: I stopped trusting edited track records. Built ATLAS to log everything.")
    store = ContentStudioStore()
    bid = store.create_batch(ContentBatch(title="Origin", content_types=["origin"],
                                          ref_files=[str(ref)]))
    from gtm_engine.content_studio.generator import generate_batch
    res = generate_batch(bid)
    assert res["ok"]
    b = store.get_batch(bid)
    assert b.data_source_id is not None       # the upload was interpreted into a reference source
    from gtm_engine.data_vault import DataVault
    assert "ATLAS" in DataVault().get(b.data_source_id).content


def test_carousel_render_and_queue(db, tmp_path):
    from gtm_engine.content_studio.carousel import render_carousel
    slides = [
        {"type": "cover", "title": "Nobody logs their losses", "body": "So why trust the record?"},
        {"type": "insight", "title": "Curated curves lie", "body": "Drawdowns are what break accounts."},
        {"type": "data", "value": "-11.4%", "label": "Max drawdown", "body": "Logged, not hidden."},
        {"type": "cta", "title": "See the whole log", "body": "quantumtools.ai"},
    ]
    paths = render_carousel(slides, tmp_path / "car", "slide")
    from PIL import Image
    assert len(paths) == 4
    for p in paths:
        assert Image.open(p).size == (1080, 1080)


def test_make_carousel_from_piece(db, monkeypatch, tmp_path):
    import gtm_engine.config as cfg
    monkeypatch.setattr(cfg, "OUTPUT_DIR", tmp_path / "out")
    from gtm_engine.content_studio import ContentStudioStore, ContentBatch, ContentPiece
    import gtm_engine.utils.ai_client as aic

    def fake(prompt, system="", **k):
        if "SQUARE carousels" in system:
            return json.dumps({"slides": [
                {"type": "cover", "title": "Hook here", "body": "sub"},
                {"type": "insight", "title": "A point", "body": "some body text"},
                {"type": "data", "value": "34%", "label": "Return"},
                {"type": "cta", "title": "See it run", "body": "quantumtools.ai"}]})
        return "{}"
    monkeypatch.setattr(aic, "call_claude", fake)
    store = ContentStudioStore()
    bid = store.create_batch(ContentBatch(title="B", content_types=["insight"]))
    store.add_piece(ContentPiece(batch_id=bid, kind="blog", body="the blog body"))
    pid = store.add_piece(ContentPiece(batch_id=bid, kind="social", format="carousel",
                                       caption="hook", body="angle"))
    from gtm_engine.content_studio.carousel import make_carousel_from_piece
    paths = make_carousel_from_piece(pid)
    assert len(paths) == 4
    p = store.get_piece(pid)
    assert p.meta.get("slides") and p.status == "ready"


def test_queue_listing(db):
    from gtm_engine.content_studio import ContentStudioStore, ContentBatch, ContentPiece
    store = ContentStudioStore()
    bid = store.create_batch(ContentBatch(title="B", content_types=["insight"]))
    p1 = store.add_piece(ContentPiece(batch_id=bid, kind="blog", title="Blog", status="scheduled"))
    store.add_piece(ContentPiece(batch_id=bid, kind="article", status="draft"))
    q = store.list_queued()
    assert len(q) == 1 and q[0].id == p1
