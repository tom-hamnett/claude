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

# Bump on each deploy so a redeploy is visibly confirmable in the running app.
BUILD_TAG = "2026-09-07h · Draft voice paced + labelled as stand-in; cadence cache-key bug fixed"

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

    # Password gate (only active if APP_PASSWORD is set)
    if not _check_auth():
        return

    # Durable persistence: on a fresh container, pull the last snapshot before
    # anything reads the DB. Best-effort — no-op if Supabase isn't configured.
    if not st.session_state.get("_restored"):
        try:
            from gtm_engine.persistence import restore_if_empty
            restore_if_empty()
        except Exception:
            pass
        st.session_state["_restored"] = True

    _init_db()

    # First-time? Show onboarding
    if not _is_setup_complete():
        _onboarding_wizard()
        return

    # Tiny build stamp so a redeploy is visibly confirmable at a glance.
    st.caption(f"build {BUILD_TAG}")

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


def _check_auth() -> bool:
    """Simple password gate. Only active if APP_PASSWORD is set in .env or Streamlit secrets."""
    from gtm_engine.config import APP_PASSWORD

    # Also check Streamlit secrets (for Streamlit Cloud deployment)
    password = APP_PASSWORD
    if not password:
        try:
            password = st.secrets.get("APP_PASSWORD", "")
        except Exception:
            pass

    if not password:
        return True  # No password set — open access (local dev)

    if st.session_state.get("authenticated"):
        return True

    st.markdown("### Quantum Tools GTM")
    st.caption("Enter your password to continue.")
    entered = st.text_input("Password", type="password")
    if st.button("Enter"):
        if entered == password:
            st.session_state["authenticated"] = True
            st.rerun()
        else:
            st.error("Incorrect password.")
    return False


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

        st.markdown("---")
        st.caption("Just exploring, or on a fresh cloud deploy? Skip setup entirely:")
        if st.button("⚡ Load the Quantum Tools demo (no API key needed)"):
            with st.spinner("Loading demo strategy, ideas and produced items..."):
                from gtm_engine.demo import load_quantum_demo
                from gtm_engine.persistence import backup_quietly
                summary = load_quantum_demo()
                backup_quietly()
                st.success(
                    f"Loaded {summary['ideas']} ideas across {summary['pillars']} pillars "
                    f"+ {summary['produced_jobs']} produced items. Opening the app..."
                )
                st.rerun()
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
        gap_names = ", ".join(f"<strong>{p['name']}</strong>" for p in gap_pillars[:3])
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
    import re
    # This card is raw HTML, so convert markdown bold (**...**) to <strong>.
    html_text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    col_body, col_btn = st.columns([5, 1])
    with col_body:
        st.markdown(
            f"<div style='background:{C['card']};padding:12px 16px;border-radius:6px;"
            f"border-left:4px solid {color};margin:4px 0;'>"
            f"{icon} {html_text}</div>",
            unsafe_allow_html=True,
        )
    with col_btn:
        st.markdown("")
        st.button(button_label, key=button_key)


def _video_view(idea):
    """Read-only view of a card's script + rendered video (REVIEWED / SCHEDULED)."""
    from gtm_engine.video import VideoJobStore
    job = VideoJobStore().get_for_idea(idea.id)
    if not job:
        return
    with st.expander("🎬 Video", expanded=False):
        st.markdown(f"**Hook:** {job.hook_text or '_—_'}")
        st.markdown(f"**Bookend:** {job.bookend_text or '_—_'}")
        if job.status == "ready" and job.video_path and Path(job.video_path).exists():
            if job.video_path.lower().endswith((".png", ".jpg", ".jpeg")):
                st.image(job.video_path, caption="Preview")
            else:
                st.video(job.video_path)
        else:
            st.caption(f"No rendered video yet (status: {job.status.replace('_',' ')}).")
            if st.button("← Back to PRODUCED to render", key=f"back_{idea.id}",
                         use_container_width=True):
                from gtm_engine.ideas import IdeaBank
                IdeaBank().update_status(idea.id, "content_generated", "moved back to render")
                st.rerun()


def _heygen_handoff(idea, job):
    """The full production package for making this reel in HeyGen — copy-ready."""
    from gtm_engine.producer import ProducerBriefLibrary
    from gtm_engine.casting import CastingStore
    brief = ProducerBriefLibrary().get_for_idea(idea.id)
    segs = (brief.segments_json if brief else {}) or {}

    st.caption("HeyGen → The Analyst → **Photo to Video** → pick a look, then paste each piece:")

    st.markdown("**① Script — paste into the script box**")
    st.code(job.spoken_script or "—", language=None)

    st.markdown("**② Avatar IV custom motion — paste into ‘Custom Motion’**")
    st.code(job.motion_prompt or "measured and direct; lean in slightly on the key line",
            language=None)

    # Look / setting suggestion — the auto-cast look from the Look Library wins,
    # else the per-reel environment (or character default).
    look = "a natural, front-facing look, well lit"
    cast_look = None
    try:
        cs = CastingStore()
        ch = cs.get_default_character()
        if job.look_id:
            cast_look = cs.get_look(job.look_id)
        env_id = job.environment_id or (ch.environment_id if ch else None)
        if env_id:
            env = cs.get_environment(env_id)
            if env:
                look = f"{env.name} — {env.description}"
    except Exception:
        pass
    st.markdown("**③ Look / setting for this reel**")
    if cast_look:
        st.markdown(f"👗 Auto-cast look: **{cast_look.name or 'Look'}** — "
                    f"{cast_look.description or ''}")
        st.caption(f"Setting: {look}" + (f"  ·  tone: {job.tone}" if job.tone else ""))
    else:
        st.caption(look + (f"  ·  tone: {job.tone}" if job.tone else ""))

    # Per-segment shot direction (the creative bit)
    st.markdown("**④ Shot direction (what happens on screen)**")
    for seg_id, label in [("hook", "Hook (you)"), ("tension", "Tension (text/data)"),
                          ("pivot", "Pivot (data-viz)"), ("proof", "Proof (product)"),
                          ("bookend", "Bookend (you)")]:
        s = segs.get(seg_id, {}) or {}
        vd = s.get("visual_direction", "")
        spoken = s.get("spoken_text", "")
        overlay = s.get("text_overlay", "")
        if vd or spoken or overlay:
            bits = []
            if spoken:
                bits.append(f"say: “{spoken}”")
            if vd:
                bits.append(vd)
            if overlay:
                bits.append(f"on-screen: {overlay}")
            st.markdown(f"<span style='font-size:0.8rem;'><strong>{label}</strong> — "
                        f"{' · '.join(bits)}</span>", unsafe_allow_html=True)

    if job.camera_note:
        st.markdown(f"**⑤ Camera** — {job.camera_note}")

    st.markdown("[Open HeyGen ↗](https://app.heygen.com) — make it, then upload it back below.")


