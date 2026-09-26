// Read-only highlighted code on a sunken well. Never uses innerHTML.
// shell: a console session; lines starting with the language's prompt (">>> "/"... " for Python, "> "/"+ "
// for R) get a muted prompt, other lines are output.
// dark: the dark editor look (both themes).
// The language comes from the nearest CodeLang provider (Python unless a STAT2402 lesson says R).
import type { ComponentChildren, JSX } from 'preact';
import type { Lang } from '../../content/lessonSchema.ts';
import { useCodeLang } from './codeLang.ts';
import { tokenize } from './highlight.ts';

function renderTokens(code: string, lang: Lang) {
  return tokenize(code, lang).map((tok, i) => (tok.t === 'p' ? tok.v : <span key={i} class={`tok-${tok.t}`}>{tok.v}</span>));
}

export interface CodeBlockProps {
  code: string;
  numbered?: boolean;
  /** 1-based lines to highlight (e.g. the line that raised). */
  highlightLines?: number[];
  plain?: boolean;
  /** Render as a console session (">>> call" then result in Python, "> call" in R). */
  shell?: boolean;
  /** Dark editor surface instead of the paper well. */
  dark?: boolean;
  class?: string;
  label?: string;
}

function shellLine(line: string, plain: boolean | undefined, i: number, lang: Lang): ComponentChildren {
  const m = (lang === 'r' ? /^(>|\+)( )(.*)$/ : /^(>>>|\.\.\.)( ?)(.*)$/).exec(line);
  if (!m) return <span key={i} class="sh-out">{line}{'\n'}</span>;
  return (
    <span key={i} class="sh-in">
      <span class="sh-prompt" aria-hidden="true">{m[1]}{m[2]}</span>
      {plain ? m[3] : renderTokens(m[3], lang)}{'\n'}
    </span>
  );
}

export function CodeBlock({ code, numbered, highlightLines, plain, shell, dark, class: cls, label }: CodeBlockProps): JSX.Element {
  const lang = useCodeLang();
  const classes = ['code-block', numbered && !shell ? 'numbered' : '', shell ? 'shell' : '', dark ? 'dark' : '', cls ?? ''].filter(Boolean).join(' ');
  if (shell) {
    const lines = code.replace(/\n$/, '').split('\n');
    return <pre class={classes} aria-label={label}><code>{lines.map((l, i) => shellLine(l, plain, i, lang))}</code></pre>;
  }
  if (!numbered) {
    return <pre class={classes} aria-label={label}><code>{plain ? code : renderTokens(code, lang)}</code></pre>;
  }
  const lines = code.replace(/\n$/, '').split('\n');
  return (
    <pre class={classes} aria-label={label}>
      <code>
        {lines.map((line, i) => (
          <span key={i} class={`ln${highlightLines?.includes(i + 1) ? ' hl' : ''}`}>{plain ? line : renderTokens(line, lang)}{'\n'}</span>
        ))}
      </code>
    </pre>
  );
}
