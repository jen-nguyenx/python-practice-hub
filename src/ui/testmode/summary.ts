// Pure test scoring, event building and history. Unit-tested in summary.test.ts.
import type { Diff, Format, TopicId } from '../../content/ids.ts';
import type { GeneratedQuestion, Question } from '../../content/schema.ts';
import { TOPICS } from '../../content/topics.ts';
import type { AppEvent, GradeResult, Mode, NewEvent, TestKind } from '../../engine/types.ts';
import { TIMED_TEST_PASS_PERCENT, topicTestPassMark } from './select.ts';

export type { TestKind };

/** How a question component should behave for a given test: every timed test hides hints and answers. */
export function questionMode(kind: TestKind): Mode {
  return kind === 'topic-test' ? 'topic-test' : 'exam';
}

export interface TestItem {
  q: Question;
  topicId: TopicId;
  generated?: GeneratedQuestion;
  /** The scenario the question belongs to; prompts can refer to its story. */
  scenario?: { title: string; story: string };
}

export interface SavedAnswer {
  result: GradeResult;
  response: unknown;
  /** time spent on the question up to the moment the answer was saved */
  timeMs: number;
}

export interface QuestionOutcome {
  index: number;
  qid: string;
  topicId: TopicId;
  format: Format;
  diff: Diff;
  title: string;
  answered: boolean;
  correct: boolean;
  /** 0..1, partial credit allowed */
  score: number;
  timeMs: number;
  flagged: boolean;
}

export interface TopicBreakdown { topicId: TopicId; total: number; correct: number; answered: number }

export interface TestSummary {
  kind: TestKind;
  title: string;
  total: number;
  /** questions answered correctly */
  correct: number;
  answered: number;
  /** 0..100, whole number */
  percent: number;
  passed: boolean;
  /** correct answers needed to pass */
  passMark: number;
  durationMs: number;
  limitMs: number;
  /** true when the timer ran out */
  timedOut: boolean;
  topicIds: TopicId[];
  qids: string[];
  perTopic: TopicBreakdown[];
  outcomes: QuestionOutcome[];
  finishedAt: number;
  /** Mock exam only: marks earned out of the paper's total, using each question's partial credit. */
  marks?: { earned: number; total: number };
}

/** Correct answers needed to pass: topic test 4 of 5; every timed test 50%. */
export function passMarkFor(kind: TestKind, total: number): number {
  if (kind === 'topic-test') return topicTestPassMark(total);
  return Math.max(1, Math.ceil((total * TIMED_TEST_PASS_PERCENT) / 100));
}

const TOPIC_ORDER: Record<string, number> = Object.fromEntries(TOPICS.map((t, i) => [t.id, i]));

export function summarizeTest(args: {
  kind: TestKind;
  title: string;
  items: readonly TestItem[];
  answers: ReadonlyMap<number, SavedAnswer>;
  flagged: ReadonlySet<number>;
  timeSpent: readonly number[];
  durationMs: number;
  limitMs: number;
  timedOut: boolean;
  finishedAt: number;
  /** Mock exam only: marks per question id. Present means the paper is scored out of marks, not questions. */
  marks?: Readonly<Record<string, number>>;
}): TestSummary {
  const outcomes: QuestionOutcome[] = args.items.map((it, i) => {
    const a = args.answers.get(i);
    return {
      index: i, qid: it.q.id, topicId: it.topicId, format: it.q.format, diff: it.q.diff, title: it.q.title,
      answered: !!a, correct: !!a?.result.correct, score: a ? clamp01(a.result.score) : 0,
      timeMs: a ? a.timeMs : args.timeSpent[i] ?? 0, flagged: args.flagged.has(i),
    };
  });
  const total = outcomes.length;
  const correct = outcomes.filter((o) => o.correct).length;
  const passMark = passMarkFor(args.kind, total);
  const topicIds = uniq(outcomes.map((o) => o.topicId)).sort((a, b) => (TOPIC_ORDER[a] ?? 99) - (TOPIC_ORDER[b] ?? 99));
  const perTopic = topicIds.map((topicId) => {
    const os = outcomes.filter((o) => o.topicId === topicId);
    return { topicId, total: os.length, correct: os.filter((o) => o.correct).length, answered: os.filter((o) => o.answered).length };
  });
  // A mock exam is marked like the real paper: each question's partial credit times its marks.
  let marks: TestSummary['marks'];
  if (args.marks) {
    const marksTotal = outcomes.reduce((sum, o) => sum + (args.marks![o.qid] ?? 0), 0);
    const earned = outcomes.reduce((sum, o) => sum + o.score * (args.marks![o.qid] ?? 0), 0);
    marks = { earned: Math.round(earned), total: marksTotal };
  }
  const percent = marks
    ? (marks.total ? Math.round((marks.earned / marks.total) * 100) : 0)
    : (total ? Math.round((correct / total) * 100) : 0);
  return {
    kind: args.kind, title: args.title, total, correct, answered: outcomes.filter((o) => o.answered).length,
    percent,
    passed: marks ? percent >= TIMED_TEST_PASS_PERCENT : total > 0 && correct >= passMark, passMark,
    durationMs: Math.max(0, Math.round(args.durationMs)), limitMs: args.limitMs, timedOut: args.timedOut,
    topicIds, qids: outcomes.map((o) => o.qid), perTopic, outcomes, finishedAt: args.finishedAt, marks,
  };
}

