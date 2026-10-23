"""How things were said: per-turn voice measures, per-speaker summaries, interaction and laughter.

All numbers are approximate and best read against the same speaker's own baseline over time.
"""

from __future__ import annotations

import re
from pathlib import Path

import numpy as np

from recorder import models

SAMPLE_RATE = 16000
PAUSE_MIN_S = 0.25  # silent stretch inside a turn counted as a pause
LONG_PAUSE_S = 1.0
UPTALK_ST = 2.0  # final pitch rise (semitones) that counts as rising intonation

# "sort of"/"kind of" count as hedges only; Whisper often drops um/uh, so fillers are a floor
FILLERS = re.compile(r"\b(um+|uh+|erm+|er|ah+|hmm+|you know|i mean)\b", re.I)
HEDGES = re.compile(
    r"\b(i think|i guess|i suppose|i feel like|maybe|perhaps|probably|possibly|a bit|"
    r"a little|sort of|kind of|might|could be|hopefully|i'm not sure|does that make sense)\b", re.I)
CERTAINTY = re.compile(r"\b(will|definitely|clearly|certainly|absolutely|we need to|i want|"
                       r"i recommend|i've decided|the answer is|the point is)\b", re.I)
# "just" is left out of hedges: in British speech it's mostly politeness
QUESTION_START = re.compile(
    r"^(what|why|how|when|where|who|which|whose|do|does|did|are|is|was|were|can|could|would|"
    r"will|should|shall|have|has|had|may|might|isn't|aren't|don't|didn't|won't|wouldn't)\b", re.I)
TAG_QUESTION = re.compile(r"\b(right|yeah|no|isn't it|don't you|wouldn't you|ok|okay)\s*[?.]?$", re.I)
BACKCHANNEL_MAX_WORDS = 3  # "yeah", "exactly", "mm right": support, not a takeover
APOLOGIES = re.compile(r"\b(sorry|apologies|i apologise|i apologize)\b", re.I)
LAUGH_LABELS = {"Laughter", "Belly laugh", "Chuckle, chortle", "Giggle", "Snicker"}


def semitones(hz: np.ndarray) -> np.ndarray:
    return 12 * np.log2(hz / 100.0)


def count_words(text: str) -> int:
    return len(re.findall(r"[A-Za-z0-9']+", text))


def is_question(text: str) -> bool:
    """Ends with "?", or the last sentence starts like a question (Whisper often drops "?")."""
    text = text.strip()
    if text.endswith("?"):
        return True
    last = re.split(r"(?<=[.!?])\s+", text)[-1]
    return bool(QUESTION_START.match(last)) and count_words(last) >= 3 and not last.endswith("!")


def text_markers(text: str) -> dict:
    words = max(count_words(text), 1)
    per100 = lambda rx: round(100 * len(rx.findall(text)) / words, 1)
    return {
        "words": count_words(text),
        "fillers_per_100w": per100(FILLERS),
        "hedges_per_100w": per100(HEDGES),
        "certainty_per_100w": per100(CERTAINTY),
        "apologies": len(APOLOGIES.findall(text)),
        "is_question": is_question(text),
    }


