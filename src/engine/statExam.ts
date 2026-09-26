// STAT2402 exams, as pure logic: which questions a lesson quiz, a practice test or the mock final asks,
// what each is worth, how an answer is marked, and what past attempts say. No UI and no R here: a "write"
// answer is marked by running its tests in R, and this file only turns tests passed into marks.
import type { GeneratedStatQuestion, GeneratedStatQuestions, StatQuestion } from '../content/statQuestionSchema.ts';
import { normOutput } from '../runtime/r/driver.ts';
import type { AppEvent } from './types.ts';

export type StatTestKind = 'quiz' | 'mock' | 'practice';
export const STAT_TEST_KINDS: readonly StatTestKind[] = ['quiz', 'mock', 'practice'];
export const STAT_TEST_TITLE: Record<StatTestKind, string> = { quiz: 'Lesson quiz', mock: 'Mock final', practice: 'Practice test' };

/** The mock final: marked out of 100 across the whole unit, in two hours. */
export const MOCK_TOTAL_MARKS = 100;
export const MOCK_MINUTES = 120;
/** How many "write R" questions the mock final carries, from different lessons. */
export const MOCK_WRITE_QUESTIONS = 3;
/** Past this share of marks a result reads as a pass. A guide for the student, not the unit's rule. */
export const STAT_PASS_PERCENT = 50;
export const PRACTICE_COUNTS = [5, 10, 15, 20] as const;

/** Rough minutes each kind takes a prepared student, for timing a quiz or a practice test. */
const MINUTES_PER_KIND: Record<StatQuestion['kind'], number> = { choice: 2, predict: 2, number: 3, write: 8 };

export interface StatBank { questions: StatQuestion[]; generated: GeneratedStatQuestions }

/** One question as it sits in a test: what it is worth here may differ from its authored weight. */
export interface StatItem { q: StatQuestion; gen?: GeneratedStatQuestion; marks: number }

export type StatAnswer =
  | { kind: 'choice' | 'predict'; picked: string }
  | { kind: 'number'; typed: string }
  | { kind: 'write'; code: string };

// ---------- randomness ----------

/** Seeded generator (mulberry32), so a paper can be rebuilt from its seed. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(xs: readonly T[], rng: () => number): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A stable seed from text, so a question always shows its options in the same shuffled order. */
function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The options or choices in the order they are shown: shuffled, but the same every time for that question.
 * Authors tend to write the right answer first; a reader should not be able to rely on that.
 */
export function displayOrder(q: StatQuestion): string[] {
  const texts = q.kind === 'choice' ? q.options.map((o) => o.text) : q.kind === 'predict' ? q.choices : [];
  return shuffle(texts, seededRng(seedOf(q.id)));
}

// ---------- marking ----------

/** A typed number: spaces and thousands commas are ignored, and so is a trailing % or unit word. */
export function parseNumber(input: string): number | null {
  const m = /^\s*([+-]?(?:\d[\d,]*(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/.exec(input.replace(/−/g, '-'));
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** The right answer, in words fit to show after marking. */
export function correctAnswer(item: StatItem): string | null {
  const { q, gen } = item;
  if (q.kind === 'choice') return q.options.find((o) => o.correct)?.text ?? null;
  if (q.kind === 'number') return gen?.answer !== undefined ? String(gen.answer) : null;
  if (q.kind === 'predict') return gen?.stdout !== undefined ? normOutput(gen.stdout) : null;
  return null;
}

/**
 * Marks for an answer that needs no R: full or nothing. null for a write question, which R marks, and for
 * a question whose recorded output is missing (stale generated data): better unmarked than marked wrong.
 */
export function markInstant(item: StatItem, answer: StatAnswer | undefined): number | null {
  const { q, gen } = item;
  if (q.kind === 'write') return null;
  if (!answer) return 0;
  if (q.kind === 'choice' && answer.kind === 'choice') {
    return q.options.find((o) => o.text === answer.picked)?.correct ? item.marks : 0;
  }
  if (q.kind === 'predict' && answer.kind === 'predict') {
    if (gen?.stdout === undefined) return null;
    return normOutput(answer.picked) === normOutput(gen.stdout) ? item.marks : 0;
  }
  if (q.kind === 'number' && answer.kind === 'number') {
    if (gen?.answer === undefined) return null;
    const n = parseNumber(answer.typed);
    // A hair of slack so that exactly tol away, after floating-point rounding, still counts.
    return n !== null && Math.abs(n - gen.answer) <= q.tol * (1 + 1e-9) ? item.marks : 0;
  }
  return 0;
}

/** A write question's marks, shared out by tests passed, to the nearest half mark. */
export function writeMarks(marks: number, passed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((marks * passed * 2) / total) / 2;
}

/** Share `total` marks out in proportion to `weights`, whole marks only, adding up exactly (largest remainder). */
export function scaleMarks(weights: readonly number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (w * total) / sum);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, rem: r - Math.floor(r) })).sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    out[i] += 1;
    left -= 1;
  }
  return out;
}

