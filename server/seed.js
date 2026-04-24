// Seed the database with IHG PE reference data from the code-based data files.
// This runs once on first start if the programme doesn't exist yet.
import { getDB } from "./db.js";
import { seedTemplates } from "./smartIngest.js";

// We import the structured data and flatten it into a single JSON blob
// that represents the full programme state.
import { IHG_PROJECTS, IHG_DEPENDENCIES, IHG_MILESTONES } from "../src/apex/data/ihgProjects.js";
import { IHG_RISKS, IHG_RISK_AGGREGATE } from "../src/apex/data/ihgRisks.js";
import { IHG_AUDIT_ACTIONS } from "../src/apex/data/ihgAudits.js";
import { METRIC_DOMAINS } from "../src/apex/data/ihgMetrics.js";
import { IHG_GAPS } from "../src/apex/data/ihgProgramme.js";

export function seedIfNeeded() {
  const db = getDB();
  const existing = db.prepare("SELECT id FROM programmes WHERE id = ?").get("ihg-pe");
  if (existing) {
    console.log("[seed] IHG PE programme already exists — skipping seed.");
    db.close();
    return;
  }

  console.log("[seed] Seeding IHG PE reference data...");

  const programme = {
    id: "ihg-pe",
    name: "Procurement Excellence",
    function: "Global Procurement",
    description: "IHG's programme of work to build the foundations of world-class procurement across Digital, Operations, Supplier Management, Responsible Procurement and PMO.",
    accessLevel: "Owner",
    mission: {
      gpMission: "Drive growth and be the trusted premier hospitality supply management partner.",
      peRemit: "Lay global foundations that drive digital enablement, procurement operations, enterprise supplier management and shared services, whilst doing business responsibly.",
      valueProposition: "Smarter solutions for your success.",
      priorities2026: [
        "Data foundation",
        "AI-enabled digital transformation",
        "Capability / capacity / scalability",
        "Resiliency and responsibility",
        "Structure and governance at pace",
      ],
      pillars: ["Digital", "Operations", "Supplier Management", "Responsible Procurement", "PMO"],
    },
    updates: [
      {
        id: "upd-2026-03",
        period: "monthly",
        date: new Date(Date.now() - 10 * 86400000).toISOString().split("T")[0],
        title: "March 2026 Monthly Programme Update",
        source: "APRIL - QBR PLT Report (ingested)",
        summary: "Programme tracking amber overall. Monthly CRF collection below target in AMER. 96 open risks (+28% count vs Feb). Catalyst policy launch on target for end March. Data Strategy roadmap due mid-April. Colleague Heartbeat action plan in flight. Audit backlog managed — 7 open <90d.",
      },
    ],
    executiveSummary: { lastGenerated: null, body: null },
    projects: IHG_PROJECTS,
    dependencies: IHG_DEPENDENCIES,
    milestones: IHG_MILESTONES,
    risks: IHG_RISKS,
    riskAggregate: IHG_RISK_AGGREGATE,
    auditActions: IHG_AUDIT_ACTIONS,
    metricDomains: METRIC_DOMAINS,
    metricDomainOrder: ["hotel", "corporate", "function"],
    gaps: IHG_GAPS,
    settings: { aiEngine: "anthropic" },
  };

  db.prepare("INSERT INTO programmes (id, data) VALUES (?, ?)").run("ihg-pe", JSON.stringify(programme));
  console.log("[seed] IHG PE seeded with", IHG_PROJECTS.length, "projects,", IHG_RISKS.length, "risks,", IHG_AUDIT_ACTIONS.length, "audit actions.");

  // Seed pre-loaded metrics data as source data tables
  seedDataTables(db);

  // Seed data templates
  db.close();
  seedTemplates("ihg-pe");
  return; // seedTemplates opens/closes its own DB connection

  db.close();
}

function seedDataTables(db) {
  const programmeId = "ihg-pe";
  const tables = buildSourceTables();
  let count = 0;

  for (const t of tables) {
    const tableId = `dt-seed-${t.id}`;
    db.prepare("INSERT INTO data_tables (id, programme_id, name, description, columns_meta, row_count, version) VALUES (?, ?, ?, ?, ?, ?, 1)").run(
      tableId, programmeId, t.name, t.description, JSON.stringify(t.columns), t.rows.length
    );
    const insert = db.prepare("INSERT INTO data_rows (table_id, row_data) VALUES (?, ?)");
    const tx = db.transaction((rows) => { for (const row of rows) insert.run(tableId, JSON.stringify(row)); });
    tx(t.rows);
    count += t.rows.length;
  }

  console.log("[seed] Seeded", tables.length, "source data tables with", count, "total rows.");
}

