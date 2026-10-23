"""Offline speech-to-text for the conversation recorder.

Splits audio at pauses with Silero VAD, then runs Whisper (sherpa-onnx) on each
speech segment. Output is a Markdown transcript with [mm:ss] timestamps.
Runs fully on the local machine: no audio leaves it.

Usage:
    python -I recorder/transcribe.py AUDIO [--model small.en] [--models-dir DIR] [--out FILE]

Setup (once per machine/container):
    pip install sherpa-onnx soundfile --break-system-packages
    Models download automatically into --models-dir on first run.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.request
from pathlib import Path

RELEASES = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models"
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


def ensure_models(models_dir: Path, model: str) -> tuple[Path, Path]:
    models_dir.mkdir(parents=True, exist_ok=True)
    whisper = models_dir / f"sherpa-onnx-whisper-{model}"
    if not whisper.exists():
        archive = models_dir / f"{model}.tar.bz2"
        print(f"Downloading Whisper {model}…", file=sys.stderr)
        urllib.request.urlretrieve(f"{RELEASES}/sherpa-onnx-whisper-{model}.tar.bz2", archive)
        with tarfile.open(archive) as tar:
            tar.extractall(models_dir, filter="data")
        archive.unlink()
    vad = models_dir / "silero_vad.onnx"
    if not vad.exists():
        urllib.request.urlretrieve(f"{RELEASES}/silero_vad.onnx", vad)
    return whisper, vad


def load_audio(path: Path):
    import soundfile as sf

    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "a.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path),
                        "-ar", str(SAMPLE_RATE), "-ac", "1", str(wav)], check=True)
        audio, _ = sf.read(wav, dtype="float32")
    return audio


def find_speech(audio, vad_path: Path) -> list[tuple[float, float]]:
    import sherpa_onnx

    cfg = sherpa_onnx.VadModelConfig()
    cfg.silero_vad.model = str(vad_path)
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


def transcribe(audio_path: Path, model: str, models_dir: Path) -> tuple[str, dict]:
    import sherpa_onnx

    whisper, vad_path = ensure_models(models_dir, model)
    t0 = time.time()
    audio = load_audio(audio_path)
    duration = len(audio) / SAMPLE_RATE
    chunks = merge_segments(find_speech(audio, vad_path))

    rec = sherpa_onnx.OfflineRecognizer.from_whisper(
        encoder=str(whisper / f"{model}-encoder.int8.onnx"),
        decoder=str(whisper / f"{model}-decoder.int8.onnx"),
        tokens=str(whisper / f"{model}-tokens.txt"),
        language="en",
        num_threads=4,
    )
    lines = []
    for start, end in chunks:
        s = rec.create_stream()
        s.accept_waveform(SAMPLE_RATE, audio[int(start * SAMPLE_RATE):int(end * SAMPLE_RATE)])
        rec.decode_stream(s)
        text = s.result.text.strip()
        if text:
            lines.append(f"[{fmt_ts(start)}] {text}")

    stats = {
        "duration_s": round(duration, 1),
        "speech_s": round(sum(e - s for s, e in chunks), 1),
        "segments": len(chunks),
        "model": model,
        "processing_s": round(time.time() - t0, 1),
    }
    return "\n".join(lines), stats


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("audio", type=Path)
    ap.add_argument("--model", default="small.en", help="base.en (fast) or small.en (accurate)")
    ap.add_argument("--models-dir", type=Path, default=Path.home() / ".cache" / "recorder-models")
    ap.add_argument("--out", type=Path, help="write transcript here (default: stdout)")
    args = ap.parse_args()

    text, stats = transcribe(args.audio, args.model, args.models_dir)
    print(" | ".join(f"{k}={v}" for k, v in stats.items()), file=sys.stderr)
    if args.out:
        args.out.write_text(text + "\n", encoding="utf-8")
    else:
        print(text)


if __name__ == "__main__":
    main()
