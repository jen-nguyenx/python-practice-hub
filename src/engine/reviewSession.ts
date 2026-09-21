// What a review session should ask, and why.
//
// The queue already worked out which mistakes are worth revisiting; this turns that into a handful of
// actual questions to answer now. Three sources, in order of how much they are worth: a mistake that is
// due, a skill that keeps going wrong, and something solved long enough ago to be worth proving again.
//
// Only formats that grade from pre-generated data are used (`OFFLINE_FORMATS`), minus the trace table,
// which is a grid rather than a quick answer. That keeps a session near ten minutes and — because none of
// them need Python — lets it start before the runtime has finished loading.
import { OFFLINE_FORMATS } from '../content/ids.ts';
import type { Format, TopicId } from '../content/ids.ts';
import type { QuestionMeta } from '../content/questionIndex.ts';
import { conceptStats, weakConcepts } from './concepts.ts';
import { reviewQueue } from './review.ts';
import type { AppEvent } from './types.ts';

const DAY = 86_400_000;

/** Quick to answer and gradable without the Python runtime. */
export const SESSION_FORMATS: readonly Format[] = OFFLINE_FORMATS.filter((f) => f !== 'trace');

/** Solved this long ago and not since: worth proving again. */
export const STALE_DAYS = 10;

export type PickReason = 'mistake' | 'skill' | 'again';

export interface SessionPick {
  qid: string;
  topicId: TopicId;
  format: Format;
  reason: PickReason;
  /** Why this one, in a student's words. Shown after the answer, not before it. */
  because: string;
}

export interface SessionOptions {
  /** How many questions to deal. */
  size?: number;
  /** Topics the student can reach. */
  unlocked?: readonly TopicId[];
  now?: number;
  /** At most this many from any one topic, so a session is not all one thing. */
  perTopic?: number;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * The questions to deal, best first.
 *
 * Nothing answered today is offered: answering something again minutes later tests what is still on the
 * screen. Nothing is offered twice in one session, and a session is spread across topics where it can be.
 */
export function planSession(
  events: readonly AppEvent[],
  index: readonly QuestionMeta[],
  opts: SessionOptions = {},
): SessionPick[] {
  const now = opts.now ?? Date.now();
  const size = opts.size ?? 6;
  const perTopic = opts.perTopic ?? 3;
  const open = opts.unlocked ? new Set(opts.unlocked) : null;
  const fast = new Set<Format>(SESSION_FORMATS);

  const usable = index.filter((q) => fast.has(q.format) && (!open || open.has(q.topicId)));
  const byId = new Map(usable.map((q) => [q.qid, q]));

  // When each question was last answered at all, and when it was last solved cleanly.
  const lastTouch = new Map<string, number>();
  const solvedAt = new Map<string, number>();
  for (const e of events) {
    if (e.type !== 'attempt') continue;
    if (e.ts > (lastTouch.get(e.qid) ?? 0)) lastTouch.set(e.qid, e.ts);
    if (e.correct && !e.revealed && e.ts > (solvedAt.get(e.qid) ?? 0)) solvedAt.set(e.qid, e.ts);
  }
  const answeredToday = (qid: string) => now - (lastTouch.get(qid) ?? 0) < DAY;

  const picks: SessionPick[] = [];
  const taken = new Set<string>();
  const topicCount = new Map<TopicId, number>();

  const add = (q: QuestionMeta, reason: PickReason, because: string): boolean => {
    if (picks.length >= size || taken.has(q.qid) || answeredToday(q.qid)) return false;
    if ((topicCount.get(q.topicId) ?? 0) >= perTopic) return false;
    taken.add(q.qid);
    topicCount.set(q.topicId, (topicCount.get(q.topicId) ?? 0) + 1);
    picks.push({ qid: q.qid, topicId: q.topicId, format: q.format, reason, because });
    return true;
  };

  // 1. Mistakes that are due. One question per mistake first, so a session covers several rather than
  //    drilling the first one six times.
  const queue = reviewQueue(events, usable, { now, unlocked: opts.unlocked }).filter((i) => i.score > 0);
  for (const item of queue) {
    if (picks.length >= size) break;
    const when = item.daysSince <= 1 ? 'yesterday' : `${item.daysSince} days ago`;
    const because = `You made this mistake ${plural(item.count, 'time')}, last ${when}.`;
    for (const qid of item.qids) {
      const q = byId.get(qid);
      if (q && add(q, 'mistake', because)) break;
    }
  }

  // 2. Skills that keep going wrong, whether or not a mistake was ever tagged.
  if (picks.length < size) {
    const weak = weakConcepts(conceptStats(events, usable, { unlocked: opts.unlocked }), 8);
    for (const w of weak) {
      if (picks.length >= size) break;
      const because = `This skill has gone wrong before: ${w.solved} of ${w.attempted} right so far.`;
      const candidates = usable
        .filter((q) => q.concepts.includes(w.concept))
        // Never solved first, then whatever was touched longest ago.
        .sort((a, b) => (solvedAt.get(a.qid) ?? 0) - (solvedAt.get(b.qid) ?? 0));
      for (const q of candidates) if (add(q, 'skill', because)) break;
    }
  }

  // 3. Spaced recall: solved a while back, not since. Proving it again is the point of reviewing at all.
  if (picks.length < size) {
    const stale = usable
      .filter((q) => {
        const solved = solvedAt.get(q.qid) ?? 0;
        return solved > 0 && now - solved >= STALE_DAYS * DAY;
      })
      .sort((a, b) => (solvedAt.get(a.qid) ?? 0) - (solvedAt.get(b.qid) ?? 0));
    for (const q of stale) {
      if (picks.length >= size) break;
      const days = Math.floor((now - (solvedAt.get(q.qid) ?? now)) / DAY);
      add(q, 'again', `You solved this ${days} days ago. Worth proving it stuck.`);
    }
  }

  return picks;
}

export interface SessionOutcome {
  qid: string;
  correct: boolean;
  reason: PickReason;
}

/** One line for the end of a session: what it was, and whether it went well. */
export function sessionSummary(outcomes: readonly SessionOutcome[]): string {
  const n = outcomes.length;
  if (n === 0) return 'Nothing answered this time.';
  const right = outcomes.filter((o) => o.correct).length;
  if (right === n) return n === 1 ? 'Right first time.' : `All ${n} right.`;
  if (right === 0) return `None right this time — but these were picked because they are the hard ones for you.`;
  return `${right} of ${n} right.`;
}
