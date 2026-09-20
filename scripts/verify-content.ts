// Content verifier: schema/authoring checks, real-Python runtime checks, and generated data.
//
//   node scripts/verify-content.ts                 verify every topic, write generated files
//   node scripts/verify-content.ts --topic strings verify one topic (repeatable)
//   node scripts/verify-content.ts --check         regenerate in memory, exit 1 if files on disk are stale
//   node scripts/verify-content.ts --static        schema checks only (no Python)
//   node scripts/verify-content.ts --lessons       lessons and the reference only (skips every topic)
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { TOPICS } from '../src/content/topics.ts';
import type { GeneratedExperiments, GeneratedTopic, Question, Topic } from '../src/content/schema.ts';
import type { GeneratedLesson } from '../src/content/lessonSchema.ts';
import type { QuestionMeta } from '../src/content/questionIndex.ts';
import { createHarness, PROJECT_ROOT } from './verify/pyodide.ts';
import type { Harness } from './verify/pyodide.ts';
import { jsonEqual, readJson, stableStringify, writeIfChanged } from './verify/json.ts';
import { formatIssue, Issues, plural, topicHeader } from './verify/report.ts';
import { checkTopicExperiments } from './verify/experiments.ts';
import { checkLessons } from './verify/lessons.ts';
import { checkRecipes } from './verify/recipes.ts';
import { checkTopicRuntime } from './verify/runtime.ts';
import type { RuntimeContext } from './verify/runtime.ts';
import { checkTopicStatic, isStub, questionsOf } from './verify/static.ts';
import type { TopicInfo } from './verify/static.ts';

const argv = process.argv.slice(2);
const check = argv.includes('--check');
const staticOnly = argv.includes('--static');
const lessonsOnly = argv.includes('--lessons');
const selected: string[] = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--topic' && argv[i + 1]) selected.push(argv[++i]);
}
const unknown = selected.filter((id) => !TOPICS.some((t) => t.id === id));
if (unknown.length) {
  console.error(`Unknown topic id(s): ${unknown.join(', ')}. Valid: ${TOPICS.map((t) => t.id).join(', ')}`);
  process.exit(2);
}

const GENERATED_DIR = join(PROJECT_ROOT, 'src', 'content', 'generated');
const issues = new Issues();

// ---------- load every topic module (needed for the index and cross-topic id checks) ----------
interface Loaded { info: TopicInfo; topic: Topic | null }
const loaded: Loaded[] = [];
for (const t of TOPICS) {
  const info: TopicInfo = { id: t.id, num: t.num, order: t.order, minimum: t.minimum };
  const file = join(PROJECT_ROOT, 'src', 'content', 'topics', `${t.num}-${t.id}`, 'index.ts');
  try {
    const mod = (await import(pathToFileURL(file).href)) as { default?: Topic };
    if (!mod.default) {
      issues.error(t.id, undefined, 'index.ts has no default export');
      loaded.push({ info, topic: null });
    } else loaded.push({ info, topic: mod.default });
  } catch (e) {
    issues.error(t.id, undefined, `could not import ${t.num}-${t.id}/index.ts: ${(e as Error).message}`);
    loaded.push({ info, topic: null });
  }
}

const targets = lessonsOnly ? [] : loaded.filter((l) => selected.length === 0 || selected.includes(l.info.id));

// ---------- cross-topic id uniqueness ----------
const owner = new Map<string, string>();
for (const { info, topic } of loaded) {
  if (!topic) continue;
  for (const q of questionsOf(topic)) {
    const id = (q as Question | undefined)?.id;
    if (typeof id !== 'string') continue;
    const prev = owner.get(id);
    if (prev && prev !== info.id) issues.error(info.id, id, `question id is also used in topic ${prev}`);
    else if (prev === info.id) issues.error(info.id, id, 'duplicate question id');
    owner.set(id, info.id);
  }
}

// ---------- static checks ----------
for (const { info, topic } of targets) {
  if (!topic) continue;
  try {
    checkTopicStatic(issues, info, topic);
  } catch (e) {
    issues.error(info.id, undefined, `static checks crashed: ${(e as Error).stack ?? e}`);
  }
}

// ---------- runtime checks + generated data ----------
let primary: Promise<Harness> | null = null;
let second: Promise<Harness> | null = null;
const ctx: RuntimeContext = {
  harness: () => (primary ??= createHarness()),
  second: () => (second ??= createHarness({ hashSeed: '4242' })),
  markDead: (which) => {
    if (which === 'primary') primary = null;
    else second = null;
  },
};

const generated = new Map<string, GeneratedTopic>();
for (const { info, topic } of targets) {
  if (!topic || staticOnly) continue;
  if (isStub(topic)) {
    generated.set(info.id, {});
    continue;
  }
  try {
    generated.set(info.id, await checkTopicRuntime(issues, info, topic, ctx));
  } catch (e) {
    issues.error(info.id, undefined, `runtime checks crashed: ${(e as Error).stack ?? e}`);
  }
}

// ---------- "what if" experiments (static checks always; every combination run unless --static) ----------
const experiments = new Map<string, GeneratedExperiments>();
for (const { info, topic } of targets) {
  if (!topic) continue;
  const any = Array.isArray((topic as { experiments?: unknown[] }).experiments) && (topic as { experiments: unknown[] }).experiments.length > 0;
  if (!any) {
    experiments.set(info.id, {});
    continue;
  }
  try {
    experiments.set(info.id, checkTopicExperiments(issues, info, topic, staticOnly ? null : await ctx.harness()));
  } catch (e) {
    issues.error(info.id, undefined, `experiment checks crashed: ${(e as Error).stack ?? e}`);
  }
}

