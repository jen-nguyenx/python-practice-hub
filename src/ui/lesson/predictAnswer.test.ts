import { describe, expect, it } from 'vitest';
import { judge, loose, normalise } from './predictAnswer.ts';

describe('judge', () => {
  it('accepts an exact match', () => {
    expect(judge('[2, 4, 6, 8]', '[2, 4, 6, 8]')).toBe('right');
    expect(judge('12\n7', '12\n7')).toBe('right');
  });

  it('forgives the spacing Python uses inside a repr', () => {
    // The reported bug: a reader typed the list without the spaces and was told they were wrong.
    expect(judge('[2,4,6,8]', '[2, 4, 6, 8]')).toBe('close');
    expect(judge("{'a':1,'b':2}", "{'a': 1, 'b': 2}")).toBe('close');
    expect(judge('(1,2)', '(1, 2)')).toBe('close');
  });

  it('forgives trailing whitespace and a trailing blank line', () => {
    expect(judge('12  \n', '12')).toBe('right');
    expect(judge('12\n\n\n', '12')).toBe('right');
  });

  it('still refuses an answer that is actually different', () => {
    expect(judge('[2, 4, 6]', '[2, 4, 6, 8]')).toBe('wrong');
    expect(judge('13', '12')).toBe('wrong');
    expect(judge('[8, 6, 4, 2]', '[2, 4, 6, 8]')).toBe('wrong');
  });

  it('does not collapse a space that carries meaning', () => {
    // print(1, 2) prints "1 2"; someone typing "12" has not predicted it.
    expect(judge('12', '1 2')).toBe('wrong');
    expect(judge('helloworld', 'hello world')).toBe('wrong');
  });

  it('treats an empty answer as wrong, not close', () => {
    expect(judge('', '')).toBe('right');
    expect(judge('', '[1]')).toBe('wrong');
    expect(judge('   ', '[1]')).toBe('wrong');
  });

  it('compares line by line, so an extra line is wrong', () => {
    expect(judge('1\n2', '1\n2\n3')).toBe('wrong');
  });
});

describe('normalise and loose', () => {
  it('normalise keeps interior blank lines, which are real output', () => {
    expect(normalise('a\n\nb')).toBe('a\n\nb');
  });

  it('loose removes space beside punctuation only', () => {
    expect(loose('[1, 2]')).toBe('[1,2]');
    expect(loose('a b')).toBe('a b');
  });
});
