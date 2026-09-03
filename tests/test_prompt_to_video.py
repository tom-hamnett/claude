"""Tests for the HeyGen Prompt-to-Video (Video Agent) path — prompt building,
the provider's submit/poll/download, and the piece output attachment."""

import json
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


def test_agent_prompt_for_piece_uses_piece_and_voice(db, monkeypatch):
    from gtm_engine.content_studio import ContentStudioStore, ContentBatch, ContentPiece
    store = ContentStudioStore()
    bid = store.create_batch(ContentBatch(title="B", content_types=["insight"]))
    pid = store.add_piece(ContentPiece(batch_id=bid, kind="social", format="reel",
                                       caption="Nobody logs their losses", content_mode="insight",
                                       meta={"script": "Watch activity against outcome."}))
    from gtm_engine.video.prompt_to_video import agent_prompt_for_piece
    out = agent_prompt_for_piece(pid)
    assert "Watch activity against outcome." in out and "9:16" in out


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
