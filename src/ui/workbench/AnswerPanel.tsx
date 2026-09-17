// "Show answer": explanation + solution code, then a self-explanation prompt.
import { useState } from 'preact/hooks';
import type { Md } from '../../content/schema.ts';
import { Button } from '../components/Button.tsx';
import { CodeBlock } from '../components/CodeBlock.tsx';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { openInPlayground } from './openInPlayground.ts';
import './workbench.css';

export interface AnswerPanelProps {
  solution: { code?: string; explanation: Md };
  selfExplain?: string;
  revealed: boolean;
  /** After 2 failed checks the answer can be shown without a confirmation step. */
  freeReveal: boolean;
  onReveal: () => void;
  onSelfExplain: (text: string) => void;
  /** Hide the answer's code block (e.g. the format already shows the answer inline). */
  hideCode?: boolean;
}

export function AnswerPanel({ solution, selfExplain, revealed, freeReveal, onReveal, onSelfExplain, hideCode }: AnswerPanelProps) {
  const [confirming, setConfirming] = useState(false);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);

  if (!revealed) {
    return (
      <section class="answer" aria-label="Answer">
        {confirming ? (
          <div class="answer-confirm" role="group" aria-labelledby="answer-confirm-q">
            <p id="answer-confirm-q"><strong>Show the answer now?</strong> This question will count as practised, not solved. You can come back to it later.</p>
            <div class="row">
              <Button variant="primary" size="sm" onClick={() => { setConfirming(false); onReveal(); }} autoFocus>Show answer</Button>
              <Button size="sm" onClick={() => setConfirming(false)}>Keep trying</Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => (freeReveal ? onReveal() : setConfirming(true))}>
            <Icon name="eye" size={14} /> Show answer
          </Button>
        )}
      </section>
    );
  }

  return (
    <section class="answer revealed" aria-label="Answer">
      <h3 class="label">Answer</h3>
      <Markdown text={solution.explanation} />
      {solution.code && !hideCode ? (
        <div class="answer-code">
          <CodeBlock code={solution.code} numbered label="Model answer" />
          <Button size="sm" variant="ghost" onClick={() => openInPlayground(solution.code!, 'answer.py')}>
            <Icon name="terminal" size={14} /> Open in Playground
          </Button>
        </div>
      ) : null}
      {selfExplain ? (
        <form
          class="self-explain"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            onSelfExplain(text.trim());
            setSaved(true);
          }}
        >
          <label for="self-explain-text"><strong>Explain it in your own words:</strong> {selfExplain}</label>
          <textarea id="self-explain-text" rows={3} value={text} onInput={(e) => { setText(e.currentTarget.value); setSaved(false); }} />
          <div class="row">
            <Button size="sm" type="submit" disabled={!text.trim()}>Save my explanation</Button>
            <span class="muted" aria-live="polite">{saved ? 'Saved.' : ''}</span>
          </div>
        </form>
      ) : null}
    </section>
  );
}
