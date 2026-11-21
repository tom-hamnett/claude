// Core data model. Everything is stored locally (IndexedDB) and can be
// exported / imported as one JSON bundle; the same shapes map 1:1 to the
// Supabase tables in ../supabase/schema.sql.

export type EngagementType = 'like' | 'comment' | 'follow' | 'save' | 'share' | 'story_reply' | 'dm';

export interface Engagement {
  type: EngagementType;
  contentId?: string; // which reel / post
  at: string; // ISO
  text?: string; // comment text, if any
}

export type Seniority = 'student' | 'ic' | 'senior_ic' | 'manager' | 'director' | 'exec' | 'founder' | 'consultant' | 'unknown';

/** What the person is likely trying to get done; drives the suggestions we offer. */
export type Motivation =
  | 'make_a_case' // needs evidence for a budget / proposal
  | 'promotion' // wants to stand out internally
  | 'sell' // sells to companies (sales, consulting, recruiting)
  | 'job_hunt' // interviewing / next role
  | 'pitch' // consultant / agency pitching
  | 'invest' // deal / investment screening
  | 'board' // board / NED / exec asked "are we efficient?"
  | 'learn'; // student / curious

export interface Contact {
  id: string;
  handle: string; // instagram username, no @
  name?: string;
  bio?: string;
  employer?: string;
  employerStaff?: number; // headcount if known, drives report cohort
  role?: string; // job title as written
  seniority: Seniority;
  func?: string; // function: procurement, finance, hr, it, sales, ops, strategy...
  sector?: string;
  location?: string;
  interests: string[];
  challenges: string[]; // inferred, phrased as they'd say it
  motivations: Motivation[];
  followsUs: boolean;
  engagements: Engagement[];
  notes?: string;
  doNotContact: boolean;
  source?: string; // e.g. "chrome-collect 2026-11-20"
  createdAt: string;
  updatedAt: string;
}

export type StageKind = 'first_touch' | 'follow_up' | 'discovery' | 'share_report' | 'offer' | 'nurture' | 'closed';

/** A reply intent the user taps after pasting/reading a reply. Branches key off these. */
export type Intent = 'interested' | 'named_company' | 'question' | 'yes' | 'not_now' | 'no' | 'no_reply';

export interface Branch {
  when: Intent;
  goto: string; // stage id, or 'stop'
}

export interface Stage {
  id: string;
  name: string;
  kind: StageKind;
  goal: string; // what this message must achieve, shown to the drafter
  template: string; // skeleton with {variables}
  maxWords: number;
  attachReport: boolean;
  followUpDays: number | null; // when to resurface if no reply
  branches: Branch[];
}

export interface Funnel {
  id: string;
  name: string;
  artefact: string; // what we are sharing (e.g. "Analyst's Edge example report")
  productUrl?: string;
  active: boolean;
  stages: Stage[];
  createdAt: string;
}

export type ThreadStatus = 'to_draft' | 'ready' | 'waiting' | 'replied' | 'stopped' | 'won';

export interface ThreadEvent {
  at: string;
  stageId: string;
  dir: 'out' | 'in' | 'note';
  text: string;
  intent?: Intent;
  reportId?: string;
}

export interface Thread {
  id: string;
  contactId: string;
  funnelId: string;
  stageId: string;
  status: ThreadStatus;
  draft?: string;
  draftBy?: 'template' | 'claude';
  reportId?: string;
  dueAt?: string; // follow-up due
  interestCompanies: string[];
  interestFunction?: string;
  history: ThreadEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface ReportRequest {
  id: string;
  contactId: string;
  view: 'whole_company' | 'function';
  func?: string;
  subject: string;
  peers: string[];
  status: 'requested' | 'ready' | 'blocked';
  pdfUrl?: string;
  imageUrls?: string[];
  note?: string;
  createdAt: string;
}

export interface ContentItem {
  id: string;
  title: string;
  url?: string;
  postedAt?: string;
  funnelId?: string; // the artefact funnel this content feeds
}

export interface Settings {
  id: 'settings';
  dailyCap: number;
  topN: number; // how many to enrol per batch
  cohortThreshold: number; // staff count: below = whole company view
  targetFunctions: string[];
  blockedSectors: string[];
  blockedCompanies: string[];
  bannedWords: string[];
  /** Where Copy & open DM goes: the Instagram web DM ('web') or the Instagram app profile ('app'). */
  dmOpen?: 'web' | 'app';
}
