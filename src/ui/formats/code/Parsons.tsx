// Parsons puzzle: move lines from "Lines" into "Your program", order them and (when it matters) indent them.
// Pointer: click moves a line between columns, drag reorders or moves. Keyboard: see the help line.
import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { MistakeId } from '../../../content/ids.ts';
import type { FormatProps } from '../../../engine/types.ts';
import type { QuestionOf } from '../../../content/schema.ts';
import type { TestsResult } from '../../../runtime/protocol.ts';
import { assembleParsons, gradeFromTests } from '../../../engine/grade.ts';
import { py } from '../../../app/services.ts';
import { Button } from '../../components/Button.tsx';
import { Callout } from '../../components/Callout.tsx';
import { CodeBlock } from '../../components/CodeBlock.tsx';
import { Icon } from '../../components/Icon.tsx';
import { tokenize } from '../../components/highlight.ts';
import { ExplainError } from '../../workbench/ExplainError.tsx';
import { isStarting } from '../../workbench/plain.ts';
import { runTestsLogged } from '../../workbench/runner.ts';
import { kbdRun, useRunShortcuts } from '../../workbench/shortcuts.ts';
import { TestsTable } from '../../workbench/TestsTable.tsx';
import { stableShuffle } from './logic.ts';
import './code.css';

interface Item { id: string; text: string; indent: number; distractor: boolean; mistake?: MistakeId }
interface Placed { id: string; indent: number }
interface Draft { placed: Placed[]; removed: string[] }
type ListId = 'pool' | 'prog';

const MAX_INDENT = 4;

function readDraft(d: unknown, ids: Set<string>): Draft | null {
  if (!d || typeof d !== 'object') return null;
  const placed = (d as Draft).placed;
  const removed = (d as Draft).removed;
  if (!Array.isArray(placed)) return null;
  return {
    placed: placed.filter((p) => p && ids.has(p.id) && typeof p.indent === 'number'),
    removed: Array.isArray(removed) ? removed.filter((r) => ids.has(r)) : [],
  };
}

function CodeLine({ text }: { text: string }) {
  return <>{tokenize(text).map((t, i) => (t.t === 'p' ? t.v : <span key={i} class={`tok-${t.t}`}>{t.v}</span>))}</>;
}

interface DragState { id: string; from: ListId; pointerId: number; startX: number; startY: number; grabX: number; grabY: number; x: number; y: number; active: boolean; width: number }

