// Searching the reference: the entry that answers the question has to come first.
import { describe, expect, it } from 'vitest';
import { RECIPES } from '../recipes/index.ts';
import { matchesRecipe, scoreRecipe } from '../recipeSchema.ts';

function search(q: string) {
  return RECIPES.filter((r) => matchesRecipe(r, q))
    .map((r) => ({ r, s: scoreRecipe(r, q) }))
    .sort((a, b) => b.s - a.s || a.r.task.localeCompare(b.r.task))
    .map((x) => x.r);
}

describe('reference search', () => {
  it('has entries with output for all of them', () => {
    expect(RECIPES.length).toBeGreaterThan(50);
    for (const r of RECIPES) expect(r.stdout, r.id).not.toBe('');
  });

  it.each([
    ['sort a dict by value', 'sort-a-dict-by-value'],
    ['count things', 'count-things'],
    ['copy a list', 'copy-a-list'],
  ])('puts the right entry first for %j', (query, id) => {
    const hits = search(query);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].id).toBe(id);
  });

  it('still finds an entry by a word that is only in its note or code', () => {
    // The point of searching the whole entry: a reader who remembers the error, not the job.
    expect(search('KeyError').length).toBeGreaterThan(0);
  });

  it('returns everything for an empty search', () => {
    expect(search('   ')).toHaveLength(RECIPES.length);
  });
});
