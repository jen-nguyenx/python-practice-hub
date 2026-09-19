// View-model helpers shared by the landing and topic pages. All derived from the event log via engine functions;
// fallbacks only fill gaps while an engine function returns nothing (so the UI never crashes on partial data).
import type { Diff, Format, MistakeId, TopicId } from '../../content/ids.ts';
import { CODE_FORMATS, FORMAT_LABEL } from '../../content/ids.ts';
import { TOPICS, TOPIC_BY_ID } from '../../content/topics.ts';
import type { TopicMeta } from '../../content/topics.ts';
import { QUESTION_INDEX } from '../../content/loadIndex.ts';
import { MISTAKES } from '../../content/mistakes.ts';
import { questionStats, topicProgressAll } from '../../engine/progress.ts';
import type { QuestionStats, TopicProgress } from '../../engine/progress.ts';
import type { AppEvent, Settings } from '../../engine/types.ts';
import { plural } from './format.ts';

export interface DiffCounts { easy: number; medium: number; hard: number; total: number; core: number; code: number }

export const DIFF_COUNTS: Record<TopicId, DiffCounts> = (() => {
  const out = {} as Record<TopicId, DiffCounts>;
  for (const t of TOPICS) out[t.id] = { easy: 0, medium: 0, hard: 0, total: 0, core: 0, code: 0 };
  for (const q of QUESTION_INDEX) {
    const c = out[q.topicId];
    if (!c) continue;
    c[q.diff]++;
    c.total++;
    if (q.core) c.core++;
    if (CODE_FORMATS.includes(q.format)) c.code++;
  }
  return out;
})();

export function prevTopic(meta: TopicMeta): TopicMeta | undefined { return TOPICS[meta.order - 2]; }
export function nextTopic(meta: TopicMeta): TopicMeta | undefined { return TOPICS[meta.order]; }

export function minimumText(min: { solve: number; code: number }) {
  return `Minimum: ${min.solve} solved, ${min.code} coding`;
}

export const CODE_FORMAT_NAMES = CODE_FORMATS.map((f) => FORMAT_LABEL[f]).join(', ');

function fallbackProgress(meta: TopicMeta, settings: Settings): TopicProgress {
  const prev = prevTopic(meta);
  const counts = DIFF_COUNTS[meta.id];
  const locked = !!prev && !settings.unlockAll;
  return {
    topicId: meta.id,
    state: locked ? 'locked' : 'open',
    opened: false,
    total: counts.total,
    attempted: 0,
    solved: 0,
    codeSolved: 0,
    minimum: meta.minimum,
    minimumMet: false,
    testedOut: false,
    score: null,
    lockReason: locked && prev
      ? `Open ${prev.title} and solve ${plural(prev.minimum.solve, 'question')} there, including ${plural(prev.minimum.code, 'coding question')}.`
      : undefined,
    remaining: `${plural(meta.minimum.solve, 'more to solve', 'more to solve')}, including ${plural(meta.minimum.code, 'coding question')}`,
  };
}

/** topicProgressAll with a per-topic fallback, never throws. */
export function safeTopicProgress(events: readonly AppEvent[], settings: Settings): Record<TopicId, TopicProgress> {
  let all: Partial<Record<TopicId, TopicProgress>> = {};
  try {
    all = topicProgressAll(events, QUESTION_INDEX, settings) ?? {};
  } catch {
    all = {};
  }
  const out = {} as Record<TopicId, TopicProgress>;
  for (const t of TOPICS) out[t.id] = all[t.id] ?? fallbackProgress(t, settings);
  return out;
}

export function safeQuestionStats(events: readonly AppEvent[]): Map<string, QuestionStats> {
  try {
    return questionStats(events) ?? new Map();
  } catch {
    return new Map();
  }
}

export type QStatus = 'new' | 'tried' | 'solved' | 'seen';
export function statusOf(s: QuestionStats | undefined): QStatus {
  if (!s) return 'new';
  if (s.solved) return 'solved';
  if (s.revealed) return 'seen';
  if (s.attempts > 0) return 'tried';
  return 'new';
}
export const STATUS_TEXT: Record<QStatus, string> = { new: 'New', tried: 'Tried', solved: 'Solved', seen: 'Answer seen' };

export interface RecentMistake { id: MistakeId; label: string; count: number; topicId: TopicId | null; lastTs: number }

/** Mistakes logged in the last `days` days, most frequent first. */
export function recentMistakes(events: readonly AppEvent[], days = 14, now = Date.now()): RecentMistake[] {
  const since = now - days * 86_400_000;
  const map = new Map<MistakeId, RecentMistake>();
  for (const e of events) {
    if (e.type !== 'mistake' || e.ts < since) continue;
    const def = MISTAKES[e.mistake];
    if (!def) continue;
    let m = map.get(e.mistake);
    if (!m) { m = { id: e.mistake, label: def.label, count: 0, topicId: null, lastTs: 0 }; map.set(e.mistake, m); }
    m.count++;
    if (e.ts >= m.lastTs) {
      m.lastTs = e.ts;
      if (e.topicId && TOPIC_BY_ID[e.topicId]) m.topicId = e.topicId;
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.lastTs - a.lastTs);
}

/** Topics whose lesson has been read through to the last step. */
export function lessonsDone(events: readonly AppEvent[]): Set<TopicId> {
  const out = new Set<TopicId>();
  for (const e of events) if (e.type === 'lesson_done') out.add(e.topicId);
  return out;
}

export function attemptCount(events: readonly AppEvent[]) {
  let n = 0;
  for (const e of events) if (e.type === 'attempt') n++;
  return n;
}

/** Timestamp of the latest activity in any session other than the current one. */
export function lastOtherSessionTs(events: readonly AppEvent[], sessionId: string): number | null {
  let best: number | null = null;
  for (const e of events) {
    if (e.sessionId === sessionId) continue;
    if (best === null || e.ts > best) best = e.ts;
  }
  return best;
}

export function diffRange(diffs: readonly Diff[]): string {
  const order: Diff[] = ['easy', 'medium', 'hard'];
  const present = order.filter((d) => diffs.includes(d));
  if (present.length === 0) return '';
  const cap = (d: Diff) => d[0].toUpperCase() + d.slice(1);
  if (present.length === 1) return cap(present[0]);
  return `${cap(present[0])} to ${cap(present[present.length - 1])}`;
}

export function isCodeFormat(f: Format) { return CODE_FORMATS.includes(f); }
