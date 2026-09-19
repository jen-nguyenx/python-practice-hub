// Lesson loader. Each lesson is its own chunk, loaded when it is opened.
//
// Lessons are discovered by their path rather than listed in a registry, so adding a file under
// src/content/lessons/<track>/ is all it takes: the verifier finds it the same way and writes both the
// library index and the lesson's generated output.
import type { GeneratedLesson, Lesson, Track } from '../lessonSchema.ts';
import LESSON_INDEX_JSON from '../generated/lesson-index.json';

/** What the library page needs about a lesson without loading the lesson itself. */
export interface LessonMeta {
  id: string;
  title: string;
  summary: string;
  track: Track;
  minutes: number;
  topicId?: string;
  prereqs?: string[];
  outcomes: string[];
  /** How many sections, for "7 steps" on the card. */
  sections: number;
}

export const LESSON_INDEX = LESSON_INDEX_JSON as LessonMeta[];

export const LESSON_BY_ID: Record<string, LessonMeta> = Object.fromEntries(
  LESSON_INDEX.map((l) => [l.id, l]),
);

/** Lesson id -> the lesson meta of the lesson teaching that topic, if one exists. */
export const LESSON_FOR_TOPIC: Record<string, LessonMeta> = Object.fromEntries(
  LESSON_INDEX.filter((l) => l.topicId).map((l) => [l.topicId as string, l]),
);

const modules = import.meta.glob<{ default: Lesson }>('./*/*.ts');
const generated = import.meta.glob<GeneratedLesson>('../generated/lessons/*.json', { import: 'default' });

const cache = new Map<string, Promise<Lesson | null>>();

/** The lesson's own file, found by id across the track folders. */
export function loadLesson(id: string): Promise<Lesson | null> {
  let p = cache.get(id);
  if (!p) {
    const key = Object.keys(modules).find((k) => k.endsWith(`/${id}.ts`));
    p = key ? modules[key]().then((m) => m.default ?? null) : Promise.resolve(null);
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

export function lessonsInTrack(track: Track): LessonMeta[] {
  return LESSON_INDEX.filter((l) => l.track === track);
}
