// Break the code: the student types an argument tuple; the correct and the secretly buggy versions both run on it.
import { useRef, useState } from 'preact/hooks';
import type { FormatProps } from '../../../engine/types.ts';
import type { QuestionOf } from '../../../content/schema.ts';
import type { PairResult } from '../../../runtime/protocol.ts';
import { gradeTestWriter } from '../../../engine/grade.ts';
import { py } from '../../../app/services.ts';
import { Button } from '../../components/Button.tsx';
import { Callout } from '../../components/Callout.tsx';
import { CodeBlock } from '../../components/CodeBlock.tsx';
import { Icon } from '../../components/Icon.tsx';
import { Markdown } from '../../components/Markdown.tsx';
import { DiffView } from '../../workbench/DiffView.tsx';
import { useWorkbench } from '../../workbench/context.ts';
import { EditorCard } from '../../workbench/EditorCard.tsx';
import { MOD, useRunShortcuts } from '../../workbench/shortcuts.ts';
import { BusyLine } from './Workspace.tsx';
import { asciiText, displayArgs, signatureOf } from './logic.ts';
import './code.css';

function draftArgs(d: unknown): string {
  if (typeof d === 'string') return d;
  if (d && typeof d === 'object' && typeof (d as { args?: unknown }).args === 'string') return (d as { args: string }).args;
  return '';
}

export function TestWriter(props: FormatProps<QuestionOf<'testWriter'>>) {
  const { q, revealed, locked, mode, checksLeft } = props;
  const testMode = mode === 'topic-test' || mode === 'exam';
  const [args, setArgs] = useState(() => draftArgs(props.draft));
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [pair, setPair] = useState<{ args: string; result: PairResult } | null>(null);
  const [checks, setChecks] = useState(0);
  const inFlight = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const status = py.status.value;
  const wb = useWorkbench();

  const readOnly = revealed || locked || (testMode && checks > 0);
  const canCheck = !readOnly && !busy && checksLeft > 0 && args.trim().length > 0;
  const sig = signatureOf(q.reference, q.fnName);

  const check = async () => {
    if (!canCheck || inFlight.current) return;
    inFlight.current = true;
    const argsRepr = asciiText(args.trim());
    setBusy(true);
    setFailure(null);
    let result: PairResult;
    try {
      result = await py.pair({ reference: q.reference, buggy: q.buggy, fnName: q.fnName, argsRepr });
    } catch (err) {
      inFlight.current = false;
      setBusy(false);
      setFailure(err instanceof Error ? err.message : String(err));
      return;
    }
    inFlight.current = false;
    setBusy(false);
    setPair({ args: argsRepr, result });
    // Arguments Python cannot read do not use up a check.
    if (!result.validArgs) return;
    setChecks((n) => n + 1);
    props.onCheck(gradeTestWriter(q, result), { args: argsRepr, differs: result.differs });
  };
  useRunShortcuts({ onRun: check }, true, rootRef);

  const hideResult = testMode && !revealed;
  const r = pair?.result;

  return (
    <div class="testwriter ct" ref={rootRef} data-run-scope>
      <section class="tw-card">
        <h2 class="tw-title">What the function should do</h2>
        <Markdown text={q.spec} />
        <EditorCard file="signature.py" label="Function signature">
          <pre class="tw-sig"><code>{sig}</code></pre>
        </EditorCard>
        <p class="muted">One of two versions of <code>{q.fnName}</code> has a bug. Find arguments where the two versions give different results.</p>
      <form
        class="tw-form"
        onSubmit={(e) => {
          e.preventDefault();
          void check();
        }}
      >
        <label for={`tw-args-${q.id}`}><strong>Arguments</strong> for <code>{q.fnName}</code>, written as a Python tuple</label>
        <div class="tw-input-row">
          <code class="tw-call" aria-hidden="true">{q.fnName}</code>
          <input
            id={`tw-args-${q.id}`}
            class="tw-input"
            value={args}
            placeholder={q.argsExample}
            readOnly={readOnly}
            spellcheck={false}
            autocomplete="off"
            autocapitalize="off"
            {...{ autocorrect: 'off' }}
            aria-describedby={`tw-args-help-${q.id}`}
            onInput={(e) => {
              setArgs(e.currentTarget.value);
              props.onDraft({ args: e.currentTarget.value });
            }}
          />
        </div>
        <p id={`tw-args-help-${q.id}`} class="tw-help">
          Wrap the arguments in brackets, separated by commas, for example <code>{q.argsExample}</code>. With one argument, keep the trailing comma: <code>(5,)</code> is a tuple, but <code>(5)</code> is just the number 5.
        </p>
        <div class="ct-toolbar">
          {!readOnly ? (
            <Button type="submit" variant="primary" disabled={!canCheck} aria-keyshortcuts={MOD === '⌘' ? 'Meta+Enter' : 'Control+Enter'}>
              <Icon name="check" size={14} /> {busy ? 'Checking…' : testMode ? 'Submit answer' : 'Check'}
            </Button>
          ) : null}
          <span class="faint num" aria-live="polite">
            {testMode ? (checks ? 'Answer submitted' : 'One check in the test') : Number.isFinite(checksLeft) ? `${Math.max(0, checksLeft)} ${checksLeft === 1 ? 'check' : 'checks'} left` : ''}
          </span>
        </div>
      </form>
      </section>
      {busy ? <BusyLine status={status} starting="about 10 to 30 seconds on the first visit" running="Running both versions…" /> : null}
      {failure ? <Callout tone="bad" title="Python is not available">{failure}</Callout> : null}
      <div aria-live="polite">
        {r && !busy && !r.validArgs ? (
          <Callout tone="bad" title="Python could not read those arguments">
            {r.parseError ? r.parseError : <>Use a tuple of plain values, for example <code>{q.argsExample}</code>.</>} This did not use up a check.
          </Callout>
        ) : null}
        {r && !busy && r.validArgs && hideResult ? <Callout tone="info" title="Answer submitted">Results appear when the test ends.</Callout> : null}
        {r && !busy && r.validArgs && !hideResult ? (
          <div class="tw-results">
            <p class={`tw-verdict ${r.differs ? 'ok' : 'bad'}`}>
              <Icon name={r.differs ? 'check' : 'x'} />
              {r.differs ? ' The two versions disagree: you found the bug.' : ' Both versions give the same result for these arguments.'}
            </p>
            <div class="tw-pair">
              <div class="tw-side">
                <div class="label">Correct version</div>
                <pre class="term-out">{`${q.fnName}${displayArgs(pair!.args)}\n→ ${r.refResult}`}</pre>
              </div>
              <div class={`tw-side${r.differs ? ' differs' : ''}`}>
                <div class="label">Buggy version</div>
                <pre class="term-out">{`${q.fnName}${displayArgs(pair!.args)}\n→ ${r.bugResult}`}</pre>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {wb.resultSlot}
      {revealed ? (
        <section class="stack" aria-label="Answer">
          {q.solution.code ? (
            <>
              <h3 class="label">An input that breaks it</h3>
              <CodeBlock code={q.solution.code} />
            </>
          ) : null}
          <h3 class="label">Where the bug is</h3>
          <DiffView before={q.reference} after={q.buggy} beforeLabel="Correct version" afterLabel="Buggy version" />
        </section>
      ) : null}
    </div>
  );
}
