// Content verifier: schema/authoring checks, real-Python runtime checks, and generated data.
//
//   node scripts/verify-content.ts                 verify every topic, write generated files
//   node scripts/verify-content.ts --topic strings verify one topic (repeatable)
//   node scripts/verify-content.ts --check         regenerate in memory, exit 1 if files on disk are stale
//   node scripts/verify-content.ts --static        schema checks only (no Python)
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { TOPICS } from '../src/content/topics.ts';
import type { GeneratedTopic, Question, Topic } from '../src/content/schema.ts';
import type { QuestionMeta } from '../src/content/questionIndex.ts';
import { createHarness, PROJECT_ROOT } from './verify/pyodide.ts';
import type { Harness } from './verify/pyodide.ts';
import { jsonEqual, readJson, stableStringify, writeIfChanged } from './verify/json.ts';
import { formatIssue, Issues, plural, topicHeader } from './verify/report.ts';
import { checkTopicRuntime } from './verify/runtime.ts';
import type { RuntimeContext } from './verify/runtime.ts';
import { checkTopicStatic, isStub, questionsOf } from './verify/static.ts';
import type { TopicInfo } from './verify/static.ts';

const argv = process.argv.slice(2);
const check = argv.includes('--check');
const staticOnly = argv.includes('--static');
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

const targets = loaded.filter((l) => selected.length === 0 || selected.includes(l.info.id));

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
if (!staticOnly) {
  for (const [id, gen] of generated) emit(join(GENERATED_DIR, `${id}.json`), gen);
}
emit(join(GENERATED_DIR, 'question-index.json'), index);

// ---------- report ----------
const lines: string[] = [];
for (const { info, topic } of targets) {
  const count = topic ? questionsOf(topic).length : 0;
  lines.push(topicHeader(info.num, info.id, count, topic ? isStub(topic) : false, issues));
  for (const i of issues.forTopic(info.id)) lines.push(formatIssue(i));
}
console.log(lines.join('\n'));
const errors = targets.reduce((n, t) => n + issues.count('error', t.info.id), 0);
const warns = targets.reduce((n, t) => n + issues.count('warn', t.info.id), 0);
const qTotal = targets.reduce((n, t) => n + (t.topic ? questionsOf(t.topic).length : 0), 0);
console.log(`\n${plural(targets.length, 'topic')}, ${plural(qTotal, 'question')}: ${plural(errors, 'error')}, ${plural(warns, 'warning')}.${staticOnly ? ' (static checks only)' : ''}`);
if (check && stale.length) {
  console.log(`Stale generated files (run npm run verify): ${stale.join(', ')}`);
}
process.exit(errors > 0 || (check && stale.length > 0) ? 1 : 0);
