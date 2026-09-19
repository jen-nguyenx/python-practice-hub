// "What if" tab: change one part of a program with a control and see the real output change.
//
// Nothing here runs Python. The verifier ran every combination of every control in real Python and wrote
// the results to src/content/generated/experiments/<topic>.json, so a click answers instantly, works
// before Python has started, and shows output that is true by construction rather than typed by hand.
// That is also what lets a slider redraw on every step while it is being dragged: the answers are already
// in memory, so there is nothing to wait for.
import { useMemo, useState } from 'preact/hooks';
import {
  changedLines, comboKey, defaultPicks, fillTemplate, isRange, knobChoices, noteFor, outputLines,
} from '../../../content/experiments.ts';
import type { Picks } from '../../../content/experiments.ts';
import type {
  Experiment, GeneratedExperiment, GeneratedExperiments, GeneratedRun, Knob, Topic, Visual,
} from '../../../content/schema.ts';
import { Markdown } from '../../components/Markdown.tsx';
import { Segmented } from '../../components/Segmented.tsx';
import { pieceLines, pieces } from './whatIfLogic.ts';

/** The program, with the fragment each control put there marked so a change is visible in place. */
function KnobbedCode({ code, spans, label }: { code: string; spans: ReturnType<typeof fillTemplate>['spans']; label: string }) {
  const lines = useMemo(() => pieceLines(pieces(code, spans)), [code, spans]);
  return (
    <pre class="code-block numbered wi-code" aria-label={label}>
      <code>
        {lines.map((line, i) => (
          <span key={i} class="ln">
            {line.map((p, j) => (
              <span key={j} class={`tok-${p.t}${p.knob === null ? '' : ' wi-set'}`}>{p.text}</span>
            ))}
            {'\n'}
          </span>
        ))}
      </code>
    </pre>
  );
}

/** `errorAt` is the index of the crash line, which outputLines puts last. -1 when the program finished. */
function Output({ lines, changed, errorAt }: { lines: string[]; changed: boolean[]; errorAt: number }) {
  if (lines.length === 0) {
    return (
      <div class="wi-out is-empty">
        <p>This prints nothing at all.</p>
      </div>
    );
  }
  return (
    <pre class="wi-out" aria-label="What this prints">
      <code>
        {lines.map((line, i) => (
          <span key={i} class={`wi-line${changed[i] ? ' is-changed' : ''}${i === errorAt ? ' is-error' : ''}`}>{line || ' '}{'\n'}</span>
        ))}
      </code>
    </pre>
  );
}

