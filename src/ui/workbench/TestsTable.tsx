// Moodle-style test results: Test | Expected | Got | Result. Hidden tests show only a label and what they check.
import type { Test } from '../../content/schema.ts';
import type { TestOutcome, TestsResult } from '../../runtime/protocol.ts';
import { Button } from '../components/Button.tsx';
import { Icon } from '../components/Icon.tsx';
import { errorOneLine, mistakeLabel } from './plain.ts';
import './workbench.css';

export interface TestsTableProps {
  result: TestsResult;
  tests: readonly Test[];
  /** Show hidden test values (after the answer is revealed). */
  revealed: boolean;
  title?: string;
  fnName?: string;
  onExplain?: () => void;
}

export function testsSummary(r: TestsResult): string {
  if (r.compileError) return 'Syntax error: no tests were run';
  if (r.topLevelError) return 'Your code crashed before the tests: no tests were run';
  if (r.missingFunction) return `Function ${r.missingFunction} not found: no tests were run`;
  return `${r.passed} of ${r.total} tests passed`;
}

function gotText(o: TestOutcome, program: boolean): string {
  if (o.notRun) return '';
  if (o.error) return errorOneLine(o.error);
  if (o.timedOut) return 'Took too long (a loop may never end)';
  if (program) return o.stdout;
  return o.got ?? '';
}

export function TestsTable({ result, tests, revealed, title, onExplain }: TestsTableProps) {
  const byId = new Map(tests.map((t) => [t.id, t]));
  const blocking = result.compileError ?? result.topLevelError;
  const allPass = !blocking && !result.missingFunction && result.total > 0 && result.passed === result.total;
  return (
    <div class="tests">
      <div class={`tests-summary ${allPass ? 'ok' : 'bad'}`}>
        <Icon name={allPass ? 'check' : 'x'} />
        <strong>{testsSummary(result)}</strong>
        {title ? <span class="muted">· {title}</span> : null}
      </div>
      {blocking ? (
        <div class="tests-block">
          <p>
            {result.compileError
              ? `Python could not read your code${blocking.line ? ` (line ${blocking.line})` : ''}: ${blocking.type}: ${blocking.message}`
              : `Code outside your function crashed${blocking.line ? ` on line ${blocking.line}` : ''}: ${errorOneLine(blocking)}`}
          </p>
          {onExplain ? <Button size="sm" onClick={onExplain}>Explain this error</Button> : null}
        </div>
      ) : null}
      {result.missingFunction ? (
        <p class="tests-block">Define a function called <code>{result.missingFunction}</code>. Check the spelling and that <code>def</code> starts at the left edge.</p>
      ) : null}
      {result.outcomes.length ? (
        <div class="tests-scroll">
          <table class="tests-table">
            <thead>
              <tr>
                <th scope="col">Test</th>
                <th scope="col">Expected</th>
                <th scope="col">Got</th>
                <th scope="col"><span class="sr-only">Result</span></th>
              </tr>
            </thead>
            <tbody>
              {result.outcomes.map((o) => {
                const t = byId.get(o.id);
                const program = !t?.call;
                const hide = o.hidden && !revealed;
                const tag = o.tag ?? t?.tag;
                const tagLabel = mistakeLabel(tag);
                const detections = o.pass ? [] : o.detections.filter((d) => d !== tag).map(mistakeLabel).filter(Boolean);
                return (
                  <tr key={o.id} class={o.notRun ? 'notrun' : o.pass ? 'pass' : 'fail'}>
                    <td data-label="Test">
                      {hide ? (
                        <div class="tt-hidden">
                          <span class="chip">Hidden</span> {o.label}
                        </div>
                      ) : (
                        <>
                          {t?.setup ? <pre class="tt-code tt-setup">{t.setup}</pre> : null}
                          {t?.call ? <pre class="tt-code">{t.call}</pre> : <div>{o.label}</div>}
                          {t?.stdin?.length ? <div class="tt-sub">Input: <code>{t.stdin.join(' ⏎ ')}</code></div> : null}
                          {t?.files?.length ? <div class="tt-sub">Files: {t.files.map((f) => f.name).join(', ')}</div> : null}
                          {t?.call && o.hidden ? <div class="tt-sub">Hidden test: {o.label}</div> : null}
                        </>
                      )}
                      {tagLabel ? <div class="tt-sub">Checks for: {tagLabel}</div> : null}
                    </td>
                    <td data-label="Expected">{hide ? <span class="faint">Hidden</span> : <pre class="tt-code">{o.expected ?? t?.expect ?? t?.expectStdout ?? ''}</pre>}</td>
                    <td data-label="Got">
                      {hide ? (
                        <span class="faint">Hidden</span>
                      ) : o.notRun ? (
                        <span class="faint">Not run</span>
                      ) : (
                        <>
                          <pre class={`tt-code${o.error || o.timedOut ? ' tt-err' : ''}`}>{gotText(o, program)}</pre>
                          {!program && o.stdout && !o.error ? <div class="tt-sub">Printed: <code>{o.stdout.trimEnd()}</code></div> : null}
                        </>
                      )}
                      {detections.length ? <div class="tt-sub tt-likely">Likely cause: {detections.join('; ')}</div> : null}
                    </td>
                    <td data-label="Result" class="tt-result">
                      {o.notRun ? (
                        <span class="tt-badge notrun">Not run</span>
                      ) : o.pass ? (
                        <span class="tt-badge pass"><Icon name="check" size={14} /> Pass</span>
                      ) : (
                        <span class="tt-badge fail"><Icon name="x" size={14} /> Fail</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
