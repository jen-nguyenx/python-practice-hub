import { describe, expect, it } from 'vitest';
import {
  buildPredictChoices, charSegments, differingLines, gridHasInput, hashString, isCodeLike, lineDiffOps, linesPhrase,
  normalizeForDisplay, outputDiff, outputLines, parseTraceRows, seededShuffle,
} from './logic.ts';

describe('normalizeForDisplay', () => {
  it('converts CRLF, strips trailing spaces and trailing blank lines, keeps inner spaces', () => {
    expect(normalizeForDisplay('a  b  \r\nc\t\r\n\r\n\n')).toBe('a  b\nc');
    expect(normalizeForDisplay('  lead')).toBe('  lead');
    expect(normalizeForDisplay('')).toBe('');
  });
  it('outputLines of empty output is empty', () => {
    expect(outputLines('\n\n')).toEqual([]);
    expect(outputLines('x\n\ny\n')).toEqual(['x', '', 'y']);
  });
});

describe('seeded shuffle and predict choices', () => {
  it('hash is stable', () => {
    expect(hashString('t01-s1-q1')).toBe(hashString('t01-s1-q1'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });
  it('shuffle is deterministic per seed, keeps all items and does not mutate input', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const one = seededShuffle(items, 'seed');
    expect(seededShuffle(items, 'seed')).toEqual(one);
    expect(one.slice().sort()).toEqual(items);
    expect(items).toEqual(['a', 'b', 'c', 'd', 'e']);
    const orders = new Set(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'].map((s) => seededShuffle(items, s).join('')));
    expect(orders.size).toBeGreaterThan(1);
  });
  it('dedupes outputs after normalisation and includes the real output', () => {
    const c = buildPredictChoices('t01-s1-q1', '2 h 15 min\n3.5 3 -4\n', ['2 h 15 min\n3 3 -3', '2 h 15 min  \n3.5 3 -4', '2 h 15 min\n3 3 -3\n']);
    expect(c.map((x) => x.text).sort()).toEqual(['2 h 15 min\n3 3 -3', '2 h 15 min\n3.5 3 -4']);
    expect(new Set(c.map((x) => x.key)).size).toBe(2);
    expect(buildPredictChoices('t01-s1-q1', '2 h 15 min\n3.5 3 -4\n', ['2 h 15 min\n3 3 -3'])).toEqual(c);
  });
  it('handles missing mutant outputs', () => {
    expect(buildPredictChoices('q', 'x', undefined)).toEqual([{ key: 'o0', text: 'x' }]);
  });
});

describe('line diff', () => {
  it('produces same/del/add ops', () => {
    expect(lineDiffOps(['a', 'b', 'c'], ['a', 'x', 'c'])).toEqual([
      { kind: 'same', text: 'a' }, { kind: 'del', text: 'b' }, { kind: 'add', text: 'x' }, { kind: 'same', text: 'c' },
    ]);
    expect(lineDiffOps([], ['a'])).toEqual([{ kind: 'add', text: 'a' }]);
    expect(lineDiffOps(['a'], [])).toEqual([{ kind: 'del', text: 'a' }]);
  });
  it('charSegments marks the differing middle', () => {
    const s = charSegments('3.5 3 -4', '3 3 -3');
    expect(s.a.map((x) => x.text).join('')).toBe('3.5 3 -4');
    expect(s.b.map((x) => x.text).join('')).toBe('3 3 -3');
    expect(s.a.filter((x) => x.diff).map((x) => x.text)).toEqual(['.5 3 -4']);
    expect(charSegments('Hot', 'Hot')).toEqual({ a: [{ text: 'Hot', diff: false }], b: [{ text: 'Hot', diff: false }] });
    const sp = charSegments('2 h', '2h');
    expect(sp.a.find((x) => x.diff)?.text).toBe(' ');
    expect(sp.b.some((x) => x.diff)).toBe(false);
  });
  it('outputDiff pairs changed lines and reports missing and extra lines', () => {
    const rows = outputDiff('Hot\nExtreme\nDone', 'Hot\nextreme');
    expect(rows[0]).toEqual({ kind: 'same', text: 'Hot' });
    expect(rows[1].kind).toBe('changed');
    expect(rows[2]).toEqual({ kind: 'missing', expected: 'Done' });
    expect(outputDiff('a', 'a\nb')).toEqual([{ kind: 'same', text: 'a' }, { kind: 'extra', yours: 'b' }]);
    expect(outputDiff('a\n', 'a  \r\n').every((r) => r.kind === 'same')).toBe(true);
  });
  it('differingLines finds the changed line in twins', () => {
    const left = "temp = 41\nif temp > 35:\n    print('Hot')\nif temp > 40:\n    print('Extreme')";
    const right = "temp = 41\nif temp > 35:\n    print('Hot')\nelif temp > 40:\n    print('Extreme')";
    expect(differingLines(left, right)).toEqual({ left: [4], right: [4] });
    expect(differingLines('a\nb', 'a\nb\nc')).toEqual({ left: [], right: [3] });
    expect(differingLines('x', 'x')).toEqual({ left: [], right: [] });
  });
  it('linesPhrase reads naturally', () => {
    expect(linesPhrase([3])).toBe('line 3');
    expect(linesPhrase([2, 4])).toBe('lines 2 and 4');
    expect(linesPhrase([1, 2, 5])).toBe('lines 1, 2 and 5');
    expect(linesPhrase([])).toBe('');
  });
});

describe('isCodeLike', () => {
  it('treats code, values and multi-line outputs as code', () => {
    for (const t of ["int('12.0')", "'Bus ' + 950", '5.0\nNone', '3.5 3 -4', '7 // 2', 'True', 'None', '[1, 2, 3]', 'x = 5', '42']) {
      expect(isCodeLike(t), t).toBe(true);
    }
  });
  it('treats sentences as prose', () => {
    for (const t of ['An error', 'It raises a TypeError', "get() added 'latte' to the dict, so += should work", 'Hot', 'The loop never ends.', '']) {
      expect(isCodeLike(t), t).toBe(false);
    }
  });
});

describe('trace grid drafts', () => {
  it('parses rows, pads to column count and ignores junk', () => {
    expect(parseTraceRows({ rows: [['1', '2', 'extra'], ['3'], 'bad', [4, '5']] }, 2)).toEqual([['1', '2'], ['3', ''], ['', '5']]);
    expect(parseTraceRows(undefined, 3)).toEqual([['', '', '']]);
    expect(parseTraceRows({ rows: [] }, 1)).toEqual([['']]);
  });
  it('gridHasInput ignores blank cells', () => {
    expect(gridHasInput([['', '  ']])).toBe(false);
    expect(gridHasInput([['', '0']])).toBe(true);
  });
});
