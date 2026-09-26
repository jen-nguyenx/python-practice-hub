// Checks and generated data for lessons.
//
// The contract: a lesson never states what the language does. Every output a student reads is produced
// here by running the code -- in Pyodide for the Python tracks, in webR for STAT2402 -- so a lesson cannot
// drift away from the language, and an author cannot type an output that is subtly wrong. A block that
// raises on purpose is allowed; one that fails to compile is not.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { TOPIC_BY_ID } from '../../src/content/topics.ts';
import { MISTAKE_IDS } from '../../src/content/ids.ts';
import { blockKey, TRACK_LANG, TRACKS } from '../../src/content/lessonSchema.ts';
import type { GeneratedBlock, GeneratedLesson, Lang, Lesson, LessonBlock } from '../../src/content/lessonSchema.ts';
import type { Experiment, Test, Topic } from '../../src/content/schema.ts';
import { allCombos, fillTemplate } from '../../src/content/experiments.ts';
import type { RDriver, RError } from '../../src/runtime/r/driver.ts';
import { normOutput } from '../../src/runtime/r/driver.ts';
import { checkOneExperiment, stable } from './experiments.ts';
import { PROJECT_ROOT } from './pyodide.ts';
import type { CaptureResult, Harness, ProbeResult } from './pyodide.ts';
import type { Issues, Scope } from './report.ts';
import { plural, scope } from './report.ts';

const LESSONS_DIR = join(PROJECT_ROOT, 'src', 'content', 'lessons');
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MISTAKE_SET = new Set<string>(MISTAKE_IDS);
const TRACK_SET = new Set<string>(TRACKS);
/** Longer than this and a section stops being a step and becomes a chapter. */
const MAX_BLOCKS = 40;

type Loose = Record<string, unknown>;
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const quote = (s: string) => JSON.stringify(s);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

/**
 * Two fields are rendered as plain text and cannot carry marks: the lesson title, which also becomes a
 * breadcrumb and a browser tab, and the small uppercase steps label. Everywhere else inline Md works.
 */
function plainText(sc: Scope, value: unknown, where: string): void {
  if (typeof value === 'string' && value.includes('`')) {
    sc.error(`${where} is rendered as plain text, so the backticks in ${quote(value)} would show literally; remove them`);
  }
}

export interface LoadedLesson { file: string; lesson: Lesson }

/** Every lesson file: src/content/lessons/<track>/<id>.ts, excluding index.ts. */
export function lessonFiles(): string[] {
  const out: string[] = [];
  let tracks: string[];
  try {
    tracks = readdirSync(LESSONS_DIR);
  } catch {
    return out;
  }
  for (const track of tracks) {
    const dir = join(LESSONS_DIR, track);
    let stat;
    try { stat = statSync(dir); } catch { continue; }
    if (!stat.isDirectory()) continue;
    for (const name of readdirSync(dir)) {
      if (name.endsWith('.ts') && name !== 'index.ts') out.push(join(dir, name));
    }
  }
  return out.sort();
}

export async function loadLessons(issues: Issues): Promise<LoadedLesson[]> {
  const out: LoadedLesson[] = [];
  for (const file of lessonFiles()) {
    const rel = file.replace(PROJECT_ROOT + '/', '');
    try {
      const mod = (await import(pathToFileURL(file).href)) as { default?: Lesson };
      if (!mod.default) issues.error('lessons', rel, 'has no default export');
      else out.push({ file, lesson: mod.default });
    } catch (e) {
      issues.error('lessons', rel, `could not import: ${(e as Error).message}`);
    }
  }
  return out;
}