def _auto_assemble_ui(idea, job):
    """The 'agent builds it for me' path — assemble the whole Core-Five reel into
    one vertical mp4 (presenter hook/bookend + data/proof middle + captions)."""
    import json as _json
    from gtm_engine.video.assembler import start_assemble, is_running, progress_of
    from gtm_engine.config import GOOGLE_API_KEY

    # If a render/assembly is already running on the server, show progress only.
    # The work survives you closing the tab — it keeps going server-side.
    if is_running(job.id):
        p = progress_of(job.id) or (0, 1, "working")
        st.progress(min(p[0] / max(p[1], 1), 1.0),
                    text=f"Building on the server… {p[2]} ({p[0]}/{p[1]})")
        st.info("This runs on the server — you can lock your phone or close the tab. "
                "The finished reel appears in **4 · REVIEW** below when it's done. "
                "Tap **Check progress** every minute or so.")
        if st.button("↻ Check progress", key=f"chk_{idea.id}", use_container_width=True,
                     type="primary"):
            st.rerun()
        return

    st.caption("The tool records your **full script as one continuous take** — your face, "
               "your voice, never silent (~20–30s) — then lays proof visuals over the middle "
               "as cutaways while your narration keeps going underneath. One vertical video "
               "you just review.")

    # ── 1 · Mode: the one choice that drives the whole B-roll strategy ──────────
    from gtm_engine.video.modes import MODES
    from gtm_engine.video.modes import profile as _mode_profile
    from gtm_engine.video import set_content_mode
    _mode_keys = list(MODES)
    _cur_mode = job.content_mode if job.content_mode in MODES else "insight"
    st.markdown("**1 · What kind of reel is this?**")
    _picked = st.radio(
        "Reel type", _mode_keys, index=_mode_keys.index(_cur_mode),
        format_func=lambda k: f"{MODES[k]['icon']} {MODES[k]['label']}",
        key=f"mode_{idea.id}", label_visibility="collapsed")
    st.caption(MODES[_picked]["blurb"])
    if _picked != _cur_mode:
        set_content_mode(job.id, _picked)
        st.rerun()
    _prof = _mode_profile(_picked)

    # ── Data → charts: attach a spreadsheet, the engine finds the insight ───────
    if _prof.get("charts"):
        _need = _prof.get("data_step")
        with st.container(border=True):
            st.markdown("**📊 Your data becomes the proof**"
                        + ("" if _need else " _(optional)_"))
            if job.data_charts:
                st.success(f"✓ {len(job.data_charts)} proof chart(s) built from your data — "
                           "they'll be cut into the reel automatically.")
                _ins = ""
                try:
                    _ins = (_json.loads(job.assembly_json or "{}") or {}).get("data_insight", "")
                except Exception:
                    _ins = ""
                if _ins:
                    st.caption(f"Insight: {_ins}")
            elif job.data_source_id:
                st.info("📎 Data **inherited from the idea** — the charts build automatically when "
                        "you generate the reel. Upload below only to override it.")
            else:
                st.caption("Upload the spreadsheet (CSV or XLSX) behind this reel — e.g. your "
                           "ATLAS log. The engine reads the real cells, finds the insight, and "
                           "builds on-brand charts from the actual numbers."
                           + ("" if _need else " Skip it and the charts come from the numbers "
                              "your script mentions."))
            _df = st.file_uploader("Spreadsheet (CSV / XLSX)", type=["csv", "tsv", "xlsx", "xlsm"],
                                   key=f"data_{idea.id}", accept_multiple_files=False)
            if _df and st.button("📈 Analyse & build charts", key=f"datago_{idea.id}",
                                 use_container_width=True):
                from gtm_engine.video import attach_data_source
                dd = OUTPUT_DIR / "uploads" / f"idea_{idea.id}_data"
                dd.mkdir(parents=True, exist_ok=True)
                fp = dd / _df.name
                fp.write_bytes(_df.getbuffer())
                with st.spinner("Reading your data and finding the insight…"):
                    _j, _msg = attach_data_source(job.id, str(fp), name=_df.name)
                (st.success if (_j and _j.data_charts) else st.info)(_msg)
                from gtm_engine.persistence import backup_quietly
                backup_quietly()
                st.rerun()
            if job.data_charts and st.button("✕ Clear data & charts", key=f"dataclr_{idea.id}"):
                from gtm_engine.video import set_shot_list
                _s = VideoJobStore().get(job.id)
                _s.data_source_id, _s.data_charts, _s.shot_list = None, [], []
                VideoJobStore().save(_s); st.rerun()

    # Pre-flight: can the presenter actually render as YOU? (Avatar IV needs an
    # uploaded photo's image_key — a trained-avatar id alone won't drive the API.)
    from gtm_engine.casting import CastingStore
    _cs = CastingStore()
    _ch = _cs.get_default_character()
    _looks = _cs.list_looks(_ch.id) if (_ch and _ch.id) else []
    _has_photo = bool(_ch and (_ch.image_key or any(l.image_key for l in _looks)))
    _has_classic = bool(_ch and _ch.avatar_id and not _ch.avatar_id.startswith("tp:"))
    if not (_has_photo or _has_classic):
        st.warning(
            "⚠️ Your presenter can't render yet, so the hook & bookend will use text "
            "cards — not you. HeyGen's API can't drive a *trained* avatar. To get **you** "
            "on screen: go to **Settings → Cast & Voice → Look Library** and upload a photo "
            "or two of The Analyst. That gives the tool the image it needs, and the reel will "
            "render in your face and your voice.")

    # Cinematic YOU (Seedance) is the primary middle — default ON when available.
    # ── Your own footage / screenshots for the middle (FREE — best 'proof') ──
    st.markdown("**🎞 Cut in your own footage / screenshots (free)**")
    st.caption("This is the cheapest and best middle — show the real ATLAS dashboard, a chart, "
               "a screen recording. Images become a slideshow; a clip is used as-is. Plays over "
               "your continuous voice.")
    _media = list(job.middle_media or [])
    if _media:
        st.caption("Using: " + ", ".join(Path(m).name for m in _media))
        if st.button("✕ Clear my media", key=f"clrmed_{idea.id}"):
            from gtm_engine.video import set_middle_media
            set_middle_media(job.id, []); st.rerun()
    up = st.file_uploader("Upload images / video for the middle", key=f"med_{idea.id}",
                          type=["png", "jpg", "jpeg", "webp", "mp4", "mov", "webm"],
                          accept_multiple_files=True)
    if up and st.button("Use these in the middle", key=f"medadd_{idea.id}",
                        use_container_width=True):
        from gtm_engine.video import set_middle_media
        updir = OUTPUT_DIR / "uploads" / f"idea_{idea.id}_media"
        updir.mkdir(parents=True, exist_ok=True)
        paths = []
        for f in up:
            p = updir / f.name
            p.write_bytes(f.getbuffer())
            paths.append(str(p))
        set_middle_media(job.id, paths)
        from gtm_engine.persistence import backup_quietly
        backup_quietly()
        st.success(f"Added {len(paths)} file(s) for the middle."); st.rerun()

    st.caption("🔊 Voice: only **you** (hook & bookend). The middle rides on captions over the "
               "proof visuals — no mismatched AI voice.")

    # ── Advanced — premium & quality knobs, collapsed (mode sets good defaults) ──
    _has_cine = bool(_ch and (_ch.cinematic_look_ids or _ch.avatar_group_id))
    with st.expander("⚙️ Advanced — quality & premium options", expanded=False):
        hd = st.toggle(
            "🎞 HD presenter — render you at 1080p (~2× HeyGen credits)",
            value=False, key=f"hd_{idea.id}",
            help="Off (720p): cheaper, fine for most. On: HeyGen renders your face at full "
                 "1080p to match your screenshots — sharper, but roughly double the credits per take.",
        )
        cinematic = st.toggle(
            "🎬 Cinematic YOU (Seedance — premium, ~60 HeyGen credits)",
            value=False, key=f"cine_{idea.id}", disabled=not _has_cine,
            help="OPTIONAL. Casts your real digital twin into the middle — costs HeyGen credits. "
                 "Leave OFF and use your own footage / data-viz (free) for most reels.",
        )
        broll = st.toggle(
            "Faceless B-roll fallback (Veo — ~£1–2 per reel)",
            value=False, key=f"broll_{idea.id}",
            help="A faceless cinematic b-roll fallback. Off: the middle uses your data-viz and "
                 "screenshots instead.",
        )
        narrate = st.toggle(
            "Narrate the middle with an AI voice",
            value=False, key=f"narr_{idea.id}",
            help="Off (recommended): only YOUR voice, over captions. On: adds an AI voiceover "
                 "to the middle — it won't match your cloned voice.",
        )
        # AI b-roll model picker (only when fal.ai is connected). Saves globally.
        from gtm_engine.config import FAL_KEY as _FAL
        if _FAL:
            from gtm_engine.avatar import AvatarConfigStore as _ACS
            from gtm_engine.utils.media import FAL_MODELS
            _cs2 = _ACS(); _cfg2 = _cs2.load()
            _names = list(FAL_MODELS)
            _cur = next((n for n, i in FAL_MODELS.items() if i == _cfg2.fal_model), _names[0])
            _pick = st.selectbox("🤖 AI b-roll model (for `generate` beats)", _names,
                                 index=_names.index(_cur), key=f"falm_{idea.id}",
                                 help="Which fal.ai model makes generated clips. Hailuo is cheapest; "
                                      "Kling is a touch better.")
            if FAL_MODELS[_pick] != _cfg2.fal_model:
                _cfg2.fal_model = FAL_MODELS[_pick]; _cs2.save(_cfg2)

    # ── 2 · Generate: free draft first, then the paid reel ──────────────────────
    st.markdown("**2 · Generate**")
    if st.button("🆓 Free draft (AI voice, no HeyGen credits)", key=f"draft_{idea.id}",
                 use_container_width=True):
        start_assemble(job.id, draft=True)
        st.rerun()
    st.caption("Draft = your script in a stand-in AI voice over your look, so you can nail the "
               "words, pacing and length **for free** before spending any HeyGen credits.")

    # ── Pre-flight QA (FREE, no API) — catch faults before paying ──────────────
    pf_ready = True
    if job.shot_list or job.video_path:
        try:
            from gtm_engine.video.reel_qa import preflight
            pf = preflight(job)
            pf_ready = pf["ready"]
            _sc = pf["score"]
            _col = C["green"] if _sc >= 85 else (C["gold"] if _sc >= 65 else C["hot"])
            with st.container(border=True):
                st.markdown(f"**✅ Pre-flight check (free)** — "
                            f"<span style='color:{_col};font-weight:600;'>{_sc}/100</span>",
                            unsafe_allow_html=True)
                for c in pf["checks"]:
                    if c["severity"] == "info" and c["ok"]:
                        continue   # keep the list to what needs attention
                    icon = "🟢" if c["ok"] else ("⛔️" if c["severity"] == "block" else "🟡")
                    st.markdown(f"<span style='font-size:0.82rem;'>{icon} **{c['name']}** — "
                                f"{c['detail']}</span>", unsafe_allow_html=True)
                if pf["ready"] and _sc >= 85:
                    st.caption("Looks clean — safe to spend a credit.")
                elif pf["ready"]:
                    st.caption("No blockers, but tidy the ⚠️ items (edit the script / shot list) "
                               "and re-draft for free first.")
                else:
                    st.caption("⛔️ Blockers above will waste your credit — fix them and re-draft "
                               "(free) before assembling.")
        except Exception:
            pass   # preflight is advisory — never let it break the panel

    lbl = "✨ Auto-assemble full reel (spends HeyGen credits)" if not job.video_path \
        else "✨ Re-assemble reel (spends HeyGen credits)"
    if not pf_ready:
        st.warning("Pre-flight found blockers — assembling now will likely waste the credit. "
                   "Fix them and run a free draft first.")
    if st.button(lbl, key=f"asm_{idea.id}", use_container_width=True, type="primary"):
        start_assemble(job.id, draft=False, hd=hd)
        st.rerun()

    methods = {}
    _state = {}
    try:
        _state = _json.loads(job.assembly_json or "{}") or {}
        methods = _state.get("methods") or {}
    except Exception:
        methods = {}
    # The presenter take failed → the reel fell back to cards. Say why, loudly.
    if _state.get("master_error"):
        me = _state["master_error"]
        st.error(f"⚠️ Your presenter take didn't render, so the reel fell back to cards — {me}")
        if "credit" in me.lower():
            st.markdown("💳 **[Top up HeyGen API credits ↗](https://app.heygen.com/settings/subscriptions)** "
                        "then re-assemble.")
    if methods:
        if "reel" in methods:  # continuous-voice model
            dur = methods.get("duration")
            st.caption(f"Built as — **{methods['reel']}**"
                       + (f"  ·  ~{dur:g}s" if dur else ""))
            _cut_err = ""
            try:
                _cut_err = (_json.loads(job.assembly_json or "{}") or {}).get("cutaway_error", "")
            except Exception:
                _cut_err = ""
            if "talking-head (full)" == methods.get("reel"):
                if _cut_err:
                    st.warning(f"No cutaway this time — {_cut_err}")
                    if "credit" in _cut_err.lower():
                        st.markdown("💳 **[Top up your HeyGen API credits ↗]"
                                    "(https://app.heygen.com/settings/subscriptions)** "
                                    "(cinematic needs *API* credits — a separate pool from the "
                                    "app), then re-assemble.")
                else:
                    st.caption("Voice-over only (no cutaway this time). Turn on **Cinematic YOU** "
                               "or **B-roll** to layer motion over the middle.")
        else:  # legacy per-segment model
            icon = {"avatar": "🧑 presenter", "cinematic": "🎬 cinematic you",
                    "b-roll": "🎞 b-roll", "card": "🅰 card"}
            chips = "  ·  ".join(f"{k}: {icon.get(v, v)}" for k, v in methods.items())
            st.caption("Built from — " + chips)
    if job.status == "failed" and job.error:
        st.error(job.error)

    # Nudge to add the FREE Pexels key when stock beats would otherwise be cards.
    if any((s.get("visual") == "stock") for s in (job.shot_list or [])):
        from gtm_engine.config import PEXELS_API_KEY
        if not PEXELS_API_KEY:
            st.info("🎞 Some beats want **stock footage** to illustrate the point, but no Pexels "
                    "key is set — they're showing text cards for now. Add a **free** key "
                    "([pexels.com/api](https://www.pexels.com/api/)) in **Settings → Connections** "
                    "and re-cut (free) to fill them with real video.")

    if any((s.get("visual") == "generate") for s in (job.shot_list or [])):
        from gtm_engine.config import FAL_KEY
        if not FAL_KEY:
            st.info("✨ A beat is set to **generate** a clip, but no fal.ai key is set — it's "
                    "showing a card. Add a **FAL_KEY** ([fal.ai](https://fal.ai/)) in "
                    "**Settings → Connections** to generate cheap AI b-roll (~7–15¢/clip).")

    # ── Shot list — the choreography, editable, re-cuts for FREE (take is cached) ──
    if job.shot_list:
        _shot_list_editor(idea, job)


