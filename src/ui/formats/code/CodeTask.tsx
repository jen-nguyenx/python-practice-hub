// Shared workspace for editor-based code formats (write, fixBug, refactor): a dark editor card (file tab, runtime
// label, Monaco, bottom bar with Run tests / Submit / Reset code) and a white Tests card below it with quiet tabs
// for Output, Input, Files, Problems and Explain when they have something to show.
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
import { EditorCard } from '../../workbench/EditorCard.tsx';
import { ExplainError } from '../../workbench/ExplainError.tsx';
import { href } from '../../../app/router.ts';
import { openInPlayground } from '../../workbench/openInPlayground.ts';
import { markersFrom, warningFlags } from '../../workbench/plain.ts';
import { ProblemsList } from '../../workbench/ProblemsList.tsx';
import { RuleViolations, RulesList } from '../../workbench/RuleViolations.tsx';
import { firstTestsError, runTestsLogged, useProgramRunner } from '../../workbench/runner.ts';
import { MOD, useRunShortcuts } from '../../workbench/shortcuts.ts';
import { Terminal } from '../../workbench/Terminal.tsx';
import type { CardTab } from '../../workbench/TestsTable.tsx';
import { ResultsCard, TestRows, TestsStatusChip } from '../../workbench/TestsTable.tsx';
import { IconButton } from '../../workbench/Tip.tsx';
import { draftCode, stdinLines } from './logic.ts';
import { BusyLine } from './Workspace.tsx';
import './code.css';
import { hidesHelp } from '../../../engine/types.ts';

export interface CodeTaskConfig {
  initialCode: string;
  /** What "Reset code" puts back, named in the confirm dialog: "starter code" or "original code". */
  resetTo: string;
  kind: 'function' | 'program' | 'project';
  fnName?: string;
  rules?: RuleId[];
  tests: Test[];
  /** Exam-style: plain editor, no Run, one Submit, marks. */
  paper: boolean;
  marks?: number;
  editorLabel: string;
  grade: (result: TestsResult, code: string) => GradeResult;
  /** Short status in the editor's bottom bar (e.g. lines changed). */
  status?: (s: { code: string; graded: GradeResult | null }) => ComponentChildren;
  /** Shown above the test results after a submit (e.g. which idiom is still missing). */
  afterSubmit?: (s: { result: TestsResult; graded: GradeResult; code: string }) => ComponentChildren;
  /** Shown under the tests when the answer is revealed (e.g. a diff). */
  revealedView?: (code: string) => ComponentChildren;
}

const EMPTY_FLAGS: AstFinding[] = [];

