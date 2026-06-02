const Database = require("better-sqlite3");
const db = new Database("/workspaces/claude/data/apex.db");

const auth = db.prepare("SELECT * FROM microsoft_auth WHERE status='connected'").get();
const src = db.prepare("SELECT * FROM data_sources LIMIT 1").get();
const config = JSON.parse(src.config);

const encoded = "u!" + Buffer.from(config.shareLink).toString("base64").replace(/=/g, "").replace(/\//g, "_").replace(/\+/g, "-");
const hdrs = { Authorization: "Bearer " + auth.access_token };

async function test() {
  // Get root items
  var rootUrl = "https://graph.microsoft.com/v1.0/shares/" + encoded + "/driveItem/children";
  var r = await fetch(rootUrl, { headers: hdrs });
  var data = await r.json();
  var items = data.value || [];
  console.log("Root items:", items.length);

  // Find Sources folder
  var sources = items.find(function(f) { return f.name === "Sources"; });
  if (!sources) {
    console.log("No Sources folder found. Items:", items.map(function(f) { return f.name; }));
    db.close();
    return;
  }

  console.log("\nSources folder found:");
  console.log("  id:", sources.id);
  console.log("  driveId:", sources.parentReference && sources.parentReference.driveId);

  // Attempt 1: driveId + itemId
  var driveId = sources.parentReference && sources.parentReference.driveId;
  if (driveId) {
    console.log("\n--- Attempt 1: drives/{driveId}/items/{id}/children ---");
    var url1 = "https://graph.microsoft.com/v1.0/drives/" + driveId + "/items/" + sources.id + "/children";
    console.log("URL:", url1);
    var r1 = await fetch(url1, { headers: hdrs });
    console.log("Status:", r1.status);
    if (r1.ok) {
      var d1 = await r1.json();
      console.log("Items:", (d1.value || []).length);
      (d1.value || []).slice(0, 10).forEach(function(f) {
        var type = f.folder ? "FOLDER" : f.file ? "FILE" : f.remoteItem ? "SHORTCUT" : "OTHER";
        console.log("  " + type + ": " + f.name);
      });
    } else {
      var body1 = await r1.text();
      console.log("Error:", body1.slice(0, 300));
    }
  }

  // Attempt 2: shares path-based
  console.log("\n--- Attempt 2: shares/{encoded}/driveItem:/Sources:/children ---");
  var url2 = "https://graph.microsoft.com/v1.0/shares/" + encoded + "/driveItem:/Sources:/children";
  console.log("URL:", url2);
  var r2 = await fetch(url2, { headers: hdrs });
  console.log("Status:", r2.status);
  if (r2.ok) {
    var d2 = await r2.json();
    console.log("Items:", (d2.value || []).length);
    (d2.value || []).slice(0, 10).forEach(function(f) {
      var type = f.folder ? "FOLDER" : f.file ? "FILE" : f.remoteItem ? "SHORTCUT" : "OTHER";
      console.log("  " + type + ": " + f.name);
    });
  } else {
    var body2 = await r2.text();
    console.log("Error:", body2.slice(0, 300));
  }

  // Attempt 3: shares with encoded path
  console.log("\n--- Attempt 3: shares/{encoded}/driveItem:/" + encodeURIComponent("Sources") + ":/children ---");
  var url3 = "https://graph.microsoft.com/v1.0/shares/" + encoded + "/driveItem:/" + encodeURIComponent("Sources") + ":/children";
  console.log("URL:", url3);
  var r3 = await fetch(url3, { headers: hdrs });
  console.log("Status:", r3.status);
  if (r3.ok) {
    var d3 = await r3.json();
    console.log("Items:", (d3.value || []).length);
    (d3.value || []).slice(0, 10).forEach(function(f) {
      var type = f.folder ? "FOLDER" : f.file ? "FILE" : f.remoteItem ? "SHORTCUT" : "OTHER";
      console.log("  " + type + ": " + f.name);
    });
  } else {
    var body3 = await r3.text();
    console.log("Error:", body3.slice(0, 300));
  }

  db.close();
}

test().catch(function(e) { console.log("Fatal:", e.message); db.close(); });
