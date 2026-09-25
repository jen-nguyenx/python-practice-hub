// The words the course uses, in words a first-year already has.
//
// Lessons and prompts are full of vocabulary a beginner has not met: argument, parameter, mutable,
// truthy, scope. Every one of them is defined somewhere in a lesson, which is no use to someone who hits
// the word in a question at eleven at night.
//
// Where a term makes a claim about what Python does, it carries a snippet that demonstrates it, and the
// verifier runs that snippet to get the output. Same rule as everywhere else in the app: the app does not
// tell a student what Python does, it shows them.
import type { Md } from './schema.ts';

export interface Term {
  /** Unique, kebab-case: "argument", "base-case". */
  id: string;
  /** The word itself, as it is written in prose. */
  term: string;
  /** Other forms that mean the same thing, for searching: "arguments", "args". */
  also?: string[];
  /**
   * One sentence, in words a student who does not know the term already has. No jargon inside a
   * definition of jargon — if it needs another term, that term links to its own entry.
   */
  short: Md;
  /** The thing people actually get wrong about it, when there is one. */
  note?: Md;
  /** The id of the term it is most often confused with. */
  confusedWith?: string;
  /** A lesson that teaches it properly. */
  lessonId?: string;
  /**
   * A short snippet that PRINTS something, demonstrating the word rather than asserting it. Optional: a
   * term like "syntax" has nothing to run. Kept to a handful of lines.
   */
  demo?: string;
  /** Belongs to the Markets track: listed only when that track is switched on, and never auto-marked. */
  markets?: boolean;
}

/** What running each demo produced. Written by the verifier, never by hand. */
export interface GeneratedTerm { stdout: string }
export type GeneratedTerms = Record<string, GeneratedTerm>;

/** A term with the output the verifier recorded for its demo. */
export interface TermEntry extends Term { stdout: string }

/** Match a term against a search: every word must appear somewhere in it. */
export function matchesTerm(t: Term, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = `${t.term} ${(t.also ?? []).join(' ')} ${t.short} ${t.note ?? ''}`.toLowerCase();
  return q.split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

/** How well a term answers the search: the word itself outweighs its explanation. */
export function scoreTerm(t: Term, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const term = t.term.toLowerCase();
  const also = (t.also ?? []).join(' ').toLowerCase();
  const rest = `${t.short} ${t.note ?? ''}`.toLowerCase();
  let score = 0;
  if (term === q) score += 200;
  if (term.startsWith(q)) score += 60;
  for (const w of q.split(/\s+/).filter(Boolean)) {
    if (term.includes(w)) score += 20;
    if (also.includes(w)) score += 8;
    if (rest.includes(w)) score += 1;
  }
  return score;
}