// ---------- lessons (static checks always; code blocks run unless --static) ----------
const topicsById = new Map<string, Topic>();
for (const { info, topic } of loaded) if (topic) topicsById.set(info.id, topic);
// Lessons are global, not per topic, so they are only checked on a full run.
const wholeRun = lessonsOnly || selected.length === 0;
const lessons = wholeRun
  ? await checkLessons(issues, topicsById, staticOnly ? null : () => ctx.harness())
  : { generated: new Map<string, GeneratedLesson>(), index: [] as unknown[] };

// ---------- the reference (checked on a whole run) ----------
const recipes = wholeRun
  ? await checkRecipes(issues, staticOnly ? null : () => ctx.harness())
  : { index: [] as unknown[], generated: {} as Record<string, unknown> };

// ---------- question index (always from all topics) ----------
const index: QuestionMeta[] = [];
for (const { info, topic } of loaded) {
  if (!topic) continue;
  for (const s of topic.scenarios ?? []) {
    for (const q of s.questions ?? []) {
      if (!q || typeof q.id !== 'string') continue;
      const meta: QuestionMeta = {
        qid: q.id, topicId: info.id as QuestionMeta['topicId'], scenarioId: s.id, scenarioTitle: s.title ?? '',
        format: q.format, diff: q.diff,
        core: q.core === true, title: q.title, concepts: q.concepts ?? [], detects: q.detects ?? [], expectedSec: q.expectedSec,
      };
      if (q.format === 'write') {
        if (q.mode === 'paper') meta.paper = true;
        meta.kind = q.kind;
        if (q.rules?.length) meta.rules = q.rules;
        if (q.examSlot) meta.examSlot = q.examSlot;
        if (typeof q.marks === 'number') meta.marks = q.marks;
      }
      index.push(meta);
    }
  }
}

// ---------- write or compare ----------
const stale: string[] = [];
function emit(path: string, value: unknown) {
  if (check) {
    const disk = readJson(path);
    if (!disk.ok || !jsonEqual(disk.value, value)) stale.push(path.replace(PROJECT_ROOT + '/', ''));
  } else {
    writeIfChanged(path, stableStringify(value));
  }
}
/** A topic with no experiments should have no file, so a deleted experiment cannot leave stale data behind. */
function emitOrRemove(path: string, value: Record<string, unknown>) {
  if (Object.keys(value).length > 0) {
    emit(path, value);
    return;
  }
  if (!existsSync(path)) return;
  if (check) stale.push(path.replace(PROJECT_ROOT + '/', ''));
  else rmSync(path);
}
if (!staticOnly) {
  for (const [id, gen] of generated) emit(join(GENERATED_DIR, `${id}.json`), gen);
  for (const [id, x] of experiments) emitOrRemove(join(GENERATED_DIR, 'experiments', `${id}.json`), x);
  for (const [id, gen] of lessons.generated) emitOrRemove(join(GENERATED_DIR, 'lessons', `${id}.json`), gen);
  if (wholeRun) emit(join(GENERATED_DIR, 'recipes.json'), recipes.generated);
}
if (!lessonsOnly) emit(join(GENERATED_DIR, 'question-index.json'), index);
if (wholeRun) emit(join(GENERATED_DIR, 'lesson-index.json'), lessons.index);
if (wholeRun) emit(join(GENERATED_DIR, 'recipe-index.json'), recipes.index);

// ---------- report ----------
const lines: string[] = [];
for (const { info, topic } of targets) {
  const count = topic ? questionsOf(topic).length : 0;
  lines.push(topicHeader(info.num, info.id, count, topic ? isStub(topic) : false, issues));
  for (const i of issues.forTopic(info.id)) lines.push(formatIssue(i));
}
const lessonErrors = issues.count('error', 'lessons');
const lessonWarns = issues.count('warn', 'lessons');
if (wholeRun) {
  lines.push(`${lessonErrors > 0 ? 'FAIL' : 'ok  '} -- lessons: ${plural(lessons.index.length, 'lesson')}, ${plural(lessonErrors, 'error')}, ${plural(lessonWarns, 'warning')}`);
  for (const i of issues.forTopic('lessons')) lines.push(formatIssue(i));
  const refErrors = issues.count('error', 'reference');
  const refWarns = issues.count('warn', 'reference');
  lines.push(`${refErrors > 0 ? 'FAIL' : 'ok  '} -- reference: ${recipes.index.length} ${recipes.index.length === 1 ? 'entry' : 'entries'}, ${plural(refErrors, 'error')}, ${plural(refWarns, 'warning')}`);
  for (const i of issues.forTopic('reference')) lines.push(formatIssue(i));
}
console.log(lines.join('\n'));
const errors = targets.reduce((n, t) => n + issues.count('error', t.info.id), 0) + lessonErrors + issues.count('error', 'reference');
const warns = targets.reduce((n, t) => n + issues.count('warn', t.info.id), 0) + lessonWarns + issues.count('warn', 'reference');
const qTotal = targets.reduce((n, t) => n + (t.topic ? questionsOf(t.topic).length : 0), 0);
const scopeText = lessonsOnly ? plural(lessons.index.length, 'lesson') : `${plural(targets.length, 'topic')}, ${plural(qTotal, 'question')}`;
console.log(`\n${scopeText}: ${plural(errors, 'error')}, ${plural(warns, 'warning')}.${staticOnly ? ' (static checks only)' : ''}`);
if (check && stale.length) {
  console.log(`Stale generated files (run npm run verify): ${stale.join(', ')}`);
}
process.exit(errors > 0 || (check && stale.length > 0) ? 1 : 0);
