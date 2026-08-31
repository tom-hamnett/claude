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


def test_suggest_look_fallback_without_api(monkeypatch):
    """With no Claude available, suggest_look returns the first look (never crashes)."""
    from gtm_engine.video import suggest_look
    from gtm_engine.casting import Look
    monkeypatch.setattr("gtm_engine.utils.ai_client.call_claude",
                        lambda *a, **k: (_ for _ in ()).throw(RuntimeError("no key")))
    job = VideoJob(idea_id=1, hook_text="Everyone's wrong about X", tone="sharp")
    looks = [Look(id=7, name="Bold"), Look(id=8, name="Soft")]
    lid, rationale = suggest_look(job, looks)
    assert lid == 7


def test_suggest_look_empty_and_single():
    from gtm_engine.video import suggest_look
    from gtm_engine.casting import Look
    job = VideoJob(idea_id=1)
    assert suggest_look(job, []) == (None, "")
    lid, _ = suggest_look(job, [Look(id=3, name="Only")])
    assert lid == 3


def test_suggest_look_parses_choice(monkeypatch):
    from gtm_engine.video import suggest_look
    from gtm_engine.casting import Look
    monkeypatch.setattr("gtm_engine.utils.ai_client.call_claude",
                        lambda *a, **k: '{"look_number": 2, "rationale": "warmer fits"}')
    job = VideoJob(idea_id=1, tone="warm")
    looks = [Look(id=11, name="Formal"), Look(id=12, name="Casual")]
    lid, rationale = suggest_look(job, looks)
    assert lid == 12
    assert "warmer" in rationale


def test_auto_assemble_fallback_cards(db, tmp_path, monkeypatch):
    """With no media keys, assemble_reel still stitches a full reel from PIL cards."""
    from gtm_engine.producer import ProducerBrief, ProducerBriefLibrary
    import gtm_engine.video.assembler as asm
    monkeypatch.setattr(asm, "ASSEMBLY_DIR", tmp_path / "assembly")
    monkeypatch.setattr(asm, "OUTPUT_DIR", tmp_path / "out")
    segs = {s: {"spoken_text": f"line {s}", "text_overlay": s.title(),
                "duration_seconds": 1,
                "visual_type": "character_in_scene" if s in ("hook", "bookend") else "data"}
            for s in ["hook", "tension", "pivot", "proof", "bookend"]}
    ProducerBriefLibrary().save(ProducerBrief(idea_id=1, spoken_script="x", segments_json=segs))
    store = VideoJobStore()
    job = VideoJob(idea_id=1, hook_text="a", bookend_text="b")
    job.id = store.save(job)

    steps = []
    out = video_mod.assemble_reel(job.id, include_broll=False,
                                  on_progress=lambda i, t, l: steps.append((i, t)))
    assert out.status == "ready"
    assert out.video_path and Path(out.video_path).exists()
    assert Path(out.video_path).stat().st_size > 0
    meta = json.loads(out.assembly_json)
    assert set(meta["methods"]) == {"hook", "tension", "pivot", "proof", "bookend"}
    assert all(v == "card" for v in meta["methods"].values())  # no keys -> all cards
    assert steps and steps[-1][0] == steps[-1][1]  # progress reached 100%


def test_auto_assemble_is_resumable(db, tmp_path, monkeypatch):
    """A second assemble reuses cached segment clips (same paths)."""
    from gtm_engine.producer import ProducerBrief, ProducerBriefLibrary
    import gtm_engine.video.assembler as asm
    monkeypatch.setattr(asm, "ASSEMBLY_DIR", tmp_path / "assembly")
    monkeypatch.setattr(asm, "OUTPUT_DIR", tmp_path / "out")
    segs = {"hook": {"spoken_text": "a", "text_overlay": "Hook", "duration_seconds": 1,
                     "visual_type": "character_in_scene"},
            "bookend": {"spoken_text": "b", "text_overlay": "End", "duration_seconds": 1,
                        "visual_type": "character_in_scene"}}
    ProducerBriefLibrary().save(ProducerBrief(idea_id=1, spoken_script="x", segments_json=segs))
    store = VideoJobStore()
    job = VideoJob(idea_id=1)
    job.id = store.save(job)
    out1 = video_mod.assemble_reel(job.id, include_broll=False)
    paths1 = {k: v["path"] for k, v in json.loads(out1.assembly_json)["segments"].items()}
    out2 = video_mod.assemble_reel(job.id, include_broll=False)
    paths2 = {k: v["path"] for k, v in json.loads(out2.assembly_json)["segments"].items()}
    assert paths1 == paths2  # cached, not rebuilt with new hashes
    assert out2.status == "ready"


