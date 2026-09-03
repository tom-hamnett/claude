"""Tests for the HeyGen Prompt-to-Video (Video Agent) path — prompt building,
the provider's submit/poll/download, and the piece output attachment."""

import json
from pathlib import Path

import pytest


@pytest.fixture
def db(tmp_path, monkeypatch):
    p = tmp_path / "ptv.db"
    monkeypatch.setattr("gtm_engine.config.SQLITE_PATH", p)
    return p


def test_build_agent_prompt_embeds_brand_and_script_and_forbids_invention():
    from gtm_engine.video.prompt_to_video import build_agent_prompt
    out = build_agent_prompt(
        concept="The complexity tax", script="Revenue's up. EBITDA's flat. See it run.",
        mode="insight", data_text="Q1: 34 initiatives, 11% margin", voice="No hype.")
    assert "9:16" in out and "#20C878" in out            # format + brand palette
    assert "EBITDA's flat" in out                        # the script is carried verbatim
    assert "never invent" in out.lower()                 # the anti-fabrication guardrail
    assert "34 initiatives" in out                       # reference figures included


def test_compose_prompt_writes_script_and_scenes_for_review(db, monkeypatch):
    """compose_agent_prompt asks Claude for script+scenes, assembles a reviewable prompt,
    and stores it on the piece so the render sends exactly what was reviewed."""
    from gtm_engine.content_studio import ContentStudioStore, ContentBatch, ContentPiece
    import gtm_engine.utils.ai_client as aic
    monkeypatch.setattr(aic, "call_claude", lambda *a, **k: json.dumps({
        "script": ["Everyone's busy.", "EBITDA's flat.", "See it run."],
        "scenes": [{"beat": "Hook", "say": "Everyone's busy.", "on_screen": "presenter only"},
                   {"beat": "Proof", "say": "EBITDA's flat.",
                    "on_screen": "animated bar of EBITDA holding at 0%"}]}))
    store = ContentStudioStore()
    bid = store.create_batch(ContentBatch(title="B", content_types=["insight"]))
    pid = store.add_piece(ContentPiece(batch_id=bid, kind="social", format="reel",
                                       caption="The complexity tax", content_mode="insight"))
    from gtm_engine.video.prompt_to_video import compose_agent_prompt, agent_prompt_for_piece
    out = compose_agent_prompt(pid)
    assert "SCRIPT" in out and "SCENE BREAKDOWN" in out
    assert "EBITDA's flat." in out and "animated bar of EBITDA" in out
    assert "never invent" in out.lower() and "9:16" in out
    # stored, so a later fetch returns the SAME reviewed text (no rebuild)
    p = store.get_piece(pid)
    assert p.meta["agent_prompt"] == out
    assert agent_prompt_for_piece(pid) == out


def test_edited_prompt_is_what_gets_sent(db, monkeypatch):
    """save_agent_prompt persists an edit; render_for_piece sends the given prompt verbatim."""
    from gtm_engine.content_studio import ContentStudioStore, ContentBatch, ContentPiece
    store = ContentStudioStore()
    bid = store.create_batch(ContentBatch(title="B", content_types=["insight"]))
    pid = store.add_piece(ContentPiece(batch_id=bid, kind="social", format="reel"))
    from gtm_engine.video import prompt_to_video as ptv
    ptv.save_agent_prompt(pid, "MY EDITED PROMPT")
    assert store.get_piece(pid).meta["agent_prompt"] == "MY EDITED PROMPT"

    sent = {}
    class _Prov:
        def is_configured(self): return True
        def render_video_agent(self, prompt, out, **k):
            sent["prompt"] = prompt
            Path(out).write_bytes(b"MP4"); return Path(out)
        last_error = ""
    monkeypatch.setattr("gtm_engine.avatar.get_provider", lambda *_: _Prov())
    import gtm_engine.config as cfg
    cfg.OUTPUT_DIR = db.parent / "out"
    ptv.render_for_piece(pid, prompt="EXACT REVIEWED TEXT")
    assert sent["prompt"] == "EXACT REVIEWED TEXT"       # not a rebuild


def _stub_httpx(monkeypatch, *, agent_post, session_get, status_get, download=b"MP4DATA"):
    """Wire httpx.post/get used by HeyGenProvider to canned responses."""
    import gtm_engine.avatar as av

    class _Resp:
        def __init__(self, code=200, payload=None, content=b""):
            self.status_code = code
            self._payload = payload or {}
            self.content = content
            self.text = json.dumps(self._payload)
        def json(self):
            return self._payload
        def raise_for_status(self):
            pass

    def fake_post(url, **k):
        if url.endswith("/video-agents"):
            return _Resp(200, agent_post)
        return _Resp(404, {})

    def fake_get(url, **k):
        if "/video-agents/" in url:
            return _Resp(200, session_get)
        if "video_status.get" in url:
            return _Resp(200, status_get)
        return _Resp(200, {}, content=download)   # the download GET

    monkeypatch.setattr(av.time, "sleep", lambda *_: None)   # no real waiting
    import httpx
    monkeypatch.setattr(httpx, "post", fake_post)
    monkeypatch.setattr(httpx, "get", fake_get)


