import { d } from "../lib/utils.js";

// Top individual risks — the named top-5 plus a representative sample.
// For reference build, total risk count = 96 but we surface the scored/named ones;
// the aggregate stats mirror March 2026 pack.
export const IHG_RISKS = [
  { id: "r-001", projectId: "p-inhabitr", title: "Inhabitr Chinese wall failure",        domain: "compliance",   description: "Failure of information barriers between Inhabitr and IHG procurement creating regulatory exposure.", owner: "Cian Murphy",    probability: 4, impact: 5, mitigation: "Legal review, access controls, monitoring controls in place.", status: "Open", lastUpdated: d(-3) },
  { id: "r-002", projectId: "p-horizon",  title: "Supplier Coverage — EV/Sedex non-response", domain: "reputational", description: "Non-response from key suppliers to EcoVadis/Sedex outreach undermining responsible procurement commitments.", owner: "Katie Nunn",     probability: 4, impact: 5, mitigation: "Escalation path in place; tiered engagement strategy.", status: "Open", lastUpdated: d(-3) },
  { id: "r-003", projectId: "p-horizon",  title: "Supplier Coverage — RR non-response",  domain: "reputational", description: "Suppliers not responding to Responsible Procurement outreach.", owner: "Sharon John",   probability: 4, impact: 5, mitigation: "Coordinated outreach with category managers.", status: "Open", lastUpdated: d(-3) },
  { id: "r-004", projectId: "p-data",     title: "Data Strategy 2026 schedule",          domain: "schedule",     description: "2026 Data Strategy delivery schedule at risk due to dependencies and resource constraints.", owner: "Cian Murphy",    probability: 4, impact: 4, mitigation: "Roadmap publication mid-April; additional resources being secured.", status: "Open", lastUpdated: d(-3) },
  { id: "r-005", projectId: "p-catalyst", title: "Catalyst-Concur technical",            domain: "technical",    description: "Technical integration risk between Catalyst policy engine and Concur transactional flows.", owner: "Luca Palazzo",   probability: 4, impact: 4, mitigation: "Technical spike underway; fallback manual process defined.", status: "Open", lastUpdated: d(-3) },

  // Representative medium risks
  { id: "r-006", projectId: "p-odyssey",  title: "GEP adoption plateau",                 domain: "process",      description: "Adoption of GEP plateauing after initial rollout.", owner: "Molly Rumple",   probability: 3, impact: 3, mitigation: "Refresher training programme launched.", status: "Open", lastUpdated: d(-10) },
  { id: "r-007", projectId: "p-meridian", title: "Supplier segmentation alignment",      domain: "scope",        description: "Alignment on supplier segmentation criteria between ESM and Category teams.", owner: "Terrina Butler", probability: 3, impact: 3, mitigation: "Joint workshop scheduled.", status: "Open", lastUpdated: d(-7) },
  { id: "r-008", projectId: "p-athena",   title: "Process ownership split",              domain: "process",      description: "Finance/Procurement split ownership of I2P sub-processes creating execution friction.", owner: "Sharon John",    probability: 3, impact: 4, mitigation: "Governance forum being established.", status: "Open", lastUpdated: d(-7) },
  { id: "r-009", projectId: "p-pmo",      title: "PLT reporting cadence",                domain: "scope",        description: "Reporting cadence to PLT not yet fully stabilised.", owner: "Tom Hamnett",    probability: 2, impact: 3, mitigation: "Monthly cycle now established.", status: "Open", lastUpdated: d(-5) },
  { id: "r-010", projectId: "p-conexus",  title: "Franchise P2P adoption below plan",    domain: "performance",  description: "Franchise P2P adoption running below original ambition.", owner: "Cian Murphy",    probability: 3, impact: 3, mitigation: "Ambition re-cut for 2026 based on current trajectory.", status: "Open", lastUpdated: d(-10) },
];

// Portfolio-level risk aggregates (from March 2026 pack)
export const IHG_RISK_AGGREGATE = {
  thisMonth: { total: 96, score: 972, high: 6, medium: 81, low: 9 },
  lastMonth: { total: 75, score: 795, high: 8, medium: 62, low: 5 },
  byTheme: [
    { theme: "Process / Operational", scoreShare: 0.55 },
    { theme: "Performance / Compliance", scoreShare: 0.22 },
    { theme: "Scope / Plan / Budget", scoreShare: 0.14 },
    { theme: "Comms / Reputational", scoreShare: 0.09 },
  ],
};