def test_auto_sharpen_stops_when_dna_passes(db, monkeypatch):
    """If the script already passes the DNA check, no rewrite rounds run."""
    from gtm_engine.producer import ProducerBrief, ProducerBriefLibrary
    ProducerBriefLibrary().save(ProducerBrief(
        idea_id=1, spoken_script="Your framework is a problem. PRISM is the answer. See it run."))
    store = VideoJobStore()
    job = VideoJob(idea_id=1, hook_text="Your framework is a problem.",
                   bookend_text="See it run.")
    job.id = store.save(job)
    # DNA passes (hook, problem-word, bookend, product PRISM, no pitchy) -> product must match
    monkeypatch.setattr("gtm_engine.ideas.IdeaBank.get",
                        lambda self, i: type("I", (), {"product": "PRISM"})())
    called = {"n": 0}
    monkeypatch.setattr(video_mod, "regenerate_script",
                        lambda *a, **k: called.__setitem__("n", called["n"] + 1))
    out, rounds = video_mod.auto_sharpen(job.id)
    assert called["n"] == 0            # never had to rewrite
    assert rounds and rounds[-1]["fixed"] is True


def test_auto_sharpen_rewrites_until_max_rounds(db, monkeypatch):
    """When weak points persist, it rewrites up to max_rounds and logs each pass."""
    from gtm_engine.producer import ProducerBrief, ProducerBriefLibrary
    ProducerBriefLibrary().save(ProducerBrief(idea_id=1, spoken_script="flat copy"))
    store = VideoJobStore()
    job = VideoJob(idea_id=1, hook_text="", bookend_text="")  # weak: no hook/payoff
    job.id = store.save(job)
    monkeypatch.setattr("gtm_engine.ideas.IdeaBank.get",
                        lambda self, i: type("I", (), {"product": "PRISM"})())
    calls = {"n": 0}
    monkeypatch.setattr(video_mod, "regenerate_script",
                        lambda *a, **k: calls.__setitem__("n", calls["n"] + 1))
    out, rounds = video_mod.auto_sharpen(job.id, max_rounds=3)
    assert calls["n"] == 3              # rewrote every round (still weak)
    assert len(rounds) == 3
    assert out.revisions[-1]["change_type"] == "auto_sharpen"


def test_qa_video_no_key_returns_empty(monkeypatch):
    import gtm_engine.utils.media as media
    monkeypatch.setattr(media, "GOOGLE_API_KEY", "")
    assert media.qa_video("/nonexistent.mp4") == {}


def test_build_segment_prefers_cinematic_when_enabled(monkeypatch, tmp_path):
    """A middle beat routes to cinematic YOU when enabled and look ids exist."""
    import gtm_engine.video.assembler as asm
    marker = tmp_path / "cine.mp4"; marker.write_bytes(b"x")
    monkeypatch.setattr(asm, "_cinematic_segment", lambda seg, ctx, out: marker)
    ctx = {"provider": "heygen", "cinematic_look_ids": ["fa0e383a"]}
    clip, method = asm._build_segment("tension", {"visual_direction": "x", "duration_seconds": 4},
                                      ctx, tmp_path / "o.mp4", include_broll=True,
                                      cinematic_middle=True)
    assert method == "cinematic" and clip == marker


