// Metrics domain structure for IHG PE: Hotel Procurement | Corporate Procurement | Function Management
// Each domain has 4 panels (External Context / Value Proposition / Enablement / Performance)
// Each panel has tabs. Each tab has a status (tracked / partial / gap) and optional data.

export const METRIC_DOMAINS = {
  hotel: {
    id: "hotel",
    label: "Hotel Procurement",
    tagline: "Performance across the hotel estate",
    description: "Programme performance across the hotel estate by region, market, chain-scale, brand, life-cycle and category.",
    panels: {
      external: {
        label: "External Context",
        question: "What's changing our landscape?",
        tabs: [
          { id: "indices", label: "Category Indices", status: "gap", description: "Macro and category-level price indices (food, energy, labour, FF&E).", prompt: "No category index data is connected. Would you like to link an external data source or upload an index file?" },
          { id: "compset", label: "Competitive Set Benchmarking", status: "gap", description: "Relative position vs comp set on key cost and programme metrics." },
          { id: "macro", label: "Macro Environment Narrative", status: "gap", description: "AI-generated contextual briefing on relevant macro trends.", prompt: "Configure via AI on demand." },
        ],
      },
      value: {
        label: "Value Proposition",
        question: "Where are we strong/weak?",
        tabs: [
          { id: "crf", label: "CRF Collection", status: "tracked", description: "CRF eligible ($M), Avg % CRF — by region (AMER/EMEAA/GC), monthly.",
            data: {
              headline: "Slight reduction in $s billed & collected at flat MoM %s. Spend / platform down in AMER",
              eligibleByMonth: [
                { month: "Jan", AMER: 52, EMEAA: 9, GC: 10, total: 71 },
                { month: "Feb", AMER: 41, EMEAA: 9, GC: 15, total: 65 },
                { month: "Mar", AMER: 45, EMEAA: 10, GC: 13, total: 68 },
              ],
              collected: [{ month: "Jan", total: 1.8 }, { month: "Feb", total: 1.6 }, { month: "Mar", total: 1.7 }],
              crfPerP2P: [
                { month: "Jan", total: 9540 },
                { month: "Feb", total: 3503 },
                { month: "Mar", total: 3200 },
              ],
              avgPct: [
                { month: "Jan", AMER: 2.5, EMEAA: 2.7, GC: 2.0 },
                { month: "Feb", AMER: 2.4, EMEAA: 2.7, GC: 2.0 },
                { month: "Mar", AMER: 2.3, EMEAA: 2.7, GC: 2.0 },
              ],
            } },
          { id: "coverage", label: "Programme Coverage & Utilisation", status: "partial", description: "P2P platform adoption rates by estate segment. Estate % available; spend-per-hotel not yet tracked." },
          { id: "cpor", label: "Cost per Key / CPOR", status: "gap", description: "Hotel-level cost efficiency indicators." },
          { id: "ohes", label: "Owner / Hotel / Guest Satisfaction", status: "gap", description: "OHES or equivalent scores." },
        ],
      },
      enablement: {
        label: "Enablement",
        question: "What's driving take-up?",
        tabs: [
          { id: "cmh-p2p", label: "CMH P2P Rollout", status: "tracked", description: "# systems by region (GC/EMEAA/AMER) vs 2026 target (~868). Monthly tracking.",
            data: {
              headline: "Static MoM with roll-out ambition in place for 2026",
              byMonth: [
                { month: "Jan", GC: 422, EMEAA: 245, AMER: 88, total: 755 },
                { month: "Feb", GC: 422, EMEAA: 245, AMER: 88, total: 755 },
                { month: "Mar", GC: 422, EMEAA: 245, AMER: 88, total: 755 },
              ],
              estatePct: [
                { month: "Jan", GC: 91, EMEAA: 54, AMER: 51, total: 69 },
                { month: "Feb", GC: 91, EMEAA: 54, AMER: 51, total: 69 },
                { month: "Mar", GC: 91, EMEAA: 54, AMER: 51, total: 69 },
              ],
              target2026: 868,
              targetLine: [{ month: "Jan", target: 755 }, { month: "Feb", target: 775 }, { month: "Mar", target: 795 }, { month: "Apr", target: 810 }, { month: "May", target: 820 }, { month: "Jun", target: 830 }, { month: "Jul", target: 840 }, { month: "Aug", target: 845 }, { month: "Sep", target: 850 }, { month: "Oct", target: 855 }, { month: "Nov", target: 860 }, { month: "Dec", target: 868 }],
            } },
          { id: "franchise-p2p", label: "Franchise P2P Rollout", status: "tracked", description: "# systems by region vs re-cut 2026 target.",
            data: {
              headline: "Some progress in USA, with ambitions re-cut while future solution defined",
              byMonth: [
                { month: "Jan", GC: 174, EMEAA: 0, AMER: 82, total: 256 },
                { month: "Feb", GC: 174, EMEAA: 0, AMER: 252, total: 426 },
                { month: "Mar", GC: 174, EMEAA: 0, AMER: 255, total: 429 },
              ],
              target2026: 772,
              targetLine: [{ month: "Jan", target: 256 }, { month: "Feb", target: 300 }, { month: "Mar", target: 350 }, { month: "Jun", target: 500 }, { month: "Sep", target: 650 }, { month: "Dec", target: 772 }],
              estatePct: [
                { month: "Jan", GC: 39, UK_Aus: 7, USA: 1, priority: 5 },
                { month: "Feb", GC: 39, UK_Aus: 7, USA: 6, priority: 9 },
                { month: "Mar", GC: 39, UK_Aus: 7, USA: 6, priority: 9 },
              ],
              note: "Feb surge from 180 BS Nexus US additions. Ambition reduced to 772 due to low adoption rates and future solution strategy re-assessment.",
            } },
          { id: "util", label: "Platform Utilisation", status: "gap", description: "Spend flowing through P2P per hotel." },
          { id: "ohes-eng", label: "OHES Engagement", status: "gap", description: "Owner/hotel engagement scores with GP programme." },
        ],
      },
      performance: {
        label: "Performance",
        question: "Who is #1? Where are we?",
        tabs: [
          { id: "crf-per-p2p", label: "CRF per P2P Platform Deployed", status: "tracked", description: "CRF($/platform) by region, MoM.",
            data: {
              headline: "Sharp AMER decline driven by Franchise rollout dilution",
              byMonth: [
                { month: "Jan", AMER: 9540, EMEAA: 930, GC: 305 },
                { month: "Feb", AMER: 3503, EMEAA: 785, GC: 497 },
                { month: "Mar", AMER: 3200, EMEAA: 810, GC: 520 },
              ],
              note: "Feb/Mar AMER decline due to Franchise rollout dilution — more platforms deployed with same CRF base.",
            } },
          { id: "spend-through", label: "Spend Throughput", status: "partial", description: "Total spend under influence by region, rolling 12m. 2023–25 available monthly; Feb 2026 pending." },
          { id: "sow", label: "Share of Wallet", status: "gap", description: "GP-influenced spend as % of addressable spend." },
          { id: "crf-eligible-pct", label: "CRF Eligible as % Regional Hotel Spend", status: "gap", description: "Contextualises CRF performance." },
        ],
      },
    },
  },

  corporate: {
    id: "corporate",
    label: "Corporate Procurement",
    tagline: "Corporate procurement service delivery",
    description: "Delivery of corporate procurement services by region, function and category.",
    panels: {
      external: {
        label: "External Context",
        question: "External pressures on trading?",
        tabs: [
          { id: "macro", label: "Macro & Category Indices", status: "gap", description: "Indices relevant to corporate categories (IT, travel, professional services, facilities)." },
          { id: "compset", label: "Competitive Set Profitability / EPS", status: "gap", description: "IHG and peer EBIT/EPS context for corporate spend framing." },
          { id: "tariff", label: "Tariff Exposure", status: "gap", description: "Category-level flags for tariff or regulatory impact." },
        ],
      },
      value: {
        label: "Value Proposition",
        question: "How can we optimise support?",
        tabs: [
          { id: "csat", label: "CSAT Score", status: "partial", description: "Customer satisfaction for GP services (currently S&C IND/MEX only).",
            data: { headline: "Quality remains above target", months: [{ month: "Jan", score: 4.8 }, { month: "Feb", score: 4.0 }, { month: "Mar", score: 4.8 }], annualTarget: 3.8, responseRate: "~24%", momDelta: "+0.8" } },
          { id: "savings", label: "Savings & Value Delivery", status: "gap", description: "Savings delivered by category vs target." },
          { id: "engagement", label: "Procurement Engagement", status: "gap", description: "Breadth and depth of stakeholder engagement across functions." },
        ],
      },
      enablement: {
        label: "Enablement",
        question: "How broadly do we deliver Corp GP services?",
        tabs: [
          { id: "sc-projects", label: "S&C Projects", status: "tracked", description: "# projects completed MoM and YTD.",
            data: { headline: "Roles opened & filled with quality above target", byMonth: [{ month: "Jan", count: 17 }, { month: "Feb", count: 21 }, { month: "Mar", count: 24 }], momDelta: "+3" } },
          { id: "headcount", label: "Ops Headcount", status: "tracked", description: "HC by location (IND/MEX), filled vs open, MoM.",
            data: {
              headline: "Roles opened & filled across India + Mexico offices while quality remains above target",
              byMonth: [
                { month: "Jan", total: 47, filled: 32, IND: 11, open: 4 },
                { month: "Feb", total: 53, filled: 36, IND: 11, open: 6 },
                { month: "Mar", total: 55, filled: 38, IND: 12, open: 5 },
              ],
              note: "New: S&C mgr Mex, PMO mgr India. Offers out: Digital & Reporting Specialist, Digital Manager.",
            } },
          { id: "t2v", label: "Time-to-Value", status: "gap", description: "Average time from project intake to first value delivery." },
          { id: "digital", label: "Digital Enablement Penetration", status: "gap", description: "Proportion of S&C activity supported by digital tools (GEP, SYNC)." },
        ],
      },
      performance: {
        label: "Performance",
        question: "How are we contributing to IHG performance?",
        tabs: [
          { id: "ee", label: "E&E Programme Progress", status: "partial", description: "Delivery against Efficiency & Effectiveness ambition. Tracked via PMO Capability project but not surfaced as standalone metric." },
          { id: "bau-savings", label: "BAU Savings Delivered", status: "gap", description: "Recurring savings achieved through category management and contract compliance." },
          { id: "pnl", label: "P&L and SF Performance", status: "gap", description: "Procurement's contribution to function-level P&L and service function targets." },
        ],
      },
    },
  },

  function: {
    id: "function",
    label: "Function Management",
    tagline: "How effectively we run GP",
    description: "How effectively the GP function itself is run — by category, capability and location.",
    panels: {
      external: {
        label: "External Context",
        question: "Are we set up for success?",
        tabs: [
          { id: "regulatory", label: "Regulatory Environment", status: "gap", description: "Relevant regulatory and compliance landscape changes." },
          { id: "bench", label: "Operational Capability Benchmarks", status: "gap", description: "External benchmarks for procurement function capability and maturity." },
        ],
      },
      value: {
        label: "Value Proposition",
        question: "How effective are we?",
        tabs: [
          { id: "operating-model", label: "Operating Model Effectiveness", status: "gap", description: "Assessment of GP operating model design and location strategy ROI." },
          { id: "capability", label: "Capability & Capacity Summary", status: "partial", description: "Full GP headcount, capability map, capacity utilisation. IND/MEX Ops tracked; broader GP function view absent." },
          { id: "attrition", label: "Attrition & CHB", status: "partial", description: "Colleague Heartbeat Score and attrition rates. CHB action plan developed (11 focus areas). Formal attrition metric not tracked." },
        ],
      },
      enablement: {
        label: "Enablement",
        question: "Are we managing risk and opportunities?",
        tabs: [
          { id: "risk-portfolio", label: "Risk Portfolio", status: "tracked", description: "Full risk register — see Programme View → Risks & Compliance.", link: { page: "risks" } },
          { id: "audit-status", label: "Audit Action Status", status: "tracked", description: "Full audit dashboard — see Programme View → Risks & Compliance.", link: { page: "audits" } },
          { id: "function-spend", label: "Functional Spend vs Budget", status: "gap", description: "GP function spend tracked against annual budget by category." },
          { id: "gpo", label: "GPO Utilisation", status: "gap", description: "Usage of Group Purchasing Organisation agreements." },
        ],
      },
      performance: {
        label: "Performance",
        question: "How well are we running GP?",
        tabs: [
          { id: "esm", label: "ESM Coverage", status: "tracked", description: "Supplier outreach, participation, rating quality across RR, EcoVadis, Sedex.",
            data: {
              rr:       { outreach: 277, outreachGap: 32,  rated: 150, ratedGap: 54 },
              ecovadis: { outreach: 245, vsPlan: +35, ratedGoodPlus: 98, participationNote: "slightly behind" },
              sedex:    { outreach: 415, preScreened: 293, highRiskAudit: 1 },
            } },
          { id: "i2p", label: "I2P Process Optimisation Coverage", status: "tracked", description: "Athena dashboard — 78 sub-processes across 16 domains.",
            data: { wip: 5, complete: 0, planned: 73 } },
          { id: "benefits", label: "Portfolio Benefits Realisation", status: "gap", description: "Actual value delivered vs planned benefits by project.", prompt: "CRITICAL: This is the single most important structural gap — delivery activity is tracked but value delivery is not closed-looped." },
          { id: "ai-pilots", label: "AI & Innovation Pilot Outcomes", status: "gap", description: "Results, ROI and learning from AI and digital innovation pilots." },
        ],
      },
    },
  },
};
