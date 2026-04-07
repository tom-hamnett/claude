"""Pydantic models for the Strategy Engine output.

Every strategic decision is structured so downstream layers can consume it
programmatically, and every decision carries its reasoning for auditability.
"""

from pydantic import BaseModel, Field


class SegmentProfile(BaseModel):
    """A single customer segment with priority ranking and reasoning."""
    name: str
    description: str
    priority_rank: int
    estimated_tam: str = ""
    pain_points: list[str] = Field(default_factory=list)
    buying_triggers: list[str] = Field(default_factory=list)
    objections: list[str] = Field(default_factory=list)
    channels_they_use: list[str] = Field(default_factory=list)
    willingness_to_pay: str = ""
    reasoning: str = ""  # Why this segment, why this rank


class PositioningStatement(BaseModel):
    """Positioning tailored to a specific segment."""
    segment_name: str
    headline: str
    subheadline: str
    value_proposition: str
    proof_points: list[str] = Field(default_factory=list)
    differentiation: str = ""
    emotional_hook: str = ""
    reasoning: str = ""


class ChannelStrategy(BaseModel):
    """A single channel with impact-to-effort scoring."""
    channel: str
    priority_rank: int
    impact_score: int = Field(ge=1, le=10)
    effort_score: int = Field(ge=1, le=10)
    impact_to_effort_ratio: float = 0.0
    primary_segments: list[str] = Field(default_factory=list)
    content_formats: list[str] = Field(default_factory=list)
    posting_cadence: str = ""
    tone_notes: str = ""
    quick_win: str = ""  # First thing to do on this channel
    reasoning: str = ""


class ContentArchitectureItem(BaseModel):
    """Content plan for a specific channel-segment combination."""
    channel: str
    segment: str
    content_types: list[str] = Field(default_factory=list)
    cadence: str = ""
    tone: str = ""
    edginess_level: int = Field(default=5, ge=1, le=10)
    example_topics: list[str] = Field(default_factory=list)
    strategic_objective: str = ""


class EdginessFramework(BaseModel):
    """Brand-specific edginess calibration."""
    overall_level: int = Field(default=5, ge=1, le=10)
    uncomfortable_truths: list[str] = Field(default_factory=list)
    category_norms_to_break: list[str] = Field(default_factory=list)
    transparency_angles: list[str] = Field(default_factory=list)
    point_of_view_statements: list[str] = Field(default_factory=list)
    topics_to_avoid: list[str] = Field(default_factory=list)
    tone_guardrails: str = ""


class GTMStrategy(BaseModel):
    """The complete strategy output. Feeds Layer 3 (Content Factory)."""
    version: str = "1.0"
    brief_summary: str = ""
    segments: list[SegmentProfile] = Field(default_factory=list)
    positioning: list[PositioningStatement] = Field(default_factory=list)
    channels: list[ChannelStrategy] = Field(default_factory=list)
    content_architecture: list[ContentArchitectureItem] = Field(default_factory=list)
    edginess: EdginessFramework = Field(default_factory=EdginessFramework)
    assumptions: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
