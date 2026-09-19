// Checks and generated data for "what if" experiments.
//
// Every combination of every control is run in real Python here, so the browser can show a true output the
// instant a student clicks a button or drags a slider. That is the same contract the read formats already
// have: answers are generated, never typed. Pictures are drawn from `probes`, expressions evaluated in the
// namespace the program left behind, so a visualisation shows what Python really did rather than a
// JavaScript guess at Python's rules.
import {
  allCombos, BUSY_COMBOS, comboCount, comboKey, fillTemplate, isRange, knobChoices, markerIds, MAX_COMBOS,
} from '../../src/content/experiments.ts';
import type {
  Experiment, GeneratedExperiment, GeneratedExperiments, GeneratedRun, Knob, Topic, Visual,
} from '../../src/content/schema.ts';
import type { Harness } from './pyodide.ts';
import type { Issues, Scope } from './report.ts';
import { scope } from './report.ts';
import type { TopicInfo } from './static.ts';

/** More rows than this and the variable table stops being readable at a glance. */
const MAX_WATCH_ROWS = 16;
/** A slider with more stops than this is a scrubber, not a control a beginner can reason about. */
const MAX_SLIDER_STOPS = 100;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type Loose = Record<string, unknown>;
const isStr = (v: unknown): v is string => typeof v === 'string';
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const quote = (s: string) => JSON.stringify(s);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

/**
 * An object's default repr carries its memory address, which differs on every run. Printing an object
 * without a __repr__ is worth teaching, so the address is normalised rather than banned: otherwise the
 * generated file changes on every verify and CI's staleness check fails for no real reason.
 */
export function stable(text: string): string {
  // Only the default reprs Python builds from a type name, so a lesson that deliberately prints its own
  // "<invoice 44 at 0x1F>" is recorded exactly as Python produced it.
  return text.replace(
    /(<(?:(?:bound |built-in )?(?:function|method)|[A-Za-z_][\w.]*(?: object)?) [^<>]*?at )0x[0-9a-fA-F]+(>)/g,
    '$10x...$2',
  );
}

/** The same, through any JSON value a probe can return. */
export function stableValue(v: unknown): unknown {
  if (typeof v === 'string') return stable(v);
  if (Array.isArray(v)) return v.map(stableValue);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, stableValue(x)]));
  }
  return v;
}

/** A run plus a verifier-only diagnostic, stripped again before the data is written for the browser. */
type Diagnosed = GeneratedRun & { probeErrors?: Record<string, string> };

/** How a combination reads in an error message, e.g. `start="0", stop="5"`. */
function describe(knobs: readonly Knob[], picks: readonly number[]): string {
  return knobs.map((k, i) => `${k.id}=${quote(knobChoices(k)[picks[i]]?.value ?? '')}`).join(', ');
}

function checkOneKnob(sc: Scope, k: Knob, where: string): boolean {
  let ok = true;
  if (!nonEmpty(k.label)) sc.error(`${where}: label is empty (it names the control in plain words)`);
  if (isRange(k)) {
    if (!isInt(k.min) || !isInt(k.max)) {
      sc.error(`${where}: a slider needs whole-number min and max`);
      return false;
    }
    const stops = k.max - k.min + 1;
    if (stops < 2) {
      sc.error(`${where}: max must be above min (a slider with one stop is not a control)`);
      ok = false;
    }
    if (stops > MAX_SLIDER_STOPS) {
      sc.error(`${where}: ${stops} stops; keep a slider to ${MAX_SLIDER_STOPS} or fewer`);
      ok = false;
    }
    if (k.start !== undefined && (!isInt(k.start) || k.start < k.min || k.start > k.max)) {
      sc.error(`${where}: start must be a whole number between min and max`);
    }
    return ok;
  }
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
  return ok;
}

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
    if (!checkOneKnob(sc, k, where)) ok = false;
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

