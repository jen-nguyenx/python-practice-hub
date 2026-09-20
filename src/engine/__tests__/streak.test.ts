import { describe, expect, it } from 'vitest';
import type { AppEvent } from '../types.ts';
import { dayNumber, streak } from '../streak.ts';

const DAY = 86_400_000;
// Midday local, so a timezone offset cannot tip these tests over a day boundary.
const noon = (dayOffset: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.getTime() + dayOffset * DAY;
};

let n = 0;
const did = (ts: number, type = 'attempt'): AppEvent =>
  ({ eid: `e${n++}`, v: 1, ts, sessionId: 's', type, qid: 'q', topicId: 'strings' } as unknown as AppEvent);

describe('streak', () => {
  it('is zero when nothing has happened', () => {
    expect(streak([], noon(0))).toEqual({ days: 0, todayDone: false, lastDay: null });
  });

  it('counts a run of consecutive days ending today', () => {
    const s = streak([did(noon(-2)), did(noon(-1)), did(noon(0))], noon(0));
    expect(s.days).toBe(3);
    expect(s.todayDone).toBe(true);
  });

  it('keeps the streak alive in the morning before anything is done', () => {
    // At 9am a student has not broken anything yet. Showing 0 all morning would punish them for not
    // having started, which is the opposite of what a streak is for.
    const s = streak([did(noon(-2)), did(noon(-1))], noon(0));
    expect(s.days).toBe(2);
    expect(s.todayDone).toBe(false);
  });

  it('ends the run after a missed day', () => {
    expect(streak([did(noon(-5)), did(noon(-4))], noon(0)).days).toBe(0);
  });

  it('counts a day once however much was done in it', () => {
    const t = noon(0);
    expect(streak([did(t), did(t + 1000), did(t + 2000)], t).days).toBe(1);
  });

  it('counts reading a lesson and sitting a test, not just answering', () => {
    expect(streak([did(noon(0), 'lesson_done')], noon(0)).days).toBe(1);
    expect(streak([did(noon(0), 'test_result')], noon(0)).days).toBe(1);
  });

  it('ignores events that are not doing anything', () => {
    expect(streak([did(noon(0), 'topic_open'), did(noon(0), 'session_start')], noon(0)).days).toBe(0);
  });

  it('is not fooled by a gap in the middle of the history', () => {
    const s = streak([did(noon(-10)), did(noon(-9)), did(noon(-1)), did(noon(0))], noon(0));
    expect(s.days).toBe(2);
  });

  it('measures days locally, so a late-night session belongs to that day', () => {
    const d = new Date();
    d.setHours(23, 30, 0, 0);
    const lateTonight = d.getTime();
    expect(dayNumber(lateTonight)).toBe(dayNumber(noon(0)));
  });
});
