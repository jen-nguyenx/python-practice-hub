// Question content schema. Content files under src/content/topics/** export a `Topic` built from these types.
// Rules for authors live in docs/build/CONTENT.md.
import type { AstFlag, Diff, ExamSlot, Format, MistakeId, PatternId, RuleId, TopicId } from './ids.ts';

/**
 * Markdown-lite string. Supported: paragraphs (blank line), `inline code`, **bold**, *italic*,
 * bullet lists ("- "), numbered lists ("1. "), and fenced ```python blocks. No raw HTML.
 */
export type Md = string;

export interface QuestionBase {
  /** Globally unique. Pattern: t{topicOrder 2 digits}-s{scenario}-q{n}, e.g. "t03-s2-q4". */
  id: string;
  format: Format;
  diff: Diff;
  /** Core questions are the recommended path. Any solved question (core or not) counts toward the topic minimum. */
  core: boolean;
  title: string;
  prompt: Md;
  /** Concept tags for filtering and reports, e.g. ["range", "accumulator"]. Free text, kebab-case. */
  concepts: string[];
  /** Mistakes this question can detect (via distractors, mutants, tagged tests or static checks). */
  detects: MistakeId[];
  /** Expected time to solve, in seconds. Easy <= 120, medium 120-360, hard 360-900. */
  expectedSec: number;
  /** Exactly three tiers: nudge (no code), plan (steps in words), partial code. */
  hints: [Md, Md, Md];
  /** Full answer. `code` is REQUIRED for every code format. `explanation` explains line by line. */
  solution: { code?: string; explanation: Md };
  /** One question shown after the answer is revealed, e.g. "Why does total start at 0?" */
  selfExplain?: string;
}

/**
 * One test of a coding question or a lesson task. The fields are described for Python; in a STAT2402 (R)
 * lesson the same fields are read as R: `call` and `expect` are R expressions, `setup` is R statements,
 * `cmp: 'float'` allows `tol` relative to the expected value (|got − want| ≤ tol·|want|), not absolute, and
 * `expect` is evaluated in a fresh environment of its own, so it cannot see what `setup` built
 * (docs/build/CONTENT.md "STAT2402 lessons (R)").
 */
export interface Test {
  id: string;
  /** Python expression evaluated after the student's code, e.g. "sum_of_squares(3)". Omit for program tests. */
  call?: string;
  /** Optional Python statements run before `call` (fresh each test), e.g. "data = [3, 1, 2]". */
  setup?: string;
  /** Python repr of the expected return value, e.g. "(29.5, 41.2, 36.27)". Required when `call` is set. */
  expect?: string;
  /** Expected stdout for program tests (compared after normalising line endings and trailing spaces). */
  expectStdout?: string;
  /** eq: exact (int 2 == float 2.0 allowed); float: tolerant floats (recursive); unordered: list as multiset. */
  cmp?: 'eq' | 'float' | 'unordered';
  /** Absolute tolerance for cmp:'float'. Default 1e-6. */
  tol?: number;
  /** Lines fed to input(), in order. */
  stdin?: string[];
  /** Virtual files written to the working directory before the test. */
  files?: { name: string; content: string }[];
  /** Names defined in `setup` that must be unchanged after the call (detects mutated_input). */
  argsUnchanged?: string[];
  /** Short human label, e.g. "empty list". Shown for hidden tests instead of the values. */
  label: string;
  hidden: boolean;
  /** The mistake this test is designed to expose. */
  tag?: MistakeId;
}

// ---------- read formats (graded from generated data; no Python needed in the browser) ----------

export interface McqOption { id: string; text: string; correct?: boolean; mistake?: MistakeId; why: Md }

export interface McqQuestion extends QuestionBase {
  format: 'mcq';
  code?: string;
  /** 2 options for true/false, otherwise 3-5. Exactly one has correct: true. Options may be code (rendered monospace if multi-line). */
  options: McqOption[];
}

export interface MultiQuestion extends QuestionBase {
  format: 'multi';
  code?: string;
  /** At least 2 correct. Wrong picks log `mistake`. */
  options: (McqOption & { correct: boolean })[];
}

export interface PredictQuestion extends QuestionBase {
  format: 'predict';
  code: string;
  stdin?: string[];
  /** Buggy-belief versions of the code. If the student's answer equals a mutant's output, its mistake is logged. */
  mutants?: { code: string; mistake: MistakeId }[];
  /** If true, the student chooses from the real output plus mutant outputs instead of typing. */
  choice?: boolean;
}

export interface TraceQuestion extends QuestionBase {
  format: 'trace';
  code: string;
  /** Variable names shown as columns, in order. */
  watch: string[];
  /** 1-based line number. One row is recorded each time this line finishes executing. */
  anchorLine: number;
}

export interface TwinsQuestion extends QuestionBase {
  format: 'twins';
  left: string;
  right: string;
  mistake: MistakeId;
}

export interface ErrorTranslatorQuestion extends QuestionBase {
  format: 'errorTranslator';
  /** Code that raises when run. The generated data records the real exception type, message and line. */
  code: string;
  /** 4 exception type names including the real one. */
  exceptionOptions: string[];
  causes: { id: string; text: Md; correct?: boolean; mistake?: MistakeId }[];
}

