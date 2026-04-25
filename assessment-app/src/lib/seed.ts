import { db, now, uid } from '../db';
import type { Group, Person, Template } from '../types';

/**
 * One-shot seed for first-run friendliness. Only runs when DB is fully empty.
 * Provides a realistic PE example so the teacher can see the flow before adding their own.
 */
export async function seedIfEmpty(): Promise<boolean> {
  const counts = await Promise.all([
    db.groups.count(),
    db.templates.count(),
  ]);
  if (counts.some((c) => c > 0)) return false;

  const t = now();

  const peGroup: Group = {
    id: uid(),
    name: 'Year 7 PE — Set A',
    subject: 'Physical Education',
    createdAt: t,
    updatedAt: t,
  };
  await db.groups.add(peGroup);

  const sampleNames = [
    'Aiden Carter', 'Bella Hughes', 'Charlie Singh', 'Diya Patel',
    'Ethan Wright', 'Freya Taylor', 'George Adebayo', 'Hannah Liu',
    'Isaac Brown', 'Jasmine Khan', 'Kai Roberts', 'Lily Chen',
  ];
  const people: Person[] = sampleNames.map((name) => ({
    id: uid(),
    groupId: peGroup.id,
    name,
    createdAt: t,
  }));
  await db.people.bulkAdd(people);

  const rugbyTemplate: Template = {
    id: uid(),
    name: 'Rugby Skills',
    description: 'Core rugby skill criteria for invasion-game lessons.',
    scale: {
      min: 1,
      max: 5,
      step: 1,
      labels: ['Emerging', 'Developing', 'Secure', 'Strong', 'Mastery'],
    },
    criteria: [
      { id: uid(), name: 'Passing accuracy', description: 'Catches and passes under light pressure.' },
      { id: uid(), name: 'Tackling technique', description: 'Body position, head placement, follow-through.' },
      { id: uid(), name: 'Decision making', description: 'Selects the right action in attack/defence.' },
      { id: uid(), name: 'Effort & resilience', description: 'Sustained effort and response to setbacks.' },
      { id: uid(), name: 'Teamwork', description: 'Communicates and supports teammates.' },
    ],
    tags: ['PE', 'Rugby'],
    createdAt: t,
    updatedAt: t,
  };

  const generalEffort: Template = {
    id: uid(),
    name: 'Effort, Behaviour & Progress',
    description: 'Quick weekly check across any subject.',
    scale: { min: 1, max: 4, step: 1, labels: ['Below', 'Approaching', 'Meeting', 'Exceeding'] },
    criteria: [
      { id: uid(), name: 'Effort' },
      { id: uid(), name: 'Behaviour' },
      { id: uid(), name: 'Progress' },
    ],
    tags: ['General'],
    createdAt: t,
    updatedAt: t,
  };

  await db.templates.bulkAdd([rugbyTemplate, generalEffort]);
  return true;
}
