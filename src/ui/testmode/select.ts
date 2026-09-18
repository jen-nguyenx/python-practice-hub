// Pure question selection for the topic test and the mid-semester practice test.
// No DOM, no store: unit-tested in select.test.ts.
import type { Diff, Format, Ladder, TopicId } from '../../content/ids.ts';
import { FORMAT_LADDER, OFFLINE_FORMATS } from '../../content/ids.ts';
import { TOPICS } from '../../content/topics.ts';
import type { GeneratedQuestion, Question } from '../../content/schema.ts';

/** The fields selection needs. Anything with these fields can be selected (questions, index entries, test items). */
export interface Candidate {
  id: string;
  topicId: TopicId;
  format: Format;
  diff: Diff;
  /** write question in paper (exam) mode */
  paper: boolean;
  expectedSec: number;
}

export type Rng = () => number;

/** Small seeded generator (mulberry32) so tests are repeatable. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Read formats whose grading needs pre-generated data from the verifier. */
const NEEDS_GENERATED: readonly Format[] = ['predict', 'trace', 'twins', 'errorTranslator'];

export function isPaper(q: Question): boolean {
  return q.format === 'write' && q.mode === 'paper';
}

/**
 * A question can go into a test only if it can be graded: read formats that need generated data must have the
 * field their grader reads (stale generated data is skipped), choice formats need a correct option.
 */
export function isGradable(q: Question, generated: GeneratedQuestion | undefined): boolean {
  switch (q.format) {
    case 'predict': return typeof generated?.stdout === 'string';
    case 'trace': return Array.isArray(generated?.traceRows);
    case 'twins': return !!generated?.twins;
    case 'errorTranslator': return !!generated?.error;
    case 'mcq':
    case 'multi': return Array.isArray(q.options) && q.options.some((o) => o.correct);
    default: return !NEEDS_GENERATED.includes(q.format);
  }
}

export function toCandidate(q: Question, topicId: TopicId): Candidate {
  return { id: q.id, topicId, format: q.format, diff: q.diff, paper: isPaper(q), expectedSec: q.expectedSec };
}

// ---------------------------------------------------------------- topic test

export const TOPIC_TEST_SIZE = 5;
export const TOPIC_TEST_MINUTES = 15;
export const TOPIC_TEST_PASS = 4;

export interface Slot {
  /** Formats that fit this slot, most preferred first. */
  formats: readonly Format[];
  /** Fallback: any question on the same rung. */
  rung: Ladder;
}

/** 1 predict/trace/mcq, 1 mcq/multi/twins/errorTranslator, 1 cloze/parsons/fixBug, 2 write/fixBug/refactor. */
export const TOPIC_TEST_SLOTS: readonly Slot[] = [
  { formats: ['predict', 'trace', 'mcq'], rung: 'read' },
  { formats: ['mcq', 'multi', 'twins', 'errorTranslator'], rung: 'read' },
  { formats: ['cloze', 'parsons', 'fixBug'], rung: 'repair' },
  { formats: ['write', 'fixBug', 'refactor'], rung: 'write' },
  { formats: ['write', 'refactor', 'fixBug'], rung: 'write' },
];

/** Pass mark for a topic test of `total` questions: 4 of 5, or 80% rounded up when fewer questions exist. */
export function topicTestPassMark(total: number): number {
  if (total >= TOPIC_TEST_SIZE) return TOPIC_TEST_PASS;
  return Math.max(1, Math.ceil(total * 0.8));
}

/** 0 = preferred (medium or hard), 1 = easy. */
function topicDiffRank(d: Diff): number {
  return d === 'easy' ? 1 : 0;
}

/**
 * Relative chance of picking a candidate by how far its rank is behind the best rank on offer: the preferred
 * question is the likely one, never the certain one, so two papers from the same pool are not the same paper.
 */
const RANK_WEIGHT = [6, 2, 1] as const;

