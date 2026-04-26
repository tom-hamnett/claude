import type { Template, Vertical } from '../../types';
import { uid, now } from '../../db';

/**
 * Gallery templates for the four launch verticals plus general.
 * These are the "credible rubric in 30 seconds" promise — when a user picks
 * their vertical, they see useful templates instantly without needing AI.
 */

export interface GalleryTemplate {
  vertical: Vertical;
  name: string;
  description: string;
  scale: { min: number; max: number; step: number; labels: string[] };
  criteria: { name: string; description: string }[];
  tags: string[];
}

export const GALLERY: GalleryTemplate[] = [
  // ============================================================================
  // SCHOOL
  // ============================================================================
  {
    vertical: 'school',
    name: 'PE — Invasion Game Skills',
    description: 'Quick assessment for any invasion game (rugby, football, hockey, basketball).',
    scale: { min: 1, max: 5, step: 1, labels: ['Emerging', 'Developing', 'Secure', 'Strong', 'Mastery'] },
    criteria: [
      { name: 'Skill execution', description: 'Technique under light pressure.' },
      { name: 'Decision making', description: 'Picks the right action in attack and defence.' },
      { name: 'Spatial awareness', description: 'Uses width and depth; finds space.' },
      { name: 'Resilience', description: 'Sustained effort and response to setbacks.' },
      { name: 'Teamwork', description: 'Communicates and supports teammates.' },
    ],
    tags: ['PE', 'Sport', 'Invasion games'],
  },
  {
    vertical: 'school',
    name: 'Effort, Behaviour & Progress',
    description: 'Weekly check across any subject.',
    scale: { min: 1, max: 4, step: 1, labels: ['Below', 'Approaching', 'Meeting', 'Exceeding'] },
    criteria: [
      { name: 'Effort', description: 'Engagement and persistence in lessons.' },
      { name: 'Behaviour', description: 'Conduct and contribution to the class.' },
      { name: 'Progress', description: 'Visible improvement against starting point.' },
    ],
    tags: ['General', 'Pastoral'],
  },
  {
    vertical: 'school',
    name: 'Oracy / Speaking & Listening',
    description: 'Modern foreign languages, English, debate, presentation skills.',
    scale: { min: 1, max: 5, step: 1, labels: ['Hesitant', 'Emerging', 'Confident', 'Fluent', 'Eloquent'] },
    criteria: [
      { name: 'Pronunciation', description: 'Clear, accurate sound production.' },
      { name: 'Range', description: 'Vocabulary and structures used.' },
      { name: 'Coherence', description: 'Ideas connect and flow.' },
      { name: 'Engagement', description: 'Listens and responds to others.' },
      { name: 'Confidence', description: 'Pace, volume, eye contact.' },
    ],
    tags: ['MFL', 'English', 'Oracy'],
  },
  {
    vertical: 'school',
    name: 'Independent Learning Habits',
    description: 'Tracks classroom learning behaviours over a term.',
    scale: { min: 1, max: 4, step: 1, labels: ['Rarely', 'Sometimes', 'Usually', 'Always'] },
    criteria: [
      { name: 'Self-starts', description: 'Begins work without prompting.' },
      { name: 'Asks for help', description: 'Knows when and how to ask.' },
      { name: 'Stays focused', description: 'Concentration through the lesson.' },
      { name: 'Reviews work', description: 'Checks and improves before submitting.' },
    ],
    tags: ['Pastoral', 'Habits'],
  },

  // ============================================================================
  // TUITION
  // ============================================================================
  {
    vertical: 'tuition',
    name: '1:1 Maths — Topic Mastery Check',
    description: 'End-of-session pulse on a maths topic.',
    scale: { min: 1, max: 4, step: 1, labels: ['Stuck', 'Hints', 'Independent', 'Teaching others'] },
    criteria: [
      { name: 'Procedure', description: 'Carries out the steps correctly.' },
      { name: 'Reasoning', description: 'Explains why each step works.' },
      { name: 'Application', description: 'Applies to an unfamiliar problem.' },
      { name: 'Fluency', description: 'Speed and accuracy without prompts.' },
    ],
    tags: ['Maths', '1:1', 'Mastery'],
  },
  {
    vertical: 'tuition',
    name: '1:1 GCSE/A-level Essay Skills',
    description: 'After a written response.',
    scale: { min: 1, max: 5, step: 1, labels: ['Foundation', 'Developing', 'Solid', 'Strong', 'Top band'] },
    criteria: [
      { name: 'Argument', description: 'Clear thesis sustained throughout.' },
      { name: 'Evidence', description: 'Selects and integrates evidence well.' },
      { name: 'Analysis', description: 'Goes beyond description to interpretation.' },
      { name: 'Structure', description: 'Logical flow with signposting.' },
      { name: 'Expression', description: 'Precision, range, accuracy.' },
    ],
    tags: ['English', 'Essay', '1:1'],
  },

  // ============================================================================
  // CONSTRUCTION
  // ============================================================================
  {
    vertical: 'construction',
    name: 'Site Safety Walk',
    description: 'Quick tour assessment of safety conditions.',
    scale: { min: 1, max: 3, step: 1, labels: ['Non-conformance', 'Conditional', 'Compliant'] },
    criteria: [
      { name: 'Edge protection', description: 'Guard rails, toe boards, safety nets in place.' },
      { name: 'PPE worn', description: 'All persons wearing required PPE for area.' },
      { name: 'Housekeeping', description: 'Walkways clear; materials stacked safely.' },
      { name: 'Signage', description: 'Hazards signed; permits visible.' },
      { name: 'Access', description: 'Scaffolds, ladders, lifts inspected and tagged.' },
      { name: 'Welfare', description: 'Toilets, drying, drinking water available.' },
    ],
    tags: ['Safety', 'Inspection', 'Walk'],
  },
  {
    vertical: 'construction',
    name: 'Snagging — Final Fix',
    description: 'Room-by-room or unit-by-unit defect sweep before handover.',
    scale: { min: 1, max: 3, step: 1, labels: ['Reject', 'Rework', 'Accept'] },
    criteria: [
      { name: 'Finishes', description: 'Paint, decoration, sealants clean and even.' },
      { name: 'Doors & windows', description: 'Operate smoothly; seals intact.' },
      { name: 'Sanitaryware', description: 'Sealed, level, plumbed, undamaged.' },
      { name: 'Electrical', description: 'Sockets, switches, lights working and aligned.' },
      { name: 'Floor', description: 'Level, clean, no scratches or stains.' },
    ],
    tags: ['Snagging', 'Handover', 'QA'],
  },
  {
    vertical: 'construction',
    name: 'Toolbox Talk — Behaviour Audit',
    description: 'During or after a toolbox talk, rate engagement and understanding.',
    scale: { min: 1, max: 4, step: 1, labels: ['Disengaged', 'Passive', 'Engaged', 'Champion'] },
    criteria: [
      { name: 'Listening', description: 'Attentive, no distractions.' },
      { name: 'Questions', description: 'Asks clarifying or extending questions.' },
      { name: 'Demonstration', description: 'Can demonstrate the safe method.' },
      { name: 'Peer behaviour', description: 'Reinforces safe practice with peers.' },
    ],
    tags: ['Behaviour', 'Toolbox', 'Safety culture'],
  },

  // ============================================================================
  // HEALTH
  // ============================================================================
  {
    vertical: 'health',
    name: 'OSCE — Observed Clinical Skill',
    description: 'Examiner check during an Objective Structured Clinical Exam station.',
    scale: { min: 1, max: 5, step: 1, labels: ['Unsafe', 'Borderline', 'Pass', 'Strong', 'Distinction'] },
    criteria: [
      { name: 'Communication', description: 'Introduces self, explains, checks understanding.' },
      { name: 'Consent', description: 'Obtains and documents informed consent.' },
      { name: 'Technique', description: 'Performs the procedure correctly and safely.' },
      { name: 'Hygiene', description: 'Hand hygiene, asepsis as appropriate.' },
      { name: 'Closure', description: 'Documents, debriefs, plans next steps.' },
    ],
    tags: ['OSCE', 'Clinical', 'Workplace-based'],
  },
  {
    vertical: 'health',
    name: 'Nursing Skills — Bedside Handover',
    description: 'Brief observation during shift handover.',
    scale: { min: 1, max: 4, step: 1, labels: ['Concern', 'Developing', 'Competent', 'Exemplary'] },
    criteria: [
      { name: 'SBAR structure', description: 'Situation, background, assessment, recommendation.' },
      { name: 'Accuracy', description: 'Information matches notes and observations.' },
      { name: 'Patient-centred', description: 'Speaks to and includes the patient.' },
      { name: 'Risk flagging', description: 'Falls, sepsis, deteriorating, escalation noted.' },
    ],
    tags: ['Nursing', 'Handover', 'Communication'],
  },
  {
    vertical: 'health',
    name: 'Community Visit — Skills Check',
    description: 'Home visit observation for community / district nursing trainees.',
    scale: { min: 1, max: 4, step: 1, labels: ['Concern', 'Developing', 'Competent', 'Independent'] },
    criteria: [
      { name: 'Safety check', description: 'Risk assesses environment for self and patient.' },
      { name: 'Rapport', description: 'Builds trust quickly with patient and family.' },
      { name: 'Procedure', description: 'Performs planned care to standard.' },
      { name: 'Documentation', description: 'Records visit accurately on device.' },
    ],
    tags: ['Community', 'Home visit', 'Trainee'],
  },

  // ============================================================================
  // SPORT
  // ============================================================================
  {
    vertical: 'sport',
    name: 'Football — Possession Phase',
    description: 'Pitchside assessment during a possession-based session.',
    scale: { min: 1, max: 5, step: 1, labels: ['Reactive', 'Aware', 'Confident', 'Composed', 'Match-elite'] },
    criteria: [
      { name: 'First touch', description: 'Direction and quality under pressure.' },
      { name: 'Scanning', description: 'Looks before receiving.' },
      { name: 'Passing', description: 'Weight and timing through lines.' },
      { name: 'Movement', description: 'Off-ball runs to support.' },
      { name: 'Pressing', description: 'Trigger and intensity when out of possession.' },
    ],
    tags: ['Football', 'Technical'],
  },

  // ============================================================================
  // CORPORATE
  // ============================================================================
  {
    vertical: 'corporate',
    name: 'Customer Conversation Audit',
    description: 'Manager observing a frontline call or face-to-face interaction.',
    scale: { min: 1, max: 5, step: 1, labels: ['Below brand', 'Inconsistent', 'On brand', 'Memorable', 'Hero moment'] },
    criteria: [
      { name: 'Opening', description: 'Warm, on-brand, sets expectations.' },
      { name: 'Listening', description: 'Picks up explicit and implicit needs.' },
      { name: 'Solution', description: 'Resolves or escalates appropriately.' },
      { name: 'Personalisation', description: 'Tailors to the customer in front of them.' },
      { name: 'Closure', description: 'Confirms outcome, next steps, leaves clean.' },
    ],
    tags: ['CX', 'Frontline'],
  },
];

