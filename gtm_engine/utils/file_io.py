"""File I/O helpers for saving and loading JSON and Markdown outputs."""

import json
from pathlib import Path
from typing import Any


def save_json(data: Any, path: Path) -> Path:
    """Write data as formatted JSON. Creates parent dirs if needed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)
    return path


def load_json(path: Path) -> Any:
    """Read and parse a JSON file."""
    with open(path) as f:
        return json.load(f)


def save_markdown(content: str, path: Path) -> Path:
    """Write a markdown string to disk."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        f.write(content)
    return path
