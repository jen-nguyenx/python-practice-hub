// STUB progress and unlock rules. Replaced by the engine-store agent. Keep signatures.
import type { TopicId } from '../content/ids.ts';
import type { QuestionMeta } from '../content/questionIndex.ts';
import type { AppEvent, Settings } from './types.ts';

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
  /** Plain sentence shown on a locked card, e.g. "Open Strings and solve 3 more questions there, including 1 coding question." */
  lockReason?: string;
  /** Plain sentence of what is left for this topic's own minimum, e.g. "2 more to solve, including 1 coding question". */
  remaining?: string;
}

export function questionStats(events: readonly AppEvent[]): Map<string, QuestionStats> { void events; return new Map(); }

/**
 * Unlock rule: topic 1 is always open. Topic N+1 unlocks when topic N has been opened AND its minimum is met
 * (or its topic test was passed), or settings.unlockAll is on.
 * completed = minimum met. in-progress = attempted > 0. open = unlocked with no attempts.
 */
export function topicProgressAll(events: readonly AppEvent[], index: readonly QuestionMeta[], settings: Settings): Record<TopicId, TopicProgress> {
  void events; void index; void settings;
  return {} as Record<TopicId, TopicProgress>;
}

export interface SessionSummary { sessionId: string; start: number; end: number; focusedMin: number; questions: number; correct: number; newMistakes: string[]; topics: TopicId[] }
export function sessionSummaries(events: readonly AppEvent[]): SessionSummary[] { void events; return []; }
export function currentSessionSummary(events: readonly AppEvent[], sessionId: string): SessionSummary | null { void events; void sessionId; return null; }

/** The question to resume: last attempted unsolved question, else first unsolved in the furthest in-progress topic. */
export function continueTarget(events: readonly AppEvent[], index: readonly QuestionMeta[], settings: Settings): { qid: string; topicId: TopicId } | null { void events; void index; void settings; return null; }