export function minutesFor(items: readonly StatItem[]): number {
  const raw = items.reduce((n, it) => n + MINUTES_PER_KIND[it.q.kind], 0);
  return Math.max(5, Math.ceil(raw / 5) * 5);
}

// ---------- building a test ----------

const item = (bank: StatBank, q: StatQuestion, marks = q.marks): StatItem => ({ q, gen: bank.generated[q.id], marks });

/** In the order the unit teaches it, so a paper reads front to back like the course. */
function byLessonOrder(lessonOrder: readonly string[]) {
  const rank = new Map(lessonOrder.map((id, i) => [id, i]));
  return (a: StatQuestion, b: StatQuestion) => (rank.get(a.lessonId) ?? 99) - (rank.get(b.lessonId) ?? 99);
}

/** Questions not recently seen first, in random order within each group. */
function freshFirst(qs: readonly StatQuestion[], rng: () => number, avoid: ReadonlySet<string>): StatQuestion[] {
  const s = shuffle(qs, rng);
  return [...s.filter((q) => !avoid.has(q.id)), ...s.filter((q) => avoid.has(q.id))];
}

/** A lesson's quiz: every question written for it, in the order written. */
export function buildQuiz(bank: StatBank, lessonId: string): StatItem[] {
  return bank.questions.filter((q) => q.lessonId === lessonId).map((q) => item(bank, q));
}

/**
 * The mock final: one reading or number question from every lesson, then MOCK_WRITE_QUESTIONS write
 * questions from different lessons, marked out of MOCK_TOTAL_MARKS in proportion to their weights.
 */
export function buildMock(bank: StatBank, lessonOrder: readonly string[], rng: () => number, avoid: ReadonlySet<string> = new Set()): StatItem[] {
  const picked: StatQuestion[] = [];
  for (const lessonId of lessonOrder) {
    const pool = bank.questions.filter((q) => q.lessonId === lessonId && q.kind !== 'write');
    const q = freshFirst(pool, rng, avoid)[0];
    if (q) picked.push(q);
  }
  const writes: StatQuestion[] = [];
  const usedLessons = new Set<string>();
  for (const q of freshFirst(bank.questions.filter((x) => x.kind === 'write'), rng, avoid)) {
    if (writes.length >= MOCK_WRITE_QUESTIONS) break;
    if (usedLessons.has(q.lessonId)) continue;
    usedLessons.add(q.lessonId);
    writes.push(q);
  }
  const sort = byLessonOrder(lessonOrder);
  const all = [...picked.sort(sort), ...writes.sort(sort)];
  const marks = scaleMarks(all.map((q) => q.marks), MOCK_TOTAL_MARKS);
  return all.map((q, i) => item(bank, q, marks[i]));
}

export interface PracticeSetup { lessonIds: readonly string[]; count: number; includeWrite: boolean }

export function practiceEligible(bank: StatBank, setup: Omit<PracticeSetup, 'count'>): StatQuestion[] {
  const lessons = new Set(setup.lessonIds);
  return bank.questions.filter((q) => lessons.has(q.lessonId) && (setup.includeWrite || q.kind !== 'write'));
}

