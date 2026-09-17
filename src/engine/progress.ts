// Progress and unlock rules, derived purely from the event log.
import { CODE_FORMATS } from '../content/ids.ts';
import type { MistakeId, TopicId } from '../content/ids.ts';
import type { QuestionMeta } from '../content/questionIndex.ts';
import { TOPICS } from '../content/topics.ts';
import type { TopicMeta } from '../content/topics.ts';
import type { AppEvent, Settings } from './types.ts';
import { clamp01, roundTo, unionLength } from './util/stats.ts';
import { plural } from './util/text.ts';

export interface QuestionStats {
  qid: string;
  attempts: number;
  /** answered correctly at least once without having revealed the answer first */
  solved: boolean;
  revealed: boolean;
  /** best credit 0..1 */
  bestCredit: number;
  lastTs: number;
  lastCorrect: boolean;
}

export type TopicState = 'locked' | 'open' | 'in-progress' | 'completed';

export interface TopicProgress {
  topicId: TopicId;
  state: TopicState;
  opened: boolean;
  total: number;
  attempted: number;
  solved: number;
  codeSolved: number;
  minimum: { solve: number; code: number };
  minimumMet: boolean;
  /** passed a topic test (counts as minimum met) */
  testedOut: boolean;
  /** mean best credit over attempted questions, 0..1, null if none attempted */
  score: number | null;
  /** Plain sentence shown on a locked card, e.g. "Open For loops and solve 4 more questions there (2 must be coding questions)." */
  lockReason?: string;
  /** Plain sentence of what is left for this topic's own minimum, e.g. "2 more to solve, including 1 coding question". */
  remaining?: string;
}

/** Events sorted by timestamp; ties keep insertion order. Returns the input when already sorted. */
export function sortedByTs(events: readonly AppEvent[]): readonly AppEvent[] {
  for (let i = 1; i < events.length; i++) {
    if (events[i].ts < events[i - 1].ts) {
      return events.map((e, idx) => [e, idx] as const).sort((a, b) => a[0].ts - b[0].ts || a[1] - b[1]).map(([e]) => e);
    }
  }
  return events;
}

const CODE_SET = new Set<string>(CODE_FORMATS);

/** Per-question stats. A question counts as solved only by a correct attempt made before any reveal of its answer. */
export function questionStats(events: readonly AppEvent[]): Map<string, QuestionStats> {
  const out = new Map<string, QuestionStats>();
  const revealedAt = new Set<string>();
  const get = (qid: string): QuestionStats => {
    let s = out.get(qid);
    if (!s) {
      s = { qid, attempts: 0, solved: false, revealed: false, bestCredit: 0, lastTs: 0, lastCorrect: false };
      out.set(qid, s);
    }
    return s;
  };
  for (const e of sortedByTs(events)) {
    if (e.type === 'reveal') {
      revealedAt.add(e.qid);
      const s = get(e.qid);
      s.revealed = true;
      if (s.attempts === 0) s.lastTs = Math.max(s.lastTs, e.ts);
    } else if (e.type === 'attempt') {
      const s = get(e.qid);
      s.attempts++;
      if (e.revealed) s.revealed = true;
      if (e.correct && !e.revealed && !revealedAt.has(e.qid)) s.solved = true;
      const credit = e.revealed ? 0 : clamp01(Number(e.credit));
      if (credit > s.bestCredit) s.bestCredit = credit;
      s.lastTs = e.ts;
      s.lastCorrect = !!e.correct;
    }
  }
  return out;
}

interface TopicCounts {
  opened: boolean;
  attemptedQids: Set<string>;
  solvedQids: Set<string>;
  codeSolvedQids: Set<string>;
  testedOut: boolean;
  hasPracticeAttempt: boolean;
}

function countsByTopic(events: readonly AppEvent[]): Map<TopicId, TopicCounts> {
  const m = new Map<TopicId, TopicCounts>();
  const get = (id: TopicId) => {
    let c = m.get(id);
    if (!c) {
      c = { opened: false, attemptedQids: new Set(), solvedQids: new Set(), codeSolvedQids: new Set(), testedOut: false, hasPracticeAttempt: false };
      m.set(id, c);
    }
    return c;
  };
  const revealedBefore = new Set<string>();
  for (const e of sortedByTs(events)) {
    switch (e.type) {
      case 'topic_open':
        get(e.topicId).opened = true;
        break;
      case 'reveal':
        revealedBefore.add(e.qid);
        break;
      case 'attempt': {
        const c = get(e.topicId);
        c.attemptedQids.add(e.qid);
        if (e.mode === 'practice' || e.mode === 'paper') c.hasPracticeAttempt = true;
        if (e.correct && !e.revealed && !revealedBefore.has(e.qid)) {
          c.solvedQids.add(e.qid);
          if (CODE_SET.has(e.format)) c.codeSolvedQids.add(e.qid);
        }
        break;
      }
      case 'test_result':
        if (e.kind === 'topic-test' && e.passed) for (const t of e.topicIds) get(t).testedOut = true;
        break;
      default:
        break;
    }
  }
  return m;
}

