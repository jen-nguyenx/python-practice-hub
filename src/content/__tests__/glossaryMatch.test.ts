import { describe, expect, it } from 'vitest';
import { markTerms, MAX_MARKS } from '../glossaryMatch.ts';

const marked = (text: string) => markTerms(text, new Set()).filter((p) => p.termId);
const rebuilt = (text: string) => markTerms(text, new Set()).map((p) => p.text).join('');

describe('markTerms', () => {
  it('marks a term it finds in prose', () => {
    const hits = marked('A tuple is handed to the function.');
    expect(hits.map((p) => p.termId)).toContain('tuple');
  });

  it('never loses or changes the text', () => {
    for (const text of [
      'A tuple is immutable, unlike a list.',
      'nothing to mark here at all',
      'Recursion needs a base case.',
      '',
    ]) {
      expect(rebuilt(text)).toBe(text);
    }
  });

  it('matches a plural as the same term', () => {
    expect(marked('Two tuples go in.')[0].termId).toBe('tuple');
  });

  it('marks a word once, however often it appears', () => {
    const hits = marked('A tuple, another tuple, and a third tuple.');
    expect(hits.filter((p) => p.termId === 'tuple')).toHaveLength(1);
  });

  it('carries what it has marked across a passage', () => {
    const seen = new Set<string>();
    const first = markTerms('A tuple is fixed.', seen).filter((p) => p.termId);
    const second = markTerms('Another tuple here.', seen).filter((p) => p.termId);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
  });

  it('stops after a few marks so prose does not turn into a list of links', () => {
    const dense = 'A tuple and recursion and a traceback and indentation and a boolean and an accumulator.';
    expect(marked(dense).length).toBeLessThanOrEqual(MAX_MARKS);
  });

  it('never marks a word whose everyday sense would mislead', () => {
    // "the whole argument for functions" is a case being made, not a value being passed. Matching on
    // spelling cannot tell the two apart, so these are left for an author to mark deliberately.
    for (const [text, word] of [
      ['That is the whole argument for splitting it up.', 'argument'],
      ['With the exception of the last one.', 'exception'],
      ['None of them worked.', 'none'],
      ['A slice of the afternoon.', 'slice'],
      ['That is outside the scope of this unit.', 'scope'],
      ['The method he used was odd.', 'method'],
    ] as const) {
      expect(marked(text).map((p) => p.termId), text).not.toContain(word);
    }
  });

  it('leaves the most ordinary words alone', () => {
    // "value" and "return" are everywhere; marking them would underline half the content.
    const hits = marked('The return value of the call.');
    expect(hits.map((p) => p.termId)).not.toContain('return');
    expect(hits.map((p) => p.termId)).not.toContain('value');
  });

  it('does not fire inside a longer word', () => {
    expect(marked('Retuples and scopes are not words.').map((p) => p.text)).not.toContain('tuple');
  });

  it('prefers the longer phrase where two could match', () => {
    const hits = marked('Recursion needs a base case to stop.');
    expect(hits.some((p) => p.termId === 'base-case')).toBe(true);
  });

  it('leaves the most ordinary words alone even as alternative spellings', () => {
    expect(marked('The returns were good.').map((p) => p.termId)).not.toContain('return');
  });
});
