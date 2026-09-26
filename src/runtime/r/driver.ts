// Runs R code through R's own console and records what it printed.
//
// Shared by the content verifier (webR in Node, scripts/verify/r.ts) and the browser (webR in a sandboxed
// iframe, src/runtime/rClient.ts). Both hand it an RConsole; everything about how a program is run, where
// an error begins and how a test is judged lives here and in harness.R, so a lesson's recorded output and
// a student's own run cannot drift apart.
//
// Why the console rather than evaluating code directly: the console is the only place R prints its own
// autoprint, "Warning message:" and "Error in f(x) :" reports. Recreating those formats in code would be
// the app deciding what R says, which is the one thing a lesson must never do.
import type { RPackage } from './packages.ts';
import { installOrder, packagesUsed, R_PACKAGES } from './packages.ts';

/** One message from webR's output queue. Only these three kinds are forwarded from the sandbox. */
export interface RMessage { type: 'stdout' | 'stderr' | 'prompt' | string; data: string }

export interface RConsole {
  /** Type text at the console. Must end with a newline. */
  write(text: string): void | Promise<void>;
  /** Every message up to and including the next prompt. */
  readUntilPrompt(): Promise<RMessage[]>;
  /** Evaluate R and return its value, which must be a single string. */
  evalString(code: string): Promise<string>;
  /** Put a file into R's filesystem, for a package about to be installed. */
  writeFile?(path: string, bytes: Uint8Array): Promise<void>;
}

export interface RDriverOptions {
  /**
   * The bytes of a pinned package file, already checked against its hash. Without one, code that asks
   * for a package gets R's own "there is no package called" error.
   */
  loadPackage?: (p: RPackage) => Promise<Uint8Array>;
}

export interface RError {
  /** Error: R stopped. SyntaxError: the code does not parse. */
  type: 'Error' | 'SyntaxError';
  /** Exactly what R printed, e.g. "Error in log(-1) : ...". */
  message: string;
  /** First line of the expression that failed, 1-based. */
  line: number;
}

export interface RRun { stdout: string; error?: RError; truncated?: boolean }

export interface RShellLine { source: string; stdout: string; error?: RError }

export interface RProbeRun extends RRun {
  values: Record<string, unknown>;
  probeErrors?: Record<string, string>;
}

/** The parts of a lesson Test an R task uses. Same field names as Python's, read as R. */
export interface RTest {
  id: string;
  label: string;
  hidden: boolean;
  call?: string;
  setup?: string;
  expect?: string;
  expectStdout?: string;
  cmp?: 'eq' | 'float' | 'unordered';
  tol?: number;
}

export interface RTestOutcome {
  id: string;
  pass: boolean;
  label: string;
  hidden: boolean;
  /** How R prints the value the call returned, and the value wanted. */
  got?: string;
  want?: string;
  /** Why the test could not be judged: the call itself stopped with this message. */
  error?: string;
}

export interface RTaskResult { run: RRun; outcomes: RTestOutcome[] }

/** The harness writes this line to stderr the moment an error is signalled. */
export const ERROR_MARK = '\u0001PLERR\u0001';
/** Past this many lines of output a run is cut short in what is kept, though R still finishes. */
export const MAX_LINES = 2000;

/** An R string literal holding `s` exactly. JSON's escapes are a subset R reads the same way. */
export function rString(s: string): string {
  return JSON.stringify(s);
}

interface Expr { src: string; line: number }
type Split = { ok: true; exprs: Expr[] } | { ok: false; message: string };

/** R's parser message, with the "<text>" it names a pasted string by turned into plain words. */
export function syntaxMessage(message: string): string {
  return `Error: ${message.replace(/^<text>:(\d+):(\d+):/, 'line $1, column $2:')}`;
}

/** What one expression printed, split at the error mark into ordinary output and R's error report. */
export function splitAtMark(lines: readonly string[]): { out: string[]; err: string[] | null } {
  const at = lines.indexOf(ERROR_MARK);
  if (at < 0) return { out: lines.slice(), err: null };
  return { out: lines.slice(0, at), err: lines.slice(at + 1) };
}

/** Lines as one block of text, ending in a newline when there is anything to show. */
function joinLines(lines: readonly string[]): string {
  return lines.length ? `${lines.join('\n')}\n` : '';
}

/** Normalise printed output for comparing with an expected value: line endings and trailing space. */
export function normOutput(text: string): string {
  return text.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
}

