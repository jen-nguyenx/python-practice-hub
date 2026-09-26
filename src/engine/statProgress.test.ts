// STAT2402 progress: marks per lesson and per kind rebuilt from finished papers, and what to work on next.
import { describe, expect, it } from 'vitest';
import type { StatQuestion } from '../content/statQuestionSchema.ts';
import { scaleMarks } from './statExam.ts';
import { paperMarks, shareOf, statProgress } from './statProgress.ts';
import type { AppEvent } from './types.ts';

const ORDER = ['a', 'b', 'c'];
const q = (id: string, lessonId: string, kind: StatQuestion['kind'], marks: number): StatQuestion =>
  ({ id, lessonId, kind, marks, prompt: 'p', explain: 'e' }) as StatQuestion;
const BANK: StatQuestion[] = [
  q('a1', 'a', 'choice', 2), q('a2', 'a', 'number', 3), q('a3', 'a', 'write', 5),
  q('b1', 'b', 'choice', 2), q('b2', 'b', 'predict', 2), q('b3', 'b', 'number', 3),
  q('c1', 'c', 'choice', 2), q('c2', 'c', 'write', 5),
];

let n = 0;
const base = () => ({ eid: `e${n++}`, v: 1 as const, sessionId: 's' });
const read = (lessonId: string, ts = 1_000): AppEvent => ({ ...base(), ts, type: 'lesson_done', lessonId });
const paper = (kind: 'quiz' | 'mock' | 'practice', qids: string[], earned: number[], total: number, ts = 2_000): AppEvent => ({
  ...base(), ts, type: 'stat_test', kind, lessonIds: [...new Set(qids.map((id) => BANK.find((x) => x.id === id)!.lessonId))],
  score: earned.reduce((a, b) => a + b, 0), total, durationMs: 1, timedOut: false, qids, earned,
});

describe('what each question was out of', () => {
  const byId = new Map(BANK.map((x) => [x.id, x]));

  it('takes a quiz or practice test at the questions\' own weights', () => {
    const ev = paper('quiz', ['a1', 'a2', 'a3'], [2, 0, 2.5], 10) as Extract<AppEvent, { type: 'stat_test' }>;
    expect(paperMarks(ev, byId)).toEqual([2, 3, 5]);
  });

  it('shares a mock final\'s 100 marks out the way the paper did', () => {
    const qids = ['a1', 'b2', 'c1', 'a3', 'c2'];
    const ev = paper('mock', qids, [0, 0, 0, 0, 0], 100) as Extract<AppEvent, { type: 'stat_test' }>;
    expect(paperMarks(ev, byId)).toEqual(scaleMarks([2, 2, 2, 5, 5], 100));
  });

  it('gives up only on a question the bank no longer has', () => {
    const ev = paper('quiz', ['a1', 'a2'], [2, 3], 5) as Extract<AppEvent, { type: 'stat_test' }>;
    const withRetired = { ...ev, qids: ['a1', 'gone'] };
    expect(paperMarks(withRetired, byId)).toEqual([2, null]);
  });
});

describe('STAT2402 progress', () => {
  it('counts lessons read and quizzed, and papers sat, from this unit only', () => {
    const events = [read('a'), read('b'), read('core-strings'), paper('quiz', ['a1', 'a2', 'a3'], [2, 3, 5], 10)];
    const p = statProgress(events, ORDER, BANK);
    expect(p.read).toBe(2);
    expect(p.quizzed).toBe(1);
    expect(p.papers).toBe(1);
    expect(p.lessons.map((l) => l.read)).toEqual([true, true, false]);
  });

  it('adds marks up per lesson and per kind across every kind of paper', () => {
    const events = [
      paper('quiz', ['a1', 'a2', 'a3'], [2, 1.5, 0], 10),
      paper('practice', ['a1', 'b1'], [0, 2], 4),
    ];
    const p = statProgress(events, ORDER, BANK);
    const a = p.lessons.find((l) => l.lessonId === 'a')!;
    expect(a.marks).toEqual({ earned: 3.5, total: 12, answered: 4 });
    expect(p.kinds.find((k) => k.kind === 'choice')!.marks).toEqual({ earned: 4, total: 6, answered: 3 });
    expect(p.share).toBeCloseTo(5.5 / 14);
  });

  it('calls a lesson strong or weak only on enough evidence', () => {
    const strong = [
      paper('quiz', ['b1', 'b2', 'b3'], [2, 2, 3], 7),
      paper('quiz', ['b1', 'b2', 'b3'], [2, 2, 3], 7, 3_000),
    ];
    const weakOnTwo = [paper('practice', ['c1', 'c2'], [0, 0], 7)];
    const p = statProgress([...strong, ...weakOnTwo], ORDER, BANK);
    expect(p.lessons.find((l) => l.lessonId === 'b')!.label).toBe('strong');
    // Two questions is not enough to call a lesson weak.
    expect(p.lessons.find((l) => l.lessonId === 'c')!.label).toBe('ok');
    expect(p.strengths.map((s) => s.lessonId)).toEqual(['b']);
  });

  it('suggests the weakest lesson first, then a quiz for what was read, then the next lesson', () => {
    const events = [
      read('a'), read('b'),
      paper('quiz', ['a1', 'a2', 'a3'], [0, 0, 1], 10),
    ];
    const p = statProgress(events, ORDER, BANK);
    expect(p.workOn).toEqual([
      { lessonId: 'a', why: 'weak', share: 0.1 },
      { lessonId: 'b', why: 'quiz' },
      { lessonId: 'c', why: 'read' },
    ]);
  });

  it('keeps the mock finals in order for a trend, and still counts papers before the bank has loaded', () => {
    const events = [paper('mock', ['a1'], [0], 100, 5_000), paper('mock', ['a1'], [0], 100, 9_000)];
    events[0] = { ...events[0], score: 40 } as AppEvent;
    events[1] = { ...events[1], score: 65 } as AppEvent;
    const p = statProgress(events, ORDER, null);
    expect(p.mock.percents).toEqual([40, 65]);
    expect(p.mock.best?.percent).toBe(65);
    expect(p.papers).toBe(2);
    expect(p.share).toBeNull();
    expect(shareOf({ earned: 0, total: 0, answered: 0 })).toBeNull();
  });
});
