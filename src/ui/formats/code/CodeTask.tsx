// Shared workspace for editor-based code formats (write, fixBug, refactor):
// editor + Run / Submit toolbar + tabbed panel (Tests, Output, Input, Problems, Explain).
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { RuleId } from '../../../content/ids.ts';
import type { Question, Test } from '../../../content/schema.ts';
import type { FormatProps, GradeResult } from '../../../engine/types.ts';
import type { AstFinding, PyError, TestsResult } from '../../../runtime/protocol.ts';
import { py } from '../../../app/services.ts';
import { Button } from '../../components/Button.tsx';
import { Callout } from '../../components/Callout.tsx';
import { CodeBlock } from '../../components/CodeBlock.tsx';
import { Icon } from '../../components/Icon.tsx';
import { CodeEditor } from '../../editor/CodeEditor.tsx';
import { useWorkbench } from '../../workbench/context.ts';
import { useConfirm } from '../../workbench/Dialog.tsx';
import { ExplainError } from '../../workbench/ExplainError.tsx';
import { openInPlayground } from '../../workbench/openInPlayground.ts';
import { PanelTabs } from '../../workbench/PanelTabs.tsx';
import type { PanelTab } from '../../workbench/PanelTabs.tsx';
import { isStarting, markersFrom, runtimeStatusText, warningFlags } from '../../workbench/plain.ts';
import { ProblemsList } from '../../workbench/ProblemsList.tsx';
import { RuleViolations, RulesList } from '../../workbench/RuleViolations.tsx';
import { firstTestsError, runTestsLogged, useProgramRunner } from '../../workbench/runner.ts';
import { kbdRun, kbdSubmit, useRunShortcuts } from '../../workbench/shortcuts.ts';
import { Terminal } from '../../workbench/Terminal.tsx';
import { TestsTable } from '../../workbench/TestsTable.tsx';
import { draftCode, stdinLines } from './logic.ts';
import './code.css';

export interface CodeTaskConfig {
  initialCode: string;
  resetLabel: string;
  kind: 'function' | 'program' | 'project';
  fnName?: string;
  rules?: RuleId[];
  tests: Test[];
  /** Exam-style: plain editor, no Run, one Submit, marks. */
  paper: boolean;
  marks?: number;
  editorLabel: string;
  grade: (result: TestsResult, code: string) => GradeResult;
  /** Extra line under the toolbar (badges, counters). */
  status?: (s: { code: string; graded: GradeResult | null }) => ComponentChildren;
  /** Shown after a submit (e.g. which idiom is still missing). */
  afterSubmit?: (s: { result: TestsResult; graded: GradeResult; code: string }) => ComponentChildren;
  /** Shown when the answer is revealed (e.g. a diff of buggy vs fixed). */
  revealedView?: (code: string) => ComponentChildren;
}

const EMPTY_FLAGS: AstFinding[] = [];

type Tab = 'tests' | 'output' | 'input' | 'files' | 'problems' | 'explain';

