"""Tests for the Discovery interview logic."""

from gtm_engine.discovery.models import GTMBrief
from gtm_engine.discovery.interview import apply_brief_updates


def test_apply_brief_updates_merges_product():
    """Updates should merge into existing brief without wiping other fields."""
    brief = GTMBrief()
    brief.product.name = "Existing Name"

    updates = {"product": {"description": "New description"}}
    updated = apply_brief_updates(brief, updates)

    assert updated.product.name == "Existing Name"
    assert updated.product.description == "New description"


def test_apply_brief_updates_extends_lists():
    """List fields should be extended, not replaced."""
    brief = GTMBrief()
    brief.product.key_features = ["feature1"]

    updates = {"product": {"key_features": ["feature2"]}}
    updated = apply_brief_updates(brief, updates)

    assert "feature1" in updated.product.key_features
    assert "feature2" in updated.product.key_features


def test_apply_brief_updates_no_duplicates():
    """Extending lists should not create duplicates."""
    brief = GTMBrief()
    brief.product.key_features = ["feature1"]

    updates = {"product": {"key_features": ["feature1", "feature2"]}}
    updated = apply_brief_updates(brief, updates)

    assert updated.product.key_features.count("feature1") == 1
    assert len(updated.product.key_features) == 2
