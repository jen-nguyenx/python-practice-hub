// Playground output pane on the dark card: Output (terminal with input() line), Problems and Explain tabs.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { py } from '../../app/services.ts';
import { explainError } from '../../content/mistakes.ts';
import type { AstFinding, PyError } from '../../runtime/protocol.ts';
import { CodeBlock } from '../components/CodeBlock.tsx';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import type { ProgramRunState } from '../workbench/runner.ts';
import { FLAG_TEXT, errorOneLine, isStarting, mistakeLabel, warningFlags } from '../workbench/plain.ts';
import { kbdRunShort } from '../workbench/shortcuts.ts';
import { CardIconButton } from './FileTabs.tsx';

export type OutputTab = 'output' | 'problems' | 'explain';

export interface OutputPaneProps {
  tab: OutputTab;
  onTab: (t: OutputTab) => void;
  state: ProgramRunState;
  onInput: (line: string) => void;
  onClear: () => void;
  onRestart: () => void;
  syntaxError: PyError | null;
  flags: readonly AstFinding[];
  runError: PyError | null;
  code: string;
}

const TABS: { id: OutputTab; label: string }[] = [
  { id: 'output', label: 'Output' },
  { id: 'problems', label: 'Problems' },
  { id: 'explain', label: 'Explain' },
];

export function OutputPane(p: OutputPaneProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const warns = warningFlags(p.flags);
  const problemCount = (p.syntaxError ? 1 : 0) + warns.length;
  const explainable = p.runError && p.runError.type !== 'OutputLimit' ? p.runError : null;
  // Explain the run error, or else the syntax error found while typing.
  const explainTarget = explainable ?? p.syntaxError;
  const badge: Record<OutputTab, { text: string; tone: 'bad' | 'hint'; label: string } | null> = {
    output: null,
    problems: problemCount ? { text: String(problemCount), tone: p.syntaxError ? 'bad' : 'hint', label: `${problemCount} ${problemCount === 1 ? 'problem' : 'problems'}` } : null,
    explain: explainTarget ? { text: '1', tone: 'bad', label: 'an error to explain' } : null,
  };
  const hasOutput = !!(p.state.result || p.state.failure || p.state.running);

  const onKey = (e: KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === p.tab);
    let n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = TABS.length - 1;
    if (n < 0) return;
    e.preventDefault();
    p.onTab(TABS[n].id);
    requestAnimationFrame(() => listRef.current?.querySelectorAll<HTMLElement>('[role=tab]')[n]?.focus());
  };

  return (
    <section class="pg-out" aria-label="Output">
      <div class="pg-out-head">
        <div class="pg-out-tabs" role="tablist" aria-label="Output views" ref={listRef} onKeyDown={onKey}>
          {TABS.map((t) => {
            const selected = t.id === p.tab;
            const b = badge[t.id];
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`pg-out-tab-${t.id}`}
                aria-selected={selected}
                aria-controls="pg-out-panel"
                tabIndex={selected ? 0 : -1}
                class={`pg-out-tab${selected ? ' active' : ''}`}
                onClick={() => p.onTab(t.id)}
              >
                {t.label}
                {b ? <span class={`pg-badge ${b.tone}`}><span aria-hidden="true">{b.text}</span><span class="sr-only">, {b.label}</span></span> : null}
              </button>
            );
          })}
        </div>
        {p.tab === 'output' && hasOutput && !p.state.running ? (
          <CardIconButton icon="trash" label="Clear output" onClick={p.onClear} />
        ) : null}
      </div>
      <div class="pg-out-body" role="tabpanel" id="pg-out-panel" aria-labelledby={`pg-out-tab-${p.tab}`} tabIndex={0}>
        {p.tab === 'output' ? (
          <Terminal state={p.state} onInput={p.onInput} onRestart={p.onRestart} onExplain={explainable ? () => p.onTab('explain') : undefined} />
        ) : p.tab === 'problems' ? (
          <Problems syntaxError={p.syntaxError} warns={warns} />
        ) : (
          <Explain error={explainTarget} code={p.code} />
        )}
      </div>
    </section>
  );
}

