"""Tests for the conversation recorder's pure helpers."""

from recorder.transcribe import fmt_ts, merge_segments


def test_fmt_ts():
    assert fmt_ts(0) == "00:00"
    assert fmt_ts(75.9) == "01:15"
    assert fmt_ts(3725) == "1:02:05"


def test_merge_joins_short_gaps():
    assert merge_segments([(0, 3), (3.2, 6)]) == [(0, 6)]


def test_merge_keeps_long_gaps_apart():
    assert merge_segments([(0, 3), (5, 6)]) == [(0, 3), (5, 6)]


def test_merge_respects_max_length():
    assert merge_segments([(0, 20), (20.1, 30)], max_len=25) == [(0, 20), (20.1, 30)]


def test_merge_splits_overlong_span():
    assert merge_segments([(0, 60)], max_len=25) == [(0, 25), (25, 50), (50, 60)]


def test_merge_sorts_input():
    assert merge_segments([(10, 12), (0, 2)]) == [(0, 2), (10, 12)]
