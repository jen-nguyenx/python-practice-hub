// Pure helpers shared by the "what if" UI and the content verifier.
//
// An experiment is a program with markers (⟦knobId⟧, the same marker style as cloze templates). Each
// knob offers a few single-line fragments. Every combination is run once by the verifier and the real
// output is written to src/content/generated/experiments/<topic>.json, so the browser never has to run
// Python to answer "what happens if I change this" — it looks the answer up.
import type { Experiment, GeneratedRun, Knob } from './schema.ts';

/** Ceiling on combinations per experiment. Keeps verify time sane and the controls comprehensible. */
export const MAX_COMBOS = 48;

const MARKER = /⟦([^⟧]*)⟧/g;

/** Which choice is selected for each knob, as indexes into `knob.choices`. */
export type Picks = readonly number[];

/** A combination's key in the generated data, e.g. [1, 0] -> "1-0". */
export function comboKey(picks: Picks): string {
  return picks.join('-');
}

export function defaultPicks(knobs: readonly Knob[]): number[] {
  return knobs.map(() => 0);
}

/** Every combination of choices, in a stable order (last knob varies fastest). */
export function allCombos(knobs: readonly Knob[]): number[][] {
  let rows: number[][] = [[]];
  for (const k of knobs) {
    const next: number[][] = [];
    for (const row of rows) {
      for (let i = 0; i < k.choices.length; i++) next.push([...row, i]);
    }
    rows = next;
  }
  return rows;
}

export function comboCount(knobs: readonly Knob[]): number {
  return knobs.reduce((n, k) => n * Math.max(1, k.choices.length), 1);
}

/** The substituted fragment's position in the filled code, so the UI can mark what changed. */
export interface Span { start: number; end: number; knob: number }
export interface Filled { code: string; spans: Span[] }

/**
 * Substitute the selected fragment for every marker. An unknown marker id is left in place so the
 * verifier reports it rather than the author silently losing a control.
 */
export function fillTemplate(template: string, knobs: readonly Knob[], picks: Picks): Filled {
  const indexById = new Map(knobs.map((k, i) => [k.id, i]));
  const spans: Span[] = [];
  let out = '';
  let last = 0;
  MARKER.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MARKER.exec(template))) {
    out += template.slice(last, m.index);
    const ki = indexById.get(m[1]);
    if (ki === undefined) {
      out += m[0];
    } else {
      const choices = knobs[ki].choices ?? [];
      const value = (choices[picks[ki] ?? 0] ?? choices[0])?.value ?? '';
      const start = out.length;
      out += value;
      spans.push({ start, end: out.length, knob: ki });
    }
    last = m.index + m[0].length;
  }
  out += template.slice(last);
  return { code: out, spans };
}

/** Marker ids used in a template, in order of appearance (duplicates included). */
export function markerIds(template: string): string[] {
  const ids: string[] = [];
  MARKER.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MARKER.exec(template))) ids.push(m[1]);
  return ids;
}

/** What the student sees in the output panel: printed lines, then the error line if it crashed. */
export function outputLines(run: GeneratedRun | undefined): string[] {
  if (!run) return [];
  const text = (run.stdout ?? '').replace(/\r\n?/g, '\n').replace(/\n$/, '');
  const lines = text === '' ? [] : text.split('\n');
  if (run.error) lines.push(`${run.error.type}${run.error.message ? `: ${run.error.message}` : ''}`);
  return lines;
}

/**
 * Which output lines differ from the previous selection, compared by position. Position is the right
 * comparison here: when a change shifts every line, seeing every line marked is the honest answer.
 */
export function changedLines(prev: readonly string[], cur: readonly string[]): boolean[] {
  return cur.map((line, i) => prev[i] !== line);
}

/** The note authored for this exact combination, if any. */
export function noteFor(x: Experiment, picks: Picks): string | undefined {
  return x.notes?.[comboKey(picks)];
}