def turn_acoustics(samples: np.ndarray) -> dict:
    """Pitch, loudness, pauses and final-contour for one turn of speech."""
    import parselmouth

    duration = len(samples) / SAMPLE_RATE
    out: dict = {"duration_s": round(duration, 2)}
    if duration < 0.5:
        return out
    snd = parselmouth.Sound(samples.astype(np.float64), sampling_frequency=SAMPLE_RATE)

    pitch = snd.to_pitch_ac(time_step=0.01, pitch_floor=60, pitch_ceiling=400)
    f0 = pitch.selected_array["frequency"]
    times = pitch.xs()
    voiced = f0 > 0
    if voiced.sum() >= 10:
        # drop octave jumps and creak: keep values within ~an octave of the turn median
        med = np.median(f0[voiced])
        voiced &= (f0 > med / 1.8) & (f0 < med * 1.8)
    if voiced.sum() >= 10:
        st = semitones(f0[voiced])
        out["pitch_median_hz"] = round(float(np.median(f0[voiced])), 1)
        out["pitch_range_st"] = round(float(np.percentile(st, 90) - np.percentile(st, 10)), 2)
        out["pitch_sd_st"] = round(float(np.std(st)), 2)
        vt = times[voiced]
        end = vt[-1]
        tail = st[vt >= end - 0.3]
        body = st[(vt < end - 0.3) & (vt >= end - 1.3)]
        if len(tail) >= 5 and len(body) >= 5:
            out["final_rise_st"] = round(float(np.median(tail) - np.median(body)), 2)

    intensity = snd.to_intensity(minimum_pitch=60, time_step=0.01)
    db = intensity.values[0]
    if len(db):
        loud = db[db > db.max() - 25]
        out["loudness_db"] = round(float(np.mean(loud)), 1)
        out["loudness_sd_db"] = round(float(np.std(loud)), 2)
        silent = db < db.max() - 25
        pauses, run = [], 0
        for s in silent:
            if s:
                run += 1
            else:
                if run * 0.01 >= PAUSE_MIN_S:
                    pauses.append(run * 0.01)
                run = 0
        out["pauses"] = len(pauses)
        out["long_pauses"] = sum(p >= LONG_PAUSE_S for p in pauses)
        out["pause_time_s"] = round(sum(pauses), 2)
    return out


def laughter_hits(audio: np.ndarray, models_dir: Path, window_s: float = 2.0,
                  hop_s: float = 1.0, min_prob: float = 0.3) -> list[tuple[float, float]]:
    """(centre_time_s, probability) for each 1 s hop whose 2 s window contains laughter."""
    import sherpa_onnx

    d = models.ensure("audio-tagging", models_dir)
    tagger = sherpa_onnx.AudioTagging(sherpa_onnx.AudioTaggingConfig(
        model=sherpa_onnx.AudioTaggingModelConfig(
            zipformer=sherpa_onnx.OfflineZipformerAudioTaggingModelConfig(model=str(d / "model.int8.onnx")),
            num_threads=4),
        labels=str(d / "class_labels_indices.csv"), top_k=10))
    hits = []
    win, hop = int(window_s * SAMPLE_RATE), int(hop_s * SAMPLE_RATE)
    for i in range(0, max(len(audio) - win, 0) + 1, hop):
        s = tagger.create_stream()
        s.accept_waveform(SAMPLE_RATE, audio[i:i + win])
        p = max((e.prob for e in tagger.compute(s) if e.name in LAUGH_LABELS), default=0.0)
        if p >= min_prob:
            hits.append((round(i / SAMPLE_RATE + window_s / 2, 1), round(p, 2)))
    return hits


def laugh_events(hits: list[tuple[float, float]], join_s: float = 1.5) -> list[dict]:
    """Collapse neighbouring hits into laughter events {start, end, prob}."""
    events: list[dict] = []
    for t, p in hits:
        if events and t - events[-1]["end"] <= join_s:
            events[-1]["end"] = t
            events[-1]["prob"] = max(events[-1]["prob"], p)
        else:
            events.append({"start": t, "end": t, "prob": p})
    return events


LAUGH_TEXT = re.compile(r"^\W*\(?\s*(laugh|giggl|chuckl|snicker)\w*\s*\)?\W*$", re.I)


def is_laughter_turn(start: float, end: float, text: str, hits: list[tuple[float, float]]) -> bool:
    """True if a 'turn' is really laughter: mostly laugh windows, or transcribed as (laughing)."""
    if LAUGH_TEXT.match(text or ""):
        return True
    span = max(end - start, 1.0)
    covered = sum(1 for t, _ in hits if start - 0.5 <= t <= end + 0.5)
    return covered >= 0.6 * span