function checkBlock(sc: Scope, b: LessonBlock, where: string, topic: Topic | null, experiments: Set<string>): void {
  const l = b as unknown as Loose;
  switch (b.kind) {
    case 'prose':
      if (!nonEmpty(b.body)) sc.error(`${where}: prose is empty`);
      return;
    case 'code':
      if (!nonEmpty(b.code)) sc.error(`${where}: code is empty`);
      if (b.stdin !== undefined && !arr(b.stdin).every(nonEmpty)) sc.error(`${where}: stdin must be a list of strings`);
      return;
    case 'shell': {
      const lines = arr(b.lines);
      if (lines.length === 0) sc.error(`${where}: shell has no lines`);
      if (lines.length > 14) sc.warn(`${where}: ${lines.length} shell lines; keep a session short enough to follow`);
      if (!lines.every((x) => typeof x === 'string')) sc.error(`${where}: shell lines must be strings`);
      for (const line of lines) {
        if (typeof line === 'string' && line.includes('\n')) sc.error(`${where}: a shell line must be a single line`);
      }
      return;
    }
    case 'compare':
      for (const side of ['left', 'right'] as const) {
        const s = b[side];
        if (!s || !nonEmpty(s.label) || !nonEmpty(s.code)) sc.error(`${where}: compare.${side} needs a label and code`);
      }
      return;
    case 'callout':
      if (b.tone !== 'note' && b.tone !== 'warn' && b.tone !== 'exam') sc.error(`${where}: callout tone must be note, warn or exam`);
      if (!nonEmpty(b.body)) sc.error(`${where}: callout body is empty`);
      return;
    case 'checkpoint':
      if (!nonEmpty(b.prompt) || !nonEmpty(b.answer)) sc.error(`${where}: checkpoint needs a prompt and an answer`);
      return;
    case 'steps': {
      const items = arr(b.items);
      if (items.length < 2) sc.error(`${where}: steps needs at least 2 items`);
      if (!items.every(nonEmpty)) sc.error(`${where}: every step must be non-empty text`);
      plainText(sc, b.title, `${where}: steps title`);
      return;
    }
    case 'table': {
      const head = arr(b.head);
      const rows = arr(b.rows) as unknown[][];
      if (head.length < 2) sc.error(`${where}: a table needs at least 2 columns`);
      if (rows.length === 0) sc.error(`${where}: a table needs at least one row`);
      for (const [i, r] of rows.entries()) {
        if (!Array.isArray(r) || r.length !== head.length) sc.error(`${where}: row ${i + 1} has ${Array.isArray(r) ? r.length : '?'} cells but the header has ${head.length}`);
      }
      return;
    }
    case 'experiment':
      if (!topic) sc.error(`${where}: an experiment block needs the lesson to set topicId`);
      else if (!experiments.has(b.id)) sc.error(`${where}: topic ${topic.id} has no experiment ${quote(b.id)}`);
      return;
    case 'workedExample':
      if (!topic) sc.error(`${where}: a workedExample block needs the lesson to set topicId`);
      else if (!topic.workedExample?.code?.trim()) sc.error(`${where}: topic ${topic.id} has no worked example`);
      return;
    case 'mistakes': {
      if (!topic) {
        sc.error(`${where}: a mistakes block needs the lesson to set topicId`);
        return;
      }
      const have = new Set<string>((topic.commonMistakes ?? []).map((m) => String(m.mistake)));
      for (const id of arr(b.only)) {
        if (typeof id !== 'string' || !MISTAKE_SET.has(id)) sc.error(`${where}: ${quote(String(id))} is not a mistake id`);
        else if (!have.has(id)) sc.error(`${where}: topic ${topic.id} has no common mistake ${quote(id)}`);
      }
      return;
    }
    case 'quiz': {
      if (!nonEmpty(b.prompt)) sc.error(`${where}: quiz prompt is empty`);
      const options = arr(b.options) as Loose[];
      if (options.length < 2 || options.length > 5) sc.error(`${where}: a quiz needs 2 to 5 options (has ${options.length})`);
      if (!options.some((o) => o?.correct === true)) sc.error(`${where}: no option is marked correct`);
      const seen = new Set<string>();
      for (const [i, o] of options.entries()) {
        if (!nonEmpty(o?.text)) sc.error(`${where}: option ${i + 1} has no text`);
        else if (seen.has(String(o.text))) sc.error(`${where}: option ${quote(String(o.text))} appears twice`);
        else seen.add(String(o.text));
        // A wrong option without a reason teaches nothing: the reader learns they were wrong, not why.
        if (!nonEmpty(o?.why)) sc.error(`${where}: option ${i + 1} has no "why"; every option needs a reason, especially the wrong ones`);
      }
      return;
    }
    case 'predict': {
      if (!nonEmpty(b.code)) sc.error(`${where}: predict has no code`);
      // input() echoes the typed line into the output, so the answer would include a line the reader had
      // no way to predict and would be marked wrong for missing. Predict the logic, not the echo.
      if (b.stdin !== undefined || /\binput\s*\(/.test(String(b.code ?? ''))) {
        sc.error(`${where}: a predict block cannot call input(); the typed line is echoed into the output, so the expected answer would contain a line the reader cannot predict`);
      }
      const choices = b.choices;
      if (choices !== undefined) {
        if (!Array.isArray(choices) || choices.length < 2 || choices.length > 4) {
          sc.error(`${where}: give 2 to 4 choices, or none at all so the reader types the answer`);
        } else if (new Set(choices).size !== choices.length) {
          sc.error(`${where}: two choices are identical`);
        }
      }
      return;
    }
    case 'order': {
      const lines = arr(b.lines) as Loose[];
      if (lines.length < 3 || lines.length > 8) sc.error(`${where}: order needs 3 to 8 lines (has ${lines.length})`);
      for (const [i, l] of lines.entries()) {
        if (!nonEmpty(l?.text)) sc.error(`${where}: line ${i + 1} is empty`);
        if (!isInt(l?.indent) || (l.indent as number) < 0 || (l.indent as number) > 3) {
          sc.error(`${where}: line ${i + 1} needs an indent from 0 to 3`);
        }
      }
      if (new Set(lines.map((l) => String(l?.text))).size !== lines.length) {
        // Two identical lines make "the right order" ambiguous, so it could be marked wrong unfairly.
        sc.error(`${where}: two lines are identical, so there is more than one correct order`);
      }
      return;
    }
    case 'match': {
      const pairs = arr(b.pairs) as Loose[];
      if (pairs.length < 2 || pairs.length > 6) sc.error(`${where}: match needs 2 to 6 pairs (has ${pairs.length})`);
      const lefts = new Set<string>();
      const rights = new Set<string>();
      for (const [i, pr] of pairs.entries()) {
        if (!nonEmpty(pr?.left) || !nonEmpty(pr?.right)) {
          sc.error(`${where}: pair ${i + 1} needs both sides`);
          continue;
        }
        // A repeated side would make two answers indistinguishable and a correct drop look wrong.
        if (lefts.has(String(pr.left))) sc.error(`${where}: ${quote(String(pr.left))} appears on the left twice`);
        if (rights.has(String(pr.right))) sc.error(`${where}: ${quote(String(pr.right))} appears on the right twice`);
        lefts.add(String(pr.left));
        rights.add(String(pr.right));
      }
      return;
    }
    case 'walkthrough': {
      if (!nonEmpty(b.code)) sc.error(`${where}: walkthrough has no code`);
      const lines = String(b.code ?? '').replace(/\n$/, '').split('\n').length;
      if (lines > 14) sc.error(`${where}: ${lines} lines is too long to step through; keep a walkthrough under 14`);
      if (b.watch !== undefined && (!arr(b.watch).length || !arr(b.watch).every(nonEmpty))) {
        sc.error(`${where}: watch must be a non-empty list of variable names`);
      }
      return;
    }
    case 'annotate': {
      if (!nonEmpty(b.code)) {
        sc.error(`${where}: annotate has no code`);
        return;
      }
      const count = b.code.replace(/\n$/, '').split('\n').length;
      const notes = Object.entries(b.notes ?? {});
      if (notes.length === 0) sc.error(`${where}: annotate needs at least one note, or it is just a code block`);
      for (const [line, note] of notes) {
        const n = Number(line);
        if (!Number.isInteger(n) || n < 1 || n > count) {
          sc.error(`${where}: note ${quote(line)} is not a line of the code (1 to ${count})`);
        }
        if (!nonEmpty(note)) sc.error(`${where}: the note on line ${line} is empty`);
      }
      return;
    }
    case 'interactive':
      // Fully checked and run below, where a harness is available; here only the shape.
      if (!b.experiment || typeof b.experiment !== 'object') sc.error(`${where}: interactive needs an experiment`);
      return;
    case 'task': {
      if (!nonEmpty(b.prompt)) sc.error(`${where}: the task has no prompt`);
      if (b.run !== 'function' && b.run !== 'program') sc.error(`${where}: run must be 'function' or 'program'`);
      if (b.run === 'function' && !nonEmpty(b.fnName)) sc.error(`${where}: a function task needs fnName`);
      if (!nonEmpty(b.starter)) sc.error(`${where}: the task has no starter code`);
      if (!nonEmpty(b.solution)) sc.error(`${where}: the task has no solution to check against`);
      const tests = arr(b.tests) as Loose[];
      if (tests.length < 2) sc.error(`${where}: a task needs at least 2 tests (has ${tests.length})`);
      if (!tests.some((t) => t?.hidden === false)) {
        sc.error(`${where}: at least one test must be visible, or the reader cannot see what is being asked of them`);
      }
      const ids = new Set<string>();
      for (const [i, t] of tests.entries()) {
        if (!nonEmpty(t?.id)) sc.error(`${where}: test ${i + 1} has no id`);
        else if (ids.has(String(t.id))) sc.error(`${where}: duplicate test id ${quote(String(t.id))}`);
        else ids.add(String(t.id));
        if (!nonEmpty(t?.label)) sc.error(`${where}: test ${i + 1} has no label`);
        if (typeof t?.hidden !== 'boolean') sc.error(`${where}: test ${i + 1} must say whether it is hidden`);
      }
      return;
    }
    case 'practice':
      if (!topic) sc.error(`${where}: a practice block needs the lesson to set topicId`);
      return;
    default:
      sc.error(`${where}: unknown block kind ${quote(String(l.kind))}`);
  }
}

/** The language a lesson is run in; an unknown track is reported elsewhere and treated as Python. */
function langOf(x: Lesson): Lang {
  return TRACK_LANG[x?.track] ?? 'python';
}

/**
 * What an R lesson cannot use. Each of these leans on something only the Python harness has: the line
 * tracer, the CITS1401 topic ladder, or a program reading typed input.
 */
function checkRBlock(sc: Scope, b: LessonBlock, where: string): void {
  const l = b as unknown as Loose;
  switch (b.kind) {
    case 'walkthrough':
      sc.error(`${where}: a walkthrough steps through Python's line tracer, which R does not have; use an annotate block to explain an R program line by line`);
      return;
    case 'experiment': case 'workedExample': case 'mistakes': case 'practice':
      sc.error(`${where}: a ${b.kind} block comes from a CITS1401 topic, and an R lesson is not on that ladder`);
      return;
    case 'interactive':
      if (b.experiment?.watch !== undefined) sc.error(`${where}: watch records Python variables line by line, which R cannot do; draw the values with probes instead`);
      return;
    case 'task': {
      for (const t of arr(b.tests) as Loose[]) {
        for (const field of ['stdin', 'files', 'argsUnchanged', 'tag'] as const) {
          if (t?.[field] !== undefined) sc.error(`${where}: test ${quote(String(t.id))} sets ${field}, which R tasks do not support`);
        }
        if (t?.cmp === 'unordered') sc.error(`${where}: test ${quote(String(t.id))} uses cmp "unordered", which R tasks do not support; sort() both sides in the call and expect`);
        if (b.run === 'function' && !nonEmpty(t?.call)) sc.error(`${where}: test ${quote(String(t?.id))} needs a call (an R expression)`);
        if (b.run === 'function' && !nonEmpty(t?.expect)) sc.error(`${where}: test ${quote(String(t?.id))} needs an expect (an R expression for the value wanted)`);
      }
      return;
    }
  }
  // Nothing in R reads a line typed at the console here, so there is nothing for stdin to feed.
  if (l.stdin !== undefined) sc.error(`${where}: an R block cannot take stdin; put the values in the code`);
}

function checkStatic(sc: Scope, x: Lesson, seen: Set<string>, topics: Map<string, Topic>): Topic | null {
  const l = x as unknown as Loose;
  if (!nonEmpty(l.id) || !KEBAB.test(String(l.id))) sc.error('id must be kebab-case');
  else if (seen.has(x.id)) sc.error('duplicate lesson id');
  if (!nonEmpty(l.title)) sc.error('title is empty');
  plainText(sc, l.title, 'title');
  if (!nonEmpty(l.summary)) sc.error('summary is empty (it is the whole card in the library)');
  if (String(l.summary ?? '').trim().endsWith('.')) sc.warn('summary reads better without a full stop');
  if (!TRACK_SET.has(String(l.track))) sc.error(`track must be one of ${TRACKS.join(', ')}`);
  if (typeof l.minutes !== 'number' || !Number.isFinite(l.minutes) || l.minutes < 2 || l.minutes > 90) {
    sc.error('minutes must be an honest reading time between 2 and 90');
  }
  // A core lesson is ordered by its topic; the other tracks have nothing else to go on.
  if (l.track !== 'core' && typeof l.order !== 'number') {
    sc.warn('has no order, so it falls to the end of its track in the library; give it a place in the reading order');
  } else if (l.order !== undefined && (!Number.isInteger(l.order) || (l.order as number) < 1)) {
    sc.error('order must be a whole number from 1 up');
  }
  const outcomes = arr(l.outcomes);
  if (outcomes.length < 2 || outcomes.length > 6) sc.error(`needs 2 to 6 outcomes (has ${outcomes.length})`);
  if (!outcomes.every(nonEmpty)) sc.error('every outcome must be non-empty text');

  let topic: Topic | null = null;
  const lang = langOf(x);
  if (l.topicId !== undefined && lang === 'r') {
    sc.error('an R lesson cannot set topicId: the topics are the CITS1401 Python ladder');
  } else if (l.topicId !== undefined) {
    if (!TOPIC_BY_ID[String(l.topicId)]) sc.error(`topicId ${quote(String(l.topicId))} is not a topic id`);
    else topic = topics.get(String(l.topicId)) ?? null;
  }

  const sections = arr(l.sections);
  if (sections.length < 2) sc.error('needs at least 2 sections (they are the steps a reader walks through)');
  if (sections.length > 12) sc.warn(`${sections.length} sections; more than 12 steps is a long walk`);

  const experiments = new Set((topic?.experiments ?? []).map((e: Experiment) => e.id));
  const sectionIds = new Set<string>();
  // Two interactive cards sharing an id would emit the same DOM ids for their slider labels.
  const interactiveIds = new Set<string>();
  for (const [si, raw] of sections.entries()) {
    const s = raw as Loose;
    const sid = nonEmpty(s?.id) ? String(s.id) : `#${si + 1}`;
    if (!nonEmpty(s?.id) || !KEBAB.test(String(s.id))) sc.error(`section ${sid}: id must be kebab-case`);
    else if (sectionIds.has(String(s.id))) sc.error(`section ${sid}: duplicate section id`);
    else sectionIds.add(String(s.id));
    if (!nonEmpty(s?.title)) sc.error(`section ${sid}: title is empty`);
    const blocks = arr(s?.blocks) as LessonBlock[];
    if (blocks.length === 0) sc.error(`section ${sid}: has no blocks`);
    if (blocks.length > MAX_BLOCKS) sc.error(`section ${sid}: ${blocks.length} blocks; split it`);
    for (const [bi, b] of blocks.entries()) {
      if (!b || typeof b !== 'object') {
        sc.error(`section ${sid} block ${bi + 1}: not an object`);
        continue;
      }
      checkBlock(sc, b, `section ${sid} block ${bi + 1}`, topic, experiments);
      if (lang === 'r') checkRBlock(sc, b, `section ${sid} block ${bi + 1}`);
      // Every card on a page emits DOM ids built from its experiment id, which its slider labels and
      // <output for> point at. Two cards sharing one would make both resolve to the first.
      const cardId = b.kind === 'interactive' ? b.experiment?.id : b.kind === 'experiment' ? b.id : null;
      if (nonEmpty(cardId)) {
        if (interactiveIds.has(cardId)) {
          sc.error(`section ${sid} block ${bi + 1}: ${quote(cardId)} is already used by another card in this lesson; each card needs its own id`);
        }
        interactiveIds.add(cardId);
      }
    }
  }
  return topic;
}

/**
 * Python randomises string hashes per process, so a set of strings iterates differently on every run.
 * Recording one would make the generated file change with no content change, and `verify:check` would
 * then fail in CI at random. Sets of small integers are stable, so only the risky shape is refused.
 */
// A set of strings has no "key: value" pair, which is what separates {'a', 'b'} from {'a': 1}. Dicts
// keep insertion order in Python 3.7+ and are perfectly stable, so they must not be caught here.
const SET_REPR = /\{[^{}:]*['"][^{}:]*\}/;
function checkStable(sc: Scope, where: string, text: string): void {
  if (SET_REPR.test(text)) {
    sc.error(`${where}: this prints a set of strings, which iterates in a different order on every run; show it through sorted(...) so the recorded output is stable`);
  }
}

const toErr = (e: { type: string; message: string; line?: number } | undefined) =>
  (e ? { type: e.type, message: stable(e.message), line: e.line ?? 0 } : undefined);

/** Run every runnable block and record what it really did. */
function runBlocks(h: Harness, x: Lesson, sc: Scope): GeneratedLesson {
  const out: GeneratedLesson = {};
  x.sections.forEach((section, si) => {
    section.blocks.forEach((b, bi) => {
      const key = blockKey(si, bi);
      const where = `section ${section.id} block ${bi + 1}`;
      if (b.kind === 'task') {
        const tests = (b.tests ?? []) as Test[];
        const opts = { kind: b.run, fnName: b.fnName };
        // The answer must work, or the task cannot be completed.
        const solved = h.runTests(b.solution, tests, opts.kind, opts.fnName, [], 1000, false);
        const failed = solved.outcomes.filter((o) => !o.pass).map((o) => o.id);
        if (solved.compileError) sc.error(`${where}: the solution does not compile (${solved.compileError.type}: ${solved.compileError.message})`);
        else if (solved.missingFunction) sc.error(`${where}: the solution does not define ${solved.missingFunction}()`);
        else if (failed.length) sc.error(`${where}: the solution fails its own tests (${failed.join(', ')})`);
        // And the starter must NOT, or the reader is asked to do something already done.
        const start = h.runTests(b.starter, tests, opts.kind, opts.fnName, [], 1000, false);
        const startPassed = !start.compileError && !start.missingFunction && start.outcomes.every((o) => o.pass);
        if (startPassed) sc.error(`${where}: the starter already passes every test, so there is nothing for the reader to do`);
      } else if (b.kind === 'walkthrough') {
        const r = h.walk(b.code, b.watch ?? []);
        const gen: GeneratedBlock = { stdout: stable(r.stdout), steps: r.steps };
        const err = toErr(r.error);
        if (err) {
          gen.error = err;
          // A walkthrough that stops partway shows a reader a program that does not work, with no
          // explanation of why. Teach a crash with a quiz or a code block instead.
          sc.error(`${where}: this program raises ${err.type}, so the walkthrough stops partway; a walkthrough must run cleanly`);
        }
        if (r.overflow) sc.error(`${where}: the program runs for too many steps to step through; use fewer loop passes`);
        checkStable(sc, where, gen.stdout ?? '');
        if (r.steps.length < 2) sc.error(`${where}: only ${r.steps.length} step(s) recorded; there is nothing to walk through`);
        out[key] = gen;
      } else if (b.kind === 'predict' || b.kind === 'annotate') {
        const r = h.runCapture(b.code, b.kind === 'predict' ? (b.stdin ?? []) : []);
        const gen: GeneratedBlock = { stdout: stable(r.stdout) };
        const err = toErr(r.error);
        if (err) gen.error = err;
        if (err?.type === 'TimeoutError') sc.error(`${where}: the code never finishes`);
        checkStable(sc, where, gen.stdout ?? '');
        if (b.kind === 'predict') {
          if (err && err.type !== 'TimeoutError') {
            sc.error(`${where}: this code raises ${err.type}, so there is no output to predict; use a quiz asking which error it raises`);
          } else if (!r.stdout.trim()) {
            sc.error(`${where}: this code prints nothing, so there is nothing to predict`);
          }
          // The whole point is that the real answer is available: if it is not among the choices, the
          // reader cannot be right however well they understood it.
          const choices = b.choices;
          if (Array.isArray(choices) && choices.length > 0) {
            const norm = (t: string) => t.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
            const real = norm(r.stdout);
            const hits = choices.filter((c) => norm(String(c)) === real);
            if (hits.length === 0) sc.error(`${where}: none of the choices matches what the code prints (${quote(real)})`);
            else if (hits.length > 1) sc.error(`${where}: ${hits.length} choices match the real output, so more than one is correct`);
          }
        }
        out[key] = gen;
      } else if (b.kind === 'order') {
        // The assembled program must be a real program, or "the right order" is not right at all.
        const code = (b.lines ?? []).map((l) => `${'    '.repeat(Math.max(0, l.indent))}${l.text}`).join('\n') + '\n';
        const r = h.runCapture(code, []);
        const gen: GeneratedBlock = { stdout: stable(r.stdout) };
        const err = toErr(r.error);
        if (err) {
          gen.error = err;
          sc.error(`${where}: the lines in the given order do not run (${err.type}: ${err.message})`);
        }
        out[key] = gen;
      } else if (b.kind === 'code') {
        const r = h.runCapture(b.code, b.stdin ?? []);
        const gen: GeneratedBlock = { stdout: stable(r.stdout) };
        const err = toErr(r.error);
        if (err) gen.error = err;
        if (err?.type === 'TimeoutError') sc.error(`${where}: the code never finishes`);
        checkStable(sc, where, gen.stdout ?? '');
        if (!r.stdout && !err && !b.hideOutput) sc.warn(`${where}: prints nothing and raises nothing, so there is no output to show`);
        out[key] = gen;
      } else if (b.kind === 'shell') {
        const r = h.repl(b.lines, b.stdin ?? []);
        out[key] = {
          shell: r.lines.map((line) => ({
            source: line.source,
            stdout: stable(line.stdout),
            ...(line.value !== undefined ? { value: stable(line.value) } : {}),
            ...(line.error ? { error: toErr(line.error) as NonNullable<ReturnType<typeof toErr>> } : {}),
          })),
        };
        // A shell session may show a failure on purpose, but two kinds are always authoring bugs, and
        // both of them cascade silently into NameErrors that look like real output to a reader.
        const brokenNames = new Set<string>();
        r.lines.forEach((line, li) => {
          const assigned = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=[^=]/.exec(line.source)?.[1];
          if (line.error?.type === 'SyntaxError') {
            sc.error(`${where}: shell line ${li + 1} ${quote(line.source)} is not valid Python`);
          } else if (line.error?.type === 'EOFError') {
            sc.error(`${where}: shell line ${li + 1} ${quote(line.source)} asked for input but the block gives none; add stdin to the shell block`);
          }
          if (assigned && line.error) brokenNames.add(assigned);
          const missing = /name '([^']+)' is not defined/.exec(line.error?.message ?? '')?.[1];
          if (line.error?.type === 'NameError' && missing && brokenNames.has(missing)) {
            sc.error(`${where}: shell line ${li + 1} ${quote(line.source)} fails because an earlier line failed to set ${quote(missing)}; the rest of this session is not real output`);
          }
        });
      } else if (b.kind === 'interactive') {
        // Errors from the shared experiment checker need to say which block they came from.
        const at: Scope = {
          error: (m) => sc.error(`${where}: ${m}`),
          warn: (m) => sc.warn(`${where}: ${m}`),
        };
        // A lesson-local id, so it cannot collide with a topic's t03-x1 style ids.
        const gen = checkOneExperiment(at, b.experiment, h, KEBAB, 'a kebab-case id such as "growing-list"');
        if (gen) out[key] = { experiment: gen };
      } else if (b.kind === 'compare') {
        const left = h.runCapture(b.left.code, []);
        const right = h.runCapture(b.right.code, []);
        const gen: GeneratedBlock = {
          left: { stdout: stable(left.stdout), ...(toErr(left.error) ? { error: toErr(left.error) } : {}) },
          right: { stdout: stable(right.stdout), ...(toErr(right.error) ? { error: toErr(right.error) } : {}) },
        };
        out[key] = gen;
        const same = left.stdout === right.stdout && !!left.error === !!right.error
          && left.error?.type === right.error?.type;
        if (same) sc.warn(`${where}: both sides do exactly the same thing, so the comparison shows nothing`);
      }
    });
  });
  return out;
}

/**
 * R prints an environment or a compiled function with its memory address, which differs from run to run.
 * Recording it would make the generated file change with no content change, so the address is
 * normalised, exactly as Python's default reprs are.
 */
export function stableR(text: string): string {
  return text.replace(/<(environment|bytecode): 0x[0-9a-f]+>/g, '<$1: 0x...>');
}

const toRErr = (e: RError | undefined) => (e ? { type: e.type, message: stableR(e.message), line: e.line } : undefined);

/**
 * An R object named on the left of `<-` or `=` at the very start of a line. Unindented only: an indented
 * `type = rep(...)` is an argument inside a call spread over several lines, not an assignment.
 */
const R_ASSIGN = /^([A-Za-z.][A-Za-z0-9._]*)\s*(?:<-|=(?!=))/;

/**
 * Run every combination of an interactive card in R first, then hand the shared experiment checker a
 * harness that answers from those runs. The checker is synchronous, because Pyodide is; webR is not.
 * Keyed by the exact program and probes, so a lookup can only ever return that program's own run.
 */
async function precomputeR(r: RDriver, x: Experiment): Promise<Harness | null> {
  const key = (code: string, probes: Record<string, string> | null) => JSON.stringify([code, probes]);
  const runs = new Map<string, CaptureResult | ProbeResult>();
  let combos: number[][];
  try {
    combos = allCombos(x.knobs);
  } catch {
    return null;
  }
  const probeEntries = Object.entries(x.probes ?? {});
  for (const picks of combos) {
    let code: string;
    let filled: Record<string, string> | null = null;
    try {
      code = fillTemplate(x.template, x.knobs, picks).code;
      if (probeEntries.length) filled = Object.fromEntries(probeEntries.map(([id, expr]) => [id, fillTemplate(expr, x.knobs, picks).code]));
    } catch {
      // A template the static checks will reject; they report it, so there is nothing to run.
      return null;
    }
    if (filled) {
      const p = await r.probe(code, filled);
      runs.set(key(code, filled), {
        stdout: stableR(p.stdout), values: p.values,
        ...(p.error ? { error: { type: p.error.type, message: stableR(p.error.message), line: p.error.line } as never } : {}),
        ...(p.probeErrors ? { probeErrors: p.probeErrors } : {}),
      });
    } else {
      const c = await r.runScript(code);
      runs.set(key(code, null), {
        stdout: stableR(c.stdout),
        ...(c.error ? { error: { type: c.error.type, message: stableR(c.error.message), line: c.error.line } as never } : {}),
      });
    }
  }
  const find = <T>(k: string): T => {
    const hit = runs.get(k);
    if (!hit) throw new Error('an R card asked for a run that was not made ahead of time');
    return hit as T;
  };
  return {
    runCapture: (code: string) => find<CaptureResult>(key(code, null)),
    probe: (code: string, probes: Record<string, string>) => find<ProbeResult>(key(code, probes)),
    trace: () => { throw new Error('R cards cannot watch variables'); },
  } as unknown as Harness;
}

/** Every name a block of R assigns at the start of a line, for spotting a later block that relies on it. */
function rAssigned(b: LessonBlock): string[] {
  const code = b.kind === 'code' || b.kind === 'predict' || b.kind === 'annotate' ? b.code
    : b.kind === 'shell' ? b.lines.join('\n')
    : b.kind === 'compare' ? `${b.left.code}\n${b.right.code}` : '';
  return code.split('\n').map((line) => R_ASSIGN.exec(line)?.[1]).filter((n): n is string => !!n);
}

/** The object an R error says is missing: "object 'fit' not found", 'could not find function "odds"'. */
function rMissing(message: string | undefined): string | undefined {
  return /object '([^']+)' not found/.exec(message ?? '')?.[1] ?? /could not find function "([^"]+)"/.exec(message ?? '')?.[1];
}

