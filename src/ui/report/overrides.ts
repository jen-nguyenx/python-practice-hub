// Was the Settings switch "Unlock all topics" on while this range was recorded?
// Read straight from the event log (`override` events), so the report can say so without changing the engine.
// Pure; unit-tested in report-helpers.test.ts.
import type { ReportRange } from '../../engine/report.ts';
import type { AppEvent } from '../../engine/types.ts';

const DAY = 86_400_000;

/** The events src/engine/report.ts counts for a range, picked the same way, oldest first. */
export function eventsInRange(events: readonly AppEvent[], range: ReportRange, now: number = Date.now()): AppEvent[] {
  const sorted = [...events].sort((a, b) => a.ts - b.ts);
  switch (range) {
    case 'all':
      return sorted;
    case '7d':
      return sorted.filter((e) => e.ts >= now - 7 * DAY);
    case '30d':
      return sorted.filter((e) => e.ts >= now - 30 * DAY);
    case 'session': {
      let sid: string | null = null;
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i].type === 'attempt') { sid = sorted[i].sessionId; break; }
      }
      if (sid === null && sorted.length > 0) sid = sorted[sorted.length - 1].sessionId;
      return sorted.filter((e) => e.sessionId === sid);
    }
  }
}

/** [first, last] timestamp of the events a range keeps. */
function rangeWindow(events: readonly AppEvent[], range: ReportRange, now: number): { start: number; end: number } | null {
  const kept = eventsInRange(events, range, now);
  if (kept.length === 0) return null;
  return { start: kept[0].ts, end: Math.max(kept[kept.length - 1].ts, now) };
}

/**
 * True when "Unlock all topics" was on at any point in the range: either it was already on when the range started,
 * or it was switched on inside it.
 */
export function unlockAllInRange(events: readonly AppEvent[], range: ReportRange, now: number = Date.now()): boolean {
  const window = rangeWindow(events, range, now);
  if (!window) return false;
  const overrides = events
    .filter((e): e is Extract<AppEvent, { type: 'override' }> => e.type === 'override' && e.what === 'unlockAll')
    .sort((a, b) => a.ts - b.ts);
  let onAtStart = false;
  for (const e of overrides) {
    if (e.ts < window.start) onAtStart = e.value;
  }
  if (onAtStart) return true;
  return overrides.some((e) => e.ts >= window.start && e.ts <= window.end && e.value);
}
