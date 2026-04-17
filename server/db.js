// SQLite database schema + seed with IHG PE reference data
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "apex.db");

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
  `);

  return db;
}

export function getDB() {
  return new Database(DB_PATH);
}
