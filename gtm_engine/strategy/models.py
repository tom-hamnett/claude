"""Pydantic models for the Strategy Engine output.

Every strategic decision is structured so downstream layers can consume it
programmatically, and every decision carries its reasoning for auditability.

All models use populate_by_name=True and extra="ignore" so that slight
field name variations from Claude API responses don't crash parsing.
"""

from pydantic import BaseModel, ConfigDict, Field

# Shared config: accept aliases AND original names, ignore extra fields
_TOLERANT = ConfigDict(populate_by_name=True, extra="ignore")


class SegmentProfile(BaseModel):
    """A single customer segment with priority ranking and reasoning."""
    model_config = _TOLERANT
    name: str = ""
    description: str = ""
    priority_rank: int = 0
    estimated_tam: str = ""
    pain_points: list[str] = Field(default_factory=list)
    buying_triggers: list[str] = Field(default_factory=list)
    objections: list[str] = Field(default_factory=list)
    channels_they_use: list[str] = Field(default_factory=list)
    willingness_to_pay: str = ""
    reasoning: str = ""


class PositioningStatement(BaseModel):
    """Positioning tailored to a specific segment."""
    model_config = _TOLERANT
    segment_name: str = Field(default="", alias="segment")
    headline: str = ""
    subheadline: str = ""
    value_proposition: str = ""
    proof_points: list[str] = Field(default_factory=list)
    differentiation: str = ""
    emotional_hook: str = ""
    reasoning: str = ""


class ChannelStrategy(BaseModel):
    """A single channel with impact-to-effort scoring."""
    model_config = _TOLERANT
    channel: str = Field(default="", alias="name")
    priority_rank: int = 0
    impact_score: int = Field(default=5, ge=1, le=10)
    effort_score: int = Field(default=5, ge=1, le=10)
    impact_to_effort_ratio: float = 0.0
    primary_segments: list[str] = Field(default_factory=list)
    content_formats: list[str] = Field(default_factory=list)
    posting_cadence: str = ""
    tone_notes: str = ""
    quick_win: str = ""
    reasoning: str = ""


class ContentArchitectureItem(BaseModel):
    """Content plan for a specific channel-segment combination."""
    model_config = _TOLERANT
    channel: str = ""
    segment: str = ""
    content_types: list[str] = Field(default_factory=list)
    cadence: str = ""
    tone: str = ""
    edginess_level: int = Field(default=5, ge=1, le=10)
    example_topics: list[str] = Field(default_factory=list)
    strategic_objective: str = ""


class EdginessFramework(BaseModel):
    """Brand-specific edginess calibration."""
    model_config = _TOLERANT
    overall_level: int = Field(default=5, ge=1, le=10)
    uncomfortable_truths: list[str] = Field(default_factory=list)
    category_norms_to_break: list[str] = Field(default_factory=list)
    transparency_angles: list[str] = Field(default_factory=list)
    point_of_view_statements: list[str] = Field(default_factory=list)
    topics_to_avoid: list[str] = Field(default_factory=list)
    tone_guardrails: str = ""


class GTMStrategy(BaseModel):
    """The complete strategy output. Feeds Layer 3 (Content Factory)."""
    model_config = _TOLERANT
    version: str = "1.0"
    brief_summary: str = ""
    segments: list[SegmentProfile] = Field(default_factory=list)
    positioning: list[PositioningStatement] = Field(default_factory=list)
    channels: list[ChannelStrategy] = Field(default_factory=list)
    content_architecture: list[ContentArchitectureItem] = Field(default_factory=list)
    edginess: EdginessFramework = Field(default_factory=EdginessFramework)
    assumptions: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
