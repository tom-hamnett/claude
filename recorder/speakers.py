"""Who spoke when: offline speaker diarization plus a voiceprint to find Tom."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from recorder import models

SAMPLE_RATE = 16000
TOM_MATCH = 0.45  # best-matching cluster at or above this is Tom
TOM_ALSO = 0.5  # any other cluster this close is Tom too (diarization can split one voice)
TINY_S = 3.0  # clusters with less speech than this are too short to fingerprint


def diarize(audio: np.ndarray, models_dir: Path, num_speakers: int = -1,
            threshold: float = 0.6) -> list[tuple[float, float, int]]:
    """Return (start_s, end_s, speaker_index) turns, sorted by start."""
    import sherpa_onnx

    cfg = sherpa_onnx.OfflineSpeakerDiarizationConfig(
        segmentation=sherpa_onnx.OfflineSpeakerSegmentationModelConfig(
            pyannote=sherpa_onnx.OfflineSpeakerSegmentationPyannoteModelConfig(
                model=str(models.ensure("segmentation", models_dir))),
            num_threads=4),
        embedding=sherpa_onnx.SpeakerEmbeddingExtractorConfig(
            model=str(models.ensure("speaker-embedding", models_dir)), num_threads=4),
        clustering=sherpa_onnx.FastClusteringConfig(num_clusters=num_speakers, threshold=threshold),
        min_duration_on=0.3,
        min_duration_off=0.5,
    )
    sd = sherpa_onnx.OfflineSpeakerDiarization(cfg)
    result = sd.process(audio).sort_by_start_time()
    return [(r.start, r.end, r.speaker) for r in result]


def _extractor(models_dir: Path):
    import sherpa_onnx

    return sherpa_onnx.SpeakerEmbeddingExtractor(sherpa_onnx.SpeakerEmbeddingExtractorConfig(
        model=str(models.ensure("speaker-embedding", models_dir)), num_threads=4))


def embed(audio: np.ndarray, spans: list[tuple[float, float]], models_dir: Path,
          extractor=None) -> np.ndarray | None:
    """Mean L2-normalised embedding over the given spans (up to ~60 s of speech)."""
    ex = extractor or _extractor(models_dir)
    vecs, total = [], 0.0
    for start, end in sorted(spans, key=lambda s: s[0] - s[1]):  # longest first
        if end - start < 1.0 or total > 60:
            continue
        s = ex.create_stream()
        s.accept_waveform(SAMPLE_RATE, audio[int(start * SAMPLE_RATE):int(end * SAMPLE_RATE)])
        s.input_finished()
        v = np.array(ex.compute(s), dtype=np.float32)
        vecs.append(v / np.linalg.norm(v))
        total += end - start
    if not vecs:
        return None
    mean = np.mean(vecs, axis=0)
    return mean / np.linalg.norm(mean)


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def name_speakers(audio: np.ndarray, turns: list[tuple[float, float, int]], models_dir: Path,
                  voiceprint: np.ndarray | None) -> tuple[dict[int, str], dict[int, float]]:
    """Map speaker indices to names: clusters matching the voiceprint are "Tom",
    the rest "Speaker A", "Speaker B"… in order of first appearance."""
    order = list(dict.fromkeys(spk for _, _, spk in turns))
    scores: dict[int, float] = {}
    if voiceprint is not None:
        ex = _extractor(models_dir)
        for spk in order:
            e = embed(audio, [(s, e) for s, e, k in turns if k == spk], models_dir, ex)
            if e is not None:
                scores[spk] = round(cosine(e, voiceprint), 3)
    toms = {k for k, v in scores.items() if v >= TOM_ALSO}
    if scores and max(scores.values()) >= TOM_MATCH:
        toms.add(max(scores, key=scores.get))
    talk = {k: sum(e - s for s, e, j in turns if j == k) for k in order}
    tiny = {k for k in order if k not in scores and talk[k] < TINY_S} if scores else set()
    names, letter = {}, ord("A")
    for spk in order:
        if spk in toms:
            names[spk] = "Tom"
        elif spk not in tiny:
            names[spk] = f"Speaker {chr(letter)}"
            letter += 1
    # a fragment too short to fingerprint goes to whoever spoke nearest to it
    for spk in tiny:
        s0 = min(s for s, _, k in turns if k == spk)
        near = min((t for t in turns if t[2] not in tiny), key=lambda t: abs(t[0] - s0), default=None)
        names[spk] = names[near[2]] if near else "Speaker ?"
    return names, scores


def save_voiceprint(vec: np.ndarray, path: Path) -> None:
    path.write_text(json.dumps({"model": models.MODELS["speaker-embedding"][1],
                                "embedding": [round(float(x), 6) for x in vec]}))


def load_voiceprint(path: Path | None) -> np.ndarray | None:
    if not path or not path.exists():
        return None
    return np.array(json.loads(path.read_text())["embedding"], dtype=np.float32)
