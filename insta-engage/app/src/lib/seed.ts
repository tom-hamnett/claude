import type { Funnel, Settings } from '../types';

// Defaults come from docs/messaging-principles.md (research, 20 Nov 2026).
export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  dailyCap: 20,
  topN: 25,
  cohortThreshold: 5000,
  targetFunctions: ['procurement', 'finance', 'strategy', 'operations', 'hr', 'transformation', 'consulting'],
  blockedSectors: ['hotels', 'hospitality'],
  blockedCompanies: ['IHG', 'IHG Hotels & Resorts'],
  bannedWords: [
    'free', 'exclusive', 'unlock', 'quick call', 'just checking in', 'circling back', 'touch base',
    'game-changer', 'game changer', 'synergy', 'limited time', 'act now', 'guaranteed', 'revolutionary',
    'hop on', 'jump on a call', 'leverage', 'skyrocket', 'secret',
  ],
};

const now = () => new Date().toISOString();

/**
 * The Analyst's Edge example-report funnel. One funnel per artefact; copy it
 * for the next product. Stage order is the happy path; branches handle replies.
 */
export function analystsEdgeFunnel(): Funnel {
  return {
    id: 'ae-example-report',
    name: "Analyst's Edge: example report",
    artefact: "Redacted example report naming their company and peers",
    active: true,
    createdAt: now(),
    stages: [
      {
        id: 'thanks',
        name: 'Thank and ask',
        kind: 'first_touch',
        goal: 'Thank them for what they did and find out what caught their interest. No pitch, no link.',
        template:
          "Hi {first_name}, thanks for {engagement_phrase}. Curious what caught your eye: {interest_options}? One word is plenty.",
        maxWords: 45,
        attachReport: false,
        followUpDays: 4,
        branches: [
          { when: 'interested', goto: 'offer-example' },
          { when: 'named_company', goto: 'share' },
          { when: 'question', goto: 'offer-example' },
          { when: 'yes', goto: 'offer-example' },
          { when: 'not_now', goto: 'nurture' },
          { when: 'no', goto: 'stop' },
          { when: 'no_reply', goto: 'nudge' },
        ],
      },
      {
        id: 'nudge',
        name: 'Nudge',
        kind: 'follow_up',
        goal: 'One light, no-oriented question. Easy out. Only if they follow us or accepted the request.',
        template: "Hi {first_name}, have you parked the {topic} stuff for now? No worries either way.",
        maxWords: 30,
        attachReport: false,
        followUpDays: null,
        branches: [
          { when: 'interested', goto: 'offer-example' },
          { when: 'named_company', goto: 'share' },
          { when: 'yes', goto: 'offer-example' },
          { when: 'not_now', goto: 'nurture' },
          { when: 'no', goto: 'stop' },
          { when: 'no_reply', goto: 'stop' },
        ],
      },
      {
        id: 'offer-example',
        name: 'Offer the example',
        kind: 'discovery',
        goal: 'Ask permission to send an example and get the company or function they care about.',
        template:
          "Makes sense. I can show you what the report would look like for {employer_or_company} against its peers. Want me to send it, or is there another company you'd rather see?",
        maxWords: 45,
        attachReport: false,
        followUpDays: 4,
        branches: [
          { when: 'yes', goto: 'share' },
          { when: 'named_company', goto: 'share' },
          { when: 'interested', goto: 'share' },
          { when: 'not_now', goto: 'nurture' },
          { when: 'no', goto: 'stop' },
          { when: 'no_reply', goto: 'nudge-2' },
        ],
      },
      {
        id: 'share',
        name: 'Share the example',
        kind: 'share_report',
        goal: 'Send the redacted example for their company and peers, say what it shows, one easy question.',
        template:
          "Here's the example for {report_subject} against {peers_short}. Numbers are blacked out, but it shows the pages you'd get. Would the real version help with {challenge}?",
        maxWords: 60,
        attachReport: true,
        followUpDays: 3,
        branches: [
          { when: 'yes', goto: 'offer' },
          { when: 'interested', goto: 'offer' },
          { when: 'question', goto: 'offer' },
          { when: 'named_company', goto: 'share' },
          { when: 'not_now', goto: 'nurture' },
          { when: 'no', goto: 'stop' },
          { when: 'no_reply', goto: 'nudge-2' },
        ],
      },
      {
        id: 'nudge-2',
        name: 'Second nudge',
        kind: 'follow_up',
        goal: 'Last follow-up. No-oriented, easy out. After this we stop.',
        template: "Hi {first_name}, is this one for later? Happy to leave it there.",
        maxWords: 30,
        attachReport: false,
        followUpDays: null,
        branches: [
          { when: 'yes', goto: 'nurture' },
          { when: 'interested', goto: 'offer' },
          { when: 'named_company', goto: 'share' },
          { when: 'no', goto: 'stop' },
          { when: 'no_reply', goto: 'stop' },
        ],
      },
      {
        id: 'offer',
        name: 'Offer',
        kind: 'offer',
        goal: 'State the matching pack and price plainly, then ask permission. Only after a positive reply.',
        template:
          "The {pack_name} on {report_subject} is {pack_price}: {pack_what}. Want me to set one up for your {moment}?",
        maxWords: 70,
        attachReport: false,
        followUpDays: 5,
        branches: [
          { when: 'yes', goto: 'won' },
          { when: 'question', goto: 'offer' },
          { when: 'not_now', goto: 'nurture' },
          { when: 'no', goto: 'nurture' },
          { when: 'no_reply', goto: 'nurture' },
        ],
      },
      {
        id: 'nurture',
        name: 'Nurture',
        kind: 'nurture',
        goal: 'Keep the door open without asking for anything. Point to the weekly benchmark if they want it.',
        template:
          "No problem at all. I post a benchmark most weeks, so it'll be in your feed if the timing changes. Thanks again, {first_name}.",
        maxWords: 40,
        attachReport: false,
        followUpDays: null,
        branches: [{ when: 'interested', goto: 'offer-example' }, { when: 'named_company', goto: 'share' }],
      },
      {
        id: 'won',
        name: 'Won',
        kind: 'closed',
        goal: 'Order taken. Send the order link and next steps.',
        template: "Great, thanks {first_name}. Here's the link to order: {product_url}. I'll start as soon as it's in.",
        maxWords: 45,
        attachReport: false,
        followUpDays: null,
        branches: [],
      },
    ],
  };
}

/** Product ladder from the marketing plan v2, keyed by the motivation it serves. */
export const PACKS = {
  interview: { name: 'interview pack', price: '£99', what: 'five pages and the three questions to ask' },
  budget: { name: 'budget-round pack', price: '£99', what: 'the sentence, the page and the questions management will ask back' },
  onepager: { name: 'one-page benchmark', price: '£249', what: 'the anchor table and verdict scorecard against its peers' },
  pitch: { name: 'pitch pack', price: '£499', what: 'five to eight pages, Template A or B cut, plus questions to ask' },
  deal: { name: 'deal screen', price: 'quoted', what: 'up to ten targets across five lenses' },
} as const;
