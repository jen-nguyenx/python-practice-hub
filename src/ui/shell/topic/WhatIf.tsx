// An interactive "what if" card: change one part of a program with a control and see the real output
// change. Rendered inside a lesson; the topic page has no tab of its own for these.
//
// Nothing here runs Python (or R). The verifier ran every combination of every control in the real language and wrote
// the results to src/content/generated/experiments/<topic>.json, so a click answers instantly, works
// before Python has started, and shows output that is true by construction rather than typed by hand.
// That is also what lets a slider redraw on every step while it is being dragged: the answers are already
// in memory, so there is nothing to wait for.
import { useMemo, useState } from 'preact/hooks';
import {
  changedLines, comboKey, defaultPicks, fillTemplate, isRange, knobChoices, noteFor, outputLines,
} from '../../../content/experiments.ts';
import type { Picks } from '../../../content/experiments.ts';
import type { Experiment, GeneratedExperiment, GeneratedRun, Knob, Visual } from '../../../content/schema.ts';
import { Markdown } from '../../components/Markdown.tsx';
import { Segmented } from '../../components/Segmented.tsx';
import { niceTicks } from './ticks.ts';
import { candlesOrNull, intsOrNull, labelsOrNull, numbersOrNull, pieceLines, pieces, pointsOrNull } from './whatIfLogic.ts';
import { useCodeLang } from '../../components/codeLang.ts';

