// STAT2402 exam logic: what a paper holds, how answers are marked, what the history says.
import { describe, expect, it } from 'vitest';
import type { StatQuestion } from '../content/statQuestionSchema.ts';
import type { StatBank, StatItem } from './statExam.ts';
import {
  buildMock, buildPractice, buildQuiz, displayOrder, markInstant, MOCK_TOTAL_MARKS, MOCK_WRITE_QUESTIONS, parseNumber,
  scaleMarks, seededRng, statHistory, summarize, writeMarks,
} from './statExam.ts';
import { sanitizeEvent } from '../store/validate.ts';
import type { AppEvent } from './types.ts';

const LESSONS = ['a', 'b', 'c', 'd'];

function bank(): StatBank {
  const questions: StatQuestion[] = [];
  for (const l of LESSONS) {
    questions.push(
      { id: `${l}-choice`, lessonId: l, kind: 'choice', marks: 2, prompt: 'p', explain: 'e', options: [{ text: 'right', correct: true }, { text: 'wrong' }, { text: 'also wrong' }] },
      { id: `${l}-number`, lessonId: l, kind: 'number', marks: 3, prompt: 'p', explain: 'e', code: 'x', answer: 'y', tol: 0.006 },
      { id: `${l}-predict`, lessonId: l, kind: 'predict', marks: 2, prompt: 'p', explain: 'e', code: 'x', choices: ['[1] 1', '[1] 2'] },
      { id: `${l}-write`, lessonId: l, kind: 'write', marks: 5, prompt: 'p', explain: 'e', run: 'function', fnName: 'f', starter: 's', solution: 'f', tests: [] },
    );
  }
  const generated: StatBank['generated'] = {};
  for (const l of LESSONS) {
    generated[`${l}-number`] = { stdout: '', answer: 3.93 };
    generated[`${l}-predict`] = { stdout: '[1] 2   \n' };
  }
  return { questions, generated };
}

const itemFor = (b: StatBank, id: string, marks?: number): StatItem => {
  const q = b.questions.find((x) => x.id === id)!;
  return { q, gen: b.generated[id], marks: marks ?? q.marks };
};

describe('marking', () => {
  const b = bank();

  it('reads a typed number the way a person writes one', () => {
    expect(parseNumber('3.93')).toBe(3.93);
    expect(parseNumber(' -17.6 feet')).toBe(-17.6);
    expect(parseNumber('1,250')).toBe(1250);
    expect(parseNumber('65%')).toBe(65);
    expect(parseNumber('1.2e-5')).toBe(1.2e-5);
    expect(parseNumber('−2')).toBe(-2);
    expect(parseNumber('about four')).toBeNull();
    expect(parseNumber('')).toBeNull();
  });

  it('gives full marks within the tolerance and none outside it', () => {
    const it0 = itemFor(b, 'a-number');
    expect(markInstant(it0, { kind: 'number', typed: '3.93' })).toBe(3);
    expect(markInstant(it0, { kind: 'number', typed: '3.935' })).toBe(3);
    expect(markInstant(it0, { kind: 'number', typed: '3.94' })).toBe(0);
    expect(markInstant(it0, undefined)).toBe(0);
  });

  it('marks a choice by the option picked, and a prediction against what R printed', () => {
    expect(markInstant(itemFor(b, 'a-choice'), { kind: 'choice', picked: 'right' })).toBe(2);
    expect(markInstant(itemFor(b, 'a-choice'), { kind: 'choice', picked: 'wrong' })).toBe(0);
    expect(markInstant(itemFor(b, 'a-predict'), { kind: 'predict', picked: '[1] 2' })).toBe(2);
    expect(markInstant(itemFor(b, 'a-predict'), { kind: 'predict', picked: '[1] 1' })).toBe(0);
  });

  it('leaves a write question to R, and one with no recorded answer unmarked rather than wrong', () => {
    expect(markInstant(itemFor(b, 'a-write'), { kind: 'write', code: 'x' })).toBeNull();
    const stale: StatItem = { q: b.questions.find((q) => q.id === 'a-number')!, gen: undefined, marks: 3 };
    expect(markInstant(stale, { kind: 'number', typed: '3.93' })).toBeNull();
  });

  it('shares a write question\'s marks out by tests passed, to the half mark', () => {
    expect(writeMarks(5, 3, 3)).toBe(5);
    expect(writeMarks(5, 1, 3)).toBe(1.5);
    expect(writeMarks(5, 0, 3)).toBe(0);
    expect(writeMarks(5, 1, 0)).toBe(0);
  });

  it('shows options in a shuffled order that is the same every time', () => {
    const q = b.questions.find((x) => x.id === 'a-choice')!;
    expect(displayOrder(q)).toEqual(displayOrder(q));
    expect([...displayOrder(q)].sort()).toEqual(['also wrong', 'right', 'wrong']);
  });
});

