"""Streamlit Operator Dashboard — Quantum Tools GTM Intelligence Engine.

Multi-page dashboard wiring all the layers together:
  - Dashboard (overview + pipeline counts)
  - Ideas (bulk generate, select, approve, reject)
  - Content (review generated pieces, approve/reject)
  - Deployment (schedule, deploy)
  - Segments (view Core-Five spec)
  - Brand Standards (view/edit)

Launch: python main.py ui
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import streamlit as st

# Make gtm_engine importable when launched via streamlit run
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from gtm_engine.config import OUTPUT_DIR, CONTENT_QUEUE_DIR, DATA_DIR, LOGS_DIR
from gtm_engine.ideas import IdeaBank, FUNNEL_LEVELS, STATES
from gtm_engine.approval import get_pipeline_counts
from gtm_engine.segments import load_segments
from gtm_engine.utils.file_io import load_json

# --- Brand palette (UI rendering — readable dark-blue theme) ---
# Note: brand_standards.json still uses #0a0a0f as the content aesthetic;
# this palette is purely for the operator dashboard readability.
BRAND_COLOURS = {
    "bg": "#0d1b2a",          # Deep navy blue (not pure black)
    "bg_panel": "#152638",    # Slightly lighter for panels and expanders
    "bg_card": "#1b2e44",     # Card/hover background
    "primary": "#6c63ff",     # Purple accent
    "primary_hover": "#8a80ff",
    "hot": "#ff6b6b",         # Red coral for rejection/warning
    "gold": "#ffd166",        # Gold for emphasis
    "text": "#ffffff",        # Pure white for all body text
    "text_muted": "#d0d6e0",  # Light blue-grey (readable on navy)
    "border": "#2a4060",      # Subtle border colour
}


def main():
    st.set_page_config(
        page_title="Quantum Tools GTM Engine",
        page_icon="",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    _apply_dark_theme()
    _initialise_libraries()

    # Sidebar navigation — grouped into logical phases
    st.sidebar.markdown("### Quantum Tools")
    st.sidebar.markdown("*GTM Intelligence Engine*")
    st.sidebar.markdown("---")

    # Groups of pages — keeps the menu scannable as the surface grows.
    nav_groups = {
        "OVERVIEW": [
            ("Dashboard", page_dashboard),
        ],
        "STRATEGY": [
            ("Strategy Builder", page_strategy_builder),
            ("Strategy Dashboard", page_strategy_dashboard),
            ("Strategy Context", page_strategy_context),
            ("Live Signals", page_intelligence),
        ],
        "IDEATION": [
            ("Brief Requests", page_briefs),
            ("Ideas", page_ideas),
            ("Data Vault", page_data_vault),
        ],
        "PRODUCTION": [
            ("Producer Briefs", page_producer_briefs),
            ("Content Queue", page_content),
            ("Scene Library", page_scenes),
            ("Character Library", page_characters),
        ],
        "DEPLOYMENT": [
            ("Deployment", page_deployment),
        ],
        "SETTINGS": [
            ("Brand Standards", page_brand),
            ("Avatar Settings", page_avatar_settings),
            ("Core-Five Spec", page_segments),
        ],
    }

    # Initialise session state for selected page
    if "selected_page" not in st.session_state:
        st.session_state.selected_page = "Dashboard"

    # Render each group with a header and a radio inside
    for group_label, pages in nav_groups.items():
        st.sidebar.markdown(
            f"<div style='color:#8aa0c0;font-size:0.7rem;letter-spacing:0.12em;"
            f"margin-top:0.6rem;margin-bottom:0.2rem;font-weight:600;'>{group_label}</div>",
            unsafe_allow_html=True,
        )
        for label, _ in pages:
            is_selected = st.session_state.selected_page == label
            btn_style = (
                f"width:100%;text-align:left;padding:6px 10px;border-radius:4px;"
                f"background:{'#1b2e44' if is_selected else 'transparent'};"
                f"color:{'#ffd166' if is_selected else '#ffffff'};border:none;"
                f"font-weight:{'600' if is_selected else '400'};"
            )
            if st.sidebar.button(label, key=f"nav_{label}", use_container_width=True):
                st.session_state.selected_page = label
                st.rerun()

    st.sidebar.markdown("---")
    _sidebar_pipeline_snapshot()

    # Route to selected page
    routes = {label: fn for pages in nav_groups.values() for label, fn in pages}
    selected = st.session_state.selected_page
    if selected in routes:
        routes[selected]()
    else:
        page_dashboard()


def _initialise_libraries():
    """Ensure all databases and seed data exist on first load."""
    try:
        from gtm_engine.ideas import IdeaBank
        IdeaBank()  # creates schema
    except Exception:
        pass

    try:
        from gtm_engine.scenes import SceneLibrary
        lib = SceneLibrary()
        lib.seed_if_empty()
    except Exception:
        pass

    try:
        from gtm_engine.data_vault import DataVault
        DataVault()
    except Exception:
        pass

    try:
        from gtm_engine.briefs import BriefQueue
        BriefQueue()
    except Exception:
        pass

    try:
        from gtm_engine.strategy_framework import StrategyStore
        StrategyStore()
    except Exception:
        pass

    try:
        from gtm_engine.producer import ProducerBriefLibrary
        ProducerBriefLibrary()
    except Exception:
        pass


def _apply_dark_theme():
    st.markdown(
        f"""
        <style>
        /* Hide Streamlit's default top toolbar / white header that overlays the app */
        header[data-testid="stHeader"] {{
            background-color: {BRAND_COLOURS['bg']} !important;
            height: 0 !important;
        }}
        div[data-testid="stToolbar"] {{
            display: none !important;
        }}
        /* Hide the default "Deploy" / hamburger that floats top-right */
        .stApp > header {{
            background-color: {BRAND_COLOURS['bg']} !important;
        }}
        /* Remove default top padding so content starts higher */
        .block-container {{
            padding-top: 2rem !important;
        }}

        /* Base background and text — dark navy with white text */
        .stApp {{
            background-color: {BRAND_COLOURS['bg']};
            color: {BRAND_COLOURS['text']};
        }}
        .stApp, .stApp p, .stApp span, .stApp div, .stApp li {{
            color: {BRAND_COLOURS['text']};
        }}

        /* Sidebar — darker panel shade */
        section[data-testid="stSidebar"] {{
            background-color: {BRAND_COLOURS['bg_panel']};
        }}
        section[data-testid="stSidebar"] * {{
            color: {BRAND_COLOURS['text']} !important;
        }}

        /* Headings */
        h1, h2, h3, h4, h5, h6 {{
            color: {BRAND_COLOURS['text']} !important;
            font-family: 'Playfair Display', Georgia, serif;
        }}

        /* Muted captions — readable blue-grey, not dark grey */
        .stCaption, small, [data-testid="stCaptionContainer"] {{
            color: {BRAND_COLOURS['text_muted']} !important;
        }}

        /* Expander panels */
        div[data-testid="stExpander"] {{
            background-color: {BRAND_COLOURS['bg_panel']};
            border: 1px solid {BRAND_COLOURS['border']};
            border-radius: 6px;
        }}
        div[data-testid="stExpander"] summary {{
            color: {BRAND_COLOURS['text']} !important;
        }}

        /* Buttons — purple primary, bright white text */
        .stButton > button {{
            background-color: {BRAND_COLOURS['primary']};
            color: #ffffff !important;
            border: none;
            border-radius: 6px;
            font-weight: 600;
        }}
        .stButton > button:hover {{
            background-color: {BRAND_COLOURS['primary_hover']};
            color: #ffffff !important;
        }}

        /* Metric cards — white label, purple value */
        [data-testid="stMetricLabel"] {{
            color: {BRAND_COLOURS['text_muted']} !important;
        }}
        [data-testid="stMetricValue"] {{
            color: {BRAND_COLOURS['gold']} !important;
        }}

        /* Input fields on dark background */
        .stTextInput > div > div > input,
        .stTextArea > div > div > textarea,
        .stSelectbox > div > div {{
            background-color: {BRAND_COLOURS['bg_panel']};
            color: {BRAND_COLOURS['text']} !important;
            border: 1px solid {BRAND_COLOURS['border']};
        }}

        /* Markdown code blocks — readable */
        code, pre {{
            background-color: {BRAND_COLOURS['bg_panel']} !important;
            color: {BRAND_COLOURS['gold']} !important;
        }}

        /* Tables and dataframes */
        .stDataFrame, .stTable {{
            background-color: {BRAND_COLOURS['bg_panel']};
            color: {BRAND_COLOURS['text']};
        }}

        /* Blockquotes (used for hooks) */
        blockquote {{
            border-left: 3px solid {BRAND_COLOURS['primary']};
            color: {BRAND_COLOURS['gold']} !important;
            background-color: {BRAND_COLOURS['bg_panel']};
            padding: 12px 16px;
            border-radius: 4px;
        }}

        /* Info/success/warning boxes */
        div[data-baseweb="notification"] {{
            background-color: {BRAND_COLOURS['bg_panel']};
            color: {BRAND_COLOURS['text']};
        }}

        /* Tabs */
        .stTabs [data-baseweb="tab-list"] button {{
            color: {BRAND_COLOURS['text_muted']} !important;
        }}
        .stTabs [data-baseweb="tab-list"] button[aria-selected="true"] {{
            color: {BRAND_COLOURS['primary']} !important;
            border-bottom-color: {BRAND_COLOURS['primary']} !important;
        }}

        /* Checkboxes */
        .stCheckbox label {{
            color: {BRAND_COLOURS['text']} !important;
        }}
        </style>
        """,
        unsafe_allow_html=True,
    )


def _sidebar_pipeline_snapshot():
    """Show a compact pipeline snapshot in the sidebar."""
    try:
        counts = get_pipeline_counts()
    except Exception:
        counts = {}

    st.sidebar.markdown("**Pipeline**")
    st.sidebar.markdown(f"- Draft: `{counts.get('idea_draft', 0)}`")
    st.sidebar.markdown(f"- Approved: `{counts.get('idea_approved', 0)}`")
    st.sidebar.markdown(f"- Content: `{counts.get('content_generated', 0)}`")
    st.sidebar.markdown(f"- Scheduled: `{counts.get('deployment_scheduled', 0)}`")
    st.sidebar.markdown(f"- Deployed: `{counts.get('deployed', 0)}`")


# -----------------------------------------------------------------------------
# DASHBOARD
# -----------------------------------------------------------------------------

def page_dashboard():
    st.title("Dashboard")
    st.caption("Engine overview — pipeline state, configuration health, recent activity")

    # --- Pipeline counts ---
    col1, col2, col3, col4 = st.columns(4)
    counts = get_pipeline_counts()

    with col1:
        st.metric("Draft ideas", counts.get("idea_draft", 0))
    with col2:
        st.metric("Approved ideas", counts.get("idea_approved", 0))
    with col3:
        st.metric("Content pieces", counts.get("content_generated", 0) + counts.get("content_approved", 0))
    with col4:
        st.metric("Deployed", counts.get("deployed", 0))

    st.markdown("---")

    # --- Configuration health (strategic foundations only — no project-specific assets) ---
    col_a, col_b = st.columns(2)

    with col_a:
        st.subheader("Configuration")
        brief_exists = (OUTPUT_DIR / "gtm_brief.json").exists()
        strategy_exists = (OUTPUT_DIR / "gtm_strategy.json").exists()
        brand_exists = (DATA_DIR / "brand_standards.json").exists()

        # Content Strategy framework status
        strategy_complete = False
        try:
            from gtm_engine.strategy_framework import StrategyStore
            strategy_complete = StrategyStore().load().setup_complete
        except Exception:
            pass

        # Avatar provider status
        try:
            from gtm_engine.avatar import get_provider
            avatar = get_provider()
            avatar_label = avatar.provider_name
            avatar_ok = avatar.is_configured() or avatar.provider_id == "none"
        except Exception:
            avatar_label = "—"
            avatar_ok = False

        st.markdown(f"- GTM Brief: {'Ready' if brief_exists else '**Missing**'}")
        st.markdown(f"- GTM Strategy: {'Ready' if strategy_exists else '**Missing**'}")
        st.markdown(f"- Content Strategy: {'Ready' if strategy_complete else '**Not built**'}")
        st.markdown(f"- Brand Standards: {'Ready' if brand_exists else '**Missing**'}")
        st.markdown(f"- Avatar Provider: `{avatar_label}` {'OK' if avatar_ok else 'needs config'}")

    with col_b:
        st.subheader("Recent Decisions")
        decisions_path = LOGS_DIR / "decisions.jsonl"
        if decisions_path.exists():
            lines = decisions_path.read_text().strip().split("\n")
            recent = [json.loads(line) for line in lines[-5:] if line]
            for d in reversed(recent):
                st.markdown(f"- `{d['category']}`: {d['decision']}")
        else:
            st.markdown("_No decisions logged yet_")


# -----------------------------------------------------------------------------
# STRATEGY CONTEXT — the ingestion visibility point
# -----------------------------------------------------------------------------

def page_strategy_context():
    st.title("Strategy Context")
    st.caption(
        "Everything the idea generator loads as context. If something is "
        "missing here, ideas will drift from the strategy."
    )

    brief_path = OUTPUT_DIR / "gtm_brief.json"
    strategy_path = OUTPUT_DIR / "gtm_strategy.json"
    brand_path = DATA_DIR / "brand_standards.json"
    master_assets_dir = DATA_DIR / "master_assets"

    # Loading status
    st.subheader("Ingestion Status")
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("GTM Brief", "Loaded" if brief_path.exists() else "Missing")
    with col2:
        st.metric("GTM Strategy", "Loaded" if strategy_path.exists() else "Missing")
    with col3:
        st.metric("Brand Standards", "Loaded" if brand_path.exists() else "Missing")
    with col4:
        n_assets = len(list(master_assets_dir.glob("MA-*.json"))) if master_assets_dir.exists() else 0
        st.metric("Master Assets", n_assets)

    st.markdown("---")

    # Tabs for each loaded file
    tabs = st.tabs([
        "GTM Brief",
        "GTM Strategy",
        "Master Asset Canon",
        "Uncomfortable Truths",
        "Target Segments",
    ])

    # GTM Brief tab
    with tabs[0]:
        if brief_path.exists():
            brief = load_json(brief_path)
            st.markdown(f"**Umbrella brand:** {brief.get('umbrella_brand', '')}")
            st.markdown("---")
            st.subheader("Product Portfolio")
            for p in brief.get("products", []):
                with st.expander(f"**{p.get('name', 'Unknown')}** ({p.get('current_stage', 'n/a')})"):
                    st.markdown(f"**Description:** {p.get('description', '')}")
                    st.markdown(f"**Core value prop:** {p.get('core_value_prop', '')}")
                    st.markdown(f"**Positioning:** {p.get('positioning', '')}")
                    if p.get("key_features"):
                        st.markdown("**Key features:**")
                        for f in p["key_features"]:
                            st.markdown(f"- {f}")
                    if p.get("target_users"):
                        st.markdown("**Target users:**")
                        for u in p["target_users"]:
                            st.markdown(f"- {u}")
        else:
            st.warning("No GTM Brief found. Run `python main.py prefill` or `python main.py discover` to create one.")

    # GTM Strategy tab
    with tabs[1]:
        if strategy_path.exists():
            strategy = load_json(strategy_path)
            st.markdown(f"**Summary:** {strategy.get('brief_summary', '')}")
            st.markdown("---")
            st.subheader("Channels (stack-ranked)")
            for ch in strategy.get("channels", [])[:8]:
                st.markdown(
                    f"**#{ch.get('priority_rank', '?')} {ch.get('channel', '')}** — "
                    f"Impact {ch.get('impact_score', 0)}/10, "
                    f"Effort {ch.get('effort_score', 0)}/10, "
                    f"Ratio {ch.get('impact_to_effort_ratio', 0)}"
                )
                if ch.get("quick_win"):
                    st.caption(f"Quick win: {ch['quick_win']}")
        else:
            st.warning("No GTM Strategy found. Run `python main.py strategy` after the brief is in place.")

    # Master Asset Canon tab
    with tabs[2]:
        if master_assets_dir.exists():
            assets = sorted(master_assets_dir.glob("MA-*.json"))
            if assets:
                st.markdown(
                    "These master assets are the narrative anchors. Every "
                    "idea in the idea bank should feel like it could extend "
                    "this body of work."
                )
                for path in assets:
                    try:
                        ma = load_json(path)
                        with st.expander(f"**{ma.get('id')}**: {ma.get('title', '')}", expanded=True):
                            st.markdown(f"**Hook:** *{ma.get('hook', '')}*")
                            st.markdown(f"**Uncomfortable truth:** {ma.get('uncomfortable_truth', '')}")
                            st.markdown(f"**Point of view:** {ma.get('point_of_view', '')}")
                            if ma.get("body"):
                                with st.expander("Full body"):
                                    st.markdown(ma["body"])
                    except Exception as e:
                        st.error(f"Could not load {path.name}: {e}")
            else:
                st.info("No master assets imported yet. Run `python main.py import-ma001` to import the Consultancy Death Spiral.")
        else:
            st.info("No master_assets directory. Run `python main.py import-ma001` to get started.")

    # Uncomfortable Truths tab
    with tabs[3]:
        if strategy_path.exists():
            strategy = load_json(strategy_path)
            edginess = strategy.get("edginess", {})
            st.markdown(f"**Edginess level:** {edginess.get('overall_level', 'n/a')}/10")

            st.markdown("---")
            st.subheader("Uncomfortable truths")
            for t in edginess.get("uncomfortable_truths", []):
                st.markdown(f"- {t}")

            st.markdown("---")
            st.subheader("Point of view statements")
            for p in edginess.get("point_of_view_statements", []):
                st.markdown(f"- {p}")

            st.markdown("---")
            st.subheader("Category norms to break")
            for n in edginess.get("category_norms_to_break", []):
                st.markdown(f"- {n}")
        else:
            st.warning("Generate a strategy first to see edginess framework.")

    # Target Segments tab
    with tabs[4]:
        if strategy_path.exists():
            strategy = load_json(strategy_path)
            segments = strategy.get("segments", [])
            positioning = strategy.get("positioning", [])

            for seg in segments:
                with st.expander(f"**#{seg.get('priority_rank', '?')} {seg.get('name', '')}**", expanded=seg.get("priority_rank") == 1):
                    st.markdown(f"**Description:** {seg.get('description', '')}")
                    st.markdown(f"**Willingness to pay:** {seg.get('willingness_to_pay', '')}")
                    if seg.get("pain_points"):
                        st.markdown("**Pain points:**")
                        for p in seg["pain_points"]:
                            st.markdown(f"- {p}")
                    st.markdown(f"**Reasoning:** {seg.get('reasoning', '')}")

                    # Matching positioning
                    matching = [p for p in positioning if p.get("segment_name") == seg.get("name")]
                    if matching:
                        st.markdown("---")
                        st.markdown(f"**Headline:** *{matching[0].get('headline', '')}*")
                        st.markdown(f"**Value prop:** {matching[0].get('value_proposition', '')}")
        else:
            st.warning("Generate a strategy first to see segments.")


# -----------------------------------------------------------------------------
# IDEAS
# -----------------------------------------------------------------------------

def page_ideas():
    st.title("Ideas")
    st.caption("Idea bank — generate, filter, bulk approve or reject")

    bank = IdeaBank()

    # --- Generation panel ---
    with st.expander("Generate new ideas", expanded=False):
        # Show what context will be loaded
        brief_ok = (OUTPUT_DIR / "gtm_brief.json").exists()
        strat_ok = (OUTPUT_DIR / "gtm_strategy.json").exists()
        n_ma = len(list((DATA_DIR / "master_assets").glob("MA-*.json"))) if (DATA_DIR / "master_assets").exists() else 0
        st.markdown(
            f"**Context loaded:** GTM Brief {'Y' if brief_ok else 'N'} · "
            f"GTM Strategy {'Y' if strat_ok else 'N'} · "
            f"Master Assets: {n_ma}"
        )
        if not brief_ok or not strat_ok:
            st.warning(
                "Missing context. Ideas will be weaker. Go to **Strategy Context** "
                "to see what's loaded, and run `python main.py prefill` / "
                "`python main.py strategy` from the terminal if files are missing."
            )

        col_g1, col_g2, col_g3 = st.columns([2, 2, 1])
        with col_g1:
            n_ideas = st.number_input("Number of ideas", min_value=5, max_value=200, value=50, step=5)
        with col_g2:
            st.markdown("Funnel auto-balance: umbrella / product / feature / proof")
        with col_g3:
            if st.button("Generate batch", type="primary"):
                with st.spinner(f"Generating {n_ideas} ideas via Claude (loading full strategy context)..."):
                    try:
                        from gtm_engine.ideas.generator import generate_and_save
                        ids = generate_and_save(n=n_ideas)
                        st.success(f"Generated {len(ids)} ideas. Scroll down to review.")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Generation failed: {e}")

    # --- Danger zone: clear stale ideas ---
    with st.expander("Clear stale drafts (danger zone)", expanded=False):
        st.warning(
            "This permanently deletes all ideas in `idea_draft` status. Use this "
            "to clear an off-strategy batch before regenerating with better context."
        )
        if st.button("Delete all draft ideas"):
            import sqlite3
            from gtm_engine.config import SQLITE_PATH
            with sqlite3.connect(str(SQLITE_PATH)) as conn:
                cursor = conn.execute("DELETE FROM ideas WHERE status = 'idea_draft'")
                n_deleted = cursor.rowcount
                conn.commit()
            st.success(f"Deleted {n_deleted} draft ideas.")
            st.session_state.selected_ideas = set()
            st.rerun()

    st.markdown("---")

    # --- Filters ---
    col_f1, col_f2, col_f3, col_f4 = st.columns(4)
    with col_f1:
        filter_status = st.selectbox(
            "Status",
            ["All"] + STATES,
            index=1,  # Default to idea_draft
        )
    with col_f2:
        filter_funnel = st.selectbox("Funnel level", ["All"] + FUNNEL_LEVELS)
    with col_f3:
        filter_product = st.selectbox(
            "Product",
            ["All", "Quantum Tools", "PRISM", "Analyst's Edge", "APEX", "ATLAS"],
        )
    with col_f4:
        filter_segment = st.selectbox(
            "Segment type",
            ["All", "hook", "tension", "pivot", "proof", "bookend", "standalone"],
        )

    ideas = bank.list_all(
        status=None if filter_status == "All" else filter_status,
        funnel_level=None if filter_funnel == "All" else filter_funnel,
        product=None if filter_product in ("All", "Quantum Tools") else filter_product,
        segment_type=None if filter_segment == "All" else filter_segment,
    )

    st.markdown(f"**{len(ideas)} ideas** matching filters")

    if not ideas:
        st.info("No ideas match the current filters. Try generating a batch or adjusting the filters.")
        return

    # --- Bulk selection state ---
    if "selected_ideas" not in st.session_state:
        st.session_state.selected_ideas = set()

    # --- ALWAYS-VISIBLE action bar ---
    st.markdown("### Actions")
    st.caption(
        "Tick ideas below then hit an action. Actions are disabled until at "
        "least one idea is selected."
    )

    has_selection = bool(st.session_state.selected_ideas)
    n_sel = len(st.session_state.selected_ideas)

    col_sel1, col_sel2, col_sel3 = st.columns([1, 1, 3])
    with col_sel1:
        if st.button("Select all shown"):
            st.session_state.selected_ideas = {i.id for i in ideas}
            st.rerun()
    with col_sel2:
        if st.button("Clear selection"):
            st.session_state.selected_ideas = set()
            st.rerun()
    with col_sel3:
        if has_selection:
            st.markdown(f"**{n_sel} ideas selected**")
        else:
            st.markdown("*Nothing selected*")

    col_act1, col_act2, col_act3, col_act4, col_act5 = st.columns(5)
    with col_act1:
        if st.button("+ Approve", type="primary", disabled=not has_selection):
            from gtm_engine.batch import bulk_approve_ideas
            report = bulk_approve_ideas(list(st.session_state.selected_ideas))
            st.success(f"Approved {len(report['successful'])} ideas")
            st.session_state.selected_ideas = set()
            st.rerun()
    with col_act2:
        if st.button("- Reject", disabled=not has_selection):
            from gtm_engine.batch import bulk_reject_ideas
            report = bulk_reject_ideas(list(st.session_state.selected_ideas))
            st.success(f"Rejected {len(report['successful'])} ideas")
            st.session_state.selected_ideas = set()
            st.rerun()
    with col_act3:
        if st.button("> Producer Brief", disabled=not has_selection):
            from gtm_engine.producer import generate_producer_brief
            with st.spinner(f"Generating producer briefs for {n_sel} ideas..."):
                for iid in list(st.session_state.selected_ideas):
                    try:
                        generate_producer_brief(iid)
                    except Exception as e:
                        st.error(f"Idea {iid}: {e}")
                st.success(f"Generated producer briefs. See 'Producer Briefs' page.")
                st.session_state.selected_ideas = set()
                st.rerun()
    with col_act4:
        if st.button(">> Generate Content", disabled=not has_selection):
            with st.spinner("Generating content pieces..."):
                from gtm_engine.batch import bulk_generate_content
                report = bulk_generate_content(list(st.session_state.selected_ideas))
                st.success(
                    f"Generated {len(report['successful'])}/{n_sel} content pieces"
                )
                if report["failed"]:
                    with st.expander("Failures"):
                        st.json(report["failed"])
                st.session_state.selected_ideas = set()
                st.rerun()
    with col_act5:
        if st.button("Archive", disabled=not has_selection):
            from gtm_engine.approval import archive
            for iid in st.session_state.selected_ideas:
                archive(iid, reason="Bulk archive from UI")
            st.session_state.selected_ideas = set()
            st.rerun()

    st.markdown("---")

    # --- Idea list with inline edit + comments ---
    import sqlite3
    from gtm_engine.config import SQLITE_PATH

    for idea in ideas:
        selected = idea.id in st.session_state.selected_ideas
        with st.container():
            col_check, col_body = st.columns([1, 20])
            with col_check:
                new_selected = st.checkbox(
                    "Select",
                    value=selected,
                    key=f"select_{idea.id}",
                    label_visibility="collapsed",
                )
                if new_selected and not selected:
                    st.session_state.selected_ideas.add(idea.id)
                    st.rerun()
                elif not new_selected and selected:
                    st.session_state.selected_ideas.discard(idea.id)
                    st.rerun()

            with col_body:
                header = f"**#{idea.id}** · **{idea.title}**"
                meta_bits = [f"`{idea.funnel_level}`", f"`{idea.segment_type}`",
                             f"edginess {idea.edginess_score}/10"]
                if idea.product:
                    meta_bits.insert(0, f"`{idea.product}`")
                meta_bits.append(f"status: `{idea.status}`")
                st.markdown(f"{header}  —  {' '.join(meta_bits)}")
                st.markdown(f"> *{idea.hook}*")

                with st.expander("Details / Edit / Comment"):
                    tab_view, tab_edit, tab_note = st.tabs(["View", "Edit", "Comments"])

                    with tab_view:
                        st.markdown(f"**Angle:** {idea.angle}")
                        if idea.data_requirement:
                            st.markdown(f"**Data required:** {idea.data_requirement}")
                        st.markdown(f"**Target segment:** {idea.target_segment}")
                        st.markdown(f"**Strategic objective:** {idea.strategic_objective}")
                        st.markdown(f"**Tags:** {', '.join(idea.tags) if idea.tags else '—'}")
                        if idea.notes:
                            st.markdown(f"**Notes:** {idea.notes}")

                    with tab_edit:
                        new_title = st.text_input(
                            "Title", value=idea.title, key=f"title_{idea.id}"
                        )
                        new_hook = st.text_input(
                            "Hook", value=idea.hook, key=f"hook_{idea.id}"
                        )
                        new_angle = st.text_area(
                            "Angle", value=idea.angle, key=f"angle_{idea.id}", height=80
                        )
                        new_data = st.text_input(
                            "Data requirement",
                            value=idea.data_requirement,
                            key=f"data_{idea.id}",
                        )
                        if st.button("Save edits", key=f"save_{idea.id}"):
                            with sqlite3.connect(str(SQLITE_PATH)) as conn:
                                conn.execute(
                                    """UPDATE ideas SET title=?, hook=?, angle=?,
                                       data_requirement=?, updated_at=datetime('now')
                                       WHERE id=?""",
                                    (new_title, new_hook, new_angle, new_data, idea.id),
                                )
                                conn.commit()
                            st.success("Updated.")
                            st.rerun()

                    with tab_note:
                        st.markdown("**Existing notes:**")
                        st.markdown(idea.notes or "_No notes yet_")
                        new_note = st.text_area(
                            "Append note",
                            placeholder="Tweak, refine, or leave a comment for this idea...",
                            key=f"note_{idea.id}",
                            height=80,
                        )
                        if st.button("Add note", key=f"addnote_{idea.id}") and new_note.strip():
                            from datetime import datetime as _dt
                            stamp = _dt.now().strftime("%Y-%m-%d %H:%M")
                            combined = (idea.notes + f"\n[{stamp}] {new_note.strip()}").strip()
                            with sqlite3.connect(str(SQLITE_PATH)) as conn:
                                conn.execute(
                                    "UPDATE ideas SET notes=?, updated_at=datetime('now') WHERE id=?",
                                    (combined, idea.id),
                                )
                                conn.commit()
                            st.success("Note added.")
                            st.rerun()
        st.markdown("")


# -----------------------------------------------------------------------------
# CONTENT
# -----------------------------------------------------------------------------

def page_content():
    st.title("Content Queue")
    st.caption("Review generated content, approve for deployment, or reject for regeneration")

    bank = IdeaBank()

    # Show ideas that have content attached
    filter_status = st.selectbox(
        "Filter",
        ["content_generated", "content_approved", "content_rejected", "All"],
        index=0,
    )

    ideas = bank.list_all(status=None if filter_status == "All" else filter_status)
    ideas_with_content = [i for i in ideas if i.content_piece_ids]

    st.markdown(f"**{len(ideas_with_content)}** content pieces in queue")

    if "selected_content" not in st.session_state:
        st.session_state.selected_content = set()

    col_b1, col_b2, col_b3 = st.columns([1, 1, 3])
    with col_b1:
        if st.button("Select all content"):
            st.session_state.selected_content = {i.id for i in ideas_with_content}
            st.rerun()
    with col_b2:
        if st.button("Clear content selection"):
            st.session_state.selected_content = set()
            st.rerun()
    with col_b3:
        st.markdown(f"**{len(st.session_state.selected_content)} selected**")

    if st.session_state.selected_content:
        col_ca, col_cb, col_cc = st.columns(3)
        with col_ca:
            if st.button("Approve content", type="primary"):
                from gtm_engine.batch import bulk_approve_content
                bulk_approve_content(list(st.session_state.selected_content))
                st.session_state.selected_content = set()
                st.rerun()
        with col_cb:
            if st.button("Reject content"):
                from gtm_engine.approval import reject_content
                for iid in st.session_state.selected_content:
                    try:
                        reject_content(iid, reason="Rejected from UI")
                    except Exception:
                        pass
                st.session_state.selected_content = set()
                st.rerun()
        with col_cc:
            if st.button("Schedule deployment"):
                from gtm_engine.batch import bulk_schedule_deployment
                bulk_schedule_deployment(list(st.session_state.selected_content))
                st.session_state.selected_content = set()
                st.rerun()

    st.markdown("---")

    for idea in ideas_with_content:
        selected = idea.id in st.session_state.selected_content
        col_check, col_body = st.columns([1, 20])
        with col_check:
            new_selected = st.checkbox("", value=selected, key=f"content_{idea.id}", label_visibility="collapsed")
            if new_selected and not selected:
                st.session_state.selected_content.add(idea.id)
            elif not new_selected and selected:
                st.session_state.selected_content.discard(idea.id)

        with col_body:
            st.markdown(f"**{idea.title}**  —  `{idea.status}`")
            st.markdown(f"> *{idea.hook}*")

            # Try to load and display the actual content piece
            for piece_id in idea.content_piece_ids:
                # Look in content_queue for a file starting with piece_id
                matches = list(CONTENT_QUEUE_DIR.glob(f"{piece_id}*.json"))
                if matches:
                    try:
                        piece = load_json(matches[0])
                        with st.expander(f"Content piece: {piece_id}"):
                            content = piece.get("content", {})
                            st.markdown(f"**Format:** {piece.get('format', 'n/a')}")
                            st.markdown(f"**Body:**")
                            body_text = content.get("body") or content.get("script") or json.dumps(content, indent=2)
                            st.code(body_text[:4000], language="markdown")
                    except Exception as e:
                        st.warning(f"Could not load piece {piece_id}: {e}")
        st.markdown("")


# -----------------------------------------------------------------------------
# DEPLOYMENT
# -----------------------------------------------------------------------------

def page_deployment():
    st.title("Deployment")
    st.caption("Scheduled and deployed content")

    bank = IdeaBank()
    scheduled = bank.list_all(status="deployment_scheduled")
    deployed = bank.list_all(status="deployed")

    col1, col2 = st.columns(2)
    with col1:
        st.subheader(f"Scheduled ({len(scheduled)})")
        for idea in scheduled:
            with st.container():
                st.markdown(f"- **{idea.title}** ({idea.product or 'umbrella'})")
                st.caption(idea.hook)
        if scheduled:
            if st.button("Deploy all scheduled (dry run)"):
                st.info("Dry run — would deploy these pieces to their respective channels")

    with col2:
        st.subheader(f"Deployed ({len(deployed)})")
        for idea in deployed:
            st.markdown(f"- **{idea.title}**")
            st.caption(idea.hook)


# -----------------------------------------------------------------------------
# SEGMENTS (Core-Five)
# -----------------------------------------------------------------------------

def page_segments():
    st.title("Core-Five Segments")
    st.caption("The locked 20-second reel architecture")

    segments = load_segments()

    st.markdown(f"**Version:** {segments.get('version')}  |  **Updated:** {segments.get('updated_at')}")
    st.markdown(f"**Total duration:** {segments.get('total_duration_seconds')} seconds")

    st.markdown("---")

    for seg in segments["segments"]:
        with st.expander(f"{seg['order']}. {seg['name']} ({seg['duration_seconds']}s) — {seg['purpose']}", expanded=(seg['order'] == 1)):
            col_a, col_b = st.columns(2)
            with col_a:
                st.markdown(f"**ID:** `{seg['id']}`")
                st.markdown(f"**Narrative role:** {seg['narrative_role']}")
                st.markdown(f"**Visual type:** {seg['visual_type']}")
                st.markdown(f"**Generation method:** {seg['generation_method']}")
                st.markdown(f"**Reusable asset:** {seg.get('reusable_asset', False)}")
            with col_b:
                st.markdown("**Aesthetic constraints:**")
                for c in seg["aesthetic_constraints"]:
                    st.markdown(f"- {c}")
                st.markdown(f"**Typical text overlay:** *{seg['typical_text_overlay']}*")

    st.markdown("---")
    st.subheader("Inviolable Rules")
    for rule in segments.get("inviolable_rules", []):
        st.markdown(f"- {rule}")


# -----------------------------------------------------------------------------
# BRAND STANDARDS
# -----------------------------------------------------------------------------

def page_brand():
    st.title("Brand Standards")
    st.caption("Voice, edginess, visual, presenter, and video production")

    brand_path = DATA_DIR / "brand_standards.json"
    if not brand_path.exists():
        st.warning("Brand standards not initialised. Run `python main.py brand` first.")
        return

    standards = load_json(brand_path)

    tabs = st.tabs(["Voice", "Edginess", "Visual", "Presenter", "Video Production"])

    with tabs[0]:
        voice = standards.get("voice", {})
        st.markdown(f"**Tone descriptors:** {', '.join(voice.get('tone_descriptors', []))}")
        st.markdown(f"**Vocabulary level:** {voice.get('vocabulary_level', '')}")
        st.markdown(f"**Philosophy:** *{voice.get('philosophy', '')}*")
        st.markdown("**Forbidden phrases:**")
        for phrase in voice.get("forbidden_phrases", []):
            st.markdown(f"- `{phrase}`")

    with tabs[1]:
        edginess = standards.get("edginess", {})
        st.metric("Edginess level", f"{edginess.get('level', 0)}/10")
        st.markdown("**Principles:**")
        for name, detail in edginess.get("principles", {}).items():
            st.markdown(f"- **{name}** ({detail.get('weight', '')}): {detail.get('description', '')}")

    with tabs[2]:
        visual = standards.get("visual", {})
        st.markdown("**Colours:**")
        cols = st.columns(5)
        for i, (name, hex_val) in enumerate(visual.get("colours", {}).items()):
            with cols[i % 5]:
                st.markdown(f"<div style='background:{hex_val}; padding:20px; border-radius:4px;'>{name}<br>`{hex_val}`</div>", unsafe_allow_html=True)

    with tabs[3]:
        st.json(standards.get("presenter", {}))

    with tabs[4]:
        st.json(standards.get("video_production", {}))


# -----------------------------------------------------------------------------
# CHARACTER LIBRARY
# -----------------------------------------------------------------------------

def page_characters():
    st.title("Character Library")
    st.caption("Locked character manifests and reference images")

    st.markdown(
        "Characters are the locked performers used across all content. "
        "Theo is the primary character. Upload additional reference images "
        "to strengthen identity consistency in Veo generation."
    )

    chars_dir = DATA_DIR.parent / "references" / "influencers"
    chars_dir.mkdir(parents=True, exist_ok=True)

    # Upload new reference images for existing characters
    with st.expander("Upload a new reference image"):
        available_chars = [p.name for p in chars_dir.iterdir() if p.is_dir()] or ["theo"]
        target_char = st.selectbox("Character", available_chars)
        uploaded = st.file_uploader("Image", type=["png", "jpg", "jpeg"])
        image_name = st.text_input("Filename (without extension)", placeholder="e.g. hero_variant_1")
        if st.button("Save image", disabled=not (uploaded and image_name)):
            target_dir = chars_dir / target_char
            target_dir.mkdir(parents=True, exist_ok=True)
            ext = Path(uploaded.name).suffix or ".png"
            out_path = target_dir / f"{image_name}{ext}"
            out_path.write_bytes(uploaded.getbuffer())
            st.success(f"Saved to {out_path}")
            st.rerun()

    st.markdown("---")

    # List every character and its images
    for char_dir in sorted(chars_dir.iterdir()):
        if not char_dir.is_dir():
            continue
        manifest_path = char_dir / "manifest.json"
        char_name = char_dir.name
        canonical_desc = ""
        if manifest_path.exists():
            try:
                manifest = load_json(manifest_path)
                char = manifest.get("character", {})
                char_name = char.get("name", char_dir.name)
                canonical_desc = char.get("canonical_description", "")
            except Exception:
                pass

        st.subheader(char_name)
        if canonical_desc:
            st.markdown(canonical_desc)

        images = sorted(char_dir.glob("*.png")) + sorted(char_dir.glob("*.jpg"))
        hero_path = char_dir / "hero.png"
        if images:
            st.markdown(f"**Reference images ({len(images)}):**")
            cols = st.columns(min(4, len(images)))
            for i, img in enumerate(images):
                with cols[i % 4]:
                    is_hero = img.name == "hero.png"
                    caption = f"{img.stem}{' [HERO]' if is_hero else ''}"
                    st.image(str(img), caption=caption, use_container_width=True)

            if hero_path.exists():
                st.caption(
                    f"The Hero image (`hero.png`) is passed to every Veo call "
                    f"as the visual anchor — it locks the character identity."
                )
        else:
            st.info(
                f"No images yet. Place them in `{char_dir}` or upload above. "
                f"At minimum you need `hero.png`."
            )
        st.markdown("---")


# -----------------------------------------------------------------------------
# SCENE LIBRARY
# -----------------------------------------------------------------------------

def page_scenes():
    st.title("Scene Library")
    st.caption(
        "Reusable environments, separate from characters. Any character can "
        "be placed in any scene. Scenes are the 'situations' used across "
        "reels — the Executive Pool, the Hotel Lobby, the VIP Lounge."
    )

    from gtm_engine.scenes import SceneLibrary, Scene
    lib = SceneLibrary()
    lib.seed_if_empty()

    # Add new scene
    with st.expander("Add a new scene"):
        new_id = st.text_input("Scene id (lowercase, no spaces)", placeholder="e.g. data_observatory")
        new_name = st.text_input("Scene name", placeholder="The Data Observatory")
        new_desc = st.text_area("Description", height=80)
        new_env = st.text_area("Environment prompt (for Nano Banana)", height=100)
        new_start = st.text_area("Start frame prompt", height=80)
        new_end = st.text_area("End frame prompt", height=80)
        new_anim = st.text_area("Animation directive (for Veo)", height=80)
        best_for = st.multiselect(
            "Best for segments",
            ["hook", "tension", "pivot", "proof", "bookend"],
        )
        if st.button("Save scene", disabled=not (new_id and new_name)):
            scene = Scene(
                id=new_id,
                name=new_name,
                description=new_desc,
                environment_prompt=new_env,
                start_frame_prompt=new_start,
                end_frame_prompt=new_end,
                animation_directive=new_anim,
                best_for_segments=best_for,
                locked=False,
            )
            lib.create(scene)
            st.success(f"Scene '{new_name}' saved.")
            st.rerun()

    # Upload reference image for an existing scene
    with st.expander("Upload reference image for a scene"):
        from gtm_engine.scenes import SCENES_DIR
        scenes = lib.list_all()
        if scenes:
            target = st.selectbox("Scene", [s.id for s in scenes], format_func=lambda x: next((s.name for s in scenes if s.id == x), x))
            uploaded = st.file_uploader("Image", type=["png", "jpg", "jpeg"], key="scene_upload")
            if st.button("Save scene image", disabled=not uploaded):
                scene_folder = SCENES_DIR / target
                scene_folder.mkdir(parents=True, exist_ok=True)
                out_path = scene_folder / uploaded.name
                out_path.write_bytes(uploaded.getbuffer())
                lib.attach_reference_image(target, str(out_path))
                st.success(f"Saved to {out_path}")
                st.rerun()

    st.markdown("---")

    scenes = lib.list_all()
    st.markdown(f"**{len(scenes)} scenes** in the library")

    for scene in scenes:
        lock_tag = " [LOCKED]" if scene.locked else ""
        with st.expander(f"**{scene.name}**{lock_tag} — {scene.narrative_purpose}", expanded=False):
            st.markdown(f"**ID:** `{scene.id}`")
            st.markdown(f"**Description:** {scene.description}")
            if scene.best_for_segments:
                st.markdown(f"**Best for:** {', '.join(scene.best_for_segments)}")

            tab_env, tab_frames, tab_anim, tab_refs = st.tabs([
                "Environment", "Start/End frames", "Animation", "Reference images"
            ])
            with tab_env:
                st.code(scene.environment_prompt, language="text")
            with tab_frames:
                st.markdown("**Start frame prompt:**")
                st.code(scene.start_frame_prompt, language="text")
                st.markdown("**End frame prompt:**")
                st.code(scene.end_frame_prompt, language="text")
            with tab_anim:
                st.code(scene.animation_directive, language="text")
            with tab_refs:
                if scene.reference_images:
                    cols = st.columns(min(3, len(scene.reference_images)))
                    for i, img in enumerate(scene.reference_images):
                        p = Path(img)
                        if p.exists():
                            with cols[i % 3]:
                                st.image(str(p), use_container_width=True)
                else:
                    st.info("No reference images yet.")

            if not scene.locked:
                if st.button("Delete scene", key=f"del_scene_{scene.id}"):
                    lib.delete(scene.id)
                    st.rerun()


# -----------------------------------------------------------------------------
# DATA VAULT
# -----------------------------------------------------------------------------

def page_data_vault():
    st.title("Data Vault")
    st.caption(
        "Real data the content references. If an idea needs '52-week Atlas "
        "performance' and you haven't added it here, the content can't truly "
        "cite it. Add data, verify it, and the idea/producer-brief generators "
        "will reference these sources explicitly."
    )

    from gtm_engine.data_vault import DataVault, DataSource, SOURCE_TYPES
    vault = DataVault()

    with st.expander("Add a new data source"):
        col_n1, col_n2 = st.columns(2)
        with col_n1:
            new_name = st.text_input("Name", placeholder="e.g. Atlas 52-week live performance log")
            new_type = st.selectbox("Type", SOURCE_TYPES)
            new_products = st.multiselect(
                "Related products",
                ["Quantum Tools", "PRISM", "Analyst's Edge", "APEX", "ATLAS"],
            )
        with col_n2:
            new_desc = st.text_input("Short description", placeholder="One-line summary")
            new_freshness = st.text_input("Freshness", placeholder="e.g. 2026-04-10 or live")
            new_url = st.text_input("Source URL (optional)")

        new_content = st.text_area(
            "Content (markdown, CSV, JSON, quote, or plain text)",
            height=200,
            placeholder="Paste the actual data here — this is what content will cite.",
        )
        if st.button("Save data source", disabled=not (new_name and new_content)):
            source = DataSource(
                name=new_name,
                description=new_desc,
                source_type=new_type,
                content=new_content,
                related_products=new_products,
                freshness=new_freshness,
                source_url=new_url,
            )
            sid = vault.create(source)
            st.success(f"Saved as source #{sid}")
            st.rerun()

    st.markdown("---")

    # Filters
    col_f1, col_f2, col_f3 = st.columns(3)
    with col_f1:
        f_type = st.selectbox("Type filter", ["All"] + SOURCE_TYPES)
    with col_f2:
        f_product = st.selectbox(
            "Product filter",
            ["All", "PRISM", "Analyst's Edge", "APEX", "ATLAS"],
        )
    with col_f3:
        f_verified = st.checkbox("Verified only")

    sources = vault.list_all(
        source_type=None if f_type == "All" else f_type,
        verified_only=f_verified,
        product=None if f_product == "All" else f_product,
    )

    st.markdown(f"**{len(sources)} data sources**")

    for src in sources:
        verified_tag = "[VERIFIED]" if src.verified else "[UNVERIFIED]"
        with st.expander(f"#{src.id} · **{src.name}** · `{src.source_type}` · {verified_tag}"):
            st.markdown(f"**Description:** {src.description}")
            if src.related_products:
                st.markdown(f"**Products:** {', '.join(src.related_products)}")
            if src.freshness:
                st.markdown(f"**Freshness:** {src.freshness}")
            if src.source_url:
                st.markdown(f"**URL:** {src.source_url}")
            st.markdown("**Content:**")
            st.code(src.content[:4000], language="markdown")
            col_v1, col_v2 = st.columns(2)
            with col_v1:
                if not src.verified and st.button("Mark verified", key=f"verify_{src.id}"):
                    vault.verify(src.id)
                    st.rerun()
            with col_v2:
                if st.button("Delete", key=f"del_data_{src.id}"):
                    vault.delete(src.id)
                    st.rerun()


# -----------------------------------------------------------------------------
# BRIEF REQUESTS
# -----------------------------------------------------------------------------

def page_briefs():
    st.title("Brief Requests")
    st.caption(
        "Submit a natural-language content request and generate a batch of "
        "ideas specifically for it. Use this for series, product launches, "
        "feature deep-dives, or anything that needs to feel like a coherent "
        "set rather than a random funnel-balanced batch."
    )

    from gtm_engine.briefs import BriefQueue, Brief, BRIEF_TYPES
    from gtm_engine.data_vault import DataVault

    queue = BriefQueue()
    vault = DataVault()

    with st.expander("Submit a new brief", expanded=True):
        new_title = st.text_input(
            "Brief title",
            placeholder="e.g. Founder introduction series",
        )
        new_type = st.selectbox("Brief type", BRIEF_TYPES)
        new_count = st.number_input("Number of ideas", min_value=1, max_value=50, value=5)

        col_b1, col_b2 = st.columns(2)
        with col_b1:
            new_products = st.multiselect(
                "Target products (optional)",
                ["Quantum Tools", "PRISM", "Analyst's Edge", "APEX", "ATLAS"],
            )
        with col_b2:
            # Data source picker
            all_data = vault.list_all()
            data_choices = {f"#{s.id} · {s.name}": s.id for s in all_data}
            data_pick = st.multiselect("Link data sources (optional)", list(data_choices.keys()))
            picked_data_ids = [data_choices[k] for k in data_pick]

        new_desc = st.text_area(
            "The brief in your own words",
            height=180,
            placeholder=(
                "Example: A five-piece series introducing me as the founder "
                "of Quantum Tools. Cover who I am, why I'm building this, what "
                "I believe is broken in professional intelligence, what each "
                "product solves, and what I hope people get from it. Should "
                "feel personal and written-up, not salesy. Mix of reels and "
                "LinkedIn posts."
            ),
        )

        col_sub1, col_sub2 = st.columns([1, 3])
        with col_sub1:
            save_clicked = st.button("Save as draft", disabled=not (new_title and new_desc))
        with col_sub2:
            generate_clicked = st.button(
                "Save + Generate ideas", type="primary",
                disabled=not (new_title and new_desc),
            )

        if save_clicked or generate_clicked:
            brief = Brief(
                title=new_title,
                description=new_desc,
                brief_type=new_type,
                target_count=new_count,
                target_products=new_products,
                data_source_ids=picked_data_ids,
            )
            bid = queue.create(brief)
            brief.id = bid
            st.success(f"Brief #{bid} saved.")
            if generate_clicked:
                with st.spinner(f"Generating {new_count} ideas for this brief..."):
                    try:
                        from gtm_engine.briefs.generator import generate_ideas_from_brief
                        ideas = generate_ideas_from_brief(brief)
                        st.success(f"Generated {len(ideas)} ideas. See the Ideas page.")
                    except Exception as e:
                        st.error(f"Generation failed: {e}")
            st.rerun()

    st.markdown("---")

    # List existing briefs
    st.subheader("Previous briefs")
    briefs = queue.list_all()
    if not briefs:
        st.info("No briefs yet.")
        return

    for b in briefs:
        with st.expander(f"#{b.id} · **{b.title}** · `{b.brief_type}` · {b.status} · {len(b.generated_idea_ids)} ideas"):
            st.markdown(f"**Description:** {b.description}")
            if b.target_products:
                st.markdown(f"**Products:** {', '.join(b.target_products)}")
            if b.data_source_ids:
                st.markdown(f"**Data sources:** {b.data_source_ids}")
            st.caption(f"Created: {b.created_at}")

            col_bact1, col_bact2 = st.columns(2)
            with col_bact1:
                if b.status != "complete" and st.button("Generate ideas", key=f"regen_brief_{b.id}"):
                    with st.spinner("Generating..."):
                        from gtm_engine.briefs.generator import generate_ideas_from_brief
                        ideas = generate_ideas_from_brief(b)
                        st.success(f"Generated {len(ideas)} ideas")
                        st.rerun()
            with col_bact2:
                if st.button("Delete", key=f"del_brief_{b.id}"):
                    queue.delete(b.id)
                    st.rerun()


# -----------------------------------------------------------------------------
# PRODUCER BRIEFS
# -----------------------------------------------------------------------------

def page_producer_briefs():
    st.title("Producer Briefs")
    st.caption(
        "The detailed production spec per approved idea. Like an ad "
        "producer's shot list: which scene, which data, which spoken words, "
        "which text overlays, which camera direction. This is what the "
        "content and video pipelines read."
    )

    from gtm_engine.producer import ProducerBriefLibrary
    from gtm_engine.ideas import IdeaBank

    lib = ProducerBriefLibrary()
    bank = IdeaBank()

    briefs = lib.list_all()
    st.markdown(f"**{len(briefs)} producer briefs**")

    if not briefs:
        st.info(
            "No producer briefs yet. Approve some ideas on the Ideas page, "
            "then hit the 'Producer Brief' button to generate one."
        )
        return

    for pb in briefs:
        idea = bank.get(pb.idea_id)
        title = idea.title if idea else f"Idea #{pb.idea_id}"
        with st.expander(f"#{pb.id} · **{title}** · `{pb.status}`"):
            if pb.full_brief_md:
                st.markdown(pb.full_brief_md)
            else:
                st.json({
                    "hook_scene_id": pb.hook_scene_id,
                    "bookend_scene_id": pb.bookend_scene_id,
                    "spoken_script": pb.spoken_script,
                    "voice_directive": pb.voice_directive,
                    "segments": pb.segments_json,
                })


# -----------------------------------------------------------------------------
# INTELLIGENCE FEED
# -----------------------------------------------------------------------------

def page_intelligence():
    st.title("Live Intelligence Feed")
    st.caption(
        "Drop raw signals that should influence content generation but aren't "
        "yet ideas or data sources."
    )

    st.markdown(
        """
        ### What this is for

        The Intelligence Feed is where you dump things that **just happened**
        and might change what we say next:

        - **Customer quotes**: "A consultant told me yesterday that..."
        - **Data findings**: "I just ran PRISM on Deloitte and the result was..."
        - **Competitor moves**: "A major firm just announced..."
        - **Market events**: "FTSE just posted its worst quarter in..."
        - **Product insights**: "I realised APEX could also..."

        ### What happens when you submit

        1. Claude assesses the signal and assigns it a **priority 1-5**
        2. **Priority 4-5** (high urgency): auto-generates a content brief
           and recommends a master asset topic immediately
        3. **Priority 2-3**: stored as context and referenced in the next
           idea generation run
        4. **Priority 1**: logged for the record, no immediate action

        This is NOT the same as Brief Requests (which are intentional content
        series you commission) or the Data Vault (which is verified reference
        data). This is a stream of live input that feeds everything else.
        """
    )

    st.markdown("---")

    signal_type = st.selectbox(
        "Signal type",
        [
            "general",
            "customer_conversation",
            "data_finding",
            "competitor_move",
            "market_event",
            "product_insight",
        ],
    )
    raw_input_val = st.text_area(
        "Your signal",
        height=200,
        placeholder="What happened? Who said what? What did you learn?",
    )

    if st.button("Submit signal", type="primary") and raw_input_val.strip():
        with st.spinner("Assessing signal..."):
            from gtm_engine.intelligence import submit_signal
            record = submit_signal(raw_input_val, signal_type)
            assessment = record.get("assessment", {})
            priority = assessment.get("priority", 0)

            colour = {5: "red", 4: "orange", 3: "blue", 2: "gray", 1: "gray"}.get(priority, "gray")
            st.success(
                f"**Priority {priority}/5** — {assessment.get('urgency', 'standard')}"
            )
            st.markdown(f"**Summary:** {assessment.get('significance_summary', '')}")
            st.markdown(f"**Recommended action:** {assessment.get('recommended_action', '')}")
            st.markdown(f"**Master asset topic:** {assessment.get('master_asset_topic', '')}")


# -----------------------------------------------------------------------------
# STRATEGY BUILDER — 5-stage guided wizard
# -----------------------------------------------------------------------------

def page_strategy_builder():
    """The 5-stage guided wizard that produces a Content Strategy."""
    from gtm_engine.strategy_framework import (
        StrategyStore, ContentStrategy, AudienceSegment, Pillar, ChannelConfig,
        FunnelStageConfig, SequencingPhase,
        PILLAR_ARCHETYPES, FUNNEL_STAGES, CHANNEL_CATALOGUE, BUSINESS_PHASES,
    )
    from gtm_engine.strategy_framework import builder as strat_builder

    st.title("Strategy Builder")
    st.caption(
        "A 5-stage guided wizard that turns natural-language input about your "
        "business into a structured content strategy. Each stage produces "
        "output the next one builds on. You can re-run any stage at any time."
    )

    store = StrategyStore()
    strategy = store.load()

    # Quick-start: auto-populate from existing brief
    if not strategy.setup_complete and not strategy.pillars:
        with st.container(border=True):
            st.markdown("### Quick start")
            st.markdown(
                "You haven't built a content strategy yet. If you've already "
                "completed the GTM brief and strategy generation (Strategy Context "
                "page), you can auto-populate all five stages from that work as "
                "a starting point. You can then edit anything."
            )
            from gtm_engine.config import OUTPUT_DIR
            has_brief = (OUTPUT_DIR / "gtm_brief.json").exists()
            if has_brief:
                if st.button("Auto-populate from existing brief", type="primary"):
                    with st.spinner("Building strategy from your existing brief... (4-5 Claude calls)"):
                        try:
                            strategy = strat_builder.autopopulate_from_existing_brief()
                            st.success("Strategy populated. Review and edit below.")
                            st.rerun()
                        except Exception as e:
                            st.error(f"Auto-populate failed: {e}")
            else:
                st.warning(
                    "No GTM brief found. Either run `python main.py prefill` "
                    "in the terminal, or build the strategy from scratch below."
                )

    # 5 expandable stages
    stages_completed = set(strategy.stages_completed)

    # ---- STAGE 1: AUDIENCE ----
    stage1_done = "audience" in stages_completed
    with st.expander(
        f"{'✓' if stage1_done else '1.'} **Stage 1 — Audience Definition** "
        f"({len(strategy.audience_segments)} segments)",
        expanded=not stage1_done,
    ):
        st.markdown(
            "**Why this matters:** Everything downstream depends on who you're "
            "talking to. Get this wrong and nothing else works."
        )
        if strategy.audience_segments:
            st.markdown("**Current segments:**")
            for seg in strategy.audience_segments:
                with st.container(border=True):
                    st.markdown(f"**{seg.name}** — {seg.description}")
                    if seg.job_title:
                        st.caption(f"Job title: {seg.job_title}")
                    if seg.pain_points:
                        st.markdown("Pain points: " + ", ".join(seg.pain_points[:3]))
                    if seg.channels_they_use:
                        st.markdown(f"Channels: {', '.join(seg.channels_they_use)}")

        audience_input = st.text_area(
            "Describe your target audience in natural language",
            placeholder=(
                "Example: I'm building a SaaS that helps small dental practices "
                "automate their billing. My audience is solo dentists or small "
                "practice owners (2-5 dentists), often technically uncomfortable, "
                "spending evenings on admin instead of patient care. They've tried "
                "off-the-shelf accounting software but it's too generic..."
            ),
            height=180,
            key="stage1_input",
        )
        if st.button("Build / Rebuild Audience Segments", key="run_stage1"):
            if not audience_input.strip():
                st.warning("Please describe your audience first.")
            else:
                with st.spinner("Building audience segments..."):
                    try:
                        segments = strat_builder.build_audience(audience_input)
                        strategy.audience_segments = segments
                        if "audience" not in strategy.stages_completed:
                            strategy.stages_completed.append("audience")
                        store.save(strategy)
                        st.success(f"Built {len(segments)} segments. Scroll up to review.")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Stage 1 failed: {e}")

    # ---- STAGE 2: PILLARS ----
    stage2_done = "pillars" in stages_completed
    with st.expander(
        f"{'✓' if stage2_done else '2.'} **Stage 2 — Content Pillars** "
        f"({len(strategy.pillars)} pillars)",
        expanded=stage1_done and not stage2_done,
    ):
        st.markdown(
            "**Why this matters:** A pillar is a territory you OWN. Not a single "
            "post — a recurring theme. Every piece of content should fit under "
            "exactly one pillar."
        )
        with st.expander("Universal archetypes you can start from"):
            for a in PILLAR_ARCHETYPES:
                st.markdown(
                    f"- **{a['default_name']}** ({a['archetype_id']}): {a['description']}"
                )

        if strategy.pillars:
            st.markdown("**Current pillars:**")
            for p in strategy.pillars:
                with st.container(border=True):
                    st.markdown(
                        f"**{p.name}** — target {p.target_percentage}% · "
                        f"funnel: `{p.funnel_stage}` · archetype: `{p.archetype}`"
                    )
                    st.caption(p.description)
                    if p.why_it_matters:
                        st.markdown(f"*Why it matters:* {p.why_it_matters}")
                    if p.example_topics:
                        st.markdown(
                            "Example topics: " + " · ".join(f"*{t}*" for t in p.example_topics[:3])
                        )

        biz_context = st.text_area(
            "Brief business context (your product, worldview, who you sell to)",
            placeholder=(
                "Example: We sell PRISM, a workforce intelligence tool. We believe "
                "the consulting industry's data providers are structurally broken "
                "because they sell per-record data. Our buyers are independent "
                "consultants and boutique PE firms..."
            ),
            height=140,
            key="stage2_context",
        )
        if st.button("Build / Rebuild Pillars", key="run_stage2", disabled=not stage1_done):
            if not strategy.audience_segments:
                st.warning("Complete Stage 1 first.")
            elif not biz_context.strip():
                st.warning("Provide some business context.")
            else:
                with st.spinner("Building content pillars..."):
                    try:
                        pillars = strat_builder.build_pillars(
                            strategy.audience_segments, biz_context,
                        )
                        strategy.pillars = pillars
                        if "pillars" not in strategy.stages_completed:
                            strategy.stages_completed.append("pillars")
                        store.save(strategy)
                        st.success(f"Built {len(pillars)} pillars.")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Stage 2 failed: {e}")

    # ---- STAGE 3: CHANNELS ----
    stage3_done = "channels" in stages_completed
    with st.expander(
        f"{'✓' if stage3_done else '3.'} **Stage 3 — Channel Strategy** "
        f"({len([c for c in strategy.channels if c.enabled])} channels)",
        expanded=stage2_done and not stage3_done,
    ):
        st.markdown(
            "**Why this matters:** Different channels need different things. "
            "Picking 3-5 well-matched channels beats publishing everywhere."
        )

        if strategy.channels:
            for c in strategy.channels:
                if not c.enabled:
                    continue
                spec = next((cs for cs in CHANNEL_CATALOGUE if cs["id"] == c.channel_id), {})
                with st.container(border=True):
                    st.markdown(
                        f"**{spec.get('name', c.channel_id)}** — "
                        f"{c.cadence_per_week}/week · pillars: {', '.join(c.primary_pillars)}"
                    )
                    if c.notes:
                        st.caption(c.notes)

        if st.button("Recommend channels", key="run_stage3", disabled=not stage2_done):
            with st.spinner("Recommending channels..."):
                try:
                    channels = strat_builder.build_channels(
                        strategy.audience_segments, strategy.pillars,
                    )
                    strategy.channels = channels
                    if "channels" not in strategy.stages_completed:
                        strategy.stages_completed.append("channels")
                    store.save(strategy)
                    st.success(f"Recommended {len(channels)} channels.")
                    st.rerun()
                except Exception as e:
                    st.error(f"Stage 3 failed: {e}")

    # ---- STAGE 4: FUNNEL ----
    stage4_done = "funnel" in stages_completed
    with st.expander(
        f"{'✓' if stage4_done else '4.'} **Stage 4 — Funnel Mapping** "
        f"({len(strategy.funnel_stages)} stages)",
        expanded=stage3_done and not stage4_done,
    ):
        st.markdown(
            "**Why this matters:** Audiences move through stages — awareness, "
            "trust, conversion. Your content needs to serve each stage."
        )

        if strategy.funnel_stages:
            for stage in strategy.funnel_stages:
                with st.container(border=True):
                    st.markdown(
                        f"**{stage.name}** — {stage.target_percentage}% target · "
                        f"pillars: {', '.join(stage.pillar_ids)}"
                    )
                    if stage.user_definition:
                        st.caption(stage.user_definition)

        if st.button("Map funnel", key="run_stage4", disabled=not stage3_done):
            with st.spinner("Mapping pillars to funnel stages..."):
                try:
                    business_context = "Defined in earlier stages"
                    funnel = strat_builder.build_funnel(
                        strategy.audience_segments, strategy.pillars, business_context,
                    )
                    strategy.funnel_stages = funnel
                    if "funnel" not in strategy.stages_completed:
                        strategy.stages_completed.append("funnel")
                    store.save(strategy)
                    st.success(f"Mapped {len(funnel)} funnel stages.")
                    st.rerun()
                except Exception as e:
                    st.error(f"Stage 4 failed: {e}")

    # ---- STAGE 5: CAPACITY & SEQUENCING ----
    stage5_done = "sequencing" in stages_completed
    with st.expander(
        f"{'✓' if stage5_done else '5.'} **Stage 5 — Capacity & Sequencing**",
        expanded=stage4_done and not stage5_done,
    ):
        st.markdown(
            "**Why this matters:** Strategy fails when it ignores reality. How "
            "much content can you ship per week, and what phase is your business "
            "in?"
        )

        col_a, col_b = st.columns(2)
        with col_a:
            capacity = st.slider(
                "Pieces of content per week",
                min_value=1, max_value=20, value=strategy.capacity_per_week,
                key="stage5_capacity",
            )
        with col_b:
            phase_options = {p["id"]: p["name"] for p in BUSINESS_PHASES}
            phase = st.selectbox(
                "Current business phase",
                options=list(phase_options.keys()),
                format_func=lambda x: phase_options[x],
                index=list(phase_options.keys()).index(strategy.business_phase)
                if strategy.business_phase in phase_options else 0,
                key="stage5_phase",
            )
            phase_def = next((p for p in BUSINESS_PHASES if p["id"] == phase), {})
            if phase_def:
                st.caption(phase_def["description"])

        if st.button("Build sequencing plan", key="run_stage5"):
            try:
                sequencing = strat_builder.build_sequencing(
                    capacity, phase, strategy.pillars,
                )
                strategy.capacity_per_week = capacity
                strategy.business_phase = phase
                strategy.sequencing = sequencing
                if "sequencing" not in strategy.stages_completed:
                    strategy.stages_completed.append("sequencing")
                # Mark setup complete if all 5 stages done
                if len(strategy.stages_completed) >= 5:
                    strategy.setup_complete = True
                store.save(strategy)
                st.success("Sequencing plan built. Strategy is live.")
                st.rerun()
            except Exception as e:
                st.error(f"Stage 5 failed: {e}")

    # Summary at bottom
    if strategy.setup_complete:
        st.markdown("---")
        st.success(
            "**Strategy setup complete.** Visit the Strategy Dashboard to "
            "see distributions, gaps, and rebalance recommendations."
        )


# -----------------------------------------------------------------------------
# STRATEGY DASHBOARD — 6-panel ongoing view
# -----------------------------------------------------------------------------

def page_strategy_dashboard():
    from gtm_engine.strategy_framework import StrategyStore, StrategyFeedback
    from gtm_engine.strategy_framework.analyzer import (
        compute_pillar_distribution,
        compute_funnel_distribution,
        compute_channel_coverage,
        detect_gaps_and_recommend,
    )

    st.title("Strategy Dashboard")
    st.caption(
        "Live view of how your content is distributed against your strategy. "
        "Spot gaps, give feedback, accept rebalance recommendations."
    )

    store = StrategyStore()
    strategy = store.load()

    if not strategy.setup_complete:
        st.warning(
            "Strategy not yet built. Visit **Strategy Builder** to run the "
            "5-stage wizard first."
        )
        return

    # ---- PANEL 1: Pillar Health ----
    st.markdown("### Pillar Health")
    pillar_dist = compute_pillar_distribution(strategy)
    cols = st.columns(min(3, len(pillar_dist)) or 1)
    for i, row in enumerate(pillar_dist):
        with cols[i % len(cols)]:
            with st.container(border=True):
                status_label = {
                    "ok": "[OK]",
                    "thin": "[THIN]",
                    "gap": "[GAP]",
                }.get(row["status"], "")
                st.markdown(f"**{row['name']}** {status_label}")
                st.markdown(f"Target: **{row['target_pct']}%** · Actual: **{row['actual_pct']}%**")
                st.progress(min(1.0, row["actual_pct"] / max(row["target_pct"], 1)))
                st.caption(f"{row['idea_count']} ideas · gap: {row['gap_pct']}%")

    # ---- PANEL 2: Funnel Balance ----
    st.markdown("---")
    st.markdown("### Funnel Balance")
    funnel_dist = compute_funnel_distribution(strategy)
    for row in funnel_dist:
        col1, col2 = st.columns([3, 1])
        with col1:
            st.markdown(f"**{row['name']}**")
            st.progress(min(1.0, row["actual_pct"] / max(row["target_pct"], 1)))
        with col2:
            st.markdown(f"{row['actual_pct']}% / {row['target_pct']}%")
            st.caption(f"{row['idea_count']} ideas")

    # ---- PANEL 3: Channel × Pillar Coverage ----
    st.markdown("---")
    st.markdown("### Channel × Pillar Coverage")
    coverage = compute_channel_coverage(strategy)
    if coverage:
        # Build a simple table
        pillar_ids = [p.id for p in strategy.pillars]
        pillar_names_short = [p.name[:18] for p in strategy.pillars]
        header_cols = st.columns([2] + [1] * len(pillar_ids))
        with header_cols[0]:
            st.markdown("**Channel**")
        for i, name in enumerate(pillar_names_short):
            with header_cols[i + 1]:
                st.markdown(f"**{name}**")

        for row in coverage:
            cols = st.columns([2] + [1] * len(pillar_ids))
            with cols[0]:
                st.markdown(f"{row['channel_name']} ({row['cadence_per_week']}/wk)")
            for i, pid in enumerate(pillar_ids):
                with cols[i + 1]:
                    count = row["cells"].get(pid, 0)
                    if count == 0:
                        st.markdown("`–`")
                    else:
                        st.markdown(f"**{count}**")
    else:
        st.info("No channel data yet. Make sure your channels are enabled in Strategy Builder.")

    # ---- PANEL 4: Sequencing Timeline ----
    st.markdown("---")
    st.markdown("### Sequencing Plan")
    st.caption(f"Current phase: **{strategy.business_phase}** · Capacity: {strategy.capacity_per_week}/week")
    for phase in strategy.sequencing:
        with st.expander(f"**{phase.label}** ({phase.weeks_duration} weeks)"):
            if phase.pillar_weights:
                for pid, weight in sorted(
                    phase.pillar_weights.items(), key=lambda x: -x[1]
                ):
                    pillar_name = next(
                        (p.name for p in strategy.pillars if p.id == pid), pid,
                    )
                    st.markdown(f"- **{pillar_name}**: {weight}%")

    # ---- PANEL 5: Strategic Feedback ----
    st.markdown("---")
    st.markdown("### Strategic Feedback")
    st.caption(
        "Notes you write here feed into the next idea generation. Use this to "
        "steer the engine: 'more product demos using real data', 'less abstract "
        "thought leadership', etc."
    )

    feedback_list = store.list_feedback(status="active")
    if feedback_list:
        for fb in feedback_list[:10]:
            with st.container(border=True):
                col1, col2 = st.columns([5, 1])
                with col1:
                    st.markdown(fb.text)
                    if fb.tagged_pillar or fb.tagged_channel or fb.tagged_funnel_stage:
                        tags = []
                        if fb.tagged_pillar:
                            tags.append(f"pillar={fb.tagged_pillar}")
                        if fb.tagged_channel:
                            tags.append(f"channel={fb.tagged_channel}")
                        if fb.tagged_funnel_stage:
                            tags.append(f"funnel={fb.tagged_funnel_stage}")
                        st.caption(" · ".join(tags))
                    st.caption(fb.created_at)
                with col2:
                    if st.button("✓", key=f"fb_done_{fb.id}", help="Mark addressed"):
                        store.update_feedback_status(fb.id, "addressed")
                        st.rerun()

    new_feedback = st.text_area(
        "Add a strategic note",
        placeholder="e.g. 'I want more content showing PRISM analysing real companies, less abstract industry commentary.'",
        height=80,
    )
    cols_fb = st.columns(4)
    with cols_fb[0]:
        tag_pillar = st.selectbox(
            "Tag pillar (optional)",
            [""] + [p.id for p in strategy.pillars],
            format_func=lambda x: next((p.name for p in strategy.pillars if p.id == x), "(none)") if x else "(none)",
        )
    with cols_fb[1]:
        tag_channel = st.selectbox(
            "Tag channel (optional)",
            [""] + [c.channel_id for c in strategy.channels],
        )
    with cols_fb[2]:
        tag_funnel = st.selectbox(
            "Tag funnel (optional)",
            [""] + [s.id for s in strategy.funnel_stages],
        )
    with cols_fb[3]:
        if st.button("Save feedback", disabled=not new_feedback.strip()):
            store.add_feedback(StrategyFeedback(
                text=new_feedback.strip(),
                tagged_pillar=tag_pillar,
                tagged_channel=tag_channel,
                tagged_funnel_stage=tag_funnel,
            ))
            st.success("Feedback saved.")
            st.rerun()

    # ---- PANEL 6: Rebalance Recommendations ----
    st.markdown("---")
    st.markdown("### Rebalance Recommendations")

    if st.button("Run gap analysis now"):
        with st.spinner("Analysing..."):
            new_recs = detect_gaps_and_recommend(strategy)
            st.success(f"Generated {len(new_recs)} recommendations.")
            st.rerun()

    recs = store.list_recommendations(status="pending")
    if not recs:
        st.info("No pending recommendations. Click 'Run gap analysis' to refresh.")
    for rec in recs:
        with st.container(border=True):
            severity_label = {"high": "[HIGH]", "medium": "[MED]", "low": "[LOW]"}.get(rec.severity, "")
            st.markdown(f"{severity_label} **{rec.recommendation}**")
            if rec.rationale:
                st.caption(rec.rationale)

            col_a, col_b = st.columns([1, 1])
            with col_a:
                if rec.action_type == "generate" and rec.target_pillar:
                    if st.button(f"Accept · Generate 5 ideas for this pillar",
                                 key=f"acc_{rec.id}", type="primary"):
                        try:
                            from gtm_engine.ideas.generator import generate_for_pillar
                            with st.spinner("Generating..."):
                                ids = generate_for_pillar(rec.target_pillar, n=5)
                            store.update_recommendation_status(rec.id, "accepted")
                            st.success(f"Generated {len(ids)} ideas.")
                            st.rerun()
                        except Exception as e:
                            st.error(f"Failed: {e}")
                else:
                    st.caption(f"Action type: `{rec.action_type}`")
            with col_b:
                if st.button("Dismiss", key=f"dis_{rec.id}"):
                    store.update_recommendation_status(rec.id, "dismissed")
                    st.rerun()


# -----------------------------------------------------------------------------
# AVATAR SETTINGS
# -----------------------------------------------------------------------------

def page_avatar_settings():
    from gtm_engine.avatar import get_provider, list_providers, PROVIDERS

    st.title("Avatar Settings")
    st.caption(
        "Configure your avatar provider. You bring your own API key (BYOK). "
        "The engine generates scripts and producer briefs; the avatar provider "
        "turns the spoken script into a talking-head video of your trained avatar."
    )

    providers = list_providers()
    st.markdown("### Available Providers")
    for p in providers:
        with st.container(border=True):
            label_state = "[CONFIGURED]" if p["configured"] else "[NOT CONFIGURED]"
            st.markdown(f"**{p['name']}** {label_state}")
            if p["id"] == "none":
                st.caption(
                    "Default mode — no avatar. Reels use TTS voiceover, "
                    "B-roll, and text overlays. Cheapest and easiest."
                )
            elif p["id"] == "heygen":
                st.caption(
                    "HeyGen creates a digital twin from a 2-minute video of you. "
                    "You then send scripts via API and get back talking-head videos. "
                    "Pricing starts ~$49/month."
                )
                if not p["configured"]:
                    st.markdown(
                        "**To configure:** add `HEYGEN_API_KEY=<your-key>` and "
                        "`AVATAR_PROVIDER=heygen` to your `.env` file, then restart the UI."
                    )
                    st.markdown(
                        "Get your API key at: [app.heygen.com](https://app.heygen.com)"
                    )

    # If HeyGen is configured, show the avatar/voice picker
    active = get_provider()
    if active.provider_id == "heygen" and active.is_configured():
        st.markdown("---")
        st.markdown("### Your HeyGen Avatars")
        with st.spinner("Loading your trained avatars..."):
            avatars = active.list_avatars()
        if avatars:
            cols = st.columns(min(3, len(avatars)) or 1)
            for i, av in enumerate(avatars):
                with cols[i % len(cols)]:
                    with st.container(border=True):
                        if av.get("preview_url"):
                            st.image(av["preview_url"], use_container_width=True)
                        st.markdown(f"**{av['name']}**")
                        st.caption(f"id: `{av['id']}`")
        else:
            st.warning("No avatars found. Train one in HeyGen first.")

        st.markdown("---")
        st.markdown("### Available Voices")
        with st.spinner("Loading voices..."):
            voices = active.list_voices()
        if voices:
            st.markdown(f"Found {len(voices)} voices. First 10:")
            for v in voices[:10]:
                st.markdown(
                    f"- **{v['name']}** ({v.get('language', '?')}) · `{v['id']}`"
                )


if __name__ == "__main__":
    main()
