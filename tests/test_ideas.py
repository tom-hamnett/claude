"""Tests for Idea Bank and approval state machine."""

import sqlite3
from pathlib import Path

import pytest

from gtm_engine.ideas import Idea, IdeaBank, FUNNEL_LEVELS, STATES
from gtm_engine.approval import (
    transition, approve_idea, reject_idea,
    bulk_transition, ApprovalError, VALID_TRANSITIONS,
    get_allowed_transitions,
)


@pytest.fixture
def bank(tmp_path):
    """Fresh IdeaBank backed by a temp SQLite file."""
    db_path = tmp_path / "test_ideas.db"
    return IdeaBank(db_path=db_path)


def test_idea_create_and_get(bank):
    idea = Idea(
        title="Test",
        hook="A provocative hook",
        angle="An argument",
        funnel_level="umbrella",
        segment_type="hook",
    )
    idea_id = bank.create(idea)
    assert idea_id > 0

    fetched = bank.get(idea_id)
    assert fetched is not None
    assert fetched.title == "Test"
    assert fetched.funnel_level == "umbrella"
    assert fetched.status == "idea_draft"


def test_bulk_create(bank):
    ideas = [
        Idea(title=f"Idea {i}", hook=f"Hook {i}", angle=f"Angle {i}",
             funnel_level="product", segment_type="standalone")
        for i in range(5)
    ]
    ids = bank.create_many(ideas)
    assert len(ids) == 5


def test_list_with_filters(bank):
    bank.create(Idea(title="U", hook="h", angle="a", funnel_level="umbrella"))
    bank.create(Idea(title="P", hook="h", angle="a", funnel_level="product"))
    bank.create(Idea(title="F", hook="h", angle="a", funnel_level="feature"))

    umbrella = bank.list_all(funnel_level="umbrella")
    assert len(umbrella) == 1
    assert umbrella[0].title == "U"

    all_ideas = bank.list_all()
    assert len(all_ideas) == 3


def test_counts_by_status(bank):
    bank.create(Idea(title="1", hook="h", angle="a", funnel_level="umbrella"))
    bank.create(Idea(title="2", hook="h", angle="a", funnel_level="umbrella"))
    counts = bank.counts_by_status()
    assert counts["idea_draft"] == 2


def test_valid_transitions_structure():
    """Every state should have a valid transitions set (even if empty)."""
    for state in STATES:
        assert state in VALID_TRANSITIONS, f"Missing transitions for {state}"


def test_get_allowed_transitions():
    allowed = get_allowed_transitions("idea_draft")
    assert "idea_approved" in allowed
    assert "idea_rejected" in allowed
    assert "archived" in allowed


def test_invalid_transition_raises(tmp_path, monkeypatch):
    """Can't skip from idea_draft directly to deployed."""
    db_path = tmp_path / "test.db"
    test_bank = IdeaBank(db_path=db_path)

    # Monkey-patch the default bank used by approval
    import gtm_engine.approval
    original_bank = gtm_engine.approval.IdeaBank
    gtm_engine.approval.IdeaBank = lambda: test_bank

    try:
        idea_id = test_bank.create(
            Idea(title="T", hook="h", angle="a", funnel_level="umbrella")
        )
        with pytest.raises(ApprovalError):
            transition(idea_id, "deployed")
    finally:
        gtm_engine.approval.IdeaBank = original_bank