function remainingNeeds(meta: TopicMeta, solved: number, codeSolved: number): { n: number; c: number } {
  const c = Math.max(0, meta.minimum.code - codeSolved);
  const n = Math.max(Math.max(0, meta.minimum.solve - solved), c);
  return { n, c };
}

/** "2 more to solve, including 1 coding question" / "2 more coding questions to solve" / "3 more to solve". */
function remainingSentence(n: number, c: number): string {
  if (c > 0 && c === n) return `${n} more coding ${n === 1 ? 'question' : 'questions'} to solve`;
  if (c > 0) return `${n} more to solve, including ${plural(c, 'coding question')}`;
  return `${n} more to solve`;
}

function codeClause(n: number, c: number): string {
  if (c <= 0) return '';
  if (c === n) return n === 1 ? ' (it must be a coding question)' : ' (all must be coding questions)';
  return c === 1 ? ' (1 must be a coding question)' : ` (${c} must be coding questions)`;
}

function lockSentence(prev: TopicMeta, prevOpened: boolean, prevUnlocked: boolean, n: number, c: number): string {
  const name = prev.short;
  if (!prevUnlocked) {
    return `Unlock ${name} first, then solve ${plural(prev.minimum.solve, 'question')} there${codeClause(prev.minimum.solve, prev.minimum.code)}.`;
  }
  if (n === 0) return `Open ${name} to unlock this topic.`;
  const what = `${n} more ${n === 1 ? 'question' : 'questions'}`;
  if (!prevOpened) return `Open ${name} and solve ${what} there${codeClause(n, c)}.`;
  return `Solve ${what} in ${name}${codeClause(n, c)}.`;
}

/**
 * Unlock rule: topic 1 is always open. Topic N+1 unlocks when topic N has been opened AND its minimum is met
 * (or its topic test was passed), or settings.unlockAll is on.
 * completed = minimum met. in-progress = attempted > 0. open = unlocked with no attempts.
 *
 * Topics never lock again once the student has practised in them (a practice or paper attempt), so switching
 * "Unlock all topics" off does not hide work already done.
 */
export function topicProgressAll(events: readonly AppEvent[], index: readonly QuestionMeta[], settings: Settings): Record<TopicId, TopicProgress> {
  const stats = questionStats(events);
  const counts = countsByTopic(events);
  const totals = new Map<string, number>();
  for (const q of index) totals.set(q.topicId, (totals.get(q.topicId) ?? 0) + 1);

  const out = {} as Record<TopicId, TopicProgress>;
  let prev: { meta: TopicMeta; opened: boolean; countsMet: boolean; testedOut: boolean; unlocked: boolean; n: number; c: number } | null = null;
  for (const meta of TOPICS) {
    const c = counts.get(meta.id);
    const opened = c?.opened ?? false;
    const attemptedQids = c?.attemptedQids ?? new Set<string>();
    const solved = c?.solvedQids.size ?? 0;
    const codeSolved = c?.codeSolvedQids.size ?? 0;
    const testedOut = c?.testedOut ?? false;
    const countsMet = solved >= meta.minimum.solve && codeSolved >= meta.minimum.code;
    const minimumMet = countsMet || testedOut;

    let unlocked: boolean;
    if (!prev) unlocked = true;
    else unlocked = settings.unlockAll || (prev.opened && prev.countsMet) || prev.testedOut || (c?.hasPracticeAttempt ?? false);

    let scoreSum = 0;
    for (const qid of attemptedQids) scoreSum += stats.get(qid)?.bestCredit ?? 0;
    const score = attemptedQids.size > 0 ? scoreSum / attemptedQids.size : null;

    const need = remainingNeeds(meta, solved, codeSolved);
    let state: TopicState;
    if (!unlocked) state = 'locked';
    else if (minimumMet) state = 'completed';
    else if (attemptedQids.size > 0) state = 'in-progress';
    else state = 'open';

    const p: TopicProgress = {
      topicId: meta.id,
      state,
      opened,
      total: totals.get(meta.id) ?? 0,
      attempted: attemptedQids.size,
      solved,
      codeSolved,
      minimum: { ...meta.minimum },
      minimumMet,
      testedOut,
      score,
    };
    if (!minimumMet) p.remaining = remainingSentence(need.n, need.c);
    if (!unlocked && prev) p.lockReason = lockSentence(prev.meta, prev.opened, prev.unlocked, prev.n, prev.c);
    out[meta.id] = p;
    prev = { meta, opened, countsMet, testedOut, unlocked, n: need.n, c: need.c };
  }
  return out;
}

export interface SessionSummary { sessionId: string; start: number; end: number; focusedMin: number; questions: number; correct: number; newMistakes: string[]; topics: TopicId[] }

const ATTEMPT_CAP_MS = 10 * 60_000;
const GAP_CAP_MS = 5 * 60_000;

