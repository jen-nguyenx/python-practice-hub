// Checks and generated data for the STAT2402 exam questions (src/content/stat2402/questions/<lessonId>.ts).
//
// The same contract as the lessons: nothing a student is told about R's output was typed by an author.
// What a question's code prints is recorded here; a number question's correct answer is evaluated here from
// the R expression the author wrote; a predict question's right choice is proved to be R's real output; a
// write question's answer is proved to pass its tests and its starter proved not to.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { GeneratedStatQuestion, GeneratedStatQuestions, StatQuestion } from '../../src/content/statQuestionSchema.ts';
import { STAT_QUESTION_KINDS } from '../../src/content/statQuestionSchema.ts';
import type { Test } from '../../src/content/schema.ts';
import type { RDriver } from '../../src/runtime/r/driver.ts';
import { normOutput } from '../../src/runtime/r/driver.ts';
import { stableR } from './lessons.ts';
import { PROJECT_ROOT } from './pyodide.ts';
import type { Issues, Scope } from './report.ts';
import { scope } from './report.ts';

export const STAT_QUESTIONS_DIR = join(PROJECT_ROOT, 'src', 'content', 'stat2402', 'questions');
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** A lesson quiz with fewer than this is too thin to tell a student anything. */
export const MIN_PER_LESSON = 6;

type Loose = Record<string, unknown>;
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const quote = (s: string) => JSON.stringify(s);

interface Loaded { file: string; lessonId: string; questions: StatQuestion[] }

async function loadAll(issues: Issues): Promise<Loaded[]> {
  let names: string[];
  try {
    names = readdirSync(STAT_QUESTIONS_DIR).filter((n) => n.endsWith('.ts')).sort();
  } catch {
    return [];
  }
  const out: Loaded[] = [];
  for (const name of names) {
    const file = join(STAT_QUESTIONS_DIR, name);
    const lessonId = name.replace(/\.ts$/, '');
    try {
      const mod = (await import(pathToFileURL(file).href)) as { default?: unknown };
      if (!Array.isArray(mod.default)) issues.error('stat-questions', lessonId, 'must default-export an array of questions');
      else out.push({ file, lessonId, questions: mod.default as StatQuestion[] });
    } catch (e) {
      issues.error('stat-questions', lessonId, `could not import: ${(e as Error).message}`);
    }
  }
  return out;
}

function checkTests(sc: Scope, where: string, run: unknown, tests: unknown[]): void {
  if (tests.length < 2) sc.error(`${where}: needs at least 2 tests`);
  if (!tests.some((t) => (t as Loose)?.hidden === false)) sc.error(`${where}: at least one test must be visible`);
  const ids = new Set<string>();
  for (const [i, raw] of tests.entries()) {
    const t = raw as Loose;
    if (!nonEmpty(t?.id)) sc.error(`${where}: test ${i + 1} has no id`);
    else if (ids.has(String(t.id))) sc.error(`${where}: duplicate test id ${quote(String(t.id))}`);
    else ids.add(String(t.id));
    if (!nonEmpty(t?.label)) sc.error(`${where}: test ${i + 1} has no label`);
    if (typeof t?.hidden !== 'boolean') sc.error(`${where}: test ${i + 1} must say whether it is hidden`);
    if (run === 'function' && (!nonEmpty(t?.call) || !nonEmpty(t?.expect))) sc.error(`${where}: test ${i + 1} needs a call and an expect`);
    for (const field of ['stdin', 'files', 'argsUnchanged', 'tag'] as const) {
      if (t?.[field] !== undefined) sc.error(`${where}: test ${i + 1} sets ${field}, which R does not support`);
    }
    if (t?.cmp === 'unordered') sc.error(`${where}: test ${i + 1} uses cmp "unordered", which R does not support`);
  }
}

