// STAT2402 progress (#/report when the unit is STAT2402). Pure: everything is derived from the event log,
// the lesson order and the question bank, like the CITS1401 report is.
//
// A `stat_test` event keeps the marks earned on each question but not what each question was out of.
// That is recovered from the bank: a quiz or practice test marks every question out of its own weight, and
// the mock final shares 100 marks out in proportion to the weights (scaleMarks), so doing the same sum
// again gives the same marks back.
import type { StatQuestion, StatQuestionKind } from '../content/statQuestionSchema.ts';
import { STAT_QUESTION_KINDS } from '../content/statQuestionSchema.ts';
import type { StatAttempt } from './statExam.ts';
import { bestAttempt, scaleMarks, statHistory } from './statExam.ts';
import { dayNumber } from './streak.ts';
import type { AppEvent } from './types.ts';

/** A lesson is a strength at 85% or more of the marks across at least this many questions answered. */
export const STAT_MIN_FOR_STRONG = 5;
/** And needs work under 60% across at least this many. */
export const STAT_MIN_FOR_WEAK = 3;
const STRONG = 0.85;
const WEAK = 0.6;

export interface StatMarks { earned: number; total: number; answered: number }

export interface StatLessonRow {
  lessonId: string;
  read: boolean;
  quiz: { best: number | null; last: number | null; attempts: number; lastTs: number | null };
  /** Every question from this lesson answered on any paper: a quiz, a practice test or a mock final. */
  marks: StatMarks;
  label: 'strong' | 'weak' | 'ok' | 'not-started';
}

export type StatWorkOn =
  | { lessonId: string; why: 'weak'; share: number }
  | { lessonId: string; why: 'quiz' }
  | { lessonId: string; why: 'read' };

export interface StatProgressData {
  lessons: StatLessonRow[];
  read: number;
  quizzed: number;
  papers: number;
  /** Days on which a STAT2402 lesson was finished or a STAT2402 paper was sat. */
  days: number;
  /** Share of all marks available on every paper sat, or null before the first. */
  share: number | null;
  mock: { best: StatAttempt | null; last: StatAttempt | null; attempts: number; percents: number[] };
  practice: { best: StatAttempt | null; last: StatAttempt | null; attempts: number };
  kinds: { kind: StatQuestionKind; marks: StatMarks }[];
  strengths: { lessonId: string; share: number }[];
  workOn: StatWorkOn[];
}

type StatTestEvent = Extract<AppEvent, { type: 'stat_test' }>;

const empty = (): StatMarks => ({ earned: 0, total: 0, answered: 0 });
export const shareOf = (m: StatMarks): number | null => (m.total > 0 ? m.earned / m.total : null);

/**
 * What each question on a finished paper was out of. Null for a question the bank no longer has; the
 * others are still worked out from their own weights so one retired question does not lose a paper.
 */
export function paperMarks(ev: StatTestEvent, byId: ReadonlyMap<string, StatQuestion>): (number | null)[] {
  const qs = ev.qids.map((id) => byId.get(id) ?? null);
  const weights = qs.map((q) => q?.marks ?? 0);
  const sum = weights.reduce((a, b) => a + b, 0);
  if (qs.every(Boolean) && sum !== ev.total) {
    const scaled = scaleMarks(weights, ev.total);
    return qs.map((_, i) => scaled[i]);
  }
  return qs.map((q) => (q ? q.marks : null));
}

export function statProgress(events: readonly AppEvent[], lessonOrder: readonly string[], questions: readonly StatQuestion[] | null): StatProgressData {
  const inUnit = new Set(lessonOrder);
  const byId = new Map((questions ?? []).map((q) => [q.id, q]));
  const read = new Set<string>();
  const days = new Set<number>();
  const perLesson = new Map(lessonOrder.map((id) => [id, empty()]));
  const perKind = new Map(STAT_QUESTION_KINDS.map((k) => [k, empty()]));
  const all = empty();
  let papers = 0;

  for (const e of events) {
    if (e.type === 'lesson_done' && inUnit.has(e.lessonId)) {
      read.add(e.lessonId);
      days.add(dayNumber(e.ts));
    }
    if (e.type !== 'stat_test') continue;
    papers++;
    days.add(dayNumber(e.ts));
    if (!questions) continue;
    const ev = e as StatTestEvent;
    const outOf = paperMarks(ev, byId);
    ev.qids.forEach((qid, i) => {
      const q = byId.get(qid);
      const total = outOf[i];
      if (!q || total === null || total <= 0) return;
      const earned = Math.min(Math.max(ev.earned[i] ?? 0, 0), total);
      for (const m of [perLesson.get(q.lessonId), perKind.get(q.kind), all]) {
        if (!m) continue;
        m.earned += earned;
        m.total += total;
        m.answered += 1;
      }
    });
  }

  const lessons: StatLessonRow[] = lessonOrder.map((lessonId) => {
    const quizzes = statHistory(events, 'quiz', lessonId);
    const marks = perLesson.get(lessonId) ?? empty();
    const share = shareOf(marks);
    const label: StatLessonRow['label'] = share === null ? 'not-started'
      : share >= STRONG && marks.answered >= STAT_MIN_FOR_STRONG ? 'strong'
        : share < WEAK && marks.answered >= STAT_MIN_FOR_WEAK ? 'weak' : 'ok';
    return {
      lessonId,
      read: read.has(lessonId),
      quiz: { best: bestAttempt(quizzes)?.percent ?? null, last: quizzes[0]?.percent ?? null, attempts: quizzes.length, lastTs: quizzes[0]?.ts ?? null },
      marks,
      label,
    };
  });

  const strengths = lessons
    .filter((l) => l.label === 'strong')
    .map((l) => ({ lessonId: l.lessonId, share: shareOf(l.marks)! }))
    .sort((a, b) => b.share - a.share);

  // Weakest first; then lessons read but never quizzed, in reading order; then the next lesson to read.
  const workOn: StatWorkOn[] = [
    ...lessons.filter((l) => l.label === 'weak')
      .map((l) => ({ lessonId: l.lessonId, why: 'weak' as const, share: shareOf(l.marks)! }))
      .sort((a, b) => a.share - b.share),
    ...lessons.filter((l) => l.read && l.quiz.attempts === 0).map((l) => ({ lessonId: l.lessonId, why: 'quiz' as const })),
  ];
  const nextRead = lessons.find((l) => !l.read);
  if (nextRead) workOn.push({ lessonId: nextRead.lessonId, why: 'read' });

  const mocks = statHistory(events, 'mock');
  const practices = statHistory(events, 'practice');
  return {
    lessons,
    read: read.size,
    quizzed: lessons.filter((l) => l.quiz.attempts > 0).length,
    papers,
    days: days.size,
    share: shareOf(all),
    mock: { best: bestAttempt(mocks), last: mocks[0] ?? null, attempts: mocks.length, percents: mocks.map((m) => m.percent).reverse() },
    practice: { best: bestAttempt(practices), last: practices[0] ?? null, attempts: practices.length },
    kinds: STAT_QUESTION_KINDS.map((kind) => ({ kind, marks: perKind.get(kind) ?? empty() })),
    strengths,
    workOn: workOn.slice(0, 4),
  };
}
