import { describe, expect, it } from 'vitest';
import { asciiText, clozeGapRight, displayArgs, draftCode, signatureOf, stableShuffle, stdinLines } from '../logic.ts';

describe('code format helpers', () => {
  it('maps smart quotes and dashes to ASCII', () => {
    expect(asciiText('‘a’ “b” – —')).toBe(`'a' "b" - -`);
  });
  it('reads drafts saved as a string or as { code }', () => {
    expect(draftCode('x = 1')).toBe('x = 1');
    expect(draftCode({ code: 'y = 2' })).toBe('y = 2');
    expect(draftCode({ answers: {} })).toBeNull();
    expect(draftCode(undefined)).toBeNull();
  });
  it('splits input lines without a phantom last line', () => {
    expect(stdinLines('')).toEqual([]);
    expect(stdinLines('12\r\nPerth\n')).toEqual(['12', 'Perth']);
    expect(stdinLines('a\n\nb')).toEqual(['a', '', 'b']);
  });
  it('shuffles Parsons lines the same way every time, never in solution order', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const one = stableShuffle(items, 't03-s1-q3');
    expect(stableShuffle(items, 't03-s1-q3')).toEqual(one);
    expect([...one].sort()).toEqual(items);
    expect(one).not.toEqual(items);
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) expect(stableShuffle(['x', 'y'], seed)).toEqual(['y', 'x']);
  });
  it('finds the function signature to show with a break-the-code spec', () => {
    expect(signatureOf('# note\ndef total_hours(rows):\n    pass', 'total_hours')).toBe('def total_hours(rows)');
    expect(signatureOf('x = 1', 'f')).toBe('def f(...)');
  });
  it('shows an argument tuple like a call', () => {
    expect(displayArgs('(5,)')).toBe('(5)');
    expect(displayArgs("(['a'], 2)")).toBe("(['a'], 2)");
    expect(displayArgs('5')).toBe('(5)');
  });
  it('marks a cloze gap by the accepted answers, ignoring spacing, or right when every test passed', () => {
    expect(clozeGapRight('x+1', ['x + 1'], false)).toBe(true);
    expect(clozeGapRight('‘a’', ["'a'"], false)).toBe(true);
    expect(clozeGapRight('x - 1', ['x + 1'], false)).toBe(false);
    expect(clozeGapRight('', ['x'], false)).toBe(false);
    expect(clozeGapRight('total + n', ['x + 1'], true)).toBe(true);
  });
});
