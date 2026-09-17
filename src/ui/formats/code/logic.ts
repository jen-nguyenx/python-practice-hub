// Pure helpers for the code formats (no Preact, no services), unit-tested in __tests__/logic.test.ts.

/** Normalise smart quotes and dashes that phones and some keyboards insert. */
export function asciiText(s: string) {
  return s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, '-');
}

export function draftCode(draft: unknown): string | null {
  if (typeof draft === 'string') return draft;
  if (draft && typeof draft === 'object' && typeof (draft as { code?: unknown }).code === 'string') return (draft as { code: string }).code;
  return null;
}

/** Input box text -> lines for input(); a trailing newline does not add an empty line. */
export function stdinLines(text: string): string[] {
  if (!text) return [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable per-question shuffle that never shows the solution order. */
export function stableShuffle<T>(items: T[], seedText: string): T[] {
  const out = items.slice();
  const rnd = mulberry32(hashString(seedText));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  if (out.length > 1 && out.every((x, i) => x === items[i])) out.push(out.shift()!);
  return out;
}

export function signatureOf(code: string, fnName: string): string {
  const line = code.split('\n').find((l) => new RegExp(`^\\s*def\\s+${fnName}\\s*\\(`).test(l));
  return line ? line.trim().replace(/:\s*$/, '') : `def ${fnName}(...)`;
}

/** "(5,)" -> "(5)", "([1, 2],)" -> "([1, 2])" for a call-like display; other tuples show as typed. */
export function displayArgs(args: string) {
  const t = args.trim();
  if (/^\(.*,\s*\)$/.test(t)) return t.replace(/,\s*\)$/, ')');
  return t.startsWith('(') ? t : `(${t})`;
}