def _spec_summary(spec) -> str:
    """One-line, read-only preview of a chart shot's data (shown in the shot table)."""
    if not isinstance(spec, dict):
        return ""
    ct = spec.get("chart_type")
    if ct == "stat":
        return f"stat: {spec.get('value','')} {spec.get('label','')}".strip()
    if ct == "bar":
        return "bars: " + ", ".join(f"{b.get('label','')} {b.get('value','')}"
                                    for b in (spec.get("bars") or [])[:3])
    if ct == "line":
        s = spec.get("series") or []
        return f"line: {len(s)} pts ({spec.get('title','')})".strip()
    if ct == "table":
        return f"table: {len(spec.get('rows') or [])} rows"
    return ""


def _shot_list_editor(idea, job):
    """Editable choreography table. Wrapped so no widget quirk can crash the app."""
    from gtm_engine.video import set_shot_list
    from gtm_engine.video.assembler import start_reassemble
    with st.expander(f"🎬 Shot list — {len(job.shot_list)} shots (edit & re-cut, free)",
                     expanded=False):
        st.caption("Each row is a shot cut to your script. **Visual** can be: `presenter` (you), "
                   "`screenshot` (your upload — set the media #), `chart` (auto data-viz built from "
                   "the numbers in your script — the default proof visual), `stock` (free Pexels — "
                   "set the search), `generate` (cheap AI clip via fal.ai ~7–15¢), or `card` "
                   "(branded text). Then **Save & re-cut** — it reuses your cached take, so editing "
                   "costs **no HeyGen credits**. (Chart data is generated from your script; use "
                   "**Re-choreograph** to rebuild it.)")
        rows = [{"spoken": s.get("spoken", ""), "seconds": float(s.get("seconds", 3) or 3),
                 "visual": s.get("visual", "presenter"),
                 "media #": (s.get("media_index") if s.get("media_index") is not None else -1),
                 "stock search": s.get("stock_query", ""),
                 "data": _spec_summary(s.get("data_spec")),
                 "caption": s.get("caption", "")} for s in job.shot_list]
        edited = rows
        try:
            edited = st.data_editor(rows, key=f"shots_{idea.id}",
                                    use_container_width=True, hide_index=True)
        except Exception:
            for r in rows:      # read-only fallback if the editor widget isn't available
                st.markdown(f"- **{r['visual']}** · {r['seconds']}s — _{r['spoken']}_"
                            + (f" · 📷#{r['media #']}" if r['visual'] == 'screenshot' else "")
                            + (f" · 📊 {r['data']}" if r['visual'] == 'chart' and r.get('data') else "")
                            + (f" · 🔎 {r['stock search']}" if r['visual'] == 'stock' else ""))
            st.caption("(Editing table unavailable here — use **Re-choreograph** to regenerate.)")
        b1, b2 = st.columns(2)
        with b1:
            if st.button("Save & re-cut (free)", key=f"shotsave_{idea.id}", use_container_width=True):
                new = []
                for idx, r in enumerate(edited):
                    try:
                        mnum = int(r.get("media #", -1))
                    except (TypeError, ValueError):
                        mnum = -1
                    vis = r.get("visual", "presenter")
                    # Preserve the chart's data_spec positionally (the table can't edit the
                    # nested numbers; Re-choreograph rebuilds them from the script).
                    spec = None
                    if vis == "chart" and idx < len(job.shot_list):
                        spec = job.shot_list[idx].get("data_spec")
                    new.append({"spoken": r.get("spoken", ""), "seconds": float(r.get("seconds", 3) or 3),
                                "role": "", "visual": vis, "stock_query": r.get("stock search", "") or "",
                                "media_index": (mnum if (vis == "screenshot" and mnum >= 0) else None),
                                "data_spec": spec,
                                "caption": r.get("caption", "") or ""})
                set_shot_list(job.id, new)
                start_reassemble(job.id)
                st.rerun()
        with b2:
            if st.button("↻ Re-choreograph from script", key=f"shotredo_{idea.id}",
                         use_container_width=True):
                set_shot_list(job.id, [])
                start_reassemble(job.id)
                st.rerun()


