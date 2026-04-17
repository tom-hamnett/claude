// Seed the database with IHG PE reference data from the code-based data files.
// This runs once on first start if the programme doesn't exist yet.
import { getDB } from "./db.js";

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
  db.close();
}