export const VERTICAL_LABELS: Record<Vertical, { label: string; emoji: string; tagline: string }> = {
  school:       { label: 'Schools',      emoji: '🎓', tagline: 'Classroom rubrics, observation notes, end-of-term reports.' },
  tuition:      { label: '1:1 Tutoring', emoji: '📚', tagline: 'Per-session progress, parent updates, mastery checks.' },
  sport:        { label: 'Sport',        emoji: '⚽', tagline: 'Pitchside skill assessment for coaches.' },
  health:       { label: 'Health',       emoji: '🏥', tagline: 'OSCEs, observed practice, community visits.' },
  construction: { label: 'Construction', emoji: '🏗️', tagline: 'Safety walks, snagging, toolbox audits.' },
  field:        { label: 'Field service',emoji: '📋', tagline: 'Store visits, inspections, condition reports.' },
  corporate:    { label: 'Corporate',    emoji: '💼', tagline: 'Customer conversations, competency, L&D.' },
  other:        { label: 'Something else', emoji: '✨', tagline: 'Generic templates and AI-generated rubrics.' },
};

/** Convert a gallery row into a saveable Template. */
export function instantiateGalleryTemplate(g: GalleryTemplate): Omit<Template, 'id' | 'createdAt' | 'updatedAt'> & { id: string; createdAt: number; updatedAt: number } {
  const t = now();
  return {
    id: uid(),
    name: g.name,
    description: g.description,
    scale: { ...g.scale },
    criteria: g.criteria.map((c) => ({ id: uid(), name: c.name, description: c.description })),
    tags: [...g.tags],
    vertical: g.vertical,
    source: 'gallery',
    createdAt: t,
    updatedAt: t,
  };
}