def _produce_review_panel(idea):
    """PRODUCED-stage wizard: script → approve → record → transpose → review."""
    from gtm_engine.video import (
        VideoJobStore, create_job_from_brief, render_job, apply_revision,
        approve_script, resolve_audio_take,
    )
    from gtm_engine.avatar import AvatarConfigStore

    store = VideoJobStore()
    job = store.get_for_idea(idea.id)

    # Keep the panel open while a render is in flight or a reel is ready to review,
    # so a rerun (e.g. checking progress) doesn't collapse it out from under you.
    from gtm_engine.video.assembler import is_running as _bg_running
    _open = bool(job and (job.status in ("rendering", "ready") or _bg_running(job.id)))
    with st.expander("🎬 Video", expanded=_open):
        if not job:
            st.caption("This card has no script yet.")
            if st.button("Create video job", key=f"vjmk_{idea.id}", use_container_width=True):
                if create_job_from_brief(idea.id):
                    st.rerun()
                else:
                    st.error("No script found for this card. Move it back to APPROVED and click "
                             "**Producer Brief** first (needs ANTHROPIC_API_KEY in Secrets).")
            return

        cfg = AvatarConfigStore().load()
        is_transfer = job.engine == "transfer"

        status_colors = {
            "ready": C["green"], "rendering": C["gold"], "queued": C["primary"],
            "failed": C["hot"], "needs_provider": C["gold"], "needs_input": C["gold"],
            "approved": C["green"],
        }
        sc = status_colors.get(job.status, C["muted"])
        engine_label = "performance transfer" if is_transfer else "audio-drive"
        st.markdown(
            f"<span style='color:{sc};font-size:0.75rem;font-weight:600;'>● {job.status.replace('_',' ')}</span>"
            f"<span style='color:{C['muted']};font-size:0.7rem;'> · {engine_label}</span>",
            unsafe_allow_html=True,
        )

        # ── Step 1: Script & production (full breakdown + refine loop) ──
        from gtm_engine.producer import ProducerBriefLibrary, generate_producer_brief
        st.markdown(f"<span style='color:{C['muted']};font-size:0.7rem;'>1 · SCRIPT & PRODUCTION</span>",
                    unsafe_allow_html=True)
        brief = ProducerBriefLibrary().get_for_idea(idea.id)
        if brief and brief.full_brief_md:
            with st.expander("Full script + shot breakdown", expanded=not job.script_approved):
                st.markdown(brief.full_brief_md)
        else:
            st.markdown(f"**Hook:** {job.hook_text or '_—_'}")
            st.markdown(f"**Bookend:** {job.bookend_text or '_—_'}")
        for qi in job.qa_issues:
            st.markdown(f"<span style='color:{C['gold']};font-size:0.72rem;'>⚠ {qi}</span>",
                        unsafe_allow_html=True)

        # ── Edit the exact spoken script (verbatim override) ──
        from gtm_engine.video import update_job_production as _ujp
        _default_script = job.script_override or (brief.spoken_script if brief else "") or job.spoken_script
        with st.expander("✍️ Edit the exact script (spoken verbatim)",
                         expanded=bool(job.script_override)):
            st.caption("Hand-edit the words your presenter says. New line = a pause between "
                       "thoughts. This overrides the generated script and is used for the render.")
            _edited = st.text_area("Spoken script", value=_default_script, height=180,
                                   key=f"scr_{idea.id}", label_visibility="collapsed")
            sc1, sc2 = st.columns(2)
            with sc1:
                if st.button("Save script", key=f"scrsave_{idea.id}", use_container_width=True):
                    _ujp(job.id, script_override=_edited.strip())
                    st.success("Script saved — used on the next assemble."); st.rerun()
            with sc2:
                if job.script_override and st.button("↺ Revert to generated", key=f"scrrev_{idea.id}",
                                                     use_container_width=True):
                    _ujp(job.id, script_override=""); st.rerun()

        # ── 5-point DNA check (advisory — flags, never blocks) ──
        from gtm_engine.hooks import evaluate_dna
        full_script = (brief.spoken_script if brief else job.spoken_script) or job.spoken_script
        dna = evaluate_dna(job.hook_text, job.bookend_text, full_script, idea.product or "")
        with st.expander("Content check (hook · problem · payoff · subtle sell · soft CTA)",
                         expanded=False):
            for c in dna:
                col = C["green"] if c["ok"] else C["gold"]
                mark = "✓" if c["ok"] else "•"
                st.markdown(f"<span style='color:{col};font-size:0.78rem;'>{mark} "
                            f"<strong>{c['label']}</strong> — {c['note']}</span>",
                            unsafe_allow_html=True)
            weak = sum(1 for c in dna if not c["ok"])
            if weak:
                st.caption(f"{weak} thing(s) could be stronger. Fix with a refine note, or approve "
                           "anyway — this is a guide, not a gate.")

        if not job.script_approved:
            from gtm_engine.video import update_job_production, regenerate_script
            from gtm_engine.casting import CastingStore
            from gtm_engine.hooks import list_hooks, TONES, ROTATE
            envs = CastingStore().list_environments()

            # ── Direction: hook · tone · passion ──
            st.markdown("**🎬 Direction (this reel)**")
            hook_opts = [ROTATE] + [h["id"] for h in list_hooks()]
            hook_names = {ROTATE: "Rotate / surprise me",
                          **{h["id"]: h["name"] for h in list_hooks()}}
            hi = hook_opts.index(job.hook_type) if job.hook_type in hook_opts else 0
            hook_type = st.selectbox("Hook style", hook_opts, index=hi,
                                     format_func=lambda x: hook_names.get(x, x), key=f"hk_{idea.id}")
            # show the archetype's example as a nudge
            for h in list_hooks():
                if h["id"] == hook_type:
                    st.caption(f"e.g. \"{h['example']}\" — {h['what']}")
            own_hook = st.text_input("…or write your own hook (used verbatim)",
                                     value=job.own_hook, key=f"own_{idea.id}",
                                     placeholder="type the exact opening line you want")
            dc1, dc2 = st.columns(2)
            with dc1:
                ti = TONES.index(job.tone) if job.tone in TONES else 0
                tone = st.selectbox("Tone", TONES, index=ti, key=f"tn_{idea.id}")
            with dc2:
                passion = st.slider("Passion / energy", 0.0, 1.0, float(job.passion), 0.05,
                                    key=f"ps_{idea.id}", help="0 = calm & considered, 1 = fired-up")

            # ── Production (motion · environment · camera) ──
            with st.expander("🎥 Production (motion · environment · camera)", expanded=False):
                motion = st.text_input("Cinematic / avatar motion", value=job.motion_prompt,
                                       key=f"mot_{idea.id}",
                                       placeholder="'leans in, open hand, warm'")
                env_choices = [None] + [e.id for e in envs]
                env_labels = {e.id: e.name for e in envs}
                cur_env = job.environment_id if job.environment_id in [e.id for e in envs] else None
                env_pick = st.selectbox(
                    "Environment / look start-point", env_choices,
                    index=env_choices.index(cur_env) if cur_env in env_choices else 0,
                    format_func=lambda i: "(character default)" if i is None else env_labels.get(i, "?"),
                    key=f"env_{idea.id}")
                camera = st.text_input("Camera direction", value=job.camera_note, key=f"cam_{idea.id}",
                                       placeholder="'slow push-in on the hook' (used in the edit)")
                cine_prompt = st.text_area(
                    "🎬 Cinematic scene (the middle cutaway — what you're doing on screen)",
                    value=job.cinematic_prompt, key=f"cine_p_{idea.id}", height=68,
                    placeholder="e.g. 'sitting at a desk reviewing the ATLAS dashboard, calm, "
                                "minimal camera movement' — leave blank to use the beat's default")

            # ── Look override (from the character's Look Library) ──
            _char = CastingStore().get_default_character()
            char_looks = CastingStore().list_looks(_char.id) if (_char and _char.id) else []
            look_pick = 0  # 0 = Auto (let the tool cast the best look)
            if char_looks:
                look_choices = [0] + [lk.id for lk in char_looks]
                look_names = {lk.id: (lk.name or "Look") for lk in char_looks}
                cur_look = job.look_id if job.look_id in [lk.id for lk in char_looks] else 0
                with st.expander("👗 Look (auto-cast — override if you want)", expanded=False):
                    look_pick = st.selectbox(
                        "Look for this reel", look_choices,
                        index=look_choices.index(cur_look) if cur_look in look_choices else 0,
                        format_func=lambda i: "Auto — best fit for this reel" if i == 0
                            else look_names.get(i, "?"), key=f"look_{idea.id}")
                    if job.look_id:
                        _lk = CastingStore().get_look(job.look_id)
                        if _lk:
                            st.caption(f"Currently cast: **{_lk.name or 'Look'}** — "
                                       f"{_lk.description or ''}")

            refine = st.text_area(
                "Refine (free text) — iterate until it's sharp",
                key=f"refine_{idea.id}", height=68,
                placeholder="e.g. 'sharper hook with a real number', 'make the sell subtler', "
                            "'more contrarian', 'less corporate'",
            )

            def _save():
                update_job_production(job.id, motion_prompt=motion, environment_id=env_pick,
                                      camera_note=camera, hook_type=hook_type, tone=tone,
                                      passion=passion, own_hook=own_hook,
                                      look_id=(look_pick if char_looks else None),
                                      cinematic_prompt=cine_prompt)

            # ── Auto-sharpen: Claude reviews + rewrites until the DNA check passes ──
            if st.button("✨ Auto-sharpen (Claude reviews & rewrites until it passes)",
                         key=f"sharp_{idea.id}", use_container_width=True):
                from gtm_engine.video import auto_sharpen
                _save()
                with st.spinner("Claude is reviewing and sharpening the script…"):
                    _, rounds = auto_sharpen(job.id)
                passed = bool(rounds and rounds[-1]["fixed"])
                fixed_labels = sorted({lbl for rd in rounds for lbl in rd["weak_before"]})
                if passed and not fixed_labels:
                    st.success("Already passed the content check — no changes needed.")
                elif passed:
                    st.success(f"Sharpened in {len(rounds)} round(s). Fixed: "
                               + ", ".join(fixed_labels))
                else:
                    st.info(f"Improved over {len(rounds)} round(s); a couple of points are "
                            "judgment calls — review and approve, or refine further.")
                st.rerun()

            rc1, rc2, rc3 = st.columns(3)
            with rc1:
                if st.button("Save", key=f"savdir_{idea.id}", use_container_width=True):
                    _save(); st.rerun()
            with rc2:
                if st.button("↻ Regenerate", key=f"refb_{idea.id}", use_container_width=True):
                    _save()
                    with st.spinner("Rewriting to your direction..."):
                        regenerate_script(job.id, refinement=refine.strip())
                    st.rerun()
            with rc3:
                if st.button("✓ Approve", key=f"vjscr_{idea.id}", use_container_width=True):
                    _save(); approve_script(job.id); st.rerun()
            st.caption("Don't like it? Change the hook style (or write your own), dial the tone/energy, "
                       "or type a refine note — then **Regenerate**. Approve when it's yours.")
            return  # gate: nothing else until the script is locked
        st.markdown(f"<span style='color:{C['green']};font-size:0.72rem;'>✓ script approved</span>",
                    unsafe_allow_html=True)

        # ── Step 2: Produce the video ──
        from gtm_engine.video import attach_finished_video
        from gtm_engine.casting import CastingStore
        _ch = CastingStore().get_default_character()
        automated = bool(_ch and (_ch.template_id or _ch.image_key))

        # Lead with the full-reel auto-assembler (the hands-off path).
        st.markdown(f"<span style='color:{C['muted']};font-size:0.7rem;'>2 · BUILD THE FULL REEL "
                    f"(hands-off)</span>", unsafe_allow_html=True)
        _auto_assemble_ui(idea, job)

        # Alternatives: single-avatar render, or make it by hand in HeyGen.
        with st.expander("Alternatives — one avatar clip, or make it by hand in HeyGen"):
            if automated:
                how = "your HeyGen template" if (_ch and _ch.template_id) else "Avatar IV"
                st.caption(f"Just the presenter clip (hook + bookend), rendered via {how}.")
                lbl = "Generate avatar clip only" if not job.video_path else "Re-generate avatar clip"
                if st.button(lbl, key=f"vjr_{idea.id}", use_container_width=True):
                    with st.spinner("Generating with your avatar..."):
                        render_job(job.id)
                        st.rerun()
                if job.status == "failed" and job.error:
                    st.error(f"Render failed: {job.error}")
            st.markdown("**Make it by hand in HeyGen (full production package)**")
            _heygen_handoff(idea, job)

        # ── Upload the finished video (always available) ──
        st.markdown(f"<span style='color:{C['muted']};font-size:0.7rem;'>3 · UPLOAD THE FINISHED VIDEO</span>",
                    unsafe_allow_html=True)
        with st.container():
            fin = st.file_uploader("Drop the finished HeyGen video (mp4/mov)",
                                   type=["mp4", "mov", "webm"], key=f"fin_{idea.id}")
            if fin is not None and st.button("Attach finished video", key=f"finb_{idea.id}",
                                             use_container_width=True):
                attach_finished_video(job.id, fin.getbuffer(), fin.name)
                from gtm_engine.persistence import backup_quietly
                backup_quietly()
                st.success("Video attached.")
                st.rerun()

        # ── Other generation options (advanced) ──
        with st.expander("Other generation options (advanced)"):
            _api_generate_controls(idea, job, cfg, is_transfer, render_job, resolve_audio_take)

        # ── Step 4: Result + review ──
        if job.status == "ready" and job.video_path and Path(job.video_path).exists():
            st.markdown(f"<span style='color:{C['muted']};font-size:0.7rem;'>4 · REVIEW</span>",
                        unsafe_allow_html=True)
            if job.video_path.lower().endswith((".png", ".jpg", ".jpeg")):
                st.image(job.video_path, caption="Preview")
            else:
                st.video(job.video_path)

            # Say plainly which voice this is — the free draft uses a STAND-IN AI
            # voice at preview quality; your real cloned voice + full audio quality
            # only appear in the paid HeyGen render.
            _is_draft = False
            try:
                _is_draft = bool((_json.loads(job.assembly_json or "{}") or {})
                                 .get("settings", {}).get("draft"))
            except Exception:
                _is_draft = False
            if _is_draft:
                st.warning("🔊 **This is the free draft — a stand-in AI voice at preview "
                           "quality, not your cloned voice.** Judge the *words, pacing, length "
                           "and visuals* here — not the sound. Your real voice and full audio "
                           "quality come only from the paid **Auto-assemble** render above.")
            else:
                st.caption("🔊 Your cloned voice · full audio quality (paid render).")

            # ── Gemini watches the finished reel (video-native QA) ──
            from gtm_engine.config import GOOGLE_API_KEY
            if GOOGLE_API_KEY and not job.video_path.lower().endswith((".png", ".jpg", ".jpeg")):
                if st.button("🔍 QA this reel (Gemini watches it)", key=f"vqa_{idea.id}",
                             use_container_width=True):
                    from gtm_engine.utils.media import qa_video
                    # Give Gemini the FACTS so it can verify, not just vibe-check.
                    _facts = [f"Product: {idea.product}"] if idea.product else []
                    if _is_draft:
                        _facts.append("This is a DRAFT with a STAND-IN AI voice — do NOT judge "
                                      "voice timbre or audio fidelity; assess words, pacing, "
                                      "length and visuals only")
                    if job.hook_text:
                        _facts.append(f"Intended hook: {job.hook_text}")
                    try:
                        from gtm_engine.video.assembler import _probe_duration
                        _d = _probe_duration(Path(job.video_path))
                        if _d:
                            _facts.append(f"Duration is {_d:.0f}s (target 20-32s)")
                    except Exception:
                        pass
                    if job.shot_list:
                        from collections import Counter as _Ctr
                        _mix = _Ctr(s.get("visual") for s in job.shot_list)
                        _facts.append("Shot plan: " + ", ".join(f"{n}×{v}" for v, n in _mix.items()))
                    ctx = ". ".join(_facts)
                    with st.spinner("Gemini is watching the reel…"):
                        verdict = qa_video(job.video_path, context=ctx)
                    if not verdict:
                        st.warning("Couldn't complete video QA (check the Google key / try again).")
                    else:
                        from gtm_engine.video.assembler import save_qa
                        save_qa(job.id, verdict)      # so a revision can reference it
                        sc = verdict.get("score")
                        col = C["green"] if (sc or 0) >= 75 else (C["gold"] if (sc or 0) >= 55 else C["hot"])
                        st.markdown(f"<span style='color:{col};font-weight:600;'>Score {sc}/100</span> — "
                                    f"{verdict.get('verdict','')}", unsafe_allow_html=True)
                        for iss in verdict.get("issues", []):
                            sev = iss.get("severity", "low")
                            ic = {"high": C["hot"], "medium": C["gold"]}.get(sev, C["muted"])
                            st.markdown(f"<span style='color:{ic};font-size:0.8rem;'>● "
                                        f"<strong>{iss.get('area','')}</strong> — {iss.get('note','')}</span>",
                                        unsafe_allow_html=True)
                        if verdict.get("keep"):
                            st.caption("Keep: " + verdict["keep"])

            # Whether Gemini QA has been stored on this reel.
            import json as _json2
            _has_qa = False
            try:
                _has_qa = bool((_json2.loads(job.assembly_json or "{}") or {}).get("qa"))
            except Exception:
                _has_qa = False

            from gtm_engine.video import revise_from_notes
            from gtm_engine.video.assembler import start_reassemble

            note = st.text_area(
                "Anything to add? (optional — Gemini's feedback is applied either way)",
                key=f"vjn2_{idea.id}", height=60,
                placeholder="e.g. 'punchier hook, keep the drawdown chart longer'")

            # ── One button: say yes, sort it all out ──────────────────────────
            _yes_label = ("✅ Yes — apply Gemini's fixes & rebuild" if _has_qa
                          else "✅ Apply my note & rebuild")
            if st.button(_yes_label, key=f"vjfix_{idea.id}", use_container_width=True,
                         type="primary", disabled=not (_has_qa or note.strip())):
                with st.spinner("Claude is applying the feedback to the script + direction…"):
                    revise_from_notes(job.id, notes=note.strip(), use_qa=_has_qa)
                start_reassemble(job.id)   # rebuilds the whole reel in your voice
                from gtm_engine.persistence import backup_quietly
                backup_quietly()
                st.rerun()
            st.caption("Rewrites the **script + direction** from Gemini's QA (and your note), then "
                       "rebuilds the *whole* reel. Audio is now laid back untouched (no fuzz/joins) "
                       "and the delivery is paced to breathe.")
        return


