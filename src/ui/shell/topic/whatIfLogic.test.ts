import { describe, expect, it } from 'vitest';
import { fillTemplate } from '../../../content/experiments.ts';
import type { Knob } from '../../../content/schema.ts';
import {
  intsOrNull, labelsOrNull, numbersOrNull, pieceLines, pieces, pointsOrNull,
} from './whatIfLogic.ts';

const text = (ps: { text: string }[]) => ps.map((p) => p.text).join('');

describe('pieces', () => {
  it('never loses or reorders a character', () => {
    const code = 'for n in range(3, 9, -1):\n    print(n)  # down\n';
    expect(text(pieces(code, []))).toBe(code);
    expect(text(pieces(code, [{ start: 15, end: 16, knob: 0 }]))).toBe(code);
  });

  it('marks exactly the substituted fragment', () => {
    const code = 'for n in range(3, 9):';
    const marked = pieces(code, [{ start: 15, end: 16, knob: 0 }]).filter((p) => p.knob !== null);
    expect(text(marked)).toBe('3');
    expect(marked.every((p) => p.knob === 0)).toBe(true);
  });

  it('splits a fragment out of the string literal that contains it', () => {
    // Highlighting the finished program (not each piece separately) is what keeps this working.
    const knobs: Knob[] = [{ id: 'w', label: 'word', choices: [{ value: 'cat' }] }];
    const { code, spans } = fillTemplate('print("⟦w⟧")', knobs, [0]);
    expect(code).toBe('print("cat")');
    const out = pieces(code, spans);
    expect(text(out)).toBe(code);
    expect(text(out.filter((p) => p.knob !== null))).toBe('cat');
    // The whole literal is still highlighted as a string, marked part included.
    expect(out.filter((p) => p.text === 'cat')[0].t).toBe('s');
  });

  it('keeps two fragments apart', () => {
    const code = 'range(3, 9)';
    const out = pieces(code, [{ start: 6, end: 7, knob: 0 }, { start: 9, end: 10, knob: 1 }]);
    expect(text(out)).toBe(code);
    expect(out.filter((p) => p.knob === 0).map((p) => p.text)).toEqual(['3']);
    expect(out.filter((p) => p.knob === 1).map((p) => p.text)).toEqual(['9']);
  });
});

describe('pieceLines', () => {
  it('splits into lines without losing anything', () => {
    const code = 'a = 1\nb = 2\n';
    const lines = pieceLines(pieces(code, []));
    expect(lines.map(text)).toEqual(['a = 1', 'b = 2']);
  });

  it('keeps a blank line in the middle', () => {
    const lines = pieceLines(pieces('a = 1\n\nb = 2\n', []));
    expect(lines.map(text)).toEqual(['a = 1', '', 'b = 2']);
  });

  it('keeps indentation that came from a fragment', () => {
    const knobs: Knob[] = [{ id: 'show', label: 'print', choices: [{ value: '    print(t)' }] }];
    const { code, spans } = fillTemplate('for x in y:\n⟦show⟧\n', knobs, [0]);
    const lines = pieceLines(pieces(code, spans));
    expect(lines.map(text)).toEqual(['for x in y:', '    print(t)']);
    expect(text(lines[1].filter((p) => p.knob !== null))).toBe('    print(t)');
  });
});

describe('probe value coercion', () => {
  it('accepts the shapes a picture needs', () => {
    expect(labelsOrNull(['a', 'b'])).toEqual(['a', 'b']);
    expect(labelsOrNull([1, 2])).toEqual(['1', '2']);
    expect(numbersOrNull([1, 2.5, -3])).toEqual([1, 2.5, -3]);
    expect(intsOrNull([0, 4])).toEqual([0, 4]);
    expect(pointsOrNull([[0, 1], [2, 3]])).toEqual([[0, 1], [2, 3]]);
  });

  it('refuses a value that is not a list at all', () => {
    for (const bad of [null, undefined, 'abc', 7, {}]) {
      expect(labelsOrNull(bad), String(bad)).toBeNull();
      expect(numbersOrNull(bad), String(bad)).toBeNull();
      expect(intsOrNull(bad), String(bad)).toBeNull();
      expect(pointsOrNull(bad), String(bad)).toBeNull();
    }
  });

  it('fails the whole list rather than dropping one bad entry', () => {
    // Dropping one would shift every label after it onto the wrong bar, which is worse than no picture.
    expect(numbersOrNull([1, null, 3])).toBeNull();
    expect(numbersOrNull([1, Infinity])).toBeNull();
    expect(labelsOrNull(['a', {}, 'c'])).toBeNull();
    expect(intsOrNull([1, 2.5])).toBeNull();
    expect(pointsOrNull([[0, 1], [2]])).toBeNull();
    expect(pointsOrNull([[0, 1], 'nope'])).toBeNull();
    expect(pointsOrNull([[0, 1], [2, null]])).toBeNull();
  });

  it('keeps an empty list, which is a real answer', () => {
    expect(numbersOrNull([])).toEqual([]);
    expect(pointsOrNull([])).toEqual([]);
  });
});
