// Validation and sanitising for imported files and settings read from localStorage.
// Imported data is untrusted: every field is checked, unknown fields are dropped and strings are capped.
import { AST_FLAGS, DIFFS, FORMATS, MISTAKE_IDS, TOPIC_IDS } from '../content/ids.ts';
import type { AstFlag, MistakeId, TopicId } from '../content/ids.ts';
import { DEFAULT_SETTINGS, ACCENT_IDS } from '../engine/types.ts';
import type { AppEvent, DetectionChannel, Mode, Settings, TestKind } from '../engine/types.ts';
import type { ScratchFile, Snapshot } from './types.ts';

export class ImportError extends Error {}

const ID_MAX = 128;
const TEXT_MAX = 2000;
const RESPONSE_MAX = 8192;
const DRAFT_MAX = 256_000;
const CODE_MAX = 256_000;
const STDIN_MAX = 64_000;
const MAX_EVENTS = 500_000;

const TOPIC_SET = new Set<string>(TOPIC_IDS);
const MISTAKE_SET = new Set<string>(MISTAKE_IDS);
const FLAG_SET = new Set<string>(AST_FLAGS);
const FORMAT_SET = new Set<string>(FORMATS);
const DIFF_SET = new Set<string>(DIFFS);
const MODES = new Set<string>(['practice', 'paper', 'topic-test', 'exam'] satisfies Mode[]);
const TEST_KINDS = new Set<string>(['topic-test', 'practice-test', 'mock-exam'] satisfies TestKind[]);
/** Events stored before the app was refocused on the final exam used the old mid-semester names. */
const LEGACY_MODE: Record<string, Mode> = { midsem: 'exam' };
const LEGACY_TEST_KIND: Record<string, TestKind> = { midsem: 'practice-test' };
const CHANNELS = new Set<string>(['runtime', 'static', 'distractor', 'test'] satisfies DetectionChannel[]);
const FLAG_REASONS = new Set<string>(['wrong-answer', 'unclear', 'too-hard', 'other']);

