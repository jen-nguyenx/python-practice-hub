// Checks and generated data for "what if" experiments.
//
// Every combination of every knob is run in real Python here, so the browser can show a true output the
// instant a student clicks a control. That is the same contract the read formats already have: answers
// are generated, never typed.
import {
  allCombos, comboCount, comboKey, fillTemplate, markerIds, MAX_COMBOS,
} from '../../src/content/experiments.ts';
import type {
  Experiment, GeneratedExperiment, GeneratedExperiments, GeneratedRun, Knob, Topic,
} from '../../src/content/schema.ts';
import type { Harness } from './pyodide.ts';
import type { Issues, Scope } from './report.ts';
import { scope } from './report.ts';
import type { TopicInfo } from './static.ts';

/** More rows than this and the variable table stops being readable at a glance. */
const MAX_WATCH_ROWS = 16;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type Loose = Record<string, unknown>;
const isStr = (v: unknown): v is string => typeof v === 'string';
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const quote = (s: string) => JSON.stringify(s);

/** A fragment must stay on one line so the line numbers (and `anchorLine`) hold for every combination. */
function checkKnobs(sc: Scope, knobs: Knob[], template: string): boolean {
  let ok = true;
  const ids = new Set<string>();
  for (const [i, k] of knobs.entries()) {
    const where = nonEmpty(k?.id) ? `knob ${quote(k.id)}` : `knob #${i + 1}`;
    if (!k || typeof k !== 'object') {
      sc.error(`${where} is not an object`);
      ok = false;
      continue;
    }
    if (!nonEmpty(k.id) || !KEBAB.test(k.id)) {
      sc.error(`${where}: id must be kebab-case`);
      ok = false;
    } else if (ids.has(k.id)) {
      sc.error(`${where}: duplicate knob id`);
      ok = false;
    } else ids.add(k.id);
    if (!nonEmpty(k.label)) sc.error(`${where}: label is empty (it names the control in plain words)`);
    const choices = arr(k.choices) as Loose[];
    if (choices.length < 2 || choices.length > 4) {
      sc.error(`${where}: needs 2 to 4 choices (has ${choices.length})`);
      ok = false;
    }
    const seen = new Set<string>();
    for (const [j, c] of choices.entries()) {
      if (!c || !isStr(c.value) || c.value.trim() === '') {
        sc.error(`${where}: choice #${j + 1} has no value`);
        ok = false;
        continue;
      }
      if (c.value.includes('\n')) {
        sc.error(`${where}: choice ${quote(c.value)} spans more than one line; fragments must stay on one line so line numbers do not move`);
        ok = false;
      }
      if (seen.has(c.value)) sc.error(`${where}: choice ${quote(c.value)} appears twice`);
      else seen.add(c.value);
      if (c.caption !== undefined && !nonEmpty(c.caption)) sc.error(`${where}: choice ${quote(c.value)} has an empty caption`);
    }
  }
  const markers = markerIds(template);
  for (const id of ids) {
    const n = markers.filter((m) => m === id).length;
    if (n === 0) {
      sc.error(`knob ${quote(id)} has no ⟦${id}⟧ marker in the template`);
      ok = false;
    } else if (n > 1) {
      sc.error(`knob ${quote(id)} has ${n} markers in the template; each knob fills exactly one spot`);
      ok = false;
    }
  }
  for (const m of new Set(markers)) {
    if (!ids.has(m)) {
      sc.error(`the template has a ⟦${m}⟧ marker but no knob with that id`);
      ok = false;
    }
  }
  return ok;
}

/** Schema and authoring checks. Returns false when the experiment cannot be run. */
function checkStatic(sc: Scope, x: Experiment, num: string): boolean {
  const t = x as unknown as Loose;
  if (!x || typeof x !== 'object') {
    sc.error('experiment is not an object');
    return false;
  }
  if (!nonEmpty(t.id) || !new RegExp(`^t${num}-x[1-9]$`).test(String(t.id))) {
    sc.error(`experiment id must look like t${num}-xK (K = 1..9)`);
  }
  if (!nonEmpty(t.title)) sc.error('title is empty');
  if (!nonEmpty(t.intro)) sc.error('intro is empty (say what to change and what to watch)');
  if (!nonEmpty(t.takeaway)) sc.error('takeaway is empty (it is the point of the experiment)');
  if (!nonEmpty(t.template)) {
    sc.error('template is empty');
    return false;
  }
  const knobs = arr(t.knobs) as Knob[];
  if (knobs.length < 1 || knobs.length > 3) {
    sc.error(`needs 1 to 3 knobs (has ${knobs.length})`);
    return false;
  }
  if (!checkKnobs(sc, knobs, x.template)) return false;

  const total = comboCount(knobs);
  if (total > MAX_COMBOS) {
    sc.error(`${total} combinations of choices; keep it to ${MAX_COMBOS} or fewer`);
    return false;
  }

  const lineCount = x.template.replace(/\n$/, '').split('\n').length;
  if (x.watch !== undefined) {
    const watch = arr(x.watch);
    if (watch.length === 0 || !watch.every(nonEmpty)) sc.error('watch must be a non-empty list of variable names');
    if (watch.length > 4) sc.error(`watch has ${watch.length} names; 4 columns is the most that stays readable`);
    if (typeof x.anchorLine !== 'number' || !Number.isInteger(x.anchorLine) || x.anchorLine < 1 || x.anchorLine > lineCount) {
      sc.error(`anchorLine must be a line number of the template (1 to ${lineCount}) when watch is set`);
      return false;
    }
  } else if (x.anchorLine !== undefined) {
    sc.warn('anchorLine is set but watch is not, so no variable table is shown');
  }

  for (const key of Object.keys(x.notes ?? {})) {
    const parts = key.split('-');
    const valid = parts.length === knobs.length
      && parts.every((p, i) => /^\d+$/.test(p) && Number(p) < (knobs[i].choices?.length ?? 0));
    if (!valid) sc.error(`notes key ${quote(key)} is not a combination of choice indexes (expected ${knobs.length} numbers joined with "-")`);
  }
  return true;
}

