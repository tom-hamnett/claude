"""Seed the active workspace with the Quantum Tools demo (CLI wrapper).

The actual logic lives in gtm_engine.demo.load_quantum_demo so the UI can
call it too (one-click "Load demo" button). Run:

    python scripts/seed_quantum_demo.py
"""

from gtm_engine.demo import load_quantum_demo

if __name__ == "__main__":
    summary = load_quantum_demo()
    print("Loaded Quantum Tools demo into the active workspace.")
    print(
        f"  {summary['ideas']} ideas · {summary['pillars']} pillars · "
        f"{summary['segments']} segments · {summary['channels']} channels · "
        f"{summary['produced_jobs']} produced video jobs"
    )
    print("  ('The Story' pillar left empty on purpose -> PLAN gap action.)")
