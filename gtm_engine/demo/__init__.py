"""One-click demo data loader for the current workspace.

Populates a realistic Quantum Tools content strategy, a spread of ideas
across every pipeline stage, and producer briefs + video jobs for the
PRODUCED items — all WITHOUT any AI call, so it works with no API key and
lets a fresh (e.g. cloud) deployment be explored or tested immediately.

Idempotent: clears the ideas table and rewrites the strategy row each run.
"""

from datetime import datetime, timezone

from gtm_engine.config import OUTPUT_DIR
from gtm_engine.utils.file_io import save_json
from gtm_engine.strategy_framework import (
    StrategyStore, ContentStrategy, AudienceSegment, Pillar,
    ChannelConfig, FunnelStageConfig, SequencingPhase,
)
from gtm_engine.ideas import Idea, IdeaBank
from gtm_engine.producer import ProducerBrief, ProducerBriefLibrary
from gtm_engine.video import create_job_from_brief


def load_quantum_demo() -> dict:
    """Load the Quantum Tools demo into the active workspace. Returns a summary."""
    now = datetime.now(timezone.utc).isoformat()

    # 0. Cast + environments (starter set)
    try:
        from gtm_engine.casting import CastingStore
        CastingStore().seed_if_empty()
    except Exception:
        pass

    # 1. Brief
    save_json({
        "umbrella_brand": "Quantum Tools",
        "one_liner": "AI-native tools that turn public data into decisions — for people "
                     "done paying consultants to state the obvious.",
        "products": [
            {"name": "PRISM", "what": "Workforce intelligence from public signals."},
            {"name": "Analyst's Edge", "what": "Outside-in company diagnostics vs peers."},
            {"name": "APEX", "what": "Programme management that flags risk early."},
            {"name": "ATLAS", "what": "Transparent trading research that teaches method."},
        ],
        "positioning": "Teach, demonstrate, make them reach for it. Punch at category "
                       "norms, never name competitors.",
        "created_at": now,
    }, OUTPUT_DIR / "gtm_brief.json")

    # 2. Strategy
    segments = [
        AudienceSegment(id="consultants", name="Independent Consultants",
                        job_title="Solo / boutique strategy consultant",
                        pain_points=["Undercut by AI", "Time lost to manual research"],
                        channels_they_use=["linkedin", "substack"]),
        AudienceSegment(id="investors", name="Investors & Analysts",
                        job_title="PE / VC analyst, equity research",
                        pain_points=["Diligence is slow", "Decks hide the truth"],
                        channels_they_use=["linkedin", "twitter"]),
        AudienceSegment(id="traders", name="Quant Retail Traders",
                        job_title="Sophisticated retail / semi-pro trader",
                        pain_points=["Gurus sell tips not method", "No transparent track record"],
                        channels_they_use=["twitter", "reddit"]),
        AudienceSegment(id="corp", name="Corporate Strategy Teams",
                        job_title="Head of strategy / transformation",
                        pain_points=["Consultancy spend under scrutiny", "Slow internal analysis"],
                        channels_they_use=["linkedin", "email"]),
    ]
    pillars = [
        Pillar(id="problem", name="The Problem", archetype="problem", target_percentage=20.0,
               funnel_stage="awareness", why_it_matters="Names the market truth nobody says.",
               example_topics=["Why consultants can't out-run their own frameworks"]),
        Pillar(id="solution", name="The Solution", archetype="solution", target_percentage=15.0,
               funnel_stage="consideration", why_it_matters="Shows the alternative clearly.",
               example_topics=["What outside-in diagnostics actually looks like"]),
        Pillar(id="evidence", name="The Evidence", archetype="evidence", target_percentage=20.0,
               funnel_stage="trust", why_it_matters="Sophisticated buyers move on the artefact.",
               example_topics=["A real company run through Analyst's Edge, live"]),
        Pillar(id="insight", name="The Insight", archetype="insight", target_percentage=20.0,
               funnel_stage="authority", why_it_matters="Original analysis builds authority.",
               example_topics=["What ATLAS's 52-week log reveals about discipline"]),
        Pillar(id="story", name="The Story", archetype="story", target_percentage=10.0,
               funnel_stage="connection", why_it_matters="People buy from people.",
               example_topics=["Why I'm building Quantum Tools in the open"]),
        Pillar(id="enablement", name="The How", archetype="enablement", target_percentage=15.0,
               funnel_stage="conversion", why_it_matters="Doers stay, advocate, upgrade.",
               example_topics=["Run your first PRISM workforce scan in 10 minutes"]),
    ]
    channels = [
        ChannelConfig(channel_id="linkedin", cadence_per_week=4,
                      primary_pillars=["problem", "solution", "insight", "story"],
                      audience_segments=["consultants", "investors", "corp"]),
        ChannelConfig(channel_id="twitter", cadence_per_week=5,
                      primary_pillars=["insight", "evidence"],
                      audience_segments=["investors", "traders"]),
        ChannelConfig(channel_id="reddit", cadence_per_week=2,
                      primary_pillars=["problem", "evidence"], audience_segments=["traders"]),
        ChannelConfig(channel_id="email", cadence_per_week=1,
                      primary_pillars=["enablement", "solution"],
                      audience_segments=["corp", "consultants"]),
    ]
    funnel_stages = [
        FunnelStageConfig(id="awareness", name="Awareness", target_percentage=20.0, pillar_ids=["problem"]),
        FunnelStageConfig(id="consideration", name="Consideration", target_percentage=15.0, pillar_ids=["solution"]),
        FunnelStageConfig(id="trust", name="Trust", target_percentage=20.0, pillar_ids=["evidence"]),
        FunnelStageConfig(id="authority", name="Authority", target_percentage=20.0, pillar_ids=["insight"]),
        FunnelStageConfig(id="connection", name="Connection", target_percentage=10.0, pillar_ids=["story"]),
        FunnelStageConfig(id="conversion", name="Conversion", target_percentage=15.0, pillar_ids=["enablement"]),
    ]
    sequencing = [
        SequencingPhase(phase="pre_launch", label="Pre-launch", weeks_duration=4,
                        pillar_weights={"problem": 0.4, "insight": 0.3, "story": 0.3}),
        SequencingPhase(phase="launch", label="Launch", weeks_duration=6,
                        pillar_weights={"problem": 0.25, "solution": 0.25, "evidence": 0.25, "insight": 0.25}),
        SequencingPhase(phase="growth", label="Growth", weeks_duration=12,
                        pillar_weights={"evidence": 0.3, "insight": 0.3, "enablement": 0.25, "solution": 0.15}),
        SequencingPhase(phase="scaling", label="Scaling", weeks_duration=12,
                        pillar_weights={"enablement": 0.4, "evidence": 0.3, "insight": 0.3}),
    ]
    StrategyStore().save(ContentStrategy(
        audience_segments=segments, pillars=pillars, channels=channels,
        funnel_stages=funnel_stages, sequencing=sequencing,
        capacity_per_week=5, business_phase="launch", setup_complete=True,
        stages_completed=["audience", "pillars", "channels", "funnel", "sequencing"],
        created_at=now, updated_at=now,
    ))

    # 3. Ideas across every stage ('story' left empty on purpose -> a PLAN gap)
    def mk(title, hook, angle, pillar, product, seg, status, edge=7, data="none"):
        return Idea(title=title, hook=hook, angle=angle, funnel_level="product",
                    product=product, target_segment=seg, data_requirement=data,
                    edginess_score=edge, tags=[pillar], status=status,
                    created_at=now, updated_at=now)

    ideas = [
        mk("The consultant's dirty secret", "Your framework is now a $20 API call.",
           "Category-punch at commoditised strategy work.", "problem", "Analyst's Edge",
           "consultants", "idea_draft", edge=9),
        mk("Diligence in an afternoon", "What if the data room was already public?",
           "Reframe diligence speed.", "problem", "Analyst's Edge", "investors", "idea_draft"),
        mk("Org charts lie", "Headcount tells you nothing. Signal does.",
           "PRISM's public-signal approach.", "solution", "PRISM", "corp", "idea_draft", edge=8),
        mk("Tips are a tax on the impatient", "Every guru sells you the fish.",
           "ATLAS teaches method, not calls.", "problem", "ATLAS", "traders", "idea_draft", edge=9),
        mk("The steering committee is always last to know", "Risk shows up in the data weeks early.",
           "APEX early-warning angle.", "solution", "APEX", "corp", "idea_draft"),
        mk("Analyse a FTSE company, live", "Pick one in the comments. I'll run it.",
           "Public teardown.", "evidence", "Analyst's Edge", "investors", "idea_draft",
           edge=6, data="Analyst's Edge demo run"),
        mk("Inside the 5-source validation", "How PRISM avoids the LinkedIn-only trap.",
           "Methodology transparency.", "evidence", "PRISM", "corp", "idea_approved",
           data="PRISM source matrix"),
        mk("What 52 weeks of ATLAS actually returned", "The full log. Wins and losses.",
           "Radical transparency.", "insight", "ATLAS", "traders", "idea_approved",
           edge=8, data="ATLAS 52-week performance log"),
        mk("The metric every strategy deck hides", "Cost-to-serve, not revenue.",
           "Original insight.", "insight", "Analyst's Edge", "corp", "idea_approved"),
        mk("PRISM vs the annual report", "Two views of the same company. One is honest.",
           "Evidence teardown.", "evidence", "PRISM", "investors", "content_generated",
           data="PRISM sample output"),
        mk("Why I stopped trusting management commentary", "Founder POV on outside-in.",
           "Insight + light story.", "insight", "Analyst's Edge", "investors", "content_generated", edge=7),
        mk("Run your first workforce scan in 10 minutes", "No setup. Paste a company name.",
           "Enablement walkthrough.", "enablement", "PRISM", "consultants", "content_approved"),
        mk("The 3 charts that end a diligence argument", "Screenshots, not slides.",
           "Evidence, conversion-oriented.", "evidence", "Analyst's Edge", "investors",
           "content_approved", data="Analyst's Edge charts"),
        mk("Consultants don't have a knowledge problem", "They have a speed problem.",
           "Sharp problem hook.", "problem", "Analyst's Edge", "consultants",
           "deployment_scheduled", edge=8),
        mk("How ATLAS defines an edge", "Not a signal. A repeatable process.",
           "Enablement for traders.", "enablement", "ATLAS", "traders", "deployment_scheduled"),
    ]
    bank = IdeaBank()
    with bank._connect() as conn:  # type: ignore[attr-defined]
        conn.execute("DELETE FROM ideas")
        conn.commit()
    bank.create_many(ideas)

    # 4. Producer briefs + video jobs for the PRODUCED items
    brief_lib = ProducerBriefLibrary()
    hb = {
        "PRISM vs the annual report": (
            "One of these is honest. It isn't the annual report.",
            "See both, side by side. quantumtools.ai"),
        "Why I stopped trusting management commentary": (
            "I stopped trusting the management narrative years ago.",
            "The data doesn't spin. quantumtools.ai"),
    }
    produced = bank.list_all(status="content_generated")
    for idea in produced:
        h, b = hb.get(idea.title, ("A sharp opening line.", "See it run. quantumtools.ai"))
        brief_lib.save(ProducerBrief(
            idea_id=idea.id, spoken_script=f"{h} {b}",
            segments_json={"hook": {"spoken_text": h, "duration_seconds": 4},
                           "bookend": {"spoken_text": b, "duration_seconds": 4}},
            voice_directive="measured, direct, quietly confident",
        ))
        create_job_from_brief(idea.id)

    return {
        "pillars": len(pillars), "segments": len(segments), "channels": len(channels),
        "ideas": len(ideas), "produced_jobs": len(produced),
    }
