// Simple line diff (LCS) between two short snippets.
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
