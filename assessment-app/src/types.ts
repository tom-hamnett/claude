export type ID = string;

/** Vertical / domain a group belongs to. Drives template gallery + AI prompts. */
export type Vertical =
  | 'school'
  | 'tuition'
  | 'sport'
  | 'health'
  | 'construction'
  | 'field'
  | 'corporate'
  | 'other';

/** A cohort of people or items being assessed: a class, a team, a site, a ward. */
export interface Group {
  id: ID;
  name: string;
  /** Optional descriptor like "Year 7 PE", "Site A — North Block", "Ward 4 students". */
  subject?: string;
  vertical?: Vertical;
  createdAt: number;
  updatedAt: number;
}

export interface Person {
  id: ID;
  groupId: ID;
  /** Display name used during sessions. Keep short for fast scanning. */
  name: string;
  /** Optional fields - common across verticals (admission no., asset tag, MRN-stub). */
  externalId?: string;
  notes?: string;
  archived?: boolean;
  createdAt: number;
}

/** A reusable bundle of criteria + scale that the marker can pick at session start. */
export interface Template {
  id: ID;
  name: string;
  description?: string;
  scale: Scale;
  criteria: TemplateCriterion[];
  /** Tags help filter templates - "PE", "Rugby", "Snagging", "OSCE". */
  tags: string[];
  vertical?: Vertical;
  /** Source attribution for templates from the gallery vs. user-created. */
  source?: 'gallery' | 'ai' | 'user';
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
  /** Free-text context. */
  notes?: string;
  date: number; // ms timestamp
  scale: Scale; // snapshot at time of session
  criteria: SessionCriterion[]; // snapshot
  /** Optional GPS / site marker captured at session start. */
  location?: { lat: number; lng: number; accuracy?: number; capturedAt: number };
  /** Optional signature blob id (from evidence table). */
  signatureEvidenceId?: ID;
  /** AI-generated narrative cached to the session for offline viewing. */
  aiNarrative?: { draftedAt: number; provider: string; model: string; markdown: string };
  /** AI-generated cohort insights cached to the session. */
  aiInsights?: { draftedAt: number; provider: string; model: string; bullets: string[] };
  createdAt: number;
  updatedAt: number;
  /** Marked complete by the marker. Incomplete sessions appear in "Continue". */
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
  /** Optional evidence (photo/voice/signature) ids attached to this mark. */
  evidenceIds?: ID[];
  updatedAt: number;
}

/** Binary blob stored separately so DB rows stay light. */
export interface Evidence {
  id: ID;
  sessionId: ID;
  /** Optional — if attached to a specific person/criterion mark. */
  personId?: ID;
  criterionId?: ID;
  kind: 'photo' | 'voice' | 'signature';
  /** MIME type, e.g. image/jpeg, audio/webm, image/png. */
  mime: string;
  blob: Blob;
  /** Bytes for quick UI display. */
  size: number;
  /** Optional auto-transcript for voice memos. */
  transcript?: string;
  /** Optional GPS at capture time. */
  location?: { lat: number; lng: number };
  capturedAt: number;
}

/** App-level settings stored as a single document. */
export interface AppSettings {
  id: 'singleton';
  /** Has the user completed first-run onboarding (vertical picker)? */
  onboarded?: boolean;
  /** Last selected vertical for prefilling new groups. */
  defaultVertical?: Vertical;
  /** Selected AI provider. */
  aiProvider?: AIProviderId;
  /** Selected model id (provider-specific). */
  aiModel?: string;
  /** BYOK API key, encrypted-at-rest with WebCrypto if a passphrase is set; otherwise plaintext. */
  aiKeyCipher?: string;
  /** True if BYOK key is plaintext (no passphrase). UI should warn. */
  aiKeyPlaintext?: boolean;
  /** License unlocking the AI features. */
  license?: License;
  /** Used calls today (managed tier quota). Reset on date change. */
  usageToday?: { date: string; count: number };
  /** Has the user dismissed the "install Sigma to home screen" hint? */
  installHintDismissed?: boolean;
  updatedAt: number;
}

/** Provider abstraction so BYOK works for any of these. */
export type AIProviderId = 'anthropic' | 'openai' | 'gemini';

/**
 * Local-only license document. Two paths:
 *  - "byok": one-time £4.99 unlock; user supplies their own API key. We verify
 *    the unlock code against a public-key signature so it works offline.
 *  - "managed": Sigma AI subscription; we route requests through Quantum Tools
 *    edge proxy with rate-limited token; verified per-launch when online.
 */
export interface License {
  tier: 'free' | 'byok' | 'managed';
  /** Opaque unlock code stored locally. */
  code?: string;
  /** Email associated with the unlock (display only). */
  email?: string;
  /** When was this license last verified online (managed tier). */
  lastVerifiedAt?: number;
  /** Activation timestamp. */
  activatedAt?: number;
  /** For managed tier: cached daily quota. */
  dailyQuota?: number;
}
