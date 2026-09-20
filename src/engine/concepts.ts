// Strength by concept rather than by topic.
//
// Every question already carries concept tags, and nothing read them. Topic percentages answer "how far
// through am I"; concepts answer "what am I actually weak at", which is a different and more useful
// question, because a concept like slicing or aliasing turns up across several topics and a topic
// average hides it.
import type { TopicId } from '../content/ids.ts';
import type { QuestionMeta } from '../content/questionIndex.ts';
import type { AppEvent } from './types.ts';

export interface ConceptStat {
  concept: string;
  /** Distinct questions carrying this concept that have been attempted. */
  attempted: number;
  /** Of those, how many were solved without revealing the answer. */
  solved: number;
  /** How many questions carrying it exist in the topics that are open. */
  total: number;
  /** solved / attempted, or null when there is not enough to say. */
  accuracy: number | null;
  /** When it was last attempted. */
  lastTs: number;
}

/** Below this, one unlucky question would read as a weakness. */
export const ENOUGH = 2;

export interface ConceptOptions {
  /** Only count questions from topics the student can reach. */
  unlocked?: readonly TopicId[];
}

export function conceptStats(
  events: readonly AppEvent[],
  index: readonly QuestionMeta[],
  opts: ConceptOptions = {},
): ConceptStat[] {
  const open = opts.unlocked ? new Set(opts.unlocked) : null;
  const reachable = index.filter((q) => !open || open.has(q.topicId));

  const total = new Map<string, number>();
  for (const q of reachable) {
    for (const c of q.concepts) total.set(c, (total.get(c) ?? 0) + 1);
  }

  // Per question: was it attempted, was it ever solved cleanly, and when was it last touched.
  const attempted = new Map<string, { solved: boolean; lastTs: number }>();
  for (const e of events) {
    if (e.type !== 'attempt') continue;
    const row = attempted.get(e.qid) ?? { solved: false, lastTs: 0 };
    // Revealing the answer means the question was seen, not that the concept was understood.
    if (e.correct && !e.revealed) row.solved = true;
    if (e.ts > row.lastTs) row.lastTs = e.ts;
    attempted.set(e.qid, row);
  }

  const byConcept = new Map<string, ConceptStat>();
  for (const q of reachable) {
    const row = attempted.get(q.qid);
    if (!row) continue;
    for (const c of q.concepts) {
      const stat = byConcept.get(c) ?? {
        concept: c, attempted: 0, solved: 0, total: total.get(c) ?? 0, accuracy: null, lastTs: 0,
      };
      stat.attempted++;
      if (row.solved) stat.solved++;
      if (row.lastTs > stat.lastTs) stat.lastTs = row.lastTs;
      byConcept.set(c, stat);
    }
  }

  const out = [...byConcept.values()];
  for (const s of out) s.accuracy = s.attempted >= ENOUGH ? s.solved / s.attempted : null;
  // Weakest first among those with enough evidence; everything else falls in behind, most-tried first.
  return out.sort((a, b) => {
    if (a.accuracy === null && b.accuracy === null) return b.attempted - a.attempted;
    if (a.accuracy === null) return 1;
    if (b.accuracy === null) return -1;
    return a.accuracy - b.accuracy || b.attempted - a.attempted;
  });
}

/** Concepts worth working on: enough evidence, and not yet solid. */
export function weakConcepts(stats: readonly ConceptStat[], limit = 5): ConceptStat[] {
  return stats.filter((s) => s.accuracy !== null && s.accuracy < 0.8).slice(0, limit);
}
