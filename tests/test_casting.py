"""Tests for the Casting library (characters + environments)."""

import pytest

from gtm_engine.casting import CastingStore, Character, Environment


@pytest.fixture
def store(tmp_path, monkeypatch):
    p = tmp_path / "cast.db"
    monkeypatch.setattr("gtm_engine.config.SQLITE_PATH", p)
    return CastingStore(p)


def test_seed_populates_starters(store):
    store.seed_if_empty()
    chars = store.list_characters()
    envs = store.list_environments()
    assert len(chars) == 3
    assert len(envs) == 5
    # exactly one default, and it sorts first
    assert chars[0].is_default
    assert sum(1 for c in chars if c.is_default) == 1


def test_seed_is_idempotent(store):
    store.seed_if_empty()
    store.seed_if_empty()
    assert len(store.list_characters()) == 3


def test_save_and_default_switch(store):
    store.seed_if_empty()
    chars = store.list_characters()
    second = chars[1]
    second.avatar_id = "av_999"
    second.is_default = True
    store.save_character(second)
    # only the newly-defaulted character is default now
    defaults = [c for c in store.list_characters() if c.is_default]
    assert len(defaults) == 1
    assert defaults[0].id == second.id
    assert store.get_default_character().avatar_id == "av_999"


def test_character_ready_needs_avatar(store):
    c = Character(name="X")
    assert not c.is_ready()
    c.avatar_id = "av_1"
    assert c.is_ready()


def test_add_environment(store):
    store.seed_if_empty()
    before = len(store.list_environments())
    store.save_environment(Environment(name="Rooftop", description="dusk city",
                                       background_type="color", background_value="#123456"))
    envs = store.list_environments()
    assert len(envs) == before + 1
    assert any(e.name == "Rooftop" for e in envs)
