// Smart ingestion pipeline: AI analysis, template matching, gap detection, versioning
import { getDB } from "./db.js";
import { parseFile, diffTables } from "./dataParser.js";

// Pre-defined templates for IHG PE metrics
export const IHG_TEMPLATES = [
  {
    id: "tpl-crf-monthly", name: "CRF Monthly Tracking",
    description: "Monthly CRF eligible and collection by region",
    requiredColumns: [
      { name: "Month", type: "string", role: "time" },
      { name: "Region", type: "string", role: "dimension" },
      { name: "CRF_Eligible_Mn", type: "number", role: "value", unit: "$M" },
    ],
    optionalColumns: [
      { name: "CRF_Collected_Mn", type: "number", role: "value", unit: "$M" },
      { name: "Avg_Pct_CRF", type: "number", role: "value", unit: "%" },
    ],
    expectedDimensions: { Region: ["AMER", "EMEAA", "GC"], Month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] },
    domain: "hotel", panel: "value",
  },
  {
    id: "tpl-cmh-p2p", name: "CMH P2P Rollout",
    description: "Monthly CMH P2P systems deployed by region with estate coverage",
    requiredColumns: [
      { name: "Month", type: "string", role: "time" },
      { name: "Region", type: "string", role: "dimension" },
      { name: "Systems_Deployed", type: "number", role: "value", unit: "#" },
    ],
    optionalColumns: [
      { name: "Estate_Coverage_Pct", type: "number", role: "value", unit: "%" },
    ],
    expectedDimensions: { Region: ["GC", "EMEAA", "AMER"] },
    domain: "hotel", panel: "enablement",
  },
  {
    id: "tpl-franchise-p2p", name: "Franchise P2P Rollout",
    description: "Monthly Franchise P2P systems by region with estate coverage",
    requiredColumns: [
      { name: "Month", type: "string", role: "time" },
      { name: "Region", type: "string", role: "dimension" },
      { name: "Systems_Deployed", type: "number", role: "value", unit: "#" },
    ],
    optionalColumns: [
      { name: "Estate_Coverage_Pct", type: "number", role: "value", unit: "%" },
      { name: "Priority_Market_Pct", type: "number", role: "value", unit: "%" },
    ],
    expectedDimensions: { Region: ["GC", "EMEAA", "AMER"] },
    domain: "hotel", panel: "enablement",
  },
  {
    id: "tpl-crf-per-p2p", name: "CRF per P2P Platform",
    description: "CRF dollars per deployed platform by region",
    requiredColumns: [
      { name: "Month", type: "string", role: "time" },
      { name: "Region", type: "string", role: "dimension" },
      { name: "CRF_per_Platform_Dollar", type: "number", role: "value", unit: "$" },
    ],
    optionalColumns: [],
    expectedDimensions: { Region: ["AMER", "EMEAA", "GC"] },
    domain: "hotel", panel: "performance",
  },
  {
    id: "tpl-csat", name: "CSAT Scores",
    description: "Monthly customer satisfaction scores vs target",
    requiredColumns: [
      { name: "Month", type: "string", role: "time" },
      { name: "CSAT_Score", type: "number", role: "value", unit: "score" },
    ],
    optionalColumns: [
      { name: "Target", type: "number", role: "value", unit: "score" },
      { name: "Response_Rate", type: "number", role: "value", unit: "%" },
    ],
    expectedDimensions: {},
    domain: "corporate", panel: "value",
  },
  {
    id: "tpl-sc-projects", name: "S&C Projects Completed",
    description: "Monthly S&C projects completed count",
    requiredColumns: [
      { name: "Month", type: "string", role: "time" },
      { name: "Projects_Completed", type: "number", role: "value", unit: "#" },
    ],
    optionalColumns: [],
    expectedDimensions: {},
    domain: "corporate", panel: "enablement",
  },
  {
    id: "tpl-headcount", name: "Ops Headcount",
    description: "Monthly operations headcount by location",
    requiredColumns: [
      { name: "Month", type: "string", role: "time" },
      { name: "Total_HC", type: "number", role: "value", unit: "#" },
      { name: "Filled", type: "number", role: "value", unit: "#" },
    ],
    optionalColumns: [
      { name: "IND", type: "number", role: "value", unit: "#" },
      { name: "Open_Roles", type: "number", role: "value", unit: "#" },
    ],
    expectedDimensions: {},
    domain: "corporate", panel: "enablement",
  },
  {
    id: "tpl-esm", name: "ESM Coverage",
    description: "Enterprise Supplier Management coverage across rating bodies",
    requiredColumns: [
      { name: "Body", type: "string", role: "dimension" },
      { name: "Metric", type: "string", role: "dimension" },
      { name: "Value", type: "number", role: "value" },
    ],
    optionalColumns: [
      { name: "Ambition_Gap", type: "number", role: "value" },
    ],
    expectedDimensions: { Body: ["Rapid Ratings", "EcoVadis", "Sedex"] },
    domain: "function", panel: "performance",
  },
];

