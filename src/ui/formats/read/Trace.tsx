// Trace table: one row each time the anchor line finishes, one column per watched variable.
import type { JSX } from 'preact';
import { useRef, useState } from 'preact/hooks';
import type { FormatProps, GradeResult } from '../../../engine/types.ts';
import type { QuestionOf } from '../../../content/schema.ts';
import { gradeTrace } from '../../../engine/grade.ts';
import { Button } from '../../components/Button.tsx';
import { CodeBlock } from '../../components/CodeBlock.tsx';
import { Icon } from '../../components/Icon.tsx';
import { gridHasInput, parseTraceRows } from './logic.ts';
import { CheckBar, Mark, MissingData, checkShortcut, useDraftState, visibility, noAutocorrect } from './shared.tsx';

type Q = QuestionOf<'trace'>;
interface TraceDraft { rows: string[][] }
type Checked = { rows: string[][]; result: GradeResult & { cellOk: boolean[][] } };

const MAX_ROWS = 30;

const gridSame = (a: string[][], b: string[][]) => a.length === b.length && a.every((row, r) => row.every((v, c) => v === b[r]?.[c]));

export function Trace(props: FormatProps<Q>) {
  return <TraceBody key={props.q.id} {...props} />;
}

function TraceBody(props: FormatProps<Q>) {
  const { q, generated } = props;
  const cols = q.watch.length;
  const rootRef = useRef<HTMLDivElement>(null);
  const expectedRows = Array.isArray(generated?.traceRows) ? generated.traceRows : null;
  const missing = expectedRows === null;
  const [draft, setDraft] = useDraftState<TraceDraft>(
    props.draft, props.onDraft,
    (d) => (d === undefined || d === null ? null : { rows: parseTraceRows(d, cols) }),
    () => ({ rows: parseTraceRows(null, cols) }),
  );
  const [checked, setChecked] = useState<Checked | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const vis = visibility(props, checked !== null, submitted);
  const rows = draft.rows;
  const ready = gridHasInput(rows);
  const canCheck = ready && !missing && !vis.inputLocked && props.checksLeft > 0;

  const check = () => {
    if (!canCheck) return;
    const result = gradeTrace(q, rows, generated);
    const snapshot = rows.map((r) => r.slice());
    setChecked({ rows: snapshot, result });
    if (vis.testMode) setSubmitted(true);
    props.onCheck(result, { rows: snapshot });
  };

  const setCell = (r: number, c: number, value: string) => {
    if (vis.inputLocked) return;
    setDraft({ rows: rows.map((row, i) => (i === r ? row.map((v, j) => (j === c ? value : v)) : row)) });
  };
  const focusCell = (r: number, c: number) => {
    rootRef.current?.querySelector<HTMLInputElement>(`input[data-r="${r}"][data-c="${c}"]`)?.focus();
  };
  const addRow = () => {
    if (vis.inputLocked || rows.length >= MAX_ROWS) return;
    const next = [...rows.map((r) => r.slice()), new Array<string>(cols).fill('')];
    setDraft({ rows: next });
    const r = next.length - 1;
    requestAnimationFrame(() => focusCell(r, 0));
  };
  const removeRow = () => {
    if (vis.inputLocked || rows.length <= 1) return;
    setDraft({ rows: rows.slice(0, -1) });
  };
  const onCellKey = (r: number, c: number) => (e: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    if (e.shiftKey) {
      if (c > 0) focusCell(r, c - 1);
      else if (r > 0) focusCell(r - 1, cols - 1);
      return;
    }
    if (c < cols - 1) focusCell(r, c + 1);
    else if (r < rows.length - 1) focusCell(r + 1, 0);
    else rootRef.current?.querySelector<HTMLButtonElement>('button[data-add-row]')?.focus();
  };

  // Marks for the student's grid: from the last check while a cell is unchanged, or graded fresh once the answer is out.
  const fresh = vis.marks && vis.full && !missing && (!checked || props.revealed) ? gradeTrace(q, rows, generated) : null;
  // Blank cells are never marked before the answer is out (marking them would hint at how many rows there are).
  const cellMark = (r: number, c: number): boolean | null => {
    if (!vis.marks) return null;
    const blank = (rows[r]?.[c] ?? '').trim() === '';
    const blankMark = vis.full && expectedRows !== null && r < expectedRows.length && (checked !== null || gridHasInput(rows)) ? false : null;
    if (fresh) return blank ? blankMark : fresh.cellOk[r]?.[c] === true;
    if (!checked) return null;
    if (checked.rows[r]?.[c] !== rows[r]?.[c]) return null;
    return blank ? blankMark : checked.result.cellOk[r]?.[c] === true;
  };

  let status = null;
  const judged = fresh ?? (checked && vis.marks ? checked.result : null);
  if (!vis.testMode && judged && (fresh || (checked && gridSame(checked.rows, rows)))) status = <Mark ok={judged.correct} />;

  const showAnswer = props.revealed && expectedRows !== null;
  const colLabel = (c: number) => q.watch[c];

  return (
    <div class="rf rf-trace" ref={rootRef} onKeyDown={checkShortcut(check)}>
      <CodeBlock code={q.code} numbered highlightLines={[q.anchorLine]} class="rf-anchor-code" label="Program" />
      <p class="rf-help">
        <span class="rf-anchor-key">Line {q.anchorLine}</span> is marked. Add one row each time line {q.anchorLine} finishes running.
        Write values the way Python shows them: strings in quotes like <code>'Perth'</code>, floats like <code>3.0</code>, lists like <code>[1, 2]</code>.
      </p>
      {missing ? <MissingData /> : null}

      {showAnswer && !gridHasInput(rows) ? null : <div class="rf-table-wrap">
        <table class="rf-trace-table">
          <caption class="sr-only">Your trace table. One row each time line {q.anchorLine} runs.</caption>
          <thead>
            <tr>
              <th scope="col" class="rf-rownum">Row #</th>
              {q.watch.map((w) => <th scope="col" key={w}><code>{w}</code></th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                <th scope="row" class="rf-rownum num">{r + 1}</th>
                {row.map((val, c) => {
                  const m = cellMark(r, c);
                  const cls = ['rf-cell', m === true ? 'ok' : m === false ? 'bad' : ''].filter(Boolean).join(' ');
                  return (
                    <td key={c} class={cls}>
                      <div class="rf-cell-inner">
                        <input
                          class="rf-cell-input"
                          data-r={r} data-c={c}
                          aria-label={`Row ${r + 1}, ${colLabel(c)}${m === true ? ', correct' : m === false ? ', not quite' : ''}`}
                          value={val}
                          readOnly={vis.inputLocked}
                          ref={noAutocorrect} autocomplete="off" autocapitalize="off" spellcheck={false}
                          onInput={(e) => setCell(r, c, e.currentTarget.value)}
                          onKeyDown={onCellKey(r, c)}
                        />
                        {m !== null ? <Icon name={m ? 'check' : 'x'} size={14} class="rf-cell-icon" /> : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>}

      {!vis.inputLocked ? (
        <div class="row rf-trace-actions">
          <Button onClick={addRow} disabled={rows.length >= MAX_ROWS} data-add-row="">Add row</Button>
          <Button variant="ghost" onClick={removeRow} disabled={rows.length <= 1}>Remove last row</Button>
          <span class="rf-help num">{rows.length === 1 ? '1 row' : `${rows.length} rows`}</span>
        </div>
      ) : null}

      {showAnswer && expectedRows ? <AnswerTable q={q} expected={expectedRows} rows={rows} cellOk={(fresh ?? checked?.result)?.cellOk ?? []} /> : null}

      <CheckBar
        vis={vis} revealed={props.revealed} locked={props.locked} checksLeft={props.checksLeft}
        ready={ready} notReadyText="Fill in at least one cell first." missing={missing} submitted={submitted}
        onCheck={check} status={status}
      />
    </div>
  );
}

/** The expected table, with a note wherever the student's grid differs. */
function AnswerTable({ q, expected, rows, cellOk }: { q: Q; expected: string[][]; rows: string[][]; cellOk: boolean[][] }) {
  const n = Math.max(expected.length, rows.length);
  const hasInput = gridHasInput(rows);
  return (
    <div class="rf-reveal">
      <div class="rf-subhead">Answer: {expected.length === 1 ? '1 row' : `${expected.length} rows`}</div>
      <div class="rf-table-wrap">
        <table class="rf-trace-table answer">
          <caption class="sr-only">Expected trace table</caption>
          <thead>
            <tr>
              <th scope="col" class="rf-rownum">Row #</th>
              {q.watch.map((w) => <th scope="col" key={w}><code>{w}</code></th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: n }, (_, r) => {
              const exp = expected[r];
              const mine = rows[r];
              const mineHas = !!mine && mine.some((v) => v.trim() !== '');
              if (!exp) {
                return (
                  <tr key={r} class="extra">
                    <th scope="row" class="rf-rownum num">{r + 1}</th>
                    <td colSpan={q.watch.length}>
                      <span class="rf-mark bad"><Icon name="x" size={14} /> Extra row: the table should end before this row{mineHas ? ` (you wrote ${mine.map((v) => v.trim() || '_').join(', ')})` : ''}</span>
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={r}>
                  <th scope="row" class="rf-rownum num">
                    {r + 1}
                    {hasInput && !mine ? <span class="rf-row-note">Missing row</span> : null}
                  </th>
                  {q.watch.map((_, c) => {
                    const value = exp[c] ?? '';
                    const yours = mine?.[c]?.trim() ?? '';
                    return (
                      <td key={c}>
                        <code class="rf-answer-val">{value}</code>
                        {hasInput && mine && cellOk[r]?.[c] !== true ? (
                          <span class="rf-you-wrote">{yours ? <>You wrote <code>{yours}</code></> : 'You left this blank'}</span>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
