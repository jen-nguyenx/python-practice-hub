// "I already know some of this" — answered rather than asserted.
//
// The ladder makes topic 1 the only door, which is right for someone starting in week 1 and wrong for
// someone arriving in week 9 who already writes loops. Their only escape was the Settings switch that
// opens everything, which is a blunt instrument: it opens topics they cannot do as readily as ones they
// can, and the report then has to caveat every number it prints.
//
// This walks up the ladder instead, one question per topic, and stops as soon as two in a row go wrong.
// What it grants is access, not credit: the topics it opens still have to be practised to count, so the
// ladder keeps meaning what it meant.
import { OFFLINE_FORMATS } from '../content/ids.ts';
import type { Diff, Format, TopicId } from '../content/ids.ts';
import type { QuestionMeta } from '../content/questionIndex.ts';
import { TOPICS } from '../content/topics.ts';

/** Two in a row means the level has been found; a single slip does not. */
export const STOP_AFTER_WRONG = 2;

export interface PlacementStep {
  qid: string;
  topicId: TopicId;
  /** Ladder position, 1-based. */
  order: number;
}

/** How representative a question is of its topic. Medium first: easy flatters, hard misleads. */
const DIFF_RANK: Record<Diff, number> = { medium: 0, easy: 1, hard: 2 };

/**
 * One question per topic, in ladder order.
 *
 * Only formats that grade from pre-generated data, so the check runs at full speed and works before
 * Python has loaded — which matters when this is the first thing a new student ever does.
 */
export function placementLadder(index: readonly QuestionMeta[]): PlacementStep[] {
  const fast = new Set<Format>(OFFLINE_FORMATS);
  const out: PlacementStep[] = [];
  TOPICS.forEach((t, i) => {
    const pick = index
      .filter((q) => q.topicId === t.id && fast.has(q.format))
      .sort((a, b) => (
        DIFF_RANK[a.diff] - DIFF_RANK[b.diff]
        || Number(b.core) - Number(a.core)
        || a.qid.localeCompare(b.qid)
      ))[0];
    if (pick) out.push({ qid: pick.qid, topicId: t.id, order: i + 1 });
  });
  return out;
}

/** Whether to ask another question, given what has happened so far. */
export function isFinished(ladder: readonly PlacementStep[], results: readonly boolean[]): boolean {
  if (results.length >= ladder.length) return true;
  const tail = results.slice(-STOP_AFTER_WRONG);
  return tail.length === STOP_AFTER_WRONG && tail.every((r) => !r);
}

/** The next question to ask, or null when the check is over. */
export function nextStep(ladder: readonly PlacementStep[], results: readonly boolean[]): PlacementStep | null {
  if (isFinished(ladder, results)) return null;
  return ladder[results.length] ?? null;
}

export interface PlacementOutcome {
  /** Topics up to and including this one are opened. Null when nothing was demonstrated. */
  throughTopicId: TopicId | null;
  /** Ladder position of that topic, 0 when none. */
  throughOrder: number;
  asked: string[];
  correct: number;
  /** What it means, in a sentence. */
  summary: string;
}

/**
 * Where the answers place the student.
 *
 * The highest topic answered correctly, and nothing above it. Getting topic 7 right after failing 5 and 6
 * still only opens through 7 — the point is where the ladder can be joined, and the topics below are
 * opened anyway by being below.
 */
export function placementOutcome(
  ladder: readonly PlacementStep[],
  results: readonly boolean[],
): PlacementOutcome {
  const asked = ladder.slice(0, results.length).map((s) => s.qid);
  const correct = results.filter(Boolean).length;
  let throughOrder = 0;
  let throughTopicId: TopicId | null = null;
  results.forEach((ok, i) => {
    const step = ladder[i];
    if (ok && step && step.order > throughOrder) {
      throughOrder = step.order;
      throughTopicId = step.topicId;
    }
  });

  const name = throughTopicId ? TOPICS.find((t) => t.id === throughTopicId)?.short : null;
  const summary = throughOrder === 0
    ? 'Nothing opened — starting at the beginning is the right call.'
    : throughOrder >= TOPICS.length
      ? 'Every topic is open. You clearly know your way around already.'
      : `Open through ${name}. The topics after it unlock the usual way.`;

  return { throughTopicId, throughOrder, asked, correct, summary };
}

/** Ladder position of a topic, 1-based; 0 when unknown. */
export function orderOf(topicId: TopicId): number {
  const i = TOPICS.findIndex((t) => t.id === topicId);
  return i < 0 ? 0 : i + 1;
}
