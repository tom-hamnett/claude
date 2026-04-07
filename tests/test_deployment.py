"""Tests for deployment connectors and scheduler."""

from gtm_engine.deployment.channels import get_connector, CONNECTORS


def test_connector_registry_complete():
    """All expected channels should have connectors."""
    expected = {"email", "reddit", "linkedin", "twitter"}
    assert expected == set(CONNECTORS.keys())


def test_get_connector_by_name():
    """Should return the correct connector class."""
    connector = get_connector("email")
    assert connector.channel_name == "email"


def test_get_connector_partial_match():
    """Should match partial channel names."""
    connector = get_connector("LinkedIn Posts")
    assert connector.channel_name == "linkedin"


def test_get_connector_unknown():
    try:
        get_connector("tiktok")
        assert False, "Should raise ValueError"
    except ValueError as e:
        assert "tiktok" in str(e)


def test_connector_unauthenticated_publish():
    """Publish without credentials should return error, not crash."""
    connector = get_connector("email")
    from gtm_engine.content_factory.models import ContentPiece
    piece = ContentPiece(title="Test", body="Test body")
    result = connector.publish(piece)
    assert result["status"] == "error"
