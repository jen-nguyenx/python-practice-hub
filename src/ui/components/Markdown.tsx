import type { ComponentChildren, JSX } from 'preact';
import { TERM_BY_ID } from '../../content/glossaryIndex.ts';
import { markTerms } from '../../content/glossaryMatch.ts';
import { CodeBlock } from './CodeBlock.tsx';
import { TermMark } from './TermMark.tsx';

/**
 * Glossary marking, when the caller asked for it. `seen` runs across the whole passage so a word is
 * marked once rather than every time it appears.
 */
interface Terms { seen: Set<string> }

/**
 * Plain prose between the markdown marks: the only place a glossary word may be marked.
 *
 * [[term]] is an author saying "mark this one, I know which sense I meant" — the way to mark the words
 * whose everyday meaning makes automatic matching unsafe. It is honoured even where the passage has
 * already used up its automatic marks, because it was asked for on purpose.
 */
function prose(text: string, key: string, terms: Terms | null): ComponentChildren {
  if (!text) return text;
  const parts = text.split(/(\[\[[a-z0-9-]+\]\])/g);
  const out: ComponentChildren[] = [];
  parts.forEach((part, pi) => {
    const explicit = /^\[\[([a-z0-9-]+)\]\]$/.exec(part);
    if (explicit) {
      const term = TERM_BY_ID.get(explicit[1]);
      // An unknown id is written out as the bare word rather than shown as [[...]] to a student.
      if (!term) { out.push(explicit[1]); return; }
      terms?.seen.add(term.id);
      out.push(<TermMark key={`${key}-x${pi}`} termId={term.id}>{term.term}</TermMark>);
      return;
    }
    if (!terms) { out.push(part); return; }
    for (const [i, piece] of markTerms(part, terms.seen).entries()) {
      out.push(piece.termId
        ? <TermMark key={`${key}-t${pi}-${i}`} termId={piece.termId}>{piece.text}</TermMark>
        : piece.text);
    }
  });
  return out.length === 1 ? out[0] : out;
}

// Markdown-lite: paragraphs, `code`, **bold**, *italic*, [text](url), "- " lists, "1. " lists, ```fenced``` code.
function inline(text: string, keyBase: string, terms: Terms | null = null): ComponentChildren[] {
  const out: ComponentChildren[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\((https?:\/\/[^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(prose(text.slice(last, m.index), `${keyBase}-p${i}`, terms));
    const k = `${keyBase}-${i++}`;
    if (m[1]) out.push(<code key={k}>{m[1].slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={k}>{m[2].slice(2, -2)}</strong>);
    else if (m[3]) out.push(<em key={k}>{m[3].slice(1, -1)}</em>);
    else if (m[4]) {
      const label = m[4].slice(1, m[4].indexOf(']'));
      out.push(<a key={k} href={m[5]} target="_blank" rel="noreferrer">{label}</a>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(prose(text.slice(last), `${keyBase}-end`, terms));
  return out;
}

/**
 * Inline marks only (code, bold, italic, links) with no block wrapper, for places that are already an
 * element: a heading, a list item, a table cell. `Markdown` would put a <p> inside them.
 */
export function InlineMd({ text }: { text: string }): JSX.Element {
  return <>{inline(text ?? '', 'i')}</>;
}

export function Markdown({ text, class: cls, terms: withTerms }: {
  text: string;
  class?: string;
  /**
   * Mark glossary words in this passage. Off by default: it belongs where a student is reading and
   * learning — lesson prose, a question's brief — and not on the glossary itself, or in a list of
   * results, where it would be noise.
   */
  terms?: boolean;
}): JSX.Element {
  const terms: Terms | null = withTerms ? { seen: new Set<string>() } : null;
  const blocks: JSX.Element[] = [];
  const lines = (text ?? '').replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      blocks.push(<CodeBlock key={key++} code={buf.join('\n')} />);
    } else if (/^\s*[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*] /, ''));
      const k = key++;
      blocks.push(<ul key={k}>{items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`, terms)}</li>)}</ul>);
    } else if (/^\s*\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\. /, ''));
      const k = key++;
      blocks.push(<ol key={k}>{items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`, terms)}</li>)}</ol>);
    } else if (!line.trim()) {
      i++;
    } else {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^```/.test(lines[i]) && !/^\s*([-*]|\d+\.) /.test(lines[i])) buf.push(lines[i++]);
      const k = key++;
      blocks.push(<p key={k}>{inline(buf.join(' '), String(k), terms)}</p>);
    }
  }
  return <div class={`md${cls ? ' ' + cls : ''}`}>{blocks}</div>;
}
