"""Tests for the conversation recorder's pure helpers."""

import numpy as np

from recorder import prosody
from recorder.transcribe import (clip_spans, collapse_laughter, fmt_ts, is_noise, join_turns,
                                 merge_segments, reletter)


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


def test_clip_spans():
    assert clip_spans([(0, 5), (6, 10), (12, 14)], 4, 11) == [(4, 5), (6, 10)]


def test_join_turns_same_speaker_only():
    assert join_turns([(0, 2, 0), (2.5, 4, 0), (4.2, 6, 1)]) == [(0, 4, 0), (4.2, 6, 1)]


def test_is_noise():
    assert is_noise("[static")
    assert is_noise("(groaning)")
    assert is_noise("*s")
    assert not is_noise("Yes, let's do it.")


def test_collapse_laughter_and_reletter():
    turns = [{"speaker": "x", "text": "hi there", "start": 0, "end": 1},
             {"speaker": "(laughter)", "laughter": True, "start": 1, "end": 2},
             {"speaker": "(laughter)", "laughter": True, "start": 2, "end": 3},
             {"speaker": "Tom", "text": "ok", "start": 3, "end": 4},
             {"speaker": "y", "text": "sure", "start": 4, "end": 5}]
    out = reletter(collapse_laughter(turns))
    assert [t["speaker"] for t in out] == ["Speaker A", "(laughter)", "Tom", "Speaker B"]
    assert out[1]["end"] == 3


def test_is_question_without_question_mark():
    assert prosody.is_question("Right. What do you think about the pricing")
    assert prosody.is_question("Is that okay?")
    assert not prosody.is_question("We will ship it on Friday.")


def test_text_markers_counts():
    m = prosody.text_markers("Um I think maybe we should, you know, wait. Sorry.")
    assert m["words"] == 10
    assert m["apologies"] == 1
    assert m["fillers_per_100w"] > 0 and m["hedges_per_100w"] > 0


def test_just_is_not_a_hedge():
    assert prosody.text_markers("I just wanted to say thanks")["hedges_per_100w"] == 0


def test_interaction_interruptions_vs_backchannels():
    turns = [{"speaker": "A", "start": 0, "end": 10, "words": 30},
             {"speaker": "Tom", "start": 9, "end": 9.5, "words": 1},   # "yeah" over A
             {"speaker": "Tom", "start": 9.6, "end": 15, "words": 20},  # takes over mid-sentence
             {"speaker": "A", "start": 15.4, "end": 20, "words": 12}]
    s = prosody.interaction(turns)
    assert s["Tom"]["backchannels"] == 1
    assert s["Tom"]["interruptions"] == 1
    assert s["A"]["median_response_gap_s"] == 0.4
    assert abs(s["Tom"]["talk_share"] + s["A"]["talk_share"] - 1) < 0.02


def test_laugh_events_and_detection_turn():
    hits = [(10.0, 0.9), (11.0, 0.5), (20.0, 0.4)]
    ev = prosody.laugh_events(hits)
    assert [(e["start"], e["end"]) for e in ev] == [(10.0, 11.0), (20.0, 20.0)]
    assert prosody.is_laughter_turn(9.8, 11.2, "", hits)
    assert prosody.is_laughter_turn(30, 31, "(laughing)", hits)
    assert not prosody.is_laughter_turn(0, 8, "Let's begin the meeting now", hits)


def test_turn_acoustics_on_tone():
    t = np.arange(0, 2.0, 1 / 16000)
    tone = (0.3 * np.sin(2 * np.pi * 120 * t)).astype(np.float32)
    a = prosody.turn_acoustics(tone)
    assert abs(a["pitch_median_hz"] - 120) < 3
    assert a["pitch_range_st"] < 0.5


def test_label_speech_gives_each_stretch_one_speaker():
    from recorder.transcribe import label_speech
    speech = [(0.0, 10.0)]
    raw = [(0.0, 6.0, 0), (5.0, 10.0, 1)]  # overlap 5-6 s
    out = label_speech(speech, raw)
    assert [k for _, _, k in out] == [0, 1]
    assert abs(out[0][1] - out[1][0]) < 1e-6  # no overlap, no gap


def test_overlap_counts_split_backchannels_from_interruptions():
    from recorder.transcribe import overlap_counts
    raw = [(0.0, 20.0, 0), (5.0, 5.8, 1), (10.0, 18.0, 1)]
    c = overlap_counts(raw, {0: "Tom", 1: "Speaker A"})
    assert c["Speaker A"] == {"interruptions": 1, "backchannels": 1}
