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
import { parseFile, diffTables, parseAllSheets } from "./dataParser.js";

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

// ── Data Tables ─────────────────────────────────────────────────────────────

// Upload + parse a file into a data table
app.post("/api/programmes/:programmeId/data-tables", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  try {
    const parsed = parseFile(req.file.path, req.file.originalname);
    const db = getDB();
    const tableId = `dt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const tableName = req.body.name || req.file.originalname.replace(/\.[^.]+$/, "");

    // Check for existing table with same name for version diffing
    const existing = db.prepare("SELECT id, columns_meta FROM data_tables WHERE programme_id = ? AND name = ? ORDER BY version DESC LIMIT 1").get(req.params.programmeId, tableName);
    let version = 1;
    let diff = null;
    let previousVersionId = null;

    if (existing) {
      version = (db.prepare("SELECT MAX(version) as v FROM data_tables WHERE programme_id = ? AND name = ?").get(req.params.programmeId, tableName)?.v || 0) + 1;
      previousVersionId = existing.id;
      // Get old rows for diff
      const oldRows = db.prepare("SELECT row_data FROM data_rows WHERE table_id = ?").all(existing.id).map(r => JSON.parse(r.row_data));
      diff = diffTables(oldRows, parsed.rows);
    }

    // Store table metadata
    db.prepare("INSERT INTO data_tables (id, programme_id, name, description, columns_meta, row_count, source_document_id, version, previous_version_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      tableId, req.params.programmeId, tableName, req.body.description || "", JSON.stringify(parsed.columns), parsed.rowCount, req.body.documentId || null, version, previousVersionId
    );

    // Store rows
    const insertRow = db.prepare("INSERT INTO data_rows (table_id, row_data) VALUES (?, ?)");
    const insertMany = db.transaction((rows) => { for (const row of rows) insertRow.run(tableId, JSON.stringify(row)); });
    insertMany(parsed.rows);

    // Store file in documents
    db.prepare("INSERT INTO documents (id, programme_id, filename, original_name, mime_type, size_bytes, section, ingested_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
      `doc-${tableId}`, req.params.programmeId, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, "data-table", req.body.uploadedBy || "user"
    );

    db.close();
    res.json({ id: tableId, name: tableName, version, rowCount: parsed.rowCount, columns: parsed.columns, diff, sheetUsed: parsed.sheetUsed, sheetNames: parsed.sheetNames });
  } catch (e) {
    res.status(500).json({ error: "Parse error: " + e.message });
  }
});

// List all data tables for a programme
app.get("/api/programmes/:programmeId/data-tables", (req, res) => {
  const db = getDB();
  const rows = db.prepare("SELECT id, name, description, columns_meta, row_count, version, created_at FROM data_tables WHERE programme_id = ? ORDER BY created_at DESC").all(req.params.programmeId);
  db.close();
  res.json(rows.map(r => ({ ...r, columns: JSON.parse(r.columns_meta) })));
});

// Get table metadata
app.get("/api/data-tables/:tableId", (req, res) => {
  const db = getDB();
  const row = db.prepare("SELECT * FROM data_tables WHERE id = ?").get(req.params.tableId);
  db.close();
  if (!row) return res.status(404).json({ error: "Table not found" });
  res.json({ ...row, columns: JSON.parse(row.columns_meta) });
});

// Get rows with optional filtering
app.get("/api/data-tables/:tableId/rows", (req, res) => {
  const db = getDB();
  const limit = parseInt(req.query.limit) || 1000;
  const offset = parseInt(req.query.offset) || 0;
  let rows = db.prepare("SELECT row_data FROM data_rows WHERE table_id = ? LIMIT ? OFFSET ?").all(req.params.tableId, limit, offset);
  db.close();
  let data = rows.map(r => JSON.parse(r.row_data));

  // Apply filters from query params: ?filter_Region=AMER&filter_Month=Jan
  for (const [key, val] of Object.entries(req.query)) {
    if (key.startsWith("filter_")) {
      const col = key.replace("filter_", "");
      data = data.filter(r => String(r[col]) === val);
    }
  }

  res.json(data);
});

// Export table as CSV
app.get("/api/data-tables/:tableId/export", (req, res) => {
  const db = getDB();
  const table = db.prepare("SELECT * FROM data_tables WHERE id = ?").get(req.params.tableId);
  const rows = db.prepare("SELECT row_data FROM data_rows WHERE table_id = ?").all(req.params.tableId);
  db.close();
  if (!table) return res.status(404).json({ error: "Table not found" });

  const data = rows.map(r => JSON.parse(r.row_data));
  const columns = JSON.parse(table.columns_meta);
  const header = columns.map(c => c.name).join(",");
  const csvRows = data.map(r => columns.map(c => {
    const v = r[c.name];
    if (v == null) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(","));

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${table.name}_v${table.version}.csv"`);
  res.send([header, ...csvRows].join("\n"));
});

// Delete a data table
app.delete("/api/data-tables/:tableId", (req, res) => {
  const db = getDB();
  db.prepare("DELETE FROM data_rows WHERE table_id = ?").run(req.params.tableId);
  db.prepare("DELETE FROM data_tables WHERE id = ?").run(req.params.tableId);
  db.close();
  res.json({ ok: true });
});

// ── KPI Definitions ─────────────────────────────────────────────────────────

