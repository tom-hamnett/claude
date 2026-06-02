const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const db = new Database("/workspaces/claude/data/apex.db");

// Get Claude API key
var engine = db.prepare("SELECT * FROM llm_engines WHERE provider = 'anthropic' LIMIT 1").get();
if (!engine || !engine.api_key) {
  console.log("No Anthropic engine configured. Add one in Settings → AI Engines first.");
  db.close();
  process.exit(1);
}
var API_KEY = engine.api_key;
var MODEL = engine.model_name || "claude-sonnet-4-20250514";

// Get pending docs
var pending = db.prepare(
  "SELECT dsf.*, ds.programme_id FROM data_source_files dsf JOIN data_sources ds ON ds.id = dsf.source_id WHERE dsf.status = 'pending' ORDER BY dsf.filename"
).all();

var docs = pending.filter(function(f) { return /\.(pptx|pdf|docx|doc|odt|odp|ods)$/i.test(f.filename); });
var excel = pending.filter(function(f) { return /\.(xlsx|xls|csv)$/i.test(f.filename); });

console.log("Total pending:", pending.length);
console.log("Documents to process with Claude:", docs.length);
console.log("Excel (need SmartUpload):", excel.length);
console.log("API cost estimate: ~$" + (docs.length * 0.08).toFixed(2) + "\n");

var tmpDir = "/workspaces/claude/uploads/tmp-bulk";
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

// Basic text extraction fallback
var officeParserMod;
try { officeParserMod = require("officeparser"); } catch (e) {}
var AdmZip = require("adm-zip");

function extractRawText(filePath) {
  if (!officeParserMod) return Promise.resolve("");
  return new Promise(function(resolve) {
    officeParserMod.parseOffice(filePath, function(data, err) {
      if (err) resolve("");
      else resolve(typeof data === "string" ? data : data ? String(data) : "");
    });
  });
}

function extractSlideXml(filePath) {
  try {
    var zip = new AdmZip(filePath);
    var entries = zip.getEntries();
    var slides = [];
    entries.forEach(function(e) {
      if (e.entryName.match(/ppt\/slides\/slide\d+\.xml/) ||
          e.entryName.match(/ppt\/notesSlides\//) ||
          e.entryName.match(/word\/document\.xml/) ||
          e.entryName.match(/word\/header/) ||
          e.entryName.match(/word\/footer/)) {
        // Strip XML tags, keep only text content
        var raw = e.getData().toString("utf-8");
        var text = raw.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#xD;/g, "\n").replace(/\s+/g, " ").trim();
        if (text.length > 10) slides.push({ name: e.entryName, text: text });
      }
    });
    return slides.map(function(s) { return "--- " + s.name + " ---\n" + s.text; }).join("\n\n");
  } catch (e) {
    return "";
  }
}

async function callClaude(messages) {
  var r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      messages: messages
    })
  });
  if (!r.ok) {
    var body = await r.text();
    throw new Error("Claude API " + r.status + ": " + body.slice(0, 300));
  }
  var data = await r.json();
  return data.content && data.content[0] ? data.content[0].text : "";
}

async function processFile(f) {
  var tempPath = path.join(tmpDir, f.filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
  var ext = path.extname(f.filename).toLowerCase();

  try {
    // Download
    var r = await fetch(f.download_url);
    if (!r.ok) throw new Error("Download failed: " + r.status);
    var buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(tempPath, buf);

    var text;

    if (ext === ".pdf") {
      // Send PDF directly to Claude
      text = await callClaude([{
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") }
          },
          {
            type: "text",
            text: "Extract ALL content from this document. Include every heading, paragraph, bullet point, table entry, number, and date. Use markdown formatting. Do not summarize — extract everything."
          }
        ]
      }]);
    } else {
      // PPTX/DOCX: try officeparser first, fall back to raw XML extraction
      var rawText = await extractRawText(tempPath);
      if (!rawText || rawText.trim().length < 50) {
        // officeparser failed — extract raw XML from the ZIP and let Claude parse it
        rawText = extractSlideXml(tempPath);
        if (!rawText || rawText.trim().length < 100) {
          console.log("  SKIP: " + f.filename + " (no extractable content)");
          db.prepare("UPDATE data_source_files SET status = 'skipped' WHERE id = ?").run(f.id);
          return;
        }
        console.log("  (extracted " + rawText.length + " chars of clean text from XML)");
        text = await callClaude([{
          role: "user",
          content: 'Below is text extracted from "' + f.filename + '" (' + ext + '). Organize by slide/section using markdown. Preserve ALL data, numbers, names, dates, RAG statuses, project names, and table entries.\n\n' + rawText.slice(0, 80000)
        }]);
      } else {
        text = await callClaude([{
          role: "user",
          content: 'Text from "' + f.filename + '" (' + ext + '). Organize using markdown. Preserve ALL data, numbers, names, dates, RAG statuses.\n\n' + rawText.slice(0, 80000)
        }]);
      }
    }

    if (!text || text.trim().length === 0) {
      console.log("  EMPTY: " + f.filename);
      db.prepare("UPDATE data_source_files SET status = 'skipped' WHERE id = ?").run(f.id);
      return;
    }

    // Store
    var docId = "dtxt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    var existing = db.prepare("SELECT id FROM document_texts WHERE source_file_id = ?").get(f.id);
    if (existing) {
      db.prepare("UPDATE document_texts SET extracted_text = ?, char_count = ?, file_type = ?, updated_at = datetime('now') WHERE id = ?")
        .run(text, text.length, ext, existing.id);
    } else {
      db.prepare("INSERT INTO document_texts (id, programme_id, source_file_id, filename, file_type, extracted_text, char_count) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(docId, f.programme_id, f.id, f.filename, ext, text, text.length);
    }

    db.prepare("UPDATE data_source_files SET status = 'ingested', last_ingested_at = datetime('now') WHERE id = ?").run(f.id);
    console.log("  OK: " + f.filename + " (" + text.length + " chars)");
  } catch (e) {
    console.log("  FAIL: " + f.filename + " — " + e.message.slice(0, 200));
  } finally {
    try { fs.unlinkSync(tempPath); } catch (_) {}
  }
}

