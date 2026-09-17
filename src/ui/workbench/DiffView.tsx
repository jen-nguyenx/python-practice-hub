// Simple line diff (LCS) between two snippets, e.g. buggy code vs the fix.
import './workbench.css';

export interface DiffRow { kind: 'same' | 'del' | 'add'; text: string; a?: number; b?: number }

export function lineDiff(before: string, after: string): DiffRow[] {
  const a = before.replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n');
  const b = after.replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n');
  const n = a.length;
  const m = b.length;
  // LCS table (snippets are short).
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i].trimEnd() === b[j].trimEnd() ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i].trimEnd() === b[j].trimEnd()) {
      rows.push({ kind: 'same', text: b[j], a: i + 1, b: j + 1 });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ kind: 'del', text: a[i], a: i + 1 });
      i++;
    } else {
      rows.push({ kind: 'add', text: b[j], b: j + 1 });
      j++;
    }
  }
  while (i < n) rows.push({ kind: 'del', text: a[i], a: ++i });
  while (j < m) rows.push({ kind: 'add', text: b[j], b: ++j });
  return rows;
}

export function DiffView({ before, after, beforeLabel = 'Before', afterLabel = 'After' }: { before: string; after: string; beforeLabel?: string; afterLabel?: string }) {
  const rows = lineDiff(before, after);
  const changed = rows.filter((r) => r.kind !== 'same').length;
  return (
    <figure class="diff">
      <figcaption class="diff-caption">
        <span class="diff-key del">− {beforeLabel}</span>
        <span class="diff-key add">+ {afterLabel}</span>
        <span class="faint">{changed === 0 ? 'No differences' : `${changed} changed ${changed === 1 ? 'line' : 'lines'}`}</span>
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
