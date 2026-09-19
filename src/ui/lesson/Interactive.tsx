// The blocks a reader answers rather than reads: a quiz, a prediction, a drag-to-order, a matching
// exercise and a click-to-annotate program.
//
// Nothing here decides what Python does. A prediction is checked against the output the verifier
// recorded, and an ordering is checked against the order the verifier proved runs.
import { useMemo, useRef, useState } from 'preact/hooks';
import type { LessonError } from '../../content/lessonSchema.ts';
import { CodeBlock } from '../components/CodeBlock.tsx';
import { Icon } from '../components/Icon.tsx';
import { InlineMd, Markdown } from '../components/Markdown.tsx';
import { openInPlayground } from '../workbench/openInPlayground.ts';

/** Deterministic shuffle: the same block always presents in the same order, so a reader can come back. */
function shuffled<T>(items: readonly T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    const j = Math.abs(h) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  // A shuffle that happens to be the answer would mark a reader correct for doing nothing.
  if (out.length > 1 && out.every((v, i) => v === items[i])) [out[0], out[1]] = [out[1], out[0]];
  return out;
}

const normalise = (t: string) =>
  t.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');

// ---------- quiz ----------

export function Quiz({ prompt, code, options }: {
  prompt: string; code?: string;
  options: readonly { text: string; correct?: boolean; why: string }[];
}) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const found = [...picked].some((i) => options[i]?.correct);
  return (
    <div class="ib ib-quiz">
      <p class="ib-tag">Your turn</p>
      <Markdown text={prompt} class="lb-md" />
      {code ? <CodeBlock code={code} numbered label="Code for this question" /> : null}
      <ul class="ib-options">
        {options.map((o, i) => {
          const chosen = picked.has(i);
          const state = !chosen ? '' : o.correct ? ' is-right' : ' is-wrong';
          return (
            <li key={o.text}>
              <button
                type="button"
                class={`ib-option${state}`}
                aria-pressed={chosen}
                disabled={found && !chosen}
                onClick={() => setPicked((s) => new Set(s).add(i))}
              >
                <span class="ib-mark" aria-hidden="true">
                  {chosen ? <Icon name={o.correct ? 'check' : 'x'} size={12} /> : null}
                </span>
                <span class="ib-option-t"><InlineMd text={o.text} /></span>
              </button>
              {chosen ? <div class="ib-why"><Markdown text={o.why} class="lb-md" /></div> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------- predict ----------

export function Predict({ code, ask, choices, stdout, error, slug }: {
  code: string; ask?: string; choices?: readonly string[]; stdout?: string; error?: LessonError; slug?: string;
}) {
  const [typed, setTyped] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const real = normalise(stdout ?? '');
  const answer = choices ? (picked ?? '') : typed;
  const right = normalise(answer) === real;
  const order = useMemo(() => (choices ? shuffled(choices, code) : []), [choices, code]);

  return (
    <div class="ib ib-predict">
      <p class="ib-tag">Predict</p>
      <Markdown text={ask ?? 'What does this print? Decide before you look.'} class="lb-md" />
      <CodeBlock code={code} numbered label="Code to predict" />
      {choices ? (
        <ul class="ib-options">
          {order.map((c) => (
            <li key={c}>
              <button
                type="button"
                class={`ib-option${picked === c ? ' is-picked' : ''}${shown && normalise(c) === real ? ' is-right' : ''}${shown && picked === c && !right ? ' is-wrong' : ''}`}
                aria-pressed={picked === c}
                disabled={shown}
                onClick={() => setPicked(c)}
              >
                <span class="ib-option-t mono">{c}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <label class="ib-field">
          <span class="ib-field-l">What it prints</span>
          <textarea
            class="ib-input"
            rows={Math.min(6, Math.max(2, real.split('\n').length))}
            value={typed}
            disabled={shown}
            spellcheck={false}
            onInput={(e) => setTyped((e.currentTarget as HTMLTextAreaElement).value)}
          />
        </label>
      )}
      {shown ? (
        <div class={`ib-verdict${right ? ' is-right' : ''}`}>
          <p class="ib-verdict-t">
            {right ? 'That is exactly it.' : 'Not quite. Here is what Python actually printed:'}
          </p>
          <p class="lb-tryit">
            <button type="button" class="btn ghost lb-tryit-btn" onClick={() => openInPlayground(code, `${slug ?? 'predict'}.py`)}>
              <Icon name="terminal" size={14} /> Try it yourself
            </button>
          </p>
          {right ? null : (
            <pre class="lb-out"><code>
              {(real === '' ? ['(nothing)'] : real.split('\n')).map((l, i) => (
                <span key={i} class="lb-out-line">{l || ' '}{'\n'}</span>
              ))}
              {error ? <span class="lb-out-line is-error">{error.type}{error.message ? `: ${error.message}` : ''}{'\n'}</span> : null}
            </code></pre>
          )}
        </div>
      ) : (
        <button
          type="button"
          class="btn primary ib-go"
          disabled={choices ? picked === null : typed.trim() === ''}
          onClick={() => setShown(true)}
        >
          Check my answer
        </button>
      )}
    </div>
  );
}

// ---------- drag to order ----------

/**
 * Dragging works by pointer and by keyboard: grab with Space or Enter, move with the arrow keys, drop
 * with Space again. A drag-only list would be unusable by keyboard and awkward on a phone.
 */
export function Order({ lines, ask, stdout }: {
  lines: readonly { text: string; indent: number }[]; ask?: string; stdout?: string;
}) {
  const key = lines.map((l) => l.text).join('|');
  const [items, setItems] = useState<number[]>(() => shuffled(lines.map((_, i) => i), key));
  const [held, setHeld] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const dragFrom = useRef<number | null>(null);

  const right = items.every((v, i) => v === i);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = items.slice();
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setItems(next);
    setChecked(false);
  };

  const onKey = (e: KeyboardEvent, pos: number) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      setHeld(held === pos ? null : pos);
      return;
    }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const to = pos + (e.key === 'ArrowDown' ? 1 : -1);
    if (held === pos) {
      move(pos, to);
      setHeld(Math.min(Math.max(to, 0), items.length - 1));
      queueMicrotask(() => {
        const el = document.querySelectorAll<HTMLElement>('.ib-order-item');
        el[Math.min(Math.max(to, 0), items.length - 1)]?.focus();
      });
    }
  };

  return (
    <div class="ib ib-order">
      <p class="ib-tag">Put it in order</p>
      <Markdown text={ask ?? 'These lines are shuffled. Drag them into the order that makes the program work.'} class="lb-md" />
      <ol class="ib-order-list">
        {items.map((idx, pos) => (
          <li key={idx}>
            <div
              class={`ib-order-item${held === pos ? ' is-held' : ''}${checked ? (idx === pos ? ' is-right' : ' is-wrong') : ''}`}
              tabIndex={0}
              role="button"
              aria-grabbed={held === pos}
              aria-label={`Line ${pos + 1} of ${items.length}: ${lines[idx].text}. Press space to pick up, then the arrow keys to move it.`}
              draggable
              onDragStart={() => { dragFrom.current = pos; }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragFrom.current !== null) move(dragFrom.current, pos);
                dragFrom.current = null;
              }}
              onKeyDown={(e) => onKey(e, pos)}
            >
              <span class="ib-grip" aria-hidden="true"><Icon name="grip" size={14} /></span>
              <code style={{ paddingLeft: `${lines[idx].indent * 1.6}em` }}>{lines[idx].text}</code>
            </div>
          </li>
        ))}
      </ol>
      <div class="ib-row">
        <button type="button" class="btn primary" onClick={() => setChecked(true)}>Check the order</button>
        {checked ? (
          <p class={`ib-verdict-t${right ? ' is-right' : ''}`}>
            {right ? `That runs, and prints ${JSON.stringify(normalise(stdout ?? ''))}.` : 'Not yet. The lines marked in red are not where they belong.'}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ---------- match ----------

export function Match({ pairs, ask }: { pairs: readonly { left: string; right: string }[]; ask?: string }) {
  const key = pairs.map((p) => p.left).join('|');
  const bank = useMemo(() => shuffled(pairs.map((p) => p.right), key), [key]);
  const [placed, setPlaced] = useState<(string | null)[]>(() => pairs.map(() => null));
  const [held, setHeld] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const put = (row: number, value: string) => {
    setPlaced((prev) => prev.map((v, i) => (v === value ? null : i === row ? value : v)));
    setHeld(null);
    setChecked(false);
  };
  const left = bank.filter((r) => !placed.includes(r));
  const done = placed.every((v) => v !== null);

  return (
    <div class="ib ib-match">
      <p class="ib-tag">Match them up</p>
      <Markdown text={ask ?? 'Drag each answer onto the thing it belongs to.'} class="lb-md" />
      <div class="ib-bank" aria-label="Answers to place">
        {left.map((r) => (
          <button
            key={r}
            type="button"
            class={`ib-chip${held === r ? ' is-held' : ''}`}
            aria-pressed={held === r}
            draggable
            onDragStart={() => setHeld(r)}
            onClick={() => setHeld(held === r ? null : r)}
          >
            <InlineMd text={r} />
          </button>
        ))}
        {left.length === 0 ? <p class="ib-bank-done">All placed.</p> : null}
      </div>
      <ul class="ib-match-rows">
        {pairs.map((p, i) => {
          const value = placed[i];
          const state = !checked || value === null ? '' : value === p.right ? ' is-right' : ' is-wrong';
          return (
            <li key={p.left} class={`ib-match-row${state}`}>
              <span class="ib-match-l"><InlineMd text={p.left} /></span>
              <button
                type="button"
                class={`ib-slot${value ? ' is-full' : ''}`}
                aria-label={value ? `${p.left}: ${value}. Click to take it back.` : `Drop an answer for ${p.left}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (held) put(i, held); }}
                onClick={() => {
                  if (held) put(i, held);
                  else if (value) { setPlaced((prev) => prev.map((v, j) => (j === i ? null : v))); setChecked(false); }
                }}
              >
                {value ? <InlineMd text={value} /> : <span class="ib-slot-hint">drop here</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <div class="ib-row">
        <button type="button" class="btn primary" disabled={!done} onClick={() => setChecked(true)}>Check</button>
        {checked ? (
          <p class={`ib-verdict-t${placed.every((v, i) => v === pairs[i].right) ? ' is-right' : ''}`}>
            {placed.every((v, i) => v === pairs[i].right) ? 'All correct.' : 'The ones in red are not matched yet.'}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ---------- annotate ----------

export function Annotate({ code, notes, ask }: { code: string; notes: Record<string, string>; ask?: string }) {
  const lines = code.replace(/\n$/, '').split('\n');
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div class="ib ib-annotate">
      <p class="ib-tag">Have a look</p>
      <Markdown text={ask ?? 'Click any highlighted line to find out what it does.'} class="lb-md" />
      <ol class="ib-anno-lines">
        {lines.map((line, i) => {
          const n = i + 1;
          const note = notes[String(n)];
          return (
            <li key={n}>
              <button
                type="button"
                class={`ib-anno-line${note ? ' has-note' : ''}${open === n ? ' is-open' : ''}`}
                disabled={!note}
                aria-expanded={note ? open === n : undefined}
                onClick={() => setOpen(open === n ? null : n)}
              >
                <span class="ib-anno-n" aria-hidden="true">{n}</span>
                <code>{line || ' '}</code>
              </button>
              {open === n && note ? <div class="ib-anno-note"><Markdown text={note} class="lb-md" /></div> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------- walkthrough ----------

export interface WalkStep { line: number; vars: Record<string, string>; out: number }

/**
 * Step through a recorded run: the current line, the variables as they stand, and the output so far.
 *
 * The whole run was recorded at verify time, so stepping is instant and nothing here works out what
 * Python would do. A value that changed on this step is marked, because "which one moved" is the
 * question a reader is actually asking.
 */
export function Walkthrough({ code, steps, stdout, ask }: {
  code: string; steps: readonly WalkStep[]; stdout: string; ask?: string;
}) {
  const [at, setAt] = useState(0);
  const lines = code.replace(/\n$/, '').split('\n');
  const step = steps[Math.min(at, steps.length - 1)];
  const prev = at > 0 ? steps[at - 1] : undefined;
  const printed = stdout.slice(0, step?.out ?? 0);
  const names = Object.keys(step?.vars ?? {});

  return (
    <div class="ib ib-walk">
      <p class="ib-tag">Step through it</p>
      <Markdown text={ask ?? 'Step through the program one line at a time and watch the values change.'} class="lb-md" />

      <div class="ib-walk-main">
        <pre class="code-block numbered ib-walk-code" aria-label="Program being stepped through">
          <code>
            {lines.map((l, i) => (
              <span key={i} class={`ln${step && step.line === i + 1 ? ' is-now' : ''}`}>{l || ' '}{'\n'}</span>
            ))}
          </code>
        </pre>

        <div class="ib-walk-side">
          <p class="ib-walk-h">Variables</p>
          {names.length === 0 ? (
            <p class="ib-walk-none">Nothing has been given a name yet.</p>
          ) : (
            <table class="ib-walk-vars">
              <tbody>
                {names.map((n) => {
                  const changed = prev && prev.vars[n] !== step.vars[n];
                  return (
                    <tr key={n} class={changed ? 'is-changed' : ''}>
                      <th scope="row">{n}</th>
                      <td>{step.vars[n]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p class="ib-walk-h">Printed so far</p>
          {printed === '' ? (
            <p class="ib-walk-none">Nothing yet.</p>
          ) : (
            <pre class="ib-walk-out"><code>{printed.replace(/\n$/, '')}</code></pre>
          )}
        </div>
      </div>

      <div class="ib-walk-bar">
        <button type="button" class="btn ghost" disabled={at === 0} onClick={() => setAt(0)} aria-label="Back to the start">
          <Icon name="refresh" size={14} />
        </button>
        <button type="button" class="btn ghost" disabled={at === 0} onClick={() => setAt(at - 1)}>
          <Icon name="chevronLeft" size={14} /> Back
        </button>
        <input
          type="range"
          class="wi-slider ib-walk-scrub"
          min={0}
          max={Math.max(0, steps.length - 1)}
          step={1}
          value={at}
          aria-label={`Step ${at + 1} of ${steps.length}, on line ${step?.line ?? 1}`}
          onInput={(e) => setAt(Number((e.currentTarget as HTMLInputElement).value))}
        />
        <span class="ib-walk-count num">{at + 1} / {steps.length}</span>
        <button
          type="button"
          class="btn primary"
          disabled={at >= steps.length - 1}
          onClick={() => setAt(at + 1)}
        >
          Next line <Icon name="chevronRight" size={14} />
        </button>
      </div>
    </div>
  );
}