// Create a KPI
app.post("/api/programmes/:programmeId/kpis", (req, res) => {
  const db = getDB();
  const id = `kpi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const k = req.body;
  db.prepare("INSERT INTO kpi_definitions (id, programme_id, name, description, source_table_id, value_column, time_column, dimension_columns, aggregation, target, direction, rag_green, rag_amber, unit, domain, panel, is_headline, linked_kpi_ids, chart_type, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
    id, req.params.programmeId, k.name, k.description || "", k.sourceTableId || null, k.valueColumn || null, k.timeColumn || null, JSON.stringify(k.dimensionColumns || []), k.aggregation || "sum", k.target || null, k.direction || "higher", k.ragGreen || null, k.ragAmber || null, k.unit || "", k.domain || "", k.panel || "", k.isHeadline ? 1 : 0, JSON.stringify(k.linkedKpiIds || []), k.chartType || "bar", k.sortOrder || 0
  );
  db.close();
  res.json({ id, ...k });
});

// List KPIs for a programme
app.get("/api/programmes/:programmeId/kpis", (req, res) => {
  const db = getDB();
  let query = "SELECT * FROM kpi_definitions WHERE programme_id = ?";
  const params = [req.params.programmeId];
  if (req.query.headline === "true") { query += " AND is_headline = 1"; }
  if (req.query.domain) { query += " AND domain = ?"; params.push(req.query.domain); }
  query += " ORDER BY sort_order, created_at";
  const rows = db.prepare(query).all(...params);
  db.close();
  res.json(rows.map(r => ({ ...r, dimensionColumns: JSON.parse(r.dimension_columns || "[]"), linkedKpiIds: JSON.parse(r.linked_kpi_ids || "[]"), isHeadline: !!r.is_headline })));
});

// Update a KPI
app.put("/api/kpis/:kpiId", (req, res) => {
  const db = getDB();
  const k = req.body;
  db.prepare("UPDATE kpi_definitions SET name=?, description=?, source_table_id=?, value_column=?, time_column=?, dimension_columns=?, aggregation=?, target=?, direction=?, rag_green=?, rag_amber=?, unit=?, domain=?, panel=?, is_headline=?, linked_kpi_ids=?, chart_type=?, sort_order=? WHERE id=?").run(
    k.name, k.description || "", k.sourceTableId || null, k.valueColumn || null, k.timeColumn || null, JSON.stringify(k.dimensionColumns || []), k.aggregation || "sum", k.target || null, k.direction || "higher", k.ragGreen || null, k.ragAmber || null, k.unit || "", k.domain || "", k.panel || "", k.isHeadline ? 1 : 0, JSON.stringify(k.linkedKpiIds || []), k.chartType || "bar", k.sortOrder || 0, req.params.kpiId
  );
  db.close();
  res.json({ ok: true });
});

// Delete a KPI
app.delete("/api/kpis/:kpiId", (req, res) => {
  const db = getDB();
  db.prepare("DELETE FROM kpi_definitions WHERE id = ?").run(req.params.kpiId);
  db.close();
  res.json({ ok: true });
});

// Get computed KPI data from source table (the key query endpoint)
app.get("/api/kpis/:kpiId/data", (req, res) => {
  const db = getDB();
  const kpi = db.prepare("SELECT * FROM kpi_definitions WHERE id = ?").get(req.params.kpiId);
  if (!kpi) { db.close(); return res.status(404).json({ error: "KPI not found" }); }
  if (!kpi.source_table_id) { db.close(); return res.json({ kpi, data: [], message: "No source table linked" }); }

  const rows = db.prepare("SELECT row_data FROM data_rows WHERE table_id = ?").all(kpi.source_table_id);
  db.close();
  let data = rows.map(r => JSON.parse(r.row_data));

  // Apply query filters
  for (const [key, val] of Object.entries(req.query)) {
    if (key.startsWith("filter_")) {
      const col = key.replace("filter_", "");
      data = data.filter(r => String(r[col]) === val);
    }
  }

  // Group by requested dimension
  const groupBy = req.query.groupBy || kpi.time_column;
  const dims = JSON.parse(kpi.dimension_columns || "[]");

  if (groupBy && kpi.value_column) {
    const groups = {};
    for (const row of data) {
      const key = String(row[groupBy] ?? "unknown");
      if (!groups[key]) groups[key] = { [groupBy]: row[groupBy], _rows: [] };
      groups[key]._rows.push(row);

      // If there are dimension columns, break out by each
      for (const dim of dims) {
        if (dim !== groupBy) {
          const dimKey = String(row[dim] ?? "");
          if (!groups[key][dimKey]) groups[key][dimKey] = 0;
          const val = Number(row[kpi.value_column]) || 0;
          if (kpi.aggregation === "sum") groups[key][dimKey] += val;
          else if (kpi.aggregation === "count") groups[key][dimKey]++;
          else if (kpi.aggregation === "avg") { groups[key][dimKey] += val; }
          else groups[key][dimKey] = val;
        }
      }

      // Total
      if (!groups[key]._total) groups[key]._total = 0;
      groups[key]._total += Number(row[kpi.value_column]) || 0;
      groups[key]._count = (groups[key]._count || 0) + 1;
    }

    // Finalise averages
    const result = Object.values(groups).map(g => {
      const out = { ...g, total: kpi.aggregation === "avg" ? (g._total / g._count) : g._total };
      delete out._rows; delete out._total; delete out._count;
      return out;
    });

    res.json({ kpi: { ...kpi, dimensionColumns: dims }, data: result, totalRows: data.length });
  } else {
    res.json({ kpi: { ...kpi, dimensionColumns: dims }, data, totalRows: data.length });
  }
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
