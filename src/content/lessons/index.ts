// Lesson loader. Each lesson is its own chunk, loaded when it is opened.
//
// Lessons are discovered by their path rather than listed in a registry, so adding a file under
// src/content/lessons/<track>/ is all it takes: the verifier finds it the same way and writes both the
// library index and the lesson's generated output.
import { TOPICS } from '../topics.ts';
import type { GeneratedLesson, Lesson, Track } from '../lessonSchema.ts';
import LESSON_INDEX_JSON from '../generated/lesson-index.json';

/** What the library page needs about a lesson without loading the lesson itself. */
export interface LessonMeta {
  id: string;
  /** Place in the track's reading order; core lessons get their topic's order instead. */
  order?: number;
  title: string;
  summary: string;
  track: Track;
  minutes: number;
  topicId?: string;
  prereqs?: string[];
  outcomes: string[];
  /** How many sections, for "7 steps" on the card. */
  sections: number;
  /** Each section's title, so the library can be searched by what a lesson covers. */
  sectionTitles: string[];
}

export const LESSON_INDEX = LESSON_INDEX_JSON as LessonMeta[];

// Null-prototype: a lesson id arrives from the URL, and a plain object would answer "#/lesson/toString"
// with a function rather than undefined.
export const LESSON_BY_ID: Record<string, LessonMeta> = Object.assign(
  Object.create(null) as Record<string, LessonMeta>,
  Object.fromEntries(LESSON_INDEX.map((l) => [l.id, l])),
);

/** Lesson id -> the lesson meta of the lesson teaching that topic, if one exists. */
export const LESSON_FOR_TOPIC: Record<string, LessonMeta> = Object.assign(
  Object.create(null) as Record<string, LessonMeta>,
  Object.fromEntries(LESSON_INDEX.filter((l) => l.topicId).map((l) => [l.topicId as string, l])),
);

const modules = import.meta.glob<{ default: Lesson }>('./*/*.ts');
const generated = import.meta.glob<GeneratedLesson>('../generated/lessons/*.json', { import: 'default' });

const cache = new Map<string, Promise<Lesson | null>>();

/** The lesson's own file, found by id across the track folders. */
export function loadLesson(id: string): Promise<Lesson | null> {
  let p = cache.get(id);
  if (!p) {
    const key = Object.keys(modules).find((k) => k.endsWith(`/${id}.ts`));
    // A rejected import (a dropped connection, a stale chunk after a deploy) must not be cached, or the
    // lesson reads as "does not exist" until the whole page is reloaded.
    p = key
      ? modules[key]().then((m) => m.default ?? null, (err) => { cache.delete(id); throw err; })
      : Promise.resolve(null);
    cache.set(id, p);
  }
  return p;
}

/** What each runnable block in the lesson really produced. Missing file means nothing to run. */
export function loadLessonOutputs(id: string): Promise<GeneratedLesson> {
  const key = `../generated/lessons/${id}.json`;
  const loader = generated[key];
  return loader ? loader() : Promise.resolve({});
}

/**
 * Reading order, which is the whole point of a library: a beginner must meet "What a program is" before
 * "Doing arithmetic". Core lessons follow the unit's topic order; the other tracks use their own `order`.
 */
export function lessonsInTrack(track: Track): LessonMeta[] {
  const place = (l: LessonMeta): number => {
    if (l.topicId) {
      const i = TOPICS.findIndex((t) => t.id === l.topicId);
      if (i >= 0) return i;
    }
    return l.order ?? Number.MAX_SAFE_INTEGER;
  };
  return LESSON_INDEX
    .filter((l) => l.track === track)
    .slice()
    .sort((a, b) => place(a) - place(b) || a.title.localeCompare(b.title));
}
