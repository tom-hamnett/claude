"""Quantum Tools GTM Intelligence Engine — UI v3

Three-mode interface: PLAN / CREATE / PERFORM
Settings behind a gear icon.
Onboarding wizard for first-time users.
Kanban board as the heart of CREATE mode.
Every metric clickable. Every gap actionable.

Launch: python -m streamlit run gtm_engine/ui/app.py
"""

import json
import sys
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from gtm_engine.config import OUTPUT_DIR, CONTENT_QUEUE_DIR, DATA_DIR, LOGS_DIR, SQLITE_PATH
from gtm_engine.utils.file_io import load_json

# ── Brand palette ──────────────────────────────────────────────────────────
C = {
    "bg":       "#0d1b2a",
    "panel":    "#152638",
    "card":     "#1b2e44",
    "primary":  "#6c63ff",
    "pri_hov":  "#8a80ff",
    "hot":      "#ff6b6b",
    "gold":     "#ffd166",
    "green":    "#66d9a0",
    "text":     "#ffffff",
    "muted":    "#8aa0c0",
    "border":   "#2a4060",
}


# ═══════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════

def main():
    st.set_page_config(page_title="Quantum Tools GTM", layout="wide",
                       initial_sidebar_state="collapsed")
    _apply_theme()
    _init_db()

    # First-time? Show onboarding
    if not _is_setup_complete():
        _onboarding_wizard()
        return

    # Three-tab navigation
    plan_tab, create_tab, perform_tab, settings_tab = st.tabs([
        "PLAN", "CREATE", "PERFORM", "SETTINGS"
    ])

    with plan_tab:
        _render_plan()
    with create_tab:
        _render_create()
    with perform_tab:
        _render_perform()
    with settings_tab:
        _render_settings()


# ═══════════════════════════════════════════════════════════════════════════
#  THEME
# ═══════════════════════════════════════════════════════════════════════════

