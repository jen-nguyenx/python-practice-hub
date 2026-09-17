import { describe, expect, it } from 'vitest';
import { formatClock, formatDuration, formatMinutes, heatStep, pct, plural, relativeDay, toPercent } from './format.ts';

describe('report formatting', () => {
  it('percentages', () => {
    expect(pct(0.724)).toBe('72%');
    expect(pct(null)).toBe('–');
    expect(pct(1)).toBe('100%');
    expect(pct(0)).toBe('0%');
    expect(toPercent(64)).toBe(64);
  });

  it('heat steps', () => {
    expect(heatStep(null)).toBe(0);
    expect(heatStep(0)).toBe(1);
    expect(heatStep(0.6)).toBe(2);
    expect(heatStep(0.8)).toBe(3);
    expect(heatStep(0.85)).toBe(4);
  });

  it('durations and clocks', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(125)).toBe('2 h 5 min');
    expect(formatDuration(42000)).toBe('42 s');
    expect(formatDuration(200000)).toBe('3 min 20 s');
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(299001)).toBe('5:00');
    expect(formatClock(3725000)).toBe('1:02:05');
    expect(plural(1, 'session')).toBe('1 session');
    expect(plural(3, 'session')).toBe('3 sessions');
  });

  it('relative days', () => {
    const now = new Date(2026, 8, 17, 10).getTime();
    expect(relativeDay(now - 3600000, now)).toBe('today');
    expect(relativeDay(new Date(2026, 8, 16, 23).getTime(), now)).toBe('yesterday');
    expect(relativeDay(new Date(2026, 8, 14, 9).getTime(), now)).toBe('3 days ago');
    expect(relativeDay(new Date(2026, 8, 1, 9).getTime(), now)).toBe('1 Sep');
    expect(relativeDay(null, now)).toBe('–');
  });
});