// ---------- code formats (graded by running tests in Pyodide) ----------

export interface ClozeQuestion extends QuestionBase {
  format: 'cloze';
  /** Code with blank markers ⟦1⟧, ⟦2⟧ ... Each marker appears exactly once. */
  template: string;
  blanks: { id: string; accept: string[] }[];
  fnName?: string;
  tests: Test[];
}

export interface ParsonsQuestion extends QuestionBase {
  format: 'parsons';
  /** Correct program in order. indent is the nesting level (0, 1, 2...). */
  lines: { text: string; indent: number }[];
  /** Plausible wrong lines. Using one logs its mistake. */
  distractors: { text: string; indent: number; mistake: MistakeId }[];
  /** If false, indentation is given and the student only orders lines. */
  indentMatters: boolean;
  fnName?: string;
  tests: Test[];
}

export interface FixBugQuestion extends QuestionBase {
  format: 'fixBug';
  buggy: string;
  bugMistake: MistakeId;
  maxChangedLines: number;
  fnName?: string;
  tests: Test[];
}

export interface WriteQuestion extends QuestionBase {
  format: 'write';
  /** function: tests call fnName. program: tests compare stdout. project: main(...) with virtual files and rules. */
  kind: 'function' | 'program' | 'project';
  fnName?: string;
  starter: string;
  tests: Test[];
  /** paper: plain editor, no Run, one Submit, marks shown. Used for exam-style practice. */
  mode?: 'practice' | 'paper';
  marks?: number;
  /** Which slot of a closed-book final paper this question can fill. Paper mode only. */
  examSlot?: ExamSlot;
  rules?: RuleId[];
}

export interface RefactorQuestion extends QuestionBase {
  format: 'refactor';
  code: string;
  fnName?: string;
  tests: Test[];
  mustRemove: AstFlag[];
  mustAdd?: AstFlag[];
  pattern: PatternId;
}

export interface TestWriterQuestion extends QuestionBase {
  format: 'testWriter';
  fnName: string;
  /** What the function is supposed to do. */
  spec: Md;
  reference: string;
  buggy: string;
  bugMistake: MistakeId;
  /** Example argument tuple shown as a placeholder, e.g. "([3, 1, 2],)". */
  argsExample: string;
}

export type Question =
  | McqQuestion | MultiQuestion | PredictQuestion | TraceQuestion | TwinsQuestion | ErrorTranslatorQuestion
  | ClozeQuestion | ParsonsQuestion | FixBugQuestion | WriteQuestion | RefactorQuestion | TestWriterQuestion;

export type QuestionOf<F extends Format> = Extract<Question, { format: F }>;

export interface Scenario {
  /** e.g. "t03-s2" */
  id: string;
  title: string;
  /** One or two sentences of story, Perth/UWA flavoured where natural. */
  story: Md;
  /** 3-5 questions, ordered read -> repair -> write where possible. */
  questions: Question[];
}

export interface Topic {
  id: TopicId;
  /** Cheat sheet: the syntax and rules for this topic, always readable even when locked. */
  cheatsheet: Md;
  workedExample: { title: string; code: string; steps: Md[] };
  commonMistakes: { mistake: MistakeId; bad: string; good: string; note: Md }[];
  scenarios: Scenario[];
  /** "What if" experiments: change one part of a program and see the output change. 0-4 per topic. */
  experiments?: Experiment[];
}

// ---------- "what if" experiments (no grading; every outcome is generated, never typed) ----------

export interface KnobBase {
  /** Marker name used in the template as ⟦id⟧. Kebab-case, unique within the experiment. */
  id: string;
  /** What this control changes, in plain words, e.g. "where the counting starts". */
  label: string;
}

/** A control offering a few written-out alternatives, shown as buttons. */
export interface ChoiceKnob extends KnobBase {
  kind?: 'choices';
  /**
   * 2-4 alternatives. `value` is substituted into the template verbatim, so it must be a single line
   * (a fragment at the start of a line carries its own indentation). `caption` is the plain-words
   * label on the button; the fragment itself is shown when there is none.
   */
  choices: { value: string; caption?: string }[];
}

/**
 * A control offering every whole number from `min` to `max`, shown as a slider. Dragging it redraws the
 * program, the output and the picture on every step, because every value was run ahead of time.
 */
export interface RangeKnob extends KnobBase {
  kind: 'range';
  min: number;
  max: number;
  /** Where the slider sits when the card opens. Defaults to `min`. */
  start?: number;
}

export type Knob = ChoiceKnob | RangeKnob;

/**
 * Python expressions evaluated after the program has run, in the namespace it left behind. Markers are
 * filled in the same way as the template, so a probe can follow the controls. This is what keeps a
 * picture honest: it is drawn from what Python really produced, not from a guess at Python's rules.
 */
export type Probes = Record<string, string>;

