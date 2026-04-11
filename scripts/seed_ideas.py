"""Seed Ideas — generate the initial batch for the Quantum Tools idea bank.

Usage:
    python scripts/seed_ideas.py           # 50 ideas (default)
    python scripts/seed_ideas.py 100        # 100 ideas

Outputs: ideas saved to data/gtm_engine.db
Then launch the UI to review: python main.py ui
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from gtm_engine.ideas.generator import generate_and_save
from gtm_engine.approval import get_pipeline_counts
from gtm_engine.utils.logger import setup_logging


def main():
    setup_logging()
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 50

    print(f"\n{'=' * 70}")
    print(f"  SEEDING IDEA BANK")
    print(f"  Target: {n} ideas across funnel (umbrella / product / feature / proof)")
    print(f"{'=' * 70}\n")

    ids = generate_and_save(n=n)

    print(f"\n{'=' * 70}")
    print(f"  SEED COMPLETE")
    print(f"{'=' * 70}")
    print(f"  Created: {len(ids)} ideas")

    counts = get_pipeline_counts()
    print(f"\n  Pipeline counts:")
    for state, count in counts.items():
        print(f"    {state}: {count}")

    print(f"\n  Next steps:")
    print(f"    1. Launch the UI: python main.py ui")
    print(f"    2. Go to the 'Ideas' page")
    print(f"    3. Review, filter, bulk approve/reject")
    print(f"    4. Select approved ideas and hit 'Generate content'")
    print()


if __name__ == "__main__":
    main()
