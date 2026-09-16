// STUB report aggregations. Replaced by the engine-store agent. Keep signatures and shapes.
import type { Diff, Format, MistakeId, PatternId, RuleId, TopicId } from '../content/ids.ts';
import type { QuestionMeta } from '../content/questionIndex.ts';
import type { AppEvent } from './types.ts';

export type ReportRange = 'session' | '7d' | '30d' | 'all';
export type Rung = 'read' | 'repair' | 'write';

export interface ReportData {
  range: ReportRange;
  hasEnoughData: boolean;
  totals: { questions: number; attempts: number; sessions: number; focusedMinutes: number; accuracy: number | null; firstTryRate: number | null; hintRate: number | null; revealRate: number | null };
  headline: { strengths: string[]; workOn: { text: string; href: string }[] };
  topics: {
    topicId: TopicId; attempted: number; total: number; score: number | null;
    byDiff: Record<Diff, { attempted: number; correct: number }>;
    hintReliance: number | null; lastTs: number | null; label: 'strong' | 'weak' | 'ok' | 'not-started';
    reasons: string[];
  }[];
  ladder: { topicId: TopicId; read: number | null; repair: number | null; write: number | null }[];
  mistakes: { id: MistakeId; count: number; questions: number; sessions: number; recent14d: number; lastTs: number; medianFixMs: number | null; exampleQid: string | null }[];
  formats: { format: Format; attempted: number; accuracy: number | null; medianTimeSec: number | null }[];
  sessions: { sessionId: string; start: number; end: number; durationMin: number; questions: number; accuracy: number | null; newMistakes: MistakeId[]; topics: TopicId[] }[];
  trend: { sessionId: string; start: number; accuracy: number | null }[];
  patterns: { id: PatternId; status: 'recommended' | 'using' | 'later'; triggerCount: number }[];
  readiness: {
    paperAccuracy: number | null;
    midsem: { best: number | null; last: number | null; attempts: number };
    recursionAccuracy: number | null;
    projectRules: { rule: RuleId; ok: number; broken: number }[];
  };
  behaviour: { rushed: number; stuckNoHint: number; hintSkims: number; revealedWithoutExplain: number };
}

export function buildReport(events: readonly AppEvent[], index: readonly QuestionMeta[], range: ReportRange, unlockedTopics: readonly TopicId[]): ReportData {
  void events; void index; void range; void unlockedTopics;
  throw new Error('report not implemented');
}

/** Timeline of one session: question, result, hint tier, time. */
export function sessionTimeline(events: readonly AppEvent[], sessionId: string): { ts: number; qid: string; format: Format; correct: boolean; hintTier: number; revealed: boolean; timeMs: number }[] {
  void events; void sessionId; return [];
}
