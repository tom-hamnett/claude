"""Tests for the Feedback Engine."""

from gtm_engine.feedback.engine import normalise_metrics, aggregate_performance


def test_normalise_metrics_linkedin():
    metrics = {"likes": 10, "comments": 5, "shares": 2}
    score = normalise_metrics("linkedin", metrics)
    # 10*1 + 5*5 + 2*8 = 10 + 25 + 16 = 51
    assert score == 51.0


def test_normalise_metrics_unknown_channel():
    """Unknown channels should return 0 (no weights defined)."""
    score = normalise_metrics("unknown_channel", {"likes": 100})
    assert score == 0.0


def test_normalise_metrics_partial():
    """Only known metrics should contribute to the score."""
    metrics = {"likes": 5, "unknown_metric": 1000}
    score = normalise_metrics("linkedin", metrics)
    assert score == 5.0  # Only likes counted


def test_aggregate_performance_empty():
    result = aggregate_performance([])
    assert result["total_pieces_measured"] == 0
    assert result["by_channel"] == {}


def test_aggregate_performance_basic():
    log = [
        {
            "channel": "linkedin",
            "segment": "consultants",
            "content_type": "thought_leadership",
            "metrics": {"likes": 10, "comments": 5},
        },
        {
            "channel": "linkedin",
            "segment": "consultants",
            "content_type": "social_post",
            "metrics": {"likes": 20, "comments": 2},
        },
        {
            "channel": "reddit",
            "segment": "traders",
            "content_type": "reddit_post",
            "metrics": {"score": 50, "num_comments": 10},
        },
    ]
    result = aggregate_performance(log)
    assert result["total_pieces_measured"] == 3
    assert "linkedin" in result["by_channel"]
    assert "reddit" in result["by_channel"]
    assert result["by_channel"]["linkedin"]["count"] == 2
    assert len(result["top_performers"]) == 3
