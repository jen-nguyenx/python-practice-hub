// The STAT2402 question bank, loaded when a test needs it: every lesson's questions and what the verifier
// recorded for them (src/content/generated/stat-questions.json). A few hundred kilobytes that nobody who
// never sits a STAT2402 test downloads.
import type { GeneratedStatQuestions, StatQuestion } from './statQuestionSchema.ts';
import type { StatBank } from '../engine/statExam.ts';

const files = import.meta.glob<{ default: StatQuestion[] }>('./stat2402/questions/*.ts');
const generated = () => import('./generated/stat-questions.json').then((m) => m.default as GeneratedStatQuestions);

let cache: Promise<StatBank> | null = null;

export function loadStatBank(): Promise<StatBank> {
  if (!cache) {
    cache = Promise.all([
      Promise.all(Object.keys(files).sort().map((k) => files[k]().then((m) => m.default ?? []))),
      generated(),
    ]).then(([lists, gen]) => ({ questions: lists.flat(), generated: gen }));
    // A failed load (a dropped connection, a stale chunk after a deploy) must not stick.
    cache.catch(() => { cache = null; });
  }
  return cache;
}
