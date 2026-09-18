import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AppEvent } from '../../../engine/types.ts';
import { checkVerb, compactResponse, flagsOf, hintGate, restoredChecks, restoredHintTier } from '../hints.ts';
import { lineDiff } from '../diff.ts';
import { scoreText } from '../ResultBanner.tsx';
import { errorOneLine, markersFrom, pythonName, runtimeStatusText, warningFlags } from '../plain.ts';
import { backupDraft, backupScratch, takeDraftBackup, takeScratchBackup } from '../unsaved.ts';

describe('hintGate', () => {
  const none = [0, 0, 0, 0];
  it('tier 1 opens after the first check or 45 s', () => {
    expect(hintGate(0, 0, 10_000, none, none)).toEqual({ available: false, text: 'after you check once, or in 35 s' });
    expect(hintGate(0, 1, 1_000, none, none).available).toBe(true);
    expect(hintGate(0, 0, 45_000, none, none).available).toBe(true);
  });
  it('each later tier needs one more check or 20 s on the previous tier', () => {
    const shownAt = [0, 30_000, 0, 0];
    const checksAt = [0, 2, 0, 0];
    expect(hintGate(1, 2, 35_000, shownAt, checksAt)).toEqual({ available: false, text: 'after you check again, or in 15 s' });
    expect(hintGate(1, 3, 35_000, shownAt, checksAt).available).toBe(true);
    expect(hintGate(1, 2, 50_000, shownAt, checksAt).available).toBe(true);
  });
  it('names the real button: Submit on the editor formats, Check everywhere else', () => {
    expect(checkVerb('write')).toBe('submit');
    expect(checkVerb('fixBug')).toBe('submit');
    expect(checkVerb('refactor')).toBe('submit');
    expect(checkVerb('cloze')).toBe('check');
    expect(checkVerb('parsons')).toBe('check');
    expect(checkVerb('mcq')).toBe('check');
    expect(hintGate(0, 0, 0, none, none, 'submit').text).toBe('after you submit once, or in 45 s');
    expect(hintGate(1, 0, 0, none, none, 'submit').text).toBe('after you submit again, or in 20 s');
  });
  it('nothing after tier 3', () => {
    expect(hintGate(3, 9, 999_999, none, none).available).toBe(false);
  });
});

describe('state restored from the event log', () => {
  const hint = (qid: string, tier: 1 | 2 | 3, ts: number): AppEvent =>
    ({ type: 'hint', qid, topicId: 'variables-expressions', tier, dwellMs: 0, ts, id: `h${ts}`, session: 's' }) as unknown as AppEvent;
  const attempt = (qid: string, correct: boolean, ts: number, mode = 'practice'): AppEvent =>
    ({
      type: 'attempt', qid, topicId: 'variables-expressions', format: 'predict', diff: 'easy', mode, checkNo: 1,
      correct, score: correct ? 1 : 0, credit: correct ? 1 : 0, hintTier: 0, revealed: false, timeMs: 0, mistakes: [],
      ts, id: `a${ts}`, session: 's',
    }) as unknown as AppEvent;

  it('gives back the highest hint tier revealed for that question', () => {
    const events = [hint('q1', 1, 1), hint('q1', 2, 2), hint('q2', 3, 3)];
    expect(restoredHintTier(events, 'q1')).toBe(2);
    expect(restoredHintTier(events, 'q2')).toBe(3);
    expect(restoredHintTier(events, 'q3')).toBe(0);
  });
  it('never returns more tiers than the question has', () => {
    expect(restoredHintTier([hint('q1', 3, 1)], 'q1', 1)).toBe(1);
    expect(restoredHintTier([], 'q1', 3)).toBe(0);
  });
  it('counts practice checks and failures, ignoring other questions and test modes', () => {
    const events = [
      attempt('q1', false, 1), attempt('q1', false, 2), attempt('q1', true, 3),
      attempt('q1', false, 4, 'topic-test'), attempt('q2', false, 5),
    ];
    expect(restoredChecks(events, 'q1')).toEqual({ checks: 3, failed: 2 });
    expect(restoredChecks(events, 'q2')).toEqual({ checks: 1, failed: 1 });
    expect(restoredChecks(events, 'q3')).toEqual({ checks: 0, failed: 0 });
  });
});

describe('attempt response', () => {
  it('drops flags from the stored response and truncates long code', () => {
    expect(compactResponse({ code: 'x = 1', flags: ['for_each'] })).toEqual({ code: 'x = 1' });
    const long = compactResponse({ code: 'x'.repeat(10_000) }) as { code: string; truncated: boolean };
    expect(long.code.length).toBe(3500);
    expect(long.truncated).toBe(true);
    expect(compactResponse(undefined)).toBeUndefined();
  });
  it('reads flags given as names or findings, without duplicates', () => {
    expect(flagsOf({ flags: ['for_each', { flag: 'for_each', line: 2 }, { flag: 'fstring_used', line: 3 }] })).toEqual(['for_each', 'fstring_used']);
    expect(flagsOf({ code: 'x' })).toBeUndefined();
    expect(flagsOf(null)).toBeUndefined();
  });
});

