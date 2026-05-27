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
import { analyzeUpload } from "./smartIngest.js";
import { PROVIDERS, callEngine, testEngine } from "./ai/providers.js";
import { syncSource, startScheduler } from "./sources/scheduler.js";
import { FETCHERS, downloadFile } from "./sources/fetchers.js";
import { extractText, isDocumentFile, isStructuredFile } from "./documentExtractor.js";
import { requestDeviceCode, pollForToken, getUserProfile, getValidToken } from "./auth/microsoft.js";

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

// ── Smart Ingestion (analyze before storing) ────────────────────────────────

// Analyze an uploaded file: AI preview, template match, version check, gap fill
app.post("/api/programmes/:programmeId/data-tables/analyze", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  try {
    const analysis = analyzeUpload(req.params.programmeId, req.file.path, req.file.originalname);
    // Keep the temp file path so we can store it if user confirms
    analysis.tempFilePath = req.file.path;
    analysis.originalName = req.file.originalname;
    analysis.fileSize = req.file.size;
    analysis.mimeType = req.file.mimetype;
    res.json(analysis);
  } catch (e) {
    res.status(500).json({ error: "Analysis error: " + e.message });
  }
});

// ── Data Templates ──────────────────────────────────────────────────────────

app.get("/api/programmes/:programmeId/templates", (req, res) => {
  const db = getDB();
  const rows = db.prepare("SELECT * FROM data_templates WHERE programme_id = ? ORDER BY name").all(req.params.programmeId);
  db.close();
  res.json(rows.map(r => ({
    ...r,
    requiredColumns: JSON.parse(r.required_columns),
    optionalColumns: JSON.parse(r.optional_columns || "[]"),
    expectedDimensions: JSON.parse(r.expected_dimensions || "{}"),
    linkedKpiIds: JSON.parse(r.linked_kpi_ids || "[]"),
  })));
});

app.post("/api/programmes/:programmeId/templates", (req, res) => {
  const db = getDB();
  const id = `tpl-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const t = req.body;
  db.prepare("INSERT INTO data_templates (id, programme_id, name, description, required_columns, optional_columns, expected_dimensions, linked_kpi_ids, domain, panel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
    id, req.params.programmeId, t.name, t.description || "", JSON.stringify(t.requiredColumns || []), JSON.stringify(t.optionalColumns || []), JSON.stringify(t.expectedDimensions || {}), JSON.stringify(t.linkedKpiIds || []), t.domain || "", t.panel || ""
  );
  db.close();
  res.json({ id, ...t });
});

app.post("/api/programmes/:programmeId/templates/from-table/:tableId", (req, res) => {
  const db = getDB();
  const table = db.prepare("SELECT * FROM data_tables WHERE id = ?").get(req.params.tableId);
  if (!table) { db.close(); return res.status(404).json({ error: "Table not found" }); }
  const columns = JSON.parse(table.columns_meta);
  const id = `tpl-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const required = columns.filter(c => c.type === "number" || c.isDimension).map(c => ({ name: c.name, type: c.type, role: c.isDimension ? "dimension" : c.type === "number" ? "value" : "info" }));
  db.prepare("INSERT INTO data_templates (id, programme_id, name, description, required_columns, optional_columns, expected_dimensions) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    id, req.params.programmeId, req.body.name || table.name, req.body.description || `Template created from ${table.name}`, JSON.stringify(required), "[]", "{}"
  );
  db.close();
  res.json({ id, name: req.body.name || table.name, requiredColumns: required });
});

