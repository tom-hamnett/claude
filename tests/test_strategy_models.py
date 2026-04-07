"""Tests for Strategy Engine models."""

from gtm_engine.strategy.models import (
    GTMStrategy, SegmentProfile, ChannelStrategy, EdginessFramework,
)


def test_segment_profile_defaults():
    seg = SegmentProfile(name="Test Segment", description="Desc", priority_rank=1)
    assert seg.name == "Test Segment"
    assert seg.pain_points == []
    assert seg.reasoning == ""


def test_channel_strategy_ratio():
    ch = ChannelStrategy(
        channel="LinkedIn", priority_rank=1,
        impact_score=8, effort_score=4,
    )
    ch.impact_to_effort_ratio = ch.impact_score / ch.effort_score
    assert ch.impact_to_effort_ratio == 2.0


def test_gtm_strategy_assembly():
    strategy = GTMStrategy(
        brief_summary="Test strategy",
        segments=[
            SegmentProfile(name="Seg A", description="A", priority_rank=1),
            SegmentProfile(name="Seg B", description="B", priority_rank=2),
        ],
        channels=[
            ChannelStrategy(channel="Reddit", priority_rank=1, impact_score=7, effort_score=3),
        ],
        edginess=EdginessFramework(overall_level=7),
    )
    assert len(strategy.segments) == 2
    assert strategy.channels[0].channel == "Reddit"
    assert strategy.edginess.overall_level == 7


def test_strategy_serialisation():
    strategy = GTMStrategy(brief_summary="Test")
    data = strategy.model_dump()
    restored = GTMStrategy(**data)
    assert restored.brief_summary == "Test"
    assert restored.version == "1.0"
