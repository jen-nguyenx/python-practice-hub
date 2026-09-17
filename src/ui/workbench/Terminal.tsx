// Output terminal: stdout, errors with their line, "Python is starting", and the input() prompt.
import { useEffect, useRef, useState } from 'preact/hooks';
import { py } from '../../app/services.ts';
import { Button } from '../components/Button.tsx';
import { Icon } from '../components/Icon.tsx';
import { IconButton } from './Tip.tsx';
import type { PyError } from '../../runtime/protocol.ts';
import type { ProgramRunState } from './runner.ts';
import { errorOneLine, isStarting } from './plain.ts';
import './workbench.css';

export interface TerminalProps {
  state: ProgramRunState;
  onInput?: (line: string) => void;
  onClear?: () => void;
  emptyText?: string;
  /** Show "Input replays your program from the top." under the prompt. */
  replayNote?: boolean;
  onExplain?: () => void;
}

export function Terminal({ state, onInput, onClear, emptyText, replayNote = true, onExplain }: TerminalProps) {
  const status = py.status.value;
  const { running, result, failure } = state;
  const inputRef = useRef<HTMLInputElement>(null);
  const [line, setLine] = useState('');
  const needInput = !running && result?.needInput ? result.needInput : null;

  let stdout = result?.stdout ?? '';
  if (needInput?.prompt && stdout.endsWith(needInput.prompt)) stdout = stdout.slice(0, -needInput.prompt.length);

  useEffect(() => {
    if (needInput) inputRef.current?.focus();
  }, [needInput?.prompt, state.typed.length, !!needInput]);

  const err = result?.error;
  return (
    <div class="terminal" role="region" aria-label="Program output">
      {onClear && (result || failure) ? (
        <div class="term-toolbar">
          <IconButton icon="trash" size="sm" label="Clear output" side="bottom" align="end" onClick={onClear} />
        </div>
      ) : null}
      <div class="term-body" aria-live="polite">
        {running ? (
          <p class="term-status">
            <span class="term-dot" aria-hidden="true" />
            {isStarting(status) ? 'Starting Python · the first start takes 10 to 30 s' : 'Running…'}
          </p>
        ) : null}
        {failure ? (
          <div class="term-error">
            <strong>Python is not available.</strong> {failure}
            <div><Button size="sm" onClick={() => py.restart('retry after failure')}>Retry</Button></div>
          </div>
        ) : null}
        {!running && !result && !failure ? <p class="term-empty">{emptyText ?? 'Run your code to see its output here.'}</p> : null}
        {result && !failure ? (
          <>
            {stdout ? <pre class="term-out">{stdout}</pre> : null}
            {needInput ? (
              <form
                class="term-input"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!onInput) return;
                  onInput(line);
                  setLine('');
                }}
              >
                <label class="term-prompt" for="term-input-line">{needInput.prompt || 'Input:'}</label>
                <input
                  id="term-input-line"
                  ref={inputRef}
                  value={line}
                  onInput={(e) => setLine(e.currentTarget.value)}
                  autocomplete="off"
                  spellcheck={false}
                  autocapitalize="off"
                  {...{ autocorrect: 'off' }}
                  aria-describedby={replayNote ? 'term-input-note' : undefined}
                />
                <Button size="sm" type="submit">Enter</Button>
                {replayNote ? <p id="term-input-note" class="term-note">Waiting for input · Enter replays the program from the top</p> : null}
              </form>
            ) : null}
            {err ? (
              <div class="term-error">
                <div class="term-error-head">
                  <Icon name="alert" />
                  <strong>{errorHeading(err)}</strong>
                  {onExplain && err.type !== 'TimeoutError' && err.type !== 'OutputLimit' ? (
                    <button type="button" class="link-btn" onClick={onExplain}>Explain this error</button>
                  ) : null}
                </div>
                {err.type === 'TimeoutError' || err.type === 'OutputLimit' ? <p>{err.message}</p> : null}
                <pre class="term-tb">{err.traceback?.trim() ? err.traceback.trim() : errorOneLine(err)}</pre>
              </div>
            ) : null}
            {result.timedOut && !err ? <p class="term-warn">Stopped: the program ran too long. Check for a loop that never ends.</p> : null}
            {result.outputTruncated ? <p class="term-warn">Output was cut off because it was very long.</p> : null}
            {!stdout && !err && !needInput && !result.timedOut ? <p class="term-empty">The program finished without printing anything.</p> : null}
            {!needInput && !err && !result.timedOut ? (
              <p class="term-done"><Icon name="check" size={14} /> Finished{result.durationMs ? ` in ${Math.round(result.durationMs)} ms` : ''}</p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function errorHeading(err: PyError): string {
  const where = err.line ? ` (line ${err.line})` : '';
  if (err.type === 'TimeoutError') return `Stopped: the program ran too long${where}`;
  if (err.type === 'OutputLimit') return `Stopped: too much output${where}`;
  return err.line ? `Error on line ${err.line}` : 'Error';
}
