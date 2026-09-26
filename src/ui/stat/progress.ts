// A STAT2402 test in progress, kept in this browser so a reload or a closed tab does not cost the answers.
// Per-viewer convenience, like a draft: the finished result goes to the event log; this is only the
// unfinished paper. Read back defensively -- storage can hold anything by the time it is read.
import type { StatAnswer, StatBank, StatItem, StatTestKind } from '../../engine/statExam.ts';

export interface StatProgress {
  v: 1;
  kind: StatTestKind;
  title: string;
  lessonIds: string[];
  qids: string[];
  /** Marks for each question in this paper (the mock final rescales them). */
  marks: number[];
  answers: (StatAnswer | null)[];
  flagged: number[];
  startedAt: number;
  minutes: number;
}

const PREFIX = 'pyladder:stat-test:';

const isAnswer = (a: unknown): a is StatAnswer => {
  if (!a || typeof a !== 'object') return false;
  const x = a as Record<string, unknown>;
  if ((x.kind === 'choice' || x.kind === 'predict') && typeof x.picked === 'string') return x.picked.length < 5000;
  if (x.kind === 'number' && typeof x.typed === 'string') return x.typed.length < 200;
  if (x.kind === 'write' && typeof x.code === 'string') return x.code.length < 50_000;
  return false;
};

export function readStatProgress(key: string): StatProgress | null {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFIX + key) ?? 'null') as Partial<StatProgress> | null;
    if (!raw || raw.v !== 1 || !Array.isArray(raw.qids) || !Array.isArray(raw.marks) || !Array.isArray(raw.answers)) return null;
    if (raw.qids.length !== raw.marks.length || raw.qids.length !== raw.answers.length || raw.qids.length > 60) return null;
    if (typeof raw.startedAt !== 'number' || typeof raw.minutes !== 'number' || typeof raw.title !== 'string') return null;
    if (raw.kind !== 'quiz' && raw.kind !== 'mock' && raw.kind !== 'practice') return null;
    return {
      v: 1, kind: raw.kind, title: raw.title.slice(0, 200),
      lessonIds: Array.isArray(raw.lessonIds) ? raw.lessonIds.filter((l): l is string => typeof l === 'string') : [],
      qids: raw.qids.map(String), marks: raw.marks.map((m) => (typeof m === 'number' && m >= 0 ? m : 0)),
      answers: raw.answers.map((a) => (isAnswer(a) ? a : null)),
      flagged: Array.isArray(raw.flagged) ? raw.flagged.filter((n): n is number => Number.isInteger(n)) : [],
      startedAt: raw.startedAt, minutes: raw.minutes,
    };
  } catch {
    return null;
  }
}

export function writeStatProgress(key: string, p: StatProgress): void {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(p)); } catch { /* storage full or blocked: the paper still runs */ }
}

export function clearStatProgress(key: string): void {
  try { localStorage.removeItem(PREFIX + key); } catch { /* ignore */ }
}

/** The paper's questions again, or null if any has since been removed from the bank. */
export function itemsFromProgress(bank: StatBank, p: StatProgress): StatItem[] | null {
  const byId = new Map(bank.questions.map((q) => [q.id, q]));
  const items: StatItem[] = [];
  for (const [i, id] of p.qids.entries()) {
    const q = byId.get(id);
    if (!q) return null;
    items.push({ q, gen: bank.generated[id], marks: p.marks[i] });
  }
  return items;
}

/** Milliseconds left on a saved paper; 0 or less means its time ran out while it was away. */
export function timeLeftMs(p: StatProgress, now = Date.now()): number {
  return p.startedAt + p.minutes * 60_000 - now;
}