// Analyze an uploaded file: identify type, match template, find gaps, check versions
export function analyzeUpload(programmeId, filePath, originalName) {
  const parsed = parseFile(filePath, originalName);
  const db = getDB();

  // Load all templates for this programme + global ones
  const templates = db.prepare("SELECT * FROM data_templates WHERE programme_id = ?").all(programmeId)
    .map(t => ({ ...t, requiredColumns: JSON.parse(t.required_columns), optionalColumns: JSON.parse(t.optional_columns || "[]"), expectedDimensions: JSON.parse(t.expected_dimensions || "{}") }));

  // Match template by column overlap
  const templateMatches = templates.map(tpl => {
    const reqNames = tpl.requiredColumns.map(c => c.name.toLowerCase());
    const parsedNames = parsed.columns.map(c => c.name.toLowerCase());
    const matchedReq = reqNames.filter(n => parsedNames.includes(n));
    const matchPct = reqNames.length ? (matchedReq.length / reqNames.length) * 100 : 0;
    const missingReq = tpl.requiredColumns.filter(c => !parsedNames.includes(c.name.toLowerCase()));
    const optNames = (tpl.optionalColumns || []).map(c => c.name.toLowerCase());
    const missingOpt = (tpl.optionalColumns || []).filter(c => !parsedNames.includes(c.name.toLowerCase()));
    const presentOpt = (tpl.optionalColumns || []).filter(c => parsedNames.includes(c.name.toLowerCase()));
    const extraCols = parsed.columns.filter(c => !reqNames.includes(c.name.toLowerCase()) && !optNames.includes(c.name.toLowerCase()));
    return { template: tpl, matchPct, matchedReq, missingReq, missingOpt, presentOpt, extraCols };
  }).filter(m => m.matchPct > 40).sort((a, b) => b.matchPct - a.matchPct);

  // Check for existing tables with matching structure
  const existingTables = db.prepare("SELECT id, name, columns_meta, row_count, version FROM data_tables WHERE programme_id = ? ORDER BY created_at DESC").all(programmeId);
  const versionMatches = existingTables.map(et => {
    const etCols = JSON.parse(et.columns_meta).map(c => c.name.toLowerCase());
    const parsedNames = parsed.columns.map(c => c.name.toLowerCase());
    const overlap = etCols.filter(n => parsedNames.includes(n));
    const overlapPct = etCols.length ? (overlap.length / etCols.length) * 100 : 0;

    let diff = null;
    if (overlapPct > 60) {
      const oldRows = db.prepare("SELECT row_data FROM data_rows WHERE table_id = ?").all(et.id).map(r => JSON.parse(r.row_data));
      diff = diffTables(oldRows, parsed.rows);
    }

    return { table: et, overlapPct, overlap, diff };
  }).filter(m => m.overlapPct > 60).sort((a, b) => b.overlapPct - a.overlapPct);

  // Check for gap-fill opportunities from other tables
  const gapFills = [];
  if (templateMatches.length) {
    const bestTemplate = templateMatches[0];
    for (const missing of bestTemplate.missingOpt) {
      // Check if this column exists in any other table
      for (const et of existingTables) {
        const etCols = JSON.parse(et.columns_meta);
        const match = etCols.find(c => c.name.toLowerCase() === missing.name.toLowerCase());
        if (match) {
          gapFills.push({
            column: missing.name,
            sourceTable: et.name,
            sourceTableId: et.id,
            type: "join",
            description: `"${missing.name}" exists in table "${et.name}" and could be joined`,
          });
          break;
        }
      }
    }
  }

  db.close();

  return {
    parsed: {
      columns: parsed.columns,
      rowCount: parsed.rowCount,
      sampleRows: parsed.rows.slice(0, 5),
      sheetUsed: parsed.sheetUsed,
      sheetNames: parsed.sheetNames,
    },
    templateMatch: templateMatches[0] || null,
    allTemplateMatches: templateMatches,
    versionMatch: versionMatches[0] || null,
    allVersionMatches: versionMatches,
    gapFills,
    suggestions: {
      isUpdate: !!(versionMatches[0]?.overlapPct > 80),
      suggestedName: versionMatches[0]?.table?.name || templateMatches[0]?.template?.name || originalName.replace(/\.[^.]+$/, ""),
      templateId: templateMatches[0]?.template?.id || null,
    },
  };
}

// Seed templates into DB
export function seedTemplates(programmeId) {
  const db = getDB();
  const existing = db.prepare("SELECT COUNT(*) as c FROM data_templates WHERE programme_id = ?").get(programmeId);
  if (existing.c > 0) { db.close(); return; }

  const insert = db.prepare("INSERT INTO data_templates (id, programme_id, name, description, required_columns, optional_columns, expected_dimensions, domain, panel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
  for (const t of IHG_TEMPLATES) {
    insert.run(t.id, programmeId, t.name, t.description, JSON.stringify(t.requiredColumns), JSON.stringify(t.optionalColumns), JSON.stringify(t.expectedDimensions), t.domain, t.panel);
  }
  console.log("[seed] Seeded", IHG_TEMPLATES.length, "data templates.");
  db.close();
}
