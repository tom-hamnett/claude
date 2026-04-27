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

  {
    vertical: 'sport',
    name: 'Rugby — Tackle Technique',
    description: 'Pitchside per-player rating during a contact session.',
    scale: { min: 1, max: 5, step: 1, labels: ['Avoid', 'Tentative', 'Effective', 'Strong', 'Game-changing'] },
    criteria: [
      { name: 'Body height', description: 'Drops below ball-carrier hip line.' },
      { name: 'Footwork', description: 'Last-stride approach is short and balanced.' },
      { name: 'Wrap & drive', description: 'Wraps both arms; drives through contact.' },
      { name: 'Head position', description: 'Cheek to cheek, head up the side.' },
      { name: 'Recovery', description: 'Back to feet quickly to compete or chase.' },
    ],
    tags: ['Rugby', 'Defence'],
  },
  {
    vertical: 'sport',
    name: 'Cricket — Batting Phase',
    description: 'Net-session or live-game observation across an over.',
    scale: { min: 1, max: 4, step: 1, labels: ['Below', 'Approaching', 'Match-ready', 'Standout'] },
    criteria: [
      { name: 'Stance & guard', description: 'Balanced base, head still, alignment.' },
      { name: 'Shot selection', description: 'Correct shot for length and line.' },
      { name: 'Footwork', description: 'Forward press or back foot as appropriate.' },
      { name: 'Running between wickets', description: 'Calling, turn, awareness.' },
    ],
    tags: ['Cricket', 'Batting'],
  },

  // ============================================================================
  // FIELD SERVICE / RETAIL
  // ============================================================================
  {
    vertical: 'field',
    name: 'Retail Store Visit — Standards',
    description: 'District manager or area lead visiting a retail unit.',
    scale: { min: 1, max: 5, step: 1, labels: ['Below brand', 'Patchy', 'On brand', 'Strong', 'Flagship'] },
    criteria: [
      { name: 'Window & entrance', description: 'Cleanliness, signage, on-message.' },
      { name: 'Layout & flow', description: 'Hot spots stocked; sight lines clear.' },
      { name: 'Stock & sizing', description: 'Available sizes, replenishment, BOH tidy.' },
      { name: 'Team presence', description: 'Greeting, attentive, on-uniform.' },
      { name: 'Till & queue', description: 'Speed, accuracy, upsell where appropriate.' },
    ],
    tags: ['Retail', 'Store visit'],
  },
  {
    vertical: 'field',
    name: 'Food Hygiene — Quick Audit',
    description: 'Brief environmental health-style observation in a kitchen.',
    scale: { min: 1, max: 3, step: 1, labels: ['Major non-compliance', 'Minor non-compliance', 'Compliant'] },
    criteria: [
      { name: 'Personal hygiene', description: 'Hand-wash, hair, jewellery, illness reporting.' },
      { name: 'Cleaning schedule', description: 'Surfaces, equipment, signed cleaning log.' },
      { name: 'Temperature controls', description: 'Fridge / freezer / hot-hold logs current.' },
      { name: 'Cross-contamination', description: 'Colour-coded boards, raw/RTE separation.' },
      { name: 'Pest control', description: 'No evidence of pests; doors and screens.' },
      { name: 'Allergens', description: 'Allergen matrix current; cross-contact controls.' },
    ],
    tags: ['Food hygiene', 'EHO'],
  },
  {
    vertical: 'field',
    name: 'Property Condition — Mid-Term',
    description: 'Letting agent mid-tenancy property inspection.',
    scale: { min: 1, max: 4, step: 1, labels: ['Damaged', 'Wear & tear', 'Good', 'As new'] },
    criteria: [
      { name: 'Walls & ceilings', description: 'Marks, scuffs, damp.' },
      { name: 'Floors', description: 'Carpet/laminate condition; staining.' },
      { name: 'Kitchen', description: 'Appliances, surfaces, sealants.' },
      { name: 'Bathroom', description: 'Tiling, sealant, mould, fittings.' },
      { name: 'Windows & doors', description: 'Operate, seal, locks.' },
      { name: 'Garden / external', description: 'Maintained, no rubbish accumulation.' },
    ],
    tags: ['Property', 'Inspection'],
  },

  // ============================================================================
  // ADDITIONAL HEALTH
  // ============================================================================
  {
    vertical: 'health',
    name: 'Mental Health — Brief Status',
    description: 'Therapist or community team brief check during a session.',
    scale: { min: 0, max: 4, step: 1, labels: ['Crisis', 'Concern', 'Stable', 'Improving', 'Recovered'] },
    criteria: [
      { name: 'Mood', description: 'Self-reported and observed.' },
      { name: 'Sleep', description: 'Quality and duration this week.' },
      { name: 'Engagement', description: 'Attendance, openness, follow-through on tasks.' },
      { name: 'Risk', description: 'Self-harm / harm to others / safeguarding flags.' },
      { name: 'Social functioning', description: 'Work, relationships, daily activities.' },
    ],
    tags: ['Mental health', 'Wellbeing'],
  },
  {
    vertical: 'health',
    name: 'Pharmacy — MUR Quality Check',
    description: 'Pharmacy peer-review of a Medicines Use Review consultation.',
    scale: { min: 1, max: 4, step: 1, labels: ['Concern', 'Developing', 'Competent', 'Exemplary'] },
    criteria: [
      { name: 'Patient introduction', description: 'Consent, purpose, confidentiality.' },
      { name: 'Medicines reconciliation', description: 'Accurate list against records.' },
      { name: 'Adherence exploration', description: 'Open questions; non-judgemental.' },
      { name: 'Counselling', description: 'Plain-language explanation of action / side effects.' },
      { name: 'Documentation', description: 'Clear, complete, actionable record.' },
    ],
    tags: ['Pharmacy', 'Clinical review'],
  },

  // ============================================================================
  // ADDITIONAL TUITION
  // ============================================================================
  {
    vertical: 'tuition',
    name: '11+ / Entrance — Verbal Reasoning',
    description: 'After a timed VR practice session.',
    scale: { min: 1, max: 5, step: 1, labels: ['Foundation', 'Building', 'Test-ready', 'Strong', 'Top-band'] },
    criteria: [
      { name: 'Pace', description: 'Working through items at target rate.' },
      { name: 'Accuracy', description: 'Answers correct under time pressure.' },
      { name: 'Strategy', description: 'Eliminates options; flags hard items to return to.' },
      { name: 'Vocabulary', description: 'Range and confidence with synonyms / antonyms.' },
      { name: 'Confidence', description: 'Composure, self-talk, response to setbacks.' },
    ],
    tags: ['11+', 'Entrance', 'VR'],
  },

  // ============================================================================
  // ADDITIONAL CONSTRUCTION
  // ============================================================================
  {
    vertical: 'construction',
    name: 'Mechanical Install — First-Fix QA',
    description: 'M&E supervisor sign-off check on first fix per zone.',
    scale: { min: 1, max: 3, step: 1, labels: ['Fail', 'Conditional', 'Pass'] },
    criteria: [
      { name: 'Pipework alignment', description: 'Levels, falls, supports per spec.' },
      { name: 'Penetrations', description: 'Fire-stopped, sleeved, sealed correctly.' },
      { name: 'Bracketing', description: 'Spacings, fixings, anti-vibration where needed.' },
      { name: 'Identification', description: 'Labelled, colour-coded, drawing-numbered.' },
      { name: 'Pressure test', description: 'Witnessed, recorded, signed.' },
    ],
    tags: ['M&E', 'First fix', 'QA'],
  },

  // ============================================================================
  // CORPORATE
  // ============================================================================
  {
    vertical: 'corporate',
    name: 'L&D — Skill Workshop Check',
    description: 'L&D facilitator assessing transfer of a taught skill at the end of a workshop.',
    scale: { min: 1, max: 4, step: 1, labels: ['Awareness', 'Guided', 'Independent', 'Coaches others'] },
    criteria: [
      { name: 'Demonstration', description: 'Performs the skill correctly under observation.' },
      { name: 'Articulation', description: 'Explains why and when to use the skill.' },
      { name: 'Application', description: 'Applies in a realistic role-play or scenario.' },
      { name: 'Reflection', description: 'Identifies where they will use it back at work.' },
    ],
    tags: ['L&D', 'Workshop', 'Skill transfer'],
  },
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
