"""Pre-fill the GTM Brief for the full Quantum Tools product portfolio.

Products: PRISM, Analyst's Edge, APEX, ATLAS
Umbrella brand: Quantum Tools — quantumtools.ai

Run with: python main.py prefill
"""

import json
from gtm_engine.config import OUTPUT_DIR
from gtm_engine.discovery.models import (
    GTMBrief, ProductInfo, FounderInfo, MarketInfo,
    CompetitionInfo, Constraints, BrandVoice, MonetisationInfo, ChannelPreferences,
)
from gtm_engine.utils.file_io import save_json


def _build_prism() -> ProductInfo:
    return ProductInfo(
        name="PRISM",
        description=(
            "People & Role Intelligence for Strategic Markets. An AI-powered organisational "
            "intelligence platform that maps the workforce structure of any company in the world "
            "— by region, function, and seniority — at a fraction of the cost of incumbent data "
            "providers. Harvests publicly visible headcount signals from LinkedIn search infrastructure, "
            "cross-validates against SEC EDGAR, Companies House, Wikidata, Wikipedia, and AI-assisted "
            "investor relations extraction. Produces a structured, reconciled organisational model "
            "with MECE tree architecture and top-down reconciliation."
        ),
        core_value_prop=(
            "The first workforce intelligence platform built for analysts, not marketers. "
            "Every benchmark reconciled. Every figure validated. Every source cited. "
            "Benchmarks a 200,000-person company at the same cost as a 5,000-person company."
        ),
        current_stage="mvp",
        key_features=[
            "MECE tree architecture with top-down reconciliation (Total > Geography > Function > Seniority)",
            "5-source external validation pipeline (SEC EDGAR, Companies House, Wikidata, Wikipedia, AI-assisted IR)",
            "Adaptive segmentation — concentrates depth where it matters, keeps request volume manageable",
            "Aggregate counts only — no individual employee data, minimal GDPR exposure",
            "Full reconciliation audit trail with confidence status (CONFIRMED/WARNING/UNVERIFIED)",
            "Diagnostic Engine compatible output schema with salary benchmarks and taxonomy classifications",
            "Full resumability — checkpoints every 25 requests, resumes on interruption",
            "Cost does not scale with headcount — fixed per-company, not per-record",
        ],
        pricing_model="per-company-benchmarked, not per-seat or per-record",
        white_label_potential=(
            "High. Consultancies and investment firms embed under their brand. "
            "The per-company pricing model directly inverts incumbents and makes "
            "the cost advantage immediately legible to buyers."
        ),
        target_users=[
            "Management consultants and strategy practices (primary — fastest sales cycle)",
            "Corporate strategy, HR, and procurement functions",
            "Private equity and investment research analysts",
            "Boutique advisory firms seeking white-label workforce intelligence",
        ],
        positioning=(
            "Not a cheaper data provider — a new category of organisational intelligence tool "
            "defined by validation, auditability, and analytical rigour rather than data volume. "
            "Directly addresses the four structural weaknesses of every incumbent: cost scales with "
            "headcount, no built-in validation, individual records create legal exposure, black-box "
            "data with no audit trail."
        ),
    )