function Empty({ icon, children, sub }: { icon: 'terminal' | 'check'; children: ComponentChildren; sub?: ComponentChildren }) {
  return (
    <div class="pg-empty">
      <span class="pg-empty-icon"><Icon name={icon} size={20} /></span>
      <p>{children}</p>
      {sub ? <p class="pg-empty-sub">{sub}</p> : null}
    </div>
  );
}

function Terminal({ state, onInput, onRestart, onExplain }: { state: ProgramRunState; onInput: (line: string) => void; onRestart: () => void; onExplain?: () => void }) {
  const status = py.status.value;
  const { running, result, failure } = state;
  const [line, setLine] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const needInput = !running && result?.needInput ? result.needInput : null;

  let stdout = result?.stdout ?? '';
  if (needInput?.prompt && stdout.endsWith(needInput.prompt)) stdout = stdout.slice(0, -needInput.prompt.length);
  // The prompt sits on the same line as whatever the program printed just before input() (no newline).
  const lastNl = stdout.lastIndexOf('\n');
  const before = needInput ? stdout.slice(0, lastNl + 1) : stdout;
  const promptText = needInput ? stdout.slice(lastNl + 1) + (needInput.prompt ?? '') : '';

  useEffect(() => {
    if (needInput) inputRef.current?.focus({ preventScroll: true });
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [needInput?.prompt, state.typed.length, !!needInput, result]);

  const err = result?.error;
  if (!running && !result && !failure) {
    return <Empty icon="terminal" sub={<>Press Run or <kbd class="pg-kbd">{kbdRunShort}</kbd></>}>Run your code to see output here</Empty>;
  }
  return (
    <div class="pg-term" aria-live="polite">
      {running && !result ? (
        <p class="pg-term-status"><span class="pg-term-dot" aria-hidden="true" />{isStarting(status) ? 'Starting Python · the first start takes 10 to 30 s' : 'Running…'}</p>
      ) : null}
      {failure ? (
        <div class="pg-term-error">
          <p class="pg-term-error-head"><Icon name="alert" size={14} /> Python is not available</p>
          <pre class="pg-term-tb">{failure}</pre>
          <button type="button" class="pg-link" onClick={onRestart}>Restart Python</button>
        </div>
      ) : null}
      {result && !failure ? (
        <>
          {before ? <pre class="pg-term-out">{before}</pre> : null}
          {needInput ? (
            <form
              class="pg-term-input"
              onSubmit={(e) => {
                e.preventDefault();
                onInput(line);
                setLine('');
              }}
            >
              <label class="pg-term-prompt" for="pg-term-line">{promptText || <span class="pg-term-faint">input</span>}</label>
              <input
                id="pg-term-line"
                ref={inputRef}
                value={line}
                onInput={(e) => setLine(e.currentTarget.value)}
                autocomplete="off"
                spellcheck={false}
                autocapitalize="off"
                {...{ autocorrect: 'off' }}
                aria-describedby="pg-term-note"
              />
              <p id="pg-term-note" class="pg-term-note">Enter sends this line · the program restarts from the top with your answers</p>
            </form>
          ) : null}
          {err ? (
            <div class="pg-term-error">
              <p class="pg-term-error-head">
                <Icon name="alert" size={14} />
                <span>{errorHeading(err)}</span>
              </p>
              {err.type === 'TimeoutError' || err.type === 'OutputLimit' ? <p class="pg-term-error-msg">{err.message}</p> : null}
              <pre class="pg-term-tb">{err.traceback?.trim() ? err.traceback.trim() : errorOneLine(err)}</pre>
              {onExplain ? <button type="button" class="pg-link" onClick={onExplain}>Explain this error <Icon name="arrowRight" size={14} /></button> : null}
            </div>
          ) : null}
          {result.timedOut && !err ? <p class="pg-term-warn">Stopped: the program ran too long. Check for a loop that never ends.</p> : null}
          {result.outputTruncated ? <p class="pg-term-warn">Output was cut off because it was very long.</p> : null}
          {!stdout && !err && !needInput && !result.timedOut ? <p class="pg-term-faint">The program finished without printing anything.</p> : null}
          {running ? <p class="pg-term-status"><span class="pg-term-dot" aria-hidden="true" />Running…</p> : null}
          {!running && !needInput && !err && !result.timedOut ? (
            <p class="pg-term-done"><Icon name="check" size={14} /> Finished{result.durationMs ? ` in ${Math.round(result.durationMs)} ms` : ''}</p>
          ) : null}
        </>
      ) : null}
      <div ref={endRef} />
    </div>
  );
}

function errorHeading(err: PyError): string {
  const where = err.line ? ` on line ${err.line}` : '';
  if (err.type === 'TimeoutError') return `Stopped${where}: the program ran too long`;
  if (err.type === 'OutputLimit') return `Stopped${where}: too much output`;
  return `${err.type}${where}`;
}

function Problems({ syntaxError, warns }: { syntaxError: PyError | null; warns: AstFinding[] }) {
  if (!syntaxError && !warns.length) {
    return <Empty icon="check" sub="Checked as you type">No problems found</Empty>;
  }
  return (
    <ul class="pg-problems">
      {syntaxError ? (
        <li class="pg-problem error">
          <span class="pg-problem-icon"><Icon name="x" size={14} label="Error" /></span>
          <span class="pg-problem-line">{syntaxError.line ? `Line ${syntaxError.line}` : 'Code'}</span>
          <span class="pg-problem-text">
            Python cannot read this code
            <span class="pg-problem-msg">{syntaxError.type}: {syntaxError.message}</span>
          </span>
        </li>
      ) : null}
      {warns.map((f, i) => (
        <li key={`${f.flag}-${f.line}-${i}`} class="pg-problem warning">
          <span class="pg-problem-icon"><Icon name="alert" size={14} label="Warning" /></span>
          <span class="pg-problem-line">Line {f.line}</span>
          <div class="pg-problem-text"><Markdown text={FLAG_TEXT[f.flag] ?? ''} /></div>
        </li>
      ))}
    </ul>
  );
}

function Explain({ error, code }: { error: PyError | null; code: string }) {
  if (!error) {
    return <Empty icon="check" sub="When Python stops with an error, it is explained here">No errors to explain</Empty>;
  }
  if (error.type === 'TimeoutError') {
    return (
      <div class="pg-explain">
        <h3 class="pg-explain-title">The code ran for too long</h3>
        <Markdown text={'Python stopped your code because it was still running after a few seconds. This almost always means a loop that never ends.\n\n- In a `while` loop, check that the condition eventually becomes false.\n- Make sure the loop variable changes inside the loop.'} />
      </div>
    );
  }
  const ex = explainError({ type: error.type, message: error.message, line: error.line });
  const lines = code.split('\n');
  const lineText = error.line && lines[error.line - 1] !== undefined ? lines[error.line - 1] : null;
  const labels = [...new Set([...(error.mistakes ?? []), ...ex.mistakes])].map(mistakeLabel).filter(Boolean) as string[];
  return (
    <div class="pg-explain">
      <h3 class="pg-explain-title">{ex.title}</h3>
      <pre class="pg-explain-msg">{`${error.type}: ${error.message}`}</pre>
      {ex.meaning ? (
        <section>
          <h4 class="pg-label">What it means</h4>
          <Markdown text={ex.meaning} />
        </section>
      ) : null}
      {error.line ? (
        <section>
          <h4 class="pg-label">Why here</h4>
          <p>Python stopped on line {error.line}{lineText !== null ? ':' : '.'}</p>
          {lineText !== null ? <CodeBlock code={lineText.trim() || ' '} dark class="pg-explain-code" /> : null}
          {labels.length ? <p class="pg-muted">This is often caused by: {labels.join('; ')}.</p> : null}
        </section>
      ) : labels.length ? <p class="pg-muted">This is often caused by: {labels.join('; ')}.</p> : null}
      {ex.fix ? (
        <section>
          <h4 class="pg-label">How to fix it</h4>
          <Markdown text={ex.fix} />
        </section>
      ) : null}
    </div>
  );
}
