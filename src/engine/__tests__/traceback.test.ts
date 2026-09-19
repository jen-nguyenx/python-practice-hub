import { describe, expect, it } from 'vitest';
import { inOwnCode, parseTraceback } from '../traceback.ts';

describe('parseTraceback', () => {
  it('reads a whole traceback bottom-up, taking the exception from the last line', () => {
    const t = [
      'Traceback (most recent call last):',
      '  File "marks.py", line 12, in <module>',
      '    total = total + row[2]',
      '                    ~~~^^^',
      'TypeError: can only concatenate str (not "int") to str',
    ].join('\n');
    expect(parseTraceback(t)).toEqual({
      type: 'TypeError',
      message: 'can only concatenate str (not "int") to str',
      line: 12,
      file: 'marks.py',
    });
  });

  it('takes the deepest frame when several are shown, which is where it actually failed', () => {
    const t = [
      'Traceback (most recent call last):',
      '  File "main.py", line 3, in <module>',
      '    run()',
      '  File "helpers.py", line 40, in run',
      '    return data[9]',
      'IndexError: list index out of range',
    ].join('\n');
    expect(parseTraceback(t)).toMatchObject({ type: 'IndexError', line: 40, file: 'helpers.py' });
  });

  it('accepts just the last line, which is what most people copy', () => {
    expect(parseTraceback('NameError: name \'avarage\' is not defined'))
      .toEqual({ type: 'NameError', message: "name 'avarage' is not defined" });
  });

  it('accepts a bare exception name with no message', () => {
    expect(parseTraceback('KeyboardInterrupt')).toEqual({ type: 'KeyboardInterrupt', message: '' });
    expect(parseTraceback('  ZeroDivisionError  ')).toEqual({ type: 'ZeroDivisionError', message: '' });
  });

  it('strips a module prefix, so a pasted qualified name still resolves', () => {
    expect(parseTraceback('json.decoder.JSONDecodeError: Expecting value'))
      .toMatchObject({ type: 'JSONDecodeError', message: 'Expecting value' });
  });

  it('keeps a multi-line message, which SyntaxError often has', () => {
    const t = 'SyntaxError: invalid syntax. Perhaps you forgot a comma?';
    expect(parseTraceback(t)?.message).toBe('invalid syntax. Perhaps you forgot a comma?');
  });

  it('returns nothing for text that is not an error at all', () => {
    expect(parseTraceback('')).toBeNull();
    expect(parseTraceback('   ')).toBeNull();
    expect(parseTraceback('hello world')).toBeNull();
    expect(parseTraceback('print("hi")')).toBeNull();
  });

  it('ignores a lower-case word that happens to have a colon', () => {
    expect(parseTraceback('note: this is fine')).toBeNull();
  });
});

describe('inOwnCode', () => {
  it('treats a plain file name as the student’s own', () => {
    expect(inOwnCode('marks.py')).toBe(true);
    expect(inOwnCode(undefined)).toBe(true);
  });

  it('recognises a library frame, where the cause is usually still the caller', () => {
    expect(inOwnCode('/usr/lib/python3.12/json/decoder.py')).toBe(false);
    expect(inOwnCode('C:\\Python\\site-packages\\numpy\\core.py')).toBe(false);
  });
});
