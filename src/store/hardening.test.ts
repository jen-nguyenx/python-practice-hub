// A hostile or hand-edited backup file must not be able to crash, freeze or silently overwrite the
// student's own work. There is no server and no cross-user data here, so these are availability and
// data-integrity checks, not access control.
import { describe, expect, it } from 'vitest';
import { sanitizeExport } from './validate.ts';
import { assembleParsons, PARSONS_MAX_INDENT } from '../engine/grade.ts';
import { parseHash } from '../app/router.ts';

const file = (extra: Record<string, unknown>) => ({ format: 'pyladder-export', version: 1, exportedAt: 1, events: [], ...extra });

describe('import sanitising', () => {
  it('caps the number of scratch files so the Playground cannot be flooded', () => {
    const scratch = Array.from({ length: 5000 }, (_, i) => ({ id: `f${i}`, name: `f${i}.py`, code: 'x', updatedAt: 1 }));
    const out = sanitizeExport(file({ scratch }));
    expect(out.scratch.length).toBeLessThanOrEqual(500);
    expect(out.skipped).toBeGreaterThan(0);
  });

  it('caps the number of snapshots', () => {
    const snapshots = Array.from({ length: 20_000 }, (_, i) => ({ qid: `t01-s1-q${i}`, draft: null, updatedAt: 1 }));
    expect(sanitizeExport(file({ snapshots })).snapshots.length).toBeLessThanOrEqual(10_000);
  });

  it('clamps a future timestamp so an imported draft cannot always win a merge', () => {
    const out = sanitizeExport(file({ snapshots: [{ qid: 't01-s1-q1', draft: { a: 1 }, updatedAt: 1e308 }] }));
    expect(out.snapshots).toHaveLength(1);
    expect(out.snapshots[0].updatedAt).toBeLessThanOrEqual(Date.now() + 86_400_000);
  });

  it('rejects a snapshot with no usable timestamp', () => {
    expect(sanitizeExport(file({ snapshots: [{ qid: 't01-s1-q1', draft: null, updatedAt: 'soon' }] })).snapshots).toHaveLength(0);
    expect(sanitizeExport(file({ snapshots: [{ qid: 't01-s1-q1', draft: null, updatedAt: -1 }] })).snapshots).toHaveLength(0);
  });

  it('does not let a crafted key reach Object.prototype', () => {
    const evil = JSON.parse('{"format":"pyladder-export","version":1,"exportedAt":1,"events":[],"settings":{"__proto__":{"polluted":true}}}');
    sanitizeExport(evil);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('Parsons indent', () => {
  it('cannot ask for an enormous indent', () => {
    const line = assembleParsons([{ text: 'x = 1', indent: 1e9 }]);
    expect(line.length).toBeLessThanOrEqual(4 * PARSONS_MAX_INDENT + 'x = 1'.length);
  });

  it('survives a non-finite indent instead of throwing', () => {
    expect(() => assembleParsons([{ text: 'x = 1', indent: Number.POSITIVE_INFINITY }])).not.toThrow();
    expect(() => assembleParsons([{ text: 'x = 1', indent: Number.NaN }])).not.toThrow();
  });
});

describe('hash router', () => {
  it('does not throw on a malformed escape, which would blank the whole app', () => {
    expect(() => parseHash('#/topic/%')).not.toThrow();
    expect(parseHash('#/topic/%').name).toBe('topic');
    expect(() => parseHash('#/q/%E0%A4%A')).not.toThrow();
  });

  it('still decodes a valid escape', () => {
    expect(parseHash('#/topic/for%2Dloops%2Drange')).toEqual({ name: 'topic', topicId: 'for-loops-range' });
  });
});