/** The R counterpart of runBlocks: the same guarantees, with R's console as the source of truth. */
async function runRBlocks(r: RDriver, x: Lesson, sc: Scope): Promise<GeneratedLesson> {
  const out: GeneratedLesson = {};
  // Every block starts from an empty workspace. A block that fails for want of a name an earlier block
  // set is an author assuming the workspace carries over; what it shows is not the lesson's output.
  const earlier = new Set<string>();
  const carried = (where: string, message: string | undefined) => {
    const name = rMissing(message);
    if (name && earlier.has(name)) {
      sc.error(`${where}: fails because ${quote(name)} is not set here; it was set in an earlier block, but every block starts from an empty workspace, so set it again in this one`);
    }
  };
  for (const [si, section] of x.sections.entries()) {
    for (const [bi, b] of section.blocks.entries()) {
      const key = blockKey(si, bi);
      const where = `section ${section.id} block ${bi + 1}`;
      await runOneR(r, b, key, where, sc, out, carried);
      for (const name of rAssigned(b)) earlier.add(name);
      await forgotLibrary(r, out[key], where, sc);
    }
  }
  return out;
}

/**
 * A block that calls glm.nb() without library(MASS) fails with "could not find function", which reads
 * like a lesson about a mistake. Every block starts with nothing attached, so say which call is missing.
 */