function checkStatic(sc: Scope, q: StatQuestion, fileLesson: string, seen: Set<string>, lessonTracks: Map<string, string>): void {
  const l = q as unknown as Loose;
  const where = nonEmpty(l.id) ? String(l.id) : '(no id)';
  if (!nonEmpty(l.id) || !KEBAB.test(String(l.id))) sc.error(`${where}: id must be kebab-case`);
  else if (seen.has(q.id)) sc.error(`${where}: duplicate question id`);
  if (l.lessonId !== fileLesson) sc.error(`${where}: lessonId must be ${quote(fileLesson)}, the file it lives in`);
  if (!STAT_QUESTION_KINDS.includes(l.kind as StatQuestion['kind'])) sc.error(`${where}: kind must be one of ${STAT_QUESTION_KINDS.join(', ')}`);
  if (!nonEmpty(l.prompt)) sc.error(`${where}: the prompt is empty`);
  if (!nonEmpty(l.explain)) sc.error(`${where}: explain is empty; a marked answer with no reason teaches nothing`);
  if (typeof l.marks !== 'number' || !Number.isInteger(l.marks) || l.marks < 1 || l.marks > 10) sc.error(`${where}: marks must be a whole number from 1 to 10`);
  void lessonTracks;
  switch (q.kind) {
    case 'choice': {
      const options = arr(q.options) as Loose[];
      if (options.length < 2 || options.length > 5) sc.error(`${where}: needs 2 to 5 options`);
      const right = options.filter((o) => o?.correct === true).length;
      if (right !== 1) sc.error(`${where}: exactly one option must be correct (has ${right})`);
      const texts = options.map((o) => String(o?.text ?? ''));
      if (texts.some((t) => !t.trim())) sc.error(`${where}: an option has no text`);
      if (new Set(texts).size !== texts.length) sc.error(`${where}: two options are identical`);
      if (q.code !== undefined && !nonEmpty(q.code)) sc.error(`${where}: code is empty`);
      return;
    }
    case 'number':
      if (!nonEmpty(q.code)) sc.error(`${where}: a number question shows code; it has none`);
      if (!nonEmpty(q.answer)) sc.error(`${where}: answer must be an R expression for the correct value`);
      if (typeof q.tol !== 'number' || !Number.isFinite(q.tol) || q.tol <= 0) sc.error(`${where}: tol must be a positive number`);
      return;
    case 'predict': {
      if (!nonEmpty(q.code)) sc.error(`${where}: predict has no code`);
      const choices = arr(q.choices);
      if (choices.length < 2 || choices.length > 4) sc.error(`${where}: give 2 to 4 choices`);
      if (new Set(choices.map(String)).size !== choices.length) sc.error(`${where}: two choices are identical`);
      return;
    }
    case 'write':
      if (q.run !== 'function' && q.run !== 'program') sc.error(`${where}: run must be 'function' or 'program'`);
      if (q.run === 'function' && !nonEmpty(q.fnName)) sc.error(`${where}: a function question needs fnName`);
      if (!nonEmpty(q.starter)) sc.error(`${where}: no starter code`);
      if (!nonEmpty(q.solution)) sc.error(`${where}: no solution to check against`);
      checkTests(sc, where, q.run, arr(q.tests));
      return;
  }
}

/** A missing library() call, named rather than left to read as a lesson about an error. */
async function forgotLibrary(r: RDriver, sc: Scope, where: string, message: string | undefined): Promise<void> {
  const name = /could not find function "([^"]+)"/.exec(message ?? '')?.[1] ?? /object '([^']+)' not found/.exec(message ?? '')?.[1];
  if (!name) return;
  const pkg = await r.packageExporting(name);
  if (pkg) sc.error(`${where}: ${name} comes from ${pkg}, and every question starts with nothing attached; add library(${pkg})`);
}

