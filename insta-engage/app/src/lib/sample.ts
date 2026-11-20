import type { Bundle } from './actions';

/** Fictional leads for trying the app. Handles are made up. */
export function sampleBundle(): Bundle {
  const d = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
  return {
    version: 1,
    content: [
      { id: 'reel-procurement-30pct', title: 'procurement 30%', postedAt: d(6), funnelId: 'ae-example-report' },
      { id: 'reel-fat-or-lean', title: 'fat or lean', postedAt: d(3), funnelId: 'ae-example-report' },
    ],
    contacts: [
      { handle: 'sample_priya.ops', name: 'Priya Nair', role: 'Head of Procurement', employer: 'Northwind Logistics', employerStaff: 12000, seniority: 'director', func: 'procurement', sector: 'logistics', followsUs: true, bio: 'Head of Procurement @ Northwind. Category strategy, supplier risk, coffee.', engagements: [{ type: 'comment', contentId: 'reel-procurement-30pct', at: d(2), text: 'This is exactly our problem' }, { type: 'like', contentId: 'reel-fat-or-lean', at: d(1) }] },
      { handle: 'sample_tomasz.strategy', name: 'Tomasz Wolski', role: 'Strategy Consultant', employer: 'Brightline Partners', employerStaff: 400, seniority: 'consultant', func: 'consulting', followsUs: true, bio: 'Operating model & org design consultant. Ex-Big 4.', engagements: [{ type: 'save', contentId: 'reel-fat-or-lean', at: d(1) }, { type: 'follow', at: d(1) }] },
      { handle: 'sample_amelia.fp', name: 'Amelia Grant', role: 'Finance Business Partner', employer: 'Halden Retail', employerStaff: 3200, seniority: 'senior_ic', func: 'finance', followsUs: false, bio: 'FBP | numbers that tell a story | CIMA', engagements: [{ type: 'like', contentId: 'reel-procurement-30pct', at: d(4) }] },
      { handle: 'sample_kwame.hr', name: 'Kwame Mensah', role: 'HR Director', employer: 'Corvid Software', employerStaff: 2100, seniority: 'director', func: 'hr', sector: 'software', followsUs: true, bio: 'People & org design. Building teams that scale.', engagements: [{ type: 'like', contentId: 'reel-fat-or-lean', at: d(2) }, { type: 'like', contentId: 'reel-procurement-30pct', at: d(5) }] },
      { handle: 'sample_lena.mba', name: 'Lena Fischer', role: 'MBA candidate', seniority: 'student', followsUs: false, bio: 'MBA @ LBS. Open to work: strategy & ops roles.', engagements: [{ type: 'like', contentId: 'reel-fat-or-lean', at: d(1) }] },
      { handle: 'sample_raj.sales', name: 'Raj Patel', role: 'Account Executive', employer: 'Spendwise', employerStaff: 650, seniority: 'ic', func: 'sales', followsUs: true, bio: 'AE selling procurement software to enterprise.', engagements: [{ type: 'comment', contentId: 'reel-procurement-30pct', at: d(3), text: 'Sending to my prospects' }] },
      { handle: 'sample_grace.pe', name: 'Grace Okafor', role: 'Investment Associate', employer: 'Larchmont Capital', employerStaff: 60, seniority: 'senior_ic', func: 'investing', followsUs: false, bio: 'PE associate. Ops due diligence.', engagements: [{ type: 'share', contentId: 'reel-fat-or-lean', at: d(2) }] },
      { handle: 'sample_hotelier', name: 'Sam Doe', role: 'Procurement Manager', employer: 'Seaview Hotels', employerStaff: 9000, seniority: 'manager', func: 'procurement', sector: 'hotels', followsUs: true, bio: 'Hotel procurement.', engagements: [{ type: 'like', contentId: 'reel-procurement-30pct', at: d(1) }] },
    ],
  };
}
