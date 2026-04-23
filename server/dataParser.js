// Parse Excel (.xlsx, .xls) and CSV files into structured rows + column metadata.
import XLSX from "xlsx";
import fs from "fs";

export function parseFile(filePath, originalName) {
  const ext = originalName.toLowerCase().split(".").pop();
  const buf = fs.readFileSync(filePath);
  let workbook;

  if (ext === "csv") {
    const text = buf.toString("utf-8");
    workbook = XLSX.read(text, { type: "string" });
  } else {
    workbook = XLSX.read(buf, { type: "buffer" });
  }

  // Use first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: null });

  if (!raw.length) return { columns: [], rows: [], rowCount: 0, sheetNames: workbook.SheetNames };

  // Detect column types and dimensions
  const colNames = Object.keys(raw[0]);
  const columns = colNames.map(name => {
    const values = raw.map(r => r[name]).filter(v => v != null);
    const type = detectType(values);
    const uniqueCount = new Set(values.map(String)).size;
    const isDimension = type === "string" && uniqueCount <= Math.min(50, values.length * 0.3);
    const sampleValues = [...new Set(values.map(String))].slice(0, 10);
    return { name, type, isDimension, uniqueCount, sampleValues, label: name };
  });

  // Convert rows to clean objects
  const rows = raw.map(r => {
    const clean = {};
    for (const col of columns) {
      let val = r[col.name];
      if (col.type === "number" && val != null) val = Number(val) || 0;
      clean[col.name] = val;
    }
    return clean;
  });

  return {
    columns,
    rows,
    rowCount: rows.length,
    sheetNames: workbook.SheetNames,
    sheetUsed: sheetName,
  };
}

function detectType(values) {
  let numbers = 0, dates = 0, strings = 0;
  for (const v of values.slice(0, 100)) {
    if (v == null) continue;
    if (typeof v === "number") { numbers++; continue; }
    const s = String(v).trim();
    if (s === "") continue;
    if (!isNaN(Number(s))) { numbers++; continue; }
    if (/^\d{4}-\d{2}-\d{2}/.test(s) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s)) { dates++; continue; }
    strings++;
  }
  if (numbers > dates && numbers > strings) return "number";
  if (dates > strings) return "date";
  return "string";
}

// Compare two sets of rows for version diffing
export function diffTables(oldRows, newRows, keyColumns = []) {
  const changes = { added: 0, removed: 0, modified: 0, unchanged: 0, details: [] };

  if (!keyColumns.length) {
    // Simple row-count comparison if no key columns
    changes.added = Math.max(0, newRows.length - oldRows.length);
    changes.removed = Math.max(0, oldRows.length - newRows.length);
    changes.unchanged = Math.min(oldRows.length, newRows.length);

    // Compare overlapping rows
    for (let i = 0; i < Math.min(oldRows.length, newRows.length); i++) {
      const oldStr = JSON.stringify(oldRows[i]);
      const newStr = JSON.stringify(newRows[i]);
      if (oldStr !== newStr) {
        changes.modified++;
        changes.unchanged--;
        const rowChanges = {};
        for (const key of Object.keys(newRows[i])) {
          if (JSON.stringify(oldRows[i][key]) !== JSON.stringify(newRows[i][key])) {
            rowChanges[key] = { from: oldRows[i][key], to: newRows[i][key] };
          }
        }
        if (Object.keys(rowChanges).length && changes.details.length < 20) {
          changes.details.push({ row: i, changes: rowChanges });
        }
      }
    }
  }

  return changes;
}

// Parse all sheets from a workbook
export function parseAllSheets(filePath, originalName) {
  const ext = originalName.toLowerCase().split(".").pop();
  const buf = fs.readFileSync(filePath);
  let workbook;

  if (ext === "csv") {
    workbook = XLSX.read(buf.toString("utf-8"), { type: "string" });
  } else {
    workbook = XLSX.read(buf, { type: "buffer" });
  }

  return workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name];
    const raw = XLSX.utils.sheet_to_json(sheet, { defval: null });
    return { name, rowCount: raw.length, columns: raw.length ? Object.keys(raw[0]) : [] };
  });
}