def _api_generate_controls(idea, job, cfg, is_transfer, render_job, resolve_audio_take):
    """Optional: auto-generate the avatar clip via the API (photo Avatar IV /
    classic / simulation). The primary path is the HeyGen handoff above."""
    st.caption("Renders the avatar clip via the API. Works with an Avatar IV photo "
               "or a classic avatar — not a trained multi-look avatar.")
    wants_upload = is_transfer or cfg.mode in ("record", "hybrid")
    take_file = None
    if wants_upload:
        take_types = (["mp4", "mov", "webm"] if is_transfer
                      else ["mp3", "wav", "mp4", "mov", "webm", "m4a"])
        take_file = st.file_uploader("Your take (video/audio)", type=take_types,
                                     key=f"vjtake_{idea.id}")
    label = "Transpose onto my character" if is_transfer else "Generate via API"
    # The common av4 case (no upload) renders on a background thread so it
    # survives the phone disconnecting; upload-driven modes stay inline.
    if not wants_upload:
        if st.button(label, key=f"vjr_{idea.id}", use_container_width=True):
            from gtm_engine.video.assembler import start_single_render
            start_single_render(job.id)
            st.rerun()
        if job.status == "failed" and job.error:
            st.error(f"Render failed: {job.error}")
        return
    if st.button(label, key=f"vjr_{idea.id}", use_container_width=True):
        audio_path = driving_path = None
        fail = None
        if take_file is not None:
            updir = OUTPUT_DIR / "uploads"
            updir.mkdir(parents=True, exist_ok=True)
            raw = updir / f"idea_{idea.id}_{take_file.name}"
            raw.write_bytes(take_file.getbuffer())
            if is_transfer:
                driving_path = raw
            else:
                with st.spinner("Pulling audio from your take..."):
                    audio_path = resolve_audio_take(raw)
                if audio_path is None:
                    fail = "Couldn't read audio from that file."
        elif is_transfer:
            fail = "Record and upload your take first — transfer needs your performance."
        if fail:
            st.error(fail)
        else:
            with st.spinner("Producing (dry-run if no key)..."):
                render_job(job.id, audio_path=audio_path, driving_video_path=driving_path)
                st.rerun()
    if job.status == "failed" and job.error:
        st.error(f"Render failed: {job.error}")
    if job.status in ("needs_provider", "needs_input") and job.dry_run_request:
        st.code(job.dry_run_request, language="json")


