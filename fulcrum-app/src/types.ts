// ---------------------------------------------------------------------------
// FULCRUM domain model
// ---------------------------------------------------------------------------

// ---- Curriculum ----------------------------------------------------------

export type TrackId = 'presence' | 'connection' | 'clarity' | 'influence' | 'practice';

export interface Track {
  id: TrackId;
  title: string;
  subtitle: string;
  /** tailwind accent token, e.g. 'brand' | 'teal' | 'gold' | 'hot' */
  accent: 'brand' | 'teal' | 'gold' | 'hot';
}

/** Rich, renderable content node — the e-learning building blocks. */
export type Block =
  | { type: 'p'; md: string }
  | { type: 'h'; text: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'callout'; tone: 'tip' | 'warn' | 'key' | 'example' | 'mechanic'; title?: string; md: string }
  | { type: 'goodbad'; rows: { dimension: string; poor: string; good: string }[] }
  | { type: 'table'; columns: string[]; rows: string[][] }
  | { type: 'quote'; md: string; cite?: string }
  | { type: 'steps'; items: string[] }
  | { type: 'check'; q: string; options: { text: string; correct?: boolean; why: string }[] }
  | { type: 'tryit'; md: string };

export interface Lesson {
  id: string;
  title: string;
  estMin: number;
  blocks: Block[];
}

export type PracticeKind = 'observe' | 'experiment' | 'record' | 'reflect';

export interface PracticeItem {
  kind: PracticeKind;
  title: string;
  body: string;
}

export interface Module {
  number: number; // 1..10 — canonical capability model
  slug: string;
  title: string;
  track: TrackId;
  oneLiner: string;
  estReadMin: number;
  /** WIIFM — why this matters for the learner / their career */
  whyItMatters: string;
  learningObjectives: string[];
  keyTerms: { term: string; def: string }[];
  /** scored sub-areas beneath the module (the BARS resolves into these) */
  subAreas: string[];
  lessons: Lesson[];
  principles: string[];
  practice: PracticeItem[];
  warningSigns: string[];
  /** what the evaluation engine looks for — links learning to measurement */
  diagnosticSignals: string[];
  furtherReading: string[];
  grounding: string[];
  /** rubric competencies that this module maps to */
  competencyIds: string[];
}

// ---- Rubric (the measurement layer) --------------------------------------

export interface RubricLevel {
  level: 1 | 2 | 3 | 4;
  label: string;
  anchor: string;
  example: string;
}

export interface Competency {
  id: string;
  name: string;
  moduleNumbers: number[];
  definition: string;
  signals: string[];
  levels: RubricLevel[];
}

// ---- User profile & configuration ----------------------------------------

export type AssessmentMode = 'all' | 'manual' | 'ai';

export interface Profile {
  id: 'me';
  displayName: string;
  role: string;
  seniority: string;
  goals: string[];
  painPoints: string[];
  /** the "this is me" baseline — authentic style we score effectiveness against */
  styleBaseline: string;
  assessmentMode: AssessmentMode;
  /** module number -> weight (0..3). Default 1 for active modules. */
  weights: Record<number, number>;
  onboarded: boolean;
  createdAt: number;
}

export interface Settings {
  id: 'app';
  /** 'managed' = use FULCRUM-hosted account via a FULCRUM key; 'byo' = your own provider keys. */
  aiMode: 'managed' | 'byo';
  /** FULCRUM licence key (managed mode). */
  fulcrumKey: string;
  apiKey: string;
  model: string;
  coachModel: string;
  /** Deepgram (or compatible) speech-to-text key — enables audio analysis. */
  asrKey: string;
  /** Gemini key — enables native video (visual presence) analysis on Gemini Pro. */
  geminiKey: string;
  passiveAgent: boolean;
  retentionDays: number; // 0 = keep forever
  effort: 'low' | 'medium' | 'high';
  /** spend control: soft daily budget for video minutes (0 = unlimited). */
  dailyVideoMinutes: number;
}

export interface UsageDay {
  date: string; // YYYY-MM-DD
  videoSec: number;
  audioSec: number;
  transcripts: number;
  estUsd: number;
}

// ---- Evaluations ----------------------------------------------------------

export type InteractionType =
  | 'team-update'
  | 'one-to-one'
  | 'difficult-conversation'
  | 'negotiation'
  | 'sales-discovery'
  | 'presentation'
  | 'interview'
  | 'other';

export interface Finding {
  type: 'strength' | 'growth';
  competencyId?: string;
  moduleNumber?: number;
  timestampLabel?: string;
  quote: string;
  note: string;
  suggestion?: string;
}

export interface ModuleScore {
  moduleNumber: number;
  score: number; // 1..4 (one decimal)
  summary: string;
}

export interface Priority {
  title: string;
  why: string;
  moduleNumbers: number[];
  drill: string;
}

export interface EvaluationResult {
  overall: number; // 1..4
  headline: string;
  situation: string; // "how you handled the situation" — self-focused narrative
  moduleScores: ModuleScore[];
  findings: Finding[];
  priorities: Priority[];
}

export interface Evaluation {
  id: string;
  createdAt: number;
  title: string;
  interactionType: InteractionType;
  source: 'upload' | 'paste' | 'record' | 'agent' | 'media';
  /** seconds of media analysed, if from audio/video */
  mediaSeconds?: number;
  /** true when delivery & dynamics (tone/flow) were measured from audio */
  delivery?: boolean;
  transcriptPreview: string;
  weightsUsed: Record<number, number>;
  result: EvaluationResult;
  /** true when produced by the offline heuristic engine (no API key) */
  demo: boolean;
}

// ---- Progress & coach ----------------------------------------------------

export interface Progress {
  moduleNumber: number;
  lessonsDone: string[];
  practiceDone: string[];
  completedAt?: number;
  lastViewedAt: number;
}

export interface CoachMessage {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}
