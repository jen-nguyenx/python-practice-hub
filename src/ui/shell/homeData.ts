// View-model for Home and the command palette: the Continue target, today's numbers, the mid-sem test summary
// and the backup reminder. Everything is derived from the event log; nothing here throws.
import type { TopicId } from '../../content/ids.ts';
import { QUESTION_BY_ID, QUESTION_INDEX } from '../../content/loadIndex.ts';
import type { QuestionMeta } from '../../content/questionIndex.ts';
import { TOPICS, TOPIC_BY_ID } from '../../content/topics.ts';
import type { TopicMeta } from '../../content/topics.ts';
import { continueTarget, sessionSummaries } from '../../engine/progress.ts';
import type { TopicProgress } from '../../engine/progress.ts';
import type { AppEvent, Settings } from '../../engine/types.ts';
import { readProgress } from '../testmode/progress.ts';

export interface ContinueInfo {
  topic: TopicMeta;
  question: QuestionMeta | null;
  href: 'question' | 'topic';
}

/** The next thing to do: the engine's continue target, else the first unfinished open topic, else topic 1. */
export function continueInfo(events: readonly AppEvent[], settings: Settings, progress: Record<TopicId, TopicProgress>): ContinueInfo {
  let target: { qid: string; topicId: TopicId } | null = null;
  try { target = continueTarget(events, QUESTION_INDEX, settings); } catch { target = null; }
  if (target) {
    const q = QUESTION_BY_ID.get(target.qid) ?? null;
    const topic = TOPIC_BY_ID[target.topicId];
    if (topic) return { topic, question: q, href: q ? 'question' : 'topic' };
  }
  const open = TOPICS.filter((t) => progress[t.id]?.state !== 'locked');
  const topic = open.find((t) => progress[t.id]?.state !== 'completed') ?? open[open.length - 1] ?? TOPICS[0];
  return { topic, question: null, href: 'topic' };
}

export interface TodayNumbers { questions: number; minutes: number; newMistakes: number }

function startOfToday(now: number) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Distinct questions attempted today, focused minutes and first-ever mistakes from sessions that touched today. */
export function todayNumbers(events: readonly AppEvent[], now = Date.now()): TodayNumbers {
  const since = startOfToday(now);
  const qids = new Set<string>();
  for (const e of events) if (e.type === 'attempt' && e.ts >= since && (e.mode === 'practice' || e.mode === 'paper')) qids.add(e.qid);
  let minutes = 0;
  let newMistakes = 0;
  try {
    for (const s of sessionSummaries(events)) {
      if (s.end < since) continue;
      minutes += s.focusedMin;
      newMistakes += s.newMistakes.length;
    }
  } catch { /* partial data: keep zeros */ }
  return { questions: qids.size, minutes: Math.round(minutes), newMistakes };
}

export function hasAnyAttempt(events: readonly AppEvent[]) {
  for (const e of events) if (e.type === 'attempt') return true;
  return false;
}

export interface MidsemSummary { count: number; minutes: number; scope: string; resumable: boolean }

/** Reads the mid-sem setup the test screen remembers, with the screen's defaults. */
export function midsemSummary(): MidsemSummary {
  const defaults = TOPICS.filter((t) => t.midsem);
  let count = 15;
  let minutes = 30;
  let ids: string[] = defaults.map((t) => t.id);
  try {
    const raw = JSON.parse(localStorage.getItem('pyladder:midsem-setup') ?? 'null') as { count?: unknown; minutes?: unknown; topicIds?: unknown } | null;
    if (raw) {
      if (typeof raw.count === 'number' && raw.count > 0) count = raw.count;
      if (typeof raw.minutes === 'number' && raw.minutes > 0) minutes = raw.minutes;
      if (Array.isArray(raw.topicIds)) ids = raw.topicIds.filter((t): t is string => typeof t === 'string' && !!TOPIC_BY_ID[t]);
    }
  } catch { /* defaults */ }
  const orders = ids.map((id) => TOPIC_BY_ID[id].order).sort((a, b) => a - b);
  let scope = 'your chosen topics';
  if (orders.length === 1) scope = `topic ${orders[0]}`;
  else if (orders.length > 1 && orders[orders.length - 1] - orders[0] === orders.length - 1) scope = `topics ${orders[0]} to ${orders[orders.length - 1]}`;
  else if (orders.length > 1) scope = `${orders.length} topics`;
  let resumable = false;
  try { resumable = readProgress('midsem', 'midsem') !== null; } catch { resumable = false; }
  return { count, minutes, scope, resumable };
}

const BACKUP_AFTER_ATTEMPTS = 10;
const BACKUP_MAX_AGE_MS = 7 * 86_400_000;

/** True when the student has done enough work to lose and has no recent export. */
export function needsBackup(events: readonly AppEvent[], settings: Settings, now = Date.now()) {
  let attempts = 0;
  for (const e of events) if (e.type === 'attempt') attempts++;
  return attempts >= BACKUP_AFTER_ATTEMPTS && (settings.lastExportTs === null || now - settings.lastExportTs > BACKUP_MAX_AGE_MS);
}
