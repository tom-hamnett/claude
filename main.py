"""GTM Intelligence Engine — Main entry point.

Usage:
    python main.py discover    Run the discovery interview (CLI)
    python main.py strategy    Generate strategy from existing brief
    python main.py content     Generate content queue
    python main.py deploy      Run deployment cycle
    python main.py gate        Run stage gate review
    python main.py init-db     Initialise the database
"""

import sys
import logging

from gtm_engine.utils.logger import setup_logging


def main():
    setup_logging()
    logger = logging.getLogger(__name__)

    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1]

    if command == "discover":
        from gtm_engine.discovery.interview import run_cli_interview
        run_cli_interview()

    elif command == "strategy":
        from gtm_engine.strategy.engine import generate_strategy
        from gtm_engine.discovery.models import GTMBrief
        from gtm_engine.utils.file_io import load_json
        from gtm_engine.config import OUTPUT_DIR

        brief_data = load_json(OUTPUT_DIR / "gtm_brief.json")
        brief = GTMBrief(**brief_data)
        generate_strategy(brief)

    elif command == "init-db":
        from gtm_engine.db.schema import init_db
        init_db()
        print("Database initialised.")

    elif command == "gate":
        from gtm_engine.stage_gate.gate import check_gate_trigger
        print("Stage gate check:", check_gate_trigger(None))

    else:
        print(f"Unknown command: {command}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