export function CodeTask({ fp, cfg }: { fp: FormatProps<Question>; cfg: CodeTaskConfig }) {
  const { q, mode, revealed, locked, topicId } = fp;
  const wb = useWorkbench();
  const testMode = mode === 'topic-test' || mode === 'midsem';
  const paper = cfg.paper;
  const oneShot = paper || testMode;
  const ctx = { qid: q.id, topicId };

  const [code, setCode] = useState(() => draftCode(fp.draft) ?? cfg.initialCode);
  const [tab, setTab] = useState<Tab>('tests');
  const [busy, setBusy] = useState<null | 'run' | 'submit'>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [runRes, setRunRes] = useState<TestsResult | null>(null);
  const [sub, setSub] = useState<{ result: TestsResult; graded: GradeResult; code: string } | null>(null);
  const [last, setLast] = useState<'run' | 'submit' | 'program' | null>(null);
  const [submits, setSubmits] = useState(0);
  const [stdinText, setStdinText] = useState('');
  const [analysis, setAnalysis] = useState<{ syntaxError?: PyError; flags: AstFinding[] } | null>(null);
  const [confirmEl, confirm] = useConfirm();
  const inFlight = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const program = useProgramRunner(ctx);
  const status = py.status.value;

  const visibleTests = useMemo(() => cfg.tests.filter((t) => !t.hidden), [cfg.tests]);
  /** Data files the visible tests use (hidden tests' files stay hidden until the answer is revealed). */
  const dataFiles = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of revealed ? cfg.tests : visibleTests) for (const f of t.files ?? []) if (!seen.has(f.name)) seen.set(f.name, f.content);
    return [...seen].map(([name, content]) => ({ name, content }));
  }, [cfg.tests, visibleTests, revealed]);
  const readOnly = locked || revealed || (oneShot && submits > 0);
  const canSubmit = !readOnly && busy === null && code.trim().length > 0;
  const canRun = !paper && busy === null && code.trim().length > 0;

  // Live problems (syntax + warnings), only once Python is ready and never in paper mode.
  const analyzeToken = useRef(0);
  useEffect(() => {
    if (paper || status.state !== 'ready') return;
    const my = ++analyzeToken.current;
    const t = setTimeout(() => {
      py.analyze(code).then((a) => { if (my === analyzeToken.current) setAnalysis(a); }).catch(() => undefined);
    }, 700);
    return () => clearTimeout(t);
  }, [code, paper, status.state === 'ready']);

  const change = (v: string) => {
    setCode(v);
    fp.onDraft(v);
  };

  const run = async () => {
    if (!canRun) return;
    if (cfg.kind === 'program') {
      setLast('program');
      setTab('output');
      await program.run(code, stdinLines(stdinText), visibleTests.find((t) => t.files?.length)?.files);
      return;
    }
    await runVisible();
  };

  const runVisible = async () => {
    if (!canRun || inFlight.current) return;
    inFlight.current = true;
    setBusy('run');
    setFailure(null);
    setTab('tests');
    const { result, failure: f } = await runTestsLogged({ code, tests: visibleTests, kind: cfg.kind, fnName: cfg.fnName, rules: cfg.rules }, ctx, true);
    inFlight.current = false;
    setBusy(null);
    setFailure(f);
    if (result) {
      setRunRes(result);
      setLast('run');
    }
  };

  const submit = async () => {
    if (!canSubmit || inFlight.current) return;
    if (oneShot) {
      const ok = await confirm({
        title: paper ? 'Submit your answer?' : 'Submit this answer?',
        body: paper ? 'Like the exam, you get one submission. You cannot change your code after submitting.' : 'You get one submission for this question in the test.',
        confirmLabel: 'Submit',
      });
      if (!ok) return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy('submit');
    setFailure(null);
    const { result, failure: f } = await runTestsLogged({ code, tests: cfg.tests, kind: cfg.kind, fnName: cfg.fnName, rules: cfg.rules }, ctx, false);
    inFlight.current = false;
    setBusy(null);
    setFailure(f);
    if (!result) return;
    const graded = cfg.grade(result, code);
    setSub({ result, graded, code });
    setLast('submit');
    setSubmits((n) => n + 1);
    setTab('tests');
    fp.onCheck(graded, { code, flags: result.flags.map((x) => x.flag) });
  };

  useRunShortcuts({ onRun: paper ? undefined : run, onSubmit: submit }, true, rootRef);

  const reset = async () => {
    const ok = await confirm({ title: cfg.resetLabel + '?', body: 'Your code for this question will be replaced. You can undo with Ctrl+Z (Cmd+Z on a Mac).', confirmLabel: cfg.resetLabel, danger: true });
    if (ok) change(cfg.initialCode);
  };

  // What the panel shows.
  const hideSubmitResult = testMode && !revealed;
  const testsResult: TestsResult | null = last === 'submit' && sub && !hideSubmitResult ? sub.result : last === 'run' ? runRes : sub && !hideSubmitResult ? sub.result : runRes;
  const testsTitle = testsResult && testsResult === sub?.result ? 'All tests' : 'Visible tests';
  const programErr = last === 'program' ? program.state.result?.error : undefined;
  const explainable = explainableError(testsResult, programErr, revealed);
  const syntaxError = analysis?.syntaxError ?? testsResult?.compileError ?? null;
  const flags = analysis?.flags ?? testsResult?.flags ?? EMPTY_FLAGS;
  const violations = testsResult?.ruleViolations ?? [];
  const markers = useMemo(
    () => (paper && !sub ? [] : markersFrom({ syntaxError, runtimeError: explainable && explainable !== syntaxError ? explainable : null, flags: paper ? [] : flags })),
    [paper, sub, syntaxError, explainable, flags],
  );
  const problemTotal = (syntaxError ? 1 : 0) + (paper ? 0 : warningFlags(flags).length);

  const tabs: PanelTab[] = [];
  if (wb.layout === 'full' && !paper) {
    tabs.push({ id: 'problems', label: 'Problems', badge: problemTotal || null, tone: syntaxError ? 'bad' : 'hint', content: (
      <div class="stack">
        <ProblemsList syntaxError={syntaxError} flags={flags} />
        <RuleViolations violations={violations} />
      </div>
    ) });
  }
  tabs.push({
    id: 'tests', label: 'Tests',
    badge: testsResult && !testsResult.compileError && !testsResult.topLevelError && !testsResult.missingFunction ? `${testsResult.passed}/${testsResult.total}` : testsResult ? '!' : null,
    tone: testsResult ? (testsResult.total > 0 && testsResult.passed === testsResult.total ? 'ok' : 'bad') : undefined,
    content: (
      <div class="stack">
        {failure ? <Callout tone="bad" title="Python is not available">{failure} <Button size="sm" onClick={() => py.restart('retry')}>Retry</Button></Callout> : null}
        {busy ? <p class="term-status"><span class="term-dot" aria-hidden="true" />{isStarting(status) ? 'Python is starting (about 10 to 30 seconds on the first visit). The tests run as soon as it is ready.' : busy === 'submit' ? 'Running all tests…' : 'Running the visible tests…'}</p> : null}
        {hideSubmitResult && sub ? <Callout tone="info" title="Answer submitted">Results appear when the test ends.</Callout> : null}
        {testsResult && !busy ? (
          <>
            {violations.length && wb.layout !== 'full' ? <RuleViolations violations={violations} /> : null}
            <TestsTable result={testsResult} tests={cfg.tests} revealed={revealed} title={testsTitle} onExplain={explainable ? () => setTab('explain') : undefined} />
            {sub && testsResult === sub.result && cfg.afterSubmit ? cfg.afterSubmit(sub) : null}
          </>
        ) : null}
        {!testsResult && !busy && !(hideSubmitResult && sub) ? <TestsPreview tests={visibleTests} total={cfg.tests.length} paper={paper} program={cfg.kind === 'program'} /> : null}
      </div>
    ),
  });
  if (!paper) {
    tabs.push({
      id: 'output', label: 'Output',
      badge: programErr ? '!' : null, tone: 'bad',
      content: cfg.kind === 'program' ? (
        <Terminal state={program.state} onInput={program.answer} onClear={program.clear} onExplain={() => setTab('explain')} emptyText="Press Run program to see what your program prints." />
      ) : (
        <PrintedOutput result={last === 'run' ? runRes : null} />
      ),
    });
  }
  if (cfg.kind === 'program' && !paper) {
    tabs.push({ id: 'input', label: 'Input', badge: stdinLines(stdinText).length || null, content: (
      <div class="stdin-box">
        <label for={`stdin-${q.id}`}><strong>Input lines for Run program</strong></label>
        <textarea id={`stdin-${q.id}`} value={stdinText} spellcheck={false} onInput={(e) => setStdinText(e.currentTarget.value)} placeholder={'One line per input() call, e.g.\n42\nPerth'} />
        <p>Each line answers one <code>input()</code> call, in order. If your program asks for more, the Output tab asks you to type it.</p>
      </div>
    ) });
  }
  if (dataFiles.length) {
    tabs.push({ id: 'files', label: 'Files', badge: dataFiles.length, content: <DataFiles files={dataFiles} /> });
  }
  if (!paper || sub) {
    tabs.push({ id: 'explain', label: 'Explain', badge: explainable ? '!' : null, tone: 'bad', content: <ExplainError error={explainable} code={code} /> });
  }

  const graded = sub?.graded ?? null;
  const runLabel = cfg.kind === 'program' ? 'Run program' : 'Run';

  return (
    <div class={`code-task${paper ? ' paper' : ''}`} ref={rootRef} data-run-scope>
      {confirmEl}
      {cfg.rules?.length ? <RulesList rules={cfg.rules} /> : null}
      <div class="ct-toolbar" role="toolbar" aria-label="Code actions">
        {paper ? (
          <span class="ct-marks"><Icon name="file" size={14} /> {cfg.marks ? `Worth ${cfg.marks} marks` : 'Exam-style'} · one submission, no Run</span>
        ) : (
          <>
            <Button onClick={run} disabled={!canRun} kbd={kbdRun}>
              <Icon name="play" size={14} /> {busy === 'run' ? 'Running…' : runLabel}
            </Button>
            {cfg.kind === 'program' ? (
              <Button onClick={runVisible} disabled={!canRun}>Run tests</Button>
            ) : null}
          </>
        )}
        <Button variant="primary" onClick={submit} disabled={!canSubmit} kbd={kbdSubmit}>
          <Icon name="check" size={14} /> {busy === 'submit' ? 'Checking…' : paper ? 'Submit answer' : 'Submit'}
        </Button>
        <span class="spacer" />
        {!testMode && !readOnly ? <Button size="sm" variant="ghost" onClick={reset} disabled={code === cfg.initialCode}><Icon name="refresh" size={14} /> {cfg.resetLabel}</Button> : null}
        {!testMode && !paper ? <Button size="sm" variant="ghost" onClick={() => openInPlayground(code, `${q.id}.py`)}><Icon name="terminal" size={14} /> Playground</Button> : null}
      </div>
      {cfg.status ? <div class="ct-status">{cfg.status({ code, graded })}</div> : null}
      {!paper && status.state !== 'ready' && status.state !== 'running' ? (
        <p class="ct-runtime" aria-live="polite">{runtimeStatusText(status)}{isStarting(status) ? '. You can start typing now.' : ''}</p>
      ) : null}
      <CodeEditor
        value={code}
        onChange={change}
        readOnly={readOnly}
        plain={paper}
        markers={markers}
        onRun={paper ? undefined : run}
        onSubmit={submit}
        onCursor={wb.onCursor}
        ariaLabel={cfg.editorLabel}
        minHeight={paper ? 280 : 200}
        maxHeight={620}
      />
      {wb.layout !== 'full' && !paper && problemTotal > 0 ? <ProblemsList syntaxError={syntaxError} flags={flags} compact /> : null}
      {revealed && cfg.revealedView ? cfg.revealedView(code) : null}
      {revealed && !wb.pageShowsAnswer && q.solution.code ? (
        <div class="stack">
          <h3 class="label">Model answer</h3>
          <CodeBlock code={q.solution.code} numbered />
        </div>
      ) : null}
      <PanelTabs label="Results" tabs={tabs} active={tabs.some((t) => t.id === tab) ? tab : 'tests'} onChange={(id) => setTab(id as Tab)} class="ct-panel" />
    </div>
  );
}

