import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { compactResponse, flagsOf, hintGate } from '../hints.ts';
import { lineDiff } from '../diff.ts';
import { errorOneLine, markersFrom, pythonName, runtimeStatusText, warningFlags } from '../plain.ts';
import { backupDraft, backupScratch, takeDraftBackup, takeScratchBackup } from '../unsaved.ts';

describe('hintGate', () => {
  const none = [0, 0, 0, 0];
  it('tier 1 opens after the first check or 45 s', () => {
    expect(hintGate(0, 0, 10_000, none, none)).toEqual({ available: false, text: 'after your first check or in 35 s' });
    expect(hintGate(0, 1, 1_000, none, none).available).toBe(true);
    expect(hintGate(0, 0, 45_000, none, none).available).toBe(true);
  });
  it('each later tier needs one more check or 20 s on the previous tier', () => {
    const shownAt = [0, 30_000, 0, 0];
    const checksAt = [0, 2, 0, 0];
    expect(hintGate(1, 2, 35_000, shownAt, checksAt)).toEqual({ available: false, text: 'after your next check or in 15 s' });
    expect(hintGate(1, 3, 35_000, shownAt, checksAt).available).toBe(true);
    expect(hintGate(1, 2, 50_000, shownAt, checksAt).available).toBe(true);
  });
  it('nothing after tier 3', () => {
    expect(hintGate(3, 9, 999_999, none, none).available).toBe(false);
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
