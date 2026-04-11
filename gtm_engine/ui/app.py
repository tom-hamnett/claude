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

# --- Brand palette (matches MASTER_CONTEXT.md) ---
BRAND_COLOURS = {
    "bg": "#0a0a0f",
    "primary": "#6c63ff",
    "hot": "#ff6b6b",
    "gold": "#ffd166",
    "text": "#e8e8f0",
    "muted": "#8888a0",
}


def main():
    st.set_page_config(
        page_title="Quantum Tools GTM Engine",
        page_icon="",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    _apply_dark_theme()

    # Sidebar navigation
    st.sidebar.markdown("### Quantum Tools")
    st.sidebar.markdown("*GTM Intelligence Engine*")
    st.sidebar.markdown("---")

    page = st.sidebar.radio(
        "Navigate",
        [
            "Dashboard",
            "Ideas",
            "Content",
            "Deployment",
            "Segments (Core-Five)",
            "Brand Standards",
            "Character Library",
            "Intelligence Feed",
        ],
        label_visibility="collapsed",
    )

    st.sidebar.markdown("---")
    _sidebar_pipeline_snapshot()

    # Route to the selected page
    routes = {
        "Dashboard": page_dashboard,
        "Ideas": page_ideas,
        "Content": page_content,
        "Deployment": page_deployment,
        "Segments (Core-Five)": page_segments,
        "Brand Standards": page_brand,
        "Character Library": page_characters,
        "Intelligence Feed": page_intelligence,
    }
    routes[page]()


def _apply_dark_theme():
    st.markdown(
        f"""
        <style>
        .stApp {{
            background-color: {BRAND_COLOURS['bg']};
            color: {BRAND_COLOURS['text']};
        }}
        .stSidebar {{
            background-color: #0f0f18;
        }}
        h1, h2, h3 {{
            color: {BRAND_COLOURS['text']};
            font-family: 'Playfair Display', serif;
        }}
        .stButton > button {{
            background-color: {BRAND_COLOURS['primary']};
            color: white;
            border: none;
            border-radius: 4px;
        }}
        .stButton > button:hover {{
            background-color: {BRAND_COLOURS['hot']};
        }}
        [data-testid="stMetricValue"] {{
            color: {BRAND_COLOURS['primary']};
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
    st.caption("Quantum Tools GTM Intelligence Engine — Overview")

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

    # Engine state
    col_a, col_b = st.columns(2)

    with col_a:
        st.subheader("Engine State")
        brief_exists = (OUTPUT_DIR / "gtm_brief.json").exists()
        strategy_exists = (OUTPUT_DIR / "gtm_strategy.json").exists()
        brand_exists = (DATA_DIR / "brand_standards.json").exists()
        theo_exists = (DATA_DIR.parent / "references" / "influencers" / "theo" / "hero.png").exists() if (DATA_DIR.parent / "references").exists() else False

        st.markdown(f"- GTM Brief: {'Ready' if brief_exists else '**Missing**'}")
        st.markdown(f"- GTM Strategy: {'Ready' if strategy_exists else '**Missing**'}")
        st.markdown(f"- Brand Standards: {'Ready' if brand_exists else '**Missing**'}")
        st.markdown(f"- Theo Hero: {'Ready' if theo_exists else '**Missing**'}")

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
# IDEAS
# -----------------------------------------------------------------------------

def page_ideas():
    st.title("Ideas")
    st.caption("Idea bank — generate, filter, bulk approve or reject")

    bank = IdeaBank()

    # --- Generation panel ---
    with st.expander("Generate new ideas", expanded=False):
        col_g1, col_g2, col_g3 = st.columns([2, 2, 1])
        with col_g1:
            n_ideas = st.number_input("Number of ideas", min_value=5, max_value=200, value=50, step=5)
        with col_g2:
            st.markdown("Funnel distribution will auto-balance across umbrella / product / feature / proof")
        with col_g3:
            if st.button("Generate batch", type="primary"):
                with st.spinner(f"Generating {n_ideas} ideas via Claude..."):
                    try:
                        from gtm_engine.ideas.generator import generate_and_save
                        ids = generate_and_save(n=n_ideas)
                        st.success(f"Generated {len(ids)} ideas. Scroll down to review.")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Generation failed: {e}")

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

    # --- Bulk selection ---
    if "selected_ideas" not in st.session_state:
        st.session_state.selected_ideas = set()

    col_bulk1, col_bulk2, col_bulk3, col_bulk4 = st.columns([1, 1, 1, 3])
    with col_bulk1:
        if st.button("Select all"):
            st.session_state.selected_ideas = {i.id for i in ideas}
            st.rerun()
    with col_bulk2:
        if st.button("Clear"):
            st.session_state.selected_ideas = set()
            st.rerun()
    with col_bulk3:
        st.markdown(f"**{len(st.session_state.selected_ideas)} selected**")

    # Bulk action buttons
    if st.session_state.selected_ideas:
        col_act1, col_act2, col_act3, col_act4 = st.columns(4)
        with col_act1:
            if st.button("Approve selected", type="primary"):
                from gtm_engine.batch import bulk_approve_ideas
                report = bulk_approve_ideas(list(st.session_state.selected_ideas))
                st.success(f"Approved {len(report['successful'])} ideas")
                st.session_state.selected_ideas = set()
                st.rerun()
        with col_act2:
            if st.button("Reject selected"):
                from gtm_engine.batch import bulk_reject_ideas
                report = bulk_reject_ideas(list(st.session_state.selected_ideas))
                st.success(f"Rejected {len(report['successful'])} ideas")
                st.session_state.selected_ideas = set()
                st.rerun()
        with col_act3:
            if st.button("Generate content"):
                with st.spinner("Generating content pieces..."):
                    from gtm_engine.batch import bulk_generate_content
                    report = bulk_generate_content(list(st.session_state.selected_ideas))
                    st.success(
                        f"Generated {len(report['successful'])}/{len(st.session_state.selected_ideas)} content pieces"
                    )
                    if report["failed"]:
                        with st.expander("Failures"):
                            st.json(report["failed"])
                    st.session_state.selected_ideas = set()
                    st.rerun()
        with col_act4:
            if st.button("Archive selected"):
                from gtm_engine.approval import archive
                for iid in st.session_state.selected_ideas:
                    archive(iid, reason="Bulk archive from UI")
                st.session_state.selected_ideas = set()
                st.rerun()

    st.markdown("---")

    # --- Idea list ---
    for idea in ideas:
        selected = idea.id in st.session_state.selected_ideas
        with st.container():
            col_check, col_body = st.columns([1, 20])
            with col_check:
                new_selected = st.checkbox("", value=selected, key=f"select_{idea.id}", label_visibility="collapsed")
                if new_selected and not selected:
                    st.session_state.selected_ideas.add(idea.id)
                elif not new_selected and selected:
                    st.session_state.selected_ideas.discard(idea.id)

            with col_body:
                header = f"**{idea.title}**"
                meta = f"`{idea.funnel_level}` `{idea.segment_type}` edginess {idea.edginess_score}/10"
                if idea.product:
                    meta = f"`{idea.product}` " + meta
                st.markdown(f"{header}  —  {meta}")
                st.markdown(f"> *{idea.hook}*")
                with st.expander("Details"):
                    st.markdown(f"**Angle:** {idea.angle}")
                    if idea.data_requirement:
                        st.markdown(f"**Data required:** {idea.data_requirement}")
                    st.markdown(f"**Target segment:** {idea.target_segment}")
                    st.markdown(f"**Strategic objective:** {idea.strategic_objective}")
                    st.markdown(f"**Tags:** {', '.join(idea.tags) if idea.tags else '—'}")
                    st.markdown(f"**Status:** `{idea.status}`")
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

    chars_dir = DATA_DIR.parent / "references" / "influencers"
    if not chars_dir.exists():
        st.warning("No character library found.")
        return

    for char_dir in chars_dir.iterdir():
        if not char_dir.is_dir():
            continue
        manifest_path = char_dir / "manifest.json"
        if not manifest_path.exists():
            continue

        manifest = load_json(manifest_path)
        char = manifest.get("character", {})

        st.subheader(char.get("name", char_dir.name))
        st.markdown(char.get("canonical_description", ""))

        # Show hero and shot images
        images = sorted(char_dir.glob("*.png"))
        if images:
            cols = st.columns(min(4, len(images)))
            for i, img in enumerate(images):
                with cols[i % 4]:
                    st.image(str(img), caption=img.stem, use_container_width=True)


# -----------------------------------------------------------------------------
# INTELLIGENCE FEED
# -----------------------------------------------------------------------------

def page_intelligence():
    st.title("Live Intelligence Feed")
    st.caption("Submit raw signals — customer quotes, data findings, market events")

    signal_type = st.selectbox(
        "Signal type",
        ["general", "customer_conversation", "data_finding", "competitor_move", "market_event", "product_insight"],
    )
    raw_input = st.text_area("Paste your signal", height=200, placeholder="What happened?")

    if st.button("Submit signal", type="primary") and raw_input.strip():
        with st.spinner("Assessing signal..."):
            from gtm_engine.intelligence import submit_signal
            record = submit_signal(raw_input, signal_type)
            assessment = record.get("assessment", {})
            st.success(f"Priority {assessment.get('priority', '?')}/5 — {assessment.get('urgency', 'standard')}")
            st.markdown(f"**Summary:** {assessment.get('significance_summary', '')}")
            st.markdown(f"**Recommended action:** {assessment.get('recommended_action', '')}")
            st.markdown(f"**Master asset topic:** {assessment.get('master_asset_topic', '')}")


if __name__ == "__main__":
    main()
