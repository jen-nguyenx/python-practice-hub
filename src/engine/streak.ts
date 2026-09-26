// How many days in a row the student has done something, from the event log.
//
// A streak is the cheapest behavioural nudge there is, but it has to be honest: it counts days on which
// real work happened, it is measured in the student's own timezone, and today not being done yet must
// never look like the streak is already broken.
import type { AppEvent } from './types.ts';

/** Events that count as having studied. Opening a page does not. */
const COUNTS = new Set(['attempt', 'lesson_done', 'test_result', 'stat_test', 'run']);

const DAY = 86_400_000;

/** Local midnight for a timestamp, as a day number. Local, not UTC: a streak is about the student's day. */
export function dayNumber(ts: number): number {
  const d = new Date(ts);
  return Math.floor((ts - d.getTimezoneOffset() * 60_000) / DAY);
}

export interface Streak {
  /** Consecutive days up to and including today (or up to yesterday, if today is not done yet). */
  days: number;
  /** Whether anything has been done today. */
  todayDone: boolean;
  /** Day number of the most recent day with activity, or null. */
  lastDay: number | null;
}

/**
 * The run of consecutive days ending today or yesterday.
 *
 * Ending *yesterday* still counts, because at 9am a student has not broken anything yet: showing "0" for
 * the whole morning would punish them for not having started, which is the opposite of the intent. A gap
 * of two days ends the run.
 */
export function streak(events: readonly AppEvent[], now: number = Date.now()): Streak {
  const days = new Set<number>();
  for (const e of events) {
    if (COUNTS.has(e.type)) days.add(dayNumber(e.ts));
  }
  if (days.size === 0) return { days: 0, todayDone: false, lastDay: null };

  const today = dayNumber(now);
  const todayDone = days.has(today);
  const lastDay = Math.max(...days);

  // Start from today if it is done, otherwise from yesterday; anything older means the run is over.
  let cursor = todayDone ? today : today - 1;
  if (!days.has(cursor)) return { days: 0, todayDone, lastDay };

  let n = 0;
  while (days.has(cursor)) {
    n++;
    cursor--;
  }
  return { days: n, todayDone, lastDay };
}