def _build_analysts_edge() -> ProductInfo:
    return ProductInfo(
        name="The Analyst's Edge",
        description=(
            "An AI-powered outside-in company intelligence platform. Generates structured, "
            "multi-dimensional diagnostics of any company — financial profile, workforce structure, "
            "organisational design, cost architecture, geographic footprint — using only publicly "
            "available external data. User types a company name; platform delivers a complete "
            "diagnostic workbook and presentation deck in minutes."
        ),
        core_value_prop=(
            "A complete company diagnostic — the kind that costs £50,000-£500,000 from a "
            "consulting firm and takes 4-12 weeks — delivered in 2-5 minutes from public data, "
            "with every figure sourced, every AI estimate labelled, and every gap shown as N/A "
            "rather than fabricated."
        ),
        current_stage="mvp",
        key_features=[
            "AI-powered entity disambiguation — solves the most common error in company analysis",
            "18-function taxonomy classification with auto-expansion for new industries",
            "Bottom-up labour cost modelling by level, function, and geography",
            "Comprehensive sense-checking layer (blooper/warning/note flagging)",
            "Two deliverables: diagnostic Excel workbook + 49-slide PowerPoint deck to MBB standards",
            "Peer benchmarking workbook with RAG traffic lighting and percentile scorecards",
            "Honest about what it doesn't know — N/A not hallucinated, AI estimates labelled",
            "Battle-tested: full F1 grid benchmark (all 10 teams, 2024 season) as proof point",
        ],
        pricing_model="per-diagnostic tiered pricing + white-label licensing",
        white_label_potential=(
            "Primary revenue path. Consultancies and investment firms run it under their brand. "
            "Express/Standard/Full scan tiers at £49-99 per diagnostic + per-employee data cost."
        ),
        target_users=[
            "Independent consultants and boutique advisory firms (primary — highest conversion probability)",
            "Private equity and venture capital investors (highest value per transaction)",
            "Corporate development and in-house strategy teams",
            "MBA students and strategy academics",
            "Consultancies seeking white-label diagnostic capability",
        ],
        positioning=(
            "The only tool that combines the depth of consulting analysis with the speed and "
            "accessibility of a software platform, at a price point accessible to individual "
            "professionals. Not another AI wrapper — structured insight with auditable methodology."
        ),
    )


def _build_apex() -> ProductInfo:
    return ProductInfo(
        name="APEX",
        description=(
            "AI Programme Execution & Control. An AI-native programme and portfolio management "
            "platform. Enables programme managers, PMO leaders, and transformation advisors to "
            "set up, run, and report on complex programmes through guided AI onboarding, natural "
            "language interaction, structured data visualisation, and a live metrics intelligence "
            "layer — without configuration overhead, training cost, or vendor lock-in."
        ),
        core_value_prop=(
            "The first programme management platform that understands what you tell it. "
            "From blank canvas to live programme dashboard in under 15 minutes. Narrative input, "
            "structured output. The AI maintains the system so the programme manager can manage "
            "the programme."
        ),
        current_stage="mvp",
        key_features=[
            "5-stage guided AI onboarding wizard — blank canvas to full programme baseline in <15 minutes",
            "Dynamic Gantt with dependency mapping, phase grouping, and real-time status indicators",
            "5-family metrics intelligence layer (Financial, Delivery, Strategic, Supplier, Portfolio Risk)",
            "Typed task-metric linkages (Drives/Influences/Correlates) building a knowledge graph over time",
            "AI Linkage Analyser — proactively identifies missing task-metric connections",
            "RAID Log with natural language entry — describe an item, APEX classifies and structures it",
            "One-click executive status report generated from live data in ~8 seconds",
            "AI engine abstraction — provider-agnostic (Anthropic, Azure OpenAI, Google AI, private LLM)",
            "Intelligence compounds over time — accumulated context creates switching cost and retention",
        ],
        pricing_model="three-tier SaaS: Starter £49/mo, Professional £149/mo, Enterprise £699+/mo",
        white_label_potential=(
            "Enterprise tier includes white-labelling, custom AI endpoint configuration, SSO. "
            "Consulting firms as natural channel partners — they need AI flexibility for different "
            "client policies. Revenue share on enterprise licences they introduce."
        ),
        target_users=[
            "Enterprise transformation PMOs — programme directors and portfolio leads (primary)",
            "Strategic transformation advisors and consultants (secondary)",
            "Business unit leaders and SME PMOs running initiatives without dedicated PMO (tertiary)",
            "Consulting firms seeking white-label programme intelligence platform",
        ],
        positioning=(
            "Not a better PPM tool — the first AI-native programme intelligence platform. "
            "Category creation, not competition. Where every other tool requires you to maintain "
            "the system, APEX maintains itself. The AI engine agnosticism is the single most "
            "commercially significant architectural decision — deploys across any enterprise AI policy."
        ),
    )


