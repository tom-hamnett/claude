const Database = require("better-sqlite3");
const db = new Database("/workspaces/claude/data/apex.db");

const auth = db.prepare("SELECT * FROM microsoft_auth WHERE status='connected'").get();
const src = db.prepare("SELECT * FROM data_sources LIMIT 1").get();
const config = JSON.parse(src.config);

console.log("Source:", src.name, "| Type:", src.type);
console.log("Recursive:", config.recursive);
console.log("FileTypes:", config.fileTypes);
console.log("Token:", auth ? "YES" : "NO");

const encoded = "u!" + Buffer.from(config.shareLink).toString("base64").replace(/=/g, "").replace(/\//g, "_").replace(/\+/g, "-");
const url = "https://graph.microsoft.com/v1.0/shares/" + encoded + "/driveItem/children";

fetch(url, { headers: { Authorization: "Bearer " + auth.access_token } })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.error) {
      console.log("ERROR:", JSON.stringify(data.error, null, 2));
      return;
    }
    console.log("\nItems in root:", (data.value || []).length);
    (data.value || []).forEach(function(f) {
      var type = f.folder ? "FOLDER" : f.file ? "FILE" : f.remoteItem ? "SHORTCUT" : "OTHER";
      console.log("  " + type + ": " + f.name + " (size: " + (f.size || 0) + ")");
    });
  })
  .catch(function(e) { console.log("Fetch error:", e.message); })
  .finally(function() { db.close(); });
