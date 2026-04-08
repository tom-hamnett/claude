"""GTM Intelligence Engine — Quantum Tools

Usage:
    python main.py prefill              Pre-fill brief from Quantum Tools portfolio
    python main.py discover             Run the discovery interview (CLI)
    python main.py strategy             Generate strategy from existing brief
    python main.py brand                Initialise brand standards (Layer 8)
    python main.py import-ma001         Import The Consultancy Death Spiral (MA-001)
    python main.py master-asset <topic> Generate a new master asset
    python main.py derivatives <MA-ID>  Generate ALL derivatives from a master asset
    python main.py content [N]          Generate content batch (old-style, N pieces)
    python main.py signal               Live intelligence feed (submit signals)
    python main.py deploy               Run deployment cycle (dry run)
    python main.py deploy --live        Run deployment cycle (auto-publish)
    python main.py metrics              Collect performance metrics
    python main.py feedback             Run reprioritisation analysis
    python main.py gate                 Run stage gate review
    python main.py report               Generate weekly report
    python main.py init-db              Initialise the database
    python main.py status               Show engine status
    python main.py ui                   Launch Streamlit dashboard
    python main.py pipeline             Run full pipeline
"""

import sys
import logging
import json

from gtm_engine.config import OUTPUT_DIR, CONTENT_QUEUE_DIR, LOGS_DIR
from gtm_engine.utils.logger import setup_logging
from gtm_engine.utils.file_io import load_json, save_json


def _load_brief():
    """Load the GTM Brief or exit with guidance."""
    from gtm_engine.discovery.models import GTMBrief
    brief_path = OUTPUT_DIR / "gtm_brief.json"
    if not brief_path.exists():
        print("No GTM Brief found. Run 'python main.py discover' first.")
        sys.exit(1)
    return GTMBrief(**load_json(brief_path))


def _load_strategy():
    """Load the GTM Strategy or exit with guidance."""
    from gtm_engine.strategy.models import GTMStrategy
    strategy_path = OUTPUT_DIR / "gtm_strategy.json"
    if not strategy_path.exists():
        print("No strategy found. Run 'python main.py strategy' first.")
        sys.exit(1)
    return GTMStrategy(**load_json(strategy_path))


def cmd_discover():
    from gtm_engine.discovery.interview import run_cli_interview
    run_cli_interview()


def cmd_strategy():
    from gtm_engine.strategy.engine import generate_strategy
    brief = _load_brief()
    print(f"Generating strategy for: {brief.product.name}")
    strategy = generate_strategy(brief)
    print(f"\nStrategy generated:")
    print(f"  - {len(strategy.segments)} segments")
    print(f"  - {len(strategy.positioning)} positioning statements")
    print(f"  - {len(strategy.channels)} channels")
    print(f"  - {len(strategy.content_architecture)} content plans")
    print(f"\nSaved to: {OUTPUT_DIR / 'gtm_strategy.json'}")
    print(f"Report:   {OUTPUT_DIR / 'gtm_strategy_report.md'}")


def cmd_content():
    from gtm_engine.content_factory.router import run_content_batch
    brief = _load_brief()
    strategy = _load_strategy()
    max_pieces = int(sys.argv[2]) if len(sys.argv) > 2 else 20
    print(f"Generating up to {max_pieces} content pieces...")
    pieces = run_content_batch(brief, strategy, max_pieces=max_pieces)
    print(f"\nGenerated {len(pieces)} pieces:")
    for p in pieces:
        print(f"  [{p.tags.ai_provider}] {p.format}: {p.title[:60]}")
    print(f"\nContent saved to: {CONTENT_QUEUE_DIR}/")


def cmd_deploy():
    from gtm_engine.deployment.scheduler import DeploymentScheduler
    auto_publish = "--live" in sys.argv
    scheduler = DeploymentScheduler()
    results = scheduler.run_deployment_cycle(auto_publish=auto_publish)
    mode = "LIVE" if auto_publish else "DRY RUN"
    print(f"\nDeployment cycle ({mode}): {len(results)} items")
    for r in results:
        print(f"  - {r.get('piece_id', 'N/A')}: {r.get('status', 'N/A')}")