/** Probes must be expressions, and any marker inside one must name a real knob. */
function checkProbes(sc: Scope, x: Experiment, knobIds: Set<string>): void {
  for (const [id, expr] of Object.entries(x.probes ?? {})) {
    if (!KEBAB.test(id)) sc.error(`probe ${quote(id)}: id must be kebab-case`);
    if (!nonEmpty(expr)) {
      sc.error(`probe ${quote(id)}: expression is empty`);
      continue;
    }
    for (const m of markerIds(expr)) {
      if (!knobIds.has(m)) sc.error(`probe ${quote(id)} uses ⟦${m}⟧ but there is no knob with that id`);
    }
  }
}

function checkVisual(sc: Scope, v: Visual, probeIds: Set<string>): void {
  const needs = (id: unknown, field: string) => {
    if (!nonEmpty(id)) {
      sc.error(`visual: ${field} must name a probe`);
      return;
    }
    if (!probeIds.has(id)) sc.error(`visual: ${field} names ${quote(id)} but there is no probe with that id`);
  };
  if (v.kind === 'sequence') {
    needs(v.items, 'items');
    if (v.picked !== undefined) needs(v.picked, 'picked');
    return;
  }
  if (v.kind === 'numberline') {
    if (!isInt(v.min) || !isInt(v.max) || v.max <= v.min) sc.error('visual: a number line needs whole-number min and max, with max above min');
    else if (v.max - v.min > 60) sc.error(`visual: a number line from ${v.min} to ${v.max} has too many marks to read`);
    needs(v.picked, 'picked');
    if (v.at !== undefined) needs(v.at, 'at');
    return;
  }
  if (v.kind === 'bars') {
    needs(v.values, 'values');
    if (v.labels !== undefined) needs(v.labels, 'labels');
    if (v.max !== undefined && (typeof v.max !== 'number' || !Number.isFinite(v.max) || v.max <= 0)) {
      sc.error('visual: max must be a positive number (the top of the scale)');
    }
    return;
  }
  if (v.kind === 'plot') {
    const series = arr(v.series) as Loose[];
    if (series.length === 0 || series.length > 4) {
      sc.error(`visual: a plot needs 1 to 4 series (has ${series.length})`);
      return;
    }
    for (const [i, one] of series.entries()) {
      if (!one || !nonEmpty(one.label)) sc.error(`visual: series ${i + 1} needs a label`);
      needs(one?.probe, `series ${i + 1} probe`);
    }
    if (v.marker !== undefined) needs(v.marker, 'marker');
    return;
  }
  sc.error(`visual: unknown kind ${quote(String((v as Loose).kind))}`);
}

/** Schema and authoring checks. Returns false when the experiment cannot be run. */
function checkStatic(sc: Scope, x: Experiment): boolean {
  const t = x as unknown as Loose;
  if (!x || typeof x !== 'object') {
    sc.error('experiment is not an object');
    return false;
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
    sc.error(`${total} combinations of the controls; keep it to ${MAX_COMBOS} or fewer (every one is run and shipped)`);
    return false;
  }
  if (total > BUSY_COMBOS) sc.warn(`${total} combinations; consider a shorter slider or splitting this into two experiments`);

  const knobIds = new Set(knobs.map((k) => k.id));
  checkProbes(sc, x, knobIds);
  const probeIds = new Set(Object.keys(x.probes ?? {}));
  if (x.visual) {
    if (probeIds.size === 0) sc.error('visual is set but there are no probes for it to draw from');
    else checkVisual(sc, x.visual, probeIds);
  }

  const lineCount = x.template.replace(/\n$/, '').split('\n').length;
  if (x.watch !== undefined) {
    const watch = arr(x.watch);
    if (watch.length === 0 || !watch.every(nonEmpty)) sc.error('watch must be a non-empty list of variable names');
    if (watch.length > 4) sc.error(`watch has ${watch.length} names; 4 columns is the most that stays readable`);
    if (!isInt(x.anchorLine) || (x.anchorLine as number) < 1 || (x.anchorLine as number) > lineCount) {
      sc.error(`anchorLine must be a line number of the template (1 to ${lineCount}) when watch is set`);
      return false;
    }
  } else if (x.anchorLine !== undefined) {
    sc.warn('anchorLine is set but watch is not, so no variable table is shown');
  }

  for (const key of Object.keys(x.notes ?? {})) {
    const parts = key.split('-');
    const valid = parts.length === knobs.length
      && parts.every((p, i) => /^\d+$/.test(p) && Number(p) < knobChoices(knobs[i]).length);
    if (!valid) sc.error(`notes key ${quote(key)} is not a combination of choice indexes (expected ${knobs.length} numbers joined with "-")`);
  }
  return true;
}

