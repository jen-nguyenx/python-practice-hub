import { describe, expect, it } from 'vitest';
import type { Question } from '../../content/schema.ts';
import type { AppEvent } from '../../engine/types.ts';
import type { SavedAnswer, TestItem } from './summary.ts';
import { bestResult, buildTestEvents, compactResponse, passMarkFor, strongNextStep, summarizeTest, testHistory, weakTopics } from './summary.ts';

function q(id: string, format: Question['format'], diff: Question['diff'] = 'medium'): Question {
  return {
    id, format, diff, core: true, title: `Q ${id}`, prompt: 'p', concepts: [], detects: [], expectedSec: 120,
    hints: ['a', 'b', 'c'], solution: { explanation: 'x' }, options: [],
  } as unknown as Question;
}

const items: TestItem[] = [
  { q: q('t05-s1-q1', 'predict'), topicId: 'strings' },
  { q: q('t05-s1-q2', 'mcq'), topicId: 'strings' },
  { q: q('t03-s1-q3', 'parsons'), topicId: 'for-loops-range' },
  { q: q('t03-s2-q1', 'write', 'hard'), topicId: 'for-loops-range' },
  { q: q('t03-s2-q2', 'fixBug'), topicId: 'for-loops-range' },
];

function answers(): Map<number, SavedAnswer> {
  return new Map<number, SavedAnswer>([
    [0, { result: { correct: true, score: 1, mistakes: [] }, response: '4\n5', timeMs: 30000 }],
    [1, { result: { correct: false, score: 0, mistakes: [{ id: 'off_by_one_range', channel: 'distractor' }] }, response: 'b', timeMs: 20000 }],
    [2, { result: { correct: true, score: 1, mistakes: [] }, response: [1, 0, 2], timeMs: 60000 }],
    [3, { result: { correct: false, score: 0.5, mistakes: [{ id: 'print_vs_return', channel: 'test' }, { id: 'accumulator_init', channel: 'static' }] }, response: 'def f(): pass', timeMs: 300000 }],
  ]);
}

function summary(kind: 'topic-test' | 'midsem' = 'midsem') {
  return summarizeTest({
    kind, title: 'T', items, answers: answers(), flagged: new Set([3]), timeSpent: [30000, 20000, 60000, 300000, 12000],
    durationMs: 422000, limitMs: 900000, timedOut: false, finishedAt: 1000,
  });
}

describe('summarizeTest', () => {
  it('counts correct, answered, percent and per-topic results in topic order', () => {
    const s = summary();
    expect(s.total).toBe(5);
    expect(s.correct).toBe(2);
    expect(s.answered).toBe(4);
    expect(s.percent).toBe(40);
    expect(s.topicIds).toEqual(['for-loops-range', 'strings']);
    expect(s.perTopic).toEqual([
      { topicId: 'for-loops-range', total: 3, correct: 1, answered: 2 },
      { topicId: 'strings', total: 2, correct: 1, answered: 2 },
    ]);
    expect(s.outcomes[3]).toMatchObject({ answered: true, correct: false, score: 0.5, flagged: true, timeMs: 300000 });
    expect(s.outcomes[4]).toMatchObject({ answered: false, correct: false, score: 0, timeMs: 12000 });
  });

  it('applies pass marks: topic test 4 of 5, mid-sem 50%', () => {
    expect(passMarkFor('topic-test', 5)).toBe(4);
    expect(passMarkFor('midsem', 15)).toBe(8);
    expect(passMarkFor('midsem', 10)).toBe(5);
    expect(summary('topic-test').passed).toBe(false);
    expect(summary('midsem').passed).toBe(false);
  });

  it('weak topics are below 70%, weakest first', () => {
    expect(weakTopics(summary()).map((t) => t.topicId)).toEqual(['for-loops-range', 'strings']);
  });

  it('suggests a bigger test only for a strong mid-sem result that was not already the biggest', () => {
    const allRight = new Map<number, SavedAnswer>(items.map((_, i) => [i, { result: { correct: true, score: 1, mistakes: [] }, response: null, timeMs: 1000 }]));
    const strong = (kind: 'topic-test' | 'midsem') => summarizeTest({
      kind, title: 'T', items, answers: allRight, flagged: new Set(), timeSpent: [0, 0, 0, 0, 0],
      durationMs: 1000, limitMs: 900000, timedOut: false, finishedAt: 1000,
    });
    // Weak topics exist: the Practise links are the next step.
    expect(strongNextStep(summary('midsem'), { maxCount: 30, midsemTopics: 7 })).toBeNull();
    // A topic test never suggests adding topics.
    expect(strongNextStep(strong('topic-test'), { maxCount: 30, midsemTopics: 7 })).toBeNull();
    expect(strongNextStep(strong('midsem'), { maxCount: 30, midsemTopics: 7 })).toMatch(/more questions or more topics/);
    expect(strongNextStep(strong('midsem'), { maxCount: 5, midsemTopics: 7 })).toMatch(/more topics\.$/);
    expect(strongNextStep(strong('midsem'), { maxCount: 30, midsemTopics: 2 })).toMatch(/more questions\.$/);
    expect(strongNextStep(strong('midsem'), { maxCount: 5, midsemTopics: 2 })).toBeNull();
  });
});