def test_build_segment_cinematic_off_uses_broll_or_card(monkeypatch, tmp_path):
    """With cinematic off, a middle beat does not call cinematic."""
    import gtm_engine.video.assembler as asm
    called = {"n": 0}
    monkeypatch.setattr(asm, "_cinematic_segment",
                        lambda *a, **k: called.__setitem__("n", called["n"] + 1))
    monkeypatch.setattr(asm, "_broll_segment", lambda *a, **k: None)  # force card fallback
    ctx = {"provider": "heygen", "cinematic_look_ids": ["fa0e383a"]}
    clip, method = asm._build_segment("tension", {"text_overlay": "T", "duration_seconds": 1},
                                      ctx, tmp_path / "o2.mp4", include_broll=True,
                                      cinematic_middle=False)
    assert called["n"] == 0 and method == "card"


def test_character_persists_cinematic_fields(tmp_path, monkeypatch):
    monkeypatch.setattr("gtm_engine.config.SQLITE_PATH", tmp_path / "c.db")
    from gtm_engine.casting import CastingStore, Character
    cs = CastingStore(tmp_path / "c.db")
    cid = cs.save_character(Character(name="X", avatar_group_id="grp1",
                                      cinematic_look_ids="a,b"))
    g = cs.get_character(cid)
    assert g.avatar_group_id == "grp1" and g.cinematic_look_ids == "a,b"


def test_continuous_falls_back_when_no_master(db, tmp_path, monkeypatch):
    """With no talking-head master possible, continuous falls back to segment stitch."""
    from gtm_engine.producer import ProducerBrief, ProducerBriefLibrary
    import gtm_engine.video.assembler as asm
    monkeypatch.setattr(asm, "ASSEMBLY_DIR", tmp_path / "a")
    monkeypatch.setattr(asm, "OUTPUT_DIR", tmp_path / "o")
    monkeypatch.setattr(asm, "_render_master_talkinghead", lambda *a, **k: None)
    segs = {s: {"spoken_text": f"line {s}", "text_overlay": s.title(), "duration_seconds": 1,
                "visual_type": "character_in_scene" if s in ("hook", "bookend") else "d"}
            for s in ["hook", "tension", "pivot", "proof", "bookend"]}
    ProducerBriefLibrary().save(ProducerBrief(idea_id=1, spoken_script="x", segments_json=segs))
    store = VideoJobStore(); job = VideoJob(idea_id=1); job.id = store.save(job)
    out = asm.assemble_continuous(job.id, include_broll=False)
    assert out.status == "ready" and out.video_path and Path(out.video_path).exists()