/** Run one combination: the program, plus the variable table and the probe values it needs. */
function runCombo(h: Harness, x: Experiment, picks: number[]): Diagnosed {
  const { code } = fillTemplate(x.template, x.knobs, picks);
  const watch = x.watch ?? [];
  const probeEntries = Object.entries(x.probes ?? {});
  const run: Diagnosed = { stdout: '' };

  if (watch.length > 0 && isInt(x.anchorLine)) {
    const r = h.trace(code, watch as string[], x.anchorLine, []);
    run.stdout = stable(r.stdout);
    run.rows = r.rows.map((row) => row.map(stable));
    if (r.error) run.error = { type: r.error.type, message: stable(r.error.message), line: r.error.line ?? 0 };
  }
  if (probeEntries.length > 0) {
    // Probe expressions follow the controls too, so a picture can ask "which indexes did this slice take?".
    const filled = Object.fromEntries(probeEntries.map(([id, expr]) => [id, fillTemplate(expr, x.knobs, picks).code]));
    const r = h.probe(code, filled);
    run.stdout = stable(r.stdout);
    run.values = stableValue(r.values) as Record<string, unknown>;
    if (r.error) run.error = { type: r.error.type, message: stable(r.error.message), line: r.error.line ?? 0 };
    if (r.probeErrors) run.probeErrors = r.probeErrors;
    return run;
  }
  if (watch.length > 0) return run;

  const r = h.runCapture(code, []);
  run.stdout = stable(r.stdout);
  if (r.error) run.error = { type: r.error.type, message: stable(r.error.message), line: r.error.line ?? 0 };
  return run;
}

/** What the student would see, as one string, for comparing combinations. */
function shown(run: GeneratedRun | undefined): string {
  const out = (run?.stdout ?? '').replace(/\r\n?/g, '\n').replace(/\s+$/, '');
  const pic = run?.values ? JSON.stringify(run.values) : '';
  return run?.error ? `${out}\n!${run.error.type}: ${run.error.message}${pic}` : `${out}${pic}`;
}

/** The probe ids a visual draws from. */
function visualProbes(v: Visual): string[] {
  if (v.kind === 'sequence') return [v.items, ...(v.picked ? [v.picked] : [])];
  if (v.kind === 'numberline') return [v.picked, ...(v.at ? [v.at] : [])];
  if (v.kind === 'bars') return [v.values, ...(v.labels ? [v.labels] : [])];
  return [...v.series.map((one) => one.probe), ...(v.marker ? [v.marker] : [])];
}

/**
 * A picture that never changes is decoration, not a visualisation: the whole promise of these cards is
 * that moving a control redraws what you are looking at. At least one probe the picture draws from has
 * to differ between two combinations. (A `sequence`'s `items` is allowed to be constant, which is why
 * this asks for one varying probe rather than all of them.)
 */
function checkVisualMoves(sc: Scope, x: Experiment, runs: Record<string, Diagnosed>, combos: number[][]): void {
  if (!x.visual || combos.length < 2) return;
  const ids = visualProbes(x.visual).filter(Boolean);
  const moves = ids.some((id) => {
    const seen = new Set<string>();
    for (const c of combos) seen.add(JSON.stringify(runs[comboKey(c)]?.values?.[id]));
    return seen.size > 1;
  });
  if (!moves) {
    sc.error(`the picture never changes: ${ids.map(quote).join(' and ')} evaluate to the same thing for every combination, so the controls move the output but not the visual`);
  }
}

