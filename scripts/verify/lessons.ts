// Checks and generated data for lessons.
//
// The contract: a lesson never states what Python does. Every output a student reads is produced here by
// running the code, so a lesson cannot drift away from the language, and an author cannot type an output
// that is subtly wrong. A block that raises on purpose is allowed; one that fails to compile is not.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { TOPIC_BY_ID } from '../../src/content/topics.ts';
import { MISTAKE_IDS } from '../../src/content/ids.ts';
import { blockKey, TRACKS } from '../../src/content/lessonSchema.ts';
import type { GeneratedBlock, GeneratedLesson, Lesson, LessonBlock } from '../../src/content/lessonSchema.ts';
import type { Experiment, Topic } from '../../src/content/schema.ts';
import { PROJECT_ROOT } from './pyodide.ts';
import type { Harness } from './pyodide.ts';
import type { Issues, Scope } from './report.ts';
import { scope } from './report.ts';

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
    case 'practice':
      if (!topic) sc.error(`${where}: a practice block needs the lesson to set topicId`);
      return;
    default:
      sc.error(`${where}: unknown block kind ${quote(String(l.kind))}`);
  }
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
  if (l.topicId !== undefined) {
    if (!TOPIC_BY_ID[String(l.topicId)]) sc.error(`topicId ${quote(String(l.topicId))} is not a topic id`);
    else topic = topics.get(String(l.topicId)) ?? null;
  }

  const sections = arr(l.sections);
  if (sections.length < 2) sc.error('needs at least 2 sections (they are the steps a reader walks through)');
  if (sections.length > 12) sc.warn(`${sections.length} sections; more than 12 steps is a long walk`);

  const experiments = new Set((topic?.experiments ?? []).map((e: Experiment) => e.id));
  const sectionIds = new Set<string>();
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
    }
  }
  return topic;
}

/**
 * An object's default repr carries its memory address, which differs on every run. Printing a function
 * without calling it is worth teaching, so the address is normalised rather than banned: otherwise the
 * generated file changes on every verify and CI's staleness check fails for no real reason.
 */
function stable(text: string): string {
  return text.replace(/(<[^<>]*? at )0x[0-9a-fA-F]+(>)/g, '$10x...$2');
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
      if (b.kind === 'code') {
        const r = h.runCapture(b.code, b.stdin ?? []);
        const gen: GeneratedBlock = { stdout: stable(r.stdout) };
        const err = toErr(r.error);
        if (err) gen.error = err;
        if (err?.type === 'TimeoutError') sc.error(`${where}: the code never finishes`);
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

export interface LessonCheckResult { generated: Map<string, GeneratedLesson>; index: unknown[] }

export async function checkLessons(
  issues: Issues, topics: Map<string, Topic>, harness: (() => Promise<Harness>) | null,
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
    if (harness) {
      const sc = scope(issues, 'lessons', lesson.id);
      try {
        generated.set(lesson.id, runBlocks(await harness(), lesson, sc));
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
    });
  }
  return { generated, index };
}