app.delete("/api/templates/:id", (req, res) => {
  const db = getDB();
  db.prepare("DELETE FROM data_templates WHERE id = ?").run(req.params.id);
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

// ── LLM Engines (multi-provider) ────────────────────────────────────────────

app.get("/api/providers", (req, res) => {
  res.json(Object.entries(PROVIDERS).map(([id, p]) => ({ id, label: p.label, fields: p.fields })));
});

app.get("/api/programmes/:programmeId/engines", (req, res) => {
  const db = getDB();
  const rows = db.prepare("SELECT id, name, provider, endpoint_url, model_name, deployment_name, is_default, created_at FROM llm_engines WHERE programme_id = ? ORDER BY is_default DESC, created_at").all(req.params.programmeId);
  db.close();
  res.json(rows.map(r => ({ ...r, isDefault: !!r.is_default })));
});

app.post("/api/programmes/:programmeId/engines", (req, res) => {
  const db = getDB();
  const id = `eng-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const e = req.body;
  // If this engine is marked default, clear other defaults
  if (e.isDefault) db.prepare("UPDATE llm_engines SET is_default = 0 WHERE programme_id = ?").run(req.params.programmeId);
  db.prepare("INSERT INTO llm_engines (id, programme_id, name, provider, api_key, endpoint_url, model_name, deployment_name, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
    id, req.params.programmeId, e.name, e.provider, e.apiKey || null, e.endpointUrl || null, e.modelName || null, e.deploymentName || null, e.isDefault ? 1 : 0
  );
  db.close();
  res.json({ id, ...e });
});

app.put("/api/engines/:id", (req, res) => {
  const db = getDB();
  const existing = db.prepare("SELECT programme_id FROM llm_engines WHERE id = ?").get(req.params.id);
  if (!existing) { db.close(); return res.status(404).json({ error: "Engine not found" }); }
  const e = req.body;
  if (e.isDefault) db.prepare("UPDATE llm_engines SET is_default = 0 WHERE programme_id = ?").run(existing.programme_id);
  const sets = [];
  const vals = [];
  for (const [k, col] of [["name","name"],["provider","provider"],["apiKey","api_key"],["endpointUrl","endpoint_url"],["modelName","model_name"],["deploymentName","deployment_name"]]) {
    if (e[k] !== undefined) { sets.push(`${col} = ?`); vals.push(e[k]); }
  }
  if (e.isDefault !== undefined) { sets.push("is_default = ?"); vals.push(e.isDefault ? 1 : 0); }
  if (sets.length) db.prepare(`UPDATE llm_engines SET ${sets.join(", ")} WHERE id = ?`).run(...vals, req.params.id);
  db.close();
  res.json({ ok: true });
});

app.delete("/api/engines/:id", (req, res) => {
  const db = getDB();
  db.prepare("DELETE FROM llm_engines WHERE id = ?").run(req.params.id);
  db.close();
  res.json({ ok: true });
});

app.post("/api/engines/:id/test", async (req, res) => {
  const db = getDB();
  const engine = db.prepare("SELECT * FROM llm_engines WHERE id = ?").get(req.params.id);
  db.close();
  if (!engine) return res.status(404).json({ error: "Engine not found" });
  const result = await testEngine(engine);
  res.json(result);
});

// ── Data Sources (live folder/file polling) ─────────────────────────────────

app.get("/api/source-types", (req, res) => {
  res.json(Object.entries(FETCHERS).map(([id, f]) => ({ id, label: f.label, fields: f.fields })));
});

app.get("/api/programmes/:programmeId/sources", (req, res) => {
  const db = getDB();
  const rows = db.prepare("SELECT * FROM data_sources WHERE programme_id = ? ORDER BY created_at DESC").all(req.params.programmeId);
  db.close();
  res.json(rows.map(r => ({ ...r, config: JSON.parse(r.config), lastSyncSummary: r.last_sync_summary ? JSON.parse(r.last_sync_summary) : null, enabled: !!r.enabled })));
});

app.post("/api/programmes/:programmeId/sources", (req, res) => {
  const db = getDB();
  const id = `src-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const s = req.body;
  db.prepare("INSERT INTO data_sources (id, programme_id, name, type, config, poll_interval_minutes, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    id, req.params.programmeId, s.name, s.type, JSON.stringify(s.config || {}), s.pollIntervalMinutes || 60, s.enabled === false ? 0 : 1
  );
  db.close();
  res.json({ id, ...s });
});

app.put("/api/sources/:id", (req, res) => {
  const db = getDB();
  const s = req.body;
  const sets = [];
  const vals = [];
  if (s.name !== undefined) { sets.push("name = ?"); vals.push(s.name); }
  if (s.config !== undefined) { sets.push("config = ?"); vals.push(JSON.stringify(s.config)); }
  if (s.pollIntervalMinutes !== undefined) { sets.push("poll_interval_minutes = ?"); vals.push(s.pollIntervalMinutes); }
  if (s.enabled !== undefined) { sets.push("enabled = ?"); vals.push(s.enabled ? 1 : 0); }
  if (sets.length) db.prepare(`UPDATE data_sources SET ${sets.join(", ")} WHERE id = ?`).run(...vals, req.params.id);
  db.close();
  res.json({ ok: true });
});

app.delete("/api/sources/:id", (req, res) => {
  const db = getDB();
  db.prepare("DELETE FROM data_sources WHERE id = ?").run(req.params.id);
  db.close();
  res.json({ ok: true });
});

app.post("/api/sources/:id/sync-now", async (req, res) => {
  try {
    const result = await syncSource(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Pending Ingestions (from sync poller) ───────────────────────────────────

app.get("/api/programmes/:programmeId/pending-ingestions", (req, res) => {
  const db = getDB();
  const rows = db.prepare(`
    SELECT dsf.*, ds.name as source_name, ds.type as source_type
    FROM data_source_files dsf
    JOIN data_sources ds ON ds.id = dsf.source_id
    WHERE ds.programme_id = ? AND dsf.status = 'pending'
    ORDER BY dsf.last_modified DESC
  `).all(req.params.programmeId);
  db.close();
  res.json(rows);
});

app.post("/api/pending-ingestions/:id/skip", (req, res) => {
  const db = getDB();
  db.prepare("UPDATE data_source_files SET status = 'skipped' WHERE id = ?").run(req.params.id);
  db.close();
  res.json({ ok: true });
});

app.post("/api/pending-ingestions/:id/dismiss", (req, res) => {
  const db = getDB();
  db.prepare("DELETE FROM data_source_files WHERE id = ?").run(req.params.id);
  db.close();
  res.json({ ok: true });
});

// Mark as ingested (called after SmartUpload completes)
app.post("/api/pending-ingestions/:id/mark-ingested", (req, res) => {
  const db = getDB();
  db.prepare("UPDATE data_source_files SET status = 'ingested', last_ingested_at = datetime('now'), target_table_id = ? WHERE id = ?").run(req.body.tableId || null, req.params.id);
  db.close();
  res.json({ ok: true });
});

// ── Microsoft OAuth (device code flow) ──────────────────────────────────────

// Check Microsoft connection status
app.get("/api/programmes/:programmeId/microsoft-auth", (req, res) => {
  const db = getDB();
  const auth = db.prepare("SELECT id, tenant_id, client_id, status, user_email, updated_at FROM microsoft_auth WHERE programme_id = ?").get(req.params.programmeId);
  db.close();
  if (!auth) return res.json({ status: "disconnected" });
  res.json({ status: auth.status, email: auth.user_email, tenantId: auth.tenant_id, clientId: auth.client_id, updatedAt: auth.updated_at });
});

// Start device code flow
app.post("/api/programmes/:programmeId/microsoft-auth/connect", async (req, res) => {
  const { tenantId, clientId } = req.body;
  if (!tenantId || !clientId) return res.status(400).json({ error: "tenantId and clientId are required" });

  try {
    const deviceAuth = await requestDeviceCode(tenantId, clientId);
    const db = getDB();
    const id = `msauth-${Date.now()}`;

    // Upsert: replace any existing auth for this programme
    db.prepare("DELETE FROM microsoft_auth WHERE programme_id = ?").run(req.params.programmeId);
    db.prepare("INSERT INTO microsoft_auth (id, programme_id, tenant_id, client_id, status, device_code) VALUES (?, ?, ?, ?, 'pending', ?)").run(
      id, req.params.programmeId, tenantId, clientId, deviceAuth.device_code
    );
    db.close();

    res.json({
      userCode: deviceAuth.user_code,
      verificationUri: deviceAuth.verification_uri,
      expiresIn: deviceAuth.expires_in,
      message: deviceAuth.message,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Poll for device code completion
app.post("/api/programmes/:programmeId/microsoft-auth/poll", async (req, res) => {
  const db = getDB();
  const auth = db.prepare("SELECT * FROM microsoft_auth WHERE programme_id = ? AND status = 'pending'").get(req.params.programmeId);
  if (!auth) { db.close(); return res.json({ status: "no_pending" }); }

  try {
    const result = await pollForToken(auth.tenant_id, auth.client_id, auth.device_code);

    if (result.error === "authorization_pending") {
      db.close();
      return res.json({ status: "pending" });
    }

    if (result.error === "expired_token") {
      db.prepare("DELETE FROM microsoft_auth WHERE id = ?").run(auth.id);
      db.close();
      return res.json({ status: "expired" });
    }

    if (result.error) {
      db.close();
      return res.json({ status: "error", error: result.error_description || result.error });
    }

    // Success — store tokens and get user profile
    let email = "unknown";
    try {
      const profile = await getUserProfile(result.access_token);
      email = profile.mail || profile.userPrincipalName || "connected";
    } catch (_) {}

    const expiresAt = new Date(Date.now() + result.expires_in * 1000).toISOString();
    db.prepare("UPDATE microsoft_auth SET status = 'connected', access_token = ?, refresh_token = ?, token_expires_at = ?, user_email = ?, device_code = NULL, updated_at = datetime('now') WHERE id = ?")
      .run(result.access_token, result.refresh_token, expiresAt, email, auth.id);
    db.close();

    res.json({ status: "connected", email });
  } catch (e) {
    db.close();
    res.json({ status: "error", error: e.message });
  }
});

// Disconnect Microsoft account
app.delete("/api/programmes/:programmeId/microsoft-auth", (req, res) => {
  const db = getDB();
  db.prepare("DELETE FROM microsoft_auth WHERE programme_id = ?").run(req.params.programmeId);
  db.close();
  res.json({ ok: true });
});

// ── Document Text Extraction (non-Excel ingestion) ─────────────────────────

// Ingest a pending file as a document (text extraction for .pptx, .pdf, .docx, etc.)
app.post("/api/pending-ingestions/:id/ingest-document", async (req, res) => {
  const db = getDB();
  const dsf = db.prepare(`
    SELECT dsf.*, ds.programme_id
    FROM data_source_files dsf
    JOIN data_sources ds ON ds.id = dsf.source_id
    WHERE dsf.id = ?
  `).get(req.params.id);
  if (!dsf) { db.close(); return res.status(404).json({ error: "Pending file not found" }); }

  const tempPath = path.join(UPLOADS_DIR, `temp-${Date.now()}-${dsf.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
  try {
    await downloadFile({ downloadUrl: dsf.download_url }, tempPath);
    const result = await extractText(tempPath, dsf.filename);

    const docId = `dtxt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const existing = db.prepare("SELECT id FROM document_texts WHERE source_file_id = ?").get(dsf.id);
    if (existing) {
      db.prepare("UPDATE document_texts SET extracted_text = ?, char_count = ?, file_type = ?, updated_at = datetime('now') WHERE id = ?")
        .run(result.text, result.charCount, result.fileType, existing.id);
    } else {
      db.prepare("INSERT INTO document_texts (id, programme_id, source_file_id, filename, file_type, extracted_text, char_count) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(docId, dsf.programme_id, dsf.id, dsf.filename, result.fileType, result.text, result.charCount);
    }

    db.prepare("UPDATE data_source_files SET status = 'ingested', last_ingested_at = datetime('now') WHERE id = ?").run(dsf.id);
    db.close();
    try { fs.unlinkSync(tempPath); } catch (_) {}

    res.json({ id: existing?.id || docId, filename: dsf.filename, charCount: result.charCount, fileType: result.fileType });
  } catch (e) {
    db.close();
    try { fs.unlinkSync(tempPath); } catch (_) {}
    const message = e.message.includes("Download failed 403") || e.message.includes("Download failed 401")
      ? 'Download URL expired. Click "Sync" on the data source to refresh, then try again.'
      : `Document extraction failed: ${e.message}`;
    res.status(500).json({ error: message });
  }
});

// Upload + extract text from a document (direct upload, not from sync)
app.post("/api/programmes/:programmeId/document-texts/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  try {
    const result = await extractText(req.file.path, req.file.originalname);
    const db = getDB();
    const docId = `dtxt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    db.prepare("INSERT INTO document_texts (id, programme_id, source_file_id, filename, file_type, extracted_text, char_count) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(docId, req.params.programmeId, null, req.file.originalname, result.fileType, result.text, result.charCount);
    db.close();
    res.json({ id: docId, filename: req.file.originalname, charCount: result.charCount, fileType: result.fileType });
  } catch (e) {
    res.status(500).json({ error: `Document extraction failed: ${e.message}` });
  }
});

// List document texts for a programme (metadata only)
app.get("/api/programmes/:programmeId/document-texts", (req, res) => {
  const db = getDB();
  const rows = db.prepare("SELECT id, filename, file_type, char_count, created_at, updated_at FROM document_texts WHERE programme_id = ? ORDER BY updated_at DESC").all(req.params.programmeId);
  db.close();
  res.json(rows);
});

// Delete a document text
app.delete("/api/document-texts/:id", (req, res) => {
  const db = getDB();
  db.prepare("DELETE FROM document_texts WHERE id = ?").run(req.params.id);
  db.close();
  res.json({ ok: true });
});

// ── AI proxy (multi-provider) ───────────────────────────────────────────────

app.post("/api/ai", async (req, res) => {
  const engineId = req.query.engineId || req.body.engineId;
  const programmeId = req.query.programmeId || req.body.programmeId;
  const db = getDB();

  let engine;
  if (engineId) {
    engine = db.prepare("SELECT * FROM llm_engines WHERE id = ?").get(engineId);
  } else if (programmeId) {
    engine = db.prepare("SELECT * FROM llm_engines WHERE programme_id = ? AND is_default = 1").get(programmeId);
    if (!engine) engine = db.prepare("SELECT * FROM llm_engines WHERE programme_id = ? ORDER BY created_at LIMIT 1").get(programmeId);
  }

  // Inject document library into system prompt
  const effectiveProgrammeId = programmeId || engine?.programme_id;
  let documentContext = "";
  if (effectiveProgrammeId) {
    const docs = db.prepare("SELECT filename, file_type, extracted_text FROM document_texts WHERE programme_id = ? ORDER BY updated_at DESC").all(effectiveProgrammeId);
    if (docs.length) {
      let totalChars = 0;
      const maxChars = 60000;
      const parts = [];
      for (const doc of docs) {
        if (totalChars + doc.extracted_text.length > maxChars) {
          const remaining = maxChars - totalChars;
          if (remaining > 500) parts.push(`=== ${doc.filename} (${doc.file_type}, truncated) ===\n${doc.extracted_text.slice(0, remaining)}`);
          break;
        }
        parts.push(`=== ${doc.filename} (${doc.file_type}) ===\n${doc.extracted_text}`);
        totalChars += doc.extracted_text.length;
      }
      documentContext = `\n\n[DOCUMENT LIBRARY — ${docs.length} ingested document(s) from connected sources]\nUse these to answer questions. Cite the filename when referencing specific information.\n\n${parts.join("\n\n")}`;
    }
  }

  db.close();

  // Fallback: if no engine configured, try env var (old behaviour)
  if (!engine && process.env.ANTHROPIC_API_KEY) {
    engine = { provider: "anthropic", api_key: process.env.ANTHROPIC_API_KEY, model_name: "claude-sonnet-4-20250514" };
  }

  if (!engine) {
    return res.status(500).json({ error: "No LLM engine configured. Go to Settings → Engines to add one." });
  }

  try {
    const { system, messages } = req.body;
    const result = await callEngine(engine, system + documentContext, messages);
    res.json({ content: [{ text: result.text }], _engine: { provider: engine.provider, name: engine.name } });
  } catch (e) {
    res.status(502).json({ error: "AI call failed: " + e.message });
  }
});

// ── Tableau Integration ────────────────────────────────────────────────────

// Flat data export for Tableau — all data tables for a programme in a single
// denormalised feed with domain/panel/metric metadata. Tableau connects to
// this as a Web Data Connector or JSON data source.
app.get("/api/programmes/:programmeId/tableau", (req, res) => {
  const db = getDB();
  const tables = db.prepare("SELECT * FROM data_tables WHERE programme_id = ? ORDER BY name").all(req.params.programmeId);
  const kpis = db.prepare("SELECT * FROM kpi_definitions WHERE programme_id = ?").all(req.params.programmeId);

  const allRows = [];

  for (const table of tables) {
    const rows = db.prepare("SELECT row_data FROM data_rows WHERE table_id = ?").all(table.id);
    const columns = JSON.parse(table.columns_meta);
    const linkedKpis = kpis.filter(k => k.source_table_id === table.id);

    for (const row of rows) {
      const data = JSON.parse(row.row_data);
      allRows.push({
        _source_table: table.name,
        _source_version: table.version,
        _domain: linkedKpis[0]?.domain || "",
        _panel: linkedKpis[0]?.panel || "",
        _updated: table.updated_at,
        ...data,
      });
    }
  }

  // Return format based on query param
  if (req.query.format === "csv") {
    if (!allRows.length) return res.send("");
    const allKeys = [...new Set(allRows.flatMap(r => Object.keys(r)))];
    const header = allKeys.join(",");
    const csvRows = allRows.map(r => allKeys.map(k => {
      const v = r[k]; if (v == null) return "";
      const s = String(v); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","));
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=apex_tableau_export.csv");
    res.send([header, ...csvRows].join("\n"));
  } else {
    res.json({ schema: getTableauSchema(allRows), data: allRows, totalRows: allRows.length, exportedAt: new Date().toISOString() });
  }

  db.close();
});

// Per-domain Tableau feeds — Hotel, Corporate, Function
app.get("/api/programmes/:programmeId/tableau/:domain", (req, res) => {
  const db = getDB();
  const domain = req.params.domain;
  const kpis = db.prepare("SELECT * FROM kpi_definitions WHERE programme_id = ? AND domain = ?").all(req.params.programmeId, domain);

  const allRows = [];
  const seenTables = new Set();

  for (const kpi of kpis) {
    if (!kpi.source_table_id || seenTables.has(kpi.source_table_id)) continue;
    seenTables.add(kpi.source_table_id);

    const table = db.prepare("SELECT * FROM data_tables WHERE id = ?").get(kpi.source_table_id);
    if (!table) continue;
    const rows = db.prepare("SELECT row_data FROM data_rows WHERE table_id = ?").all(table.id);

    for (const row of rows) {
      const data = JSON.parse(row.row_data);
      allRows.push({
        _metric: kpi.name,
        _panel: kpi.panel,
        _source_table: table.name,
        _target: kpi.target,
        _direction: kpi.direction,
        _unit: kpi.unit,
        ...data,
      });
    }
  }

  db.close();

  if (req.query.format === "csv") {
    if (!allRows.length) return res.send("");
    const allKeys = [...new Set(allRows.flatMap(r => Object.keys(r)))];
    const header = allKeys.join(",");
    const csvRows = allRows.map(r => allKeys.map(k => {
      const v = r[k]; if (v == null) return "";
      const s = String(v); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","));
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=apex_${domain}.csv`);
    res.send([header, ...csvRows].join("\n"));
  } else {
    res.json({ domain, data: allRows, totalRows: allRows.length, exportedAt: new Date().toISOString() });
  }
});

// Tableau Web Data Connector HTML page — Tableau Desktop loads this URL
app.get("/api/tableau-wdc", (req, res) => {
  const host = req.headers.host || `localhost:${PORT}`;
  const proto = req.protocol || "http";
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>APEX Tableau Connector</title>
  <script src="https://connectors.tableau.com/libs/tableauwdc-2.3.latest/js/tableauwdc-2.3.latest.min.js"></script>
  <script>
  (function() {
    var connector = tableau.makeConnector();

    connector.getSchema = function(schemaCallback) {
      var programmeId = tableau.connectionData ? JSON.parse(tableau.connectionData).programmeId : "";
      fetch("${proto}://${host}/api/programmes/" + programmeId + "/tableau")
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var cols = data.schema.map(function(s) {
            return { id: s.id, alias: s.alias, dataType: s.dataType };
          });
          schemaCallback([{ id: "apex_data", alias: "APEX Programme Data", columns: cols }]);
        });
    };

    connector.getData = function(table, doneCallback) {
      var programmeId = tableau.connectionData ? JSON.parse(tableau.connectionData).programmeId : "";
      fetch("${proto}://${host}/api/programmes/" + programmeId + "/tableau")
        .then(function(r) { return r.json(); })
        .then(function(data) {
          table.appendRows(data.data);
          doneCallback();
        });
    };

    tableau.registerConnector(connector);

    document.addEventListener("DOMContentLoaded", function() {
      document.getElementById("submit").addEventListener("click", function() {
        tableau.connectionData = JSON.stringify({ programmeId: document.getElementById("progId").value });
        tableau.connectionName = "APEX Programme Data";
        tableau.submit();
      });
    });
  })();
  </script>
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #0B2A3C; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #13445E; border: 1px solid #1A5572; border-radius: 12px; padding: 40px; max-width: 400px; text-align: center; }
    h1 { font-size: 24px; margin: 0 0 8px; color: #2ABFBF; }
    p { font-size: 14px; color: #B0CBE0; margin: 0 0 24px; }
    input { width: 100%; padding: 12px; border: 1px solid #1E6080; background: #0F3A52; color: #fff; border-radius: 6px; font-size: 14px; margin-bottom: 16px; box-sizing: border-box; }
    button { background: #2ABFBF; color: #000; font-weight: 700; padding: 12px 32px; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
    button:hover { background: #35d4d4; }
  </style>
</head>
<body>
  <div class="card">
    <h1>APEX</h1>
    <p>Connect Tableau to your programme data</p>
    <input id="progId" type="text" placeholder="Programme ID (e.g. ihg-pe)" />
    <button id="submit">Connect</button>
  </div>
</body>
</html>`);
});

// Schema helper — infer Tableau column types from data
function getTableauSchema(rows) {
  if (!rows.length) return [];
  const allKeys = [...new Set(rows.flatMap(r => Object.keys(r)))];
  return allKeys.map(k => {
    const sample = rows.find(r => r[k] != null)?.[k];
    let dataType = "string";
    if (typeof sample === "number") dataType = Number.isInteger(sample) ? "int" : "float";
    else if (sample instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(String(sample))) dataType = "date";
    return { id: k.replace(/[^a-zA-Z0-9_]/g, "_"), alias: k, dataType: "tableau.dataTypeEnum." + dataType };
  });
}

// ── Data Gap Detection ─────────────────────────────────────────────────────

// Analyse what's missing across all KPIs for a programme
app.get("/api/programmes/:programmeId/gaps", (req, res) => {
  const db = getDB();
  const kpis = db.prepare("SELECT * FROM kpi_definitions WHERE programme_id = ?").all(req.params.programmeId);

  const gaps = [];

  for (const kpi of kpis) {
    if (!kpi.source_table_id) {
      gaps.push({ kpi: kpi.name, domain: kpi.domain, panel: kpi.panel, type: "no_source", message: `No data source linked to "${kpi.name}"`, severity: "high" });
      continue;
    }

    const rows = db.prepare("SELECT row_data FROM data_rows WHERE table_id = ?").all(kpi.source_table_id);
    const data = rows.map(r => JSON.parse(r.row_data));

    if (!data.length) {
      gaps.push({ kpi: kpi.name, domain: kpi.domain, panel: kpi.panel, type: "empty_table", message: `Source table exists but has no data`, severity: "high" });
      continue;
    }

    // Check for missing time periods
    if (kpi.time_column) {
      const timePeriods = [...new Set(data.map(r => r[kpi.time_column]).filter(Boolean))].sort();
      const latestPeriod = timePeriods[timePeriods.length - 1];
      const table = db.prepare("SELECT updated_at FROM data_tables WHERE id = ?").get(kpi.source_table_id);
      const daysSinceUpdate = table ? Math.floor((Date.now() - new Date(table.updated_at).getTime()) / 86400000) : null;

      if (daysSinceUpdate && daysSinceUpdate > 45) {
        gaps.push({ kpi: kpi.name, domain: kpi.domain, panel: kpi.panel, type: "stale_data", message: `Last updated ${daysSinceUpdate} days ago (latest period: ${latestPeriod})`, severity: daysSinceUpdate > 90 ? "high" : "medium" });
      }

      // Check for dimension coverage gaps
      const dims = JSON.parse(kpi.dimension_columns || "[]");
      for (const dim of dims) {
        if (dim === kpi.time_column) continue;
        const dimValues = [...new Set(data.map(r => r[dim]).filter(Boolean))];
        const lastPeriodData = data.filter(r => r[kpi.time_column] === latestPeriod);
        const lastPeriodDims = [...new Set(lastPeriodData.map(r => r[dim]).filter(Boolean))];
        const missingInLatest = dimValues.filter(v => !lastPeriodDims.includes(v));

        if (missingInLatest.length) {
          gaps.push({ kpi: kpi.name, domain: kpi.domain, panel: kpi.panel, type: "missing_dimension", message: `${dim} values missing in ${latestPeriod}: ${missingInLatest.join(", ")}`, severity: "medium", detail: { dimension: dim, period: latestPeriod, missing: missingInLatest } });
        }
      }
    }

    // Check for null values in the value column
    if (kpi.value_column) {
      const nullCount = data.filter(r => r[kpi.value_column] == null).length;
      if (nullCount > 0) {
        gaps.push({ kpi: kpi.name, domain: kpi.domain, panel: kpi.panel, type: "null_values", message: `${nullCount} of ${data.length} rows have null values for ${kpi.value_column}`, severity: nullCount / data.length > 0.2 ? "high" : "low" });
      }
    }
  }

  // Also check for KPIs defined in the metric domains but not in kpi_definitions
  const programme = db.prepare("SELECT data FROM programmes WHERE id = ?").get(req.params.programmeId);
  if (programme) {
    const pData = JSON.parse(programme.data);
    const domains = pData.metricDomains || {};
    for (const [domId, dom] of Object.entries(domains)) {
      for (const [panelId, panel] of Object.entries(dom.panels || {})) {
        for (const tab of panel.tabs || []) {
          if (tab.status === "gap") {
            gaps.push({ kpi: tab.label, domain: domId, panel: panelId, type: "not_tracked", message: tab.description || "Not currently tracked", severity: "medium" });
          }
        }
      }
    }
  }

  db.close();

  // Sort: high severity first
  const order = { high: 0, medium: 1, low: 2 };
  gaps.sort((a, b) => (order[a.severity] ?? 99) - (order[b.severity] ?? 99));

  res.json({ gaps, totalGaps: gaps.length, byDomain: groupBy(gaps, "domain"), bySeverity: groupBy(gaps, "severity"), checkedAt: new Date().toISOString() });
});

function groupBy(arr, key) {
  const out = {};
  for (const item of arr) { const k = item[key] || "unknown"; if (!out[k]) out[k] = []; out[k].push(item); }
  return out;
}

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
  startScheduler();
});
