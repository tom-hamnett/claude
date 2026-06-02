const Database = require("better-sqlite3");
const db = new Database("/workspaces/claude/data/apex.db");

// Get all pending files
const pending = db.prepare(`
  SELECT dsf.*, ds.programme_id, ds.name as source_name
  FROM data_source_files dsf
  JOIN data_sources ds ON ds.id = dsf.source_id
  WHERE dsf.status = 'pending'
  ORDER BY dsf.filename
`).all();

console.log("Pending files:", pending.length);

// Categorize
const excel = pending.filter(function(f) { return /\.(xlsx|xls|csv)$/i.test(f.filename); });
const docs = pending.filter(function(f) { return /\.(pptx|pdf|docx|doc)$/i.test(f.filename); });
const other = pending.filter(function(f) {
  return !/\.(xlsx|xls|csv|pptx|pdf|docx|doc)$/i.test(f.filename);
});

console.log("\nBreakdown:");
console.log("  Excel/CSV (structured data):", excel.length);
excel.forEach(function(f) { console.log("    " + f.filename); });
console.log("  Documents (text extraction):", docs.length);
docs.forEach(function(f) { console.log("    " + f.filename); });
console.log("  Other:", other.length);
other.forEach(function(f) { console.log("    " + f.filename); });

db.close();
console.log("\nTo bulk-ingest all documents, run: node bulk-ingest.cjs");
