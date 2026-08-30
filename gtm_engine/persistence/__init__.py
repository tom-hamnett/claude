"""Durable persistence — snapshot the workspace DB to Supabase Storage.

Streamlit Community Cloud wipes local disk on every redeploy/sleep, so the
SQLite DB (setup, cast, content) vanishes. This module backs the DB file up to
a Supabase Storage bucket and restores it on a fresh container — with ZERO
changes to the data layer (every store keeps using local SQLite). Everything
is best-effort and guarded: if Supabase isn't configured or a call fails, the
app simply behaves as before (local-only). It can never break the app.

Setup (one time, free):
  1. Create a Supabase project → Project Settings → API: copy the URL and the
     service_role key.
  2. Add to Streamlit Secrets:
        SUPABASE_URL = "https://<ref>.supabase.co"
        SUPABASE_KEY = "<service_role key>"
  3. The bucket is created automatically on first backup.
"""

import logging

logger = logging.getLogger(__name__)

BUCKET = "gtm-backups"
_TIMEOUT = 30


def _creds() -> tuple[str, str]:
    from gtm_engine.config import _get
    return _get("SUPABASE_URL").rstrip("/"), _get("SUPABASE_KEY")


def is_configured() -> bool:
    url, key = _creds()
    return bool(url and key)


def _headers(key: str) -> dict:
    return {"apikey": key, "Authorization": f"Bearer {key}"}


def _remote_path() -> str:
    from gtm_engine.context import get_workspace
    return f"workspaces/{get_workspace()}/gtm_engine.db"


def _ensure_bucket(url: str, key: str) -> None:
    import httpx
    try:
        httpx.post(
            f"{url}/storage/v1/bucket",
            headers={**_headers(key), "Content-Type": "application/json"},
            json={"id": BUCKET, "name": BUCKET, "public": False},
            timeout=_TIMEOUT,
        )  # 200 created, or 400/409 already-exists — both fine
    except Exception as e:
        logger.info("ensure_bucket note: %s", e)


def backup() -> tuple[bool, str]:
    """Upload the current workspace DB file to Supabase Storage."""
    if not is_configured():
        return False, "Supabase not configured."
    from gtm_engine.config import SQLITE_PATH
    if not SQLITE_PATH.exists():
        return False, "No local database yet."
    url, key = _creds()
    try:
        import httpx
        _ensure_bucket(url, key)
        data = SQLITE_PATH.read_bytes()
        r = httpx.post(
            f"{url}/storage/v1/object/{BUCKET}/{_remote_path()}",
            headers={**_headers(key), "Content-Type": "application/octet-stream",
                     "x-upsert": "true"},
            content=data, timeout=_TIMEOUT,
        )
        if r.status_code in (200, 201):
            return True, f"Backed up ({len(data) // 1024} KB)."
        return False, f"Backup failed ({r.status_code}): {r.text[:120]}"
    except Exception as e:
        return False, f"Backup error: {str(e)[:150]}"


def restore() -> tuple[bool, str]:
    """Download the workspace DB snapshot from Supabase, overwriting local."""
    if not is_configured():
        return False, "Supabase not configured."
    from gtm_engine.config import SQLITE_PATH
    url, key = _creds()
    try:
        import httpx
        r = httpx.get(
            f"{url}/storage/v1/object/{BUCKET}/{_remote_path()}",
            headers=_headers(key), timeout=_TIMEOUT, follow_redirects=True,
        )
        if r.status_code == 200 and r.content:
            SQLITE_PATH.parent.mkdir(parents=True, exist_ok=True)
            SQLITE_PATH.write_bytes(r.content)
            return True, f"Restored ({len(r.content) // 1024} KB)."
        if r.status_code in (400, 404):
            return False, "No snapshot found yet."
        return False, f"Restore failed ({r.status_code})."
    except Exception as e:
        return False, f"Restore error: {str(e)[:150]}"


def restore_if_empty() -> tuple[bool, str]:
    """On a fresh container (no local DB), pull the snapshot. Safe on warm
    containers — it never overwrites an existing local DB."""
    if not is_configured():
        return False, "Supabase not configured."
    from gtm_engine.config import SQLITE_PATH
    try:
        if SQLITE_PATH.exists() and SQLITE_PATH.stat().st_size > 0:
            return False, "Local database present — keeping it."
    except Exception:
        pass
    return restore()


def backup_quietly() -> None:
    """Fire-and-forget backup after a mutation; never raises."""
    try:
        ok, msg = backup()
        logger.info("Auto-backup: %s (%s)", ok, msg)
    except Exception as e:
        logger.info("Auto-backup skipped: %s", e)