def _idea_demo_setup(idea):
    """Tag the demo type + the data to an IDEA, BEFORE the script is written.
    The script is then built from this data, and the reel inherits it."""
    from gtm_engine.video.modes import MODES
    from gtm_engine.ideas import IdeaBank
    with st.expander("🎬 Demo setup — what this reel shows (set before the script)",
                     expanded=False):
        st.caption("Tag this idea with what it demonstrates and the data behind it. The **script "
                   "is written from this**, and the reel inherits it — so you set it once, here.")
        _keys = list(MODES)
        _cur = idea.content_mode if idea.content_mode in MODES else "insight"
        _pick = st.radio("Demo type", _keys, index=_keys.index(_cur),
                         format_func=lambda k: f"{MODES[k]['icon']} {MODES[k]['label']}",
                         key=f"imode_{idea.id}", label_visibility="collapsed")
        st.caption(MODES[_pick]["blurb"])
        if _pick != _cur:
            IdeaBank().set_demo_setup(idea.id, content_mode=_pick)
            st.rerun()
        if MODES[_pick].get("charts"):
            if idea.data_source_id:
                st.success("✓ Data tagged to this idea — the script will be built from it.")
                if st.button("✕ Clear data", key=f"idataclr_{idea.id}"):
                    IdeaBank().set_demo_setup(idea.id, clear_data=True); st.rerun()
            else:
                _df = st.file_uploader("Data behind this reel (CSV / XLSX)",
                                       type=["csv", "tsv", "xlsx", "xlsm"],
                                       key=f"idata_{idea.id}", accept_multiple_files=False)
                if _df and st.button("📎 Tag this data to the idea", key=f"idatago_{idea.id}",
                                     use_container_width=True):
                    from gtm_engine.video.data_insight import attach_data_to_idea
                    dd = OUTPUT_DIR / "uploads" / f"idea_{idea.id}_data"
                    dd.mkdir(parents=True, exist_ok=True)
                    fp = dd / _df.name
                    fp.write_bytes(_df.getbuffer())
                    with st.spinner("Reading your data…"):
                        _sid, _msg = attach_data_to_idea(idea.id, str(fp), name=_df.name)
                    (st.success if _sid else st.error)(_msg)
                    from gtm_engine.persistence import backup_quietly
                    backup_quietly()
                    st.rerun()


def _render_kanban_card(idea, status):
    """One content card + its stage-appropriate actions (full width)."""
    pillar_tag = ""
    for t in (idea.tags or []):
        if t not in ("standalone", "hook", "tension", "pivot", "proof", "bookend"):
            pillar_tag = t
            break
    product_badge = (f"<span style='color:{C['primary']};font-size:0.72rem;'>{idea.product}</span> "
                     if idea.product else "")
    st.markdown(
        f"<div style='background:{C['card']};padding:12px 14px;border-radius:8px;"
        f"margin-bottom:6px;border-left:3px solid {C['primary']};'>"
        f"{product_badge}"
        f"<strong style='font-size:0.95rem;'>{idea.title}</strong><br>"
        f"<span style='color:{C['gold']};font-size:0.82rem;font-style:italic;'>{idea.hook}</span><br>"
        f"<span style='color:{C['muted']};font-size:0.7rem;'>"
        f"{pillar_tag} · {idea.segment_type} · e{idea.edginess_score}</span></div>",
        unsafe_allow_html=True,
    )
    if status == "idea_draft":
        if st.button("Approve", key=f"app_{idea.id}", use_container_width=True):
            from gtm_engine.approval import approve_idea
            approve_idea(idea.id); st.rerun()
    elif status == "idea_approved":
        _idea_demo_setup(idea)
        if st.button("Producer Brief", key=f"pb_{idea.id}", use_container_width=True):
            with st.spinner("Writing the script (Claude)..."):
                from gtm_engine.producer import generate_producer_brief
                from gtm_engine.video import create_job_from_brief
                from gtm_engine.approval import mark_content_generated
                brief = generate_producer_brief(idea.id)
            if not brief:
                st.error("Script generation failed — check ANTHROPIC_API_KEY in Secrets "
                         "(and billing). The card was not moved.")
            else:
                create_job_from_brief(idea.id)
                mark_content_generated(idea.id)
                st.rerun()
    elif status == "content_generated":
        _produce_review_panel(idea)
        if st.button("Approve", key=f"cappr_{idea.id}", use_container_width=True):
            from gtm_engine.approval import approve_content
            approve_content(idea.id); st.rerun()
    elif status == "content_approved":
        _video_view(idea)
        if st.button("Schedule", key=f"sched_{idea.id}", use_container_width=True):
            from gtm_engine.approval import schedule_deployment
            schedule_deployment(idea.id); st.rerun()
    elif status == "deployment_scheduled":
        _video_view(idea)


# ═══════════════════════════════════════════════════════════════════════════
#  CREATE TAB (Kanban Board)
# ═══════════════════════════════════════════════════════════════════════════

