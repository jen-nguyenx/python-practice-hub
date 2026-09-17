// Fill in the blank: highlighted code with inline inputs at ⟦n⟧ markers; Check fills them in and runs all tests.
import type { JSX } from 'preact';
import { useMemo, useRef, useState } from 'preact/hooks';
import type { FormatProps } from '../../../engine/types.ts';
import type { QuestionOf } from '../../../content/schema.ts';
import type { TestsResult } from '../../../runtime/protocol.ts';
import { fillCloze, gradeFromTests } from '../../../engine/grade.ts';
import { py } from '../../../app/services.ts';
import { Button } from '../../components/Button.tsx';
import { Callout } from '../../components/Callout.tsx';
import { Icon } from '../../components/Icon.tsx';
import { tokenize } from '../../components/highlight.ts';
import { ExplainError } from '../../workbench/ExplainError.tsx';
import { isStarting } from '../../workbench/plain.ts';
import { firstTestsError, runTestsLogged } from '../../workbench/runner.ts';
import { kbdRun, useRunShortcuts } from '../../workbench/shortcuts.ts';
import { TestsTable } from '../../workbench/TestsTable.tsx';
import { asciiText } from './logic.ts';
import './code.css';

const MARK = /⟦(\d+)⟧/g;
const PH = (id: string) => `__PLBLANK${id}__`;
const PH_RE = /__PLBLANK(\d+)__/g;

type Answers = Record<string, string>;

function draftAnswers(draft: unknown): Answers {
  if (draft && typeof draft === 'object') {
    const a = (draft as { answers?: unknown }).answers;
    if (a && typeof a === 'object') return a as Answers;
  }
  return {};
}

