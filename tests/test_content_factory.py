"""Tests for Content Factory models and routing logic."""

from gtm_engine.content_factory.models import ContentPiece, ContentTag
from gtm_engine.content_factory.templates import get_template, TEMPLATES
from gtm_engine.content_factory.router import _match_content_type


def test_content_piece_defaults():
    piece = ContentPiece()
    assert piece.status == "draft"
    assert piece.variants == []
    assert piece.tags.ai_provider == ""


def test_content_tag_structure():
    tag = ContentTag(
        segment="solo consultants",
        channel="linkedin",
        content_type="thought_leadership",
        strategic_objective="awareness",
        edginess_principle="uncomfortable_truth",
        ai_provider="claude",
        ai_model="claude-sonnet-4-20250514",
    )
    assert tag.segment == "solo consultants"
    assert tag.ai_provider == "claude"


def test_get_template_known_type():
    template = get_template("thought_leadership")
    assert template["provider"] == "claude"
    assert "system" in template


def test_get_template_unknown_type():
    try:
        get_template("nonexistent_type")
        assert False, "Should have raised ValueError"
    except ValueError as e:
        assert "nonexistent_type" in str(e)


def test_routing_table_coverage():
    """Every template should have a provider."""
    for name, config in TEMPLATES.items():
        assert "provider" in config, f"Template {name} missing provider"
        assert config["provider"] in ("claude", "openai", "gemini"), f"Unknown provider for {name}"


def test_match_content_type_direct():
    """Direct match should work for template names."""
    result = _match_content_type(["thought_leadership"], "blog")
    assert result == "thought_leadership"


def test_match_content_type_channel_fallback():
    """Unknown content types should fall back to channel defaults."""
    result = _match_content_type(["daily insights"], "linkedin")
    assert result == "linkedin_post"


def test_match_content_type_keyword_fallback():
    """Should match on keywords when no direct or channel match."""
    result = _match_content_type(["in-depth thought piece"], "website")
    assert result == "thought_leadership"


def test_match_content_type_ultimate_fallback():
    """Should default to thought_leadership when nothing matches."""
    result = _match_content_type(["zzz_unknown"], "zzz_channel")
    assert result == "thought_leadership"