function eventMistakes(e: AppEvent): MistakeId[] {
  if (e.type === 'mistake') return [e.mistake];
  if (e.type === 'attempt') return e.mistakes ?? [];
  return [];
}

function eventTopic(e: AppEvent): TopicId | null {
  switch (e.type) {
    case 'topic_open':
    case 'attempt':
    case 'hint':
    case 'reveal':
      return e.topicId;
    case 'mistake':
    case 'run':
      return e.topicId;
    default:
      return null;
  }
}

/**
 * One summary per session, ordered by start time.
 * focusedMin: union of each attempt's working time (capped at 10 min) and gaps under 5 min between events.
 * newMistakes: mistake ids seen for the first time ever in that session.
 */
export function sessionSummaries(events: readonly AppEvent[]): SessionSummary[] {
  const sorted = sortedByTs(events);
  const seenMistakes = new Set<string>();
  const groups = new Map<string, { evs: AppEvent[]; newMistakes: string[] }>();
  for (const e of sorted) {
    let g = groups.get(e.sessionId);
    if (!g) {
      g = { evs: [], newMistakes: [] };
      groups.set(e.sessionId, g);
    }
    g.evs.push(e);
    for (const m of eventMistakes(e)) {
      if (!seenMistakes.has(m)) {
        seenMistakes.add(m);
        g.newMistakes.push(m);
      }
    }
  }
  const out: SessionSummary[] = [];
  for (const [sessionId, g] of groups) {
    const evs = g.evs;
    const intervals: [number, number][] = [];
    const qids = new Set<string>();
    const correctQids = new Set<string>();
    const topics: TopicId[] = [];
    for (let i = 0; i < evs.length; i++) {
      const e = evs[i];
      if (i > 0) {
        const gap = e.ts - evs[i - 1].ts;
        if (gap > 0 && gap < GAP_CAP_MS) intervals.push([evs[i - 1].ts, e.ts]);
      }
      if (e.type === 'attempt') {
        const t = Math.min(Math.max(0, Number(e.timeMs) || 0), ATTEMPT_CAP_MS);
        intervals.push([e.ts - t, e.ts]);
        qids.add(e.qid);
        if (e.correct) correctQids.add(e.qid);
      }
      const t = eventTopic(e);
      if (t && !topics.includes(t)) topics.push(t);
    }
    out.push({
      sessionId,
      start: evs[0].ts,
      end: evs[evs.length - 1].ts,
      focusedMin: roundTo(unionLength(intervals) / 60_000, 1),
      questions: qids.size,
      correct: correctQids.size,
      newMistakes: g.newMistakes,
      topics,
    });
  }
  return out.sort((a, b) => a.start - b.start);
}

export function currentSessionSummary(events: readonly AppEvent[], sessionId: string): SessionSummary | null {
  return sessionSummaries(events).find((s) => s.sessionId === sessionId) ?? null;
}

/** The question to resume: last attempted unsolved question, else first unsolved in the furthest in-progress topic. */
export function continueTarget(events: readonly AppEvent[], index: readonly QuestionMeta[], settings: Settings): { qid: string; topicId: TopicId } | null {
  const progress = topicProgressAll(events, index, settings);
  const stats = questionStats(events);
  const isUnlocked = (t: TopicId) => progress[t] && progress[t].state !== 'locked';
  const known = new Map(index.map((q) => [q.qid, q]));
  const open = (qid: string) => {
    const s = stats.get(qid);
    return !s || (!s.solved && !s.revealed);
  };

  const sorted = sortedByTs(events);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const e = sorted[i];
    if (e.type !== 'attempt') continue;
    if (e.mode !== 'practice' && e.mode !== 'paper') continue;
    if (index.length > 0 && !known.has(e.qid)) continue;
    if (!isUnlocked(e.topicId)) continue;
    if (open(e.qid)) return { qid: e.qid, topicId: e.topicId };
  }

  const firstOpenIn = (topicId: TopicId) => {
    const q = index.find((m) => m.topicId === topicId && open(m.qid));
    return q ? { qid: q.qid, topicId } : null;
  };
  const ordered = [...TOPICS].sort((a, b) => b.order - a.order);
  for (const t of ordered) {
    if (progress[t.id]?.state !== 'in-progress') continue;
    const hit = firstOpenIn(t.id);
    if (hit) return hit;
  }
  // No topic in progress: the next open topic after the furthest one worked on, then any unlocked topic.
  const furthest = Math.max(0, ...TOPICS.filter((t) => progress[t.id]?.state === 'completed').map((t) => t.order));
  const ascending = [...TOPICS].sort((a, b) => a.order - b.order);
  for (const t of ascending) {
    if (t.order <= furthest || progress[t.id]?.state !== 'open') continue;
    const hit = firstOpenIn(t.id);
    if (hit) return hit;
  }
  for (const t of ascending) {
    if (!isUnlocked(t.id)) continue;
    const hit = firstOpenIn(t.id);
    if (hit) return hit;
  }
  return null;
}