// Convert pre-loaded metrics data into long-format tables suitable for DataExplorer
function buildSourceTables() {
  const hotel = METRIC_DOMAINS.hotel;
  const corp = METRIC_DOMAINS.corporate;
  const fn = METRIC_DOMAINS.function;

  const tables = [];

  // CRF Collection — unpivot to (Month, Region, CRF_Eligible_Mn, Avg_Pct_CRF)
  {
    const d = hotel.panels.value.tabs.find(t => t.id === "crf").data;
    const rows = [];
    for (const m of d.eligibleByMonth) {
      for (const region of ["AMER", "EMEAA", "GC"]) {
        const avgRow = d.avgPct.find(a => a.month === m.month) || {};
        rows.push({
          Month: m.month,
          Region: region,
          CRF_Eligible_Mn: m[region],
          Avg_Pct_CRF: avgRow[region] || null,
        });
      }
    }
    tables.push({
      id: "crf-collection", name: "CRF_Collection",
      description: "Monthly CRF eligible and collection % by region (AMER/EMEAA/GC). Source for CRF Collection metric.",
      columns: [
        { name: "Month", type: "string", isDimension: true, label: "Month", sampleValues: ["Jan", "Feb", "Mar"] },
        { name: "Region", type: "string", isDimension: true, label: "Region", sampleValues: ["AMER", "EMEAA", "GC"] },
        { name: "CRF_Eligible_Mn", type: "number", isDimension: false, label: "CRF Eligible ($M)", sampleValues: [] },
        { name: "Avg_Pct_CRF", type: "number", isDimension: false, label: "Avg % CRF", sampleValues: [] },
      ],
      rows,
    });
  }

  // CRF Collected monthly
  {
    const d = hotel.panels.value.tabs.find(t => t.id === "crf").data;
    const rows = d.collected.map(c => ({ Month: c.month, CRF_Collected_Mn: c.total }));
    tables.push({
      id: "crf-collected", name: "CRF_Collected",
      description: "Monthly CRF collected totals.",
      columns: [
        { name: "Month", type: "string", isDimension: true, label: "Month", sampleValues: ["Jan", "Feb", "Mar"] },
        { name: "CRF_Collected_Mn", type: "number", isDimension: false, label: "CRF Collected ($M)", sampleValues: [] },
      ],
      rows,
    });
  }

  // CMH P2P Rollout — unpivot to (Month, Region, Systems, Estate_Pct)
  {
    const d = hotel.panels.enablement.tabs.find(t => t.id === "cmh-p2p").data;
    const rows = [];
    for (const m of d.byMonth) {
      for (const region of ["GC", "EMEAA", "AMER"]) {
        const estateRow = d.estatePct.find(e => e.month === m.month) || {};
        rows.push({
          Month: m.month,
          Region: region,
          Systems_Deployed: m[region],
          Estate_Coverage_Pct: estateRow[region] || null,
        });
      }
    }
    tables.push({
      id: "cmh-p2p", name: "CMH_P2P_Rollout",
      description: "Monthly CMH P2P systems deployed by region with estate coverage %. 2026 target: 868 systems.",
      columns: [
        { name: "Month", type: "string", isDimension: true, label: "Month", sampleValues: ["Jan", "Feb", "Mar"] },
        { name: "Region", type: "string", isDimension: true, label: "Region", sampleValues: ["GC", "EMEAA", "AMER"] },
        { name: "Systems_Deployed", type: "number", isDimension: false, label: "Systems Deployed", sampleValues: [] },
        { name: "Estate_Coverage_Pct", type: "number", isDimension: false, label: "Estate Coverage %", sampleValues: [] },
      ],
      rows,
    });
  }

  // Franchise P2P Rollout
  {
    const d = hotel.panels.enablement.tabs.find(t => t.id === "franchise-p2p").data;
    const rows = [];
    for (const m of d.byMonth) {
      for (const region of ["GC", "EMEAA", "AMER"]) {
        rows.push({
          Month: m.month,
          Region: region,
          Systems_Deployed: m[region],
        });
      }
    }
    tables.push({
      id: "franchise-p2p", name: "Franchise_P2P_Rollout",
      description: "Monthly Franchise P2P systems deployed by region. 2026 target: 772 systems (re-cut from higher).",
      columns: [
        { name: "Month", type: "string", isDimension: true, label: "Month", sampleValues: ["Jan", "Feb", "Mar"] },
        { name: "Region", type: "string", isDimension: true, label: "Region", sampleValues: ["GC", "EMEAA", "AMER"] },
        { name: "Systems_Deployed", type: "number", isDimension: false, label: "Systems Deployed", sampleValues: [] },
      ],
      rows,
    });
  }

  // CRF per P2P Platform
  {
    const d = hotel.panels.performance.tabs.find(t => t.id === "crf-per-p2p").data;
    const rows = [];
    for (const m of d.byMonth) {
      for (const region of ["AMER", "EMEAA", "GC"]) {
        rows.push({
          Month: m.month,
          Region: region,
          CRF_per_Platform_Dollar: m[region],
        });
      }
    }
    tables.push({
      id: "crf-per-p2p", name: "CRF_per_P2P_Platform",
      description: "CRF dollars per deployed P2P platform, by region and month.",
      columns: [
        { name: "Month", type: "string", isDimension: true, label: "Month", sampleValues: ["Jan", "Feb", "Mar"] },
        { name: "Region", type: "string", isDimension: true, label: "Region", sampleValues: ["AMER", "EMEAA", "GC"] },
        { name: "CRF_per_Platform_Dollar", type: "number", isDimension: false, label: "CRF/Platform ($)", sampleValues: [] },
      ],
      rows,
    });
  }

  // CSAT
  {
    const d = corp.panels.value.tabs.find(t => t.id === "csat").data;
    const rows = d.months.map(m => ({ Month: m.month, CSAT_Score: m.score, Target: d.annualTarget }));
    tables.push({
      id: "csat", name: "CSAT_Scores",
      description: "Monthly customer satisfaction scores for S&C IND/MEX teams vs annual target.",
      columns: [
        { name: "Month", type: "string", isDimension: true, label: "Month", sampleValues: ["Jan", "Feb", "Mar"] },
        { name: "CSAT_Score", type: "number", isDimension: false, label: "CSAT Score", sampleValues: [] },
        { name: "Target", type: "number", isDimension: false, label: "Annual Target", sampleValues: [] },
      ],
      rows,
    });
  }

  // S&C Projects
  {
    const d = corp.panels.enablement.tabs.find(t => t.id === "sc-projects").data;
    const rows = d.byMonth.map(m => ({ Month: m.month, Projects_Completed: m.count }));
    tables.push({
      id: "sc-projects", name: "SC_Projects_Completed",
      description: "Monthly S&C projects completed count.",
      columns: [
        { name: "Month", type: "string", isDimension: true, label: "Month", sampleValues: ["Jan", "Feb", "Mar"] },
        { name: "Projects_Completed", type: "number", isDimension: false, label: "Projects Completed", sampleValues: [] },
      ],
      rows,
    });
  }

  // Ops Headcount
  {
    const d = corp.panels.enablement.tabs.find(t => t.id === "headcount").data;
    const rows = d.byMonth.map(m => ({ Month: m.month, Total_HC: m.total, Filled: m.filled, IND: m.IND, Open_Roles: m.open }));
    tables.push({
      id: "headcount", name: "Ops_Headcount",
      description: "Monthly operations headcount breakdown by location (India/Mexico).",
      columns: [
        { name: "Month", type: "string", isDimension: true, label: "Month", sampleValues: ["Jan", "Feb", "Mar"] },
        { name: "Total_HC", type: "number", isDimension: false, label: "Total Headcount", sampleValues: [] },
        { name: "Filled", type: "number", isDimension: false, label: "Filled", sampleValues: [] },
        { name: "IND", type: "number", isDimension: false, label: "India Count", sampleValues: [] },
        { name: "Open_Roles", type: "number", isDimension: false, label: "Open Roles", sampleValues: [] },
      ],
      rows,
    });
  }

  // ESM Coverage — flattened view
  {
    const d = fn.panels.performance.tabs.find(t => t.id === "esm").data;
    const rows = [
      { Body: "Rapid Ratings", Metric: "Outreach", Value: d.rr.outreach, Ambition_Gap: d.rr.outreachGap },
      { Body: "Rapid Ratings", Metric: "Rated", Value: d.rr.rated, Ambition_Gap: d.rr.ratedGap },
      { Body: "EcoVadis", Metric: "Outreach", Value: d.ecovadis.outreach, Ambition_Gap: null },
      { Body: "EcoVadis", Metric: "Rated Good+%", Value: d.ecovadis.ratedGoodPlus, Ambition_Gap: null },
      { Body: "Sedex", Metric: "Outreach", Value: d.sedex.outreach, Ambition_Gap: null },
      { Body: "Sedex", Metric: "Pre-screened", Value: d.sedex.preScreened, Ambition_Gap: null },
      { Body: "Sedex", Metric: "High-risk audit", Value: d.sedex.highRiskAudit, Ambition_Gap: null },
    ];
    tables.push({
      id: "esm-coverage", name: "ESM_Coverage",
      description: "Enterprise Supplier Management coverage across Rapid Ratings, EcoVadis, and Sedex.",
      columns: [
        { name: "Body", type: "string", isDimension: true, label: "Rating Body", sampleValues: ["Rapid Ratings", "EcoVadis", "Sedex"] },
        { name: "Metric", type: "string", isDimension: true, label: "Metric", sampleValues: ["Outreach", "Rated"] },
        { name: "Value", type: "number", isDimension: false, label: "Value", sampleValues: [] },
        { name: "Ambition_Gap", type: "number", isDimension: false, label: "Gap to Ambition", sampleValues: [] },
      ],
      rows,
    });
  }

  return tables;
}