def _render_create():
    from gtm_engine.ideas import IdeaBank
    from gtm_engine.approval import get_pipeline_counts
    from gtm_engine.utils.ai_client import connection_status

    bank = IdeaBank()
    counts = get_pipeline_counts()

    conn = connection_status()
    if not conn["anthropic"]:
        st.warning("⚠ No Anthropic key detected — generating ideas and scripts (Producer Brief) "
                   "won't work. Add `ANTHROPIC_API_KEY` in Secrets, then reload. "
                   "Check it under **Settings → Connections**.")

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

    # ── Pipeline: one stage at a time, full width (readable on phone + laptop) ──
    stages = [
        ("idea_draft", "Ideas", "Draft ideas for review"),
        ("idea_approved", "Approved", "Ready for a producer brief"),
        ("content_generated", "Produced", "Script written — direct, review, render"),
        ("content_approved", "Reviewed", "Approved — ready to schedule"),
        ("deployment_scheduled", "Scheduled", "Queued for deployment"),
    ]
    counts = {s: len(bank.list_all(status=s, limit=200)) for s, _, _ in stages}
    labels = [f"{lbl} ({counts[s]})" for s, lbl, _ in stages]

    # Default to the first non-empty stage so you land where there's work.
    default_idx = next((i for i, (s, _, _) in enumerate(stages) if counts[s]), 0)
    sel = st.radio("Pipeline stage", labels, index=default_idx, horizontal=True,
                   label_visibility="collapsed")
    idx = labels.index(sel)
    status, label, desc = stages[idx]
    st.caption(f"**{label}** — {desc}")

    ideas = bank.list_all(status=status, limit=50)
    if not ideas:
        st.info(f"Nothing in {label} yet.")
    for idea in ideas:
        _render_kanban_card(idea, status)

    # ── Side panels (slide-out style via expanders) ──
    st.markdown("---")
    col_dv, col_sl, col_cl = st.columns(3)

    with col_dv:
        with st.expander("📊 Data Vault — real data your scripts cite"):
            from gtm_engine.data_vault import DataVault, DataSource
            from gtm_engine.persistence import backup_quietly
            vault = DataVault()
            sources = vault.list_all()
            st.caption("When a script says 'NEEDS DATA', add the real thing here — "
                       "then it cites your numbers, not a placeholder.")
            for src in sources[:8]:
                st.markdown(f"• **{src.name}** ({src.source_type})")
            new_name = st.text_input("Name", placeholder="e.g. ATLAS 52-week performance log",
                                     key="dv_name")
            new_type = st.selectbox("Type",
                                    ["dataset", "benchmark", "quote", "metric", "document", "url"],
                                    key="dv_type")
            new_content = st.text_area("The actual data (paste text / CSV / numbers)", height=90,
                                       key="dv_content", placeholder="Paste the real data...")
            up = st.file_uploader("…or upload a file (CSV / JSON / TXT / MD)",
                                  type=["csv", "json", "txt", "md", "tsv"], key="dv_file")
            file_text = ""
            if up is not None:
                try:
                    file_text = up.getvalue().decode("utf-8", errors="replace")
                    st.caption(f"📎 {up.name} · {len(file_text):,} chars ready to save.")
                    if not new_name:
                        new_name = Path(up.name).stem
                except Exception:
                    st.warning("Couldn't read that file as text.")
            content_to_save = (new_content.strip() or file_text.strip())
            if st.button("Save to Data Vault", key="dv_save",
                         disabled=not (new_name and content_to_save)):
                vault.create(DataSource(name=new_name, source_type=new_type,
                                        content=content_to_save,
                                        source_url=(up.name if up is not None else "")))
                backup_quietly()
                st.success(f"Added '{new_name}'. Regenerate a script and it'll cite these numbers.")
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
    tabs = st.tabs(["Connections", "Brand Standards", "Cast & Voice",
                    "Core-Five Spec", "Intelligence Feed"])

    # ── Connections (key status for every service) ──
    with tabs[0]:
        st.markdown("### Connections")
        st.caption("What each key powers. Add them in Manage app → Settings → Secrets.")
        from gtm_engine.utils.ai_client import connection_status, test_anthropic
        status = connection_status()
        rows = [
            ("anthropic", "Anthropic (Claude)", "writes scripts, strategy & ideas", "ANTHROPIC_API_KEY"),
            ("heygen", "HeyGen", "renders the avatar video", "HEYGEN_API_KEY"),
            ("google", "Google (Gemini)", "images, draft voice & QA", "GOOGLE_API_KEY"),
            ("pexels", "Pexels (free stock)", "auto b-roll for the middle — free", "PEXELS_API_KEY"),
            ("fal", "fal.ai (cheap AI b-roll)", "generate a clip for a beat — ~7–15¢ each", "FAL_KEY"),
            ("supabase", "Supabase (backup)", "saves your setup so it survives redeploys",
             "SUPABASE_URL + SUPABASE_KEY"),
            ("runway", "Runway (advanced)", "performance transfer", "RUNWAY_API_KEY"),
        ]
        for key, label, what, envname in rows:
            ok = status.get(key)
            dot = C["green"] if ok else C["hot"]
            state = "connected" if ok else "not set"
            st.markdown(
                f"<div style='padding:8px 0;'>"
                f"<span style='color:{dot};'>●</span> <strong>{label}</strong> — "
                f"<span style='color:{C['muted']};'>{what}</span><br>"
                f"<span style='color:{dot};font-size:0.8rem;'>{state}</span> "
                f"<span style='color:{C['muted']};font-size:0.75rem;'>· {envname}</span></div>",
                unsafe_allow_html=True,
            )
        st.markdown("💳 **[Top up HeyGen API credits ↗](https://app.heygen.com/settings/subscriptions)** "
                    "— cinematic (Seedance) and avatar renders spend *API* credits, a separate "
                    "pool from the HeyGen app. If a render says *insufficient_credit*, top up here.")
        st.markdown("")
        if st.button("Test Anthropic (live call)", key="test_anthropic"):
            with st.spinner("Pinging Claude..."):
                ok, msg = test_anthropic()
            if ok:
                st.success(f"Anthropic works ✓ (replied: {msg})")
            else:
                st.error(f"Anthropic call failed: {msg}")
        st.caption("A key showing 'connected' only means it's present. Use Test Anthropic to "
                   "confirm it actually works (right key + billing enabled).")

        st.markdown("---")
        st.markdown("**Durable backup**")
        from gtm_engine.persistence import is_configured as _sb_ok, backup, restore
        if not _sb_ok():
            st.caption("Add SUPABASE_URL + SUPABASE_KEY (service_role) in Secrets so your setup, "
                       "cast and content survive redeploys. Free — create a project at supabase.com.")
        else:
            bcol1, bcol2 = st.columns(2)
            with bcol1:
                if st.button("Back up now", key="sb_backup"):
                    ok, msg = backup()
                    (st.success if ok else st.error)(msg)
            with bcol2:
                if st.button("Restore now", key="sb_restore"):
                    ok, msg = restore()
                    if ok:
                        st.success(msg + " Reload to see it.")
                    else:
                        st.error(msg)
            st.caption("Auto-backs-up after you load the demo or save a character; auto-restores "
                       "on a fresh deploy. Use these to force it or verify it works.")

    # ── Brand Standards ──
    with tabs[1]:
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
    with tabs[2]:
        st.markdown("### Cast & Voice")
        from gtm_engine.avatar import (
            list_providers, get_provider, AvatarConfig, AvatarConfigStore,
        )
        from gtm_engine.casting import CastingStore, Character, Environment

        cfg_store = AvatarConfigStore()
        cfg = cfg_store.load()
        casting = CastingStore()
        casting.seed_if_empty()

        # ── Provider (HeyGen is the simple default) ──
        provider_ids = [p["id"] for p in list_providers()]
        prov_labels = {p["id"]: p["name"] for p in list_providers()}
        sel_provider = st.selectbox(
            "Video provider", provider_ids,
            index=provider_ids.index(cfg.provider) if cfg.provider in provider_ids else 0,
            format_func=lambda x: prov_labels.get(x, x),
            help="HeyGen = simple text→video talking head (recommended).",
        )
        provider = get_provider(sel_provider)
        key_names = {"heygen": "HEYGEN_API_KEY", "runway": "RUNWAY_API_KEY"}
        if sel_provider == "none":
            st.info("No avatar. Reels use B-roll + voiceover only.")
        elif sel_provider == "mock":
            st.success("Simulation — renders offline previews, no key or spend.")
        elif not provider.is_configured():
            st.warning(f"{prov_labels.get(sel_provider)} selected but no key. Add "
                       f"`{key_names.get(sel_provider,'API_KEY')}` to Secrets, then reload.")
        else:
            st.success(f"{prov_labels.get(sel_provider)} connected.")

        hey_avatars = provider.list_avatars() if (sel_provider == "heygen" and provider.is_configured()) else []
        hey_voices = provider.list_voices() if (sel_provider == "heygen" and provider.is_configured()) else []
        envs = casting.list_environments()
        env_ids = [e.id for e in envs]
        env_labels = {e.id: e.name for e in envs}

        # ── Characters library ──
        st.markdown("#### Characters")
        st.caption("Your cast. Pick who's on camera per reel; the default is used unless you change it.")
        chars = casting.list_characters()
        labels = [f"{c.name}{' ⭐ default' if c.is_default else ''}"
                  f"{'' if c.is_ready() else '  (needs avatar)'}" for c in chars]
        options = list(range(len(chars))) + ["__new__"]
        sel = st.selectbox("Edit", options, format_func=lambda i: "➕ New character" if i == "__new__" else labels[i])
        ch = Character(name="New character", persona="") if sel == "__new__" else chars[sel]

        ch_name = st.text_input("Name", value=ch.name, key="ch_name")
        ch_persona = st.text_area("Persona (who they are, how they come across)", value=ch.persona,
                                  height=68, key="ch_persona")
        ch_cine = st.text_input("Cinematic direction (delivery)", value=ch.cinematic_direction,
                                placeholder="e.g. measured, direct, lean in on the key line", key="ch_cine")

        # Avatar + voice (dropdowns when HeyGen is connected, else text)
        ch_avatar_id, ch_avatar_name = ch.avatar_id, ch.avatar_name
        ch_voice_id, ch_voice_name = ch.voice_id, ch.voice_name
        if hey_avatars:
            a_ids = [""] + [a["id"] for a in hey_avatars]
            a_names = ["(none yet)"] + [a["name"] or a["id"] for a in hey_avatars]
            ai = a_ids.index(ch_avatar_id) if ch_avatar_id in a_ids else 0
            ap = st.selectbox("HeyGen avatar", range(len(a_ids)), index=ai,
                              format_func=lambda i: a_names[i], key="ch_av")
            ch_avatar_id, ch_avatar_name = a_ids[ap], (a_names[ap] if ap else "")
        else:
            ch_avatar_id = st.text_input("HeyGen avatar id", value=ch_avatar_id, key="ch_av_txt")

        # Always allow pasting a HeyGen "Copy ID" — photo avatars with multiple
        # looks (Avatar IV) often don't list cleanly. A pasted id overrides.
        paste_id = st.text_input(
            "…or paste a HeyGen ‘Copy ID’ (from the avatar’s ⋯ menu)", value="",
            key="ch_paste", placeholder="paste the id you copied in HeyGen",
        )
        is_photo = st.checkbox(
            "This is a Photo Avatar (Avatar IV — expressive)",
            value=str(ch_avatar_id).startswith("tp:"), key="ch_isphoto",
            help="Tick for photo avatars / Avatar IV so it renders expressively.",
        )
        if paste_id.strip():
            pid = paste_id.strip()
            pid = pid[3:] if pid.startswith("tp:") else pid
            ch_avatar_id = f"tp:{pid}" if is_photo else pid
            ch_avatar_name = f"{ch_name} (pasted)"
        elif is_photo and ch_avatar_id and not str(ch_avatar_id).startswith("tp:"):
            ch_avatar_id = f"tp:{ch_avatar_id}"
        elif not is_photo and str(ch_avatar_id).startswith("tp:"):
            ch_avatar_id = ch_avatar_id[3:]
        # Guard: the HeyGen avatar dropdown often doesn't list a pasted Avatar IV
        # id, so it resets to "(none)" — don't let that silently wipe a saved id.
        if not ch_avatar_id and ch.avatar_id and not paste_id.strip():
            ch_avatar_id, ch_avatar_name = ch.avatar_id, ch.avatar_name

        # ── HeyGen Template (full automation with YOUR avatar — recommended) ──
        st.markdown("**🚀 HeyGen Template — full automation (recommended)**")
        ch_template_id = st.text_input(
            "HeyGen Template ID", value=ch.template_id, key="ch_tmpl",
            placeholder="paste your HeyGen template id",
            help="Build a template once in HeyGen with your avatar + look + a TEXT variable for "
                 "the script. Paste its id here and the tool auto-generates every reel via the "
                 "API — your full avatar, zero manual work.",
        )
        st.caption("This is the automated path: your trained avatar + styling live in the template; "
                   "the tool fills the script per reel. Set this and you never touch HeyGen per video.")

        # ── Avatar IV (alternative): upload a photo → expressive render ──
        st.markdown("**⭐ Avatar IV (alternative) — upload a photo**")
        if ch.image_key:
            st.caption(f"✓ Avatar IV photo set. Renders expressively from it.")
        if sel != "__new__" and sel_provider == "heygen" and provider.is_configured():
            av4_photo = st.file_uploader("A clear photo of your presenter (jpg/png)",
                                         type=["jpg", "jpeg", "png"], key="ch_av4")
            if av4_photo is not None and st.button("Use this photo as Avatar IV",
                                                   key="ch_av4_btn", use_container_width=True):
                from gtm_engine.avatar import get_provider as _gp
                updir = OUTPUT_DIR / "characters"
                updir.mkdir(parents=True, exist_ok=True)
                pth = updir / f"av4_{av4_photo.name}"
                pth.write_bytes(av4_photo.getbuffer())
                with st.spinner("Uploading photo to HeyGen..."):
                    key = _gp("heygen").upload_image(pth)
                if key:
                    ch.image_key = key
                    casting.save_character(ch)
                    from gtm_engine.persistence import backup_quietly
                    backup_quietly()
                    st.success("Avatar IV photo ready — this character now renders expressively.")
                    st.rerun()
                else:
                    st.error("Photo upload failed — check the HeyGen key.")
        st.caption("Avatar IV animates one photo, interpreting your voice for real expression. "
                   "This is the reliable path — the avatar-id/look fields above are for classic avatars.")

        # ── Look Library (upload a subset of your looks → auto-cast per reel) ──
        if sel != "__new__" and ch.id:
            st.markdown("**👗 Look Library — your wardrobe/settings**")
            st.caption("Upload 5–8 of your favourite looks (a clear photo of each). The tool "
                       "auto-describes each one and picks the best-fit look for every reel — you "
                       "can always override. This is how you get variety without look drift.")
            looks = casting.list_looks(ch.id)
            if looks:
                for lk in looks:
                    lc1, lc2, lc3 = st.columns([1, 4, 1])
                    with lc1:
                        if lk.photo_path and Path(lk.photo_path).exists():
                            st.image(lk.photo_path, width=56)
                        else:
                            st.markdown("🖼️")
                    with lc2:
                        ready = "✓" if lk.image_key else "⚠︎ no HeyGen key"
                        st.markdown(f"**{lk.name or 'Look'}** · {ready}<br>"
                                    f"<span style='color:{C['muted']};font-size:0.8rem;'>"
                                    f"{lk.description or '(no description)'}</span>",
                                    unsafe_allow_html=True)
                    with lc3:
                        if st.button("✕", key=f"look_del_{lk.id}", help="Remove this look"):
                            casting.delete_look(lk.id)
                            from gtm_engine.persistence import backup_quietly
                            backup_quietly()
                            st.rerun()
            new_looks = st.file_uploader(
                "Add looks (you can select several at once)",
                type=["jpg", "jpeg", "png"], accept_multiple_files=True, key="look_up",
            )
            if new_looks and st.button("Add these looks", key="look_add_btn",
                                       use_container_width=True):
                from gtm_engine.avatar import get_provider as _gp
                from gtm_engine.utils.media import describe_look
                from gtm_engine.casting import Look
                from gtm_engine.persistence import backup_quietly
                updir = OUTPUT_DIR / "characters" / f"looks_{ch.id}"
                updir.mkdir(parents=True, exist_ok=True)
                heygen_ready = sel_provider == "heygen" and provider.is_configured()
                added = 0
                with st.spinner(f"Processing {len(new_looks)} look(s)…"):
                    for f in new_looks:
                        pth = updir / f.name
                        pth.write_bytes(f.getbuffer())
                        image_key = ""
                        if heygen_ready:
                            image_key = _gp("heygen").upload_image(pth) or ""
                        desc = describe_look(pth)
                        casting.add_look(Look(
                            character_id=ch.id, name=Path(f.name).stem[:40],
                            description=desc, image_key=image_key, photo_path=str(pth),
                        ))
                        added += 1
                backup_quietly()
                st.success(f"Added {added} look(s). The tool will auto-cast the best one per reel.")
                st.rerun()

        if hey_voices:
            v_ids = [""] + [v["id"] for v in hey_voices]
            v_names = ["(default)"] + [v["name"] or v["id"] for v in hey_voices]
            vi = v_ids.index(ch_voice_id) if ch_voice_id in v_ids else 0
            vp = st.selectbox("Voice", range(len(v_ids)), index=vi,
                              format_func=lambda i: v_names[i], key="ch_vo")
            ch_voice_id, ch_voice_name = v_ids[vp], (v_names[vp] if vp else "")
        else:
            ch_voice_id = st.text_input("Voice id (optional)", value=ch_voice_id, key="ch_vo_txt")
        # Guard: don't let an empty selection wipe a saved voice.
        if not ch_voice_id and ch.voice_id:
            ch_voice_id, ch_voice_name = ch.voice_id, ch.voice_name
        if not ch_voice_id:
            st.caption("⚠️ No voice selected — renders use a default HeyGen voice, not yours. "
                       "Pick your cloned voice above so the reel speaks in your voice.")

        if env_ids:
            cur_env = ch.environment_id if ch.environment_id in env_ids else env_ids[0]
            ep = st.selectbox("Default environment", env_ids,
                              index=env_ids.index(cur_env),
                              format_func=lambda i: env_labels.get(i, "?"), key="ch_env")
        else:
            ep = None
        ch_expr = st.slider("Expressiveness", 0.0, 1.0, float(ch.expressiveness), 0.05, key="ch_expr")
        ch_default = st.checkbox("Make this the default character", value=ch.is_default, key="ch_def")

        # ── Cinematic (Seedance / Avatar Shots) — your twin in motion ──
        st.markdown("**🎬 Cinematic (Seedance) — your digital twin in full-body scenes**")
        st.caption("Casts your *real* avatar into cinematic scenes for the middle beats — full-body "
                   "motion + camera. Runs on your HeyGen key/credits (~60 credits per clip). Paste "
                   "your avatar group id; optionally pick specific looks.")
        ch_group_id = st.text_input("HeyGen avatar group id", value=ch.avatar_group_id,
                                    key="ch_group", placeholder="e.g. 3fd3e9a439eb4f6bac6133ce031bbe2d")
        ch_cine_looks = ch.cinematic_look_ids
        if ch_group_id.strip() and provider.is_configured():
            if st.button("↻ Fetch my looks from this group", key="ch_fetch_looks"):
                looks = provider.list_avatar_looks(ch_group_id.strip())
                if looks:
                    st.session_state["_fetched_looks"] = looks
                    st.success(f"Found {len(looks)} looks.")
                else:
                    st.info("Couldn't list looks (the group id may render fine on its own — "
                            "leave the look ids blank to use the group).")
            fetched = st.session_state.get("_fetched_looks") or []
            if fetched:
                names = {l["id"]: l["name"] for l in fetched}
                picked = st.multiselect("Cinematic looks to use", [l["id"] for l in fetched],
                                        default=[x.strip() for x in ch_cine_looks.split(",") if x.strip()],
                                        format_func=lambda i: names.get(i, i), key="ch_cine_pick")
                ch_cine_looks = ",".join(picked)
        ch_cine_looks = st.text_input("…or paste look ids (comma-separated, optional)",
                                      value=ch_cine_looks, key="ch_cine_ids",
                                      placeholder="leave blank to use the group id")

        b1, b2 = st.columns(2)
        with b1:
            if st.button("Save character", key="ch_save", use_container_width=True):
                casting.save_character(Character(
                    id=None if sel == "__new__" else ch.id, name=ch_name, persona=ch_persona,
                    avatar_id=ch_avatar_id, avatar_name=ch_avatar_name, voice_id=ch_voice_id,
                    voice_name=ch_voice_name, cinematic_direction=ch_cine, expressiveness=ch_expr,
                    environment_id=ep, is_default=ch_default, photo_path=ch.photo_path,
                    image_key=ch.image_key, template_id=ch_template_id,
                    avatar_group_id=ch_group_id.strip(), cinematic_look_ids=ch_cine_looks.strip(),
                ))
                cfg.provider = sel_provider
                cfg_store.save(cfg)
                from gtm_engine.persistence import backup_quietly
                backup_quietly()
                st.success("Character saved.")
                st.rerun()
        with b2:
            if sel != "__new__" and st.button("Delete", key="ch_del", use_container_width=True):
                casting.delete_character(ch.id)
                st.rerun()

        # ── Environments ──
        st.markdown("#### Environments")
        for e in envs:
            st.markdown(
                f"<span style='display:inline-block;width:12px;height:12px;border-radius:3px;"
                f"background:{e.background_value};margin-right:6px;'></span>"
                f"**{e.name}** — <span style='color:{C['muted']};font-size:0.8rem;'>{e.description}</span>",
                unsafe_allow_html=True)
        with st.expander("Add an environment"):
            en = st.text_input("Name", key="env_name")
            ed = st.text_input("Description", key="env_desc")
            ecol = st.color_picker("Background colour", value="#0d1b2a", key="env_col")
            if st.button("Add environment", key="env_add", disabled=not en):
                casting.save_environment(Environment(name=en, description=ed,
                                                     background_type="color", background_value=ecol))
                st.rerun()

        # ── Advanced (record-to-camera / performance transfer) ──
        with st.expander("Advanced — record-to-camera & performance transfer"):
            st.caption("Optional. Leave on HeyGen text→video for the simple workflow.")
            mode_opts = {
                "voice_clone": "Text→video (hands-off, recommended)",
                "record": "Record per video (upload audio take)",
                "hybrid": "Hybrid (text by default, take when you want)",
                "transfer": "Performance transfer (Runway — record to camera)",
            }
            mode = st.radio("Delivery mode", list(mode_opts.keys()),
                            index=list(mode_opts.keys()).index(cfg.mode) if cfg.mode in mode_opts else 0,
                            format_func=lambda x: mode_opts[x])
            aspect = st.selectbox("Aspect ratio", ["9:16", "1:1", "16:9"],
                                  index=["9:16", "1:1", "16:9"].index(cfg.aspect_ratio)
                                  if cfg.aspect_ratio in ["9:16", "1:1", "16:9"] else 0)
            gesture = st.checkbox("Transfer body & hand gestures (Runway)", value=cfg.gesture)
            if st.button("Save engine settings", key="save_engine_cfg"):
                cfg.mode, cfg.aspect_ratio, cfg.gesture = mode, aspect, gesture
                cfg.provider = sel_provider
                cfg_store.save(cfg)
                st.success("Saved.")
                st.rerun()

        st.caption(
            "Simple workflow: pick a video provider (HeyGen), set up your cast (avatar + voice "
            "+ persona + environment), make one the default. Then per reel: approve idea → "
            "generate script (written for delivery) → generate video."
        )

    # ── Core-Five Spec ──
    with tabs[3]:
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
    with tabs[4]:
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
