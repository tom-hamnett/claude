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

function extractRawText(filePath) {
  if (!officeParserMod) return Promise.resolve("");
  return new Promise(function(resolve) {
    officeParserMod.parseOffice(filePath, function(data, err) {
      if (err) resolve("");
      else resolve(typeof data === "string" ? data : data ? String(data) : "");
    });
  });
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
      // PPTX/DOCX: extract raw text, then have Claude structure it
      var rawText = await extractRawText(tempPath);
      if (!rawText || rawText.trim().length < 50) {
        console.log("  SKIP: " + f.filename + " (no extractable text)");
        db.prepare("UPDATE data_source_files SET status = 'skipped' WHERE id = ?").run(f.id);
        return;
      }
      text = await callClaude([{
        role: "user",
        content: 'This is raw text extracted from "' + f.filename + '" (' + ext + ' file). Organize and structure this content using markdown. Preserve ALL data, numbers, names, dates, RAG statuses, and details. If it\'s a presentation, organize by slide.\n\nRaw text:\n\n' + rawText.slice(0, 100000)
      }]);
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
    // Small delay to avoid rate limits
    if (i < docs.length - 1) await new Promise(function(r) { setTimeout(r, 500); });
  }

  var ingested = db.prepare("SELECT COUNT(*) as c FROM document_texts").get();
  console.log("\n--- Done ---");
  console.log("Documents in AI library:", ingested ? ingested.c : 0);
  console.log("Excel files still pending:", excel.length);

  try { fs.rmdirSync(tmpDir); } catch (_) {}
  db.close();
}

run().catch(function(e) { console.log("Fatal:", e.message); db.close(); });
