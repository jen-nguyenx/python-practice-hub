// Node loader for the Python grading package. Used by the verifier and by src/runtime/__tests__/harness.test.ts.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPyodide } from 'pyodide';
import type { PyodideAPI } from 'pyodide';
import { PY_ENTRY, PY_MODULES, PY_PACKAGE, PY_ROOT, PY_VERIFY_ENTRY } from '../../src/runtime/python/manifest.ts';
import type { AstFinding, PairResult, PyError, RunResult, TestsResult, VirtualFile } from '../../src/runtime/protocol.ts';
import type { RuleId } from '../../src/content/ids.ts';
import type { Test } from '../../src/content/schema.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = resolve(HERE, '..', '..');
export const PY_DIR = join(PROJECT_ROOT, 'src', 'runtime', 'python');

export interface TraceResult { rows: string[][]; stdout: string; error?: PyError }
export interface CaptureResult { stdout: string; error?: PyError; timedOut?: boolean }
export interface ReplLine { source: string; stdout: string; value?: string; error?: PyError }
export interface ReplResult { lines: ReplLine[] }
export interface WalkStep {
  line: number;
  vars: Record<string, string>;
  /** Element reprs for any list or tuple, so it can be drawn as boxes. */
  items?: Record<string, string[]>;
  out: number;
}
export interface WalkResult { steps: WalkStep[]; stdout: string; error?: PyError; overflow?: boolean }
export interface ProbeResult { stdout: string; values: Record<string, unknown>; error?: PyError; timedOut?: boolean; probeErrors?: Record<string, string> }
export interface LiteralInfo { ok: boolean; error?: string; hasFloat: boolean; isTuple: boolean; typeName: string }
export interface DefinesResult { defined: boolean; compileError?: PyError; error?: PyError }
export interface ConstructsResult { parsed: boolean; used: string[]; defs: string[] }
export type TimedTestsResult = TestsResult & { outcomes: (TestsResult['outcomes'][number] & { durationMs?: number })[] };

export interface Harness {
  py: PyodideAPI;
  runProgram(code: string, stdin?: string[], files?: VirtualFile[], budgetMs?: number): RunResult;
  runTests(
    code: string, tests: Test[], kind: 'function' | 'program' | 'project', fnName?: string, rules?: RuleId[],
    budgetMsPerTest?: number, timing?: boolean,
  ): TimedTestsResult;
  analyze(code: string): { syntaxError?: PyError; flags: AstFinding[] };
  pair(reference: string, buggy: string, fnName: string, argsRepr: string): PairResult;
  trace(code: string, watch: string[], anchorLine: number, stdin?: string[]): TraceResult;
  runCapture(code: string, stdin?: string[]): CaptureResult;
  /** Run the code, then evaluate each expression in the namespace it left behind. */
  probe(code: string, probes: Record<string, string>): ProbeResult;
  /** Run lines as a shell session, recording each line's value or output. */
  repl(lines: readonly string[], stdin?: readonly string[]): ReplResult;
  /** Record the state after every line, for a step-through walkthrough. */
  walk(code: string, watch?: readonly string[]): WalkResult;
  literalInfo(expr: string): LiteralInfo;
  defines(code: string, fnName: string): DefinesResult;
  constructs(code: string): ConstructsResult;
}

type PyFn = (...args: unknown[]) => string;

/** Load Pyodide, write the _pl package from src/runtime/python and import the harness. */
export async function createHarness(opts: { hashSeed?: string } = {}): Promise<Harness> {
  const env: Record<string, string> = { HOME: '/home/pyodide' };
  if (opts.hashSeed !== undefined) env.PYTHONHASHSEED = opts.hashSeed;
  const py = await loadPyodide({ env, stdout: () => {}, stderr: () => {} });
  const pkgDir = `${PY_ROOT}/${PY_PACKAGE}`;
  py.FS.mkdirTree(pkgDir);
  for (const name of PY_MODULES) {
    py.FS.writeFile(`${pkgDir}/${name}`, readFileSync(join(PY_DIR, name), 'utf8'));
  }
  py.runPython(`import sys\nif ${JSON.stringify(PY_ROOT)} not in sys.path:\n    sys.path.insert(0, ${JSON.stringify(PY_ROOT)})`);
  const mod = py.pyimport(PY_ENTRY) as unknown as Record<string, PyFn>;
  // probe() and repl() live in a module the browser never loads, so they are imported separately here.
  const verifyMod = py.pyimport(PY_VERIFY_ENTRY) as unknown as Record<string, PyFn>;
  const fnFrom = (where: Record<string, PyFn>, label: string) => (name: string): PyFn => {
    const f = where[name];
    if (typeof f !== 'function') throw new Error(`${label}.${name} is missing`);
    return f;
  };
  const fn = fnFrom(mod, 'harness');
  const vfn = fnFrom(verifyMod, 'verify');
  const call = <T>(name: string, ...args: unknown[]): T => JSON.parse(fn(name)(...args)) as T;
  const vcall = <T>(name: string, ...args: unknown[]): T => JSON.parse(vfn(name)(...args)) as T;
  const j = (v: unknown) => JSON.stringify(v ?? null);
  return {
    py,
    runProgram: (code, stdin = [], files = [], budgetMs = 2000) => call('run_program', code, j(stdin), j(files), budgetMs),
    runTests: (code, tests, kind, fnName, rules = [], budgetMsPerTest = 1000, timing = false) =>
      // undefined, not null: JS null reaches Python as pyodide.ffi.jsnull instead of None.
      call('run_tests', code, j(tests), kind, fnName ?? undefined, j(rules), budgetMsPerTest, timing),
    analyze: (code) => call('analyze', code),
    pair: (reference, buggy, fnName, argsRepr) => call('pair', reference, buggy, fnName, argsRepr),
    trace: (code, watch, anchorLine, stdin = []) => call('trace', code, j(watch), anchorLine, j(stdin)),
    runCapture: (code, stdin = []) => call('run_capture', code, j(stdin)),
    probe: (code, probes) => vcall('probe', code, j(probes)),
    repl: (lines, stdin = []) => vcall('repl', j(lines), j(stdin)),
    walk: (code, watch = []) => vcall('walk', code, j(watch)),
    literalInfo: (expr) => call('literal_info', expr),
    defines: (code, fnName) => call('defines', code, fnName),
    constructs: (code) => call('constructs', code),
  };
}
