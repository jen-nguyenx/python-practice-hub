import { describe, expect, it } from 'vitest';
import { stable, stableValue } from './experiments.ts';

describe('stable', () => {
  it('normalises the addresses Python puts in a default repr', () => {
    expect(stable('<function welcome at 0x1750288>')).toBe('<function welcome at 0x...>');
    expect(stable('<__main__.Team object at 0x164d458>')).toBe('<__main__.Team object at 0x...>');
    expect(stable('<built-in function len at 0xabc>')).toBe('<built-in function len at 0x...>');
  });

  it('leaves text alone that merely looks similar', () => {
    // A lesson may print its own angle-bracket text. Recording something Python did not say would break
    // the contract the whole library rests on, so the pattern matches real reprs and nothing else.
    expect(stable('the value at 0x1F is stored')).toBe('the value at 0x1F is stored');
    expect(stable('0x1750288')).toBe('0x1750288');
    expect(stable('<not a repr>')).toBe('<not a repr>');
    expect(stable('<invoice 44>')).toBe('<invoice 44>');
  });

  it('reaches strings nested anywhere in a probe value', () => {
    expect(stableValue({ a: ['<function f at 0xabc>'], b: { c: '<X object at 0x1>' }, n: 3 }))
      .toEqual({ a: ['<function f at 0x...>'], b: { c: '<X object at 0x...>' }, n: 3 });
  });

  it('leaves non-strings untouched', () => {
    expect(stableValue([1, true, null])).toEqual([1, true, null]);
    expect(stableValue(7)).toBe(7);
  });
});
