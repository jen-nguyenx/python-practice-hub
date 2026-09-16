import type { ComponentChildren, JSX } from 'preact';
import { CodeBlock } from './CodeBlock.tsx';

// Markdown-lite: paragraphs, `code`, **bold**, *italic*, [text](url), "- " lists, "1. " lists, ```fenced``` code.
function inline(text: string, keyBase: string): ComponentChildren[] {
  const out: ComponentChildren[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\((https?:\/\/[^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
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
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, class: cls }: { text: string; class?: string }): JSX.Element {
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
      blocks.push(<ul key={k}>{items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}</ul>);
    } else if (/^\s*\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\. /, ''));
      const k = key++;
      blocks.push(<ol key={k}>{items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}</ol>);
    } else if (!line.trim()) {
      i++;
    } else {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^```/.test(lines[i]) && !/^\s*([-*]|\d+\.) /.test(lines[i])) buf.push(lines[i++]);
      const k = key++;
      blocks.push(<p key={k}>{inline(buf.join(' '), String(k))}</p>);
    }
  }
  return <div class={`md${cls ? ' ' + cls : ''}`}>{blocks}</div>;
}
