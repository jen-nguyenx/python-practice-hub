// Small plain-language text helpers shared by graders, progress and reports.

/** Map typographic characters that macOS/iOS autocorrect inserts to their ASCII equivalents. */
export function asciiPunctuation(s: string): string {
  return s
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u00B4]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-')
    .replace(/[\u00A0\u2002-\u200A\u202F]/g, ' ')
    .replace(/\u2026/g, '...')
    .replace(/[\u200B\uFEFF]/g, '');
}

/** "1 question", "3 questions". */
export function plural(n: number, one: string, many = one + 's'): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "a", "a and b", "a, b and c". */
export function joinAnd(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Percentage as a whole number string, e.g. 0.854 -> "85%". */
export function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

/** Light Markdown-lite to plain text for one-line feedback: drops bold/italic markers and code fences. */
export function mdToPlain(md: string): string {
  return md
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/\*\*(\S(?:.*?\S)?)\*\*/g, '$1')
    .replace(/(^|\s)\*(\S(?:.*?\S)?)\*(?=\s|$|[.,;:!?])/g, '$1$2')
    .trim();
}

/** Truncate a string to max characters. */
export function capString(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}