/** One of `items` at random, weighted towards the lowest `rankOf` (0 is best). */
function weightedPick<T>(items: readonly T[], rankOf: (item: T) => number, rng: Rng): T {
  const ranks = [...new Set(items.map(rankOf))].sort((a, b) => a - b);
  const weights = items.map((it) => RANK_WEIGHT[Math.min(ranks.indexOf(rankOf(it)), RANK_WEIGHT.length - 1)]);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Pick up to 5 questions for a topic test, ordered read -> repair -> write.
 * Levels are tried across all slots before falling back, so a fallback never steals a question another slot needs:
 * 0 exact format (no paper), 1 same rung (no paper), 2 any question (no paper), 3 anything including paper-mode write.
 * The most constrained slot fills first at each level. Within a level: medium/hard before easy, then format preference.
 *
 * `avoid` (usually the questions of the last attempt, whose answers were just shown) is used only when nothing else
 * fits: a fresh question on the right rung beats a repeated one, but a repeat still beats breaking the read/repair/write mix.
 */
export function selectTopicTest<T extends Candidate>(
  pool: readonly T[], rng: Rng = Math.random, slots: readonly Slot[] = TOPIC_TEST_SLOTS, avoid: ReadonlySet<string> = new Set(),
): T[] {
  const shuffled = shuffle(pool, rng);
  const used = new Set<string>();
  const picks: (T | undefined)[] = slots.map(() => undefined);

  const fits = (slot: Slot, c: T, level: number): boolean => {
    if (level < 3 && c.paper) return false;
    if (level === 0) return slot.formats.includes(c.format);
    if (level === 1) return FORMAT_LADDER[c.format] === slot.rung;
    return true;
  };
  const formatRank = (slot: Slot, c: T): number => {
    const fi = slot.formats.indexOf(c.format);
    return fi < 0 ? 50 : fi;
  };

  const hasAvoid = shuffled.some((c) => avoid.has(c.id));
  const passes: { level: number; fresh: boolean }[] = hasAvoid
    ? [[0, true], [1, true], [0, false], [1, false], [2, true], [3, true], [2, false], [3, false]].map(([level, fresh]) => ({ level: level as number, fresh: fresh as boolean }))
    : [0, 1, 2, 3].map((level) => ({ level, fresh: false }));

  for (const { level, fresh } of passes) {
    const open = slots.map((_, i) => i).filter((i) => !picks[i]);
    if (open.length === 0) break;
    const allowed = (c: T) => !used.has(c.id) && !(fresh && avoid.has(c.id));
    const countFor = (i: number) => shuffled.filter((c) => allowed(c) && fits(slots[i], c, level)).length;
    // Most constrained first (stable on slot order).
    const order = open.map((i) => ({ i, n: countFor(i) })).sort((a, b) => a.n - b.n || a.i - b.i);
    for (const { i } of order) {
      const options = shuffled.filter((c) => allowed(c) && fits(slots[i], c, level));
      if (options.length === 0) continue;
      // Difficulty stays a rule (medium or hard where they exist); the format is a preference, so it varies.
      const bestDiff = Math.min(...options.map((c) => topicDiffRank(c.diff)));
      const best = weightedPick(
        options.filter((c) => topicDiffRank(c.diff) === bestDiff),
        (c) => formatRank(slots[i], c),
        rng,
      );
      picks[i] = best;
      used.add(best.id);
    }
  }
  return picks.filter((p): p is T => p !== undefined);
}

// ---------------------------------------------------------------- mid-semester practice test

export const MIDSEM_COUNTS = [10, 15, 20, 30] as const;
export const MIDSEM_MINUTES = [20, 30, 45, 60, 90] as const;
export const MIDSEM_PASS_PERCENT = 50;
/** Shipped defaults. 10 questions take about 40 minutes of the expected solving times, so 45 minutes is a fair run. */
export const MIDSEM_DEFAULT_COUNT = 10;
export const MIDSEM_DEFAULT_MINUTES = 45;

export interface MidsemOptions {
  topicIds: readonly TopicId[];
  count: number;
  /** Off: read formats only (no Python needed). On: every format, including paper-mode write. */
  includeCoding: boolean;
}

/** Questions allowed in a mid-sem test with these options (before balancing). */
export function midsemEligible<T extends Candidate>(pool: readonly T[], opts: Pick<MidsemOptions, 'topicIds' | 'includeCoding'>): T[] {
  return pool.filter((c) => opts.topicIds.includes(c.topicId) && (opts.includeCoding || (OFFLINE_FORMATS.includes(c.format) && !c.paper)));
}

/**
 * Split `n` across buckets as evenly as possible without exceeding each bucket's capacity.
 * Leftover goes to buckets in the given order.
 */
export function waterFill(capacities: readonly number[], n: number): number[] {
  const out = capacities.map(() => 0);
  let left = Math.min(n, capacities.reduce((a, b) => a + b, 0));
  while (left > 0) {
    const open = capacities.map((cap, i) => i).filter((i) => out[i] < capacities[i]);
    if (open.length === 0) break;
    const share = Math.floor(left / open.length);
    if (share === 0) {
      // Fewer items than open buckets: one each, fullest capacity first so scarce buckets are not favoured, ties by order.
      const byRoom = open.slice().sort((a, b) => (capacities[b] - out[b]) - (capacities[a] - out[a]) || a - b);
      for (const i of byRoom.slice(0, left)) out[i]++;
      break;
    }
    for (const i of open) {
      const add = Math.min(share, capacities[i] - out[i]);
      out[i] += add;
      left -= add;
    }
  }
  return out;
}

/** Medium first; read questions treat easy and hard alike; repair and write prefer easy over hard (time). */
function midsemDiffRank(c: Candidate): number {
  if (c.diff === 'medium') return 0;
  if (FORMAT_LADDER[c.format] === 'read') return 1;
  return c.diff === 'easy' ? 1 : 2;
}

/**
 * The questions to keep out of the next paper: those used in the most recent attempts, newest first (both tests).
 * Stops at `maxAttempts` attempts, and before the set covers more than two thirds of the questions available,
 * so there is always a good supply of unseen questions left to choose from.
 */
export function recentlyUsedQids(attempts: readonly (readonly string[])[], eligibleCount: number, maxAttempts = 5): Set<string> {
  const cap = Math.floor(eligibleCount * (2 / 3));
  const out = new Set<string>();
  for (const qids of attempts.slice(0, maxAttempts)) {
    if (out.size >= cap) break;
    for (const qid of qids) out.add(qid);
  }
  return out;
}

const RUNGS: readonly Ladder[] = ['read', 'repair', 'write'];
const TOPIC_ORDER: Record<string, number> = Object.fromEntries(TOPICS.map((t, i) => [t.id, i]));

/**
 * Pick questions for a mid-semester practice test.
 * Balanced across the chosen topics and across read / repair / write (read only when coding is off), preferring medium.
 * Result is ordered read -> repair -> write, then by topic order, like a paper: warm-up questions first.
 *
 * Two papers from the same pool should not look the same, so each (topic, rung) cell picks at random among its
 * questions, weighted towards the preferred difficulty, and questions in `avoid` (the ones used in recent attempts)
 * are only used when a cell has nothing else left.
 */
export function selectMidsem<T extends Candidate>(
  pool: readonly T[], opts: MidsemOptions, rng: Rng = Math.random, avoid: ReadonlySet<string> = new Set(),
): T[] {
  const eligible = shuffle(midsemEligible(pool, opts), rng);
  const n = Math.min(Math.max(0, Math.floor(opts.count)), eligible.length);
  if (n === 0) return [];

  // Shuffled so that when there are more topics than questions, a different set of topics gets the questions each time.
  const topics = shuffle(opts.topicIds.filter((t, i) => opts.topicIds.indexOf(t) === i), rng);
  const rungs = opts.includeCoding ? RUNGS : (['read'] as const);
  const topicTargets = waterFill(topics.map((t) => eligible.filter((c) => c.topicId === t).length), n);
  const rungTargets = waterFill(rungs.map((r) => eligible.filter((c) => FORMAT_LADDER[c.format] === r).length), n);
  const topicCount = topics.map(() => 0);
  const rungCount = rungs.map(() => 0);

  const used = new Set<string>();
  const picked: T[] = [];
  // The questions a cell may choose from: unseen ones while it has any, otherwise everything left in that cell.
  const cellChoices = (ti: number, ri: number): T[] => {
    const avail = eligible.filter((c) => !used.has(c.id) && c.topicId === topics[ti] && FORMAT_LADDER[c.format] === rungs[ri]);
    const fresh = avail.filter((c) => !avoid.has(c.id));
    return fresh.length > 0 ? fresh : avail;
  };

  for (let k = 0; k < n; k++) {
    let best: { ti: number; ri: number; key: number[]; choices: T[] } | undefined;
    for (let ti = 0; ti < topics.length; ti++) {
      for (let ri = 0; ri < rungs.length; ri++) {
        const choices = cellChoices(ti, ri);
        if (choices.length === 0) continue;
        const tDef = topicTargets[ti] - topicCount[ti];
        const rDef = rungTargets[ri] - rungCount[ri];
        const bothOpen = (tDef > 0 ? 1 : 0) + (rDef > 0 ? 1 : 0);
        const relative = (topicTargets[ti] ? tDef / topicTargets[ti] : -1) + (rungTargets[ri] ? rDef / rungTargets[ri] : -1);
        const bestDiff = Math.min(...choices.map(midsemDiffRank));
        // Higher is better: both deficits open, larger relative deficit, a medium question available,
        // then the scarcer cell first (so it is not starved later).
        const key = [bothOpen, relative, -bestDiff, -choices.length];
        if (!best || compareKeys(key, best.key) > 0) best = { ti, ri, key, choices };
      }
    }
    if (!best) break;
    const { ti, ri } = best;
    const choice = weightedPick(best.choices, midsemDiffRank, rng);
    used.add(choice.id);
    picked.push(choice);
    topicCount[ti]++;
    rungCount[ri]++;
  }

  return picked.sort((a, b) =>
    RUNGS.indexOf(FORMAT_LADDER[a.format]) - RUNGS.indexOf(FORMAT_LADDER[b.format]) ||
    (TOPIC_ORDER[a.topicId] ?? 99) - (TOPIC_ORDER[b.topicId] ?? 99));
}

function compareKeys(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  }
  return 0;
}

/** Sum of expected solving time, in minutes, rounded up. */
export function estimatedMinutes(items: readonly Candidate[]): number {
  return Math.ceil(items.reduce((s, c) => s + c.expectedSec, 0) / 60);
}
