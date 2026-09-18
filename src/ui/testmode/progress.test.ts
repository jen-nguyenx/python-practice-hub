import { describe, expect, it } from 'vitest';
import type { TestProgress } from './progress.ts';
import { itemsForProgress, parseProgress, progressStorageKey, progressTimeLeft, PROGRESS_MAX_AGE_MS } from './progress.ts';

const NOW = 1_800_000_000_000;

function sample(): TestProgress {
  return {
    v: 1, kind: 'practice-test', key: 'practice', title: 'Practice test', qids: ['t01-s1-q1', 't02-s1-q2', 't03-s1-q3'],
    durationMin: 20, startedAt: NOW - 5 * 60_000, savedAt: NOW - 1000, current: 2,
    answers: [[0, { result: { correct: true, score: 1, mistakes: [] }, response: 'b', timeMs: 30_000 }],
      [1, { result: { correct: false, score: 0, mistakes: [{ id: 'off_by_one_range', channel: 'distractor' }] }, response: 'a', timeMs: 20_000 }]],
    flagged: [2], timeSpent: [30_000, 20_000, 40_000], drafts: [[2, 'def f():\n    pass']],
  };
}

describe('parseProgress', () => {
  it('round-trips a saved test', () => {
    const p = sample();
    expect(parseProgress(JSON.stringify(p), 'practice-test', 'practice', NOW)).toEqual({
      ...p,
      answers: [[0, { ...p.answers[0][1], result: { ...p.answers[0][1].result, feedback: undefined } }],
        [1, { ...p.answers[1][1], result: { ...p.answers[1][1].result, feedback: undefined } }]],
    });
  });

  it('rejects other kinds, keys, junk and stale progress', () => {
    const raw = JSON.stringify(sample());
    expect(parseProgress(raw, 'topic-test', 'practice', NOW)).toBeNull();
    expect(parseProgress(raw, 'practice-test', 'strings', NOW)).toBeNull();
    expect(parseProgress('not json', 'practice-test', 'practice', NOW)).toBeNull();
    expect(parseProgress(null, 'practice-test', 'practice', NOW)).toBeNull();
    expect(parseProgress(JSON.stringify({ ...sample(), qids: [] }), 'practice-test', 'practice', NOW)).toBeNull();
    expect(parseProgress(raw, 'practice-test', 'practice', NOW + PROGRESS_MAX_AGE_MS + 5000)).toBeNull();
  });

  it('drops out-of-range indexes, unknown mistakes and malformed answers', () => {
    const p = sample() as unknown as Record<string, unknown>;
    p.answers = [[7, { result: { correct: true, score: 1, mistakes: [] }, timeMs: 1 }], [1, { result: { correct: 'yes' } }],
      [2, { result: { correct: false, score: 0.5, mistakes: [{ id: 'not_a_mistake', channel: 'test' }, { id: 'zero_division', channel: 'runtime' }] }, timeMs: -4 }]];
    p.flagged = [0, 9, -1];
    p.current = 12;
    p.timeSpent = [1, 'x'];
    const out = parseProgress(JSON.stringify(p), 'practice-test', 'practice', NOW)!;
    expect(out.answers).toEqual([[2, { result: { correct: false, score: 0.5, mistakes: [{ id: 'zero_division', channel: 'runtime' }], feedback: undefined }, response: undefined, timeMs: 0 }]]);
    expect(out.flagged).toEqual([0]);
    expect(out.current).toBe(0);
    expect(out.timeSpent).toEqual([1, 0, 0]);
  });
});

describe('progress helpers', () => {
  it('time left and storage keys', () => {
    expect(progressTimeLeft({ startedAt: NOW - 5 * 60_000, durationMin: 20 }, NOW)).toBe(15 * 60_000);
    expect(progressTimeLeft({ startedAt: NOW - 25 * 60_000, durationMin: 20 }, NOW)).toBe(0);
    expect(progressStorageKey('topic-test', 'strings')).toBe('pyladder:test-progress:topic-test:strings');
  });

  it('maps saved question ids back to pool entries in order, or null when one is gone', () => {
    const pool = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(itemsForProgress({ qids: ['c', 'a'] }, pool)).toEqual([{ id: 'c' }, { id: 'a' }]);
    expect(itemsForProgress({ qids: ['c', 'z'] }, pool)).toBeNull();
  });
});