function WatchTable({ names, rows }: { names: string[]; rows: string[][] }) {
  if (rows.length === 0) return <p class="wi-note">That line never runs this time, so there is nothing to show.</p>;
  return (
    <div class="wi-table-wrap">
      <table class="wi-table">
        <caption class="sr-only">Values each time that line finishes</caption>
        <thead>
          <tr>
            <th scope="col" class="wi-pass">Pass</th>
            {names.map((n) => <th key={n} scope="col">{n}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td class="wi-pass">{i + 1}</td>
              {names.map((n, j) => <td key={n}>{row[j] ?? ''}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- pictures ----------
// Probe values arrive from JSON, so nothing about their shape is guaranteed at runtime: coerce, never cast.

function asList(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function asLabels(v: unknown): string[] {
  return asList(v).map((x) => (typeof x === 'string' ? x : JSON.stringify(x) ?? ''));
}
function asIntSet(v: unknown): Set<number> {
  return new Set(asList(v).filter((x): x is number => typeof x === 'number' && Number.isInteger(x)));
}

/** One box per item with its position underneath: the shape of a slice, or of what a loop visited. */
function Sequence({ items, picked }: { items: string[]; picked: Set<number> }) {
  const chosen = items.map((it, i) => (picked.has(i) ? it : null)).filter((x) => x !== null);
  const label = chosen.length
    ? `Positions ${[...picked].sort((a, b) => a - b).join(', ')} selected: ${chosen.join('')}`
    : 'Nothing is selected';
  return (
    <div class="wi-vis">
      <div class="wi-seq" role="img" aria-label={label}>
        {items.map((it, i) => (
          <div key={i} class={`wi-cell${picked.has(i) ? ' is-picked' : ''}`}>
            <span class="wi-cell-v">{it === '' ? ' ' : it}</span>
            <span class="wi-cell-i">{i}</span>
          </div>
        ))}
      </div>
      {chosen.length === 0 ? <p class="wi-note">Nothing is selected, so the result is empty.</p> : null}
    </div>
  );
}

/** The whole numbers from min to max, with the ones the program produced marked. */
function NumberLine({ min, max, picked }: { min: number; max: number; picked: Set<number> }) {
  const marks: number[] = [];
  for (let v = min; v <= max; v++) marks.push(v);
  const hits = [...picked].sort((a, b) => a - b);
  return (
    <div class="wi-vis">
      <div class="wi-nline" role="img" aria-label={hits.length ? `Numbers produced: ${hits.join(', ')}` : 'No numbers are produced'}>
        {marks.map((v) => (
          <div key={v} class={`wi-tick${picked.has(v) ? ' is-hit' : ''}`}>
            <span class="wi-dot" aria-hidden="true" />
            <span class="wi-tick-n">{v}</span>
          </div>
        ))}
      </div>
      {hits.length === 0 ? <p class="wi-note">No numbers come out, so the loop body never runs.</p> : null}
    </div>
  );
}

function Picture({ visual, values }: { visual: Visual; values: Record<string, unknown> }) {
  if (visual.kind === 'sequence') {
    const items = asLabels(values[visual.items]);
    if (items.length === 0) return null;
    return (
      <div class="wi-pane">
        {visual.caption ? <Markdown text={visual.caption} class="tp-md wi-vis-cap" /> : null}
        <Sequence items={items} picked={visual.picked ? asIntSet(values[visual.picked]) : new Set()} />
      </div>
    );
  }
  return (
    <div class="wi-pane">
      {visual.caption ? <Markdown text={visual.caption} class="tp-md wi-vis-cap" /> : null}
      <NumberLine min={visual.min} max={visual.max} picked={asIntSet(values[visual.picked])} />
    </div>
  );
}

// ---------- controls ----------

function Control({ k, index, pick, onPick, groupId }: {
  k: Knob; index: number; pick: number; onPick: (knob: number, choice: number) => void; groupId: string;
}) {
  const choices = knobChoices(k);
  if (isRange(k)) {
    const current = choices[pick]?.value ?? String(k.min);
    return (
      <div class="wi-slider-row">
        <input
          type="range"
          class="wi-slider"
          id={`${groupId}-input`}
          min={0}
          max={Math.max(0, choices.length - 1)}
          step={1}
          value={pick}
          aria-labelledby={groupId}
          aria-valuetext={current}
          onInput={(e) => onPick(index, Number((e.currentTarget as HTMLInputElement).value))}
        />
        <output class="wi-slider-val" for={`${groupId}-input`}>{current}</output>
      </div>
    );
  }
  return (
    <Segmented
      size="sm"
      labelledBy={groupId}
      value={String(pick)}
      options={choices.map((c, ci) => ({
        value: String(ci),
        label: <span class={c.caption ? 'wi-choice-text' : 'wi-choice-code'}>{c.caption ?? c.value}</span>,
        title: c.caption ? c.value : undefined,
      }))}
      onChange={(v) => onPick(index, Number(v))}
    />
  );
}

interface CardState { picks: number[]; prev: string[] }

function ExperimentCard({ x, gen }: { x: Experiment; gen: GeneratedExperiment }) {
  const runs = gen.runs;
  // `prev` starts as the opening output so nothing is marked as changed until the student changes something.
  const [state, setState] = useState<CardState>(() => {
    const picks = defaultPicks(x.knobs);
    return { picks, prev: outputLines(runs[comboKey(picks)]) };
  });

  const run: GeneratedRun | undefined = runs[comboKey(state.picks)];
  // Probe values that never change are stored once for the whole experiment; a run's own values win.
  const values = { ...gen.shared, ...run?.values };
  const filled = useMemo(() => fillTemplate(x.template, x.knobs, state.picks), [x, state.picks]);
  const lines = outputLines(run);
  const changed = changedLines(state.prev, lines);
  const note = noteFor(x, state.picks as Picks);
  const watch = x.watch ?? [];

  const onPick = (knobIndex: number, choiceIndex: number) => {
    setState((s) => {
      if (s.picks[knobIndex] === choiceIndex) return s;
      const picks = s.picks.slice();
      picks[knobIndex] = choiceIndex;
      return { picks, prev: outputLines(runs[comboKey(s.picks)]) };
    });
  };

  return (
    <article class="tp-card wi-card">
      <header class="wi-head">
        <p class="tp-label">What if</p>
        <h2 class="tp-read-title">{x.title}</h2>
        <Markdown text={x.intro} class="tp-md wi-intro" />
      </header>

      <div class="wi-knobs">
        {x.knobs.map((k, ki) => {
          const groupId = `${x.id}-${k.id}`;
          return (
            <div key={k.id} class={`wi-knob${isRange(k) ? ' is-slider' : ''}`}>
              <span class="wi-knob-label" id={groupId}>{k.label}</span>
              <Control k={k} index={ki} pick={state.picks[ki]} onPick={onPick} groupId={groupId} />
            </div>
          );
        })}
      </div>

      {x.visual ? <Picture visual={x.visual} values={values} /> : null}

      <div class="wi-panes">
        <div class="wi-pane">
          <p class="tp-label">The program</p>
          <KnobbedCode code={filled.code} spans={filled.spans} label={`Program for: ${x.title}`} />
        </div>
        <div class="wi-pane">
          <p class="tp-label">{run?.error ? 'What happens' : 'What it prints'}</p>
          <Output lines={lines} changed={changed} errorAt={run?.error ? lines.length - 1 : -1} />
        </div>
      </div>

      {watch.length > 0 ? (
        <div class="wi-pane wi-watch">
          <p class="tp-label">Line {x.anchorLine}, each time round</p>
          <WatchTable names={watch} rows={run?.rows ?? []} />
        </div>
      ) : null}

      {note ? (
        <div class="wi-note-box">
          <Markdown text={note} class="tp-md" />
        </div>
      ) : null}

      <footer class="wi-takeaway">
        <p class="tp-label">The point</p>
        <Markdown text={x.takeaway} class="tp-md" />
      </footer>
    </article>
  );
}

export function WhatIfTab({ topic, generated }: { topic: Topic; generated: GeneratedExperiments | null }) {
  const list = topic.experiments ?? [];
  if (list.length === 0) {
    return <div class="tp-empty">The what-if experiments for this topic are being written.</div>;
  }
  if (!generated) return <div class="tp-empty">Loading…</div>;
  const ready = list.filter((x) => Object.keys(generated[x.id]?.runs ?? {}).length > 0);
  if (ready.length === 0) {
    return <div class="tp-empty">The what-if experiments for this topic are being written.</div>;
  }
  return (
    <div class="tp-read wi-list">
      {ready.map((x) => <ExperimentCard key={x.id} x={x} gen={generated[x.id]} />)}
    </div>
  );
}
