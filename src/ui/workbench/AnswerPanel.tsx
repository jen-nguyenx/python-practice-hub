// "Reveal full answer": a text link with an inline confirm (until the answer is free), and the revealed answer
// block (explanation, model code or a diff, and an optional "explain it in your own words" prompt).
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { Md } from '../../content/schema.ts';
import { Button } from '../components/Button.tsx';
import { CodeBlock } from '../components/CodeBlock.tsx';
import { Markdown } from '../components/Markdown.tsx';
import './workbench.css';

export interface RevealControlProps {
  revealed: boolean;
  /** No confirm needed (after 2 failed checks, or after a paper submission). */
  free: boolean;
  onReveal: () => void;
  /** Hide the link (test modes, or the question has no answer to show). */
  hidden?: boolean;
  label?: string;
}

/** The link plus its inline confirm. Renders nothing once revealed. */
export function RevealControl({ revealed, free, onReveal, hidden, label = 'Reveal full answer' }: RevealControlProps) {
  const [confirming, setConfirming] = useState(false);
  if (revealed || hidden) return null;
  if (confirming) {
    return (
      <div class="answer-confirm" role="group" aria-labelledby="answer-confirm-q">
        <p id="answer-confirm-q">Show the answer now? This question then counts as practised, not solved.</p>
        <div class="row">
          <Button size="sm" onClick={() => { setConfirming(false); onReveal(); }} autoFocus>Show the answer</Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Keep trying</Button>
        </div>
      </div>
    );
  }
  return (
    <button type="button" class="text-link quiet" onClick={() => (free ? onReveal() : setConfirming(true))}>
      {label}
    </button>
  );
}

export interface AnswerBlockProps {
  solution: { code?: string; explanation: Md };
  selfExplain?: string;
  onSelfExplain: (text: string) => void;
  /** Shown instead of the model code (e.g. a diff). */
  codeView?: ComponentChildren;
  /** Hide the model code (the format already shows the answer inline). */
  hideCode?: boolean;
  /** The answer was shown on an earlier visit. */
  earlier?: boolean;
}

export function AnswerBlock({ solution, selfExplain, onSelfExplain, codeView, hideCode, earlier }: AnswerBlockProps) {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const code = solution.code && !hideCode && !codeView ? solution.code : null;
  return (
    <section class="answer-block" aria-label="Answer">
      <div class="answer-head">
        <h2 class="answer-title">Answer</h2>
        {earlier ? <span class="answer-note">You opened the answer on an earlier visit, so this question is practised, not solved.</span> : null}
      </div>
      <Markdown text={solution.explanation} />
      {codeView ?? (code ? <CodeBlock code={code} numbered label="Model answer" /> : null)}
      {selfExplain ? (
        <details class="self-explain">
          <summary>Explain it in your own words</summary>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              onSelfExplain(text.trim());
              setSaved(true);
            }}
          >
            <label for="self-explain-text">{selfExplain}</label>
            <textarea id="self-explain-text" rows={3} value={text} onInput={(e) => { setText(e.currentTarget.value); setSaved(false); }} />
            <div class="row">
              <Button size="sm" type="submit" disabled={!text.trim()}>Save</Button>
              <span class="faint" aria-live="polite">{saved ? 'Saved' : ''}</span>
            </div>
          </form>
        </details>
      ) : null}
    </section>
  );
}