/**
 * An optional picture under the output, redrawn as the controls move.
 * - `sequence` draws one box per item with its index underneath, highlighting the picked positions:
 *   the shape of a slice or of what a loop visited.
 * - `numberline` draws the whole numbers from `min` to `max` and marks the ones produced.
 * Each field below names a probe id.
 */
export type Visual =
  | { kind: 'sequence'; items: string; picked?: string; caption?: Md }
  | {
      kind: 'numberline'; min: number; max: number; picked: string; caption?: Md;
      /** Probe returning one number to ring as "you are here", for a control that moves along the line. */
      at?: string;
    }
  /**
   * A bar per number, for anything with a size: a list's values, counts from a dictionary, a running
   * total growing pass by pass. `values` names a probe returning numbers; `labels` names one returning
   * the same number of strings.
   */
  | { kind: 'bars'; values: string; labels?: string; caption?: Md; max?: number }
  /**
   * One or more curves, for anything where the shape is the lesson: how a cost grows with n, how a series
   * closes on its limit. Each series names a probe returning a list of [x, y] pairs.
   */
  /**
   * The chart a trading screen actually shows: one bar per period, running from the low to the high,
   * with a tick left for the open and right for the close. A filled body means the close was below the
   * open. `bars` names a probe returning [open, high, low, close] for each period, oldest first.
   */
  | { kind: 'candles'; bars: string; labels?: string; xLabel?: string; yLabel?: string; caption?: Md }
  | {
      kind: 'plot'; series: { probe: string; label: string }[]; xLabel?: string; yLabel?: string; caption?: Md;
      /**
       * Probe returning a list of [x, y] pairs to draw as dots on the curves: "you are here". This is what
       * lets a control that picks a point still move the picture, rather than leaving a static shape.
       */
      marker?: string;
      /**
       * Probe returning a list of [x, y] pairs drawn as small plain dots beneath the curves: the data a
       * fitted line runs through. One colour for all of them, unlike `marker`, whose dots each take their
       * series' colour -- fifty observations in rotating colours would look like fifty groups.
       */
      points?: string;
    };

export interface Experiment {
  /** e.g. "t03-x1". */
  id: string;
  title: string;
  /** One or two sentences: what to change and what to watch. */
  intro: Md;
  /** Program with each knob's marker ⟦id⟧ appearing exactly once. */
  template: string;
  /** 1-3 knobs. Every combination is run by the verifier. */
  knobs: Knob[];
  /** Optional variable table: these names are snapshotted each time `anchorLine` finishes. */
  watch?: string[];
  /** 1-based line of the template. Required when `watch` is set. */
  anchorLine?: number;
  /** Optional plain-words note for one combination, keyed by choice indexes joined with "-", e.g. "1-0". */
  notes?: Record<string, Md>;
  /** Expressions the verifier evaluates after each run, for the picture to draw from. */
  probes?: Probes;
  /** An optional picture under the output, redrawn as the controls move. */
  visual?: Visual;
  /**
   * Hide the program and show only the controls, the picture and the numbers.
   *
   * For a card where the code is the engine rather than the subject. A lesson on the economics of a
   * cargo is not teaching `for` loops, and putting a program beside the answer tells the reader the
   * program is the point. The verifier still runs it, so the numbers are as honest either way.
   */
  hideProgram?: boolean;
  /** What to call the output when the program is hidden. Defaults to "The numbers". */
  outputLabel?: string;
  /** The point of the experiment. Always visible under the output. */
  takeaway: Md;
}

// ---------- generated data (written by scripts/verify-content.ts, never hand-edited) ----------

export interface GeneratedQuestion {
  /** predict: real stdout. errorTranslator: stdout before the crash. */
  stdout?: string;
  /** predict: stdout of each mutant, same order as `mutants`. */
  mutantOutputs?: string[];
  /** trace: one row per anchor-line execution, values as Python repr strings, same order as `watch`. */
  traceRows?: string[][];
  /** errorTranslator: the real exception. */
  error?: { type: string; message: string; line: number };
  /** twins: outputs of both snippets. */
  twins?: { outLeft: string; outRight: string; differs: boolean };
}
export type GeneratedTopic = Record<string, GeneratedQuestion>;

/** One run of an experiment: what that combination of choices really did. */
export interface GeneratedRun {
  stdout: string;
  /** Set when that combination raises. Experiments may crash on purpose; that is often the lesson. */
  error?: { type: string; message: string; line: number };
  /** Present when the experiment sets `watch`: one row per anchor-line execution, as Python reprs. */
  rows?: string[][];
  /** Present when the experiment sets `probes`: what each expression evaluated to, by probe id. */
  values?: Record<string, unknown>;
}
export interface GeneratedExperiment {
  /**
   * Probe values that come out the same for every combination (the letters of the word a slice cuts up,
   * say). Stored once here instead of repeated in every run, and merged under a run's own values.
   */
  shared?: Record<string, unknown>;
  /** Combination key (choice indexes joined with "-") -> what happened. */
  runs: Record<string, GeneratedRun>;
}
/** Experiment id -> its runs. Written to src/content/generated/experiments/<topic>.json. */
export type GeneratedExperiments = Record<string, GeneratedExperiment>;