/** Topics to practise after a test: below 70% correct, weakest first. */
export function weakTopics(summary: TestSummary): TopicBreakdown[] {
  return summary.perTopic
    .filter((t) => t.total > 0 && t.correct / t.total < 0.7)
    .sort((a, b) => a.correct / a.total - b.correct / b.total || (TOPIC_ORDER[a.topicId] ?? 99) - (TOPIC_ORDER[b.topicId] ?? 99));
}

/**
 * A next step for a mid-sem test where every topic scored 70% or more, or null when nothing useful can be said:
 * never for a topic test (it has one topic and its own pass message), and not once the test was already the longest
 * size and covered every mid-sem topic.
 */
export function strongNextStep(summary: TestSummary, opts: { maxCount: number; topicCount: number }): string | null {
  if (summary.kind !== 'practice-test' || summary.total === 0 || weakTopics(summary).length > 0) return null;
  const longer = summary.total < opts.maxCount;
  const wider = summary.topicIds.length < opts.topicCount;
  if (!longer && !wider) return null;
  const what = longer && wider ? 'more questions or more topics' : longer ? 'more questions' : 'more topics';
  return `Every topic scored 70% or more. Next time, try ${what}.`;
}

const RESPONSE_LIMIT = 4000;

/** Keep responses under the 4 KB limit; long ones are stored as a truncated JSON string. */
export function compactResponse(response: unknown): unknown {
  if (response === undefined) return undefined;
  if (typeof response === 'string') return response.length > RESPONSE_LIMIT ? response.slice(0, RESPONSE_LIMIT) : response;
  let json: string | undefined;
  try { json = JSON.stringify(response); } catch { return undefined; }
  if (json === undefined) return undefined;
  return json.length > RESPONSE_LIMIT ? json.slice(0, RESPONSE_LIMIT) : response;
}

/**
 * Events logged when a test finishes: for each answered question one attempt (checkNo 1, no hints, credit = score)
 * followed by its mistake events, then one test_result.
 */
export function buildTestEvents(summary: TestSummary, items: readonly TestItem[], answers: ReadonlyMap<number, SavedAnswer>): NewEvent[] {
  const out: NewEvent[] = [];
  items.forEach((it, i) => {
    const a = answers.get(i);
    if (!a) return;
    const score = clamp01(a.result.score);
    const mistakes = uniq(a.result.mistakes.map((m) => m.id));
    out.push({
      type: 'attempt', qid: it.q.id, topicId: it.topicId, format: it.q.format, diff: it.q.diff, mode: questionMode(summary.kind),
      checkNo: 1, correct: a.result.correct, score, credit: score, hintTier: 0, revealed: false,
      timeMs: Math.max(0, Math.round(a.timeMs)), mistakes, response: compactResponse(a.response),
    });
    for (const m of a.result.mistakes) {
      out.push({ type: 'mistake', qid: it.q.id, topicId: it.topicId, mistake: m.id, channel: m.channel });
    }
  });
  out.push({
    type: 'test_result', kind: summary.kind, topicIds: summary.topicIds,
    score: summary.marks ? summary.marks.earned : summary.correct, total: summary.marks ? summary.marks.total : summary.total,
    passed: summary.passed, durationMs: summary.durationMs, qids: summary.qids,
  });
  return out;
}

export interface TestHistoryEntry { ts: number; score: number; total: number; percent: number; passed: boolean; topicIds: TopicId[]; durationMs: number; qids: string[] }

/** Previous results of one kind, newest first. For topic tests pass `topicId` to keep only that topic. */
export function testHistory(events: readonly AppEvent[], kind: TestKind, topicId?: TopicId): TestHistoryEntry[] {
  const out: TestHistoryEntry[] = [];
  for (const e of events) {
    if (e.type !== 'test_result' || e.kind !== kind) continue;
    if (topicId && !e.topicIds.includes(topicId)) continue;
    out.push({
      ts: e.ts, score: e.score, total: e.total, percent: e.total ? Math.round((e.score / e.total) * 100) : 0,
      passed: e.passed, topicIds: e.topicIds, durationMs: e.durationMs, qids: Array.isArray(e.qids) ? e.qids : [],
    });
  }
  return out.sort((a, b) => b.ts - a.ts);
}

/** Best result by percent (ties: more questions, then most recent). */
export function bestResult(history: readonly TestHistoryEntry[]): TestHistoryEntry | null {
  let best: TestHistoryEntry | null = null;
  for (const h of history) {
    if (!best || h.percent > best.percent || (h.percent === best.percent && (h.total > best.total || (h.total === best.total && h.ts > best.ts)))) best = h;
  }
  return best;
}

function clamp01(x: number): number {
  return Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0;
}

function uniq<T>(xs: readonly T[]): T[] {
  return xs.filter((x, i) => xs.indexOf(x) === i);
}
