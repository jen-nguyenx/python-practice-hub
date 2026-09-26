// The two UWA units PyLadder is a path for. A student picks one the first time they open the app (and can
// switch in Settings); the choice decides what home shows, which lesson tracks are on offer and which
// destinations the bar carries. Everything else about a unit -- its lessons, its language -- hangs off the
// tracks, so this file only names the units and says which is in force.
import type { Lang } from './lessonSchema.ts';

export type UnitId = 'cits1401' | 'stat2402';

export const UNIT_IDS: readonly UnitId[] = ['cits1401', 'stat2402'];

export interface UnitInfo {
  id: UnitId;
  /** The code a student knows it by, e.g. "CITS1401". */
  code: string;
  /** The unit's full name at UWA. */
  name: string;
  /** One sentence for the chooser: what this path gives you. */
  blurb: string;
  lang: Lang;
}

export const UNITS: Record<UnitId, UnitInfo> = {
  cits1401: {
    id: 'cits1401',
    code: 'CITS1401',
    name: 'Computational Thinking with Python',
    blurb: 'Thirteen topics from your first line of Python to recursion, with questions, topic tests and a mock final exam.',
    lang: 'python',
  },
  stat2402: {
    id: 'stat2402',
    code: 'STAT2402',
    name: 'Analysis of Observations',
    blurb: 'Regression and generalised linear models in R: lessons, sliders and exercises, with real R running in your browser.',
    lang: 'r',
  },
};

export function isUnitId(v: unknown): v is UnitId {
  return v === 'cits1401' || v === 'stat2402';
}

/**
 * The unit in force. Someone who has not chosen yet is treated as CITS1401, which is what the app was
 * before there was a choice, so an existing student's app looks exactly as it did until they pick.
 */
export function unitOf(settings: { unit?: UnitId | null }): UnitId {
  return isUnitId(settings.unit) ? settings.unit : 'cits1401';
}
