// The review queue: what to practise next, worked out from the mistakes a student has actually made.
//
// Everything here is derived from the append-only event log, so it costs no new bookkeeping. The ordering
// answers one question: of the things this person has got wrong, which is most worth an attempt today?
import type { MistakeId, TopicId } from '../content/ids.ts';
import type { QuestionMeta } from '../content/questionIndex.ts';
import type { AppEvent } from './types.ts';

/** A mistake worth revisiting, with the evidence for why. */
export interface ReviewItem {
  mistake: MistakeId;
  /** How many times it has been logged in the window. */
  count: number;
  /** When it last happened. */
  lastTs: number;
  /** Days since it last happened, rounded down. */
  daysSince: number;
  /** The topic it most recently came from, when one was recorded. */
  topicId: TopicId | null;
  /** Questions that can detect it, soonest-useful first. */
  qids: string[];
  /** Whether every question that detects it has already been solved since it last occurred. */
  settled: boolean;
  /** Higher is more worth doing now. */
  score: number;
}

const DAY = 86_400_000;

/**
 * How due something is, from how long ago it last went wrong.
 *
 * Deliberately NOT widened by how often the mistake was made. Spaced repetition widens an interval after
 * a *success*; widening it after a failure would mean the more often someone got something wrong, the
 * less often they were asked about it, which is precisely backwards. Frequency raises priority instead,
 * through `count` in the score.
 *
 * Nothing is due the same day it happened: drilling a mistake minutes after making it tests short-term
 * memory rather than learning. After that it rises and then plateaus, so a slip from six weeks ago does
 * not outrank everything else purely by being old.
 */
export function dueWeight(daysSince: number): number {
  if (daysSince < 1) return 0;
  return Math.min(3, Math.log2(daysSince) + 1);
}

export interface ReviewOptions {
  /** Only consider mistakes logged in this many days. */
  days?: number;
  now?: number;
  /** Topics the student can actually reach. Questions outside them are not offered. */
  unlocked?: readonly TopicId[];
}

/**
 * Mistakes worth practising, most useful first.
 *
 * A mistake counts as settled when every question that detects it has been solved since the last time it
 * happened: the student has already shown they can get past it, so it drops down the queue rather than
 * disappearing, because one clean run is not proof.
 */
export function reviewQueue(
  events: readonly AppEvent[],
  index: readonly QuestionMeta[],
  opts: ReviewOptions = {},
): ReviewItem[] {
  const now = opts.now ?? Date.now();
  const since = now - (opts.days ?? 60) * DAY;
  const open = opts.unlocked ? new Set(opts.unlocked) : null;

  const counts = new Map<MistakeId, { count: number; lastTs: number; topicId: TopicId | null }>();
  for (const e of events) {
    if (e.type !== 'mistake' || e.ts < since) continue;
    const row = counts.get(e.mistake) ?? { count: 0, lastTs: 0, topicId: null };
    row.count++;
    if (e.ts >= row.lastTs) {
      row.lastTs = e.ts;
      if (e.topicId) row.topicId = e.topicId;
    }
    counts.set(e.mistake, row);
  }
  if (counts.size === 0) return [];

  // When each question was last solved, so a mistake can be judged against what happened after it.
  const solvedAt = new Map<string, number>();
  for (const e of events) {
    if (e.type !== 'attempt' || !e.correct || e.revealed) continue;
    const prev = solvedAt.get(e.qid) ?? 0;
    if (e.ts > prev) solvedAt.set(e.qid, e.ts);
  }

  const out: ReviewItem[] = [];
  for (const [mistake, row] of counts) {
    const detects = index.filter((q) => q.detects.includes(mistake) && (!open || open.has(q.topicId)));
    if (detects.length === 0) continue;
    // Something never solved, or not solved since the slip, is the most useful thing to attempt.
    const unsolved = detects.filter((q) => (solvedAt.get(q.qid) ?? 0) < row.lastTs);
    const settled = unsolved.length === 0;
    const daysSince = Math.floor((now - row.lastTs) / DAY);
    const score = row.count * dueWeight(daysSince) * (settled ? 0.25 : 1);
    out.push({
      mistake,
      count: row.count,
      lastTs: row.lastTs,
      daysSince,
      topicId: row.topicId,
      qids: (unsolved.length ? unsolved : detects).map((q) => q.qid),
      settled,
      score,
    });
  }
  return out.sort((a, b) => b.score - a.score || b.count - a.count || b.lastTs - a.lastTs);
}