def _apply_theme():
    st.markdown(f"""<style>
    /* Kill every trace of the Streamlit default header/toolbar */
    header {{ display:none!important; }}
    header[data-testid="stHeader"] {{ display:none!important; }}
    div[data-testid="stToolbar"] {{ display:none!important; }}
    .stDeployButton {{ display:none!important; }}
    #MainMenu {{ display:none!important; }}
    footer {{ display:none!important; }}
    .stApp {{ background:{C['bg']}; color:{C['text']}; }}
    .stApp p, .stApp span, .stApp div, .stApp li, .stApp label {{ color:{C['text']}; }}
    .block-container {{ padding-top:1.5rem!important; max-width:1400px; }}
    section[data-testid="stSidebar"] {{ display:none; }}
    h1,h2,h3,h4 {{ color:{C['text']}!important; font-family:'Playfair Display',Georgia,serif; }}
    .stTabs [data-baseweb="tab-list"] {{ gap:0; }}
    .stTabs [data-baseweb="tab-list"] button {{
        color:{C['muted']}!important; font-size:1.1rem; font-weight:600;
        letter-spacing:0.08em; padding:12px 28px;
        border-bottom:3px solid transparent;
    }}
    .stTabs [data-baseweb="tab-list"] button[aria-selected="true"] {{
        color:{C['gold']}!important; border-bottom-color:{C['gold']}!important;
    }}
    .stButton>button {{
        background:{C['primary']}; color:#fff!important; border:none;
        border-radius:6px; font-weight:600; padding:8px 18px;
    }}
    .stButton>button:hover {{ background:{C['pri_hov']}; }}
    [data-testid="stMetricValue"] {{ color:{C['gold']}!important; }}
    [data-testid="stMetricLabel"] {{ color:{C['muted']}!important; }}
    div[data-testid="stExpander"] {{
        background:{C['panel']}; border:1px solid {C['border']}; border-radius:6px;
    }}
    code,pre {{ background:{C['panel']}!important; color:{C['gold']}!important; }}
    blockquote {{ border-left:3px solid {C['primary']}; background:{C['panel']};
        padding:12px 16px; border-radius:4px; color:{C['gold']}!important; }}
    .stTextInput>div>div>input, .stTextArea>div>div>textarea, .stSelectbox>div>div {{
        background:{C['panel']}; color:{C['text']}!important; border:1px solid {C['border']};
    }}
    .stProgress>div>div>div {{ background:{C['primary']}!important; }}
    </style>""", unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════
#  DB INIT
# ═══════════════════════════════════════════════════════════════════════════

def _init_db():
    """Ensure every module's tables exist."""
    for mod_init in [
        "gtm_engine.ideas:IdeaBank",
        "gtm_engine.scenes:SceneLibrary",
        "gtm_engine.data_vault:DataVault",
        "gtm_engine.briefs:BriefQueue",
        "gtm_engine.producer:ProducerBriefLibrary",
        "gtm_engine.strategy_framework:StrategyStore",
    ]:
        try:
            mod, cls = mod_init.split(":")
            m = __import__(mod, fromlist=[cls])
            getattr(m, cls)()
        except Exception:
            pass
    try:
        from gtm_engine.scenes import SceneLibrary
        SceneLibrary().seed_if_empty()
    except Exception:
        pass


def _is_setup_complete() -> bool:
    """Check if both the GTM brief and content strategy exist."""
    brief_ok = (OUTPUT_DIR / "gtm_brief.json").exists()
    try:
        from gtm_engine.strategy_framework import StrategyStore
        strat_ok = StrategyStore().load().setup_complete
    except Exception:
        strat_ok = False
    return brief_ok and strat_ok


# ═══════════════════════════════════════════════════════════════════════════
#  ONBOARDING WIZARD
# ═══════════════════════════════════════════════════════════════════════════

def _onboarding_wizard():
    """5-step guided setup for first-time users."""
    st.markdown("# Welcome to Quantum Tools GTM")
    st.markdown("*Let's build your content strategy in under 5 minutes.*")
    st.markdown("---")

    # Check what's already done
    brief_exists = (OUTPUT_DIR / "gtm_brief.json").exists()
    strategy_generated = (OUTPUT_DIR / "gtm_strategy.json").exists()

    try:
        from gtm_engine.strategy_framework import StrategyStore
        store = StrategyStore()
        content_strat = store.load()
        content_strat_ok = content_strat.setup_complete
    except Exception:
        content_strat_ok = False

    # Step 1: Business description
    st.markdown("### Step 1 — Tell us about your business")
    st.caption("A few sentences is enough. What do you sell? Who buys it? What makes it different?")

    if brief_exists:
        brief = load_json(OUTPUT_DIR / "gtm_brief.json")
        st.success(f"Brief loaded: {brief.get('umbrella_brand', '')[:200]}")
        st.caption(f"Products: {', '.join(p.get('name','') for p in brief.get('products',[]))}")
    else:
        biz_desc = st.text_area(
            "Your business in plain language",
            height=150,
            placeholder="Example: I build AI-powered tools for management consultants. "
                        "Four products: a workforce intelligence platform, a company "
                        "diagnostic tool, a programme management system, and a trading "
                        "research system...",
        )
        if st.button("Save business description", type="primary"):
            if biz_desc.strip():
                # Save as a simple brief for now
                from gtm_engine.utils.file_io import save_json
                save_json({"umbrella_brand": biz_desc, "products": []}, OUTPUT_DIR / "gtm_brief.json")
                st.rerun()
            else:
                st.warning("Please describe your business first.")
        return

    # Step 2-5: Build content strategy
    if not content_strat_ok:
        st.markdown("---")
        st.markdown("### Step 2 — Build your content strategy")
        st.caption(
            "We'll analyse your business and generate: audience segments, content pillars, "
            "channel recommendations, funnel mapping, and a phased rollout plan. Takes ~60 seconds."
        )

        col_a, col_b = st.columns([2, 1])
        with col_a:
            capacity = st.slider("How many pieces of content per week can you produce?",
                                 min_value=1, max_value=20, value=5)
            from gtm_engine.strategy_framework import BUSINESS_PHASES
            phase_opts = {p["id"]: f"{p['name']} — {p['description']}" for p in BUSINESS_PHASES}
            phase = st.selectbox("What phase is your business in?",
                                 options=list(phase_opts.keys()),
                                 format_func=lambda x: phase_opts[x])

        with col_b:
            st.markdown("")  # spacer
            st.markdown("")
            if st.button("Build my strategy", type="primary"):
                with st.spinner("Building strategy (4-5 AI calls, ~60 seconds)..."):
                    try:
                        from gtm_engine.strategy_framework.builder import autopopulate_from_existing_brief
                        strategy = autopopulate_from_existing_brief()
                        # Update capacity and phase
                        from gtm_engine.strategy_framework import StrategyStore
                        from gtm_engine.strategy_framework.builder import build_sequencing
                        strategy.capacity_per_week = capacity
                        strategy.business_phase = phase
                        strategy.sequencing = build_sequencing(capacity, phase, strategy.pillars)
                        StrategyStore().save(strategy)
                        st.success("Strategy built! Reloading...")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Failed: {e}")
    else:
        st.success("Setup complete. Loading your dashboard...")
        st.rerun()


# ═══════════════════════════════════════════════════════════════════════════
#  PLAN TAB
# ═══════════════════════════════════════════════════════════════════════════

def _render_plan():
    from gtm_engine.strategy_framework import (
        StrategyStore, BUSINESS_PHASES, CHANNEL_CATALOGUE, StrategyFeedback,
    )
    from gtm_engine.strategy_framework.analyzer import (
        compute_pillar_distribution, compute_funnel_distribution,
        compute_channel_coverage, detect_gaps_and_recommend,
    )
    from gtm_engine.approval import get_pipeline_counts

    store = StrategyStore()
    strategy = store.load()

    if not strategy.setup_complete:
        st.warning("Strategy not built yet. Complete the onboarding wizard first.")
        return

    counts = get_pipeline_counts()
    phase_def = next((p for p in BUSINESS_PHASES if p["id"] == strategy.business_phase), {})

    # ═══════════════════════════════════════════════════════════════════
    #  SECTION 1: THIS WEEK — the command centre header
    # ═══════════════════════════════════════════════════════════════════

    # Top bar: phase + capacity
    st.markdown(
        f"<div style='display:flex;justify-content:space-between;align-items:center;'>"
        f"<div><span style='color:{C['muted']};font-size:0.8rem;letter-spacing:0.1em;'>THIS WEEK</span>"
        f"<h2 style='margin:0;'>What needs your attention</h2></div>"
        f"<div style='text-align:right;'>"
        f"<span style='color:{C['muted']};font-size:0.75rem;'>Phase</span><br>"
        f"<span style='color:{C['gold']};font-size:1.1rem;font-weight:600;'>"
        f"{phase_def.get('name', strategy.business_phase)}</span>"
        f"<span style='color:{C['muted']};font-size:0.8rem;'> · {strategy.capacity_per_week}/wk</span>"
        f"</div></div>",
        unsafe_allow_html=True,
    )

    st.markdown("")

    # Four key numbers
    n_drafts = counts.get("idea_draft", 0)
    n_approved = counts.get("idea_approved", 0)
    n_produced = counts.get("content_generated", 0) + counts.get("content_approved", 0)
    n_deployed = counts.get("deployed", 0)
    n_scheduled = counts.get("deployment_scheduled", 0)

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown(
            f"<div style='background:{C['card']};padding:20px;border-radius:8px;text-align:center;'>"
            f"<span style='font-size:2.2rem;font-weight:700;color:{C['gold']};'>{n_drafts}</span><br>"
            f"<span style='color:{C['muted']};font-size:0.85rem;'>ideas to review</span></div>",
            unsafe_allow_html=True,
        )
    with col2:
        st.markdown(
            f"<div style='background:{C['card']};padding:20px;border-radius:8px;text-align:center;'>"
            f"<span style='font-size:2.2rem;font-weight:700;color:{C['primary']};'>{n_approved}</span><br>"
            f"<span style='color:{C['muted']};font-size:0.85rem;'>approved, need scripts</span></div>",
            unsafe_allow_html=True,
        )
    with col3:
        st.markdown(
            f"<div style='background:{C['card']};padding:20px;border-radius:8px;text-align:center;'>"
            f"<span style='font-size:2.2rem;font-weight:700;color:{C['green']};'>{n_produced + n_scheduled}</span><br>"
            f"<span style='color:{C['muted']};font-size:0.85rem;'>ready / scheduled</span></div>",
            unsafe_allow_html=True,
        )
    with col4:
        st.markdown(
            f"<div style='background:{C['card']};padding:20px;border-radius:8px;text-align:center;'>"
            f"<span style='font-size:2.2rem;font-weight:700;color:{C['text']};'>{n_deployed}</span><br>"
            f"<span style='color:{C['muted']};font-size:0.85rem;'>deployed</span></div>",
            unsafe_allow_html=True,
        )

    # ═══════════════════════════════════════════════════════════════════
    #  SECTION 2: DO THIS NEXT — actionable recommendations
    # ═══════════════════════════════════════════════════════════════════

    st.markdown("")
    st.markdown(
        f"<span style='color:{C['muted']};font-size:0.8rem;letter-spacing:0.1em;'>DO THIS NEXT</span>",
        unsafe_allow_html=True,
    )

    actions_shown = 0

    # Action 1: Review drafts
    if n_drafts > 0:
        _action_card(
            icon="⚡", color=C["gold"],
            text=f"**{n_drafts} draft ideas** need your review — approve or reject to keep the pipeline moving",
            button_label="Review now →", button_key="act_review",
            target_tab="CREATE",
        )
        actions_shown += 1

    # Action 2: Generate producer briefs
    if n_approved > 0:
        _action_card(
            icon="📋", color=C["primary"],
            text=f"**{n_approved} approved ideas** need producer briefs before content can be generated",
            button_label="Go to CREATE →", button_key="act_produce",
            target_tab="CREATE",
        )
        actions_shown += 1

    # Action 3: Pillar gaps
    pillar_dist = compute_pillar_distribution(strategy)
    gap_pillars = [p for p in pillar_dist if p["status"] == "gap"]
    if gap_pillars:
        gap_names = ", ".join(f"**{p['name']}**" for p in gap_pillars[:3])
        col_gap, col_gapbtn = st.columns([5, 1])
        with col_gap:
            st.markdown(
                f"<div style='background:{C['card']};padding:12px 16px;border-radius:6px;"
                f"border-left:4px solid {C['hot']};margin:4px 0;'>"
                f"⚠️ {len(gap_pillars)} pillar{'s' if len(gap_pillars) > 1 else ''} "
                f"with <strong>zero content</strong>: {gap_names}. "
                f"Your strategy has gaps that need filling.</div>",
                unsafe_allow_html=True,
            )
        with col_gapbtn:
            st.markdown("")
            if st.button("Fill gaps", key="act_fill"):
                with st.spinner("Generating ideas for gap pillars..."):
                    from gtm_engine.ideas.generator import generate_for_pillar
                    total = 0
                    for gp in gap_pillars[:3]:
                        ids = generate_for_pillar(gp["pillar_id"], n=5)
                        total += len(ids)
                    st.success(f"Generated {total} ideas across {min(3, len(gap_pillars))} pillars")
                    st.rerun()
        actions_shown += 1

    # Action 4: Nothing deployed yet
    if n_deployed == 0 and n_produced == 0 and actions_shown < 3:
        _action_card(
            icon="🚀", color=C["muted"],
            text="**No content produced yet.** Approve some ideas on the CREATE tab to start producing content.",
            button_label="Go to CREATE →", button_key="act_start",
            target_tab="CREATE",
        )
        actions_shown += 1

    # If everything looks healthy
    if actions_shown == 0:
        st.markdown(
            f"<div style='background:{C['card']};padding:16px;border-radius:6px;"
            f"border-left:4px solid {C['green']};'>"
            f"✓ Everything looks good. Pipeline is flowing. Check the CREATE tab "
            f"to keep moving content forward.</div>",
            unsafe_allow_html=True,
        )

    # ═══════════════════════════════════════════════════════════════════
    #  SECTION 3: STRATEGY HEALTH — collapsed detail
    # ═══════════════════════════════════════════════════════════════════

    st.markdown("---")
    st.markdown(
        f"<span style='color:{C['muted']};font-size:0.8rem;letter-spacing:0.1em;'>STRATEGY HEALTH</span>",
        unsafe_allow_html=True,
    )

    # Pillars (collapsed)
    with st.expander(f"Content Pillars ({len(pillar_dist)} pillars)", expanded=False):
        cols = st.columns(min(len(pillar_dist), 3) or 1)
        for i, row in enumerate(pillar_dist):
            with cols[i % len(cols)]:
                sc = {"ok": C["green"], "thin": C["gold"], "gap": C["hot"]}.get(row["status"], C["muted"])
                st.markdown(
                    f"<div style='background:{C['card']};padding:14px;border-radius:8px;"
                    f"border-left:4px solid {sc};margin-bottom:10px;'>"
                    f"<strong>{row['name']}</strong><br>"
                    f"<span style='color:{C['muted']};font-size:0.8rem;'>"
                    f"Target {row['target_pct']}% · Actual {row['actual_pct']}% · "
                    f"{row['idea_count']} ideas</span></div>",
                    unsafe_allow_html=True,
                )

    # Funnel (collapsed)
    funnel_dist = compute_funnel_distribution(strategy)
    with st.expander(f"Funnel Coverage ({len(funnel_dist)} stages)", expanded=False):
        for row in funnel_dist:
            col1, col2, col3 = st.columns([2, 5, 1])
            with col1:
                st.markdown(f"**{row['name']}**")
            with col2:
                fill = min(1.0, row["actual_pct"] / max(row["target_pct"], 1))
                st.progress(fill)
            with col3:
                st.caption(f"{row['actual_pct']}%/{row['target_pct']}%")

    # Channels (collapsed)
    coverage = compute_channel_coverage(strategy)
    if coverage and strategy.pillars:
        with st.expander(f"Channel Coverage ({len(coverage)} channels)", expanded=False):
            pillar_names = [p.name[:14] for p in strategy.pillars]
            header = "| Channel | " + " | ".join(pillar_names) + " |"
            separator = "|---|" + "|".join(["---"] * len(pillar_names)) + "|"
            rows = []
            for ch_row in coverage:
                spec = next((cc for cc in CHANNEL_CATALOGUE if cc["id"] == ch_row["channel_id"]), {})
                name = spec.get("name", ch_row["channel_id"])[:16]
                cells = [f"**{ch_row['cells'].get(p.id, 0)}**" if ch_row['cells'].get(p.id, 0) > 0 else "–"
                         for p in strategy.pillars]
                rows.append(f"| {name} | " + " | ".join(cells) + " |")
            st.markdown("\n".join([header, separator] + rows))

    # ═══════════════════════════════════════════════════════════════════
    #  SECTION 4: STEER — feedback + edit strategy
    # ═══════════════════════════════════════════════════════════════════

    st.markdown("---")
    col_steer, col_edit = st.columns([5, 1])
    with col_steer:
        st.markdown(
            f"<span style='color:{C['muted']};font-size:0.8rem;letter-spacing:0.1em;'>STEER THE ENGINE</span>",
            unsafe_allow_html=True,
        )
    with col_edit:
        if st.button("Edit strategy"):
            st.session_state["show_strategy_editor"] = not st.session_state.get("show_strategy_editor", False)

    # Strategy editor (hidden)
    if st.session_state.get("show_strategy_editor"):
        with st.expander("Strategy Editor", expanded=True):
            new_cap = st.slider("Content per week", 1, 20, strategy.capacity_per_week, key="edit_cap")
            phase_opts = {p["id"]: p["name"] for p in BUSINESS_PHASES}
            new_phase = st.selectbox("Phase", list(phase_opts.keys()),
                                     format_func=lambda x: phase_opts[x],
                                     index=list(phase_opts.keys()).index(strategy.business_phase)
                                     if strategy.business_phase in phase_opts else 0,
                                     key="edit_phase")
            if st.button("Save changes"):
                from gtm_engine.strategy_framework.builder import build_sequencing
                strategy.capacity_per_week = new_cap
                strategy.business_phase = new_phase
                strategy.sequencing = build_sequencing(new_cap, new_phase, strategy.pillars)
                store.save(strategy)
                st.session_state["show_strategy_editor"] = False
                st.rerun()

    # Feedback input
    feedback_text = st.text_input(
        "Strategic note",
        placeholder="e.g. 'More PRISM content using real companies' or 'Less abstract thought leadership'",
        label_visibility="collapsed",
    )
    if st.button("Save note", disabled=not (feedback_text or "").strip()):
        store.add_feedback(StrategyFeedback(text=feedback_text.strip()))
        st.rerun()

    active_fb = store.list_feedback(status="active")
    if active_fb:
        for fb in active_fb[:5]:
            col_fb, col_fbx = st.columns([6, 1])
            with col_fb:
                st.caption(f"• {fb.text}")
            with col_fbx:
                if st.button("✓", key=f"fbdone_{fb.id}"):
                    store.update_feedback_status(fb.id, "addressed")
                    st.rerun()


def _action_card(icon: str, color: str, text: str, button_label: str,
                 button_key: str, target_tab: str = ""):
    """Render a single action recommendation card."""
    col_body, col_btn = st.columns([5, 1])
    with col_body:
        st.markdown(
            f"<div style='background:{C['card']};padding:12px 16px;border-radius:6px;"
            f"border-left:4px solid {color};margin:4px 0;'>"
            f"{icon} {text}</div>",
            unsafe_allow_html=True,
        )
    with col_btn:
        st.markdown("")
        st.button(button_label, key=button_key)


# ═══════════════════════════════════════════════════════════════════════════
#  CREATE TAB (Kanban Board)
# ═══════════════════════════════════════════════════════════════════════════

def _render_create():
    from gtm_engine.ideas import IdeaBank
    from gtm_engine.approval import get_pipeline_counts

    bank = IdeaBank()
    counts = get_pipeline_counts()

    # ── Top action bar ──
    col_gen, col_brief, col_counts = st.columns([2, 2, 3])
    with col_gen:
        n_ideas = st.number_input("Ideas", min_value=5, max_value=100, value=20, step=5,
                                  label_visibility="collapsed")
        if st.button("Generate ideas"):
            with st.spinner(f"Generating {n_ideas} ideas..."):
                from gtm_engine.ideas.generator import generate_and_save
                ids = generate_and_save(n=n_ideas)
                st.success(f"{len(ids)} ideas created")
                st.rerun()
    with col_brief:
        if st.button("New brief request"):
            st.session_state["show_brief_panel"] = True
    with col_counts:
        pipeline_str = " → ".join(
            f"**{counts.get(s, 0)}** {label}"
            for s, label in [
                ("idea_draft", "Draft"),
                ("idea_approved", "Approved"),
                ("content_generated", "Produced"),
                ("content_approved", "Reviewed"),
                ("deployment_scheduled", "Scheduled"),
            ]
        )
        st.markdown(pipeline_str)

    # ── Brief request panel ──
    if st.session_state.get("show_brief_panel"):
        with st.expander("Brief Request", expanded=True):
            from gtm_engine.briefs import BriefQueue, Brief, BRIEF_TYPES
            title = st.text_input("Brief title", placeholder="e.g. Founder introduction series")
            desc = st.text_area("What do you want?", height=120,
                                placeholder="Describe the content you need in plain language...")
            btype = st.selectbox("Type", BRIEF_TYPES)
            bcount = st.number_input("Number of ideas", 1, 50, 5)
            if st.button("Generate from brief", type="primary"):
                if title and desc:
                    brief = Brief(title=title, description=desc, brief_type=btype, target_count=bcount)
                    q = BriefQueue()
                    bid = q.create(brief)
                    brief.id = bid
                    with st.spinner("Generating..."):
                        from gtm_engine.briefs.generator import generate_ideas_from_brief
                        ideas = generate_ideas_from_brief(brief)
                        st.success(f"Generated {len(ideas)} ideas from brief.")
                        st.session_state["show_brief_panel"] = False
                        st.rerun()

    st.markdown("---")

    # ── Kanban columns ──
    stages = [
        ("idea_draft", "IDEAS", "Draft ideas for review"),
        ("idea_approved", "APPROVED", "Ready for producer brief / content generation"),
        ("content_generated", "PRODUCED", "Content generated, needs review"),
        ("content_approved", "REVIEWED", "Approved, ready to schedule"),
        ("deployment_scheduled", "SCHEDULED", "Queued for deployment"),
    ]

    # Render as columns
    kanban_cols = st.columns(len(stages))

    for col_idx, (status, label, desc) in enumerate(stages):
        with kanban_cols[col_idx]:
            ideas = bank.list_all(status=status, limit=20)
            st.markdown(
                f"<div style='background:{C['panel']};padding:8px 12px;border-radius:6px;"
                f"text-align:center;margin-bottom:8px;'>"
                f"<strong>{label}</strong> ({len(ideas)})<br>"
                f"<span style='font-size:0.7rem;color:{C['muted']}'>{desc}</span></div>",
                unsafe_allow_html=True,
            )

            for idea in ideas[:10]:
                # Determine pillar tag color
                pillar_tag = ""
                for t in (idea.tags or []):
                    if t not in ("standalone", "hook", "tension", "pivot", "proof", "bookend"):
                        pillar_tag = t
                        break

                product_badge = f"<span style='color:{C['primary']};font-size:0.7rem;'>{idea.product}</span> " if idea.product else ""

                st.markdown(
                    f"<div style='background:{C['card']};padding:10px;border-radius:6px;"
                    f"margin-bottom:6px;border-left:3px solid {C['primary']};'>"
                    f"{product_badge}"
                    f"<strong style='font-size:0.85rem;'>{idea.title[:50]}</strong><br>"
                    f"<span style='color:{C['gold']};font-size:0.75rem;font-style:italic;'>"
                    f"{idea.hook[:60]}</span><br>"
                    f"<span style='color:{C['muted']};font-size:0.65rem;'>"
                    f"{pillar_tag} · {idea.segment_type} · e{idea.edginess_score}</span>"
                    f"</div>",
                    unsafe_allow_html=True,
                )

                # Action buttons per card per stage
                if status == "idea_draft":
                    if st.button("Approve", key=f"app_{idea.id}", use_container_width=True):
                        from gtm_engine.approval import approve_idea
                        approve_idea(idea.id)
                        st.rerun()

                elif status == "idea_approved":
                    if st.button("Producer Brief", key=f"pb_{idea.id}", use_container_width=True):
                        with st.spinner("Generating..."):
                            from gtm_engine.producer import generate_producer_brief
                            generate_producer_brief(idea.id)
                            from gtm_engine.approval import mark_content_generated
                            mark_content_generated(idea.id)
                            st.rerun()

                elif status == "content_generated":
                    if st.button("Approve", key=f"cappr_{idea.id}", use_container_width=True):
                        from gtm_engine.approval import approve_content
                        approve_content(idea.id)
                        st.rerun()

                elif status == "content_approved":
                    if st.button("Schedule", key=f"sched_{idea.id}", use_container_width=True):
                        from gtm_engine.approval import schedule_deployment
                        schedule_deployment(idea.id)
                        st.rerun()

            if len(ideas) > 10:
                st.caption(f"+ {len(ideas) - 10} more")

    # ── Side panels (slide-out style via expanders) ──
    st.markdown("---")
    col_dv, col_sl, col_cl = st.columns(3)

    with col_dv:
        with st.expander("Data Vault"):
            from gtm_engine.data_vault import DataVault, DataSource
            vault = DataVault()
            sources = vault.list_all()
            st.caption(f"{len(sources)} data sources")
            for src in sources[:5]:
                st.markdown(f"• **{src.name}** ({src.source_type})")
            new_name = st.text_input("Add data source", placeholder="Name", key="dv_name")
            new_content = st.text_area("Content", height=80, key="dv_content",
                                       placeholder="Paste the actual data...")
            if st.button("Save", key="dv_save", disabled=not (new_name and new_content)):
                vault.create(DataSource(name=new_name, content=new_content))
                st.rerun()

    with col_sl:
        with st.expander("Scene Library"):
            from gtm_engine.scenes import SceneLibrary
            lib = SceneLibrary()
            scenes = lib.list_all()
            st.caption(f"{len(scenes)} scenes")
            for s in scenes:
                lock = " [locked]" if s.locked else ""
                st.markdown(f"• **{s.name}**{lock}")
                st.caption(s.description[:80] if s.description else "")

    with col_cl:
        with st.expander("Character Library"):
            chars_dir = DATA_DIR.parent / "references" / "influencers"
            if chars_dir.exists():
                for d in sorted(chars_dir.iterdir()):
                    if d.is_dir():
                        images = list(d.glob("*.png")) + list(d.glob("*.jpg"))
                        st.markdown(f"• **{d.name}** ({len(images)} images)")
            else:
                st.caption("No characters yet")


# ═══════════════════════════════════════════════════════════════════════════
#  PERFORM TAB
# ═══════════════════════════════════════════════════════════════════════════

def _render_perform():
    from gtm_engine.ideas import IdeaBank
    from gtm_engine.approval import get_pipeline_counts

    counts = get_pipeline_counts()

    st.markdown("### Performance Overview")
    st.caption("Connect your platform analytics to see real engagement data here.")

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Total ideas", sum(counts.values()))
    with col2:
        st.metric("Content produced", counts.get("content_generated", 0) + counts.get("content_approved", 0))
    with col3:
        st.metric("Deployed", counts.get("deployed", 0))
    with col4:
        st.metric("Scheduled", counts.get("deployment_scheduled", 0))

    st.markdown("---")

    # ── Deployment log ──
    st.markdown("### Deployment History")
    deploy_path = OUTPUT_DIR / "deployment_log.json"
    if deploy_path.exists():
        deploy_log = load_json(deploy_path)
        for entry in deploy_log[-10:]:
            st.markdown(
                f"• **{entry.get('channel', '?')}** — {entry.get('content_type', '?')} — "
                f"{entry.get('deployed_at', '?')[:10]}"
            )
    else:
        st.info("No deployments yet. Approve content and schedule it on the CREATE tab.")

    # ── Performance data ──
    st.markdown("---")
    st.markdown("### Platform Analytics")
    perf_path = OUTPUT_DIR / "performance_log.json"
    if perf_path.exists():
        perf = load_json(perf_path)
        st.markdown(f"**{len(perf)} data points collected**")
        for entry in perf[-5:]:
            st.markdown(
                f"• {entry.get('channel', '?')}: {json.dumps(entry.get('metrics', {}))}"
            )
    else:
        st.markdown(
            "No performance data yet. To connect platform analytics, add API keys "
            "in **Settings** for your deployment channels (LinkedIn, Twitter, Reddit, etc). "
            "The engine will pull engagement metrics after deployment."
        )

    # ── Reprioritisation log ──
    repri_path = OUTPUT_DIR / "reprioritisation_report.md"
    if repri_path.exists():
        st.markdown("---")
        st.markdown("### Latest Reprioritisation")
        st.markdown(repri_path.read_text()[:3000])

    # ── Connector status ──
    st.markdown("---")
    st.markdown("### Connected Platforms")
    st.caption("Add API keys in Settings to enable performance tracking.")

    from gtm_engine.config import (
        SENDGRID_API_KEY, REDDIT_CLIENT_ID, LINKEDIN_ACCESS_TOKEN,
        TWITTER_API_KEY,
    )
    platforms = [
        ("Email (SendGrid)", bool(SENDGRID_API_KEY)),
        ("Reddit", bool(REDDIT_CLIENT_ID)),
        ("LinkedIn", bool(LINKEDIN_ACCESS_TOKEN)),
        ("Twitter/X", bool(TWITTER_API_KEY)),
    ]
    for name, connected in platforms:
        status = f"<span style='color:{C['green']}'>Connected</span>" if connected else f"<span style='color:{C['muted']}'>Not configured</span>"
        st.markdown(f"• **{name}**: {status}", unsafe_allow_html=True)

    # Future: Stripe, GA, Meta
    st.markdown(f"• **Stripe/Lemonsqueezy**: <span style='color:{C['muted']}'>Coming soon</span>", unsafe_allow_html=True)
    st.markdown(f"• **Google Analytics**: <span style='color:{C['muted']}'>Coming soon</span>", unsafe_allow_html=True)
    st.markdown(f"• **Meta (Instagram)**: <span style='color:{C['muted']}'>Coming soon</span>", unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════
#  SETTINGS TAB
# ═══════════════════════════════════════════════════════════════════════════

def _render_settings():
    tabs = st.tabs(["Brand Standards", "Avatar", "Core-Five Spec", "Intelligence Feed"])

    # ── Brand Standards ──
    with tabs[0]:
        st.markdown("### Brand Standards")
        brand_path = DATA_DIR / "brand_standards.json"
        if brand_path.exists():
            standards = load_json(brand_path)
            voice = standards.get("voice", {})
            edginess = standards.get("edginess", {})

            st.markdown(f"**Tone:** {', '.join(voice.get('tone_descriptors', []))}")
            st.markdown(f"**Edginess level:** {edginess.get('level', '?')}/10")
            st.markdown(f"**Philosophy:** *{voice.get('philosophy', '')}*")

            st.markdown("**Forbidden phrases:**")
            st.code(", ".join(voice.get("forbidden_phrases", [])), language=None)

            st.markdown("**Colour palette:**")
            colours = standards.get("visual", {}).get("colours", {})
            cols = st.columns(min(5, len(colours)) or 1)
            for i, (name, hex_val) in enumerate(colours.items()):
                with cols[i % len(cols)]:
                    st.markdown(
                        f"<div style='background:{hex_val};padding:16px;border-radius:4px;"
                        f"text-align:center;font-size:0.7rem;'>{name}<br>{hex_val}</div>",
                        unsafe_allow_html=True,
                    )
        else:
            st.warning("Brand standards not initialised. Run `python main.py brand` in the terminal.")

    # ── Avatar ──
    with tabs[1]:
        st.markdown("### Avatar Provider (BYOK)")
        from gtm_engine.avatar import list_providers, get_provider
        for p in list_providers():
            status = "Connected" if p["configured"] else "Not configured"
            st.markdown(f"• **{p['name']}** — {status}")
        active = get_provider()
        st.caption(f"Active provider: {active.provider_name}")
        if active.provider_id == "none":
            st.info(
                "No avatar provider configured. Content will use B-roll + voiceover. "
                "To enable HeyGen, add `HEYGEN_API_KEY=<key>` and `AVATAR_PROVIDER=heygen` "
                "to your `.env` file."
            )

    # ── Core-Five Spec ──
    with tabs[2]:
        st.markdown("### Core-Five Reel Architecture")
        from gtm_engine.segments import load_segments
        segments = load_segments()
        for seg in segments["segments"]:
            st.markdown(
                f"**{seg['order']}. {seg['name']}** ({seg['duration_seconds']}s) — "
                f"{seg['purpose']}"
            )
        st.markdown("---")
        st.markdown("**Inviolable rules:**")
        for rule in segments.get("inviolable_rules", []):
            st.markdown(f"• {rule}")

    # ── Intelligence Feed ──
    with tabs[3]:
        st.markdown("### Live Signals")
        st.caption(
            "Drop raw signals: customer quotes, data findings, market events. "
            "High-priority signals auto-generate content ideas."
        )
        signal_type = st.selectbox(
            "Type",
            ["general", "customer_conversation", "data_finding",
             "competitor_move", "market_event", "product_insight"],
        )
        signal_text = st.text_area("Signal", height=120, placeholder="What happened?")
        if st.button("Submit signal", disabled=not signal_text.strip()):
            with st.spinner("Assessing..."):
                from gtm_engine.intelligence import submit_signal
                record = submit_signal(signal_text, signal_type)
                a = record.get("assessment", {})
                st.success(f"Priority {a.get('priority','?')}/5: {a.get('significance_summary','')}")


if __name__ == "__main__":
    main()
