import { describe, expect, it } from 'vitest';
import {
  allCombos, changedLines, comboCount, comboKey, defaultPicks, fillTemplate, markerIds, noteFor, outputLines,
} from './experiments.ts';
import type { Experiment, Knob } from './schema.ts';

const knobs: Knob[] = [
  { id: 'start', label: 'start at', choices: [{ value: '0' }, { value: '3' }] },
  { id: 'step', label: 'jump by', choices: [{ value: '1' }, { value: '2' }, { value: '-1' }] },
];

describe('combinations', () => {
  it('lists every combination with the last knob varying fastest', () => {
    expect(allCombos(knobs).map(comboKey)).toEqual(['0-0', '0-1', '0-2', '1-0', '1-1', '1-2']);
  });

  it('counts combinations without building them', () => {
    expect(comboCount(knobs)).toBe(6);
    expect(comboCount([])).toBe(1);
  });

  it('starts every knob on its first choice', () => {
    expect(defaultPicks(knobs)).toEqual([0, 0]);
  });
});

describe('fillTemplate', () => {
  it('substitutes each marker and reports where the fragment landed', () => {
    const { code, spans } = fillTemplate('for n in range(⟦start⟧, 9, ⟦step⟧):', knobs, [1, 2]);
    expect(code).toBe('for n in range(3, 9, -1):');
    expect(spans).toEqual([
      { start: 15, end: 16, knob: 0 },
      { start: 21, end: 23, knob: 1 },
    ]);
    expect(code.slice(spans[0].start, spans[0].end)).toBe('3');
    expect(code.slice(spans[1].start, spans[1].end)).toBe('-1');
  });

  it('keeps a fragment that carries its own indentation', () => {
    const k: Knob[] = [{ id: 'show', label: 'print', choices: [{ value: 'print(t)' }, { value: '    print(t)' }] }];
    expect(fillTemplate('for x in y:\n    t = x\n⟦show⟧\n', k, [1]).code)
      .toBe('for x in y:\n    t = x\n    print(t)\n');
  });

  it('leaves an unknown marker in place so the verifier can report it', () => {
    const { code, spans } = fillTemplate('print(⟦nope⟧)', knobs, [0, 0]);
    expect(code).toBe('print(⟦nope⟧)');
    expect(spans).toEqual([]);
  });

  it('falls back to the first choice when a pick is out of range', () => {
    expect(fillTemplate('⟦start⟧', knobs, [9, 0]).code).toBe('0');
  });

  it('lists marker ids in order of appearance', () => {
    expect(markerIds('⟦b⟧ and ⟦a⟧ and ⟦b⟧')).toEqual(['b', 'a', 'b']);
    expect(markerIds('no markers here')).toEqual([]);
  });
});

describe('outputLines', () => {
  it('drops only the trailing newline', () => {
    expect(outputLines({ stdout: '1\n2\n3\n' })).toEqual(['1', '2', '3']);
    expect(outputLines({ stdout: '1\n\n3\n' })).toEqual(['1', '', '3']);
  });

  it('shows nothing for a program that printed nothing', () => {
    expect(outputLines({ stdout: '' })).toEqual([]);
    expect(outputLines(undefined)).toEqual([]);
  });

  it('adds the error after whatever was printed first', () => {
    const run = { stdout: 'a\n', error: { type: 'TypeError', message: "object of type 'int' has no len()", line: 2 } };
    expect(outputLines(run)).toEqual(['a', "TypeError: object of type 'int' has no len()"]);
  });

  it('shows an error with no message as just its type', () => {
    expect(outputLines({ stdout: '', error: { type: 'KeyboardInterrupt', message: '', line: 1 } }))
      .toEqual(['KeyboardInterrupt']);
  });
});

describe('changedLines', () => {
  it('marks lines that differ from the previous selection, by position', () => {
    expect(changedLines(['1', '2', '3'], ['1', '9', '3'])).toEqual([false, true, false]);
  });

  it('marks every line when a change shifts them all', () => {
    expect(changedLines(['0', '1', '2'], ['1', '2', '3'])).toEqual([true, true, true]);
  });

  it('marks lines that appear where there were none before', () => {
    expect(changedLines(['1'], ['1', '2'])).toEqual([false, true]);
    expect(changedLines([], [])).toEqual([]);
  });
});

describe('noteFor', () => {
  const x = { notes: { '1-2': 'the interesting one' } } as unknown as Experiment;
  it('finds the note for exactly that combination', () => {
    expect(noteFor(x, [1, 2])).toBe('the interesting one');
    expect(noteFor(x, [1, 1])).toBeUndefined();
    expect(noteFor({} as Experiment, [0])).toBeUndefined();
  });
});
