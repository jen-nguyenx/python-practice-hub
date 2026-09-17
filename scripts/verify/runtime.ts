// Checks that run content in real Python (Pyodide) and produce the generated data for read formats.
import type { PyError, TestsResult } from '../../src/runtime/protocol.ts';
import type {
  ClozeQuestion, ErrorTranslatorQuestion, FixBugQuestion, GeneratedQuestion, GeneratedTopic, ParsonsQuestion,
  PredictQuestion, Question, RefactorQuestion, Test, TestWriterQuestion, Topic, TraceQuestion, TwinsQuestion,
  WriteQuestion,
} from '../../src/content/schema.ts';
import type { RuleId } from '../../src/content/ids.ts';
import type { Harness, TimedTestsResult } from './pyodide.ts';
import type { Issues, Scope } from './report.ts';
import { scope } from './report.ts';
import { questionsOf, TESTED_FORMATS } from './static.ts';
import type { TopicInfo } from './static.ts';

export const TEST_BUDGET_MS = 1000;
const MAX_CLOZE_COMBOS = 64;
const MAX_TRACE_ROWS = 12;
const READ_FORMATS = new Set(['predict', 'trace', 'twins', 'errorTranslator']);

export interface RuntimeContext {
  /** Primary interpreter. Replaced automatically if Pyodide dies. */
  harness(): Promise<Harness>;
  /** Interpreter with a different PYTHONHASHSEED, for determinism checks. */
  second(): Promise<Harness>;
  /** Called when a harness call threw a fatal Pyodide error. */
  markDead(which: 'primary' | 'second'): void;
}

// ---------------- small helpers ----------------

const isStr = (v: unknown): v is string => typeof v === 'string';
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

