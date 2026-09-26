// R Playground (#/r): one R script, Run, and what R printed. STAT2402's counterpart to the Playground.
//
// Deliberately smaller than the Python Playground: no scratch files, no typed input, no error explainer --
// those are built around Python. What it shares is the look (the same dark card) and the promise: the
// code runs on this computer, in the same R the lessons were verified with, and nothing is sent anywhere.
import { useEffect, useRef, useState } from 'preact/hooks';
import { r } from '../../app/services.ts';
import type { RRun } from '../../runtime/r/driver.ts';
import type { RStatus } from '../../runtime/rClient.ts';
import { Button } from '../components/Button.tsx';
import { CodeLang } from '../components/codeLang.ts';
import { Icon } from '../components/Icon.tsx';
import { CodeEditor } from '../editor/CodeEditor.tsx';
import { clearPlaygroundReturn, playgroundReturn, takePendingRCode } from '../workbench/openInPlayground.ts';
import { kbdRunShort, useRunShortcuts } from '../workbench/shortcuts.ts';
import { useMediaQuery, useSplit } from '../playground/useSplit.ts';
import '../workbench/playground.css';

export const HELLO_R = `# The R Playground. Press Run (Ctrl+Enter) to try this.
# Every run starts from an empty workspace, like a fresh R session.
# Base R is here, and library(MASS), library(pscl) and library(survival) load on first use.
fit <- lm(dist ~ speed, data = cars)
summary(fit)
`;

/** A per-browser draft, like an unsaved file: losing it is an inconvenience, never lost progress. */
const DRAFT_KEY = 'pyladder:r-playground';

function readDraft(): string | null {
  try { return localStorage.getItem(DRAFT_KEY); } catch { return null; }
}
function writeDraft(code: string) {
  try { localStorage.setItem(DRAFT_KEY, code); } catch { /* storage blocked: the draft lives for this visit */ }
}

export function rStatusLabel(s: RStatus): string {
  switch (s.state) {
    case 'idle': return 'R starts when you run';
    case 'loading': return `${s.message ?? 'Starting R'}…`;
    case 'running': return s.message ? `${s.message}…` : 'Running…';
    case 'ready': return 'R ready';
    case 'error': return 'R did not start';
  }
}

/** R draws plots on a device this page does not have; say so rather than let a plot vanish silently. */
const PLOT_CALL = /(^|[^\w.])(plot|hist|boxplot|barplot|curve|pairs|qqnorm|ggplot)\s*\(/;

export function RPlayground() {
  const [code, setCode] = useState(() => takePendingRCode() ?? readDraft() ?? HELLO_R);
  const [result, setResult] = useState<RRun | null>(null);
  const [ranCode, setRanCode] = useState('');
  const [running, setRunning] = useState(false);
  const [back] = useState(() => playgroundReturn());
  const status = r.status.value;
  const bodyRef = useRef<HTMLDivElement>(null);
  const stacked = useMediaQuery('(max-width: 899px)');
  const { split, dragging, separatorProps } = useSplit(bodyRef, !stacked);

  useEffect(() => {
    r.warmUp();
  }, []);
  useEffect(() => {
    const t = setTimeout(() => writeDraft(code), 400);
    return () => clearTimeout(t);
  }, [code]);

  const run = async () => {
    if (running) return;
    setRunning(true);
    setRanCode(code);
    setResult(await r.run(code));
    setRunning(false);
  };
  useRunShortcuts({ onRun: () => { void run(); } });

  const out = result ? result.stdout.replace(/\n$/, '') : '';
  const bodyStyle = stacked ? undefined : { gridTemplateColumns: `minmax(0, ${split}fr) 1px minmax(0, ${100 - split}fr)` };

  return (
    <CodeLang.Provider value="r">
      <div class="pg rpg">
        <h1 class="sr-only">R Playground</h1>
        <div class="pg-card" data-run-scope>
          <div class="pg-strip">
            <div class="pg-files">
              <span class="pg-tabwrap active"><span class="pg-tab">script.R</span></span>
            </div>
            {back ? (
              <a class="pg-back" href={back.href} onClick={() => clearPlaygroundReturn()}>
                <Icon name="arrowLeft" size={14} />
                <span class="pg-back-t">Back to {back.label}</span>
              </a>
            ) : null}
            <div class="pg-strip-end">
              <span class={`pg-runtime ${status.state}`} title="Your code runs on this computer, in the same R the lessons use. Nothing is sent anywhere.">
                {rStatusLabel(status)}
              </span>
              <Button
                variant="primary"
                size="sm"
                class="pg-run"
                onClick={() => { void run(); }}
                disabled={running}
                kbd={kbdRunShort}
                icon="play"
                aria-keyshortcuts="Meta+Enter Control+Enter"
              >
                {running ? 'Running…' : 'Run'}
              </Button>
            </div>
          </div>
          <div class={`pg-body${stacked ? ' stacked' : ''}${dragging ? ' dragging' : ''}`} ref={bodyRef} style={bodyStyle}>
            <div class="pg-editor">
              <CodeEditor
                value={code}
                onChange={setCode}
                onRun={() => { void run(); }}
                language="r"
                ariaLabel="R script editor. Press Escape then Tab to leave the editor."
                hideHint
                fill
              />
            </div>
            <div class="pg-divider" {...separatorProps} />
            <section class="pg-out" aria-label="What R printed">
              <div class="pg-out-head">
                <div class="pg-out-tabs"><span class="pg-out-tab active">Console</span></div>
                {result ? (
                  <button type="button" class="pg-icon-btn" onClick={() => setResult(null)} aria-label="Clear the console">
                    <Icon name="x" size={14} />
                  </button>
                ) : null}
              </div>
              <div class="pg-out-body" tabIndex={0} aria-live="polite">
                {!result && !running ? (
                  <div class="pg-empty">
                    <p>Run the script to see what R prints.</p>
                    <p class="pg-empty-sub">{status.state === 'idle' ? 'The first run downloads R, which takes a moment.' : <>Press <kbd class="pg-kbd">{kbdRunShort}</kbd> in the editor.</>}</p>
                  </div>
                ) : null}
                {running ? <p class="pg-term-status"><span class="pg-term-dot" aria-hidden="true" />{status.state === 'loading' || status.message ? rStatusLabel(status) : 'Running…'}</p> : null}
                {result && !running ? (
                  <div class="pg-term">
                    {out ? <pre class="pg-term-out">{out}</pre> : null}
                    {result.error ? (
                      <div class="pg-term-error">
                        <p class="pg-term-error-head">
                          <Icon name="alert" size={14} />
                          <span>{result.error.line > 0 ? `Stopped at line ${result.error.line}` : 'Stopped'}</span>
                        </p>
                        <pre class="pg-term-tb">{result.error.message}</pre>
                      </div>
                    ) : null}
                    {result.truncated ? <p class="pg-term-warn">Output was cut off because it was very long.</p> : null}
                    {PLOT_CALL.test(ranCode) ? (
                      <p class="pg-term-warn">Plots are not drawn here. Run this in RStudio to see the picture; the numbers above are the same.</p>
                    ) : null}
                    {!out && !result.error ? <p class="pg-term-faint">The script finished without printing anything.</p> : null}
                    {!result.error ? <p class="pg-term-done"><Icon name="check" size={14} /> Finished</p> : null}
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </div>
    </CodeLang.Provider>
  );
}
