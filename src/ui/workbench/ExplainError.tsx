// "Explain this error" card: the message, what it means, why it happened here, and the usual fix.
import { explainError } from '../../content/mistakes.ts';
import type { PyError } from '../../runtime/protocol.ts';
import { CodeBlock } from '../components/CodeBlock.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { Icon } from '../components/Icon.tsx';
import { mistakeLabel } from './plain.ts';
import './workbench.css';

export function ExplainError({ error, code }: { error: PyError | null | undefined; code?: string }) {
  if (!error) {
    return <p class="problems-empty"><Icon name="check" size={14} /> No errors to explain</p>;
  }
  if (error.type === 'TimeoutError') {
    return (
      <div class="explain">
        <h3 class="explain-title">The code ran for too long</h3>
        <Markdown text={'Python stopped your code because it was still running after a few seconds. This almost always means a loop that never ends.\n\n- In a `while` loop, check that the condition eventually becomes false.\n- Make sure the loop variable changes inside the loop.'} />
      </div>
    );
  }
  const ex = explainError({ type: error.type, message: error.message, line: error.line });
  const lines = code ? code.split('\n') : [];
  const lineText = error.line && lines[error.line - 1] !== undefined ? lines[error.line - 1] : null;
  const labels = [...new Set([...(error.mistakes ?? []), ...ex.mistakes])].map(mistakeLabel).filter(Boolean) as string[];
  return (
    <div class="explain">
      <h3 class="explain-title">{ex.title}</h3>
      <pre class="explain-msg">{`${error.type}: ${error.message}`}</pre>
      {ex.meaning ? (
        <section>
          <h4 class="label">What it means</h4>
          <Markdown text={ex.meaning} />
        </section>
      ) : null}
      {error.line ? (
        <section>
          <h4 class="label">Why here</h4>
          <p>Python stopped on line {error.line}{lineText !== null ? ':' : '.'}</p>
          {lineText !== null ? <CodeBlock code={lineText.trim() || ' '} /> : null}
          {labels.length ? <p class="muted">This is often caused by: {labels.join('; ')}.</p> : null}
        </section>
      ) : labels.length ? <p class="muted">This is often caused by: {labels.join('; ')}.</p> : null}
      {ex.fix ? (
        <section>
          <h4 class="label">How to fix it</h4>
          <Markdown text={ex.fix} />
        </section>
      ) : null}
    </div>
  );
}
