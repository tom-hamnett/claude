"""Download-on-first-use registry for the recorder's offline models (sherpa-onnx releases)."""

from __future__ import annotations

import sys
import tarfile
import urllib.request
from pathlib import Path

BASE = "https://github.com/k2-fsa/sherpa-onnx/releases/download"
DEFAULT_DIR = Path.home() / ".cache" / "recorder-models"

# name -> (release path, path inside models dir once ready)
MODELS = {
    "whisper-base.en": ("asr-models/sherpa-onnx-whisper-base.en.tar.bz2", "sherpa-onnx-whisper-base.en"),
    "whisper-small.en": ("asr-models/sherpa-onnx-whisper-small.en.tar.bz2", "sherpa-onnx-whisper-small.en"),
    "vad": ("asr-models/silero_vad.onnx", "silero_vad.onnx"),
    "segmentation": ("speaker-segmentation-models/sherpa-onnx-pyannote-segmentation-3-0.tar.bz2",
                     "sherpa-onnx-pyannote-segmentation-3-0/model.onnx"),
    # sic: the upstream release tag is misspelt
    "speaker-embedding": ("speaker-recongition-models/nemo_en_titanet_small.onnx", "nemo_en_titanet_small.onnx"),
    "audio-tagging": ("audio-tagging-models/sherpa-onnx-zipformer-small-audio-tagging-2024-04-15.tar.bz2",
                      "sherpa-onnx-zipformer-small-audio-tagging-2024-04-15"),
}


def ensure(name: str, models_dir: Path = DEFAULT_DIR) -> Path:
    release, local = MODELS[name]
    target = models_dir / local
    if target.exists():
        return target
    models_dir.mkdir(parents=True, exist_ok=True)
    print(f"Downloading model {name}…", file=sys.stderr)
    download = models_dir / Path(release).name
    urllib.request.urlretrieve(f"{BASE}/{release}", download)
    if download.name.endswith(".tar.bz2"):
        with tarfile.open(download) as tar:
            tar.extractall(models_dir, filter="data")
        download.unlink()
    return target
