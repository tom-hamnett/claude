// SQLite database schema + seed with IHG PE reference data
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database location resolution (in priority order):
// 1. DB_PATH env var (explicit override)
// 2. /home/data on Azure App Service — persists across deploys (wwwroot gets wiped)
// 3. local ../data for development
function resolveDbDir() {
  if (process.env.DB_PATH) return path.dirname(process.env.DB_PATH);
  // Azure App Service Linux sets HOME=/home which is persistent storage
  if (process.env.WEBSITE_INSTANCE_ID && fs.existsSync("/home")) {
    return "/home/data";
  }
  return path.join(__dirname, "..", "data");
}

const DB_DIR = resolveDbDir();
fs.mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, "apex.db");

export function initDB() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS programmes (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      programme_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT,
      size_bytes INTEGER,
      section TEXT,
      ingested_at TEXT DEFAULT (datetime('now')),
      ingested_by TEXT DEFAULT 'system',
      summary TEXT,
      FOREIGN KEY (programme_id) REFERENCES programmes(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      programme_id TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      changed_by TEXT DEFAULT 'user',
      changed_at TEXT DEFAULT (datetime('now')),
      before_json TEXT,
      after_json TEXT,
      source TEXT,
      FOREIGN KEY (programme_id) REFERENCES programmes(id)
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      programme_id TEXT NOT NULL,
      context_id TEXT NOT NULL,
      messages TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (programme_id) REFERENCES programmes(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_context
      ON chat_history(programme_id, context_id);

    -- Source data tables (parsed from uploaded Excel/CSV)
    CREATE TABLE IF NOT EXISTS data_tables (
      id TEXT PRIMARY KEY,
      programme_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      columns_meta TEXT NOT NULL,
      row_count INTEGER DEFAULT 0,
      source_document_id TEXT,
      version INTEGER DEFAULT 1,
      previous_version_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (programme_id) REFERENCES programmes(id)
    );

    -- Data rows for source tables
    CREATE TABLE IF NOT EXISTS data_rows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id TEXT NOT NULL,
      row_data TEXT NOT NULL,
      FOREIGN KEY (table_id) REFERENCES data_tables(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_data_rows_table ON data_rows(table_id);

    -- Data templates (expected shapes for uploads)
    CREATE TABLE IF NOT EXISTS data_templates (
      id TEXT PRIMARY KEY,
      programme_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      required_columns TEXT NOT NULL,
      optional_columns TEXT,
      expected_dimensions TEXT,
      linked_kpi_ids TEXT,
      domain TEXT,
      panel TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (programme_id) REFERENCES programmes(id)
    );

    -- LLM engines (user-configured AI providers)
    CREATE TABLE IF NOT EXISTS llm_engines (
      id TEXT PRIMARY KEY,
      programme_id TEXT NOT NULL,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      api_key TEXT,
      endpoint_url TEXT,
      model_name TEXT,
      deployment_name TEXT,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (programme_id) REFERENCES programmes(id)
    );

    -- Live data sources (folder/file links that are polled on schedule)
    CREATE TABLE IF NOT EXISTS data_sources (
      id TEXT PRIMARY KEY,
      programme_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      config TEXT NOT NULL,
      poll_interval_minutes INTEGER DEFAULT 60,
      last_polled_at TEXT,
      last_sync_summary TEXT,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (programme_id) REFERENCES programmes(id)
    );

    -- Files seen from data sources (for change detection + pending ingestion queue)
    CREATE TABLE IF NOT EXISTS data_source_files (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      file_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      last_modified TEXT,
      last_ingested_at TEXT,
      status TEXT DEFAULT 'pending',
      content_hash TEXT,
      download_url TEXT,
      target_table_id TEXT,
      size_bytes INTEGER,
      mime_type TEXT,
      FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_source_files_source ON data_source_files(source_id);
    CREATE INDEX IF NOT EXISTS idx_source_files_status ON data_source_files(status);

    -- Document texts (extracted from non-Excel files for AI context)
    CREATE TABLE IF NOT EXISTS document_texts (
      id TEXT PRIMARY KEY,
      programme_id TEXT NOT NULL,
      source_file_id TEXT,
      filename TEXT NOT NULL,
      file_type TEXT,
      extracted_text TEXT NOT NULL,
      char_count INTEGER DEFAULT 0,
      doc_type TEXT DEFAULT 'other',
      doc_date TEXT,
      is_latest INTEGER DEFAULT 0,
      audience_level TEXT DEFAULT 'operational',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (programme_id) REFERENCES programmes(id),
      FOREIGN KEY (source_file_id) REFERENCES data_source_files(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_document_texts_programme ON document_texts(programme_id);

    -- Microsoft OAuth (delegated auth for SharePoint access)
    CREATE TABLE IF NOT EXISTS microsoft_auth (
      id TEXT PRIMARY KEY,
      programme_id TEXT NOT NULL UNIQUE,
      tenant_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      device_code TEXT,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at TEXT,
      user_email TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (programme_id) REFERENCES programmes(id)
    );

    -- KPI definitions (user-configured headline metrics)
    CREATE TABLE IF NOT EXISTS kpi_definitions (
      id TEXT PRIMARY KEY,
      programme_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      source_table_id TEXT,
      value_column TEXT,
      time_column TEXT,
      dimension_columns TEXT,
      aggregation TEXT DEFAULT 'sum',
      target REAL,
      direction TEXT DEFAULT 'higher',
      rag_green REAL,
      rag_amber REAL,
      unit TEXT,
      domain TEXT,
      panel TEXT,
      is_headline INTEGER DEFAULT 0,
      linked_kpi_ids TEXT,
      chart_type TEXT DEFAULT 'bar',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (programme_id) REFERENCES programmes(id),
      FOREIGN KEY (source_table_id) REFERENCES data_tables(id)
    );
  `);

  // Migrations for existing databases
  const migrations = [
    "ALTER TABLE document_texts ADD COLUMN doc_type TEXT DEFAULT 'other'",
    "ALTER TABLE document_texts ADD COLUMN doc_date TEXT",
    "ALTER TABLE document_texts ADD COLUMN is_latest INTEGER DEFAULT 0",
    "ALTER TABLE document_texts ADD COLUMN audience_level TEXT DEFAULT 'operational'",
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch (_) {}
  }

  try { db.exec("CREATE INDEX IF NOT EXISTS idx_document_texts_type ON document_texts(programme_id, doc_type, is_latest)"); } catch (_) {}

  return db;
}

export function getDB() {
  return new Database(DB_PATH);
}
