"""Tests for utility modules."""

import json
from pathlib import Path

from gtm_engine.utils.file_io import save_json, load_json, save_markdown
from gtm_engine.utils.logger import log_decision


def test_save_and_load_json(tmp_path: Path):
    data = {"key": "value", "nested": {"a": 1}}
    path = tmp_path / "sub" / "test.json"
    save_json(data, path)

    assert path.exists()
    loaded = load_json(path)
    assert loaded == data


def test_save_markdown(tmp_path: Path):
    content = "# Title\n\nSome content"
    path = tmp_path / "test.md"
    save_markdown(content, path)

    assert path.exists()
    assert path.read_text() == content


def test_log_decision(tmp_path: Path):
    """Decision logging should append JSONL entries."""
    import gtm_engine.utils.logger as logger_mod
    original_dir = logger_mod.LOGS_DIR

    # Redirect to tmp
    logger_mod.LOGS_DIR = tmp_path
    try:
        log_decision("test", "Test decision", "Because testing", {"extra": True})
        log_decision("test", "Second decision", "Also testing")

        log_path = tmp_path / "decisions.jsonl"
        assert log_path.exists()

        lines = log_path.read_text().strip().split("\n")
        assert len(lines) == 2

        entry = json.loads(lines[0])
        assert entry["category"] == "test"
        assert entry["decision"] == "Test decision"
        assert entry["data"]["extra"] is True
    finally:
        logger_mod.LOGS_DIR = original_dir
