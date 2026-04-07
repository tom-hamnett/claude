"""Pydantic models for the Content Factory.

Every content piece is tagged so the feedback loop knows exactly what
performed and why — enabling the engine to get smarter over time.
"""

from datetime import datetime, timezone
from pydantic import BaseModel, Field


class ContentTag(BaseModel):
    """Metadata tags that enable the feedback loop."""
    segment: str = ""
    channel: str = ""
    content_type: str = ""
    strategic_objective: str = ""  # awareness, trust, conversion, retention
    edginess_principle: str = ""  # uncomfortable_truth, show_work, pov, punch_category, respect_intelligence
    ai_provider: str = ""  # claude, openai, gemini
    ai_model: str = ""


class ContentPiece(BaseModel):
    """A single content piece ready for the deployment queue."""
    id: str = ""
    title: str = ""
    body: str = ""
    format: str = ""  # long_form, social_post, email, thread, etc.
    tags: ContentTag = Field(default_factory=ContentTag)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "draft"  # draft, approved, published, archived
    variants: list[str] = Field(default_factory=list)  # A/B variant IDs
    parent_id: str = ""  # If this is a repurposed/derived piece
    metadata: dict = Field(default_factory=dict)
