"""Pydantic models for the Discovery Engine.

The GTM Brief is the master context object that feeds every downstream layer.
It's built progressively during the intake interview.
"""

from pydantic import BaseModel, Field


class ProductInfo(BaseModel):
    name: str = ""
    description: str = ""
    core_value_prop: str = ""
    current_stage: str = ""  # idea, mvp, launched, scaling
    key_features: list[str] = Field(default_factory=list)
    pricing_model: str = ""
    white_label_potential: str = ""
    target_users: list[str] = Field(default_factory=list)
    positioning: str = ""


class FounderInfo(BaseModel):
    background: str = ""
    expertise: list[str] = Field(default_factory=list)
    time_commitment: str = ""  # full-time, part-time, nights-and-weekends
    personal_brand_exists: bool = False
    personal_brand_description: str = ""


class MarketInfo(BaseModel):
    target_segments: list[dict] = Field(default_factory=list)
    market_size_estimate: str = ""
    existing_alternatives: list[str] = Field(default_factory=list)
    category_problems: list[str] = Field(default_factory=list)
    buyer_sophistication: str = ""  # low, medium, high


class CompetitionInfo(BaseModel):
    direct_competitors: list[str] = Field(default_factory=list)
    indirect_competitors: list[str] = Field(default_factory=list)
    differentiation: str = ""
    category_norms_to_break: list[str] = Field(default_factory=list)


class Constraints(BaseModel):
    monthly_budget: str = ""
    no_paid_ads: bool = True
    tech_stack: list[str] = Field(default_factory=list)
    timeline_pressure: str = ""
    regulatory_considerations: list[str] = Field(default_factory=list)


class BrandVoice(BaseModel):
    tone: str = ""  # e.g. "sharp, transparent, anti-guru"
    edginess_level: int = Field(default=5, ge=1, le=10)  # 1=corporate, 10=provocative
    topics_to_avoid: list[str] = Field(default_factory=list)
    aspirational_voices: list[str] = Field(default_factory=list)  # brands/people they admire


class MonetisationInfo(BaseModel):
    primary_model: str = ""  # subscription, usage, licensing, freemium
    price_points: list[str] = Field(default_factory=list)
    white_label_pricing: str = ""
    revenue_targets: str = ""


class ChannelPreferences(BaseModel):
    active_channels: list[str] = Field(default_factory=list)
    strongest_channel: str = ""
    channels_to_explore: list[str] = Field(default_factory=list)
    content_creation_capacity: str = ""  # low, medium, high


class GTMBrief(BaseModel):
    """The master context object. Every downstream decision traces back here."""
    version: str = "1.0"
    umbrella_brand: str = ""  # Overarching brand positioning across all products
    product: ProductInfo = Field(default_factory=ProductInfo)  # Primary/umbrella product
    products: list[ProductInfo] = Field(default_factory=list)  # Individual products in portfolio
    founder: FounderInfo = Field(default_factory=FounderInfo)
    market: MarketInfo = Field(default_factory=MarketInfo)
    competition: CompetitionInfo = Field(default_factory=CompetitionInfo)
    constraints: Constraints = Field(default_factory=Constraints)
    brand: BrandVoice = Field(default_factory=BrandVoice)
    monetisation: MonetisationInfo = Field(default_factory=MonetisationInfo)
    channels: ChannelPreferences = Field(default_factory=ChannelPreferences)
    raw_interview_log: list[dict] = Field(default_factory=list)
