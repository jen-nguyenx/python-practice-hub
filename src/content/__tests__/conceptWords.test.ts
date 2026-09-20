// The one rule that matters here: a student never sees a raw tag.
import { describe, expect, it } from 'vitest';
import { QUESTION_INDEX } from '../loadIndex.ts';
import { CONCEPT_WORDS, conceptLabel } from '../conceptWords.ts';

const ALL = [...new Set(QUESTION_INDEX.flatMap((q) => q.concepts))].sort();

describe('conceptLabel', () => {
  it('has a label for every tag in the question index', () => {
    expect(ALL.length).toBeGreaterThan(100);
    for (const id of ALL) {
      const label = conceptLabel(id);
      expect(label, id).not.toBe('');
      // Spelled-out labels are allowed to look however the real term looks ("f-strings"). For everything
      // else, a lowercase kebab run means the id fell through, which must never reach a reader.
      if (!CONCEPT_WORDS[id]) expect(label, id).not.toMatch(/^[a-z0-9]+(-[a-z0-9]+)+$/);
    }
  });

  it('spells out the ones a plain hyphen swap would get wrong', () => {
    expect(conceptLabel('dict-get')).toBe('dict.get()');
    expect(conceptLabel('off-by-one')).toBe('Off-by-one');
    expect(conceptLabel('in')).toBe('The in operator');
  });

  it('humanises an unknown tag rather than showing it raw', () => {
    expect(conceptLabel('some-new-idea')).toBe('Some new idea');
  });
});