describe('papers', () => {
  const b = bank();

  it('shares whole marks out to an exact total', () => {
    for (const weights of [[2, 3, 2, 5], [1, 1, 1], [3, 3, 3, 3, 3, 3, 7]]) {
      const m = scaleMarks(weights, 100);
      expect(m.reduce((x, y) => x + y, 0)).toBe(100);
      expect(m.every(Number.isInteger)).toBe(true);
    }
  });

  it('builds the mock final from every lesson, with writing questions from different lessons, out of 100', () => {
    const paper = buildMock(b, LESSONS, seededRng(7));
    const reading = paper.filter((p) => p.q.kind !== 'write');
    const writing = paper.filter((p) => p.q.kind === 'write');
    expect(new Set(reading.map((p) => p.q.lessonId))).toEqual(new Set(LESSONS));
    expect(writing).toHaveLength(Math.min(MOCK_WRITE_QUESTIONS, LESSONS.length));
    expect(new Set(writing.map((p) => p.q.lessonId)).size).toBe(writing.length);
    expect(paper.reduce((n, p) => n + p.marks, 0)).toBe(MOCK_TOTAL_MARKS);
  });

  it('prefers questions not seen in the last attempts', () => {
    const avoid = new Set(LESSONS.flatMap((l) => [`${l}-choice`, `${l}-number`]));
    const paper = buildMock(b, LESSONS, seededRng(3), avoid);
    expect(paper.filter((p) => p.q.kind !== 'write').every((p) => p.q.kind === 'predict')).toBe(true);
  });

  it('spreads a practice test across the chosen lessons', () => {
    const picked = buildPractice(b, { lessonIds: ['a', 'b'], count: 4, includeWrite: false }, LESSONS, seededRng(1));
    expect(picked).toHaveLength(4);
    expect(picked.filter((p) => p.q.lessonId === 'a')).toHaveLength(2);
    expect(picked.some((p) => p.q.kind === 'write')).toBe(false);
  });

  it('gives a lesson quiz every question written for that lesson', () => {
    expect(buildQuiz(b, 'c').map((p) => p.q.id)).toEqual(['c-choice', 'c-number', 'c-predict', 'c-write']);
  });

  it('adds marks up per lesson', () => {
    const items = buildQuiz(b, 'a').concat(buildQuiz(b, 'b'));
    const s = summarize('practice', 't', items, items.map((it) => it.marks / 2), { durationMs: 1, limitMs: 2, timedOut: false, finishedAt: 3 });
    expect(s.total).toBe(24);
    expect(s.earned).toBe(12);
    expect(s.percent).toBe(50);
    expect(s.perLesson).toEqual([{ lessonId: 'a', earned: 6, total: 12 }, { lessonId: 'b', earned: 6, total: 12 }]);
  });
});

describe('history and the event log', () => {
  const base = { v: 1, sessionId: 's' };
  const ev = (eid: string, ts: number, kind: 'quiz' | 'mock', lessonIds: string[], score: number): AppEvent =>
    ({ ...base, eid, ts, type: 'stat_test', kind, lessonIds, score, total: 10, durationMs: 1000, timedOut: false, qids: ['q1'], earned: [score] }) as AppEvent;

  it('finds one lesson\'s quizzes, newest first', () => {
    const events = [ev('1', 1, 'quiz', ['a'], 4), ev('2', 2, 'quiz', ['b'], 9), ev('3', 3, 'quiz', ['a'], 7), ev('4', 4, 'mock', ['a', 'b'], 5)];
    expect(statHistory(events, 'quiz', 'a').map((h) => h.score)).toEqual([7, 4]);
    expect(statHistory(events, 'mock')).toHaveLength(1);
  });

  it('keeps a real result from an imported file and refuses a doctored one', () => {
    const good = { eid: 'e', v: 1, ts: Date.now() - 1000, sessionId: 's', type: 'stat_test', kind: 'mock', lessonIds: ['a'], score: 7.5, total: 10, durationMs: 5, timedOut: false, qids: ['q1', 'q2'], earned: [5, 2.5] };
    expect(sanitizeEvent(good)).toMatchObject({ type: 'stat_test', score: 7.5, earned: [5, 2.5] });
    expect(sanitizeEvent({ ...good, score: 11 })).toBeNull();
    expect(sanitizeEvent({ ...good, kind: 'final' })).toBeNull();
    expect(sanitizeEvent({ ...good, earned: [5] })).toBeNull();
  });
});