export function CodeTask({ fp, cfg }: { fp: FormatProps<Question>; cfg: CodeTaskConfig }) {
  const { q, mode, revealed, locked, topicId } = fp;
  const wb = useWorkbench();
  const testMode = hidesHelp(mode);
  const paper = cfg.paper;
  const oneShot = paper || testMode;
  const ctx = { qid: q.id, topicId };

  const [code, setCode] = useState(() => draftCode(fp.draft) ?? cfg.initialCode);
  const [tab, setTab] = useState('tests');
  const [busy, setBusy] = useState<null | 'run' | 'submit'>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [runRes, setRunRes] = useState<{ result: TestsResult; code: string } | null>(null);
  const [sub, setSub] = useState<{ result: TestsResult; graded: GradeResult; code: string } | null>(null);
  const [last, setLast] = useState<'run' | 'submit' | 'program' | null>(null);
  const [submits, setSubmits] = useState(0);
  const [stdinText, setStdinText] = useState('');
  const [analysis, setAnalysis] = useState<{ code: string; syntaxError?: PyError; flags: AstFinding[] } | null>(null);
  const [confirmEl, confirm] = useConfirm();
  const inFlight = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const program = useProgramRunner(ctx);
  const status = py.status.value;

  const visibleTests = useMemo(() => cfg.tests.filter((t) => !t.hidden), [cfg.tests]);
  const hiddenCount = cfg.tests.length - visibleTests.length;
  /** Data files the visible tests use (hidden tests' files stay hidden until the answer is revealed). */
  const dataFiles = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of revealed ? cfg.tests : visibleTests) for (const f of t.files ?? []) if (!seen.has(f.name)) seen.set(f.name, f.content);
    return [...seen].map(([name, content]) => ({ name, content }));
  }, [cfg.tests, visibleTests, revealed]);
  const readOnly = locked || revealed || (oneShot && submits > 0);
  const canSubmit = !readOnly && busy === null && code.trim().length > 0;
  // Once the question is finished the editor is read-only and Submit is off, so Run tests goes off with them.
  const canRun = !paper && !readOnly && busy === null && code.trim().length > 0;

  // Live problems (syntax + warnings), only once Python is ready and never in paper mode. The analysis is stored
  // with the code it describes, so an older analysis is ignored the moment the code changes (see `fresh` below).
  const analyzeToken = useRef(0);
  useEffect(() => {
    if (paper || status.state !== 'ready') return;
    const my = ++analyzeToken.current;
    const t = setTimeout(() => {
      py.analyze(code).then((a) => { if (my === analyzeToken.current) setAnalysis({ code, ...a }); }).catch(() => undefined);
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
      setRunRes({ result, code });
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
    setTab('tests');
    const { result, failure: f } = await runTestsLogged({ code, tests: cfg.tests, kind: cfg.kind, fnName: cfg.fnName, rules: cfg.rules }, ctx, false);
    inFlight.current = false;
    setBusy(null);
    setFailure(f);
    if (!result) return;
    const graded = cfg.grade(result, code);
    setSub({ result, graded, code });
    setLast('submit');
    setSubmits((n) => n + 1);
    fp.onCheck(graded, { code, flags: result.flags.map((x) => x.flag) });
  };

  useRunShortcuts({ onRun: paper ? undefined : run, onSubmit: submit }, true, rootRef);

  // One wording everywhere: the button, the dialog title and the confirm button all say "Reset code".
  const reset = async () => {
    const ok = await confirm({
      title: 'Reset code?',
      body: `Your code goes back to the ${cfg.resetTo}. You can undo with Ctrl+Z (Cmd+Z on a Mac).`,
      confirmLabel: 'Reset code',
      danger: true,
    });
    if (ok) change(cfg.initialCode);
  };

  // What the card shows.
  const hideSubmitResult = testMode && !revealed;
  const shownTests = last === 'submit' && sub && !hideSubmitResult ? sub : last === 'run' ? runRes : sub && !hideSubmitResult ? sub : runRes;
  const testsResult: TestsResult | null = shownTests?.result ?? null;
  // The last run describes the code it ran on. After an edit it is stale, so nothing derived from it may point at
  // a line number any more: the Problems badge and the editor squiggles clear as soon as the code changes.
  const testsStale = !!shownTests && shownTests.code !== code;
  const fresh = analysis && analysis.code === code ? analysis : null;
  const programErr = last === 'program' ? program.state.result?.error : undefined;
  const explainable = explainableError(testsResult, programErr, revealed);
  const syntaxError = fresh?.syntaxError ?? (testsStale ? null : testsResult?.compileError) ?? null;
  const flags = fresh?.flags ?? (testsStale ? EMPTY_FLAGS : testsResult?.flags) ?? EMPTY_FLAGS;
  const violations = testsResult?.ruleViolations ?? [];
  const liveViolations = testsStale ? [] : violations;
  const liveError = testsStale ? null : explainable;
  const markers = useMemo(
    () => (paper && !sub ? [] : markersFrom({ syntaxError, runtimeError: liveError && liveError !== syntaxError ? liveError : null, flags: paper ? [] : flags })),
    [paper, sub, syntaxError, liveError, flags],
  );
  const problemTotal = (syntaxError ? 1 : 0) + (paper ? 0 : warningFlags(flags).length);
  const graded = sub?.graded ?? null;

  const tabs: CardTab[] = [];
  tabs.push({
    id: 'tests', label: 'Tests',
    content: (
      <div class="ct-stack">
        {failure ? <Callout tone="bad" title="Python is not available">{failure} <Button size="sm" onClick={() => py.restart('retry')}>Retry</Button></Callout> : null}
        {busy ? <BusyLine status={status} starting="the first start takes 10 to 30 s" running={busy === 'submit' ? 'Running all tests…' : 'Running the visible tests…'} /> : null}
        {hideSubmitResult && sub ? <p class="muted">Answer submitted · results appear when the test ends</p> : null}
        {testsResult && !busy && violations.length ? <RuleViolations violations={violations} /> : null}
        {sub && testsResult === sub.result && !busy && cfg.afterSubmit ? cfg.afterSubmit(sub) : null}
        {!busy ? (
          <TestRows
            tests={hideSubmitResult ? visibleTests : cfg.tests}
            result={testsResult}
            revealed={revealed}
            onExplain={explainable ? () => setTab('explain') : undefined}
          />
        ) : null}
        {paper && !sub ? <p class="ct-note">{cfg.tests.length} tests mark your answer when you submit.</p> : null}
        {cfg.kind === 'program' && !paper ? (
          <div><button type="button" class="link-btn" onClick={runVisible} disabled={!canRun}><Icon name="play" size={12} /> Run the visible tests</button></div>
        ) : null}
      </div>
    ),
  });
  if (!paper && (cfg.kind === 'program' || (last === 'run' && runRes?.result.outcomes.some((o) => o.stdout && !o.hidden)))) {
    tabs.push({
      id: 'output', label: 'Output', badge: programErr ? '!' : null,
      content: cfg.kind === 'program' ? (
        <Terminal state={program.state} onInput={program.answer} onClear={program.clear} onExplain={() => setTab('explain')} emptyText="Press Run to see what your program prints." />
      ) : (
        <PrintedOutput result={last === 'run' ? runRes?.result ?? null : null} />
      ),
    });
  }
  if (cfg.kind === 'program' && !paper) {
    tabs.push({ id: 'input', label: 'Input', badge: stdinLines(stdinText).length || null, content: (
      <div class="stdin-box">
        <label for={`stdin-${q.id}`}>Lines for <code>input()</code>, one per call</label>
        <textarea id={`stdin-${q.id}`} value={stdinText} spellcheck={false} onInput={(e) => setStdinText(e.currentTarget.value)} placeholder={'42\nPerth'} />
      </div>
    ) });
  }
  if (dataFiles.length) {
    tabs.push({ id: 'files', label: 'Files', badge: dataFiles.length, content: <DataFiles files={dataFiles} /> });
  }
  if (!paper && (problemTotal > 0 || liveViolations.length > 0)) {
    tabs.push({ id: 'problems', label: 'Problems', badge: problemTotal + liveViolations.length, content: (
      <div class="ct-stack">
        <ProblemsList syntaxError={syntaxError} flags={flags} />
        <RuleViolations violations={liveViolations} />
      </div>
    ) });
  }
  if ((!paper || sub) && explainable) {
    tabs.push({ id: 'explain', label: 'Explain', content: <ExplainError error={explainable} code={code} /> });
  }
  const activeTab = tabs.some((t) => t.id === tab) ? tab : 'tests';

  const runLabel = cfg.kind === 'program' ? 'Run' : 'Run tests';
  const footer = paper ? (
    <>
      <Button variant="primary" onClick={submit} disabled={!canSubmit}>
        {busy === 'submit' ? 'Checking…' : 'Submit answer'}
      </Button>
      <span class="ed-note">{cfg.marks ? `${cfg.marks} marks · ` : ''}one submission</span>
      {cfg.status ? <span class="ct-status">{cfg.status({ code, graded })}</span> : null}
      <span class="ed-kbd" aria-hidden="true">{MOD} + Shift + Enter</span>
    </>
  ) : (
    <>
      <Button
        variant="primary"
        onClick={run}
        disabled={!canRun}
        title={readOnly ? 'This question is finished, so the code and the tests are locked' : `${MOD}+Enter runs the visible tests`}
        aria-keyshortcuts={MOD === '⌘' ? 'Meta+Enter' : 'Control+Enter'}
      >
        <Icon name="play" size={12} /> {busy === 'run' ? 'Running…' : runLabel}
      </Button>
      <Button onClick={submit} disabled={!canSubmit} title={`Runs every test, including hidden ones · ${MOD}+Shift+Enter`} aria-keyshortcuts={MOD === '⌘' ? 'Meta+Shift+Enter' : 'Control+Shift+Enter'}>
        {busy === 'submit' ? 'Checking…' : testMode ? 'Submit answer' : 'Submit'}
      </Button>
      {!testMode && !readOnly ? <Button onClick={reset} disabled={code === cfg.initialCode}>Reset code</Button> : null}
      {cfg.status ? <span class="ct-status">{cfg.status({ code, graded })}</span> : null}
      <span class="ed-kbd" title={`${MOD}+Enter runs · ${MOD}+Shift+Enter submits · Esc then Tab leaves the editor`}>
        {MOD} + Enter
      </span>
      {!testMode ? <IconButton icon="terminal" size="sm" label="Open in Playground" align="end" class="ed-icon" onClick={() => openInPlayground(code, `${q.id}.py`, { href: href.question(q.id), label: q.title })} /> : null}
    </>
  );

  const editor = (
    <CodeEditor
      value={code}
      onChange={change}
      readOnly={readOnly}
      plain={paper}
      markers={markers}
      onRun={paper ? undefined : run}
      onSubmit={submit}
      onCursor={wb.onCursor}
      ariaLabel={`${cfg.editorLabel}. Press Escape then Tab to leave the editor.`}
      hideHint
      minHeight={paper ? 360 : 320}
      maxHeight={640}
    />
  );

  const idleText = paper || testMode
    ? `${cfg.tests.length} ${cfg.tests.length === 1 ? 'test' : 'tests'}`
    : `${visibleTests.length} visible${hiddenCount ? ` · ${hiddenCount} hidden` : ''}`;

  return (
    <div class={`ct${paper ? ' paper' : ''}`} ref={rootRef} data-run-scope>
      {confirmEl}
      {cfg.rules?.length && !wb.onQuestionPage ? <RulesList rules={cfg.rules} /> : null}
      <EditorCard file={cfg.kind === 'function' ? 'solution.py' : 'main.py'} label="Code editor" footer={footer}>
        {editor}
      </EditorCard>
      {wb.resultSlot}
      <ResultsCard
        label="Results"
        tabs={tabs}
        active={activeTab}
        onTab={setTab}
        status={<TestsStatusChip result={hideSubmitResult ? null : testsResult} busy={!!busy} idleText={idleText} />}
      />
      {revealed && cfg.revealedView ? cfg.revealedView(code) : null}
      {revealed && !wb.pageShowsAnswer && q.solution.code ? (
        <div class="stack">
          <h3 class="label">Model answer</h3>
          <CodeBlock code={q.solution.code} numbered />
        </div>
      ) : null}
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

function DataFiles({ files }: { files: { name: string; content: string }[] }) {
  return (
    <div class="ct-stack">
      <p class="muted">Tests create these files first · open them by name</p>
      {files.map((f) => (
        <details key={f.name} class="data-file" open={files.length === 1}>
          <summary><code>{f.name}</code> <span class="faint">{lineCount(f.content)} {lineCount(f.content) === 1 ? 'line' : 'lines'}</span></summary>
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
  if (!printed.length) return <p class="term-empty">Nothing was printed during the visible tests.</p>;
  return (
    <div class="ct-stack">
      {printed.map((o) => (
        <div key={o.id}>
          <div class="label">{o.label}</div>
          <pre class="term-out">{o.stdout}</pre>
        </div>
      ))}
    </div>
  );
}
