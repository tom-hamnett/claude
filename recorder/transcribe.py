"""Offline transcription and voice analysis for the conversation recorder.

Audio in; out come a speaker-labelled Markdown transcript ([mm:ss] **Tom:** …) and a
features JSON (voice, wording and turn-taking measures per speaker, plus laughter).
Everything runs on the local machine: no audio leaves it.

Usage:
    python3 -I recorder/transcribe.py AUDIO --out transcript.md --features features.json \
        [--voiceprint tom_voice.json] [--model small.en] [--speakers N] [--no-diarize] [--no-laughter]
    python3 -I recorder/transcribe.py TOM_ONLY_AUDIO --enrol tom_voice.json

Setup (once per machine/container):
    pip install sherpa-onnx soundfile praat-parselmouth --break-system-packages
    Models download automatically into --models-dir on first run.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path

if __package__ in (None, ""):  # run as a script: make `recorder` importable
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from recorder import models, prosody, speakers  # noqa: E402

SAMPLE_RATE = 16000
MAX_SEGMENT_S = 25.0  # Whisper works on <=30s windows
MERGE_GAP_S = 0.6  # join speech separated by short pauses


def fmt_ts(seconds: float) -> str:
    s = int(seconds)
    h, rem = divmod(s, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


def merge_segments(segments: list[tuple[float, float]],
                   max_len: float = MAX_SEGMENT_S,
                   gap: float = MERGE_GAP_S) -> list[tuple[float, float]]:
    """Join neighbouring (start, end) speech spans into chunks up to max_len,
    and split any single span longer than max_len."""
    out: list[tuple[float, float]] = []
    for start, end in sorted(segments):
        while end - start > max_len:
            out.append((start, start + max_len))
            start += max_len
        if out and start - out[-1][1] <= gap and end - out[-1][0] <= max_len:
            out[-1] = (out[-1][0], end)
        else:
            out.append((start, end))
    return out


def clip_spans(spans: list[tuple[float, float]], start: float, end: float) -> list[tuple[float, float]]:
    """The parts of spans that fall inside [start, end]."""
    return [(max(s, start), min(e, end)) for s, e in spans if e > start and s < end]


def join_turns(turns: list[tuple[float, float, int]], gap: float = 1.0) -> list[tuple[float, float, int]]:
    """Merge consecutive turns by the same speaker separated by less than gap seconds."""
    out: list[tuple[float, float, int]] = []
    for s, e, k in sorted(turns):
        if out and out[-1][2] == k and s - out[-1][1] < gap:
            out[-1] = (out[-1][0], max(e, out[-1][1]), k)
        else:
            out.append((s, e, k))
    return out


NOISE = re.compile(r"^\W*[\[(*][^\])*]*[\])*]?\W*$")


def is_noise(text: str) -> bool:
    """Empty text, a bracketed sound tag like "[static" or "(groaning)", or no real word."""
    return not text or bool(NOISE.match(text)) or not re.search(r"[A-Za-z]{2,}", text)


def collapse_laughter(turns: list[dict]) -> list[dict]:
    """Merge back-to-back laughter turns into one."""
    out: list[dict] = []
    for t in turns:
        if t.get("laughter") and out and out[-1].get("laughter"):
            out[-1]["end"] = max(out[-1]["end"], t["end"])
        else:
            out.append(t)
    return out


def reletter(turns: list[dict]) -> list[dict]:
    """Re-name non-Tom speakers A, B, C… in order of appearance, ignoring laughter turns."""
    mapping: dict[str, str] = {}
    for t in turns:
        spk = t["speaker"]
        if t.get("laughter") or spk == "Tom" or spk in mapping:
            continue
        mapping[spk] = f"Speaker {chr(ord('A') + len(mapping))}"
    for t in turns:
        t["speaker"] = mapping.get(t["speaker"], t["speaker"])
    return turns


def load_audio(path: Path):
    import soundfile as sf

    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "a.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path),
                        "-ar", str(SAMPLE_RATE), "-ac", "1", str(wav)], check=True)
        audio, _ = sf.read(wav, dtype="float32")
    return audio


def find_speech(audio, models_dir: Path) -> list[tuple[float, float]]:
    import sherpa_onnx

    cfg = sherpa_onnx.VadModelConfig()
    cfg.silero_vad.model = str(models.ensure("vad", models_dir))
    cfg.silero_vad.min_silence_duration = 0.4
    cfg.silero_vad.min_speech_duration = 0.25
    cfg.silero_vad.max_speech_duration = MAX_SEGMENT_S
    cfg.sample_rate = SAMPLE_RATE
    vad = sherpa_onnx.VoiceActivityDetector(cfg, buffer_size_in_seconds=60)

    spans: list[tuple[float, float]] = []
    window = cfg.silero_vad.window_size

    def drain():
        while not vad.empty():
            seg = vad.front
            start = seg.start / SAMPLE_RATE
            spans.append((start, start + len(seg.samples) / SAMPLE_RATE))
            vad.pop()

    for i in range(0, len(audio), window):
        vad.accept_waveform(audio[i:i + window])
        drain()
    vad.flush()
    drain()
    return spans


def recogniser(model: str, models_dir: Path):
    import sherpa_onnx

    d = models.ensure(f"whisper-{model}", models_dir)
    return sherpa_onnx.OfflineRecognizer.from_whisper(
        encoder=str(d / f"{model}-encoder.int8.onnx"),
        decoder=str(d / f"{model}-decoder.int8.onnx"),
        tokens=str(d / f"{model}-tokens.txt"),
        language="en",
        num_threads=4,
    )


def analyse(audio_path: Path, model: str, models_dir: Path, voiceprint_path: Path | None,
            num_speakers: int, diarize: bool, laughter: bool) -> tuple[str, dict]:
    t0 = time.time()
    audio = load_audio(audio_path)
    duration = len(audio) / SAMPLE_RATE
    speech = find_speech(audio, models_dir)

    raw = speakers.diarize(audio, models_dir, num_speakers) if diarize else []
    if not raw:  # no diarization, or it found nothing: treat as one speaker
        raw = [(s, e, 0) for s, e in speech]
    raw = join_turns(raw)
    voiceprint = speakers.load_voiceprint(voiceprint_path)
    names, scores = speakers.name_speakers(audio, raw, models_dir, voiceprint)
    tom_scores = [v for k, v in scores.items() if names[k] == "Tom"]
    other_scores = [v for k, v in scores.items() if names[k] != "Tom"]
    match = {"tom": max(tom_scores, default=None), "best_other": max(other_scores, default=None)}
    # clusters that share a name (e.g. two "Tom" clusters) become one speaker
    ids = {n: i for i, n in enumerate(dict.fromkeys(names.values()))}
    raw = join_turns([(s, e, ids[names[k]]) for s, e, k in raw])
    names = {i: n for n, i in ids.items()}

    hits = prosody.laughter_hits(audio, models_dir) if laughter else []
    rec = recogniser(model, models_dir)
    turns = []
    for start, end, spk in raw:
        parts = []
        for cs, ce in merge_segments(clip_spans(speech, start, end)):
            s = rec.create_stream()
            s.accept_waveform(SAMPLE_RATE, audio[int(cs * SAMPLE_RATE):int(ce * SAMPLE_RATE)])
            rec.decode_stream(s)
            parts.append(s.result.text.strip())
        text = " ".join(p for p in parts if p)
        if laughter and prosody.is_laughter_turn(start, end, text, hits):
            turns.append({"start": round(start, 2), "end": round(end, 2), "speaker": "(laughter)",
                          "text": "(laughter)", "laughter": True})
            continue
        if is_noise(text):
            continue
        turn = {"start": round(start, 2), "end": round(end, 2), "speaker": names[spk], "text": text}
        turn.update(prosody.turn_acoustics(audio[int(start * SAMPLE_RATE):int(end * SAMPLE_RATE)]))
        turn.update(prosody.text_markers(text))
        turns.append(turn)

    turns = reletter(collapse_laughter(turns))
    speech = [t for t in turns if not t.get("laughter")]
    laughs = prosody.attribute_laughter(prosody.laugh_events(hits), turns)

    lines = [f"[{fmt_ts(t['start'])}] _(laughter)_" if t.get("laughter")
             else f"[{fmt_ts(t['start'])}] **{t['speaker']}:** {t['text']}" for t in turns]
    features = {
        "file": audio_path.name,
        "duration_s": round(duration, 1),
        "model": model,
        "speakers": sorted({t["speaker"] for t in speech}),
        "voiceprint_match": match if scores else None,
        "speaker_summary": prosody.speaker_summary(speech),
        "interaction": prosody.interaction(speech),
        "laughter": laughs,
        "turns": turns,
        "processing_s": round(time.time() - t0, 1),
    }
    return "\n".join(lines), features


def enrol(audio_path: Path, out: Path, models_dir: Path) -> None:
    """Build Tom's voiceprint from a recording where only Tom speaks."""
    audio = load_audio(audio_path)
    vec = speakers.embed(audio, find_speech(audio, models_dir), models_dir)
    if vec is None:
        sys.exit("Not enough clear speech to build a voiceprint (need a few seconds).")
    speakers.save_voiceprint(vec, out)
    print(f"Voiceprint saved to {out}", file=sys.stderr)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("audio", type=Path)
    ap.add_argument("--model", default="small.en", help="base.en (fast) or small.en (accurate)")
    ap.add_argument("--models-dir", type=Path, default=models.DEFAULT_DIR)
    ap.add_argument("--out", type=Path, help="transcript Markdown (default: stdout)")
    ap.add_argument("--features", type=Path, help="write voice/interaction features JSON here")
    ap.add_argument("--voiceprint", type=Path, help="Tom's voiceprint JSON, to label him by name")
    ap.add_argument("--speakers", type=int, default=-1, help="number of speakers if known")
    ap.add_argument("--no-diarize", action="store_true", help="skip speaker separation")
    ap.add_argument("--no-laughter", action="store_true", help="skip laughter detection")
    ap.add_argument("--enrol", type=Path, metavar="VOICEPRINT",
                    help="build Tom's voiceprint from AUDIO (Tom only) and exit")
    args = ap.parse_args()

    if args.enrol:
        enrol(args.audio, args.enrol, args.models_dir)
        return
    text, features = analyse(args.audio, args.model, args.models_dir, args.voiceprint,
                             args.speakers, not args.no_diarize, not args.no_laughter)
    print(f"duration_s={features['duration_s']} speakers={features['speakers']} "
          f"match={features['voiceprint_match']} processing_s={features['processing_s']}", file=sys.stderr)
    if args.features:
        args.features.write_text(json.dumps(features, indent=1), encoding="utf-8")
    if args.out:
        args.out.write_text(text + "\n", encoding="utf-8")
    else:
        print(text)


if __name__ == "__main__":
    main()