def _build_atlas() -> ProductInfo:
    return ProductInfo(
        name="ATLAS",
        description=(
            "Autonomous Trading & Learning Analysis System. An AI-powered swing trading research "
            "system that autonomously screens 1,376 instruments across 11 global markets every "
            "morning, analyses the most promising candidates using Claude AI, and puts every signal "
            "through a structured three-layer adversarial review before anything reaches the portfolio."
        ),
        core_value_prop=(
            "The first retail trading research system that argues with itself before acting. "
            "Institutional-grade adversarial review process — Signal Analyst, Risk Officer, "
            "Devil's Advocate — available to independent traders for a one-time cost of £149. "
            "Full audit trail. Full source code. Anti-guru by design."
        ),
        current_stage="launched",
        key_features=[
            "1,376 instruments across 11 global markets screened daily at 7am UTC",
            "22 technical indicators, 9 backtested strategies (2 active: Golden Cross, Breakout)",
            "3-layer AI review: Signal Analyst > Risk Officer > Devil's Advocate with Judge verdict",
            "Full transparency — every Claude prompt, response, and reasoning logged in Audit tab",
            "Paper trading engine with risk-adjusted position sizing (2% portfolio risk per trade)",
            "Daily HTML research briefing written by Claude, delivered before market open",
            "Cloud-native on DigitalOcean ($6/mo), £0.04/day operating cost",
            "Full source code included — buyer can inspect, modify, and extend",
            "Stays in cash when conditions are unfavourable (0 signals on April 7 2026 crash)",
        ],
        pricing_model="one-time purchase £149 (early access), rising to £199 then £299",
        white_label_potential=(
            "Lower priority than other products. Source code inclusion means buyers can "
            "self-customise. Future potential for fintech platform licensing."
        ),
        target_users=[
            "Technically literate swing traders (age 28-45, finance/tech/data science background)",
            "Curious builders who want to learn from a production trading system",
            "Serious amateurs graduating from signal services who want to understand the process",
            "Semi-professional traders and small family offices wanting systematic research",
        ],
        positioning=(
            "Anti-guru. Transparent methodology. The only retail system that puts every signal "
            "through adversarial review. Shows when it's wrong, not just when it's right. "
            "One-time £149 vs competitors charging £54-214/month for less capability."
        ),
    )


def _build_umbrella() -> ProductInfo:
    return ProductInfo(
        name="Quantum Tools",
        description=(
            "A product studio building AI-powered professional intelligence tools. "
            "Four products sharing a common thesis: using AI interpretation to bring "
            "new insight to previously inaccessible or unstructured data. Each product "
            "takes a domain where professionals rely on manual research, gut feel, or "
            "expensive consultants — and replaces it with structured, AI-driven intelligence "
            "that teaches while it delivers."
        ),
        core_value_prop=(
            "AI that makes professionals smarter, not lazier. Every tool shows its methodology, "
            "explains its reasoning, and builds the user's own judgment alongside the automation. "
            "White-label architecture across the portfolio for B2B2C distribution at scale."
        ),
        current_stage="mvp",
        key_features=[
            "Four products: PRISM, Analyst's Edge, APEX, ATLAS",
            "Common thesis: AI interpretation of unstructured data into structured professional intelligence",
            "Transparent methodology across all products — every output shows its working",
            "White-label architecture from day one across the portfolio",
        ],
        pricing_model="SaaS subscriptions + white-label licensing + one-time purchases",
        white_label_potential="Primary scaling mechanism across PRISM, Analyst's Edge, and APEX",
        target_users=[
            "Management consultants and strategy professionals",
            "Financial analysts, investors, and PE/VC firms",
            "Programme managers and transformation leaders",
            "Technically literate independent traders",
        ],
        positioning="Tools for professionals who think. Not AI wrappers — structured intelligence with auditable methodology.",
    )