def cmd_metrics():
    from gtm_engine.deployment.scheduler import DeploymentScheduler
    scheduler = DeploymentScheduler()
    metrics = scheduler.collect_metrics()
    print(f"Collected metrics for {len(metrics)} posts")


def cmd_feedback():
    from gtm_engine.feedback.engine import reprioritise
    strategy = _load_strategy()
    perf_path = OUTPUT_DIR / "performance_log.json"
    if not perf_path.exists():
        print("No performance data. Run 'python main.py metrics' after publishing content.")
        sys.exit(1)
    perf_log = load_json(perf_path)
    recs = reprioritise(perf_log, strategy)
    print(f"\nReprioritisation complete. Confidence: {recs.get('confidence_level', 'N/A')}")
    print(f"Report saved to: {OUTPUT_DIR / 'reprioritisation_report.md'}")


def cmd_gate():
    from gtm_engine.stage_gate.gate import run_stage_gate_cli
    record = run_stage_gate_cli()
    print(f"\nStage gate complete. {len(record.get('responses', {}))} questions answered.")


def cmd_report():
    from gtm_engine.stage_gate.gate import generate_report
    perf_path = OUTPUT_DIR / "performance_log.json"
    deploy_path = OUTPUT_DIR / "deployment_log.json"
    strategy_path = OUTPUT_DIR / "gtm_strategy.json"

    perf_log = load_json(perf_path) if perf_path.exists() else None
    deploy_log = load_json(deploy_path) if deploy_path.exists() else None
    strategy = load_json(strategy_path) if strategy_path.exists() else None

    # Load decisions
    decisions = None
    decisions_path = LOGS_DIR / "decisions.jsonl"
    if decisions_path.exists():
        decisions = [json.loads(line) for line in decisions_path.read_text().strip().split("\n") if line]

    report = generate_report(perf_log, deploy_log, decisions, strategy)
    print(report)


def cmd_init_db():
    from gtm_engine.db.schema import init_db
    init_db()
    print("Database initialised.")


def cmd_status():
    """Show the current state of the engine."""
    from rich.console import Console
    from rich.table import Table

    console = Console()
    table = Table(title="GTM Intelligence Engine — Status")
    table.add_column("Component", style="bold")
    table.add_column("Status")
    table.add_column("Details")

    brief_path = OUTPUT_DIR / "gtm_brief.json"
    strategy_path = OUTPUT_DIR / "gtm_strategy.json"
    content_files = list(CONTENT_QUEUE_DIR.glob("*.json"))
    content_count = len([f for f in content_files if f.name != "batch_manifest.json"])

    table.add_row("GTM Brief", "Ready" if brief_path.exists() else "Not started",
                   brief_path.name if brief_path.exists() else "Run: python main.py discover")

    if strategy_path.exists():
        s = load_json(strategy_path)
        table.add_row("Strategy", "Generated",
                       f"{len(s.get('segments', []))} segments, {len(s.get('channels', []))} channels")
    else:
        table.add_row("Strategy", "Pending", "Run: python main.py strategy")

    table.add_row("Content Queue", f"{content_count} pieces",
                   f"In: {CONTENT_QUEUE_DIR}")

    deploy_path = OUTPUT_DIR / "deployment_log.json"
    if deploy_path.exists():
        d = load_json(deploy_path)
        table.add_row("Deployments", f"{len(d)} entries", deploy_path.name)
    else:
        table.add_row("Deployments", "No deployments yet", "")

    perf_path = OUTPUT_DIR / "performance_log.json"
    if perf_path.exists():
        p = load_json(perf_path)
        table.add_row("Performance", f"{len(p)} measurements", perf_path.name)
    else:
        table.add_row("Performance", "No data yet", "")

    console.print(table)


def cmd_pipeline():
    """Run the full pipeline: strategy -> content -> deploy (dry run)."""
    print("=== Running Full Pipeline ===\n")

    print("Step 1: Generating strategy...")
    cmd_strategy()

    print("\nStep 2: Generating content...")
    cmd_content()

    print("\nStep 3: Running deployment (dry run)...")
    cmd_deploy()

    print("\n=== Pipeline Complete ===")


