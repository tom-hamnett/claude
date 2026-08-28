"""Workspace context — the single seam for future multi-tenancy.

Today the engine runs as ONE brain (one brief, one strategy, one idea bank).
`get_workspace()` always returns "default", so behaviour is unchanged.

The whole point of this module is that ALL tenant-scoped storage
(the SQLite DB, the brief, the strategy, the content queue) is resolved
*through* the workspace returned here — see gtm_engine/config.py. That means
turning the engine multi-user later is additive, not a rewrite:

  - Per-deployment tenancy (works today): set the GTM_WORKSPACE env var
    (or a Streamlit secret) per deployment. Each tenant gets its own
    isolated folder — data/workspaces/<ws>/ and output/workspaces/<ws>/ —
    and no query anywhere needs to change, because every store already
    routes through config's paths.

  - In-app workspace switching (future): call set_workspace() from the
    logged-in session. NOTE: config.py reads the workspace once at import
    and freezes OUTPUT_DIR / SQLITE_PATH as constants, so live per-request
    switching inside one running process needs those paths to be resolved
    by helper functions instead of module constants. That is a documented,
    additive upgrade — the data layout and this seam already support it.

Resolution order for the active workspace:
  1. an explicit value set via set_workspace() (future in-app switcher)
  2. the GTM_WORKSPACE environment variable / Streamlit secret
  3. "default"
"""

import os
import re

DEFAULT_WORKSPACE = "default"

# Set by set_workspace() to override env/default (future in-app switcher).
_active_workspace: str | None = None

# Workspace ids become folder names, so keep them filesystem-safe.
_SAFE = re.compile(r"[^a-z0-9_-]+")


def _sanitise(raw: str) -> str:
    """Reduce an arbitrary workspace id to a safe, lowercase folder name."""
    slug = _SAFE.sub("-", (raw or "").strip().lower()).strip("-")
    return slug or DEFAULT_WORKSPACE


def get_workspace() -> str:
    """Return the active workspace id (always filesystem-safe).

    Order: explicit override -> GTM_WORKSPACE env/secret -> "default".
    """
    if _active_workspace:
        return _active_workspace

    raw = os.getenv("GTM_WORKSPACE", "")
    if not raw:
        try:
            import streamlit as st
            raw = st.secrets.get("GTM_WORKSPACE", "")
        except Exception:
            raw = ""

    return _sanitise(raw) if raw else DEFAULT_WORKSPACE


def set_workspace(workspace_id: str | None) -> None:
    """Override the active workspace for this process (future in-app switcher).

    Pass None to clear the override and fall back to env/default.
    """
    global _active_workspace
    _active_workspace = _sanitise(workspace_id) if workspace_id else None


def is_default_workspace() -> bool:
    """True when running as the single-tenant default (no tenant selected)."""
    return get_workspace() == DEFAULT_WORKSPACE
