import type { Module, TrackId } from '../types';
import { TRACKS } from './rubric';
import { m1 } from './modules/m1';
import { m2 } from './modules/m2';
import { m3 } from './modules/m3';
import { m4 } from './modules/m4';
import { m5 } from './modules/m5';
import { m6 } from './modules/m6';
import { m7 } from './modules/m7';
import { m8 } from './modules/m8';
import { m9 } from './modules/m9';
import { m10 } from './modules/m10';

export const MODULES: Module[] = [m1, m2, m3, m4, m5, m6, m7, m8, m9, m10];

export { TRACKS };

export const moduleByNumber = (n: number): Module | undefined =>
  MODULES.find((m) => m.number === n);

export const moduleBySlug = (slug: string): Module | undefined =>
  MODULES.find((m) => m.slug === slug);

export const trackById = (id: TrackId) => TRACKS.find((t) => t.id === id);

export function lessonCount(m: Module): number {
  return m.lessons.length;
}

export function totalReadMinutes(): number {
  return MODULES.reduce((sum, m) => sum + m.estReadMin, 0);
}

/** Track display order for grouping in the Learn library. */
export const TRACK_ORDER: TrackId[] = ['presence', 'connection', 'clarity', 'influence', 'practice'];