def cmd_ui():
    import subprocess
    print("Launching Streamlit dashboard...")
    subprocess.run([
        sys.executable, "-m", "streamlit", "run",
        "gtm_engine/ui/app.py",
        "--server.headless", "true",
    ])


def cmd_prefill():
    from gtm_engine.discovery.prefill import save_brief
    save_brief()


def cmd_brand():
    from gtm_engine.brand import init_brand_standards, load_brand_standards
    standards = init_brand_standards()
    print("Brand standards initialised.")
    print(f"  Edginess level: {standards['edginess']['level']}/10")
    print(f"  Forbidden phrases: {len(standards['voice']['forbidden_phrases'])}")
    print(f"  Visual palette: {standards['visual']['colours']['primary_accent']}")


def cmd_import_ma001():
    """Import the existing master asset MA-001 from disk."""
    from gtm_engine.content_factory.master_asset import import_existing_master_asset
    from gtm_engine.config import DATA_DIR
    from pathlib import Path

    # Check multiple possible locations
    candidates = [
        DATA_DIR / "master_asset_001.md",
        Path("gtm_engine/data/master_asset_001.md"),
    ]
    for path in candidates:
        if path.exists():
            asset = import_existing_master_asset(path, "MA-001")
            print(f"Imported: {asset['id']} — {asset['title']}")
            print(f"Status: {asset['status']}")
            return
    print("master_asset_001.md not found. Looked in:", [str(p) for p in candidates])


def cmd_master_asset():
    """Generate a new master asset from a topic."""
    from gtm_engine.content_factory.master_asset import generate_master_asset
    brief = _load_brief()
    strategy = _load_strategy()
    topic = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else None
    if not topic:
        print("Usage: python main.py master-asset <topic>")
        sys.exit(1)
    asset = generate_master_asset(topic, brief, strategy)
    print(f"\nMaster Asset: {asset['id']} — {asset['title']}")
    print(f"Status: {asset['status']} (benchmark score: {asset.get('benchmark_result', {}).get('score', 'N/A')})")


def cmd_derivatives():
    """Generate all derivatives from a master asset."""
    from gtm_engine.content_factory.master_asset import load_master_asset, list_master_assets
    from gtm_engine.content_factory.derivatives import generate_all_derivatives

    asset_id = sys.argv[2] if len(sys.argv) > 2 else None
    if not asset_id:
        assets = list_master_assets()
        if not assets:
            print("No master assets. Run 'python main.py import-ma001' or 'python main.py master-asset <topic>'")
            sys.exit(1)
        print("Available master assets:")
        for a in assets:
            print(f"  {a['id']}: {a['title']} ({a['status']})")
        print(f"\nUsage: python main.py derivatives <asset_id>")
        sys.exit(1)

    asset = load_master_asset(asset_id)
    print(f"Generating ALL derivatives from {asset_id}: {asset['title']}")
    derivatives = generate_all_derivatives(asset)
    print(f"\nGenerated {len(derivatives)} derivatives:")
    for d in derivatives:
        print(f"  [{d['provider']}] {d['format']}: {d['id']} ({d['status']})")


def cmd_signal():
    """Submit a live intelligence signal."""
    from gtm_engine.intelligence import run_cli_signal_input
    run_cli_signal_input()


COMMANDS = {
    "discover": cmd_discover,
    "prefill": cmd_prefill,
    "strategy": cmd_strategy,
    "brand": cmd_brand,
    "import-ma001": cmd_import_ma001,
    "master-asset": cmd_master_asset,
    "derivatives": cmd_derivatives,
    "content": cmd_content,
    "signal": cmd_signal,
    "deploy": cmd_deploy,
    "metrics": cmd_metrics,
    "feedback": cmd_feedback,
    "gate": cmd_gate,
    "report": cmd_report,
    "init-db": cmd_init_db,
    "status": cmd_status,
    "pipeline": cmd_pipeline,
    "ui": cmd_ui,
}


def main():
    setup_logging()

    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print(__doc__)
        if len(sys.argv) > 1:
            print(f"Unknown command: {sys.argv[1]}")
        sys.exit(1)

    COMMANDS[sys.argv[1]]()


if __name__ == "__main__":
    main()
