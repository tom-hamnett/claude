"""Tests for the Stage Gate system."""

from datetime import datetime, timezone, timedelta

from gtm_engine.stage_gate.gate import check_gate_trigger


def test_gate_triggers_on_first_run():
    result = check_gate_trigger(last_gate_time=None)
    assert result["should_trigger"] is True
    assert any(t["type"] == "first_run" for t in result["triggers"])


def test_gate_triggers_after_interval():
    old = datetime.now(timezone.utc) - timedelta(days=10)
    result = check_gate_trigger(last_gate_time=old)
    assert result["should_trigger"] is True
    assert any(t["type"] == "time_interval" for t in result["triggers"])


def test_gate_does_not_trigger_if_recent():
    recent = datetime.now(timezone.utc) - timedelta(days=1)
    result = check_gate_trigger(last_gate_time=recent)
    # Time interval shouldn't trigger
    assert not any(t["type"] == "time_interval" for t in result["triggers"])


def test_gate_triggers_on_performance_drop():
    # Older entries with high scores
    old_log = [{"metrics": {"likes": 100, "comments": 50}} for _ in range(5)]
    # Recent entries with low scores
    recent_log = [{"metrics": {"likes": 5, "comments": 1}} for _ in range(5)]

    full_log = old_log + recent_log
    recent_time = datetime.now(timezone.utc) - timedelta(days=1)

    result = check_gate_trigger(
        last_gate_time=recent_time,
        performance_log=full_log,
    )
    assert any(t["type"] == "performance_drop" for t in result["triggers"])


def test_gate_triggers_on_diversity_decay():
    # All same content type
    content_log = [{"content_type": "social_post"} for _ in range(10)]
    recent_time = datetime.now(timezone.utc) - timedelta(days=1)

    result = check_gate_trigger(
        last_gate_time=recent_time,
        content_log=content_log,
    )
    assert any(t["type"] == "diversity_decay" for t in result["triggers"])


def test_gate_no_diversity_issue_with_variety():
    content_log = [
        {"content_type": t} for t in
        ["social_post", "thought_leadership", "email_sequence", "reddit_post", "linkedin_post",
         "seo_article", "youtube_script", "strategy_breakdown", "long_form_article", "substack_post"]
    ]
    recent_time = datetime.now(timezone.utc) - timedelta(days=1)

    result = check_gate_trigger(
        last_gate_time=recent_time,
        content_log=content_log,
    )
    assert not any(t["type"] == "diversity_decay" for t in result["triggers"])