describe('scoreText', () => {
  const res = (correct: boolean, score: number) => ({ correct, score, feedback: '', mistakes: [] });
  it('shows the credited score on every scored check, including a zero', () => {
    expect(scoreText({ result: res(true, 1), credit: 1, hints: 0, answerShown: false })).toBe('Score 100%');
    expect(scoreText({ result: res(false, 0.67), credit: 0.67, hints: 0, answerShown: false })).toBe('Score 67%');
    expect(scoreText({ result: res(false, 0), credit: 0, hints: 0, answerShown: false })).toBe('Score 0%');
  });
  it('names the hints used, and says nothing was scored once the answer was shown', () => {
    expect(scoreText({ result: res(true, 1), credit: 0.75, hints: 2, answerShown: false })).toBe('Score 75% with 2 hints');
    expect(scoreText({ result: res(false, 0), credit: 0, hints: 1, answerShown: true })).toBe('No score: the answer was shown');
    expect(scoreText({ result: null, credit: 0, hints: 0, answerShown: false })).toBe('');
  });
  it('counts marks on exam-style questions', () => {
    expect(scoreText({ result: res(false, 0.5), credit: 0.5, hints: 0, answerShown: false, marks: 6 })).toBe('3 of 6 marks');
  });
});

describe('lineDiff', () => {
  it('marks one changed line as a delete plus an add, ignoring trailing spaces', () => {
    const rows = lineDiff('a\nb  \nc\n', 'a\nB\nc');
    expect(rows.map((r) => r.kind)).toEqual(['same', 'del', 'add', 'same']);
    expect(rows[1]).toMatchObject({ text: 'b  ', a: 2 });
    expect(rows[2]).toMatchObject({ text: 'B', b: 2 });
  });
  it('handles added and removed tails', () => {
    expect(lineDiff('a', 'a\nb').map((r) => r.kind)).toEqual(['same', 'add']);
    expect(lineDiff('a\nb', 'a').map((r) => r.kind)).toEqual(['same', 'del']);
  });
});

describe('plain language helpers', () => {
  it('names Python from its version string', () => {
    expect(pythonName('3.14.2 (main, Jan 1 2026)')).toBe('Python 3.14.2');
    expect(runtimeStatusText({ state: 'ready', python: '3.14.2' })).toBe('Python 3.14.2 · ready');
    expect(runtimeStatusText({ state: 'loading', stage: 'x', elapsedMs: 4_400 })).toBe('Python is starting · 4 s');
  });
  it('shows only warning flags that have text, once per line', () => {
    const flags = warningFlags([
      { flag: 'for_each', line: 1 },
      { flag: 'range_len_index', line: 2 },
      { flag: 'range_len_index', line: 2 },
      { flag: 'shadow_builtin', line: 1 },
    ]);
    expect(flags).toEqual([{ flag: 'range_len_index', line: 2 }, { flag: 'shadow_builtin', line: 1 }]);
  });
  it('builds editor markers for syntax errors, runtime errors and warnings', () => {
    const syntaxError = { type: 'SyntaxError', message: "expected ':'", line: 2, col: 9, endCol: 10, traceback: '' };
    const runtimeError = { type: 'ZeroDivisionError', message: 'division by zero', line: 4, traceback: '' };
    const markers = markersFrom({ syntaxError, runtimeError, flags: [{ flag: 'range_len_index', line: 3 }] });
    expect(markers).toHaveLength(3);
    expect(markers[0]).toMatchObject({ line: 2, col: 9, endCol: 10, severity: 'error' });
    expect(markers[1]).toMatchObject({ line: 4, severity: 'error', message: 'ZeroDivisionError: division by zero (line 4)' });
    expect(markers[2]).toMatchObject({ line: 3, severity: 'warning' });
    expect(markers[2].message).not.toContain('`');
  });
  it('explains stops in plain words', () => {
    expect(errorOneLine({ type: 'TimeoutError', message: 'x', line: 3, traceback: '' })).toBe('Took too long: the code may be stuck in a loop (line 3)');
  });
});

describe('unsaved backups', () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = new Map();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
  });
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });
  it('restores a draft only for the same question and only when newer', () => {
    backupDraft('t01-s1-q1', 'print(1)');
    expect(takeDraftBackup('t01-s1-q2', undefined)).toBeNull();
    const b = takeDraftBackup('t01-s1-q1', undefined);
    expect(b?.draft).toBe('print(1)');
    expect(takeDraftBackup('t01-s1-q1', undefined)).toBeNull();
    backupDraft('t01-s1-q1', 'old');
    expect(takeDraftBackup('t01-s1-q1', Date.now() + 10_000)).toBeNull();
  });
  it('round-trips scratch files and ignores junk', () => {
    backupScratch([{ id: 'a', updatedAt: 5, code: 'x' }]);
    expect(takeScratchBackup()).toEqual([{ id: 'a', updatedAt: 5, code: 'x' }]);
    expect(takeScratchBackup()).toEqual([]);
    store.set('pyladder:playground-unsaved', '{"not":"a list"}');
    expect(takeScratchBackup()).toEqual([]);
  });
});
