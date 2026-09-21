// Shared engine types: grading results, the event log, settings and the props every format component receives.
import type { AstFlag, Diff, Format, MistakeId, TopicId } from '../content/ids.ts';
import type { GeneratedQuestion, Question } from '../content/schema.ts';

export type DetectionChannel = 'runtime' | 'static' | 'distractor' | 'test';

export interface GradeResult {
  correct: boolean;
  /** 0..1 before hint weighting. Partial credit allowed (multi, trace, twins, errorTranslator). */
  score: number;
  mistakes: { id: MistakeId; channel: DetectionChannel }[];
  /** Short plain-language feedback line shown in the result banner. */
  feedback?: string;
}

/** Which timed test produced a result. Legacy 'midsem' results are read back as 'practice-test'. */
export type TestKind = 'topic-test' | 'practice-test' | 'mock-exam';

/**
 * How a question was answered. 'exam' covers both timed tests on the exam page (a custom practice test
 * and a mock final paper); only 'practice' and 'paper' count toward a topic's unlock minimum.
 * Events written before the app was refocused on the final exam stored 'midsem'; the store maps those to 'exam'.
 */
/**
 * How a question was answered. 'review' is a session on the Review page: it measures and it feeds the
 * report, but it does not move the ladder, the same way a test does not — the topics are where progress
 * is made, and a review is for finding out what stuck.
 */
export type Mode = 'practice' | 'paper' | 'topic-test' | 'exam' | 'review' | 'placement';

/**
 * Modes where a question is measuring rather than teaching, so hints and answers stay shut: the two
 * timed tests, and the placement check, which would mean nothing if it could be looked up.
 */
export function hidesHelp(mode: Mode): boolean {
  return mode === 'topic-test' || mode === 'exam' || mode === 'placement';
}

// ---------- event log (append-only, stored in IndexedDB) ----------

interface EventBase { eid: string; v: 1; ts: number; sessionId: string }

export type AppEvent =
  | (EventBase & { type: 'session_start' })
  | (EventBase & { type: 'topic_open'; topicId: TopicId })
  | (EventBase & {
      type: 'attempt';
      qid: string; topicId: TopicId; format: Format; diff: Diff; mode: Mode;
      /** 1-based count of checks on this question in this visit. */
      checkNo: number;
      correct: boolean; score: number;
      /** score x hint multiplier; 0 if revealed. */
      credit: number;
      /** Highest hint tier viewed before this check: 0 none, 1-3 hints. */
      hintTier: 0 | 1 | 2 | 3;
      revealed: boolean;
      timeMs: number;
      mistakes: MistakeId[];
      /** Compact student response (option ids, typed output, code). Truncated to 4 KB. */
      response?: unknown;
      confidence?: Confidence;
      /** AST idiom/mistake flags from the checked code (code formats only). Feeds pattern cards. */
      flags?: AstFlag[];
    })
  | (EventBase & { type: 'hint'; qid: string; topicId: TopicId; tier: 1 | 2 | 3; dwellMs: number })
  | (EventBase & { type: 'reveal'; qid: string; topicId: TopicId })
  | (EventBase & { type: 'mistake'; qid: string | null; topicId: TopicId | null; mistake: MistakeId; channel: DetectionChannel })
  | (EventBase & { type: 'run'; qid: string | null; topicId: TopicId | null; ok: boolean; errorType?: string; timedOut: boolean; durationMs: number })
  | (EventBase & { type: 'self_explain'; qid: string; text: string })
  | (EventBase & { type: 'test_result'; kind: TestKind; topicIds: TopicId[]; score: number; total: number; passed: boolean; durationMs: number; qids: string[] })
  /** `lessonId` names the lesson read; `topicId` is set only for the 13 lessons that teach a topic. */
  | (EventBase & { type: 'lesson_done'; lessonId: string; topicId?: TopicId })
  | (EventBase & { type: 'override'; what: 'unlockAll'; value: boolean })
  /**
   * A placement check: topics up to `throughTopicId` are opened without climbing to them. Access only —
   * each one still has to be practised to its minimum to count as done.
   */
  | (EventBase & { type: 'placement'; throughTopicId: TopicId | null; asked: string[]; correct: number })
  | (EventBase & { type: 'flag'; qid: string; reason: 'wrong-answer' | 'unclear' | 'too-hard' | 'other'; note: string });

export type AppEventType = AppEvent['type'];
/** Event payload without the fields the store fills in. */
export type NewEvent = AppEvent extends infer E ? (E extends AppEvent ? Omit<E, 'eid' | 'v' | 'ts' | 'sessionId'> : never) : never;

// ---------- settings (localStorage) ----------

export type AccentId = 'mono' | 'blue-gold' | 'navy-coral' | 'ink-tangerine';
export const ACCENT_IDS: readonly AccentId[] = ['mono', 'blue-gold', 'navy-coral', 'ink-tangerine'];

/** What a student said about their own answer before checking it. */
export type Confidence = 'sure' | 'unsure';

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  /** Two-colour accent preset: primary buttons + progress/markers. */
  accent: AccentId;
  layout: 'simple' | 'full';
  editorFontSize: number;
  unlockAll: boolean;
  reducedMotion: 'system' | 'on' | 'off';
  singleKeyShortcuts: boolean;
  /** Ask "how sure are you?" before the first check on a question, and report how well it matched. */
  askConfidence: boolean;
  seenTour: boolean;
  lastExportTs: number | null;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system', accent: 'blue-gold', layout: 'full', editorFontSize: 14, unlockAll: false,
  reducedMotion: 'system', singleKeyShortcuts: true, askConfidence: true, seenTour: false, lastExportTs: null,
};

// ---------- format components ----------

/** Props every format component (src/ui/formats/**) receives from the question controller. */
export interface FormatProps<Q extends Question = Question> {
  q: Q;
  topicId: TopicId;
  /** Pre-generated answer data for read formats. May be undefined for code formats. */
  generated?: GeneratedQuestion;
  mode: Mode;
  /** Remaining checks for limited formats; Infinity for code formats. */
  checksLeft: number;
  /** True once the answer has been revealed; the component should show the correct answer inline and lock input. */
  revealed: boolean;
  /** True when the question has already been answered correctly in this visit; lock input. */
  locked: boolean;
  /** Called on every check/submit. The controller logs events, hints and credit. */
  onCheck: (result: GradeResult, response: unknown) => void;
  /** Persisted draft for this question (code or partial answer), restored on revisit. */
  draft: unknown;
  onDraft: (draft: unknown) => void;
}

/** Hint credit multipliers by tier viewed. */
export const HINT_MULTIPLIER = [1, 0.9, 0.75, 0.5] as const;

export type { Question };
