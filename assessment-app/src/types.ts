export type ID = string;

/** A cohort of people being assessed: a class, a team, a department, etc. */
export interface Group {
  id: ID;
  name: string;
  /** Optional descriptor like "Year 7 PE", "U14 Rugby", "Sales Team Q3". */
  subject?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Person {
  id: ID;
  groupId: ID;
  /** Display name used during sessions. Keep short for fast scanning. */
  name: string;
  /** Optional fields - common in education contexts. */
  externalId?: string; // e.g. school admission number
  notes?: string;
  archived?: boolean;
  createdAt: number;
}

/** A reusable bundle of criteria + scale that the teacher can pick at session start. */
export interface Template {
  id: ID;
  name: string;
  description?: string;
  scale: Scale;
  criteria: TemplateCriterion[];
  /** Tags help filter templates - "PE", "Rugby", "Maths". */
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface TemplateCriterion {
  id: ID;
  name: string;
  description?: string;
}

/**
 * The sliding scale used to mark each criterion. Stored on the template AND copied
 * onto each session so historical data isn't broken if a template is later edited.
 */
export interface Scale {
  /** Numeric range. min < max. e.g. 1-5, 0-10, 0-100. */
  min: number;
  max: number;
  /** Step size. 1 for whole-number marks, 0.5 for half-points, etc. */
  step: number;
  /**
   * Optional descriptive labels at evenly-spaced anchor points. Length 2 -> low/high
   * labels at min/max. Length 3 -> low/middle/high. Up to (max-min)/step + 1 entries.
   * If omitted, only the numeric value is shown.
   */
  labels?: string[];
}

export interface Session {
  id: ID;
  groupId: ID;
  templateId?: ID; // may be ad-hoc
  title: string;
  /** Free-text context like "Tuesday rugby - tackling drills, wet pitch". */
  notes?: string;
  date: number; // ms timestamp
  scale: Scale; // snapshot at time of session
  criteria: SessionCriterion[]; // snapshot
  createdAt: number;
  updatedAt: number;
  /** Marked complete by the teacher. Incomplete sessions appear in "Continue". */
  status: 'in_progress' | 'complete';
}

export interface SessionCriterion {
  id: ID; // local to session
  name: string;
  description?: string;
}

export interface Mark {
  id: ID;
  sessionId: ID;
  personId: ID;
  criterionId: ID; // matches SessionCriterion.id
  value: number;
  /** Optional per-mark comment. */
  comment?: string;
  updatedAt: number;
}