async function forgotLibrary(r: RDriver, gen: GeneratedBlock | undefined, where: string, sc: Scope): Promise<void> {
  const messages = [gen?.error?.message, gen?.left?.error?.message, gen?.right?.error?.message, ...(gen?.shell ?? []).map((l) => l.error?.message)];
  for (const m of messages) {
    const name = /could not find function "([^"]+)"/.exec(m ?? '')?.[1] ?? /object '([^']+)' not found/.exec(m ?? '')?.[1];
    if (!name) continue;
    const pkg = await r.packageExporting(name);
    if (pkg) sc.error(`${where}: ${name} comes from ${pkg}, and every block starts with nothing attached; add library(${pkg}) to this block`);
  }
}

async function runOneR(
  r: RDriver, b: LessonBlock, key: string, where: string, sc: Scope, out: GeneratedLesson,
  carried: (where: string, message: string | undefined) => void,
): Promise<void> {
  {
    {
      if (b.kind === 'task') {
        const tests = (b.tests ?? []) as Test[];
        // The answer must work, or the task cannot be completed.
        const solved = await r.task(b.solution, b.run, tests);
        if (solved.run.error) sc.error(`${where}: the solution stops with an error (${solved.run.error.message})`);
        else {
          const failed = solved.outcomes.filter((o) => !o.pass);
          for (const o of failed) {
            sc.error(`${where}: the solution fails its own test ${quote(o.id)}${o.error ? ` (${o.error})` : o.got !== undefined ? ` (got ${quote(o.got)}, wanted ${quote(o.want ?? '')})` : ''}`);
          }
        }
        // And the starter must NOT, or the reader is asked to do something already done.
        const start = await r.task(b.starter, b.run, tests);
        if (!start.run.error && start.outcomes.every((o) => o.pass)) {
          sc.error(`${where}: the starter already passes every test, so there is nothing for the reader to do`);
        }
      } else if (b.kind === 'predict' || b.kind === 'annotate') {
        const run = await r.runScript(b.code);
        const gen: GeneratedBlock = { stdout: stableR(run.stdout) };
        const err = toRErr(run.error);
        if (err) gen.error = err;
        if (err?.type === 'SyntaxError') sc.error(`${where}: the code is not valid R (${err.message})`);
        carried(where, err?.message);
        if (b.kind === 'predict') {
          if (err && err.type !== 'SyntaxError') {
            sc.error(`${where}: this code stops with an error, so there is no output to predict; use a quiz asking what goes wrong`);
          } else if (!run.stdout.trim()) {
            sc.error(`${where}: this code prints nothing, so there is nothing to predict`);
          }
          const choices = b.choices;
          if (Array.isArray(choices) && choices.length > 0) {
            const real = normOutput(run.stdout);
            const hits = choices.filter((c) => normOutput(String(c)) === real);
            if (hits.length === 0) sc.error(`${where}: none of the choices matches what the code prints (${quote(real)})`);
            else if (hits.length > 1) sc.error(`${where}: ${hits.length} choices match the real output, so more than one is correct`);
          }
        }
        out[key] = gen;
      } else if (b.kind === 'order') {
        // Indentation means nothing to R, but it is kept so the assembled program reads as written.
        const code = (b.lines ?? []).map((l) => `${'  '.repeat(Math.max(0, l.indent))}${l.text}`).join('\n') + '\n';
        const run = await r.runScript(code);
        const gen: GeneratedBlock = { stdout: stableR(run.stdout) };
        const err = toRErr(run.error);
        if (err) {
          gen.error = err;
          sc.error(`${where}: the lines in the given order do not run (${err.message})`);
        }
        out[key] = gen;
      } else if (b.kind === 'code') {
        const run = await r.runScript(b.code);
        const gen: GeneratedBlock = { stdout: stableR(run.stdout) };
        const err = toRErr(run.error);
        if (err) gen.error = err;
        if (err?.type === 'SyntaxError') sc.error(`${where}: the code is not valid R (${err.message})`);
        carried(where, err?.message);
        if (run.truncated) sc.error(`${where}: prints more than a reader could follow; print less`);
        if (!run.stdout && !err && !b.hideOutput) sc.warn(`${where}: prints nothing and raises nothing, so there is no output to show`);
        out[key] = gen;
      } else if (b.kind === 'shell') {
        const lines = await r.runShell(b.lines);
        out[key] = {
          shell: lines.map((line) => ({
            source: line.source,
            stdout: stableR(line.stdout),
            ...(line.error ? { error: toRErr(line.error) as NonNullable<ReturnType<typeof toRErr>> } : {}),
          })),
        };
        // A session may show a failure on purpose, but two kinds are always authoring bugs, and both
        // cascade into "object not found" errors that look like real output to a reader.
        const broken = new Set<string>();
        lines.forEach((line, li) => {
          if (line.error?.type === 'SyntaxError') sc.error(`${where}: shell line ${li + 1} ${quote(line.source)} is not a complete line of R`);
          const assigned = R_ASSIGN.exec(line.source)?.[1];
          if (assigned && line.error) broken.add(assigned);
          const missing = rMissing(line.error?.message);
          if (missing && broken.has(missing)) {
            sc.error(`${where}: shell line ${li + 1} ${quote(line.source)} fails because an earlier line failed to set ${quote(missing)}; the rest of this session is not real output`);
          } else {
            carried(`${where} line ${li + 1}`, line.error?.message);
          }
        });
      } else if (b.kind === 'interactive') {
        const at: Scope = {
          error: (m) => sc.error(`${where}: ${m}`),
          warn: (m) => sc.warn(`${where}: ${m}`),
        };
        const h = await precomputeR(r, b.experiment);
        const gen = checkOneExperiment(at, b.experiment, h, KEBAB, 'a kebab-case id such as "growing-list"');
        if (gen) out[key] = { experiment: gen };
      } else if (b.kind === 'compare') {
        const left = await r.runScript(b.left.code);
        const right = await r.runScript(b.right.code);
        out[key] = {
          left: { stdout: stableR(left.stdout), ...(left.error ? { error: toRErr(left.error) } : {}) },
          right: { stdout: stableR(right.stdout), ...(right.error ? { error: toRErr(right.error) } : {}) },
        };
        for (const [side, run] of [['left', left], ['right', right]] as const) {
          if (run.error?.type === 'SyntaxError') sc.error(`${where}: the ${side} side is not valid R (${run.error.message})`);
        }
        const same = left.stdout === right.stdout && left.error?.message === right.error?.message;
        if (same) sc.warn(`${where}: both sides do exactly the same thing, so the comparison shows nothing`);
        carried(`${where} (left)`, left.error?.message);
        carried(`${where} (right)`, right.error?.message);
      }
    }
  }
}

