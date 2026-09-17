// In-progress test state kept in localStorage, so a reload or a discarded browser tab does not lose a timed test.
// Pure parse/serialise helpers plus small storage wrappers. Unit-tested in progress.test.ts.
import type { MistakeId } from '../../content/ids.ts';
import { MISTAKE_IDS } from '../../content/ids.ts';
import type { SavedAnswer, TestKind } from './summary.ts';

export interface TestProgress {
  v: 1;
  kind: TestKind;
  /** topic id for a topic test, "midsem" for the mid-sem test */
  key: string;
  title: string;
  qids: string[];
  durationMin: number;
  startedAt: number;
  savedAt: number;
  current: number;
  answers: [number, SavedAnswer][];
  flagged: number[];
  timeSpent: number[];
  drafts: [number, unknown][];
}

const PREFIX = 'pyladder:test-progress:';
/** Progress older than this is ignored (the test is long over and nobody is coming back to it). */
export const PROGRESS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function progressStorageKey(kind: TestKind, key: string): string {
  return `${PREFIX}${kind}:${key}`;
}

const isInt = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const MISTAKE_SET = new Set<string>(MISTAKE_IDS);

function parseAnswer(x: unknown): SavedAnswer | null {
  if (!x || typeof x !== 'object') return null;
  const a = x as { result?: unknown; response?: unknown; timeMs?: unknown };
  const r = a.result as { correct?: unknown; score?: unknown; mistakes?: unknown; feedback?: unknown } | undefined;
  if (!r || typeof r !== 'object' || typeof r.correct !== 'boolean' || !isNum(r.score) || !Array.isArray(r.mistakes)) return null;
  const mistakes = r.mistakes
    .filter((m): m is { id: MistakeId; channel: SavedAnswer['result']['mistakes'][number]['channel'] } =>
      !!m && typeof m === 'object' && MISTAKE_SET.has((m as { id?: string }).id ?? '') &&
      ['runtime', 'static', 'distractor', 'test'].includes((m as { channel?: string }).channel ?? ''))
    .map((m) => ({ id: m.id, channel: m.channel }));
  return {
    result: { correct: r.correct, score: r.score, mistakes, feedback: typeof r.feedback === 'string' ? r.feedback : undefined },
    response: a.response,
    timeMs: isNum(a.timeMs) ? Math.max(0, a.timeMs) : 0,
  };
}

/** Validate stored JSON. Returns null for anything malformed, for another kind/key, or when too old. */
export function parseProgress(raw: string | null, kind: TestKind, key: string, now: number): TestProgress | null {
  if (!raw) return null;
  let x: unknown;
  try { x = JSON.parse(raw); } catch { return null; }
  if (!x || typeof x !== 'object') return null;
  const p = x as Partial<TestProgress>;
  if (p.v !== 1 || p.kind !== kind || p.key !== key) return null;
  if (!Array.isArray(p.qids) || p.qids.length === 0 || !p.qids.every((q) => typeof q === 'string')) return null;
  const n = p.qids.length;
  if (!isNum(p.durationMin) || p.durationMin <= 0 || !isNum(p.startedAt) || !isNum(p.savedAt)) return null;
  if (now - p.savedAt > PROGRESS_MAX_AGE_MS || p.startedAt > now + 60_000) return null;
  const inRange = (i: unknown): i is number => isInt(i) && i >= 0 && i < n;
  const answers: [number, SavedAnswer][] = [];
  for (const entry of Array.isArray(p.answers) ? p.answers : []) {
    if (!Array.isArray(entry) || !inRange(entry[0])) continue;
    const a = parseAnswer(entry[1]);
    if (a) answers.push([entry[0], a]);
  }
  const timeSpent = Array.from({ length: n }, (_, i) => (Array.isArray(p.timeSpent) && isNum(p.timeSpent[i]) ? Math.max(0, p.timeSpent[i]) : 0));
  return {
    v: 1, kind, key, title: typeof p.title === 'string' ? p.title : '', qids: p.qids, durationMin: p.durationMin,
    startedAt: p.startedAt, savedAt: p.savedAt, current: inRange(p.current) ? p.current : 0,
    answers,
    flagged: (Array.isArray(p.flagged) ? p.flagged : []).filter(inRange),
    timeSpent,
    drafts: (Array.isArray(p.drafts) ? p.drafts : []).filter((d): d is [number, unknown] => Array.isArray(d) && inRange(d[0])),
  };
}

/** The entries for a saved test's questions, in order, or null if any question is no longer available. */
export function itemsForProgress<T extends { id: string }>(progress: Pick<TestProgress, 'qids'>, pool: readonly T[]): T[] | null {
  const byId = new Map(pool.map((p) => [p.id, p]));
  const items = progress.qids.map((id) => byId.get(id));
  return items.every((x): x is T => x !== undefined) ? items : null;
}

/** Milliseconds left on a saved test (0 when time is up). */
export function progressTimeLeft(p: Pick<TestProgress, 'startedAt' | 'durationMin'>, now: number): number {
  return Math.max(0, p.durationMin * 60_000 - (now - p.startedAt));
}

export function readProgress(kind: TestKind, key: string, now = Date.now()): TestProgress | null {
  try {
    return parseProgress(localStorage.getItem(progressStorageKey(kind, key)), kind, key, now);
  } catch {
    return null;
  }
}

/** Returns false when the browser refused to store it (private mode, quota). */
export function writeProgress(p: TestProgress): boolean {
  try {
    localStorage.setItem(progressStorageKey(p.kind, p.key), JSON.stringify(p));
    return true;
  } catch {
    // Drafts are the bulky part; try again without them so answers and flags survive.
    try {
      localStorage.setItem(progressStorageKey(p.kind, p.key), JSON.stringify({ ...p, drafts: [] }));
      return true;
    } catch {
      return false;
    }
  }
}

export function clearProgress(kind: TestKind, key: string): void {
  try { localStorage.removeItem(progressStorageKey(kind, key)); } catch { /* nothing stored */ }
}