function checkProbeResults(sc: Scope, x: Experiment, runs: Record<string, Diagnosed>, combos: number[][]): void {
  if (!x.probes) return;
  for (const c of combos) {
    const run = runs[comboKey(c)];
    // A probe may legitimately fail when the program itself crashed; only a clean run must produce values.
    if (!run || run.error) continue;
    const errors = run.probeErrors;
    if (errors) {
      const [id, msg] = Object.entries(errors)[0];
      sc.error(`with ${describe(x.knobs, c)} the probe ${quote(id)} failed (${msg})`);
      return;
    }
  }
  const v = x.visual;
  if (!v) return;
  // Every clean combination, not just the first: a probe that returns None at one slider position would
  // otherwise pass here and then quietly refuse to draw in the browser.
  const clean = combos.filter((c) => runs[comboKey(c)] && !runs[comboKey(c)].error);
  if (clean.length === 0) return;
  let reported = false;
  const fail = (msg: string) => {
    if (reported) return;
    reported = true;
    sc.error(msg);
  };
  for (const c of clean) {
    const values = runs[comboKey(c)].values ?? {};
    const at = ` (with ${describe(x.knobs, c)})`;
    const wantList = (id: string, what: string) => {
      if (!Array.isArray(values[id])) fail(`probe ${quote(id)} must evaluate to a list for ${what}${at}; got ${quote(String(values[id]))}, so wrap it in list(...)`);
    };
    checkOneVisual(v, values, wantList, fail, at);
  }
  return;
}

/** The shape a single combination's probe values must have for the picture to draw. */
function checkOneVisual(
  v: Visual, values: Record<string, unknown>,
  wantList: (id: string, what: string) => void, fail: (msg: string) => void, at: string,
): void {
  if (v.kind === 'sequence') {
    wantList(v.items, 'the boxes');
    if (v.picked) wantList(v.picked, 'the highlighted positions');
  } else if (v.kind === 'numberline') {
    wantList(v.picked, 'the marked numbers');
    if (v.at && typeof values[v.at] !== 'number') {
      fail(`probe ${quote(v.at)} must evaluate to one number for the "you are here" ring${at}`);
    }
  } else if (v.kind === 'bars') {
    wantList(v.values, 'the bars');
    const nums = values[v.values];
    if (Array.isArray(nums) && !nums.every((n) => typeof n === 'number' && Number.isFinite(n))) {
      fail(`probe ${quote(v.values)} must evaluate to a list of numbers for the bars${at}`);
    }
    if (v.labels) {
      wantList(v.labels, 'the bar labels');
      const labels = values[v.labels];
      if (Array.isArray(nums) && Array.isArray(labels) && nums.length !== labels.length) {
        fail(`probe ${quote(v.labels)} gives ${labels.length} labels for ${nums.length} bars${at}; they must match or the labels name the wrong bars`);
      }
    }
  } else if (v.kind === 'plot') {
    for (const one of v.series) {
      wantList(one.probe, `the "${one.label}" curve`);
      const pts = values[one.probe];
      if (!Array.isArray(pts)) continue;
      const bad = pts.find((pt) => !Array.isArray(pt) || pt.length !== 2
        || !pt.every((n) => typeof n === 'number' && Number.isFinite(n)));
      if (bad !== undefined) {
        fail(`probe ${quote(one.probe)} must evaluate to a list of [x, y] number pairs${at}; got ${JSON.stringify(bad)}`);
      } else if (pts.length < 2) {
        fail(`probe ${quote(one.probe)} gives ${pts.length} point(s)${at}; a curve needs at least 2`);
      }
    }
    if (v.marker) {
      wantList(v.marker, 'the marker dots');
      const pts = values[v.marker];
      if (Array.isArray(pts) && !pts.every((pt) => Array.isArray(pt) && pt.length === 2
        && pt.every((n) => typeof n === 'number' && Number.isFinite(n)))) {
        fail(`probe ${quote(v.marker)} must evaluate to a list of [x, y] number pairs${at}`);
      }
    }
  }
}

