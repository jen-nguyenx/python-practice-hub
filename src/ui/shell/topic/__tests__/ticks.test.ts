import { describe, expect, it } from 'vitest';
import { niceStep, niceTicks } from '../ticks.ts';

describe('niceStep', () => {
  it('picks a step a person would pick', () => {
    expect(niceStep(100, 4)).toBe(25);
    expect(niceStep(10, 4)).toBe(2.5);
    expect(niceStep(1, 4)).toBe(0.25);
    expect(niceStep(1000, 4)).toBe(250);
  });

  it('survives a span of nothing', () => {
    expect(niceStep(0, 4)).toBe(1);
    expect(niceStep(-5, 4)).toBe(1);
  });
});

describe('niceTicks', () => {
  it('gives round numbers across the range', () => {
    expect(niceTicks(0, 100, 4)).toEqual([0, 25, 50, 75, 100]);
    expect(niceTicks(0, 100, 4, true)).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it('never names a value outside the data', () => {
    // Writing 60 on an axis that stops at 50 invites reading a value off the chart that is not there.
    for (const t of niceTicks(3, 47, 4)) {
      expect(t).toBeGreaterThanOrEqual(3);
      expect(t).toBeLessThanOrEqual(47);
    }
  });

  it('always includes zero when the range crosses it', () => {
    // The payoff case: a chart from -5 to 50 must say where zero is, because that is break-even.
    expect(niceTicks(-5, 50, 4)).toContain(0);
    expect(niceTicks(-0.3, 0.9, 4)).toContain(0);
  });

  it('does not invent a zero the data never reaches', () => {
    expect(niceTicks(10, 50, 4)).not.toContain(0);
  });

  it('gives clean labels rather than floating point dust', () => {
    // 0.1 + 0.2 arithmetic would otherwise put 0.30000000000000004 on an axis.
    for (const t of niceTicks(0, 1, 4)) {
      expect(String(t)).not.toMatch(/\d{6,}/);
    }
  });

  it('copes with a flat series and with rubbish', () => {
    expect(niceTicks(7, 7)).toEqual([7]);
    expect(niceTicks(NaN, 5)).toEqual([]);
  });

  it('keeps whole data on whole ticks when the caller says the data is whole', () => {
    // "2.5 items" on an axis counting items is a nonsense the reader has to look past.
    for (const t of niceTicks(1, 10, 4, true)) expect(Number.isInteger(t), String(t)).toBe(true);
    for (const t of niceTicks(0, 24, 4, true)) expect(Number.isInteger(t), String(t)).toBe(true);
    expect(niceTicks(1, 10, 4, true)).toEqual([2, 4, 6, 8, 10]);
  });

  it('still allows fractions where the data has them', () => {
    // Whole ends, fractional middle: a curve from 0 to 1 would otherwise get a two-line axis.
    expect(niceTicks(0, 1, 4).some((t) => !Number.isInteger(t))).toBe(true);
  });

  it('stays a sensible length', () => {
    for (const [lo, hi] of [[0, 100], [-5, 50], [0, 3], [1, 1000], [-1, 1]] as const) {
      const n = niceTicks(lo, hi, 4).length;
      expect(n, `${lo}..${hi}`).toBeGreaterThanOrEqual(2);
      expect(n, `${lo}..${hi}`).toBeLessThanOrEqual(8);
    }
  });
});