/** The program, with the fragment each control put there marked so a change is visible in place. */
function KnobbedCode({ code, spans, label }: { code: string; spans: ReturnType<typeof fillTemplate>['spans']; label: string }) {
  const lines = useMemo(() => pieceLines(pieces(code, spans)), [code, spans]);
  return (
    <pre class="code-block numbered wi-code" role="group" aria-label={label}>
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

/**
 * `errorAt` is the index of the crash line, which outputLines puts last. -1 when the program finished.
 * `recorded` is false when this combination has no generated run, which can only happen if the data is
 * stale against the content. Claiming "this prints nothing" then would put words in Python's mouth.
 */
function Output({ recorded, lines, changed, errorAt }: { recorded: boolean; lines: string[]; changed: boolean[]; errorAt: number }) {
  if (!recorded) {
    return <p class="wi-out is-empty">This combination was not recorded. Run the content verifier.</p>;
  }
  if (lines.length === 0) {
    return (
      <div class="wi-out is-empty">
        <p>This prints nothing at all.</p>
      </div>
    );
  }
  return (
    <pre class="wi-out" role="group" aria-label="What this prints">
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
function NumberLine({ min, max, picked, at }: { min: number; max: number; picked: Set<number>; at?: number }) {
  const marks: number[] = [];
  for (let v = min; v <= max; v++) marks.push(v);
  const hits = [...picked].sort((a, b) => a - b);
  return (
    <div class="wi-vis">
      <div class="wi-nline" role="img" aria-label={`${hits.length ? `Marked: ${hits.join(', ')}` : 'Nothing is marked'}${at !== undefined ? `. You are at ${at}` : ''}`}>
        {marks.map((v) => (
          <div key={v} class={`wi-tick${picked.has(v) ? ' is-hit' : ''}${v === at ? ' is-at' : ''}`}>
            <span class="wi-dot" aria-hidden="true" />
            <span class="wi-tick-n">{v}</span>
          </div>
        ))}
      </div>
      {hits.length === 0 ? <p class="wi-note">No numbers come out, so the loop body never runs.</p> : null}
    </div>
  );
}


/** A bar per number. The tallest bar names its own value, so the scale is never a mystery. */
function Bars({ values, labels, top }: { values: number[]; labels: string[]; top?: number }) {
  // Scaled to the tallest bar, so standard errors or probabilities (all below 1) fill the track as counts
  // do. Only an all-zero chart falls back to 1, which is there to avoid dividing by zero.
  const peak = Math.max(top ?? 0, ...values.map((v) => Math.abs(v))) || 1;
  const hasNeg = values.some((v) => v < 0);
  // Every bar that reaches the top is marked, not just the first: singling one out of a tie would say
  // it was special when it is not.
  const tallest = values.length ? Math.max(...values.map((v) => Math.abs(v))) : 0;
  // Two decimals from 1 up; below 1, three significant figures, so 0.265 and 0.0123 keep their meaning.
  const round = (n: number) => (Number.isInteger(n) ? String(n)
    : Math.abs(n) >= 1 ? n.toFixed(2).replace(/\.?0+$/, '')
    : String(Number(n.toPrecision(3))));
  return (
    <div class="wi-vis">
      <div class="wi-bars" role="img" aria-label={values.map((v, i) => `${labels[i] ?? i + 1}: ${round(v)}`).join(', ') || 'No bars'}>
        {values.map((v, i) => (
          <div key={i} class="wi-bar-col">
            <span class="wi-bar-v">{round(v)}</span>
            <div class={`wi-bar-track${hasNeg ? ' has-neg' : ''}`}>
              <div
                class={`wi-bar${v < 0 ? ' is-neg' : ''}${tallest > 0 && Math.abs(v) === tallest ? ' is-peak' : ''}`}
                style={{ height: `${(Math.abs(v) / peak) * 100}%` }}
              />
            </div>
            {labels[i] !== undefined ? <span class="wi-bar-l">{labels[i]}</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

const SERIES_CLASS = ['is-a', 'is-b', 'is-c', 'is-d'];

/**
 * One or more curves on a single shared scale.
 *
 * Three things a chart has to get right and this one used to get wrong. The axis was drawn at the bottom
 * of the data, so on a payoff running from -5 the flat part sat exactly on what looked like a zero line
 * and the break-even read in the wrong place: zero is now its own line, drawn darker, wherever it falls.
 * There were two labels per axis, which is enough to see a curve rise and not enough to say what to;
 * there are round ticks now, with faint gridlines to carry the eye across. And the numbers on them are
 * chosen the way a person would choose them rather than taken from wherever the data happens to stop.
 */
function Plot({ series, xLabel, yLabel, marker, points }: {
  series: { label: string; points: [number, number][] }[]; xLabel?: string; yLabel?: string; marker?: [number, number][];
  points?: [number, number][];
}) {
  const all = [...series.flatMap((s) => s.points), ...(marker ?? []), ...(points ?? [])];
  if (all.length === 0) return <p class="wi-note">There is nothing to draw yet.</p>;
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(0, ...ys);
  const yMax = Math.max(0, ...ys);
  const spanX = xMax - xMin || 1;
  const spanY = yMax - yMin || 1;

  // Room inside the viewBox for every label: the axis names sit in the margins, not over the ticks.
  const W = 360;
  const H = 216;
  const padL = 46;
  const padR = 12;
  const padT = 24;
  const padB = 32;
  const px = (x: number) => padL + ((x - xMin) / spanX) * (W - padL - padR);
  const py = (y: number) => H - padB - ((y - yMin) / spanY) * (H - padT - padB);
  const tidy = (n: number) => {
    if (Number.isInteger(n)) return String(n);
    if (Math.abs(n) >= 1000) return String(Math.round(n));
    return n.toFixed(2).replace(/\.?0+$/, '');
  };

  // Whole ticks only where every value really is whole: an item count, a day, a month. Decided from the
  // points, not from the ends — a curve from 0 to 1 has whole ends and nothing whole in between.
  const yTicks = niceTicks(yMin, yMax, 4, ys.every(Number.isInteger));
  const xTicks = niceTicks(xMin, xMax, 4, xs.every(Number.isInteger));
  const zeroY = yMin < 0 && yMax > 0 ? py(0) : null;

  return (
    <div class="wi-vis">
      <svg class="wi-plot" viewBox={`0 0 ${W} ${H}`} role="img" preserveAspectRatio="xMidYMid meet"
        aria-label={series.map((s) => `${s.label}: from ${tidy(s.points[0]?.[1] ?? 0)} to ${tidy(s.points[s.points.length - 1]?.[1] ?? 0)}`).join('; ')}>
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line class="wi-grid" x1={padL} y1={py(t)} x2={W - padR} y2={py(t)} />
            <text class="wi-tick-t" x={padL - 6} y={py(t) + 3.5} text-anchor="end">{tidy(t)}</text>
          </g>
        ))}
        {xTicks.map((t) => (
          <g key={`x${t}`}>
            <line class="wi-grid" x1={px(t)} y1={padT} x2={px(t)} y2={H - padB} />
            <text class="wi-tick-t" x={px(t)} y={H - padB + 14} text-anchor="middle">{tidy(t)}</text>
          </g>
        ))}
        {/* Zero is not the bottom of the chart. On anything that can go negative it is the line that
            says whether you are ahead, so it is drawn darker than the grid and above it. */}
        {zeroY !== null ? <line class="wi-zero" x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} /> : null}
        <line class="wi-axis" x1={padL} y1={padT} x2={padL} y2={H - padB} />
        <line class="wi-axis" x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} />
        {yLabel ? <text class="wi-axis-t" x={0} y={11} text-anchor="start">{yLabel}</text> : null}
        {xLabel ? <text class="wi-axis-t" x={W - padR} y={H - 4} text-anchor="end">{xLabel}</text> : null}
        {/* The data under the curves: drawn first and faint, so a fitted line reads as running through it. */}
        {(points ?? []).map((p, i) => (
          <circle key={`p${i}`} class="wi-dotp" cx={px(p[0])} cy={py(p[1])} r={2.5} />
        ))}
        {series.map((s, i) => (
          <polyline
            key={s.label}
            class={`wi-curve ${SERIES_CLASS[i % SERIES_CLASS.length]}`}
            fill="none"
            points={s.points.map((p) => `${px(p[0])},${py(p[1])}`).join(' ')}
          />
        ))}
        {(marker ?? []).map((p, i) => (
          <circle key={`m${i}`} class={`wi-dotm ${SERIES_CLASS[i % SERIES_CLASS.length]}`} cx={px(p[0])} cy={py(p[1])} r={3.5} />
        ))}
      </svg>
      {series.length > 1 ? (
        <ul class="wi-legend">
          {series.map((s, i) => (
            <li key={s.label}><span class={`wi-key ${SERIES_CLASS[i % SERIES_CLASS.length]}`} aria-hidden="true" />{s.label}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * The bar chart a trading screen shows: one bar per period from low to high, a tick left for the open
 * and a tick right for the close. Filled means it closed below where it opened.
 *
 * Drawn as bars rather than as a line because a line hides the two things a trader reads first — how far
 * it travelled inside the period, and whether it finished above or below where it started.
 */
function Candles({ bars, labels, xLabel, yLabel }: {
  bars: [number, number, number, number][]; labels?: string[]; xLabel?: string; yLabel?: string;
}) {
  if (bars.length === 0) return <p class="wi-note">There is nothing to draw yet.</p>;
  const highs = bars.map((b) => b[1]);
  const lows = bars.map((b) => b[2]);
  const yMin = Math.min(...lows);
  const yMax = Math.max(...highs);
  const spanY = yMax - yMin || 1;

  const W = 360;
  const H = 216;
  const padL = 46;
  const padR = 12;
  const padT = 24;
  const padB = 32;
  const slot = (W - padL - padR) / bars.length;
  // A gap between bars so neighbours read as separate periods, and a tick long enough to see.
  const half = Math.max(2, Math.min(7, slot * 0.3));
  const cx = (i: number) => padL + slot * (i + 0.5);
  const py = (v: number) => H - padB - ((v - yMin) / spanY) * (H - padT - padB);
  const tidy = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ''));
  const ticks = niceTicks(yMin, yMax, 4, bars.every((b) => b.every(Number.isInteger)));

  return (
    <div class="wi-vis">
      <svg class="wi-plot wi-candles" viewBox={`0 0 ${W} ${H}`} role="img" preserveAspectRatio="xMidYMid meet"
        aria-label={`${bars.length} periods, from ${tidy(bars[0][0])} open to ${tidy(bars[bars.length - 1][3])} close, low ${tidy(yMin)}, high ${tidy(yMax)}`}>
        {ticks.map((t) => (
          <g key={`y${t}`}>
            <line class="wi-grid" x1={padL} y1={py(t)} x2={W - padR} y2={py(t)} />
            <text class="wi-tick-t" x={padL - 6} y={py(t) + 3.5} text-anchor="end">{tidy(t)}</text>
          </g>
        ))}
        <line class="wi-axis" x1={padL} y1={padT} x2={padL} y2={H - padB} />
        <line class="wi-axis" x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} />
        {yLabel ? <text class="wi-axis-t" x={0} y={11} text-anchor="start">{yLabel}</text> : null}
        {xLabel ? <text class="wi-axis-t" x={W - padR} y={H - 4} text-anchor="end">{xLabel}</text> : null}
        {bars.map((b, i) => {
          const [o, h, l, c] = b;
          const down = c < o;
          return (
            <g key={i} class={`wi-candle${down ? ' is-down' : ''}`}>
              <line class="wi-candle-range" x1={cx(i)} y1={py(h)} x2={cx(i)} y2={py(l)} />
              <line class="wi-candle-open" x1={cx(i) - half} y1={py(o)} x2={cx(i)} y2={py(o)} />
              <line class="wi-candle-close" x1={cx(i)} y1={py(c)} x2={cx(i) + half} y2={py(c)} />
            </g>
          );
        })}
        {labels ? labels.map((t, i) => (
          // Only every other label where the bars are tight, so they never overprint each other.
          (labels.length <= 8 || i % 2 === 0)
            ? <text key={`l${i}`} class="wi-tick-t" x={cx(i)} y={H - padB + 14} text-anchor="middle">{t}</text>
            : null
        )) : null}
      </svg>
    </div>
  );
}

function Drawing({ visual, values }: { visual: Visual; values: Record<string, unknown> }) {
  switch (visual.kind) {
    case 'sequence': {
      const items = labelsOrNull(values[visual.items]);
      if (!items || items.length === 0) return null;
      const picked = visual.picked ? intsOrNull(values[visual.picked]) : [];
      if (!picked) return null;
      return <Sequence items={items} picked={new Set(picked)} />;
    }
    case 'numberline': {
      const picked = intsOrNull(values[visual.picked]);
      if (!picked) return null;
      const raw = visual.at === undefined ? undefined : values[visual.at];
      return (
        <NumberLine
          min={visual.min}
          max={visual.max}
          picked={new Set(picked)}
          at={typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined}
        />
      );
    }
    case 'bars': {
      const nums = numbersOrNull(values[visual.values]);
      if (!nums || nums.length === 0) return null;
      const labels = visual.labels ? labelsOrNull(values[visual.labels]) : [];
      // Labels that do not line up one-to-one would name the wrong bars, so they are dropped entirely.
      const safe = labels && labels.length === nums.length ? labels : [];
      return <Bars values={nums} labels={safe} top={visual.max} />;
    }
    case 'candles': {
      const bars = candlesOrNull(values[visual.bars]);
      if (!bars) return null;
      const labels = visual.labels ? labelsOrNull(values[visual.labels]) : undefined;
      return <Candles bars={bars} labels={labels ?? undefined} xLabel={visual.xLabel} yLabel={visual.yLabel} />;
    }
    case 'plot': {
      const series: { label: string; points: [number, number][] }[] = [];
      for (const one of visual.series) {
        const pts = pointsOrNull(values[one.probe]);
        if (!pts) return null;
        series.push({ label: one.label, points: pts });
      }
      const marker = visual.marker ? pointsOrNull(values[visual.marker]) : undefined;
      if (visual.marker && !marker) return null;
      const points = visual.points ? pointsOrNull(values[visual.points]) : undefined;
      if (visual.points && !points) return null;
      return <Plot series={series} xLabel={visual.xLabel} yLabel={visual.yLabel} marker={marker ?? undefined} points={points ?? undefined} />;
    }
  }
}

function Picture({ visual, values }: { visual: Visual; values: Record<string, unknown> }) {
  return (
    <div class="wi-pane">
      {visual.caption ? <Markdown text={visual.caption} class="tp-md wi-vis-cap" /> : null}
      <Drawing visual={visual} values={values} />
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

/**
 * `compact` drops the eyebrow and title, for the lesson, where the step heading already names the
 * experiment. The intro stays either way: it tells the student what to do with the controls.
 */
export function ExperimentCard({ x, gen, compact }: { x: Experiment; gen: GeneratedExperiment; compact?: boolean }) {
  const runs = gen.runs;
  const lang = useCodeLang();
  // `prev` starts as the opening output so nothing is marked as changed until the student changes something.
  const [state, setState] = useState<CardState>(() => {
    const picks = defaultPicks(x.knobs);
    return { picks, prev: outputLines(runs[comboKey(picks)], lang) };
  });

  const run: GeneratedRun | undefined = runs[comboKey(state.picks)];
  // Probe values that never change are stored once for the whole experiment; a run's own values win.
  const values = { ...gen.shared, ...run?.values };
  const filled = useMemo(() => fillTemplate(x.template, x.knobs, state.picks), [x, state.picks]);
  const lines = outputLines(run, lang);
  const changed = changedLines(state.prev, lines);
  const note = noteFor(x, state.picks as Picks);
  const watch = x.watch ?? [];

  const onPick = (knobIndex: number, choiceIndex: number) => {
    setState((s) => {
      if (s.picks[knobIndex] === choiceIndex) return s;
      const picks = s.picks.slice();
      picks[knobIndex] = choiceIndex;
      return { picks, prev: outputLines(runs[comboKey(s.picks)], lang) };
    });
  };

  return (
    <article class="tp-card wi-card">
      <header class="wi-head">
        {compact ? null : <p class="tp-label">What if</p>}
        {compact ? null : <h2 class="tp-read-title">{x.title}</h2>}
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

      {/* With the program hidden the numbers take the whole width: on a card about the economics of a
          cargo, a column of Python beside the answer says the Python is the point. */}
      <div class={`wi-panes${x.hideProgram ? ' is-solo' : ''}`}>
        {x.hideProgram ? null : (
          <div class="wi-pane">
            <p class="tp-label">The program</p>
            <KnobbedCode code={filled.code} spans={filled.spans} label={`Program for: ${x.title}`} />
          </div>
        )}
        <div class="wi-pane">
          <p class="tp-label">
            {run?.error ? 'What happens' : x.hideProgram ? (x.outputLabel ?? 'The numbers') : 'What it prints'}
          </p>
          <Output recorded={run !== undefined} lines={lines} changed={changed} errorAt={run?.error ? lines.length - 1 : -1} />
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