export function normalizeStdout(s: string | undefined): string {
  const lines = (s ?? '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+$/, ''));
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

function short(s: string | undefined, n = 160): string {
  const q = JSON.stringify(s ?? '');
  return q.length > n ? `${q.slice(0, n - 4)}..."` : q;
}

export function describeError(e: PyError): string {
  const msg = e.message ? `: ${e.message}` : '';
  return `${e.type}${msg}${e.line ? ` (line ${e.line})` : ''}`;
}

function testFailures(res: TestsResult, tests: Test[]): string[] {
  if (res.compileError) return [`does not compile: ${describeError(res.compileError)}`];
  if (res.topLevelError) return [`crashes while the file loads, before any test runs: ${describeError(res.topLevelError)}`];
  if (res.missingFunction) return [`does not define ${res.missingFunction}()`];
  const out: string[] = [];
  for (const o of res.outcomes) {
    if (o.pass) continue;
    const t = tests.find((x) => x.id === o.id);
    const name = `test ${o.id} (${o.label})`;
    if (o.notRun) {
      out.push(`${name} did not run because an earlier test timed out`);
      continue;
    }
    const what = t?.call ? t.call : `program${t?.stdin?.length ? ` with stdin ${JSON.stringify(t.stdin)}` : ''}`;
    if (o.error) {
      if (o.error.type === 'TestError') out.push(`${name}: the test itself is broken: ${o.error.message}`);
      else if (o.timedOut) out.push(`${name}: ${what} timed out (${o.error.message}${o.error.line ? `, line ${o.error.line}` : ''})`);
      else out.push(`${name}: ${what} raised ${describeError(o.error)}`);
    } else if (t?.call) {
      let msg = `${name}: ${what} expected ${o.expected} but got ${o.got}`;
      if (o.detections.includes('mutated_input')) msg += ` and changed ${JSON.stringify(t.argsUnchanged)} (argsUnchanged)`;
      if (o.stdout) msg += `; it printed ${short(o.stdout, 80)}`;
      out.push(msg);
    } else {
      out.push(`${name}: expected stdout ${short(o.expected)} but got ${short(o.stdout)}`);
    }
  }
  return out;
}

function kindOf(q: Question): 'function' | 'program' | 'project' {
  if (q.format === 'write') return q.kind;
  const tests = (q as { tests?: Test[] }).tests ?? [];
  return tests.length > 0 && tests.every((t) => !t.call) ? 'program' : 'function';
}

function similarity(a: string, b: string): number {
  const s = a.trim();
  const t = b.trim();
  if (s === t) return 1;
  const m = s.length;
  const n = t.length;
  if (!m || !n) return 0;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return 1 - prev[n] / Math.max(m, n);
}

function changedLines(a: string, b: string): number {
  const x = a.replace(/\s+$/, '').split('\n').map((l) => l.replace(/\s+$/, ''));
  const y = b.replace(/\s+$/, '').split('\n').map((l) => l.replace(/\s+$/, ''));
  const dp: number[][] = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--) {
    for (let j = y.length - 1; j >= 0; j--) {
      dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return Math.max(x.length, y.length) - dp[0][0];
}

export function assembleParsons(lines: { text: string; indent: number }[]): string {
  return lines.map((l) => `${'    '.repeat(Math.max(0, l.indent))}${l.text}`).join('\n');
}

export function fillCloze(template: string, fills: Record<string, string>): string {
  return template.replace(/⟦([^⟧]*)⟧/g, (m, id: string) => (id in fills ? fills[id] : m));
}

export function clozeCombos(blanks: { id: string; accept: string[] }[], max = MAX_CLOZE_COMBOS): { combos: Record<string, string>[]; total: number } {
  const total = blanks.reduce((n, b) => n * Math.max(1, b.accept.length), 1);
  const combos: Record<string, string>[] = [];
  const seen = new Set<string>();
  const push = (c: Record<string, string>) => {
    const key = JSON.stringify(c);
    if (!seen.has(key) && combos.length < max) {
      seen.add(key);
      combos.push(c);
    }
  };
  const base = Object.fromEntries(blanks.map((b) => [b.id, b.accept[0] ?? '']));
  if (total > max) {
    push(base);
    for (const b of blanks) for (const a of b.accept) push({ ...base, [b.id]: a });
  }
  const walk = (i: number, acc: Record<string, string>) => {
    if (combos.length >= max) return;
    if (i === blanks.length) {
      push({ ...acc });
      return;
    }
    for (const a of blanks[i].accept) walk(i + 1, { ...acc, [blanks[i].id]: a });
  };
  walk(0, {});
  return { combos, total };
}

// ---------------- read formats ----------------

function withErrorLine(stdout: string, err: PyError | undefined): string {
  if (!err) return stdout;
  const sep = stdout && !stdout.endsWith('\n') ? '\n' : '';
  return `${stdout}${sep}${err.type}${err.message ? `: ${err.message}` : ''}\n`;
}

/** Compute generated data for a read-format question. Reports problems only when sc is given. */
function generateRead(q: Question, h: Harness, sc: Scope | null): GeneratedQuestion {
  switch (q.format) {
    case 'predict': {
      const pq = q as PredictQuestion;
      const run = h.runCapture(pq.code, pq.stdin ?? []);
      if (run.error && sc) sc.error(`code raises ${describeError(run.error)}; predict code must run without errors`);
      const gen: GeneratedQuestion = { stdout: run.stdout };
      if (sc) {
        const norm = normalizeStdout(run.stdout);
        const lines = norm ? norm.split('\n').length : 0;
        if (lines === 0) sc.warn('code prints nothing');
        if (lines > 8) sc.warn(`output has ${lines} lines; keep predict output to 8 lines or fewer`);
      }
      if (Array.isArray(pq.mutants) && pq.mutants.length > 0) {
        const outs: string[] = [];
        pq.mutants.forEach((m, i) => {
          const r = h.runCapture(m.code, pq.stdin ?? []);
          if (r.error && sc) sc.warn(`mutant ${i + 1} (${m.mistake}) raises ${describeError(r.error)}; its recorded output is only what it printed before the error`);
          outs.push(r.stdout);
          if (sc && normalizeStdout(r.stdout) === normalizeStdout(run.stdout)) {
            sc.error(`mutant ${i + 1} (${m.mistake}) prints the same output as the real code (${short(run.stdout, 80)}), so it can never match a wrong answer; change the mutant`);
          }
        });
        if (sc) {
          const norms = outs.map(normalizeStdout);
          norms.forEach((o, i) => {
            const j = norms.indexOf(o);
            if (j < i) sc.warn(`mutants ${j + 1} and ${i + 1} print the same output`);
          });
        }
        gen.mutantOutputs = outs;
      }
      return gen;
    }
    case 'trace': {
      const tq = q as TraceQuestion;
      const r = h.trace(tq.code, tq.watch ?? [], tq.anchorLine, []);
      if (sc) {
        if (r.error) sc.error(`code raises ${describeError(r.error)}; trace code must run without errors`);
        if (r.rows.length === 0) sc.error(`line ${tq.anchorLine} never runs, so the trace table has no rows (anchorLine should be the last line of the loop body)`);
        if (r.rows.length > MAX_TRACE_ROWS) sc.error(`the trace table has ${r.rows.length} rows; keep it to ${MAX_TRACE_ROWS} or fewer (3-6 loop passes)`);
        (tq.watch ?? []).forEach((name, i) => {
          if (r.rows.length > 0 && r.rows.every((row) => row[i] === '')) sc.warn(`watched name ${JSON.stringify(name)} never has a value at line ${tq.anchorLine}`);
        });
      }
      return { traceRows: r.rows };
    }
    case 'twins': {
      const wq = q as TwinsQuestion;
      const left = h.runCapture(wq.left, []);
      const right = h.runCapture(wq.right, []);
      if (sc) {
        if (left.error) sc.warn(`left snippet raises ${describeError(left.error)}; its output records the error line`);
        if (right.error) sc.warn(`right snippet raises ${describeError(right.error)}; its output records the error line`);
      }
      const outLeft = withErrorLine(left.stdout, left.error);
      const outRight = withErrorLine(right.stdout, right.error);
      const differs = normalizeStdout(outLeft) !== normalizeStdout(outRight);
      if (sc && !differs) sc.warn(`both snippets print the same output (${short(outLeft, 80)}); twins usually show a difference`);
      return { twins: { outLeft, outRight, differs } };
    }
    case 'errorTranslator': {
      const eq = q as ErrorTranslatorQuestion;
      const r = h.runCapture(eq.code, []);
      const gen: GeneratedQuestion = { stdout: r.stdout };
      if (!r.error) {
        if (sc) sc.error('code runs without raising an exception; errorTranslator code must crash');
        return gen;
      }
      if (r.error.type === 'TimeoutError') {
        if (sc) sc.error('code runs forever (timed out) instead of raising an exception');
        return gen;
      }
      if (!r.error.line) {
        if (sc) sc.error(`the ${r.error.type} is not raised on a line of the snippet, so there is no line to click`);
      }
      gen.error = { type: r.error.type, message: r.error.message, line: r.error.line ?? 0 };
      if (sc && Array.isArray(eq.exceptionOptions) && !eq.exceptionOptions.includes(r.error.type)) {
        sc.error(`the code raises ${r.error.type} but exceptionOptions ${JSON.stringify(eq.exceptionOptions)} does not include it`);
      }
      return gen;
    }
    default:
      return {};
  }
}

// ---------------- code formats ----------------

interface RunOpts { kind: 'function' | 'program' | 'project'; fnName?: string; rules?: RuleId[] }

function runTests(h: Harness, code: string, tests: Test[], o: RunOpts, timing = false): TimedTestsResult {
  return h.runTests(code, tests, o.kind, o.fnName, o.rules ?? [], TEST_BUDGET_MS, timing);
}

function reportSolution(sc: Scope, label: string, res: TimedTestsResult, tests: Test[], checkTiming: boolean): boolean {
  const fails = testFailures(res, tests);
  for (const f of fails) sc.error(`${label} ${f}`);
  if (checkTiming) {
    for (const o of res.outcomes) {
      const ms = o.durationMs ?? 0;
      if (ms > TEST_BUDGET_MS * 0.2) {
        sc.warn(`${label} took ${Math.round(ms)} ms on test ${o.id} (over 20% of the ${TEST_BUDGET_MS} ms budget); slower browsers may time out`);
      }
    }
  }
  return fails.length === 0;
}

function checkTestLiterals(h: Harness, sc: Scope, tests: Test[]): void {
  for (const t of tests) {
    if (!nonEmpty(t.call) || !nonEmpty(t.expect)) continue;
    const info = h.literalInfo(t.expect);
    if (!info.ok) {
      sc.error(`test ${t.id}: expect ${JSON.stringify(t.expect)} is not a Python literal (${info.error}); write the repr of the value, e.g. "(1, 'a')"`);
    } else if (info.hasFloat && t.cmp !== 'float' && t.cmp !== 'unordered') {
      sc.error(`test ${t.id}: expect ${t.expect} contains a float, so set cmp: 'float' (exact float comparison is fragile)`);
    }
  }
}

function breakingTuples(q: TestWriterQuestion, h: Harness): string[] {
  const out: string[] = [];
  const candidates: string[] = [];
  if (nonEmpty(q.solution?.code)) candidates.push(q.solution.code);
  for (const m of (q.solution?.explanation ?? '').matchAll(/`([^`\n]+)`/g)) candidates.push(m[1]);
  for (const c of candidates) {
    const info = h.literalInfo(c);
    if (info.ok && info.isTuple) out.push(c.trim());
  }
  return [...new Set(out)];
}

function checkCode(q: Question, h: Harness, sc: Scope): void {
  const tests: Test[] = Array.isArray((q as { tests?: Test[] }).tests) ? (q as { tests: Test[] }).tests : [];
  if (TESTED_FORMATS.includes(q.format)) checkTestLiterals(h, sc, tests);
  const fnName = (q as { fnName?: string }).fnName;
  const opts: RunOpts = { kind: kindOf(q), fnName: nonEmpty(fnName) ? fnName : undefined };
  const solutionCode = q.solution?.code;

  switch (q.format) {
    case 'cloze': {
      const cq = q as ClozeQuestion;
      if (!isStr(cq.template) || !Array.isArray(cq.blanks) || cq.blanks.some((b) => !Array.isArray(b?.accept) || b.accept.length === 0)) return;
      const { combos, total } = clozeCombos(cq.blanks);
      if (total > combos.length) sc.warn(`accept lists give ${total} combinations; only ${combos.length} were run (every accepted fill appears at least once)`);
      combos.forEach((fills, i) => {
        const code = fillCloze(cq.template, fills);
        const res = runTests(h, code, tests, opts, i === 0);
        const label = `template filled with ${JSON.stringify(fills)}`;
        reportSolution(sc, label, res, tests, i === 0);
      });
      if (nonEmpty(solutionCode) && opts.fnName && new RegExp(`def\\s+${opts.fnName}\\s*\\(`).test(solutionCode) && !solutionCode.includes('⟦')) {
        reportSolution(sc, 'solution.code', runTests(h, solutionCode, tests, opts), tests, false);
      }
      return;
    }
    case 'parsons': {
      const pq = q as ParsonsQuestion;
      if (!Array.isArray(pq.lines) || pq.lines.some((l) => !isStr(l?.text))) return;
      const assembled = assembleParsons(pq.lines);
      const ok = reportSolution(sc, 'the lines in order', runTests(h, assembled, tests, opts, true), tests, true);
      if (nonEmpty(solutionCode) && normalizeStdout(solutionCode) !== normalizeStdout(assembled)) {
        reportSolution(sc, 'solution.code', runTests(h, solutionCode, tests, opts), tests, false);
      }
      if (!ok) return;
      (pq.distractors ?? []).forEach((d, di) => {
        if (!isStr(d?.text)) return;
        let best = -1;
        let bestScore = -1;
        pq.lines.forEach((l, li) => {
          if (l.indent !== d.indent) return;
          const s = similarity(l.text, d.text);
          if (s > bestScore) {
            bestScore = s;
            best = li;
          }
        });
        if (best < 0) {
          sc.error(`distractor ${di + 1} ${JSON.stringify(d.text)} has indent ${d.indent} but no correct line has that indent`);
          return;
        }
        const swapped = pq.lines.map((l, li) => (li === best ? { text: d.text, indent: d.indent } : l));
        const res = runTests(h, assembleParsons(swapped), tests, opts);
        const failed = res.compileError || res.topLevelError || res.missingFunction || res.outcomes.some((o) => !o.pass);
        const swapDesc = `distractor ${di + 1} ${JSON.stringify(d.text)} (swapped for line ${best + 1} ${JSON.stringify(pq.lines[best].text)})`;
        if (!failed) {
          sc.error(`${swapDesc} still passes every test; add a test (tag ${d.mistake}) that catches it or change the distractor`);
        } else if (!res.compileError && !res.topLevelError && !res.missingFunction
          && !res.outcomes.some((o) => !o.pass && o.tag === d.mistake)) {
          sc.warn(`${swapDesc} fails tests, but none of the failing tests has tag ${d.mistake}`);
        }
      });
      return;
    }
    case 'fixBug': {
      const fq = q as FixBugQuestion;
      if (nonEmpty(solutionCode)) reportSolution(sc, 'solution', runTests(h, solutionCode, tests, opts, true), tests, true);
      if (!nonEmpty(fq.buggy)) return;
      const res = runTests(h, fq.buggy, tests, opts);
      const structural = res.compileError || res.topLevelError || res.missingFunction;
      const failing = res.outcomes.filter((o) => !o.pass);
      if (!structural && failing.length === 0) {
        sc.error('the buggy code passes every test, so there is nothing for students to fix; add a test that exposes the bug');
      } else if (!structural && !failing.some((o) => o.tag === fq.bugMistake)) {
        sc.warn(`buggy code fails ${failing.map((o) => o.id).join(', ')}, but none of those tests has tag ${fq.bugMistake} (bugMistake)`);
      }
      if (!structural && failing.length > 0 && failing.every((o) => o.hidden) && tests.some((t) => !t.hidden)) {
        // fine: hidden tests catch it; visible ones pass. Nothing to report.
      }
      if (nonEmpty(solutionCode) && typeof fq.maxChangedLines === 'number') {
        const n = changedLines(fq.buggy, solutionCode);
        if (n > fq.maxChangedLines) sc.warn(`solution.code changes ${n} lines of the buggy code but maxChangedLines is ${fq.maxChangedLines}`);
      }
      return;
    }
    case 'write': {
      const wq = q as WriteQuestion;
      const wopts: RunOpts = { ...opts, rules: wq.rules };
      if (nonEmpty(solutionCode)) {
        const res = runTests(h, solutionCode, tests, wopts, true);
        reportSolution(sc, 'solution', res, tests, true);
        for (const v of res.ruleViolations) sc.error(`solution breaks rule ${v.rule} at line ${v.line}: ${v.message}`);
      }
      if (nonEmpty(wq.starter)) {
        const an = h.analyze(wq.starter);
        if (an.syntaxError) sc.warn(`starter does not compile: ${describeError(an.syntaxError)}`);
        else {
          const st = runTests(h, wq.starter, tests, wopts);
          if (st.total > 0 && st.passed === st.total && !st.compileError && !st.topLevelError && !st.missingFunction) {
            sc.warn('the starter code already passes every test');
          }
        }
      }
      return;
    }
    case 'refactor': {
      const rq = q as RefactorQuestion;
      const mustRemove = Array.isArray(rq.mustRemove) ? rq.mustRemove : [];
      const mustAdd = Array.isArray(rq.mustAdd) ? rq.mustAdd : [];
      if (nonEmpty(rq.code)) {
        reportSolution(sc, 'original code', runTests(h, rq.code, tests, opts), tests, false);
        const flags = new Set(h.analyze(rq.code).flags.map((f) => f.flag));
        for (const f of mustRemove) {
          if (!flags.has(f)) sc.error(`original code does not trigger flag ${f}, so mustRemove can never be checked (flags found: ${[...flags].join(', ') || 'none'})`);
        }
        for (const f of mustAdd) if (flags.has(f)) sc.warn(`original code already has mustAdd flag ${f}`);
      }
      if (nonEmpty(solutionCode)) {
        reportSolution(sc, 'solution', runTests(h, solutionCode, tests, opts, true), tests, true);
        const found = h.analyze(solutionCode).flags;
        for (const f of mustRemove) {
          const hit = found.find((x) => x.flag === f);
          if (hit) sc.error(`solution still triggers mustRemove flag ${f} (line ${hit.line})`);
        }
        const names = new Set(found.map((x) => x.flag));
        for (const f of mustAdd) if (!names.has(f)) sc.error(`solution does not trigger mustAdd flag ${f}`);
      }
      return;
    }
    case 'testWriter': {
      const tq = q as TestWriterQuestion;
      if (!nonEmpty(tq.fnName) || !nonEmpty(tq.reference) || !nonEmpty(tq.buggy)) return;
      let argsOk = false;
      if (nonEmpty(tq.argsExample)) {
        const info = h.literalInfo(tq.argsExample);
        if (!info.ok) sc.error(`argsExample ${JSON.stringify(tq.argsExample)} is not a Python literal (${info.error})`);
        else if (!info.isTuple) sc.error(`argsExample must be a tuple such as "([1, 2, 3],)"; ${JSON.stringify(tq.argsExample)} is a ${info.typeName}`);
        else argsOk = true;
      }
      let implsOk = true;
      for (const [label, code] of [['reference', tq.reference], ['buggy', tq.buggy]] as const) {
        const d = h.defines(code, tq.fnName);
        if (d.compileError) {
          sc.error(`${label} does not compile: ${describeError(d.compileError)}`);
          implsOk = false;
        } else if (d.error) {
          sc.error(`${label} crashes while loading: ${describeError(d.error)}`);
          implsOk = false;
        } else if (!d.defined) {
          sc.error(`${label} does not define ${tq.fnName}()`);
          implsOk = false;
        }
      }
      if (!implsOk) return;
      if (argsOk) {
        const p = h.pair(tq.reference, tq.buggy, tq.fnName, tq.argsExample);
        if (p.differs) {
          sc.warn(`argsExample ${tq.argsExample} already exposes the bug (reference ${p.refResult}, buggy ${p.bugResult}); the placeholder should not give the answer away`);
        }
      }
      const tuples = breakingTuples(tq, h);
      if (tuples.length === 0) {
        sc.warn('put a breaking argument tuple in solution.code (e.g. "([],)") or in backticks in the explanation so the verifier can prove the bug is catchable');
      } else {
        const results = tuples.map((t) => ({ t, p: h.pair(tq.reference, tq.buggy, tq.fnName, t) }));
        if (!results.some((r) => r.p.differs)) {
          sc.error(`none of the example arguments ${results.map((r) => r.t).join(', ')} make the reference and buggy versions differ (reference ${results[0].p.refResult}, buggy ${results[0].p.bugResult})`);
        }
      }
      return;
    }
    default:
      return;
  }
}

// ---------------- concept order ----------------

const CONSTRUCT_ORDER: Record<string, { order: number; label: string }> = {
  for: { order: 3, label: 'a for loop' },
  while: { order: 7, label: 'a while loop' },
  dict: { order: 8, label: 'a dictionary' },
  open: { order: 9, label: 'open()' },
  try: { order: 10, label: 'try/except' },
  recursion: { order: 13, label: 'recursion' },
};

function checkConcepts(q: Question, h: Harness, sc: Scope, info: TopicInfo): void {
  const fields: [string, string | undefined][] = [];
  const lq = q as unknown as Record<string, unknown>;
  for (const key of ['code', 'left', 'right', 'buggy', 'reference', 'starter']) {
    if (nonEmpty(lq[key])) fields.push([key, lq[key] as string]);
  }
  if (nonEmpty(q.solution?.code)) fields.push(['solution.code', q.solution.code]);
  if (q.format === 'parsons' && Array.isArray(q.lines)) fields.push(['lines', assembleParsons(q.lines)]);
  if (q.format === 'cloze' && isStr(q.template) && Array.isArray(q.blanks)) {
    fields.push(['template', fillCloze(q.template, Object.fromEntries(q.blanks.map((b) => [b.id, b.accept?.[0] ?? 'x'])))]);
  }
  const reported = new Set<string>();
  for (const [field, code] of fields) {
    const c = h.constructs(code ?? '');
    if (!c.parsed) continue;
    for (const used of c.used) {
      const rule = CONSTRUCT_ORDER[used];
      if (rule && info.order < rule.order && !reported.has(used)) {
        reported.add(used);
        sc.warn(`${field} uses ${rule.label}, which is taught in topic ${String(rule.order).padStart(2, '0')}`);
      }
      if (used === 'import' && !reported.has('import')) {
        reported.add('import');
        sc.warn(`${field} uses import; CONTENT.md allows import only in questions about the no-import rule`);
      }
    }
    if (info.order < 4 && c.defs.length > 1 && !reported.has('def')) {
      reported.add('def');
      sc.warn(`${field} defines ${c.defs.length} functions; before topic 04 use at most one given def line`);
    }
  }
}

// ---------------- topic ----------------

function isFatal(e: unknown): boolean {
  const s = String((e as Error)?.message ?? e);
  return Boolean((e as { pyodide_fatal_error?: boolean })?.pyodide_fatal_error) || /fatal/i.test(s);
}

export async function checkTopicRuntime(issues: Issues, info: TopicInfo, topic: Topic, ctx: RuntimeContext): Promise<GeneratedTopic> {
  const generated: GeneratedTopic = {};
  for (const q of questionsOf(topic)) {
    if (!q || !nonEmpty(q.id) || !isStr(q.format)) continue;
    const sc = scope(issues, info.id, q.id, q.format);
    let h: Harness;
    try {
      h = await ctx.harness();
    } catch (e) {
      sc.error(`could not start Pyodide: ${(e as Error).message}`);
      return generated;
    }
    try {
      checkConcepts(q, h, sc, info);
      if (READ_FORMATS.has(q.format)) {
        const gen = generateRead(q, h, sc);
        generated[q.id] = gen;
        const h2 = await ctx.second();
        try {
          const gen2 = generateRead(q, h2, null);
          if (JSON.stringify(gen2) !== JSON.stringify(gen)) {
            sc.error(`output changes between runs with different PYTHONHASHSEED values (${short(JSON.stringify(gen), 120)} vs ${short(JSON.stringify(gen2), 120)}); do not print sets or rely on set order`);
          }
        } catch (e) {
          if (isFatal(e)) ctx.markDead('second');
          throw e;
        }
      } else {
        checkCode(q, h, sc);
      }
    } catch (e) {
      if (isFatal(e)) {
        ctx.markDead('primary');
        sc.error(`Python crashed hard while checking this question (usually very deep recursion): ${(e as Error).message?.split('\n')[0]}`);
      } else {
        sc.error(`verifier crashed on this question: ${(e as Error).stack ?? e}`);
      }
    }
  }
  return generated;
}
