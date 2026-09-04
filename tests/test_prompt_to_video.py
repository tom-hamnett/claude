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


def test_build_agent_prompt_carries_style_script_and_data():
    """The prompt leads with one coherent STYLE block, carries the script, uses the real
    data, and keeps the anti-invention guardrail."""
    from gtm_engine.video.prompt_to_video import build_agent_prompt
    out = build_agent_prompt(
        concept="The complexity tax", script="Revenue's up. EBITDA's flat. See it run.",
        mode="insight", data_text="Q1: 34 initiatives, 11% margin", voice="No hype.")
    assert "9:16" in out and "STYLE:" in out             # format + one coherent style block
    assert "EBITDA's flat" in out                        # the script is carried verbatim
    assert "34 initiatives" in out                       # the real data IS used on screen
    assert "invent" in out.lower()                       # the anti-fabrication guardrail


def test_compose_prompt_writes_script_and_scenes_for_review(db, monkeypatch):
    """compose_agent_prompt asks Claude for script+scenes, assembles a reviewable prompt,
    and stores it on the piece so the render sends exactly what was reviewed."""
    from gtm_engine.content_studio import ContentStudioStore, ContentBatch, ContentPiece
    import gtm_engine.utils.ai_client as aic
    monkeypatch.setattr(aic, "call_claude", lambda *a, **k: json.dumps({
        "script": ["Everyone's busy.", "EBITDA's flat.", "See it run."],
        "scenes": [{"beat": "Hook", "roll": "presenter", "say": "Everyone's busy.",
                    "visual": "presenter, captions track the line"},
                   {"beat": "Proof", "roll": "data", "say": "EBITDA's flat.",
                    "visual": "before/after bars: margin 11% → 19%, big number ticks up"}]}))
    store = ContentStudioStore()
    bid = store.create_batch(ContentBatch(title="B", content_types=["insight"]))
    pid = store.add_piece(ContentPiece(batch_id=bid, kind="social", format="reel",
                                       caption="The complexity tax", content_mode="insight"))
    from gtm_engine.video.prompt_to_video import compose_agent_prompt, agent_prompt_for_piece
    out = compose_agent_prompt(pid)
    assert "STYLE:" in out and "SCENE-BY-SCENE" in out
    assert "EBITDA's flat." in out and "11% → 19%" in out   # concrete data visual per beat
    assert "Visual:" in out and "VO:" in out                # scene-by-scene structure
    assert "invent" in out.lower() and "9:16" in out
    # stored, so a later fetch returns the SAME reviewed text (no rebuild)
    p = store.get_piece(pid)
    assert p.meta["agent_prompt"] == out
    assert agent_prompt_for_piece(pid) == out


def test_broll_brief_drives_the_visuals(db, monkeypatch):
    """The user's b-roll/visuals brief is fed to the composer (built from, not invented) and
    stored on the piece for reuse."""
    from gtm_engine.content_studio import ContentStudioStore, ContentBatch, ContentPiece
    import gtm_engine.utils.ai_client as aic
    seen = {}
    def fake(prompt, system="", **k):
        seen["prompt"] = prompt
        return json.dumps({"script": ["Line."], "scenes": [{"beat": "Proof", "roll": "data",
                          "say": "Line.", "visual": "the chart the user asked for"}]})
    monkeypatch.setattr(aic, "call_claude", fake)
    store = ContentStudioStore()
    bid = store.create_batch(ContentBatch(title="B", content_types=["insight"]))
    pid = store.add_piece(ContentPiece(batch_id=bid, kind="social", format="reel"))
    from gtm_engine.video.prompt_to_video import compose_agent_prompt
    compose_agent_prompt(pid, broll_notes="bar chart of revenue vs EBITDA, then 34→9 before/after")
    assert "VISUALS BRIEF" in seen["prompt"] and "34→9 before/after" in seen["prompt"]
    # persisted for reuse / regenerate
    assert store.get_piece(pid).meta["broll_notes"].startswith("bar chart of revenue")


