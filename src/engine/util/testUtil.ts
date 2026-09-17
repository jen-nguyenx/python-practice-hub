// Event and index builders shared by engine tests (not imported by app code).
import type { AstFlag, Diff, Format, MistakeId, TopicId } from '../../content/ids.ts';
import type { QuestionMeta } from '../../content/questionIndex.ts';
import type { AppEvent } from '../types.ts';

let counter = 0;
type Base = { eid: string; v: 1; ts: number; sessionId: string };
const base = (ts: number, sessionId: string): Base => ({ eid: `e${++counter}`, v: 1, ts, sessionId });

export const MIN = 60_000;
export const T0 = Date.UTC(2026, 8, 1, 9, 0, 0);

export function topicIdOf(qid: string): TopicId {
  const map: Record<string, TopicId> = {
    '01': 'variables-expressions', '02': 'if-elif-else', '03': 'for-loops-range', '04': 'functions-basics', '05': 'strings',
    '06': 'lists-tuples', '07': 'while-nested-loops', '08': 'dictionaries', '09': 'files-csv', '10': 'exceptions',
    '11': 'functions-project', '12': 'project-simulator', '13': 'recursion',
  };
  return map[qid.slice(1, 3)];
}

export interface AttemptOpts {
  ts: number;
  sessionId?: string;
  qid: string;
  format?: Format;
  diff?: Diff;
  correct?: boolean;
  score?: number;
  credit?: number;
  hintTier?: 0 | 1 | 2 | 3;
  revealed?: boolean;
  timeMs?: number;
  mistakes?: MistakeId[];
  mode?: 'practice' | 'paper' | 'topic-test' | 'midsem';
  flags?: AstFlag[];
}

export function attempt(o: AttemptOpts): AppEvent {
  const correct = o.correct ?? true;
  const score = o.score ?? (correct ? 1 : 0);
  return {
    ...base(o.ts, o.sessionId ?? 's1'), type: 'attempt', qid: o.qid, topicId: topicIdOf(o.qid), format: o.format ?? 'mcq', diff: o.diff ?? 'easy',
    mode: o.mode ?? 'practice', checkNo: 1, correct, score, credit: o.credit ?? (o.revealed ? 0 : score), hintTier: o.hintTier ?? 0,
    revealed: o.revealed ?? false, timeMs: o.timeMs ?? 30_000, mistakes: o.mistakes ?? [], ...(o.flags ? { flags: o.flags } : {}),
  };
}

export const open = (topicId: TopicId, ts: number, sessionId = 's1'): AppEvent => ({ ...base(ts, sessionId), type: 'topic_open', topicId });
export const sessionStart = (ts: number, sessionId = 's1'): AppEvent => ({ ...base(ts, sessionId), type: 'session_start' });
export const reveal = (qid: string, ts: number, sessionId = 's1'): AppEvent => ({ ...base(ts, sessionId), type: 'reveal', qid, topicId: topicIdOf(qid) });
export const hint = (qid: string, tier: 1 | 2 | 3, ts: number, dwellMs = 5000, sessionId = 's1'): AppEvent => ({ ...base(ts, sessionId), type: 'hint', qid, topicId: topicIdOf(qid), tier, dwellMs });
export const mistake = (qid: string | null, id: MistakeId, ts: number, sessionId = 's1'): AppEvent => ({
  ...base(ts, sessionId), type: 'mistake', qid, topicId: qid ? topicIdOf(qid) : null, mistake: id, channel: 'test',
});
export const selfExplain = (qid: string, ts: number, sessionId = 's1'): AppEvent => ({ ...base(ts, sessionId), type: 'self_explain', qid, text: 'because' });
export const testResult = (kind: 'topic-test' | 'midsem', topicIds: TopicId[], score: number, total: number, passed: boolean, ts: number, sessionId = 's1'): AppEvent => ({
  ...base(ts, sessionId), type: 'test_result', kind, topicIds, score, total, passed, durationMs: 600_000, qids: [],
});

export function meta(qid: string, format: Format, extra: Partial<QuestionMeta> = {}): QuestionMeta {
  return {
    qid, topicId: topicIdOf(qid), scenarioId: qid.slice(0, 6), format, diff: 'easy', core: true, title: qid, concepts: [], detects: [],
    expectedSec: 120, ...extra,
  };
}