/** Move probe values that never change into one shared block, so they ship once instead of per run. */
function hoistShared(runs: Record<string, Diagnosed>): GeneratedExperiment {
  const keys = Object.keys(runs);
  const first = keys.length ? runs[keys[0]].values : undefined;
  if (!first) return { runs };
  const shared: Record<string, unknown> = {};
  for (const [id, value] of Object.entries(first)) {
    const asText = JSON.stringify(value);
    if (keys.every((k) => JSON.stringify(runs[k].values?.[id]) === asText)) shared[id] = value;
  }
  if (Object.keys(shared).length === 0) return { runs };
  for (const k of keys) {
    const values = runs[k].values;
    if (!values) continue;
    for (const id of Object.keys(shared)) delete values[id];
    if (Object.keys(values).length === 0) delete runs[k].values;
  }
  return { shared, runs };
}

function checkRuntime(sc: Scope, x: Experiment, runs: Record<string, Diagnosed>): void {
  const combos = allCombos(x.knobs);
  const outputs = new Map(combos.map((c) => [comboKey(c), shown(runs[comboKey(c)])]));

  // A fragment that does not fit the template is an authoring bug, not a lesson. A runtime error
  // (IndexError, ZeroDivisionError) often is the lesson, so only compile errors are fatal here.
  for (const c of combos) {
    const type = runs[comboKey(c)]?.error?.type;
    if (type === 'SyntaxError' || type === 'IndentationError' || type === 'TabError') {
      sc.error(`with ${describe(x.knobs, c)} the program does not compile (${type}: ${runs[comboKey(c)]?.error?.message}); every combination must be valid Python`);
    } else if (type === 'TimeoutError') {
      sc.error(`with ${describe(x.knobs, c)} the program runs forever; every combination must finish`);
    }
  }

  if (new Set(outputs.values()).size === 1) {
    sc.error('every combination shows the same thing, so the controls teach nothing; change the choices');
    return;
  }

  // A control nobody can see the effect of is a decoration. Vary it alone from every other setting.
  x.knobs.forEach((k, ki) => {
    const size = knobChoices(k).length;
    const matters = combos.some((c) => {
      for (let j = 0; j < size; j++) {
        if (j === c[ki]) continue;
        const other = c.slice();
        other[ki] = j;
        if (outputs.get(comboKey(other)) !== outputs.get(comboKey(c))) return true;
      }
      return false;
    });
    if (!matters) sc.warn(`knob ${quote(k.id)} never changes what is shown, whatever the other controls are set to`);
  });

  checkProbeResults(sc, x, runs, combos);
  checkVisualMoves(sc, x, runs, combos);

  if ((x.watch ?? []).length > 0) {
    for (const c of combos) {
      const rows = runs[comboKey(c)]?.rows ?? [];
      if (rows.length > MAX_WATCH_ROWS) {
        sc.warn(`one combination fills the variable table with ${rows.length} rows; keep it under ${MAX_WATCH_ROWS} (fewer loop passes)`);
        break;
      }
    }
    if (!combos.some((c) => (runs[comboKey(c)]?.rows ?? []).length > 0)) {
      sc.error(`line ${x.anchorLine} never runs, so the variable table is always empty`);
    }
  }
}

/**
 * Check and run a single experiment. Shared by a topic's experiments and by a lesson's own interactive
 * block, so both get exactly the same guarantees: every combination compiles, runs and is recorded.
 */
export function checkOneExperiment(
  sc: Scope, x: Experiment, h: Harness | null, idPattern: RegExp, idHint: string,
): GeneratedExperiment | null {
  if (!nonEmpty((x as unknown as Loose).id) || !idPattern.test(String(x.id))) sc.error(`experiment id must look like ${idHint}`);
  if (!checkStatic(sc, x)) return null;
  if (!h) return null;
  const runs: Record<string, Diagnosed> = {};
  for (const picks of allCombos(x.knobs)) runs[comboKey(picks)] = runCombo(h, x, picks);
  checkRuntime(sc, x, runs);
  for (const r of Object.values(runs)) delete r.probeErrors;
  return hoistShared(runs);
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
    const gen = checkOneExperiment(sc, x, h, new RegExp(`^t${info.num}-x[1-9]$`), `t${info.num}-xK (K = 1..9)`);
    if (gen) out[x.id] = gen;
  }
  return out;
}
