// Judging a predicted output against what Python actually printed.
//
// The point of a prediction is whether the reader knew what the program does. Marking someone wrong for
// typing `[2,4,6,8]` when Python writes `[2, 4, 6, 8]` tests their memory of repr spacing, which is not
// the question being asked, and it is exactly the kind of unfairness that makes a tool feel hostile.
// So there are three verdicts, not two: the near miss is credited and the difference is shown.

export type Verdict = 'right' | 'close' | 'wrong';

/** Trailing spaces and blank lines at the end never carry meaning in printed output. */
export function normalise(text: string): string {
  return (text ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

/**
 * Whitespace next to punctuation only. Deliberately NOT "strip all spaces": `print(1, 2)` prints `1 2`
 * and a reader who types `12` has not predicted it. But a space after a comma or inside a bracket is
 * Python's formatting, not the reader's claim about behaviour.
 */
export function loose(text: string): string {
  return normalise(text)
    .replace(/\s*([,:;[\]{}()])\s*/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function judge(answer: string, real: string): Verdict {
  const a = normalise(answer);
  const b = normalise(real);
  if (a === b) return 'right';
  // An empty answer is never close: it is not a prediction.
  if (a.trim() === '') return 'wrong';
  return loose(a) === loose(b) ? 'close' : 'wrong';
}