function explainableError(r: TestsResult | null, programErr: PyError | undefined, revealed: boolean): PyError | null {
  if (programErr) return programErr;
  if (!r) return null;
  if (r.compileError || r.topLevelError) return firstTestsError(r) ?? null;
  const o = r.outcomes.find((x) => x.error && (!x.hidden || revealed));
  return o?.error ?? null;
}

function TestsPreview({ tests, total, paper, program }: { tests: Test[]; total: number; paper: boolean; program: boolean }) {
  const hidden = total - tests.length;
  return (
    <div class="tests-preview">
      <p class="muted">
        {paper
          ? `Your answer is marked by ${total} tests when you submit.`
          : `Run checks your code against the ${tests.length} visible ${tests.length === 1 ? 'test' : 'tests'}. Submit runs all ${total}${hidden ? `, including ${hidden} hidden` : ''}.`}
      </p>
      {tests.length && !paper ? (
        <div class="tests-scroll">
          <table class="tests-table">
            <thead><tr><th scope="col">Test</th><th scope="col">Expected</th></tr></thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id}>
                  <td data-label="Test">
                    <div class="tt-cell">
                      {t.setup ? <pre class="tt-code tt-setup">{t.setup}</pre> : null}
                      {t.call ? <pre class="tt-code">{t.call}</pre> : <div>{t.label}</div>}
                      {program && t.stdin?.length ? <div class="tt-sub">Input: <code>{t.stdin.join(' ⏎ ')}</code></div> : null}
                    </div>
                  </td>
                  <td data-label="Expected"><div class="tt-cell"><pre class="tt-code">{t.expect ?? t.expectStdout ?? ''}</pre></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function DataFiles({ files }: { files: { name: string; content: string }[] }) {
  return (
    <div class="stack">
      <p class="muted">The visible tests create these files before calling your code. Open them by name, exactly as given.</p>
      {files.map((f) => (
        <details key={f.name} class="data-file" open={files.length === 1}>
          <summary><code>{f.name}</code> <span class="faint">· {lineCount(f.content)} {lineCount(f.content) === 1 ? 'line' : 'lines'}</span></summary>
          <pre class="term-out data-file-body">{f.content}</pre>
        </details>
      ))}
    </div>
  );
}

function lineCount(text: string) {
  if (!text) return 0;
  return text.replace(/\n$/, '').split('\n').length;
}

function PrintedOutput({ result }: { result: TestsResult | null }) {
  if (!result) return <p class="term-empty">Anything your code prints during Run appears here.</p>;
  const printed = result.outcomes.filter((o) => o.stdout && !o.hidden);
  if (!printed.length) return <p class="term-empty">Your code did not print anything during the visible tests.</p>;
  return (
    <div class="stack">
      {printed.map((o) => (
        <div key={o.id}>
          <div class="label">{o.label}</div>
          <pre class="term-out">{o.stdout}</pre>
        </div>
      ))}
    </div>
  );
}