export interface LessonCheckResult { generated: Map<string, GeneratedLesson>; index: unknown[] }

export async function checkLessons(
  issues: Issues, topics: Map<string, Topic>, harness: (() => Promise<Harness>) | null,
  rDriver: (() => Promise<RDriver>) | null = null,
): Promise<LessonCheckResult> {
  const loaded = await loadLessons(issues);
  const generated = new Map<string, GeneratedLesson>();
  const index: unknown[] = [];
  const seen = new Set<string>();
  const byId = new Map<string, Lesson>();

  for (const { file, lesson } of loaded) {
    const rel = file.replace(PROJECT_ROOT + '/', '');
    const sc = scope(issues, 'lessons', nonEmpty(lesson?.id) ? lesson.id : rel);
    const expectedFile = join(LESSONS_DIR, String(lesson?.track), `${lesson?.id}.ts`);
    if (nonEmpty(lesson?.id) && nonEmpty(lesson?.track) && file !== expectedFile) {
      sc.error(`lives at ${rel} but its id and track say it should be lessons/${lesson.track}/${lesson.id}.ts`);
    }
    checkStatic(sc, lesson, seen, topics);
    if (nonEmpty(lesson?.id)) {
      seen.add(lesson.id);
      byId.set(lesson.id, lesson);
    }
  }

  // Prerequisites must exist, and a lesson cannot require itself.
  for (const { lesson } of loaded) {
    if (!nonEmpty(lesson?.id)) continue;
    const sc = scope(issues, 'lessons', lesson.id);
    for (const p of arr(lesson.prereqs)) {
      if (typeof p !== 'string' || !byId.has(p)) sc.error(`prereq ${quote(String(p))} is not a lesson id`);
      else if (p === lesson.id) sc.error('lists itself as a prerequisite');
    }
  }

  // Every topic experiment must be embedded by that topic's lesson. The lesson is the only way to reach
  // one now that the topic page has no "what if" tab, so an experiment nobody embeds is dead content.
  for (const { lesson } of loaded) {
    if (!lesson?.topicId) continue;
    const topic = topics.get(lesson.topicId);
    const all = (topic?.experiments ?? []).map((e: Experiment) => e.id);
    if (all.length === 0) continue;
    const used = new Set<string>();
    for (const section of arr(lesson.sections) as { blocks?: LessonBlock[] }[]) {
      for (const b of arr(section?.blocks) as LessonBlock[]) {
        if (b?.kind === 'experiment') used.add(b.id);
      }
    }
    const orphans = all.filter((id) => !used.has(id));
    if (orphans.length) {
      scope(issues, 'lessons', lesson.id).error(
        `topic ${lesson.topicId} has ${plural(orphans.length, 'experiment')} no lesson embeds (${orphans.join(', ')}); nothing else links to them, so they would be unreachable`,
      );
    }
  }

  // One lesson per topic at most: the topic page links to a single lesson.
  const perTopic = new Map<string, string[]>();
  for (const { lesson } of loaded) {
    if (!lesson?.topicId) continue;
    const list = perTopic.get(lesson.topicId) ?? [];
    list.push(lesson.id);
    perTopic.set(lesson.topicId, list);
  }
  for (const [topicId, ids] of perTopic) {
    if (ids.length > 1) issues.error('lessons', topicId, `topic ${topicId} is claimed by ${ids.length} lessons (${ids.join(', ')}); a topic links to one`);
  }

  for (const { lesson } of loaded) {
    if (!nonEmpty(lesson?.id)) continue;
    const runner = langOf(lesson) === 'r' ? rDriver : harness;
    if (runner) {
      const sc = scope(issues, 'lessons', lesson.id);
      try {
        generated.set(lesson.id, langOf(lesson) === 'r'
          ? await runRBlocks(await (rDriver as () => Promise<RDriver>)(), lesson, sc)
          : runBlocks(await (harness as () => Promise<Harness>)(), lesson, sc));
      } catch (e) {
        issues.error('lessons', lesson.id, `running blocks crashed: ${(e as Error).message}`);
      }
    }
    index.push({
      id: lesson.id, title: lesson.title, summary: lesson.summary, track: lesson.track,
      minutes: lesson.minutes, ...(lesson.topicId ? { topicId: lesson.topicId } : {}),
      ...(typeof lesson.order === 'number' ? { order: lesson.order } : {}),
      ...(lesson.prereqs?.length ? { prereqs: lesson.prereqs } : {}),
      outcomes: lesson.outcomes ?? [], sections: (lesson.sections ?? []).length,
      // Section titles travel in the index so the library can be searched by what a lesson covers,
      // without downloading every lesson chunk to look inside it.
      sectionTitles: (lesson.sections ?? []).map((sec) => sec.title),
    });
  }
  return { generated, index };
}
