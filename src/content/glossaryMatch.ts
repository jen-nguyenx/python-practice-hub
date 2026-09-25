// Finding glossary words inside ordinary prose.
//
// The whole point of the glossary is that it reaches the student at the moment they hit the word, which
// means marking words where they are read rather than waiting to be visited. The danger is obvious: some
// of these words appear thousands of times across the content, and a page where every other word is
// underlined is a page nobody reads. So the matcher is deliberately shy — one mark per word, a hard cap
// per passage, and never inside code, where `return` is a keyword rather than a term to explain.
import { TERMS } from './glossary.ts';

/** At most this many marks in one passage, however many terms it happens to contain. */
export const MAX_MARKS = 3;

/**
 * Words this must never mark on its own.
 *
 * Two reasons. Some are simply too ordinary to be worth a mark — nobody is stuck on "value". The rest are
 * worse than useless: they have an everyday English sense that turns up in the writing constantly, and
 * matching on spelling cannot tell the two apart. A lesson saying "that is the whole argument for
 * functions" means the case for them, and explaining that an argument is a value you pass would teach
 * something false at the exact moment the reader trusted it.
 *
 * An author who wants one of these marked writes it as [[argument]] in the prose, where they can see the
 * sentence and know which sense they meant.
 */
const NEVER_AUTO = new Set([
  // too ordinary to mark
  'value', 'call', 'key', 'index', 'function', 'print', 'return',
  // an everyday sense that would mislead
  'argument', 'statement', 'expression', 'scope', 'method', 'signature', 'literal', 'nested', 'slice',
  'exception', 'none', 'parameter',
]);

interface Matchable { id: string; word: string }

/**
 * The terms themselves, longest first so "base case" wins over "case".
 *
 * Only the term, never its `also` spellings: those exist so that searching for "running total" or "pair"
 * finds the right entry, and they are far looser than anything that should be underlined in prose. Marked
 * as words they misfire immediately — "the total of the marks" is not an accumulator, and "in pairs" is
 * not a tuple. Plurals are handled by the pattern, so nothing useful is lost.
 */
const MATCHABLE: Matchable[] = TERMS
  // Markets terms are marked only by an author writing [[strike]]: "carry", "spot" and "basis" are all
  // ordinary words in a Python lesson, and the track they belong to may not even be switched on.
  .filter((t) => !t.markets)
  .filter((t) => !NEVER_AUTO.has(t.term.toLowerCase()))
  .map((t) => ({ id: t.id, word: t.term }))
  .sort((a, b) => b.word.length - a.word.length);

const BY_WORD = new Map(MATCHABLE.map((m) => [m.word.toLowerCase(), m.id]));

function escape(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * One pattern for every markable word. Plural "s" is allowed on the end so "arguments" matches
 * "argument"; the boundaries keep it from firing inside a longer word.
 */
const PATTERN = new RegExp(`\\b(${MATCHABLE.map((m) => escape(m.word)).join('|')})(s|es)?\\b`, 'gi');

export interface Piece {
  text: string;
  /** The term this run of text names, when it names one. */
  termId?: string;
}

/**
 * Split a run of plain prose into pieces, marking at most one occurrence of each term and at most
 * `MAX_MARKS` in total. `seen` carries across the passage so the same word is not marked twice in a row.
 */
export function markTerms(text: string, seen: Set<string>): Piece[] {
  if (seen.size >= MAX_MARKS) return [{ text }];
  const out: Piece[] = [];
  let last = 0;
  PATTERN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PATTERN.exec(text))) {
    const id = BY_WORD.get(m[1].toLowerCase());
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push({ text: m[0], termId: id });
    last = m.index + m[0].length;
    if (seen.size >= MAX_MARKS) break;
  }
  if (out.length === 0) return [{ text }];
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
