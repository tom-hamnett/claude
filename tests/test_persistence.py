"""Tests for the durable-persistence layer (guarded, best-effort)."""

from gtm_engine import persistence


def test_noop_when_not_configured(monkeypatch):
    monkeypatch.setattr("gtm_engine.config._get", lambda k, d="": "")
    assert persistence.is_configured() is False
    ok, msg = persistence.backup()
    assert ok is False and "not configured" in msg.lower()
    ok, msg = persistence.restore()
    assert ok is False and "not configured" in msg.lower()
    ok, msg = persistence.restore_if_empty()
    assert ok is False


def test_backup_quietly_never_raises(monkeypatch):
    # Even if backup blows up internally, backup_quietly swallows it.
    monkeypatch.setattr(persistence, "backup", lambda: (_ for _ in ()).throw(RuntimeError("boom")))
    persistence.backup_quietly()  # must not raise


def test_configured_detection(monkeypatch):
    vals = {"SUPABASE_URL": "https://x.supabase.co", "SUPABASE_KEY": "k"}
    monkeypatch.setattr("gtm_engine.config._get", lambda k, d="": vals.get(k, d))
    assert persistence.is_configured() is True
