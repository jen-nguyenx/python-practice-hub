// Fill in the blank: highlighted code in the dark editor card with inline inputs at ⟦n⟧ markers; Check fills
// them in and runs all tests. Once the answer is shown, each gap keeps what the student typed, marked right or
// wrong, with an accepted answer beside it.
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
import { useWorkbench } from '../../workbench/context.ts';
import { EditorCard } from '../../workbench/EditorCard.tsx';
import { ExplainError } from '../../workbench/ExplainError.tsx';
import { runTestsLogged } from '../../workbench/runner.ts';
import { MOD, useRunShortcuts } from '../../workbench/shortcuts.ts';
import { ResultsCard, TestRows, TestsStatusChip } from '../../workbench/TestsTable.tsx';
import { asciiText, clozeGapRight } from './logic.ts';
import { BusyLine } from './Workspace.tsx';
import './code.css';

const MARK = /⟦(\d+)⟧/g;
const PH = (id: string) => `__PLBLANK${id}__`;
const PH_RE = /__PLBLANK(\d+)__/g;

type Answers = Record<string, string>;

/** Longest blank a student could sensibly type; also bounds what a hand-edited draft can put on screen. */
const MAX_BLANK = 200;

/**
 * Drafts are `unknown` by contract and can come from an imported backup, so every value is checked to be
 * a string here. Trusting the shape would let `{"answers": {"1": 123}}` throw on `.trim()` during render
 * and leave that question permanently unopenable.
 */
function draftAnswers(draft: unknown): Answers {
  const out: Answers = {};
  if (!draft || typeof draft !== 'object') return out;
  const a = (draft as { answers?: unknown }).answers;
  if (!a || typeof a !== 'object') return out;
  for (const [k, v] of Object.entries(a as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v.slice(0, MAX_BLANK);
  }
  return out;
}

export function Cloze(props: FormatProps<QuestionOf<'cloze'>>) {
  const { q, revealed, locked, mode, checksLeft, topicId } = props;
  const testMode = mode === 'topic-test' || mode === 'exam';
  const [answers, setAnswers] = useState<Answers>(() => draftAnswers(props.draft));
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [res, setRes] = useState<{ result: TestsResult; code: string; answers: Answers } | null>(null);
  const [checks, setChecks] = useState(0);
  const [tab, setTab] = useState('tests');
  const wb = useWorkbench();
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
    setTab('tests');
    const { result, failure: f } = await runTestsLogged({ code, tests: q.tests, kind: 'function', fnName: q.fnName }, { qid: q.id, topicId }, false);
    inFlight.current = false;
    setBusy(false);
    setFailure(f);
    if (!result) return;
    setRes({ result, code, answers: filled });
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
    const typed = answers[id] ?? '';
    const n = order.indexOf(id) + 1;
    // Review (answer shown): keep what the student typed, marked right or wrong, with an accepted answer beside it.
    const review = revealed;
    const checkedPass = !!res && res.result.total > 0 && res.result.passed === res.result.total && asciiText(typed) === res.answers[id];
    const right = clozeGapRight(typed, accept, checkedPass);
    const width = Math.max(3, review ? typed.length : Math.max(...accept.map((a) => a.length), typed.length)) + 1;
    const input = (
      <input
        key={`blank-${id}`}
        ref={(el) => { inputs.current[id] = el; }}
        class={`cloze-input${review ? (right ? ' right' : ' wrong') : ''}`}
        style={{ width: `calc(${width}ch + 14px)` }}
        value={typed}
        placeholder={review && !typed ? 'blank' : undefined}
        readOnly={readOnly}
        aria-label={review ? `Blank ${n} of ${order.length}: your answer ${typed ? `"${typed}"` : 'was empty'}, ${right ? 'correct' : `not accepted; accepted answer ${accept[0] ?? ''}`}` : `Blank ${n} of ${order.length}`}
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
    if (!review) return input;
    return (
      <span key={`blank-${id}`} class="cloze-review">
        {input}
        <span class={`cloze-mark ${right ? 'right' : 'wrong'}`} aria-hidden="true"><Icon name={right ? 'check' : 'x'} size={12} /></span>
        {!right && accept[0] !== undefined ? <span class="cloze-accept" aria-hidden="true"><span class="cloze-accept-label">answer</span> {accept[0]}</span> : null}
      </span>
    );
  }

  const explainable = res ? (res.result.compileError ?? res.result.topLevelError ?? res.result.outcomes.find((o) => o.error && (!o.hidden || revealed))?.error ?? null) : null;
  const hideResult = testMode && !revealed;
  const shownResult = res && !hideResult && !busy ? res.result : null;
  const checksNote = testMode ? (checks ? 'Answer submitted' : 'One check in the test') : Number.isFinite(checksLeft) ? `${Math.max(0, checksLeft)} ${checksLeft === 1 ? 'check' : 'checks'} left` : '';

  // Once the check button is gone there is nothing for the keyboard hint to point at, and a footer with nothing
  // in it is just an empty bar, so the bar itself goes too.
  const footer = !readOnly || revealed ? (
    <>
      {!readOnly ? (
        <Button variant="primary" onClick={check} disabled={!canCheck} aria-keyshortcuts={MOD === '⌘' ? 'Meta+Enter' : 'Control+Enter'}>
          <Icon name="check" size={14} /> {busy ? 'Checking…' : testMode ? 'Submit answer' : 'Check'}
        </Button>
      ) : null}
      <span class="ed-note" aria-live="polite">{readOnly ? '' : checksNote}</span>
      {!allFilled && !readOnly ? <span class="ed-note">Fill every gap to check</span> : null}
      {revealed ? <span class="ed-note">Your answers are marked · an accepted answer sits beside each wrong gap</span> : null}
      {!readOnly ? <span class="ed-kbd" aria-hidden="true">{MOD} + Enter</span> : null}
    </>
  ) : undefined;

  return (
    <div class="cloze ct" ref={rootRef} data-run-scope>
      <p class="sr-only">Type into each gap. Press Enter to move to the next gap; Enter on the last gap checks your answer.</p>
      <EditorCard file="solution.py" label="Code with gaps to fill" footer={footer}>
        <pre class="cloze-code syn-dark"><code>{parts}</code></pre>
      </EditorCard>
      {busy ? <BusyLine status={status} starting="about 10 to 30 seconds on the first visit" running="Running the tests…" /> : null}
      {failure ? <Callout tone="bad" title="Python is not available">{failure}</Callout> : null}
      {res && hideResult ? <Callout tone="info" title="Answer submitted">Results appear when the test ends.</Callout> : null}
      {wb.resultSlot}
      <ResultsCard
        label="Results"
        tabs={[
          { id: 'tests', label: 'Tests', content: <TestRows tests={q.tests} result={shownResult} revealed={revealed} runsOn={testMode ? 'submit' : 'check'} onExplain={explainable ? () => setTab('explain') : undefined} /> },
          ...(shownResult && explainable ? [{ id: 'explain', label: 'Explain', content: <ExplainError error={explainable} code={res!.code} /> }] : []),
        ]}
        active={tab}
        onTab={setTab}
        status={<TestsStatusChip result={shownResult} busy={busy} idleText={`${q.tests.length} ${q.tests.length === 1 ? 'test' : 'tests'} run on ${testMode ? 'Submit' : 'Check'}`} />}
      />
      {revealed && !wb.onQuestionPage ? (
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
