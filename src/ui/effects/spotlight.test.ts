// The spotlight is two lists of the same surfaces: the stylesheet draws the pixels, the script tells them
// where the pointer is. A surface in one list and not the other lights up in the wrong place or not at all.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SPOTLIGHT_SELECTOR } from './spotlight.ts';

const css = readFileSync(new URL('../../styles/spotlight.css', import.meta.url), 'utf8');
const split = (list: string) => list.split(',').map((s) => s.trim()).filter(Boolean).sort();

describe('spotlight surfaces', () => {
  it('lists the same surfaces in the stylesheet and the script', () => {
    const lists = [...css.matchAll(/^:is\(([^)]*(?:\([^)]*\)[^)]*)*)\)::before/gm)].map((m) => split(m[1]));
    expect(lists.length).toBeGreaterThan(0);
    for (const list of lists) expect(list).toEqual(split(SPOTLIGHT_SELECTOR));
  });
});
