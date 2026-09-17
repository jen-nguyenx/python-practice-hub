// Read-only highlighted code on a sunken well. Never uses innerHTML.
// shell: a Python shell session; lines starting with ">>> " or "... " get a muted prompt, other lines are output.
// dark: the dark editor look (both themes).
import type { ComponentChildren, JSX } from 'preact';
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
  /** Render as a Python shell session (">>> call" then result). */
  shell?: boolean;
  /** Dark editor surface instead of the paper well. */
  dark?: boolean;
  class?: string;
  label?: string;
}

function shellLine(line: string, plain: boolean | undefined, i: number): ComponentChildren {
  const m = /^(>>>|\.\.\.)( ?)(.*)$/.exec(line);
  if (!m) return <span key={i} class="sh-out">{line}{'\n'}</span>;
  return (
    <span key={i} class="sh-in">
      <span class="sh-prompt" aria-hidden="true">{m[1]}{m[2]}</span>
      {plain ? m[3] : renderTokens(m[3])}{'\n'}
    </span>
  );
}

export function CodeBlock({ code, numbered, highlightLines, plain, shell, dark, class: cls, label }: CodeBlockProps): JSX.Element {
  const classes = ['code-block', numbered && !shell ? 'numbered' : '', shell ? 'shell' : '', dark ? 'dark' : '', cls ?? ''].filter(Boolean).join(' ');
  if (shell) {
    const lines = code.replace(/\n$/, '').split('\n');
    return <pre class={classes} aria-label={label}><code>{lines.map((l, i) => shellLine(l, plain, i))}</code></pre>;
  }
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
