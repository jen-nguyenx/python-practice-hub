// Tests card: a white card with quiet tabs (Tests, Output, Problems, Explain ...) and a status chip, and the test
// rows inside it (round pass/fail icon, mono "call → expected", failing rows tinted with "got X"; hidden tests
// show their label only).
import type { ComponentChildren } from 'preact';
import { useId, useRef } from 'preact/hooks';
import type { Test } from '../../content/schema.ts';
import type { TestOutcome, TestsResult } from '../../runtime/protocol.ts';
import { Icon } from '../components/Icon.tsx';
import { errorOneLine, mistakeLabel } from './plain.ts';
import './workbench.css';

export function testsSummary(r: TestsResult): string {
  if (r.compileError) return 'Syntax error: no tests were run';
  if (r.topLevelError) return 'Your code crashed before the tests: no tests were run';
  if (r.missingFunction) return `Function ${r.missingFunction} not found: no tests were run`;
  return `${r.passed} of ${r.total} tests passed`;
}

export function isBlocked(r: TestsResult) {
  return !!(r.compileError || r.topLevelError || r.missingFunction);
}

export function allPassed(r: TestsResult | null | undefined) {
  return !!r && !isBlocked(r) && r.total > 0 && r.passed === r.total;
}

/** "3 of 4 passing" chip (or "Not run", "Syntax error"). */
export function TestsStatusChip({ result, busy, idleText }: { result: TestsResult | null; busy?: boolean; idleText?: string }) {
  if (busy) return <span class="status-chip"><span class="status-dot running" aria-hidden="true" />Running…</span>;
  if (!result) return idleText ? <span class="status-chip">{idleText}</span> : null;
  if (isBlocked(result)) {
    return <span class="status-chip bad"><Icon name="x" size={12} />{result.compileError ? 'Syntax error' : result.missingFunction ? 'Function missing' : 'Crashed'}</span>;
  }
  const ok = allPassed(result);
  return (
    <span class={`status-chip ${ok ? 'ok' : 'bad'}`}>
      <Icon name={ok ? 'check' : 'alert'} size={12} />
      {result.passed} of {result.total} passing
    </span>
  );
}

export interface CardTab {
  id: string;
  label: string;
  /** Small count after the label. */
  badge?: string | number | null;
  content: ComponentChildren;
}

/** White card with quiet tabs. With a single tab the tab strip reads as a plain header. */
export function ResultsCard({ tabs, active, onTab, status, label }: { tabs: CardTab[]; active: string; onTab: (id: string) => void; status?: ComponentChildren; label: string }) {
  const base = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  const single = tabs.length === 1;
  const onKey = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === current?.id);
    let n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = tabs.length - 1;
    if (n < 0) return;
    e.preventDefault();
    onTab(tabs[n].id);
    requestAnimationFrame(() => listRef.current?.querySelectorAll<HTMLButtonElement>('[role=tab]')[n]?.focus());
  };
  return (
    <section class="rc" aria-label={label}>
      <div class="rc-head">
        {single ? (
          <h2 class="rc-title">{current?.label}</h2>
        ) : (
          <div class="rc-tabs" role="tablist" aria-label={label} ref={listRef} onKeyDown={onKey}>
            {tabs.map((t) => {
              const selected = t.id === current?.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`${base}-tab-${t.id}`}
                  aria-selected={selected}
                  aria-controls={`${base}-panel`}
                  tabIndex={selected ? 0 : -1}
                  class={`rc-tab${selected ? ' active' : ''}`}
                  onClick={() => onTab(t.id)}
                >
                  {t.label}
                  {t.badge !== undefined && t.badge !== null && t.badge !== '' ? <span class="rc-badge">{t.badge}</span> : null}
                </button>
              );
            })}
          </div>
        )}
        <span class="rc-status" aria-live="polite">{status}</span>
      </div>
      <div
        class="rc-body"
        role={single ? undefined : 'tabpanel'}
        id={`${base}-panel`}
        aria-labelledby={single ? undefined : `${base}-tab-${current?.id}`}
      >
        {current?.content}
      </div>
    </section>
  );
}

function gotText(o: TestOutcome, program: boolean): string {
  if (o.error) return errorOneLine(o.error);
  if (o.timedOut) return 'took too long (a loop may never end)';
  if (program) return o.stdout;
  return o.got ?? '';
}

export interface TestRowsProps {
  tests: readonly Test[];
  result: TestsResult | null;
  /** Show hidden test values (after the answer is revealed). */
  revealed: boolean;
  onExplain?: () => void;
  /** Shown instead of rows when there is nothing to list. */
  emptyText?: string;
}

