// Pure helpers for the read formats (no DOM, no Preact). Unit-tested in logic.test.ts.

/** Display normalisation for outputs: CRLF -> LF, strip trailing spaces per line, drop trailing blank lines. */
export function normalizeForDisplay(s: string): string {
  const lines = (s ?? '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, ''));
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

/** Split an output into lines. An empty output has zero lines. */
export function outputLines(s: string): string[] {
  const n = normalizeForDisplay(s);
  return n === '' ? [] : n.split('\n');
}

/** FNV-1a 32-bit hash. Stable across runs and platforms. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Small deterministic PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle seeded by a string. Returns a new array; the input is not changed. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const out = items.slice();
  const rand = mulberry32(hashString(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

export interface PredictChoice {
  /** Stable key (index before shuffling). */
  key: string;
  /** Normalised output text. This is what is sent to the grader. */
  text: string;
}

/**
 * Options for a predict question in choice mode: the real output plus mutant outputs,
 * deduplicated after normalisation, in a stable order seeded by the question id.
 */
export function buildPredictChoices(qid: string, stdout: string, mutantOutputs: readonly string[] | undefined): PredictChoice[] {
  const seen = new Set<string>();
  const list: PredictChoice[] = [];
  for (const raw of [stdout, ...(mutantOutputs ?? [])]) {
    if (typeof raw !== 'string') continue;
    const text = normalizeForDisplay(raw);
    if (seen.has(text)) continue;
    seen.add(text);
    list.push({ key: `o${list.length}`, text });
  }
  return seededShuffle(list, `predict:${qid}`);
}

// ---------- line diff (LCS) ----------

export type DiffOp = { kind: 'same' | 'del' | 'add'; text: string };

/** Line diff from `a` to `b`. `del` = only in a, `add` = only in b. Deterministic LCS. */
export function lineDiffOps(a: readonly string[], b: readonly string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push({ kind: 'same', text: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push({ kind: 'del', text: a[i++] });
    else ops.push({ kind: 'add', text: b[j++] });
  }
  while (i < n) ops.push({ kind: 'del', text: a[i++] });
  while (j < m) ops.push({ kind: 'add', text: b[j++] });
  return ops;
}

/** A piece of a line; `diff` marks the part that differs from the paired line. */
export interface Segment { text: string; diff: boolean }

/** Split two single lines into [same prefix, differing middle, same suffix] segments. */
export function charSegments(a: string, b: string): { a: Segment[]; b: Segment[] } {
  let pre = 0;
  const max = Math.min(a.length, b.length);
  while (pre < max && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < max - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  const build = (s: string): Segment[] => {
    const parts: Segment[] = [];
    if (pre > 0) parts.push({ text: s.slice(0, pre), diff: false });
    const mid = s.slice(pre, s.length - suf);
    if (mid) parts.push({ text: mid, diff: true });
    if (suf > 0) parts.push({ text: s.slice(s.length - suf), diff: false });
    return parts;
  };
  return { a: build(a), b: build(b) };
}

export type OutputDiffRow =
  | { kind: 'same'; text: string }
  | { kind: 'changed'; expected: Segment[]; yours: Segment[] }
  | { kind: 'missing'; expected: string }
  | { kind: 'extra'; yours: string };

/**
 * Rows for showing the student's output against the expected output.
 * Adjacent removed/added lines are paired as "changed" with the differing characters marked.
 */
export function outputDiff(expected: string, yours: string): OutputDiffRow[] {
  const ops = lineDiffOps(outputLines(expected), outputLines(yours));
  const rows: OutputDiffRow[] = [];
  let k = 0;
  while (k < ops.length) {
    if (ops[k].kind === 'same') { rows.push({ kind: 'same', text: ops[k].text }); k++; continue; }
    const dels: string[] = [];
    const adds: string[] = [];
    while (k < ops.length && ops[k].kind !== 'same') {
      if (ops[k].kind === 'del') dels.push(ops[k].text); else adds.push(ops[k].text);
      k++;
    }
    const pairs = Math.min(dels.length, adds.length);
    for (let p = 0; p < pairs; p++) {
      const seg = charSegments(dels[p], adds[p]);
      rows.push({ kind: 'changed', expected: seg.a, yours: seg.b });
    }
    for (let p = pairs; p < dels.length; p++) rows.push({ kind: 'missing', expected: dels[p] });
    for (let p = pairs; p < adds.length; p++) rows.push({ kind: 'extra', yours: adds[p] });
  }
  return rows;
}

/** 1-based line numbers that differ between two snippets (lines outside the longest common subsequence). */
export function differingLines(left: string, right: string): { left: number[]; right: number[] } {
  const a = left.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');
  const b = right.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');
  const ops = lineDiffOps(a, b);
  const out = { left: [] as number[], right: [] as number[] };
  let la = 0;
  let lb = 0;
  for (const op of ops) {
    if (op.kind === 'same') { la++; lb++; }
    else if (op.kind === 'del') out.left.push(++la);
    else out.right.push(++lb);
  }
  return out;
}

/**
 * Heuristic for MCQ option text: render in monospace when it is multi-line output/code,
 * or a short single line that looks like code or a value rather than a sentence.
 */
export function isCodeLike(text: string): boolean {
  const t = (text ?? '').trim();
  if (!t) return false;
  if (/\n/.test(t)) return true;
  const proseWords = t.split(/\s+/).filter((w) => /^[A-Za-z][a-z]*[,.;:]?$/.test(w) && w.replace(/[,.;:]$/, '').length >= 2);
  if (proseWords.length >= 3) return false;
  if (/^[-+\d.,\s]+$/.test(t) && /\d/.test(t)) return true;
  if (/[()[\]{}='"#<>]|\/\/|\*\*|%/.test(t)) return true;
  if (/^(True|False|None)$/.test(t)) return true;
  return false;
}

/** Plain-language list of 1-based line numbers: "line 3", "lines 2 and 4", "lines 1, 2 and 5". */
export function linesPhrase(lines: readonly number[]): string {
  if (lines.length === 0) return '';
  if (lines.length === 1) return `line ${lines[0]}`;
  const head = lines.slice(0, -1).join(', ');
  return `lines ${head} and ${lines[lines.length - 1]}`;
}

// ---------- draft parsing (drafts are `unknown` in the contract) ----------

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

export function asStringArray(v: unknown): string[] | null {
  return Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]) : null;
}

/** Trace grid from a draft: rows of strings, padded/truncated to `cols`. At least one row. */
export function parseTraceRows(v: unknown, cols: number): string[][] {
  const rows = isRecord(v) && Array.isArray(v.rows) ? v.rows : null;
  const out: string[][] = [];
  if (rows) {
    for (const r of rows.slice(0, 50)) {
      if (!Array.isArray(r)) continue;
      out.push(Array.from({ length: cols }, (_, c) => (typeof r[c] === 'string' ? (r[c] as string) : '')));
    }
  }
  if (out.length === 0) out.push(new Array<string>(cols).fill(''));
  return out;
}

/** True if any cell in the grid has non-space text. */
export function gridHasInput(rows: readonly (readonly string[])[]): boolean {
  return rows.some((r) => r.some((c) => c.trim() !== ''));
}
