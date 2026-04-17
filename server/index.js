// Express API server — serves the Vite frontend in production
// and provides API endpoints for programme data, file uploads, AI proxy.
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { initDB, getDB } from "./db.js";
import { seedIfNeeded } from "./seed.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

// Ensure directories exist
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(path.join(__dirname, "..", "data"), { recursive: true });

// Init DB + seed
initDB();
seedIfNeeded();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const progDir = path.join(UPLOADS_DIR, req.params.programmeId || "unknown");
    fs.mkdirSync(progDir, { recursive: true });
    cb(null, progDir);
  },
  filename: (req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${ts}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ── Programme CRUD ──────────────────────────────────────────────────────────

// List all programmes (for landing page)
app.get("/api/programmes", (req, res) => {
  const db = getDB();
  const rows = db.prepare("SELECT id, data FROM programmes ORDER BY created_at").all();
  db.close();
  res.json(rows.map(r => {
    const d = JSON.parse(r.data);
    return { id: r.id, name: d.name, function: d.function, description: d.description, accessLevel: d.accessLevel };
  }));
});

// Get full programme data
app.get("/api/programmes/:id", (req, res) => {
  const db = getDB();
  const row = db.prepare("SELECT data FROM programmes WHERE id = ?").get(req.params.id);
  db.close();
  if (!row) return res.status(404).json({ error: "Programme not found" });
  res.json(JSON.parse(row.data));
});

// Update programme data (full replace)
app.put("/api/programmes/:id", (req, res) => {
  const db = getDB();
  const existing = db.prepare("SELECT data FROM programmes WHERE id = ?").get(req.params.id);
  if (!existing) { db.close(); return res.status(404).json({ error: "Programme not found" }); }

  const newData = req.body;
  db.prepare("UPDATE programmes SET data = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(newData), req.params.id);

  // Audit log
  db.prepare("INSERT INTO audit_log (programme_id, action, entity_type, changed_by, before_json, after_json, source) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    req.params.id, "update", "programme", req.body._changedBy || "user", existing.data, JSON.stringify(newData), req.body._source || "direct"
  );

  db.close();
  res.json({ ok: true });
});

// Patch a specific field path (e.g. update just risks, or just executiveSummary)
app.patch("/api/programmes/:id", (req, res) => {
  const db = getDB();
  const row = db.prepare("SELECT data FROM programmes WHERE id = ?").get(req.params.id);
  if (!row) { db.close(); return res.status(404).json({ error: "Programme not found" }); }

  const current = JSON.parse(row.data);
  const { field, value, changedBy, source } = req.body;

  // Record before state of the specific field
  const beforeVal = field.split(".").reduce((o, k) => o?.[k], current);

  // Set the nested field
  const keys = field.split(".");
  let target = current;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!target[keys[i]]) target[keys[i]] = {};
    target = target[keys[i]];
  }
  target[keys[keys.length - 1]] = value;

  db.prepare("UPDATE programmes SET data = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(current), req.params.id);

  db.prepare("INSERT INTO audit_log (programme_id, action, entity_type, entity_id, changed_by, before_json, after_json, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
    req.params.id, "patch", field, null, changedBy || "user", JSON.stringify(beforeVal), JSON.stringify(value), source || "direct"
  );

  db.close();
  res.json({ ok: true });
});

// ── Documents ───────────────────────────────────────────────────────────────

// Upload a file
app.post("/api/programmes/:programmeId/documents", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });

  const db = getDB();
  const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  db.prepare("INSERT INTO documents (id, programme_id, filename, original_name, mime_type, size_bytes, section, ingested_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
    docId, req.params.programmeId, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, req.body.section || "general", req.body.uploadedBy || "user"
  );
  db.close();

  res.json({ id: docId, filename: req.file.filename, originalName: req.file.originalname, size: req.file.size });
});

// List documents for a programme
app.get("/api/programmes/:programmeId/documents", (req, res) => {
  const db = getDB();
  const rows = db.prepare("SELECT * FROM documents WHERE programme_id = ? ORDER BY ingested_at DESC").all(req.params.programmeId);
  db.close();
  res.json(rows);
});

// ── Audit log ───────────────────────────────────────────────────────────────

app.get("/api/programmes/:programmeId/audit", (req, res) => {
  const db = getDB();
  const limit = parseInt(req.query.limit) || 50;
  const rows = db.prepare("SELECT * FROM audit_log WHERE programme_id = ? ORDER BY changed_at DESC LIMIT ?").all(req.params.programmeId, limit);
  db.close();
  res.json(rows);
});

// ── Chat history ────────────────────────────────────────────────────────────

app.get("/api/programmes/:programmeId/chat/:contextId", (req, res) => {
  const db = getDB();
  const row = db.prepare("SELECT messages FROM chat_history WHERE programme_id = ? AND context_id = ?").get(req.params.programmeId, req.params.contextId);
  db.close();
  res.json(row ? JSON.parse(row.messages) : []);
});

app.put("/api/programmes/:programmeId/chat/:contextId", (req, res) => {
  const db = getDB();
  db.prepare(`INSERT INTO chat_history (programme_id, context_id, messages, updated_at) VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(programme_id, context_id) DO UPDATE SET messages = excluded.messages, updated_at = datetime('now')`)
    .run(req.params.programmeId, req.params.contextId, JSON.stringify(req.body.messages));
  db.close();
  res.json({ ok: true });
});

// ── AI proxy ────────────────────────────────────────────────────────────────

app.post("/api/ai", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set in .env" });

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });
    const data = await upstream.text();
    res.status(upstream.status).set("Content-Type", "application/json").send(data);
  } catch (e) {
    res.status(502).json({ error: "Proxy error: " + e.message });
  }
});

// ── Serve Vite frontend (production) ────────────────────────────────────────

const distPath = path.join(__dirname, "..", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("/{*path}", (req, res) => {
    if (!req.path.startsWith("/api/")) {
      res.sendFile(path.join(distPath, "index.html"));
    }
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[apex] Server running on http://0.0.0.0:${PORT}`);
  console.log(`[apex] API: http://0.0.0.0:${PORT}/api/programmes`);
  console.log(`[apex] Uploads: ${UPLOADS_DIR}`);
});