def test_batch_analysis_prefills_reel_broll(db, monkeypatch):
    """The core analysis defined at intake is inherited as the reel's b-roll brief when the
    piece has none — so the reel graphics stay consistent with the rest of the batch."""
    from gtm_engine.content_studio import ContentStudioStore, ContentBatch, ContentPiece
    import gtm_engine.utils.ai_client as aic
    seen = {}
    monkeypatch.setattr(aic, "call_claude", lambda prompt, system="", **k: seen.setdefault("p", prompt)
                        or json.dumps({"script": ["Line."], "scenes": []}))
    store = ContentStudioStore()
    bid = store.create_batch(ContentBatch(title="B", content_types=["insight"],
                                          analysis="34 → 9 initiatives; margin 11% → 19%"))
    assert store.get_batch(bid).analysis.startswith("34 → 9")   # persisted on the batch
    pid = store.add_piece(ContentPiece(batch_id=bid, kind="social", format="reel"))
    from gtm_engine.video.prompt_to_video import compose_agent_prompt
    compose_agent_prompt(pid)                                    # no explicit broll — inherits batch
    assert "VISUALS BRIEF" in seen["p"] and "34 → 9 initiatives" in seen["p"]


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


def test_available_looks_and_per_piece_override(db, monkeypatch, tmp_path):
    """available_looks lists the presenter's looks; a per-piece look choice overrides the
    default avatar on render."""
    monkeypatch.setenv("HEYGEN_API_KEY", "sk-test")
    from gtm_engine.casting import CastingStore, Character
    CastingStore().save_character(Character(name="The Analyst", avatar_id="av_current",
                                            avatar_name="The Analyst", voice_id="vo1",
                                            avatar_group_id="grp1"))

    class _Prov:
        def is_configured(self): return True
        def list_avatar_looks(self, gid):
            return [{"id": "look_desk", "name": "At the desk", "preview_url": "http://x/1.jpg"},
                    {"id": "look_walk", "name": "Walking", "preview_url": "http://x/2.jpg"}]
        def list_avatars(self): return []
    monkeypatch.setattr("gtm_engine.avatar.get_provider", lambda *_: _Prov())

    from gtm_engine.video import prompt_to_video as ptv
    looks = ptv.available_looks()
    ids = [lk["id"] for lk in looks]
    assert ids[0] == "av_current"                 # current avatar is the default first option
    assert "look_desk" in ids and "look_walk" in ids

    from gtm_engine.content_studio import ContentStudioStore, ContentBatch, ContentPiece
    store = ContentStudioStore()
    bid = store.create_batch(ContentBatch(title="B", content_types=["insight"]))
    pid = store.add_piece(ContentPiece(batch_id=bid, kind="social", format="reel"))
    ptv.set_look_for_piece(pid, "look_walk")
    assert store.get_piece(pid).meta["agent_avatar_id"] == "look_walk"

    seen = {}
    class _Prov2(_Prov):
        def render_video_agent(self, prompt, out, **k):
            seen.update(k); Path(out).write_bytes(b"MP4"); return Path(out)
        last_error = ""
    monkeypatch.setattr("gtm_engine.avatar.get_provider", lambda *_: _Prov2())
    import gtm_engine.config as cfg
    cfg.OUTPUT_DIR = tmp_path / "out"
    ptv.save_agent_prompt(pid, "P")
    ptv.render_for_piece(pid)
    assert seen["avatar_id"] == "look_walk"       # the chosen look wins over the default


def test_render_failure_appends_credits(db, monkeypatch, tmp_path):
    """When a render fails, the stored error includes the HeyGen credit balance so a
    silent 'failed' is explained (0 credits = out)."""
    from gtm_engine.content_studio import ContentStudioStore, ContentBatch, ContentPiece
    store = ContentStudioStore()
    bid = store.create_batch(ContentBatch(title="B", content_types=["insight"]))
    pid = store.add_piece(ContentPiece(batch_id=bid, kind="social", format="reel"))

    class _Prov:
        last_error = "HeyGen job failed: status=failed"
        def is_configured(self): return True
        def render_video_agent(self, *a, **k): return None      # simulate failure
        def remaining_quota(self): return 0
    monkeypatch.setattr("gtm_engine.avatar.get_provider", lambda *_: _Prov())
    import gtm_engine.config as cfg
    cfg.OUTPUT_DIR = tmp_path / "out"
    from gtm_engine.video import prompt_to_video as ptv
    ptv.save_agent_prompt(pid, "P")
    assert ptv.render_for_piece(pid) is None
    err = store.get_piece(pid).meta["agent_error"]
    assert "credits remaining: 0" in err and "out of credits" in err


def test_remaining_quota_converts_units(monkeypatch):
    monkeypatch.setenv("HEYGEN_API_KEY", "sk-test")
    from gtm_engine.avatar import HeyGenProvider
    class _R:
        status_code = 200
        def json(self): return {"data": {"remaining_quota": 1200}}
    import httpx
    monkeypatch.setattr(httpx, "get", lambda *a, **k: _R())
    assert HeyGenProvider().remaining_quota() == 20     # 1200 / 60 = 20 credits


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
