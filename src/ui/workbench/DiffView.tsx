// Line diff view between two snippets, e.g. buggy code vs the fix.
import { changedLineCount } from '../../engine/grade.ts';
import { lineDiff } from './diff.ts';
import './workbench.css';

export type { DiffRow } from './diff.ts';

export function DiffView({ before, after, beforeLabel = 'Before', afterLabel = 'After' }: { before: string; after: string; beforeLabel?: string; afterLabel?: string }) {
  const rows = lineDiff(before, after);
  let changed = 0;
  try {
    changed = changedLineCount(before, after);
  } catch {
    changed = Math.max(rows.filter((r) => r.kind === 'del').length, rows.filter((r) => r.kind === 'add').length);
  }
  return (
    <figure class="diff">
      <figcaption class="diff-caption">
        <span class="diff-key del">− {beforeLabel}</span>
        <span class="diff-key add">+ {afterLabel}</span>
        <span class="faint">{changed === 0 ? 'No differences' : `${changed} ${changed === 1 ? 'line' : 'lines'} changed`}</span>
      </figcaption>
      <div class="diff-scroll">
        <pre class="diff-body">
          {rows.map((r, idx) => (
            <span key={idx} class={`diff-row ${r.kind}`}>
              <span class="diff-ln" aria-hidden="true">{r.kind === 'add' ? '' : r.a}</span>
              <span class="diff-ln" aria-hidden="true">{r.kind === 'del' ? '' : r.b}</span>
              <span class="diff-mark">{r.kind === 'add' ? '+' : r.kind === 'del' ? '−' : ' '}</span>
              <span class="sr-only">{r.kind === 'add' ? 'added: ' : r.kind === 'del' ? 'removed: ' : ''}</span>
              <span class="diff-text">{r.text || ' '}</span>
              {'\n'}
            </span>
          ))}
        </pre>
      </div>
    </figure>
  );
}
