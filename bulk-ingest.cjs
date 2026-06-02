const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const db = new Database("/workspaces/claude/data/apex.db");

const pending = db.prepare(
  "SELECT dsf.*, ds.programme_id FROM data_source_files dsf JOIN data_sources ds ON ds.id = dsf.source_id WHERE dsf.status = 'pending' ORDER BY dsf.filename"
).all();

console.log("Total pending:", pending.length);
if (pending.length === 0) { console.log("Nothing to ingest."); db.close(); process.exit(0); }

// Categorize
var docs = pending.filter(function(f) { return /\.(pptx|pdf|docx|doc|odt|odp|ods)$/i.test(f.filename); });
var excel = pending.filter(function(f) { return /\.(xlsx|xls|csv)$/i.test(f.filename); });
var other = pending.filter(function(f) {
  return !/\.(pptx|pdf|docx|doc|odt|odp|ods|xlsx|xls|csv)$/i.test(f.filename);
});

console.log("Documents to extract:", docs.length);
console.log("Excel/CSV (need manual SmartUpload):", excel.length);
console.log("Other/unsupported:", other.length);
console.log("");

var tmpDir = "/workspaces/claude/uploads/tmp-bulk";
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

async function ingestDoc(f) {
  var tempPath = path.join(tmpDir, f.filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
  try {
    // Download
    var r = await fetch(f.download_url);
    if (!r.ok) throw new Error("Download failed: " + r.status);
    var buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(tempPath, buf);

    // Extract text
    var officeParser = require("officeparser");
    var text = await officeParser.parseOfficeAsync(tempPath);
    if (!text || text.trim().length === 0) {
      console.log("  EMPTY: " + f.filename + " (no text extracted)");
      db.prepare("UPDATE data_source_files SET status = 'skipped' WHERE id = ?").run(f.id);
      return;
    }

    // Store in document_texts
    var docId = "dtxt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    var ext = path.extname(f.filename).toLowerCase();
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
    console.log("  FAIL: " + f.filename + " — " + e.message);
  } finally {
    try { fs.unlinkSync(tempPath); } catch (_) {}
  }
}

async function run() {
  console.log("--- Extracting text from " + docs.length + " documents ---\n");
  for (var i = 0; i < docs.length; i++) {
    console.log("[" + (i + 1) + "/" + docs.length + "]");
    await ingestDoc(docs[i]);
  }

  // Count results
  var ingested = db.prepare("SELECT COUNT(*) as c FROM document_texts WHERE programme_id = ?").get(docs[0] ? docs[0].programme_id : "");
  console.log("\n--- Done ---");
  console.log("Documents in library:", ingested ? ingested.c : 0);
  console.log("Excel files still pending (use SmartUpload in the UI):", excel.length);

  // Clean up
  try { fs.rmdirSync(tmpDir); } catch (_) {}
  db.close();
}

run().catch(function(e) { console.log("Fatal:", e.message); db.close(); });
