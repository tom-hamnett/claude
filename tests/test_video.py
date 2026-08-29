"""Tests for the avatar video job layer (dry-run, QA, review loop)."""

import json
from pathlib import Path

import pytest

from gtm_engine.avatar import AvatarConfig, AvatarConfigStore
from gtm_engine.ideas import Idea, IdeaBank
from gtm_engine.producer import ProducerBrief, ProducerBriefLibrary
from gtm_engine import video as video_mod
from gtm_engine.video import (
    VideoJob, VideoJobStore, run_qa, create_job_from_brief, render_job, apply_revision,
)


@pytest.fixture
def db(tmp_path, monkeypatch):
    """Point every store at an isolated temp DB.

    Some modules bind SQLITE_PATH at import time (producer), so patch the
    bound name too, not just config.
    """
    p = tmp_path / "test.db"
    monkeypatch.setattr("gtm_engine.config.SQLITE_PATH", p)
    monkeypatch.setattr("gtm_engine.producer.SQLITE_PATH", p, raising=False)
    return p


def _seed_idea_with_brief(db):
    idea_id = IdeaBank(db).create(Idea(
        title="Test", hook="A sharp hook", angle="An angle",
        funnel_level="product", status="content_generated",
    ))
    ProducerBriefLibrary(db).save(ProducerBrief(
        idea_id=idea_id,
        spoken_script="Your framework is now cheap. The product proves it.",
        segments_json={
            "hook": {"spoken_text": "Your framework is now cheap."},
            "bookend": {"spoken_text": "See it run. quantumtools.ai"},
        },
    ))
    return idea_id


def test_resolve_audio_take_passthrough(tmp_path):
    from gtm_engine.video import resolve_audio_take
    wav = tmp_path / "take.wav"
    wav.write_bytes(b"RIFF....WAVE")
    assert resolve_audio_take(wav) == wav


def test_extract_audio_missing_returns_none():
    from gtm_engine.video import extract_audio
    assert extract_audio(Path("/tmp/does-not-exist-xyz.mp4")) is None


def test_extract_audio_from_video(tmp_path):
    imageio_ffmpeg = pytest.importorskip("imageio_ffmpeg")
    import subprocess
    from gtm_engine.video import resolve_audio_take
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    vid = tmp_path / "clip.mp4"
    subprocess.run(
        [ff, "-y", "-f", "lavfi", "-i", "testsrc=duration=1:size=320x240:rate=10",
         "-f", "lavfi", "-i", "sine=frequency=440:duration=1", "-shortest", str(vid)],
        check=True, capture_output=True,
    )
    out = resolve_audio_take(vid)
    assert out is not None and out.exists() and out.stat().st_size > 0
    assert out.suffix == ".wav"


def test_qa_flags_length_and_forbidden():
    assert run_qa("", "") == ["Hook line is empty.", "Bookend line is empty."]
    long = "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen"
    assert any("Hook is" in i for i in run_qa(long, "ok"))
    assert any("forbidden" in i for i in run_qa("this is revolutionary", "clean"))


def test_create_job_from_brief_pulls_segments(db):
    idea_id = _seed_idea_with_brief(db)
    job = create_job_from_brief(idea_id)
    assert job is not None
    assert job.hook_text == "Your framework is now cheap."
    assert "quantumtools.ai" in job.bookend_text
    # No provider configured -> not ready
    assert job.status == "needs_provider"


def test_render_job_dry_run_when_no_provider(db):
    idea_id = _seed_idea_with_brief(db)
    job = create_job_from_brief(idea_id)
    rendered = render_job(job.id)
    assert rendered.status == "needs_provider"
    payload = json.loads(rendered.dry_run_request)
    assert "Your framework is now cheap." in payload["script"]
    assert rendered.video_path == ""


def test_mock_provider_renders_ready(db):
    """With the simulation provider, a job renders to 'ready' with an artefact."""
    idea_id = _seed_idea_with_brief(db)
    store = AvatarConfigStore(db)
    cfg = store.load()
    cfg.provider, cfg.avatar_id = "mock", "mock-avatar"
    store.save(cfg)

    create_job_from_brief(idea_id)
    job = VideoJobStore(db).get_for_idea(idea_id)
    rendered = render_job(job.id)
    assert rendered.status == "ready"
    assert rendered.video_path
    assert Path(rendered.video_path).exists()