async function run() {
  console.log("--- Processing " + docs.length + " documents via Claude ---\n");
  for (var i = 0; i < docs.length; i++) {
    console.log("[" + (i + 1) + "/" + docs.length + "]");
    await processFile(docs[i]);
    // Wait 20 seconds between requests to stay under rate limits
    if (i < docs.length - 1) {
      process.stdout.write("  waiting 20s for rate limit...\r");
      await new Promise(function(r) { setTimeout(r, 20000); });
    }
  }

  // Now auto-ingest Excel files as structured data tables
  if (excel.length > 0) {
    console.log("\n--- Processing " + excel.length + " Excel files ---\n");
    var XLSX = require("xlsx");
    for (var j = 0; j < excel.length; j++) {
      var ef = excel[j];
      var ePath = path.join(tmpDir, ef.filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
      try {
        console.log("[" + (j + 1) + "/" + excel.length + "]");
        var er = await fetch(ef.download_url);
        if (!er.ok) throw new Error("Download failed: " + er.status);
        var eBuf = Buffer.from(await er.arrayBuffer());
        fs.writeFileSync(ePath, eBuf);

        var eExt = path.extname(ef.filename).toLowerCase();
        var workbook;
        if (eExt === ".csv") {
          workbook = XLSX.read(eBuf.toString("utf-8"), { type: "string" });
        } else {
          workbook = XLSX.read(eBuf, { type: "buffer" });
        }

        var sheetName = workbook.SheetNames[0];
        var sheet = workbook.Sheets[sheetName];
        var raw = XLSX.utils.sheet_to_json(sheet, { defval: null });

        if (!raw.length) {
          console.log("  SKIP: " + ef.filename + " (empty sheet)");
          db.prepare("UPDATE data_source_files SET status = 'skipped' WHERE id = ?").run(ef.id);
          continue;
        }

        var colNames = Object.keys(raw[0]);
        var columns = colNames.map(function(name) {
          var values = raw.map(function(r) { return r[name]; }).filter(function(v) { return v != null; });
          var nums = 0; values.slice(0, 100).forEach(function(v) { if (typeof v === "number" || !isNaN(Number(v))) nums++; });
          var type = nums > values.length * 0.5 ? "number" : "string";
          var uniq = new Set(values.map(String)).size;
          var isDim = type === "string" && uniq <= Math.min(50, values.length * 0.3);
          return { name: name, type: type, isDimension: isDim, label: name };
        });

        var tableId = "dt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
        var tableName = ef.filename.replace(/\.[^.]+$/, "").split("/").pop();

        db.prepare("INSERT INTO data_tables (id, programme_id, name, description, columns_meta, row_count, version) VALUES (?, ?, ?, ?, ?, ?, 1)").run(
          tableId, ef.programme_id, tableName, "Auto-ingested from " + ef.filename, JSON.stringify(columns), raw.length
        );

        var insertRow = db.prepare("INSERT INTO data_rows (table_id, row_data) VALUES (?, ?)");
        var insertMany = db.transaction(function(rows) { rows.forEach(function(row) { insertRow.run(tableId, JSON.stringify(row)); }); });
        insertMany(raw);

        db.prepare("UPDATE data_source_files SET status = 'ingested', last_ingested_at = datetime('now'), target_table_id = ? WHERE id = ?").run(tableId, ef.id);
        console.log("  OK: " + ef.filename + " (" + raw.length + " rows, " + colNames.length + " columns, sheet: " + sheetName + ")");
      } catch (e) {
        console.log("  FAIL: " + ef.filename + " — " + e.message.slice(0, 200));
      } finally {
        try { fs.unlinkSync(ePath); } catch (_) {}
      }
    }
  }

  var ingested = db.prepare("SELECT COUNT(*) as c FROM document_texts").get();
  var tables = db.prepare("SELECT COUNT(*) as c FROM data_tables").get();
  console.log("\n--- Done ---");
  console.log("Documents in AI library:", ingested ? ingested.c : 0);
  console.log("Data tables:", tables ? tables.c : 0);

  try { fs.rmdirSync(tmpDir); } catch (_) {}
  db.close();
}

run().catch(function(e) { console.log("Fatal:", e.message); db.close(); });
