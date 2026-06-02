// Sync scheduler: runs every minute, polls due data sources, stores pending files
import { getDB } from "../db.js";
import { fetchSource } from "./fetchers.js";
import { getValidToken } from "../auth/microsoft.js";

let schedulerInterval = null;

async function attachMicrosoftAuth(source, db) {
  try {
    const token = await getValidToken(db, source.programme_id);
    if (token) source._microsoftAccessToken = token;
  } catch (e) {
    console.log(`[scheduler] Microsoft token refresh failed for ${source.name}: ${e.message}`);
  }
}

async function pollSource(source) {
  const db = getDB();
  try {
    if (source.type === "sharepoint-shared" || source.type === "sharepoint-folder") {
      await attachMicrosoftAuth(source, db);
    }
    const result = await fetchSource(source);
    const files = result.files || [];

    const stats = { seen: files.length, new: 0, changed: 0, unchanged: 0 };

    // Existing file records for this source
    const existing = db.prepare("SELECT * FROM data_source_files WHERE source_id = ?").all(source.id);
    const existingById = Object.fromEntries(existing.map(f => [f.file_id, f]));

    for (const f of files) {
      const prev = existingById[f.id];
      if (!prev) {
        // New file
        db.prepare("INSERT INTO data_source_files (id, source_id, file_id, filename, last_modified, content_hash, download_url, size_bytes, mime_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')").run(
          `dsf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, source.id, f.id, f.name, f.lastModified, f.contentHash, f.downloadUrl, f.sizeBytes, f.mimeType
        );
        stats.new++;
      } else if (prev.content_hash !== f.contentHash) {
        // Changed file
        db.prepare("UPDATE data_source_files SET filename = ?, last_modified = ?, content_hash = ?, download_url = ?, size_bytes = ?, status = 'pending' WHERE id = ?").run(
          f.name, f.lastModified, f.contentHash, f.downloadUrl, f.sizeBytes, prev.id
        );
        stats.changed++;
      } else {
        // Unchanged file — still refresh the download URL (they expire after ~1 hour)
        db.prepare("UPDATE data_source_files SET download_url = ? WHERE id = ?").run(f.downloadUrl, prev.id);
        stats.unchanged++;
      }
    }

    // Update source poll timestamp + summary
    db.prepare("UPDATE data_sources SET last_polled_at = datetime('now'), last_sync_summary = ? WHERE id = ?").run(
      JSON.stringify({ ...stats, ok: true, polledAt: new Date().toISOString() }), source.id
    );
    db.close();
    return { ok: true, ...stats };
  } catch (e) {
    db.prepare("UPDATE data_sources SET last_polled_at = datetime('now'), last_sync_summary = ? WHERE id = ?").run(
      JSON.stringify({ ok: false, error: e.message, polledAt: new Date().toISOString() }), source.id
    );
    db.close();
    return { ok: false, error: e.message };
  }
}

export async function syncSource(sourceId) {
  const db = getDB();
  const source = db.prepare("SELECT * FROM data_sources WHERE id = ?").get(sourceId);
  db.close();
  if (!source) throw new Error("Source not found");
  // Microsoft auth is attached inside pollSource
  return pollSource(source);
}

async function runDueSyncs() {
  const db = getDB();
  const sources = db.prepare("SELECT * FROM data_sources WHERE enabled = 1").all();
  db.close();

  const now = Date.now();
  for (const source of sources) {
    const lastPolled = source.last_polled_at ? new Date(source.last_polled_at).getTime() : 0;
    const intervalMs = (source.poll_interval_minutes || 60) * 60 * 1000;
    if (now - lastPolled >= intervalMs) {
      console.log(`[scheduler] Polling source: ${source.name} (${source.type})`);
      await pollSource(source);
    }
  }
}

export function startScheduler() {
  if (schedulerInterval) return;
  console.log("[scheduler] Starting sync scheduler (60s interval)");
  // Run immediately, then every 60 seconds
  runDueSyncs().catch(e => console.error("[scheduler] Initial run failed:", e));
  schedulerInterval = setInterval(() => {
    runDueSyncs().catch(e => console.error("[scheduler] Run failed:", e));
  }, 60 * 1000);
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}
