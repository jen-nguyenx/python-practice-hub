import { describe, expect, it } from 'vitest';
import { semesterInfo } from './semester.ts';
import { fuzzyScore, matchItem } from './fuzzy.ts';

const d = (m: number, day: number) => new Date(2026, m - 1, day, 14, 30);

describe('semesterInfo', () => {
  it('matches the mockup on 18 Sep 2026', () => {
    const s = semesterInfo(d(9, 18));
    expect(s.week).toBe(8);
    expect(s.daysToExams).toBe(38);
    expect(s.label).toBe('Week 8 · exams in 38 days');
  });
  it('counts teaching weeks around the mid-semester break', () => {
    expect(semesterInfo(d(7, 20)).week).toBe(1);
    expect(semesterInfo(d(7, 26)).week).toBe(1);
    expect(semesterInfo(d(7, 27)).week).toBe(2);
    expect(semesterInfo(d(8, 30)).week).toBe(6);
    expect(semesterInfo(d(8, 31)).phase).toBe('break');
    expect(semesterInfo(d(9, 6)).label).toMatch(/^Study break · exams in \d+ days$/);
    expect(semesterInfo(d(9, 7)).week).toBe(7);
    expect(semesterInfo(d(10, 12)).week).toBe(12);
    expect(semesterInfo(d(10, 18)).week).toBe(12);
  });
  it('handles swotvac, exams and the edges of the semester', () => {
    expect(semesterInfo(d(10, 19)).phase).toBe('swotvac');
    expect(semesterInfo(d(10, 25)).label).toBe('Study break · exams in 1 day');
    expect(semesterInfo(d(10, 26)).phase).toBe('exams');
    expect(semesterInfo(d(11, 6)).label).toBe('Exams · last day');
    expect(semesterInfo(d(11, 7)).phase).toBe('after');
    expect(semesterInfo(d(7, 1)).label).toBe('Semester starts in 19 days');
  });
});

describe('fuzzy', () => {
  it('prefers substring and word-start matches', () => {
    const a = fuzzyScore('loop', 'For loops')!;
    const b = fuzzyScore('loop', 'Long output please')!;
    expect(a).toBeGreaterThan(b ?? -Infinity);
    expect(fuzzyScore('stair', 'Stair count')!).toBeGreaterThan(fuzzyScore('stair', 'Upstairs count')!);
  });
  it('matches subsequences and rejects missing letters', () => {
    expect(fuzzyScore('fl', 'For loops')).not.toBeNull();
    expect(fuzzyScore('xyz', 'For loops')).toBeNull();
  });
  it('requires every word to match somewhere', () => {
    expect(matchItem('stair loops', 'Stair count', 'For loops · Write code')).not.toBeNull();
    expect(matchItem('stair dict', 'Stair count', 'For loops · Write code')).toBeNull();
    expect(matchItem('', 'anything')).toBe(0);
  });
});
