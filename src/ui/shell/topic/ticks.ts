// Choosing the numbers to write along an axis.
//
// A chart with a label at each end and nothing between them cannot be read: you can see a curve rise,
// but not to what. These are the round numbers a person would have picked — 0, 25, 50 — rather than
// wherever the data happens to start and stop.
/** Steps that read as round numbers, scaled by a power of ten. */
const STEPS = [1, 2, 2.5, 5, 10];

/** Steps for data that only comes in whole numbers: no half an item, no half a day. */
const WHOLE_STEPS = [1, 2, 5, 10];

/**
 * A step close to the ideal span, rounded to something a person would choose. `2.5` is in the list
 * because a range of 10 wants quarters, and 2 or 5 would give either too many ticks or too few.
 *
 * `whole` drops it: most axes here count something — items, days, months — and "2.5 items" on an axis
 * is a nonsense the reader has to look past. Whole steps are chosen by closeness rather than by the
 * first that fits, because for a span of 9 that is 2 and its five ticks, not 5 and its two.
 */
export function niceStep(span: number, count: number, whole = false): number {
  if (!(span > 0) || count < 1) return 1;
  const rough = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  if (whole) {
    const candidates = WHOLE_STEPS.map((s) => s * magnitude).filter((s) => Number.isInteger(s));
    if (candidates.length === 0) return Math.max(1, Math.round(rough));
    return candidates.reduce((best, s) => (
      Math.abs(s - rough) < Math.abs(best - rough) || (Math.abs(s - rough) === Math.abs(best - rough) && s > best)
        ? s : best
    ));
  }
  for (const s of STEPS) {
    if (s * magnitude >= rough) return s * magnitude;
  }
  return 10 * magnitude;
}

/**
 * Round values covering `min`..`max`, at most `count`-ish of them.
 *
 * `whole` is the caller's to decide, from the data rather than from the bounds: a curve running 0 to 1
 * has whole bounds and fractional values, and giving it whole ticks would leave a two-line axis.
 *
 * Only ticks inside the range are returned: writing a number the data never reaches invites reading a
 * value off the chart that is not there. Zero is always included when the range crosses it, because on
 * anything that can go negative it is the line that matters most.
 */
export function niceTicks(min: number, max: number, count = 4, whole = false): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  const step = niceStep(max - min, count, whole);
  const out: number[] = [];
  const first = Math.ceil(min / step) * step;
  for (let v = first; v <= max + step * 1e-9; v += step) {
    // Floating point: 0.1 + 0.2 arithmetic would give 0.30000000000000004 as a tick label.
    out.push(Math.abs(v) < step * 1e-9 ? 0 : Number(v.toFixed(10)));
  }
  if (min < 0 && max > 0 && !out.includes(0)) out.push(0);
  return out.sort((a, b) => a - b);
}
