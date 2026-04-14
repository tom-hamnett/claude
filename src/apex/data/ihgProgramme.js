// IHG Procurement Excellence programme identity + mission + updates
import { d } from "../lib/utils.js";
import { IHG_PROJECTS, IHG_DEPENDENCIES, IHG_MILESTONES } from "./ihgProjects.js";
import { IHG_RISKS, IHG_RISK_AGGREGATE } from "./ihgRisks.js";
import { IHG_AUDIT_ACTIONS } from "./ihgAudits.js";
import { METRIC_DOMAINS } from "./ihgMetrics.js";

export const IHG_PROGRAMME = {
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
      date: d(-10),
      title: "March 2026 Monthly Programme Update",
      source: "APRIL - QBR PLT Report (ingested)",
      summary: "Programme tracking amber overall. Monthly CRF collection below target in AMER with $3,503/platform vs $9,540 in Jan — Franchise rollout dilution effect. 96 open risks (+28% count vs Feb, +22% score). Catalyst policy launch on target for end March. Data Strategy roadmap due mid-April. Colleague Heartbeat action plan (11 focus areas) in flight. Audit backlog managed — 7 open <90d; Americas policy launch a critical path item.",
    },
  ],

  executiveSummary: {
    lastGenerated: null,
    body: null,
  },

  projects: IHG_PROJECTS,
  dependencies: IHG_DEPENDENCIES,
  milestones: IHG_MILESTONES,
  risks: IHG_RISKS,
  riskAggregate: IHG_RISK_AGGREGATE,
  auditActions: IHG_AUDIT_ACTIONS,

  metricDomains: METRIC_DOMAINS,
  metricDomainOrder: ["hotel", "corporate", "function"],

  settings: {
    aiEngine: "anthropic",
  },
};

// Gap pre-identification for the IHG PE reference build
export const IHG_GAPS = [
  { id: "g-ch-meridian", description: "No project charter on file for Meridian", section: "portfolio/charters", severity: "important", suggestedAction: "Generate charter template", status: "active" },
  { id: "g-ch-athena", description: "No project charter on file for Athena", section: "portfolio/charters", severity: "important", suggestedAction: "Generate charter template", status: "active" },
  { id: "g-ch-horizon", description: "No project charter on file for Horizon", section: "portfolio/charters", severity: "important", suggestedAction: "Generate charter template", status: "active" },
  { id: "g-ch-catalyst", description: "No project charter on file for Catalyst", section: "portfolio/charters", severity: "important", suggestedAction: "Generate charter template", status: "active" },
  { id: "g-ch-inhabitr", description: "No project charter on file for Inhabitr", section: "portfolio/charters", severity: "important", suggestedAction: "Generate charter template", status: "active" },
  { id: "g-ch-hoteltech", description: "No project charter on file for Hotel Technology", section: "portfolio/charters", severity: "nice-to-have", suggestedAction: "Generate charter template", status: "active" },
  { id: "g-ch-pmo", description: "No project charter on file for PMO Capability", section: "portfolio/charters", severity: "important", suggestedAction: "Generate charter template", status: "active" },
  { id: "g-plan", description: "No milestone plan data for any project", section: "plan/timeline", severity: "blocking", suggestedAction: "Upload plan file or define milestones via AI", status: "active" },
  { id: "g-idx-hotel", description: "No category index data connected (Hotel Procurement)", section: "metrics/hotel/external", severity: "nice-to-have", suggestedAction: "Link external data source", status: "active" },
  { id: "g-idx-corp", description: "No macro/category indices for Corporate Procurement", section: "metrics/corporate/external", severity: "nice-to-have", suggestedAction: "Link external data source", status: "active" },
  { id: "g-sow", description: "No spend-per-hotel or share of wallet data (Hotel Procurement)", section: "metrics/hotel/performance", severity: "important", suggestedAction: "Configure data feed", status: "active" },
  { id: "g-savings", description: "No savings or value delivery metric configured (Corporate Procurement)", section: "metrics/corporate/value", severity: "important", suggestedAction: "Define savings taxonomy + feed", status: "active" },
  { id: "g-benefits", description: "No benefits realisation framework (Function Management)", section: "metrics/function/performance", severity: "blocking", suggestedAction: "Design benefits-realisation framework — single most important structural gap", status: "active" },
  { id: "g-fn-spend", description: "No budget-vs-forecast tracking for GP function spend", section: "metrics/function/enablement", severity: "important", suggestedAction: "Configure budget data feed", status: "active" },
];