export function TestRows({ tests, result, revealed, onExplain, emptyText }: TestRowsProps) {
  const byId = new Map(tests.map((t) => [t.id, t]));
  const blocking = result ? result.compileError ?? result.topLevelError : undefined;
  const ran = new Set(result?.outcomes.map((o) => o.id) ?? []);
  return (
    <div class="tr">
      {blocking ? (
        <div class="tr-block">
          <Icon name="x" size={14} />
          <div>
            <p>
              {result!.compileError
                ? `Python could not read your code${blocking.line ? ` (line ${blocking.line})` : ''}: ${blocking.type}: ${blocking.message}`
                : `Code outside your function crashed${blocking.line ? ` on line ${blocking.line}` : ''}: ${errorOneLine(blocking)}`}
            </p>
            {onExplain ? <button type="button" class="link-btn" onClick={onExplain}>Explain this error</button> : null}
          </div>
        </div>
      ) : null}
      {result?.missingFunction ? (
        <div class="tr-block">
          <Icon name="x" size={14} />
          <p>Define a function called <code>{result.missingFunction}</code>. Check the spelling and that <code>def</code> starts at the left edge.</p>
        </div>
      ) : null}
      {tests.length === 0 && emptyText ? <p class="tr-empty">{emptyText}</p> : null}
      <ul class="tr-list">
        {tests.map((t) => {
          const o = result?.outcomes.find((x) => x.id === t.id);
          return <TestRow key={t.id} t={t} o={ran.has(t.id) ? o : undefined} revealed={revealed} blocked={!!result && !!(blocking || result.missingFunction)} />;
        })}
        {result?.outcomes.filter((o) => !byId.has(o.id)).map((o) => <TestRow key={o.id} o={o} revealed={revealed} blocked={false} />)}
      </ul>
    </div>
  );
}

function TestRow({ t, o, revealed, blocked }: { t?: Test; o?: TestOutcome; revealed: boolean; blocked: boolean }) {
  const hidden = (o?.hidden ?? t?.hidden ?? false) && !revealed;
  const program = !t?.call;
  const state = !o || o.notRun || blocked ? 'idle' : o.pass ? 'pass' : 'fail';
  const tag = o?.tag ?? t?.tag;
  const tagLabel = state === 'fail' ? mistakeLabel(tag) : undefined;
  const detections = o && state === 'fail' ? o.detections.filter((d) => d !== tag).map(mistakeLabel).filter(Boolean) : [];
  const label = o?.label ?? t?.label ?? '';
  const expected = o?.expected ?? t?.expect ?? t?.expectStdout ?? '';
  const icon = state === 'pass'
    ? <span class="tr-icon pass"><Icon name="check" size={12} /><span class="sr-only">Passed: </span></span>
    : state === 'fail'
      ? <span class="tr-icon fail"><Icon name="x" size={12} /><span class="sr-only">Failed: </span></span>
      : <span class="tr-icon idle" aria-hidden="true" />;
  if (hidden) {
    return (
      <li class={`tr-row ${state} hidden-test`}>
        {icon}
        <span class="tr-main">
          <span class="tr-hidden"><Icon name="lock" size={12} /> Hidden test</span> <span class="tr-label">{label}</span>
          {state === 'idle' && !o ? <span class="tr-sub">Runs when you submit</span> : null}
          {tagLabel ? <span class="tr-sub">Checks for: {tagLabel}</span> : null}
        </span>
      </li>
    );
  }
  const got = o && state === 'fail' ? gotText(o, program) : '';
  return (
    <li class={`tr-row ${state}`}>
      {icon}
      <span class="tr-main">
        {t?.setup ? <code class="tr-setup">{t.setup}</code> : null}
        {!program ? (
          <code class="tr-call">
            {t!.call} <span class="tr-arrow" aria-hidden="true">→</span><span class="sr-only"> should return </span> {expected}
          </code>
        ) : (
          <span class="tr-label">{label}{t?.stdin?.length ? <code class="tr-stdin"> input {t.stdin.join(' ⏎ ')}</code> : null}</span>
        )}
        {state === 'fail' && !program ? (
          <span class={`tr-got${o?.error || o?.timedOut ? ' err' : ''}`}>got <code>{got || '(nothing)'}</code></span>
        ) : null}
        {state === 'fail' && program ? (
          <span class="tr-pair">
            <span><span class="tr-sub">Expected output</span><pre>{expected}</pre></span>
            <span><span class="tr-sub">{o?.error || o?.timedOut ? 'Stopped' : 'Your output'}</span><pre class={o?.error || o?.timedOut ? 'err' : ''}>{got || '(nothing)'}</pre></span>
          </span>
        ) : null}
        {o && !program && o.stdout && !o.error && state === 'fail' ? <span class="tr-sub">Printed: <code>{o.stdout.trimEnd()}</code></span> : null}
        {tagLabel ? <span class="tr-sub">Checks for: {tagLabel}</span> : null}
        {detections.length ? <span class="tr-sub tr-likely">Likely cause: {detections.join('; ')}</span> : null}
      </span>
    </li>
  );
}

/** Backwards-compatible wrapper: rows with a one-line summary (used in flowing contexts). */
export function TestsTable({ result, tests, revealed, onExplain }: { result: TestsResult; tests: readonly Test[]; revealed: boolean; title?: string; onExplain?: () => void }) {
  return <TestRows tests={tests} result={result} revealed={revealed} onExplain={onExplain} />;
}