describe('buildTestEvents', () => {
  it('logs one attempt per answered question with its mistakes, then test_result', () => {
    const s = summary('topic-test');
    const ev = buildTestEvents(s, items, answers());
    expect(ev.map((e) => e.type)).toEqual(['attempt', 'attempt', 'mistake', 'attempt', 'attempt', 'mistake', 'mistake', 'test_result']);
    const a = ev[5 - 2];
    expect(a).toMatchObject({ type: 'attempt', qid: 't03-s1-q3', mode: 'topic-test', checkNo: 1, hintTier: 0, revealed: false, credit: 1, score: 1 });
    const partial = ev.find((e) => e.type === 'attempt' && e.qid === 't03-s2-q1');
    expect(partial).toMatchObject({ correct: false, score: 0.5, credit: 0.5, mistakes: ['print_vs_return', 'accumulator_init'], timeMs: 300000, diff: 'hard', format: 'write' });
    expect(ev[2]).toEqual({ type: 'mistake', qid: 't05-s1-q2', topicId: 'strings', mistake: 'off_by_one_range', channel: 'distractor' });
    expect(ev[7]).toEqual({
      type: 'test_result', kind: 'topic-test', topicIds: ['for-loops-range', 'strings'], score: 2, total: 5, passed: false,
      durationMs: 422000, qids: ['t05-s1-q1', 't05-s1-q2', 't03-s1-q3', 't03-s2-q1', 't03-s2-q2'],
    });
    expect(ev.some((e) => e.type === 'attempt' && e.qid === 't03-s2-q2')).toBe(false);
  });

  it('truncates long responses', () => {
    expect(compactResponse('x'.repeat(5000))).toHaveLength(4000);
    expect((compactResponse({ code: 'y'.repeat(5000) }) as string).length).toBe(4000);
    expect(compactResponse({ a: 1 })).toEqual({ a: 1 });
  });
});

describe('testHistory', () => {
  const base = { v: 1 as const, sessionId: 's', durationMs: 60000, qids: [] };
  const events: AppEvent[] = [
    { ...base, eid: '1', ts: 100, type: 'test_result', kind: 'midsem', topicIds: ['strings'], score: 6, total: 10, passed: true },
    { ...base, eid: '2', ts: 200, type: 'test_result', kind: 'topic-test', topicIds: ['strings'], score: 5, total: 5, passed: true },
    { ...base, eid: '3', ts: 300, type: 'test_result', kind: 'midsem', topicIds: ['strings', 'recursion'], score: 12, total: 15, passed: true },
    { ...base, eid: '4', ts: 400, type: 'test_result', kind: 'midsem', topicIds: ['strings'], score: 8, total: 10, passed: true },
    { eid: '5', v: 1, ts: 50, sessionId: 's', type: 'session_start' },
  ];

  it('lists one kind newest first and finds the best', () => {
    const h = testHistory(events, 'midsem');
    expect(h.map((x) => x.ts)).toEqual([400, 300, 100]);
    expect(h[0].percent).toBe(80);
    // 80% twice: the one with more questions wins.
    expect(bestResult(h)?.ts).toBe(300);
    expect(testHistory(events, 'topic-test', 'strings')).toHaveLength(1);
    expect(testHistory(events, 'topic-test', 'recursion')).toHaveLength(0);
    expect(bestResult([])).toBeNull();
  });
});
