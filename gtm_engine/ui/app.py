"""Streamlit operator dashboard — ties all layers together.

This is the primary UI for operators. Provides:
- Discovery interview (web version)
- Strategy viewer
- Content queue management
- Deployment controls
- Performance dashboards
- Stage gate interface

Run with: streamlit run gtm_engine/ui/app.py
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import streamlit as st

# Add project root to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from gtm_engine.config import OUTPUT_DIR, CONTENT_QUEUE_DIR, LOGS_DIR
from gtm_engine.discovery.models import GTMBrief
from gtm_engine.utils.file_io import load_json, save_json


def main():
    st.set_page_config(
        page_title="GTM Intelligence Engine",
        page_icon="",
        layout="wide",
    )

    st.title("GTM Intelligence Engine")
    st.caption("Autonomous go-to-market system")

    # Sidebar navigation
    page = st.sidebar.radio(
        "Navigation",
        ["Dashboard", "Discovery", "Strategy", "Content Queue", "Deployment", "Stage Gate"],
    )

    if page == "Dashboard":
        _render_dashboard()
    elif page == "Discovery":
        _render_discovery()
    elif page == "Strategy":
        _render_strategy()
    elif page == "Content Queue":
        _render_content_queue()
    elif page == "Deployment":
        _render_deployment()
    elif page == "Stage Gate":
        _render_stage_gate()


def _render_dashboard():
    """Main dashboard with high-level metrics and status."""
    st.header("Engine Status")

    col1, col2, col3, col4 = st.columns(4)

    # Check what exists
    brief_exists = (OUTPUT_DIR / "gtm_brief.json").exists()
    strategy_exists = (OUTPUT_DIR / "gtm_strategy.json").exists()
    content_count = len(list(CONTENT_QUEUE_DIR.glob("*.json"))) - (
        1 if (CONTENT_QUEUE_DIR / "batch_manifest.json").exists() else 0
    )
    deployment_exists = (OUTPUT_DIR / "deployment_log.json").exists()

    with col1:
        st.metric("GTM Brief", "Ready" if brief_exists else "Not Started")
    with col2:
        st.metric("Strategy", "Generated" if strategy_exists else "Pending")
    with col3:
        st.metric("Content Queue", f"{max(0, content_count)} pieces")
    with col4:
        st.metric("Deployments", "Active" if deployment_exists else "Pending")

    # Recent decisions
    decisions_path = LOGS_DIR / "decisions.jsonl"
    if decisions_path.exists():
        st.subheader("Recent Decisions")
        lines = decisions_path.read_text().strip().split("\n")
        recent = [json.loads(line) for line in lines[-10:]]
        for d in reversed(recent):
            with st.expander(f"{d['category']}: {d['decision']}", expanded=False):
                st.write(f"**Reasoning:** {d['reasoning']}")
                st.caption(d['timestamp'])

    # Quick actions
    st.subheader("Quick Actions")
    col_a, col_b, col_c = st.columns(3)
    with col_a:
        if st.button("Run Discovery Interview", use_container_width=True):
            st.switch_page_or_rerun("Discovery")
    with col_b:
        if st.button("Generate Strategy", disabled=not brief_exists, use_container_width=True):
            st.switch_page_or_rerun("Strategy")
    with col_c:
        if st.button("Generate Content", disabled=not strategy_exists, use_container_width=True):
            st.switch_page_or_rerun("Content Queue")


def _render_discovery():
    """Web-based discovery interview."""
    st.header("Discovery Interview")

    brief_path = OUTPUT_DIR / "gtm_brief.json"

    if brief_path.exists():
        brief_data = load_json(brief_path)
        st.success("GTM Brief already exists. You can review or restart.")

        tab1, tab2 = st.tabs(["View Brief", "Restart Interview"])

        with tab1:
            st.json(brief_data)

        with tab2:
            if st.button("Clear Brief and Restart", type="secondary"):
                brief_path.unlink()
                st.rerun()
        return

    # Interactive interview
    if "interview_brief" not in st.session_state:
        st.session_state.interview_brief = GTMBrief()
        st.session_state.interview_history = []
        st.session_state.current_question = None
        st.session_state.observation = None

    brief = st.session_state.interview_brief

    # Get next question if needed
    if st.session_state.current_question is None:
        with st.spinner("Preparing first question..."):
            try:
                from gtm_engine.discovery.interview import run_interview_step
                response = run_interview_step(brief, None)
                st.session_state.current_question = response.get("question", "")
                st.session_state.observation = response.get("observation", "")
            except Exception as e:
                st.error(f"Error connecting to AI: {e}")
                st.info("Set ANTHROPIC_API_KEY in your .env file to use the interview.")
                return

    # Show observation
    if st.session_state.observation:
        st.info(st.session_state.observation)

    # Show question and collect answer
    st.markdown(f"**{st.session_state.current_question}**")
    answer = st.text_area("Your answer:", key=f"answer_{len(st.session_state.interview_history)}")

    col1, col2 = st.columns([1, 5])
    with col1:
        submit = st.button("Submit", type="primary")
    with col2:
        finish = st.button("Finish Interview")

    if submit and answer.strip():
        st.session_state.interview_history.append({
            "question": st.session_state.current_question,
            "answer": answer.strip(),
        })

        with st.spinner("Processing..."):
            try:
                from gtm_engine.discovery.interview import run_interview_step, apply_brief_updates
                response = run_interview_step(brief, answer.strip())

                if response.get("brief_updates"):
                    st.session_state.interview_brief = apply_brief_updates(brief, response["brief_updates"])

                if response.get("interview_complete"):
                    save_json(st.session_state.interview_brief.model_dump(), brief_path)
                    st.success("Interview complete! Brief saved.")
                    st.balloons()
                else:
                    st.session_state.current_question = response.get("question", "")
                    st.session_state.observation = response.get("observation", "")

                st.rerun()
            except Exception as e:
                st.error(f"Error: {e}")

    if finish:
        save_json(st.session_state.interview_brief.model_dump(), brief_path)
        st.success("Brief saved with current progress.")
        st.rerun()

    # Show history
    if st.session_state.interview_history:
        with st.expander("Interview History", expanded=False):
            for entry in st.session_state.interview_history:
                st.markdown(f"**Q:** {entry['question']}")
                st.markdown(f"**A:** {entry['answer']}")
                st.divider()


def _render_strategy():
    """Strategy viewer and generator."""
    st.header("GTM Strategy")

    brief_path = OUTPUT_DIR / "gtm_brief.json"
    strategy_path = OUTPUT_DIR / "gtm_strategy.json"
    report_path = OUTPUT_DIR / "gtm_strategy_report.md"

    if not brief_path.exists():
        st.warning("Complete the Discovery Interview first.")
        return

    if strategy_path.exists():
        strategy_data = load_json(strategy_path)

        tab1, tab2, tab3 = st.tabs(["Report", "Segments", "Channels"])

        with tab1:
            if report_path.exists():
                st.markdown(report_path.read_text())
            else:
                st.json(strategy_data)

        with tab2:
            for seg in strategy_data.get("segments", []):
                with st.expander(f"#{seg['priority_rank']} — {seg['name']}", expanded=seg['priority_rank'] == 1):
                    st.write(seg.get("description", ""))
                    st.write(f"**Reasoning:** {seg.get('reasoning', '')}")
                    if seg.get("pain_points"):
                        st.write("**Pain Points:**", ", ".join(seg["pain_points"]))

        with tab3:
            for ch in strategy_data.get("channels", []):
                ratio = ch.get("impact_to_effort_ratio", 0)
                with st.expander(f"#{ch['priority_rank']} — {ch['channel']} (ratio: {ratio})", expanded=ch['priority_rank'] == 1):
                    st.write(f"**Impact:** {ch.get('impact_score', 0)}/10 | **Effort:** {ch.get('effort_score', 0)}/10")
                    st.write(f"**Quick Win:** {ch.get('quick_win', '')}")
                    st.write(f"**Reasoning:** {ch.get('reasoning', '')}")

        if st.button("Regenerate Strategy"):
            strategy_path.unlink()
            if report_path.exists():
                report_path.unlink()
            st.rerun()

    else:
        st.info("No strategy generated yet.")
        if st.button("Generate Strategy", type="primary"):
            with st.spinner("Generating strategy (this takes 1-2 minutes)..."):
                try:
                    from gtm_engine.strategy.engine import generate_strategy
                    brief_data = load_json(brief_path)
                    brief = GTMBrief(**brief_data)
                    generate_strategy(brief)
                    st.success("Strategy generated!")
                    st.rerun()
                except Exception as e:
                    st.error(f"Error: {e}")


def _render_content_queue():
    """Content queue viewer and batch generator."""
    st.header("Content Queue")

    strategy_path = OUTPUT_DIR / "gtm_strategy.json"
    brief_path = OUTPUT_DIR / "gtm_brief.json"

    if not strategy_path.exists():
        st.warning("Generate a strategy first.")
        return

    # Show existing content
    content_files = sorted(CONTENT_QUEUE_DIR.glob("*.json"))
    content_files = [f for f in content_files if f.name != "batch_manifest.json"]

    if content_files:
        st.subheader(f"{len(content_files)} pieces in queue")

        for cf in content_files:
            try:
                data = load_json(cf)
                status_emoji = {"draft": "o", "approved": "+", "published": "v"}.get(data.get("status", ""), "?")
                with st.expander(f"[{status_emoji}] {data.get('title', cf.stem)[:80]}"):
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        st.write(f"**Type:** {data.get('format', 'N/A')}")
                    with col2:
                        tags = data.get("tags", {})
                        st.write(f"**Channel:** {tags.get('channel', 'N/A')}")
                    with col3:
                        st.write(f"**Segment:** {tags.get('segment', 'N/A')}")

                    st.markdown(data.get("body", "")[:1000])
                    if len(data.get("body", "")) > 1000:
                        st.caption("... (truncated)")

                    # Approval controls
                    col_a, col_b = st.columns(2)
                    with col_a:
                        if data.get("status") == "draft" and st.button("Approve", key=f"approve_{cf.stem}"):
                            data["status"] = "approved"
                            save_json(data, cf)
                            st.rerun()
                    with col_b:
                        if st.button("Delete", key=f"delete_{cf.stem}"):
                            cf.unlink()
                            st.rerun()
            except Exception:
                pass

    # Generation controls
    st.divider()
    max_pieces = st.slider("Max pieces to generate", 5, 50, 20)
    if st.button("Generate Content Batch", type="primary"):
        with st.spinner(f"Generating up to {max_pieces} content pieces..."):
            try:
                from gtm_engine.content_factory.router import run_content_batch
                from gtm_engine.strategy.models import GTMStrategy

                brief = GTMBrief(**load_json(brief_path))
                strategy = GTMStrategy(**load_json(strategy_path))
                pieces = run_content_batch(brief, strategy, max_pieces=max_pieces)
                st.success(f"Generated {len(pieces)} content pieces!")
                st.rerun()
            except Exception as e:
                st.error(f"Error: {e}")


def _render_deployment():
    """Deployment controls and logs."""
    st.header("Deployment")

    deployment_log_path = OUTPUT_DIR / "deployment_log.json"
    performance_log_path = OUTPUT_DIR / "performance_log.json"

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Deploy")
        auto_publish = st.checkbox("Auto-publish approved content", value=False)

        if st.button("Run Deployment Cycle", type="primary"):
            with st.spinner("Running deployment..."):
                try:
                    from gtm_engine.deployment.scheduler import DeploymentScheduler
                    scheduler = DeploymentScheduler()
                    results = scheduler.run_deployment_cycle(auto_publish=auto_publish)
                    st.success(f"Deployment cycle complete: {len(results)} items processed")
                    for r in results:
                        st.write(f"- {r.get('piece_id', 'N/A')}: {r.get('status', 'N/A')}")
                except Exception as e:
                    st.error(f"Error: {e}")

    with col2:
        st.subheader("Collect Metrics")
        if st.button("Collect Performance Metrics"):
            with st.spinner("Collecting metrics..."):
                try:
                    from gtm_engine.deployment.scheduler import DeploymentScheduler
                    scheduler = DeploymentScheduler()
                    metrics = scheduler.collect_metrics()
                    st.success(f"Collected metrics for {len(metrics)} posts")
                except Exception as e:
                    st.error(f"Error: {e}")

    # Show logs
    st.divider()
    if deployment_log_path.exists():
        st.subheader("Deployment Log")
        st.json(load_json(deployment_log_path))

    if performance_log_path.exists():
        st.subheader("Performance Log")
        st.json(load_json(performance_log_path))

    # Reprioritisation
    st.divider()
    st.subheader("Reprioritisation")
    repri_path = OUTPUT_DIR / "reprioritisation_report.md"
    if repri_path.exists():
        st.markdown(repri_path.read_text())

    if st.button("Run Reprioritisation Analysis"):
        with st.spinner("Analysing performance..."):
            try:
                from gtm_engine.feedback.engine import reprioritise
                from gtm_engine.strategy.models import GTMStrategy

                strategy_path = OUTPUT_DIR / "gtm_strategy.json"
                if not strategy_path.exists() or not performance_log_path.exists():
                    st.warning("Need both a strategy and performance data to reprioritise.")
                else:
                    strategy = GTMStrategy(**load_json(strategy_path))
                    perf_log = load_json(performance_log_path)
                    recs = reprioritise(perf_log, strategy)
                    st.success(f"Analysis complete. Confidence: {recs.get('confidence_level', 'N/A')}")
                    st.rerun()
            except Exception as e:
                st.error(f"Error: {e}")


def _render_stage_gate():
    """Stage gate review interface."""
    st.header("Stage Gate Review")

    from gtm_engine.stage_gate.gate import (
        check_gate_trigger, STAGE_GATE_QUESTIONS, generate_report,
    )

    # Check if gate should trigger
    trigger_info = check_gate_trigger(last_gate_time=None)
    if trigger_info["should_trigger"]:
        st.warning("Stage gate triggered!")
        for t in trigger_info["triggers"]:
            st.write(f"- **{t['type']}**: {t['reason']}")

    # Interactive gate
    st.subheader("Founder Check-in")
    st.caption("Your answers feed directly back into the engine. Be honest — the more uncomfortable the truth, the more useful it is.")

    responses = {}
    for i, question in enumerate(STAGE_GATE_QUESTIONS):
        responses[question] = st.text_area(question, key=f"gate_q_{i}")

    if st.button("Submit Stage Gate", type="primary"):
        filled = {q: a for q, a in responses.items() if a.strip()}
        if not filled:
            st.warning("Answer at least one question.")
        else:
            with st.spinner("Synthesising your responses..."):
                try:
                    from gtm_engine.stage_gate.gate import _synthesise_gate_responses
                    synthesis = _synthesise_gate_responses(filled, None)
                    gate_record = {
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "responses": filled,
                        "synthesis": synthesis,
                    }
                    save_json(gate_record, OUTPUT_DIR / f"stage_gate_{datetime.now(timezone.utc).strftime('%Y%m%d')}.json")
                    st.success("Stage gate complete!")
                    st.json(synthesis)
                except Exception as e:
                    st.error(f"Error: {e}")

    # Weekly report
    st.divider()
    st.subheader("Weekly Report")

    # Find most recent report
    reports = sorted(OUTPUT_DIR.glob("weekly_report_*.md"), reverse=True)
    if reports:
        st.markdown(reports[0].read_text())
    else:
        if st.button("Generate Weekly Report"):
            with st.spinner("Generating report..."):
                try:
                    report = generate_report()
                    st.markdown(report)
                except Exception as e:
                    st.error(f"Error: {e}")


# Streamlit doesn't have switch_page_or_rerun — polyfill
if not hasattr(st, "switch_page_or_rerun"):
    st.switch_page_or_rerun = lambda page: st.rerun()


if __name__ == "__main__":
    main()
