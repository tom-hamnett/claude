"""Centralised configuration loaded from environment variables.

Every module imports config values from here. No hardcoded keys anywhere.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Paths
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
OUTPUT_DIR = ROOT_DIR / "output"
CONTENT_QUEUE_DIR = ROOT_DIR / "content_queue"
LOGS_DIR = ROOT_DIR / "logs"

# Ensure runtime directories exist
for d in [DATA_DIR, OUTPUT_DIR, CONTENT_QUEUE_DIR, LOGS_DIR]:
    d.mkdir(exist_ok=True)

# AI providers
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
DEFAULT_AI_MODEL = os.getenv("DEFAULT_AI_MODEL", "claude-sonnet-4-20250514")

# Database
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SQLITE_PATH = DATA_DIR / "gtm_engine.db"

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
