// The hover names the same card-like surfaces in several selector lists -- position, brackets, rim, scan,
// the innermost-card rule, touch -- and once more in the script that tells the rim where the pointer is.
// A surface added to one list and not the others gets half a hover, or a rim lit in the wrong place.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SPOTLIGHT_SELECTOR } from '../ui/effects/spotlight.ts';

const css = readFileSync(new URL('./spotlight.css', import.meta.url), 'utf8');

/**
 * Every `:is(...)` list that names `.tile`, with `:not(...)` qualifiers dropped, as a sorted list. The press
 * rule (`:active`) is left out: settling down 1px is for the tiles alone, on purpose.
 */
function surfaceLists(text: string): string[][] {
  const out: string[][] = [];
  for (let at = text.indexOf(':is(.tile'); at >= 0; at = text.indexOf(':is(.tile', at + 1)) {
    let depth = 0;
    let end = at + 3;
    for (; end < text.length; end++) {
      if (text[end] === '(') depth++;
      else if (text[end] === ')' && --depth === 0) break;
    }
    if (text.startsWith(':active', end + 1)) continue;
    const inner = text.slice(at + 4, end).replace(/:not\([^)]*\)/g, '');
    out.push(inner.split(',').map((s) => s.trim()).filter(Boolean).sort());
  }
  return out;
}

describe('hover surfaces', () => {
  it('names the same surfaces in every list', () => {
    const lists = surfaceLists(css);
    expect(lists.length).toBeGreaterThan(8);
    for (const list of lists) expect(list).toEqual(lists[0]);
    expect(lists[0]).toContain('.sh-step');
    const script = SPOTLIGHT_SELECTOR.replace(/:not\([^)]*\)/g, '').split(',').map((x) => x.trim()).sort();
    expect(script).toEqual(lists[0]);
  });
});