type Rec = Record<string, unknown>;
const isRec = (x: unknown): x is Rec => typeof x === 'object' && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isBool = (x: unknown): x is boolean => typeof x === 'boolean';
const idStr = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= ID_MAX;
const nonNeg = (x: unknown): number | null => (isNum(x) && x >= 0 ? x : null);
const cap = (s: string, max: number) => (s.length > max ? s.slice(0, max) : s);
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** JSON round-trip with a size cap; returns undefined when not serialisable or too large. */
function jsonValue(x: unknown, max: number): unknown {
  if (x === undefined) return undefined;
  try {
    const s = JSON.stringify(x);
    if (s === undefined || s.length > max) return undefined;
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

function mistakeList(x: unknown): MistakeId[] {
  if (!Array.isArray(x)) return [];
  return [...new Set(x.filter((m): m is MistakeId => typeof m === 'string' && MISTAKE_SET.has(m)))].slice(0, 50);
}

function flagList(x: unknown): AstFlag[] {
  if (!Array.isArray(x)) return [];
  return [...new Set(x.filter((f): f is AstFlag => typeof f === 'string' && FLAG_SET.has(f)))];
}

const topic = (x: unknown): x is TopicId => typeof x === 'string' && TOPIC_SET.has(x);
const qidOrNull = (x: unknown): x is string | null => x === null || idStr(x);
const topicOrNull = (x: unknown): x is TopicId | null => x === null || topic(x);

/** Returns a clean event, or null when the event is not valid. */
export function sanitizeEvent(raw: unknown): AppEvent | null {
  if (!isRec(raw)) return null;
  const { eid, v, ts, sessionId, type } = raw;
  if (!idStr(eid) || v !== 1 || !isNum(ts) || ts <= 0 || !idStr(sessionId) || typeof type !== 'string') return null;
  const base = { eid, v: 1 as const, ts, sessionId };
  const r = raw;
  switch (type) {
    case 'session_start':
      return { ...base, type };
    case 'topic_open':
      return topic(r.topicId) ? { ...base, type, topicId: r.topicId } : null;
    case 'attempt': {
      if (!idStr(r.qid) || !topic(r.topicId) || typeof r.format !== 'string' || !FORMAT_SET.has(r.format)) return null;
      const mode = typeof r.mode === 'string' ? (LEGACY_MODE[r.mode] ?? (MODES.has(r.mode) ? (r.mode as Mode) : null)) : null;
      if (typeof r.diff !== 'string' || !DIFF_SET.has(r.diff) || mode === null) return null;
      if (!isBool(r.correct) || !isNum(r.score) || !isNum(r.credit) || !isBool(r.revealed)) return null;
      const hintTier = r.hintTier;
      if (hintTier !== 0 && hintTier !== 1 && hintTier !== 2 && hintTier !== 3) return null;
      const timeMs = nonNeg(r.timeMs);
      const checkNo = nonNeg(r.checkNo);
      if (timeMs === null || checkNo === null) return null;
      const ev: AppEvent = {
        ...base, type, qid: r.qid, topicId: r.topicId, format: r.format as (typeof FORMATS)[number], diff: r.diff as (typeof DIFFS)[number],
        mode, checkNo: Math.floor(checkNo), correct: r.correct, score: clamp01(r.score), credit: clamp01(r.credit),
        hintTier, revealed: r.revealed, timeMs, mistakes: mistakeList(r.mistakes),
      };
      const response = jsonValue(r.response, RESPONSE_MAX);
      if (response !== undefined) ev.response = response;
      if (r.confidence === 'sure' || r.confidence === 'unsure') ev.confidence = r.confidence;
      if (Array.isArray(r.flags)) ev.flags = flagList(r.flags);
      return ev;
    }
    case 'hint': {
      const dwellMs = nonNeg(r.dwellMs);
      if (!idStr(r.qid) || !topic(r.topicId) || (r.tier !== 1 && r.tier !== 2 && r.tier !== 3) || dwellMs === null) return null;
      return { ...base, type, qid: r.qid, topicId: r.topicId, tier: r.tier, dwellMs };
    }
    case 'reveal':
      return idStr(r.qid) && topic(r.topicId) ? { ...base, type, qid: r.qid, topicId: r.topicId } : null;
    case 'mistake':
      if (!qidOrNull(r.qid) || !topicOrNull(r.topicId) || typeof r.mistake !== 'string' || !MISTAKE_SET.has(r.mistake)) return null;
      if (typeof r.channel !== 'string' || !CHANNELS.has(r.channel)) return null;
      return { ...base, type, qid: r.qid, topicId: r.topicId, mistake: r.mistake as MistakeId, channel: r.channel as DetectionChannel };
    case 'run': {
      const durationMs = nonNeg(r.durationMs);
      if (!qidOrNull(r.qid) || !topicOrNull(r.topicId) || !isBool(r.ok) || !isBool(r.timedOut) || durationMs === null) return null;
      const ev: AppEvent = { ...base, type, qid: r.qid, topicId: r.topicId, ok: r.ok, timedOut: r.timedOut, durationMs };
      if (typeof r.errorType === 'string') ev.errorType = cap(r.errorType, 64);
      return ev;
    }
    case 'self_explain':
      return idStr(r.qid) && typeof r.text === 'string' ? { ...base, type, qid: r.qid, text: cap(r.text, TEXT_MAX) } : null;
    case 'test_result': {
      const durationMs = nonNeg(r.durationMs);
      const kind = typeof r.kind === 'string' ? (LEGACY_TEST_KIND[r.kind] ?? (TEST_KINDS.has(r.kind) ? (r.kind as TestKind) : null)) : null;
      if (kind === null || !Array.isArray(r.topicIds) || !isNum(r.score) || !isNum(r.total)) return null;
      if (!isBool(r.passed) || durationMs === null || !Array.isArray(r.qids)) return null;
      return {
        ...base, type, kind, topicIds: [...new Set(r.topicIds.filter(topic))], score: r.score, total: r.total, passed: r.passed,
        durationMs, qids: r.qids.filter(idStr).slice(0, 200),
      };
    }
    case 'override':
      return r.what === 'unlockAll' && isBool(r.value) ? { ...base, type, what: 'unlockAll', value: r.value } : null;
    case 'flag':
      if (!idStr(r.qid) || typeof r.reason !== 'string' || !FLAG_REASONS.has(r.reason) || typeof r.note !== 'string') return null;
      return { ...base, type, qid: r.qid, reason: r.reason as 'wrong-answer' | 'unclear' | 'too-hard' | 'other', note: cap(r.note, TEXT_MAX) };
    default:
      return null;
  }
}

/** Keeps only valid settings fields. */
export function sanitizeSettings(raw: unknown): Partial<Settings> {
  if (!isRec(raw)) return {};
  const out: Partial<Settings> = {};
  if (raw.theme === 'system' || raw.theme === 'light' || raw.theme === 'dark') out.theme = raw.theme;
  if (typeof raw.accent === 'string' && (ACCENT_IDS as readonly string[]).includes(raw.accent)) out.accent = raw.accent as Settings['accent'];
  if (raw.layout === 'simple' || raw.layout === 'full') out.layout = raw.layout;
  if (isNum(raw.editorFontSize) && raw.editorFontSize >= 8 && raw.editorFontSize <= 40) out.editorFontSize = Math.round(raw.editorFontSize);
  if (isBool(raw.unlockAll)) out.unlockAll = raw.unlockAll;
  if (raw.reducedMotion === 'system' || raw.reducedMotion === 'on' || raw.reducedMotion === 'off') out.reducedMotion = raw.reducedMotion;
  if (isBool(raw.singleKeyShortcuts)) out.singleKeyShortcuts = raw.singleKeyShortcuts;
  if (isBool(raw.seenTour)) out.seenTour = raw.seenTour;
  if (raw.lastExportTs === null || (isNum(raw.lastExportTs) && raw.lastExportTs > 0)) out.lastExportTs = raw.lastExportTs;
  return out;
}

export function settingsFrom(raw: unknown): Settings {
  return { ...DEFAULT_SETTINGS, ...sanitizeSettings(raw) };
}

function sanitizeSnapshot(raw: unknown): Snapshot | null {
  if (!isRec(raw) || !idStr(raw.qid) || !isNum(raw.updatedAt)) return null;
  const draft = raw.draft === undefined ? null : jsonValue(raw.draft, DRAFT_MAX);
  if (draft === undefined) return null;
  return { qid: raw.qid, draft, updatedAt: raw.updatedAt };
}

function sanitizeScratch(raw: unknown): ScratchFile | null {
  if (!isRec(raw) || !idStr(raw.id) || typeof raw.name !== 'string' || typeof raw.code !== 'string' || !isNum(raw.updatedAt)) return null;
  return {
    id: raw.id, name: cap(raw.name, 200), code: cap(raw.code, CODE_MAX),
    stdin: typeof raw.stdin === 'string' ? cap(raw.stdin, STDIN_MAX) : '', updatedAt: raw.updatedAt,
  };
}

export interface CleanImport {
  settings: Partial<Settings>;
  events: AppEvent[];
  snapshots: Snapshot[];
  scratch: ScratchFile[];
  /** Entries dropped because they were invalid. */
  skipped: number;
}

/** Validates an export file. Throws ImportError with a plain message when the file cannot be used at all. */
export function sanitizeExport(file: unknown): CleanImport {
  if (!isRec(file) || file.format !== 'pyladder-export') throw new ImportError('This file is not a PyLadder progress export.');
  if (file.version !== 1) throw new ImportError(`This export comes from a different PyLadder version (${String(file.version)}) and cannot be imported.`);
  if (!Array.isArray(file.events)) throw new ImportError('This export file is damaged: its list of activity is missing.');
  if (file.events.length > MAX_EVENTS) throw new ImportError('This export file is too large to import.');
  let skipped = 0;
  const seen = new Set<string>();
  const events: AppEvent[] = [];
  for (const raw of file.events) {
    const e = sanitizeEvent(raw);
    if (!e || seen.has(e.eid)) {
      skipped++;
      continue;
    }
    seen.add(e.eid);
    events.push(e);
  }
  const snapshots: Snapshot[] = [];
  for (const raw of Array.isArray(file.snapshots) ? file.snapshots : []) {
    const s = sanitizeSnapshot(raw);
    if (s) snapshots.push(s);
    else skipped++;
  }
  const scratch: ScratchFile[] = [];
  for (const raw of Array.isArray(file.scratch) ? file.scratch : []) {
    const s = sanitizeScratch(raw);
    if (s) scratch.push(s);
    else skipped++;
  }
  events.sort((a, b) => a.ts - b.ts);
  return { settings: sanitizeSettings(file.settings), events, snapshots, scratch, skipped };
}