/** Run one combination. `trace` gives rows and stdout together, so it is one Python call either way. */
function runCombo(h: Harness, x: Experiment, picks: number[]): GeneratedRun {
  const { code } = fillTemplate(x.template, x.knobs, picks);
  const watch = x.watch ?? [];
  if (watch.length > 0 && typeof x.anchorLine === 'number') {
    const r = h.trace(code, watch as string[], x.anchorLine, []);
    const run: GeneratedRun = { stdout: r.stdout, rows: r.rows };
    if (r.error) run.error = { type: r.error.type, message: r.error.message, line: r.error.line ?? 0 };
    return run;
  }
  const r = h.runCapture(code, []);
  const run: GeneratedRun = { stdout: r.stdout };
  if (r.error) run.error = { type: r.error.type, message: r.error.message, line: r.error.line ?? 0 };
  return run;
}

/** What the student would see, as one string, for comparing combinations. */
function shown(run: GeneratedRun): string {
  const out = (run.stdout ?? '').replace(/\r\n?/g, '\n').replace(/\s+$/, '');
  return run.error ? `${out}\n!${run.error.type}: ${run.error.message}` : out;
}

function checkRuntime(sc: Scope, x: Experiment, runs: GeneratedExperiment): void {
  const combos = allCombos(x.knobs);
  const outputs = new Map(combos.map((c) => [comboKey(c), shown(runs[comboKey(c)])]));

  // A fragment that does not fit the template is an authoring bug, not a lesson. A runtime error
  // (IndexError, ZeroDivisionError) often is the lesson, so only compile errors are fatal here.
  for (const c of combos) {
    const run = runs[comboKey(c)];
    const type = run?.error?.type;
    if (type === 'SyntaxError' || type === 'IndentationError' || type === 'TabError') {
      const picked = x.knobs.map((k, i) => `${k.id}=${quote(k.choices[c[i]]?.value ?? '')}`).join(', ');
      sc.error(`with ${picked} the program does not compile (${type}: ${run?.error?.message}); every combination must be valid Python`);
    } else if (type === 'TimeoutError') {
      const picked = x.knobs.map((k, i) => `${k.id}=${quote(k.choices[c[i]]?.value ?? '')}`).join(', ');
      sc.error(`with ${picked} the program runs forever; every combination must finish`);
    }
  }

  if (new Set(outputs.values()).size === 1) {
    sc.error('every combination shows the same thing, so the controls teach nothing; change the choices');
    return;
  }

  // A knob nobody can see the effect of is a decoration. Vary it alone from every other setting.
  x.knobs.forEach((k, ki) => {
    const matters = combos.some((c) => k.choices.some((_, j) => {
      if (j === c[ki]) return false;
      const other = c.slice();
      other[ki] = j;
      return outputs.get(comboKey(other)) !== outputs.get(comboKey(c));
    }));
    if (!matters) sc.warn(`knob ${quote(k.id)} never changes what is shown, whatever the other controls are set to`);
  });

  if ((x.watch ?? []).length > 0) {
    for (const c of combos) {
      const rows = runs[comboKey(c)]?.rows ?? [];
      if (rows.length > MAX_WATCH_ROWS) {
        sc.warn(`one combination fills the variable table with ${rows.length} rows; keep it under ${MAX_WATCH_ROWS} (fewer loop passes)`);
        break;
      }
    }
    const anyRows = combos.some((c) => (runs[comboKey(c)]?.rows ?? []).length > 0);
    if (!anyRows) sc.error(`line ${x.anchorLine} never runs, so the variable table is always empty`);
  }
}

/** Static + runtime checks for a topic's experiments, and the data the browser reads. */
export function checkTopicExperiments(
  issues: Issues, info: TopicInfo, topic: Topic, h: Harness | null,
): GeneratedExperiments {
  const list = arr((topic as unknown as Loose).experiments) as Experiment[];
  const out: GeneratedExperiments = {};
  if (list.length === 0) return out;
  if (list.length > 4) {
    scope(issues, info.id).warn(`has ${list.length} experiments; 4 is plenty for one topic`);
  }
  const seen = new Set<string>();
  for (const [i, x] of list.entries()) {
    const id = nonEmpty(x?.id) ? x.id : `t${info.num}-x${i + 1}?`;
    const sc = scope(issues, info.id, id);
    if (seen.has(id)) sc.error('duplicate experiment id');
    seen.add(id);
    if (!checkStatic(sc, x, info.num)) continue;
    if (!h) continue;
    const runs: GeneratedExperiment = {};
    for (const picks of allCombos(x.knobs)) runs[comboKey(picks)] = runCombo(h, x, picks);
    checkRuntime(sc, x, runs);
    out[x.id] = runs;
  }
  return out;
}
