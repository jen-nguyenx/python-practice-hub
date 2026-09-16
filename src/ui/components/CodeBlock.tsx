import type { JSX } from 'preact';
import { tokenize } from './highlight.ts';

function renderTokens(code: string) {
  return tokenize(code).map((tok, i) => (tok.t === 'p' ? tok.v : <span key={i} class={`tok-${tok.t}`}>{tok.v}</span>));
}

export interface CodeBlockProps {
  code: string;
  numbered?: boolean;
  /** 1-based lines to highlight (e.g. the line that raised). */
  highlightLines?: number[];
  plain?: boolean;
  class?: string;
  label?: string;
}

/** Read-only highlighted code. Never uses innerHTML. */
export function CodeBlock({ code, numbered, highlightLines, plain, class: cls, label }: CodeBlockProps): JSX.Element {
  const classes = ['code-block', numbered ? 'numbered' : '', cls ?? ''].filter(Boolean).join(' ');
  if (!numbered) {
    return <pre class={classes} aria-label={label}><code>{plain ? code : renderTokens(code)}</code></pre>;
  }
  const lines = code.replace(/\n$/, '').split('\n');
  return (
    <pre class={classes} aria-label={label}>
      <code>
        {lines.map((line, i) => (
          <span key={i} class={`ln${highlightLines?.includes(i + 1) ? ' hl' : ''}`}>{plain ? line : renderTokens(line)}{'\n'}</span>
        ))}
      </code>
    </pre>
  );
}