def test_transfer_flow_via_mock(db, tmp_path):
    """Performance-transfer: script gate + character + driving video -> ready."""
    from PIL import Image
    from gtm_engine.video import approve_script
    idea_id = _seed_idea_with_brief(db)

    char = tmp_path / "character.png"
    Image.new("RGB", (100, 100), "#1b2e44").save(char)
    store = AvatarConfigStore(db)
    cfg = store.load()
    cfg.provider, cfg.mode = "mock", "transfer"
    cfg.character_image_path = str(char)
    store.save(cfg)

    job = create_job_from_brief(idea_id)
    assert job.engine == "transfer"

    # Without a driving video -> needs_input
    d0 = render_job(job.id)
    assert d0.status == "needs_input"

    # Provide a driving video -> ready with an artefact
    approve_script(job.id)
    imageio_ffmpeg = pytest.importorskip("imageio_ffmpeg")
    import subprocess
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    vid = tmp_path / "take.mp4"
    subprocess.run([ff, "-y", "-f", "lavfi", "-i",
                    "testsrc=duration=1:size=160x120:rate=10", "-t", "1", str(vid)],
                   check=True, capture_output=True)
    done = render_job(job.id, driving_video_path=vid)
    assert done.status == "ready"
    assert Path(done.video_path).exists()


def test_approve_script_gate(db):
    idea_id = _seed_idea_with_brief(db)
    from gtm_engine.video import approve_script
    job = create_job_from_brief(idea_id)
    assert job.script_approved is False
    updated = approve_script(job.id)
    assert updated.script_approved is True


def test_config_ready_gate(db):
    store = AvatarConfigStore(db)
    cfg = store.load()
    assert not cfg.is_ready()
    cfg.provider, cfg.avatar_id = "heygen", "av_123"
    store.save(cfg)
    assert store.load().is_ready()


def test_apply_revision_script_change(db, monkeypatch):
    idea_id = _seed_idea_with_brief(db)
    job = create_job_from_brief(idea_id)

    def fake_classify(note, j):
        return {
            "change_type": "script",
            "updated_hook_text": "Your framework is a $20 API call.",
            "updated_bookend_text": "",
            "rationale": "punchier",
        }
    monkeypatch.setattr(video_mod, "classify_review_note", fake_classify)

    updated = apply_revision(job.id, "make the hook punchier", auto_render=True)
    assert updated.hook_text == "Your framework is a $20 API call."
    assert updated.revisions[-1]["change_type"] == "script"
    # bookend unchanged
    assert "quantumtools.ai" in updated.bookend_text


def test_apply_revision_delivery_change(db, monkeypatch):
    idea_id = _seed_idea_with_brief(db)
    job = create_job_from_brief(idea_id)

    monkeypatch.setattr(video_mod, "classify_review_note", lambda note, j: {
        "change_type": "delivery",
        "updated_motion_prompt": "more energy, lean in",
        "updated_expressiveness": 0.85,
        "rationale": "raise energy",
    })
    updated = apply_revision(job.id, "more energy", auto_render=False)
    assert updated.motion_prompt == "more energy, lean in"
    assert updated.expressiveness == pytest.approx(0.85)


def test_apply_revision_visual_note_no_rerender(db, monkeypatch):
    idea_id = _seed_idea_with_brief(db)
    job = create_job_from_brief(idea_id)
    monkeypatch.setattr(video_mod, "classify_review_note", lambda note, j: {
        "change_type": "visual",
        "note_for_editor": "swap the chart for a dark-mode version",
        "rationale": "visual only",
    })
    updated = apply_revision(job.id, "different chart", auto_render=True)
    assert updated.revisions[-1]["note_for_editor"].startswith("swap the chart")
    # visual notes are logged but don't touch the spoken lines
    assert updated.hook_text == "Your framework is now cheap."
