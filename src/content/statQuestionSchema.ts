// STAT2402 exam questions: the lesson quizzes, the practice test and the mock final all draw from these.
//
// Questions live in src/content/stat2402/questions/<lessonId>.ts, one file per lesson, default-exporting a
// StatQuestion[]. The same rule as the lessons governs them: nothing here states what R does. A question
// shows R code, and what R printed underneath it was recorded by the verifier; a "number" question's
// correct answer is an R expression the verifier evaluates, never a number typed by an author; a
// "predict" question's right choice is the one that matches R's real output. Authoring rules:
// docs/build/CONTENT.md "STAT2402 exam questions".
import type { Md, Test } from './schema.ts';

export type StatQuestionKind = 'choice' | 'number' | 'predict' | 'write';

export const STAT_QUESTION_KINDS: readonly StatQuestionKind[] = ['choice', 'number', 'predict', 'write'];

/** What each kind is called on screen. */
export const STAT_KIND_LABEL: Record<StatQuestionKind, string> = {
  choice: 'Read and choose',
  number: 'Work out a number',
  predict: 'What does R print?',
  write: 'Write R',
};

interface StatQuestionBase {
  /** Globally unique, kebab-case, e.g. "rir-slope-units". */
  id: string;
  /** The STAT2402 lesson this tests. */
  lessonId: string;
  /** The question itself. Md. */
  prompt: Md;
  /** How much it is worth relative to the others, 1 to 10. The mock final rescales to 100 marks. */
  marks: number;
  /** Shown once the test is marked: why the answer is what it is. Md; never an R-computed number. */
  explain: Md;
}

/**
 * Pick the one right answer. With `code`, the program and what R printed are shown above the options,
 * which is how "read the output and interpret it" is asked.
 */
export interface ChoiceQuestion extends StatQuestionBase {
  kind: 'choice';
  code?: string;
  /** 2 to 5 options, exactly one correct. */
  options: { text: string; correct?: boolean }[];
}

/**
 * Type a number. `code` and its output are shown; `answer` is an R expression, evaluated by the verifier in
 * the workspace the code left, whose value is the correct answer. Accepted within `tol` of it.
 */
export interface NumberQuestion extends StatQuestionBase {
  kind: 'number';
  code: string;
  answer: string;
  /** Absolute tolerance, e.g. 0.01 for "to two decimal places". */
  tol: number;
  /** Plain words after the box, e.g. "feet" or "%". */
  unit?: string;
}

/** Choose what the code prints. Exactly one choice must match R's real output. */
export interface PredictQuestion extends StatQuestionBase {
  kind: 'predict';
  code: string;
  /** 2 to 4, exactly one equal to what R prints (trailing spaces ignored). */
  choices: string[];
}

/** Write R, checked by R in the browser. Marks are shared out by the tests passed. */
export interface WriteQuestion extends StatQuestionBase {
  kind: 'write';
  run: 'function' | 'program';
  fnName?: string;
  starter: string;
  solution: string;
  /** At least 2, at least one visible. Read as R (see Test). */
  tests: Test[];
}

export type StatQuestion = ChoiceQuestion | NumberQuestion | PredictQuestion | WriteQuestion;

/** What the verifier recorded for one question. Written to src/content/generated/stat-questions.json. */
export interface GeneratedStatQuestion {
  /** What the question's code printed (choice with code, number, predict). */
  stdout?: string;
  error?: { type: string; message: string; line: number };
  /** number: the correct answer, as R computed it. */
  answer?: number;
}

export type GeneratedStatQuestions = Record<string, GeneratedStatQuestion>;