export function Cloze(props: FormatProps<QuestionOf<'cloze'>>) {
  const { q, revealed, locked, mode, checksLeft, topicId } = props;
  const testMode = mode === 'topic-test' || mode === 'midsem';
  const [answers, setAnswers] = useState<Answers>(() => draftAnswers(props.draft));
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [res, setRes] = useState<{ result: TestsResult; code: string } | null>(null);
  const [checks, setChecks] = useState(0);
  const [showExplain, setShowExplain] = useState(false);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const inFlight = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const status = py.status.value;

  const blanksById = useMemo(() => new Map(q.blanks.map((b) => [b.id, b])), [q.blanks]);
  const order = useMemo(() => [...q.template.matchAll(MARK)].map((m) => m[1]), [q.template]);
  const readOnly = revealed || locked || (testMode && checks > 0);
  const allFilled = order.every((id) => (answers[id] ?? '').trim().length > 0);
  const canCheck = !readOnly && !busy && checksLeft > 0 && allFilled;

  const set = (id: string, v: string) => {
    const next = { ...answers, [id]: v };
    setAnswers(next);
    props.onDraft({ answers: next });
  };

  const check = async () => {
    if (!canCheck || inFlight.current) return;
    inFlight.current = true;
    const filled: Answers = {};
    for (const id of order) filled[id] = asciiText(answers[id] ?? '');
    const code = fillCloze(q, filled);
    setBusy(true);
    setFailure(null);
    setShowExplain(false);
    const { result, failure: f } = await runTestsLogged({ code, tests: q.tests, kind: 'function', fnName: q.fnName }, { qid: q.id, topicId }, false);
    inFlight.current = false;
    setBusy(false);
    setFailure(f);
    if (!result) return;
    setRes({ result, code });
    setChecks((n) => n + 1);
    const graded = gradeFromTests(q, result);
    props.onCheck(graded, { answers: filled, code, flags: result.flags.map((x) => x.flag) });
  };

  useRunShortcuts({ onRun: check }, true, rootRef);

  // Render the template: tokenise with placeholders so string/keyword colours survive around blanks.
  const withPh = q.template.replace(MARK, (_m, id: string) => PH(id));
  const tokens = tokenize(withPh);
  const parts: JSX.Element[] = [];
  let k = 0;
  for (const tok of tokens) {
    const pieces = tok.v.split(PH_RE);
    // split with a capture group alternates text, id, text, id, ...
    pieces.forEach((piece, i) => {
      if (i % 2 === 1) {
        parts.push(blankInput(piece));
      } else if (piece) {
        parts.push(tok.t === 'p' ? <span key={k++}>{piece}</span> : <span key={k++} class={`tok-${tok.t}`}>{piece}</span>);
      }
    });
  }

  function blankInput(id: string) {
    const blank = blanksById.get(id);
    const accept = blank?.accept ?? [];
    const width = Math.max(3, ...accept.map((a) => a.length), (answers[id] ?? '').length) + 1;
    const n = order.indexOf(id) + 1;
    const value = revealed ? (answers[id] && accept.includes(asciiText(answers[id]).trim()) ? answers[id] : accept[0] ?? '') : answers[id] ?? '';
    return (
      <input
        key={`blank-${id}`}
        ref={(el) => { inputs.current[id] = el; }}
        class={`cloze-input${revealed ? ' revealed' : ''}`}
        style={{ width: `calc(${width}ch + 12px)` }}
        value={value}
        readOnly={readOnly}
        aria-label={`Blank ${n} of ${order.length}`}
        spellcheck={false}
        autocomplete="off"
        autocapitalize="off"
        {...{ autocorrect: 'off' }}
        onInput={(e) => set(id, e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            const next = order[order.indexOf(id) + 1];
            if (next) inputs.current[next]?.focus();
            else void check();
          }
        }}
      />
    );
  }

  const explainable = res ? (res.result.compileError ?? res.result.topLevelError ?? res.result.outcomes.find((o) => o.error && (!o.hidden || revealed))?.error ?? null) : null;
  const hideResult = testMode && !revealed;

  return (
    <div class="cloze" ref={rootRef} data-run-scope>
      <p class="muted cloze-help">Type into each gap. Press Enter to move to the next gap; Enter on the last gap checks your answer.</p>
      <pre class="code-block cloze-code" aria-label="Code with gaps to fill"><code>{parts}</code></pre>
      <div class="ct-toolbar">
        <Button variant="primary" onClick={check} disabled={!canCheck} kbd={kbdRun}>
          <Icon name="check" size={14} /> {busy ? 'Checking…' : 'Check'}
        </Button>
        <span class="faint num" aria-live="polite">
          {testMode ? (checks ? 'Answer submitted' : 'One check in the test') : Number.isFinite(checksLeft) ? `${Math.max(0, checksLeft)} ${checksLeft === 1 ? 'check' : 'checks'} left` : ''}
        </span>
        {!allFilled && !readOnly ? <span class="faint">Fill every gap to check.</span> : null}
      </div>
      {busy ? <p class="term-status"><span class="term-dot" aria-hidden="true" />{isStarting(status) ? 'Python is starting (about 10 to 30 seconds on the first visit). Your answer is checked as soon as it is ready.' : 'Running the tests…'}</p> : null}
      {failure ? <Callout tone="bad" title="Python is not available">{failure}</Callout> : null}
      {res && hideResult ? <Callout tone="info" title="Answer submitted">Results appear when the test ends.</Callout> : null}
      {res && !hideResult && !busy ? (
        <div class="stack">
          <TestsTable result={res.result} tests={q.tests} revealed={revealed} title="All tests" onExplain={explainable ? () => setShowExplain(true) : undefined} />
          {showExplain && explainable ? <ExplainError error={explainable} code={res.code} /> : null}
          {explainable && !showExplain && !res.result.compileError && !res.result.topLevelError ? (
            <Button size="sm" variant="ghost" onClick={() => setShowExplain(true)}>Explain the error: {firstTestsError(res.result)?.type}</Button>
          ) : null}
        </div>
      ) : null}
      {revealed ? (
        <div class="cloze-accepted">
          <h3 class="label">Accepted answers</h3>
          <ul>
            {order.map((id, i) => (
              <li key={id}>Gap {i + 1}: {(blanksById.get(id)?.accept ?? []).map((a, j) => <span key={j}>{j ? ', ' : ''}<code>{a}</code></span>)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