def test_render_video_agent_submits_polls_and_downloads(tmp_path, monkeypatch):
    monkeypatch.setenv("HEYGEN_API_KEY", "sk-test")
    from gtm_engine.avatar import HeyGenProvider
    _stub_httpx(
        monkeypatch,
        agent_post={"data": {"session_id": "sess_1", "video_id": None, "status": "generating"}},
        session_get={"data": {"video_id": "vid_1", "status": "generating"}},
        status_get={"data": {"status": "completed", "video_url": "https://x/v.mp4"}},
    )
    out = tmp_path / "out.mp4"
    res = HeyGenProvider().render_video_agent("a prompt", out, avatar_id="tp:analyst",
                                              voice_id="v1")
    assert res == out and out.read_bytes() == b"MP4DATA"


def test_render_video_agent_reports_failure(tmp_path, monkeypatch):
    monkeypatch.setenv("HEYGEN_API_KEY", "sk-test")
    from gtm_engine.avatar import HeyGenProvider
    _stub_httpx(
        monkeypatch,
        agent_post={"data": {"session_id": "sess_1"}},
        session_get={"data": {"status": "failed", "error": "no credits"}},
        status_get={},
    )
    prov = HeyGenProvider()
    res = prov.render_video_agent("p", tmp_path / "o.mp4")
    assert res is None and "failed" in prov.last_error.lower()


def test_resolve_cast_pins_casting_character(db, monkeypatch):
    """resolve_cast reads the casting default character (where 'The Analyst' lives), so
    a render pins your presenter/voice instead of letting HeyGen auto-pick."""
    from gtm_engine.casting import CastingStore, Character
    cs = CastingStore()
    cs.save_character(Character(name="The Analyst", avatar_id="av_analyst",
                               avatar_name="The Analyst", voice_id="vo_analyst",
                               voice_name="The Analyst - Voice"))
    monkeypatch.setenv("HEYGEN_STYLE_ID", "style_boardroom")
    from gtm_engine.video.prompt_to_video import resolve_cast
    cast = resolve_cast()
    assert cast["avatar_id"] == "av_analyst" and cast["avatar_name"] == "The Analyst"
    assert cast["voice_id"] == "vo_analyst" and cast["style_id"] == "style_boardroom"


def test_render_pins_resolved_cast(db, monkeypatch, tmp_path):
    """render_for_piece passes the resolved avatar/voice/style to the provider."""
    from gtm_engine.casting import CastingStore, Character
    CastingStore().save_character(Character(name="The Analyst", avatar_id="av1",
                                            voice_id="vo1"))
    from gtm_engine.content_studio import ContentStudioStore, ContentBatch, ContentPiece
    store = ContentStudioStore()
    bid = store.create_batch(ContentBatch(title="B", content_types=["insight"]))
    pid = store.add_piece(ContentPiece(batch_id=bid, kind="social", format="reel"))
    import gtm_engine.config as cfg
    cfg.OUTPUT_DIR = tmp_path / "out"
    from gtm_engine.video import prompt_to_video as ptv
    ptv.save_agent_prompt(pid, "PROMPT")
    seen = {}
    class _Prov:
        def is_configured(self): return True
        def render_video_agent(self, prompt, out, **k):
            seen.update(k); Path(out).write_bytes(b"MP4"); return Path(out)
        last_error = ""
    monkeypatch.setattr("gtm_engine.avatar.get_provider", lambda *_: _Prov())
    ptv.render_for_piece(pid)
    assert seen["avatar_id"] == "av1" and seen["voice_id"] == "vo1"


def test_attach_uploaded_video_marks_ready(db, tmp_path):
    from gtm_engine.content_studio import ContentStudioStore, ContentBatch, ContentPiece
    import gtm_engine.config as cfg
    cfg.OUTPUT_DIR = tmp_path / "out"
    store = ContentStudioStore()
    bid = store.create_batch(ContentBatch(title="B", content_types=["insight"]))
    pid = store.add_piece(ContentPiece(batch_id=bid, kind="social", format="reel"))
    src = tmp_path / "mine.mp4"; src.write_bytes(b"VIDEO")
    from gtm_engine.video.prompt_to_video import attach_uploaded_video
    out = attach_uploaded_video(pid, src)
    assert out and out.read_bytes() == b"VIDEO"
    p = store.get_piece(pid)
    assert p.status == "ready" and p.meta["video_source"] == "heygen_app"