def interaction(turns: list[dict], overlaps: dict | None = None) -> dict:
    """Turn-taking per speaker: airtime, interruptions, overlaps, response gaps."""
    stats: dict[str, dict] = {}
    total = sum(t["end"] - t["start"] for t in turns) or 1.0
    for i, t in enumerate(turns):
        s = stats.setdefault(t["speaker"], {"turns": 0, "talk_s": 0.0, "interruptions": 0,
                                            "backchannels": 0, "gaps": [], "questions": 0,
                                            "longest_turn_s": 0.0})
        s["turns"] += 1
        s["talk_s"] += t["end"] - t["start"]
        s["longest_turn_s"] = max(s["longest_turn_s"], t["end"] - t["start"])
        s["questions"] += int(t.get("is_question", False))
        prev = next((p for p in reversed(turns[:i]) if p["speaker"] != t["speaker"]), None)
        if prev:
            gap = t["start"] - prev["end"]
            if gap < -0.3:  # started while the other person was still speaking
                if t.get("words", 99) <= BACKCHANNEL_MAX_WORDS:
                    s["backchannels"] += 1
                else:
                    s["interruptions"] += 1
            elif gap < 5:
                s["gaps"].append(gap)
    for name, c in (overlaps or {}).items():
        if name in stats:  # overlaps seen in raw diarization replace the turn-gap estimate
            stats[name]["interruptions"] = c["interruptions"]
            stats[name]["backchannels"] = c["backchannels"]
    for s in stats.values():
        s["talk_share"] = round(s["talk_s"] / total, 2)
        s["talk_s"] = round(s["talk_s"], 1)
        s["mean_turn_s"] = round(s["talk_s"] / s["turns"], 1)
        s["longest_turn_s"] = round(s["longest_turn_s"], 1)
        s["median_response_gap_s"] = round(float(np.median(s["gaps"])), 2) if s["gaps"] else None
        del s["gaps"]
    return stats


def speaker_summary(turns: list[dict]) -> dict:
    """Duration-weighted voice summary per speaker."""
    out: dict[str, dict] = {}
    for spk in dict.fromkeys(t["speaker"] for t in turns):
        ts = [t for t in turns if t["speaker"] == spk]
        dur = sum(t["duration_s"] for t in ts) or 1.0
        words = sum(t["words"] for t in ts)
        pause = sum(t.get("pause_time_s", 0) for t in ts)

        def wavg(key):
            pairs = [(t[key], t["duration_s"]) for t in ts if key in t]
            w = sum(d for _, d in pairs)
            return round(sum(v * d for v, d in pairs) / w, 2) if w else None

        statements = [t for t in ts if "final_rise_st" in t and not t["is_question"]]
        pitched = [t["pitch_median_hz"] for t in ts if "pitch_median_hz" in t]
        third = len(pitched) // 3
        out[spk] = {
            "words": words,
            "speaking_rate_wpm": round(60 * words / dur),
            "articulation_rate_wpm": round(60 * words / max(dur - pause, 1.0)),
            "pitch_median_hz": wavg("pitch_median_hz"),
            "pitch_range_st": wavg("pitch_range_st"),
            "pitch_sd_st": wavg("pitch_sd_st"),
            "loudness_db": wavg("loudness_db"),
            "loudness_sd_db": wavg("loudness_sd_db"),
            "pauses_per_min": round(60 * sum(t.get("pauses", 0) for t in ts) / dur, 1),
            "long_pauses": sum(t.get("long_pauses", 0) for t in ts),
            "uptalk_share": round(sum(t["final_rise_st"] >= UPTALK_ST for t in statements)
                                  / len(statements), 2) if statements else None,
            "fillers_per_100w": wavg("fillers_per_100w"),
            "hedges_per_100w": wavg("hedges_per_100w"),
            "certainty_per_100w": wavg("certainty_per_100w"),
            "apologies": sum(t["apologies"] for t in ts),
            # rise (+) or fall (-) in semitones from the first to the last third of their turns
            "pitch_drift_st": round(float(np.median(semitones(np.array(pitched[-third:])))
                                          - np.median(semitones(np.array(pitched[:third])))), 2)
                              if third >= 2 else None,
        }
    return out


def attribute_laughter(events: list[dict], turns: list[dict]) -> list[dict]:
    """Add who was talking just before each laugh (what got the laugh) and who talked over it.
    Who actually laughed can't be told reliably from audio alone."""
    speech = [t for t in turns if not t.get("laughter")]
    for ev in events:
        before = max((x for x in speech if x["start"] < ev["start"]), key=lambda x: x["start"], default=None)
        over = [x["speaker"] for x in speech if x["start"] <= ev["end"] and x["end"] >= ev["start"]]
        ev["after_speaker"] = before["speaker"] if before else None
        ev["over_speech_by"] = sorted(set(over))
    return events
