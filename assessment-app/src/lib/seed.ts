import { db, getSettings, now, uid } from '../db';
import type { Group, Person, Template } from '../types';
import { GALLERY, instantiateGalleryTemplate } from '../services/seeds/galleryTemplates';

/**
 * One-shot seed for first-run friendliness. Only runs when DB is fully empty.
 * Provides a realistic example so the user can see the flow before adding their own.
 *
 * The user picks their vertical on first launch (OnboardingPicker) which then
 * imports the relevant templates from the gallery.
 */
export async function seedIfEmpty(): Promise<boolean> {
  // Bootstrap settings doc on every launch (idempotent).
  await getSettings();

  const counts = await Promise.all([
    db.groups.count(),
    db.templates.count(),
  ]);
  if (counts.some((c) => c > 0)) return false;

  // First-launch demo so an empty app isn't intimidating. The onboarding flow
  // overlays this and lets the user pick a vertical to import richer templates.
  const t = now();
  const demoGroup: Group = {
    id: uid(),
    name: 'Demo class — Year 7 PE',
    subject: 'Physical Education',
    vertical: 'school',
    createdAt: t,
    updatedAt: t,
  };
  await db.groups.add(demoGroup);

  const sampleNames = [
    'Aiden Carter', 'Bella Hughes', 'Charlie Singh', 'Diya Patel',
    'Ethan Wright', 'Freya Taylor', 'George Adebayo', 'Hannah Liu',
    'Isaac Brown', 'Jasmine Khan', 'Kai Roberts', 'Lily Chen',
  ];
  const people: Person[] = sampleNames.map((name) => ({
    id: uid(),
    groupId: demoGroup.id,
    name,
    createdAt: t,
  }));
  await db.people.bulkAdd(people);

  // Two starter templates so the demo flow works end-to-end.
  const starters: Template[] = GALLERY
    .filter((g) => g.name === 'PE — Invasion Game Skills' || g.name === 'Effort, Behaviour & Progress')
    .map((g) => instantiateGalleryTemplate(g));
  await db.templates.bulkAdd(starters);
  return true;
}
