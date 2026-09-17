// Small fuzzy matcher for the command palette. Pure, no dependencies.

const BOUNDARY = /[\s\-_./·(),:]/;

/**
 * Scores how well `query` (one word, lower case) matches `text`. Higher is better; null means no match.
 * Substring matches beat scattered subsequence matches; matches at the start of a word score higher.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (!q) return 0;
  const idx = t.indexOf(q);
  if (idx >= 0) {
    const atWord = idx === 0 || BOUNDARY.test(t[idx - 1]);
    return 100 + q.length * 4 + (idx === 0 ? 40 : atWord ? 25 : 0) - Math.min(idx, 30) * 0.5 - t.length * 0.05;
  }
  // Subsequence: every query character in order.
  let score = 0;
  let ti = 0;
  let prev = -2;
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    let found = -1;
    while (ti < t.length) {
      if (t[ti] === ch) { found = ti; ti++; break; }
      ti++;
    }
    if (found < 0) return null;
    score += 2;
    if (found === prev + 1) score += 5;
    if (found === 0 || BOUNDARY.test(t[found - 1])) score += 6;
    if (prev >= 0) score -= Math.min(found - prev - 1, 10) * 0.3;
    prev = found;
  }
  // A scattered match over a long gap is noise.
  if (score < q.length * 2.5) return null;
  return score - t.length * 0.05;
}

/**
 * Multi-word match: every word in the query must match the primary text or the secondary text.
 * Words that hit the primary text count more.
 */
export function matchItem(query: string, primary: string, secondary = ''): number | null {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  let total = 0;
  for (const w of words) {
    const p = fuzzyScore(w, primary);
    const s = secondary ? fuzzyScore(w, secondary) : null;
    if (p === null && s === null) return null;
    total += Math.max(p === null ? -Infinity : p + 20, s === null ? -Infinity : s);
  }
  return total;
}