def build_brief() -> GTMBrief:
    brief = GTMBrief(
        version="1.0",
        umbrella_brand=(
            "Quantum Tools — quantumtools.ai. AI-powered professional intelligence. "
            "Four products: PRISM (workforce intelligence), Analyst's Edge (company diagnostics), "
            "APEX (programme management), ATLAS (trading research). Every product teaches, "
            "demonstrates, and makes users reach for it."
        ),
        product=_build_umbrella(),
        products=[_build_prism(), _build_analysts_edge(), _build_apex(), _build_atlas()],
        founder=FounderInfo(
            background=(
                "Technical founder and transformation advisor at the intersection of AI, data, "
                "and professional services. Deep Python engineering + real-world consulting and "
                "programme management experience (including IHG transformation). Building four "
                "products simultaneously with shared architecture and GTM philosophy."
            ),
            expertise=[
                "Python engineering and API integration",
                "AI/LLM orchestration and multi-model systems",
                "Management consulting and transformation delivery",
                "Programme and portfolio management",
                "Quantitative analysis and systematic trading",
                "Product architecture for white-label distribution",
            ],
            time_commitment="full-time",
            personal_brand_exists=False,
            personal_brand_description="Building from zero alongside the Quantum Tools brand.",
        ),
        market=MarketInfo(
            target_segments=[
                {"name": "Management Consultants & Strategy Practices",
                 "products": ["PRISM", "Analyst's Edge", "APEX"],
                 "willingness_to_pay": "high",
                 "pain": "40% of engagement time on automatable research. Data costs £15K+ per benchmark."},
                {"name": "Enterprise Transformation PMOs",
                 "products": ["APEX"],
                 "willingness_to_pay": "very high",
                 "pain": "30-40% of time on aggregation and reporting. No single source of truth."},
                {"name": "Private Equity & Investment Research",
                 "products": ["PRISM", "Analyst's Edge"],
                 "willingness_to_pay": "very high",
                 "pain": "Slow due diligence. Data costs routinely six figures."},
                {"name": "Corporate Strategy, HR & Procurement",
                 "products": ["PRISM", "Analyst's Edge", "APEX"],
                 "willingness_to_pay": "medium-high",
                 "pain": "Cannot justify enterprise data contracts or build AI in-house."},
                {"name": "Technically Literate Retail Traders",
                 "products": ["ATLAS"],
                 "willingness_to_pay": "medium-high",
                 "pain": "No systematic approach. Gap between institutional and retail tools."},
                {"name": "MBA Students & Strategy Academics",
                 "products": ["Analyst's Edge", "PRISM"],
                 "willingness_to_pay": "low-medium",
                 "pain": "Static case prep tools. Incomplete company data."},
                {"name": "White-Label Partners",
                 "products": ["PRISM", "Analyst's Edge", "APEX"],
                 "willingness_to_pay": "very high",
                 "pain": "Building AI in-house is prohibitively expensive."},
            ],
            market_size_estimate=(
                "Workforce intelligence: ~$4B. Consulting tools: ~$15B. PPM software: £4.2B (12.4% CAGR). "
                "Algo trading: $37.6B by 2032. White-label slice is where leverage sits."
            ),
            existing_alternatives=[
                "Per-record workforce data providers (PeopleDataLabs, Revelio Labs, Lightcast)",
                "Enterprise data platforms (Bloomberg, FactSet, PitchBook)",
                "Legacy PMO tools (Jira, Monday.com, Planview)",
                "Subscription trading tools (Trade Ideas, TrendSpider)",
                "Traditional consulting engagements",
                "Generic AI chatbots",
            ],
            category_problems=[
                "Professional tools are either enterprise-expensive or consumer-toy",
                "AI tools generate text, not structured auditable intelligence",
                "Workforce data costs scale with the most interesting companies",
                "PMO tools require weeks of setup before delivering value",
                "Trading education is guru-driven nonsense",
                "White-label AI is generic with no domain intelligence",
            ],
            buyer_sophistication="high",
        ),
        competition=CompetitionInfo(
            direct_competitors=[],
            indirect_competitors=[
                "Per-record workforce data providers",
                "Enterprise data platforms",
                "Legacy PPM tools",
                "Subscription trading tools",
                "Traditional consulting processes",
                "Generic AI assistants",
            ],
            differentiation=(
                "Four things no competitor combines: (1) AI interpretation of unstructured data "
                "into structured professional intelligence, (2) built-in multi-source validation "
                "and audit trails, (3) transparent methodology that teaches while it delivers, "
                "(4) white-label and provider-agnostic architecture from day one."
            ),
            category_norms_to_break=[
                "Workforce data priced per record scaling with company size",
                "Company intelligence requires inside access and weeks of analyst time",
                "PMO tools open to blank screens requiring days of configuration",
                "AI trading tools are subscription black boxes",
                "Professional tools require enterprise sales cycles",
                "AI outputs look confident even when fabricated",
            ],
        ),
        constraints=Constraints(
            monthly_budget="$500-2000",
            no_paid_ads=True,
            tech_stack=["Python", "Claude API", "OpenAI API", "Gemini API", "React", "Streamlit",
                        "SQLite", "Supabase", "DigitalOcean", "Netlify"],
            timeline_pressure="ATLAS closest to revenue. Analyst's Edge has F1 proof point. APEX has IHG reference.",
            regulatory_considerations=[
                "Financial advice disclaimers for ATLAS",
                "GDPR — PRISM uses aggregate counts only",
                "LinkedIn ToS for PRISM scraping",
                "Enterprise data governance for APEX",
            ],
        ),
        brand=BrandVoice(
            tone=(
                "Sharp, transparent, anti-guru. Calm, direct, precise. Teach, demonstrate, "
                "make them reach for it. Never sell. Write up. Show your work. No hype."
            ),
            edginess_level=7,
            topics_to_avoid=[
                "Naming specific competitors",
                "Guaranteed returns or outcomes",
                "Hype language (revolutionary, game-changing, disruptive)",
                "Condescension",
                "Hard sell CTAs or urgency tactics",
                "Leading with 'AI' — lead with outcome",
                "Discounting",
            ],
            aspirational_voices=[
                "Stripe", "Bridgewater / Ray Dalio", "Ben Thompson / Stratechery", "Patrick McKenzie / patio11",
            ],
        ),
        monetisation=MonetisationInfo(
            primary_model="SaaS + white-label + one-time purchases",
            price_points=[
                "PRISM: per-company-benchmarked",
                "Analyst's Edge: £49-99 per scan + per-employee",
                "APEX Starter: Free/£49/mo, Pro: £149/mo, Enterprise: £699+/mo",
                "ATLAS: £149 one-time (early access)",
                "White-label: £1,000-5,000/month + usage",
            ],
            white_label_pricing="Platform fee + usage across PRISM, Analyst's Edge, APEX",
            revenue_targets="£20K+ MRR within 12 months. £1-5M ARR three-year vision.",
        ),
        channels=ChannelPreferences(
            active_channels=["ATLAS landing page (Netlify)", "ATLAS Lemonsqueezy checkout"],
            strongest_channel="",
            channels_to_explore=[
                "LinkedIn (primary organic)", "Reddit (multiple subreddits per product)",
                "Substack/newsletter", "Product Hunt", "Hacker News Show HN",
                "YouTube", "Twitter/X", "Email sequences", "Direct LinkedIn outreach",
                "Analyst relations (Gartner for APEX)", "SEO",
            ],
            content_creation_capacity="high",
        ),
        raw_interview_log=[{
            "topic": "meta",
            "question": "Interview source",
            "answer": "Pre-filled from product marketing assessments for all four Quantum Tools products.",
        }],
    )
    return brief


def save_brief():
    brief = build_brief()
    output_path = OUTPUT_DIR / "gtm_brief.json"
    save_json(brief.model_dump(), output_path)
    print(f"GTM Brief saved to {output_path}")
    print(f"\nUmbrella: Quantum Tools — quantumtools.ai")
    print(f"Products: {len(brief.products)}")
    for p in brief.products:
        print(f"  - {p.name}: {p.current_stage}")
    print(f"Segments: {len(brief.market.target_segments)}")
    print(f"Edginess: {brief.brand.edginess_level}/10")
    print(f"\nRun 'python main.py strategy' to generate your GTM strategy.")


if __name__ == "__main__":
    save_brief()
