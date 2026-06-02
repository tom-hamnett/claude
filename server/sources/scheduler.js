// Sync scheduler: runs every minute, polls due data sources, stores pending files
import { getDB } from "../db.js";
import { fetchSource, downloadFile } from "./fetchers.js";
import { getValidToken } from "../auth/microsoft.js";
import { extractText, isDocumentFile } from "../documentExtractor.js";
import { classifyDocument, refreshIsLatest } from "../documentClassifier.js";
import { parseFile } from "../dataParser.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

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

async function autoIngestPending() {
  const db = getDB();
  const pending = db.prepare(`
    SELECT dsf.*, ds.programme_id FROM data_source_files dsf
    JOIN data_sources ds ON ds.id = dsf.source_id
    WHERE dsf.status = 'pending' ORDER BY dsf.last_modified DESC
  `).all();

  if (!pending.length) { db.close(); return; }

  const docFiles = pending.filter(f => isDocumentFile(f.filename));
  const excelFiles = pending.filter(f => /\.(xlsx|xls|csv)$/i.test(f.filename));
  if (!docFiles.length && !excelFiles.length) { db.close(); return; }

  console.log(`[auto-ingest] ${docFiles.length} documents, ${excelFiles.length} spreadsheets pending`);
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const programmesToRefresh = new Set();

  for (const f of docFiles) {
    const tempPath = path.join(UPLOADS_DIR, `auto-${Date.now()}-${f.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
    try {
      await downloadFile({ downloadUrl: f.download_url }, tempPath);
      const result = await extractText(tempPath, f.filename);
      if (!result.text || result.text.trim().length < 50) {
        db.prepare("UPDATE data_source_files SET status = 'skipped' WHERE id = ?").run(f.id);
        continue;
      }
      const cls = classifyDocument(f.filename);
      const docId = `dtxt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const existing = db.prepare("SELECT id FROM document_texts WHERE source_file_id = ?").get(f.id);
      if (existing) {
        db.prepare("UPDATE document_texts SET extracted_text = ?, char_count = ?, file_type = ?, doc_type = ?, doc_date = ?, audience_level = ?, updated_at = datetime('now') WHERE id = ?")
          .run(result.text, result.charCount, result.fileType, cls.doc_type, cls.doc_date, cls.audience_level, existing.id);
      } else {
        db.prepare("INSERT INTO document_texts (id, programme_id, source_file_id, filename, file_type, extracted_text, char_count, doc_type, doc_date, audience_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
          .run(docId, f.programme_id, f.id, f.filename, result.fileType, result.text, result.charCount, cls.doc_type, cls.doc_date, cls.audience_level);
      }
      db.prepare("UPDATE data_source_files SET status = 'ingested', last_ingested_at = datetime('now') WHERE id = ?").run(f.id);
      programmesToRefresh.add(f.programme_id);
      console.log(`[auto-ingest] DOC: ${f.filename} → ${cls.doc_type} (${cls.doc_date || "no date"}, ${result.charCount} chars)`);
    } catch (e) {
      if (e.message.includes("Download failed 401") || e.message.includes("Download failed 403")) {
        // URL expired — will retry after next sync refreshes URLs
      } else {
        db.prepare("UPDATE data_source_files SET status = 'skipped' WHERE id = ?").run(f.id);
        console.log(`[auto-ingest] SKIP: ${f.filename} — ${e.message.slice(0, 100)}`);
      }
    } finally {
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
  }

  for (const f of excelFiles) {
    const tempPath = path.join(UPLOADS_DIR, `auto-${Date.now()}-${f.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
    try {
      await downloadFile({ downloadUrl: f.download_url }, tempPath);
      const parsed = parseFile(tempPath, f.filename);
      if (!parsed.rows.length) {
        db.prepare("UPDATE data_source_files SET status = 'skipped' WHERE id = ?").run(f.id);
        continue;
      }
      const tableId = `dt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const tableName = f.filename.replace(/\.[^.]+$/, "").split("/").pop();
      db.prepare("INSERT INTO data_tables (id, programme_id, name, description, columns_meta, row_count, version) VALUES (?, ?, ?, ?, ?, ?, 1)")
        .run(tableId, f.programme_id, tableName, "Auto-ingested from " + f.filename, JSON.stringify(parsed.columns), parsed.rowCount);
      const insertRow = db.prepare("INSERT INTO data_rows (table_id, row_data) VALUES (?, ?)");
      const insertMany = db.transaction((rows) => { for (const row of rows) insertRow.run(tableId, JSON.stringify(row)); });
      insertMany(parsed.rows);
      db.prepare("UPDATE data_source_files SET status = 'ingested', last_ingested_at = datetime('now'), target_table_id = ? WHERE id = ?").run(tableId, f.id);
      console.log(`[auto-ingest] XLS: ${f.filename} → ${parsed.rowCount} rows, ${parsed.columns.length} cols`);
    } catch (e) {
      if (!e.message.includes("Download failed 401") && !e.message.includes("Download failed 403")) {
        db.prepare("UPDATE data_source_files SET status = 'skipped' WHERE id = ?").run(f.id);
        console.log(`[auto-ingest] SKIP: ${f.filename} — ${e.message.slice(0, 100)}`);
      }
    } finally {
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
  }

  for (const pid of programmesToRefresh) {
    refreshIsLatest(db, pid);
  }
  db.close();
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

  try { await autoIngestPending(); } catch (e) { console.error("[auto-ingest] Error:", e.message); }
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
