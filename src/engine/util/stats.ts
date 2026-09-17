// Numeric helpers for progress and reports.

export function mean(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

export function median(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  const a = [...xs].sort((p, q) => p - q);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 === 1 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

export function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Round to a number of decimal places. */
export function roundTo(x: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(x * f) / f;
}

/** Total length of the union of [start, end] intervals. */
export function unionLength(intervals: [number, number][]): number {
  const iv = intervals.filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0]);
  let total = 0;
  let curStart = -Infinity;
  let curEnd = -Infinity;
  for (const [a, b] of iv) {
    if (a > curEnd) {
      if (curEnd > curStart) total += curEnd - curStart;
      curStart = a;
      curEnd = b;
    } else if (b > curEnd) {
      curEnd = b;
    }
  }
  if (curEnd > curStart) total += curEnd - curStart;
  return total;
}