async function runOne(r: RDriver, sc: Scope, q: StatQuestion): Promise<GeneratedStatQuestion | null> {
  const where = q.id;
  const err = (e: { type: string; message: string; line: number } | undefined) => (e ? { type: e.type, message: stableR(e.message), line: e.line } : undefined);
  switch (q.kind) {
    case 'choice': {
      if (!q.code) return null;
      const run = await r.runScript(q.code);
      if (run.error?.type === 'SyntaxError') sc.error(`${where}: the code is not valid R (${run.error.message})`);
      await forgotLibrary(r, sc, where, run.error?.message);
      if (!run.stdout.trim() && !run.error) sc.warn(`${where}: the code prints nothing, so there is no output to read`);
      return { stdout: stableR(run.stdout), ...(run.error ? { error: err(run.error) } : {}) };
    }
    case 'number': {
      const p = await r.probe(q.code, { answer: q.answer });
      if (p.error) {
        sc.error(`${where}: the code stops with an error (${p.error.message})`);
        await forgotLibrary(r, sc, where, p.error.message);
        return { stdout: stableR(p.stdout), error: err(p.error) };
      }
      const value = p.values.answer;
      if (p.probeErrors?.answer) sc.error(`${where}: answer does not evaluate (${p.probeErrors.answer})`);
      else if (typeof value !== 'number' || !Number.isFinite(value)) sc.error(`${where}: answer must evaluate to one finite number (got ${JSON.stringify(value)})`);
      return { stdout: stableR(p.stdout), ...(typeof value === 'number' ? { answer: value } : {}) };
    }
    case 'predict': {
      const run = await r.runScript(q.code);
      if (run.error) sc.error(`${where}: the code stops with an error (${run.error.message}), so there is nothing to predict`);
      else if (!run.stdout.trim()) sc.error(`${where}: the code prints nothing, so there is nothing to predict`);
      const real = normOutput(run.stdout);
      const hits = (q.choices ?? []).filter((c) => normOutput(String(c)) === real);
      if (!run.error && hits.length !== 1) {
        sc.error(`${where}: ${hits.length === 0 ? 'none' : hits.length} of the choices match what R prints (${quote(real)}); exactly one must`);
      }
      return { stdout: stableR(run.stdout) };
    }
    case 'write': {
      const tests = (q.tests ?? []) as Test[];
      const solved = await r.task(q.solution, q.run, tests);
      if (solved.run.error) sc.error(`${where}: the solution stops with an error (${solved.run.error.message})`);
      for (const o of solved.outcomes.filter((x) => !x.pass)) {
        sc.error(`${where}: the solution fails its own test ${quote(o.id)}${o.error ? ` (${o.error})` : ` (got ${quote(o.got ?? '')}, wanted ${quote(o.want ?? '')})`}`);
      }
      const start = await r.task(q.starter, q.run, tests);
      if (!start.run.error && start.outcomes.every((o) => o.pass)) sc.error(`${where}: the starter already passes every test`);
      return null;
    }
  }
}

export interface StatQuestionCheckResult { generated: GeneratedStatQuestions; count: number }

export async function checkStatQuestions(
  issues: Issues, lessonTracks: Map<string, string>, rDriver: (() => Promise<RDriver>) | null,
): Promise<StatQuestionCheckResult> {
  const loaded = await loadAll(issues);
  const generated: GeneratedStatQuestions = {};
  const seen = new Set<string>();
  const perLesson = new Map<string, StatQuestion[]>();
  let count = 0;

  for (const { lessonId, questions } of loaded) {
    const sc = scope(issues, 'stat-questions', lessonId);
    if (lessonTracks.get(lessonId) !== 'stat2402') {
      sc.error(`${lessonId}.ts is named for a lesson that is not in the STAT2402 track`);
    }
    for (const q of questions) {
      if (!q || typeof q !== 'object') { sc.error('a question is not an object'); continue; }
      checkStatic(sc, q, lessonId, seen, lessonTracks);
      if (nonEmpty(q.id)) seen.add(q.id);
      count++;
    }
    perLesson.set(lessonId, questions);
  }

  // Every lesson in the track has a quiz, and each quiz is worth sitting.
  for (const [id, track] of lessonTracks) {
    if (track !== 'stat2402') continue;
    const qs = perLesson.get(id) ?? [];
    const sc = scope(issues, 'stat-questions', id);
    if (qs.length === 0) sc.error(`the lesson ${id} has no exam questions; add src/content/stat2402/questions/${id}.ts`);
    else if (qs.length < MIN_PER_LESSON) sc.error(`only ${qs.length} questions; a lesson quiz needs at least ${MIN_PER_LESSON}`);
    else if (new Set(qs.map((q) => q.kind)).size < 3) sc.warn('uses fewer than three kinds of question; mix reading, numbers, predicting and writing');
  }

  if (rDriver) {
    const r = await rDriver();
    for (const { lessonId, questions } of loaded) {
      const sc = scope(issues, 'stat-questions', lessonId);
      for (const q of questions) {
        if (!q || !nonEmpty(q.id)) continue;
        try {
          const gen = await runOne(r, sc, q);
          if (gen) generated[q.id] = gen;
        } catch (e) {
          sc.error(`${q.id}: running it crashed (${(e as Error).message})`);
        }
      }
    }
  }
  return { generated, count };
}
