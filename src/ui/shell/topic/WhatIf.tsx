// "What if" tab: change one part of a program with a control and see the real output change.
//
// Nothing here runs Python. The verifier ran every combination of every control in real Python and wrote
// the results to src/content/generated/experiments/<topic>.json, so a click answers instantly, works
// before Python has started, and shows output that is true by construction rather than typed by hand.
import { useMemo, useState } from 'preact/hooks';
import {
  changedLines, comboKey, defaultPicks, fillTemplate, noteFor, outputLines,
} from '../../../content/experiments.ts';
import type { Picks } from '../../../content/experiments.ts';
import type { Experiment, GeneratedExperiment, GeneratedExperiments, Topic } from '../../../content/schema.ts';
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

interface CardState { picks: number[]; prev: string[] }

function ExperimentCard({ x, runs }: { x: Experiment; runs: GeneratedExperiment }) {
  // `prev` starts as the opening output so nothing is marked as changed until the student changes something.
  const [state, setState] = useState<CardState>(() => {
    const picks = defaultPicks(x.knobs);
    return { picks, prev: outputLines(runs[comboKey(picks)]) };
  });

  const run = runs[comboKey(state.picks)];
  const filled = useMemo(() => fillTemplate(x.template, x.knobs, state.picks), [x, state.picks]);
  const lines = outputLines(run);
  const changed = changedLines(state.prev, lines);
  const note = noteFor(x, state.picks as Picks);
  const watch = x.watch ?? [];

  const choose = (knobIndex: number, choiceIndex: number) => {
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
            <div key={k.id} class="wi-knob">
              <span class="wi-knob-label" id={groupId}>{k.label}</span>
              <Segmented
                size="sm"
                labelledBy={groupId}
                value={String(state.picks[ki])}
                options={k.choices.map((c, ci) => ({
                  value: String(ci),
                  label: <span class={c.caption ? 'wi-choice-text' : 'wi-choice-code'}>{c.caption ?? c.value}</span>,
                  title: c.caption ? c.value : undefined,
                }))}
                onChange={(v) => choose(ki, Number(v))}
              />
            </div>
          );
        })}
      </div>

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
  const ready = list.filter((x) => generated[x.id] && Object.keys(generated[x.id]).length > 0);
  if (ready.length === 0) {
    return <div class="tp-empty">The what-if experiments for this topic are being written.</div>;
  }
  return (
    <div class="tp-read wi-list">
      {ready.map((x) => <ExperimentCard key={x.id} x={x} runs={generated[x.id]} />)}
    </div>
  );
}