export function Parsons(props: FormatProps<QuestionOf<'parsons'>>) {
  const { q, revealed, locked, mode, checksLeft, topicId } = props;
  const testMode = mode === 'topic-test' || mode === 'midsem';

  const items = useMemo<Item[]>(() => [
    ...q.lines.map((l, i) => ({ id: `l${i}`, text: l.text, indent: l.indent, distractor: false })),
    ...q.distractors.map((d, i) => ({ id: `d${i}`, text: d.text, indent: d.indent, distractor: true, mistake: d.mistake })),
  ], [q]);
  const byId = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);
  const shuffled = useMemo(() => stableShuffle(items, q.id), [items, q.id]);
  const initial = useMemo(() => readDraft(props.draft, new Set(items.map((i) => i.id))), []);

  const [placed, setPlaced] = useState<Placed[]>(initial?.placed ?? []);
  const [removed, setRemoved] = useState<string[]>(initial?.removed ?? []);
  const [focus, setFocus] = useState<{ list: ListId; index: number }>({ list: 'pool', index: 0 });
  const [announce, setAnnounce] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [res, setRes] = useState<{ result: TestsResult; code: string } | null>(null);
  const [checks, setChecks] = useState(0);
  const [failed, setFailed] = useState(0);
  const [removedNote, setRemovedNote] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropAt, setDropAt] = useState<{ list: ListId; index: number; indent: number } | null>(null);
  const escArmed = useRef(false);
  const inFlight = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const poolRef = useRef<HTMLUListElement>(null);
  const progRef = useRef<HTMLUListElement>(null);
  const status = py.status.value;

  const readOnly = revealed || locked || (testMode && checks > 0);
  const placedIds = new Set(placed.map((p) => p.id));
  const pool = shuffled.filter((it) => !placedIds.has(it.id) && !removed.includes(it.id));
  const canCheck = !readOnly && !busy && checksLeft > 0 && placed.length > 0;

  const save = (p: Placed[], r: string[] = removed) => {
    setPlaced(p);
    props.onDraft({ placed: p, removed: r } satisfies Draft);
  };

  const guessIndent = (list: Placed[], at: number, item: Item) => {
    if (!q.indentMatters) return item.indent;
    const prev = list[at - 1];
    if (!prev) return 0;
    const prevItem = byId.get(prev.id);
    return Math.min(MAX_INDENT, prev.indent + (prevItem && /:\s*(#.*)?$/.test(prevItem.text) ? 1 : 0));
  };

  const addToProgram = (id: string, at?: number, indent?: number) => {
    const item = byId.get(id);
    if (!item || readOnly) return;
    const next = placed.filter((p) => p.id !== id);
    const index = at === undefined ? next.length : Math.max(0, Math.min(at, next.length));
    next.splice(index, 0, { id, indent: indent ?? guessIndent(next, index, item) });
    save(next);
    setAnnounce(`Added "${item.text}" to your program at line ${index + 1}.`);
  };

  const removeFromProgram = (id: string) => {
    const item = byId.get(id);
    if (!item || readOnly) return;
    save(placed.filter((p) => p.id !== id));
    setAnnounce(`Moved "${item.text}" back to the lines.`);
  };

  const moveWithin = (from: number, to: number) => {
    if (readOnly || to < 0 || to >= placed.length || from === to) return;
    const next = placed.slice();
    const [p] = next.splice(from, 1);
    next.splice(to, 0, p);
    save(next);
    setAnnounce(`Moved to line ${to + 1}.`);
  };

  const setIndent = (index: number, delta: number) => {
    if (readOnly || !q.indentMatters) return;
    const p = placed[index];
    if (!p) return;
    const indent = Math.max(0, Math.min(MAX_INDENT, p.indent + delta));
    if (indent === p.indent) return;
    const next = placed.slice();
    next[index] = { ...p, indent };
    save(next);
    setAnnounce(`Indent level ${indent}.`);
  };

  // Keep keyboard focus on the right element after state changes. A layout effect runs right after each DOM
  // commit, so quick key presses cannot focus an element that the next render removes.
  const focusNext = useRef<{ list: ListId; index: number } | null>(null);
  useLayoutEffect(() => {
    const f = focusNext.current;
    if (!f) return;
    focusNext.current = null;
    const listEl = f.list === 'pool' ? poolRef.current : progRef.current;
    const els = listEl?.querySelectorAll<HTMLElement>('[role=option]');
    if (!els || !els.length) {
      (f.list === 'pool' ? progRef.current : poolRef.current)?.querySelector<HTMLElement>('[role=option]')?.focus();
      return;
    }
    els[Math.min(f.index, els.length - 1)]?.focus();
  });

  const onItemKey = (e: KeyboardEvent, list: ListId, index: number, id: string) => {
    const len = list === 'pool' ? pool.length : placed.length;
    if (e.key === 'Escape') { escArmed.current = true; return; }
    if (e.key === 'Tab') {
      if (escArmed.current || list !== 'prog' || !q.indentMatters || readOnly) { escArmed.current = false; return; }
      e.preventDefault();
      setIndent(index, e.shiftKey ? -1 : 1);
      focusNext.current = { list, index };
      return;
    }
    escArmed.current = false;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      if (e.altKey && list === 'prog') {
        moveWithin(index, index + dir);
        focusNext.current = { list, index: Math.max(0, Math.min(len - 1, index + dir)) };
      } else {
        focusNext.current = { list, index: Math.max(0, Math.min(len - 1, index + dir)) };
        setFocus({ list, index: Math.max(0, Math.min(len - 1, index + dir)) });
      }
      return;
    }
    if (list === 'prog' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && q.indentMatters) {
      e.preventDefault();
      setIndent(index, e.key === 'ArrowRight' ? 1 : -1);
      focusNext.current = { list, index };
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      if (e.metaKey || e.ctrlKey) return; // Cmd/Ctrl+Enter = Check
      e.preventDefault();
      if (list === 'pool') addToProgram(id);
      else removeFromProgram(id);
      focusNext.current = { list, index };
      setFocus({ list, index });
    }
  };

  // ---------- pointer drag ----------
  const INDENT_PX = 24;
  const computeDrop = (x: number, y: number, d: DragState) => {
    const lists: [ListId, HTMLUListElement | null][] = [['prog', progRef.current], ['pool', poolRef.current]];
    for (const [list, el] of lists) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x < r.left - 24 || x > r.right + 24 || y < r.top - 24 || y > r.bottom + 24) continue;
      const opts = [...el.querySelectorAll<HTMLElement>('[role=option]')].filter((o) => o.dataset.id !== d.id);
      let index = opts.length;
      for (let i = 0; i < opts.length; i++) {
        const or = opts[i].getBoundingClientRect();
        if (y < or.top + or.height / 2) { index = i; break; }
      }
      let indent = 0;
      if (list === 'prog') {
        const item = byId.get(d.id)!;
        if (q.indentMatters) indent = Math.max(0, Math.min(MAX_INDENT, Math.round((x - d.grabX - r.left - 8) / INDENT_PX)));
        else indent = item.indent;
      }
      return { list, index, indent };
    }
    return null;
  };

  const onPointerDown = (e: PointerEvent, list: ListId, id: string) => {
    if (readOnly || e.button !== 0) return;
    const target = e.currentTarget as HTMLElement;
    const isGrip = (e.target as HTMLElement).closest('.pz-grip');
    if (e.pointerType === 'touch' && !isGrip) return; // touch scrolls unless the grip is used; tap still moves
    const r = target.getBoundingClientRect();
    target.setPointerCapture?.(e.pointerId);
    setDrag({ id, from: list, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, grabX: e.clientX - r.left, grabY: e.clientY - r.top, x: e.clientX, y: e.clientY, active: false, width: r.width });
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const moved = Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) > 6;
    const next = { ...drag, x: e.clientX, y: e.clientY, active: drag.active || moved };
    setDrag(next);
    if (next.active) setDropAt(computeDrop(e.clientX, e.clientY, next));
  };
  const onPointerUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    setDrag(null);
    setDropAt(null);
    if (!d.active) return; // a click; handled by onClick
    suppressClick.current = true;
    setTimeout(() => { suppressClick.current = false; }, 0);
    const drop = computeDrop(e.clientX, e.clientY, d);
    if (!drop) return;
    if (drop.list === 'pool') {
      if (d.from === 'prog') removeFromProgram(d.id);
      return;
    }
    addToProgram(d.id, drop.index, drop.indent);
  };

  // ---------- check ----------
  const check = async () => {
    if (!canCheck || inFlight.current) return;
    inFlight.current = true;
    const lines = placed.map((p) => ({ text: byId.get(p.id)!.text, indent: p.indent }));
    const code = assembleParsons(lines);
    const usedDistractors = placed.map((p) => byId.get(p.id)!).filter((it) => it.distractor && it.mistake).map((it) => it.mistake!) as MistakeId[];
    setBusy(true);
    setFailure(null);
    const { result, failure: f } = await runTestsLogged({ code, tests: q.tests, kind: 'function', fnName: q.fnName }, { qid: q.id, topicId }, false);
    inFlight.current = false;
    setBusy(false);
    setFailure(f);
    if (!result) return;
    setRes({ result, code });
    setChecks((n) => n + 1);
    const graded = gradeFromTests(q, result, { usedDistractors });
    props.onCheck(graded, { order: placed.map((p) => `${p.id}:${p.indent}`), code, flags: result.flags.map((x) => x.flag) });
    if (!graded.correct && !testMode) {
      const nf = failed + 1;
      setFailed(nf);
      if (nf === 2) {
        const victim = shuffled.find((it) => it.distractor && !removed.includes(it.id));
        if (victim) {
          const nr = [...removed, victim.id];
          setRemoved(nr);
          save(placed.filter((p) => p.id !== victim.id), nr);
          setRemovedNote(victim.text);
        }
      }
    }
  };
  useRunShortcuts({ onRun: check }, true, rootRef);

  const renderItem = (it: Item, list: ListId, index: number, indent: number) => {
    const focused = focus.list === list && focus.index === index;
    const dragging = drag?.active && drag.id === it.id;
    return (
      <li
        key={it.id}
        data-id={it.id}
        role="option"
        aria-selected={focused}
        tabIndex={focused || (index === 0 && focus.list !== list) ? 0 : -1}
        class={`pz-item${dragging ? ' dragging' : ''}${readOnly ? ' readonly' : ''}`}
        style={list === 'prog' ? { paddingLeft: `calc(${indent} * ${INDENT_PX}px + 8px)` } : undefined}
        aria-label={`${it.text}${list === 'prog' ? `, line ${index + 1}${q.indentMatters ? `, indent ${indent}` : ''}` : ''}`}
        onFocus={() => setFocus({ list, index })}
        onKeyDown={(e) => onItemKey(e as unknown as KeyboardEvent, list, index, it.id)}
        onPointerDown={(e) => onPointerDown(e as unknown as PointerEvent, list, it.id)}
        onPointerMove={(e) => onPointerMove(e as unknown as PointerEvent)}
        onPointerUp={(e) => onPointerUp(e as unknown as PointerEvent)}
        onPointerCancel={() => { setDrag(null); setDropAt(null); }}
        onClick={() => {
          if (suppressClick.current || readOnly) return;
          if (list === 'pool') addToProgram(it.id);
          else removeFromProgram(it.id);
          // The clicked element moves to the other list; keep focus in this list for the next pick.
          focusNext.current = { list, index };
          setFocus({ list, index });
        }}
      >
        {list === 'prog' && q.indentMatters && indent > 0 ? (
          <span class="pz-guides" aria-hidden="true">
            {Array.from({ length: indent }, (_, g) => <span key={g} class="pz-guide" style={{ left: `calc(${g} * ${INDENT_PX}px + 8px)` }} />)}
          </span>
        ) : null}
        <span class="pz-grip" aria-hidden="true"><Icon name="grip" size={14} /></span>
        <code class="pz-text"><CodeLine text={it.text} /></code>
        {list === 'prog' && q.indentMatters && !readOnly ? (
          <span class="pz-indent-btns">
            <button type="button" class="pz-mini" tabIndex={-1} aria-label="Indent less" disabled={indent === 0} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setIndent(index, -1); }}>
              <Icon name="arrowLeft" size={12} />
            </button>
            <button type="button" class="pz-mini" tabIndex={-1} aria-label="Indent more" disabled={indent >= MAX_INDENT} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setIndent(index, 1); }}>
              <Icon name="arrowRight" size={12} />
            </button>
          </span>
        ) : null}
      </li>
    );
  };

  const dropLine = (list: ListId, index: number) =>
    dropAt && dropAt.list === list && dropAt.index === index ? (
      <li class="pz-drop" aria-hidden="true" style={list === 'prog' ? { marginLeft: `${dropAt.indent * INDENT_PX}px` } : undefined} />
    ) : null;

  const draggedItem = drag?.active ? byId.get(drag.id) : null;
  const hideResult = testMode && !revealed;

  return (
    <div class="parsons" ref={rootRef} data-run-scope>
      <p class="muted pz-help">
        Click a line to move it between the columns, or drag it into place.
        {' '}Keyboard: <kbd>↑</kbd>/<kbd>↓</kbd> choose a line, <kbd>Enter</kbd> moves it across, <kbd>Alt</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> reorders
        {q.indentMatters ? <>, <kbd>Tab</kbd>/<kbd>Shift</kbd>+<kbd>Tab</kbd> (or <kbd>←</kbd>/<kbd>→</kbd>) indents; <kbd>Esc</kbd> then <kbd>Tab</kbd> leaves the list</> : null}.
        {q.distractors.length ? ' Not every line is needed.' : ''}
      </p>
      <div class="pz-board">
        <section class="pz-col" aria-labelledby={`pz-pool-${q.id}`}>
          <h3 class="label" id={`pz-pool-${q.id}`}>Lines</h3>
          <ul ref={poolRef} class="pz-list pool" role="listbox" aria-labelledby={`pz-pool-${q.id}`}>
            {pool.map((it, i) => [dropLine('pool', i), renderItem(it, 'pool', i, 0)])}
            {dropLine('pool', pool.length)}
            {pool.length === 0 ? <li class="pz-empty">All lines are in your program.</li> : null}
          </ul>
        </section>
        <section class="pz-col" aria-labelledby={`pz-prog-${q.id}`}>
          <h3 class="label" id={`pz-prog-${q.id}`}>Your program</h3>
          <ul ref={progRef} class="pz-list prog" role="listbox" aria-labelledby={`pz-prog-${q.id}`}>
            {placed.map((p, i) => [dropLine('prog', i), renderItem(byId.get(p.id)!, 'prog', i, p.indent)])}
            {dropLine('prog', placed.length)}
            {placed.length === 0 ? <li class="pz-empty">Move lines here to build the program.</li> : null}
          </ul>
        </section>
      </div>
      {draggedItem && drag ? (
        <div class="pz-ghost" aria-hidden="true" style={{ transform: `translate(${drag.x - drag.grabX}px, ${drag.y - drag.grabY}px)`, width: `${drag.width}px` }}>
          <code class="pz-text"><CodeLine text={draggedItem.text} /></code>
        </div>
      ) : null}
      <span class="sr-only" aria-live="polite">{announce}</span>
      {removedNote && !revealed ? (
        <Callout tone="hint" title="One line removed">
          After two checks, one line that is not needed has been taken out: <code>{removedNote}</code>
        </Callout>
      ) : null}
      <div class="ct-toolbar">
        <Button variant="primary" onClick={check} disabled={!canCheck} kbd={kbdRun}>
          <Icon name="check" size={14} /> {busy ? 'Checking…' : 'Check'}
        </Button>
        <span class="faint num" aria-live="polite">
          {testMode ? (checks ? 'Answer submitted' : 'One check in the test') : Number.isFinite(checksLeft) ? `${Math.max(0, checksLeft)} ${checksLeft === 1 ? 'check' : 'checks'} left` : ''}
        </span>
        <span class="spacer" />
        {!readOnly && placed.length ? <Button size="sm" variant="ghost" onClick={() => save([])}><Icon name="refresh" size={14} /> Start again</Button> : null}
      </div>
      {busy ? <p class="term-status"><span class="term-dot" aria-hidden="true" />{isStarting(status) ? 'Python is starting (about 10 to 30 seconds on the first visit). Your program is checked as soon as it is ready.' : 'Running the tests…'}</p> : null}
      {failure ? <Callout tone="bad" title="Python is not available">{failure}</Callout> : null}
      {res && hideResult ? <Callout tone="info" title="Answer submitted">Results appear when the test ends.</Callout> : null}
      {res && !hideResult && !busy ? (
        <div class="stack">
          <TestsTable result={res.result} tests={q.tests} revealed={revealed} title="All tests" />
          {res.result.compileError ? <ExplainError error={res.result.compileError} code={res.code} /> : null}
        </div>
      ) : null}
      {revealed ? (
        <div class="stack">
          <h3 class="label">Correct order</h3>
          <CodeBlock code={assembleParsons(q.lines)} numbered />
        </div>
      ) : null}
    </div>
  );
}