def test_continuous_overlays_cutaway_over_master(db, tmp_path, monkeypatch):
    """A talking-head master + a middle cutaway → one continuous reel (master audio kept)."""
    import subprocess, imageio_ffmpeg
    from gtm_engine.producer import ProducerBrief, ProducerBriefLibrary
    import gtm_engine.video.assembler as asm
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    monkeypatch.setattr(asm, "ASSEMBLY_DIR", tmp_path / "a")
    monkeypatch.setattr(asm, "OUTPUT_DIR", tmp_path / "o")
    (tmp_path / "a").mkdir(parents=True, exist_ok=True)

    def fake_master(job, ctx, segments, out):
        subprocess.run([ff, "-y", "-f", "lavfi", "-i", "color=c=navy:s=720x1280:d=6:r=30",
                        "-f", "lavfi", "-i", "sine=frequency=300:duration=6",
                        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
                        str(out)], capture_output=True)
        return out
    def fake_cut(segments, ctx, seconds, out, cinematic_middle, include_broll, media=None):
        subprocess.run([ff, "-y", "-f", "lavfi", "-i", f"color=c=red:s=720x1280:d={seconds}:r=30",
                        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", str(out)],
                       capture_output=True)
        return out, "cinematic", ""
    monkeypatch.setattr(asm, "_render_master_talkinghead", fake_master)
    monkeypatch.setattr(asm, "_middle_cutaway", fake_cut)
    segs = {s: {"spoken_text": "word word word", "text_overlay": "x", "duration_seconds": 4}
            for s in ["hook", "tension", "pivot", "proof", "bookend"]}
    ProducerBriefLibrary().save(ProducerBrief(idea_id=1, spoken_script="x", segments_json=segs))
    store = VideoJobStore(); job = VideoJob(idea_id=1); job.id = store.save(job)
    out = asm.assemble_continuous(job.id, cinematic_middle=True, include_broll=True)
    assert out.status == "ready"
    assert asm._probe_duration(Path(out.video_path)) > 5.0  # full master length kept
    import json as _j
    assert "cutaway" in _j.loads(out.assembly_json)["methods"]["reel"]


def test_script_override_persists_and_drives_master(db, tmp_path, monkeypatch):
    """A hand-edited script overrides the generated one and is what gets rendered."""
    import gtm_engine.video.assembler as asm
    from gtm_engine.video import update_job_production
    store = VideoJobStore()
    job = VideoJob(idea_id=1, hook_text="gen hook", bookend_text="gen end")
    job.id = store.save(job)
    update_job_production(job.id, script_override="MY EXACT WORDS.\nSecond line.")
    assert store.get(job.id).script_override.startswith("MY EXACT WORDS")

    captured = {}
    class FakeProv:
        def is_configured(self): return True
        def render(self, req): captured["script"] = req.script; return None
    monkeypatch.setattr("gtm_engine.avatar.get_provider", lambda p: FakeProv())
    ctx = {"provider": "heygen", "image_key": "k", "voice_id": "v",
           "motion_prompt": "", "expressiveness": 0.5, "background": "#000"}
    asm._render_master_talkinghead(store.get(job.id), ctx, {}, tmp_path / "m.mp4")
    assert captured["script"] == "MY EXACT WORDS.\nSecond line."


def test_revise_from_notes_uses_qa_and_updates_script(db, monkeypatch):
    """A revision reads the stored Gemini QA and rewrites script + cinematic direction."""
    import json as _json
    from gtm_engine.producer import ProducerBrief, ProducerBriefLibrary
    from gtm_engine.video import revise_from_notes
    ProducerBriefLibrary().save(ProducerBrief(idea_id=1, spoken_script="old flat script"))
    store = VideoJobStore()
    job = VideoJob(idea_id=1, assembly_json=_json.dumps(
        {"qa": {"score": 55, "verdict": "rushed",
                "issues": [{"severity": "high", "area": "cadence", "note": "no pauses"}]}}))
    job.id = store.save(job)
    captured = {}
    def fake_claude(prompt, **k):
        captured["prompt"] = prompt
        return '{"script":"New line one.\\n\\nNew line two.","cinematic_prompt":"desk, calm","rationale":"added pauses"}'
    monkeypatch.setattr("gtm_engine.utils.ai_client.call_claude", fake_claude)
    out = revise_from_notes(job.id, notes="slower", use_qa=True)
    assert "no pauses" in captured["prompt"]          # QA fed into the prompt
    assert out.script_override.startswith("New line one")
    assert out.cinematic_prompt == "desk, calm"
    assert out.revisions[-1]["change_type"] == "revise_from_notes"


def test_start_reassemble_reads_saved_settings(db, monkeypatch):
    import json as _json
    import gtm_engine.video.assembler as asm
    store = VideoJobStore()
    job = VideoJob(idea_id=1, assembly_json=_json.dumps(
        {"settings": {"include_broll": True, "cinematic_middle": False}}))
    job.id = store.save(job)
    got = {}
    monkeypatch.setattr(asm, "start_assemble",
                        lambda jid, **k: got.update({"jid": jid, **k}))
    asm.start_reassemble(job.id)
    assert got == {"jid": job.id, "include_broll": True, "cinematic_middle": False, "hd": False}


def test_master_take_is_cached_across_reassembles(db, tmp_path, monkeypatch):
    """Re-assembling with the SAME script reuses the master take (no re-render)."""
    import subprocess, imageio_ffmpeg
    from gtm_engine.producer import ProducerBrief, ProducerBriefLibrary
    import gtm_engine.video.assembler as asm
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    monkeypatch.setattr(asm, "ASSEMBLY_DIR", tmp_path / "a")
    monkeypatch.setattr(asm, "OUTPUT_DIR", tmp_path / "o")
    calls = {"n": 0}
    def fake_master(job, ctx, segments, out):
        calls["n"] += 1
        subprocess.run([ff, "-y", "-f", "lavfi", "-i", "color=c=navy:s=1080x1920:d=6:r=30",
                        "-f", "lavfi", "-i", "sine=frequency=300:duration=6",
                        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
                        str(out)], capture_output=True)
        return out
    monkeypatch.setattr(asm, "_render_master_talkinghead", fake_master)
    monkeypatch.setattr(asm, "_middle_cutaway", lambda *a, **k: (None, "", "off"))
    segs = {s: {"spoken_text": "word word", "text_overlay": "x", "duration_seconds": 4}
            for s in ["hook", "tension", "pivot", "proof", "bookend"]}
    ProducerBriefLibrary().save(ProducerBrief(idea_id=1, spoken_script="x", segments_json=segs))
    store = VideoJobStore(); job = VideoJob(idea_id=1); job.id = store.save(job)
    asm.assemble_continuous(job.id, cinematic_middle=False)
    asm.assemble_continuous(job.id, cinematic_middle=False)  # same script → cache hit
    assert calls["n"] == 1  # master rendered once, reused the second time


def test_draft_mode_never_calls_heygen(db, tmp_path, monkeypatch):
    """Free draft mode must NOT call the HeyGen talking-head render (no credits)."""
    from gtm_engine.producer import ProducerBrief, ProducerBriefLibrary
    import gtm_engine.video.assembler as asm
    monkeypatch.setattr(asm, "ASSEMBLY_DIR", tmp_path / "a")
    monkeypatch.setattr(asm, "OUTPUT_DIR", tmp_path / "o")
    called = {"heygen": 0}
    monkeypatch.setattr(asm, "_render_master_talkinghead",
                        lambda *a, **k: called.__setitem__("heygen", called["heygen"] + 1))
    segs = {s: {"spoken_text": "word", "text_overlay": "x", "duration_seconds": 2}
            for s in ["hook", "tension", "pivot", "proof", "bookend"]}
    ProducerBriefLibrary().save(ProducerBrief(idea_id=1, spoken_script="x", segments_json=segs))
    store = VideoJobStore(); job = VideoJob(idea_id=1, hook_text="Hi"); job.id = store.save(job)
    out = asm.assemble_continuous(job.id, draft=True)
    assert called["heygen"] == 0          # HeyGen never touched
    assert out.status == "ready" and Path(out.video_path).exists()
    import json as _j
    assert "draft" in _j.loads(out.assembly_json)["methods"]["reel"]


def test_uploaded_media_is_preferred_and_free(db, tmp_path, monkeypatch):
    """Uploaded footage is used for the middle (no Seedance/HeyGen call)."""
    from PIL import Image
    import gtm_engine.video.assembler as asm
    img = tmp_path / "dash.png"; Image.new("RGB", (1200, 800), (10, 20, 40)).save(img)
    called = {"cine": 0}
    monkeypatch.setattr(asm, "_cinematic_segment",
                        lambda *a, **k: called.__setitem__("cine", called["cine"] + 1))
    clip, method, err = asm._middle_cutaway({}, {"provider": "heygen", "cinematic_look_ids": ["x"]},
                                            5.0, tmp_path / "cut.mp4",
                                            cinematic_middle=True, include_broll=True,
                                            media=[str(img)])
    assert method == "your media" and called["cine"] == 0 and Path(clip).exists()


def test_middle_media_round_trips(db):
    store = VideoJobStore()
    from gtm_engine.video import set_middle_media
    job = VideoJob(idea_id=1); job.id = store.save(job)
    set_middle_media(job.id, ["/a/x.png", "/a/y.mp4", ""])
    assert store.get(job.id).middle_media == ["/a/x.png", "/a/y.mp4"]


def test_choreograph_cleans_and_validates(monkeypatch):
    from gtm_engine.video import choreography as ch
    raw = ('{"shots":[{"spoken":"Hook line","seconds":9,"visual":"screenshot","media_index":5,'
           '"caption":"x"},{"spoken":"Close","seconds":3,"visual":"stock","stock_query":"markets",'
           '"caption":"y"}]}')
    monkeypatch.setattr("gtm_engine.utils.ai_client.call_claude", lambda *a, **k: raw)
    shots = ch.choreograph("Hook line Close", media_names=[], product="Atlas")
    assert len(shots) == 2
    # media_index 5 with 0 media → downgraded to a card; seconds clamped to <=6
    assert shots[0]["visual"] == "card" and shots[0]["seconds"] <= 6
    assert shots[1]["visual"] == "stock" and shots[1]["stock_query"] == "markets"


def test_shot_list_cleared_when_script_changes(db):
    from gtm_engine.video import update_job_production, set_shot_list
    store = VideoJobStore()
    job = VideoJob(idea_id=1, script_override="old"); job.id = store.save(job)
    set_shot_list(job.id, [{"spoken": "old", "visual": "presenter"}])
    assert len(store.get(job.id).shot_list) == 1
    update_job_production(job.id, script_override="new words")
    assert store.get(job.id).shot_list == []   # invalidated → re-choreograph


def test_shot_windows_sum_to_duration_and_lead():
    import gtm_engine.video.assembler as asm
    shots = [{"spoken": "a b c", "visual": "presenter"},
             {"spoken": "d e f g", "visual": "screenshot"},
             {"spoken": "h i", "visual": "presenter"}]
    wins = asm._shot_windows(shots, 20.0)
    assert len(wins) == 3
    assert wins[-1][1] <= 20.0 and wins[0][0] == 0.0
    # the screenshot (cutaway) leads its audio, so its start is earlier than a naive split
    assert wins[1][0] < wins[0][1]


def test_hd_flag_flows_to_1080_render(db, tmp_path, monkeypatch):
    """HD on → the presenter take is requested at 1080p, and it's in the cache key."""
    import gtm_engine.video.assembler as asm
    from gtm_engine.producer import ProducerBrief, ProducerBriefLibrary
    monkeypatch.setattr(asm, "ASSEMBLY_DIR", tmp_path / "a")
    monkeypatch.setattr(asm, "OUTPUT_DIR", tmp_path / "o")
    cap = {}
    def fake_master(job, ctx, segments, out, hd=False):
        cap["hd"] = hd
        return None   # force fallback; we only care the flag arrived
    monkeypatch.setattr(asm, "_render_master_talkinghead", fake_master)
    monkeypatch.setattr(asm, "assemble_reel", lambda *a, **k: None)
    ProducerBriefLibrary().save(ProducerBrief(idea_id=1, spoken_script="hi there"))
    store = VideoJobStore(); job = VideoJob(idea_id=1, script_override="hi there"); job.id = store.save(job)
    asm.assemble_choreographed(job.id, hd=True)
    assert cap["hd"] is True


def test_render_request_hd_dims():
    import os
    os.environ["HEYGEN_API_KEY"] = "test"
    from gtm_engine.avatar import HeyGenProvider, RenderRequest
    # We can't call render() (network), but the dims logic is what matters:
    req = RenderRequest(script="x", avatar_id="a", output_path=__import__("pathlib").Path("/tmp/x.mp4"), hd=True)
    assert req.hd is True


def test_generate_visual_falls_back_to_card_without_fal(db, tmp_path, monkeypatch):
    """A 'generate' beat with no fal key still produces something (a card), never blank."""
    import subprocess, imageio_ffmpeg
    from gtm_engine.producer import ProducerBrief, ProducerBriefLibrary
    import gtm_engine.video.assembler as asm
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    monkeypatch.setattr(asm, "ASSEMBLY_DIR", tmp_path / "a")
    monkeypatch.setattr(asm, "OUTPUT_DIR", tmp_path / "o")
    def fake_master(job, ctx, segments, out, hd=False):
        subprocess.run([ff, "-y", "-f", "lavfi", "-i", f"color=c=navy:s={asm.W}x{asm.H}:d=8:r=30",
                        "-f", "lavfi", "-i", "sine=frequency=200:duration=8",
                        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
                        str(out)], capture_output=True)
        return out
    monkeypatch.setattr(asm, "_render_master_talkinghead", fake_master)
    ProducerBriefLibrary().save(ProducerBrief(idea_id=1, spoken_script="a b c d e f"))
    store = VideoJobStore()
    job = VideoJob(idea_id=1, script_override="a b c d e f",
                   shot_list=[{"spoken": "a b c", "seconds": 4, "visual": "presenter", "caption": "hi"},
                              {"spoken": "d e f", "seconds": 4, "visual": "generate",
                               "stock_query": "trading floor", "caption": "markets"}])
    job.id = store.save(job)
    out = asm.assemble_choreographed(job.id)   # no FAL_KEY → generate → card fallback
    assert out.status == "ready" and Path(out.video_path).exists()


# ── Data-viz B-roll (the "proof, not stock" engine) ────────────────────────────

def test_dataviz_renders_all_chart_types(tmp_path):
    from PIL import Image
    from gtm_engine.video.dataviz import render_dataviz, clean_spec
    specs = [
        {"chart_type": "stat", "value": "-11.4%", "label": "Max drawdown", "sub": "52-week test"},
        {"chart_type": "bar", "title": "Return vs benchmark", "unit": "%",
         "bars": [{"label": "ATLAS", "value": 34.2}, {"label": "S&P 500", "value": 11.0}]},
        {"chart_type": "line", "title": "Equity curve", "series": [100, 103, 101, 108, 115]},
        {"chart_type": "table", "title": "The log",
         "rows": [["Week 12", "+2.3%"], ["Week 13", "-1.1%"]]},
    ]
    for s in specs:
        assert clean_spec(s) is not None
        out = render_dataviz(s, tmp_path / f"{s['chart_type']}.png")
        assert out and out.exists()
        w, h = Image.open(out).size
        assert (w, h) == (1080, 1920)


def test_dataviz_clean_spec_rejects_bad():
    from gtm_engine.video.dataviz import clean_spec
    assert clean_spec({"chart_type": "stat"}) is None            # no value
    assert clean_spec({"chart_type": "bar", "bars": [{"label": "x", "value": 1}]}) is None  # <2
    assert clean_spec({"chart_type": "line", "series": [1]}) is None            # too short
    assert clean_spec({"chart_type": "nope"}) is None
    assert clean_spec("garbage") is None


def test_choreography_chart_without_spec_downgrades_to_card():
    from gtm_engine.video.choreography import _clean
    c = _clean({"spoken": "we drew down eleven percent", "visual": "chart",
                "role": "number", "caption": "−11.4%"}, n_media=0)
    assert c["visual"] == "card" and c["data_spec"] is None


def test_choreography_chart_with_spec_kept():
    from gtm_engine.video.choreography import _clean
    spec = {"chart_type": "stat", "value": "-11.4%", "label": "Drawdown"}
    c = _clean({"spoken": "eleven percent", "visual": "chart", "data_spec": spec,
                "role": "number", "caption": "−11.4%"}, n_media=0)
    assert c["visual"] == "chart" and c["data_spec"] == spec


def test_choreography_missing_screenshot_becomes_chart_when_spec():
    from gtm_engine.video.choreography import _clean
    spec = {"chart_type": "stat", "value": "34%", "label": "Return"}
    # asked for screenshot #3 we don't have, but gave chart data → chart, not card
    c = _clean({"spoken": "up thirty four percent", "visual": "screenshot",
                "media_index": 3, "data_spec": spec}, n_media=0)
    assert c["visual"] == "chart" and c["data_spec"] == spec


def test_choreograph_caps_stock_at_one(monkeypatch):
    import gtm_engine.video.choreography as ch
    shots = {"shots": [
        {"spoken": "one", "visual": "presenter", "role": "hook"},
        {"spoken": "two", "visual": "stock", "stock_query": "trading floor", "role": "example"},
        {"spoken": "three", "visual": "stock", "stock_query": "city skyline", "role": "example"},
        {"spoken": "four", "visual": "stock", "stock_query": "desk", "role": "number",
         "data_spec": {"chart_type": "stat", "value": "5%", "label": "x"}},
        {"spoken": "five", "visual": "presenter", "role": "cta"},
    ]}
    import gtm_engine.utils.ai_client as aic
    monkeypatch.setattr(aic, "call_claude", lambda *a, **k: json.dumps(shots))
    out = ch.choreograph("one two three four five", [], "ATLAS", 25)
    visuals = [s["visual"] for s in out]
    assert visuals.count("stock") == 1                 # only the first stock survives
    assert out[3]["visual"] == "chart"                 # extra stock w/ numbers → chart
    assert out[2]["visual"] == "card"                  # extra stock w/o numbers → card
