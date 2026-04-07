"""Pre-fill the GTM Brief from known context about the founder's product portfolio.

This bypasses the interview for founders whose products are already well-documented
in prior conversations. Run with: python -m gtm_engine.discovery.prefill
"""

import json
from gtm_engine.config import OUTPUT_DIR
from gtm_engine.discovery.models import (
    GTMBrief, ProductInfo, FounderInfo, MarketInfo,
    CompetitionInfo, Constraints, BrandVoice, MonetisationInfo, ChannelPreferences,
)
from gtm_engine.utils.file_io import save_json


def build_brief() -> GTMBrief:
    """Build the GTM Brief from known founder and product context."""

    diagnostic_engine = ProductInfo(
        name="Diagnostic Engine",
        description=(
            "An outside-in automated company analysis tool that generates structured "
            "business diagnostics from public data, benchmarked against peers. Uses AI "
            "interpretation to extract insight from previously inaccessible or unstructured "
            "public information — filings, reviews, job postings, news, social signals — "
            "and synthesises them into actionable business intelligence."
        ),
        core_value_prop=(
            "Automated business diagnostics from public data that would take a consultant "
            "weeks to compile, delivered in minutes, benchmarked against peers, with AI-driven "
            "insight that surfaces what humans miss."
        ),
        current_stage="mvp",
        key_features=[
            "Outside-in analysis from public data only — no integration required",
            "Peer benchmarking across multiple dimensions",
            "AI interpretation of unstructured data (reviews, job postings, news)",
            "Structured diagnostic output — consistent framework, not ad-hoc",
            "White-label ready — consultancies and investment firms run it under their brand",
            "Automated refresh — diagnostics stay current without manual work",
        ],
        pricing_model="subscription + white-label licensing",
        white_label_potential=(
            "Primary revenue path. Consultancies and investment firms embed the engine "
            "under their own brand to serve their clients. They pay a platform fee plus "
            "per-diagnostic usage. This is the highest-leverage monetisation path."
        ),
        target_users=[
            "Independent consultants running strategy engagements",
            "Investment analysts and PE/VC associates doing due diligence",
            "MBA students doing case prep and company research",
            "Corporate strategy teams benchmarking competitors",
            "Consultancies and investment firms (white-label)",
        ],
        positioning=(
            "The outside-in analysis tool that replaces weeks of consultant research with "
            "minutes of AI-powered diagnostics. Not another dashboard — a diagnostic engine "
            "that thinks like a strategist."
        ),
    )

    atlas = ProductInfo(
        name="Atlas",
        description=(
            "An automated trading and learning system that combines systematic trading "
            "with genuine education. Uses AI to interpret market data and teach users to "
            "think about markets more clearly — not to follow signals blindly."
        ),
        core_value_prop=(
            "A transparent, anti-guru trading system that teaches you to think better "
            "than it trades. Shows its methodology, explains its reasoning, and makes you "
            "a better decision-maker whether you use the system or not."
        ),
        current_stage="mvp",
        key_features=[
            "Systematic trading with transparent methodology",
            "AI-interpreted market analysis — not black-box signals",
            "Educational layer — teaches quantitative thinking alongside execution",
            "Anti-guru positioning — shows when it's wrong, not just when it's right",
            "Backtested and auditable — every trade has a thesis and a post-mortem",
            "White-label for fintech platforms",
        ],
        pricing_model="subscription + white-label licensing",
        white_label_potential=(
            "Fintech platforms and trading communities can embed Atlas under their brand. "
            "The educational component makes it sticky — users learn, not just trade."
        ),
        target_users=[
            "Quantitatively sophisticated retail traders",
            "Finance professionals exploring systematic/automated approaches",
            "Fintech platforms seeking embedded trading intelligence (white-label)",
            "Trading communities wanting credible, transparent content",
        ],
        positioning=(
            "Anti-guru. Transparent methodology. Teaches you to think better than the system. "
            "The trading tool that's honest about when it's wrong."
        ),
    )

    # Umbrella product represents the portfolio brand
    umbrella = ProductInfo(
        name="AI-Powered Professional Intelligence Suite",
        description=(
            "A portfolio of AI-powered tools for management and professional decision-making. "
            "The common thread: using AI interpretation to bring new insight to previously "
            "inaccessible or unstructured data and information. Each product takes a domain "
            "where professionals currently rely on manual research, gut feel, or expensive "
            "consultants — and replaces it with structured, AI-driven intelligence."
        ),
        core_value_prop=(
            "AI that makes professionals smarter, not lazier. Every tool in the suite "
            "teaches while it delivers — showing its methodology, explaining its reasoning, "
            "and building the user's own judgment alongside the automation."
        ),
        current_stage="mvp",
        key_features=[
            "AI interpretation of unstructured/public data across domains",
            "Transparent methodology — every output shows its working",
            "White-label architecture — each product designed for B2B2C distribution",
            "Educational by design — teaches users, not just serves them",
            "Portfolio approach — shared infrastructure, multiple verticals",
        ],
        pricing_model="subscription + white-label licensing across all products",
        white_label_potential=(
            "Every product in the portfolio is designed for white-label from day one. "
            "This is the primary scaling mechanism — let established firms distribute "
            "under their brand while we build the intelligence layer."
        ),
        target_users=[
            "Management consultants and strategy professionals",
            "Financial analysts and investors",
            "Professional services firms seeking AI augmentation",
            "Platforms seeking embedded AI intelligence (white-label partners)",
        ],
        positioning=(
            "AI-powered professional intelligence that teaches while it delivers. "
            "Not another AI wrapper — structured insight from unstructured reality."
        ),
    )

    brief = GTMBrief(
        version="1.0",
        umbrella_brand=(
            "AI-powered professional intelligence tools. The USP across all products: "
            "using AI interpretation to bring new insight to previously inaccessible or "
            "unstructured data and information. Every product teaches, demonstrates, and "
            "makes users reach for it — never pushes."
        ),
        product=umbrella,
        products=[diagnostic_engine, atlas],
        founder=FounderInfo(
            background=(
                "Technical founder building at the intersection of AI, data, and professional "
                "services. Deep Python engineering skills combined with strategic business "
                "thinking. Building multiple products simultaneously with a shared architectural "
                "vision and go-to-market philosophy."
            ),
            expertise=[
                "Python engineering and API integration",
                "AI/LLM orchestration and multi-model systems",
                "Quantitative analysis and systematic trading",
                "Business strategy and competitive analysis",
                "Product architecture for white-label distribution",
            ],
            time_commitment="full-time",
            personal_brand_exists=False,
            personal_brand_description=(
                "No established personal brand yet — building from zero. "
                "This is an opportunity: the personal brand and the product brands "
                "can grow together, with content establishing authority across "
                "AI interpretation, professional intelligence, and transparent methodology."
            ),
        ),
        market=MarketInfo(
            target_segments=[
                {
                    "name": "Independent Management Consultants",
                    "description": "Solo or small-firm consultants running strategy engagements for mid-market companies. They need to look like they have a large research team behind them.",
                    "willingness_to_pay": "high",
                    "pain": "Spend 40% of engagement time on research that could be automated",
                },
                {
                    "name": "Investment Analysts & PE/VC Associates",
                    "description": "Junior-to-mid professionals doing due diligence and company screening. Volume is high, time is short, quality matters enormously.",
                    "willingness_to_pay": "high",
                    "pain": "Manual research is slow and inconsistent across analysts",
                },
                {
                    "name": "Consultancies & Investment Firms (White-Label)",
                    "description": "Established firms wanting to embed AI-powered diagnostics under their brand. This is the B2B2C play — highest revenue per customer.",
                    "willingness_to_pay": "very high",
                    "pain": "Building AI capabilities in-house is slow and expensive",
                },
                {
                    "name": "Quantitatively Sophisticated Retail Traders",
                    "description": "Traders who think in systems, not tips. They want transparent methodology and education, not guru signals.",
                    "willingness_to_pay": "medium-high",
                    "pain": "Most trading tools are black boxes or guru-driven nonsense",
                },
                {
                    "name": "MBA Students & Career Transitioners",
                    "description": "People building professional analytical skills. Lower willingness to pay individually but high volume and strong word-of-mouth.",
                    "willingness_to_pay": "low-medium",
                    "pain": "Case prep tools are static and generic",
                },
            ],
            market_size_estimate=(
                "Management consulting tools: ~$15B globally. Investment research tools: ~$12B. "
                "Retail trading platforms: ~$8B. The white-label slice of each is where the real "
                "leverage sits — smaller number of customers, much higher revenue per customer."
            ),
            existing_alternatives=[
                "Traditional consulting research (manual, expensive, slow)",
                "Bloomberg/FactSet/PitchBook (expensive, not AI-native, enterprise-only)",
                "Generic AI chatbots (no structured output, no benchmarking, no methodology)",
                "Guru-driven trading signals (black box, no education, high churn)",
                "DIY research using ChatGPT/Claude directly (unstructured, inconsistent)",
            ],
            category_problems=[
                "Professional research tools are either enterprise-expensive or consumer-toy — nothing in between",
                "AI tools generate text, not structured intelligence with consistent frameworks",
                "Trading education is dominated by gurus who sell hope, not methodology",
                "White-label AI is mostly 'put your logo on ChatGPT' — no real domain intelligence",
                "Consultants still manually compile what could be automated from public data",
            ],
            buyer_sophistication="high",
        ),
        competition=CompetitionInfo(
            direct_competitors=[],  # We don't name competitors — we punch at the category
            indirect_competitors=[
                "Traditional research and consulting processes (the old way)",
                "Enterprise data platforms (Bloomberg, FactSet — priced for institutions)",
                "Generic AI assistants used for ad-hoc research",
                "Signal-selling trading gurus and services",
            ],
            differentiation=(
                "Three things no one else combines: (1) AI interpretation of unstructured/public "
                "data into structured professional intelligence, (2) transparent methodology that "
                "teaches while it delivers, (3) white-label architecture from day one so the "
                "distribution model is built into the product, not bolted on."
            ),
            category_norms_to_break=[
                "Research tools should be black boxes that justify their price through opacity",
                "AI tools should be general-purpose, not domain-specific",
                "Trading education should come from people who claim to never lose",
                "Professional tools should require enterprise sales cycles",
                "White-label means slapping a logo on a generic product",
            ],
        ),
        constraints=Constraints(
            monthly_budget="$500-2000",
            no_paid_ads=True,
            tech_stack=["Python", "Claude API", "OpenAI API", "Gemini API", "Streamlit", "SQLite", "Supabase"],
            timeline_pressure=(
                "No external funding pressure but strong internal drive to reach revenue quickly. "
                "White-label deals are the priority — one enterprise deal validates the model."
            ),
            regulatory_considerations=[
                "Financial advice disclaimers for Atlas (not financial advice)",
                "Data usage transparency — only public data, clearly disclosed",
                "GDPR considerations for EU users",
            ],
        ),
        brand=BrandVoice(
            tone=(
                "Sharp, transparent, anti-guru. Confident without arrogance. "
                "Teach, demonstrate, make them reach for it. Never sell, never push, "
                "never be transactional. Write up — assume intelligence. "
                "Say the uncomfortable thing about the industry. Show your work."
            ),
            edginess_level=7,
            topics_to_avoid=[
                "Naming specific competitors",
                "Guaranteed returns or outcomes",
                "Hype language (revolutionary, game-changing, disruptive)",
                "Condescension or dumbing down",
                "Hard sell CTAs or urgency tactics",
            ],
            aspirational_voices=[
                "Stripe (developer-first, shows the infrastructure thinking)",
                "Bridgewater/Ray Dalio (radical transparency about methodology)",
                "Ben Thompson / Stratechery (analytical depth with accessible writing)",
                "Patrick McKenzie (patio11) (teaches while building in public)",
            ],
        ),
        monetisation=MonetisationInfo(
            primary_model="subscription + white-label licensing",
            price_points=[
                "Diagnostic Engine Individual: $49-99/month",
                "Diagnostic Engine Pro: $199-299/month",
                "Diagnostic Engine White-Label: $1000+/month + per-diagnostic usage",
                "Atlas Individual: $29-79/month",
                "Atlas Pro: $149-249/month",
                "Atlas White-Label: $500+/month + revenue share",
            ],
            white_label_pricing=(
                "Platform fee ($1000-5000/month depending on product) plus usage-based pricing. "
                "White-label is the primary revenue engine — fewer customers, much higher LTV."
            ),
            revenue_targets=(
                "First milestone: $5K MRR from direct subscriptions + one white-label pilot. "
                "Target: $20K+ MRR within 12 months, with white-label contributing >50%."
            ),
        ),
        channels=ChannelPreferences(
            active_channels=[],  # Starting from zero
            strongest_channel="",  # No established presence yet
            channels_to_explore=[
                "LinkedIn (professional audience, thought leadership)",
                "Substack/newsletter (long-form teaching content)",
                "Reddit (r/consulting, r/MBA, r/algotrading, r/fintech)",
                "Email sequences (nurture for white-label prospects)",
                "YouTube (methodology breakdowns, transparent walkthroughs)",
                "Twitter/X (sharp takes, build-in-public signal)",
                "SEO (capture intent-based search traffic)",
            ],
            content_creation_capacity="high",  # AI-augmented content production
        ),
        raw_interview_log=[
            {
                "topic": "meta",
                "question": "Interview source",
                "answer": "Pre-filled from founder context in GTM Engine build conversations. Covers umbrella brand (AI-powered professional intelligence) plus two initial products: Diagnostic Engine and Atlas.",
            }
        ],
    )

    return brief


def save_brief():
    """Build and save the pre-filled GTM Brief."""
    brief = build_brief()
    output_path = OUTPUT_DIR / "gtm_brief.json"
    save_json(brief.model_dump(), output_path)
    print(f"GTM Brief saved to {output_path}")
    print(f"\nUmbrella: {brief.umbrella_brand[:80]}...")
    print(f"Products: {len(brief.products)}")
    for p in brief.products:
        print(f"  - {p.name}: {p.current_stage}")
    print(f"Segments: {len(brief.market.target_segments)}")
    print(f"Edginess: {brief.brand.edginess_level}/10")
    print(f"\nRun 'python main.py strategy' to generate your GTM strategy.")


if __name__ == "__main__":
    save_brief()
