// Pure helpers for the "what if" tab, kept out of the component so they can be tested directly.
import type { Span } from '../../../content/experiments.ts';
import type { Token } from '../../components/highlight.ts';
import { tokenize } from '../../components/highlight.ts';

/** A run of code that is highlighted as one token and either belongs to a knob's fragment or does not. */
export interface Piece { text: string; t: Token['t']; knob: number | null }

/**
 * Highlight the whole program, then cut the tokens at the edges of the substituted fragments. Tokenising
 * the finished code rather than each piece separately is what keeps a fragment inside a string literal
 * (print("⟦word⟧")) from breaking the highlighting.
 */
export function pieces(code: string, spans: readonly Span[]): Piece[] {
  const cuts: number[] = [];
  for (const s of spans) cuts.push(s.start, s.end);
  const knobAt = (i: number): number | null => {
    for (const s of spans) if (i >= s.start && i < s.end) return s.knob;
    return null;
  };
  const out: Piece[] = [];
  let off = 0;
  for (const tok of tokenize(code)) {
    const end = off + tok.v.length;
    const inner = cuts.filter((c) => c > off && c < end).sort((a, b) => a - b);
    let start = off;
    for (const c of [...inner, end]) {
      if (c > start) out.push({ text: code.slice(start, c), t: tok.t, knob: knobAt(start) });
      start = c;
    }
    off = end;
  }
  return out;
}

/** Split pieces into lines, so each line can be rendered as its own row. Never drops a character. */
export function pieceLines(all: readonly Piece[]): Piece[][] {
  const lines: Piece[][] = [[]];
  for (const p of all) {
    const parts = p.text.split('\n');
    parts.forEach((text, i) => {
      if (i > 0) lines.push([]);
      if (text) lines[lines.length - 1].push({ ...p, text });
    });
  }
  while (lines.length > 1 && lines[lines.length - 1].length === 0) lines.pop();
  return lines;
}
