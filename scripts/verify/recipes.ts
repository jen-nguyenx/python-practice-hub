// Checks and generated output for the reference.
//
// A reference nobody trusts is worse than none, so every snippet is run: it must compile, must finish,
// must actually print something, and must print the same thing on every run. The output a student reads
// is whatever Python produced, never what an author believed it would produce.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { RECIPE_GROUPS } from '../../src/content/recipeSchema.ts';
import type { GeneratedRecipes, Recipe } from '../../src/content/recipeSchema.ts';
import { TOPIC_BY_ID } from '../../src/content/topics.ts';
import { stable } from './experiments.ts';
import { PROJECT_ROOT } from './pyodide.ts';
import type { Harness } from './pyodide.ts';
import type { Issues } from './report.ts';
import { scope } from './report.ts';

const DIR = join(PROJECT_ROOT, 'src', 'content', 'recipes');
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const GROUPS = new Set<string>(RECIPE_GROUPS);
/** A reference entry is a reminder, not a lesson: past this it belongs in a lesson instead. */
const MAX_LINES = 9;
/** A set of strings iterates differently every run, so recording one would flake CI. */
const SET_REPR = /\{[^{}:]*['"][^{}:]*\}/;

const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const quote = (s: string) => JSON.stringify(s);

export interface RecipeResult { index: Recipe[]; generated: GeneratedRecipes }

export async function checkRecipes(issues: Issues, harness: (() => Promise<Harness>) | null): Promise<RecipeResult> {
  const index: Recipe[] = [];
  const generated: GeneratedRecipes = {};
  let files: string[] = [];
  try {
    // index.ts is the loader, not a set of entries: importing it here would pull in the very generated
    // files this pass is about to write.
    files = readdirSync(DIR).filter((f) => f.endsWith('.ts') && f !== 'index.ts').sort();
  } catch {
    return { index, generated };
  }

  const seen = new Set<string>();
  const tasks = new Set<string>();
  for (const file of files) {
    const rel = `src/content/recipes/${file}`;
    let list: Recipe[];
    try {
      const mod = (await import(pathToFileURL(join(DIR, file)).href)) as { default?: Recipe[] };
      if (!Array.isArray(mod.default)) {
        issues.error('reference', rel, 'must default-export an array of recipes');
        continue;
      }
      list = mod.default;
    } catch (e) {
      issues.error('reference', rel, `could not import: ${(e as Error).message}`);
      continue;
    }

    for (const [i, r] of list.entries()) {
      const id = nonEmpty(r?.id) ? r.id : `${file}#${i + 1}`;
      const sc = scope(issues, 'reference', id);
      if (!nonEmpty(r?.id) || !KEBAB.test(r.id)) sc.error('id must be kebab-case');
      else if (seen.has(r.id)) sc.error('duplicate id');
      else seen.add(r.id);

      if (!nonEmpty(r?.task)) sc.error('task is empty; it is the thing a student searches for');
      else if (tasks.has(r.task.toLowerCase())) sc.error(`another entry already answers ${quote(r.task)}`);
      else tasks.add(r.task.toLowerCase());
      // "sorted()" is a name, not a job. The whole point is being findable by what you want to do.
      if (nonEmpty(r?.task) && /^[a-z_]+\(\)$/.test(r.task.trim())) {
        sc.error('task should say what the reader wants to do, not name a function');
      }
      if (!GROUPS.has(String(r?.group))) sc.error(`group must be one of ${RECIPE_GROUPS.join(', ')}`);
      if (!nonEmpty(r?.note)) sc.error('note is empty; a snippet with nothing to say belongs in a lesson');
      if (r?.topicId !== undefined && !TOPIC_BY_ID[r.topicId]) sc.error(`topicId ${quote(String(r.topicId))} is not a topic`);
      if (r?.also !== undefined && (!Array.isArray(r.also) || !r.also.every(nonEmpty))) {
        sc.error('also must be a list of search words');
      }

      if (!nonEmpty(r?.code)) {
        sc.error('code is empty');
        continue;
      }
      const lines = r.code.replace(/\n$/, '').split('\n').length;
      if (lines > MAX_LINES) sc.error(`${lines} lines; keep a reference entry to ${MAX_LINES} or fewer`);

      index.push(r);
      if (!harness) continue;

      const h = await harness();
      const out = h.runCapture(r.code, []);
      if (out.error) {
        sc.error(`the snippet raises ${out.error.type}${out.error.message ? `: ${out.error.message}` : ''}; a reference entry must work`);
        continue;
      }
      if (!out.stdout.trim()) {
        sc.error('the snippet prints nothing, so there is no answer to show; print the result');
      }
      if (SET_REPR.test(out.stdout)) {
        sc.error('this prints a set of strings, which iterates in a different order on every run; show it through sorted(...)');
      }
      generated[r.id] = { stdout: stable(out.stdout) };
    }
  }
  return { index, generated };
}