/** A practice test: `count` questions from the chosen lessons, spread across them, fresh ones first. */
export function buildPractice(bank: StatBank, setup: PracticeSetup, lessonOrder: readonly string[], rng: () => number, avoid: ReadonlySet<string> = new Set()): StatItem[] {
  const pool = practiceEligible(bank, setup);
  // Round-robin over the chosen lessons so ten questions from five lessons is two from each, not ten from one.
  const perLesson = new Map<string, StatQuestion[]>();
  for (const q of freshFirst(pool, rng, avoid)) {
    const list = perLesson.get(q.lessonId) ?? [];
    list.push(q);
    perLesson.set(q.lessonId, list);
  }
  const lessons = shuffle([...perLesson.keys()], rng);
  const picked: StatQuestion[] = [];
  while (picked.length < setup.count && lessons.some((l) => (perLesson.get(l)?.length ?? 0) > 0)) {
    for (const l of lessons) {
      const next = perLesson.get(l)?.shift();
      if (next && picked.length < setup.count) picked.push(next);
    }
  }
  return picked.sort(byLessonOrder(lessonOrder)).map((q) => item(bank, q));
}

// ---------- results ----------

export interface StatSummary {
  kind: StatTestKind;
  title: string;
  earned: number;
  total: number;
  percent: number;
  /** Per lesson, in the order the test asked them. */
  perLesson: { lessonId: string; earned: number; total: number }[];
  durationMs: number;
  limitMs: number;
  timedOut: boolean;
  finishedAt: number;
}

export function summarize(
  kind: StatTestKind, title: string, items: readonly StatItem[], earned: readonly number[],
  timing: { durationMs: number; limitMs: number; timedOut: boolean; finishedAt: number },
): StatSummary {
  const total = items.reduce((n, it) => n + it.marks, 0);
  const got = earned.reduce((n, e) => n + e, 0);
  const perLesson: StatSummary['perLesson'] = [];
  items.forEach((it, i) => {
    let row = perLesson.find((r) => r.lessonId === it.q.lessonId);
    if (!row) perLesson.push(row = { lessonId: it.q.lessonId, earned: 0, total: 0 });
    row.earned += earned[i] ?? 0;
    row.total += it.marks;
  });
  return { kind, title, earned: got, total, percent: total ? Math.round((got / total) * 100) : 0, perLesson, ...timing };
}

export interface StatAttempt { ts: number; kind: StatTestKind; lessonIds: string[]; score: number; total: number; percent: number; durationMs: number; qids: string[] }

type StatTestEvent = Extract<AppEvent, { type: 'stat_test' }>;

/** Past attempts of one kind (and, for quizzes, one lesson), newest first. */
export function statHistory(events: readonly AppEvent[], kind: StatTestKind, lessonId?: string): StatAttempt[] {
  const out: StatAttempt[] = [];
  for (const e of events) {
    if (e.type !== 'stat_test' || e.kind !== kind) continue;
    const ev = e as StatTestEvent;
    if (lessonId && !(ev.lessonIds.length === 1 && ev.lessonIds[0] === lessonId)) continue;
    out.push({
      ts: ev.ts, kind: ev.kind, lessonIds: ev.lessonIds, score: ev.score, total: ev.total,
      percent: ev.total ? Math.round((ev.score / ev.total) * 100) : 0, durationMs: ev.durationMs, qids: ev.qids,
    });
  }
  return out.sort((a, b) => b.ts - a.ts);
}

export function bestAttempt(history: readonly StatAttempt[]): StatAttempt | null {
  let best: StatAttempt | null = null;
  for (const h of history) if (!best || h.percent > best.percent || (h.percent === best.percent && h.ts > best.ts)) best = h;
  return best;
}

/** Question ids from the last few attempts, to prefer others next time. */
export function recentQids(history: readonly StatAttempt[], attempts = 2): Set<string> {
  return new Set(history.slice(0, attempts).flatMap((h) => h.qids));
}
