"""Centralised configuration loaded from environment variables.

Reads from .env (local dev) or Streamlit secrets (cloud deployment).
Every module imports config values from here. No hardcoded keys anywhere.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


def _get(key: str, default: str = "") -> str:
    """Get a config value from env vars first, then Streamlit secrets as fallback."""
    val = os.getenv(key, "")
    if val:
        return val
    try:
        import streamlit as st
        return st.secrets.get(key, default)
    except Exception:
        return default

# Paths
# ---------------------------------------------------------------------------
# Tenant model (see gtm_engine/context.py): all *tenant-scoped* storage lives
# under a per-workspace folder, so the engine can become multi-user later
# without touching any query. Today the workspace is always "default", so this
# resolves to data/workspaces/default/ etc. and behaves as a single brain.
#
#   Shared across every workspace (global): DATA_DIR static assets
#   (brand_standards.json, core_five_segments.json, master_assets/) and LOGS_DIR.
#   Per workspace (isolated): the SQLite DB, OUTPUT_DIR (brief, strategy,
#   reports), and CONTENT_QUEUE_DIR.
# ---------------------------------------------------------------------------
from gtm_engine.context import get_workspace

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"          # shared static assets (not tenant data)
LOGS_DIR = ROOT_DIR / "logs"          # operational logs, global

WORKSPACE = get_workspace()
_WS_DATA_DIR = DATA_DIR / "workspaces" / WORKSPACE
OUTPUT_DIR = ROOT_DIR / "output" / "workspaces" / WORKSPACE
CONTENT_QUEUE_DIR = ROOT_DIR / "content_queue" / "workspaces" / WORKSPACE

# Ensure runtime directories exist
for d in [DATA_DIR, _WS_DATA_DIR, OUTPUT_DIR, CONTENT_QUEUE_DIR, LOGS_DIR]:
    d.mkdir(parents=True, exist_ok=True)


def _migrate_legacy_single_tenant() -> None:
    """Adopt pre-workspace data into the default workspace (idempotent).

    Earlier builds stored one brain at data/gtm_engine.db and output/*.
    When running as the default workspace, move any such legacy files into
    the new per-workspace folders so existing setups aren't lost. Only runs
    for "default", only moves a file if the destination doesn't already
    exist, and leaves everything else untouched.
    """
    if WORKSPACE != "default":
        return

    import shutil

    # The DB.
    legacy_db = DATA_DIR / "gtm_engine.db"
    if legacy_db.exists() and not SQLITE_PATH.exists():
        shutil.move(str(legacy_db), str(SQLITE_PATH))

    # Brief / strategy / reports that used to sit at output/ root.
    legacy_output = ROOT_DIR / "output"
    if legacy_output.exists():
        for item in legacy_output.iterdir():
            if item.name == "workspaces" or item.is_dir():
                continue
            dest = OUTPUT_DIR / item.name
            if not dest.exists():
                shutil.move(str(item), str(dest))

# AI providers (reads .env first, then Streamlit secrets)
ANTHROPIC_API_KEY = _get("ANTHROPIC_API_KEY")
OPENAI_API_KEY = _get("OPENAI_API_KEY")
GOOGLE_API_KEY = _get("GOOGLE_API_KEY")
DEFAULT_AI_MODEL = _get("DEFAULT_AI_MODEL", "claude-sonnet-4-20250514")

# Database
# Local: uses SQLite file in data/
# Cloud: uses Turso (libsql) — set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
SUPABASE_URL = _get("SUPABASE_URL")
SUPABASE_KEY = _get("SUPABASE_KEY")
TURSO_DATABASE_URL = _get("TURSO_DATABASE_URL")
TURSO_AUTH_TOKEN = _get("TURSO_AUTH_TOKEN")
SQLITE_PATH = _WS_DATA_DIR / "gtm_engine.db"

# Now that the workspace paths (incl. SQLITE_PATH) are known, adopt any
# legacy single-tenant data into the default workspace.
_migrate_legacy_single_tenant()

# App password (simple gate for Streamlit Cloud deployment)
APP_PASSWORD = _get("APP_PASSWORD")

# Deployment channels
REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID", "")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET", "")
REDDIT_USERNAME = os.getenv("REDDIT_USERNAME", "")
REDDIT_PASSWORD = os.getenv("REDDIT_PASSWORD", "")
REDDIT_USER_AGENT = os.getenv("REDDIT_USER_AGENT", "gtm-engine/0.1")

LINKEDIN_ACCESS_TOKEN = os.getenv("LINKEDIN_ACCESS_TOKEN", "")

TWITTER_API_KEY = os.getenv("TWITTER_API_KEY", "")
TWITTER_API_SECRET = os.getenv("TWITTER_API_SECRET", "")
TWITTER_ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN", "")
TWITTER_ACCESS_SECRET = os.getenv("TWITTER_ACCESS_SECRET", "")

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "")

# Engine behaviour
STAGE_GATE_INTERVAL_DAYS = int(os.getenv("STAGE_GATE_INTERVAL_DAYS", "7"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