export class RDriver {
  private readonly con: RConsole;
  private ready: Promise<void> | null = null;
  private readonly harness: string;
  private readonly loadPackage: RDriverOptions['loadPackage'];
  /** Packages already unpacked into this R's library. They stay installed; attaching is per run. */
  private readonly installed = new Set<string>();

  constructor(con: RConsole, harnessSource: string, opts: RDriverOptions = {}) {
    this.con = con;
    this.harness = harnessSource;
    this.loadPackage = opts.loadPackage;
  }

  /**
   * Install every pinned package the code asks for (and what those need), once per R session. Returns
   * why one could not be installed, or null. Safe to call before every run: installed ones are skipped.
   */
  async preparePackages(...codes: readonly (string | undefined)[]): Promise<string | null> {
    await this.start();
    const wanted = installOrder(packagesUsed(...codes)).filter((p) => !this.installed.has(p.name));
    for (const p of wanted) {
      if (!this.loadPackage || !this.con.writeFile) return `${p.name} is not available here`;
      try {
        const bytes = await this.loadPackage(p);
        const path = `/tmp/${p.file}`;
        await this.con.writeFile(path, bytes);
        const res = await this.con.evalString(`.pl_install(${rString(path)})`);
        if (res !== 'ok') return `${p.name} could not be installed (${res})`;
        this.installed.add(p.name);
      } catch (err) {
        return `${p.name} could not be loaded (${(err as Error).message})`;
      }
    }
    return null;
  }

  /** Which pinned package exports `name`, if any. Installs them all to look, so it is for authoring checks. */
  async packageExporting(name: string): Promise<string | null> {
    const all = Object.keys(R_PACKAGES);
    if (await this.preparePackages(all.map((p) => `library(${p})`).join('\n'))) return null;
    const found = await this.con.evalString(`.pl_exporter(${rString(name)}, c(${all.map(rString).join(', ')}))`);
    return found || null;
  }

  /** A run that could not start because a package it needs would not install. */
  private static packageError(why: string): RRun {
    return { stdout: '', error: { type: 'Error', message: `Error: ${why}`, line: 0 } };
  }

  /** Load the harness and install the error mark. Safe to call more than once. */
  start(): Promise<void> {
    if (!this.ready) this.ready = this.boot();
    return this.ready;
  }

  private async boot(): Promise<void> {
    // The banner R prints on start-up, up to its first prompt.
    await this.con.readUntilPrompt();
    const loaded = await this.con.evalString(this.harness);
    if (loaded !== 'ready') throw new Error(`the R harness did not load (${loaded})`);
    // Global calling handlers can only be set with no handlers on the stack, which is exactly the
    // situation at the console's own top level and nowhere else.
    const { err } = await this.typeLine('globalCallingHandlers(error = .pl_mark)');
    if (err) throw new Error(`could not install the error mark: ${err.join('\n')}`);
  }

  /**
   * Type one complete expression at the console and collect what it printed. Continuation prompts
   * ("+ ") are R reading the later lines of the same expression; only "> " means it has finished.
   */
  private async typeLine(src: string): Promise<{ lines: string[]; err: string[] | null; truncated: boolean }> {
    await this.con.write(`${src}\n`);
    const lines: string[] = [];
    let truncated = false;
    for (;;) {
      const batch = await this.con.readUntilPrompt();
      let prompt: string | null = null;
      for (const m of batch) {
        if (m.type === 'stdout' || m.type === 'stderr') {
          if (lines.length < MAX_LINES || m.data === ERROR_MARK) lines.push(m.data);
          else truncated = true;
        } else if (m.type === 'prompt') {
          prompt = m.data;
        } else if (m.type === 'closed') {
          throw new Error('R stopped running');
        }
      }
      if (prompt === null || prompt === '> ') break;
      if (prompt === '+ ') continue;
      // Anything else is a function waiting for someone to type. There is nobody, so answer with an
      // empty line; the harness masks readline() and menu() so this is a last resort.
      await this.con.write('\n');
    }
    const { out, err } = splitAtMark(lines);
    return { lines: out, err, truncated };
  }

  private async split(code: string): Promise<Split> {
    return JSON.parse(await this.con.evalString(`.pl_split(${rString(code)})`)) as Split;
  }

  /** Clear the workspace, restore the options R started with and reseed the random numbers. */
  async reset(): Promise<void> {
    await this.start();
    await this.con.evalString('.pl_reset()');
  }

