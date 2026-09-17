// Question content schema. Content files under src/content/topics/** export a `Topic` built from these types.
// Rules for authors live in docs/build/CONTENT.md.
import type { AstFlag, Diff, Format, MistakeId, PatternId, RuleId, TopicId } from './ids.ts';

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
