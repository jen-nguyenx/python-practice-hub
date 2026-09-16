// Contract between the UI and the Python worker. Implemented by src/runtime/pyClient.ts and pyWorker.ts.
import type { Signal } from '@preact/signals';
import type { AstFlag, MistakeId, RuleId } from '../content/ids.ts';
import type { Test } from '../content/schema.ts';

export type RuntimeStatus =
  | { state: 'idle' }
  | { state: 'loading'; stage: string; elapsedMs: number }
  | { state: 'ready'; python: string }
  | { state: 'running'; python: string }
  | { state: 'restarting'; reason: string }
  | { state: 'error'; message: string };

export interface PyError {
  /** Exception class name, e.g. "KeyError", "SyntaxError", "TimeoutError" (our loop budget), "OutputLimit". */
  type: string;
  message: string;
  /** 1-based line in the student's code, when known. */
  line?: number;
  /** 1-based column range for SyntaxError. */
  col?: number;
  endCol?: number;
  /** Traceback text filtered to the student's frames. */
  traceback: string;
  /** Mistake ids matched from type + message (see engine/errorMatch). Filled by the client. */
  mistakes?: MistakeId[];
}

export interface VirtualFile { name: string; content: string }

export interface RunRequest {
  code: string;
  /** Lines for input(). If the program asks for more, result.needInput is set. */
  stdin?: string[];
  files?: VirtualFile[];
  /** Soft time budget for student code, default 2000 ms. */
  budgetMs?: number;
}

export interface RunResult {
  stdout: string;
  error?: PyError;
  timedOut: boolean;
  outputTruncated: boolean;
  /** Set when input() was called with no lines left; prompt is what the program printed as the prompt. */
  needInput?: { prompt: string };
  /** Contents of files after the run (so programs that write files can be checked). */
  filesAfter?: VirtualFile[];
  durationMs: number;
}

export interface AstFinding { flag: AstFlag; line: number }

export interface TestsRequest {
  code: string;
  tests: Test[];
  kind: 'function' | 'program' | 'project';
  fnName?: string;
  rules?: RuleId[];
  budgetMsPerTest?: number;
}

export interface TestOutcome {
  id: string;
  label: string;
  hidden: boolean;
  tag?: MistakeId;
  pass: boolean;
  /** repr of the returned value (function tests) */
  got?: string;
  expected?: string;
  stdout: string;
  error?: PyError;
  timedOut: boolean;
  /** true when a previous test timed out and the rest were skipped */
  notRun?: boolean;
  /** Mistakes inferred from this outcome: print_vs_return, forgot_to_call, return_type_wrong, mutated_input, tag on failure... */
  detections: MistakeId[];
}

export interface TestsResult {
  /** Code does not compile. No tests were run. */
  compileError?: PyError;
  /** Module-level code crashed, timed out or called input(). No tests were run. */
  topLevelError?: PyError;
  /** fnName was not defined. No tests were run. */
  missingFunction?: string;
  outcomes: TestOutcome[];
  flags: AstFinding[];
  ruleViolations: { rule: RuleId; line: number; message: string }[];
  passed: number;
  total: number;
}

export interface PairRequest { reference: string; buggy: string; fnName: string; argsRepr: string }
export interface PairResult {
  /** argsRepr parsed as a tuple literal. */
  validArgs: boolean;
  parseError?: string;
  differs: boolean;
  refResult: string;
  bugResult: string;
}

export interface PyClient {
  status: Signal<RuntimeStatus>;
  /** Start loading Pyodide (idempotent). */
  warmUp(): void;
  run(req: RunRequest): Promise<RunResult>;
  runTests(req: TestsRequest): Promise<TestsResult>;
  /** Parse only: syntax error position and AST flags. Fast. */
  analyze(code: string): Promise<{ syntaxError?: PyError; flags: AstFinding[] }>;
  pair(req: PairRequest): Promise<PairResult>;
  /** Kill and respawn the worker. */
  restart(reason: string): void;
}