  /**
   * Run a program from a clean workspace, one top-level expression at a time, stopping at the first
   * error the way source() does. Leaves the workspace as the program left it, for probes and tests.
   */
  async runScript(code: string, alsoNeeds: readonly (string | undefined)[] = []): Promise<RRun> {
    const missing = await this.preparePackages(code, ...alsoNeeds);
    if (missing) return RDriver.packageError(missing);
    await this.reset();
    const split = await this.split(code);
    if (!split.ok) {
      const line = Number(/^<text>:(\d+):/.exec(split.message)?.[1] ?? 1);
      return { stdout: '', error: { type: 'SyntaxError', message: syntaxMessage(split.message), line } };
    }
    const out: string[] = [];
    let truncated = false;
    for (const expr of split.exprs) {
      const r = await this.typeLine(expr.src);
      // The cap is on the whole program, not each expression: a thousand small prints add up too.
      const room = MAX_LINES - out.length;
      out.push(...r.lines.slice(0, Math.max(0, room)));
      truncated ||= r.truncated || r.lines.length > room;
      if (r.err) {
        return { stdout: joinLines(out), error: { type: 'Error', message: r.err.join('\n'), line: expr.line }, ...(truncated ? { truncated } : {}) };
      }
    }
    return { stdout: joinLines(out), ...(truncated ? { truncated } : {}) };
  }

  /**
   * A console session: each line typed in turn into one workspace, each with what it printed. A line
   * that fails does not stop the session, exactly as at a real console.
   */
  async runShell(lines: readonly string[]): Promise<RShellLine[]> {
    const missing = await this.preparePackages(...lines);
    if (missing) {
      const err = RDriver.packageError(missing).error as RError;
      return lines.map((source, i) => ({ source, stdout: '', error: { ...err, line: i + 1 } }));
    }
    await this.reset();
    const out: RShellLine[] = [];
    for (const [i, source] of lines.entries()) {
      const split = await this.split(source);
      if (!split.ok) {
        out.push({ source, stdout: '', error: { type: 'SyntaxError', message: syntaxMessage(split.message), line: i + 1 } });
        continue;
      }
      const r = await this.typeLine(source);
      out.push({
        source,
        stdout: joinLines(r.lines),
        ...(r.err ? { error: { type: 'Error' as const, message: r.err.join('\n'), line: i + 1 } } : {}),
      });
    }
    return out;
  }

  /** Run a program, then evaluate expressions in the workspace it left, for a picture to draw from. */
  async probe(code: string, probes: Record<string, string>): Promise<RProbeRun> {
    const run = await this.runScript(code, Object.values(probes));
    const result: RProbeRun = { ...run, values: {} };
    if (run.error) return result;
    const errors: Record<string, string> = {};
    for (const [id, expr] of Object.entries(probes)) {
      const r = JSON.parse(await this.con.evalString(`.pl_probe(${rString(expr)})`)) as
        { ok: true; value: unknown } | { ok: false; message: string };
      if (r.ok) result.values[id] = r.value;
      else errors[id] = r.message;
    }
    if (Object.keys(errors).length) result.probeErrors = errors;
    return result;
  }

  /**
   * Check a task. The program runs once, and its output is what the student sees; each test then calls
   * into the workspace it left. A program that stops fails every test with R's own error.
   */
  async task(code: string, kind: 'function' | 'program', tests: readonly RTest[]): Promise<RTaskResult> {
    // The tests' own setup and expectations may use a package the student's code does not.
    const run = await this.runScript(code, tests.flatMap((t) => [t.setup, t.call, t.expect]));
    const outcomes: RTestOutcome[] = [];
    for (const t of tests) {
      const base = { id: t.id, label: t.label, hidden: t.hidden };
      if (run.error) {
        outcomes.push({ ...base, pass: false, error: run.error.message });
      } else if (kind === 'program' || t.call === undefined) {
        const want = t.expectStdout ?? '';
        outcomes.push({ ...base, pass: normOutput(run.stdout) === normOutput(want), got: run.stdout, want });
      } else {
        const cmp = t.cmp === 'float' ? 'float' : 'eq';
        const tol = typeof t.tol === 'number' && Number.isFinite(t.tol) && t.tol > 0 ? t.tol : 1e-6;
        const r = JSON.parse(await this.con.evalString(
          `.pl_test(${rString(t.setup ?? '')}, ${rString(t.call)}, ${rString(t.expect ?? 'NULL')}, ${rString(cmp)}, ${tol})`,
        )) as { pass: boolean; got?: string; want?: string; error?: string };
        outcomes.push({ ...base, pass: r.pass === true, ...(r.got !== undefined ? { got: r.got } : {}), ...(r.want !== undefined ? { want: r.want } : {}), ...(r.error ? { error: r.error } : {}) });
      }
    }
    return { run, outcomes };
  }
}
