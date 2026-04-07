"""Tests for Discovery Engine models."""

from gtm_engine.discovery.models import GTMBrief, ProductInfo


def test_gtm_brief_defaults():
    """A fresh brief should have all fields with sensible defaults."""
    brief = GTMBrief()
    assert brief.version == "1.0"
    assert brief.product.name == ""
    assert brief.founder.expertise == []
    assert brief.constraints.no_paid_ads is True
    assert brief.brand.edginess_level == 5


def test_brief_serialisation_roundtrip():
    """Brief should survive JSON serialisation and deserialisation."""
    brief = GTMBrief()
    brief.product = ProductInfo(
        name="Diagnostic Engine",
        description="Outside-in company analysis",
        core_value_prop="Automated business diagnostics from public data",
        current_stage="mvp",
        key_features=["peer benchmarking", "public data only"],
        pricing_model="subscription + white-label",
    )
    data = brief.model_dump()
    restored = GTMBrief(**data)
    assert restored.product.name == "Diagnostic Engine"
    assert len(restored.product.key_features) == 2
