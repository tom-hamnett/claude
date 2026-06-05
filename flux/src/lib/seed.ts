/**
 * Seeds one fully-worked engagement so a first-time user sees the whole pipeline
 * — map, metrics, opportunities — before they spend a single token.
 */
import { db, now, uid } from '../db';
import { FLUX_SCHEMA_VERSION } from '../types';
import type { Opportunity, Process, ProcessStep, Project } from '../types';

export async function seedIfEmpty(): Promise<void> {
  const count = await db.projects.count();
  if (count > 0) return;
  const { project, process, opportunities } = buildDemo();
  await db.transaction('rw', db.projects, db.processes, db.opportunities, async () => {
    await db.projects.put(project);
    await db.processes.put(process);
    await db.opportunities.bulkPut(opportunities);
  });
}

/** Builds the worked demo engagement as plain objects (no persistence). */
export function buildDemo(): { project: Project; process: Process; opportunities: Opportunity[] } {
  const projectId = uid();
  const project: Project = {
    id: projectId,
    name: 'Demo — Finance Operations Diagnostic',
    client: 'Northwind Manufacturing',
    industry: 'Manufacturing',
    scope: 'Procure-to-Pay (Invoice Approval)',
    objective: 'Recover margin and free finance capacity ahead of an ERP migration.',
    context:
      'Mid-market manufacturer, £180m revenue. Finance team of 14. AP processes ~24,000 supplier invoices/year across 3 entities. Frequent month-end overtime and late-payment penalties.',
    org: { loadedHourlyCost: 35, currency: 'GBP', annualHoursPerFte: 1760 },
    createdAt: now(),
    updatedAt: now(),
  };

  const t = (
    order: number,
    name: string,
    type: ProcessStep['type'],
    valueClass: ProcessStep['valueClass'],
    actor: string,
    extra: Partial<ProcessStep> = {},
  ): ProcessStep => ({
    id: uid(),
    order,
    name,
    type,
    valueClass,
    actor,
    automation: 'none',
    ...extra,
  });

  const steps: ProcessStep[] = [
    t(1, 'Invoice received', 'start', 'BVA', 'Supplier', { system: 'Email/Post', processTimeMin: 2, waitTimeMin: 240 }),
    t(2, 'Manually log invoice in spreadsheet', 'task', 'NVA', 'AP Clerk', {
      system: 'Excel',
      processTimeMin: 6,
      pctCompleteAccurate: 85,
      painPoint: 'Double-keying from PDF; typos common.',
    }),
    t(3, 'Match to purchase order', 'task', 'VA', 'AP Clerk', {
      system: 'ERP',
      processTimeMin: 8,
      pctCompleteAccurate: 80,
      reworkRate: 0.3,
      painPoint: 'PO numbers often missing on invoice.',
    }),
    t(4, 'Exception? (mismatch)', 'decision', 'BVA', 'AP Clerk', { branches: ['Match', 'Mismatch'] }),
    t(5, 'Chase requester to resolve mismatch', 'wait', 'NVA', 'AP Clerk', {
      system: 'Email',
      processTimeMin: 10,
      waitTimeMin: 1920,
      painPoint: '40% of invoices stall here for days.',
    }),
    t(6, 'Route for approval (email)', 'handoff', 'BVA', 'AP Clerk', { system: 'Email', processTimeMin: 4, waitTimeMin: 960 }),
    t(7, 'Manager reviews & approves', 'control', 'BVA', 'Budget Manager', {
      system: 'Email',
      processTimeMin: 6,
      waitTimeMin: 1440,
      pctCompleteAccurate: 95,
    }),
    t(8, 'Second approval (>£10k)', 'control', 'BVA', 'Finance Director', {
      system: 'Email',
      processTimeMin: 5,
      waitTimeMin: 1200,
    }),
    t(9, 'Key invoice into ERP', 'task', 'NVA', 'AP Clerk', {
      system: 'ERP',
      processTimeMin: 7,
      pctCompleteAccurate: 88,
      painPoint: 'Re-keying data already in the spreadsheet.',
    }),
    t(10, 'Payment run', 'task', 'VA', 'AP Clerk', { system: 'ERP', processTimeMin: 4, waitTimeMin: 480 }),
    t(11, 'File & archive', 'task', 'NVA', 'AP Clerk', { system: 'Shared drive', processTimeMin: 3 }),
    t(12, 'Payment confirmed', 'end', 'VA', 'AP Clerk', {}),
  ];

  const processId = uid();
  const process: Process = {
    id: processId,
    projectId,
    schemaVersion: FLUX_SCHEMA_VERSION,
    name: 'Invoice Approval (P2P)',
    trigger: 'Supplier invoice arrives',
    owner: 'AP Manager',
    function: 'Finance',
    annualVolume: 24000,
    maturity: 2,
    sipoc: {
      suppliers: ['Vendors', 'Procurement', 'Requesting departments'],
      inputs: ['Invoice', 'Purchase order', 'Goods receipt'],
      outputs: ['Approved payment', 'Updated ledger', 'Audit trail'],
      customers: ['Suppliers', 'Finance', 'Auditors'],
    },
    steps,
    status: 'diagnosed',
    createdAt: now(),
    updatedAt: now(),
  };

  const o = (
    title: string,
    driver: Opportunity['driver'],
    rec: string,
    impact: Opportunity['impact'],
    effort: Opportunity['effort'],
    extra: Partial<Opportunity> = {},
  ): Opportunity => ({
    id: uid(),
    processId,
    title,
    description: extra.description ?? '',
    driver,
    recommendation: rec,
    automation: extra.automation ?? 'none',
    impact,
    effort,
    confidence: extra.confidence ?? 0.7,
    quickWin: extra.quickWin ?? false,
    stepRefs: extra.stepRefs ?? [],
    source: 'ai',
    createdAt: now(),
    ...extra,
  });

  const sid = (order: number) => steps.find((s) => s.order === order)?.id ?? '';

  const opportunities: Opportunity[] = [
    o('Eliminate spreadsheet double-keying', 'waste', 'Capture invoices via OCR/IDP straight into ERP; retire the Excel log.', 4, 2, {
      waste: 'defects',
      description: 'Steps 2 and 9 re-key the same data, driving a 12-15% error rate and rework.',
      automation: 'ai',
      estAnnualValue: 78000,
      valueBasis: '~5 min re-keying removed across steps 2+9 × 24,000 invoices/yr ÷ 60 × £35/hr ≈ £70k, plus ~£8k rework reduction from fewer errors.',
      quickWin: false,
      confidence: 0.8,
      stepRefs: [sid(2), sid(9)],
    }),
    o('Auto-match invoices to POs', 'efficiency', 'Implement 3-way match automation; route only true exceptions to humans.', 5, 3, {
      waste: 'overprocessing',
      description: 'Manual PO matching (step 3) is slow and error-prone; most invoices are clean.',
      automation: 'rpa',
      estAnnualValue: 110000,
      valueBasis: '~8 min manual matching removed on ~80% of 24,000 invoices ÷ 60 × £35/hr ≈ £90k, plus ~£20k from faster cycle and fewer exceptions.',
      confidence: 0.75,
      stepRefs: [sid(3), sid(4)],
    }),
    o('Kill the mismatch chase backlog', 'waste', 'Self-service exception portal for requesters with SLA + auto-reminders.', 4, 2, {
      waste: 'waiting',
      description: '40% of invoices stall at step 5 for days, causing late-payment penalties.',
      automation: 'assisted',
      estAnnualValue: 64000,
      valueBasis: 'Late-payment penalties avoided ~£45k/yr + ~10 min chasing removed on ~40% of 24,000 invoices ÷ 60 × £35/hr ≈ £19k.',
      quickWin: true,
      confidence: 0.7,
      stepRefs: [sid(5)],
    }),
    o('Replace email approvals with workflow', 'effectiveness', 'Move approvals into a workflow tool with thresholds, audit trail and mobile sign-off.', 4, 3, {
      waste: 'transport',
      description: 'Email approvals (steps 6-8) lose traceability and add ~4 days of wait.',
      automation: 'rpa',
      estAnnualValue: 52000,
      valueBasis: '~5 min email handling removed on 24,000 invoices ÷ 60 × £35/hr ≈ £35k, plus ~£17k from earlier-payment discounts captured.',
      confidence: 0.72,
      stepRefs: [sid(6), sid(7), sid(8)],
    }),
    o('Risk-based approval thresholds', 'control', 'Auto-approve low-value, low-risk invoices; reserve dual approval for genuine risk.', 3, 2, {
      description: 'Blanket dual approval over £10k over-controls routine spend.',
      automation: 'ai',
      quickWin: true,
      confidence: 0.65,
      stepRefs: [sid(8)],
    }),
    o('Redeploy AP clerks to vendor management', 'scale', 'Reinvest freed capacity into early-payment discount capture and vendor terms.', 3, 3, {
      description: 'Automation frees ~2.5 FTE; redeploy to value-creating vendor work rather than cut.',
      automation: 'none',
      estAnnualValue: 40000,
      confidence: 0.6,
      stepRefs: [],
    }),
  ];

  return { project, process, opportunities };
}
